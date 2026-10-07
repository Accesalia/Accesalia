# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda L2 (lopezgrass66 .. luruaco1, 29 carpetas [29:58] de la L). 7-oct-2026. Sin --escribir: marcha en seco.
# La L1 [0:29] la prepara otro agente a la vez.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de

TREBOL = '1dc85bf6-c0ef-4aae-94b9-ad65db1e15cd'; SALLET = 'd47bb7e7-498d-4111-9ec7-2ecfeb476411'
PU.update(vanesa_dbb='05cda534-6907-43b0-b674-53cbe143a278', eugenio='936c434b-80dd-4b4f-8e50-b47f8ea3ebce', dpardo='0840a548-450c-436d-ba13-3a8a4a96894c')


def relevar_admin(cid, emp_viejo, puesto_nuevo, nota, hasta=None):
    """la administracion vigente esta TACHADA en la ficha: deja de ser vigente y entra la nueva."""
    for a in b.leer('comunidad_admin_responsable?select=id&vigente=eq.true&empresa_id=eq.%s&comunidad_id=eq.%s' % (emp_viejo, cid)):
        act('comunidad_admin_responsable?id=eq.' + a['id'], dict({'vigente': False, 'notas': nota}, **({'hasta': hasta} if hasta else {})))
    emp = EMPRESA_DE.get(puesto_nuevo) or b.leer('puesto?select=empresa_id&id=eq.' + puesto_nuevo)[0]['empresa_id']
    if not b.leer('comunidad_admin_responsable?select=id&vigente=eq.true&empresa_id=eq.%s&comunidad_id=eq.%s' % (emp, cid)):
        ins('comunidad_admin_responsable', [{'comunidad_id': cid, 'empresa_id': emp, 'puesto_id': puesto_nuevo, 'vigente': True}])


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))

# ================================================================= 0. AGENDA (solo en empresas, contratas y organismos que ya existen; ninguna junta nueva)
MARIBEL = persona_nueva('Maribel', None, 'administradora de fincas', None, None, empresa=TREBOL,
                        notas_='Grupo Trebol: escribe por Lucero 10 (correo de trebol.fincas@gmail.com, 10/03/2026; carpeta lucero10).')
# FINCAS ESPINOSA: administracion nueva de Luis Ruiz 4 (comunidad de produccion); alta como ADMONPATRIMONIOS en madrid_g1 (Monica, 7-oct-2026).
ESPINOSA = (b.leer('empresa?select=id&nombre_accesalia=eq.' + quote('FINCAS ESPINOSA')) or [{'id': None}])[0]['id']
if not ESPINOSA:
    ESPINOSA = nuevo_id()
    ins('empresa', [{'id': ESPINOSA, 'nombre_accesalia': 'FINCAS ESPINOSA', 'tipo': 'administracion_fincas', 'activa': True, 'comercial_id': DANIEL,
                     'notas': 'Alta en el barrido de Madrid (Luis Ruiz 4: nueva administracion de la comunidad, nota del 30-09-2026; carpeta luisruiz4).'}])
DAVID_ESP = persona_nueva('David', None, 'administrador', '614135139', 'david@fincasespinosa.com', empresa=ESPINOSA,
                          notas_='Fincas Espinosa: administrador de Luis Ruiz 4 desde sep-2026 (sustituye a Sallet; carpeta luisruiz4).')

# ================================================================= 1. PRODUCCION (7)
n = fijar('lorenzana14', 2026, ('2026-04-06', 'Sin fecha; la propuesta de Daniel que va con la HE e informe enviados el 06-04-2026.'))
n = partir(n, 2, '7-04-2026', '2026-04-07')
rellenar('lor14', 'LORENZANA 14', 'lorenzana14', {'fecha_apertura': '2026-03-25',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia: la foto de WhatsApp del 25/03/2026, el primer fichero). Contacta: Eugenio Platonov (GRADCOM; en la ficha "GRADCON"; 617 316 634; '
                    'eugenio.platonov@gmail.com), que pasa los datos de la comunidad para enviarle a ella la HE con el en copia. Paga la CP. Tipo de obra: ASCENSOR CON DERRIBO (derribo completo de '
                    'la escalera; elevador de 0,15 m/s, 4 personas y 4 paradas; plataforma elevadora vertical especial en planta baja; mover la puerta del portal; cambiar contadores; PEM aproximado '
                    '165.000 EUR + IVA) + SUBVENCIONES. Contacto de la comunidad: Rosa (676 239 596; rosanat1104@gmail.com). HE con informe enviada 07-04-2026. Hay escaneo 3D. Comercial interno: DANIEL.'},
    ('ascensor', 'subvenciones'), n=n, trae_pu=PU['eugenio'])
