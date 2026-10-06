# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda B (6-oct-2026). Sin --escribir: marcha en seco.
import sys, os, uuid
os.environ['MUNICIPIO'] = '..'          # notas_de_ficha lee de PROVINCIA/..  = MADRID
sys.path.insert(0, 'scripts'); sys.path.insert(0, 'scripts/barrido')
from urllib.parse import quote
from produccion import arrancar
from notas_de_ficha import notas as _notas, ficha, D
from leer_fichas import texto_del_docx

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
    n = _notas(c, anio); out = []
    for i, (f, t) in enumerate(n):
        if otros and i in otros:
            f, t = otros[i][0], t + ('\n\n(' + otros[i][1] + ')' if otros[i][1] else '')
        elif f is None and sinfecha:
            f, t = sinfecha[0], t + '\n\n(' + sinfecha[1] + ')'
        out.append((f, t))
    assert all(f for f, t in out), (c, [t[:50] for f, t in out if not f])
    return out


def partir(n, i, marca, fecha):
    f, t = n[i]; k = t.index(marca)
    return n[:i] + [(f, t[:k].strip()), (fecha, t[k:].strip())] + n[i + 1:]


def subv(c):
    ls = ficha(c); j = [k for k, l in enumerate(ls) if l.strip() == 'NOTAS SUBVENCIONES']
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
             trae_pu=None, trae_pc=None, subvencion=None):
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


# ================================================================= 1. PRODUCCION (23)
H = lambda *xs: ['[%s] %s' % x for x in xs]
EXT = ' CARLOS GARCIA (ya fuera de Accesalia desde feb-2026) la gestiono como EXTERNO FREELANCE, no como comercial interno; la lleva Alvaro (Monica, 5-oct-2026).'
CAPTO_CARLOS = ' La capto Carlos Garcia antes de irse (feb-2026); la lleva Alvaro.'
ELEC = ('SOLICITUD SERVICIOS ANEXOS (Elecnor): proyecto basico y de ejecucion, direccion de obra y CFO, coordinacion de seguridad y salud, CEE inicial y final, '
        'IEE, libro del edificio existente y gestion de subvenciones.')

rellenar('bad112', 'BADALONA 112', 'badalona112', {'fecha_apertura': '2025-10-02',
    'origen_notas': 'Fecha de llegada: 10/2025. Contacta: Andrea Diaz (Elecnor). Tipo de obra: SATE / rehabilitacion de cubierta (retirada de uralita). Obra: 45.184,30 EUR sin IVA, 10 vecinos. ' + ELEC + ' Comercial interno: DANIEL. HE enviada 06/10/2025.'},
    ('cubierta', 'df', 'css', 'cee', 'iee', 'lee', 'subvenciones'), n=fijar('badalona112', 2025, ('2025-10-02', 'Correo de Andrea Diaz del 2 de octubre de 2025.')), trae_pu=PU['andrea'])
rellenar('bad120', 'BADALONA 120', 'badalona120', {'fecha_apertura': '2025-11-13',
    'origen_notas': 'Fecha de llegada: 10/2025 (el correo es del 13/11/2025). Contacta: Andrea Diaz (Elecnor, 669 242 519). Tipo de obra: SATE + subv / rehabilitacion de cubierta (retirada de uralita). Obra: 62.747,50 EUR sin IVA, 10 vecinos. ' + ELEC + ' Comercial interno: DANIEL. HE enviada 13/11/2025.'},
    ('cubierta', 'df', 'css', 'cee', 'iee', 'lee', 'subvenciones'), n=fijar('badalona120', 2025, ('2025-11-13', 'Correo de Andrea Diaz del 13 de noviembre de 2025.')),
    huecos=H(('OBRA', 'SATE + subv')), trae_pu=PU['andrea'])
rellenar('bal4', 'BALAGUER 4', 'balaguer4', {'fecha_apertura': '2022-02-03', 'referencia_catastral': None,
    'origen_notas': 'Fecha de llegada: 02/2022. Contacta: Javier Parra (Schindler). Tipo de obra: ~~ASCENSOR~~ SUBV EXTERNA (hay modelo homogeneo). Administracion: AGA ANTONAYA (Alejandro, 91 759 39 09, alejandro@antonaya.com). '
                    'Comercial interno en la ficha: ALVARO (por la HE de subvencion de 2026). La capto Daniel en 2022 y la lleva Alvaro (Monica, 6-oct-2026). Hay carpeta "tipologia ascensor Ayto" (modelo MOD_AS-HG_159-17).'},
    ('subvenciones',), n=fijar('balaguer4', 2022), huecos=H(('OBRA', '~~ASCENSOR~~ SUBV EXTERNA')), comunidad={'iban': 'ES18 6719 0001 6110 4367 2075'},
    adm=PU['antonaya'], trae_pu=PU['parra'], captador=DANIEL, lleva=ALVARO, subvencion=[('2026-04-20', subv('balaguer4'))])
rellenar('bal12', 'BALLESTA 12', 'ballesta12', {'fecha_apertura': '2025-07-02', 'referencia_catastral': '0449422VK4704G',
    'origen_notas': 'Fecha de llegada: 07/2025. Contacta: el presidente, por la web. Tipo de obra: ASCENSOR por patio (CIPHAN). Barrio: Universidad. Tecnico: Alejandro Bello. Fecha encargo: 04/12/2025. Ano 1900. '
                    'Comercial interno: CARLOS.' + CAPTO_CARLOS + ' Administrador: Jose Luis Perez Herrera (627 419 141, jose10861@gmail.com). OJO: CIF con E (E78232360, comunidad de bienes). PEM/sup.: 82,55. '
                    'Tramita la ECU (ACTECU). Parada desde abril-2026 por el local de abajo (estudian un mismo ascensor para las dos comunidades).'},
    ('ascensor',), n=fijar('ballesta12', 2025, ('2025-07-02', 'Sin fecha delante; primera nota de la ficha, llegada 07/2025. Dentro dice "Husmeando EFFIC 25-9-2025".')),
    huecos=H(('OBRA', 'ASCENSOR - Patio ciphan'), ('TECNICO', 'Alejandro Bello'),
             ('CONTACTO', 'Presidente: David Ferreras Alvarez · 676 08 94 13 · david.ferreras.alvarez@gmail.com')),
    comunidad={'iban': 'ES14 0081 1532 6100 0132 2337'}, presi=('DAVID FERRERAS ALVAREZ', 'presidente', '676 08 94 13', '71434436R', 'david.ferreras.alvarez@gmail.com'),
    trae_pc='presi', captador=CARLOS, lleva=ALVARO)
rellenar('bar9', 'BARBIERI 9', 'barbieri9', {'fecha_apertura': '2025-08-19', 'referencia_catastral': '0849805VK4704H',
    'origen_notas': 'Fecha de llegada: 08/2025. Contacta: Olga, vecina y presidenta (4oB); "viene por Arrialsi". Tipo de obra: ASCENSOR + SUBV (por hueco de escalera protegida). Tecnico: Jhonatan => Jacob (requerimientos). '
                    'Fecha encargo: 07/11/2025. Ano 1890. Tramita la ECU (ACTECU), licencia; PATRIMONIO. Comercial interno: DANIEL. Administracion: PULSO INMUEBLES (Oscar F. Nogueira, 914 685 147; oscar@, beatriz@, rosa@pulsoinmuebles.com; '
                    'Esther ya no trabaja alli, sept-2026). Superficie 58,56 m2.'},
    ('ascensor', 'subvenciones'), n=fijar('barbieri9', 2025),
    huecos=H(('NOTA', 'Viene por Arrialsi'), ('TECNICO', 'Jhonatan => Jacob (requerimientos)'),
             ('CONTACTO', 'Presidenta: Olga Maria Gallego Villegas (4oB) · 618 697 489 · ogallegov@gmail.com. Vicepresidente: Borja Puig de la Bellacasa · bpuigdelabellacasa@gmail.com'),
             ('HISTORIA', '~~esther@pulsoinmuebles.com~~: Esther ya no trabaja en esta administracion (sept 2026)')),
    comunidad={'iban': 'ES49 0081 0259 1300 0172 1874'}, presi=('OLGA MARIA GALLEGO VILLEGAS', 'presidente', '618697489', '50832294V', 'ogallegov@gmail.com'),
    trae_pc='presi', adm=PU['pulso'])
