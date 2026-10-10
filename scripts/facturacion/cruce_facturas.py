# -*- coding: utf-8 -*-
"""CRUCE FACTURAS (Factusol) <-> HOJAS DE ENCARGO (Monica, 10-oct-2026). SOLO LEE.

Primera tanda: facturas de 2025 y 2026 de Accesalia (002), Daniel autonomo (001) y Ecobalance (003), sacadas de una
COPIA de los .accdb (ver memoria factusol-datos) a facturas_2025_2026.json. Se cruzan contra TODAS las hojas firmadas
de la base (hay de 2021 a 2026): una factura de 2026 puede cobrar una hoja de 2023.

Las lineas de Factusol citan la hoja: "Segun hoja de encargo de fecha 10/12/2025 y recibida firmada en fecha
29/05/2026, honorarios (50% ...) ... existente en: CL CONDESA DE TEBA 21 MADRID". Se casa por:
  1. fecha de la hoja (= fecha_creacion) y, si la trae, fecha de firma;
  2. el NIF de la factura = CIF de la comunidad de la hoja, o la direccion de la linea contra el nombre de la comunidad.
Lo que no casa solo, a una lista para leer (como las hojas): sin fecha en la linea, varias hojas posibles, ninguna.

  python scripts/facturacion/cruce_facturas.py <facturas_2025_2026.json>   -> cruce.json + resumen
"""
import sys, os, re, json, unicodedata, collections, datetime
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..'))
from produccion import arrancar  # noqa: E402

MESES = {'enero': 1, 'febrero': 2, 'marzo': 3, 'abril': 4, 'mayo': 5, 'junio': 6, 'julio': 7, 'agosto': 8,
         'septiembre': 9, 'setiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12}


def k(s):
    s = unicodedata.normalize('NFD', str(s or '').upper()); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^A-Z0-9 ]', ' ', s)


def fecha(t):
    m = re.search(r'(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})', t)
    if m:
        d, mo, a = int(m.group(1)), int(m.group(2)), int(m.group(3)); a += 2000 if a < 100 else 0
    else:
        m = re.search(r'(\d{1,2})\s+de\s+([a-záéíóú]+)\s+(?:de\s+)?(\d{4})', t, re.I)
        if not m or m.group(2).lower() not in MESES: return None
        d, mo, a = int(m.group(1)), MESES[m.group(2).lower()], int(m.group(3))
    try: return datetime.date(a, mo, d)
    except ValueError: return None


def leer_linea(t):
    """fecha de la hoja, fecha de firma, porcentaje, direccion."""
    t1 = ' '.join(t.split())
    fh = re.search(r'hoja de encargo (?:de fecha |del? |con fecha )?(.{0,40})', t1, re.I)
    ff = re.search(r'recibida (?:firmada )?(?:en |con )?(?:fecha )?(.{0,30})', t1, re.I)
    pc = re.search(r'(\d{1,3}(?:[.,]\d+)?)\s*%', t1)
    dr = re.search(r'existente en:?\s*(.+?)(?:\s+Incluye|\s*$)', t1, re.I)
    return (fecha(fh.group(1)) if fh else None, fecha(ff.group(1)) if ff else None,
            float(pc.group(1).replace(',', '.')) if pc else None, dr.group(1).strip()[:120] if dr else None)


