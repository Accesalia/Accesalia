# -*- coding: utf-8 -*-
"""Lo comun del barrido de Madrid capital por letras (Monica, 6-oct-2026).

Cada tanda es un script corto (madrid_b.py, madrid_a1.py...) que hace
`from madrid_comun import *` y pone solo sus datos. Sin --escribir, marcha en seco.
"""
# MADRID CAPITAL - tanda B (6-oct-2026). Sin --escribir: marcha en seco.
import sys, os, uuid
os.environ['MUNICIPIO'] = '..'          # notas_de_ficha lee de PROVINCIA/..  = MADRID
sys.path.insert(0, 'scripts'); sys.path.insert(0, 'scripts/barrido')
from urllib.parse import quote
from produccion import arrancar
from notas_de_ficha import notas as _notas, ficha, D
from leer_fichas import texto_del_docx
from trocear2 import trocear2

ESCRIBIR = '--escribir' in sys.argv
b = arrancar(); B = chr(92); T = 'comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una'; MUNI = 'MADRID'
R = lambda c: B.join(['MADRID', c])
DANIEL = '72495d1c-0090-4346-b167-ed852fd69960'; ALVARO = '4dd3347a-d885-4439-aafb-dc3f7f7acd95'; CARLOS = '739e7fb5-2025-469e-b43c-1823319ee0e4'
MUN = 'd8400e69-d23a-40cb-b227-10b6e1b6a521'
ELECNOR = '9bced278-bff6-4213-bdab-5cbc5d5d84d5'; LUXOR = '60f1bab3-7f0a-4db2-a931-60110dc76e09'; TKE = 'f181ab05-fc99-4415-91af-2c5b62389a55'
ENOR = '2cbacd8c-40fa-40fa-88df-d64ace2ffbb9'; MANDATARIA = '7057cb33-7ce8-406f-9afb-9cf2bc013f80'
PU = dict(andrea='49d0f25d-5ab6-48cb-bdd6-8655678e8d55', parra='999aa5c8-3da7-4fda-93d3-b4e9c839d639', jrodriguez='3bb9cbe7-f3d6-4223-be99-e76ad4a67a56',
          oswaldo='26059992-8e15-423b-bc47-6c476b9b5e5c', sonia='f2528b5f-b35e-462b-8a90-bf9d1fd131f4', rosa='64c946bd-e90c-46c0-a7a7-f2b90a4df8d4',
          antonaya='a2379c65-5292-4780-bcc5-f28eda997f92', manzano='1f7d23bb-64cd-4dc5-a1d9-e0a599b29be2', amanda='b0283265-1700-4d4b-a4d6-23d268e794eb',
          torrado='4fecb08b-449b-46f2-830b-5167022f12f1', guillermo='2497dcab-bcec-4572-bcc9-4cd4054c6fc8', dbrio='e18206ca-c52e-4318-a0b5-906945ba08aa',
          diego='5a253cf3-33c2-433d-ab56-7eb65aaf2abe', escano='c73d526d-637c-415d-be44-8cde0611d14b', jmrodrigo='648e9709-3705-4ab3-ae68-3913c0880e70',
          leandro='80099c1e-be1e-430d-8d8c-3d88a4b43026', mila='0f3e2d73-197f-44c2-9b76-7d36114f7934', pulso='be548db1-e1c6-4428-88bd-1896d07f1382',
          valentin='fc104c31-8b03-4891-ba32-f2d201431804')
tipos = {t['clave']: t['id'] for t in b.leer('tipos_proyecto?select=id,clave')}
SECO = []


# ---------------------------------------------------------------- escritura (o no)
def ins(tabla, filas):
    if ESCRIBIR:
        b.insertar(tabla, filas)
    else:
        SECO.append('INSERT %s x%d: %s' % (tabla, len(filas), str(filas[0])[:260]))


def act(ruta, datos):
    if ESCRIBIR:
        b.actualizar(ruta, datos)
    else:
        SECO.append('UPDATE %s: %s' % (ruta[:60], str(datos)[:260]))


def nuevo_id():
    return str(uuid.uuid4())


