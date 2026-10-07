# -*- coding: utf-8 -*-
# Oportunidades sin fecha de apertura de LEGANES, MOSTOLES, GETAFE, FUENLABRADA y ALCORCON (los grandes, barridos por otra via).
# Fecha = la PRIMERA HUELLA: la mas antigua entre la ficha de la carpeta (fechas_opps_sin_fecha.csv), la primera nota y la hoja de encargo
# (sin el relleno 2000-01-01). Monica, 7-oct-2026: "primera huella es la fecha; no nos vamos a complicar con casos limite muy escasos".
# Sin --escribir: marcha en seco.
import sys, os, csv
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar

ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
MUNIS = {'LEGANES', 'MOSTOLES', 'GETAFE', 'FUENLABRADA', 'ALCORCON'}
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
CSVF = {r['comunidad_id']: r for r in csv.DictReader(open(os.path.join(RAIZ, 'fechas_opps_sin_fecha.csv'), encoding='utf-8'), delimiter='|')}
opps = [o for o in b.leer('oportunidades?select=id,comunidad_id,origen_notas,comunidad:comunidades(nombre,municipio)&fecha_apertura=is.null')
        if o['comunidad'] and o['comunidad']['municipio'] in MUNIS]
hechas, sin = 0, []
for o in opps:
    cands = []
    fc = CSVF.get(o['comunidad_id'], {}).get('fecha')
    if fc: cands.append((fc, 'la ficha de la carpeta'))
    notas = sorted(n['fecha'] for n in b.leer('notas_oportunidad?select=fecha&oportunidad_id=eq.' + o['id']) if n['fecha'])
    if notas: cands.append((notas[0], 'la primera nota'))
    he = sorted(h['fecha_creacion'] for h in b.leer('hojas_encargo?select=fecha_creacion&comunidad_id=eq.' + o['comunidad_id'])
                if h['fecha_creacion'] and h['fecha_creacion'] > '2000-01-01')
    if he: cands.append((he[0], 'la hoja de encargo'))
    if not cands:
        sin.append(o['comunidad']['nombre']); continue
    f, src = min(cands)
    hechas += 1
    if ESCRIBIR:
        datos = {'fecha_apertura': f}
        if not o['origen_notas']:
            datos['origen_notas'] = 'Fecha de apertura: la primera huella (%s/%s/%s, de %s) (Monica, 7-oct-2026).' % (f[8:10], f[5:7], f[:4], src)
        b.actualizar('oportunidades?id=eq.' + o['id'], datos)
print('con fecha: %d | sin ninguna fuente: %d %s' % (hechas, len(sin), sin))
print('escritas' if ESCRIBIR else '*** MARCHA EN SECO ***')
