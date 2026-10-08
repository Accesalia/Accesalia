# VOLCADO de las hojas de Drive (Monica, 7-oct-2026): monta, SIN escribir en la base, todo lo
# que se va a meter, con las mismas tablas que usa la app para sus hojas:
#   hojas_encargo -> versiones_hoja -> conceptos_hoja, actuaciones_hoja (+ actuacion_accesos)
#   y sustituciones_hoja.
# Cada hoja cuelga de su OPP (hojas_a_opps.json, de casar_opps.py); la comunidad, si la opp la
# tiene. Codigo HE = el del manifiesto (por fecha), asi las 58 aun sin opp guardan su numero.
# Datos: de la firmada si la hay (tablas de cruce), si no de la ULTIMA version leida.
# Los ficheros (Storage) van despues: aqui solo el enlace de Drive del Google Doc.
#   python preparar_volcado.py   -> volcado_hojas.json
import sys, json, collections, openpyxl, re
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base

bloque_id = {b['codigo']: b['id'] for b in base.leer('bloques?select=id,codigo')}
tipo_id = {t['nombre']: t['id'] for t in base.leer('tipos_proyecto?select=id,nombre')}
opp_info = {o['id']: o for o in base.leer('oportunidades?select=id,codigo,comunidad_id')}
accesos_de = collections.defaultdict(list)
for r in base.leer('relacion_oportunidad_accesos?select=opp_id,acceso_id'):
    accesos_de[r['opp_id']].append(r['acceso_id'])
casadas = {x['codigo']: x for x in json.load(open('hojas_a_opps.json', encoding='utf-8'))}

# conceptos de las firmadas, de la hoja "Conceptos" de cada tabla de cruce
conc_firmada = collections.defaultdict(list)
for t in ['tanda1', 'tanda2', 'tanda3', '2024', '2023', '2022', 'sfrec', 'sf2024', 'sf2023', 'sf2022']:
    ws = openpyxl.load_workbook(f'../docs/cruce_hojas_{t}.xlsx', read_only=True)['Conceptos']
    for r in ws.iter_rows(min_row=2, values_only=True):
        if r[0]: conc_firmada[(t, r[0])].append({'texto': r[2], 'bloque': r[3], 'importe': r[4], 'pct_exito': r[5],
                                                 'incluido': r[6] == 'sí', 'forma_pago': r[7]})
def que_firmada(texto):
    return [q.strip() for q in (texto or '').split(',') if q.strip()]

ESTADO = {'FIRMADA': 'devuelta_firmada', 'ENVIADA SIN FIRMAR': 'enviada_comunidad', 'ANULADA': 'anulada',
          'SUSTITUIDA': 'enviada_comunidad'}   # sustituida NO es estado: va en sustituciones_hoja
avisos = collections.Counter(); sin_casar = collections.Counter()
hojas_out, sustituciones = [], []

def concepto(c):
    b = c.get('bloque')
    bid = bloque_id.get(b)
    if b and not bid: sin_casar[b] += 1
    pct = c.get('pct_exito')
    # "sin precio propio" (va dentro de un precio conjunto) = incluida, como en la app
    inc = bool(c.get('incluido')) or (c.get('importe') is None and not pct)
    imp = None if (inc or pct) else c.get('importe')
    return {'bloque_id': bid, 'descripcion': c.get('texto') or b, 'importe': imp,
            'porcentaje': float(pct) if pct and not inc else None,
            'desglose': 'incluido' if inc else 'se_cobra', 'incluido': True,
            'forma_pago': None if inc else c.get('forma_pago')}

