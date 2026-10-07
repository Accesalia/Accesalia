# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda R (rabat10 .. rufinoblanco20, las 51 carpetas de la R). 7-oct-2026. Sin --escribir: marcha en seco.
# La S1, la S2 y la S3 las preparan otros agentes a la vez.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de, _lineas

PU.update(collado='0f2b3251-9e84-443d-b81e-32edfd1f7915', gmoya='5a588515-9c02-4058-8e31-7e51dec4737f', ofernandez_fain='984ff96b-2f48-414b-a89e-bb207367ae4c',
          dsanchez_fain='cadc2119-99c7-4a97-a474-75d420deaa81', paramio='900b6af9-4a5c-4e31-8c09-322357ee402c', trebol_javier='00c900df-1c1c-4f09-b45e-a28bc3c6381d',
          cerezo='7f4218f5-8b8e-45a0-9cba-b2880ccfc4c3', circulo='fd52af07-0ea2-42e2-b743-14c99a2b7ce6', atiko_mj='c768611c-65ef-458f-8b45-c8a2f05e5f9a')
SANBLAS = '0d3d3606-9b00-4672-8163-2ede64697ece'   # Junta Municipal de Distrito de San Blas-Canillejas (ya existe)
EFFIC = '1d2827a3-5a80-4e4e-b4da-6d9902be0122'

# Propuesta para Monica. False = no se unen.
# Riocabado 8 y Riocabado 10: dos comunidades de produccion con la MISMA parcela (7330714VK3773A; tambien la comparten el 12 y el 14), las dos de ene-2026,
# ascensor con derribo de 240.000 EUR. Pero llegan por canales distintos (el 8 por EFFIC, comercial Carlos; el 10 por Grupo Trebol, comercial Alvaro), con HE
# distintas, y nada dice que sean la misma comunidad (ni CIF ni presidente). Se rellenan las DOS por separado; si Monica dice que es un conjunto, se une como Fatou 24.
RIOCABADO_UNA_OPP = False
RIOCABADO8 = 'e155ef5f-6c83-4d96-b8a3-bf507248dae9'; ACC_RIOCABADO8 = '8d319a8b-6403-4767-9a32-a294d290cfef'


def cid_de(prefijo):
    cs = b.leer('comunidades?select=id&municipio=eq.MADRID&nombre=like.' + quote(prefijo) + '*'); assert len(cs) == 1, prefijo
    return cs[0]['id']


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto (telefono pegado al nombre, tachado pegado...)."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


def pc_unico(cid, nombre, rol, tel=None, doc=None, email=None, notas_=None):
    """pc() para roles que no son presidente, sin repetirla si el script se relanza."""
    ya = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&nombre=eq.%s' % (cid, quote(nombre)))
    return ya[0]['id'] if ya else pc(cid, nombre, rol, tel, doc, email, notas_)


def trae(pcid):
    return {'quien_persona_comunidad_id': pcid, 'persona_comunidad_id': pcid}


def cerrar_perdida(clave, motivo, fecha, notas_):
    if ESCRIBIR:
        oid = OPP[clave][1]
        if not b.leer('motivo_cierre_oportunidad?select=id&oportunidad_id=eq.' + oid):
            b.insertar('motivo_cierre_oportunidad', [{'oportunidad_id': oid, 'resultado_final': 'perdido', 'motivo_perdido': motivo, 'fecha_cierre': fecha, 'notas': notas_}])
            b.actualizar('oportunidades?id=eq.' + oid, {'estado': 'cerrada'})
    else:
        SECO.append('INSERT motivo_cierre_oportunidad x1: %s perdido (%s) %s + UPDATE oportunidades estado=cerrada' % (clave, motivo, fecha))


def enlazar(oid, acc, de_donde):
    if not b.leer('relacion_oportunidad_accesos?select=acceso_id&opp_id=eq.%s&acceso_id=eq.%s' % (oid, acc)):
        ins('relacion_oportunidad_accesos', [{'opp_id': oid, 'acceso_id': acc, 'de_donde': de_donde}])


def bloque(c, i, j):
    """lineas i..j (incluidas) de la ficha, sin las vacias."""
    return '\n'.join(l for l in _lineas(c)[i:j + 1] if l.strip()).strip()


def partir_m(n, i, marca, fecha, motivo):
    """partir() y a la segunda mitad se le anade el motivo de su fecha."""
    n = partir(n, i, marca, fecha); f, t = n[i + 1]
    return n[:i + 1] + [(f, t + '\n\n(' + motivo + ')')] + n[i + 2:]


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
cl = lambda c, a, s=None: J(fijar(c, a, s))

# ================================================================= 0. AGENDA
# Junta de San Blas-Canillejas (ya existe): la tecnico de Ribadumia 4 (sin correo propio; el del departamento, en notas).
persona_nueva('Marta', 'del Saz González', 'arquitecta - ingeniera superior, técnico de distrito', '915888016', None, organismo=SANBLAS,
              notas_='Junta de San Blas-Canillejas: tecnico de la licencia del ascensor de Ribadumia 4 (desde nov-2022; carpeta ribadumia4). Correo del departamento: '
                     'tecnisanblas@madrid.es. En la ficha, los demas telefonos de la Junta: medio ambiente 915 888 007 (cita previa); servicio de medio ambiente y escena '
                     'urbana 915 888 058 / 915 888 067; negociado administrativo 915 888 627; servicios tecnicos 915 888 016 / 915 888 022; licencias 91 588 80 19.')
# EFFIC (contrata ya existe): Guillermo, a quien se manda la HE de Riocabado 8 (sin correo ni telefono en la ficha).
GUILLERMO_EFFIC = persona_nueva('Guillermo', None, None, None, None, contrata=EFFIC,
                                notas_='EFFIC: recibe la HE de Riocabado 8 ("HE ENVIADA POR ALEJANDRA A GUILLERMO EFFIC", 16/01/2026; carpeta riocabado8). Sin apellidos, telefono ni correo en la ficha.')

# ================================================================= 1. PRODUCCION (19 carpetas, 19 oportunidades)
rellenar('rab10', 'RABAT 10', 'rabat10', {'fecha_apertura': '2023-09-11', 'referencia_catastral': '6834301VK4763D',
    'origen_notas': 'Fecha de llegada: la ficha dice 10/2023; la primera nota es del 11/09/2023 ("Cobrar para luego historias con Adolfo"); se toma esa (el "compromiso CARTEL" de '
                    'may-2023 es de plantilla). Contacta: Adolfo Collado, el administrador (MC GESTION ADMINISTRACION DE FINCAS; Av. Doctor Garcia Tapia 129, local 2, 28030; '
                    '91 502 74 59; acollado@mcgestionfincas.com; moratalaz@mcgestionfincas.com; atiende de 10 a 14 h, fuera de ese horario es emergencia; facturas: '
                    'facturas@mcgestionfincas.com). Paga: la CDAD. Tipo de obra: PERICIAL PARA CP + DR MEMORIA VALORADA REPARACIONES (en mar-2024, HE de ampliacion de la '
                    'pericial: calle privada, tendedero, humedades de la vivienda de Flandes 4 y del poyete de la rampa del garaje, y escrito al Ayto por la calle peatonal). '
                    'Barrio: Horcajo. Tecnico: Jonatan. Comunidad: CDAD PROP CL PAVONES ESTE PARC 9 (CIF H82317280). Presidenta: Digna Escribano Valdepenas (06258168Y). '
                    'PEM 17.862,72. Declaracion responsable, expediente 350/2024/16612. Superficie 58,59. La ficha no dice comercial interno; la lleva Daniel.'},
    ('pericial', 'memoria_valorada'), n=fijar('rabat10', 2023), comunidad={'iban': 'ES82 0081 5638 4800 0122 3732'}, trae_pu=PU['collado'])

