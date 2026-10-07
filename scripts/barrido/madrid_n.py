# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda N (narcisoserra22 .. nuria74, 32 carpetas [0:32]: toda la N). 7-oct-2026. Sin --escribir: marcha en seco.
# Las M1, M2 y M3 las preparan otros agentes a la vez.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de

CERCEDA = '6ed8b066-f92b-43a2-a26c-590af21776e5'   # contrata CERCEDA CONSTRUCCIONES (sin nadie dentro)
PU.update(paz='46e3614d-97fd-40bf-baac-07d9bd5e601f', isaac='e5abf29a-a25f-4c87-8705-6dc523285e1f', silvia_py='ca6faa84-d296-4007-8125-4395e592b142',
          cerezo='7f4218f5-8b8e-45a0-9cba-b2880ccfc4c3', oscar_cega='86273a6d-d0f1-4e29-874e-4aba61764673')
# NECTAR 31: la comunidad "NECTAR 31 PORTAL 1 - 2 - 3 MADRID" tiene DOS opps vacias con los mismos 3 accesos (31(C), 31(D), 31(E)).
# Se rellena la primera; la segunda (NECTAR 31 PORTAL 1,2 Y 3) se deja SIN tocar: duda para Monica (borrarla).
# Ademas hay 3 opps vacias, una por portal (NECTAR 31 PORTAL 1 / 2 / PORTAL3), en comunidades sin municipio: tampoco se tocan (duda).
NEC31 = '204aa181-794a-421d-acf3-fb1c8edf6fd9'
NEC31_DUPLICADA = '4b9f4666-b567-44be-8aad-5bf012a9d5cc'
NEC31_PORTALES = ('863cac65-cb11-4a8a-b485-7d5cf0b5eaf6', '84f6d201-247c-4f09-b9f1-a76fe392b5b5', '3fc67242-0789-4d7f-92f9-f5d593a93c96')


def cid_de(prefijo):
    cs = b.leer('comunidades?select=id&municipio=eq.MADRID&nombre=like.' + quote(prefijo) + '*'); assert len(cs) == 1, prefijo
    return cs[0]['id']


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto (presidente con el telefono pegado, tachado dentro del nombre...)."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


def pc_unico(cid, nombre, rol, tel=None, doc=None, email=None, notas_=None):
    """pc() para roles que no son presidente, sin repetirla si el script se relanza."""
    ya = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&nombre=eq.%s' % (cid, quote(nombre)))
    return ya[0]['id'] if ya else pc(cid, nombre, rol, tel, doc, email, notas_)


def presi_id(cid):
    d = b.leer('personas_comunidad?select=id&rol=eq.presidente&comunidad_id=eq.' + cid); assert len(d) == 1, cid
    return d[0]['id']


def trae(pcid):
    return {'quien_persona_comunidad_id': pcid, 'persona_comunidad_id': pcid}


def admin_nueva(nombre, notas_):
    """administracion de fincas que lleva una comunidad de PRODUCCION y no esta en la agenda (como ADMONPATRIMONIOS, madrid_g1)."""
    ya = b.leer('empresa?select=id&nombre_accesalia=eq.' + quote(nombre))
    if ya: return ya[0]['id']
    i = nuevo_id()
    ins('empresa', [{'id': i, 'nombre_accesalia': nombre, 'tipo': 'administracion_fincas', 'activa': True, 'comercial_id': DANIEL, 'notas': notas_}])
    return i


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
cl = lambda c, a, s=None: J(fijar(c, a, s))


def partir_sin_fecha(c, anio, marca, fecha2, fecha1, motivo1):
    """la nota 0 viene sin fecha y lleva pegada otra con fecha: se parte y el motivo va solo en la primera mitad."""
    n = partir(_notas_de(c, anio), 0, marca, fecha2)
    n[0] = (fecha1, n[0][1] + '\n\n(' + motivo1 + ')')
    assert all(f for f, t in n), c
    return n

# ================================================================= 0. AGENDA
# Tres administraciones nuevas que llevan comunidades de PRODUCCION (Narciso Serra 22, Navas del Rey 51, Nuria 74) y una persona en una contrata que ya existe.
INMHO_VK = admin_nueva('INMHO Gestion de la Propiedad (VALLECAS)',
                       'Alta en el barrido de Madrid: en la ficha "INMHO VALLECAS ADMINISTRADOR" (Narciso Serra 22, dic-2025; carpeta narcisoserra22). '
                       'En la agenda ya estaban las oficinas de MOSTOLES y GETAFE.')
GONZALO = persona_nueva('Gonzalo', 'Guinea', 'administrador', '617586747', None, empresa=INMHO_VK,
                        notas_='INMHO Vallecas: contacta y administra Narciso Serra 22 (dic-2025; carpeta narcisoserra22).')
GCI2 = admin_nueva('GCI2 GESTION DE COMUNIDADES',
                   'Alta en el barrido de Madrid: administracion de Navas del Rey 51 (en la ficha "GCI2 GESTIÓN DE COMUNIDADES"; firma "GCI2 S.L. | WWW.GCI2.ES", correo del 11/07/2025; '
                   'carpeta navasdelrey51). En la ficha, tachados: ~~c/ Laurel, 1 -1º B- 28005 Madrid~~, ~~FÉLIX ÁNGEL GÓMEZ HIDALGO~~, ~~91 4749853~~, ~~gomezhidalgo@icam.es~~.')
