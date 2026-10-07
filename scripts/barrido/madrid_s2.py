# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda S2 (sanfidel97-99 .. santavirgilia24, carpetas [50:100] de la S). 7-oct-2026. Sin --escribir: marcha en seco.
# La S1 [0:50] y la S3 [100:149] las preparan otros agentes a la vez.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de, _lineas

PU.update(paz_gesmadrid='5733290e-d53c-48d2-8fb7-efad8f352a4f', alemany='feb70e2c-3f94-4fd2-8515-f590d6cd67c4', ofernandez_fain='984ff96b-2f48-414b-a89e-bb207367ae4c',
          amulas='a972458e-10f8-416c-a34d-5b39065c49ca', pescalona='62b2404c-cf2c-4c66-bfc5-e7412a379559', olga_jimeco='ef1332fc-cd83-4b25-9efd-ddca69691dd0',
          paramio='900b6af9-4a5c-4e31-8c09-322357ee402c', jvelasco='94b4d0ec-edd7-4038-a58f-0823b287fa8f', magomez_fain='84f6210b-6fc3-48c4-b18c-b8cffb9416c9',
          vreal='3606239e-1b7a-48c1-bea2-08c841efee80')
FAIN = 'fa005671-8d23-45a6-8172-0ea7ca8c8950'
CLINEAL = 'c9d678a9-96d2-4cf1-ba5e-5f30bfd71eed'; HORTALEZA = 'd1f9fd48-7eba-4c25-a48e-892b03006d16'; EICI = '53e0fb47-5748-4c9d-9053-6f090dec3d8b'

# Propuesta para Monica (como Fatou 24 / BESTEIRO_UNA_OPP / PAULAR_UNA_OPP). False = una opp por escalera.
# Santa Cruz de Marcenado 1 (Edificio Princesa): tres comunidades en produccion (ESC C, ESC D, ESC E), MISMO CIF H79191615, misma parcela 0158902VK4705G,
# misma presidenta y administracion, todo en 2025 por FAIN (Juan Paramio). HE por escalera: la C (bajar una parada y foso, 13/03/2025) y la D y la E
# (subir una parada y maquinaria, las dos el 22/04/2025, pedidas en el mismo correo). Se rellena la opp de la ESC C, se le enlazan los accesos de D y E,
# y las opps vacias de D (4e8a5bce) y E (6e94e49c) quedan para borrar. La carpeta santacruzdemarcenado1-2-4acuerdo34 es el primer contacto (feb-2025).
SCM_UNA_OPP = True
OPP_SCM_D = '4e8a5bce-18c6-4471-a4a3-3c315d74994c'; OPP_SCM_E = '6e94e49c-796d-4532-ab10-d457df7b92c0'
ACC_SCM_D = 'ef3936fe-de51-4cd8-afdd-f1f3c5921188'; ACC_SCM_E = '2bcfcdd7-47c7-467e-85d5-24cbb790ec70'

EDU9 = 'santaeduvigis9/FICHA DATOS.docx'
POL1 = 'sanpoldemar7/sanpoldemar1/FICHA DATOS TECNICOS.docx'


def cid_de(prefijo):
    cs = b.leer('comunidades?select=id&municipio=eq.MADRID&nombre=like.' + quote(prefijo) + '*'); assert len(cs) == 1, prefijo
    return cs[0]['id']


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto o ya no vigente. Devuelve su id."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1:
        act('personas_comunidad?id=eq.' + d[0]['id'], datos); return d[0]['id']


def pc_unico(cid, nombre, rol, tel=None, doc=None, email=None, notas_=None):
    """pc() para roles que no son presidente, sin repetirla si el script se relanza."""
    ya = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&nombre=eq.%s' % (cid, quote(nombre)))
    return ya[0]['id'] if ya else pc(cid, nombre, rol, tel, doc, email, notas_)


def presi_nuevo(cid, nombre, tel=None, doc=None, email=None, notas_=None):
    """presidente NUEVO cuando el que hay en la app pasa a 'otro' en esta misma tanda (en seco pc() veria aun al anterior)."""
    ya = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&nombre=eq.%s' % (cid, quote(nombre)))
    if ya: return ya[0]['id']
    i = nuevo_id()
    ins('personas_comunidad', [{'id': i, 'comunidad_id': cid, 'nombre': nombre, 'rol': 'presidente', 'telefono': tel, 'email': email, 'documento': doc,
                                'es_contacto_principal': False, 'notas': notas_}])
    return i


def trae(pcid):
    return {'quien_persona_comunidad_id': pcid, 'persona_comunidad_id': pcid}


def admin_empresa(cid, empresa):
    if not b.leer('comunidad_admin_responsable?select=id&vigente=eq.true&comunidad_id=eq.' + cid):
        ins('comunidad_admin_responsable', [{'comunidad_id': cid, 'empresa_id': empresa, 'puesto_id': None, 'vigente': True}])


def alta_admin(nombre, notas_, nombre_legal=None):
    """administracion de fincas nueva que lleva una comunidad de PRODUCCION (criterio de Monica, 7-oct-2026)."""
    ya = b.leer('empresa?select=id&nombre_accesalia=eq.' + quote(nombre))
    if ya: return ya[0]['id']
    i = nuevo_id()
    ins('empresa', [{'id': i, 'nombre_accesalia': nombre, 'nombre_legal': nombre_legal, 'tipo': 'administracion_fincas', 'activa': True, 'comercial_id': DANIEL, 'notas': notas_}])
    return i


def enlazar(oid, acc, de_donde):
    if not b.leer('relacion_oportunidad_accesos?select=acceso_id&opp_id=eq.%s&acceso_id=eq.%s' % (oid, acc)):
        ins('relacion_oportunidad_accesos', [{'opp_id': oid, 'acceso_id': acc, 'de_donde': de_donde}])


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
cl = lambda c, a, s=None: J(fijar(c, a, s))
MARCA = lambda n, m: [(f, t + '\n\n(' + m + ')') for f, t in n]

# ================================================================= 0. AGENDA
# FAIN: el comercial que vendio el presupuesto de las escaleras D y E de Santa Cruz de Marcenado 1 (no estaba en la agenda).
persona_nueva('David', 'Pérez Gómez', 'comercial', '648012088', 'david.perez@fainascensores.com', contrata=FAIN,
              notas_='FAIN: comercial de las escaleras D y E de Santa Cruz de Marcenado 1 (2025; carpetas santacruzdemarcenado1escD y escE).')
# Junta de Ciudad Lineal: tecnica en la ficha de San Maximiliano 23 (2021). Sin correo.
persona_nueva('Carlota', 'Rodrigáñez', 'técnico', None, None, organismo=CLINEAL,
              notas_='Junta de Ciudad Lineal: tecnica del ayuntamiento en la ficha de San Maximiliano 23 (DR del ascensor, expediente 116/2021/05029; carpeta sanmaximiliano23).')
# EICI: firma el correo del informe favorable de la CPPHAN de Santa Cruz de Marcenado 1 esc. C (22/10/2025). Sin correo propio.
persona_nueva('Elena', 'Vaquero', None, None, None, organismo=EICI,
              notas_='EICI: firma el correo del informe favorable de la CPPHAN de Santa Cruz de Marcenado 1 esc. C (22/10/2025; carpeta santacruzdemarcenado1escC). Correo general info@eici.es.')
# Junta de Hortaleza: el servicio tecnico de la ficha de Santa Virgilia 20 (2023-2026).
area(HORTALEZA, 'Servicio de Medio Ambiente y Escena Urbana', '91 588 76 14',
     'Departamento de Servicios Tecnicos: tecnihortaleza@madrid.es; lunes, miercoles y viernes de 9 a 10:30 (ficha de Santa Virgilia 20, 2023-2026; carpeta santavirgilia20).')

# Administracion nueva de una comunidad de PRODUCCION (Santa Coloma 9)
CARETAL = alta_admin('CARETALSARPEY', 'Alta en el barrido de Madrid (Santa Coloma 9; carpeta santacoloma9). En la ficha solo el nombre, sin persona, telefono ni correo.')