pc(OPP['lor14'][0]['id'], 'ROSA', 'otro', '676239596', None, 'rosanat1104@gmail.com', 'Persona de contacto de la comunidad (ficha del ascensor, 2026).')

n = partir(fijar('lospeñascales17', 2025, ('2025-10-14', 'Correo de Vanesa (Del Brio y Blanco) del 14 de octubre de 2025.')), 1, '31/10/2025', '2025-10-31')
rellenar('pen17', 'LOS PEÑASCALES 17', 'lospeñascales17', {'fecha_apertura': '2025-10-14', 'referencia_catastral': '3552504VK4735D',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: el correo de Vanesa, 14/10/2025, que pide la visita de viabilidad "siguiendo instrucciones de Alejandra"). Contacta: Vanesa (DEL BRIO Y BLANCO; '
                    'C/ Carlos Martin Alvarez 65 bis, 1o B; 665 256 447 / 914 774 191; vanesa@delbrioyblanco.es). Paga la CP. Tipo de obra: ELEVADOR VERTICAL + SUBV: sustituir el elevador inclinado '
                    'por uno vertical con pasarela (51.000 EUR + IVA estimados); "Proyecto basico y de ejecucion para mejora de accesibilidad en planta baja en edificio residencial existente". '
                    'Barrio: Fuente del Berro. Tecnico: Jhonatan (CEE: Angela). Fecha encargo: 26/12/2025 (HE recibida firmada). Ano 1966. DR por ECU (ACTECU), registrada 02/07/2026. Contrata: '
                    'MATEDECON. Presidente: Luis Blanco Abruna (690 285 488); portero: Jose Pedro Nieto (655 125 056). PEM 37.975,33. Visado TL/010537/2026. Superficie 23,58. La obra empieza en '
                    'sep-2026 (primera acta de obra en la carpeta, 14-09-2026). Comercial interno: ALVARO.'},
    ('accesibilidad', 'plataforma', 'df', 'subvenciones'), n=n, comunidad={'iban': 'ES23 0081 7115 1100 0163 4265'},
    presi=('LUIS BLANCO ABRUÑA', 'presidente', '690285488', '50872574R'), trae_pu=PU['vanesa_dbb'], captador=ALVARO, lleva=ALVARO)
pc(OPP['pen17'][0]['id'], 'JOSE PEDRO NIETO', 'otro', '655125056', None, None, 'Portero de la finca (correo de la administracion del 14/10/2025).')

rellenar('rio25', 'LOS RIOJANOS 25', 'losriojanos25', {'fecha_apertura': '2026-03-31',
    'origen_notas': 'Fecha de llegada: la ficha dice 04/2026; el correo de Vanesa pidiendo presupuesto de la IEE es del 31/03/2026; se toma esa. Contacta: Vanesa (DEL BRIO Y BLANCO; C/ Pena de la '
                    'Miel 1, bajo; vanesa@delbrioyblanco.es). Tipo de obra: IEE. La ficha no tiene mas datos. Comercial interno: ALVARO.'},
    ('iee',), n=fijar('losriojanos25', 2026, ('2026-03-31', 'Correo de Vanesa (Del Brio y Blanco) del 31 de marzo de 2026.')),
    adm=PU['vanesa_dbb'], trae_pu=PU['vanesa_dbb'], captador=ALVARO, lleva=ALVARO)