# ---------------------------------------------------------------- lectura de fichas
def _lineas(c):
    """c = carpeta, o ruta de una ficha concreta (acuerdo34/FICHA DATOS.docx)."""
    return texto_del_docx(os.path.join(D, c)) if c.lower().endswith('.docx') else ficha(c)


def _notas_de(c, anio):
    ls = _lineas(c)
    ini = [k for k, l in enumerate(ls) if l.strip() in ('NOTAS', 'NOTAS ENCARGO Y PROYECTO')]
    if not ini: return []
    i = max(ini) + 1; j = next((k for k, l in enumerate(ls) if k > i and l.strip() == 'NOTAS SUBVENCIONES'), len(ls))
    return trocear2(chr(10).join(ls[i:j]).strip(), anio)


def notas(c, anio, arreglos=None):
    n = _notas(c, anio)
    for i, (f, t) in enumerate(n):
        if arreglos and i in arreglos:
            n[i] = arreglos[i] if isinstance(arreglos[i], tuple) else (arreglos[i], t)
    sin = [t[:60] for f, t in n if f is None]
    assert not sin, (c, sin)
    return n


def con_motivo(f, motivo):
    return lambda t: (f, t + '\n\n(' + motivo + ')')


def fijar(c, anio, sinfecha=None, otros=None):
    """sinfecha = (fecha, motivo) para los trozos sin fecha delante (correos reenviados...)."""
    n = _notas_de(c, anio); out = []
    for i, (f, t) in enumerate(n):
        if otros and i in otros:
            f, t = otros[i][0], t + ('\n\n(' + otros[i][1] + ')' if otros[i][1] else '')
        elif f is None and sinfecha:
            f, t = sinfecha[0], t + '\n\n(' + sinfecha[1] + ')'
        out.append((f, t))
    assert all(f for f, t in out), (c, [t[:50] for f, t in out if not f])
    return out


def partir(n, i, marca, fecha, vez=1):
    """parte la nota i donde aparece `marca` (la vez-esima) y la segunda mitad lleva `fecha`."""
    f, t = n[i]; k = -1
    for _ in range(vez):
        k = t.index(marca, k + 1)
    return n[:i] + [(f, t[:k].strip()), (fecha, t[k:].strip())] + n[i + 1:]


def subv(c):
    ls = _lineas(c); j = [k for k, l in enumerate(ls) if l.strip() == 'NOTAS SUBVENCIONES']
    return '\n'.join(ls[j[0] + 1:]).strip() if j else ''


# ---------------------------------------------------------------- agenda
def pid(pu):
    return b.leer('puesto?select=persona_id&id=eq.' + pu)[0]['persona_id']


def persona_nueva(nombre, apellidos, cargo, tel, email, contrata=None, empresa=None, organismo=None, area=None, notas_=None):
    """persona + puesto (+ correo). Si el correo ya existe, devuelve ese puesto."""
    if email:
        ya = b.leer('correo?select=puesto_id&email=eq.' + quote(email))
        if ya and ya[0]['puesto_id']:
            return ya[0]['puesto_id']
    else:   # sin correo: no repetirla si ya se dio de alta (script reanudable)
        for x in b.leer('persona?select=id,puesto(id)&nombre=eq.%s&apellidos=%s' % (quote(nombre), 'eq.' + quote(apellidos) if apellidos else 'is.null')):
            if x['puesto'] and notas_ and b.leer('persona?select=id&id=eq.%s&notas=eq.%s' % (x['id'], quote(notas_))):
                return x['puesto'][0]['id']
    p, pu = nuevo_id(), nuevo_id()
    ins('persona', [{'id': p, 'nombre': nombre, 'apellidos': apellidos, 'activa': True, 'notas': notas_}])
    ins('puesto', [{'id': pu, 'persona_id': p, 'contrata_id': contrata, 'empresa_id': empresa, 'organismo_id': organismo, 'organismo_area_id': area,
                    'cargo': cargo, 'telefono_empresa': tel}])
    if email:
        ins('correo', [{'puesto_id': pu, 'email': email, 'etiqueta': 'general', 'principal': True}])
    PERSONAS[pu] = p; EMPRESA_DE[pu] = empresa
    return pu


