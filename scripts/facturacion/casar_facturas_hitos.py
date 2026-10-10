# -*- coding: utf-8 -*-
"""CASAR cada linea de factura (Factusol) con su HITO de cobro (Monica, 10-oct-2026).

"Extraer los datos de cada factura, y en base a esos datos, casar. No al reves." Los datos de cada linea los leyeron
los agentes (extraido_*.jsonl: fecha de la hoja, fecha de firma, direccion, concepto, plazo, parte, %, total del
que es parte). Con eso:
  1. LA HOJA: las firmadas cuya comunidad es la de la direccion de la linea (conjunto de palabras de la calle +
     numero) o cuyo CIF es el NIF de la factura; si la linea cita la fecha de la hoja, la de esa fecha.
  2. LA LINEA FACTURABLE de esa hoja: por concepto (proyecto / CSS / subvencion / DF / IEE...) y por el total del que
     la factura es parte.
  3. EL HITO de esa linea: por plazo (encargo, entrega, licencia, cfo, concesion...) y por importe. Si la factura
     cobra MENOS que el hito, es un trozo: ahi iria un SUBHITO.
Veredicto por linea: exacto | subhito | dudoso (varias opciones) | sin_hoja | sin_linea | sin_hito | fuera (CAES,
comisiones y lo que no es de una hoja).

SOLO LEE: escribe casado.json en la carpeta de trabajo. Con --escribir apunta factura_linea_hitos (solo exactos).

  python scripts/facturacion/casar_facturas_hitos.py <carpeta_extraido> [--escribir]
"""
import sys, os, re, json, unicodedata, collections, glob
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

VACIAS = {'CP', 'CDAD', 'CADAD', 'CMDA', 'PROP', 'P', 'C', 'CL', 'CALLE', 'AV', 'AVD', 'AVDA', 'AVENIDA', 'PZ', 'PZA', 'PLAZA',
          'PS', 'PASEO', 'PO', 'CTRA', 'CARRETERA', 'CM', 'CAMINO', 'RONDA', 'TRAVESIA', 'DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y',
          'N', 'NO', 'NUM', 'COMUNIDAD', 'PROPIETARIOS', 'EDIFICIO', 'RESIDENCIAL', 'PORTAL', 'ESC', 'ESCALERA'}

# concepto leido -> como reconocer la linea facturable de la hoja (en su descripcion)
FAMILIA = {
    'proyecto_ascensor': 'proyecto', 'proyecto_plataforma': 'proyecto', 'proyecto_sate': 'proyecto',
    'proyecto_accesibilidad': 'proyecto', 'proyecto_otro': 'proyecto', 'licencia': 'proyecto', 'cfo': 'proyecto',
    'declaracion_responsable': 'proyecto', 'css': 'css', 'direccion_obra': 'df', 'subvencion': 'subvencion',
    'doc_tecnica': 'subvencion', 'iee': 'iee', 'cee': 'iee', 'lee': 'iee', 'libro_edificio': 'iee', 'informe': 'informe',
    'viabilidad': 'informe', 'tres_presupuestos': 'informe', 'financiacion': None, 'caes': None, 'comision': None, 'otro': None,
}


def familia_de_linea(desc):
    d = k(desc)
    if re.search(r'\bCSS\b|SEGURIDAD Y SALUD', d): return 'css'
    if re.search(r'SUBVENCI|DOCUMENTACION TECNICA', d): return 'subvencion'
    if re.search(r'DIRECCION (DE OBRA|FACULTATIVA)|\bDF\b|\bDO\b', d) and not re.search(r'PROYECTO', d): return 'df'
    if re.search(r'\bIEE\b|\bITE\b|EVALUACION DEL EDIFICIO|LIBRO DEL EDIFICIO|CERTIFICADO DE EFICIENCIA|\bCEE\b', d) and not re.search(r'PROYECTO', d): return 'iee'
    if re.search(r'INFORME|VIABILIDAD|PRESUPUESTOS|MEDICIONES', d) and not re.search(r'PROYECTO', d): return 'informe'
    return 'proyecto'


# plazo leido -> tipos de hito que le valen
PLAZO = {'encargo': {'encargo', 'firma'}, 'entrega': {'entrega'}, 'licencia': {'licencia'}, 'inicio_obra': {'inicio_obra', 'pss'},
         'durante_obra': {'otro', 'inicio_obra'}, 'cfo': {'cfo'}, 'concesion': {'concesion'}, 'exito': {'concesion'},
         'pago_unico': None, 'otro': None, None: None}


