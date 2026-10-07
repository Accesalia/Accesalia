# -*- coding: utf-8 -*-
"""Direcciones (comunidades) sin oportunidad, 8-oct-2026 (Monica: "si").
  - Portales de conjuntos: casi todos ya estaban enlazados a la opp del conjunto; faltaban Epoca 23 (-> CAR-2025-056)
    y Lopez de Hoyos 342 (la 342B, -> CAR-2025-051). Las comunidades se QUEDAN (son su lista; cada portal es su CP y su hoja).
  - Erratas: "GENERAL RICADOS 238" y "CIFUENTES 4" (= RIO CIFUENTES 4, misma parcela): su hoja de encargo pasa a la buena y se borran.
  python scripts/barrido/direcciones_sin_opp_8oct.py [--escribir]
"""
import sys, os, json, time
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar
ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
q = lambda s: s.replace(' ', '%20')
opp = lambda cod: b.leer('oportunidades?select=id,comunidad_id&codigo=eq.' + cod)[0]
ENLACES = [('CAR-2025-056', 'EPOCA', '23', '1'), ('CAR-2025-051', 'LOPEZ DE HOYOS', '342', '')]
ERRATAS = [('GENERAL RICADOS 238 MADRID', 'DAN-2025-418'), ('CIFUENTES 4 ALCALA DE HENARES', 'DAN-2025-288')]
for cod, via, num, esc in ENLACES:
    o = opp(cod)
    a = b.leer('accesos?select=id,municipio,tipo_via,nombre_via,numero,escalera&municipio=eq.MADRID&nombre_via=eq.%s&numero=eq.%s&escalera=eq.%s' % (q(via), num, esc))
    assert len(a) == 1, (via, num, a); a = a[0]
    ya = b.leer('relacion_oportunidad_accesos?select=opp_id&opp_id=eq.%s&acceso_id=eq.%s' % (o['id'], a['id']))
    print('enlazar', a['tipo_via'], a['nombre_via'], a['numero'], a['escalera'], '->', cod, '(ya estaba)' if ya else '')
    if ESCRIBIR and not ya:
        b.insertar('relacion_oportunidad_accesos', [{'opp_id': o['id'], 'acceso_id': a['id'],
                    'de_donde': 'Portal de una comunidad del mismo conjunto, sin opp propia (Monica, 8-oct-2026).'}])
copia = {}
for nombre, cod in ERRATAS:
    c = b.leer('comunidades?select=*&nombre=eq.' + q(nombre)); assert len(c) == 1, nombre; c = c[0]
    buena = opp(cod)['comunidad_id']
    hojas = b.leer('hojas_encargo?select=*&comunidad_id=eq.' + c['id'])
    otras = {t: b.leer('%s?select=*&comunidad_id=eq.%s' % (t, c['id'])) for t in ['personas_comunidad', 'comunidad_admin_responsable', 'documentos', 'proyectos', 'expedientes', 'oportunidades']}
    assert not any(otras[t] for t in ['personas_comunidad', 'documentos', 'proyectos', 'expedientes', 'oportunidades']), (nombre, {t: len(v) for t, v in otras.items()})
    copia[nombre] = {'comunidad': c, 'hojas_encargo': hojas, **otras, 'comunidad_buena': buena}
    print('errata', nombre, '-> comunidad de', cod, '| hojas que pasan:', len(hojas), '| admin:', len(otras['comunidad_admin_responsable']))
if ESCRIBIR:
    f = os.path.join(os.path.expanduser('~'), 'Downloads', 'copia_comunidades_errata_borradas_8oct_%s.json' % time.strftime('%H%M'))
    json.dump(copia, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=str); print('copia en', f)
    for nombre, x in copia.items():
        b.actualizar('hojas_encargo?comunidad_id=eq.' + x['comunidad']['id'], {'comunidad_id': x['comunidad_buena']})
        b.borrar('comunidades?id=eq.' + x['comunidad']['id'])
    print('escrito')
else:
    print('*** MARCHA EN SECO ***')
