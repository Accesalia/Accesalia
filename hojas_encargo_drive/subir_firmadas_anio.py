# VOLCADO DE LAS FIRMADAS DE UN AÑO (Monica, 8-oct-2026): "por año, abierta o cerrada, y asi no me llevo mas
# sustos"; "solo las firmadas, sin historico, en esta pasada". Las hojas FIRMADAS del año (fecha de la hoja)
# que estan OK en las tablas de cruce y aun no estan en la app:
#   - una hoja por ENVIADA: varias filas del cruce con la misma enviada son la misma hoja (varios PDF firmados,
#     proyecto y subvencion en papeles separados de la misma hoja...) -> sus PDF van todos a la version
#   - cuelga de su opp (por la direccion, como en casar_opps.py); comunidad, la de la opp
#   - SIN conceptos: los pone la relectura (preparar_revision -> agentes -> cargar_revision -> grupos 1-3),
#     que es lo que manda; los del cruce no se copian para no tener que corregirlos despues
#   - el que va (tipo de proyecto) si, del cruce, para la cabecera "que + donde"
#   - codigo HE PROVISIONAL; al final se RENUMERA todo el año por fecha (regla de Monica), tambien las que
#     ya estaban (las firmadas en 2025-26 subidas antes)
#   python subir_firmadas_anio.py 2024              (prueba)
#   python subir_firmadas_anio.py 2024 --escribir
import sys, os, re, json, glob, uuid, collections, unicodedata, openpyxl
sys.path.insert(0, '../scripts')
import produccion
A = sys.argv[1]; ESCRIBIR = '--escribir' in sys.argv
exec(open('casar_opps.py', encoding='utf-8').read().split('A_MANO =')[0])   # base, opps, candidatas, elegir
B = 'G:/Mi unidad/MONICA ACCESALIA/PRESUPUESTOS/'
ALMACEN = 'documentos-comerciales'
def nn(s):
    s = unicodedata.normalize('NFKD', (s or '').lower()); s = re.sub(r'\.(gdoc|docx?|pdf|jpe?g|png)$', '', s)
    return re.sub(r'[^a-z0-9]', '', s)

# lo que ya esta en la app (por el nombre del PDF firmado)
en_app = set()
for j in glob.glob('tmp_revision/*.json'):
    try: data = json.load(open(j, encoding='utf-8'))
    except Exception: continue
    if isinstance(data, list):
        for h in data:
            if isinstance(h, dict):
                for p in h.get('pdfs', []):
                    if p.get('archivo_drive'): en_app.add(nn(p['archivo_drive']))
ids = json.load(open('volcado_ids.json', encoding='utf-8'))
en_app |= {nn(f.split('/')[-1]) for h in ids.values() for v in h['versiones'] for f in v['firmados']}

tp = {t['nombre']: t['id'] for t in base.leer('tipos_proyecto?select=id,nombre')}
accesos_de = collections.defaultdict(list)
for r in base.leer('relacion_oportunidad_accesos?select=opp_id,acceso_id&order=opp_id,acceso_id'): accesos_de[r['opp_id']].append(r['acceso_id'])
filas = []
for f in sorted(glob.glob('../docs/cruce_hojas_*.xlsx')):
    t = f.split('_hojas_')[1][:-5]
    ws = openpyxl.load_workbook(f, read_only=True).worksheets[0]; cab = None
    for r in ws.iter_rows(values_only=True):
        if cab is None: cab = r; continue
        d = dict(zip(cab, r))
        fe = str(d['Fecha de la hoja (enviada)'] or '')[:10]
        if d['Estado propuesto'] != 'OK' or not fe.startswith(A): continue
        fs = [x.strip() for x in str(d['Firmada (fichero)'] or '').split('\n') if x.strip()]
        if not fs or any(nn(x.split('/')[-1]) in en_app for x in fs): continue
        d['_t'], d['_fe'], d['_fs'] = t, fe, fs
        filas.append(d)
grupos = collections.OrderedDict()
for d in sorted(filas, key=lambda d: d['_fe']):
    grupos.setdefault((nn(str(d['Enviada (documento)'] or '')) or nn(d['_fs'][0]), d['_fe']), []).append(d)

# ya subidas por este mismo script (se reconoce su "cruce: ..." en las notas de la version): no se repiten
ya_subidas = set()
for v in base.leer(f'versiones_hoja?notas=like.*Volcado%20de%20las%20firmadas%20de%20{A}*&select=notas'):
    m = re.search(r'cruce: (.*?)\. Lineas', v['notas'] or '')
    if m: ya_subidas.add(m.group(1))