FERNANDO_GCI2 = persona_nueva('Fernando', 'Castañeda Arias', 'administrador', '655328469', 'info@gci2.es', empresa=GCI2,
                              notas_='GCI2: administrador de Navas del Rey 51 (2025; carpeta navasdelrey51).')
COLONDRON = admin_nueva('DIEGO COLONDRON ESTEBAN',
                        'Alta en el barrido de Madrid: administrador de Nuria 74 (ficha de jun-2025; carpeta nuria74). Telefonos 609 236 839 y 913 784 266. En la ficha, la direccion tachada: '
                        '~~Av. del Ventisquero de la Condesa, 13, Local 23, Fuencarral-El Pardo, 28035 Madrid~~.')
DIEGO_C = persona_nueva('Diego', 'Colondron Esteban', 'administrador', '609236839', None, empresa=COLONDRON,
                        notas_='Administrador de Nuria 74 (sep-2025; carpeta nuria74). Otro telefono en la ficha: 913 784 266.')
JALBERTO = persona_nueva('Juan Alberto', 'Martín', 'comercial', '620546691', 'comercial@construccionescerceda.com', contrata=CERCEDA,
                         notas_='Cerceda Construcciones (en la ficha "JAM CONSTRUCCIONES CERDEDILLA SL"; se presenta como "JAM Construcciones Cerceda"): trae Navas del Rey 51 (jun-2023). '
                                'Otros contactos de la contrata en la ficha: Antonio Arias Perez (antonio5373@hotmail.com) y maferju08@hotmail.com, 630 097 986.')
# Junta de Retiro: escribe el Departamento de Servicios Tecnicos por la DR de Narvaez 33 (may-2026).
RETIRO = junta(3, 'Retiro')
area(RETIRO, 'Departamento de Servicios Técnicos', None, 'dtcoretiro@madrid.es ("JMD Retiro - Departamento de Servicios Tecnicos"; correo del 20/05/2026 sobre la DR de Narvaez 33, expediente 350/2023/14601).')

# ================================================================= 1. PRODUCCION (16 carpetas, 16 oportunidades)
rellenar('ns22', 'NARCISO SERRA 22', 'narcisoserra22', {'fecha_apertura': '2025-12-11',
    'origen_notas': 'Fecha de llegada: 12/2025 (dia: la primera nota y el 3D, 11/12/2025). Contacta: Gonzalo Guinea (INMHO VALLECAS, la administracion; 617 586 747; administracion dada de alta en el '
                    'barrido). Tipo de obra: ELEVADOR PORTAL. Hay 3D. En la ficha: comercial interno "DANIEL O CARLOS"; la lleva Daniel.'},
    ('accesibilidad_portal', 'plataforma'), n=fijar('narcisoserra22', 2025), adm=GONZALO, trae_pu=GONZALO)

n = fijar('narvaez33', 2023, otros={0: ('2023-05-11', 'Sin fecha; las tasas e ICIO de la DR: la tramitacion de la DR es de may-2023 (ficheros del 05 al 11/05/2023).')})
n = partir(n, 3, 'de:', '2026-08-03')
rellenar('nv33', 'NARVAEZ 33', 'narvaez33', {'fecha_apertura': '2023-03-17', 'referencia_catastral': '2848315VK4724H',
    'origen_notas': 'Fecha de llegada: 03/2023 (dia: el primer fichero de trabajo, 17/03/2023, el presupuesto de Envoltermia guardado en la carpeta; la nube de puntos es del 21/03/2023; los '
                    'ficheros de dic-2022 y feb-2023 son de plantilla). Contacta: ENVOLTERMIA (910 054 135; info@envoltermia.com); en las notas, Carlos Lezaun (Envoltermia). Tipo de obra: '
                    'ENVOLVENTE TERMICA + FV + SUBVENCION. Barrio: Ibiza. Tecnico: Jonatan. Ano 1942. Edificio protegido tipo 3 (ambiental). Administracion: ~~ABBACA (Olga; Alameda de Osuna; '
                    '91 743 64 44; mantenimiento@abbaca.es, Elena; "Pedidos docs (24-03-2023, 12/04 Sonia esta pendiente que se lo mande el administrador)")~~, tachada; "Ha cambiado de '
                    'administradores nuevo correo admonfincas@mjr.es" (MJR; "914092105??"). Presidente: Luis Serna Nacher (presidente en Orense; 647 973 057). Portera: Belen (662 166 182; no tiene '
                    'mail ni ordenador). Conserje: Pilar (619 690 555). PEM 177.778,00. Visado TL/007052/2023. Expediente 350/2023/14601 (DR). Superficie 418,34. Subvencion CAM Next Generation 2022 '
                    '(programas 3 y 5) desistida (aceptacion del desistimiento, jun-2026). El 17/07/2026 el Ayto declara ineficaz la DR; la obra no ha empezado y Envoltermia pide no tramitar otra: '
                    '"la obra estaba condicionada a la concesion de los Next Generation, y nunca les llego" (03/08/2026). La ficha no dice comercial interno; la lleva Daniel.'},
    ('sate', 'fotovoltaica', 'subvenciones'), n=n,
    huecos=['[REVISAR EN FACTURACION] Proyecto hecho y visado (TL/007052/2023) y DR presentada; el Ayto la declara ineficaz (17/07/2026) y la obra no se hace porque los Next Generation no llegaron '
            '(Envoltermia, 03/08/2026). Proyecto hecho y la comunidad no hace la obra: no se cierra; revisar que se ha cobrado y que no queda nada pendiente.'])
