# -*- coding: utf-8 -*-
"""DAN-2025-001: «SOLO hicimos el de un portal, el que viene en la opp, no el de la manzana completa» (Mónica, 20-oct-2026).
El portal es ALCALDE DE MÓSTOLES 9 (su carpeta de Dropbox, alcaldedemostoles9: «modificación completa de 3 ascensores»
= sus 3 escaleras C, D, I). Deshace pintor_picasso_edificio_entero.py (sus 11 relaciones fuera: las creé mal esa mañana)
y cierra con fecha de hoy las de los demás portales (del 1-oct, «darle TODAS las escaleras»).
  python scripts/opps/pintor_picasso_solo_su_portal.py [--escribir]
"""
import sys, os, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
o = b.leer('oportunidades?select=id,nombre&codigo=eq.DAN-2025-001')[0]
for r in b.leer('relacion_oportunidad_accesos?select=acceso_id,de_donde,hasta&hasta=is.null&opp_id=eq.' + o['id']):
    a = b.leer('accesos?select=nombre_via,numero,escalera&id=eq.' + r['acceso_id'], False)[0]
    suyo = a['nombre_via'] == 'ALCALDE DE MOSTOLES' and a['numero'] == '9' and a['escalera'] in ('C', 'D', 'I')
    que = 'se queda' if suyo else 'fuera (mía de hoy)' if (r['de_donde'] or '').startswith('SATE: va el edificio entero') else 'se cierra'
    print('%-20s %s %s %-3r %s' % (que, a['nombre_via'], a['numero'], a['escalera'], ''))
    if not ESCRIBIR or suyo: continue
    q = 'relacion_oportunidad_accesos?opp_id=eq.%s&acceso_id=eq.%s' % (o['id'], r['acceso_id'])
    if que.startswith('fuera'): b.borrar(q)
    else: b.actualizar(q, {'hasta': datetime.date.today().isoformat()})
if ESCRIBIR:
    b.actualizar('oportunidades?id=eq.' + o['id'], {'nombre': 'Alcalde de Mostoles 9, Mostoles (avenida)'})