# ================================================================= 1. PRODUCCION
# --- San German 49: en la app "JESSICA vecina" como presidenta, con el telefono en el DNI. Es una vecina.
cge = cid_de('SAN GERMAN 49')
jessica = arreglar_pc(cge, 'rol=eq.presidente', {'nombre': 'JESSICA', 'rol': 'vecino', 'telefono': '625273399', 'documento': None, 'email': 'jessicadelolmo@gmail.com',
                                                  'notas': 'Vecina, la mas interesada en el ascensor (tiene mayor cuota). En la ficha estaba en la casilla del presidente ("JESSICA vecina") '
                                                           'y el telefono en la del DNI.'})
t = _notas_de('sangerman49', 2025)[0][1]
n = partir([('2025-05-22', t)], 0, 'Enviado hoja', '2025-06-03')
n[0] = (n[0][0], n[0][1] + '\n\n(Sin fecha en la ficha; se pone la de la visita, 22/05/2025.)')
rellenar('sg49', 'SAN GERMAN 49', 'sangerman49', dict({'fecha_apertura': '2025-05-22',
    'origen_notas': 'Fecha de llegada: 05/2025 (dia: las fotos de la visita, 22/05/2025; es tambien la "fecha encargo" de la ficha). Contacta: Jessica, vecina (625 273 399; '
                    'jessicadelolmo@gmail.com), la mas interesada: en la ultima reunion aprobaron buscar empresas para presupuestar el ascensor. La ficha no rellena el tipo de obra; '
                    'por las notas, ASCENSOR (HE e informe de viabilidad enviados 03/06/2025). La ficha no dice comercial interno; la lleva Daniel.'}, **trae(jessica)),
    ('ascensor',), n=n)

# --- San Herculano 2: Andres del Barrio = presidente ANTERIOR; Oscar Lopez Mas = el NUEVO (Monica, 7-oct-2026)
che = cid_de('SAN HERCULANO 2')
for x in b.leer('personas_comunidad?select=id,nombre&rol=eq.presidente&comunidad_id=eq.' + che):
    if 'BARRIO' in x['nombre'].upper():
        act('personas_comunidad?id=eq.' + x['id'], {'rol': 'otro', 'notas': 'Presidente ANTERIOR (en la ficha de 2026 el presidente es Oscar Lopez Mas; Monica, 7-oct-2026).'})
if not b.leer('personas_comunidad?select=id&nombre=eq.' + quote('OSCAR LOPEZ MAS') + '&comunidad_id=eq.' + che):
    ins('personas_comunidad', [{'id': nuevo_id(), 'comunidad_id': che, 'nombre': 'OSCAR LOPEZ MAS', 'rol': 'presidente', 'telefono': None, 'email': None, 'documento': '51657265R',
        'es_contacto_principal': False, 'notas': 'Presidente en la ficha de 2026; su DNI esta en la carpeta (1.DATOS/2.DOCUMENTACION, jul-2026).'}])
rellenar('sh2', 'SAN HERCULANO 2', 'sanherculano2', {'fecha_apertura': '2026-01-01', 'referencia_catastral': '8271705VK4787A',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia desconocido; el .skb del 12/01/2026 es de plantilla y los ficheros de 2022-2025 de la carpeta, plantillas de subvencion e IEE). '
                    'Contacta: Paz Terradillo (GESMADRID; 917 25 14 96 / 609 05 89 53; atencion.cliente@gesmadrid.com y mpazterradillos@gmail.com). Paga: la CP. Tipo de obra: SATE + SUBV '
                    '(proyecto: rehabilitacion de envolvente termica en edificio residencial existente). Tecnico: Carlos Daza. Fecha encargo: 05/05/2026 (HE firmada). Ano 1970. '
                    'Comunidad: CDAD PROP CL SAN HERCULANO N 2 (CIF H79710141). Presidente: Oscar Lopez Mas (51657265R); el anterior, Andres del Barrio (Monica, 7-oct-2026). '
                    'Superficie 534,33. Proyecto enviado a la ECU (ACTECU) el 03/09/2026; hoja de encargo de la ECU firmada y tasa pagada el 08/09/2026. '
                    'En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('sate', 'subvenciones'), n=fijar('sanherculano2', 2026), comunidad={'iban': 'ES51 0128 0029 7801 0006 8361'},
    trae_pu=PU['paz_gesmadrid'], captador=CARLOS, lleva=ALVARO)

# --- San Luciano 7
rellenar('sl7', 'SAN LUCIANO 7', 'sanluciano7', {'fecha_apertura': '2025-03-11', 'referencia_catastral': '0985906VK4608F',
    'origen_notas': 'Fecha de llegada: 03/2025 (dia: el escaneo y la primera nota, 11/03/2025: "Es muy urgente"). Contacta: Miguel Alemany (IBERLEAN; 659 48 31 07; malemany@iberlean.com; '
                    'Miguel lleva la facturacion y Alfredo la parte comercial). Paga: IBERLEAN el proyecto; la comunidad aparte el CEE y la IEE; las subvenciones se las tramita Iberlean. '
                    'Tipo de obra: ELEVADOR VERTICAL (IBERLEAN; plataforma Invictus) + IEE (CP). Barrio: Angeles. Tecnicos: EA Santiago, proyecto Jhonatan, presupuesto Ernesto. Fecha encargo: '
                    '11/03/2025. Jefe de obra: Leonardo Betancourt. Ano 1961. DR por ECU (ACTECU). Obra: inicio 23/09/2025, fin 11/05/2026. Administracion: SALLET (Leticia Ruano Pardo; '
                    '656 540 513 / 605 067 131 / 910 713 210; sallet@telefonica.net), "a traves de Miguel Alemany"; pedidos docs a la CP 11/03. Presidente: Francisco Jose Arrones Calderon '
                    '(02291330R). PEM 43.810,81. Visados TL/010227/2025 y TL/012992/2026 (CFO, registrado en el Ayto el 26/08/2026). La ficha no dice comercial interno; la lleva Daniel.'},
    ('plataforma', 'iee', 'cee'), n=fijar('sanluciano7', 2025), comunidad={'iban': 'ES44 2085 9283 7703 3043 6652'}, trae_pu=PU['alemany'])

# --- San Maximiliano 23
cmx = cid_de('SAN MAXIMILIANO 23')
rellenar('smx23', 'SAN MAXIMILIANO 23', 'sanmaximiliano23', {'fecha_apertura': '2021-09-01', 'referencia_catastral': '4553609VK4745D',
    'origen_notas': 'Fecha de llegada: 09/2021 (dia: el acta de aprobacion del ascensor con Fain y el CIF de la comunidad, 01/09/2021; los ficheros de 2020 de la carpeta son plantillas de '
                    'memoria). Empresa/cliente: FAIN (Oscar Fernandez). Tipo de obra: ASCENSOR (con subvenciones: la de 2023, tramitada por Sandra, y la del Ayto de Madrid de 2021, que '
                    'tramito Nunci). Tecnico: Dennis. Fecha encargo: septiembre 2021. Jefes de obra: Manuel Requena y Abel Bernardos. Administracion: Ma VICTORIA MURCIA MOLINERO (Ma Victoria '
                    'Murcia Molinero / Maria Munoz; 691 543 398 / 915 934 484; gestion.de.empresas@hotmail.com; "colegiada"). Presidente: Jose Maria Beato Jimenez (02619827N; 606 325 275; '
                    'josembeatoj@gmail.com). Junta de Ciudad Lineal: tecnica Carlota Rodriganez. PEM 73.411,27 (residuos 300). Visados 018101/2021 y TL/007212/2025 (CFO). Expediente '
                    '116/2021/05029 (DR). En la carpeta hay un "DATOS IEE CE" de nov-2021 que es de Corral de Cantos 19 (copiado). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=fijar('sanmaximiliano23', 2024),
    presi=('José María Beato Jiménez', 'presidente', '606325275', '02619827N', 'josembeatoj@gmail.com'), trae_pu=PU['ofernandez_fain'])

# --- San Pancracio 1 (El Pardo)
cpa = cid_de('SAN PANCRACIO 1')
carolina = pc_unico(cpa, 'CAROLINA RODRIGUEZ', 'otro', '680711271', None, 'mcarolinita53@gmail.com', 'Persona de contacto de la comunidad (ficha, jun-2026).')
rellenar('spa1', 'SAN PANCRACIO 1', 'sanpancracio1', dict({'fecha_apertura': '2026-06-23',
    'origen_notas': 'Fecha de llegada: 06/2026 (dia: el modelo 3D, 23/06/2026). Contacta: Carolina Rodriguez (680 711 271; mcarolinita53@gmail.com). Tipo de obra: INSTALACION ASCENSOR. '
                    'Barrio: El Pardo. CP 28048. La ficha no tiene notas. Comercial interno: ALVARO.'}, **trae(carolina)),
    ('ascensor',), captador=ALVARO, lleva=ALVARO)

# --- San Roberto 8 (un colegio: drenaje perimetral para Elecnor)
rellenar('sr8', 'SAN ROBERTO 8', 'sanroberto8', {'fecha_apertura': '2026-04-23',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: el correo de Andres Mulas, 23/04/2026). Contacta y paga: ELECNOR (Andres Mulas Pineda; 689 77 85 86; amulas@elecnor.es). Tipo de obra: '
                    'PROYECTO DE DRENAJE PERIMETRAL EN VIA PUBLICA Y PROPIEDAD PRIVADA (es un COLEGIO: zanja perimetral, la mitad en el patio interior y la mitad en via publica, unos 250 m2; '
                    'obra estimada 84.477,12, dos meses) + coordinacion de seguridad y salud, para pedir la DR. HE enviada 27/04/2026 (no incluye la tramitacion de ocupacion de via publica). '
                    'Comercial interno: DANIEL.'},
    ('otros_proyecto_tecnico', 'css'), n=fijar('sanroberto8', 2026, ('2026-04-23', 'Correo de Andres Mulas (Elecnor) del 23 de abril de 2026.')), trae_pu=PU['amulas'])

