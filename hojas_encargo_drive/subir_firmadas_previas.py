# FIRMADAS VIVAS QUE FALTABAN (Monica, 8-oct-2026): "las firmadas de 2025-2026 son nuestro unico
# contrato de trabajo; que NINGUNA se quede atras".
#  A) 22 hojas ENVIADAS antes de 2025 (19 de 2024, 2 de 2023, 1 de 2022) y FIRMADAS en 2025-26. El
#     volcado solo cogio hojas de 2025-26 por la fecha de la ENVIADA y se quedaron fuera. Datos de las
#     tablas de cruce (estado OK). Codigo HE por la fecha de la hoja, PROVISIONAL: cuando se vuelque
#     su año entero se renumeran todas juntas por fecha (regla de Monica).
#     Fuera: Palomares 75-77-79 (Y24_041) y Av. Aviacion 91-101 (S44): firmadas en 2024 (16-05 y
#     13-06), el cruce leyo los portales como fecha.
#  B) AV ESPAÑA 27 GETAFE: su enviada ya esta (HE-2026-0651); la firmada llego el 7-oct, despues
#     del listado. Se marca firmada. Fecha de firma = la del nombre del fichero (06-10-2026), como
#     todas; la casilla dice 25-09-2026.
# Ademas: opp abierta despues de su hoja -> fecha de la opp = fecha de la hoja.
#   python subir_firmadas_previas.py            (prueba: no escribe)
#   python subir_firmadas_previas.py --escribir
import sys, json, os, uuid, glob, collections, openpyxl
sys.path.insert(0, '../scripts')
import produccion
ESCRIBIR = '--escribir' in sys.argv
exec(open('casar_opps.py', encoding='utf-8').read().split('A_MANO =')[0])   # base, opps, candidatas, elegir
ALMACEN = 'documentos-comerciales'
B = 'G:/Mi unidad/MONICA ACCESALIA/PRESUPUESTOS/'
word = json.load(open('pdf_convertidos/mapa.json', encoding='utf-8'))
bl = {b['codigo']: b['id'] for b in base.leer('bloques?select=id,codigo')}
tp = {t['nombre']: t['id'] for t in base.leer('tipos_proyecto?select=id,nombre')}
contrata = {c['nombre'].upper(): c['id'] for c in base.leer('contratas?select=id,nombre')}
accesos_de = collections.defaultdict(list)
for r in base.leer('relacion_oportunidad_accesos?select=opp_id,acceso_id'): accesos_de[r['opp_id']].append(r['acceso_id'])
FUERA = {'Y24_041', 'S44'}

filas = []
for f in sorted(glob.glob('../docs/cruce_hojas_*.xlsx')):
    wb = openpyxl.load_workbook(f, read_only=True); cab = None; conc = collections.defaultdict(list)
    for r in wb['Conceptos'].iter_rows(min_row=2, values_only=True):
        if r[0]: conc[r[0]].append(r)
    for r in wb.worksheets[0].iter_rows(values_only=True):
        if cab is None: cab = r; continue
        d = dict(zip(cab, r))
        fr = str(d['Fecha recibida (firmada)'] or '')[:10]; fe = str(d['Fecha de la hoja (enviada)'] or '')[:10]
        if d['Estado propuesto'] != 'OK' or not (fr >= '2025' and fe and fe < '2025') or d['N'] in FUERA: continue
        ids = candidatas(d['Dirección (en la hoja)'])
        if len(ids) == 0: sys.exit(f"{d['N']}: sin opp")
        d['_fe'], d['_fr'], d['_opp'], d['_conc'] = fe, fr, elegir(ids, fe), conc[d['N']]
        filas.append(d)
