# Firmadas de UN año (por la fecha del nombre) que no entraron en las tandas 1-3. Uso:
#   python elegir_anio.py 2024 [--rezagadas]   (rezagadas: tambien las >= 2024-10-06 sueltas)
# Misma eleccion que la tanda 2 (concepto y fecha), con el cotejo mejorado de la tanda 3.
import csv, re, json, sys, collections
exec(open('elegir_tanda3.py', encoding='utf-8').read().split('PEDIDO =')[0])
anio = sys.argv[1]; rez = '--rezagadas' in sys.argv
hechas = set(r[1] for r in csv.reader(open('tanda1.tsv', encoding='utf-8'), delimiter='\t'))
hechas |= {p['firmada'] for p in json.load(open('tanda2_parejas.json', encoding='utf-8'))}
hechas |= {p['firmada'] for p in json.load(open('tanda3_lote.json', encoding='utf-8'))}
salida = []; tipos = collections.Counter()
for row in csv.reader(open('firmados.tsv', encoding='utf-8'), delimiter='\t'):
    ruta = row[2][2:] if row[2].startswith('./') else row[2]; nom = ruta.split('/')[-1]
    if nom.lower().endswith(('.ini', '.gsheet', '.tmp')) or ruta in hechas: continue
    f = fecha(nom)
    if not f: continue
    if not (f[:4] == anio and f < '2024-10-06') and not (rez and f >= '2024-10-06'): continue
    k = clave(nom)
    if re.search(NO_ES_HOJA, norm(nom)) or not k:
        salida.append({'firmada': ruta, 'recibida': f, 'caso': 'no_es_hoja' if k else 'sin_clave', 'elegidas': [], 'candidatas': []})
        tipos['no_es_hoja' if k else 'sin_clave'] += 1; continue
    c = candidatas(k) or cands2(k)
    vistos = {}
    for x in sorted(c, key=lambda x: x['nom'].lower().endswith('.pdf')):
        vistos.setdefault(re.sub(r'\.[a-z]+$', '', x['nom'].lower()), x)
    c = [x for x in vistos.values() if not x['fecha'] or x['fecha'] <= f]
    ef = etiquetas(nom); elegidas = []
    if len(c) == 1: elegidas = c
    elif ef:
        for e in sorted(ef):
            con = [x for x in c if e in x['et']]
            if con: elegidas.append(max(con, key=lambda x: (x['fecha'] or '', x['mod'])))
        elegidas = list({x['ruta']: x for x in elegidas}.values())
    caso = 'clara' if elegidas else 'dudosa'
    for x in elegidas:
        if [y for y in c if y is not x and (y['et'] & x['et'] & ef) and (y['fecha'] or '') == (x['fecha'] or '')]: caso = 'dudosa'
    tipos[caso] += 1
    salida.append({'firmada': ruta, 'recibida': f, 'caso': caso, 'elegidas': [x['ruta'] for x in elegidas], 'candidatas': [x['ruta'] for x in c][:8]})
json.dump(salida, open(f'anio{anio}_parejas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(anio, len(salida), dict(tipos))