rellenar('urq10', 'LOS URQUIZA 10', 'losurquiza10', {'fecha_apertura': '2022-11-03', 'referencia_catastral': '5361905VK4756A',
    'origen_notas': 'Fecha de llegada: 11/2022 (dia: la primera nota, 03/11/2022: Diego, de Coinsa, pide ir a verlo y presupuestar; la obra ya estaba aceptada por la comunidad). Contacta: Diego Pardo '
                    'y Javier (COINSA; 91 765 92 88 directo; coinsa@ascensorescoinsa.com). Tipo de obra: PLATAFORMA VERTICAL (mejora de accesibilidad en planta baja). Barrio: Pueblo Nuevo. '
                    'Tecnico: Fernan. Jefe de obra: Javier Garcia. Administracion: MARIANO PEREZ CERREDA (Anabel Pescoso Berroa; Alcala 323, 1o C; 913 266 750; info@despachomarianoperez.es y '
                    'oficina@despachomarianoperez.es). Presidenta: Maria Natividad Amor Navarro (609 276 481). Junta de Ciudad Lineal (C/ Hermanos Garcia Noblejas 16): tecnica Laura Barrionuevo '
                    '(91 588 75 13); Unidad de Servicios Tecnicos, tecniclineal@madrid.es. Declaracion responsable (NZ 4). Expediente 350/2022/16042. PEM 16.873,95. Visados TL/021182/2022 y '
                    'TL/002206/2024. Superficie 13,01. En la carpeta: actas de obra con Coinsa (sep-dic 2023), prorroga de ejecucion pedida el 12/12/2023 y fin de obra visado y presentado en el Ayto '
                    '(feb-2024). Comercial: DANIEL.'},
    ('plataforma', 'df'), n=fijar('losurquiza10', 2022), presi=('MARIA NATIVIDAD AMOR NAVARRO', 'presidente', '609276481'), trae_pu=PU['dpardo'])

rellenar('luc10', 'LUCERO 10', 'lucero10', {'fecha_apertura': '2026-03-10',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia: el correo de Grupo Trebol, 10/03/2026; los renders de estilos de portal de ene-2026 de la carpeta son de plantilla). Contacta: Maribel '
                    '(GRUPO TREBOL; C/ Cayetano Pando 2, local 1, 28047; trebol.fincas@gmail.com). Tipo de obra: ASCENSOR (viabilidad). Contacto de la comunidad: Irene (660 117 742). HE enviada a '
                    'Iberlean por indicacion de Daniel (25-03-2026). Hay escaneo 3D (mar-2026). Comercial interno: ALVARO.'},
    ('ascensor',), n=fijar('lucero10', 2026, ('2026-03-10', 'Correo de Grupo Trebol (Maribel) del 10 de marzo de 2026.')), adm=MARIBEL, trae_pu=MARIBEL,
    captador=ALVARO, lleva=ALVARO)
pc(OPP['luc10'][0]['id'], 'IRENE', 'otro', '660117742', None, None, 'Persona de contacto de la comunidad (correo de Grupo Trebol del 10/03/2026).')

rellenar('lg6', 'LUIS GÓMEZ 6', 'luisgomez6', {'fecha_apertura': '2026-05-11',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: la foto de WhatsApp del 11/05/2026). Contacto de la comunidad: Victoria Lopez (626 509 485) o Malena Gomez (676 933 398). Tipo de obra: ASCENSOR '
                    'CON DERRIBO (derribo completo de la escalera, ascensor de foso reducido para 5 personas, plataforma elevadora en la entrada y modificacion del escalon del portal; no se tocan '
                    'contadores; PEM 200.000 EUR + IVA). HE enviada a la administracion 14-05-2026 (la ficha no dice cual). Comercial interno: CARLOS S (es otro Carlos): la lleva Daniel.'},
    ('ascensor',), n=fijar('luisgomez6', 2026, ('2026-05-14', 'Sin fecha; la propuesta para la HE enviada a la administracion el 14-05-2026.')))
pc(OPP['lg6'][0]['id'], 'VICTORIA LOPEZ', 'otro', '626509485', None, None, 'Persona de contacto de la comunidad (ficha del ascensor, 2026).')
pc(OPP['lg6'][0]['id'], 'MALENA GOMEZ', 'otro', '676933398', None, None, 'Persona de contacto de la comunidad (ficha del ascensor, 2026).')

