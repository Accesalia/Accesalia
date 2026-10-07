# -*- coding: utf-8 -*-
"""Crear las oportunidades de la CLON, poner la primera nota del diario y NUMERAR (Monica, 7-oct-2026).

Fases (una cada vez, en este orden; sin --escribir, marcha en seco):
  python scripts/barrido/crear_opps_y_numerar.py crear          [--escribir]
  python scripts/barrido/crear_opps_y_numerar.py primera_nota   [--escribir]
  python scripts/barrido/crear_opps_y_numerar.py numerar        [--escribir]

CREAR: cada fila de comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una pasa a ser una oportunidad SIN comunidad
  (comunidad_provisional = "carpeta (MUNICIPIO)"), con su fecha de apertura, su estado, captador y responsable (del campo
  comercial_interno ya normalizado) y la referencia catastral de la ficha SOLO si es anterior a 2025 (las de 2025-2026 se
  enlazan despues a Catastro). origen_notas = TODO lo de la fila, conservado (texto + campos sueltos + ruta de Dropbox).
  Notas: si la carpeta tiene ficha, se RELEE: las notas generales -> notas_oportunidad y las de "NOTAS SUBVENCIONES" ->
  notas_subvencion, una por fecha. Si no hay ficha, las notas con fecha se sacan del texto de la clon.
  Cerradas: estado cerrada; las "migradas de Dropbox" SIN resultado; las demas, perdidas con su motivo citado.
  La clon NO se toca. Cada opp nueva lleva en `notas` el id de su fila de la clon (asi no se crea dos veces).
PRIMERA_NOTA: en TODAS las oportunidades, el texto de origen (origen_notas) se copia como primera nota del diario, con la
  fecha de apertura. Se conserva tambien el campo.
NUMERAR: codigo = SIGLAS DEL CAPTADOR - AÑO DE APERTURA - correlativo (DAN-2016-001), por fecha de apertura y, en empate,
  por el nombre. Produccion y clon en la misma serie.
"""
import sys, os, glob, re, uuid, collections
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..')); sys.path.insert(0, AQUI)
from produccion import arrancar
from leer_fichas import texto_del_docx
from trocear2 import trocear2

FASE = sys.argv[1] if len(sys.argv) > 1 else ''
ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
T = 'comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una'
BASE = r'C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones'
MIG = 'migrada de Dropbox'
MARCA = 'Creada desde la clon: '
COM = {c['iniciales']: c['id'] for c in b.leer('comerciales?select=id,iniciales')}
SIGLAS = {v: k for k, v in COM.items()}
PAREJA = {'Daniel': ('DAN', 'DAN'), 'Alvaro': ('ALV', 'ALV'), 'Daniel (lleva Alvaro)': ('DAN', 'ALV'), 'Carlos (lleva Alvaro)': ('CAR', 'ALV')}


def fichas_de(ruta):
    if not ruta: return []
    p = os.path.join(BASE, ruta)
    if not os.path.isdir(p): return []
    return sorted(x for x in glob.glob(os.path.join(p, '*.docx')) if 'FICHA' in os.path.basename(x).upper() and not os.path.basename(x).startswith('~'))


def notas_de_ficha(f, anio):
    ls = texto_del_docx(f)
    ini = [k for k, l in enumerate(ls) if l.strip() in ('NOTAS', 'NOTAS ENCARGO Y PROYECTO')]
    sub = [k for k, l in enumerate(ls) if l.strip() == 'NOTAS SUBVENCIONES']
    gen = []
    if ini:
        i = max(ini) + 1; j = next((k for k in sub if k > i), len(ls))
        gen = trocear2(chr(10).join(ls[i:j]).strip(), anio)
    sv = trocear2(chr(10).join(ls[sub[0] + 1:]).strip(), anio) if sub else []
    limpia = lambda n: [(f_, t.strip()) for f_, t in n if t and t.strip()]
    return limpia(gen), limpia(sv)


def notas_del_texto(texto, anio):
    """las notas con fecha del texto de la clon (cuando no hay ficha que releer). Lo que no tiene fecha se queda en origen."""
    return [(f, t.strip()) for f, t in trocear2(texto or '', anio) if f and t and t.strip()]


def origen_de(r):
    trozos = [r['notas_de_la_ficha'] or '']
    campos = [('Trajo', ' / '.join(x for x in (r['trajo_persona'], r['trajo_empresa']) if x)), ('Presidente', r['presidente']),
              ('Administracion', ' / '.join(x for x in (r['admin_contacto'], r['admin_telefono'], r['admin_correo']) if x)),
              ('CIF en la ficha', r['cif_en_la_ficha']), ('Ref. catastral en la ficha', r['ref_catastral_de_la_ficha']),
              ('Nombre en la ficha', r['nombre_en_la_ficha']), ('Notas', r['notas']), ('Cierre', r['cierre_notas']),
              ('Comunidad autonoma', r['comunidad_autonoma']), ('Ruta de Dropbox', r['ruta_dropbox'])]
    extra = '\n'.join('%s: %s' % (k, v) for k, v in campos if v)
    return ('\n\n'.join(x for x in (trozos[0].strip(), extra) if x)).strip()