filas.sort(key=lambda d: (d['_fe'], str(d['N'])))
# VICENTE CAMARON 1 (071/072): un fichero con DOS hojas y el cruce dio a las dos los conceptos de
# ambas (7.980). Se separan: 071 = proyecto (4.260 + 890 + 850 = 6.000), 072 = subvencion (1.980 + IEE).
SUBV = {'TRAMITACION SUBVENCIONES', 'IEE'}
for d in filas:
    if d['N'] == '071':
        d['_conc'] = [r for r in d['_conc'] if r[3] not in SUBV]; d['Total base (sin IVA)'] = 6000; d['Qué se hace'] = 'Ascensor'
        d['Forma de pago'] = '50% a la contratación, 50% a la entrega de Proyecto'
    if d['N'] == '072':
        d['_conc'] = [r for r in d['_conc'] if r[3] in SUBV]; d['Total base (sin IVA)'] = 1980; d['Qué se hace'] = 'Subvenciones'
        d['Forma de pago'] = '100% del importe en el momento del encargo mediante cargo en cuenta'
if len(filas) != 22: sys.exit(f'esperaba 22, salen {len(filas)}')
ya = {h['numero_hoja'] for h in base.leer('hojas_encargo?select=numero_hoja&numero_hoja=lt.HE-2025')}
if ya: sys.exit(f'ya hay hojas anteriores a 2025: {sorted(ya)[:5]}')

def pdf_enviado(nombre):
    for carpeta in ('PRESUPUESTOS ENVIADOS/', 'HOJAS ENCARGO AUTOMATICAS/'):
        p = carpeta + nombre
        base_, ext = os.path.splitext(p)
        if os.path.exists(B + base_ + '.pdf'): return B + base_ + '.pdf'
        if p in word and os.path.exists(word[p]): return word[p]
    return None

def subir(ruta, p):
    if ESCRIBIR: base.subir(ALMACEN, ruta, open(p, 'rb').read(), reemplazar=True)
    return f'almacen:{ALMACEN}/{ruta}'

n_anio = collections.Counter(); opp_fecha = {}; sin_pdf = []
for d in filas:
    A = d['_fe'][:4]; n_anio[A] += 1; cod = f'HE-{A}-{n_anio[A]:04d}'
    hid, vid = str(uuid.uuid4()), str(uuid.uuid4())
    aq = (d['A quién'] or '').strip()
    pag = {'pagador_tipo': 'comunidad', 'pagador_contrata_id': None}
    if aq.lower().startswith('contrata:'):
        pag = {'pagador_tipo': 'contrata', 'pagador_contrata_id': contrata[aq.split(':', 1)[1].strip().upper()]}
    que = [q.strip() for q in (d['Qué se hace'] or '').split(',') if q.strip()]
    notas = [f"Cruce {d['N']}: {d['Por qué'] or ''}".strip(), d['Notas de la lectura'] or '']
    if pag['pagador_tipo'] == 'comunidad' and aq.lower() not in ('', 'comunidad'): notas.append('Destinatario escrito en la hoja: ' + aq)
    env = str(d['Enviada (documento)'] or '').split('\n')[0]
    p_env = pdf_enviado(env) if env else None
    if not p_env: sin_pdf.append(cod + ' ' + env)
    firmadas = [x.strip() for x in str(d['Firmada (fichero)'] or '').split('\n') if x.strip()]
    pdfs = []
    for k, x in enumerate(firmadas, 1):
        p = B + 'PRESUPUESTOS FIRMADOS/' + x.split('/')[-1]
        if not os.path.exists(p): sys.exit(f'{cod}: no encuentro la firmada {p}')
        pdfs.append(subir(f'hojas-encargo/{hid}/firmada-v1-{k}-{vid[:8]}.pdf', p))
    url = subir(f'hojas-encargo/{hid}/hoja-v1-{vid[:8]}.pdf', p_env) if p_env else None
    conceptos = []
    for r in d['_conc']:
        texto, bloque, imp, pct, inc, fp = r[2], r[3], r[4], r[5], r[6] == 'sí', r[7]
        if bloque not in bl: sys.exit(f'{cod}: bloque sin casar {bloque}')
        incl = inc or (imp is None and not pct)
        conceptos.append({'hoja_encargo_id': hid, 'version_hoja_id': vid, 'bloque_id': bl[bloque], 'descripcion': texto or bloque,
                          'importe': None if incl else imp, 'porcentaje': float(pct) if pct and not incl else None,
                          'incluido': True, 'desglose': 'incluido' if incl else 'se_cobra', 'forma_pago': None if incl else fp})
    for q in que:
        if q not in tp: sys.exit(f'{cod}: tipo sin casar {q}')
    acts = [{'id': str(uuid.uuid4()), 'hoja_encargo_id': hid, 'tipo_proyecto_id': tp[q], 'orden': i} for i, q in enumerate(dict.fromkeys(que), 1)]
    o = opps[d['_opp']]
    if o['fecha_apertura'] > d['_fe']: opp_fecha[d['_opp']] = min(opp_fecha.get(d['_opp'], d['_fe']), d['_fe'])
    print(cod, d['_fe'], 'firmada', d['_fr'], '|', (d['Dirección (en la hoja)'] or '')[:38], '->', o['codigo'],
          '| base', d['Total base (sin IVA)'], '| lineas', len(conceptos), '|', pag['pagador_tipo'], '| PDF enviada' if p_env else '| SIN PDF enviada')
    if not ESCRIBIR: continue
    base.insertar('hojas_encargo', [dict(pag, id=hid, numero_hoja=cod, oportunidad_id=d['_opp'], comunidad_id=o['comunidad_id'],
        emisor='accesalia', fecha_creacion=d['_fe'], fecha_firma=d['_fr'], estado='devuelta_firmada', fecha_estado=d['_fr'],
        descripcion=', '.join(que) or None)])
    base.insertar('versiones_hoja', [{'id': vid, 'hoja_encargo_id': hid, 'numero_version': 1, 'fecha_generada': d['_fe'],
        'fecha_enviada': d['_fe'], 'url_pdf_hoja': url, 'importe_base': d['Total base (sin IVA)'], 'iva_porcentaje': 21,
        'forma_pago': d['Forma de pago'], 'notas': '\n'.join(x for x in notas if x)[:4000], 'pdfs_firmados': pdfs}])
    if conceptos: base.insertar('conceptos_hoja', conceptos)
    if acts:
        base.insertar('actuaciones_hoja', acts)
        aa = [{'actuacion_id': a['id'], 'acceso_id': x} for a in acts for x in accesos_de[d['_opp']]]
        if aa: base.insertar('actuacion_accesos', aa)
    base.actualizar(f'hojas_encargo?id=eq.{hid}', {'version_firmada_id': vid})

