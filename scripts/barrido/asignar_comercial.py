# -*- coding: utf-8 -*-
# Parte a) antes de numerar: captador y responsable de TODAS las oportunidades de produccion (Monica, 7-oct-2026).
# Reglas:
#  - Captada por Carlos (o sin captador y la lleva Carlos): captador Carlos, la lleva Alvaro (Carlos ya no esta).
#    PERO Carlos no puede ser captador antes de 2025: entonces capta Daniel y la lleva Alvaro (Monica, 7-oct-2026).
#  - En el Excel de Alvaro (HOJAS DE ENCARGO alvaro.xlsx, 26-ene a 27-jul-2026; cruce en cruce_excel_alvaro.json):
#      "prestado"  -> captador Daniel, la lleva Alvaro (solo esa opp; la administracion sigue siendo de Daniel).
#      "suyo" / "contrata, no admin" -> Alvaro/Alvaro si la apertura es de 2026; si es anterior, captador Daniel y la lleva Alvaro.
#  - Alvaro SOLO puede ser captador con fecha de 2026 (se incorporo en enero-2026). Si Alvaro ya la tocaba y es anterior: captador Daniel, la lleva Alvaro.
#  - Todo lo demas: Daniel / Daniel.
# Sin --escribir: marcha en seco.
import sys, os, json, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar

ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
AQUI = os.path.dirname(os.path.abspath(__file__))
res = json.load(open(os.path.join(AQUI, 'cruce_excel_alvaro.json'), encoding='utf-8'))
MANUAL = {11: '2e00e663-dda5-45ad-827c-bdddd2606e20', 13: '2e00e663-dda5-45ad-827c-bdddd2606e20', 14: '2e00e663-dda5-45ad-827c-bdddd2606e20',
          89: 'd9e8c341-bde2-463d-863b-69ef6506b291', 103: 'ee0844c9-58af-4c99-8836-2f9c7ef6bd05', 115: '5458a3d4-e931-486c-98fc-afa1065d6eda',
          133: '8ccd60d1-6d97-4eb7-8396-2ac0eb0bb1ff', 114: 'dab38b4e-c569-4386-9a10-5e234b1b2c3d'}
EXCEL = {}
for x in res:
    for i in ([MANUAL[x['num']]] if x['num'] in MANUAL else [p[0] for p in x['prod']][:1]):
        EXCEL.setdefault(i, set()).add(x['nota'])
com = {c['nombre']: c['id'] for c in b.leer('comerciales?select=id,nombre')}
nom = {v: k for k, v in com.items()}
cuenta, cambia = collections.Counter(), []
for o in b.leer('oportunidades?select=id,fecha_apertura,comercial_captador_id,comercial_id'):
    f = o['fecha_apertura']; cap0, lle0 = nom.get(o['comercial_captador_id']), nom.get(o['comercial_id'])
    de2026 = f >= '2026-01-01'
    if (cap0 == 'Carlos' or (cap0 is None and lle0 == 'Carlos')) and f < '2025-01-01':
        nuevo, por = ('Daniel', 'Alvaro'), 'Carlos antes de 2025: capta Daniel (Monica, 7-oct)'
    elif cap0 == 'Carlos' or (cap0 is None and lle0 == 'Carlos'):
        nuevo, por = ('Carlos', 'Alvaro'), 'Carlos'
    elif o['id'] in EXCEL:
        notas = EXCEL[o['id']]
        if notas == {'prestado'}: nuevo, por = ('Daniel', 'Alvaro'), 'Excel: prestado'
        elif de2026:            nuevo, por = ('Alvaro', 'Alvaro'), 'Excel: suyo (2026)'
        else:                   nuevo, por = ('Daniel', 'Alvaro'), 'Excel: suyo, pero anterior a 2026'
    elif cap0 == 'Alvaro' or lle0 == 'Alvaro':
        if cap0 == 'Alvaro' and de2026: nuevo, por = ('Alvaro', 'Alvaro'), 'Alvaro segun la ficha (2026)'
        else:                           nuevo, por = ('Daniel', 'Alvaro'), 'la toca Alvaro, anterior a 2026 o captada por Daniel'
    else:
        nuevo, por = ('Daniel', 'Daniel'), 'resto'
    cuenta[(por,) + nuevo] += 1
    if (cap0, lle0) != nuevo:
        cambia.append((o['id'], nuevo))
for k, v in sorted(cuenta.items(), key=lambda kv: -kv[1]): print('%5d  %-55s captador %-7s la lleva %s' % (v, k[0], k[1], k[2]))
print('cambian:', len(cambia))
if ESCRIBIR:
    for i, (cap, lle) in cambia:
        b.actualizar('oportunidades?id=eq.' + i, {'comercial_captador_id': com[cap], 'comercial_id': com[lle]})
    print('escritas')
else:
    print('*** MARCHA EN SECO ***')
