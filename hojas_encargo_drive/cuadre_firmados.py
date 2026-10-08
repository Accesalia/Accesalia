# CUADRE DE LA CARPETA PRESUPUESTOS FIRMADOS (8-oct-2026): cada archivo tiene que estar en un sitio
# explicable: (1) en la app, en su hoja; (2) es de un año aun no subido; (3) apartado a proposito.
# Lo que no encaje es un fallo. Solo lee.
import os, re, json, glob, unicodedata, collections, openpyxl
def n(s):
    s = unicodedata.normalize('NFKD', (s or '').lower()); s = re.sub(r'\.(gdoc|docx?|pdf|jpe?g|png)$', '', s)
    return re.sub(r'[^a-z0-9]', '', s)
B = 'G:/Mi unidad/MONICA ACCESALIA/PRESUPUESTOS/PRESUPUESTOS FIRMADOS'
todos = []
for raiz, _, fs in os.walk(B):
    for f in fs:
        if f.lower().endswith(('.ini', '.gsheet', '.xlsx', '.tmp')): continue
        todos.append(os.path.relpath(os.path.join(raiz, f), B).replace(os.sep, '/'))
en_app = {}
for j in glob.glob('tmp_revision/*.json'):
    try: data = json.load(open(j, encoding='utf-8'))
    except Exception: continue
    if not isinstance(data, list): continue
    for h in data:
        if not isinstance(h, dict): continue
        for p in h.get('pdfs', []):
            if p.get('archivo_drive'): en_app[n(p['archivo_drive'])] = h['numero_hoja']
# los que salieron de firmadas (sustituidas / no son hojas) tambien se miraron
ids = json.load(open('volcado_ids.json', encoding='utf-8'))
volcado = {n(f.split('/')[-1]): c for c, h in ids.items() for v in h['versiones'] for f in v['firmados']}
estado = {}
for f in glob.glob('../docs/cruce_hojas_*.xlsx'):
    t = f.split('_hojas_')[1][:-5]
    ws = openpyxl.load_workbook(f, read_only=True).worksheets[0]; cab = None
    for r in ws.iter_rows(values_only=True):
        if cab is None: cab = r; continue
        d = dict(zip(cab, r))
        fe = str(d['Fecha de la hoja (enviada)'] or '')[:4]
        for x in str(d['Firmada (fichero)'] or '').split('\n'):
            if x.strip(): estado.setdefault(n(x.split('/')[-1]), []).append((t, d['Estado propuesto'], fe))
sf = {n(x['firmada'].split('/')[-1]): x for x in json.load(open('sinfecha_fechadas.json', encoding='utf-8'))}
c = collections.Counter(); raros = []
for f in todos:
    k = n(os.path.basename(f))
    if k in en_app: c['1 en la app, en su hoja'] += 1; continue
    if k in volcado: c['1b volcado y luego sacado de firmadas (sustituida / no era hoja)'] += 1; continue
    e = estado.get(k, [])
    if any(s == 'OK' and fe and fe < '2025' for _, s, fe in e): c['2 firmada de 2021-2024: ano aun no subido'] += 1; continue
    if any(s == 'OK' for _, s, fe in e): c['?? OK de 2025-26 pero NO en la app'] += 1; raros.append((f, e)); continue
    if e and all(s in ('APARTAR', 'ANULADA') for _, s, fe in e): c['3 apartada/anulada a proposito'] += 1; continue
    x = sf.get(k)
    if x and not x.get('es_hoja'): c['3 no es hoja (leido)'] += 1; continue
    if x and x.get('fecha') and x['fecha'] < '2022': c['2 anterior a 2022 (no se hace)'] += 1; continue
    fe = re.search(r'(\d{1,2})[-./ ](\d{1,2})[-./ ](20\d\d)', os.path.basename(f))
    if fe and fe.group(3) < '2022': c['2 anterior a 2022 por el nombre'] += 1; continue
    c['?? sin clasificar'] += 1; raros.append((f, e))
for k, v in sorted(c.items()): print(f'{v:5d}  {k}')
print('total archivos', len(todos))
json.dump(raros, open('tmp_revision/cuadre_raros.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for r in raros: print('  ', r[0][:100], '|', r[1][:2])
