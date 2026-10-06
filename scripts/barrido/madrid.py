# -*- coding: utf-8 -*-
"""Lee una tanda de Madrid capital: carpetas que empiezan por LETRA(S).

Madrid no cuelga de 1APROVINCIA sino directamente de MADRID, y tiene 1.448
carpetas, asi que se barre por letras (tandas de ~49). Para cada carpeta saca
las comunidades de produccion que casan por direccion (mismo cotejo que
cotejar_carpeta_con_comunidad.py), sus opps, y el texto de las fichas.

Uso: python scripts/barrido/madrid.py B [desde hasta]   (desde/hasta = indices)
"""
import os, sys, datetime, re, unicodedata
from urllib.parse import quote
sys.path.insert(0, 'scripts')
from leer_fichas import PROVINCIA, fichas_de, texto_del_docx
from produccion import arrancar

RAIZ = os.path.dirname(PROVINCIA)

def limpio(s):
    s = unicodedata.normalize('NFKD', s or '')
    return ''.join(c for c in s if not unicodedata.combining(c)).lower()

GEN = r'(cdad|prop|comunidad|propietarios|calle|avda|avenida|paseo|plaza|carretera|madrid)'
def letras(s):
    t = re.sub(r'\b' + GEN + r'\b', ' ', limpio(s))
    t = re.sub(r'\b(cl|av|pz|ps|ctra|n|no|num|esc|escalera|portal|fase|bloque|bis|ed|edificio)\b', ' ', t)
    return re.sub(r'[^a-z]', '', t)
numeros = lambda s: set(re.findall(r'\d+', limpio(s)))
# en la carpeta el tipo de via va pegado: 'avbetanzos60', 'paseodelahabana15'
PREF = ('paseode', 'paseo', 'plazade', 'plaza', 'pza', 'pz', 'av', 'travesiade', 'travesia',
        'caminode', 'camino', 'carreterade', 'carretera', 'ronda', 'rondade')

def casa(carp, nombre):
    lc, nc = letras(carp), numeros(carp)
    lo, no = letras(nombre), numeros(nombre)
    if len(lc) < 4 or len(lo) < 4:
        return False
    variantes = {lc} | {lc[len(p):] for p in PREF if lc.startswith(p) and len(lc) - len(p) >= 4}
    pl = any(v == lo or (len(v) >= 6 and v in lo) or (len(lo) >= 6 and lo in v) for v in variantes)
    pn = ((not nc) or (not no) or nc == no or (len(nc) == 1 and nc <= no) or (len(no) == 1 and no <= nc))
    if not pl:
        # cotejo de reserva (6-oct-2026): la carpeta pega "de la", "del" o "portal" que el nombre
        # no lleva (o al reves): 'arroyodelamedialegua30' / ARROYO MEDIA LEGUA 30,
        # 'ayamonte2portala-b' / AYAMONTE 2 PORTAL A-B, 'arroyofontarron381' / ARROYO DE FONTARRON 381.
        # Se fallo en tres de la A3; aqui se exige ademas que los numeros coincidan.
        flojo = lambda s: re.sub(r'(portal|del|de|la|las|los)', '', s.replace('doctor', 'dr').replace('nuestrasenora', 'ntrasra'))
        fc, fo = {flojo(v) for v in variantes}, flojo(lo)
        pl = bool(no) and nc == no and any(v == fo or (len(v) >= 6 and (v in fo or fo in v)) for v in fc)
    return pl and pn

def inicial(c):
    return unicodedata.normalize('NFKD', c)[0].upper()

def main():
    let = sys.argv[1].upper()
    b = arrancar()
    carps = sorted((c for c in os.listdir(RAIZ) if c != '1APROVINCIA'
                    and os.path.isdir(os.path.join(RAIZ, c)) and inicial(c) in let), key=limpio)
    if len(sys.argv) > 3:
        carps = carps[int(sys.argv[2]):int(sys.argv[3])]
    coms = b.leer('comunidades?select=id,nombre,referencia_catastral&municipio=eq.MADRID', por_tramos=True)
    clon = {x['carpeta']: x for x in b.leer(
        'comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una?select=id,carpeta&municipio=eq.MADRID')}
    print('### %d carpetas: %s' % (len(carps), ', '.join(carps)))
    for carp in carps:
        c = os.path.join(RAIZ, carp)
        fs = []
        for raiz, _, f in os.walk(c):
            for x in f:
                p = os.path.join(raiz, x)
                try: fs.append((datetime.datetime.fromtimestamp(os.path.getmtime(p)).date(), os.path.relpath(p, c)))
                except OSError: pass
        fs.sort()
        print('\n' + '=' * 30, carp, '| %d ficheros | primero %s %s | ultimo %s' % (
            len(fs), fs[0][0] if fs else '-', fs[0][1][:50] if fs else '', fs[-1][0] if fs else '-'))
        if carp in clon:
            print('  CLON ya tiene fila', clon[carp]['id'][:8])
        # carpetas coladas dentro de esta (6-oct-2026: aeronave33 dentro de acuerdo34 y albalatedelarzobispo5
        # dentro de alameda4 tenian comunidad en produccion y fueron a la clon por no cotejarlas)
        for sub in sorted(os.listdir(c)):
            if os.path.isdir(os.path.join(c, sub)) and fichas_de(os.path.join(c, sub)) and not re.match(r'^\d', sub):
                for com in [x for x in coms if casa(sub, x['nombre'])]:
                    print('  OJO, CARPETA COLADA "%s" -> PROD %s' % (sub, com['nombre']))
        for com in [x for x in coms if casa(carp, x['nombre'])]:
            ops = b.leer('oportunidades?select=id,codigo,estado,fecha_apertura,quien_lo_trae,comercial_id,puesto_id,persona_comunidad_id,origen_notas,tipos:oportunidad_tipos(tipo_id),vivos:relacion_oportunidad_accesos(count)&comunidad_id=eq.' + com['id'])
            for o in ops:
                nn = len(b.leer('notas_oportunidad?select=id&oportunidad_id=eq.' + o['id']))
                print('  PROD %-40s | opp %s %s %s ap=%s notas=%d tipos=%s accesos=%d trajo=%s contacto=%s' % (
                    com['nombre'][:40], o['id'][:8], o['codigo'], o['estado'], o['fecha_apertura'], nn,
                    ','.join(t['tipo_id'] for t in o['tipos']), o['vivos'][0]['count'], bool(o['quien_lo_trae']),
                    bool(o['puesto_id'] or o['persona_comunidad_id'])))
                if o['origen_notas']:
                    print('       origen_notas: ' + o['origen_notas'][:300].replace('\n', ' / '))
            if not ops:
                print('  PROD %-40s | SIN OPP' % com['nombre'][:40])
        for r in fichas_de(c):
            print('---', os.path.relpath(r, RAIZ))
            for i, l in enumerate(texto_del_docx(r)):
                if l.strip(): sys.stdout.write('%3d| %s\n' % (i, l[:230]))

if __name__ == '__main__':
    main()