rellenar('bt23', 'BATALLA DE TORRIJOS 23', 'batalladetorrijos23', {'fecha_apertura': '2022-10-28', 'referencia_catastral': '7209809VK3770G',
    'origen_notas': 'Fecha de llegada: 10/2022 (primero se estudio SATE + aerotermia, tachado). Contacta: Valentin Alcocer (Alcora; C/ Valladolid 3, local 2, Fuenlabrada; 617 354 703). Tipo de obra: CUBIERTA Y DESAMIANTADO + SUBVENCIONES (CSS CP). '
                    'Barrio: Vista Alegre. Tecnico: Julio. Contrata: ARE FACHADAS (Miguel Angel). Ano 1975. PEM 48.127,40. Visado TL/000802/2025. Expediente 350/2025/01804. Comparte referencia catastral con otro portal. '
                    'Comercial interno: DANIEL. La DR se extinguio en jun-2026 por no empezar la obra; nueva DR en julio-2026.'},
    ('cubierta', 'css', 'subvenciones'),
    n=fijar('batalladetorrijos23', 2024, otros={0: ('2022-10-28', None), 5: ('2025-01-07', 'En la ficha pone 07/01/2024, pero va entre el 23/12/2024 y el 14/01/2025: errata de 07/01/2025.')}),
    huecos=H(('TECNICO', 'Julio'), ('CONTACTO', 'Para subir a cubierta: Marli (en la ficha tambien "Marlo"), 2oA · 690 912 136')),
    presi=('MIGUEL LEONIDAS AGUILAR BAYAS', 'presidente', None, '50584732G'), adm=PU['valentin'], trae_pu=PU['valentin'])
rellenar('bel7', 'BELVIS DE LA JARA 7', 'belvisdelajara7', {'fecha_apertura': '2024-06-27', 'referencia_catastral': '6899608VK3669H',
    'origen_notas': 'Fecha de llegada: 07/2024 (piden presupuesto el 27/06/2024). Contacta: Leandro (Fincasa), el administrador de entonces; desde 2026 la administra Mila Jimenez (Estudio Gestion, Calle Secoya 3, local 13-14; 913 094 553 / 626 959 285; '
                    'mila@estudiogestion.es). Tipo de obra: ASCENSOR + subv (lleva plataforma elevadora; patio = "espacio publico en el interior de alineacion oficial en volumetria especifica"). Barrio: Puerta Bonita. '
                    'Tecnico: Julio. Fecha encargo: 12/09/2024. Licencia del Ayto presentada 22-04-2025 (TL/017821/2024; expediente 350/2025/11892), concedida ene-2026. Subvenciones: Roser Sese. '
                    'Comercial interno: DANIEL. En la junta del 29/01/2026 deciden no empezar la obra hasta ver si reciben la subvencion.'},
    ('ascensor', 'plataforma', 'subvenciones'), n=fijar('belvisdelajara7', 2024),
    huecos=H(('TRAMITACION', 'Licencia presentada: 22-04-2025'),
             ('HISTORIA', '~~Administrador: Leandro (Fincasa), 690 953 948, fincasa@gmx.es (pedidos docs cp 12/11)~~ -> Mila, 913 094 553'),
             ('HISTORIA', '~~Tienen que nombrar nuevo administrador, toda comunicacion con Belen; belenhernandezmoura@gmail.com, 08/01/26 le solicito los datos de la nueva admin. Ya que dice Belen que ya no vive en la finca.~~')),
    adm=PU['mila'], trae_pu=PU['leandro'])
rellenar('bz48', 'BELZUNEGUI  48', 'belzunegui48', {'fecha_apertura': '2026-01-09',
    'origen_notas': 'Fecha de llegada: 01/2026. Contacta: Leandro (Fincasa), el administrador; se jubila y pasa al hijo: MzB Administracion de Fincas (Alejandro Manzano, C/ Delfos 6, Valdemoro; alejandro.manzano@fincasmzb.es; datos a 12/06/2026). '
                    'Tipo de obra: ASCENSOR (se derriba la escalera; ascensor de 6 paradas, doble embarque, invadiendo espacio privativo exterior). Comercial interno: DANIEL. HE con viabilidad enviada 26/01/2026.'},
    ('ascensor',), n=fijar('belzunegui48', 2026, ('2026-01-09', 'Correo de Fincasa del 9 de enero de 2026.')), adm=PU['manzano'], trae_pu=PU['leandro'])
rellenar('ben59', 'BENIMAMET 59', 'benimamet59', {'fecha_apertura': '2025-08-08', 'referencia_catastral': '1863518VK4616D',
    'origen_notas': 'Fecha de llegada: 08/2025. Contacta: Amanda Silva (MUPAN, Calle San Francisco Javier 1, Fuenlabrada; 91 227 11 80; comunidades@mupan.es). Tipo de obra: IEE. Tecnico: Alex. Fecha encargo: 29/08/2025. Ano 1961. '
                    'Comercial interno: DANIEL. El edificio tiene modelo homogeneo de ascensor.'},
    ('iee',), n=fijar('benimamet59', 2025, ('2025-08-08', 'Correo de Mupan del 8 de agosto de 2025.')),
    huecos=H(('TECNICO', 'Alex'), ('CONTACTO', 'Presidenta Maria Lida: 910 809 351; Maria (3o izq.): 666 774 894')),
    comunidad={'iban': 'ES35 0081 1387 8000 0135 2043'}, presi=('MARIA LIDA LOPEZ SANCHEZ', 'presidente', '910 809 351', '55314236H'), adm=PU['amanda'], trae_pu=PU['amanda'])
rellenar('ber30', 'BERASTEGUI 30', 'berastegui30', {'fecha_apertura': '2026-03-24',
    'origen_notas': 'Fecha de llegada: 03/2026. Contacta: Diego Rojo (Rojo Jusdi; C/ Valdecanillas 90, local 1; 625 14 55 22 / 913 75 05 30; admirojojusdi@gmail.com), "pero la relacion es con la comunidad". Tipo de obra: ASCENSOR CON DERRIBO DE ESCALERA '
                    '(elevador de 4 paradas, 4 personas). Comercial interno: DANIEL. HE e informe de viabilidad 24-03-2026 (a Monica para ok; enviado a la CP el 26-03).'},
    ('ascensor',), n=fijar('berastegui30', 2026, ('2026-03-24', 'Sin fecha delante; es la solucion de Daniel que acompana a la HE del 24-03-2026.')),
    huecos=H(('NOTA', 'Viene por Diego Rojo pero la relacion es con la comunidad'), ('CONTACTO', 'Dina · 655 825 907'), ('CONTACTO', 'Felipe · 605 975 395 · famontilla1103@gmail.com')),
    adm=PU['diego'], trae_pu=PU['diego'])
