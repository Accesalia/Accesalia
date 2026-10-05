# -*- coding: utf-8 -*-
"""
LAS CINCO QUE QUEDARON SIN PAREJA            (Monica, 4-oct-2026)

Cuatro se resolvieron mirando la base:
  conciclio11 -> CONCILIO 11 ALCOBENDAS. Errata en el nombre de la carpeta
      ("conCIclio"): Concilio 17 es otra finca y ya tiene sus notas.
  mejicosn    -> GARAJE MEJICO S/N FUENLABRADA. Es un garaje, por eso no
      encajaba con ningun patron de calle+numero. Su ficha no trae notas.
  paseocares1 -> PSO CARES 1 FUENLABRADA. El cotejo quitaba "ps" pero no "pso".
      Su ficha no trae notas.
  santamarialablanca5 -> CDAD PROP CL SANTAMARIA LA BLANCA 3 Y 5 IGLESIA 22.

Y la quinta, 'lilos6', sigue sin resolver: hay DOS fincas distintas con
referencias catastrales distintas -LOS LILOS 6 (9158902VK2695N) y LILOS 6 BIS
PORTAL 1, 2 (9158903VK2695N)- y la carpeta no distingue. Da igual para esto:
su ficha no trae ni una nota.

LA REGLA QUE SALIO DE SANTAMARIA LA BLANCA, y es mejor que la que yo usaba:
cuando una comunidad tiene VARIAS oportunidades, la carpeta va con la que tiene
el acceso de esa direccion, no con todas. Es un edificio en esquina con tres
portales y resulta que cada oportunidad ya tenia el suyo:

    SANTA MARIA LA BLANCA 3 esc 1  <- carpeta santamarialablanca3  (2021-11-10)
    SANTA MARIA LA BLANCA 5 esc 2  <- carpeta santamarialablanca5  (2021-11-10)
    IGLESIA LA 22        esc 3     <- carpeta iglesia22            (2023-01-01)

Antes yo colgaba las notas de TODAS las oportunidades de la comunidad, y eso
duplica. Quedan asi 9 filas de 743 en dos comunidades donde la regla no puede
decidir porque sus dos oportunidades comparten el mismo acceso.
"""
import io, os, re, sys, unicodedata
sys.path.insert(0, 'scripts')
from produccion import arrancar
from leer_fichas import PROVINCIA, fichas_de
from notas_de_las_apartadas import bloques_de
from notas_de_julio import trocear

# (municipio, carpeta, comunidad exacta, pista del acceso o None, anio)
CASOS = [
    ('ALCOBENDAS',  'conciclio11',         'CONCILIO 11 ALCOBENDAS',                              None, None),
    ('ALCORCON',    'santamarialablanca3', 'CDAD PROP CL SANTAMARIA LA BLANCA 3 Y 5 IGLESIA 22', ('SANTA MARIA LA BLANCA', '3'), 2021),
    ('ALCORCON',    'santamarialablanca5', 'CDAD PROP CL SANTAMARIA LA BLANCA 3 Y 5 IGLESIA 22', ('SANTA MARIA LA BLANCA', '5'), 2021),
    ('ALCORCON',    'iglesia22',           'CDAD PROP CL SANTAMARIA LA BLANCA 3 Y 5 IGLESIA 22', ('IGLESIA', '22'),              2023),
]

pel = lambda s: ''.join(c for c in unicodedata.normalize('NFKD', s or '')
                        if not unicodedata.combining(c)).upper()

def main():
    escribir = '--escribir' in sys.argv
    b = arrancar()
    sys.stdout.write('\n*** %s ***\n\n' % ('ESCRIBIENDO' if escribir else 'MARCHA EN SECO'))
    opp_filas, subv_filas = [], []
    for muni, carp, nombre, pista, anio in CASOS:
        com = b.leer('comunidades?select=id&nombre=eq.' + nombre.replace(' ', '%20'), por_tramos=False)
        if not com:
            sys.stdout.write('   !! sin comunidad: %s\n' % nombre); continue
        opps = b.leer('oportunidades?select=id&comunidad_id=eq.' + com[0]['id'], por_tramos=False)
        elegidas = [o['id'] for o in opps]
        if pista and len(opps) > 1:
            via, num = pel(pista[0]), pista[1]
            elegidas = []
            for o in opps:
                acc = b.leer('relacion_oportunidad_accesos?select=accesos(nombre_via,numero)'
                             '&opp_id=eq.' + o['id'], por_tramos=False)
                for a in acc:
                    d = a.get('accesos') or {}
                    if via in pel(d.get('nombre_via')) and (d.get('numero') or '') == num:
                        elegidas.append(o['id']); break
        rutas = fichas_de(os.path.join(PROVINCIA, muni, carp))
        if not rutas or not elegidas:
            sys.stdout.write('   !! %-22s ficha=%s opps=%d\n' % (carp, bool(rutas), len(elegidas))); continue
        bl = bloques_de(rutas[0])
        n = 0
        for clave, destino in (('oportunidad', opp_filas), ('subvencion', subv_filas)):
            for f, texto in trocear(bl[clave], anio):
                for oid in elegidas:
                    destino.append({'oportunidad_id': oid, 'fecha': f, 'texto': texto,
                                    'origen': 'ficha_dropbox'})
                n += 1
        sys.stdout.write('   %-22s -> %-46s %d notas, %d opp\n' % (carp, nombre[:46], n, len(elegidas)))

    sys.stdout.write('\n   notas_oportunidad: %d   notas_subvencion: %d\n' % (len(opp_filas), len(subv_filas)))
    if not escribir:
        sys.stdout.write('\n   (marcha en seco. Para hacerlo: --escribir)\n\n'); return
    if opp_filas: b.insertar('notas_oportunidad', opp_filas)
    if subv_filas: b.insertar('notas_subvencion', subv_filas)
    sys.stdout.write('\n   total en produccion: notas_oportunidad=%d  notas_subvencion=%d\n'
                     % (len(b.leer('notas_oportunidad?select=id', por_tramos=True)),
                        len(b.leer('notas_subvencion?select=id', por_tramos=True))))

main()
