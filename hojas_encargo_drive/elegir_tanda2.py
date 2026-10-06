# Tanda 2: firmadas recientes con VARIAS enviadas posibles. Elige, por concepto y
# fecha, cual(es) se firmaron. Una firmada puede llevar varias enviadas (p. ej. "PRY Y
# SUBV" firmadas juntas cuando se mandaron como dos hojas).
import csv, json, re, collections
exec(open('cruce.py', encoding='utf-8').read().split('fuentes=collections')[0])  # clave(), fecha(), norm()

ETIQUETAS = [  # (etiqueta, patron en el nombre del fichero)
    ('subv', r'SUBV|AYUDA|NEXT ?GEN|\bNG\b'),
    ('proy', r'\bPRY\b|PROY|ASC|ELEVADOR|PLATAFORMA|RAMPA|COTA CERO|SALVAESCALERA|ACC\b|ACCESIB'),
    ('sate', r'SATE|ENVOL|FACHADA|CUBIERTA|\bCUB\b|AEROTERM|FOTOVOLT|CAES'),
    ('css', r'\bCSS\b|SEGURIDAD Y SALUD'),
    ('df', r'\bDF\b|DIRECCION FACULTATIVA|DIR\.? ?OBRA|\bDO\b'),
    ('iee', r'\bIEE\b|\bCEE\b|\bLEE\b|LIBRO DEL EDIFICIO|DOC(UMENTACION)? TECNICA'),
    ('informe', r'INFORME|PERICIAL|ESTRUCTURAL|CALCULO|MEDICIONES|CIEGO|CONSULTA'),
]
NO_ES_HOJA = r'VIABILIDAD|ORDEN DE COMPRA|\bOC\b|CODIGOS? DE PEDIDO|PEDIDO|FACTURA|INSTRUCCIONES|CONTRATO|ADENDA|CONDICIONAMIENTO|LOCALI[CZ]ADOR|CONFIRMACI|COMPARATIVA|ESTUDIO DE COSTES|ESTIMACION'

def etiquetas(nom):
    n = norm(nom)
    return {e for e, p in ETIQUETAS if re.search(p, n)}

fuentes = []
for row in csv.reader(open('fuentes.tsv', encoding='utf-8'), delimiter='\t'):
    ruta = row[2][2:] if row[2].startswith('./') else row[2]
    nom = ruta.split('/')[-1]; k = clave(nom)
    if not k or nom.lower().endswith(('.ini', '.tmp', '.xlsx', '.gsheet')): continue
    if re.search(NO_ES_HOJA, norm(nom)) or re.search(r'_SIGNED', norm(nom)): continue
    fuentes.append({'k': k, 'ruta': ruta, 'nom': nom, 'fecha': fecha(nom), 'mod': row[0], 'et': etiquetas(nom)})

def candidatas(k):
    return [f for f in fuentes if f['k'][1] == k[1] and k[0] <= f['k'][0]]

salida = []; tipos = collections.Counter()
for row in csv.reader(open('firmados.tsv', encoding='utf-8'), delimiter='\t'):
    ruta = row[2][2:] if row[2].startswith('./') else row[2]
    nom = ruta.split('/')[-1]
    if nom.lower().endswith(('.ini', '.gsheet', '.tmp')): continue
    f = fecha(nom); k = clave(nom)
    if not (f and '2024-10-06' <= f <= '2026-12-31' and k): continue
    todas = [c for c in fuentes if c['k'][1] == k[1] and c['k'][0] == k[0]]
    if len(todas) == 1: continue  # tanda 1
    c = candidatas(k)
    if not c: continue            # sin pareja: otra tanda
    if re.search(NO_ES_HOJA, norm(nom)):
        salida.append({'firmada': ruta, 'recibida': f, 'caso': 'no_es_hoja', 'elegidas': []}); tipos['no_es_hoja'] += 1; continue
    # Un PDF y un Word con el mismo nombre son la misma hoja: vale el editable.
    vistos = {}
    for x in sorted(c, key=lambda x: x['nom'].lower().endswith('.pdf')):
        base = re.sub(r'\.[a-z]+$', '', x['nom'].lower())
        vistos.setdefault(base, x)
    c = list(vistos.values())
    # No puede ser posterior a la firmada (con la fecha que lleve en el nombre).
    c = [x for x in c if not x['fecha'] or x['fecha'] <= f]
    ef = etiquetas(nom)
    elegidas = []
    if ef:
        for e in sorted(ef):
            con = [x for x in c if e in x['et']]
            if con:
                # la mas reciente con fecha; si ninguna tiene fecha, la ultima modificada
                elegidas.append(max(con, key=lambda x: (x['fecha'] or '', x['mod'])))
        elegidas = list({x['ruta']: x for x in elegidas}.values())
    caso = 'clara' if elegidas and len(c) > 0 else 'dudosa'
    # Dudosa si quedan candidatas del mismo concepto con la MISMA fecha que la elegida
    for x in elegidas:
        rivales = [y for y in c if y is not x and (y['et'] & x['et'] & ef) and (y['fecha'] or '') == (x['fecha'] or '')]
        if rivales: caso = 'dudosa'
    if not elegidas: caso = 'dudosa'
    tipos[caso] += 1
    salida.append({'firmada': ruta, 'recibida': f, 'caso': caso,
                   'elegidas': [x['ruta'] for x in elegidas],
                   'candidatas': [x['ruta'] for x in c]})

json.dump(salida, open('tanda2_parejas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(salida), dict(tipos))
print('enviadas elegidas por firmada:', collections.Counter(len(s['elegidas']) for s in salida))