# --- San Roque 14
rellenar('sq14', 'SAN ROQUE 14', 'sanroque14', {'fecha_apertura': '2026-01-28', 'referencia_catastral': '0350220VK4705A',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: la consulta de la IEE, 28/01/2026; el .dxf de 2019 de la carpeta es de plantilla). Tipo de obra: SUBV EXTERNA. Ano 1900. CP 28004. '
                    'Administracion: DAVID DE FRUTOS ADMINISTRADOR DE FINCAS SLO SLU (David de Frutos; 915 220 116; frutos_gamero@yahoo.es). Comunidad: CDAD PROP CALLE SAN ROQUE 14 '
                    '(CIF H82014838). Presidente: Aketxa Zarate Sainz (72394422J; 678 333 226; aketxaz@hotmail.com). La ficha no dice quien contacta. En la ficha: comercial interno CARLOS.'
                    + CAPTO_CARLOS},
    ('subvenciones',), n=fijar('sanroque14', 2026, ('2026-01-28', 'Sin fecha en la ficha; se pone la de llegada.')), comunidad={'iban': 'ES26 0081 5243 4000 0187 5188'},
    presi=('AKETXA ZARATE SAINZ', 'presidente', '678333226', '72394422J', 'aketxaz@hotmail.com'), captador=CARLOS, lleva=ALVARO)

# --- Santa Alicia 31
rellenar('sa31', 'SANTA ALICIA 31', 'santaalicia31', {'fecha_apertura': '2026-04-01',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia desconocido; la ficha es del 06/05/2026). Contacta: Pedro (DEL BRIO Y BLANCO; en la agenda, Pedro Escalona). Tipo de obra: IEE. '
                    'Comercial interno: ALVARO.'},
    ('iee',), n=fijar('santaalicia31', 2026, ('2026-05-07', 'Sin fecha delante; la fecha va dentro de la nota.')), adm=PU['pescalona'], trae_pu=PU['pescalona'],
    captador=ALVARO, lleva=ALVARO)

# --- Santa Coloma 9
rellenar('sco9', 'SANTA COLOMA 9', 'santacoloma9', {'fecha_apertura': '2026-05-27',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: la ficha, 27/05/2026, el unico fichero). Tipo de obra: SATE FACHADA. Administracion: CARETALSARPEY (sin persona ni contacto en la ficha; '
                    'administracion nueva, dada de alta en el barrido). La ficha no dice quien contacta y no tiene notas. Comercial interno: ALVARO.'},
    ('sate_fachada',), captador=ALVARO, lleva=ALVARO)
admin_empresa(OPP['sco9'][0]['id'], CARETAL)