n = partir(fijar('luisruiz4', 2024), 5, '-' * 10 + ' Forwarded message', '2025-11-25')
rellenar('lr4', 'LUIS RUIZ 4', 'luisruiz4', {'fecha_apertura': '2024-12-05',
    'origen_notas': 'Fecha de llegada: 12/2024 (dia: la primera nota, 05/12/2024). Contacta: Aurelio (vecino, 2o C; 658 040 148) y Leticia Ruano (la administracion). Tipo de obra: ASCENSOR '
                    '(derribo de escalera y recolocacion minima de la caldera de gasoleo comunitaria) + SUBVENCIONES. Administracion: SALLET (Leticia Ruano; 91 071 32 10; sallet@telefonica.net), '
                    'tachada en la ficha; el 30-09-2026 la comunidad ha cambiado de administrador: FINCAS ESPINOSA (David; 614 135 139; david@fincasespinosa.com; administracion nueva, dada de alta '
                    'en el barrido). En la ficha tambien "605 06 71 31 vecina o administradora??". Presupuestos de obra de Fain (11-11-2024), Royalurbe (01-09-2025) y Coinsa (18-09-2025), enviados '
                    'al administrador el 17-11-2025. Los vecinos aprueban el proyecto y las subvenciones en junta (22/11/2025), pero ponen una derrama a 6 meses y firmaran la HE cuando la tengan. '
                    'Comercial: DANIEL.'},
    ('ascensor', 'subvenciones'), n=n)
pc(OPP['lr4'][0]['id'], 'AURELIO (2º C)', 'otro', '658040148', None, None, 'Vecino; persona de contacto de la comunidad (ficha, 2024-2025).')
relevar_admin(OPP['lr4'][0]['id'], SALLET, DAVID_ESP,
              'En la ficha de Dropbox, Sallet (Leticia Ruano) esta tachada; nota del 30-09-2026: "Han cambiado el administrador". La nueva es FINCAS ESPINOSA (David). '
              'Fecha "hasta" = la de la nota, no la del cambio real.', hasta='2026-09-30')