arreglar_pc(OPP['nv33'][0]['id'], 'rol=eq.presidente&nombre=eq.' + quote('Luis Serna Nacher (presidente en Orense)'),
            {'nombre': 'LUIS SERNA NACHER', 'telefono': '647973057', 'notas': 'En la ficha: "Luis Serna Nacher (presidente en Orense)".'})
pc_unico(OPP['nv33'][0]['id'], 'BELEN', 'otro', '662166182', None, None, 'Portera del edificio; no tiene mail ni ordenador (ficha).')
pc_unico(OPP['nv33'][0]['id'], 'PILAR', 'otro', '619690555', None, None, 'Conserje (ficha).')

rellenar('nm46', 'NAVALMORAL DE LA MATA 46', 'navalmoraldelamata46', {'fecha_apertura': '2025-08-22',
    'origen_notas': 'Fecha de llegada: 08/2025 (dia: el correo de Andrea Diaz, 22/08/2025). Contacta: Andrea Diaz Serrano (ELECNOR; 669 242 519; andrea.diaz@elecnor.com). Tipo de obra: SATE + '
                    'CUBIERTA (9 vecinos; el importe no viene en el correo). ' + ELEC + ' CP 28025. Comercial interno: DANIEL. HE enviada 25-08-2025.'},
    ('sate', 'cubierta', 'df', 'css', 'cee', 'iee', 'lee', 'subvenciones'),
    n=fijar('navalmoraldelamata46', 2025, ('2025-08-22', 'Correo de Andrea Diaz (Elecnor) del 22 de agosto de 2025.')), trae_pu=PU['andrea'])