# --- Santa Genoveva 18-20 y Santa Prisca 2-4 (JIMECO, el mismo dia)
for k, pre, carp in (('sg1820', 'SANTA GENOVEVA 18-20', 'santagenoveva18-20'), ('sp24', 'SANTA PRISCA 2-4', 'santaprisca2-4')):
    rellenar(k, pre, carp, {'fecha_apertura': '2026-01-14',
        'origen_notas': 'Fecha de llegada: 01/2026 (dia: la ficha, 14/01/2026, el unico fichero). Contacta: Olga (JIMECO; 611 383 164; administracion@jimeco.es). Tipo de obra: SATE + SUBV. '
                        'La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
        ('sate', 'subvenciones'), adm=PU['olga_jimeco'], trae_pu=PU['olga_jimeco'], captador=CARLOS, lleva=ALVARO)

# --- Santa Cruz de Marcenado 1 (Edificio Princesa): escaleras C, D y E
cC, cD = cid_de('SANTA CRUZ DE MARCENADO 1 ESC C'), cid_de('SANTA CRUZ DE MARCENADO 1 ESC D')
arreglar_pc(cD, 'rol=eq.presidente', {'nombre': 'MARIA INMACULADA PARRONDO ALVAREZ-INSUA', 'notas': 'En la ficha de la escalera D, "ALVAREZ-INSUSA" (errata: las fichas de C y E dicen INSUA).'})
pc_unico(cC, 'JORGE (MANTENIMIENTO)', 'otro', '677036622', None, None, 'Mantenimiento del edificio: "Para visitas confirmar con Inmaculada - Numero de Jorge el de mantenimiento" (ficha, 2025). '
         'mantenimiento@edificioprincesa.com en copia de los correos.')
nA = MARCA(fijar('santacruzdemarcenado1-2-4acuerdo34', 2025), 'Nota de la ficha de la carpeta santacruzdemarcenado1-2-4acuerdo34, el primer contacto.')
nC = fijar('santacruzdemarcenado1escC', 2025)
nD = fijar('santacruzdemarcenado1escD', 2025)
nE = fijar('santacruzdemarcenado1escE', 2025)
SCM_TXT = ('Barrio: Universidad (Centro). Comunidad: CDAD PROP EDIFICIO PRINCESA (calle Santa Cruz de Marcenado 1, 2 y 4 y calle Acuerdo 34; CIF H79191615). Edificio protegido (grado 2 de '
           'proteccion estructural): informe de Patrimonio (CPPHAN). Ano 1975. Ref. catastral 0158902VK4705G. Tecnico: Julio -> Jhonatan. Administracion: CAPILLA Y GARRIDO (Carmen; '
           'C/ Francisco Silvela 72, 28028; 91 726 75 25; capillaygarrido@capillaygarrido.es). Presidenta: Maria Inmaculada Parrondo Alvarez-Insua (02509925G; 699 45 36 92; '
           'parrondoima@gmail.com); para visitas, Jorge, de mantenimiento (677 036 622). Contrata: FAIN (comercial David Perez Gomez, 648 012 088, david.perez@fainascensores.com: '
           '"el presupuesto es muy bajo... quien vendio el presupuesto se confundio... van a asumirlo"). ECU: EICI (la nombra la ficha: "la ECU nueva, la misma de Quintana 9"). '
           'Licencia. En el COAM constaba un encargo anterior al arquitecto Gonzalo Ozarin (gonzalo@tecarq.com): se le pidio la venia (mar-2026).')
if SCM_UNA_OPP:
    nDE = [x for i, x in enumerate(nD) if i not in (2, 3, 11, 12)]  # 22/04 (mas completa en E), y 25/04, 25/03 y 13/04 (iguales en C)
    nDE = MARCA(nDE, 'Nota de las fichas de las escaleras D y E.') + MARCA([x for i, x in enumerate(nE) if i in (2, 4, 8, 9)], 'Nota de la ficha de la escalera E.')
    n = sorted(nA + MARCA(nC, 'Nota de la ficha de la escalera C.') + nDE)
    rellenar('scm', 'SANTA CRUZ DE MARCENADO 1 ESC C', 'santacruzdemarcenado1escC', {'fecha_apertura': '2025-02-11', 'referencia_catastral': '0158902VK4705G',
        'origen_notas': 'Fecha de llegada: 02/2025 (dia: la primera nota, 11/02/2025, en la carpeta santacruzdemarcenado1-2-4acuerdo34: "DE PARTE DE JUAN PARAMIO. INMA PARRONDO"). '
                        'Contacta: Juan Paramio (FAIN), y luego la presidenta, Inma Parrondo. Paga: la CP. UNA oportunidad para las tres escaleras (misma comunidad y CIF), con tres HE: '
                        'escalera C, BAJADA DE PARADA DE ASCENSOR EXISTENTE Y MODIFICACION ESTRUCTURAL DE FOSO (HE firmada 13/03/2025; PEM 35.189,21; visado TL/004258/2026; superficie '
                        '6,41; licencia concedida 17/02/2026); escaleras D y E, SUBIDA DE UNA PARADA DE ASCENSOR EXISTENTE Y MODIFICACION DE MAQUINARIA (HE de las dos firmadas 22/04/2025; '
                        'PEM 2.693,08 cada una; visados TL/004259/2026 (D) y TL/004260/2026 (E); superficies 7,15 (D) y 6,99 (E); licencias concedidas 18/03/2026 (D) y 23/03/2026 (E)). '
                        'Proyectos visados enviados el 13/04/2026. ' + SCM_TXT + ' Carpetas: santacruzdemarcenado1escC, santacruzdemarcenado1escD, santacruzdemarcenado1escE y '
                        'santacruzdemarcenado1-2-4acuerdo34. La ficha no dice comercial interno ("Comercial: DAVID PEREZ" es el de FAIN); la lleva Daniel.'},
        ('anadir_parada', 'modificacion_asc', 'licencia'), n=n, comunidad={'iban': 'ES65 0081 0098 7200 0155 8062'},
        presi=('MARIA INMACULADA PARRONDO ALVAREZ-INSUA', 'presidente', '699453692', '02509925G', 'parrondoima@gmail.com'), trae_pu=PU['paramio'])
    enlazar(OPP['scm'][1], ACC_SCM_D, 'Santa Cruz de Marcenado 1 (Edificio Princesa, CIF H79191615): UNA opp para las escaleras C, D y E, con una HE por escalera.')
    enlazar(OPP['scm'][1], ACC_SCM_E, 'Santa Cruz de Marcenado 1 (Edificio Princesa, CIF H79191615): UNA opp para las escaleras C, D y E, con una HE por escalera.')
    MANIA_SCM = 'scm'
else:
    rellenar('scmC', 'SANTA CRUZ DE MARCENADO 1 ESC C', 'santacruzdemarcenado1escC', {'fecha_apertura': '2025-02-11', 'referencia_catastral': '0158902VK4705G',
        'origen_notas': 'Fecha de llegada: 02/2025 (dia: la primera nota, 11/02/2025, en la carpeta santacruzdemarcenado1-2-4acuerdo34). Contacta: Juan Paramio (FAIN), luego la presidenta. '
                        'Paga: la CP. Tipo de obra: BAJADA DE PARADA DE ASCENSOR EXISTENTE Y MODIFICACION ESTRUCTURAL DE FOSO (HE firmada 13/03/2025). PEM 35.189,21. Visado TL/004258/2026. '
                        'Superficie 6,41. ' + SCM_TXT + ' La ficha no dice comercial interno; la lleva Daniel.'},
        ('anadir_parada', 'modificacion_asc', 'licencia'), n=sorted(nA + nC), comunidad={'iban': 'ES65 0081 0098 7200 0155 8062'},
        presi=('MARIA INMACULADA PARRONDO ALVAREZ-INSUA', 'presidente', '699453692', '02509925G', 'parrondoima@gmail.com'), trae_pu=PU['paramio'])
    for k, pre, carp, nn, pem, vis, sup in (('scmD', 'SANTA CRUZ DE MARCENADO 1 ESC D', 'santacruzdemarcenado1escD', nD, '2.693,08', 'TL/004259/2026', '7,15'),
                                            ('scmE', 'SANTA CRUZ DE MARCENADO 1 ESC E', 'santacruzdemarcenado1escE', nE, '2.693,08', 'TL/004260/2026', '6,99')):
        rellenar(k, pre, carp, {'fecha_apertura': '2025-03-26', 'referencia_catastral': '0158902VK4705G',
            'origen_notas': 'Fecha de llegada: 03/2025 (dia: el correo de la presidenta pidiendo presupuesto de las escaleras D y E, 26/03/2025). Contacta: Inma Parrondo, presidenta, '
                            'referida por Juan Paramio (FAIN). Paga: la CP. Tipo de obra: SUBIDA DE UNA PARADA DE ASCENSOR EXISTENTE Y MODIFICACION DE MAQUINARIA (HE firmada 22/04/2025). '
                            'PEM %s. Visado %s. Superficie %s. ' % (pem, vis, sup) + SCM_TXT + ' La ficha no dice comercial interno; la lleva Daniel.'},
            ('anadir_parada', 'modificacion_asc', 'licencia'), n=nn, trae_pu=PU['paramio'])
    MANIA_SCM = 'scmC'

# --- Santa Eduvigis 5 (misma parcela que la 7 en Catastro, pero otra comunidad, otro CIF y otro encargo: opp aparte)
rellenar('se5', 'SANTA EDUVIGIS 5', 'santaeduvigis5', {'fecha_apertura': '2023-04-27', 'referencia_catastral': '0805802VK5800F',
    'origen_notas': 'Fecha de llegada: la ficha dice 10/2023; las fotos de la visita de Elecnor son del 27/04/2023; se toma esa (la primera nota es del 11/07/2023). Contacta: Javier Velasco '
                    '(ELECNOR). Paga: la CDAD PROP. Tipo de obra: ASCENSOR + SUBVENCIONES (en ene-2025, "quieren ascensor + plataforma, igual que en Eduvigis 7"). Barrio: Casco Historico de '
                    'Barajas. Tecnico: Alejandro Bello. Fecha encargo en la ficha: 05/02/2025, pero la HE se recibio firmada el 05/02/2026 (la nota del 13/02/2025 dice que "no ha salido"). '
                    'Ano 1980. Administracion: MIGUEL ANGEL SACRISTAN (91 345 25 65; masacristan@telefonica.net). Presidente: German Angel Clavel Munoz (50287421Z). PEM 177.437,59 / 96.651,92. '
                    'Superficie 79,85. Proyecto enviado a la ECU (ACTECU) el 23/04/2026; en abr-2026 un vecino, Jose Luis, dice que el proyecto no es lo acordado y lo quiere como Santa '
                    'Eduvigis 7. Santa Eduvigis 5 y 7 comparten parcela en Catastro (0805802VK5800F), pero son comunidades distintas (CIF H70721980 y H70721956) con encargos distintos. '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'plataforma', 'subvenciones'), n=fijar('santaeduvigis5', 2023), comunidad={'iban': 'ES72 0081 0431 6700 0166 3072'}, trae_pu=PU['jvelasco'])

# --- Santa Eduvigis 7
n = fijar('santaeduvigis7', 2024, otros={6: ('2025-01-15', 'En la ficha "15-01-2024": es 2025 (errata; va tras la nota del 23-01-2025, que dice lo mismo: no pagan tasas hasta febrero de 2025).')})
n = partir(n, 13, '---------- Forwarded message', '2026-04-13')
n = partir(n, 17, 'El 26/06/2026', '2026-06-26')
rellenar('se7', 'SANTA EDUVIGIS 7', 'santaeduvigis7', {'fecha_apertura': '2023-11-07', 'referencia_catastral': '0805802VK5800F',
    'origen_notas': 'Fecha de llegada: la ficha dice 01/2024; las fotos remitidas por Elecnor son del 07/11/2023; se toma esa (los .dwg de 2022-2023 de la carpeta son de plantilla). '
                    'Contacta: Javier Velasco (ELECNOR); en obra, Andres Mulas (Elecnor; 689 778 586; amulas@elecnor.es); tachado en la ficha, Adrian Donaire. Paga: la CP. Tipo de obra: '
                    'ELEVADOR Y SUBVENCIONES: ascensor por ECU (licencia 350/2025/09068 registrada por la ECU en mar-2025, aprobada; visado TL/004779/2025) y rampa por el Ayuntamiento por '
                    'ocupar espacio publico (DR 350/2025/04520, 14/02/2025; visado TL/020139/2024; concedida 23/06/2026). En feb-2026 se propuso cambiar la rampa por plataforma elevadora; '
                    'la junta acordo mantener la rampa (13/04/2026). Barrio: Casco Historico de Barajas. Tecnico: Dario -> planos Carlos Alberto. Fecha encargo: 19/11/2024 (HE firmada). '
                    'Ano 1980. Administracion: MIGUEL ANGEL SACRISTAN (91 345 25 65; masacristan@telefonica.net). Presidente: Enrique Jesus Caballero Calderon (00786239F; 606 80 67 03; '
                    'ejccalderon@gmail.com). PEM 14.799,86. Superficie 40,84 m; longitud de alineacion 38,90 m (alineacion oficial registrada 16/12/2025). ECU sin nombrar: ACTECU. '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'rampa', 'subvenciones'), n=n, comunidad={'iban': 'ES04 0081 0431 6100 0167 1671'},
    presi=('Enrique Jesús Caballero Calderón', 'presidente', '606806703', '00786239F', 'ejccalderon@gmail.com'), trae_pu=PU['jvelasco'])

# --- Santa Eduvigis 9: en la app dos "presidentas": GEMA GARCIA NAVARRO (tachada en la ficha) y "GEMA GARCIA NAVARRO Rut 2b". La vigente es Ruth (2o B).
ce9 = cid_de('SANTA EDUVIGIS 9')
arreglar_pc(ce9, 'rol=eq.presidente&nombre=eq.' + quote('GEMA GARCIA NAVARRO Rut 2b'),
            {'nombre': 'RUTH (2º B)', 'telefono': '628510569', 'email': 'rut-martin-torres@hotmail.com',
             'notas': 'Presidenta actual (nota del 28-04-2026: "la presidenta actual es Ruth 2b"). En la ficha: "~~GEMA GARCIA NAVARRO~~ Rut 2b"; "rut-martin-torres@hotmail.com '
                      '(presidenta de la comunidad)"; "Ruth - 628510569".'})
arreglar_pc(ce9, 'rol=eq.presidente&nombre=eq.' + quote('GEMA GARCIA NAVARRO'), {'rol': 'otro', 'notas': 'Presidenta ANTERIOR (tachada en la ficha; la actual es Ruth, 2o B).'})
pc_unico(ce9, 'JESÚS ANGULO', 'vecino', None, None, 'janguloalo@gmail.com', 'Vecino; en copia con la presidenta (ficha y nota del 12/05/2026).')
rellenar('se9', 'SANTA EDUVIGIS 9', 'santaeduvigis9', {'fecha_apertura': '2025-04-01', 'referencia_catastral': '0805101VK5800F',
    'origen_notas': 'Fecha de llegada: 04/2025 (dia: el correo de Miguel Angel Sacristan pidiendo presupuesto, 01/04/2025; los .dwg de 2023 de la carpeta son de plantilla). Contacta: Javier '
                    'Velasco (ELECNOR; 680 967 159; fjvelasco@elecnor.com) y el administrador de entonces, Miguel Angel Sacristan (tachado en la ficha). Paga: la CP. Tipo de obra: ASC + SUBV '
                    '(derribo de la escalera, escalera nueva, ascensor de embarque simple de 5 personas, contadores reubicados, portal a cota y rampa exterior en la zona ajardinada; obra '
                    'de unos 220.000 IVA incluido). Ascensor por ECU (ACTECU, sin nombrar) y rampa por el Ayuntamiento (ocupa via publica). Barrio: Casco Historico de Barajas. Tecnico: '
                    'Leandro (LVC). HE recibida firmada 16/10/2025 (en la ficha, fecha encargo 13/11/2025). Ano 1977. Administracion: FINCAS MARTOS (Juan Martos Garcia; Alagon 5, local dcho., '
                    '28042 Barajas; 913 290 730; fincasmartos@gmail.com); antes, tachado, Miguel Angel Sacristan. Presidenta: Ruth (2o B; 628 510 569; rut-martin-torres@hotmail.com); antes, '
                    'tachada, Gema Garcia Navarro. Vicepresidente: Giovanni. Vecino: Jesus Angulo (janguloalo@gmail.com). Comunidad muy dividida ("alto grado de conflictividad"). '
                    '"Ojooo no hemos cobrado nada porque se ha indicado cobrar a la concesion de la DR" (28-04-2026). Rampa: PEM 19.760,98, superficie 28,88 m2, alineacion 30,32 ml; parcela '
                    '953 m2. En la copia en conflicto de la ficha (16-12-2025): PEM elevador 124.777,14 (PC 148.484,80) y PEM rampa 19.760,98 (PC 23.515,57); los dos PC suman 172.000,37, '
                    'el presupuesto de Elecnor. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'rampa', 'subvenciones'), n=fijar(EDU9, 2025), comunidad={'iban': 'ES64 2085 8021 5303 3030 7150'}, trae_pu=PU['jvelasco'])

# --- Santa Tecla 46: dos presidentas iguales en la app ("Natividad Garcia Lozano 2o E" y "NATIVIDAD GARCIA LOZANO"). Se arregla la primera; la otra queda (duda: borrarla).
ct46 = cid_de('SANTA TECLA 46')
arreglar_pc(ct46, 'rol=eq.presidente&nombre=eq.' + quote('Natividad García Lozano 2º E'),
            {'nombre': 'NATIVIDAD GARCIA LOZANO', 'telefono': '615411235', 'email': 'natigl1944@gmail.com', 'notas': '2o E. Whatsapp o llamadas (ficha).'})
rellenar('st46', 'SANTA TECLA 46', 'santatecla46', {'fecha_apertura': '2022-03-24', 'referencia_catastral': '8273303VK4787C',
    'origen_notas': 'Fecha de llegada: la ficha dice 05/2022; el primer fichero de trabajo (la descarga de Catastro del edificio) es del 24/03/2022; se toma esa (la primera nota es del '
                    '17/05/2022). Empresa/cliente: FAIN: lo trajo Juan Paramio y despues Raul Garcia Lopez (los dos tachados); ahora lo lleva Miguel Angel Gomez, por zona (ex Aszende; '
                    '654 04 27 42; miguelangel.gomez@fainascensores.com). Tipo de obra: ASCENSOR (FAIN) + SUBV (CP): derribo de escalera sin tocar paredes, ascensor de 6 personas. Barrio: '
                    'Canillejas. Tecnico: Fernan -> requerimientos Carla. Jefes de obra: Abel Bernardos y Arturo Garcia. Administracion: PREVENIDO CONTRA LA MOROSIDAD SL (Luis Retamar de '
                    'Blas; Erica, secretaria; Av. de Madrid 4, oficina 6, Arganda del Rey, 918 729 739; C/ Boltana 72, local, Madrid, 913 923 130 / 914 039 191; 627 413 285; '
                    'infoprevenidomadrid@gmail.com); pedidos docs a la CP 18/10/22. "Ojo, el administrador no quiere ocuparse de recopilar ninguna documentacion de las que hacen falta para '
                    'tramitar las subvenciones. Puentearle, y hacerlo a traves de la presidenta." Presidenta: Natividad Garcia Lozano (2o E; 00230177Q; 615 411 235; natigl1944@gmail.com). '
                    'Tecnico IEE: Cristina Marcelo Mora. PEM 115.293,83. Visado TL/003228/2025. DR por ECU (ACTECU, sin nombrar); tachados, los expedientes del Ayto 350/2023/25602 (DR) y '
                    '350/2023/11345 (licencia). Superficie 83,24. FAIN paga las tasas nuevas de la ECU con codigo de pedido (oct-2024). En jul-2026 no se puede dar el CFO: falta el '
                    'suministro trifasico (Iberdrola). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=fijar('santatecla46', 2022), comunidad={'iban': 'ES93 0081 0370 7700 0187 4289'}, trae_pu=PU['magomez_fain'])

# --- Santa Virgilia 20: en la app la presidenta es CELESTE LOPES SEVILLA (tachada en la ficha: "Antiguo presidente"). El nuevo, desde sep-2024: Luis Cardenas Vigil.
cv20 = cid_de('SANTA VIRGILIA 20')
arreglar_pc(cv20, 'rol=eq.presidente&nombre=eq.' + quote('CELESTE LOPES SEVILLA 4º A'),
            {'nombre': 'CELESTE LOPES SEVILLA', 'rol': 'otro', 'notas': 'Presidenta ANTERIOR (tachada en la ficha: "Antiguo presidente"). 4o A; 685 461 968; clopesse@gruposantander.com.'})
presi_nuevo(cv20, 'LUIS CÁRDENAS VIGIL', '629636870', None, 'luiscardenasvigil@gmail.com', 'Presidente desde sep-2024 (ficha: "NUEVO: Desde sep. 2024"); pedidos docs al nuevo presidente 05/05.')
rellenar('sv20', 'SANTA VIRGILIA 20', 'santavirgilia20', {'fecha_apertura': '2023-01-09', 'referencia_catastral': '5610011VK4851A',
    'origen_notas': 'Fecha de llegada: 01/2023 (dia: el escaneo FARO, 09/01/2023). Empresa/cliente: FAIN (Vicente Real). Tipo de obra: ASCENSOR + SUBV (ascensor por patio; la ECU dijo en '
                    'dic-2023 que donde va el ascensor es espacio publico: se tramita por el Ayuntamiento como ocupacion de via publica). Barrio: Pinar del Rey. Tecnico: Jonatan -> '
                    'requerimientos Karla -> Alejandro. Ano 1970. Administracion: MEDITERRANEO ADMINISTRACION DE FINCAS (Desiree Caballero Subirat, administrativa; C/ Lopez de Hoyos 395, '
                    '28043; 91 381 52 82, de lunes a viernes de 9 a 2; dcaballero@msgi.es); antes, tachada, ANTONAYA (Rosario Platas Fernandez). En el bloque de la administracion: "La cuenta '
                    'para el cargo es ES64-0081-0364-84-0001648467". Presidente: Luis Cardenas Vigil (desde sep-2024; 629 63 68 70; luiscardenasvigil@gmail.com); antes, tachada, Celeste '
                    'Lopes Sevilla. Junta de Hortaleza: Servicio de Medio Ambiente y Escena Urbana (915 887 614; tecnihortaleza@madrid.es). PEM 235.117,65. Visado TL/020953/2023. '
                    'Expediente 350/2024/00721; licencia concedida 26/05/2026. NZ 3.1.a. Superficie 164,31. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=fijar('santavirgilia20', 2023), subvencion=trocear2(subv('santavirgilia20'), 2025), trae_pu=PU['vreal'])

# --- Santa Virgilia 24
cv24 = cid_de('SANTA VIRGILIA 24')
pc_unico(cv24, 'SUSANA DE DIOS', 'vicepresidente', '690657964', None, 'sastreriapicazo361@gmail.com',
         'Vicepresidenta: "LLAMAR A VICEPRESIDENTA QUE ES QUIEN LO LLEVA (aunque siempre firma el presidente)"; "Poner en copia de todo a susana de dios" (ficha).')
rellenar('sv24', 'SANTA VIRGILIA 24', 'santavirgilia24', {'fecha_apertura': '2023-05-03', 'referencia_catastral': '5610013VK4851A',
    'origen_notas': 'Fecha de llegada: 05/2023 (dia: el escaneo FARO, 03/05/2023; el impreso de licencia de feb-2022 de la carpeta es de plantilla). Empresa/cliente: FAIN (Vicente Real); '
                    '"cobrar a Fain proyecto, ofrecer subvenciones a comunidad" (12-01-2024). Tipo de obra: ASCENSOR + SUBV (ocupa suelo publico y amplia las cocinas). Tecnico: Jonatan -> '
                    'Israel. Fecha encargo: enero 2024; renovacion de subvenciones contratada el 28/03/2025. Administracion: AGA ANTONAYA (Maria Jose Garcia Martinez; C/ Pegaso 32, local; '
                    '917 593 909; mariajose@antonaya.com; para facturacion, facturas@antonaya.com; en ese bloque, "No CUENTA: ES27 0081 0364 8300 0192 6796"). Presidente: Antonio Lopez '
                    'Barbado (00551951C). Vicepresidenta: Susana de Dios (690 65 79 64; sastreriapicazo361@gmail.com), "que es quien lo lleva (aunque siempre firma el presidente)". En la '
                    'casilla de telefono del contacto, 669 678 749; en copia, Santiago Rojas Escudero (santiagorojasescudero@gmail.com). Visado TL/002254/2024. Expediente 350/2024/04868; '
                    'licencia aprobada 05/03/2026. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=fijar('santavirgilia24', 2023), trae_pu=PU['vreal'])

# ================================================================= 2. CLON
n_sus = _notas_de('santasusana41', 2026)
SUS = J([('2026-08-24', n_sus[0][1] + '\n' + n_sus[1][1])] + n_sus[2:])   # el "30/10/2026" es el plazo dentro del correo, no una nota
REVS = [
    ('sanfidel97-99', '2024-06-12', 'MARCO (CONSTRUCTOR)', None, None,
     'SAN FIDEL 97-99 MADRID. Fecha: 05/2024 en la ficha; la primera nota es del 12/06/2024 ("hacer 3D"); se toma esa (los ficheros empiezan el 14/06/2024). Paga: la CDAD PROP. '
     'Tipo de obra: ASCENSOR + PLATAFORMA + SUBVENCIONES. Distrito Ciudad Lineal. CP 28017. Contacto: Marco, el constructor (624 474 538; mg7213393@gmail.com). Administracion: '
     '"Carlos" (6571395572, asi en la ficha; adcomunidadcl@gmail.com); "Mari Carmen" en la nota de oct-2024; en jun-2025 "cambian el adm, ahora es Carlos". Presidente: Elias '
     '(607 936 126). Exposicion del 3D y HE de proyecto y subvenciones enviada el 25/10/2024. La ficha no dice comercial interno.\n\n' + crudo('sanfidel97-99', 2024)),
    ('sangenjo6', '2024-12-12', 'ANA ENCINAS (ELECNOR)', None, None,
     'SANGENJO 6 MADRID. Fecha: 12/2024 (dia: el correo de Elecnor, 12/12/2024; las fotos remitidas por Elecnor son del 28/11/2024). Tipo de obra: SUSTITUCION DE 2 ASCENSORES + OTROS '
     'TRABAJOS (proyecto, DF, CSS y subvenciones): dos ascensores de 15 paradas, demolicion de pilastras en los fosos y aperturas de losa en el cuarto de maquinas. Distrito '
     'Fuencarral-El Pardo (barrio del Pilar). CP 28034. HE de proyecto y subvenciones enviada 18/12/2024 (PEM previsto 130.000). La ficha no dice comercial interno.\n\n'
     + crudo('sangenjo6', 2024)),
    ('sanjaime2', '2021-11-05', 'ELECNOR (ANA ENCINAS, DANIEL NAVARRO, RAUL CEREZO, IBAI CALONGE)', None, None,
     'PLAZA SAN JAIME 2 MADRID (carpeta sanjaime2; la carpeta plazasanjaime2 esta vacia). Fecha: 11/2021 (dia: la oferta de ascensor de Otis con financiacion, 05/11/2021). Empresa/'
     'cliente: ELECNOR. Contacto: Ana Encinas, Daniel Navarro, Raul Cerezo, Ibai Calonge. Tipo de obra: ESTUDIO ASCENSOR OTIS ("oferta de ascensor que viene de Javier Bernad de Otis"). '
     'Distrito Puente de Vallecas. CP 28031. Gestion de residuos 300. La ficha no dice comercial interno.'),
    ('sanmarcelo26', '2023-10-06', 'ROBERTO (MATEDECON)', None, None,
     'SAN MARCELO 26 MADRID. Fecha: 10/2023 (dia: la nota, 06/10/2023: "ENVIADO PRESUPUESTO"). Tipo de obra: SATE Y NEXT GEN. Distrito 15 - Ciudad Lineal (Ventas). CP 28017. '
     'La carpeta solo tiene la ficha. La ficha no dice comercial interno.\n\n' + crudo('sanmarcelo26', 2023)),
    ('sanmariano82', '2025-11-12', 'EFFIC', None, None,
     'SAN MARIANO 82 MADRID. Fecha: 11/2025 (dia: la nota, 12/11/2025: "Crear carpeta"). Empresa/cliente: EFFIC (agente rehabilitador). Tipo de obra: ASCENSOR + ELEVADOR PORTAL. '
     'Hay modelo 3D (13/11/2025), aunque la nota dice "No hacer 3D". En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS + '\n\n' + crudo('sanmariano82', 2025)),
    ('sanonofre7', '2023-03-30', 'JAVIER PARRA + DANIEL DIAZ (SCHINDLER)', None, None,
     'SAN ONOFRE 7 MADRID. Fecha: 03/2023 (dia: la nota "30/03 ENVIAN PROYECTO Y LICENCIA"). Empresa/cliente: SCHINDLER. Contacto: Javier Parra + Daniel Diaz. Tipo de obra: ASCENSOR. '
     'Distrito Centro. CP 28004. En la carpeta solo hay ficheros de 2016 (otro encargo, ver "sanonofre7 (2016)"). La ficha no dice comercial interno.\n\n' + crudo('sanonofre7', 2023)),
    ('sanonofre7 (2016)', '2016-05-09', 'ROBERTO PEREZ GIL (hermano de Jeronimo)', None, None,
     'SAN ONOFRE 7 MADRID (ficha antigua de 2016: "antiguo FICHA DE DATOS ACCESALIA.docx", que dice "SAN OFRE 7"). Fecha: 09/05/2016 (la de la ficha). Agente comercial: Roberto '
     'Perez Gil, hermano de Jeronimo (636 958 389 / 699 174 478; rehabilitacionesunimarsa@gmail.com). Hay fotos de la finca y una oferta de FAIN (competencia), may-2016. '
     'Otro encargo del mismo edificio, de 2023: "sanonofre7".', R('sanonofre7')),
    ('sanpoldemar1', '2023-01-02', 'JOSE GORDILLO', None, None,
     'SAN POL DE MAR 1 MADRID (carpeta COLADA dentro de sanpoldemar7). Fecha: 01/2023 (dia: la nota, 02/01/2023). Tipo de obra: SATE + CALDERA COMUNITARIA IBERDROLA ("SATE y caldera '
     'comunitaria o SATE": tienen una caldera comunitaria compartida con San Pol de Mar 3 y quieren independizarse y ponerla en el local de Iberdrola, ahora vacio). Distrito '
     'Moncloa-Aravaca. CP 28008. Contacto: Jose Gordillo (las mismas fechas que Santa Coloma 8 y Santa Fe 2). La ficha no dice comercial interno.\n\n' + crudo(POL1, 2023),
     B.join(['MADRID', 'sanpoldemar7', 'sanpoldemar1'])),
    ('santaadela15-17-19', '2025-01-29', 'CECILIA DIAZ DE VILLEGAS (ANTONAYA)', None, None,
     'SANTA ADELA 15-17-19 MADRID. Fecha: 01/2025 (dia: la primera nota, 29/01/2025). Tipo de obra: SATE CON SUBVENCION Y CESION DE CAES (presupuesto y estudio de costes enviados '
     'por Monica). Distrito Hortaleza. CP 28033. Administracion: ANTONAYA (Cecilia; Calle de Pegaso 32, local, 28043; 91 759 39 09; cecilia@antonaya.com). El 24/03/2025 los '
     'vecinos deciden esperar a septiembre; la administradora "estaba enfadada con lo que paso en Pablo Serrano 9 de Madrid con la CSS que empezaron sin avisar (ROEN)". La ficha '
     'no dice comercial interno.\n\n' + crudo('santaadela15-17-19', 2025)),
    ('santaaurea36', '2024-10-24', 'GRUPO TREBOL', None, None,
     'SANTA AUREA 36 MADRID. Fecha: 10/2024 (dia: la nota, 24/10/2024). Tipo de obra: ASCENSOR. Distrito Latina. CP 28011. Contacto para la visita: Teresa (639 162 579), que no es la '
     'presidenta. La carpeta solo tiene la ficha. La ficha no dice comercial interno.\n\n' + crudo('santaaurea36', 2024)),
    ('santacatalinadonados3', '2025-11-26', 'ISAAC PIZARROSO (GESTIN)', None, None,
     'PLAZA SANTA CATALINA DE LOS DONADOS 3 MADRID. Fecha: 11/2025 (dia: el correo de Isaac Pizarroso, 26/11/2025). Tipo de obra: PROYECTO Y DF DE REHABILITACION DEL PATIO POSTERIOR '
     '(muros y elementos estructurales en mal estado). Administracion: GESTIN S.A.P (Isaac Pizarroso Arnao; C/ Alberto Aguilera 7, 1o izda., 28015; 914 471 009; '
     'isaacpizarroso@gestin.es). Presidente: Michael (5o interior izquierda B; 637 389 319). La comunidad no esta en produccion. Comercial interno: DANIEL.\n\n'
     + crudo('santacatalinadonados3', 2025)),
    ('santacoloma8', '2023-01-02', 'JOSE GORDILLO', None, None,
     'SANTA COLOMA 8 MADRID. Fecha: 01/2023 (dia: la nota, 02/01/2023). Tipo de obra: SATE + FV ("ojo mirar ano de construccion para estos 8 portales"). Distrito Moncloa-Aravaca. '
     'CP 28008. La ficha no dice comercial interno.\n\n' + crudo('santacoloma8', 2023)),
    ('santafe2', '2023-01-02', 'JOSE GORDILLO', None, None,
     'SANTA FE 2 MADRID. Fecha: 01/2023 (dia: la nota, 02/01/2023; fotos del 03/01/2023). Tipo de obra: SATE + CALDERA COMUNITARIA IBERDROLA. Distrito Moncloa-Aravaca. CP 28008. '
     'Contacto: Jose Gordillo (699 93 17 01; bernajgl@yahoo.es). La ficha no dice comercial interno.\n\n' + crudo('santafe2', 2023)),
    ('santamaria30', '2022-11-04', 'IVAN CAMACHO (IVAN ERCO)', None, None,
     'SANTA MARIA 30 MADRID. Fecha: 11/2022 (dia: la nota y el presupuesto de Orona "NO FIRMADO", 04/11/2022). Empresa/cliente: IVAN ERCO (Ivan Camacho). Tipo de obra: ASCENSOR. '
     'Distrito Centro. CP 28014. Hay escaneo FARO (16/11/2022). La ficha no dice comercial interno.\n\n' + crudo('santamaria30', 2022)),
    ('santapolonia8', '2024-01-02', 'MARIA JOSE (ATIKO)', None, None,
     'SANTA POLONIA 8 MADRID. Fecha: 01/2024 (dia: la nota, 02/01/2024: "ojo comisiones para maria jose"). Tipo de obra: ASCENSOR. Distrito Centro. CP 28014. Administracion: ATIKO '
     '(Maria Jose). La carpeta solo tiene la ficha. La ficha no dice comercial interno.\n\n' + crudo('santapolonia8', 2024)),
    ('santasusana41', '2026-07-01', 'BELEN LOPEZ (DIDEPRO)', None, None,
     'SANTA SUSANA 41 MADRID. Fecha: 07/2026 (dia desconocido; el correo de Didepro es del 24/08/2026 y la ficha del 25/09/2026). Empresa/cliente: DIDEPRO (Belen Lopez; 625 837 685; '
     'blopez@didepro.es). Tipo de obra: SATE, FACHADA + CUBIERTA (proyecto de rehabilitacion de la envolvente con IEE, CEx y LEEx para las ayudas, DF y CSS y gestion de ayudas; '
     'obra estimada de mas de 1.000.000 EUR, SATE de unos 2.300-2.500 m2 y cubierta de unos 400 m2; plazo 30/10/2026). HE enviada 28/08/2026; rehecha tras la reunion de Daniel '
     'con Ricardo (25/09/2026). La comunidad no esta en produccion. Comercial interno: DANIEL.\n\n' + SUS),
    ('santatecla44 - 48', '2023-07-05', 'AGUSTIN (vecino de Santa Tecla 46; pide comision)', None, None,
     'SANTA TECLA 44 Y 48 MADRID + DISCOBOLO 63 + 67. Fecha: 10/2023 en la ficha; la primera nota es del 05/07/2023; se toma esa. Paga: la CDAD. Tipo de obra: ASCENSORES. Distrito '
     '20 - San Blas-Canillejas (Canillejas). CP 28022. Administracion: Prevenido Contra la Morosidad, S.L. (Luis Retamar de Blas; Erica, secretaria; Calle Boltana 72, local; '
     '918 72 97 39; infoprevenidomadrid@gmail.com). Agustin (625 395 100), vecino de Santa Tecla 46, lo mueve y quiere comision; "mandar el mismo presupuesto que Discobolo" '
     '(15/02/2024). Santa Tecla 44 y 48 comparten parcela con Santa Tecla 46 (8273303VK4787C), que esta en produccion por otro encargo (el ascensor de 2022); Discobolo 63 y 63-67 '
     'ya estan en la clon y Discobolo 67 (2026) en produccion. La carpeta solo tiene la ficha. La ficha no dice comercial interno.\n\n' + crudo('santatecla44 - 48', 2023))]
for carp, fecha, trajo, cif, ref, t, *ruta in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, comercial='Alvaro' if carp == 'sanmariano82' else 'Daniel', ruta=ruta[0] if ruta else None)

for carp, fecha, trajo, t, *ruta in [
        ('sanisidrolabrador8', '2016-05-05', 'PEDRO ARANDA', 'SAN ISIDRO LABRADOR 8 MADRID. Fecha: 05/05/2016 (la de la ficha). Ficha vacia; hay croquis y presupuesto (jun-2016).'),
        ('sanjuandelamata42', '2016-09-28', 'PEDRO ARANDA', 'SAN JUAN DE LA MATA 42 MADRID. Fecha: 28/09/2016 (la de la ficha). Ficha vacia; hay croquis (que se llama "San juan de la '
         'mata 49") y presupuesto (sep-oct 2016).'),
        ('sanmodesto16', '2017-01-03', 'FELIPE (ENOR)', 'SAN MODESTO 16 MADRID. Fecha: 03/01/2017 (el video de la visita; la ficha no trae fecha). Ficha vacia salvo unas medidas: '
         '"BAJA + 4. ZONA COMUN DE 2,10 ancho x 5,20 de fondo. Tendriamos 9 paradas a doble embarque 180".'),
        ('sanpoldemar13', '2017-07-04', 'LUIS MIGUEL NUNES (THYSSEN)', 'SAN POL DE MAR 13 MADRID. Fecha: 04/07/2017 (la de la ficha). Ficha vacia; hay presupuesto (jul-2017).'),
        ('sanpoldemar7', '2017-05-10', 'LUIS MIGUEL NUNES (THYSSEN)', 'SAN POL DE MAR 7 MADRID. Fecha: 10/05/2017 (la de la ficha). Ficha vacia salvo el correo de Luis Miguel Nunes '
         '(Thyssen): "visita la finca... la caldera esta por debajo de la cota de portal... La idea es plantear tu solucion por tener ellos un arbol proximo que habria que mover al hacer '
         'una parada en planta convencional". Hay fotos. Dentro esta colada la carpeta sanpoldemar1 (2023, otra fila).'),
        ('sanroberto12', '2017-01-20', 'PEDRO (THYSSEN)', 'C/ SAN ROBERTO 12 MADRID. Fecha: 20/01/2017 (la de la ficha). Ficha vacia; hay croquis y planos (ene-2017).'),
        ('santaeduvigis27', '2017-03-01', 'JUAN CARLOS (THYSSEN)', 'SANTA EDUVIGIS 27 MADRID. Fecha: 01/03/2017 (la de la ficha). Ficha vacia; hay croquis y planos (mar-2017). '
         'Dentro esta colada la carpeta santaeduvigis29 (otra fila).'),
        ('santaeduvigis29', '2017-03-01', 'JUAN CARLOS (THYSSEN)', 'SANTA EDUVIGIS 29 MADRID (carpeta COLADA dentro de santaeduvigis27). Fecha: 01/03/2017 (la de la ficha). Ficha vacia.',
         B.join(['MADRID', 'santaeduvigis27', 'santaeduvigis29'])),
        ('santafe14', '2016-09-30', 'LUIS MIGUEL NUNES (THYSSEN)', 'SANTA FE 14 MADRID. Fecha: 30/09/2016 (la de la ficha). Ficha vacia; hay croquis (oct-2016).'),
        ('santafe3', '2017-01-31', 'LUIS MIGUEL NUNES (THYSSEN)', 'SANTA FE 3 MADRID. Fecha: 31/01/2017 (la de la ficha). Ficha vacia; hay croquis y fotos (ene-2017).'),
        ('santafe7', '2016-10-02', 'LUIS MIGUEL NUNES (THYSSEN)', 'CALLE SANTA FE 7 MADRID. Fecha: 02/10/2016 (el croquis; la ficha no trae fecha). Ficha vacia; hay borrador de '
         'escalera y presupuesto (oct-2016).'),
        ('santatecla56', '2015-01-19', 'PEDRO ARANDA (ENOR)', 'CALLE SANTA TECLA 56 MADRID. Fecha: 19/01/2015 (la de la ficha). Ficha vacia salvo: "NO CAMBIAMOS CONTADORES DE LUZ. '
         'B+3 pero un piso mas sin ascensor para llegar a cubierta". Hay fotos (ene-2015).'),
        ('sangenjo19-21-23', '2021-08-06', None, 'SANGENJO 19-21-23 MADRID. Carpeta SIN ficha de datos: presupuesto, memoria valorada y mediciones (06/08/2021) y el CIF (sep-2021).'),
        ('sanluis7', '2021-10-15', None, 'SAN LUIS 7 MADRID. Carpeta SIN ficha de datos: documentacion de proyecto para la SUBVENCION AYTO MADRID de 2021 y un presupuesto de SATE '
         '(15/10/2021).'),
        ('sanquintin10', '2014-10-24', None, 'SAN QUINTIN 10 MADRID. Carpeta SIN ficha de datos: proyecto de 2014 (croquis, datos, proteccion estructural, comision de Patrimonio; '
         'visado TL-018090-2014) y obra (licencia, certificado final de obra de dic-2015, valoracion final y libro de actas, mar-2016). Hay tambien fotos de obra de may-2024 '
         '(subcarpeta "julio").')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t, ruta=ruta[0] if ruta else None)

# ================================================================= 3. MANIAS
mania('Si el ascensor ocupa espacio publico (aunque en Catastro figure como de la comunidad), no lo tramita la ECU: va por el Ayuntamiento, como ocupacion de via publica.',
      'ECU (ACTECU)', '2023-12-28', 'santavirgilia20', clave='sv20', trozo='espacio público')
mania('COAM: si la propiedad encargo antes el proyecto a otro arquitecto y no consta su renuncia, para visar hay que pedirle la venia.', 'COAM', '2026-03-25',
      'santacruzdemarcenado1escC', clave=MANIA_SCM, trozo='no consta la renuncia')
mania('Comision de Patrimonio (CPPHAN): en agosto es inhabil, y entre el registro y el paso por la comision van unos dos meses.', 'Comision de Patrimonio (CPPHAN), segun EICI',
      '2025-09-10', 'santacruzdemarcenado1escC', clave=MANIA_SCM, trozo='En agosto')
resumen()