def crear():
    hechas = {(o['notas'] or '').split(MARCA)[1][:36] for o in b.leer('oportunidades?select=notas&notas=like.*' + MARCA.replace(' ', '%20') + '*')}
    filas = b.leer(T + '?select=*')
    c = collections.Counter(); opps, notas, subvs, cierres = [], [], [], []
    for r in filas:
        if r['id'] in hechas: c['ya creada'] += 1; continue
        anio = int(r['fecha_apertura'][:4])
        cap, lle = PAREJA[r['comercial_interno']]
        oid = str(uuid.uuid4())
        fs = fichas_de(r['ruta_dropbox'])
        if fs:
            gen, sv = [], []
            for f in fs:
                g, s = notas_de_ficha(f, anio); gen += g; sv += s
            c['notas de la ficha releida'] += 1
        else:
            gen, sv = notas_del_texto(r['notas_de_la_ficha'], anio), []
            c['notas del texto de la clon'] += 1
        cerrada = r['estado'] == 'cerrada'
        opps.append({'id': oid, 'comunidad_id': None, 'comunidad_provisional': '%s (%s)' % (r['carpeta'], r['municipio']),
                     'fecha_apertura': r['fecha_apertura'], 'estado': 'cerrada' if cerrada else 'abierta',
                     'comercial_captador_id': COM[cap], 'comercial_id': COM[lle],
                     'referencia_catastral': r['ref_catastral_de_la_ficha'] if r['fecha_apertura'] < '2025-01-01' else None,
                     'origen_notas': origen_de(r), 'notas': MARCA + r['id']})
        notas += [{'oportunidad_id': oid, 'fecha': f, 'texto': t, 'origen': 'ficha_dropbox'} for f, t in gen]
        subvs += [{'oportunidad_id': oid, 'fecha': f, 'texto': t, 'origen': 'ficha_dropbox'} for f, t in sv]
        if cerrada and r['cierre_notas'] and r['cierre_notas'] != MIG:
            cierres.append({'oportunidad_id': oid, 'resultado_final': 'perdido', 'motivo_perdido': r['cierre_notas'][:500],
                            'notas': 'Cerrada como perdida en la clon (barrido): ' + r['cierre_notas']})
        c['cerrada' if cerrada else 'abierta'] += 1
        c['cap %s / lleva %s' % (cap, lle)] += 1
    print(dict(c))
    print('opps nuevas: %d | notas de oportunidad: %d (sin fecha: %d) | notas de subvencion: %d | cierres como perdida: %d'
          % (len(opps), len(notas), sum(1 for n in notas if not n['fecha']), len(subvs), len(cierres)))
    for o in opps[:3]:
        print('  EJEMPLO', o['fecha_apertura'], o['comunidad_provisional'], '|', (o['origen_notas'] or '')[:160].replace('\n', ' / '))
    if ESCRIBIR:
        b.insertar('oportunidades', opps)
        if notas: b.insertar('notas_oportunidad', notas)
        if subvs: b.insertar('notas_subvencion', subvs)
        if cierres: b.insertar('motivo_cierre_oportunidad', cierres)
        print('escrito')


def primera_nota():
    ops = b.leer('oportunidades?select=id,fecha_apertura,origen_notas&origen_notas=not.is.null')
    ya = {n['oportunidad_id'] for n in b.leer('notas_oportunidad?select=oportunidad_id&autor=eq.' + 'texto%20de%20origen')}
    nuevas = [{'oportunidad_id': o['id'], 'fecha': o['fecha_apertura'], 'texto': o['origen_notas'], 'origen': 'ficha_dropbox', 'autor': 'texto de origen'}
              for o in ops if o['id'] not in ya and o['origen_notas'].strip()]
    print('opps con texto de origen: %d | ya tenian la primera nota: %d | notas a crear: %d' % (len(ops), len(ya), len(nuevas)))
    if ESCRIBIR and nuevas:
        b.insertar('notas_oportunidad', nuevas); print('escrito')


def numerar():
    ops = b.leer('oportunidades?select=id,codigo,fecha_apertura,comercial_captador_id,comunidad_provisional,comunidad:comunidades(nombre)')
    falta = [o for o in ops if not o['fecha_apertura'] or not o['comercial_captador_id']]
    assert not falta, ('sin fecha o sin captador', len(falta))
    nombre = lambda o: (o['comunidad'] or {}).get('nombre') or o['comunidad_provisional'] or ''
    series = collections.defaultdict(list)
    for o in ops: series[(SIGLAS[o['comercial_captador_id']], o['fecha_apertura'][:4])].append(o)
    cambios = []
    for (s, a), lista in sorted(series.items()):
        for n, o in enumerate(sorted(lista, key=lambda o: (o['fecha_apertura'], nombre(o).upper())), 1):
            cod = '%s-%s-%03d' % (s, a, n)
            if o['codigo'] != cod: cambios.append((o['id'], cod, nombre(o), o['fecha_apertura']))
    for (s, a), lista in sorted(series.items()): print('  %s-%s: %d' % (s, a, len(lista)))
    print('total: %d | codigos a poner: %d' % (len(ops), len(cambios)))
    for x in sorted(cambios, key=lambda x: x[1])[:5]: print('  ', x[1], x[3], x[2])
    if ESCRIBIR:
        # el codigo es UNICO: primero provisionales (TMP-<id>) y luego los definitivos, para que al correr la serie no choquen
        for i, cod, _, _ in cambios: b.actualizar('oportunidades?id=eq.' + i, {'codigo': 'TMP-' + i})
        for i, cod, _, _ in cambios: b.actualizar('oportunidades?id=eq.' + i, {'codigo': cod})
        print('escrito')


{'crear': crear, 'primera_nota': primera_nota, 'numerar': numerar}[FASE]()
if not ESCRIBIR: print('*** MARCHA EN SECO ***')
