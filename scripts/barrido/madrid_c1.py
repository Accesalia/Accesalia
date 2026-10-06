# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda C1 (caceres17 .. canciondelolvido23, 40 carpetas). 6-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from trocear2 import trocear2

SCHINDLER = '2ca18bd8-5fe2-4e4e-9093-6601c99bbc05'; ACAYMA = '4b38f274-9ff2-4e2d-80dc-10276bb3c4fd'; DELBRIO = '46b4fe1f-0534-434f-ae7c-cc098fde82cd'
ELECNOR = '9bced278-bff6-4213-bdab-5cbc5d5d84d5'; EFFIC = '1d2827a3-5a80-4e4e-b4da-6d9902be0122'
PU.update(cerezo='7f4218f5-8b8e-45a0-9cba-b2880ccfc4c3', jrodriguez='3bb9cbe7-f3d6-4223-be99-e76ad4a67a56', caja='1ac05676-b73d-4cef-aab7-c72c909b4d04',
          mjdonaire='444e103d-3f02-40af-825e-0eec783d8306', mamen='c0b1cb55-5fb1-4280-901d-615701a3cc02', silvia='6c8e1a7f-999b-4ee9-ac91-cfeb7075dd8c',
          fernando_dti='5769f4c7-b538-4556-95a4-873cfc9f1b01', sonia_lux='f2528b5f-b35e-462b-8a90-bf9d1fd131f4', quevedo='0660b50b-cf62-430d-8b6d-3154b108c582',
          velasco='94b4d0ec-edd7-4038-a58f-0823b287fa8f', angel_mc='d3ce051b-139a-4880-a1fa-ed0b9ee1ba5b', collado='0f2b3251-9e84-443d-b81e-32edfd1f7915',
          alberto_mc='31cb6a71-758a-4fe4-883a-610b1be4c5e0', vanesa='05cda534-6907-43b0-b674-53cbe143a278', godino='71ab2591-1dac-48b0-b094-12b9c2995bf4',
          guerrero='250c17e3-b8a7-4e2f-915e-1d70827989b9', paz='46e3614d-97fd-40bf-baac-07d9bd5e601f')
CEREZO = (' Raul Cerezo es un comercial freelance que colabora con Accesalia: trae la oportunidad y el mismo pasa la hoja de encargo al cliente (Monica, 6-oct-2026).')

# ================================================================= 1. PRODUCCION
NAHARRO = persona_nueva('Ismael', 'Naharro Domínguez', 'jefe de obra', '695 29 11 77', 'ismael.naharro@schindler.com', contrata=SCHINDLER)
rellenar('cm157', 'CAMARENA 157-159', 'camarena157-159', {'fecha_apertura': '2024-05-08',
    'origen_notas': 'Fecha de llegada: 05/2024. Contacta: Javier Rodriguez Martin (Schindler; 916 407 910 / 685 286 041). Tipo de obra: BAJADA A COTA CERO (sin CSS); el presupuesto de contrata lo tiene Schindler y la subvencion se la tramitan ellos. '
                    'Barrio: Aluche. Tecnico: JGS. Jefe de obra: Ismael Naharro Dominguez (Schindler). Referencias: 159 6114359VK3761C y 157 6114360VK3761C. Administracion: CAJA (Javier Caja; Camarena 216; 917 17 87 76; info@administracioncaja.es). '
                    'Comision de obras: Enrique, 654 372 427. PEM 114.971,37 (en el CFO, 136.815,94). Visados TL/016921/2024, TL/016202/2025 y TL/016799/2025. Expediente 350/2024/32846. Superficie 107. CFO registrado 16/12/2025: obra terminada; '
                    'queda abierta. Comercial: DANIEL.'},
    ('cota_cero',), n=fijar('camarena157-159', 2024), presi=('JOSE ANTONIO LOPEZ REYES', 'presidente', None, '02062060H'), trae_pu=PU['jrodriguez'])
rellenar('cm200', 'CAMARENA 200', 'camarena200', {'fecha_apertura': '2024-01-30', 'referencia_catastral': '5914216VK3751D',
    'origen_notas': 'Fecha de llegada: 01/2024. Contacta: Raul Cerezo.' + CEREZO + ' Tipo de obra: ASCENSOR CON DEMOLICION DE ESCALERA + CSS + SUBVENCIONES. Barrio: Aluche. Tecnico: Jonatan. Constructora: Rosersese. '
                    'Administracion: ACAYMA (Maria Jose Donaire, 91 509 97 37 / 669 934 006, mjdonaire@acayma.com; Sonia; comunidades@acayma.com; L a J 10-14 y 17-19, V 10-14; verano L a V 10-14). '
                    'Tenian un proyecto previo de otro estudio en licencia y una subvencion del Ayuntamiento (Rehabilita 2022, ~119.000) ya concedida: cambio de proyecto y de contrata; obra antes del 19-09-2025. '
                    'Pago: 35% al encargo, 35% a la entrega del proyecto y 30% al inicio de obra. Por ECU (ACTECU). PEM 167.941,49. Visado TL/004222/2024; CFO TL/014439/2026; EBSS TL/015028/2026 (CFO a visar sep-2026). Expediente 350/2024/15672. '
                    'Comercial: DANIEL.'},
    ('ascensor', 'css', 'subvenciones'), n=fijar('camarena200', 2024),
    comunidad={'iban': 'ES80 2085 8007 8603 3036 8219'}, presi=('PEDRO LEBRON FERNANDEZ', 'presidente', '606141608', '50044840Z', 'pedrolebronfernandez@hotmail.com'), adm=PU['mjdonaire'], trae_pu=PU['cerezo'])