# a mano (Monica, 8-oct): la manzana Talco/Palomares/Puerto Lapice/Ferroviarios (firmada "Palomares 75 77 79 garajes")
A_MANO_OPP = {'Y24_041': 'DAN-2022-240',                       # Palomares 75-79 (Monica, 8-oct)
              'Y2023_029': 'DAN-2023-054', 'Y2023_092': 'DAN-2023-054'}   # Mancomunidad Castillos y Viñagrande (opp sin portales)
por_cod = {o['codigo']: i for i, o in opps.items()}
hojas, sin_opp, varias = [], [], []
for (k, fe), g in grupos.items():
    d0 = g[0]
    if ', '.join(f"{d['_t']} {d['N']}" for d in g) in ya_subidas: continue
    ids_ = {por_cod[A_MANO_OPP[d0['N']]]} if d0['N'] in A_MANO_OPP else candidatas(d0['Dirección (en la hoja)'])
    if not ids_:
        for x in d0['_fs']: ids_ |= candidatas(x.split('/')[-1], True)
    if not ids_: sin_opp.append((d0['_t'], d0['N'], d0['Dirección (en la hoja)'], d0['_fs'][0].split('/')[-1])); continue
    oid = elegir(ids_, fe)
    if len(ids_) > 1: varias.append((d0['Dirección (en la hoja)'], opps[oid]['codigo'], [opps[i]['codigo'] for i in ids_ if i != oid]))
    firmadas = list(dict.fromkeys(x for d in g for x in d['_fs']))
    que = list(dict.fromkeys(q.strip() for d in g for q in str(d['Qué se hace'] or '').split(',') if q.strip() in tp))
    fr = sorted(str(d['Fecha recibida (firmada)'] or '')[:10] for d in g if re.match(r'20(1|2)\d-', str(d['Fecha recibida (firmada)'] or '')))
    hojas.append({'fe': fe, 'fr': fr[0] if fr else fe, 'opp': oid, 'firmadas': firmadas, 'que': que,
                  'enviada': str(d0['Enviada (documento)'] or '').split('\n')[0], 'carpeta': d0['Enviada: carpeta'],
                  'cruce': ', '.join(f"{d['_t']} {d['N']}" for d in g), 'dir': d0['Dirección (en la hoja)']})
print('hojas a subir:', len(hojas), '| sin opp:', len(sin_opp), '| con varias opps posibles:', len(varias))
for s in sin_opp: print('   SIN OPP', s)
for v in varias[:30]: print('   VARIAS', v)
if not ESCRIBIR: sys.exit('PRUEBA: no se ha escrito nada')

# --- escribir: hoja + version (con sus PDF firmados) + actuaciones
word = json.load(open('pdf_convertidos/mapa.json', encoding='utf-8'))
def pdf_enviado(nombre, carpeta):
    for c in ([carpeta + '/'] if carpeta else []) + ['PRESUPUESTOS ENVIADOS/', 'HOJAS ENCARGO AUTOMATICAS/']:
        p = c + nombre; b_, _ = os.path.splitext(p)
        if os.path.exists(B + b_ + '.pdf'): return B + b_ + '.pdf'
        if p in word and os.path.exists(word[p]): return word[p]
    return None
