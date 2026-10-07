# -*- coding: utf-8 -*-
"""Oportunidades para las HOJAS DE ENCARGO que no casaban con ninguna (Monica, 8-oct-2026: "en todas tenemos hoja de
encargo, debemos crearles opp, con la fecha de la hoja"). La lista es la suya, del cruce de las hojas de Drive.
  - comunidad_provisional = la direccion tal como va en la hoja (MUNICIPIO); fecha_apertura = la fecha de la hoja;
  - comercial: Hachero 33 es de Alvaro (su Excel de hojas: "suyo", 2026); las demas, sin dato -> Daniel capta y lleva;
  - codigo: el SIGUIENTE libre de su serie (los codigos no se renumeran, asi que no van en orden de fecha);
  - origen_notas = de donde sale (la hoja), y tambien primera nota del diario, como todas.
Tres tienen carpeta en Castilla-La Mancha (no barrida): se dice su ruta en el origen.
  python scripts/barrido/opps_desde_hojas_sin_opp.py              -> marcha en seco
  python scripts/barrido/opps_desde_hojas_sin_opp.py --escribir
"""
import sys, os, re, uuid
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar

ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
COM = {c['iniciales']: c['id'] for c in b.leer('comerciales?select=id,iniciales')}
CLM = 'CASTILLA LA MANCHA\\GUADALAJARA\\1PROVINCIA\\'
# (direccion tal como va en la hoja, municipio, hojas, fecha de la hoja, captador/lleva, carpeta)
HOJAS = [
    ('Extremadura 13', 'FUENLABRADA', '1 sin firmar', '2025-01-31', 'DAN', None),
    ('Orellana 18', 'LEGANES', '1 sin firmar', '2025-02-25', 'DAN', None),
    ('Getafe 9', 'LEGANES', '1 sin firmar', '2025-02-26', 'DAN', None),
    ('Av. Ferrocarril 17', 'AZUQUECA DE HENARES', '2 sin firmar', '2025-04-30', 'DAN', CLM + 'AZUQUECA DE HENARES\\ferrocarril17'),
    ('Cadalso de los Vidrios 2', 'MADRID', '1 sin firmar', '2025-05-19', 'DAN', None),
    ('Carrero Juan Ramón 35', 'MADRID', '1 sin firmar', '2025-05-19', 'DAN', None),
    ('Fuentebella 27', 'PARLA', '1 sin firmar', '2025-05-22', 'DAN', None),
    ('Virgen del Camino 2', 'LEGANES', '1 sin firmar', '2025-06-02', 'DAN', None),
    ('Málaga 8', 'ALCORCON', '1 sin firmar', '2025-12-19', 'DAN', None),
    ('Móstoles 3', 'MORALEJA DE ENMEDIO', '1 sin firmar', '2026-03-02', 'DAN', None),
    ('Hachero 33', 'MADRID', '2 sin firmar', '2026-07-23', 'ALV', None),
    ('Castilla 3 Torre 5', 'AZUQUECA DE HENARES', '1 firmada', '2026-07-28', 'DAN', CLM + 'AZUQUECA DE HENARES\\castilla3torre5'),
    ('San Gerardo 51-53', 'MADRID', '6 sin firmar', '2026-07-30', 'DAN', None),
    ('Abejuela 4, Carabanchel', 'MADRID', '1 sin firmar', '2026-08-16', 'DAN', None),
    ('Río Segura 4', 'LEGANES', '1 sin firmar', '2026-08-16', 'DAN', None),
    ('Av. Albufera 220-222', 'MADRID', '1 sin firmar', '2026-08-25', 'DAN', None),
    ('Pablo Neruda 15', 'MADRID', '1 sin firmar', '2026-08-25', 'DAN', None),
    ('Riojanos 23', 'MADRID', '1 sin firmar', '2026-08-25', 'DAN', None),
    ('Av. Príncipe de Asturias 98', 'VILLAVICIOSA DE ODON', '2 sin firmar', '2026-08-31', 'DAN', None),
    ('Santa Áurea 17', 'MADRID', '2 sin firmar', '2026-08-31', 'DAN', None),
    ('Urb. Las Anclas, calle Galeón', 'PAREJA', '1 sin firmar', '2026-09-04', 'DAN', CLM + 'PAREJA\\urbanizacion las anclas callegaleon'),
    ('Adelfas 18', 'MADRID', '1 sin firmar', '2026-09-30', 'DAN', None),
    ('Antonio Salvador 81', 'MADRID', '2 sin firmar', '2026-10-05', 'DAN', None),
]
MARCA = 'Creada desde la hoja de encargo sin opp: '

ya = {o['comunidad_provisional'] for o in b.leer('oportunidades?select=comunidad_provisional&notas=like.*' + MARCA.replace(' ', '%20') + '*')}
ultimo = {}
for o in b.leer('oportunidades?select=codigo&codigo=not.is.null'):
    m = re.match(r'^([A-Z]{3})-(\d{4})-(\d{3})$', o['codigo'])
    if m: ultimo[(m.group(1), m.group(2))] = max(ultimo.get((m.group(1), m.group(2)), 0), int(m.group(3)))
opps, notas = [], []
for dire, muni, hojas, fecha, com, carpeta in HOJAS:
    prov = '%s (%s)' % (dire, muni)
    if prov in ya: print('ya creada:', prov); continue
    serie = (com, fecha[:4]); ultimo[serie] = ultimo.get(serie, 0) + 1
    cod = '%s-%s-%03d' % (com, fecha[:4], ultimo[serie])
    origen = ('Creada desde la HOJA DE ENCARGO (Monica, 8-oct-2026): la hoja no casaba con ninguna oportunidad.\n'
              'Direccion tal como va en la hoja: %s, %s. Hojas: %s. Fecha de la hoja: %s (= fecha de apertura).\n'
              'Comercial: %s.' % (dire, muni, hojas, '/'.join(reversed(fecha.split('-'))),
                                  'Alvaro (su Excel de hojas: "suyo")' if com == 'ALV' else 'sin dato, Daniel'))
    if carpeta: origen += '\nTiene carpeta en Castilla-La Mancha (no barrida): ' + carpeta
    oid = str(uuid.uuid4())
    opps.append({'id': oid, 'codigo': cod, 'comunidad_id': None, 'comunidad_provisional': prov, 'fecha_apertura': fecha, 'estado': 'abierta',
                 'comercial_captador_id': COM[com], 'comercial_id': COM[com], 'origen_notas': origen, 'notas': MARCA + dire})
    notas.append({'oportunidad_id': oid, 'fecha': fecha, 'texto': origen, 'origen': 'ficha_dropbox', 'autor': 'texto de origen'})
    print('%s  %s  %s' % (cod, fecha, prov))
print('opps nuevas: %d' % len(opps))
if ESCRIBIR and opps:
    b.insertar('oportunidades', opps)
    b.insertar('notas_oportunidad', notas)
    print('escrito')
elif not ESCRIBIR:
    print('*** MARCHA EN SECO ***')