rellenar('rc5', 'RAFAEL CALVO 5', 'rafaelcalvo5', {'fecha_apertura': '2021-08-06', 'referencia_catastral': '1064812VK4716C',
    'origen_notas': 'Fecha de llegada: la ficha dice 09/2021; los primeros ficheros (capturas y el presupuesto de la contrata) son del 06/08/2021; se toma esa. Contacta: Juan Paramio '
                    '(FAIN). Paga: FAIN. Tipo de obra: MODERNIZACION ASCENSORES (en la carpeta, memoria valorada y declaracion responsable de sep-2021; requerimiento del '
                    '14-03-2022, tasas y peticion de aplazamiento de mar-2022). Tecnico: Dennis. Fecha encargo: 09/2021. CP 28010. Administracion: Guillermo Rodriguez Montalban '
                    '(91 593 29 80 / 669 02 53 55; guillermo@rodriguezcastane.com). Comunidad: C.P. RAFAEL CALVO 5 (CIF H78229077). PEM 67.466,79. Superficie 2,74. Ano 1984. '
                    'La ficha no tiene notas ni comercial interno; la lleva Daniel.'},
    ('modificacion_asc',), trae_pu=PU['paramio'])

c9 = cid_de('RAFAEL CALVO 9')
n = partir(fijar('rafaelcalvo9', 2022, ('2022-03-24', 'Sin fecha; texto del arranque del encargo (cabinas de MP), con la fecha de encargo de la ficha, 24/03/2022.')),
           3, 'Se manda a la ECU 02/03/2023', '2023-03-02')
