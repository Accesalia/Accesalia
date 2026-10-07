# -*- coding: utf-8 -*-
"""Unir opps duplicadas (el MISMO encargo) en una: la que QUEDA recibe las notas, los enlaces a accesos y el texto de
origen de las que SOBRAN, que se borran con copia en Descargas. Los codigos NO se renumeran: quedan como huecos.
  python scripts/barrido/unir_opps.py QUEDA SOBRA [SOBRA...] [--sin-accesos] [--escribir]
  --sin-accesos: los enlaces a accesos de las que sobran NO se pasan (estaban mal) y sus accesos, si quedan huerfanos, se borran.
Hechas: Europa 22 Alcorcon (unir_europa22_alcorcon.py, 7-oct); Rio Segura 8 Leganes (8-oct).
"""
import sys, os, json, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar

ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
ARGS = [a for a in sys.argv[1:] if not a.startswith('--')]
QUEDA, SOBRAN = ARGS[0], ARGS[1:]
SIN_ACCESOS = '--sin-accesos' in sys.argv
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
    origen.append('--- Unida desde %s (%s), mismo encargo (Monica, %s) ---\n%s' % (cod, o['comunidad_provisional'], time.strftime('%d-%m-%Y'), o['origen_notas'] or ''))
    print('%s: %d notas, %d de subvencion, %d enlaces a accesos -> pasan a %s' % (cod, len(notas), len(subv), len(rel), QUEDA))
ya = {r['acceso_id'] for r in b.leer('relacion_oportunidad_accesos?select=acceso_id&opp_id=eq.' + q['id'])}
ref = q['referencia_catastral'] if SIN_ACCESOS else q['referencia_catastral'] or next((c['oportunidad']['referencia_catastral'] for c in copia.values() if c['oportunidad']['referencia_catastral']), None)
print('referencia catastral de %s: %s -> %s' % (QUEDA, q['referencia_catastral'], ref))
if ESCRIBIR:
    f = os.path.join(os.path.expanduser('~'), 'Downloads', 'copia_opps_unidas_%s_%s.json' % (QUEDA, time.strftime('%d%b_%H%M')))
    json.dump(copia, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=str)
    print('copia en', f)
    for cod, c in copia.items():
        oid = c['oportunidad']['id']
        b.actualizar('notas_oportunidad?oportunidad_id=eq.' + oid, {'oportunidad_id': q['id']})
        if c['notas_subvencion']: b.actualizar('notas_subvencion?oportunidad_id=eq.' + oid, {'oportunidad_id': q['id']})
        for r in ([] if SIN_ACCESOS else c['relacion_oportunidad_accesos']):
            if r['acceso_id'] not in ya:
                b.insertar('relacion_oportunidad_accesos', [{'opp_id': q['id'], 'acceso_id': r['acceso_id'], 'de_donde': r['de_donde'] + ' (pasado desde ' + cod + ')'}])
                ya.add(r['acceso_id'])
    b.actualizar('oportunidades?id=eq.' + q['id'], {'origen_notas': '\n\n'.join(x for x in origen if x.strip()), 'referencia_catastral': ref})
    for cod, c in copia.items():
        b.borrar('oportunidades?id=eq.' + c['oportunidad']['id'])
        if SIN_ACCESOS:
            for r in c['relacion_oportunidad_accesos']:
                if not b.leer('relacion_oportunidad_accesos?select=opp_id&acceso_id=eq.' + r['acceso_id']):
                    c.setdefault('accesos_borrados', []).append(b.leer('accesos?select=*&id=eq.' + r['acceso_id']))
                    b.borrar('accesos?id=eq.' + r['acceso_id'])
                    print('acceso huerfano borrado', r['acceso_id'])
    json.dump(copia, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=str)   # otra vez, con los accesos borrados
    print('unidas y borradas:', ', '.join(copia))
else:
    print('*** MARCHA EN SECO ***')