def k(s):
    s = unicodedata.normalize('NFD', str(s or '').upper()); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^A-Z0-9 ]', ' ', s)


def calle_y_numero(t):
    ps = [p for p in k(t).split() if p not in VACIAS]
    out, num = [], None
    for p in ps:
        if p.isdigit(): num = p; break
        out.append(p)
    return out[:3], num


def cerca(a, b, tol=1.0):
    return a is not None and b is not None and abs(float(a) - float(b)) <= tol


def main():
    carpeta = sys.argv[1]
    b = arrancar()
    leidas = {}
    for f in glob.glob(os.path.join(carpeta, 'extraido_*.jsonl')):
        for ln in open(f, encoding='utf-8'):
            if ln.strip(): x = json.loads(ln); leidas[x['id']] = x
    FL = b.leer('factura_lineas?select=id,factura_id,posicion,concepto,base,factura:factura_id(tipo,empresa_emisora,anio,serie,numero,fecha,estado,pagador_nombre,pagador_nif)')
    def palabras(nombre):
        ws = set(k(nombre).split())
        # los rangos cuentan con todos sus numeros: "KERRIA N 28 AL 40" contiene el 30
        for a, z in re.findall(r'(\d+)\s*(?:AL|A)\s*(\d+)', k(nombre)):
            if int(a) < int(z) <= int(a) + 60: ws |= {str(n) for n in range(int(a), int(z) + 1)}
        return ws
    coms = {c['id']: (c['nombre'], palabras(c['nombre']), (c['cif_comunidad'] or '').upper()) for c in
            b.leer('comunidades?select=id,nombre,cif_comunidad')}
    hojas = b.leer('hojas_encargo?select=id,numero_hoja,fecha_creacion,fecha_firma,comunidad_id,pagador_tipo,pagador_contrata_id,'
                   'estado,contrata:pagador_contrata_id(cif)&estado=neq.anulada')
    por_com = collections.defaultdict(list)
    for h in hojas: por_com[h['comunidad_id']].append(h)
    lineas = collections.defaultdict(list)
    for l in b.leer('lineas_facturacion?select=id,hoja_encargo_id,descripcion,importe,es_porcentaje,porcentaje'):
        lineas[l['hoja_encargo_id']].append(l)
    hitos = collections.defaultdict(list)
    for h in b.leer('hitos_cobro?select=id,linea_facturacion_id,hito,orden,porcentaje,importe,hito_padre_id'):
        if not h['hito_padre_id']: hitos[h['linea_facturacion_id']].append(h)

    res, c = [], collections.Counter()
    for fl in FL:
        x = leidas.get(fl['id'], {})
        f = fl['factura']
        imp = float(fl['base'] or 0)
        r = {'linea': fl['id'], 'factura': '%s %s %s/%s-%s' % (f['empresa_emisora'], f['tipo'], f['anio'], f['serie'], f['numero']),
             'cliente': f['pagador_nombre'], 'importe': imp, 'concepto': x.get('concepto'), 'plazo': x.get('plazo'),
             'direccion': x.get('direccion'), 'fecha_hoja': x.get('fecha_hoja'), 'texto': ' '.join((fl['concepto'] or '').split())[:200]}
        fam = FAMILIA.get(x.get('concepto'), 'proyecto')
        if f['tipo'] == 'abono' or fam is None or not imp:
            r['veredicto'] = 'fuera' if fam is None or not imp else 'abono'
            c[r['veredicto']] += 1; res.append(r); continue
        # 1 · la hoja
        calle, num = calle_y_numero(x.get('direccion') or '')
        cand_com = set()
        if calle and num:
            cand_com = {cid for cid, (n, ws, cif) in coms.items() if all(w in ws for w in calle) and num in ws}
        nif = (f['pagador_nif'] or '').upper().replace('-', '')
        if nif:
            por_nif = {cid for cid, (n, ws, cif) in coms.items() if cif and cif.replace('-', '') == nif}
            if por_nif and (not cand_com or por_nif & cand_com): cand_com = (por_nif & cand_com) or por_nif
        hs = [h for cid in cand_com for h in por_com.get(cid, [])]
        if x.get('fecha_hoja'):
            misma = [h for h in hs if h['fecha_creacion'] == x['fecha_hoja']]
            if misma: hs = misma
        if any(h['estado'] == 'devuelta_firmada' for h in hs) and not x.get('fecha_hoja'):
            hs = [h for h in hs if h['estado'] == 'devuelta_firmada']
        if not hs:
            r['veredicto'] = 'sin_hoja'; c['sin_hoja'] += 1; res.append(r); continue
        # 2 · la linea facturable
        tot = x.get('total_del_que_es_parte')
        ls = [(h, l) for h in hs for l in lineas.get(h['id'], []) if familia_de_linea(l['descripcion']) == fam]
        if len(ls) > 1 and tot:
            igual = [(h, l) for h, l in ls if cerca(l['importe'], tot)]
            if igual: ls = igual
        if not ls:
            r['veredicto'] = 'sin_linea'; r['hojas'] = [h['numero_hoja'] for h in hs]; c['sin_linea'] += 1; res.append(r); continue
        # 3 · el hito
        tipos = PLAZO.get(x.get('plazo'))
        opciones = []
        for h, l in ls:
            for ht in hitos.get(l['id'], []):
                if tipos and ht['hito'] not in tipos: continue
                opciones.append((h, l, ht))
        if not opciones or not any(cerca(o[2]['importe'], imp) for o in opciones):
            # el plazo leido no encaja con el de la hoja ("2a mitad por entrega de fin de obra"): manda el importe
            por_importe = [(h, l, ht) for h, l in ls for ht in hitos.get(l['id'], []) if cerca(ht['importe'], imp)]
            if por_importe: opciones = por_importe
        # UNA linea de factura que paga VARIOS hitos: el proyecto se factura entero pero la hoja lo parte en varias
        # lineas (proyecto + CSS + DF...): mismos tipo de hito en la misma hoja, y su suma = lo facturado.
        if opciones and not any(cerca(o[2]['importe'], imp) for o in opciones):
            for h in hs:
                todos = [(h, l, ht) for l in lineas.get(h['id'], []) for ht in hitos.get(l['id'], []) if ht['importe']]
                for tipo in {ht['hito'] for _, _, ht in todos}:
                    grupo = [o for o in todos if o[2]['hito'] == tipo and (not tipos or tipo in tipos)]
                    if len(grupo) > 1 and cerca(sum(float(o[2]['importe']) for o in grupo), imp, 2):
                        r.update({'veredicto': 'exacto_suma', 'hoja': h['numero_hoja'], 'hito_tipo': tipo,
                                  'hitos': [o[2]['id'] for o in grupo], 'hito_importe': [o[2]['importe'] for o in grupo]})
                        break
                if r.get('veredicto'): break
            if r.get('veredicto'):
                c[r['veredicto']] += 1; res.append(r); continue
        if not opciones:
            r['veredicto'] = 'sin_hito'; r['hojas'] = sorted({h['numero_hoja'] for h, _ in ls}); c['sin_hito'] += 1; res.append(r); continue
        exactas = [o for o in opciones if cerca(o[2]['importe'], imp)]
        trozo = [o for o in opciones if o[2]['importe'] and imp < float(o[2]['importe']) - 1]
        if len(exactas) == 1 or (exactas and len({o[2]['id'] for o in exactas}) == 1):
            h, l, ht = exactas[0]; r['veredicto'] = 'exacto'
        elif len(exactas) > 1:
            # varios hitos del mismo importe (50/50): el primero que no este ya cogido se decide al escribir
            h, l, ht = sorted(exactas, key=lambda o: o[2]['orden'] or 0)[0]; r['veredicto'] = 'exacto_varios'
            r['otros'] = [o[2]['id'] for o in exactas]
        elif len(trozo) == 1:
            h, l, ht = trozo[0]; r['veredicto'] = 'subhito'
        else:
            h, l, ht = opciones[0]; r['veredicto'] = 'dudoso'
            r['opciones'] = ['%s %s %s %s' % (o[0]['numero_hoja'], o[2]['hito'], o[2]['porcentaje'], o[2]['importe']) for o in opciones[:6]]
        r.update({'hoja': h['numero_hoja'], 'linea_hoja': (l['descripcion'] or '')[:60], 'importe_linea_hoja': l['importe'],
                  'hito': ht['id'], 'hito_tipo': ht['hito'], 'hito_importe': ht['importe']})
        c[r['veredicto']] += 1; res.append(r)

    json.dump(res, open(os.path.join(carpeta, 'casado.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print('lineas de factura: %d' % len(res))
    for v, n in c.most_common(): print('   %-15s %d' % (v, n))
    if '--escribir' not in sys.argv: print('(marcha en seco)'); return


if __name__ == '__main__':
    main()