rellenar('rc9', 'RAFAEL CALVO 9', 'rafaelcalvo9', {'fecha_apertura': '2022-03-24', 'referencia_catastral': '1064810VK4716C',
    'origen_notas': 'Fecha de llegada: 03/2022 (dia: la fecha de encargo de la ficha, 24/03/2022; el acta de visita y la oferta de Elecnor son del 25/03/2022; el "compromiso CARTEL" '
                    'de ene-2022 es de plantilla). Contacta: ~~Ibai Calonge~~ (ELECNOR), tachado; ahora la contrata es ORONA (Carlos Lopez, clopezp@orona.es; no esta en la '
                    'agenda). Paga: ELECNOR -> Orona. Tipo de obra: SUSTITUCION 4 ASCENSORES + PLATAFORMA INCLINADA (cabinas nuevas de 1000 x 1160, puertas automaticas de 700) '
                    '+ subvencion (HE firmada 27/06/2022; obra condicionada a la subvencion, que se encargaba Renovae con Elecnor). Tecnico: Carla. Fecha encargo: 24/03/2022. CP '
                    '28010. Administracion: ALONSO Y MARTINEZ (Maria Escudero, Soraya Bey; 608 414 008 / 915 642 450; mescudero@alonsoymartinez.es; info@alonsoymartinez.es; '
                    'administracion@alonsoymartinez.es). Presidente: Javier Gonzalez Gonzalez (50868970P; 618 734 904; javiergonzalezgon@yahoo.es); su mujer, Alicia Lozano '
                    '(629 474 806; alicialzn@icloud.com), pide en jun-2025 presentarse a la convocatoria de la CAM. PEM 238.090,46. Visado TL-014097-2022. Declaracion por SLIM '
                    '-> denegada; declaracion por la ECU (ACTECU), mar-2023; NZ 1 grado 3o, Conjunto Historico Villa de Madrid (Cerca y Arrabal de Felipe II). La ECU cierra el '
                    'expediente el 21-10-2024 por no hacerse las obras; DR nueva presentada el 26-05-2025. Superficie 6,46. En may-2026, HE de renovacion de subvenciones. '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('modificacion_asc', 'plataforma', 'subvenciones'), n=n,
    presi=('JAVIER GONZALEZ GONZALEZ', 'presidente', '618734904', None, 'javiergonzalezgon@yahoo.es'))
pc_unico(c9, 'ALICIA LOZANO', 'otro', '629474806', None, 'alicialzn@icloud.com', 'Mujer del presidente; pide presentarse a la convocatoria de la CAM (02-06-2025).')

rellenar('rfv59', 'RAIMUNDO FERNANDEZ VILLAVERDE 59', 'raimundofdezvillaverde59', {'fecha_apertura': '2025-06-19',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: la nota de la HE enviada, 19/06/2025; la ficha es del 20/06/2025). Contacta: Laura Ruiz (TURBOIBER; lruiz@turboiber.com; no esta '
                    'en la agenda). Tipo de obra: SUBV EXTERNA PLATAFORMA (HE de subvenciones de accesibilidad del portal). La carpeta se llama "raimundofdezvillaverde59" (el '
                    'lector no la casaba). En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('subvenciones',), n=fijar('raimundofdezvillaverde59', 2025), captador=CARLOS, lleva=ALVARO)

rellenar('rs15', 'RAMON DE SANTILLAN 15 A-B', 'ramondesantillan15ab', {'fecha_apertura': '2026-02-13',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: el correo de Raul Cerezo, 13/02/2026). Contacta: Raul Cerezo (rcerezoarq@gmail.com), comercial freelance que colabora: pide '
                    '"presupuestos urgentes de Proyecto, Direccion y peticion de subvenciones". Tipo de obra: ELEVADOR (cerrado, de 1 planta, para salvar unos 2 m entre el acceso '
                    'al portal y la cota de ascensores; el 15 A y el 15 B comparten portal: es un solo elevador). HE enviada 16-02-2026. Comercial interno: DANIEL.'},
    ('plataforma', 'df', 'subvenciones'),
    n=fijar('ramondesantillan15ab', 2026, ('2026-02-13', 'Correo de Raul Cerezo del 13 de febrero de 2026.')), trae_pu=PU['cerezo'])

rellenar('rg45', 'RAMON GOMEZ DE LA SERNA 45', 'ramongomezdelaserna45', {'fecha_apertura': '2026-04-01', 'referencia_catastral': '8618914VK3881H',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia desconocido; los ficheros son de jul-2026: el acta de la junta de abril de 2026 y el presupuesto de Schindler firmado el '
                    '04-06-2026). Contacta: Javier Rodriguez (SCHINDLER; 685 28 60 41; javier.rodriguez.martin@schindler.com). Paga: SCHINDLER. Tipo de obra: SUST ASCENSORES (2) '
                    '+ SUBV. Fecha encargo: 21/07/2026. Ano 1984. CP 28035. Administracion: la ficha no la nombra; contacto "DAVID" (645 887 332 y 91 373 54 50 o 91 316 64 60). '
                    'Comunidad: CDAD PROP RAMON GOMEZ DE LA SERNA 45 (CIF H78281417). Presidenta: Maria Pilar Ruiz Martinez (30429567S). En la carpeta, la consulta de la IEE y el '
                    'CEE en curso (oct-2026). La ficha no tiene notas. Comercial interno: ALVARO.'},
    ('modificacion_asc', 'subvenciones'), trae_pu=PU['jrodriguez'], captador=ALVARO, lleva=ALVARO)

rellenar('rg91', 'RAMON GOMEZ DE LA SERNA 91', 'ramongomezdelaserna91', {'fecha_apertura': '2026-04-01',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia desconocido; el unico fichero es la ficha, del 02/06/2026). Contacta: Javier Rodriguez (SCHINDLER; 685 28 60 41; '
                    'javier.rodriguez.martin@schindler.com). Tipo de obra: SUST ASCENSOR. CP 28035. La ficha no tiene notas. Comercial interno: ALVARO.'},
    ('modificacion_asc',), trae_pu=PU['jrodriguez'], captador=ALVARO, lleva=ALVARO)

rellenar('re5', 'REINA 5', 'reina5', {'fecha_apertura': '2022-12-14', 'referencia_catastral': '0749016VK4704H',
    'origen_notas': 'Fecha de llegada: 12/2022 (dia: la primera nota y la oferta de Fain firmada, 14/12/2022; el "compromiso CARTEL" de feb-2022 es de plantilla). Contacta: Oscar '
                    'Fernandez (FAIN). Paga: FAIN. Tipo de obra: ASCENSOR ESCALERA PROTEGIDA + SUBV (las subvenciones se tramitan directamente con el cliente). Barrio: Justicia. '
                    'Tecnico: Susana. Fecha encargo: 15/12/2022. Jefes de obra: Manuel Requena y Abel Bernardos (FAIN). Ano 1900. CP 28004. Administracion: DAVID DE FRUTOS '
                    'ADMINISTRADOR DE FINCAS SLO S.L. (David de Frutos Garcia; C/ San Marcos 2, 2o F, 28004; 915 220 116; Frutos_gamero@yahoo.es). Presidente: Enrique Viana '
                    'Fernandez (01916761X; 626 461 682; vianaen@hotmail.com). PEM 139.493,91. Visados TL/000543/2023 y TL/001096/2023. Licencia, expediente 350/2023/02007. '
                    'Superficie 65,64 ("revisar despues de retocar el proyecto"). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=fijar('reina5', 2022),
    presi=('ENRIQUE VIANA FERNANDEZ', 'presidente', '626461682', None, 'vianaen@hotmail.com'), trae_pu=PU['ofernandez_fain'])

SR = subv('repullesyvargas7').split('\n')
rellenar('ryv7', 'REPULLES Y VARGAS 7', 'repullesyvargas7', {'fecha_apertura': '2025-05-09', 'referencia_catastral': '7838111VK3773H',
    'origen_notas': 'Fecha de llegada: 05/2025 (dia: el correo de Javier Gonzalez Moya, 09/05/2025). Contacta: Javier Gonzalez Moya (SCHINDLER; 616 991 079; '
                    'javier.gonzalez.moya@schindler.com), que pide precio de proyecto, DF + CSS + CFO + IEE + subvenciones CAM y Ayto. Paga: SCHINDLER. Tipo de obra: ASCENSOR + '
                    'CSS + SUBVENCION (subvenciones: "contratado una de cada"). Barrio: Puerta del Angel. Tecnicos: EA Indira / ER KGS. Fecha encargo: 10/10/2025 (HE de proyecto '
                    'y de subvencion firmadas). Ano 1962. CP 28011. Tramita la ECU (ACTECU). Administracion: CIRCULO VERDE (Nicolas, administrador; 608 505 307; '
                    'circuloverdepozas@gmail.com). Presidente: Carlos Guitian Rey (00135438Z; 670 735 782). PEM 83.445,85. Visado TL/016969/2025. Superficie 39,43 m2. '
                    'El COAM pide la venia del arquitecto de un proyecto anterior visado (nov-2025); en sep-2026 seguimos esperandola. En la ficha: comercial interno CARLOS GARCIA.'
                    + CAPTO_CARLOS},
    ('ascensor', 'css', 'subvenciones'), n=fijar('repullesyvargas7', 2025),
    subvencion=[('2025-10-10', SR[0] + '\n\n(Sin fecha; la de la firma de las HE de proyecto y subvencion, 10/10/2025.)'), ('2025-10-28', SR[1]), ('2025-11-17', SR[2])],
    presi=('CARLOS GUITIAN REY', 'presidente', '670735782'), trae_pu=PU['gmoya'], captador=CARLOS, lleva=ALVARO)

crb = cid_de('RIBADUMIA 4')
arreglar_pc(crb, 'rol=eq.presidente', {'nombre': 'ANA MARTINEZ GALAN', 'documento': '52862765W', 'telefono': '649149313', 'email': 'ana.martinez112@gmail.com',
                                       'notas': 'En la ficha: "2026: ANA MARTINEZ GALAN" (presidenta en 2026).'})
n = partir_m(fijar('ribadumia4', 2020), 1, 'En noviembre 2023', '2023-11-01', 'En la ficha, pegado a la nota del 02/11/2022: "En noviembre 2023..."; dia desconocido.')
rellenar('rib4', 'RIBADUMIA 4', 'ribadumia4', {'fecha_apertura': '2020-09-17', 'referencia_catastral': '8271704VK4787A',
    'origen_notas': 'Fecha de llegada: 09/2020 (dia: los primeros ficheros de Fain, 17/09/2020; el .pzh de jul-2020 de la subcarpeta de la licencia antigua es de otra obra, '
                    '"Marina Lavandeira 2"). Contacta: Oscar Fernandez (FAIN) -> ahora Miguel Angel Gomez (FAIN). Paga: FAIN. Tipo de obra: ASCENSOR (+ renovacion de subvenciones: '
                    'HE de feb-2025, jun-2025 y ene-2026, firmada 20/01/2026). Barrio: Canillejas. Tecnico: "Antiguo. Requerimientos Carla y nuevo proyecto abril 2024". Jefe de '
                    'obra: Daniel Palacios Sarmiento (FAIN; daniel.palacios@fainascensores.com). Ano 1970. CP 28022. Administracion: ANGEL GARCIA CRUZ (C/ Circe 42, 1o A, 28022; '
                    '91 742 86 97 / 659 040 472; agarcia@angelgarciacruz.es / hectorgd@angelgarciacruz.es). Presidenta (2026): Ana Martinez Galan (52862765W; 649 14 93 13; '
                    'ana.martinez112@gmail.com). Junta de San Blas-Canillejas: Marta del Saz Gonzalez, arquitecta - ingeniera superior, tecnico de distrito (915 888 016; '
                    'tecnisanblas@madrid.es); licencias 91 588 80 19. PEM 102.776,74 (noviembre 2023; "se han quitado 4000 euros de honorarios"; antes ~~106.138,08~~). Visados '
                    'TL/019589/2020 - TL/005966/2024. Expediente ~~117/2021/00180~~ (licencia denegada: sotanos ilegales) -> 350/2024/12040. Superficie 61,29. 21 viviendas + '
                    '1 local = 22. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=n, comunidad={'iban': 'ES60 2085 9287 5703 3003 1781'}, trae_pu=PU['ofernandez_fain'])

crt = cid_de('RIBOTA 11')
arreglar_pc(crt, 'rol=eq.presidente', {'nombre': 'SALUSTIANO FERNÁNDEZ SÁNCHEZ', 'telefono': '675890596',
                                       'notas': '[DATO CADUCADO] En la ficha (2024): "Salustiano Fernandez Sanchez (ojo que se va el dia 1/08)". Confirmar antes de contactar.'})
rellenar('rbt11', 'RIBOTA 11', 'ribota11', {'fecha_apertura': '2024-06-25', 'referencia_catastral': '6529406VK3762H',
    'origen_notas': 'Fecha de llegada: 06/2024 (dia: el presupuesto previo de la constructora, 25/06/2024; los escritos de 2022-2024 de la carpeta son de plantilla). Contacta: Javier '
                    '(GRUPO TREBOL; Calle Cayetano Pando 2, local 1, 28047; 699 086 641; trebol.fincas@gmail.com); pedidos docs 17/07. Paga: la CDAD PROP. Tipo de obra: MEMORIA '
                    'VALORADA: ARREGLO CUBIERTA PANEL SANDWICH (aprobado 16/07/2024; DR presentada en el Ayto 26-08-2024). Barrio: Lucero. Tecnico: ISP. CP 28047. Constructora: '
                    'Impersed (no esta en la agenda); BAUHAUS: Jeronimo (676 35 20 78). Presidente: Salustiano Fernandez Sanchez (02503427S; 675 890 596), "ojo que se va el dia '
                    '1/08" (2024). La ficha no dice comercial interno; la lleva Daniel.'},
    ('memoria_valorada', 'arreglo_cubierta'), n=fijar('ribota11', 2024), comunidad={'iban': 'ES86 2100 3465 2013 0003 5206'}, trae_pu=PU['trebol_javier'])

cro = cid_de('RICARDO ORTIZ 96')
arreglar_pc(cro, 'rol=eq.presidente', {'nombre': 'JESÚS GONZÁLEZ ADAN', 'documento': '50266342A',
                                       'notas': 'En la ficha estaba pegado al anterior, tachado (Angel Lores Fernandez). 20-03-2025: "ME ENVIAN DOC DEL NUEVO PRESIDENTE. Sofia" '
                                                '(no queda claro si Sofia es quien lo envia o la nueva presidenta).'})
pc_unico(cro, 'ANGEL LORES FERNANDEZ', 'otro', '620228154', '50660511K', None, 'Presidente ANTERIOR: tachado en la ficha (nombre, DNI y telefono).')
n = partir_m(fijar('ricardoortiz96', 2024), 4, '---------- Forwarded message', '2026-04-23',
             'Correo de Juan Jesus Valdes Martinez (Martinez Liria) del 23 de abril de 2026, pegado en la ficha a la nota del 20-03-2025.')
rellenar('ro96', 'RICARDO ORTIZ 96', 'ricardoortiz96', {'fecha_apertura': '2024-09-23', 'referencia_catastral': '4252516VK4745C',
    'origen_notas': 'Fecha de llegada: 09/2024 (dia: la primera nota, presupuesto enviado el 23/09/2024). Contacta: Javier Rodriguez Martin (SCHINDLER). Paga: SCHINDLER. Tipo de '
                    'obra: PLATAFORMA, RAMPA, ABREPUERTAS ("proyecto basico y de ejecucion para mejora de accesibilidad en planta baja en edificio residencial existente"); las '
                    'subvenciones, externalizadas ("no somos nosotros"). Tecnico: Carla -> Carlos. Ano 1967. CP 28017. DR por la ECU (ACTECU), presentada 25-06-2025. '
                    'Administracion: Administracion de Fincas La Elipa, S.L. (MARTINEZ LIRIA; Av. Marques de Corbera 8, local 3, 28017; Eva; 91 726 52 34 / 91 726 99 92 / '
                    '607 869 079; fincasmliria@gmail.com). Presidente: Jesus Gonzalez Adan (50266342A); antes, tachado, Angel Lores Fernandez. PEM 25.032,45. Visados '
                    'TL/009992/2025 y TL/013792/2026 (CFO, sep-2026). Superficie 7,17. En abr-2026 la administracion se queja de que Schindler no entrega la obra desde nov-2025 '
                    '("esta obra no la hemos visitado nunca"). En la carpeta, la IEE desfavorable con orden de ejecucion. La ficha no dice comercial interno; la lleva Daniel.'},
    ('plataforma', 'rampa', 'accesibilidad_portal'), n=n, trae_pu=PU['jrodriguez'])

rellenar('rcb10', 'RIOCABADO 10', 'riocabado10', {'fecha_apertura': '2026-01-30', 'referencia_catastral': '7330714VK3773A',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: el correo de Grupo Trebol y su presupuesto, 30/01/2026). Contacta: Javier (GRUPO TREBOL; Calle Cayetano Pando 2, local 1, 28047; '
                    'trebol.fincas@gmail.com), que pide presupuesto de proyecto de ascensor; el presupuesto que tienen es de IBERLEAN, "constructora de confianza nuestra". Tipo '
                    'de obra: ASCENSOR (con derribo de escalera; ascensor de tres personas, seis paradas, y plataforma vertical a la entrada; PEM 240.000 EUR). HE enviada con '
                    'informe a Alvaro 02/02/2026. Misma parcela catastral que Riocabado 8, 12 y 14 (7330714VK3773A): Riocabado 8 tiene su propia oportunidad (EFFIC). '
                    'Comercial interno: ALVARO.'},
    ('ascensor',), n=fijar('riocabado10', 2026, ('2026-01-30', 'Correo de Grupo Trebol del 30 de enero de 2026, con la propuesta de Daniel.')),
    adm=PU['trebol_javier'], trae_pu=PU['trebol_javier'], captador=ALVARO, lleva=ALVARO)

rellenar('rcb8', 'RIOCABADO 8', 'riocabado8', {'fecha_apertura': '2026-01-14', 'referencia_catastral': '7330714VK3773A',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: el modelo 3D, 14/01/2026; el .skb del 12/01 es de plantilla). Empresa/cliente: EFFIC (agente rehabilitador); la HE la recibe '
                    'Guillermo (EFFIC). Tipo de obra: ASCENSOR (seis paradas, tres personas, derribo de escalera completo y plataforma elevadora en la entrada; PEM 240.000 IVA '
                    'incluido). HE enviada por Alejandra a Guillermo (EFFIC) 16/01/2026. Misma parcela catastral que Riocabado 10, 12 y 14 (7330714VK3773A): Riocabado 10 tiene '
                    'su propia oportunidad (Grupo Trebol). En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), n=fijar('riocabado8', 2026, ('2026-01-16', 'Sin fecha; la propuesta de Daniel que va con la HE enviada el 16/01/2026.')),
    trae_pu=GUILLERMO_EFFIC, captador=CARLOS, lleva=ALVARO, oid_fijo=RIOCABADO8)
if RIOCABADO_UNA_OPP:
    enlazar(OPP['rcb10'][1], ACC_RIOCABADO8, 'Riocabado 8 y 10: misma parcela (7330714VK3773A); UNA opp (decision de Monica).')

crj = cid_de('RIOJANOS 4')
arreglar_pc(crj, 'rol=eq.presidente', {'rol': 'otro', 'telefono': '605841605',
                                       'notas': 'Presidente ANTERIOR: tachada en la ficha (nombre, DNI 76255241Y, telefono y correo). "Con fecha 07/05/2026 Vestalia indica que '
                                                'Soraya ya no forma parte de la comunidad." No se sabe quien es el presidente nuevo.'})
rellenar('rj4', 'RIOJANOS 4', 'riojanos4', {'fecha_apertura': '2022-07-05', 'referencia_catastral': '5511907VK4751B',
    'origen_notas': 'Fecha de llegada: 07/2022 (dia: la primera nota, 05/07/2022: precios propuestos y tramitacion de subvencion; el formulario de otorgamiento de representacion de '
                    'jun-2022 es un impreso). Contacta: ~~Sergio Godino~~ (tachado; dio el ok el 31/08/22) -> David Sanchez (FAIN). Paga: FAIN. Tipo de obra: ASCENSOR + SUBV '
                    '("proyecto igual a Riojanos 5"; ascensor hidraulico). Barrio: Puente de Vallecas. Tecnico: Susana -> requerimientos Julio. Fecha encargo: 04/10/2022. Jefes '
                    'de obra: Abel Bernardos y Manuel Requena (FAIN). CP 28018. Administracion: VESTALIA ADMINISTRADORES (pedidos docs 22/08/22; c/ Monte Oliveti 46, bajo 7, '
                    '28038; Blanca Martin Gonzalez, 914 495 497 / 630 709 010; Fattio Maldonado, 649 605 233; desde ene-2025 admin@vestaliadministradores.es y '
                    'obras@vestaliadministradores.es). Presidenta: ~~Soraya Cano Fernandez~~ (tachada; el 07/05/2026 Vestalia dice que ya no forma parte de la comunidad): no '
                    'hay presidente vigente. PEM 157.240,34 (PC 187.116 + IVA). Visado TL/017561/2022. Declaracion responsable, expediente 350/2022/08693 (registrada en 2022; en '
                    'mar-2026 el Ayto pide el CFO). En 2026 se buscan otras constructoras (Schindler pide el proyecto; "para ganar CEGA"), y la comunidad sigue negociando con '
                    'FAIN los contradictorios. Superficie 63,68. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=fijar('riojanos4', 2022), comunidad={'iban': 'ES60 0081 4265 6800 0116 4922'}, trae_pu=PU['dsanchez_fain'])

crl = cid_de('RODRIGUEZ LÁZARO 14')
ja = pc_unico(crl, 'JOSE ANTONIO', 'vecino', '669528609', None, 'joseantoniomaganwals@gmail.com', 'Persona de contacto de la comunidad (ficha, oct-2025); la comunidad no tiene administracion.')
rellenar('rl14', 'RODRIGUEZ LÁZARO 14', 'rodriguezlazaro14', dict({'fecha_apertura': '2025-10-22',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: el escaneo 3D y la HE con el informe de viabilidad, 22/10/2025). La pasa Leandro (FINCASA; fincasa@gmx.es; 690 953 948): '
                    '"esta comunidad no tiene adm de fincas y nos lo ha pasado Leandro"; Daniel pide ponerle en copia de todo, porque esta tratando de quedarse con la comunidad. '
                    'Contacto en la comunidad: Jose Antonio (669 52 86 09; joseantoniomaganwals@gmail.com). Paga: la CP. Tipo de obra: ASCENSOR INTERIOR CON DERRIBO DE ESCALERA '
                    'EN ESCALERA DE USO RESTRINGIDO (menos de ocho viviendas; ascensor de embarque simple para cuatro personas; PEM 170.000 EUR). Administracion: "No tienen de '
                    'momento". Comercial interno: DANIEL.', 'persona_comunidad_id': ja}), ('ascensor',),
    n=fijar('rodriguezlazaro14', 2025, ('2025-10-22', 'Sin fecha; va con la HE y el informe de viabilidad enviados el 22/10/2025.')), trae_pu=PU['leandro'])

crs = cid_de('RONDA DE SEGOVIA 29')
pc_unico(crs, 'CONSERJE DE LA COMUNIDAD', 'otro', '627862134', None, None, 'Conserje (ficha, 2025).')
rellenar('rsg29', 'RONDA DE SEGOVIA 29', 'rondadesegovia29', {'fecha_apertura': '2025-04-08', 'referencia_catastral': '9236504VK3793E',
    'origen_notas': 'Fecha de llegada: 04/2025 (dia: la primera nota, 08/04/2025: "Daniel ir a verlo el 10/04 con Javier Parra"). Contacta: Javier Parra (SCHINDLER; 639 351 942; '
                    'javier.parra@schindler.com). Paga: SCHINDLER. Tipo de obra: ASCENSOR BAJADA A COTA CERO + CSS + SUBV (se modifica el ascensor existente; subvenciones '
                    'contratadas 22/09/2025: "una de cada"). Barrio: Centro (la ficha). Tecnico: Jhonatan. Fecha encargo: 03/09/2025 (HE firmada). Ano 1989. CP 28005. Tramita '
                    'la ECU (ACTECU): NZ 1.1, APE.00.01, sin catalogar; DR registrada en el Ayto el 16/01/2026. Administracion: Daniel Gimenez (a traves de Javier Parra; pedidos '
                    'docs a la CP 22/09/2025; 915 301 478; daniel.g@aggadministracion.com). Presidente: Jon Azpitarte Gallastegui (78867881F; jon.azpitarte@gmail.com, "poner en '
                    'copia en todo"). Conserje: 627 862 134. PEM 74.145,91. Visado TL/004338/2026. Superficie 33,36. La ficha no dice comercial interno; la lleva Daniel.'},
    ('cota_cero', 'modificacion_asc', 'css', 'subvenciones'),
    n=partir_m(fijar('rondadesegovia29', 2025), 0, '---------- Forwarded message', '2025-07-10', 'Correo de Javier Parra (Schindler) del 10 de julio de 2025.'),
    presi=('JON AZPITARTE GALLASTEGUI', 'presidente', None, None, 'jon.azpitarte@gmail.com'), trae_pu=PU['parra'])

# Ronda de Toledo 30: en la app la comunidad se llama "RONDA DE TOLEDO 40", pero su acceso es RD TOLEDO 30 (ref 0231602VK4703A, CP 28005): es esta. Se rellena (duda).
rellenar('rt30', 'RONDA DE TOLEDO 40', 'rondadetoledo30', {'fecha_apertura': '2026-01-15', 'referencia_catastral': '0231602VK4703A',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: el correo de Antonio Mallo Medrano, 15/01/2026; el .skb del 12/01 es de plantilla). Contacta: Antonio Mallo Medrano (COAATM, '
                    'director de Estrategia y Alianzas; 685 547 139; amallo@aparejadoresmadrid.es; 91 701 45 00; no esta en la agenda), que necesita una plataforma salvaescaleras '
                    '("hay que salvar 4 escalones"). Tipo de obra: PLATAFORMA SALVAESCALERAS. En mar-2026, tras el estudio de Carlos, la administradora, que nos conoce, contacta '
                    'con Daniel: ATIKO (Maria Jose; C. del Amparo 86, 28012; 912 98 20 05). Presidente: Miguel Romero (616 979 108). En la app la comunidad se llama "RONDA DE '
                    'TOLEDO 40", pero su acceso es Ronda de Toledo 30 (ref. 0231602VK4703A), la de la carpeta y la del correo: errata en el nombre, pendiente de renombrar. '
                    'En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('plataforma',), n=fijar('rondadetoledo30', 2026, ('2026-01-15', 'Correo de Antonio Mallo Medrano (COAATM) del 15 de enero de 2026.')),
    presi=('MIGUEL ROMERO', 'presidente', '616979108'), adm=PU['atiko_mj'], captador=CARLOS, lleva=ALVARO)

crf = cid_de('RUFINO BLANCO 20')
arreglar_pc(crf, 'rol=eq.presidente', {'nombre': 'MARIA ANGELA VICENTE DE FRUTOS'})
ml = pc_unico(crf, 'MARIA LUISA', 'vecino', '622397005', None, None, 'Vecina que contacta (ficha, nov-2024).')
rellenar('rb20', 'RUFINO BLANCO 20', 'rufinoblanco20', dict({'fecha_apertura': '2024-11-28', 'referencia_catastral': '3655205VK4735F',
    'origen_notas': 'Fecha de llegada: 11/2024 (dia: la primera nota y las primeras fotos, 28/11/2024; la IEE de 2020 y las ofertas de Schindler de 2021 de la carpeta son papeles '
                    'previos de la comunidad). Contacta: la vecina Maria Luisa (622 397 005). Paga: la CP. Tipo de obra: ASCENSOR (derribo del tiro de escaleras, ascensor interior '
                    'invadiendo el patio izquierdo con pasarela; torre de vidrio traslucido) + subvenciones (HE de proyecto + subv enviada 20/12/2024; HE recibida firmada '
                    '07/01/2026; se da precio de CSS). Tecnico: Jhonatan -> Carlos (requerimientos). Ano 1925. CP 28028. Tramita la ECU (ACTECU); en jun-2026 se pone en pausa '
                    'hasta que conteste. Administracion: FINCAS NAVARRO (Carlos Navarro Olmeda; Avda Brasilia 3, 6o A, 2a escalera, 28028; 660 513 717; '
                    'administracion@fincasnavarro.es). Presidenta: Maria Angela Vicente de Frutos (50827878V; 626 50 07 53). Superficie 134,04. La ficha no dice comercial '
                    'interno; la lleva Daniel.'}, **trae(ml)), ('ascensor', 'subvenciones'),
    n=fijar('rufinoblanco20', 2024, otros={4: ('2025-11-07', 'En la ficha "7/11" sin ano, entre las notas del 19/11/2025 y el 07/01/2026: es de 2025 (habla de la HE de '
                                                           'subvenciones de nov-2025).')}),
    comunidad={'iban': 'ES79 0081 1543 8400 0175 2886'})

# ================================================================= 2. CLON
nf38 = partir_m(fijar('rafaelfinat38', 2023), 0, 'Junio 2024', '2024-06-01', 'Dia desconocido: "Junio 2024".')
nrz = [('2022-04-29', bloque('rueza32/FICHA DATOS TECNICOS.docx', 112, 195)), ('2022-12-14', bloque('rueza32/FICHA DATOS TECNICOS.docx', 196, 197)),
       ('2023-02-02', bloque('rueza32/FICHA DATOS TECNICOS.docx', 198, 199)), ('2023-03-30', bloque('rueza32/FICHA DATOS TECNICOS.docx', 200, 203))]
GORDILLO = 'JOSE GORDILLO'
RM = ('RIBERA DEL MANZANARES %s MADRID. Fecha: 01/2023 (dia: la nota del 02/01/2023). Contacto: Jose Gordillo (la ficha no dice de que empresa ni da telefono). Tipo de obra: %s. '
      'Distrito Moncloa-Aravaca. La ficha solo tiene esa nota. La ficha no dice comercial interno.\n\n')
REVS = [
    ('rafaelfinat38', '2023-05-25', 'ALFREDO CABRERO (FAIN)', 'H28956415', '4806516VK3740F',
     'RAFAEL FINAT 38 MADRID. Fecha: 05/2023 (dia: la primera nota y el croquis, 25/05/2023; las fotos que manda Fain son de may-2022). Paga: FAIN (Alfredo Cabrero; 652 142 151; '
     'alfredo.cabrero@fainascensores.com). Tipo de obra: PLATAFORMA. Distrito Latina. Tecnico: Susana. CP 28044. Ano 1969. Administracion a 30/06/2025: APR Administradores (C/ '
     'Sanguino 6, local, 28044; 910 073 755 y 625 474 607; comunidades@apradministradores.com) - no esta en la agenda; antes, tachada, ADMINISTRACIONES ATB (Angel Abejon Banos; '
     'Av. de las Aguilas 93; 915 094 462; administratb@telefonica.net). Comunidad: CDAD PROP CL RAFAEL FINAT 38 (CIF H28956415; en la ficha, tachado, "E28956415"). Presidente: '
     'Jesus Parra Elvar (70708598C; 620 198 695). Junta de Latina: "solo con cita previa, pedir online". PEM 24.043,23. Visado TL/017369/2023. Expediente 350/2023/37615. DR '
     '26/10/2023 (SLIM); DR NUEVA registrada 21/10/2025, con tasas pagadas. Superficie 31,91 m2. En produccion hay RAFAEL FINAT 17, no el 38. La ficha no dice comercial '
     'interno.\n\n' + J(nf38)),
    ('rafaelfinat87', '2015-01-02', 'PEDRO ARANDA (THYSSEN)', None, None,
     'RAFAEL FINAT 87 MADRID. Fecha: 02/01/2015 (la de la ficha; los ficheros son de ene-2015). Tipo de obra: ASCENSOR EN PLANTA. Ficha sin contactos; en notas, la lista de '
     'trabajos: ' + bloque('rafaelfinat87', 69, 79).replace('\n', '; ') + '.'),
    ('rafaelsalazaralonso', '2016-09-11', 'LUIS MIGUEL NUNES (THYSSEN)', 'H79136156', None,
     'RAFAEL SALAZAR ALONSO 7 MADRID. Fecha: la ficha dice "10/0/2016"; el correo de Luis Miguel Nunes (Thyssen) pegado en ella es del "11 sept." (2016, el ano de la ficha); se '
     'toma esa (el "compromiso CARTEL" de la carpeta es de plantilla). Propiedad: CDAD PROPIETARIOS GARAJES DE UNIDAD RESIDENCIAL MONTSERRAT (CIF H79136156). CP 28007. Ref. '
     'catastral en la ficha: "34423 Z9 VK4734C". PEM 30.000 (residuos 300). Superficie 18,20 m2. Distrito 03 - Retiro: Junta de Retiro (Av. Ciudad de Barcelona 162), tecnico '
     'Angel Delgado Gallardo (visitas lunes, miercoles y viernes de 9 a 11; 91 588 63 30). Correo de Nunes: "Muchas gracias por gestionarlo con Anylor. Me han pasado el '
     'presupuesto ... pero parece ser que no han podido llegar a los 26000 EUR que comentamos... Crees que se puede hacer el proyecto por 3000 EUR como te comente?". En la '
     'carpeta, proyecto y obra; fin de obra visado TL-005764-2019 (mar-2019).'),
    ('ramonazorin41', '2024-10-16', 'GRUPO TREBOL', None, None,
     'RAMON AZORIN 41 MADRID. Fecha: 10/2024 (dia: la nota del 16/10/2024; el unico fichero es la ficha). Contacta: GRUPO TREBOL. Tipo de obra: CAMBIO CUBIERTA. Persona de '
     'contacto: Angel (653 324 899). La ficha no dice comercial interno.\n\n' + crudo('ramonazorin41', 2024)),
    ('ramongomezdelaserna1', '2026-09-29', 'JAVIER RODRIGUEZ (SCHINDLER)', None, None,
     'RAMON GOMEZ DE LA SERNA 1 MADRID. Fecha: 09/2026 (dia: la ficha, 29/09/2026, el unico fichero). Contacta: Javier Rodriguez (SCHINDLER). Tipo de obra: SUSTITUCION 6 '
     'ASCENSORES. La ficha no tiene notas. Comercial interno: ALVARO.'),
    ('ramongomezdelaserna103', '2021-09-28', 'ANTONIO MIRA (ANYLOR)', 'Q2868318C', None,
     'RAMON GOMEZ DE LA SERNA 103 MADRID - COLEGIO PUBLICO ALHAMBRA. Fecha: la ficha dice xx/2021 (encargo: octubre 2021); los primeros ficheros (CIF del colegio y presupuesto '
     'firmado) son del 28/09/2021; se toma esa. Paga: ANYLOR (Antonio Mira). Tipo de obra: INSTALACION DE ASCENSOR EN EDIFICIO EDUCATIVO EXISTENTE (en un hueco que ya estaba '
     'preparado; muy poca albanileria; linea electrica de unos 30 m desde el cuadro del colegio). Distrito Fuencarral-El Pardo. Tecnico: Fernan. CP 28035. CIF Q2868318C. '
     'Expediente colegio TL/017703/2021. Superficie 14,31. En la carpeta, el fin de obra visado TL-000639-2022 (ene-2022). La ficha no tiene notas.'),
    ('ramongomezdelaserna115-117-119', '2023-02-23', 'JOSE VICENTE (LORMAN)', None, None,
     'RAMON GOMEZ DE LA SERNA 115, 117 Y 119 MADRID. Fecha: 02/2023 (dia: la primera nota, 23/02/2023). Paga: la CDAD. Tipo de obra: SATE Y CALDERA, SUBVENCION IBERDROLA. '
     'Administracion: LORMAN (Jose Vicente). Hay fotos y videos (27/02/2023). La subcarpeta "0.COPIA ESTRUCTURA DE CARPETAS_NOMBRE PROYECTO Asc" (dic-2025) es una copia de la '
     'estructura de carpetas con la ficha en blanco ("DANIEL O CARLOS"): sin datos. La ficha no dice comercial interno.\n\n' + crudo('ramongomezdelaserna115-117-119', 2023)),
    ('ramongomezdelaserna121', '2022-11-10', 'JOSE VICENTE (LORMAN)', None, '8618937VK3881F',
     'RAMON GOMEZ DE LA SERNA 121 MADRID. Fecha: 11/2022 (dia: la fecha de encargo de la ficha, 10/11/22). Paga: la CDAD. Tipo de obra: SUBVENCION (11/2022) y SATE (02/2023). '
     'Distrito 08 - Fuencarral-El Pardo (Penagrande). CP 28035. Administracion: LORMAN (Jose Vicente; C/ de Mostoles 36, 28943 Fuenlabrada; 916 06 49 13; lormanad@gmail.com). '
     'Contacto: Ricarda (685 80 75 39, 02/2023; ricogady@yahoo.es). En la carpeta, un calculo de deflexiones de ene-2021. La ficha no dice comercial interno.\n\n'
     + crudo('ramongomezdelaserna121', 2022)),
    ('ramongomezdelaserna79-81-83', '2022-04-28', 'JOSE VICENTE (LORMAN)', None, None,
     'RAMON GOMEZ DE LA SERNA 79-81-83 MADRID. Fecha: la ficha dice 05/2022; la nota de la visita es del 28/04/22; se toma esa. Tipo de obra: SOLO FV. Administracion: LORMAN '
     '(Jose Vicente). Contacto: el conserje, Alfredo (680 462 911). La ficha no dice comercial interno.\n\n' + crudo('ramongomezdelaserna79-81-83', 2022)),
    ('recalde4', '2023-12-04', 'OLIVARES (ROSERSESE)', None, None,
     'RECALDE 4 MADRID. Fecha: 12/2023 (dia: la nota de la HE enviada, 04/12/2023). Contacta: Olivares (ROSERSESE). La ficha no dice tipo de obra. Distrito 15 - Ciudad Lineal '
     '(Pueblo Nuevo). La ficha no dice comercial interno.\n\n' + crudo('recalde4', 2023)),
    ('recalde9', '2022-11-22', 'OLIVARES (ROSERSESE)', None, None,
     'CALLE RECALDE 9 MADRID. Fecha: 11/2022 (dia: la nota de la visita, 22/11/22). Paga: OLIVARES. Tipo de obra: ASCENSOR (render ofrecido, derribo de escalera). CP 28017. '
     'La ficha no dice comercial interno.\n\n' + crudo('recalde9', 2022)),
    ('redentor9', '2026-06-03', 'EUGENIO PLATONOV (GRADCOM)', None, None,
     'REDENTOR 9 MADRID. Fecha: 06/2026 (dia: el escaneo 3D, 03/06/2026). Contacta: Eugenio (GRADCOM; 617 316 634; eugenio.platonov@gmail.com). Tipo de obra: ASCENSOR CON '
     'DERRIBO (doble embarque a 90 grados, cinco paradas, cinco personas; contadores a armario homologado; PEM estimado 220.000 EUR + IVA; "honorarios pactados con Eugenio"). '
     'Comercial interno: DANIEL.\n\n' + cl('redentor9', 2026, ('2026-06-08', 'Sin fecha; la propuesta de Daniel que va con la viabilidad enviada el 08-06-26.'))),
    ('ribadesella16', '2026-05-05', 'FRANCISCO (PRESIDENTE)', None, None,
     'RIBADESELLA 16 MADRID. Fecha: 05/2026 (dia: la nota, 5-05-26). Tipo de obra: "AS". Presidente: Francisco (fgomezpsm@gmail.com). Comercial interno: DANIEL.\n\n'
     + crudo('ribadesella16', 2026)),
    ('riberadelmanzanares11', '2023-01-02', GORDILLO, None, None, RM % ('11', 'SATE + FV (calderas individuales)') + crudo('riberadelmanzanares11', 2023)),
    ('riberadelmanzanares21', '2023-01-02', GORDILLO, None, None, RM % ('21', 'SATE + CALDERA COMUNITARIA IBERDROLA') + crudo('riberadelmanzanares21', 2023)),
    ('riberadelmanzanares67', '2023-01-02', GORDILLO, None, None, RM % ('67', 'SATE + FV (sin caldera comunitaria; "solo sate y cubierta")') + crudo('riberadelmanzanares67', 2023)),
    ('riberadelmanzanares69', '2023-01-02', GORDILLO, None, None, RM % ('69', 'SATE + FV (sin caldera comunitaria; en la nota tambien ASCENSOR)') + crudo('riberadelmanzanares69', 2023)),
    ('riberadelmanzanares85', '2023-01-02', GORDILLO, None, None, RM % ('85', 'SATE + FV (calderas individuales)') + 'La ficha antigua de 2016 (Enor) de la subcarpeta '
     '"riberadelmanzanares85 antiguo" va en su fila: riberadelmanzanares85 (2016).\n\n' + crudo('riberadelmanzanares85', 2023)),
    ('riberadelmanzanares5', '2023-10-31', 'ANA ENCINAS (ELECNOR)', None, None,
     'CALLE RIBERA DE MANZANARES 5 MADRID. Fecha: 10/2023 (dia: la nota del 31/10/2023; las fotos que aporta Elecnor son del 30/10/2023). Paga: ELECNOR (Ana Encinas). Tipo de '
     'obra: SATE, CUBIERTA, ASCENSOR Y FV ("asc + css + subvenciones"; no quieren que el ascensor baje al -1 de trasteros). Distrito 09 - Moncloa-Aravaca (Casa de Campo). HE '
     'enviada otra vez el 11-12-2023. La ficha no dice comercial interno.\n\n' + crudo('riberadelmanzanares5', 2023)),
    ('ricardoortiz44', '2024-06-05', 'MIGUEL ANGEL GOMEZ PEREZ (FAIN)', None, None,
     'RICARDO ORTIZ 44 MADRID. Fecha: 05/2024 (dia: la nota y los ficheros del proyecto del otro arquitecto, 05/06/2024). Paga: FAIN (Miguel Angel Gomez Perez; 654 042 742; '
     'miguelangel.gomez@fainascensores.com). Tipo de obra: DF Y CSS (proyecto externo, ya con licencia por procedimiento ordinario). Tecnico: EXTERNO. La ficha no dice '
     'comercial interno.\n\n' + crudo('ricardoortiz44', 2024)),
    ('riojanos5bis', '2016-11-06', 'JUAN LUIS (ENOR)', 'H79615514', '5412902VK4751A',
     'RIOJANOS 5 BIS MADRID. Fecha: NOVIEMBRE 2016 (dia: el primer fichero, el ascensor, 06/11/2016). Agente: Juan Luis, con ENOR. Tipo de obra: ascensor (proyecto visado '
     'TL-020214-2016; licencia may-2017; obra 2017-2018 con certificaciones). Distrito 13 - Puente de Vallecas. NZ 3.2. CP 28018. Administracion: VESTALIA ADMINISTRADORES '
     '(Blanca; 630 70 90 10; ~~vestaliadmonfincas@yahoo.es~~; desde ene-2025, admin@vestaliadministradores.es y obras@vestaliadministradores.es). Fachada 24,43 m. PEM 100.250 '
     '(con 19% gastos 119.297 EUR; residuos 300). Superficie 55,06. Subvencion (2020): Blanca pide incluir en el Anexo I los costes indirectos (tasa de prestacion urbanistica '
     '607 EUR de 23/11/16; IEE 181,50 EUR de 25/10/16). En la carpeta, un requerimiento de jul-2022 y un presupuesto de oct-2024. En produccion esta RIOJANOS 4 (su ficha: '
     '"proyecto igual a Riojanos 5").'),
    ('riosalado6', '2022-11-28', 'DANIEL ALEJANDRO DIAZ PEREZ (SCHINDLER)', 'H82787359', '4810105VK4741B',
     'RIO SALADO 6 MADRID. Fecha: la ficha dice 12/2022; los primeros ficheros (datos del edificio para el CEE) son del 28/11/2022; se toma esa. Paga: SCHINDLER (Daniel '
     'Alejandro Diaz Perez). Tipo de obra: SOLO SUBV ACCESIBILIDAD ("favor a un comercial de Schindler"; el proyecto es de otro arquitecto). Distrito 13 - Puente de Vallecas '
     '(Portazgo). CP 28018. Jefe de obra: Manuel Crespo (Schindler). Ano 2000. Contacto: Maria Espinosa (679 441 037; mariavallekas@gmail.com). En la carpeta, CIO y CFO '
     '(jun-2025), subvenciones CAM 2023 y CAM 2025 (requerimientos hasta ene-2026) y "Rehabilita NO: no cumple cond. edif. ano 2000" (feb-2026).\n\n' + crudo('riosalado6', 2022)),
    ('riosegura8', '2026-01-13', 'BELEN SABUGO TORIBIO (SMFINCAS)', None, None,
     'RIO SEGURA 8 MADRID. Fecha: 01/2026 (dia: la ficha, 13/01/2026, el unico fichero). Contacta: Belen Sabugo Toribio (SMFINCAS Administradores de Comunidades SL; 625 886 456; '
     'info@smfincas.es). Tipo de obra: SATE + CUBIERTA + SUBV. Presidente: Gonzalo Guinot ("se encarga su hija Maria del Mar": 626 115 618; mmguifer@gmail.com). La ficha no '
     'tiene notas. En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS),
    ('rodriguezsanpedro13duplicado', '2024-05-28', 'SILVIA ARRIBAS (ARRIALSI)', None, None,
     'RODRIGUEZ SAN PEDRO 13 MADRID (la carpeta se llama "rodriguezsanpedro13duplicado"; no hay otra carpeta de esa direccion). Fecha: 05/2024 (dia: la nota de la visita, '
     '28/05/2024). Paga: la CDAD PROP. Tipo de obra: PLATAFORMA CON OCUPACION DE LOCAL. Administracion: ARRIALSI (Silvia Arribas; Camino de Ganapanes 35, local AF, 28035; '
     '91 730 70 33 / 665 805 356; info@arrialsi.com). La ficha no dice comercial interno.\n\n' + crudo('rodriguezsanpedro13duplicado', 2024)),
    ('rondadelsur179', '2025-01-24', 'PEDRO ESCALONA (DEL BRIO Y BLANCO)', None, None,
     'RONDA DEL SUR 179 MADRID. Fecha: la ficha dice 02/2025; la primera nota es del 24/01/2025; se toma esa. Paga: la CDAD PROP. Tipo de obra: ASCENSOR CON DERRIBO (doble '
     'embarque a 180 grados, 5 personas; rampa en la entrada; unos 175.000 EUR). Administracion: DEL BRIO Y BLANCO (Pedro Escalona; Carlos Martin Alvarez 65 bis, 1o B, 28018; '
     '91 477 41 91 - 91 478 69 11; 680 503 243; pedro@delbrioyblanco.es). Presidente: Jose (699 357 396). Fotos del escaneo del 06/02/2025. La ficha no dice comercial '
     'interno.\n\n' + crudo('rondadelsur179', 2025)),
    ('rueza32', '2022-03-14', 'DAVID HERNANDEZ ORTEGA (VECINO); VIENE DE SILVIA, APAREJADORA DE ELECNOR', None, None,
     'CALLE RUEZA 32 MADRID. Fecha: la ficha dice 04/2022; la visita con los vecinos (Enrique Alejo y Daniel) fue "el 14 de marzo" (2022); se toma esa. Paga: la CDAD, con '
     'Iberdrola. Tipo de obra: SATE + FV + CALDERA (comunidad de viviendas en altura; presupuesto de SATE de 350.252 EUR, rebajado a 85 EUR/m2; tambien la via para cerrar '
     'las calles del complejo: convenio urbanistico con la Junta de Latina). CP 28011. Contacto: David Hernandez Ortega, vecino (607 608 354; koaladavid@hotmail.com). En 2023, '
     'Iberdrola presenta su oferta a los vecinos. La ficha no dice comercial interno.\n\n' + J(nrz)),
]
for carp, fecha, trajo, cif, ref, t in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV,
         comercial='Alvaro' if carp in ('ramongomezdelaserna1', 'riosegura8') else 'Daniel')

for carp, fecha, trajo, t, *ruta in [
        ('ramongomezdelaserna101', '2021-12-02', None, 'RAMON GOMEZ DE LA SERNA 101 MADRID. Carpeta SIN ficha de datos: solo una oferta de SATE (subcarpeta SATEFV, 02/12/2021): '
         'SATE de 10 cm en fachada y losa filtrante con aislamiento en cubierta, "subir dos letras en certificado energetico", 81.600 EUR mas IVA.'),
        ('ramonsainz29', '2016-06-02', 'PEDRO ARANDA (THYSSEN)', 'RAMON SAINZ 29 MADRID. Fecha: 02/06/2016 (la de la ficha). Ficha vacia ("OJO!!!!!! DE LAS ANTIGUAS"; '
         'mediador: Luis Miguel, 635 615 580); hay borrador de escalera (jun-jul 2016).'),
        ('RAMPAS', '2017-10-26', None, 'RAMPAS (sin direccion). Carpeta SIN ficha de datos: solo un presupuesto y mediciones de rampas (26/10/2017).'),
        ('realdepinto30', '2015-11-22', None, 'REAL DE PINTO 30 MADRID. Carpeta SIN ficha de datos: solo borradores de escalera (22/11/2015).'),
        ('riberadelmanzanares85 (2016)', '2016-05-12', 'FELIPE OSADO (ENOR)', 'RIBERA DEL MANZANARES 85 MADRID (ficha antigua de 2016, subcarpeta "riberadelmanzanares85 '
         'antiguo"). Fecha: 12/05/2016 (la de la ficha). Ficha vacia; hay borrador de escalera y croquis (jun-jul 2016). La ficha de 2023 (SATE + FV) va en la fila '
         'riberadelmanzanares85.', B.join(['MADRID', 'riberadelmanzanares85', 'riberadelmanzanares85 antiguo'])),
        ('riocabado12', '2016-06-15', 'FELIPE OSADO (ENOR)', 'CALLE RIO CABADO 12 MADRID. Fecha: 15/06/2016 (la de la ficha). Ficha vacia salvo el contacto: Pedro Navarro, '
         '4o A (649 780 627; 914 638 225). Hay croquis, borrador de escalera, valoracion y presupuesto (jul-2016). En la carpeta, una foto de WhatsApp del 29/01/2026: en '
         'produccion estan Riocabado 8 y Riocabado 10 (ene-2026), con la misma parcela catastral (7330714VK3773A).'),
        ('riomiño4', '2022-03-07', None, 'RIO MIÑO 4 MADRID. Carpeta SIN ficha de datos: solo el calculo de deflexiones (ION 95002753-1 rev1, 07/03/2022).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t, ruta=ruta[0] if ruta else None)

# ================================================================= 3. MANIAS
mania('San Blas-Canillejas: para la licencia del ascensor piden el Estudio Basico de Seguridad y Salud VISADO.', 'Junta Municipal de Distrito de San Blas-Canillejas',
      '2023-11-01', 'ribadumia4', clave='rib4', trozo='EBSS quieren')
mania('Aunque el requerimiento da 3 meses para contestar, lo quiere ya y sin el menor fallo; contestacion detallada punto por punto, o lo echa para atras.',
      'Junta Municipal de Distrito de San Blas-Canillejas', '2023-11-01', 'ribadumia4', clave='rib4', trozo='lo quiere ya', tecnico='Marta del Saz González')
mania('Rampa de entrada en terreno publico: sin la autorizacion demanial deniegan la declaracion responsable.', 'Ayuntamiento de Madrid',
      '2024-12-03', 'ricardoortiz96', clave='ro96', trozo='Autorización demanial')
mania('Plataformas elevadoras en edificios existentes: se admiten aunque sus puertas invadan el ancho de circulacion (DA DB-SUA/2), si se justifica que no hay otra '
      'alternativa tecnica o economicamente viable.', 'Ayuntamiento de Madrid (consulta de la ECU, ACTECU)', '2025-02-18', 'ricardoortiz96', clave='ro96', trozo='DA DB-SUA')
mania('Edificio en un APE (APE.00.01): por DR, pero hay que justificar los Criterios Generales de la CPPHAN y acreditar el estado previo con los antecedentes.',
      'ECU (ACTECU) / Patrimonio (CPPHAN)', '2025-10-22', 'rondadesegovia29', clave='rsg29', trozo='CPPHAN')

if not ESCRIBIR:
    print('Propuestas: RIOCABADO_UNA_OPP=%s (Riocabado 8 y 10, misma parcela, se rellenan por separado). RONDA DE TOLEDO 40 = Ronda de Toledo 30 (errata en el nombre).'
          % RIOCABADO_UNA_OPP)
resumen()
