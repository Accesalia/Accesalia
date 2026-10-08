# Corrige lecturas en las que el lector puso la subvencion al 100% al contratar CONTRA lo que dice el papel
# (Monica: la regla vale cuando el papel no dice nada; si el papel reparte otra cosa, MANDA EL PAPEL).
# A la linea de subvencion le pone los mismos plazos de fijo que el resto de la hoja (mantiene el % a exito).
#   python manda_el_papel.py <lote> HE-xxxx-xxxx ...
import sys, json
lote, codigos = sys.argv[1], set(sys.argv[2:])
p = f'tmp_revision/{lote}_leidas.jsonl'
L = [json.loads(l) for l in open(p, encoding='utf-8') if l.strip()]
for d in L:
    if d['numero_hoja'] not in codigos: continue
    otros = [x for x in d['lineas'] if x.get('plazos') and x.get('bloque') != 'TRAMITACION SUBVENCIONES' and not x.get('incluido')]
    for x in d['lineas']:
        if x.get('bloque') == 'TRAMITACION SUBVENCIONES' and x.get('importe') and otros:
            antes = [(q['hito'], q['porcentaje']) for q in x['plazos']]
            x['plazos'] = [dict(q) for q in otros[0]['plazos']] + [q for q in x['plazos'] if q['hito'] == 'concesion']
            print(d['numero_hoja'], antes, '->', [(q['hito'], q['porcentaje']) for q in x['plazos']])
    d['nota'] = (d.get('nota') or '') + ' | Corregido: MANDA EL PAPEL (la hoja reparte el pago sobre todo, subvencion incluida).'
open(p, 'w', encoding='utf-8').write(''.join(json.dumps(d, ensure_ascii=False) + '\n' for d in L))