rellenar('ber33', 'BERASTEGUI 33', 'berastegui33', {'fecha_apertura': '2024-01-17', 'referencia_catastral': '5757207VK4755H',
    'origen_notas': 'Fecha de llegada: 01/2024 (17-01-2024 estudiado el acceso a planta baja). Contacta: Rosa Radal Sese (ROSERSESE / Olivares). Tipo de obra: ASCENSOR, supeditado a la concesion de la subvencion. Barrio: Pueblo Nuevo. '
                    'Tecnico: Israel -> Angela (requerimiento de la ECU). Fecha encargo: 09/09/2025. Ano 1970. Tramita la ECU (ACTECU), licencia. PEM 106.680,12. Visado TL/008814/2026. Superficie 72,95. 13 viviendas y un local (Catastro sin actualizar: 12 y 2). '
                    'Comercial interno: DANIEL. El ascensor llega solo a la planta 3: el vecino del 4o no autoriza. Jul-2026: la Agencia de Actividades no resuelve sin escalera de uso general.'},
    ('ascensor',), n=partir(fijar('berastegui33', 2024), 0, '---------- Forwarded', '2025-09-08'),
    huecos=H(('TECNICO', 'ISRAEL -> Angela (requerimiento de la ECU)'), ('TRAMITACION', 'ECU / ayto: ECU. Licencia / DR: LICENCIA')),
    presi=('MARIA MERCEDES MORENO PORTUGAL', 'presidente', None, '51598308Q'), trae_pu=PU['rosa'])