PERSONAS = {}; EMPRESA_DE = {}


def pid2(pu):
    return PERSONAS.get(pu) or pid(pu)


def pc(cid, nombre, rol='presidente', tel=None, doc=None, email=None, notas_=None):
    ex = b.leer('personas_comunidad?select=id,nombre,telefono,documento,email&comunidad_id=eq.%s&rol=eq.%s' % (cid, rol)) if rol == 'presidente' else []
    if ex:
        cambios = {k: v for k, v in (('telefono', tel), ('documento', doc), ('email', email)) if v and not ex[0][k]}
        if cambios: act('personas_comunidad?id=eq.' + ex[0]['id'], cambios)
        return ex[0]['id']
    if rol != 'presidente' and ESCRIBIR and b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&rol=eq.%s&nombre=eq.%s' % (cid, rol, quote(nombre))):
        return b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&rol=eq.%s&nombre=eq.%s' % (cid, rol, quote(nombre)))[0]['id']
    i = nuevo_id()
    ins('personas_comunidad', [{'id': i, 'comunidad_id': cid, 'nombre': nombre, 'rol': rol, 'telefono': tel, 'email': email, 'documento': doc,
                                'es_contacto_principal': rol != 'presidente', 'notas': notas_}])
    return i


def admin(cid, puesto):
    if puesto and not b.leer('comunidad_admin_responsable?select=id&vigente=eq.true&comunidad_id=eq.' + cid):
        emp = EMPRESA_DE.get(puesto) or b.leer('puesto?select=empresa_id&id=eq.' + puesto)[0]['empresa_id']
        ins('comunidad_admin_responsable', [{'comunidad_id': cid, 'empresa_id': emp, 'puesto_id': puesto, 'vigente': True}])


# ---------------------------------------------------------------- oportunidades de produccion
OPP = {}


def info(prefijo):
    cs = b.leer('comunidades?select=id,nombre,cif_comunidad,iban&municipio=eq.MADRID&nombre=like.' + quote(prefijo) + '*'); assert len(cs) == 1, (prefijo, cs)
    o = b.leer('oportunidades?select=id&comunidad_id=eq.' + cs[0]['id']); assert len(o) == 1, prefijo
    return cs[0], o[0]['id']


def rellenar(clave, prefijo, carp, datos, tps, n=(), huecos=(), comunidad=None, presi=None, adm=None, captador=DANIEL, lleva=DANIEL,
             trae_pu=None, trae_pc=None, subvencion=None, oid_fijo=None):
    if oid_fijo:   # comunidad con varias opps (encargos distintos): se rellena la que se dice
        cs = b.leer('comunidades?select=id,nombre,cif_comunidad,iban&municipio=eq.MADRID&nombre=like.' + quote(prefijo) + '*'); assert len(cs) == 1, prefijo
        c, oid = cs[0], oid_fijo
        assert b.leer('oportunidades?select=id&id=eq.%s&comunidad_id=eq.%s' % (oid, c['id'])), (prefijo, oid)
    else:
        c, oid = info(prefijo)
    o = b.leer('oportunidades?select=origen_notas,fecha_apertura,quien_lo_trae,puesto_id,referencia_catastral&id=eq.' + oid)[0]
    if o['origen_notas']:
        print('ya escrita, se salta:', prefijo); OPP[clave] = (c, oid, carp); return
    assert not any(o.values()) and not b.leer('notas_oportunidad?select=id&oportunidad_id=eq.' + oid), prefijo
    if trae_pu:
        datos = dict({'quien_lo_trae': pid2(trae_pu), 'puesto_id': trae_pu}, **datos)
    if presi:
        pcid = pc(c['id'], *presi)
        if trae_pc == 'presi':
            datos = dict({'quien_persona_comunidad_id': pcid, 'persona_comunidad_id': pcid}, **datos)
    act('oportunidades?id=eq.' + oid, dict({'comercial_id': lleva, 'comercial_captador_id': captador}, **datos))
    if tps: ins('oportunidad_tipos', [{'oportunidad_id': oid, 'tipo_id': tipos[t]} for t in tps])
    filas = [{'oportunidad_id': oid, 'fecha': f, 'texto': t, 'origen': 'ficha_dropbox'} for f, t in n]
    filas += [{'oportunidad_id': oid, 'fecha': None, 'texto': h, 'origen': 'ficha_dropbox'} for h in huecos]
    if filas: ins('notas_oportunidad', filas)
    if subvencion: ins('notas_subvencion', [{'oportunidad_id': oid, 'fecha': f, 'texto': t, 'origen': 'ficha_dropbox'} for f, t in subvencion])
    if comunidad:
        cambios = {k: v for k, v in comunidad.items() if not c.get(k)}
        if cambios: act('comunidades?id=eq.' + c['id'], cambios)
    if adm: admin(c['id'], adm)
    OPP[clave] = (c, oid, carp)