rellenar('nms17', 'NAVALMORALES 17', 'navalmorales17', {'fecha_apertura': '2025-10-27', 'referencia_catastral': '5697905VK3659F',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: el 3D, 27/10/2025). Contacta: la administracion, CIUDADELA (Paz; 609 058 953; en esta ficha el correo es mpazterradillos@gmail.com). Paga la CP. '
                    'Tipo de obra: ASCENSOR (centro de transformacion en el exterior). Ano 1971. HE enviada 7/11/2025; junta el dia 11, a la que acude Carlos. En la ficha: comercial interno '
                    'CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), n=partir(fijar('navalmorales17', 2025), 0, 'Enviada HE', '2025-11-07'), adm=PU['paz'], trae_pu=PU['paz'], captador=CARLOS, lleva=ALVARO)

rellenar('nav28', 'NAVARRA 28-30', 'navarra28-30', {'fecha_apertura': '2026-07-10',
    'origen_notas': 'Fecha de llegada: 07/2026 (dia: el correo de Isaac Pizarroso, 10/07/2026; los "editables" de subvenciones de 2025-2026 de la carpeta son de plantilla). Contacta: Isaac '
                    'Pizarroso Arnao (GESTIN; Alberto Aguilera 7, 1o izda., 28015; 91 447 10 09; isaacpizarroso@gestin.es). Paga la CP. Tipo de obra: SUBVENCION DE PROYECTO EXTERNO (Plan '
                    'Rehabilita 2026): obras para subsanar la IEE desfavorable, con DR presentada y en ejecucion. En copia del correo, vecinos: Joaquin J. y Maria Blanco Ramos '
                    '(jjmblancoramos@gmail.com), Jessica del Olmo Carrasco (jessicadelolmo@hotmail.com) y Marisa Herguera Garcia (marisa.hergueragarcia@gmail.com). Fecha encargo: 29/07/2026 '
                    '(HE SUBV EXT recibida firmada). CP 28039. Comercial interno: DANIEL.'},
    ('subvenciones',), n=fijar('navarra28-30', 2026, ('2026-07-10', 'Correo de Isaac Pizarroso (Gestin) del 10 de julio de 2026.')),
    comunidad={'cif_comunidad': 'H79554267', 'iban': 'ES18 2100 5297 1422 0020 2415'}, adm=PU['isaac'], trae_pu=PU['isaac'])

rellenar('nr51', 'NAVAS DEL REY 51', 'navasdelrey51', {'fecha_apertura': '2023-06-07', 'referencia_catastral': '7634924VK3773D',
    'origen_notas': 'Fecha de llegada: 06/2023 (dia: la primera nota, 07/06/2023; los ficheros de 2020-2022 son la documentacion del arquitecto anterior, Estudio IDEA, que aporta la comunidad: '
                    '"TENEMOS PROYECTO ANTIGUO"). Contacta: Juan Alberto Martin (JAM Construcciones Cerceda; en la ficha "JAM CONSTRUCCIONES CERDEDILLA SL"; 620 546 691; '
                    'comercial@construccionescerceda.com), la contrata que sigue la obra de SATE que dejo el contratista anterior. Tipo de obra: SATE Y NEXT GENERATION (y, en 2025, Plan Rehabilita). '
                    'Tecnico: OTRO ARQUITECTO. CP 28011. Administracion: GCI2 GESTION DE COMUNIDADES (Fernando Castaneda Arias; 655 328 469; info@gci2.es; administracion dada de alta en el barrido); '
                    'tachados en la ficha: ~~c/ Laurel, 1 -1o B- 28005~~, ~~Felix Angel Gomez Hidalgo~~, ~~91 4749853~~, ~~gomezhidalgo@icam.es~~. Presidenta: Maria Martinez Gonzalez (50897924M); '
                    'tachado, el anterior: ~~Sergio Ballesterios Ronda~~ (~~47466300G~~); en el telefono de la ficha, "ballesteros.ronda@gmail.com 619752735". Otros contactos de la contrata: '
                    'Antonio Arias Perez (antonio5373@hotmail.com) y maferju08@hotmail.com (630 097 986). PEM 146.174. En la carpeta: certificado de obra iniciada (ene-2024), libro del edificio '
                    '(feb-2024), fin de obra notificado por el promotor (abr-2026), Next Generation programa 3 concedido (jul-2026) y acta de inicio (jul-2026). La ficha no dice comercial '
                    'interno; la lleva Daniel.'},
    ('sate', 'subvenciones'), n=partir(fijar('navasdelrey51', 2023), 5, '--------- Forwarded', '2025-07-11'),
    comunidad={'iban': 'ES77 0081 0530 5100 0147 3449'}, adm=FERNANDO_GCI2, trae_pu=JALBERTO)
arreglar_pc(OPP['nr51'][0]['id'], 'rol=eq.presidente&documento=eq.47466300G50897924M',
            {'nombre': 'MARÍA MARTÍNEZ GONZÁLEZ', 'documento': '50897924M',
             'notas': 'En la ficha, el presidente anterior esta tachado: ~~SERGIO BALLESTERIOS RONDA~~ (~~47466300G~~); antes estaban los dos pegados en este registro. '
                      'En el telefono de la ficha: "ballesteros.ronda@gmail.com 619752735" (no se sabe si es del anterior).'})

rellenar('nec31', 'NÉCTAR 31', 'nectar31portal1 2 3', {'fecha_apertura': '2026-09-25',
    'origen_notas': 'Fecha de llegada: 09/2026 (dia: la primera nota, 25/09/2026: HE recibida firmada; la ficha es del 01/10/2026). Contacta: Silvia Yague (ADMINISTRACION DE FINCAS Y ABOGADOS '
                    'PICAZO YAGUE; C/ de la Iliada 35, local 2, 28022; 912 43 00 81 / 601 20 48 48; gestion@administracionpicazoyague.es). Paga la CP. Tipo de obra: SUBVENCION DE PROYECTO EXTERNO '
                    'DE ACCESIBILIDAD ("SUBV EXT ACCES"). Comunidad: CDAD PROP DISCOBOLO 56, NECTAR 31, 33 Y SAN MARIANO 31 MADRID (CIF H79798864). Fecha encargo: 25/09/2026. CP 28022. '
                    'Comercial interno: ALVARO.'},
    ('accesibilidad', 'subvenciones'), n=fijar('nectar31portal1 2 3', 2026), oid_fijo=NEC31,
    comunidad={'cif_comunidad': 'H79798864', 'iban': 'ES37 0081 0431 6100 0168 0971'}, adm=PU['silvia_py'], trae_pu=PU['silvia_py'], captador=ALVARO, lleva=ALVARO)

cf94 = cid_de('NUESTRA SEÑORA DE FATIMA 94')
arreglar_pc(cf94, 'rol=eq.presidente&nombre=eq.' + quote('CRISTINA /'), {'nombre': 'CRISTINA', 'telefono': '651978594'})
rellenar('fat94', 'NUESTRA SEÑORA DE FATIMA 94', 'nuestraseñoradefatima94', dict({'fecha_apertura': '2026-02-09',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: el 3D, 09/02/2026; el .skb de ene-2026 es de plantilla). Contacta: Cristina, la presidenta (651 978 594; cris7991@hotmail.com). Tipo de obra: '
                    'ASCENSOR (SUSTITUCION) + REFORMA DE PORTAL. CP 28047. La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + EXT}, **trae(presi_id(cf94))),
    ('modificacion_asc', 'accesibilidad_portal'), captador=ALVARO, lleva=ALVARO)

rellenar('gr13', 'NUESTRA SEÑORA DE GRACIA 13', 'nuestraseñoradegracia13', {'fecha_apertura': '2026-01-27', 'referencia_catastral': '5989309VK3658H',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: la fecha de encargo de la ficha, 27/01/2026; los ficheros de 2022-2025 de la carpeta son de plantilla). Contacta: la administracion, CIUDADELA '
                    '(paz.terradillos@ciudadela.eu). Paga la CP. Tipo de obra: SATE ("PROYECTO BASICO Y DE EJECUCION PARA REHABILITACION DE ENVOLVENTE TERMICA EN EDIFICIO RESIDENCIAL '
                    'EXISTENTE"; para la subvencion, ademas, capilaridad y saneamiento). Tecnico: Jacob Hernandez. Ano 1968. Licencia por ECU (ACTECU): la ECU pide licencia y no DR (28/08/2026). '
                    'Presidente: Victor Angel Garcia Gonzalez (50174330Z; 649 823 609; victor.garcia@caryvic.com y jose.garcia@caryvic.com). PEM 160.880,47. Superficie 219. En la ficha: '
                    'comercial interno CARLOS.' + CAPTO_CARLOS},
    ('sate', 'subvenciones'), n=fijar('nuestraseñoradegracia13', 2026, otros={0: ('2026-02-11', 'Sin fecha delante; la nota lleva dentro la fecha 11/02/2026.')}),
    comunidad={'iban': 'ES37 2100 6352 3613 0050 1666'}, trae_pu=PU['paz'], captador=CARLOS, lleva=ALVARO)
arreglar_pc(OPP['gr13'][0]['id'], 'rol=eq.presidente&nombre=eq.' + quote('VICTOR GARCIA /'),
            {'nombre': 'VICTOR ANGEL GARCIA GONZALEZ', 'documento': '50174330Z', 'email': 'victor.garcia@caryvic.com',
             'notas': 'La ficha trae dos correos: victor.garcia@caryvic.com y jose.garcia@caryvic.com.'})

rellenar('gr9', 'NUESTRA SEÑORA DE GRACIA 9', 'nuestraseñoradegracia9', {'fecha_apertura': '2026-01-20',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: la ficha, 20/01/2026, el unico fichero de la carpeta). Tipo de obra: SATE + POSIBLE ASCENSOR. Sin administrador. Presidenta: Mercedes. '
                    'La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('sate', 'ascensor'), captador=CARLOS, lleva=ALVARO)

n = partir_sin_fecha('nuestraseñoradelasoledad16', 2025, 'HE enviadas 7/11/2025', '2025-11-07', '2025-11-04', 'Correo de Carlos Garcia del 4 de noviembre de 2025.')
rellenar('s16', 'NUESTRA SEÑORA DE SOLEDAD 16', 'nuestraseñoradelasoledad16', {'fecha_apertura': '2025-11-04', 'referencia_catastral': '6394707VK3669C',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia: el correo de Carlos Garcia, 04/11/2025; el 3D es del 05/11/2025; los ficheros de 2022-2025 de la carpeta son de plantilla). Contacta: la '
                    'administradora, Paz Terradillo (CIUDADELA; paz.terradillos@ciudadela.eu); "Poner en copia de todo a Esther". Paga la CP. Tipo de obra: SATE (envolvente termica completa; '
                    'se miro tambien elevador y salvaescaleras vertical en la entrada). Tecnico: Carlos Daza. Ano 1961. Licencia por ECU (ACTECU): la ECU pide licencia en vez de DR (18-05-2026); '
                    'licencia concedida (26/08/2026). Presidenta: Maria Esther Marina Iglesias (02912757Z; 615 671 461; keka.marina@gmail.com). Contacto para la visita (escaner): Vicky, 699 71 61 93. '
                    'PEM 251.510,61. Visado TL/013098/2026. Superficie 384,73. Pendiente de la fecha de inicio de obra (sep-2026). En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('sate',), n=n, comunidad={'iban': 'ES77 6724 8440 0182 9172 5782'},
    presi=('MARIA ESTHER MARINA IGLESIAS', 'presidente', '615671461', None, 'keka.marina@gmail.com'), trae_pu=PU['paz'], captador=CARLOS, lleva=ALVARO)
pc_unico(OPP['s16'][0]['id'], 'VICKY', 'otro', '699716193', None, None, 'Persona de contacto para la visita (escaner) (ficha).')

rellenar('s20', 'NUESTRA SEÑORA DE SOLEDAD 20', 'nuestraseñoradelasoledad20', {'fecha_apertura': '2025-10-22', 'referencia_catastral': '6393305VK3669C',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: el 3D, 22/10/2025; los ficheros de 2022-2024 de la carpeta son de plantilla). Contacta: Paz Terradillos (CIUDADELA; "609 05 89 53 - LLAMAR '
                    'SOLO A ESTE TELEFONO"; 919 01 50 88; paz.terradillos@ciudadela.eu). Paga la CP. Tipo de obra: ASCENSOR + DESAMIANTADO DE CUBIERTA + SUBV (elevador con demolicion de la '
                    'escalera; cambio completo de electricidad y retirada del amianto de la cubierta). Barrio: Buenavista. Tecnico: Carlos Daza. Fecha encargo: 03/02/2026. Ano 1977. Licencia por '
                    'ECU (ACTECU). Presidente: Jose Rosa Sardon (3o C; 654 098 767). Superficie 56,63. En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('ascensor', 'cubierta', 'subvenciones'),
    n=fijar('nuestraseñoradelasoledad20', 2026, ('2026-02-03', 'Sin fecha; la descripcion del encargo; se toma la fecha de encargo de la ficha (03/02/2026).')),
    comunidad={'iban': 'ES46 0081 5142 6800 0138 5843'}, presi=('JOSE ROSA SARDON', 'presidente', '654098767'), trae_pu=PU['paz'], captador=CARLOS, lleva=ALVARO)

rellenar('v7', 'NUESTRA SEÑORA DEL VILLAR 7', 'nuestraseñoradelvillar7', {'fecha_apertura': '2021-02-25', 'referencia_catastral': '4852248VK4745D',
    'origen_notas': 'Fecha de llegada: la ficha dice 09/2021 (fecha de encargo 27/10/2021); los primeros ficheros son del 25/02/2021 (el paquete "40.-" de INVER: emails, presupuesto, licencia '
                    'concedida y proyecto de Velerda); se toma esa. Contacta: Raul Cerezo; empresa/cliente: ELECNOR. Tipo de obra: ASC + CSS + SUBV: proyecto de otro arquitecto (Miguel Velerda, '
                    'licencia de 2020, concedida); "DANIEL ASUMIO LA DIRECCION DE OBRA CON LICENCIA YA CONCEDIDA". Ref. 174/2021. Jefe de obra: Laura Sierra; jefa de obra: Raquel Gonzalez '
                    '(ELECNOR). Administracion: MARTINEZ LIRIA (Paco, Eva; Av. Marques de Corbera 8, local 3, 28017; 91 726 52 34 / 91 726 99 92 / 607 869 079; fincasmliria@gmail.com). '
                    'Presidente: Jose Carlos Sanchez Dolado (51640684A; 660 485 474; jcsDola@telefonica.net). PEM 96.238,22 (proyecto de Velerda, licencia 2020); PC de Elecnor 96.889,60 + IVA '
                    '= 106.578,56 ("poner esto para subvenciones"); residuos 300. Superficie 50 m2. Rehabilita 2022 concedida (86.164,17 EUR; justificacion registrada en mar-abr 2026); CAM 2022 '
                    'no concedida. En la carpeta: obra con certificaciones de Elecnor (2022-2023), certificado final a origen (ene-2025), RAE y certificados de instalaciones (mar-2026). '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'df', 'css', 'subvenciones'),
    n=fijar('nuestraseñoradelvillar7', 2025, ('2021-10-27', 'Sin fecha; se toma la fecha de encargo de la ficha (27/10/2021): la hoja de direccion de obra se firma el 20/10/2021.')),
    presi=('JOSÉ CARLOS SÁNCHEZ DOLADO', 'presidente', '660485474', None, 'jcsDola@telefonica.net'), trae_pu=PU['cerezo'])

rellenar('ng16', 'NUÑO GOMEZ 16', 'nuñogomez16', {'fecha_apertura': '2025-07-01', 'referencia_catastral': '9264418VK3696C',
    'origen_notas': 'Fecha de llegada: 07/2025 (dia: la primera nota, 01/07/2025: viabilidades estudiadas con Francisco y Daniel). Contacta: Oscar (CEGA; 91 679 30 92 / 616 295 646; '
                    'administracion@ascensorescega.com y ascensorescega.ad@gmail.com). Paga el proyecto CEGA. Tipo de obra: ASCENSOR CON DERRIBO DE ESCALERA + SUBV (presupuesto de CEGA firmado). '
                    'Tecnico: Julio. Jefe de obra: Boris Cespedes (CEGA). Fecha encargo: 11/07/2025 (HE firmada). Ano 1970. Licencia por ECU (ACTECU). Administracion: POZOFRA VILLAVERDE (911 53 58 61 '
                    '/ 646 30 10 97 / 651 14 82 72; info@pozofra.com; Juan Ignacio Fraguas del Pozo, pozofra@pozofra.com; pozofra4003@gmail.com); "Pedidos docs cp 14/07 a cega"; "PONER EN COPIA '
                    'EN TODO A CEGA". Presidenta: Maria Julia Agudo Pacheco (07211475D; "Verificar cuando llegue"). Vecino Alberto (629 939 041): "no es aparentemente el presidente pero si que esta '
                    'colaborando con el ascensor". Otro telefono en la ficha: 622 181 982 (no dice de quien). PEM 154.697,90. Visado TL/002856/2026. Superficie 70,54 m2. Licencia aprobada por la ECU '
                    '(24/02/2026). Comercial interno: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('nuñogomez16', 2025), trae_pu=PU['oscar_cega'])
arreglar_pc(OPP['ng16'][0]['id'], 'rol=eq.presidente&nombre=eq.' + quote('MARIA JULIA AGUDO PACHECO (Verificar cuando llegue)'),
            {'nombre': 'MARIA JULIA AGUDO PACHECO', 'notas': 'En la ficha: "(Verificar cuando llegue)".'})
pc_unico(OPP['ng16'][0]['id'], 'ALBERTO', 'vecino', '629939041', None, None, 'Vecino; "no es aparentemente el presidente pero si que esta colaborando con el ascensor" (ficha).')

rellenar('n28', 'NURIA 28-32', 'nuria28-32', {'fecha_apertura': '2026-02-09', 'referencia_catastral': '0229939VK4802G',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: el 3D, 09/02/2026; la plantilla de IEE de may-2025 y el escrito de ene-2026 son de plantilla). Paga la CDAD. Tipo de obra: ACCESIBILIDAD '
                    '(2 elevadores verticales, 1 por edificio, cerrados y con puertas automaticas, en los extremos de las parcelas; itinerario accesible elevadores-ascensores existentes, que miden '
                    '1,07 x 1,07 y no son accesibles) + SUBV. Tecnico: Israel. Fecha encargo: 27/05/2026 (HE firmada); HE de subvencion firmada 16/07/2026. Ano 1986 (ambos). Referencias '
                    'catastrales: portal 28, 0229939VK4802G; portal 32, 0229941VK4802G (sin acceso en la base). Administracion: INTEGRAL DE COMUNIDADES (Sonia Zamarreno Garcia; 679 18 26 45; '
                    'szamarreno@integraldecomunidades.es). Presidente: Francisco, 600 29 00 71. En la ficha: comercial interno CARLOS.' + EXT},
    ('accesibilidad', 'plataforma', 'subvenciones'), n=fijar('nuria28-32', 2026), comunidad={'iban': 'ES10 0081 0650 3700 0129 4935'}, captador=ALVARO, lleva=ALVARO)
arreglar_pc(OPP['n28'][0]['id'], 'rol=eq.presidente&nombre=eq.' + quote('FRANCISCO /'), {'nombre': 'FRANCISCO'})

cn74 = cid_de('NURIA, 74')
teresa = pc_unico(cn74, 'TERESA', 'vecino', None, None, 'tere_sib@hotmail.com', 'Propietaria; "otra vecina interesada que ha cogido las riendas del asunto" (ficha, 2025).')
pc_unico(cn74, 'INMACULADA', 'vecino', '696482828', None, 'benifer@movistar.es', 'Propietaria; "Datos Inmaculada" (ficha, 2025).')
rellenar('n74', 'NURIA, 74', 'nuria74', dict({'fecha_apertura': '2025-06-19',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: el 3D, 19/06/2025). Contacta: una propietaria por la web; en la ficha, "Propietaria TERESA" (tere_sib@hotmail.com); tambien Inmaculada (696 482 828; '
                    'benifer@movistar.es). Paga la comunidad. Tipo de obra: ASCENSOR EXTERIOR para salvar el desnivel de la cota del edificio a la de la piscina (los ascensores de los edificios '
                    'los lleva Excelsior). Ano 1970. Administracion: Diego Colondron Esteban (609 236 839 - 913 784 266; administracion dada de alta en el barrido). 29/09/2025: en junta no '
                    'aprobaron el ascensor, "lo van a ver mas adelante con posibles alternativas como rampas". En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS}, **trae(teresa)),
    ('ascensor',), n=partir_sin_fecha('nuria74', 2025, 'Hablo con Diego', '2025-09-29', '2025-06-19', 'Sin fecha; la llamada de la propietaria por la web; el 3D es del 19/06/2025.'),
    adm=DIEGO_C, captador=CARLOS, lleva=ALVARO)

# ================================================================= 2. CLON
REVS = [
    ('narvaez69', '2026-09-09', 'OSWALDO GARCIA (SCHINDLER)', None, None,
     'NARVAEZ 69 MADRID. Fecha: 09/2026 (dia: el 3D, 09/09/2026). Contacta: Oswaldo (Schindler; oswaldo.garcia@schindler.com). Tipo de obra: SUSTITUCION DE ASCENSOR (estructura de cristal mas '
     'los frentes de puertas). Hay 3D. La ficha no tiene notas. Comercial interno: ALVARO. En produccion no esta.'),
    ('nectar5', '2022-04-21', 'PERSONAL (segun la ficha)', None, None,
     'NECTAR 5 MADRID. Fecha: la ficha dice 05/2022; la nube de puntos es del 21/04/2022 (y el modelo BIM de abr-may 2022); se toma esa. Empresa/cliente: "PERSONAL". Distrito San Blas - '
     'Canillejas. CP 28022. Ficha casi vacia: sin contacto, tipo de obra ni notas.'),
    ('nicolasagomez104', '2023-08-31', 'ANA ENCINAS (ELECNOR)', None, None,
     'NICOLASA GOMEZ 104 MADRID. Fecha: 08/2023 (dia: la nota del 31/08/2023). Tipo de obra: ASCENSOR. Distrito San Blas - Canillejas. CP 28022. En la carpeta solo esta la ficha.\n\n'
     + crudo('nicolasagomez104', 2023)),
    ('nicolasgodoy20', '2025-02-10', 'MIGUEL (EUROLINOVA); el presidente es Miguel', None, None,
     'NICOLAS GODOY 20 MADRID. Fecha: 02/2025 (dia: la nota del 10/02/2025; fotos de la visita del 12/02/2025). Contacta: Miguel, Eurolinova. Tipo de obra: SATE. Distrito Usera. CP 28026.\n\n'
     + crudo('nicolasgodoy20', 2025)),
    ('nicolassanchez102', '2025-03-04', 'MIGUEL (EUROLINOVA)', None, None,
     'NICOLAS SANCHEZ 102 MADRID. Fecha: 03/2025 (dia: la nota del 04/03/2025). Tipo de obra: ASCENSOR. Distrito Usera. CP 28026. Hay 3D (14/03/2025) e informe de viabilidad (17/03/2025).\n\n'
     + crudo('nicolassanchez102', 2025)),
    ('nicolassanchez14', '2025-01-01', 'MERCEDES MORAN (PRESIDENTA)', None, None,
     'NICOLAS SANCHEZ 14 MADRID. Fecha: 01/2025 (dia desconocido; la primera nota es del 04/02/2025 y las fotos de la visita del 05/02/2025). Tipo de obra: ASCENSOR (inviable derribando la '
     'escalera; posible invadiendo 3 m2 de los dormitorios de cada vivienda, unos 80.000 EUR; piden un informe, aunque sea de inviabilidad, para arreglar el portal). Distrito Usera. CP 28026. '
     'Presidenta: Mercedes Moran (mmoranju@gmail.com).\n\n' + crudo('nicolassanchez14', 2025)),
    ('normas3-5-7', '2023-02-14', 'JUAN GALLEGO (COMUNIDAD)', 'H79334116', None,
     'NORMAS 3-5-7 MADRID. Fecha: 02/2023 (dia: los primeros ficheros, 14/02/2023: anteproyecto de escaleras, caldera, facturas de gas y el correo "Estudio subvencion Next Generation"). Tipo de obra: '
     'ESTUDIO SUBV NEXT GENERATION + IBERDROLA (mediciones para Iberdrola, mar-2023) y tambien accesibilidad (hay un anteproyecto que habria que rematar). Distrito Ciudad Lineal. CP 28043. '
     'Contacto: Juan Gallego (juangallegogarrido@gmail.com). Administracion: MAFYC INMOBILIARIA (Estefania; 914 301 444) - no esta en la agenda.\n\n' + crudo('normas3-5-7', 2023)),
    ('nuestraseñoradelasangustias14', '2022-09-06', 'IBAI (ELECNOR)', None, None,
     'NUESTRA SEÑORA DE LAS ANGUSTIAS 14 MADRID. Fecha: 09/2022 (dia: la nota del 06/09/2022). Tipo de obra: SATE + CUBIERTA. Distrito Chamartin. CP 28036. En la carpeta solo esta la ficha.\n\n'
     + crudo('nuestraseñoradelasangustias14', 2022)),
    ('nuestraseñoradelrosario18', '2025-04-03', 'MARIA LUISA GOMEZ (PRESIDENTA)', None, None,
     'NUESTRA SEÑORA DEL ROSARIO 18 MADRID. Fecha: la ficha dice 03/2025, pero la nota es del 03/04/2025 ("Nos ha llamado") y la referencia 04/2025 (fotos y 3D del 03/04/2025); se toma esa. '
     'Tipo de obra: ASCENSOR CON REMODELACION DE ESCALERA (comunidad de 3 vecinos, sin administrador; el ayuntamiento, en urbanismo, le dio nuestro telefono). Distrito Carabanchel. '
     'Presidenta: Maria Luisa Gomez (vecina del 1o; 654 44 01 29; asiramgr@hotmail.com). HE e informe de viabilidad enviados el 04/04/2025 y reenviados el 12-05-2025.\n\n'
     + crudo('nuestraseñoradelrosario18', 2025)),
    ('nuestraseñoradelvillar55', '2018-03-23', 'ANDRES ENGWE', None, None,
     'C/ NUESTRA SEÑORA DE VILLAR 55 MADRID. Fecha: 03/2018 (la fecha de inicio de la ficha, 23/03/2018). Ficha vacia; hay croquis, borrador de escalera y plano (mar-2018).'),
    ('numancia12', '2026-04-10', 'LUIS PALACIOS (PRESIDENTE)', None, None,
     'NUMANCIA 12 MADRID. Fecha: 04/2026 (dia: la ficha, 10/04/2026, el unico fichero de la carpeta). Contacta: Luis Palacios, el presidente (649 72 58 91; lmpalaciosl@gmail.com). Tipo de obra: '
     'SATE. CP 28039. La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + EXT)]
for carp, fecha, trajo, cif, ref, t in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, comercial='Alvaro' if carp in ('narvaez69', 'numancia12') else 'Daniel')
fila('nicolasagomez91', '2021-03-22', 'abierta', None, 'MARISA (PRESIDENTA DE RIBADUMIA 4)', 'E78246154', None,
     'C/ NICOLASA GOMEZ 91 MADRID. Fecha: la ficha dice "Mayo 2021"; el primer fichero de Accesalia es la medicion del 22/03/2021; se toma esa. Agente comercial: Marisa (presidenta de Ribadumia 4). '
     'Tipo de obra: SATE (cambiar los hierros de las terrazas exteriores; SATE fino en las terrazas abiertas; deficiencias de la ITE; reparacion de un muro con el vecino). Propiedad: MANCOMUNIDAD DE '
     'PROPIETARIOS FENELON 6 A 10, LUCANO 38 A 44, NICOLASA GOMEZ 91 DESDE LA A HASTA LA D (CIF E78246154). Administracion: ADMINISTRACION DE FINCAS Y ABOGADOS PICAZO YAGUE (C/ Iliada 35, '
     'local 2, 28022; 91 243 00 81 / 601 204 848; gestion@administracionpicazoyague.es; contacto "SONIA SILVIA"). Presidenta: Marisa (687 140 611; mardellazaro@gmail.com). En la carpeta: IEE '
     '(jun-2021), oferta de SATE con financiacion (sep-2021), proyecto de SATE (estado actual, memoria y certificado energetico, sep-oct 2021) y "proyecto sin visar" (nov-2021). '
     '"Proyecto abandonado. No lo pagaron ni van a continuar."' + REV)
for carp, fecha, trajo, t in [
        ('nicaragua6', '2020-03-20', None, 'NICARAGUA 6 MADRID. Carpeta SIN ficha de datos: un INFORME PERICIAL (documentacion del proyecto de la obra, mar-2020; contestacion a la demanda, '
         'oct-2020; pericial de Accesalia, 15-16/10/2020) y la citacion del perito (jul-2021).'),
        ('nicolas', '2019-11-13', None, 'Carpeta "nicolas" SIN ficha de datos y sin direccion de comunidad: solo "Presupuestos ciegos Redondela 6, 8 y Tuy 1" (zip) y un referendum de "Viñagrande 6 '
         'Alcorcon" (13/11/2019).'),
        ('nuestraseñoradelaluz52', '2016-10-17', 'PEDRO ARANDA (THYSSEN)', 'NUESTRA SEÑORA DE LA LUZ 52 MADRID. Fecha: 10/2016 (la fecha de inicio de la ficha, 17/10/2016). Ficha vacia; hay croquis '
         'y presupuesto (24/10/2016).'),
        ('nuñezmorgado11', '2022-01-21', None, 'NUÑEZ MORGADO 11 MADRID. Carpeta SIN ficha de datos: solo fotos de WhatsApp del 21/01/2022.')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 3. MANIAS
# La ECU pide licencia y no DR para la envolvente termica en dos obras de esta tanda (Ntra. Sra. de la Soledad 16, 18-05-2026; Ntra. Sra. de Gracia 13, 28/08/2026).
mania('Para la rehabilitacion de envolvente termica requiere tramitar por licencia y no por declaracion responsable (lo pide en Ntra. Sra. de la Soledad 16, may-2026, y en Ntra. Sra. de '
      'Gracia 13, ago-2026).', 'ACTECU (ECU)', '2026-05-18', 'nuestraseñoradelasoledad16', clave='s16', trozo='LA ECU ENVIA REQUERIMIENTO')

resumen()
