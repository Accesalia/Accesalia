# -*- coding: utf-8 -*-
"""
LAS CUATRO DUDOSAS DEL COTEJO, RESUELTAS      (Monica, 4-oct-2026)

El cotejo por direccion dejo cuatro carpetas con mas de una comunidad candidata.
Las cuatro las resolvio LA REFERENCIA CATASTRAL, que es el unico dato que no
miente:

  comunidaddemadrid28 -> COMUNIDAD DE MADRID 28   (2793005VK3529S). La otra
      candidata era la del numero 9, carpeta comunidaddemadrid9: otra finca.
  zamora12 -> ZAMORA 12 (2009101VK3610N) y zamora21 -> ZAMORA 21 (1911203VK3611S).
      La ambiguedad venia de "CDAD PROP ED ZAMORA CL ZAMORA", que es el EDIFICIO
      DE TRES PORTALES (carpeta zamora1-3-5) y no lleva numero en el nombre, asi
      que encajaba con cualquier Zamora. Su referencia es 1908101VK3610N, y
      ademas estan Zamora 6 y Zamora 25: cinco fincas distintas.
  castillalanueva37 -> la comunidad CON CIF, que es la misma finca que
      castillalanueva37bis (misma referencia catastral). No eran dos comunidades
      sino DOS ENCARGOS sobre la misma: la rampa de 2021 y la de 2025. La
      oportunidad de 2021 ya se movio ahi y la fila duplicada se jubilo.
"""
import io, os, sys
sys.path.insert(0, 'scripts')
from produccion import arrancar
from leer_fichas import PROVINCIA, fichas_de
from notas_de_las_apartadas import bloques_de
from notas_de_julio import trocear

CASOS = [
    # (municipio, carpeta, nombre exacto de la comunidad, fecha_apertura de la opp o None)
    ('FUENLABRADA', 'comunidaddemadrid28', 'COMUNIDAD DE MADRID 28 FUENLABRADA', None),
    ('FUENLABRADA', 'zamora12',            'ZAMORA 12 FUENLABRADA',              None),
    ('FUENLABRADA', 'zamora21',            'ZAMORA 21 FUENLABRADA',              None),
    ('FUENLABRADA', 'castillalanueva37',
     'CDAD PROP CL CASTILLA LA NUEVA N 37 BIS FUENLABRADA', '2021-02-23'),
]
ANIO = {'comunidaddemadrid28': None, 'zamora12': None, 'zamora21': None,
        'castillalanueva37': 2021}

def main():
    escribir = '--escribir' in sys.argv
    b = arrancar()
    sys.stdout.write('\n*** %s ***\n\n' % ('ESCRIBIENDO' if escribir else 'MARCHA EN SECO'))
    filas = []
    for muni, carp, nombre, fecha in CASOS:
        com = b.leer('comunidades?select=id&nombre=eq.' + nombre.replace(' ', '%20'), por_tramos=False)
        if not com:
            sys.stdout.write('   !! no encuentro la comunidad %r\n' % nombre); continue
        q = 'oportunidades?select=id,fecha_apertura&comunidad_id=eq.' + com[0]['id']
        if fecha:
            q += '&fecha_apertura=eq.' + fecha
        opps = [o['id'] for o in b.leer(q, por_tramos=False)]
        rutas = fichas_de(os.path.join(PROVINCIA, muni, carp))
        if not rutas or not opps:
            sys.stdout.write('   !! %s: ficha=%s opps=%d\n' % (carp, bool(rutas), len(opps))); continue
        bl = bloques_de(rutas[0])
        n = 0
        for clave in ('oportunidad', 'subvencion'):
            for f, texto in trocear(bl[clave], ANIO.get(carp)):
                for oid in opps:
                    filas.append((clave, {'oportunidad_id': oid, 'fecha': f,
                                          'texto': texto, 'origen': 'ficha_dropbox'}))
                n += 1
        sys.stdout.write('   %-22s -> %-50s %d notas, %d opp\n' % (carp, nombre[:50], n, len(opps)))

    opp = [x for c, x in filas if c == 'oportunidad']
    sub = [x for c, x in filas if c == 'subvencion']
    sys.stdout.write('\n   notas_oportunidad: %d   notas_subvencion: %d\n' % (len(opp), len(sub)))
    if not escribir:
        sys.stdout.write('\n   (marcha en seco. Para hacerlo: --escribir)\n\n'); return
    if opp: b.insertar('notas_oportunidad', opp)
    if sub: b.insertar('notas_subvencion', sub)
    sys.stdout.write('\n   escrito. total en produccion: notas_oportunidad=%d  notas_subvencion=%d\n'
                     % (len(b.leer('notas_oportunidad?select=id', por_tramos=True)),
                        len(b.leer('notas_subvencion?select=id', por_tramos=True))))

main()