def nota_de(clave, fecha, trozo):
    """la nota recien escrita (o la que se escribira) que contiene el trozo."""
    oid = OPP[clave][1]
    if ESCRIBIR:
        x = [n for n in b.leer('notas_oportunidad?select=id,texto&oportunidad_id=eq.%s&fecha=eq.%s' % (oid, fecha)) if trozo in n['texto']]
        assert len(x) == 1, (clave, fecha, trozo, len(x)); return x[0]['id'], x[0]['texto']
    return None, '(cita de la nota %s que contiene "%s")' % (fecha, trozo)


H = lambda *xs: ['[%s] %s' % x for x in xs]
EXT = ' CARLOS GARCIA (ya fuera de Accesalia desde feb-2026) la gestiono como EXTERNO FREELANCE, no como comercial interno; la lleva Alvaro (Monica, 5-oct-2026).'
CAPTO_CARLOS = ' La capto Carlos Garcia antes de irse (feb-2026); la lleva Alvaro.'
ELEC = ('SOLICITUD SERVICIOS ANEXOS (Elecnor): proyecto basico y de ejecucion, direccion de obra y CFO, coordinacion de seguridad y salud, CEE inicial y final, '
        'IEE, libro del edificio existente y gestion de subvenciones.')



# ================================================================= 2. ORGANISMOS
def organismo(nombre, tipo, ambito, notas_=None, direccion=None, telefono=None, ca=None):
    ya = b.leer('organismos?select=id&nombre=eq.' + quote(nombre))
    if ya: return ya[0]['id']
    i = nuevo_id()
    ins('organismos', [{'id': i, 'nombre': nombre, 'tipo': tipo, 'ambito': ambito, 'municipio_id': MUN if ambito == 'municipal' else None,
                        'comunidad_autonoma': ca, 'activa': True, 'direccion': direccion, 'telefono': telefono, 'notas': notas_}])
    return i


def junta(numero, nombre, **kw):
    i = organismo('Junta Municipal de Distrito de ' + nombre, 'junta_distrito', 'municipal', **kw)
    d = b.leer('distritos_madrid?select=nombre,junta_organismo_id&numero=eq.%d' % numero)[0]
    assert d['nombre'] == nombre, (numero, nombre, d)
    if not d['junta_organismo_id']: act('distritos_madrid?numero=eq.%d' % numero, {'junta_organismo_id': i})
    return i


def area(org, nombre, telefono=None, notas_=None):
    ya = b.leer('organismo_areas?select=id&organismo_id=eq.%s&nombre=eq.%s' % (org, quote(nombre))) if ESCRIBIR or len(org) == 36 else []
    if ya: return ya[0]['id']
    i = nuevo_id(); ins('organismo_areas', [{'id': i, 'organismo_id': org, 'nombre': nombre, 'telefono': telefono, 'notas': notas_}]); return i