for oid, f in opp_fecha.items():
    print('opp', opps[oid]['codigo'], opps[oid]['fecha_apertura'], '->', f)
    if ESCRIBIR: base.actualizar(f'oportunidades?id=eq.{oid}', {'fecha_apertura': f})
print('sin PDF de la enviada:', sin_pdf)

# --- B) Av España 27 Getafe ---------------------------------------------------------------------
g = base.leer('hojas_encargo?numero_hoja=eq.HE-2026-0651&select=id,estado')[0]
gv = base.leer(f'versiones_hoja?hoja_encargo_id=eq.{g["id"]}&select=id,notas')[0]
p = B + 'PRESUPUESTOS FIRMADOS/AV ESPAÑA 27 GETAFE - DF Y CSS - 06-10-2026.pdf'
print('Getafe HE-2026-0651:', g['estado'], '-> devuelta_firmada 2026-10-06', os.path.exists(p))
if ESCRIBIR and g['estado'] == 'enviada_comunidad':
    pdf = subir(f'hojas-encargo/{g["id"]}/firmada-v1-1-{gv["id"][:8]}.pdf', p)
    nota = ('Firmada: casilla con fecha 25-09-2026; recibida 06-10-2026 (nombre del fichero). CP con CIF E78918745 '
            '(letra E: comunidad de bienes).')
    base.actualizar(f'versiones_hoja?id=eq.{gv["id"]}', {'pdfs_firmados': [pdf], 'notas': '\n'.join(x for x in (gv['notas'], nota) if x)})
    base.actualizar(f'hojas_encargo?id=eq.{g["id"]}', {'estado': 'devuelta_firmada', 'fecha_firma': '2026-10-06',
                    'fecha_estado': '2026-10-06', 'version_firmada_id': gv['id']})
print('ESCRITO' if ESCRIBIR else 'PRUEBA: no se ha escrito nada')