# ================================================================= 2. CLON
REVS = [
    ('lopezgrass66', '2025-02-11', 'JAVIER (DEL BRIO Y BLANCO)', None, None,
     'LOPEZ GRASS 66 MADRID. Fecha: 02/2025 (dia: la primera nota y las fotos de la visita, 11/02/2025). Tipo de obra: ASCENSOR (derribo de la escalera e invasion de 1,10 m de espacio publico para '
     'una escalera nueva y un ascensor de 6 paradas con puertas automaticas; 200.000 EUR). Distrito Puente de Vallecas. CP 28038. Presidente: Gustavo Henry, 680 860 919. En la carpeta, el informe '
     'de viabilidad (18/02/2025). En produccion hay LOPEZ GRASS 11, 42 y 60, no el 66.\n\n' + crudo('lopezgrass66', 2025)),
    ('lopezsilva3', '2026-03-17', 'LARA (ADMINISTRACIONES REY)', None, None,
     'LOPEZ SILVA 3 MADRID. Fecha: 03/2026 (dia: la ficha, 17/03/2026; fotos del 18/03 y del 26/03/2026). Tipo de obra: CUBIERTA Y REHABILITACION. CP 28005. Administracion: ADMINISTRACIONES REY '
     '(Lara; 915 65 25 25; admonrey@admicove.com). Hay nube de puntos (escaneo). La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + EXT),
    ('lorca8', '2022-03-23', None, None, None,
     'LORCA 8 MADRID (la carpeta y los ficheros no dicen el tipo de via). Fecha: la ficha es la plantilla en blanco (03/2022); el primer trabajo es la nube de puntos del 23/03/2022 (informe '
     '"220323-Lorca-8") y el 3D del 24/03/2022. Ficha vacia: sin contacto, tipo de obra ni notas.'),
    ('losyebenes118', '2025-02-12', 'JOSE LUIS GONZALEZ ALMANSA (VECINO)', None, None,
     'LOS YEBENES 118 MADRID. Fecha: 02/2025 (dia: la nota del 12/02/2025 y la carta de la ITE de 2025). Tipo de obra: IEE ("la tienen que pasar este ano"). Distrito Latina. CP 28047.\n\n'
     + crudo('losyebenes118', 2025)),
    ('losyebenes179', '2024-07-19', 'RAUL CEREZO (ACAYMA MARIA JOSE DONAIRE)', None, None,
     'LOS YEBENES 179 MADRID. Fecha: 07/2024 (dia: la nota del 19/07/2024). Tipo de obra: ASCENSOR + SUBV (HE de proyecto, DF, CSS, licencia, IEE, CEE y subvenciones). Distrito Latina. CP 28047. '
     'Contacto: Acayma Maria Jose Donaire, que viene por Raul Cerezo.\n\n' + crudo('losyebenes179', 2024)),
    ('lucano45', '2023-10-20', 'JAVIER VELASCO (ELECNOR)', None, None,
     'LUCANO 45 MADRID. Fecha: 10/2023 (dia: la nota del 20/10/2023). Tipo de obra: ASCENSOR, PLATAFORMA VERTICAL, SATE Y CUBIERTA CON URALITA (presupuestar por un lado la accesibilidad y por '
     'otro el SATE con Next Generation). Distrito San Blas - Canillejas. CP 28022. En la carpeta, un listado de inmuebles y fotos de un 3D parecido.\n\n' + crudo('lucano45', 2023)),
    ('lucano63', '2022-09-20', 'OSCAR FERNANDEZ (FAIN)', None, None,
     'LUCANO 63 MADRID. Fecha: 09/2022 (dia: la nota del 20/09/2022). Tipo de obra: ASCENSOR (derribo de escalera y escalera nueva de trazado curvo, como San Maximiliano 23 o German Perez '
     'Carrasco 54). Distrito San Blas - Canillejas. CP 28022.\n\n' + crudo('lucano63', 2022)),
    ('luchana37', '2016-01-27', 'LUIS MIGUEL NUNES (THYSSEN)', 'H79053054', '0861412VK4706B',
     'LUCHANA 37 MADRID. Fecha: 01/2016 (dia: las fotos de la visita, 27/01/2016; la ficha dice 28/01/2016). Tipo de obra: ASCENSOR (en la ficha no consta; lo dicen los planos y la obra). '
     'Distrito 07 - Chamberi. CP 28010. Presidenta: Cecilia de Montserrat Campa Anso (07232078G; 655 094 901). Fachada 11,40 m. PEM 50.000 (residuos 1.000). Superficie 11,20. Junta de '
     'Chamberi (Pz. Chamberi): expediente 107/2016/03832, tecnico Eduvigis; negociado de licencias 91 588 67 92 / 91 588 67 51 / 91 588 37 34 / 91 588 67 03 / 91 588 67 96, lunes, miercoles '
     'y viernes de 9:00 a 11:30. Obra: constructora DISVAL (Gonzalo 627 980 095; Carlos Pals 670 755 182) - no esta en la agenda; "CERRARON CONTRATO POR VALOR DE 40.810,04 EUR". En la carpeta: '
     'contradictorios de Disval (jun-2019), acta de replanteo (11/07/2019), certificaciones (2019), certificado final de obra visado (ene-2020), certificacion final a origen para la subvencion '
     '(ene-2020) e incidencias (2022).'),
    ('luisdehoyosesainz108', '2025-04-16', 'GEMA CALLEJAS (ORTIZ GINESTAL)', None, None,
     'LUIS DE HOYOS SAINZ 108 MADRID (en la carpeta "luisdehoyosesainz108"). Fecha: 04/2025 (dia: el correo de la administracion, 16/04/2025). Tipo de obra: SUBVENCIONES (presupuesto de honorarios '
     'para presentarlas, tras hablar con Daniel). Administracion: ORTIZ GINESTAL (Gema Callejas; C/ Corregidor Alonso de Tobar 23, bajo B; 913 281 332; averias@ortizginestal.com) - no esta en '
     'la agenda.\n\n' + crudo('luisdehoyosesainz108', 2025)),
    ('luisgomez3', '2026-05-11', None, None, None,
     'LUIS GOMEZ 3 MADRID. Fecha: 05/2026 (dia: el 3D, 11/05/2026; el .skb de ene-2026 es de plantilla; la ficha es del 12/05/2026). Ficha casi vacia: sin direccion, contacto, tipo de obra ni '
     'notas; en el comercial interno sigue la lista de la plantilla ("DANIEL, CARLOS G, CARLOS S, ALVARO"), sin elegir. Hay escaneo 3D. En produccion esta LUIS GOMEZ 6, no el 3.'),
    ('luispando5', '2025-04-10', 'MARIBEL (VECINA)', None, None,
     'LUIS PANDO 5 MADRID. Fecha: 04/2025 (dia: la nota del 10/04/2025: la vecina viene en persona a la oficina). Tipo de obra: ASCENSOR (unos 6 m2 del local). Distrito Latina. CP 28047. '
     'Administracion: SANCHEZ MONTIEL (91 464 30 00; jorgesanchezmontiel@gmail.com; contacto Hugo) - no esta en la agenda. Contacto de la comunidad: Maribel (m.trompetaruano@gmail.com; '
     '615 10 54 58) y su marido, Javier Fernandez (696 642 112). Hay escaneo 3D (abr-2025). El 9/06/2025 aprueban el ascensor en junta (nota firmada por Carlos Garcia). La ficha no dice '
     'comercial interno.' + CAPTO_CARLOS + '\n\n' + crudo('luispando5', 2025)),
    ('luispiernas34', '2017-12-13', 'ANDRES (ENGWE)', 'H79060083', '4754318VK4745D',
     'CALLE LUIS PIERNAS 34 MADRID. Fecha: la ficha dice ENERO 2018; el primer documento de Accesalia es la venia del 13/12/2017 (en la carpeta hay un proyecto de dic-2015 y planos de ago-2017). '
     'Tipo de obra: ASCENSOR. Distrito 15 - Ciudad Lineal. CP 28017. Ambito de ordenacion NZ 3.1a. PEM 37.841,63 (residuos 153,54). Superficie 74,35. Agente: Andres, de ENGWE (en la agenda, '
     'como "CUIDADO ESTOS NO"). En la carpeta: hoja de direccion de obra y visado TL-000631-2018 (ene-2018), apertura del centro de trabajo (feb-2018), requerimiento de la subvencion (may-2018), '
     'presupuesto del ascensor aceptado (jun-2018), paralizacion de la obra (feb-2019) y reapertura (sep-2019), certificacion (nov-2019) y un "conflicto" con Engwe (nov-2019). La ficha no '
     'tiene notas.'),
    ('luisruiz111', '2022-04-04', 'JORGE (HERMANO DE CRISTIAN, DE LUCANO-ETRURIA)', None, None,
     'LUIS RUIZ 111 MADRID. Fecha: 04/2022 (dia: la nota del 04/04/2022). Tipo de obra: SATE + FV. Distrito Ciudad Lineal. CP 28017. Contacto: Jorge, hermano de Cristian (de Lucano / Etruria).\n\n'
     + crudo('luisruiz111', 2022)),
    ('luisruiz82', '2016-11-06', 'JUAN LUIS (ENOR)', 'H80167299', '6252201VK4765C',
     'LUIS RUIZ 82 MADRID. Fecha: 11/2016 (dia: el primer fichero, la oferta del ascensor del 06/11/2016). Tipo de obra: ASCENSOR. Distrito 15 - Ciudad Lineal. NZ 3.2. CP 28017. En la ficha, '
     '"CIF: H80167299 me he inventado h79561916". Contacto: Juan Carlos (presidente; 629 725 497); administracion: CANDELAS & OVIEDO (912 602 132; jcandelas@candelasoviedo.es) - no esta en la '
     'agenda. Fachada 19,78 m. PEM 95.096,63 (residuos 300). Superficie 63,60. Junta de Ciudad Lineal (C/ Hermanos Garcia Noblejas 16): negociado de licencias 91 588 75 30, lunes, miercoles y '
     'viernes de 9:00 a 10:30, sin cita; tecnica Laura Barrionuevo (91 588 75 96); expediente 116/2016/5325. En la carpeta: proyecto (nov-2016), requerimientos (2017), subvencion "tramitada '
     'por ellos" (ene-2019) y fin de obra visado (abr-2021).'),
    ('luisruiz86', '2016-10-05', 'JUAN LUIS (ENOR)', 'H79561932', '6252226VK4765C',
     'LUIS RUIZ 86 MADRID. Fecha: la ficha dice NOVIEMBRE 2016; los ficheros empiezan el 05/10/2016 (render; presupuesto de Enor del 10/10/2016); se toma esa. Tipo de obra: ASCENSOR (foso '
     'reducido). Distrito 15 - Ciudad Lineal. NZ 3.2. CP 28017. Fachada 15,02 m. PEM 82.625,12 (residuos 300). Superficie 65,40. Junta de Ciudad Lineal: tecnica Laura Barrionuevo (91 588 75 96); '
     'expediente 116/2016/5324. En la carpeta: proyecto visado (nov-2016), certificado de idoneidad del foso reducido (dic-2018), solicitud de subvencion (ene-2019), fin de obra visado '
     '(abr-2021) y certificado final a origen (dic-2023).'),
    ('luisruiz88', '2021-02-25', 'JOSE MANUEL VIDAL DE TORRES RUIZ (INVER -> ELECNOR)', 'H79118238', '6252225VK4765C',
     'CL LUIS RUIZ 88 MADRID. Fecha: la ficha dice 2021; los primeros ficheros son del 25/02/2021 (presupuesto, correos, licencia concedida y proyecto numerados "15.-", de otro arquitecto: '
     'Velerda); se toma esa. Tipo de obra: ASCENSOR (proyecto de Velerda; Accesalia, la direccion de obra). Distrito Ciudad Lineal. CP 28017. Contacto: Jose Manuel Vidal de Torres Ruiz '
     '(jm.vidal@elecnor.com). Fecha encargo: octubre 2021. Jefe de obra: Almudena Ballesteros. Administracion: MANDATARIA (tamara@mandataria.com; 91 407 87 00 / 91 260 21 32); antes CANDELAS '
     '& OVIEDO (Jose Javier Garcia Nunez-Garcia) y Javier Garcia de Mandataria, tachados. Contacto de la comunidad: Constantino Arias Lopez (constantino_arias@elcorteingles.es). PEM 108.666,37 '
     '(Velerda). Visados TL/020955/2023 y TL/020932/2023. Superficie 100 m2. Obra: acta de replanteo (14/10/2021), certificaciones de Elecnor (2022), fin de obra (19/12/2022), direccion de obra '
     'visada (ene-2024) y certificado final a origen parcial para el Plan Madre (2025).\n\n' + crudo('luisruiz88', 2021)),
    ('luruaco1', '2022-10-18', 'DIDEPRO', None, None,
     'LURUACO 1 MADRID. Fecha: 10/2022 (dia: la nota del 18/10/2022; el presupuesto de la carpeta, del 06/10/2022, es de otra direccion: "LUIS VIVES 11 - SALVAESCALERAS"). Tipo de obra: SATE + '
     'SUBV + CSS (Didepro dice que le han dado la obra). Distrito Hortaleza. CP 28033.\n\n' + crudo('luruaco1', 2022))]
for carp, fecha, trajo, cif, ref, t, *ruta in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, comercial='Alvaro' if carp in ('lopezsilva3', 'luispando5') else 'Daniel', ruta=ruta[0] if ruta else None)
for carp, fecha, trajo, t in [
        ('losbarros12', '2015-11-17', None, 'Carpeta "losbarros12" SIN ficha de datos: solo un pdf, un doc y un dwg del 17/11/2015.'),
        ('luisafernanda17', '2017-11-17', 'LUIS MIGUEL NUNES (THYSSEN)', 'C/ LUISA FERNANDA 17 MADRID. Fecha: 17/11/2017 (la de la ficha). Ficha vacia; hay croquis y presupuesto (nov-2017).'),
        ('luisgomez7', '2018-04-09', 'PEDRO ARANDA (THYSSEN)', 'C/ LUIS GOMEZ 7 MADRID. Fecha: 09/04/2018 (la de la ficha). Ficha vacia; hay croquis, presupuesto y render (abr-jun 2018).'),
        ('luisruiz84', '2015-03-21', None, 'Carpeta "luisruiz84" SIN ficha de datos: croquis (mar-2015), oferta del ascensor (nov-2015), plano, render y oferta (ene-feb 2016) y valoracion (nov-2016).'),
        ('lumbreras 5', '2019-07-11', None, 'Carpeta "lumbreras 5" SIN ficha de datos: solo el documento de deflexiones y los planos de un ascensor (11/07/2019).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 3. MANIAS
mania('El COAM no visa un certificado final de obra PARCIAL de un ascensor ("no procede"); hay que intentarlo con una certificacion parcial.', 'COAM', '2025-03-25', 'luisruiz88',
      cita='En el COAM advierten que NO van a visar un CFO parcial porque no procede al tratarse de un ascensor; vamos a intentar con la certificación parcial. Visado nº TL/004710/2025')

resumen()