rellenar('cm230', 'CAMARENA 230', 'camarena230', {'fecha_apertura': '2026-02-01',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia desconocido; escaneo de ene-2026). Contacta: Yolanda Gonzalez (JCFINCAS; Cl Los Yebenes 72 local 3; 917 52 81 96; info@jcfincas.es) - no esta en la agenda. Tipo de obra: ASCENSOR. '
                    'Presidente: Jose Angel, 630 47 41 61. HE enviada. En la ficha: comercial interno CARLOS.' + EXT},
    ('ascensor',), n=[('2026-02-01', 'HE ENVIADA')], captador=ALVARO, lleva=ALVARO)
rellenar('cm304', 'CAMARENA 304', 'camarena304', {'fecha_apertura': '2026-01-01', 'referencia_catastral': '5711706VK3751B',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia desconocido). Contacta: Mamen (AM GESTION MADRID; 91 476 39 61; mamen@ y ralvarez@amgestionmadrid.es). Tipo de obra: ASCENSOR + SUBV. Barrio: Aluche. Tecnico: Angela. Fecha encargo: 06/04/2026. '
                    'Por ECU (ACTECU), licencia. PEM 167.878,20. Superficie 113,21. Referencia para el proyecto: Villasandino 10 (se permite picar 15 cm a cada lado del muro). En la ficha: comercial interno CARLOS (ene-2026, antes de irse).' + CAPTO_CARLOS},
    ('ascensor', 'subvenciones'), n=fijar('camarena304', 2026),
    comunidad={'iban': 'ES68 2085 8007 8303 3032 4835'}, presi=('ANA MARIA OCHOA CAMPOS', 'presidente', '649 779 503', '50199117F', 'anam8acampos@gmail.com'), adm=PU['mamen'], trae_pu=PU['mamen'], captador=CARLOS, lleva=ALVARO)
rellenar('cm312', 'CAMARENA 312', 'camarena312', {'fecha_apertura': '2026-01-01',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia desconocido; escaneo de ene-2026). Contacta: Mamen (AM GESTION MADRID). Tipo de obra: ASCENSOR. La ficha no tiene notas. En la ficha: comercial interno CARLOS (ene-2026).' + CAPTO_CARLOS},
    ('ascensor',), adm=PU['mamen'], trae_pu=PU['mamen'], captador=CARLOS, lleva=ALVARO)
TIRADO = persona_nueva('Jorge', 'Tirado Sánchez', 'encargado', None, 'jorge.tirado@schindler.com', contrata=SCHINDLER)
rellenar('cm75', 'CAMARENA 75', 'camarena75', {'fecha_apertura': '2025-03-26', 'referencia_catastral': '6020508VK3762A',
    'origen_notas': 'Fecha de llegada: 03/2025. Contacta: Javier Rodriguez Martin (Schindler), que se adjudica el CAMBIO COMPLETO DE 2 ASCENSORES (que comparten hueco; hasta ahora de TKE); encargado Jorge Tirado. Barrio/distrito: Latina. Tecnico: KGS. '
                    'Fecha encargo: 28/05/2025 (HE firmada 29-05-2025). Ano 1976. DR por la ECU "COLABORA", que gestiona la propia comunidad (nos ponen en copia solo para requerimientos); registrada 08/10/2025. '
                    'Administracion: CAJA (Javier Caja Moya, 917 181 811). PEM 92.535,11. Visado TL/015584/2025. Superficie 57,16. Catastro cuenta un sotano de 439 m2 que no parece existir. Comercial: DANIEL.'},
    ('modificacion_asc',), n=fijar('camarena75', 2025, ('2025-03-26', 'Correo de Schindler del 26 de marzo de 2025.')), trae_pu=PU['jrodriguez'])