def main():
    facturas = json.load(open(sys.argv[1], encoding='utf-8-sig'))
    b = arrancar()
    hojas = b.leer('hojas_encargo?select=id,numero_hoja,estado,fecha_creacion,fecha_firma,comunidad_id,descripcion,'
                   'comunidades(nombre,cif_comunidad)&estado=neq.borrador')
    # direccion -> comunidad, por conjunto de palabras (sin el CP ni los tipos de via) y con el numero entero
    VACIAS = {'CP', 'CDAD', 'PROP', 'CL', 'CALLE', 'C', 'AV', 'AVDA', 'AVENIDA', 'PZ', 'PLAZA', 'PS', 'PASEO', 'DE', 'DEL',
              'LA', 'LAS', 'LOS', 'EL', 'Y', 'N', 'NO', 'NUM', 'MADRID', 'COMUNIDAD', 'PROPIETARIOS', 'EDIFICIO', 'RESIDENCIAL'}
    def palabras(t): return [p for p in k(t).split() if p not in VACIAS]
    firmadas_de = collections.defaultdict(list)
    for h in hojas:
        if h['estado'] == 'devuelta_firmada' and h['comunidad_id']: firmadas_de[h['comunidad_id']].append(h)
    comunidades = {h['comunidad_id']: palabras((h.get('comunidades') or {}).get('nombre')) for h in hojas if h['comunidad_id']}
    def por_direccion(texto):
        m = re.search(r'(?:existente en|Propietarios de|comunidad de|sita en|ubicad[oa] en)\s*:?\s*(.{4,90}?)(?:\s+Incluye|\s+Pedido|\s+DIRECCI|[.;]|$)', ' '.join(texto.split()), re.I)
        if not m: return None, []
        pal = palabras(m.group(1))
        nums = [p for p in pal if p.isdigit()]
        letras = [p for p in pal if not p.isdigit()][:3]
        if not letras or not nums: return m.group(1), []
        cs = [cid for cid, ps in comunidades.items() if all(x in ps for x in letras) and nums[0] in ps]
        return m.group(1), cs
    CONCEPTO = [('SUBVENC', 'Subvenc'), ('IEE', 'IEE'), ('CEE', 'CEE'), ('ASCENSOR', 'Ascensor'), ('SATE', 'SATE'),
                ('LICENCIA', 'Licencia'), ('DECLARACI', 'Declaraci')]
    por_fecha = collections.defaultdict(list)
    por_nif = collections.defaultdict(list)
    for h in hojas:
        if h['fecha_creacion']: por_fecha[h['fecha_creacion']].append(h)
        cif = ((h.get('comunidades') or {}).get('cif_comunidad') or '').upper()
        if cif and h['estado'] == 'devuelta_firmada': por_nif[cif].append(h)
    res, c = [], collections.Counter()
    for f in facturas:
        lineas = f.get('lineas') or []
        if isinstance(lineas, dict): lineas = [lineas]
        nif = (f.get('nif') or '').upper().replace('-', '').strip()
        r = {'empresa': f['empresa'], 'serie': f['serie'], 'numero': f['numero'], 'fecha': f['fecha'], 'estado': f['estado'],
             'cliente': f['cliente'], 'nif': nif, 'total': f['total'], 'lineas': []}
        for l in lineas:
            fh, ff, pc, dr = leer_linea(l.get('texto') or '')
            cand = []
            if fh:
                for dd in (0, -1, 1, -2, 2):
                    cand = por_fecha.get((fh + datetime.timedelta(days=dd)).isoformat(), [])
                    if cand: break
            def casa(h):
                com = h.get('comunidades') or {}
                if nif and (com.get('cif_comunidad') or '').upper() == nif: return 3
                pal = [p for p in k(dr).split() if len(p) > 2 and p not in ('CALLE', 'MADRID', 'CL', 'AVDA', 'AVENIDA', 'PLAZA')] if dr else []
                nom = k(com.get('nombre'))
                if pal and all(p in nom.split() for p in pal[:3]): return 2
                if ff and h.get('fecha_firma') == ff.isoformat(): return 1
                return 0
            punt = sorted(((casa(h), h) for h in cand), key=lambda x: -x[0])
            buenos = [h for p, h in punt if p == punt[0][0] and p > 0] if punt else []
            if not fh: veredicto = 'sin fecha de hoja en la linea'
            elif not cand: veredicto = 'ninguna hoja con esa fecha'
            elif len(buenos) == 1: veredicto = 'casa'
            elif len(buenos) > 1: veredicto = 'varias hojas posibles'
            else: veredicto = 'hojas de esa fecha pero ninguna de este cliente'
            c[veredicto] += 1
            r['lineas'].append({'texto': (l.get('texto') or '')[:400], 'importe': l.get('total'), 'fecha_hoja': fh and fh.isoformat(),
                                'fecha_firma': ff and ff.isoformat(), 'porcentaje': pc, 'direccion': dr, 'veredicto': veredicto,
                                'hoja': buenos[0]['numero_hoja'] if len(buenos) == 1 else None,
                                'candidatas': [h['numero_hoja'] for h in buenos] if len(buenos) > 1 else []})
        # 2a pasada dentro de la factura: las lineas sin fecha heredan la hoja de sus hermanas; y por NIF, si ese
        # cliente tiene UNA sola hoja firmada, es esa.
        casadas = {l['hoja'] for l in r['lineas'] if l['hoja']}
        unica_nif = por_nif.get(nif, [])
        for l in r['lineas']:
            if l['hoja']: continue
            if len(casadas) == 1:
                l['hoja'], l['veredicto'] = next(iter(casadas)), 'casa (hereda de su factura)'
            elif l['candidatas'] and casadas & set(l['candidatas']) and len(casadas & set(l['candidatas'])) == 1:
                l['hoja'], l['veredicto'] = (casadas & set(l['candidatas'])).pop(), 'casa (hereda de su factura)'
            elif len(unica_nif) == 1 and (not l['candidatas'] or unica_nif[0]['numero_hoja'] in l['candidatas']):
                l['hoja'], l['veredicto'] = unica_nif[0]['numero_hoja'], 'casa (unica hoja firmada de ese NIF)'
            elif l['candidatas'] and len([x for x in l['candidatas'] if x in {h['numero_hoja'] for h in unica_nif}]) == 1:
                l['hoja'] = [x for x in l['candidatas'] if x in {h['numero_hoja'] for h in unica_nif}][0]
                l['veredicto'] = 'casa (de las posibles, la de ese NIF)'
            if l['hoja']: continue
            # por la DIRECCION de la linea: la comunidad, y de sus hojas firmadas la unica o la del mismo concepto
            dtxt, cs = por_direccion(l['texto'])
            hs = [h for cid in cs for h in firmadas_de.get(cid, [])]
            if l['candidatas']: hs = [h for h in hs if h['numero_hoja'] in l['candidatas']] or hs
            if len(hs) > 1:
                up = k(l['texto'])
                hs2 = [h for h in hs if any(a in up and b_.upper() in k(h.get('descripcion')) for a, b_ in CONCEPTO)]
                hs = hs2 if hs2 else hs
            if len(hs) == 1:
                l['hoja'], l['veredicto'] = hs[0]['numero_hoja'], 'casa (por la direccion)'
            elif len(hs) > 1:
                l['candidatas'], l['veredicto'] = [h['numero_hoja'] for h in hs][:8], 'varias hojas posibles'
            elif re.search(r'CAE|ahorros energ', l['texto'], re.I):
                l['veredicto'] = 'no es hoja: venta de CAES'
            elif re.search(r'COMERCIALES CORRESPONDIENTES|comisi', l['texto'], re.I):
                l['veredicto'] = 'no es hoja: comisiones'
        res.append(r)
    salida = os.path.join(os.path.dirname(sys.argv[1]), 'cruce.json')
    json.dump(res, open(salida, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    c = collections.Counter(l['veredicto'] for r in res for l in r['lineas'])
    tot = sum(c.values())
    print('lineas de factura: %d' % tot)
    for v, n in c.most_common(): print('   %-48s %4d  (%d%%)' % (v, n, round(100 * n / tot)))
    fac_casadas = sum(1 for r in res if r['lineas'] and all(l['hoja'] for l in r['lineas']))
    print('facturas con TODAS sus lineas casadas: %d de %d' % (fac_casadas, len(res)))


if __name__ == '__main__':
    main()
