# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda A5 (avenidas avllanocastellano5 .. avvalladolid21, 38 carpetas). 6-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from trocear2 import trocear2

SCHINDLER = '2ca18bd8-5fe2-4e4e-9093-6601c99bbc05'; JIMECO = '17dfb227-f5ea-4ef6-8f0c-f17d4206f904'
PU.update(velasco='94b4d0ec-edd7-4038-a58f-0823b287fa8f', olga_jimeco='ef1332fc-cd83-4b25-9efd-ddca69691dd0', anabel='3bd1eea7-ff6f-40ec-bf02-81bfa8a2d866',
          valdes='91abc060-a207-475a-85fd-6877d6914103', vgarcia='daaab07a-ce94-4d5c-833e-e9c30c9ac363', angel_mc='d3ce051b-139a-4880-a1fa-ed0b9ee1ba5b',
          dbrio='e18206ca-c52e-4318-a0b5-906945ba08aa', vanesa='05cda534-6907-43b0-b674-53cbe143a278', gmoya='5a588515-9c02-4058-8e31-7e51dec4737f',
          alfredo_ib='97fbfb50-5db7-43e7-a916-aa32441ced0d', alemany='feb70e2c-3f94-4fd2-8515-f590d6cd67c4', dimas='0ad51692-6650-4252-bace-6bec9f5e2270',
          magomez='84f6210b-6fc3-48c4-b18c-b8cffb9416c9', jorge_mj='192dec18-7656-43cc-9cba-3d364222294a', oscar_fgr='b48008bb-1984-4da0-bb4b-21a55d0f586e',
          oscar_cega='86273a6d-d0f1-4e29-874e-4aba61764673', santiago_ug='c0514bd0-70a4-4538-ba61-efeaf3f64f7d', mesonero='0113bf7e-74e5-4e2e-a232-1f443ca89032')
sv = lambda c: [(f, t) for f, t in trocear2(subv(c), 2025)] if subv(c) else None

# ================================================================= 1. PRODUCCION (18)
DIAZ = persona_nueva('Daniel Alejandro', 'Díaz Pérez', None, None, None, contrata=SCHINDLER, notas_='Schindler (Av. Llano Castellano 5, 2021).')
rellenar('lla5', 'AV LLANO CASTELLANO 5', 'avllanocastellano5', {'fecha_apertura': '2021-10-15', 'referencia_catastral': '2020915VK4822A',
    'origen_notas': 'Fecha de llegada: 10/2021. Contacta: Daniel Alejandro Diaz Perez (Schindler). Tipo de obra: MEMORIA VALORADA para la renovacion de los 2 ascensores + subvencion de accesibilidad. Distrito Fuencarral-El Pardo. Tecnico: Enrique. '
                    'Fecha encargo: noviembre 2021. Administracion: ~~Belen Rey~~ -> ~~Cano Abogados (feb-2022)~~ -> desde marzo-2023 CIVICASA FINCAS (Patricia Mesonero Villar; Bravo Murillo 97, 1o ext. dcha.; 915 350 834 / 675 259 468; reycasa2012@yahoo.es). '
                    'Junta de Fuencarral: Luis N. Rodelgo. PEM 71.195,60; residuos 300. Expediente 108/2021/04670. 12-01-2024: obra sujeta a la concesion de la subvencion. '
                    'OJO: en la carpeta hay un documento de datos de IEE de CORRAL DE CANTOS 19 (archivado aqui por error). Comercial: DANIEL.'},
    ('memoria_valorada', 'modificacion_asc', 'subvenciones'), n=fijar('avllanocastellano5/FICHA ASCENSOR LLANO CASTELLANO 5 MADRID.docx', 2024, ('2021-11-01', 'Sin fecha; del encargo (noviembre 2021).')),
    presi=('María Elena de Mingo Bolde', 'presidente', '609670028', '02854385Q', 'elen.mingo@gmail.com'), trae_pu=DIAZ)