hechas = []
for i, h in enumerate(hojas, 1):
    hid, vid = str(uuid.uuid4()), str(uuid.uuid4())
    cod = f'HE-{A}-T{i:04d}'                                  # provisional hasta renumerar
    pdfs = []
    for k, x in enumerate(h['firmadas'], 1):
        p = B + 'PRESUPUESTOS FIRMADOS/' + x.split('PRESUPUESTOS FIRMADOS/')[-1]
        if not os.path.exists(p): print('   NO ESTA EL PDF', p); continue
        ruta = f'hojas-encargo/{hid}/firmada-v1-{k}-{vid[:8]}.pdf'
        base.subir(ALMACEN, ruta, open(p, 'rb').read(), reemplazar=True); pdfs.append(f'almacen:{ALMACEN}/{ruta}')
    pe = pdf_enviado(h['enviada'], h['carpeta']) if h['enviada'] else None
    url = None
    if pe:
        ruta = f'hojas-encargo/{hid}/hoja-v1-{vid[:8]}.pdf'; base.subir(ALMACEN, ruta, open(pe, 'rb').read(), reemplazar=True)
        url = f'almacen:{ALMACEN}/{ruta}'
    o = opps[h['opp']]
    base.insertar('hojas_encargo', [{'id': hid, 'numero_hoja': cod, 'oportunidad_id': h['opp'], 'comunidad_id': o['comunidad_id'],
                   'pagador_tipo': 'comunidad', 'emisor': 'accesalia', 'fecha_creacion': h['fe'], 'fecha_firma': h['fr'],
                   'estado': 'devuelta_firmada', 'fecha_estado': h['fr'], 'descripcion': ', '.join(h['que']) or None}])
    base.insertar('versiones_hoja', [{'id': vid, 'hoja_encargo_id': hid, 'numero_version': 1, 'fecha_generada': h['fe'], 'fecha_enviada': h['fe'],
                   'url_pdf_hoja': url, 'iva_porcentaje': 21, 'pdfs_firmados': pdfs,
                   'notas': f"Volcado de las firmadas de {A} (8-oct-2026), cruce: {h['cruce']}. Lineas e importes: de la relectura del papel."}])
    base.actualizar(f'hojas_encargo?id=eq.{hid}', {'version_firmada_id': vid})
    acts = [{'id': str(uuid.uuid4()), 'hoja_encargo_id': hid, 'tipo_proyecto_id': tp[q], 'orden': j} for j, q in enumerate(h['que'], 1)]
    if acts:
        base.insertar('actuaciones_hoja', acts)
        aa = [{'actuacion_id': a['id'], 'acceso_id': x} for a in acts for x in accesos_de[h['opp']]]
        if aa: base.insertar('actuacion_accesos', aa)
    hechas.append(cod)
print('subidas', len(hechas))

# --- renumerar todo el año por fecha (las de antes y las nuevas). Una hoja cuya fecha (corregida al releer el
#     papel) es de OTRO año pasa a la serie de ese año, detras de la ultima (regla: el codigo va por la fecha).
todas = base.leer(f'hojas_encargo?numero_hoja=like.HE-{A}-*&select=id,numero_hoja,fecha_creacion,creado_en&order=fecha_creacion,creado_en,id')
del_anio = [h for h in todas if (h['fecha_creacion'] or '').startswith(A)]
de_otro = [h for h in todas if not (h['fecha_creacion'] or '').startswith(A)]
for h in todas: base.actualizar(f'hojas_encargo?id=eq.{h["id"]}', {'numero_hoja': 'RENUM-' + h['id']})
cambio = {}
def poner(h, nuevo):
    cambio[h['numero_hoja']] = nuevo
    base.actualizar(f'hojas_encargo?id=eq.{h["id"]}', {'numero_hoja': nuevo})
    base.actualizar(f'revision_firmadas?hoja_encargo_id=eq.{h["id"]}', {'numero_hoja': nuevo})
for i, h in enumerate(del_anio, 1): poner(h, f'HE-{A}-{i:04d}')
for h in de_otro:
    Y = h['fecha_creacion'][:4]
    ult = max([int(x['numero_hoja'][-4:]) for x in base.leer(f'hojas_encargo?numero_hoja=like.HE-{Y}-*&select=numero_hoja&order=id')
               if re.fullmatch(rf'HE-{Y}-\d{{4}}', x['numero_hoja'])] or [0])
    poner(h, f'HE-{Y}-{ult + 1:04d}')
    s_ = base.leer(f'series_documento?tipo=eq.HE&anio=eq.{Y}&select=ultimo')
    if s_ and s_[0]['ultimo'] < ult + 1: base.actualizar(f'series_documento?tipo=eq.HE&anio=eq.{Y}', {'ultimo': ult + 1})
for l in base.leer(f'lineas_facturacion?notas=like.*HE-*&select=id,notas&order=id'):
    t = l['notas']
    for v, nu in cambio.items(): t = t.replace(v + '.', nu + '.').replace(v + ' ', nu + ' ')
    if t != l['notas']: base.actualizar(f'lineas_facturacion?id=eq.{l["id"]}', {'notas': t})
todas = del_anio
json.dump(cambio, open(f'renumeracion_{A}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
if not base.leer(f'series_documento?tipo=eq.HE&anio=eq.{A}&select=ultimo'):
    base.insertar('series_documento', [{'tipo': 'HE', 'anio': int(A), 'ultimo': len(todas)}])
else: base.actualizar(f'series_documento?tipo=eq.HE&anio=eq.{A}', {'ultimo': len(todas)})
print('renumeradas', len(todas), '| cambios de las que ya estaban:', {k: v for k, v in cambio.items() if not k.startswith(f'HE-{A}-T')})
