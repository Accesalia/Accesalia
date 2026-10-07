# -*- coding: utf-8 -*-
"""Europa 22 (Alcorcon): las tres opps son el MISMO encargo (Monica, 7-oct-2026). Se queda DAN-2025-015 (la de produccion,
con su comunidad); le pasan las notas, los enlaces a accesos y el texto de origen de DAN-2025-321 y CAR-2025-037, que se
borran con copia en Descargas. Los codigos NO se renumeran: los dos quedan como huecos de la serie.
  python scripts/barrido/unir_europa22_alcorcon.py            -> marcha en seco
  python scripts/barrido/unir_europa22_alcorcon.py --escribir
"""
import sys, os, json, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar

ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
QUEDA, SOBRAN = 'DAN-2025-015', ['DAN-2025-321', 'CAR-2025-037']
TABLAS = ['documentos', 'hojas_encargo', 'motivo_cierre_oportunidad', 'juntas', 'modelos_3d_venta', 'interacciones', 'tareas_seguimiento',
          'negociacion_oportunidad', 'viabilidades', 'oportunidad_tipos', 'avisos', 'iee_registrado', 'historial_pausas_oportunidad', 'manias_organismos']

q = b.leer('oportunidades?select=*&codigo=eq.' + QUEDA)[0]
origen = [q['origen_notas'] or '']
copia = {}
for cod in SOBRAN:
    o = b.leer('oportunidades?select=*&codigo=eq.' + cod)[0]
    for t in TABLAS:
        assert not b.leer('%s?select=oportunidad_id&oportunidad_id=eq.%s' % (t, o['id'])), (cod, t)
    assert not b.leer('oportunidades?select=id&oportunidad_origen_id=eq.' + o['id']), cod
    notas = b.leer('notas_oportunidad?select=*&oportunidad_id=eq.' + o['id'])
    subv = b.leer('notas_subvencion?select=*&oportunidad_id=eq.' + o['id'])
    rel = b.leer('relacion_oportunidad_accesos?select=*&opp_id=eq.' + o['id'])
    copia[cod] = {'oportunidad': o, 'notas_oportunidad': notas, 'notas_subvencion': subv, 'relacion_oportunidad_accesos': rel,
                  'hitos_oportunidad': b.leer('hitos_oportunidad?select=*&oportunidad_id=eq.' + o['id'])}
    origen.append('--- Unida desde %s (%s), mismo encargo (Monica, 7-oct-2026) ---\n%s' % (cod, o['comunidad_provisional'], o['origen_notas'] or ''))
    print('%s: %d notas, %d de subvencion, %d enlaces a accesos -> pasan a %s' % (cod, len(notas), len(subv), len(rel), QUEDA))
ya = {r['acceso_id'] for r in b.leer('relacion_oportunidad_accesos?select=acceso_id&opp_id=eq.' + q['id'])}
ref = q['referencia_catastral'] or next((c['oportunidad']['referencia_catastral'] for c in copia.values() if c['oportunidad']['referencia_catastral']), None)
print('referencia catastral de %s: %s -> %s' % (QUEDA, q['referencia_catastral'], ref))
if ESCRIBIR:
    f = os.path.join(os.path.expanduser('~'), 'Downloads', 'copia_europa22_alcorcon_unidas_7oct_%s.json' % time.strftime('%H%M'))
    json.dump(copia, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=str)
    print('copia en', f)
    for cod, c in copia.items():
        oid = c['oportunidad']['id']
        b.actualizar('notas_oportunidad?oportunidad_id=eq.' + oid, {'oportunidad_id': q['id']})
        if c['notas_subvencion']: b.actualizar('notas_subvencion?oportunidad_id=eq.' + oid, {'oportunidad_id': q['id']})
        for r in c['relacion_oportunidad_accesos']:
            if r['acceso_id'] not in ya:
                b.insertar('relacion_oportunidad_accesos', [{'opp_id': q['id'], 'acceso_id': r['acceso_id'], 'de_donde': r['de_donde'] + ' (pasado desde ' + cod + ')'}])
                ya.add(r['acceso_id'])
    b.actualizar('oportunidades?id=eq.' + q['id'], {'origen_notas': '\n\n'.join(x for x in origen if x.strip()), 'referencia_catastral': ref})
    for cod, c in copia.items():
        b.borrar('oportunidades?id=eq.' + c['oportunidad']['id'])
    print('unidas y borradas:', ', '.join(copia))
else:
    print('*** MARCHA EN SECO ***')
