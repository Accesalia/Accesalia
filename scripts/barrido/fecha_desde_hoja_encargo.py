# -*- coding: utf-8 -*-
# Oportunidades de MADRID sin carpeta en Dropbox y sin fecha de apertura: la fecha es la de su HOJA DE ENCARGO mas antigua
# (sin contar el relleno 2000-01-01). Monica, 7-oct-2026: "es una buena fecha, que nos sirve para el objetivo real: poder seguirlas".
# Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar

ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
opps = [o for o in b.leer('oportunidades?select=id,comunidad_id,fecha_apertura,origen_notas,comunidad:comunidades(nombre,municipio)&fecha_apertura=is.null')
        if o['comunidad'] and o['comunidad']['municipio'] == 'MADRID']
con, sin = [], []
for o in opps:
    fechas = sorted(h['fecha_creacion'] for h in b.leer('hojas_encargo?select=fecha_creacion&comunidad_id=eq.' + o['comunidad_id'])
                    if h['fecha_creacion'] and h['fecha_creacion'] > '2000-01-01')
    (con if fechas else sin).append((o, fechas[0] if fechas else None))
for o, f in sorted(con, key=lambda x: x[1]):
    print('%s  %s' % (f, o['comunidad']['nombre']))
print('\ncon fecha: %d | sin fecha posible (solo hojas 2000-01-01 o ninguna): %d' % (len(con), len(sin)))
for o, f in sin: print('   SIN:', o['comunidad']['nombre'])
if ESCRIBIR:
    for o, f in con:
        d, m, a = f[8:10], f[5:7], f[:4]
        nota = ('Sin carpeta en Dropbox. Fecha de apertura: la de la hoja de encargo mas antigua (%s/%s/%s), para poder seguirla (Monica, 7-oct-2026).' % (d, m, a))
        datos = {'fecha_apertura': f}
        if not o['origen_notas']: datos['origen_notas'] = nota
        b.actualizar('oportunidades?id=eq.' + o['id'], datos)
    print('escritas:', len(con))
else:
    print('*** MARCHA EN SECO ***')
