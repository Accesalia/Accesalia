# -*- coding: utf-8 -*-
# Parte a) en la CLON: el campo comercial_interno queda normalizado a "captador (lleva X)" con las mismas reglas que produccion
# (Monica, 7-oct-2026). El valor anterior se guarda en `notas`. Sin --escribir: marcha en seco.
import sys, os, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar
ESCRIBIR = '--escribir' in sys.argv
b = arrancar(); T = 'comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una'
def regla(c, f):
    c = (c or '').strip(); de2026 = f >= '2026-01-01'
    if c in ('Daniel', 'Alvaro', 'Daniel (lleva Alvaro)', 'Carlos (lleva Alvaro)'): return c   # ya normalizado
    if c.startswith('Carlos') or 'capto Carlos' in c or c.startswith('VARIOS: CARLOS'): return 'Carlos (lleva Alvaro)'
    if c.startswith('Alvaro'): return 'Alvaro' if de2026 else 'Daniel (lleva Alvaro)'
    return 'Daniel'
cuenta = collections.Counter(); cambios = []
for r in b.leer(T + '?select=id,comercial_interno,fecha_apertura,notas'):
    n = regla(r['comercial_interno'], r['fecha_apertura']); cuenta[(r['comercial_interno'], n)] += 1
    if n != r['comercial_interno']: cambios.append((r, n))
for k, v in cuenta.most_common(): print('%5d  %-28s -> %s' % (v, k[0], k[1]))
print('cambian:', len(cambios))
if ESCRIBIR:
    for r, n in cambios:
        nota = 'Comercial antes de normalizar (7-oct-2026): ' + str(r['comercial_interno'])
        b.actualizar(T + '?id=eq.' + r['id'], {'comercial_interno': n, 'notas': (r['notas'] + '\n' + nota) if r['notas'] else nota})
    print('escritas')