rellenar('gan31', 'CAMINO GANAPANES 31-33-35', 'caminodeganapanes31-33-35', {'fecha_apertura': '2025-10-06',
    'origen_notas': 'Fecha de llegada: 10/2025. Contacta: Silvia Arribas (ARRIALSI); visitado con Luxor por Daniel, Carlos y la administracion. Tipo de obra: SATE (sin DF ni CSS) + SUBV + CAEs; lleva aerogel. Tecnico: Carlos Alberto. Fecha encargo: 17/03/2026. '
                    'Administracion: ADMINISTRACIONES DTI (Fernando, 91 376 82 65, fernando@administracionesdti.es). Licencia por el Ayuntamiento (asi lo dijo Daniel). En el portal 31 hay una vivienda donde antes habia un local. '
                    'Para el fin de obra: el presupuesto lleva marcas concretas; comprobar que en todas las descripciones ponga "o similar". En la ficha: comercial interno "DANIEL y CARLOS ambos".' + CAPTO_CARLOS +
                    ' Es UNA oportunidad con los 3 portales; la otra oportunidad de esta comunidad (solo el portal 31) no se rellena: "debe ser algo raro" (Monica, 6-oct-2026).'},
    ('sate', 'subvenciones', 'caes'), n=fijar('caminodeganapanes31-33-35', 2025),
    comunidad={'iban': 'ES27 0081 0361 4600 0183 7191'}, adm=PU['fernando_dti'], trae_pu=PU['silvia'], captador=CARLOS, lleva=ALVARO, oid_fijo='f187a33c-85c4-4112-8018-660d3d17458d')
d = b.leer('personas_comunidad?select=id,rol&nombre=like.' + quote('SILVIA ARRIBAS 665') + '*')
if d: act('personas_comunidad?id=eq.' + d[0]['id'], {'nombre': 'SILVIA ARRIBAS (Arrialsi)', 'rol': 'otro', 'telefono': '917307033 / 665805356', 'email': 'info@arrialsi.com',
                                                 'notas': 'Estaba como presidenta, con el telefono en el nombre: es Silvia Arribas, de Arrialsi (la administracion que trae la oportunidad), no la presidenta (arreglado 6-oct-2026).'})