NATALIA = persona_nueva('Natalia', 'Rodriguez Garcia', None, '914 07 87 00 / 912 60 21 32', 'natalia@mandataria.com', empresa=MANDATARIA)
rellenar('bet4', 'BETANCUNIA 4', 'betancunia4', {'fecha_apertura': '2026-02-11',
    'origen_notas': 'Fecha de llegada: 02/2026. Contacta: Natalia Rodriguez Garcia (Mandataria). Tipo de obra: SATE + SUBV. La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + EXT},
    ('sate', 'subvenciones'), adm=NATALIA, trae_pu=NATALIA, captador=ALVARO, lleva=ALVARO)
rellenar('bio18', 'BIOSCA 18', 'biosca18', {'fecha_apertura': '2022-01-27', 'referencia_catastral': '5003404VK4850C',
    'origen_notas': 'Fecha de llegada: 01/2022. Contacta: Javier Parra (Schindler); tambien Manuel Crespo (Schindler). Tipo de obra: ASCENSOR por exterior, con invasion: hace falta licencia. Barrio: Pinar del Rey. '
                    'Tecnico: Susana (antes Daniel, a partir de Biosca 16). Fecha encargo: 19/07/2022. Administracion: ADPROYFIN (Avda. de Moratalaz 166 bajo B; 913 001 620; info@adproyfin.es). Ambito NZ 3.1.a. '
                    'PEM 124.371,00 / 1,19 = 104.513,45. Visados TL/013367/2022 y TL/014747/2025. Expediente 350/2022/06320. Superficie 80,00. "Igual que el de TKE 16" (Biosca 16).'},
    ('ascensor',), n=fijar('biosca18', 2022, ('2022-01-27', 'La fecha va dentro: "(ana 27/01/22)".')),
    huecos=H(('CONTRATA', 'Manuel Crespo (Schindler)'), ('CONTACTO', 'Presidente: Carlos Tomas Martinez Campos · Carlostmc04@gmail.com'), ('NOTA', 'Ambito: NZ 3.1.a')),
    presi=('CARLOS TOMAS MARTINEZ CAMPOS', 'presidente', None, '00379639R', 'Carlostmc04@gmail.com'), trae_pu=PU['parra'])
rellenar('bc137', 'BLAS CABRERA 137', 'blascabrera137', {'fecha_apertura': '2024-07-12', 'referencia_catastral': '4903115VK3740D',
    'origen_notas': 'Fecha de llegada: 07/2024. Contacta: Javier Rodriguez (Schindler). Tipo de obra: BAJADA A COTA CERO (la paga Schindler) Y SUBVENCIONES (las contrata la CP, 30/07/2024). Tecnico: Jonatan. Fecha encargo: 22/07/2024. Ano 1971. '
                    'Administracion: GESTORIA TORRADO / ADMINISTRACIONES TORRADO (Angel Torrado; Gral. Millan Astray 15; 917 067 605; torradoadm@gmail.com). Visado TL/018659/2024. IEE enviada 23-10-24 sin la documentacion pedida. '
                    'Toma de datos de las viviendas en agosto-2024 (Alexander Figueroa). Prorroga de la DR solicitada 15-06-2026. Comercial: DANIEL.'},
    ('cota_cero', 'subvenciones', 'iee'), n=fijar('blascabrera137', 2024),
    huecos=H(('OBRA', 'Bajada a cota cero (SCHINDLER) Y SUBVENCIONES (CP)'), ('TECNICO', 'Jonatan'),
             ('CONTACTO', 'Presidente: Saul Fernandez · 676 626 154 · sawwel84@gmail.com'),
             ('OBRA', 'Toma de datos de las viviendas (agosto 2024): tecnico Alexander Figueroa, 655 34 08 15; cuestionario https://forms.gle/bKwWVzDdmmFGB1H26')),
    presi=('SAUL FERNANDEZ FERNANDEZ', 'presidente', '676626154', '71885764T', 'sawwel84@gmail.com'), adm=PU['torrado'], trae_pu=PU['jrodriguez'])
rellenar('bc44', 'BLAS CABRERA 44', 'blascabrera44', {'fecha_apertura': '2026-02-01',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia desconocido). Tipo de obra: ASC. Ficha sin contacto ni notas. En la ficha: comercial interno CARLOS.' + EXT},
    ('ascensor',), captador=ALVARO, lleva=ALVARO)
BEGONA = persona_nueva('Begoña', 'Alba', 'Técnico de Estudios', '690 134 993 / 915 211 782', 'b.alba@luxorespacios.com', contrata=LUXOR,
                       notas_='Luxor Espacios, Cl. Segovia 17, 28005 Madrid. Fax 911 814 169.')
rellenar('boc4', 'BOCANGEL 4', 'bocangel4', {'fecha_apertura': '2025-09-08',
    'origen_notas': 'Fecha de llegada: 09/2025. Contacta: Begoña Alba (Luxor Espacios, tecnico de estudios). Tipo de obra: SATE + AEROTERMIA + FOTOVOLTAICA. Comercial interno: CARLOS.' + CAPTO_CARLOS + ' La ficha no tiene notas; hay presupuesto 01713.'},
    ('sate', 'aerotermia', 'fotovoltaica'), trae_pu=BEGONA, captador=CARLOS, lleva=ALVARO)
rellenar('bol3', 'BOLSA 3', 'bolsa3', {'fecha_apertura': '2026-05-21',
    'origen_notas': 'Fecha de llegada: 05/2026. Contactan: German, vecino (690 935 559), y Gloria, vecina y presidenta (654 498 420). Tipo de obra: ASCENSOR. Fecha encargo: 25/09/2026 (HE firmada). Comercial interno: ALVARO. '
                    'Administracion: Readministra (Alfredo, adminfincas05@readministra.es) - NO esta en la agenda. Antecedente: el proyecto de ascensor anterior (parada en entreplanta) lo rechazo Patrimonio.'},
    ('ascensor',), n=fijar('bolsa3', 2026),
    huecos=H(('CONTACTO', 'German, vecino · 690 935 559'), ('CONTACTO', 'Presidenta: Gloria Gonzalez Rodriguez · 654 498 420 · gdelpgonzalezr888@gmail.com')),
    comunidad={'iban': 'ES22 0081 7115 1700 0166 0276', 'cif_comunidad': 'H81182362'},
    presi=('GLORIA GONZALEZ RODRIGUEZ', 'presidente', '654498420', None, 'gdelpgonzalezr888@gmail.com'), captador=ALVARO, lleva=ALVARO)
c, _ = info('BOLSA 3')
GERMAN = pc(c['id'], 'German', 'vecino', '690935559', None, None, 'Trajo la oportunidad (con Gloria, la presidenta).')
act('oportunidades?id=eq.' + OPP['bol3'][1], {'quien_persona_comunidad_id': GERMAN, 'persona_comunidad_id': GERMAN})
rellenar('bm151', 'BRAVO MURILLO 151', 'bravomurillo151', {'fecha_apertura': '2026-05-27',
    'origen_notas': 'Fecha de llegada: 05/2026. Contacta: Rosella Genco, presidenta (669 288 648). Tipo de obra: CUBIERTA Y AMIANTO (retirada de fibrocemento y cubierta nueva). En la administracion: Carmelo Castellote, 663 970 258. '
                    'Comercial interno en la ficha: "CARLOS S", que es otro Carlos, no Carlos Garcia; la lleva Daniel (Monica, 6-oct-2026).'},
    ('cubierta',), n=fijar('bravomurillo151', 2026, ('2026-05-27', 'Sin fecha delante; ficha de mayo-2026.')),
    huecos=H(('CONTACTO', 'Rosella Genco · 669 288 648 · rosellagenco@gmail.com')),
    presi=('ROSELLA GENCO', 'presidente', '669288648', None, 'rosellagenco@gmail.com'), trae_pc='presi')
rellenar('bm177', 'BRAVO MURILLO 177', 'bravomurillo177', {'fecha_apertura': '2026-06-09',
    'origen_notas': 'Fecha de llegada: 06/2026. Contacta: Guillermo (Del Brio y Blanco; guillermo@ y administradores@delbrioyblanco.es). Tipo de obra: ASC (2) + SATE + SUBV. Tecnico: Angela. Fecha encargo: 09/06/2026 (HE firmada). '
                    'Comercial interno: ALVARO. Hay en la carpeta un escaneo 3D de feb-2025: es de otra carpeta copiada, el encargo es de 2026 (Monica, 6-oct-2026).'},
    ('ascensor', 'sate', 'subvenciones'), n=fijar('bravomurillo177', 2026),
    huecos=H(('CONTACTO', 'Rut Ballesteros · 655 91 25 01 · rballesteros@cavala.es')),
    comunidad={'iban': 'ES19 0081 7115 1100 0158 4964'}, presi=('RUT BALLESTEROS', 'presidente', '655 91 25 01', None, 'rballesteros@cavala.es'),
    adm=PU['guillermo'], trae_pu=PU['guillermo'], captador=ALVARO, lleva=ALVARO)
rellenar('bm358', 'BRAVO MURILLO 358', 'bravomurillo358', {'fecha_apertura': '2026-02-23',
    'origen_notas': 'Fecha de llegada: 02/2026. Contacta: Oswaldo (Schindler; antes FAIN). Tipo de obra: ACCESIBILIDAD Y CAMBIO DE ASCENSOR (remodelacion completa del portal, plataforma elevadora, ascensor de 7 paradas con puertas automaticas; obra aprox. 85.000 EUR). '
                    'Comercial interno: DANIEL. Administracion: Martin y Ramos (914 594 250) - NO esta en la agenda. HE con informe de viabilidad 23-02-2026. (La nota de Daniel apunta a la carpeta "bravomurillo359": errata.)'},
    ('accesibilidad', 'plataforma', 'modificacion_asc', 'cambio_puertas'), n=fijar('bravomurillo358', 2026, ('2026-02-23', 'Sin fecha delante; es la solucion de Daniel que acompana a la HE del 23-02-2026.')),
    huecos=H(('CONTRATA', 'Oswaldo (Schindler, antes FAIN) · 689 868 453 · oswaldo.garcia@schindler.com'), ('CONTACTO', 'Presidente: Constantino · 696 282 708 · t.roman95@gmail.com')),
    presi=('Constantino', 'presidente', '696 282 708', None, 't.roman95@gmail.com'), trae_pu=PU['oswaldo'])
rellenar('bm41', 'BRAVO MURILLO 41Q', 'bravomurillo41Qesc17', {'fecha_apertura': '2025-07-04', 'referencia_catastral': '0167612VK4706G',
    'origen_notas': 'Fecha de llegada: 07/2025. Contacta: el administrador, Jose Miguel Escaño (ALSER, Bravo Murillo 21 2o1; 914 475 613 / 911 837 711 / 695 934 979; info@alserfincas.com; L a V de 10 a 2). '
                    'Tipo de obra: ACCESIBILIDAD + SUBVENCION (mejora de accesibilidad en planta baja y sustitucion de ascensor). toda la colonia tiene proteccion ambiental. Tecnico: Jhonatan. Fecha encargo: 17/10/2025. Ano 1953. '
                    'Tramita la ECU (ACTECU), licencia; Patrimonio favorable 26/05/2026; licencia concedida 31/07/2026. PEM 57.605,35. Visado TL/008830/2026. Superficie 23,08 m2. Presupuestos de contratas: Elecnor (Marta Martin), Valverde. '
                    'Comercial interno: CARLOS.' + CAPTO_CARLOS + ' Muy interesada una persona en silla de ruedas (oskiman@hotmail.com).'},
    ('accesibilidad', 'modificacion_asc', 'subvenciones'), n=fijar('bravomurillo41Qesc17', 2025),
    huecos=H(('TECNICO', 'Jhonatan'), ('CONTACTO', 'Presidenta: Ana Pilar Perez del Cura · Anaperezdelcura@gmail.com'),
             ('CONTACTO', 'Persona en silla de ruedas con necesidades especiales muy interesada en que salga esto adelante: oskiman@hotmail.com')),
    comunidad={'iban': 'ES29 0081 4149 6900 0126 5127'}, presi=('ANA PILAR PEREZ DEL CURA', 'presidente', None, '45422275N', 'Anaperezdelcura@gmail.com'),
    adm=PU['escano'], trae_pu=PU['escano'], captador=CARLOS, lleva=ALVARO)
OMAR = persona_nueva('Omar', 'Cordero', None, None, 'omar.cordero@luxorespacios.com', contrata=LUXOR)
rellenar('bru3', 'BRUNO AYLLON 3', 'brunoayllon3', {'fecha_apertura': '2025-09-23', 'referencia_catastral': '0784112VK4708D',
    'origen_notas': 'Fecha de llegada: 10/2025 (el primer correo de Luxor es del 23/09/2025). Contacta: Luxor Espacios (Sonia Guillen Bravo; tambien Omar Cordero). Tipo de obra: REHAB PARCIAL + ANDAMIOS + CSS + DF (cubierta, garaje y fachada, retacado de ladrillos; DF de andamios y de descuelgue). '
                    'Barrio: Cuatro Caminos. Tecnico: Jhonatan. Fecha encargo: 08/10/2025. Ano 1981. Ayuntamiento, DR (15/12/2025; aprobada con aval de residuos 23-03-2026). PEM 62.503,00. Visados TL/017771/2025 y TL/012988/2026 (CFO). '
                    'Administracion: G.M. FINCAS (Juan Manuel Rodrigo, C. de Juan Pantoja 28; 915 533 044). Comercial interno: CARLOS.' + CAPTO_CARLOS + ' CFO registrado 26/08/2026: la obra esta terminada; queda abierta (no se inventa fecha de cobro).'},
    ('arreglo_cubierta', 'arreglo_fachada', 'df', 'css'), n=fijar('brunoayllon3', 2025),
    huecos=H(('OBRA', 'REHAB PARCIAL + ANDAMIOS + CSS + DF'), ('TECNICO', 'Jhonatan'),
             ('CONTRATA', 'Luxor: Omar Cordero · omar.cordero@luxorespacios.com; Sonia Guillen Bravo · 665 481 878 / 915 211 782 (enviar a Sonia)'),
             ('CONTACTO', 'Francisco (¿nuevo presidente en 2026?) · 686 087 559')),
    presi=('JOSE IGNACIO MARTINEZ POBLACION', 'presidente', None, '48532687L'), adm=PU['jmrodrigo'], trae_pu=PU['sonia'], captador=CARLOS, lleva=ALVARO)
rellenar('bue34', 'BUENDIA 34', 'buendia34', {'fecha_apertura': '2025-09-24',
    'origen_notas': 'Fecha de llegada: 09/2025. Contacta: Daniel (Del Brio y Blanco; daniel@delbrioyblanco.es). Tipo de obra: ASCENSOR (quieren 3D; escaneo de Carlos). Comercial interno: CARLOS.' + CAPTO_CARLOS + ' HE enviada 14/10/2025 por Carlos Garcia.'},
    ('ascensor',), n=fijar('buendia34', 2025, ('2025-09-24', 'Correo de Daniel (Del Brio y Blanco) del 24 de septiembre de 2025.')),
    presi=('JUAN CARLOS MUÑOZ CABELLO', 'presidente', '637215157'), adm=PU['dbrio'], trae_pu=PU['dbrio'], captador=CARLOS, lleva=ALVARO)

# arreglo: presidente de Berastegui 30 grabado con el telefono dentro del nombre
d = b.leer('personas_comunidad?select=id,telefono&nombre=eq.' + quote('655 825 907 Dina'))
if d: act('personas_comunidad?id=eq.' + d[0]['id'], {'nombre': 'Dina', 'telefono': d[0]['telefono'] or '655 825 907'})

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


AYTO = organismo('Ayuntamiento de Madrid', 'ayuntamiento', 'municipal', 'En Madrid capital las licencias se tramitan por la Junta Municipal de Distrito o por una ECU (casi siempre ACTECU). '
                 'Cada distrito tiene su Junta: organismo aparte (tipo junta_distrito).')
AGENCIA = area(AYTO, 'Agencia de Actividades', None, 'Resuelve las licencias que presenta la ECU.')
area(AYTO, 'Archivo de la Villa', None, 'La ECU pide los antecedentes del Archivo de la Villa; si no los tienen, mandan a Negociados (cita previa, que casi nunca hay).')
FUEN = junta(8, 'Fuencarral-El Pardo', notas_='Otro telefono que da la ficha: 91 588 97 53, de 7:30 a 14:30. Ya no tienen correo general (2024).',
                 telefono='91 588 68 54 (L a V de 9 a 14)')
persona_nueva('Francisco', 'Casado', 'técnico', None, 'casadogf@madrid.es', organismo=FUEN, notas_='Junta de Fuencarral-El Pardo (Badalona 48, 2022-24).')
persona_nueva('Antonia', None, None, '915 883 503', None, organismo=FUEN, notas_='Junta de Fuencarral-El Pardo (dato de 06/02/2024).')
HORT = junta(16, 'Hortaleza', direccion='Carretera de Canillas 2')
LIC_H = area(HORT, 'Negociado de licencias', '91 588 76 34 / 91 588 76 44', 'Dato de 2018 (Biosca 16).')
persona_nueva('Lourdes', 'Santa María', None, '91 588 76 44', None, organismo=HORT, area=LIC_H, notas_='Junta de Hortaleza (dato de 2018).')
CL = junta(15, 'Ciudad Lineal', direccion='C/ Hermanos García Noblejas 16')
LIC_CL = area(CL, 'Negociado de licencias', '91 588 75 30', 'Lunes, miércoles y viernes de 9:00 a 10:30 (dato de 2016).')
persona_nueva('Laura', 'Barrionuevo', None, None, None, organismo=CL, area=LIC_CL, notas_='Junta de Ciudad Lineal (Boldano 10, 2016).')
persona_nueva('Eduardo', 'Seco', 'técnico', None, None, organismo=CL, notas_='Junta de Ciudad Lineal: tecnico nuevo en 2022 (Braulio Gutierrez 7).')
CHAM = junta(7, 'Chamberí')
persona_nueva('Carmen', 'García de la Puebla', None, '915 886 703', None, organismo=CHAM, notas_='Junta de Chamberí (Blasco de Garay 46, 2016).')
CANAL = organismo('Canal de Isabel II', 'suministradora', 'autonomico', 'Atencion al cliente 900 365 365. Oficina de atencion: C/ Jose Abascal 10 (con cita).', ca='COMUNIDAD DE MADRID')
ACOM = area(CANAL, 'Acometidas de Alcantarillado', '91 545 19 10', 'Subdireccion Conservacion Infraestructuras Zona Oeste. Plaza Descubridor Diego de Ordas 3, 28003 Madrid.')
ins('correo', [{'organismo_area_id': ACOM, 'email': 'acometidasalcantarillado@canal.madrid', 'etiqueta': 'general', 'principal': True}]) \
    if not b.leer('correo?select=id&email=eq.acometidasalcantarillado@canal.madrid') else None

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

# -- vivas
for carp, nombre in (('badalona58', 'BADALONA 58'), ('badalona60', 'BADALONA 60')):
    fila(carp, '2026-07-30', 'abierta', None, 'JOSE MANUEL SOBRINO PEÑA (ELECNOR)', None, None,
         nombre + ' MADRID. Fecha de llegada: 07/2026. Tipo de obra: REHABILITACION DE CUBIERTA ya realizada: Elecnor pide oferta para aportar documentacion a las DR nuevas que se presentaron. '
         'Contacta: Jose Manuel Sobrino Peña (Elecnor, 696 260 511, jmsobrino@elecnor.es). Comercial interno: DANIEL. La documentacion de Elecnor esta en 1.DATOS/2.DOCUMENTACION. Viva.\n\n' + J(fijar(carp, 2026, ('2026-07-30', 'Correo del 30 de julio de 2026.'))))
persona_nueva('José Manuel', 'Sobrino Peña', None, '696 260 511', 'jmsobrino@elecnor.es', contrata=ELECNOR, notas_='Tambien escribe desde jmsobrino@elecnor.com.')
fila('biosca8', '2025-01-31', 'abierta', None, 'MANUEL CRESPO (SCHINDLER)', None, None,
     'BIOSCA 8 MADRID. Fecha de llegada: 02/2025. Tipo de obra: CSS solamente (la obra la ejecuta GRADCOM). Distrito Hortaleza. HE enviada el 31/01/2025.\n\n' + J(fijar('biosca8', 2025)))
fila('blascabrera64', '2026-08-17', 'abierta', None, 'MARTA MARTIN LOZOYA (ELECNOR)', None, None,
     'BLAS CABRERA 64 MADRID. Fecha de llegada: 08/2026. Tipo de obra: SATE + subv (rehabilitacion de la envolvente; obra 196.195,52 EUR sin IVA, 16 vecinos). ' + ELEC + ' Contacta: Marta Martin (Elecnor, 638 543 742). Comercial interno: DANIEL. Viva.\n\n'
     + J(fijar('blascabrera64', 2026, ('2026-08-17', 'Correo de Marta Martin del 17 de agosto de 2026.'))))
fila('blascodegaray14', '2025-06-23', 'abierta', None, 'MIGUEL A. DELGADO (FINCAS ORTEGA DELGADO), administrador', None, None,
     'BLASCO DE GARAY 14 MADRID. Fecha de llegada: 06/2025. Tipo de obra: SATE, sin DF ni CSS; con CAEs y subvenciones. Distrito Chamberi. Administracion: Fincas Ortega Delgado (Miguel A. Delgado, miguel@fincasortegadelgado.com; '
     'es el nuevo administrador de Huerta del Bayo 13, junio 2025). Comercial interno: CARLOS (la capto antes de irse en feb-2026; la lleva Alvaro).' + REV + '\n\n'
     + J(fijar('blascodegaray14', 2025, ('2025-06-23', 'La fecha va dentro: "junio 2025"; se pone la de la ficha.'))), comercial='Alvaro (capto Carlos)')
fila('blascogaray7', '2026-09-15', 'abierta', None, 'ISAAC PIZARROSO (GESTIN), administrador', None, None,
     'BLASCO GARAY 7 MADRID. Fecha de llegada: 09/2026. Tipo de obra: SATE + subv, o medianera y cubierta. Administracion: GESTIN (Isaac Pizarroso Arnao; Alberto Aguilera 7, 1o izda.; 91 447 10 09). Presidente: Matias Corral (627 041 855, corral.matias@gmail.com). '
     'Comercial interno: DANIEL. Viva.\n\n' + J(fijar('blascogaray7', 2026, ('2026-09-15', 'Correo de Isaac Pizarroso del 15 de septiembre de 2026.'))))
fila('brasilia39', '2026-10-02', 'abierta', None, 'FRANCISCO SOLA', None, None,
     'AV BRASILIA 39 MADRID. Fecha de llegada: 10/2026. Tipo de obra: rampa de acceso al portal, aerotermia y fotovoltaica; estado de las tejas. Contacto: Francisco Sola, 639 11 96 83, fsola47@gmail.com. Comercial interno: DANIEL. La ficha no tiene notas. Viva.')
fila('brauliogutierrez7', '2020-07-24', 'abierta', None, 'JOSE OLIVARES (ROSERSESE)', 'H79729422', '6158315VK4765G',
     'BRAULIO GUTIERREZ 7 MADRID. Fecha: 08/2020 (primeros ficheros de julio-2020). Tipo de obra: INSTALACION DE ASCENSOR (en la fachada trasera). Distrito 15 - Ciudad Lineal (Pueblo Nuevo). Tecnico: Enrique. Licencia aprobada 05-12-2023. '
     'Administracion: Vicente Rojo (654 30 29 62 / 913 67 61 40; vicente@vrojo.com). Junta de Ciudad Lineal: Eduardo Seco (tecnico nuevo 2022). PEM 114.767,79 (a 10/12/21). Visado TL-018750-2020. Expediente 116/2020/03273. '
     'El ayuntamiento exigio retranquear el pozo del Canal de Isabel II; jul-2025 la obra seguia sin empezar (la comunidad tuvo que hacer un pozo nuevo). La instalacion depende de la concesion de ayudas. Viva.\n\n'
     + J(fijar('brauliogutierrez7', 2022, ('2022-03-22', 'La fecha va dentro: "22/03/22".'))))
fila('badalona118', '2024-05-22', 'abierta', None, 'DAVID DE TAPIA (QUEVARU), administrador', None, None,
     'BADALONA 118 MADRID. Fecha de llegada: 05/2024. Tipo de obra: SATE + NG + SUBV. Distrito Fuencarral-El Pardo. Administracion: Quevaru Asociados (David de Tapia; C/ Anastasia Lopez 1 local; 91 734 82 04; quevaru@gmail.com). '
     'HE enviada 22/05/2024 (10 vecinos; cubierta de fibrocemento con una capa encima).' + REV + '\n\n' + J(fijar('badalona118', 2024)),
     huecos=H(('AYUNTAMIENTO', 'Fuencarral – El Pardo'), ('CONTACTO', 'Jason · 686 321 375 · zhangjasonqitian@gmail.com'), ('NOTA', 'PONER AL PRESIDENTE EN COPIA DE TODOS LOS MAILS A MENOS QUE SEA UN TEMA DELICADO')))
fila('bolaños91', '2024-09-12', 'abierta', None, 'CARMEN GARCIA (DEL BRIO Y BLANCO), administradora', None, None,
     'BOLAÑOS 91 MADRID. Fecha de llegada: 09/2024. Tipo de obra: SILLA ELEVADORA (del portal al ascensor, 7 u 8 peldaños) + informacion de subvenciones. Distrito Puente de Vallecas. Presidenta: Laura, 649 427 448.' + REV + '\n\n'
     + J(fijar('bolaños91', 2024, ('2024-09-12', 'Correo de Carmen (Del Brio y Blanco) del 12 de septiembre de 2024.'))))

# -- proyecto hecho antiguo / no se sabe: [REVISAR DESPUES]
fila('badalona48', '2022-04-22', 'abierta', None, 'JUAN PARAMIO -> VICENTE REAL (FAIN)', 'H79696548', '1528327VK4812H',
     'CALLE BADALONA 48 MADRID. Fecha de llegada: 04/2022. Tipo de obra: ASCENSOR con invasion de jardin + CSS. Distrito 08 - Fuencarral-El Pardo (Valverde). Tecnico: Fernan. Administracion: Quevaru (David de Tapia, 917 348 204). '
     'Presidente: Jose Maria Caravaca Martinez (47024066Z; 691 762 637; josecaravaca.jc@gmail.com). Antiguo presidente, entiende de temas tecnicos: Efrain Muñoz (600 872 563, efrainmunoz@yahoo.es). '
     'PEM 102.677,54. Visado TL/017092/2022. Expediente 350/2022/09176. Licencia de ascensor NZ 3.1.a; concedida 16-07-2024. Superficie 87,25.' + REV + '\n\n' + J(fijar('badalona48', 2022)),
     huecos=H(('CONTRATA', 'FAIN: JUAN PARAMIO -> Vicente Real; tambien Galvez y Ruben Cabaco. "Segun Galvez y Paramio, solo poner a Vicente Real"'),
              ('AYUNTAMIENTO', 'Junta de Fuencarral: Francisco Casado (casadogf@madrid.es); Antonia (06/02/2024) 915 883 503; 91 588 97 53 (de 7.30 a 14.30 h); 91 588 68 54 junta de distrito de L a V de 9 a 14 (ya no tienen mail)')))
fila('biosca16', '2018-01-16', 'abierta', None, 'JUAN CARLOS (THYSSEN)', 'H79530796', '5003405VK4850C',
     'C/ BIOSCA 16 MADRID. Fecha: 01/2018. Distrito 16 - Hortaleza (Pinar del Rey). Administracion: Administracion de Fincas y Servicios a Comunidades SL (colegiados 3487-3507; Carril del Conde 106; Jose Luis; 91 300 33 02; '
     'admonfincasyservicios@gmail.com) - no esta en la agenda. Presidente: Luis Paredes Carretero (51342290B). Junta de Hortaleza (Ctra. de Canillas 2): Lourdes Santa Maria 91 588 76 44; negociado de licencias 91 588 76 34 / 76 44. '
     'PEM 81.729; residuos 300. Expediente 118/2018/00889. NZ 3.1 a. Fachada 15,50; superficie 80 m2. Proyecto hecho (Biosca 18 es "igual que el de TKE 16").' + REV)
fila('boldano10', '2016-11-11', 'abierta', None, 'ANTONIO MIRA (ANYLOR)', 'H79667622', '5767407VK4756H',
     'CALLE BOLDANO 10 MADRID. Fecha: 11/2016. Distrito 15 - Ciudad Lineal (Quintana). Presidente: Francisco Jose Bravo Grande. Junta de Ciudad Lineal (C/ Hermanos Garcia Noblejas 16): Laura Barrionuevo; negociado de licencias 91 588 75 30, '
     'L-X-V de 9:00 a 10:30. PEM 50.000; residuos 300. Expediente 116/2016/05204. NZ4. Fachada 22,90; superficie 41,30. Proyecto hecho (hay hoja estadistica de construccion).' + REV)
fila('BlascodeGaray46', '2016-09-01', 'abierta', None, 'FELIPE OSADO (ENOR)', 'H78895554', '9864218VK3796D',
     'BLASCO DE GARAY 46 MADRID. Fecha: 09/2016. UNA oportunidad con DOS encargos: el ascensor y un informe pericial (Monica, 6-oct-2026). Hay dos carpetas: "BlascodeGaray46" (PEM 35.000, residuos 300, expediente 107/2016/4644; '
     'incluye direccion de obra y coordinacion de seguridad, 3.000 EUR + IVA) y "blascodegaray46 1-6" (PEM 8.080, superficie 11,10). Distrito 07 - Chamberi (Arapiles). Grado de proteccion parcial. NZ1 grado 3. Fachada 13,60. '
     'Administracion: Alfin Asesores (Eduardo Sanchez, C/ Fernando el Catolico 47; 630 292 090; eduardo@alfin-asesores.com) - no esta en la agenda. Presidente: Pedro Tomas Campos (13108649Y; 676 995 334; pedro_campos_garcia@hotmail.com). '
     'Cuenta ES06 0081 0216 7200 0178 4181. Junta de Chamberi: Carmen Garcia de la Puebla, 915 886 703.' + REV + '\n\n' + J(fijar('BlascodeGaray46', 2016, ('2016-09-01', 'Sin fecha; ficha de 09/2016.'))))
for carp, fecha, trajo, t in [
        ('badalona28', '2022-05-01', None, 'CALLE BADALONA 28 MADRID. Fecha de llegada: 05/2022 (dia desconocido). Distrito 08 - Fuencarral-El Pardo (Valverde). Ficha vacia.'),
        ('bailen43', '2018-03-29', 'DANIEL, CONSTRUCTOR DE LEGANES', 'C/ BAILEN 43 MADRID. 2018. Tipo de obra: TEJADO. Hay borrador de escalera.'),
        ('barbaradebraganza', '2018-05-01', None, 'BARBARA DE BRAGANZA MADRID (sin numero; la ficha dice "Calle municipio"). Fecha: 05/2018. Ficha vacia; hay presupuestos de escalera convencional.'),
        ('belzunegui52', '2021-07-01', 'RAUL (ELECNOR)', 'CALLE BELZUNEGUI 52 MADRID. Fecha: 07/2021. Distrito 11 - Carabanchel (Puerta Bonita). Ficha vacia; hay presupuesto con mediciones.'),
        ('bravomurillo28', '2017-10-03', 'OSCAR (FAIN)', 'CALLE BRAVO MURILLO 28 MADRID. Fecha xx/20xx (ficheros de oct-2017). Distrito 07 - Chamberi (Trafalgar). Ficha vacia; hay documentacion de ascensor.')]:
    fila(carp, fecha, 'abierta', None, trajo, None, None, t + REV)

# -- cerradas
fila('bravomurillo213bis', '2023-10-30', 'cerrada', 'Muerta: 05/12/2023 "se realizo presentacion y votaron que no quieren nada".', 'ALFREDO CABRERO (FAIN)', None, None,
     'CALLE BRAVO MURILLO 213 BIS MADRID (en Catastro, 213A). Fecha de llegada: 10/2023. Tipo de obra: bajada a cota cero y estudio Iberdrola. Distrito 06 - Tetuan (Berruguete). Administracion: Arrialsi (Silvia; 917 307 033; info@arrialsi.com). '
     'Contactos: Jaime (jaime.esteban@gmail.com); vicepresidente Rafael Presa (665 69 90 96, rafapresa@opcionjuridica.e.telefonica.ne).\n\n' + J(fijar('bravomurillo213bis', 2023)))
for carp, fecha, trajo, t in [
        ('batalladetorrijos15', '2018-07-11', 'PEDRO ARANDA (THYSSEN)', 'c/ BATALLA DE TORRIJOS 15 MADRID. Fecha: 07/2018. Distrito 11 - Carabanchel (Vista Alegre). Ficha vacia.'),
        ('berenguela23', '2015-12-06', 'PEDRO ARANDA (THYSSEN)', 'Calle BERENGUELA 23 MADRID. Fecha: xx/20xx (ficheros de dic-2015). Distrito 10 - Latina (Puerta del Angel).\n\nAscensor embarque simple 4 paradas, hueco 1080 x 1360. Hay que coger 25 cm de pared de local. Hay que invadir un trastero.'),
        ('berenisa38', '2017-07-20', 'LUIS MIGUEL NUNES (THYSSEN)', 'Calle BERENISA 38 MADRID. Fecha: 07/2017. Distrito 09 - Moncloa-Aravaca (Aravaca). Ficha vacia; hay croquis.'),
        ('bustillodeloro18', '2016-05-27', 'LUIS MIGUEL NUNES (THYSSEN)', 'Calle BUSTILLO DEL ORO 18 MADRID. Fecha: 05/2016. Distrito 06 - Tetuan (Berruguete). Ficha vacia; hay croquis.'),
        ('bembibre24', '2016-03-01', 'FELIPE OSADO (ENOR)', 'Calle BEMBIBRE 24 MADRID. Fecha: 03/2016. Distrito 16 - Hortaleza (Apostol Santiago). Ficha vacia; hay croquis.'),
        ('biosca12', '2018-04-05', None, 'BIOSCA 12 MADRID. Carpeta SIN ficha de datos: solo un PDF con la planta (abril 2018).'),
        ('blascodegaray48', '2012-08-01', None, 'BLASCO DE GARAY 48 MADRID. Carpeta SIN ficha de datos: solo fotos (agosto 2012).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)
persona_nueva('Luis Miguel', 'Nunes', None, None, None, contrata=TKE, notas_='Thyssen (hoy TKE), 2016-2017: Berenisa 38, Bustillo del Oro 18.')
persona_nueva('Felipe', 'Osado', None, None, None, contrata=ENOR, notas_='ENOR, 2016: Bembibre 24, Blasco de Garay 46.')


# ================================================================= 4. MANIAS (municipio MADRID)
def mania(texto, dep, fecha, carp, clave=None, trozo=None, cita=None, tecnico=None):
    nid = None; oid = None; cid = None
    if clave:
        oid = OPP[clave][1]; nid, cita = nota_de(clave, fecha, trozo)
    else:
        cid = CLON.get(carp) or (b.leer(T + '?select=id&municipio=eq.MADRID&carpeta=eq.' + quote(carp)) or [{'id': None}])[0]['id']
    ins('manias_organismos', [{'municipio_id': MUN, 'departamento': dep, 'tecnico': tecnico, 'mania': texto, 'cita': cita, 'fecha': fecha, 'oportunidad_id': oid,
                               'nota_oportunidad_id': nid, 'clon_id': cid, 'ruta_dropbox': R(carp), 'origen': 'ficha_dropbox'}])


nb48 = dict(fijar('badalona48', 2022))
mania('Mejor presentar antes una CONSULTA URBANISTICA (350 EUR de tasa). Si no, presentar la licencia tal cual y contestar los requerimientos; justificar muy bien por que no se sigue el modelo homogeneo.',
      'Junta Municipal de Distrito de Fuencarral-El Pardo (informador urbanistico)', '2022-10-07', 'badalona48', cita=nb48['2022-10-07'])
mania('Con los jardines de planta baja en infraccion urbanistica NO aceptan cambiar el modelo homogeneo de ascensor; el tecnico nuevo (2024) avisa de que pueden pedir restituir los patios y acceder a las viviendas desde el portal, y exige acera perimetral de 1,80 m (meterse en los parterres).',
      'Junta Municipal de Distrito de Fuencarral-El Pardo', '2024-02-06', 'badalona48', cita=nb48['2023-06-26'] + '\n\n' + nb48['2024-02-06'])
mania('En zona ZETU no dan NINGUNA subvencion (ni Plan Rehabilita del Ayto ni CAM) si no se acredita la accesibilidad universal o los ajustes razonables del IEE, aunque la obra sea solo de conservacion (cubierta, amianto).',
      'Ayuntamiento de Madrid (Plan Rehabilita)', '2026-04-22', 'batalladetorrijos23', clave='bt23', trozo='ZETU')
mania('Si la obra no empieza dentro de plazo, el ayuntamiento extingue la DR y hay que presentar otra (con nueva tasa).',
      'Ayuntamiento de Madrid', '2026-06-25', 'batalladetorrijos23', clave='bt23', trozo='extinción de la DR')
mania('Subvencion de retirada de amianto: el aislamiento que sustituye al material con amianto tiene que ser de al menos 8 cm de espesor (bases de la convocatoria).',
      'Subvenciones (convocatoria de amianto)', '2024-12-23', 'batalladetorrijos23', clave='bt23', trozo='8 cm')
mania('Patio que el PGOUM califica de "espacio publico en el interior de alineacion oficial en volumetria especifica" (art. 6.2.5): el proyecto lleva una serie de planos extra.',
      'Ayuntamiento de Madrid', '2024-09-30', 'belvisdelajara7', clave='bel7', trozo='volumetría específica')
mania('Desde el 21-feb-2025 requieren la tabla corregida de la UNE-EN 81-70: cabina minima de 1,00 x 1,30 m (una puerta o dos enfrentadas). Hubo que rehacer el ascensor del proyecto.',
      'Ayuntamiento de Madrid', '2025-06-24', 'belvisdelajara7', clave='bel7', trozo='UNE-EN 81')
mania('La ECU pide los antecedentes del Archivo de la Villa y, si el edificio esta protegido, separata de Patrimonio.', 'ECU (ACTECU)', '2026-01-07', 'barbieri9', clave='bar9', trozo='archivo de la villa')
mania('La ECU pide el Archivo de la Villa en cuanto recibe el proyecto.', 'ECU (ACTECU)', '2025-12-09', 'bravomurillo41Qesc17', clave='bm41', trozo='Archivo de la Villa')
mania('El Archivo de la Villa contesta que no tiene la documentacion y manda a Negociados, donde no hay cita: el expediente se queda esperando meses.',
      'Ayuntamiento de Madrid (Archivo de la Villa / Negociados)', '2026-04-28', 'berastegui33', clave='ber33', trozo='archivo de la villa')
mania('La Agencia de Actividades no resuelve una licencia de ascensor si no hay escalera de uso general en todo el nucleo vertical (vivienda "no amparada" en la ultima planta); no valen como ejemplo expedientes con menos espacio. O se desiste o se cambia la solucion.',
      'Ayuntamiento de Madrid (Agencia de Actividades), via ECU', '2026-07-03', 'berastegui33', clave='ber33', trozo='Agencia de Actividades')
mania('En una colonia con proteccion ambiental se puede justificar la puerta de doble embarque en fachada a cota de calle por accesibilidad. Patrimonio pide puerta exterior automatica de cristal, que nada salga de fachada y puertas acristaladas en las paradas para que pase la luz.',
      'Patrimonio (CIPHAN)', '2026-06-04', 'bravomurillo41Qesc17', clave='bm41', trozo='Patrimonio indica')
mania('Patrimonio rechazo un ascensor con parada en entreplanta (la DR) y no admite las maquinas encima de la torre.', 'Patrimonio', '2026-09-25', 'bolsa3', clave='bol3', trozo='patrimonio')
nbg = dict(fijar('brauliogutierrez7', 2022, ('2022-03-22', '')))
mania('Requerimiento: antes de la licencia del ascensor hay que retranquear el pozo de registro del Canal; el Canal exige proyecto completo de retranqueo (memoria, pliego, planos, presupuesto, ESS) asociado a un expediente de acometida de alcantarillado, y legalizar la acometida si la finca no tiene licencia. Puede parar la obra anos.',
      'Junta Municipal de Distrito de Ciudad Lineal / Canal de Isabel II', '2023-02-08', 'brauliogutierrez7', cita=nbg['2023-02-08'][:4000])
mania('El tecnico de la Junta (Eduardo Seco, nuevo en 2022) estuvo meses sin mirar el requerimiento contestado.', 'Junta Municipal de Distrito de Ciudad Lineal', '2022-03-22', 'brauliogutierrez7',
      cita=nbg['2022-03-22'], tecnico='Eduardo Seco')

# ================================================================= 5. RESUMEN
if not ESCRIBIR:
    print('\n*** MARCHA EN SECO ***  (%d operaciones)\n' % len(SECO))
    cuenta = {}
    for s in SECO:
        k = ' '.join(s.split()[:2]).split('?')[0]; n = int(s.split(' x')[1].split(':')[0]) if s.startswith('INSERT') else 1
        cuenta[k] = cuenta.get(k, 0) + n
    open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'madrid_b_seco.txt'), 'w', encoding='utf-8').write(chr(10).join(SECO))
    for k, v in sorted(cuenta.items()): print('  %-55s %d' % (k, v))
else:
    for k, (c, oid, carp) in OPP.items():
        r = b.leer('oportunidades?select=fecha_apertura,capta:comercial_captador_id(nombre),lleva:comercial_id(nombre),tipos:oportunidad_tipos(count)&id=eq.' + oid)[0]
        print('%-7s %s capta=%s lleva=%s tipos=%d notas=%d' % (k, r['fecha_apertura'], r['capta']['nombre'], r['lleva']['nombre'], r['tipos'][0]['count'],
              len(b.leer('notas_oportunidad?select=id&oportunidad_id=eq.' + oid))))
    print('clon MADRID:', len(b.leer(T + '?select=id&municipio=eq.MADRID')), '| manias MADRID:', len(b.leer('manias_organismos?select=id&municipio_id=eq.' + MUN)),
          '| organismos MADRID:', len(b.leer('organismos?select=id&municipio_id=eq.' + MUN)))
