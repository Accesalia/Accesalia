# -*- coding: utf-8 -*-
# Borra de la APP (no del Dropbox) cinco oportunidades VACIAS que sobran (Monica, 7-oct-2026: "se borran de la app, obviamente, no del dropbox").
# Antes guarda copia en Descargas (la opp, sus hitos y sus enlaces a accesos). Sin --borrar: marcha en seco.
# Las comunidades NO se tocan (la lista de comunidades es suya).
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar

BORRAR = '--borrar' in sys.argv
b = arrancar()
SOBRAN = {
    '507df806-de86-489d-a9ad-960f40097ed5': 'FRANCISCO FATOU 26: el conjunto Fatou 24-26 / Felipe Alvarez 28 es UNA opp (la de Fatou 24) con tres hojas de encargo.',
    '54fca7bb-985e-4629-b847-bd75b10006f6': 'FELIPE ALVAREZ 28: idem (la opp del conjunto es la de Fatou 24).',
    '85f5eae1-3198-4365-83cf-02f8e79b9eeb': 'GENERAL RICADOS 238 (errata): duplicada de General Ricardos 238.',
    '780e73b4-151f-4c85-9f51-c7a526157405': 'EPOCA 23: misma parcela que Epoca 25; el encargo (2 ascensores) es la opp de Epoca 25.',
    '3e1c5f9b-a60f-4e2b-ae96-e202607e664b': 'CAMINO GANAPANES 31: segunda opp; Ganapanes 31-33-35 es una sola opp con los tres portales.',
}
TABLAS_CON_DATOS = ['documentos', 'hojas_encargo', 'motivo_cierre_oportunidad', 'juntas', 'modelos_3d_venta', 'interacciones', 'tareas_seguimiento',
                    'negociacion_oportunidad', 'viabilidades', 'oportunidad_tipos', 'avisos', 'iee_registrado', 'historial_pausas_oportunidad',
                    'notas_oportunidad', 'notas_subvencion', 'manias_organismos']
copia = {}
for oid, motivo in SOBRAN.items():
    o = b.leer('oportunidades?select=*&id=eq.' + oid)
    if not o:
        print('ya no existe, se salta:', oid); continue
    o = o[0]
    assert not o['origen_notas'] and not o['fecha_apertura'] and not o['quien_lo_trae'], oid
    for t in TABLAS_CON_DATOS:
        assert not b.leer('%s?select=oportunidad_id&oportunidad_id=eq.%s' % (t, oid)), (oid, t)
    assert not b.leer('oportunidades?select=id&oportunidad_origen_id=eq.' + oid), oid
    copia[oid] = {'motivo': motivo, 'oportunidad': o,
                  'hitos_oportunidad': b.leer('hitos_oportunidad?select=*&oportunidad_id=eq.' + oid),
                  'relacion_oportunidad_accesos': b.leer('relacion_oportunidad_accesos?select=*&opp_id=eq.' + oid)}
    print('%s  %s' % (oid[:8], motivo))
if copia:
    f = os.path.join(os.path.expanduser('~'), 'Downloads', 'copia_opps_sobrantes_borradas_7oct.json')
    if BORRAR:
        json.dump(copia, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=str)
        print('copia en', f)
        for oid in copia:
            b.borrar('oportunidades?id=eq.' + oid)   # en cascada: sus hitos por defecto y sus enlaces a accesos
        print('borradas:', len(copia))
    else:
        print('\n*** MARCHA EN SECO *** se borrarian %d oportunidades (con copia en %s)' % (len(copia), f))