for A in ('2025', '2026'):
    sys.argv = ['x', A]
    src = open('manifiesto_anio.py', encoding='utf-8').read()
    exec(src.split('# 7 · el Excel')[0])
    codigo = {id(h): f'HE-{A}-{i:04d}' for i, g in enumerate(filas, 1) for h in g}
    for i, g in enumerate(filas, 1):
        cod = f'HE-{A}-{i:04d}'
        cas = casadas.get(cod)
        if not cas or not cas['opp_id']: avisos['sin opp (se cuelgan despues)'] += 1; continue
        firm = [d for h in g for d in h['firmadas']]
        anulada = any(d['estado'] == 'ANULADA' for d in firm)
        est = 'ANULADA' if anulada else 'FIRMADA' if firm else 'ENVIADA SIN FIRMAR'
        sp = next((h['sustituida_por'] for h in g if h.get('sustituida_por')), None)
        if sp and not firm:
            for n in sp: sustituciones.append({'antigua': cod, 'nueva': codigo[id(n)]})
        ult = g[-1]
        # la version que lleva los datos: la firmada, o la ultima
        v_datos = next((j for j, h in enumerate(g) if h['firmadas']), len(g) - 1)
        conc, que, total, fpago, a_quien = [], [], None, None, None
        if firm:
            d0 = firm[0]
            conc = [concepto(c) for c in conc_firmada.get((d0['tabla'], d0['n']), [])]
            que, total, fpago, a_quien = que_firmada(d0['que']), d0['total'], d0['forma_pago'], d0['a_quien']
        else:
            e = ext_u.get(n_por_tit.get(ult['titulo']))
            if e:
                conc = [concepto(c) for c in e.get('conceptos') or []]
                que, total, fpago, a_quien = e.get('que_se_hace') or [], e.get('total_base'), e.get('forma_pago_general'), e.get('a_quien')
            else: avisos['sin datos leidos'] += 1
        if not conc: avisos['sin conceptos'] += 1
        recibidas = sorted({str(d['recibida'])[:10] for d in firm if d['recibida']})
        notas = [n for h in g for n in h['notas']] + [f"{d['tabla']} {d['n']}: {d['nota']}" for d in firm if d.get('nota')]
        if a_quien and a_quien.strip().lower() not in ('comunidad', 'la comunidad'):
            notas.append('Destinatario escrito en la hoja: ' + a_quien)
        versiones = []
        for j, h in enumerate(g):
            did = (h['xl'] or {}).get('id') or id_por_titulo.get(key_nom(h['titulo']))
            es_gdoc = h['titulo'].lower().endswith('.gdoc')
            versiones.append({
                'numero_version': j + 1, 'fecha_generada': h['fecha'], 'fecha_enviada': h['fecha'],
                'url_pdf_hoja': f'https://docs.google.com/document/d/{did}' if did and es_gdoc else None,
                'ficheros_enviados': h['enviados'], 'ficheros_firmados': [d['firmada'] for d in h['firmadas']],
                'datos': j == v_datos,
                'importe_base': total if j == v_datos else None,
                'forma_pago': fpago if j == v_datos else None,
                'notas': '\n'.join(notas)[:4000] if j == len(g) - 1 else None,
            })
        tipos = [tipo_id[q] for q in que if q in tipo_id]
        for q in que:
            if q not in tipo_id: sin_casar['tipo: ' + q] += 1
        hojas_out.append({
            'numero_hoja': cod, 'oportunidad_id': cas['opp_id'], 'opp': cas['opp'],
            'comunidad_id': opp_info[cas['opp_id']]['comunidad_id'],
            'pagador_tipo': 'comunidad', 'emisor': 'accesalia',
            'fecha_creacion': g[0]['fecha'], 'fecha_firma': recibidas[0] if recibidas else None,
            'estado': ESTADO[est], 'estado_manifiesto': est,
            'fecha_estado': (recibidas[0] if recibidas else ult['fecha']),
            'descripcion': ', '.join(que) or None,
            'versiones': versiones, 'conceptos': conc,
            'actuaciones': [{'tipo_proyecto_id': t, 'orden': k + 1} for k, t in enumerate(dict.fromkeys(tipos))],
            'accesos': accesos_de.get(cas['opp_id'], []),
        })
        avisos[est] += 1

# CORRECCIONES (8-oct): el cruce leia portales "21-23-25" / "31-33-35" como FECHA.
# Mar Menor 21-23-25: son hojas de agosto de 2026 (no de 2025): codigos libres de 2026.
FECHA_MALA = {'HE-2025-0748': ('2026-08-21', 'HE-2026-0779'), 'HE-2025-0747': ('2026-08-27', 'HE-2026-0780')}
for h in hojas_out:
    if h['numero_hoja'] in FECHA_MALA:
        f, cod = FECHA_MALA[h['numero_hoja']]
        h['numero_hoja'], h['fecha_creacion'], h['fecha_estado'] = cod, f, f
        for v in h['versiones']: v['fecha_generada'] = v['fecha_enviada'] = f
    if h['numero_hoja'] == 'HE-2026-0200':   # Vereda de Ganapanes 31-33-35: recibida 17-03-2026 (nombre del fichero)
        h['fecha_firma'] = h['fecha_estado'] = '2026-03-17'
for s_ in sustituciones:
    for k in ('antigua', 'nueva'):
        if s_[k] in FECHA_MALA: s_[k] = FECHA_MALA[s_[k]][1]

json.dump({'hojas': hojas_out, 'sustituciones': sustituciones}, open('volcado_hojas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=str)
print('hojas a volcar', len(hojas_out), dict(avisos))
print('versiones', sum(len(h['versiones']) for h in hojas_out), '| conceptos', sum(len(h['conceptos']) for h in hojas_out),
      '| actuaciones', sum(len(h['actuaciones']) for h in hojas_out), '| sustituciones', len(sustituciones))
print('sin comunidad (por CIF aun no)', sum(1 for h in hojas_out if not h['comunidad_id']),
      '| sin accesos en la opp', sum(1 for h in hojas_out if not h['accesos']))
print('NO casan con el catalogo:', dict(sin_casar))
