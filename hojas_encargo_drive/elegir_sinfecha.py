# Firmadas SIN fecha en el nombre, con la fecha leida de dentro (sinfecha_fechadas.json).
# Las reparte por año (2022, 2023, 2024 antes de oct, recientes) y elige su enviada como
# elegir_anio.py. Deja anio<A>_parejas.json con A = sf2022, sf2023, sf2024, sfrec.
import json, re, collections
exec(open('elegir_anio.py', encoding='utf-8').read().split('anio = sys.argv[1]')[0])
fechadas = json.load(open('sinfecha_fechadas.json', encoding='utf-8'))
grupos = collections.defaultdict(list); tipos = collections.defaultdict(collections.Counter)
for o in fechadas:
    if not o['es_hoja'] or not o['fecha'] or o['fecha'][:4] < '2022': continue
    f = o['fecha']; A = 'sfrec' if f >= '2024-10-06' else 'sf' + f[:4]
    ruta = o['firmada']; nom = ruta.split('/')[-1]
    k = clave(nom) or (clave(o['direccion']) if o.get('direccion') else None)
    if not k:
        grupos[A].append({'firmada': ruta, 'recibida': f, 'caso': 'sin_clave', 'elegidas': [], 'candidatas': [], 'nota': o.get('nota')})
        tipos[A]['sin_clave'] += 1; continue
    c = candidatas(k) or cands2(k)
    vistos = {}
    for x in sorted(c, key=lambda x: x['nom'].lower().endswith('.pdf')):
        vistos.setdefault(re.sub(r'\.[a-z]+$', '', x['nom'].lower()), x)
    c = [x for x in vistos.values() if not x['fecha'] or x['fecha'] <= f]
    # La fecha leida es la de la HOJA: si una candidata lleva esa misma fecha, es ella.
    misma = [x for x in c if x['fecha'] == f]
    ef = etiquetas(nom + ' ' + (o.get('concepto') or '')); elegidas = []
    if len(misma) == 1: elegidas = misma
    elif len(c) == 1: elegidas = c
    elif ef:
        for e in sorted(ef):
            con = [x for x in c if e in x['et']]
            if con: elegidas.append(max(con, key=lambda x: (x['fecha'] or '', x['mod'])))
        elegidas = list({x['ruta']: x for x in elegidas}.values())
    caso = 'clara' if elegidas and (len(misma) == 1 or len(c) == 1) else 'dudosa'
    tipos[A][caso] += 1
    grupos[A].append({'firmada': ruta, 'recibida': f, 'caso': caso, 'elegidas': [x['ruta'] for x in elegidas],
                      'candidatas': [x['ruta'] for x in c][:8], 'nota': o.get('nota')})
for A, s in grupos.items():
    json.dump(s, open(f'anio{A}_parejas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(A, len(s), dict(tipos[A]))