# ================================================================= 3. CLON
def fila(carp, fecha, estado, cierre, trajo, cif, ref, texto, comercial='Daniel', huecos=(), ruta=None):
    if b.leer(T + '?select=id&municipio=eq.MADRID&carpeta=eq.' + quote(carp)):
        print('clon ya escrita, se salta:', carp); return
    if huecos:
        texto += '\n\nLO ESCRITO EN LOS HUECOS DE LA FICHA:\n' + '\n'.join(huecos)
    i = nuevo_id(); CLON[carp] = i
    ins(T, [{'id': i, 'comunidad_autonoma': 'COMUNIDAD DE MADRID', 'municipio': MUNI, 'carpeta': carp, 'ruta_dropbox': ruta or R(carp), 'tiene_tarjeta_cif': False, 'cif_en_la_ficha': cif,
             'ref_catastral_de_la_ficha': ref, 'comercial_interno': comercial, 'estado': estado, 'cierre_notas': cierre, 'fecha_apertura': fecha, 'trajo_persona': trajo, 'notas_de_la_ficha': texto}])


CLON = {}
MIG = 'migrada de Dropbox'; REV = ' [REVISAR DESPUES] Se deja abierta; se vera despues si se cierra (Monica, 6-oct-2026).'
txt = lambda n: '\n\n'.join('%s %s' % (f, t) if f and not t.startswith(f[8:10]) else t for f, t in n)
J = lambda n: '\n\n'.join(t for f, t in n)

# ================================================================= 4. MANIAS (municipio MADRID)
def mania(texto, dep, fecha, carp, clave=None, trozo=None, cita=None, tecnico=None, ruta=None):
    nid = None; oid = None; cid = None
    if clave and cita:      # cita literal de un campo de la ficha (no de una nota): va a la opp, sin nota
        oid = OPP[clave][1]
    elif clave:
        oid = OPP[clave][1]; nid, cita = nota_de(clave, fecha, trozo)
    else:
        cid = CLON.get(carp) or (b.leer(T + '?select=id&municipio=eq.MADRID&carpeta=eq.' + quote(carp)) or [{'id': None}])[0]['id']
    if ESCRIBIR and b.leer('manias_organismos?select=id&mania=eq.%s&ruta_dropbox=eq.%s' % (quote(texto), quote(ruta or R(carp)))):
        print('mania ya escrita, se salta:', texto[:50]); return
    ins('manias_organismos', [{'municipio_id': MUN, 'departamento': dep, 'tecnico': tecnico, 'mania': texto, 'cita': cita, 'fecha': fecha, 'oportunidad_id': oid,
                               'nota_oportunidad_id': nid, 'clon_id': cid, 'ruta_dropbox': ruta or R(carp), 'origen': 'ficha_dropbox'}])




# ================================================================= 5. RESUMEN
def resumen():
    if not ESCRIBIR:
        print(chr(10) + '*** MARCHA EN SECO ***  (%d operaciones)' % len(SECO) + chr(10))
        cuenta = {}
        for s in SECO:
            k = ' '.join(s.split()[:2]).split('?')[0]; n = int(s.split(' x')[1].split(':')[0]) if s.startswith('INSERT') else 1
            cuenta[k] = cuenta.get(k, 0) + n
        open(os.path.join(os.environ.get('SECO_DIR', '.'), 'madrid_seco.txt'), 'w', encoding='utf-8').write(chr(10).join(SECO))
        for k, v in sorted(cuenta.items()): print('  %-55s %d' % (k, v))
        return
    for k, (c, oid, carp) in OPP.items():
        r = b.leer('oportunidades?select=fecha_apertura,capta:comercial_captador_id(nombre),lleva:comercial_id(nombre),tipos:oportunidad_tipos(count)&id=eq.' + oid)[0]
        print('%-8s %s capta=%s lleva=%s tipos=%d notas=%d' % (k, r['fecha_apertura'], r['capta']['nombre'], r['lleva']['nombre'], r['tipos'][0]['count'],
              len(b.leer('notas_oportunidad?select=id&oportunidad_id=eq.' + oid))))
    print('clon MADRID:', len(b.leer(T + '?select=id&municipio=eq.MADRID')), '| manias MADRID:', len(b.leer('manias_organismos?select=id&municipio_id=eq.' + MUN)),
          '| organismos MADRID:', len(b.leer('organismos?select=id&municipio_id=eq.' + MUN)))