rellenar('mc22', 'AV MARQUES DE CORBERA 22C', 'avmarquesdecorbera22C', {'fecha_apertura': '2025-10-23', 'referencia_catastral': '4752302VK4745D',
    'origen_notas': 'Fecha de llegada: 10/2025. Contacta: Javier Velasco (Elecnor; en copia Lucia Davila). Tipo de obra: ASCENSOR CON DERRIBO DE ESCALERA + SUBV ("solo entramos en la primera planta; tienes un proyecto similar del 38C"). '
                    'Barrio: Ventas. Tecnico: Jacob. Fecha encargo: 04/02/2026 (HE firmada). Por ECU (ACTECU), licencia. Administracion: JIMECO (Olga; 915 73 88 06; administracion@jimeco.es). Superficie 67,48. '
                    'La vicepresidenta pide que se mantenga la altura de los escalones. Comercial interno: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('avmarquesdecorbera22C', 2025, ('2025-10-23', 'Correo de Javier Velasco del 23 de octubre de 2025.')),
    comunidad={'iban': 'ES94 2100 3952 1102 0023 2137'}, presi=('MARIA LUISA GARCIA PONS - 5 Izquierda', 'presidente', '649 12 14 69', '02672123Y'), adm=PU['olga_jimeco'], trae_pu=PU['velasco'])
rellenar('mc24', 'AV MARQUES DE CORBERA 24B', 'avmarquesdecorbera24B', {'fecha_apertura': '2025-10-01', 'referencia_catastral': '4752331VK4745D',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia desconocido). Contacta: Javier Velasco (Elecnor). Tipo de obra: ASCENSOR CON DERRIBO + SATE + SUBV; desde feb-2026, PROYECTO CONJUNTO de SATE y ascensor (ya habian pagado la subvencion completa '
                    'y la mitad del proyecto de ascensor). Distrito Ciudad Lineal. Tecnico: Jacob Hernandez. Fecha encargo: 04/02/2026; HE del conjunto firmada 14-05-26. Ano 1963. Administracion: Anabel Barajas (687 716 856, anabelbarajas@icam.es). '
                    'Presidenta: Beatriz, 617 290 459. Presupuesto de Elecnor firmado (jun-2026). Sep-2026: quieren empezar por el SATE. Obra supeditada a la subvencion. Comercial interno: DANIEL.'},
    ('ascensor', 'sate', 'subvenciones'), n=fijar('avmarquesdecorbera24B', 2026), subvencion=sv('avmarquesdecorbera24B'),
    comunidad={'iban': 'ES89 0182 9038 3502 0157 1619'}, adm=PU['anabel'], trae_pu=PU['velasco'])
rellenar('mc28', 'AV MARQUES DE CORBERA 28B', 'avmarquesdecorbera28B', {'fecha_apertura': '2026-01-30', 'referencia_catastral': '4752327VK4745D',
    'origen_notas': 'Fecha de llegada: 01/2026. Contacta: Javier Velasco (Elecnor). Tipo de obra: ASCENSOR CON DERRIBO + SUBV (con rampa desde jun-2026; no incluye puerta automatica, solo el portero nuevo). Distrito Ciudad Lineal. '
                    'Tecnico: Alejandro Bello; Israel (presupuesto jun-26) -> Angela (requerimiento). Fecha encargo: 18-03-2026 (HE firmada; obra condicionada a la subvencion). Ano 1963. Administracion: FINCAS LA ELIPA / MARTINEZ LIRIA '
                    '(Av. Marques de Corbera 8 local 3; 91 726 52 34 / 91 726 99 92 / 607 869 079; fincasmliria@gmail.com). Presidente: Jaime Siguero Dorado (vive en el 3o1). Por ECU (ACTECU), que pide la alineacion oficial. Comercial interno: DANIEL.'},
    ('ascensor', 'rampa', 'subvenciones'), n=fijar('avmarquesdecorbera28B/FICHA DATOS.docx', 2026),
    comunidad={'iban': 'ES55 2085 9256 9603 3055 0072'}, presi=('JAIME SIGUERO DORADO', 'presidente', '666030225', '50890756J', 'jaime.siguero@gmail.com'), adm=PU['valdes'], trae_pu=PU['velasco'])
rellenar('mc30', 'AV MARQUES DE CORBERA 30B', 'avmarquesdecorbera30B', {'fecha_apertura': '2025-02-11', 'referencia_catastral': '4752325VK4745D',
    'origen_notas': 'Fecha de llegada: 02/2025. Contacta: Javier Velasco (Elecnor). Paga la CP. Tipo de obra: ASCENSOR (con derribo) + SUBV; HE de proyecto sin DF (la DF se cobrara mas adelante); 20% al inicio y el resto a la entrega. '
                    'Barrio: Ventas. Tecnico: Israel. Fecha encargo: 18/02/2025. Ano 1963. Licencia por la ECU EICI (proyecto enviado el 14/05/2025 por indicacion de Daniel). Administracion: Vicente Garcia Melchor (91 405 53 68 / 679 669 438; '
                    'vgmasesores@yahoo.es). Eva, 636 264 350 (para ir a medir). La comunidad firmo con Elecnor con un anexo: la obra esta supeditada a la subvencion. Desde nov-2025 faltan el ICIO y el aval de residuos; '
                    'pagados en sep-2026; la solicitud de licencia se firmara en la junta del 15/10/2026. Comercial interno: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('avmarquesdecorbera30B', 2025), subvencion=sv('avmarquesdecorbera30B'),
    comunidad={'iban': 'ES54 2100 2869 3313 0028 6978'}, presi=('MANUEL PERALTA PIZARRO', 'presidente', None, '76107210A'), adm=PU['vgarcia'], trae_pu=PU['velasco'])
rellenar('mc32', 'AV MARQUES DE CORBERA 32B', 'avmarquesdecorbera32B', {'fecha_apertura': '2025-05-01', 'referencia_catastral': '4752323VK4745D',
    'origen_notas': 'Fecha de llegada: 05/2025 (dia desconocido). Contacta: Javier Velasco (Elecnor; autoriza a hablar directamente con la administradora); jefe de obra Adrian (699 375 038). Tipo de obra: ASC + SUBV. Barrio: Ventas. '
                    'Tecnico: Julio. Fecha encargo: 19/06/2025. Ano 1963. Por ECU (ACTECU); licencia aprobada 24/02/2026 (09/06/2026). Administracion: JIMECO (Olga Martinez; C/ Ma Teresa Saenz de Heredia 36 local 3; 915 738 806; '
                    'L a V de 9:30 a 14, M y J de 16 a 18:30). Presidente: Luis Vera Barragan (670 467 446, luisverabb@gmail.com); Juan, vecino, 690 617 731 (acceso al patio B 2). PEM 174.263,33. Visado TL/002927/2026. Superficie 108,99. '
                    'La obra empezaria en julio-2026. Comercial interno: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('avmarquesdecorbera32B', 2025),
    comunidad={'iban': 'ES08 2100 3952 1013 0042 6649'}, presi=('LUIS VERA BARRAGAN', 'presidente', '670467446', '76252232X', 'luisverabb@gmail.com'), adm=PU['olga_jimeco'], trae_pu=PU['velasco'])
GARRIDO = persona_nueva('Sonia', 'Garrido', None, None, None, empresa=JIMECO, notas_='Contacto de Marques de Corbera 34B (may-2026), de Jimeco.')
rellenar('mc34', 'AVDA MARQUES DE CORBERA 34', 'avmarquesdecorbera34B', {'fecha_apertura': '2026-05-14',
    'origen_notas': 'Fecha de llegada: 05/2026. Contacta: Sonia Garrido (JIMECO, administracion@jimeco.es). Tipo de obra: ASCENSOR. Hay escaneo 3D. Comercial interno: ALVARO. HE e informe de viabilidad enviados 18/05/2026.'},
    ('ascensor',), n=[('2026-05-18', 'IV HE ENVIADAS 18/05/2026')], adm=GARRIDO, trae_pu=GARRIDO, captador=ALVARO, lleva=ALVARO)
rellenar('mc36b', 'AV MARQUES DE CORBERA 36B', 'avmarquesdecorbera36B', {'fecha_apertura': '2020-08-18', 'referencia_catastral': '4752319VK4745D',
    'origen_notas': 'Fecha de llegada: 08/2020. Contacta: ~~Rehabilitaciones Tecnicas INVER~~ -> ELECNOR. Tipo de obra: INSTALACION DE ASCENSOR. Distrito 15 - Ciudad Lineal. Tecnico: Enrique. Jefe de obra: Adrian Donaire (Elecnor). '
                    'Administracion: Martinez Liria (Juan Jesus Valdes Martinez). Junta de Ciudad Lineal: tecniclineal@madrid.es; Laura. PEM 173.444,06; residuos 300. Visado TL/014088/2020; CFO TL/010126/2026: obra terminada; queda abierta. '
                    'Superficie 43,61. Nota para subvenciones: el adicional de electricidad no es un adicional, es una actualizacion de precio del presupuesto original. Comercial: DANIEL.'},
    ('ascensor',), n=fijar('avmarquesdecorbera36B', 2022, ('2021-11-24', 'La fecha va dentro: "24/11/2021".')),
    presi=('RAFAEL GARCÍA CUSTODI', 'presidente', None, '51651550J', 'rafagcustodio@yahoo.es'), trae_pu=PU['velasco'] if False else None)
rellenar('mc36c', 'MARQUES DE CORBERA 36C', 'avmarquesdecorbera36C', {'fecha_apertura': '2025-12-01',
    'origen_notas': 'Fecha de llegada: 12/2025 (dia desconocido; escaneo 3D de oct-2025). Contacta: la administracion, JIMECO (Olga Martinez, 611 38 31 64, administracion@jimeco.es); "viene por Cayetano sate21". La ficha no dice tipo de obra. '
                    'Comercial interno: CARLOS.' + CAPTO_CARLOS + ' HE enviada 8/1/2026.'},
    (), n=[('2026-01-08', 'HE enviada 8/1/2026')], adm=PU['olga_jimeco'], trae_pu=PU['olga_jimeco'], captador=CARLOS, lleva=ALVARO)
nmi = [(f or '2026-02-12', t) for f, t in fijar('avmonteigueldo23', 2026, ('2026-02-12', 'Correo de Daniel (Del Brio y Blanco) del 12 de febrero de 2026.'))]
rellenar('mig123', 'AVDA MONTE IGUELDO 123', 'avmonteigueldo123', {'fecha_apertura': '2026-02-12',
    'origen_notas': 'Fecha de llegada: 02/2026. Contacta: Daniel (DEL BRIO Y BLANCO; tambien Vanesa), que pide estudio de viabilidad de ascensor. Presidente: Ricardo, 639 101 782. Tipo de obra: ASC. Hay escaneo 3D. Comercial interno: ALVARO. '
                    'OJO: hay DOS carpetas de esta direccion: "avmonteigueldo123" y "avmonteigueldo23", cuya ficha dice "AV DEL MONTE IGUELDO 123" (errata en el nombre de la carpeta). Son la misma oportunidad.'},
    ('ascensor',), n=nmi, presi=('Ricardo', 'presidente', '639101782'), adm=PU['dbrio'], trae_pu=PU['dbrio'], captador=ALVARO, lleva=ALVARO)
rellenar('mor103', 'AV DE MORATALAZ 103', 'avmoratalaz103', {'fecha_apertura': '2025-10-22',
    'origen_notas': 'Fecha de llegada: 10/2025. Contacta: Angel (MC GESTION FINCAS, 636 972 508). Tipo de obra: CERTIFICADO ENERGETICO de la VIVIENDA-PORTERIA, para el contrato de arrendamiento. Comercial interno: DANIEL. HE enviada 24/10/2025.'},
    ('cee',), n=fijar('avmoratalaz103', 2025, ('2025-10-22', 'Correo de Angel (MC Gestion) del 22 de octubre de 2025.')), trae_pu=PU['angel_mc'])
rellenar('mor21', 'AV MORATALAZ 21', 'avmoratalaz21', {'fecha_apertura': '2025-11-07', 'referencia_catastral': '4235237VK4743E',
    'origen_notas': 'Fecha de llegada: 11/2025. Contacta: el presidente, Gerardo Castro (690 318 735, gcpcastro@gmail.com), que lleva la gestion de la finca: no tienen administrador. Tipo de obra: IEE. Tecnico: Alex. Fecha encargo: 11/11/2025. '
                    'Ano 1960. Comercial interno: DANIEL.'},
    ('iee',), n=fijar('avmoratalaz21', 2025), presi=('GERARDO CASTRO', 'presidente', '690318735', '01181789A', 'gcpcastro@gmail.com'), trae_pc='presi')
rellenar('val106', 'AV NUESTRA SEÑORA DE VALVANERA 106', 'avnuestraseñoradevalvanera106', {'fecha_apertura': '2024-01-23', 'referencia_catastral': '7317509VK3771G',
    'origen_notas': 'Fecha de llegada: 03/2024 (visitado el 23/01/2024). Contacta: Javier Gonzalez Moya (Schindler; "ponerle en copia de todo si se escribe al administrador"); ~~Ana Encinas (Elecnor)~~. Tipo de obra: ASCENSOR Y SALVAESCALERAS + subvencion '
                    '(dos ascensores y un elevador cabinado en el patio). Barrio: San Isidro. Tecnico: Julio. Fecha encargo: 31/10/2024. Jefe de obra: Alvaro Gomez. Ano 1966. La comunidad quiso LICENCIA por el Ayuntamiento, no por ECU: '
                    'presentada 03-02-2025 (350/2025/03127), aprobada 03-06-2025. PEM 350.462,55. Visado TL/001346/2025. Superficie 193,02. Revisar si tiene servidumbre aeronautica. '
                    'Administracion: ~~Carta Plus (Antonio Garcia-Durrif)~~ -> nueva, sin confirmar: ~~Nicolas Garcia (nahh123@gmail.com)~~; Carta Plus indica ASEGIV (administracion@asegiv.com, 915 172 431). '
                    '27/08/2025: Schindler reenvia un correo de Nicolas Garcia pidiendo PARALIZAR todo lo relacionado con la obra. Comercial: DANIEL.'},
    ('ascensor', 'plataforma', 'subvenciones'), n=fijar('avnuestraseñoradevalvanera106', 2024), trae_pu=PU['gmoya'])
renombrar = lambda mal, datos: [act('personas_comunidad?id=eq.' + d['id'], datos) for d in b.leer('personas_comunidad?select=id&nombre=like.' + quote(mal) + '*')[:1]]
renombrar('Juan VicenteEDSON', {'nombre': 'EDSON JHONATAN NIEVES ACEVEDO', 'documento': '51231480S',
                                'notas': 'Presidente. Antes ~~Juan Vicente (27822650X; 610 633 926)~~: estaban los dos en el mismo nombre (arreglado 6-oct-2026).'})
rellenar('pc3', 'AV PRESIDENTE CARMONA 3', 'avpresidentecarmona3', {'fecha_apertura': '2022-06-08', 'referencia_catastral': '0985203VK4708F',
    'origen_notas': 'Fecha de llegada: 06/2022. Contacta: Alfredo Jimenez y Miguel Alemany (IBERLEAN), que lo encargan por telefono (ojo: no es Ivan Fernandez de Schindler). Tipo de obra: BAJADA A COTA CERO (nube de puntos; referencia: Julian Besteiro 3). '
                    'Barrio: Cuatro Caminos. Tecnico: Fernan. Administracion: Dimas Rodriguez (Asesoria DR; 91 314 03 03; fincasdr@yahoo.es). Mancomunidad Presidente Carmona 3 y 5 (H83654764). DR. PEM 76.188,02. Expediente 106/2022/03598. '
                    'Superficie 18,81. Se presentan a la subvencion ellos mismos. Requerimiento: avisar a rubioma@madrid.es (Junta de Tetuan) al contestarlo. Instrucciones de Daniel: justificar que no se actua de la calle al patio '
                    '(es otro proyecto) y no pedir informacion de ese otro proyecto. Comercial: DANIEL.'},
    ('cota_cero',), n=fijar('avpresidentecarmona3', 2022, otros={1: ('2022-06-08', 'En la ficha "08/06" sin ano; va antes del 12/06/22: es 08/06/2022.')}),
    presi=('MARÍA BLANCO GARCÍA', 'presidente', None, '74464101Z'), trae_pu=PU['alfredo_ib'])
rellenar('pc5d', 'AV PRESIDENTE CARMONA 5D', 'avpresidentecarmona5D', {'fecha_apertura': '2023-09-28', 'referencia_catastral': '0985203VK4708F',
    'origen_notas': 'Fecha de llegada: 09/2023 (escaneado el 28/09/23, "hemos hecho el 3 al lado"). Contacta: Alfredo Jimenez y Miguel Alemany (IBERLEAN; jefe de obra Leonardo Betancourt). Tipo de obra: REFORMA DEL ASCENSOR DE LA ESCALERA D '
                    '(bajada al sotano: demoler y rehacer escaleras, rampa, puertas automaticas de 700). Barrio: Cuatro Caminos. Tecnico: KGS (Santiago Quintero). Fecha encargo: 21/03/2025 (HE firmada; la obra ya estaba contratada). Ano 1950. '
                    'Administracion: Dimas Rodriguez Rodriguez (asesoriadr@yahoo.es). Licencia: la ECU la presenta al ayuntamiento (01/08/2025; registrada 22/08/2025); concedida 24/10/2025. PEM 96.541,79 (PC 114.884,73: se resta la partida de proyecto '
                    'y subvenciones que la contrata puso en su presupuesto). Visado TL/012860/2025. HE de CSS firmada (ene-2026). No se hace protegida la escalera aunque la evacuacion pase de 14 m (gasto desproporcionado). Comercial: DANIEL.'},
    ('ascensor', 'cota_cero', 'css'), n=fijar('avpresidentecarmona5D', 2023),
    presi=('FRANCISCO JAVIER COSTILLO CASTILLO', 'presidente', '610231511', '76442856X'), trae_pu=PU['alemany'])
rellenar('q26', 'AV QUINTA 26', 'avquinta26', {'fecha_apertura': '2022-06-09', 'referencia_catastral': '9574309VK4797D',
    'origen_notas': 'Fecha de llegada: 06/2022. Contacta: FAIN (~~Ivan Vazquez~~ -> Miguel Angel Gomez), que encarga el proyecto (09/06/22): proyecto de ascensor, CSyS, licencia y bonificacion del ICIO; la comunidad quiere contratar las subvenciones. '
                    'Tipo de obra: ASCENSOR (por fachada trasera) + CSS + SUBV. Barrio: Rejas. Tecnicos: Susana -> Carla -> Karla. Jefe de obra: Abel Bernardos. Licencia del Ayto aprobada 27-05-2025 (350/2022/16432). '
                    'Administracion: MJ Administracion de Fincas (Jorge; 913 680 549; mj.admon-fincas@cafmadrid.es). Presidente: Carlos Fernandez Guinea (608 15 32 52 / 91 320 16 73; carlos9331@gmail.com): ponerle en copia. '
                    'PEM 111.935,73. Superficie 213,87. Comercial: DANIEL.'},
    ('ascensor', 'css', 'subvenciones', 'licencia'), n=fijar('avquinta26', 2022),
    comunidad={'iban': 'ES10 0081 5730 1800 0141 7644'}, presi=('Carlos Fernández Guinea', 'presidente', '608153252', '51625991F', 'carlos9331@gmail.com'), trae_pu=PU['magomez'])
rellenar('q6', 'AV QUINTA 6', 'avquinta6', {'fecha_apertura': '2026-05-19',
    'origen_notas': 'Fecha de llegada: 05/2026. Contacta: Oscar Fernandez (626 319 039, el de FGR Ascensores): "ojo, todo con Oscar como si fuese comercial nuestro"; el se ocupa de la venta. Tipo de obra: ASC (dos presupuestos, la gestion '
                    'de subvenciones aparte). Comercial interno: DANIEL. HE a Monica para ok 19-05-26, enviada 20-05-26 con el precio modificado a peticion de Oscar.'},
    ('ascensor', 'subvenciones'), n=fijar('avquinta6', 2026, ('2026-05-19', 'Mensaje de Oscar Fernandez, de mayo-2026.')), trae_pu=PU['oscar_fgr'])
rellenar('ry33', 'AV RAFAELA YBARRA 33', 'avrafaelaybarra33', {'fecha_apertura': '2024-07-18', 'referencia_catastral': '9707515VK3790H',
    'origen_notas': 'Fecha de llegada: 07/2024 (ya se vio en 2016 con Luis Miguel Nunes, de Thyssen). Contacta: Oscar Fernandez (CEGA ASCENSORES, el de CEGA, hoy en FGR). Tipo de obra: ASCENSOR Y PLATAFORMA + SUBV (la subvencion la tramita CEGA; '
                    'no hacemos CEE ni IEE). Distrito Usera. Tecnico: Jonatan -> requerimiento Carla. Fecha encargo: 20/08/2024. Licencia por ECU (ACTECU), presentada 18-03-2025. Administracion: GRUPO RM GESTORIA URBANA - URBAGESTORES '
                    '(Santiago ext. 6 o Nuria ext. 3; 91 014 94 44 / 722 43 40 90; L a J de 9 a 6, V de 9 a 3). Contratista: Ascensores CEGA (682 281 318 / 91 679 30 92). Visado TL/004279/2025. Comercial: DANIEL.'},
    ('ascensor', 'plataforma'), n=fijar('avrafaelaybarra33', 2024),
    presi=('MARIA DEL SEÑOR MARIANO MORTE', 'presidente', '610972341', '70512793Z'), adm=PU['santiago_ug'], trae_pu=PU['oscar_cega'])

# ================================================================= 2. ORGANISMOS
TET = junta(6, 'Tetuán')
persona_nueva('', None, 'técnico', None, 'rubioma@madrid.es', organismo=TET, notas_='Junta de Tetuan (Presidente Carmona 3, 2022): avisarle al contestar un requerimiento, con el no de expediente en el asunto.') if False else None
CL = junta(15, 'Ciudad Lineal')
TEC_CL = area(CL, 'Servicios Técnicos', None, 'tecniclineal@madrid.es (Marques de Corbera 36B, 2021-23).')
if not b.leer('correo?select=id&email=eq.tecniclineal@madrid.es'):
    ins('correo', [{'organismo_area_id': TEC_CL, 'email': 'tecniclineal@madrid.es', 'etiqueta': 'general', 'principal': True}])
if not b.leer('correo?select=id&email=eq.rubioma@madrid.es'):
    ins('correo', [{'organismo_id': TET, 'email': 'rubioma@madrid.es', 'etiqueta': 'general', 'principal': False,
                    'notas': 'Tecnico de la Junta de Tetuan (Presidente Carmona 3, 2022): avisar aqui al contestar un requerimiento, con el no de expediente en el asunto.'}])
CARA = junta(11, 'Carabanchel')
if ESCRIBIR and not b.leer('organismos?select=direccion&id=eq.' + CARA)[0]['direccion']:
    b.actualizar('organismos?id=eq.' + CARA, {'direccion': 'Plaza de Carabanchel 1', 'telefono': '91 588 71 08 (citas: 91 480 35 35)'})
area(CARA, 'Disciplina Urbanística', '915 132 485 / 915 889 640', 'Nuestra Sra. de Valvanera 80 (2024).')

# ================================================================= 3. CLON
cl = lambda c, a, s=None: J(fijar(c, a, s))
V80 = ('AVENIDA NUESTRA SEÑORA DE VALVANERA 80 MADRID. CIF H78578804. Referencia catastral 7616106VK3771F. Junta de Carabanchel (Plaza de Carabanchel 1; 91 588 71 08 / 71 16 / 71 15; citas 91 480 35 35); tecnica Sara; '
       'Disciplina Urbanistica 915 132 485 / 915 889 640. Constructor: DESANZ (Jose Daniel Desanz, 615 827 363). Administrador: Nicolas (nahh123@gmail.com). Presidente: ~~Rodolfo (660 31 98 22), hasta 13/09/2024~~ -> Antonio Martinez Toril '
       '(4oB; 610 742 390; antoniomartineztoril@gmail.com), desde 14/10/2024.')
REVS = [
    ('avlogroño156-162', '2021-07-01', 'ARMANDO RODRIGO VITORERO (FAIN); con ENGWE', 'H79129425', '0708704VK5800H',
     'AVENIDA LOGROÑO 156-162 MADRID (Residencial Jumbo). Fecha: 07/2021. Tipo de obra: IMPERMEABILIZACION DE FOSO DE 4 ASCENSORES: actuacion comunicada (Engwe pasa los textos de las partidas). Distrito 21 - Barajas (Casco Historico). '
     'Administracion: ORMO (910 296 267, ormogestion@ormo.es). PEM 22.142,86; residuos 300.'),
    ('avmachupichu43', '2023-09-25', 'ANA ENCINAS (ELECNOR)', None, '6890501VK4769B',
     'AV MACHUPICHU 43 MADRID. Fecha: 09/2023. Tipo de obra: SUSTITUCION DE 9 MAQUINAS (proyecto, DF, CSS y subvenciones) y REHABILITACION DE CUBIERTA (presupuesto a Tomas Morell: obra de 600.000, solo DF y CSS). Distrito 16 - Hortaleza (Piovera). Ano 1995.\n\n'
     + cl('avmachupichu43', 2023)),
    ('avmarquesdecorbera26B', '2025-02-19', 'JAVIER VELASCO (ELECNOR)', None, None,
     'MARQUES DE CORBERA 26 B MADRID. Fecha: 02/2025. Tipo de obra: ASCENSOR. Distrito Ciudad Lineal. 19/02/2025: hoja de encargo con las mismas condiciones que Marques de Corbera 30 B. Hay un informe de la comunidad.'),
    ('avmarquesdecorbera38C', '2022-06-14', 'ANA ENCINAS / IBAI (ELECNOR)', None, None,
     'MARQUES DE CORBERA 38C MADRID. Fecha: 06/2022. Tipo de obra: ASCENSOR. Distrito Ciudad Lineal. 14/06/2022 visto con Ana Encinas; 10/01/2023 presentacion del 3D a la comunidad (Ibai). Elecnor lo pone de ejemplo para el 22C.'),
    ('avmonfortedelemos69', '2014-05-21', 'JOSE MARTINEZ', None, None,
     'AV MONFORTE DE LEMOS 69 MADRID. Fecha: 05/2014. Tipo de obra: BAJADA DE ASCENSOR A COTA 0 Y REFORMA DEL PORTAL (un solo ascensor; B+13; portal en piedra; 4 vecinos por planta y 2 en la baja). Distrito 08 - Fuencarral-El Pardo (La Paz).'),
    ('avnuestraseñoradevalvanera112', '2016-09-13', 'PEDRO ARANDA (THYSSEN)', 'E78765914', '7317501VK3771G',
     'NUESTRA SEÑORA DE VALVANERA 112 MADRID. Fecha: 13/09/2016. Tipo de obra: ASCENSOR (5 paradas frontales; derribo de escalera; torre). Distrito 11 - Carabanchel. Administracion: Javier (617 09 21 46, info@administracioncaja.es). '
     'Vicepresidente: Antonio, 663 306 546. Aparejador coordinador: Eloy Frochoso (607 972 039). Locales: Jesus Garcia (915 042 417 / 686 749 826) y Jesus (914 614 187). Constructora HIPUR (jefe de obra Luis Roque, 673 555 364). '
     'PEM 50.000; residuos 300. Fachada 26,30; superficie 50,90. Expediente 111/2017/07795. Proyecto hecho.'),
    ('avnuestraseñoradevalvanera80 (ascensor)', '2016-01-15', 'PEDRO ARANDA (THYSSEN)', 'H78578804', '7616106VK3771F',
     V80 + ' ENCARGO DEL ASCENSOR (subcarpeta "ascensor"): Pedro Aranda (Thyssen), croquis de ene-2016; PEM 50.000; contratado por la CP en 116.285 EUR (con o sin IVA?); fachada 12,60; superficie 44,50. '
     'Expedientes 111/2017/05232 y 111/2023/01486 (demolicion). Proyecto hecho. La legalizacion de 2024-25 es otra fila.'),
    ('avnuestraseñoradevalvanera80 (legalizacion)', '2024-11-21', 'NICOLAS, administrador', 'H78578804', '7616106VK3771F',
     V80 + ' EXPEDIENTE DE LEGALIZACION (subcarpeta "exp legalizacion", ficha de 06/2025, comercial "Daniel o Carlos"): alegacion en curso en Disciplina Urbanistica (que la pasa al departamento tecnico); el expediente de legalizacion '
     'hay que tramitarlo aparte del recurso; metido por Slim el 27-11-2024 (350/2024/35589).\n\n21/11/2024: Disciplina urbanistica llama para cancelar la cita: la alegacion esta en curso; y el expediente de legalizacion se debe tramitar '
     'por separado del recurso (no en la misma instancia, como dijo el informador urbanistico). Se pide cita con los servicios tecnicos.\n\n27-11-2024 METO POR SLIM EL EXPEDIENTE DE LEGALIZACION No EXP 350/2024/35589. SOFIA'),
    ('avpabloneruda48', '2024-07-24', 'CONCHA, presidenta', None, None,
     'AV PABLO NERUDA 48 MADRID. Fecha: 07/2024. Tipo de obra: ELEVADOR (con derribo), SATE Y AEROTERMIA: presupuesto de 3 opciones con estudio de costes y 3D, mas subvenciones, sin DF ni CSS. Distrito Puente de Vallecas. '
     'Concha, presidenta: pneruda.cuarentayocho@gmail.com. En sep-2025 Julio (Envoltermia) vuelve a hablar a Daniel de esta comunidad.\n\n' + cl('avpabloneruda48', 2024)),
    ('avpabloneruda54', '2019-12-16', 'REHABILITACIONES INVER > ELECNOR (Daniel Navarro)', 'H79565529', '5212705VK4751C',
     'AV PABLO NERUDA 54 MADRID. Fecha: 16/12/2019. Tipo de obra: INSTALACION DE ASCENSOR. Distrito Puente de Vallecas. Presidente: David Perez Serrano (618 460 303; david-comunidad@gmx.es). Administradora / propietaria del bloque: '
     'Pilar Gonzalez (661 261 524, marpgsanchez@gmail.com, 2022). PEM 105.346,22. Expediente 114/2020/03345. En negociaciones con Elecnor; lo paga la comunidad.'),
    ('avpeñaprieta53', '2023-06-15', 'SILVIA (ARRIALSI), administradora', None, None,
     'AV PEÑA PRIETA 53 MADRID. Fecha: 06/2023. Distrito 13 - Puente de Vallecas (Numancia). Tienen un proyecto que dieron a Renovae para tramitar el Next Generation, pero no saben si lo hicieron: se les manda HE para tramitarlo nosotros. '
     'Otro contacto: Carlos Manuel Muñoz Calvo, arquitecto tecnico (gabiteconsa.tecnico@gmail.com).'),
    ('avsandiego94', '2022-11-25', 'DAVID SANCHEZ (FAIN)', None, None,
     'AV SAN DIEGO 94 MADRID. Fecha: 11/2022. Tipo de obra: ASCENSOR (derribo de escalera; posible elevador por falta de hueco). Distrito 13 - Puente de Vallecas (San Diego).'),
    ('avsanluis95', '2025-01-27', 'ANDREA (ELECNOR)', None, None,
     'AVENIDA DE SAN LUIS 95 MADRID. Fecha: 01/2025. Tipo de obra: CONSULTA TECNICA de un BAÑO ACCESIBLE en la piscina y una RAMPA (oferta de 46.355,51 sin IVA); HE de servicios anexos (mar-2025). Distrito Ciudad Lineal.\n\n' + cl('avsanluis95', 2025)),
    ('avtoreros51', '2024-09-09', 'RAUL CEREZO', None, None,
     'AV DE LOS TOREROS 51 MADRID. Fecha: 09/2024. Raul Cerezo: el administrador es amigo suyo y necesita proyecto y subvencion (opcion de llave en mano con alguna constructora). Distrito Salamanca. '
     'Administracion: Danika Asesores (Daniel Martin Garcia, 679 16 41 97, adviser@icam.es). Hay un estudio de accesibilidad externo.'),
    ('avvalladolid21', '2023-01-02', 'JOSE GORDILLO', None, None,
     'AV VALLADOLID 21 MADRID. Fecha: 01/2023. Tipo de obra: SATE + CALDERA COMUNITARIA (Iberdrola). Distrito 09 - Moncloa-Aravaca (Casa de Campo). Calefaccion central de gas; sin agua caliente; 32 vecinos.')]
for carp, fecha, trajo, cif, ref, t in REVS:
    ruta = R('avnuestraseñoradevalvanera80\\exp legalizacion') if 'legalizacion' in carp else (R('avnuestraseñoradevalvanera80') if carp.startswith('avnuestraseñoradevalvanera80') else None)
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, ruta=ruta)
for carp, fecha, trajo, t in [
        ('avnuestraseñoradevalvanera111', '2017-05-20', 'NICOLAS (para Pedro Aranda, THYSSEN)', 'N S VALVANERA 111 MADRID. Fecha: 20/05/2017. Ficha vacia; hay croquis.'),
        ('avpabloneruda29', '2017-04-28', 'JUAN CARLOS (THYSSEN)', 'PABLO NERUDA 29 MADRID. Fecha: 28/04/2017. "Igual que Riojanos 5 bis". Ficha vacia.'),
        ('avmarquesdecorbera40', '2020-02-03', None, 'MARQUES DE CORBERA 40 MADRID. Carpeta SIN ficha de datos: croquis (feb-2020).'),
        ('avnuestraseñoradevalvanera108', '2016-01-15', None, 'NTRA. SRA. DE VALVANERA 108 MADRID. Carpeta SIN ficha de datos: croquis (2016-2018).'),
        ('avrosales99', '2015-05-06', None, 'AV ROSALES 99 MADRID. Carpeta SIN ficha de datos: un presupuesto (mayo 2015).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 4. MANIAS
mania('Alegacion para no actuar entre el portal y la alineacion cuando el espacio exterior lo comparten varios portales: el SUA comentado (criterios de aplicacion) exime cuando no se tiene la plena propiedad (art. 9.5.g y 24.4 de la Ley de Suelo y Rehabilitacion Urbana).',
      'ECU (EICI)', '2025-05-14', 'avmarquesdecorbera30B', clave='mc30',
      cita=[t for f, t in trocear2(subv('avmarquesdecorbera30B'), 2025) if 'SUA COMENTADO' in t][0])
mania('La ECU pide la alineacion oficial (se tramita por la propia ECU) y para ello la nota simple; el Registro la deniega si no se le dan tomo, libro y folio.', 'ECU (ACTECU)', '2026-07-08', 'avmarquesdecorbera28B', clave='mc28', trozo='alineación oficial')
mania('Disciplina Urbanistica: el recurso y el expediente de legalizacion se tramitan por SEPARADO, no en la misma instancia (aunque el informador urbanistico dijera lo contrario); y no dan cita mientras el departamento tecnico no conteste.',
      'Junta Municipal de Distrito de Carabanchel (Disciplina Urbanistica)', '2024-11-21', 'avnuestraseñoradevalvanera80 (legalizacion)',
      cita='21/11/2024 ... La alegación que presentamos está en curso. El dpto de Disciplina lo ha mandado al dpto Técnico del ayuntamiento ... Expediente de legalización. Nosotros metimos en la misma instancia el recurso y el expediente de legalización, como os dijo el informador urbanístico. Pero esta señora de Disciplina dice que se debe de tramitar por separado.')
mania('Al contestar un requerimiento en la Junta de Tetuan, avisar por correo al tecnico (rubioma@madrid.es) con el numero de expediente en el asunto.', 'Junta Municipal de Distrito de Tetuan', '2022-06-12', 'avpresidentecarmona3',
      clave='pc3', cita='PARA SOFIA: Enviar a la par que se contesta el requerimiento aviso a rubioma@madrid.es de que esta contestado con asunto el Nº de expediente')

resumen()
