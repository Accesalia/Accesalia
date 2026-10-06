# Tanda 3: firmadas SIN pareja por el nombre. Cotejo mejorado (abreviaturas y conjuntos de
# palabras en los dos sentidos) para proponer candidatas; la decision la toma la lectura.
import csv, json, re
exec(open('elegir_tanda2.py', encoding='utf-8').read().split('salida = []')[0])
ABREV = {'NTRA': 'NUESTRA', 'NTR': 'NUESTRA', 'NRA': 'NUESTRA', 'SRA': 'SENORA', 'SR': 'SENOR', 'STA': 'SANTA', 'STO': 'SANTO',
         'GRAL': 'GENERAL', 'DR': 'DOCTOR', 'DOC': 'DOCTOR', 'PZA': 'PLAZA', 'PZ': 'PLAZA', 'PL': 'PLAZA', 'AVDA': 'AVENIDA',
         'AV': 'AVENIDA', 'PS': 'PASEO', 'PO': 'PASEO', 'CTRA': 'CARRETERA', 'CL': 'CALLE', 'C': 'CALLE', 'TRV': 'TRAVESIA'}
VACIAS = {'PLAZA', 'AVENIDA', 'PASEO', 'CALLE', 'CARRETERA', 'TRAVESIA', 'HOJA', 'ENCARGO', 'DE', 'DEL', 'LA', 'EL', 'LOS', 'LAS', 'Y', 'HE', 'FIRMADA', 'FIRMADO'}
def palabras(k): return frozenset(w for w in (ABREV.get(x, x) for x in k[0]) if w not in VACIAS)
def cands2(k):
    pk = palabras(k)
    return [f for f in fuentes if f['k'][1] == k[1] and pk and palabras(f['k']) and (pk <= palabras(f['k']) or palabras(f['k']) <= pk)]
PEDIDO = r'^DANIEL DE SOTO - |NUM CUENTA|CONFIRMING|IBERDROLA|HONORARIOS \(1\)'
lote = []
for row in csv.reader(open('firmados.tsv', encoding='utf-8'), delimiter='\t'):
    ruta = row[2][2:] if row[2].startswith('./') else row[2]
    nom = ruta.split('/')[-1]
    if nom.lower().endswith(('.ini', '.gsheet', '.tmp')) or re.search(NO_ES_HOJA, norm(nom)): continue
    k = clave(nom)
    if k and not candidatas(k):
        c = cands2(k)
        lote.append({'firmada': ruta, 'recibida': fecha(nom), 'candidatas': [x['ruta'] for x in c][:8],
                     'pista': 'parece un pedido o documento de una contrata, no una hoja' if re.search(PEDIDO, norm(nom)) else None})
for i, x in enumerate(lote): x['d'] = f'S{i:02d}'
json.dump(lote, open('tanda3_lote.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for k in range(4):
    json.dump(lote[k::4], open(f'lote_sin_{k}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(lote), 'con candidatas', sum(1 for x in lote if x['candidatas']), 'con pista de pedido', sum(1 for x in lote if x['pista']))