rellenar('cru27', 'CAMINO DE LAS CRUCES 27', 'caminodelascruces27', {'fecha_apertura': '2025-09-29',
    'origen_notas': 'Fecha de llegada: 10/2025 (primera nota 29/09/2025). Contacta: Luxor y la comunidad; tambien vino por SATE21, que nos paso el contacto del presidente, Manuel (4oC; manoloillera@hotmail.com). Tipo de obra: ascensor '
                    '(no se puede salir del edificio; hay salida a cubierta con escalera). Hay escaneo 3D. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), n=fijar('caminodelascruces27', 2025), presi=('Manuel (4ºC)', 'presidente', None, None, 'manoloillera@hotmail.com'), trae_pu=PU['sonia_lux'], captador=CARLOS, lleva=ALVARO)
n28 = fijar('caminodelascruces28', 2022, ('2022-05-18', 'Sin fecha delante; texto de la ficha con correos de 2023-2024 dentro.'))
for marca, fecha in (('---------- Forwarded message', '2023-10-10'), ('De: Subvenciones Accesalia <subvenciones.accesalia@gmail.com>\nDate: vie, 24 may 2024', '2024-05-24'),
                     ('Re: Resolucion "Rehabilita Madrid 2022"', '2024-10-07'), ('El jue, 3 oct 2024', '2024-10-03'), ('El 10/05/2024', '2024-05-10')):
    i = next((k for k, (f, t) in enumerate(n28) if marca in t and not t.startswith(marca)), None)
    if i is not None: n28 = partir(n28, i, marca, fecha)
OMAR_EL = persona_nueva('Omar Rafael', 'Díaz Martínez', None, None, 'ordiaz@elecnor.es', contrata=ELECNOR)
rellenar('cru28', 'CAMINO DE LAS CRUCES 28', 'caminodelascruces28', {'fecha_apertura': '2022-04-01', 'referencia_catastral': '5897911VK3659F',
    'origen_notas': 'Fecha de llegada: 04/2022. Contacta: Maria Plaza (hija de un vecino, en la comision de obras; 645 760 633; maria.plaza.a@gmail.com), por Elecnor (~~Ibai~~ -> Francisco Javier Velasco + Lucia Davila; Omar Rafael Diaz). '
                    'Tipo de obra: ASCENSOR por fachada + SUBV A EXITO ("se hace el proyecto con nuestros precios y con ese precio Elecnor y otros presupuestan"; se ha tenido que rehacer la escalera entera). Distrito Carabanchel. '
                    'Tecnicos: Paloma; requerimientos Carla -> Jacob. Fecha encargo: 18/05/2022. Administracion: QR Gestion de Fincas (Javier Quevedo Ruiz, 600 638 363, info@qrgestion.es). Presidente: Juan Carlos Iglesias Garcia (607 42 60 34, juankar63@yahoo.com). '
                    'Junta de Carabanchel: Ana Maria Ferrero Mangas (914 803 535 / 915 132 110; citatecnicarabanchel@madrid.es). DR DENEGADA (111/2022/03529) -> LICENCIA (350/2022/08006) + recurso a la denegacion (111/2024/00171); '
                    'licencia aprobada 13-06-2025. Subvenciones: Plan Regional de Ascensores 2023 (CAM, 90.000, incompatible con otras); Rehabilita 2022 no beneficiario por agotamiento; Rehabilita 2023 la presento el administrador. '
                    'PEM 127.419,04. Superficie 67,55. Obra empezada 20/04/2026. Comercial: DANIEL.'},
    ('ascensor', 'subvenciones'), n=n28, comunidad={'iban': 'ES98 0081 5142 6300 0138 5249'},
    presi=('JUAN CARLOS IGLESIAS GARCIA', 'presidente', '607 42 60 34', '50154521P', 'juankar63@yahoo.com'), trae_pu=PU['velasco'])
rellenar('vin138', 'CAMINO DE LOS VINATEROS 138', 'caminodelosvinateros138', {'fecha_apertura': '2025-05-21',
    'origen_notas': 'Fecha de llegada: 05/2025. Contacta: Angel (MC GESTION FINCAS), tras hablar Daniel con Adolfo. Tipo de obra: INFORME / CERTIFICADO DE IDONEIDAD de las reparaciones de la CORNISA (cayo parte de la cornisa: policia, bomberos '
                    'y requerimiento del ayuntamiento; repararon sin proyecto y piden certificado firmado por Daniel). Distrito Moratalaz. Tecnico: Julio. Fecha encargo: 21-05-2025; HE firmada 03-06-2025. Comercial: DANIEL.'},
    ('informe_tecnico',), n=fijar('caminodelosvinateros138', 2025, ('2025-05-21', 'Correo de Angel (MC Gestion) del 21 de mayo de 2025.')),
    comunidad={'iban': 'ES11 0081 0189 8700 0179 8383'}, presi=('CARLOS JAVIER HUELAMO AGUILAR', 'presidente', None, '00674368P'), trae_pu=PU['angel_mc'])
rellenar('vin143', 'CAMINO DE LOS VINATEROS 143', 'caminodelosvinateros143', {'fecha_apertura': '2025-10-02',
    'origen_notas': 'Fecha de llegada: 09/2025. Contacta: Adolfo Collado (MC GESTION FINCAS). Tipo de obra: ASCENSOR + SUBV ("un proyecto igual que el de Camarena 200 pero con un ascensor algo mas pequeño, de dos personas"). '
                    'Comercial interno: DANIEL. HE enviada 02/10/2025.'},
    ('ascensor', 'subvenciones'), n=fijar('caminodelosvinateros143', 2025, ('2025-10-02', 'Sin fecha delante; la indicacion de Daniel para la HE del 02/10/2025.')), adm=PU['collado'], trae_pu=PU['collado'])
nv110 = fijar('caminodevalderribas110', 2022)
rellenar('val110a', 'CAMINO DE VALDERRIBAS 110', 'caminodevalderribas110', {'fecha_apertura': '2022-09-09',
    'origen_notas': 'ENCARGO DE 2022. Fecha de llegada: 09/2022. Contacta: ~~Roberto (Matedecon)~~. Tipo de obra: ~~SATE + CUBIERTA~~. Distrito 13 - Puente de Vallecas (Numancia). La peticion de dic-2025 (DF de un SATE, Silvia de Arrialsi) es la OTRA '
                    'oportunidad de esta comunidad (Monica, 6-oct-2026). Comercial: DANIEL.'},
    ('sate', 'cubierta'), n=[x for x in nv110 if x[0].startswith('2022')], oid_fijo='89d67829-8ff8-40e4-8481-6a330c4fd033')
rellenar('val110b', 'CAMINO DE VALDERRIBAS 110', 'caminodevalderribas110', {'fecha_apertura': '2025-12-09',
    'origen_notas': 'ENCARGO DE 2025. Fecha de llegada: 12/2025. Contacta: Silvia Arribas (ARRIALSI, administradora). Tipo de obra: DIRECCION FACULTATIVA DE UN SATE. HE enviada 9/12/2025. '
                    'El SATE + cubierta de 2022 (Matedecon) es la OTRA oportunidad de esta comunidad. Comercial: DANIEL.'},
    ('df', 'sate'), n=[x for x in nv110 if x[0].startswith('2025')], adm=PU['silvia'], trae_pu=PU['silvia'], oid_fijo='503713dc-f23a-4e23-8bdb-6363d6c42f6f')
rellenar('val96', 'CAMINO DE VALDERRIBAS 96', 'caminodevalderribas96', {'fecha_apertura': '2025-06-01', 'referencia_catastral': '4024801VK4742C',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia desconocido). Contacta: Vanesa (DEL BRIO Y BLANCO; Calle Peña de la Miel 1 bajo; 665 28 64 47), que pide estudio de viabilidad. Tipo de obra: ASCENSOR (6 paradas, embarque simple; plataforma vertical '
                    'a la entrada; derribo del muro del fondo de la escalera, invadiendo unos cm de viviendas y locales); al final no baja al sotano. Barrio: Numancia. Tecnico: Jacob. Fecha encargo: 18/02/2026 (HE firmada por la presidenta, Anca Hutanu; '
                    'con anexo: si se deniega la licencia se devuelve el coste del proyecto, como en Cardeñosa 34). Por ECU (ACTECU), licencia. Contacto: Enrique Armijo, 680 442 376 (mejor whatsapp). FAIN dijo que no cabia y no presupuesto; '
                    'en junta (24/09/2026) eligen la oferta de GRADCOM. Comercial interno: ALVARO.'},
    ('ascensor', 'plataforma', 'subvenciones'), n=fijar('caminodevalderribas96', 2025, ('2025-06-01', 'Correo de Vanesa (Del Brio y Blanco), jun-2025.')), subvencion=[(None, subv('caminodevalderribas96'))],
    comunidad={'iban': 'ES38 0081 7115 1900 0196 6701'}, adm=PU['vanesa'], trae_pu=PU['vanesa'], captador=ALVARO, lleva=ALVARO)
c, _ = info('CAMINO DE VALDERRIBAS 96')
ARMIJO = pc(c['id'], 'ENRIQUE ARMIJO', 'vecino', '680442376', None, None, 'Contacto para coordinar la visita (mejor por whatsapp).')
act('oportunidades?id=eq.' + OPP['val96'][1], {'persona_comunidad_id': ARMIJO})
IRACHE = None
rellenar('cdp46', 'CAMPO DE LA PALOMA 46', 'campodelapaloma46', {'fecha_apertura': '2026-02-01',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia desconocido). Contacta: Irache Fernandez Torres (IF Torres Administracion de Fincas; Avda Rafael Alberti 16; 913 034 601 / 697 250 832; torres.adfincas@gmail.com) - no esta en la agenda. '
                    'Tipo de obra: ASC. Hay escaneo 3D. La ficha no tiene notas. Comercial interno: ALVARO.'},
    ('ascensor',), captador=ALVARO, lleva=ALVARO)
rellenar('cñ46', 'CAÑADA 46', 'cañada46', {'fecha_apertura': '2022-01-05', 'referencia_catastral': '5530302VK4753B',
    'origen_notas': 'Fecha de llegada: 10/2023 en la ficha, pero el encargo es del 05/01/2022 y hay croquis de jul-2021. Contacta: Sergio Godino (FAIN); jefe de obra Juan Luis Ruiz de Mier. Tipo de obra: INSTALACION DE ASCENSOR con invasion (LICENCIA) (FAIN) '
                    '+ subvencion (la CP; tramitada por Nunci Calderon, Rehabilita 2022, concedida). Distrito Moratalaz. Tecnico: Dennis. Administracion: ~~AEA / MC Gestion (Raquel / Adolfo Collado)~~ -> desde 01/10/2025 AFPRO (Antonio Guerrero Lecuona, '
                    '608 800 790, info@ y aguerrero@afpro.es). Presidente: Julio C. Fernandez Sanchez (630 946 620, jcfs0860@hotmail.com); vicepresidenta Paloma Fernandez (protea2007@gmail.com); vecino Rafael Sanchez (91 773 40 44). '
                    'OJO: CIF con E (E78227840). PEM 96.038,48. Visados TL/016204/2021 y TL/014615/2025. Expediente 115/2022/00372. Superficie 69 m2. Licencia concedida ago-2023; obra hasta ago-2025 + ampliacion de plazo (jul-2025). Comercial: DANIEL.'},
    ('ascensor', 'subvenciones', 'licencia'), n=fijar('cañada46', 2022), adm=PU['guerrero'], trae_pu=PU['godino'])
rellenar('cñ6', 'CAÑADA 6', 'cañada6', {'fecha_apertura': '2025-09-12',
    'origen_notas': 'Fecha de llegada: 09/2025. Contacta: Adolfo Collado (MC GESTION FINCAS). Tipo de obra: HUMEDADES EN TRASTEROS + CSS: memoria tecnica / proyecto segun la base de HUMETEC (dos bombas de achique alternas en una arqueta). Distrito Moratalaz. '
                    'Comercial interno: DANIEL. HE enviada 12/09/2025.'},
    ('memoria_valorada', 'css'), n=fijar('cañada6', 2025), adm=PU['collado'], trae_pu=PU['collado'])
rellenar('cñ8', 'CAÑADA 8', 'cañada8', {'fecha_apertura': '2025-07-18', 'referencia_catastral': '5530310VK4753B',
    'origen_notas': 'Fecha de llegada: 07/2025. Contacta: Adolfo Collado (MC GESTION FINCAS; lo lleva Alberto Olvera). Tipo de obra: SATE con subvencion y CAEs (conjunto homogeneo con Cañada 2, 4 y 6); en ene-2026, ademas, informe de deficiencias de las terrazas. '
                    'Distrito Moratalaz. Tecnico: Julio -> modificaciones Jacob. Fecha encargo: 24/07/2025. Ano 1964. Contrata elegida: Elecnor (Javier Velasco; ascendentes por fuera con una subcontrata). Por ECU (ACTECU); tasas reclamadas una y otra vez. '
                    'Conserje (para la IEE): Pilar, 625 180 744. PEM 287.001,46. Superficie 435,95. Comercial interno: DANIEL.'},
    ('sate', 'subvenciones', 'caes', 'informe_tecnico'), n=fijar('cañada8', 2025),
    comunidad={'iban': 'ES21 0081 5638 4100 0118 4627'}, presi=('JUAN ALFONSO ALVAREZ TRIGO', 'presidente', '643808352', '51887937Y'), trae_pu=PU['alberto_mc'])
rellenar('can44', 'CANARIAS 44', 'canarias44', {'fecha_apertura': '2026-01-14',
    'origen_notas': 'Fecha de llegada: 01/2026. Contacta: Domingo (PALAFIN, d.palomor@palafin.es) - no esta en la agenda. Tipo de obra: SUBVENCION EXTERNA. HE enviada. En la ficha: comercial interno CARLOS (ene-2026).' + CAPTO_CARLOS},
    ('subvenciones',), n=[('2026-01-14', 'HE ENVIADA')], captador=CARLOS, lleva=ALVARO)
d = b.leer('personas_comunidad?select=id,telefono&nombre=eq.' + quote('JOSE ANGEL /'))
if d: act('personas_comunidad?id=eq.' + d[0]['id'], {'nombre': 'JOSE ANGEL', 'telefono': d[0]['telefono'] or '630474161'})

# ================================================================= 2. ORGANISMOS Y AGENDA
COLABORA = organismo('COLABORA (ECU)', 'ecu', 'autonomico', 'Entidad colaboradora urbanistica: la eligio la comunidad de Camarena 75 (2025) y gestiono ella la DR.', ca='COMUNIDAD DE MADRID')
CARA = junta(11, 'Carabanchel')
persona_nueva('Ana María', 'Ferrero Mangas', None, '914 803 535 / 915 132 110', None, organismo=CARA, notas_='Junta de Carabanchel (Camino de las Cruces 28, 2022-25).')
junta(14, 'Moratalaz')
JUANA = persona_nueva('Juana', 'González Martín', None, None, None, empresa=ACAYMA, notas_='Acayma (comunidades@acayma.com): pide las IEEs de Camarena 134 y 256 (feb-2026).')
persona_nueva('Álvaro', None, None, '91 477 41 91 / 91 478 69 11', 'alvaro@delbrioyblanco.es', empresa=DELBRIO)

# ================================================================= 3. CLON
cl = lambda c, a, s=None: J(fijar(c, a, s))
for carp, fecha, trajo, t in [
        ('camarena134', '2026-02-24', 'JUANA GONZALEZ (ACAYMA); por Raul Cerezo', 'CAMARENA 134 MADRID. Fecha: 02/2026. Tipo de obra: IEE. Administracion: Acayma (Juana Gonzalez Martin, comunidades@acayma.com). La HE se la pasa Raul Cerezo al cliente.' + CEREZO + ' Viva.\n\n'
         + cl('camarena134', 2026, ('2026-02-24', 'Correo de Acayma del 24 de febrero de 2026.'))),
        ('camarena256', '2026-02-24', 'JUANA GONZALEZ (ACAYMA); por Raul Cerezo', 'CAMARENA 256 MADRID. Fecha: 02/2026. Tipo de obra: IEE. Administracion: Acayma (Juana Gonzalez Martin). La HE se la pasa Raul Cerezo al cliente.' + CEREZO + ' Viva.\n\n'
         + cl('camarena256', 2026, ('2026-02-24', 'Correo de Acayma del 24 de febrero de 2026.'))),
        ('caminodelascruces62', '2026-03-01', 'PAZ TERRADILLO (CIUDADELA)', 'CAMINO DE LAS CRUCES 62 MADRID. Fecha: 03/2026. Tipo de obra: ASCENSOR. Hay escaneo 3D. En la ficha: comercial interno CARLOS.' + EXT + ' Viva.\n\n' + cl('caminodelascruces62', 2026)),
        ('caminoviejodeleganes237', '2025-11-13', 'EFFIC', 'CAMINO VIEJO DE LEGANES 237 MADRID. Fecha: 11/2025. Tipo de obra: ASCENSOR + ELEVADOR + CENTRALIZACION ELECTRICA (sin 3D). Comercial interno: CARLOS (la capto antes de irse; la lleva Alvaro). Viva.\n\n'
         + cl('caminoviejodeleganes237', 2025)),
        ('campodepaloma34', '2026-03-26', 'ALVARO (DEL BRIO Y BLANCO)', 'CAMPO DE LA PALOMA 34 MADRID. Fecha: 04/2026. Tipo de obra: IEE. Administracion: Del Brio y Blanco (Alvaro, alvaro@delbrioyblanco.es). Comercial interno: ALVARO. Viva.\n\n'
         + cl('campodepaloma34', 2026, ('2026-03-26', 'Correo de Del Brio del 26 de marzo de 2026.')))]:
    fila(carp, fecha, 'abierta', None, trajo, None, None, t, comercial='Alvaro' if carp in ('caminodelascruces62', 'caminoviejodeleganes237', 'campodepaloma34') else 'Daniel')
REVS = [
    ('calahorra26', '2024-11-14', 'JOSE MANUEL SAYAGO (ADMINISTRACION ATOCHA)', 'CALAHORRA 26 MADRID. Fecha: 11/2024. Tipo de obra: ASCENSOR (aprobada la opcion por la zona posterior). Distrito Vicalvaro. Administracion: Administracion Atocha (C/ Villalmanzo 6; '
     '91 776 99 49; jm.sayago@adminatocha.es; incidencias@adminatocha.es) - no esta en la agenda. Contactos: Carlos (1oA, 660 372 947); Maria del Sol, comision de obra (647 08 47 95). Presupuestos de obra (con IVA): Ascensores Alcala 152.112; '
     'Solventia 265.000; Disel Studio 255.258. Nuestro presupuesto, aprobado (feb-2025).\n\n' + cl('calahorra26', 2024)),
    ('camarena136', '2023-10-18', 'RAUL CEREZO', 'CAMARENA 136 MADRID. Fecha: 10/2023. Tipo de obra: ASCENSOR ("igual que Paseo de Extremadura 244"). Barrio: Aluche. Presupuesto de ascensor enviado (26/10/2023): 50% al encargo y 50%...; subvenciones aparte; '
     '"OJO COMISIONES para el".' + CEREZO + '\n\n' + cl('camarena136', 2023)),
    ('camarena190', '2024-09-27', 'ACAYMA (Maria Jose Donaire / Sonia / Fernando)', 'CAMARENA 190 MADRID. Fecha: 09/2024. Tipo de obra: ASCENSOR. Distrito Latina. Las zonas comunes son mas cortas que en Camarena 200: no cabe un ascensor accesible de silla de ruedas.'),
    ('caminodevalderribas38', '2022-03-01', 'JOSE Mª GALVEZ (FAIN); luego Juan Paramio y Jose Luis', 'CAMINO DE VALDERRIBAS 38 MADRID. Fecha: 03/2022. Tipo de obra: ASCENSOR (invadiendo un poco el local del gimnasio). Distrito 13 - Puente de Vallecas (Numancia). '
     '3D presentado el 28/04/2022. Hay hoja de direccion de obra en el colegio.'),
    ('canciondelolvido23', '2023-11-23', 'RAUL CEREZO', 'CANCION DEL OLVIDO 23 MADRID. Fecha: 12/2023. Tipo de obra: ASCENSOR (con cambio de estructura), DF, CSS Y SUBV. Distrito 17 - Villaverde (Angeles).' + CEREZO)]
for carp, fecha, trajo, t in REVS:
    fila(carp, fecha, 'abierta', None, trajo, None, None, t + REV)
fila('caminoviejodeleganes39', '2015-07-24', 'cerrada', 'Perdida: "OJO se lo dieron a ANYLOR en marzo 2016".', 'PEDRO ARANDA (THYSSEN)', None, '9663903VK3696D',
     'Calle CAMINO VIEJO DE LEGANES 39 MADRID. Fecha: xx/20xx (planos de jul-2015). Distrito 11 - Carabanchel (Opañel). Baja + 3; no tocamos la pared del patio; debajo hay sotano; se modifican contadores.')
for carp, fecha, trajo, t in [
        ('caceres17', '2016-10-31', 'PEDRO ARANDA (THYSSEN)', 'Calle CACERES 17 MADRID. Fecha: 10/2016. Distrito 02 - Arganzuela (Delicias). Ficha vacia; hay croquis.'),
        ('cadarso9', '2016-10-22', 'LUIS MIGUEL NUNES (THYSSEN)', 'CALLE CADARSO 9 MADRID. Fecha: 10/2016. Distrito 09 - Moncloa-Aravaca (Arguelles). Solo la propuesta de obra de Thyssen (foso, estructura, cerramiento de vidrio, cuarto de maquinas en -1...).'),
        ('camarena210', '2015-12-01', 'FELIPE OSADO (ENOR)', 'Calle CAMARENA 210 MADRID. Fecha: 12/2015. Distrito 10 - Latina (Aluche). Santiago (3o2), 659 070 877, "enfadado porque dice que no le he atendido rapido". Instalacion por patio, similar a Camarena 284.'),
        ('camarena262', '2015-12-01', 'FELIPE OSADO (ENOR)', 'Calle CAMARENA 262 MADRID. Fecha: 12/2015. Distrito 10 - Latina (Aluche). Hipolito (3oD), 630 718 316. Enor oferto por el interior de la escalera; quiere opcion por patio.'),
        ('camarena284', '2015-12-01', 'FELIPE OSADO (ENOR)', 'Calle CAMARENA 284 MADRID. Fecha: 12/2015. Distrito 10 - Latina (Aluche). Juan Antonio Ruiz (1oD), 917 193 645. Ficha vacia.'),
        ('campodelapaloma22', '2016-07-08', 'PEDRO ARANDA (THYSSEN)', 'Calle CAMPO DE LA PALOMA 22 MADRID. Fecha: 06/2016. Distrito 13 - Puente de Vallecas (Palomeras Sureste). Ficha vacia; hay croquis.'),
        ('cadalsodelosvidrios10', '2021-12-02', None, 'CADALSO DE LOS VIDRIOS 10 MADRID. Carpeta SIN ficha de datos: solo una hoja de oferta de SATE (fachada 10 cm + cubierta con losa filtrante; 90.300 + IVA; dic-2021).'),
        ('cadetejuliollopart26', '2015-10-18', None, 'CADETE JULIO LLOPART 26 MADRID. Carpeta SIN ficha de datos: documentos de 2015-2017.'),
        ('camarena236', '2015-05-11', None, 'CAMARENA 236 MADRID. Carpeta SIN ficha de datos: un .doc (mayo 2015).'),
        ('camarena330', '2015-03-07', None, 'CAMARENA 330 MADRID. Carpeta SIN ficha de datos: un .doc (2015).'),
        ('camarena(ocaña)', '2014-12-06', None, 'Carpeta "camarena(ocaña)": en realidad son planos de OCAÑA 308 (dic-2014 - mar-2015). SIN ficha de datos.')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 4. MANIAS
mania('En Carabanchel denegaron la DR del ascensor por fachada: hubo que pedir LICENCIA y recurrir la denegacion (2022-24).', 'Junta Municipal de Distrito de Carabanchel', '2022-09-27', 'caminodelascruces28', clave='cru28',
      cita='111/2022/03529 DR DENEGADA / 350/2022/08006 LICENCIA (27-09-2022) / 111/2024/00171 RECURSO DENEGACION')
mania('El Plan Regional de Ascensores (CAM), si da la cuantia maxima (90.000), no es compatible con ninguna otra ayuda, sea del organo que sea.', 'Comunidad de Madrid (Plan Regional de Ascensores)', '2023-12-29', 'caminodelascruces28', clave='cru28',
      cita=next((t for f, t in n28 if 'Plan Regional de Ascensores' in t), 'Tal como comuniqué el 29/12/2023 ... el "Plan Regional de Ascensores 2023", éste programa en el que a la comunidad se le asigna la cuantía máxima del programa (90.000,00€) no es compatible con otras ayudas indistintamente del órgano gestor.'))
mania('Si el ascensor invade espacio, es LICENCIA; la Junta de Moratalaz llego a tener 5 proyectos por delante (meses de espera) y no se puede dar luz verde al proyecto hasta que la concedan.', 'Junta Municipal de Distrito de Moratalaz', '2022-03-10', 'cañada46',
      clave='cñ46', trozo='invasión de espacio')
mania('Plazo de la subvencion (Rehabilita): 24 meses desde la resolucion, o desde la licencia si se concede despues; y 3 meses para justificar. Se puede pedir ampliacion (suelen dar 6 meses), pero antes de que venza.', 'Ayuntamiento de Madrid (Plan Rehabilita)', '2025-03-07', 'cañada46',
      clave='cñ46', cita='Esta Comunidad tuvo la resolución definitiva de la subvención el 5 de abril de 2023 por lo que, hay 24 meses para la terminación de las actuaciones (05/04/2025) y 3 meses desde la finalización de la obra para su justificación. Si la licencia fue concedida con posterioridad al 5 de abril de 2023 los 24 meses contarían desde la concesión de la licencia. ... se puede solicitar una ampliación de finalización del plazo pero, habría que hacerlo ya. Suelen dar 6 meses más')
mania('Si la comunidad ya tiene la subvencion concedida con otro proyecto y otra contrata, el cambio hay que justificarlo (si no fue por un requerimiento de la licencia, certificado del arquitecto) y el plazo de ejecucion no se mueve.', 'Ayuntamiento de Madrid (Plan Rehabilita)', '2024-05-20', 'camarena200',
      clave='cm200', cita='Para que pueda justificar el cambio de proyecto y cambio de contrata necesito saber si esto fue debido a algún requerimiento de la licencia de obra, de no ser así habrá que hacer un certificado firmado por Daniel ... el plazo de ejecución sigue siendo el mismo')
mania('Precedente admitido: en Villasandino 10 se permitio picar 15 cm a cada lado del muro para encajar el ascensor (se usa de referencia).', 'ECU (ACTECU)', '2026-06-08', 'camarena304', clave='cm304', trozo='Villasandino')

resumen()
