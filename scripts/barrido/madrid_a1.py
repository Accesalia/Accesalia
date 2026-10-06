# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda A1 (abejuela17 .. altea7, 50 carpetas). 6-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa

DELBRIO = '46b4fe1f-0534-434f-ae7c-cc098fde82cd'; ADN = 'befe42dd-cd7b-4b10-b7b0-433f09971a7b'; NVR = '93dc1e47-e872-4ae0-a9c3-0becb9046569'
PU.update(rosa='64c946bd-e90c-46c0-a7a7-f2b90a4df8d4', mario='26ba7f01-0c19-4d72-9c16-4aa7e5a17d61', miguel_od='e6be66e5-35ae-48e1-8a3d-d325749f3d6a',
          cdelbrio='cf9c0d74-d01a-4ed2-a0f0-8fcaadd6e4ae', proyecton='041f7eb4-fc52-4298-bffc-40c22a4a9dd6', paz='46e3614d-97fd-40bf-baac-07d9bd5e601f',
          aranda='0a2fcfe0-3f8e-417d-a49e-1de02e8ecd1a', hormigos='d5a7c9c4-ea77-4d36-bf38-9104c2c97d9c', cifuentes='37b818c1-fa3b-4a1e-a856-eabe5ba35837',
          silvia='6c8e1a7f-999b-4ee9-ac91-cfeb7075dd8c', tercero='bba769a7-d9ba-40d8-a861-4da851324970', coinsa_parra='6e05ab77-ce9d-4e4e-ba5e-ed8e278842f5')
SEP = (' "Carlos Sepulveda de por medio": es el "CARLOS S", un comercial de Accesalia que duro 4 semanas (le echaron); no trajo nada y hoy no colabora con '
       'nosotros (Monica, 6-oct-2026).')

# ================================================================= 1. PRODUCCION (18; ALFONSO XII queda fuera a proposito)
rellenar('ace18', 'ACEUCHAL 18', 'aceuchal18', {'fecha_apertura': '2024-02-12', 'referencia_catastral': '7416907VK3771E',
    'origen_notas': 'Fecha de llegada: 02/2024. Contacta: Rosa Radal (ROSERSESE). Tipo de obra: ASCENSOR + CSS + subv (subvenciones contratadas por la CP en junio-2026). Barrio: Vista Alegre. Tecnico: Susana. Fecha encargo: 12/02/2024. '
                    'Administracion: FEJISA ASESORES (Mario, hijo de Felix, 626 92 25 41, mario@fejisaasesores.com; o Pilar; 914 628 077; felix@fejisaasesores.com). OJO: CIF con E (E78569407, comunidad de bienes). Visado TL/007847/2024. Por ECU (ACTECU). '
                    'Ya tenian IEE: se les hizo un descuento en la HE de subvenciones, solo esta vez (autorizado por Monica). Comercial: DANIEL.'},
    ('ascensor', 'css', 'subvenciones'),
    n=partir(fijar('aceuchal18', 2024, ('2024-02-12', 'Sin fecha delante; instrucciones del proyecto, de cuando se encargo.')), 0, '---------- Forwarded', '2026-03-18'),
    presi=('SANTIAGO HERNANDEZ REDONDO (4º c)', 'presidente', None, '06509992A'), adm=PU['mario'], trae_pu=PU['rosa'])
rellenar('alam4', 'ALAMEDA 4', 'alameda4', {'fecha_apertura': '2026-02-01',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia desconocido). Tipo de obra: ASC (2 UNIDADES). Administracion: INTEGRAL DE COMUNIDADES (incidencias@integraldecomunidades.es). OJO: CIF con E (E78298577). Presidenta: Inmaculada, 627 46 87 05. '
                    'La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + EXT + ' Dentro de su carpeta esta colada la de ALBALATE DEL ARZOBISPO 5 (va a la clon con su ruta).'},
    ('ascensor',), captador=ALVARO, lleva=ALVARO)
rellenar('aa68', 'ALBERTO AGUILERA 68', 'albertoaguilera68', {'fecha_apertura': '2025-06-17', 'referencia_catastral': '9460413VK3796A',
    'origen_notas': 'Fecha de llegada: 06/2025. Contacta: el administrador, Miguel A. Delgado (FINCAS ORTEGA DELGADO, Calle Rodriguez San Pedro 2, 3o, of. 302; 91 594 39 33), "es el nuevo de Huerta del Bayo 13". '
                    'Tipo de obra: SUBVENCION de un PROYECTO EXTERNO de PLATAFORMA ("INFINITAS A EXITO"). Fecha encargo: 17/06/2025. Comercial interno: CARLOS.' + CAPTO_CARLOS + ' La ficha no tiene notas.'},
    ('subvenciones',), presi=('MARIA ANTONIA LOZANO CARRASCO', 'presidente', '655 38 23 19', '06994627M'), trae_pu=PU['miguel_od'], captador=CARLOS, lleva=ALVARO)
rellenar('alc320', 'ALCALA 320', 'alcala320', {'fecha_apertura': '2025-10-30',
    'origen_notas': 'Fecha de llegada: 11/2025 (el correo de Schindler es del 30/10/2025). Contacta: Javier Rodriguez Martin (Schindler, 685 286 041). Tipo de obra: BAJADA A COTA 0 DE ASCENSOR + SUBV (ascensor de 300 kg, doble embarque 180, '
                    'puertas manuales; escalones al ascensor y al portal). OJO: CIF con E (E78338878). Comercial interno: DANIEL. HE enviada 7/11/2025.'},
    ('cota_cero', 'subvenciones'), n=fijar('alcala320', 2025, ('2025-10-30', 'Correo de Javier Rodriguez (Schindler) del 30 de octubre de 2025.')),
    presi=('MARIA LUISA DIAZ', 'presidente', '686 744 137', None, 'marisa_pumar@hotmail.com'), trae_pu=PU['jrodriguez'])
LESMES = persona_nueva('Lesmes', 'Zaballos', None, '91 477 41 91 / 91 478 69 11', 'lesmes@delbrioyblanco.es', empresa=DELBRIO)
rellenar('ag38', 'ALCALÁ DE GUADAIRA 38', 'alcaladeguadaira38', {'fecha_apertura': '2025-07-01',
    'origen_notas': 'Fecha de llegada: 06/2025 (el correo de Del Brio es del 01/07/2025). Contacta: Lesmes Zaballos (DEL BRIO Y BLANCO). Tipo de obra: ASCENSOR (6 plazas, 450 kg, 6 paradas, doble embarque 180; derribo de escalera '
                    'e invasion de espacio publico). Contacto en la finca: Manoli, 2o dcha. Comercial interno en la ficha: ALVARO (la HE se volvio a enviar el 28/04/2026); la capto Daniel en 2025.'},
    ('ascensor',), n=partir(fijar('alcaladeguadaira38', 2025, ('2025-07-01', 'Correo de Lesmes Zaballos del 1 de julio de 2025.')), 2, 'HE ENVIADA 28/04/2026', '2026-04-28'),
    huecos=H(('CONTACTO', 'Manoli, 2o dcha. · 651 817 956 · bordadoselbastidor@hotmail.com')), trae_pu=LESMES, adm=LESMES, captador=DANIEL, lleva=ALVARO)
c, _ = info('ALCALÁ DE GUADAIRA 38')
MANOLI = pc(c['id'], 'Manoli (2º dcha.)', 'vecino', '651817956', None, 'bordadoselbastidor@hotmail.com', 'Contacto para visitar (correo de Del Brio, jul-2025).')
act('oportunidades?id=eq.' + OPP['ag38'][1], {'persona_comunidad_id': MANOLI})
rellenar('ag41', 'ALCALA DE GUADAIRA 41', 'alcaladeguadaira41', {'fecha_apertura': '2024-12-12', 'referencia_catastral': '4313765VK4741C',
    'origen_notas': 'Fecha de llegada: 12/2024. Contacta: Daniel (DEL BRIO Y BLANCO; Calle Peña de la Miel 1, local; 91 477 41 91 / 680 503 243; poner en copia a iuris.garrote@gmail.com, 634 222 992; facturas a facturacion@delbrioyblanco.es). '
                    'Tipo de obra: ASCENSOR ("como el de Venancio Martin 48"). Barrio: Palomeras Bajas. Tecnico: Israel => Carlos. Fecha encargo: 13/12/2024. Ano 1960. Contrata elegida: SCHINDLER. Visado TL/000968/2025. Expediente 350/2025/06358. '
                    'Licencia presentada 03-03-2025 en la Junta de Puente de Vallecas (Medio Ambiente y Escena Urbana: tala y trasplante de arboles). HE de subvenciones firmada sep-2026. Comercial: DANIEL.'},
    ('ascensor', 'subvenciones'),
    n=fijar('alcaladeguadaira41', 2024, otros={1: ('2025-01-22', 'En la ficha pone 22/01/2024, pero va despues del 12/12/2024: errata de 22/01/2025.')}),
    huecos=H(('TECNICO', 'ISRAEL => carlos'), ('CONTACTO', 'Poner en copia a iuris.garrote@gmail.com · 634 222 992')),
    comunidad={'iban': 'ES92 0081 7115 1900 0182 1587'}, presi=('CESAR AUGUSTO ARANGO GARROTE', 'presidente', None, '52011526Q'), adm=PU['dbrio'], trae_pu=PU['dbrio'])
rellenar('alco27', 'ALCOCER 27', 'alcocer27', {'fecha_apertura': '2025-10-01',
    'origen_notas': 'Fecha de llegada: 09/2025 (el correo es del 01/10/2025). Contacta: David (PROYECTON, info@proyecton.es), que pide nuestros honorarios y la partida de ascensor para su presupuesto a la comunidad. Tipo de obra: ASCENSOR. '
                    'Hay proyecto externo en 1.DATOS. Comercial interno: DANIEL. HE enviada 02/10/2025.'},
    ('ascensor',), n=fijar('alcocer27', 2025, ('2025-10-01', 'Correo de Proyecton del 1 de octubre de 2025.')), trae_pu=PU['proyecton'])
rellenar('am62', 'ALEJANDRO MORAN 62', 'alejandromoran62', {'fecha_apertura': '2026-02-01',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia desconocido). Tipo de obra: ASCENSOR. Ficha sin contacto ni notas. En la ficha: comercial interno CARLOS.' + EXT},
    ('ascensor',), captador=ALVARO, lleva=ALVARO)
rellenar('aa20', 'ALFREDO ALEIX 20', 'alfredoaleix20', {'fecha_apertura': '2026-01-22', 'referencia_catastral': '6091416VK3669A',
    'origen_notas': 'Fecha de llegada: 01/2026. Contacta: Paz Terradillos (CIUDADELA, 609 05 89 53). Tipo de obra: SATE + SUBV (proyecto de rehabilitacion de envolvente termica; se anade el cambio de la cubierta del edificio residencial; '
                    'y retirada de cubierta con amianto en el local, edificio REMAR). Tecnico: Jhacob. Fecha encargo: 09/02/2026. Ano 1965. Por ECU (ACTECU). PEM 362.265,07. Superficie 684,69. '
                    'Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('sate', 'cubierta', 'subvenciones'), n=fijar('alfredoaleix20', 2026),
    comunidad={'iban': 'ES25 2100 6352 3613 0061 4499'}, presi=('RAFAEL BOTIAS TORRES', 'presidente', None, '50219934D', 'rafaelbotiastorres@gmail.com'), trae_pu=PU['paz'], captador=CARLOS, lleva=ALVARO)
rellenar('aa33', 'ALFREDO ALEIX 33', 'alfredoaleix33', {'fecha_apertura': '2026-02-09',
    'origen_notas': 'Fecha de llegada: 02/2026. Contacta: Paz Terradillos (CIUDADELA). Tipo de obra: SATE. La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + EXT},
    ('sate',), trae_pu=PU['paz'], captador=ALVARO, lleva=ALVARO)
rellenar('aa44', 'ALFREDO ALEIX 44', 'alfredoaleix44', {'fecha_apertura': '2026-05-20',
    'origen_notas': 'Fecha de llegada: 05/2026. Contacta: Paz Terradillos (CIUDADELA; "609 05 89 53, llamar SOLO a este telefono"; 919 01 50 88). Tipo de obra: SATE + CUBIERTA + SUBV (45 viviendas; cubierta 512 m2 + fachada 1.740 m2; '
                    '"es como dos edificios", como San Herculano 2). En la ficha: comercial interno CARLOS G.' + EXT},
    ('sate', 'cubierta', 'subvenciones'), n=fijar('alfredoaleix44', 2026, ('2026-05-20', 'Correo de Carlos Garcia del 20 de mayo de 2026.')), trae_pu=PU['paz'], captador=ALVARO, lleva=ALVARO)
rellenar('acc24', 'ALFREDO CASTRO CAMBA 24', 'alfredocastrocamba24', {'fecha_apertura': '2020-03-23', 'referencia_catastral': '3210903VK4731A',
    'origen_notas': 'Fecha de llegada: 03/2020. Contacta: el administrador (DEL BRIO Y BLANCO: Carlos, 914 78 69 11; Manuel Blanco, 616 427 062). Tipo de obra: INSTALACION DE ASCENSOR (FAIN; jefe de obra Victor Esquinas, con Abel Bernardos). '
                    'Barrio: San Diego. Tecnico: Dennis. Fecha encargo: 23/03/2020. PEM 85.473,95; residuos 300. Expediente 114/2020/04732. Licencia. Z4. CFO TL/010332/2024: obra terminada; queda abierta (no se inventa fecha de cobro). '
                    'En 2025, HE de subvenciones firmada (23-06-2025). Junta de Puente de Vallecas: nlicenciaspvallecas@madrid.es; Marta Aragon Sanchez, aragonsm@madrid.es. Comercial: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('alfredocastrocamba24', 2022),
    huecos=H(('CONTACTO', 'Del Brio y Blanco: carlos@delbrioyblanco.es; jacinto.pizarroleon@gmail.com; manuel@delbrioyblanco.es')),
    comunidad={'iban': 'ES28 0081 7115 1600 0192 9295'}, trae_pu=PU['cdelbrio'])
rellenar('alg5', 'ALGABA 5', 'algaba5', {'fecha_apertura': '2016-01-15', 'referencia_catastral': '7517414VK3771H',
    'origen_notas': 'Fecha: la ficha dice 01/2020, pero el croquis es de enero-2016 y los expedientes empiezan en 2016 (111/2016/07194, 111/2017/02279, 111/2017/07021, 111/2019/04767). Contacta: Pedro Aranda (THYSSEN, hoy TKE). '
                    'Tipo de obra: ASCENSOR (hidraulico, piston lateral, 375 kg / 5 personas; foso 1.300 y huida 3.500 por la nueva normativa). Barrio: San Isidro. Tecnico: Dennis -> cuadro electrico Karla. '
                    'Administracion: GLOBAL FINCA GESTORES (Jose Hormigos; C/ Alondra 50; 91 022 82 32; globalfinca@gmail.com). Junta de Carabanchel: Sara Paton. PEM 92.437; residuos 300; obra 110.000 + IVA. Fachada 64,08 m. '
                    'Facturacion: 20% al llegar la licencia, 20% con el CFO. Licencia 03/10/2022 (se rehizo el proyecto con nube de puntos para TKE, sin cobrar). CFO TL/015718/2024: obra terminada; queda abierta. '
                    'Ago-2025: planos del cuarto de electricidad para Iberdrola. Comercial: DANIEL.'},
    ('ascensor',), n=fijar('algaba5', 2022, ('2016-01-15', 'Sin fecha delante: los datos del ascensor del proyecto.')),
    presi=('Julián García Pascual',), adm=PU['hormigos'], trae_pu=PU['aranda'])
ANTONIO_ADN = persona_nueva('Antonio', 'Carmona', None, '686 573 750', 'antoniocarmona@grupoadn.es', contrata=ADN)
persona_nueva('Johana', 'Zambrano', None, None, 'johanazambrano@grupoadn.es', contrata=ADN)
rellenar('algo2', 'ALGODRE 2', 'algodre2', {'fecha_apertura': '2025-10-01', 'referencia_catastral': '7317506VK3771G',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia desconocido). Contacta: la administradora, Monica Cifuentes Matito (SMFINCAS, Av. Rey Juan Carlos I 84, Leganes; 625 886 456). Tipo de obra: SATE + SUBV (proyecto de rehabilitacion de envolvente termica). '
                    'Tecnico: Carlos Alberto. Fecha encargo: 20/11/2025. Contrata: GRUPO ADN (Antonio Carmona, 686 573 750; Johana Zambrano). Ano: Catastro dice 1994; los vecinos, 1964. Por ECU (ACTECU); licencia concedida 18/03/2026. '
                    'PEM 272.759,79. Visado TL/002463/2026. Superficie 613,8. Comercial interno: CARLOS.' + CAPTO_CARLOS + ' La obra no empezo en junio-2026 por un inconveniente de la comunidad; oct-2026: dudas por el color de la fachada.'},
    ('sate', 'subvenciones'), n=fijar('algodre2', 2025),
    comunidad={'iban': 'ES47 2085 9255 4903 3002 1203'}, presi=('CRISTINA NUÑEZ PEÑA', 'presidente', '646886456', '50108897Q', 'cristina7510@msn.com'),
    adm=PU['cifuentes'], trae_pu=PU['cifuentes'], captador=CARLOS, lleva=ALVARO)
rellenar('alo25', 'ALORA 25', 'alora25', {'fecha_apertura': '2026-04-17',
    'origen_notas': 'Fecha de llegada: 04/2026. Contacta: Pedro Olivares, presidente (655 671 424). Tipo de obra: SATE. Barrio: Palomeras Sureste. Comercial interno: ALVARO. La ficha no tiene notas; su cabecera dice "ALORA 11" (copiada de la de Alora 11).'},
    ('sate',), presi=('PEDRO OLIVARES', 'presidente', '655671424'), trae_pc='presi', captador=ALVARO, lleva=ALVARO)
rellenar('alt32', 'ALTAMIRANO 32', 'altamirano32', {'fecha_apertura': '2026-02-01', 'referencia_catastral': '9060907VK3796A',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia desconocido). Contacta: Silvia Arribas (ARRIALSI, Camino de Ganapanes 35, local AF; 917 307 033 / 665 805 356; info@ y secretaria@arrialsi.com). Tipo de obra: SATE + ACCESIBILIDAD '
                    '(dos HE, firmadas 10-06-2026). Tecnico: Carlos Daza. Fecha encargo: 10/06/2026. Ano 1970. Presidenta: Rosa, 644 44 68 15. En la ficha: comercial interno CARLOS GARCIA.' + EXT + SEP},
    ('sate', 'accesibilidad'), n=fijar('altamirano32', 2026, ('2026-02-01', 'Sin fecha delante; ficha de feb-2026.')),
    comunidad={'iban': 'ES93 0081 5474 8100 0141 9849'}, adm=PU['silvia'], trae_pu=PU['silvia'], captador=ALVARO, lleva=ALVARO)
rellenar('alt48', 'ALTAMIRANO 48', 'altamirano48', {'fecha_apertura': '2024-10-24', 'referencia_catastral': '8859605VK3785H',
    'origen_notas': 'Fecha de llegada: 10/2024. Contacta: el administrador, Jose Antonio Tercero (ARCOS OLEA, que tiene la oficina en el mismo edificio, 1o ext. dcha.; 91 543 00 73; j.tercero@arcosolea.es): "es mi casa". '
                    'Tipo de obra: SUBVENCION EXTERNA de SATE (rehabilitacion de patios, fachada, medianeras y cubierta por IEE y orden de ejecucion; SATE en los 5 patios y medianeras; la fachada esta protegida). Proyecto externo. '
                    'Presidenta: Maria Jose Tercero Calero, hermana del administrador (en la ficha "6806286345 - REVISAR ESTE NUMERO, ESTA MAL"). Comercial: DANIEL.'},
    ('subvenciones',), n=fijar('altamirano48', 2024), presi=('MARIA JOSE TERCERO CALERO', 'presidente', None, '33505884J'), adm=PU['tercero'], trae_pu=PU['tercero'])
rellenar('alte7', 'ALTEA 7', 'altea7', {'fecha_apertura': '2025-01-08', 'referencia_catastral': '9496535VK3799E',
    'origen_notas': 'Fecha de llegada: 01/2025. Contacta: Javier Parra (COINSA, fjparra@ascensorescoinsa.com), que es tambien la constructora. Paga la CP ("no se hace factura"). Tipo de obra: ASCENSOR EXTERIOR CON PASARELA RECTA. '
                    'Barrio: Valdezarza. Tecnico: Jhonatan. Fecha encargo: 08/01/2025. Ano 1958. Licencia del Ayto presentada 10-03-2025 (TL/002355/2025; expediente 350/2025/07227), concedida dic-2025. Junta de Moncloa: 91 141 77 14 / 917 310 296. '
                    'Comercial: DANIEL.'},
    ('ascensor',), n=fijar('altea7', 2025), presi=('CARLOS LOZANO GARRIDO', 'presidente', None, '51705666X'), trae_pu=PU['coinsa_parra'])

# arreglos: presidentas grabadas con una barra en el nombre
for mal, bien, tel in (('INMACULADA /', 'INMACULADA', '627 46 87 05'), ('ROSA /', 'ROSA', '644 44 68 15')):
    d = b.leer('personas_comunidad?select=id,telefono&nombre=eq.' + quote(mal))
    if d: act('personas_comunidad?id=eq.' + d[0]['id'], {'nombre': bien, 'telefono': d[0]['telefono'] or tel})

# ================================================================= 2. ORGANISMOS
AYTO = organismo('Ayuntamiento de Madrid', 'ayuntamiento', 'municipal')
LAT = junta(10, 'Latina', direccion='Av. del General Fanjul 3')
LIC_LAT = area(LAT, 'Negociado de licencias', '91 588 97 32', 'Dato de 2017 (Abejuela 17).')
persona_nueva('Carlos', 'Borrallo', 'técnico', '91 588 98 23 / 91 588 97 64 / 91 588 51 97', None, organismo=LAT,
              notas_='Junta de Latina (Abejuela 17, 2017): se le ve los martes de 9 a 12 en C/ Fuerte de Navidad 15; llamar antes por si no esta.')
SB = junta(20, 'San Blas-Canillejas', direccion='Av. de Arcentales 28')
area(SB, 'Negociado de licencias', '91 588 80 35 / 91 588 80 28 / 91 588 80 30', 'Lunes, miercoles y viernes de 9:00 a 10:30, sin cita (2017).')
persona_nueva('Juan Andrés', 'Sánchez', None, '91 588 80 14', None, organismo=SB, notas_='Junta de San Blas-Canillejas (Albaida 76, 2017).')
PV = junta(13, 'Puente de Vallecas', direccion='Av. de la Albufera 42')
LIC_PV = area(PV, 'Negociado de licencias', '91 588 73 33', 'Dato de 2017 (Almonacid 24).')
TEC_PV = area(PV, 'Servicios Técnicos', '91 480 35 59', 'Dato de 2017 (Almonacid 24).')
MA_PV = area(PV, 'Medio Ambiente y Escena Urbana', None, 'Informes sectoriales de la licencia (arbolado: tala y trasplante). Alcala de Guadaira 41, 2026.')
if not b.leer('correo?select=id&email=eq.nlicenciaspvallecas@madrid.es'):
    ins('correo', [{'organismo_area_id': LIC_PV, 'email': 'nlicenciaspvallecas@madrid.es', 'etiqueta': 'general', 'principal': True}])
if not b.leer('correo?select=id&email=eq.tecnipvallecas@madrid.es'):
    ins('correo', [{'organismo_area_id': TEC_PV, 'email': 'tecnipvallecas@madrid.es', 'etiqueta': 'general', 'principal': True}])
persona_nueva('Marta', 'Aragón Sánchez', 'técnica', None, 'aragonsm@madrid.es', organismo=PV, notas_='Junta de Puente de Vallecas (Almonacid 24, 2017; Alfredo Castro Camba 24, 2022).')
persona_nueva('Leandro', None, 'técnico municipal', None, 'peralal@madrid.es', organismo=PV, notas_='Junta de Puente de Vallecas (Alcala de Guadaira 41, feb-2026).')
CARA = junta(11, 'Carabanchel')
persona_nueva('Sara', 'Patón', None, None, None, organismo=CARA, notas_='Junta de Carabanchel (Alcaudon 41, 2017; Algaba 5).')
AECU = organismo('A+ECU · A (más) ECU Control Urbanístico', 'ecu', 'autonomico', 'Entidad colaboradora urbanistica. Hizo la inspeccion del ayuntamiento al local de Accesalia (Alhambra 24, ene-2025).',
                 direccion='Calle Arturo Soria 50, local L10, 28027 Madrid', telefono='91 853 43 81', ca='COMUNIDAD DE MADRID')
persona_nueva('Iñaki', 'Sobejano Pérez', None, '91 853 43 81', None, organismo=AECU, notas_='A+ECU (Alhambra 24 local, 2025).')
persona_nueva('Carlos', None, 'dueño', None, None, contrata=NVR, notas_='NVR, contrata de SATE: "CARLOS NVR" en Almogia 2 y Alora 11, mayo-2022 (Monica, 6-oct-2026).')

# ================================================================= 3. CLON
cl = lambda c, a, s=None: J(fijar(c, a, s))
fila('alhambra24 - LOCAL', '2024-02-21', 'abierta', None, 'ACCESALIA (local propio)', None, '6828203VK3762H0001XX',
     'CALLE ALHAMBRA 24, LOCAL 1 (Madrid): EL LOCAL DE ACCESALIA. Licencia de actividad (DR de implantacion de actividad y obra). Barrio/distrito: Latina. Tecnico: Susana. Fecha: 21/02/2024. Ano 1966. '
     'Titular: Soluciones de Accesibilidad y Ecoeficiencia Accesalia, S.L. (B86374055). Constructora: Rosersese. Licencia anterior (fruteria): 110/2007/10433. Cert. de prescripcion urbanistica TL/003958/2025. '
     'DR de actividad y obra jun-2025: 350/2025/17862 (antes ~~350/2024/05712~~ y ~~350/2025/11059~~). Inspeccion de A+ECU el 28/01/2025. Se deja abierta para hacer el seguimiento: '
     'seguimos pendientes de que el ayuntamiento conteste (Monica, 6-oct-2026).\n\n' + cl('alhambra24 - LOCAL/FICHA DATOS TECNICOS.docx', 2024))
fila('alcaudon32', '2026-09-01', 'abierta', None, 'SM FINCAS (via Carlos Garcia, externo)', None, None,
     'ALCAUDON 32 MADRID. Fecha de llegada: 09/2026. Tipo de obra: ELEVADOR Y DERRIBO DE ESCALERAS + SUBV (importe aprox. 130.000). Administracion: SM Fincas. En la ficha: comercial interno CARLOS.' + EXT + ' Viva.\n\n'
     + cl('alcaudon32', 2026, ('2026-10-01', 'Sin fecha delante; va con la hoja del 1-10-26.')), comercial='Alvaro (Carlos externo)')
fila('alonsocano63', '2026-09-17', 'abierta', None, 'ISAAC PIZARROSO (GESTINSA), administrador', None, None,
     'ALONSO CANO 63 MADRID. Fecha de llegada: 09/2026. Tipo de obra: CAEs de un PROYECTO EXTERNO (SATE, medianeras y cubierta, sin visar; parece por orden de ejecucion de 2020). Distrito Chamberi. Administracion: Gestinsa '
     '(Isaac Pizarroso, isaacpizarrosoarnao@gmail.com). Comercial interno: DANIEL. Viva.\n\n' + cl('alonsocano63', 2026))
REVS = [
    ('abejuela17', '2016-06-10', 'FELIPE OSADO (ELECNOR); Saaco Brother', 'H79433082', '6716711VK3761',
     'ABEJUELA 17 MADRID. Fecha: 06/2016. Tipo de obra: ASCENSOR. Distrito 10 - Latina (Aluche). Administracion: Av. Plaza de Toros 7, local bajo; Raquel Molina Perez (696 031 426, raquel.molina@live.com). Presidenta: Maria del Carmen Serrano Hidalgo '
     '(50209763G). Saaco Brother: info@, gema@, emilio@saacobrother.com. Junta de Latina (Av. General Fanjul 3): Carlos Borrallo, 91 588 98 23 / 915 889 764 / 915 885 197; negociado de licencias 91 588 97 32; "hay que verle los martes de 9 a 12 '
     'en C/ Fuerte de Navidad 15; mirar antes si va a estar". PEM 50.000; residuos 300. Expediente 110/2017/05496 LEC/AVS. NZ24. Fachada 30,30; superficie 67,40 m2. Proyecto hecho. (Hay una ficha en blanco de 12/2025 en "0.COPIA ESTRUCTURA DE CARPETAS".)'),
    ('acacias59', '2022-02-01', 'LOLI COBOS', None, None,
     'PASEO DE LAS ACACIAS 59 MADRID. Fecha: 02/2022. Carpeta colada dentro de "abubilla14". Tipo de obra: 2 ASCENSORES + POCERIA + AISLAMIENTO TERMICO TECHO, ESTUDIO DE DEFICIENCIAS CONSTRUCTIVAS (CSS aparte). Distrito 02 - Arganzuela (Acacias). '
     'Contacto: Loli Cobos, 620 82 93 45, 7mlo.ly@gmail.com.\n\n' + cl('abubilla14/acacias59/FICHA DATOS TECNICOS.docx', 2022, ('2022-02-01', 'Sin fecha; ficha de feb-2022.'))),
    ('acuerdo34', '2025-02-20', 'JUAN PARAMIO (FAIN); presidenta Inmaculada Parrondo', None, None,
     'ACUERDO 34 MADRID (Edificio Princesa: mancomunidad de Santa Cruz de Marcenado 1, 2, 4 y Acuerdo 34). Fecha: 02/2025. Tipo de obra: bajar el ascensor al primer sotano / abrir una parada (FAIN moderniza los ascensores). '
     'Distrito Centro. Presidenta: Inmaculada Parrondo, 699 45 36 92, parrondoima@gmail.com. Dentro de esta carpeta estan coladas las de AFECTO 5 y AERONAVE 33.\n\n'
     + cl('acuerdo34/FICHA DATOS.docx', 2025, ('2025-02-20', 'Sin fecha delante; mensaje de Juan Paramio anterior al correo del 20/02/2025.'))),
    ('afecto5', '2025-09-01', 'JULIO GARCIA (ENVOLTERMIA)', None, None,
     'AFECTO 5 MADRID. Fecha: 09/2025. Carpeta colada dentro de "acuerdo34". Tipo de obra: MICROPORTALES. Julio (Envoltermia, 621 240 657, jgarcia@envoltermia.com). Comercial interno: DANIEL.\n\n' + cl('acuerdo34/afecto5/FICHA DATOS.docx', 2025)),
    ('aeronave33', '2020-08-13', 'IVAN VAZQUEZ (FAIN)', 'H78892098', '0305102VK5800E',
     'CALLE AERONAVE 33 MADRID. Fecha: 08/2020. Carpeta colada dentro de "acuerdo34". Tipo de obra: INSTALACION DE ASCENSOR. Distrito 21 - Barajas (Timon). Tecnico: Enrique. Jefes de obra: Ma Angeles Perez, Abel Bernardos. '
     'Administracion: Juan Carlos Areste (676 120 100, adfincasareste@gmail.com). Presidente: Jose Miguel Mañero Montes (52865513J). PEM 53.512,38; residuos 300. Visado TL/013778/2020; CFO TL/004914/2024: obra terminada. '
     'Contacto FAIN: Ivan Vazquez, 669 148 318.\n\n' + cl('acuerdo34/aeronave33/FICHA DATOS TECNICOS.docx', 2022, ('2022-01-10', 'Sin fecha; la reunion es del 24/01/22.'))),
    ('agustindefoxa19', '2022-01-21', 'ALFONSO RODRIGUEZ (CRS GESTION)', None, None,
     'AGUSTIN DE FOXA 19 MADRID. Fecha: 2022. Distrito 05 - Chamartin (Castilla). Contacto: Alfonso Rodriguez, 605 627 152, info@crsgestion.es. Hay unas fotos enviadas por WhatsApp el 21/01/2022. Nada mas.'),
    ('ainsa18', '2023-06-26', 'JAVIER VELASCO (ELECNOR)', None, None,
     'AINSA 18 MADRID. Fecha: 10/2023 (visitado el 26/06/2023). Tipo de obra: ASCENSOR con ocupacion de cocinas / galerias. Distrito 20 - San Blas-Canillejas (Rosas). Javier Velasco, 680 967 159. Felix, expresidente: 699 442 921.\n\n' + cl('ainsa18', 2023)),
    ('albalatedelarzobispo5', '2024-11-12', 'DAVID SANCHEZ (FAIN)', 'H80814924', None,
     'ALBALATE DEL ARZOBISPO 5 MADRID. Fecha: 11/2024. Carpeta colada dentro de "alameda4". Tipo de obra: SUBVENCION EXTERNA de un proyecto de ascensor (por hueco; el proyecto no lo hicimos: no hubo acuerdo con FAIN). Distrito Puente de Vallecas. '
     'Administracion: Del Brio y Blanco (Manuel / Carlos, 616 42 70 62, manuel@delbrioyblanco.es). Presidente: Luis Lopez Almazan (05894982J). Cuenta ES18 2085 9741 7203 3032 3964. HE de subvenciones firmada 23-06-2025.\n\n'
     + cl('alameda4/albalatedelarzobispo5/FICHA DATOS TECNICOS.docx', 2024)),
    ('albaida76', '2017-05-01', 'JUAN LUIS (INVER) - EXPRESS, Felipe Osado', None, '8062109VK4786A',
     'CALLE ALBAIDA 76 MADRID. Fecha: 04/2017. Tipo de obra: ASCENSOR. Distrito 20 - San Blas-Canillejas (Hellin). Administracion: AGISA (Eduardo Barranquero Sanchez, 913 043 610, eduardo.barranquero@agisa.es). Presidente: Mariano Larriba Roy (02973388V); '
     'Angel, 635 89 43 62. Junta de San Blas (Av. Arcentales 28): Juan Andres Sanchez 91 588 80 14; negociado de licencias 91 588 80 35 / 80 28 / 80 30, L-X-V 9:00-10:30, sin cita. PEM 50.000; residuos 300. Expediente 117/2017/02178. NZ 3.1.a. '
     'Fachada 23,50; superficie 49,70 m2. Obra en 2021-22 (cambio de Inver a Express; honorarios 1.500 + IVA, parte al final con la puesta en marcha).\n\n' + cl('albaida76', 2021, ('2021-11-04', 'Correo de Eduardo Barranquero del 4 de noviembre de 2021.'))),
    ('alcala213', '2023-02-07', 'Mª JOSE (ATIKO), administradora', None, None,
     'ALCALA 213 MADRID. Fecha: 02/2023. Tipo de obra: SATE, CALDERA, IBERDROLA. Distrito 04 - Salamanca (Guindalera). Administracion: Atiko Gestion y Patrimonio (C/ Amparo 86; Ma Jose; 912 982 005 / 674 319 134; administracion@atikogestion.es).\n\n' + cl('alcala213', 2023)),
    ('alcala308', '2025-03-19', 'ALVARO MATEOS (ADM. FINCAS MATEOS), administrador', None, None,
     'ALCALA 308 MADRID. Fecha: 03/2025. Tipo de obra: SUBVENCION DE ACCESIBILIDAD. Distrito Ciudad Lineal. Administracion: Mateos (admonfincas_mateos@hotmail.com).\n\n' + cl('alcala308', 2025)),
    ('alcala462', '2024-07-03', 'MIGUEL A. JIMENEZ (MANDATARIA), administrador', None, None,
     'ALCALA 462 MADRID. Fecha: 07/2024. Tipo de obra: SATE NG + OTROS (poceria, ventanas de pasillos) + SUBVENCIONES; informe previo de UCI / Santander con tres niveles ("paquete alto"). Distrito San Blas-Canillejas. '
     'Administracion: Mandataria (Portugalete 30; Miguel A. Jimenez Martinez; 91 407 87 00 / 91 260 21 32; miguel.a@mandataria.com).\n\n' + cl('alcala462', 2024, ('2024-07-04', 'Correo de Gerencia del 4 de julio de 2024 (contesta al de Mandataria del 3/07).'))),
    ('alcaldelopezcasero3', '2025-03-18', 'MARIA JESUS MARTIN (ASESORIA MARTIN GARCIA), administradora', None, None,
     'ALCALDE LOPEZ CASERO 3 MADRID. Fecha: 03/2025. Tipo de obra: RAMPA (subvenciones externas). Distrito Ciudad Lineal. Administracion: Asesoria Martin Garcia (91 377 23 26, mariajesus@mgasesoria.com). '
     'Dentro de esta carpeta estan coladas las de ALCALDE SAINZ DE BARANDA 82 y 89.\n\n' + cl('alcaldelopezcasero3/FICHA DATOS.docx', 2025)),
    ('alcaldesainzdebaranda89', '2017-02-01', 'LUIS MIGUEL NUNES (THYSSEN)', None, None,
     'ALCALDE SAINZ DE BARANDA 89 MADRID. Fecha: 02/2017. Carpeta colada dentro de "alcaldelopezcasero3". Tipo de obra: ASCENSOR (solucion por caja de escalera). Distrito 03 - Retiro (Estrella). En 2023: ascensor Olivares con Coinsa; '
     'pasar al presidente oferta por el libro del edificio.\n\n' + cl('alcaldelopezcasero3/alcaldesainzdebaranda89/FICHA DATOS TECNICOS.docx', 2023, ('2017-02-01', 'Sin fecha; correo con el plano de la caja de escalera.'))),
    ('alcaudon41', '2017-02-08', 'PEDRO ARANDA (THYSSEN)', 'H80545338', '7719501VK3771H',
     'C/ ALCAUDON 41 MADRID. Fecha: 02/2017. Distrito 11 - Carabanchel (San Isidro). Administracion: Nicolas. Junta de Carabanchel: Sara Paton. PEM 50.000; residuos 300. Expediente 111/2017/05469. NZ4. Fachada 13,90; superficie 40,10 m2. Proyecto hecho.'),
    ('alejandrinamoran23', '2024-05-16', 'JAVIER (GRUPO TREBOL), administrador', None, None,
     'ALEJANDRINA MORAN 23 MADRID. Fecha: 05/2024. Tipo de obra: ASCENSOR por hueco de escalera (4 personas; no reglamentario, cabe una silla especial) + plataforma elevadora en la entrada; coste estimado 85.000. Distrito Latina. '
     'Administracion: Grupo Trebol (Calle Cayetano Pando 2; 91 526 54 90 / 699 086 641; trebol.fincas@gmail.com). Contacto: Maria, 666 630 440. Presupuesto enviado.\n\n' + cl('alejandrinamoran23', 2024)),
    ('almogia2', '2022-05-27', 'CARLOS (NVR, dueño)', None, None,
     'ALMOGIA 2 MADRID. Fecha: 05/2022. Tipo de obra: ASCENSOR. Distrito 13 - Puente de Vallecas (Palomeras Sureste). NVR es una contrata de SATE; Carlos es el dueño (Monica, 6-oct-2026).\n\n' + cl('almogia2', 2022)),
    ('alora11', '2022-05-27', 'CARLOS (NVR, dueño)', None, None,
     'ALORA 11 MADRID. Fecha: 05/2022. Tipo de obra: ASCENSOR. Distrito 13 - Puente de Vallecas (Palomeras Sureste). NVR es una contrata de SATE; Carlos es el dueño (Monica, 6-oct-2026).\n\n' + cl('alora11', 2022)),
    ('almonacid24', '2017-07-27', 'INVER > ASZENDE (mbermejo@aszende.com)', 'H81417545', '4122806VK742A',
     'C/ ALMONACID 24 MADRID. Fecha: 07/2017. Tipo de obra: ASCENSOR. Distrito 13 - Puente de Vallecas (Numancia). Administracion: Del Brio y Blanco (Carlos del Brio, 616 427 064). Presidenta: Carmen Leirado (51904733N). '
     'Instaladora: Aszende, S.L.U. (B08902892, Barcelona), que sustituye a Inver en sept-2020 y asume nuestros honorarios pendientes. Junta de Puente de Vallecas (Av. Albufera 42): Marta Aragon; negociado de licencias 91 588 73 33; '
     'departamento tecnico 91 480 35 59. PEM 50.000; residuos 300. Visados TL/015644/2017 y TL/000167/2022. Expediente 114/2017/5085. NZ 3.2. Fachada 13,13; superficie 48,7 m2. Proyecto hecho.\n\n'
     + cl('almonacid24', 2020, ('2020-09-23', 'Correo de Carlos del Brio del 23 de septiembre de 2020.'))),
    ('almonacid7', '2023-03-28', 'SERGIO ROSERJER (DANOSA)', None, None,
     'ALMONACID 7 MADRID. Fecha: 03/2023. Tipo de obra: SATE + FOTOVOLTAICA (la fotovoltaica la hace Adratek). Distrito 13 - Puente de Vallecas (Numancia).\n\n' + cl('almonacid7', 2023)),
    ('alcaldesainzdebaranda82', '2017-01-18', 'LUIS MIGUEL NUNES (THYSSEN)', None, None, None)]
for carp, fecha, trajo, cif, ref, t in REVS:
    if t is None: continue
    ruta = {'acacias59': R('abubilla14\\acacias59'), 'afecto5': R('acuerdo34\\afecto5'), 'aeronave33': R('acuerdo34\\aeronave33'),
            'albalatedelarzobispo5': R('alameda4\\albalatedelarzobispo5'), 'alcaldesainzdebaranda89': R('alcaldelopezcasero3\\alcaldesainzdebaranda89')}.get(carp)
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, ruta=ruta)
CERR = [
    ('alcala612', '2017-02-05', 'JUAN CARLOS (THYSSEN)', 'Calle ALCALA 612 MADRID. Fecha: 01/2017. Distrito 20 - San Blas-Canillejas (Canillejas). Ficha vacia; hay croquis.'),
    ('alcaldesainzdebaranda82', '2017-01-18', 'LUIS MIGUEL NUNES (THYSSEN)', 'ALCALDE SAINZ DE BARANDA 82 MADRID. Fecha: 01/2017. Carpeta colada dentro de "alcaldelopezcasero3". Distrito 03 - Retiro (Estrella). Ficha vacia; hay croquis.'),
    ('alejandromoran14', '2017-08-28', 'PEDRO ARANDA (THYSSEN)', 'C/ ALEJANDRO MORAN 14 MADRID. Fecha: 08/2017. Distrito 11 - Carabanchel (Puerta Bonita). NZ 4. Ficha vacia; hay croquis.'),
    ('alfonsofernandez6', '2017-01-01', 'FELIPE OSADO (ENOR)', 'CALLE ALFONSO FERNANDEZ 6 MADRID. Fecha: 01/2017. Distrito 11 - Carabanchel (Buenavista).\n\nBAJA + 3. Igual que Velez Rubio: no hace falta salir a la calle, pero si tirar el muro; '
     'se entra desde la escalera; tres alturas y baja; practicable; embarque simple.'),
    ('algaba17A', '2017-02-08', 'NICOLAS (para Pedro Aranda, THYSSEN)', 'Calle ALGABA 17A MADRID. Fecha: 02/2017. Distrito 11 - Carabanchel (San Isidro). "Para Roberto, 657 52 50 05". Ficha vacia; hay croquis.'),
    ('algaba26', '2017-10-01', 'NICOLAS (para Pedro Aranda, THYSSEN)', 'Calle ALGABA 26 MADRID. Fecha: 10/2017. Distrito 11 - Carabanchel (San Isidro). Ficha vacia.'),
    ('allariz6a', '2017-03-07', 'NICOLAS (para Pedro Aranda, THYSSEN)', 'CALLE ALLARIZ 6A MADRID. Fecha: 08/2017 (croquis de marzo). Distrito 11 - Carabanchel (Buenavista). NZ4. Ficha vacia.'),
    ('alondra10', '2016-03-30', 'PEDRO ARANDA (THYSSEN)', 'ALONDRA 10 MADRID (la ficha dice "Calle ALONDRA 4"). Fecha: 03/2016. Distrito 11 - Carabanchel (Vista Alegre). Ficha vacia; hay croquis.'),
    ('alondra12', '2016-06-29', 'PEDRO ARANDA (THYSSEN)', 'CALLE ALONDRA 12 MADRID. Fecha: 06/2016. Distrito 11 - Carabanchel (Vista Alegre). Ficha vacia; hay croquis.')]
for carp, fecha, trajo, t in CERR:
    ruta = R('alcaldelopezcasero3\\alcaldesainzdebaranda82') if carp == 'alcaldesainzdebaranda82' else None
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t, ruta=ruta)
SINF = [
    ('abubilla14', '2015-12-04', 'ABUBILLA 14 MADRID. Carpeta SIN ficha de datos: certificado final de obra solo arquitecto (dic-2015), factura y foto de la reconstruccion de un vado, y notificaciones e instancia del ayuntamiento (2020-21). '
     'Dentro esta colada la de PASEO DE LAS ACACIAS 59.'),
    ('alfonso XIII, 111', '2021-08-02', 'ALFONSO XIII 111 MADRID. Carpeta SIN ficha de datos: solo una subcarpeta "SOLO CONTRATAN PARA SUBVENCION Y SEGUIMIENTO DE CAM" (2021). En produccion hay una comunidad "ALFONSO XII MADRID" '
     'sin numero que NO se toca hasta saber el numero (Alvaro lo esta preguntando; Monica, 6-oct-2026).'),
    ('alfonsomartinez11', '2015-06-05', 'ALFONSO MARTINEZ 11 MADRID. Carpeta SIN ficha de datos: un borrador (2015-2021).'),
    ('algaba10', '2015-04-15', 'ALGABA 10 MADRID. Carpeta SIN ficha de datos: un PDF (abril 2015).'),
    ('algaba34', '2017-05-30', 'ALGABA 34 MADRID. Carpeta SIN ficha de datos: una "MEMORIA BIES" (mayo 2017).'),
    ('altamirano10', '2021-05-22', 'ALTAMIRANO 10 MADRID. Carpeta SIN ficha de datos: documento de deflexiones de la obra (mayo 2021).')]
for carp, fecha, t in SINF:
    fila(carp, fecha, 'cerrada', MIG, None, None, None, t)

# ================================================================= 4. MANIAS
mania('El tecnico de la Junta de Latina (Carlos Borrallo) se ve los martes de 9 a 12 en C/ Fuerte de Navidad 15; llamar antes por si no esta.',
      'Junta Municipal de Distrito de Latina', '2017-01-01', 'abejuela17', cita='Hay que verle los martes de 9 a 12 en C/Fuerte de Navidad 15. Mirar antes si va a estar. 915889764, 915885197', tecnico='Carlos Borrallo')
mania('Negociado de licencias de San Blas-Canillejas: lunes, miercoles y viernes de 9:00 a 10:30, sin cita.', 'Junta Municipal de Distrito de San Blas-Canillejas (negociado de licencias)', '2017-04-01', 'albaida76',
      cita='Negociado de Licencias: 91 588 80 35   91 588 80 28   91 588 80 30 Lunes, miércoles y viernes. 9.00-10.30  SIN CITA')
mania('La tecnica de Puente de Vallecas (Marta Aragon) tarda en revisar lo aportado, espera el informe de Servicios Tecnicos y llega a cancelar la cita dando por telefono las instrucciones de como justificar la solucion.',
      'Junta Municipal de Distrito de Puente de Vallecas', '2022-01-03', 'alfredocastrocamba24', clave='acc24', trozo='Marta Aragón', tecnico='Marta Aragón Sánchez')
mania('En Puente de Vallecas la licencia de ascensor pasa por Medio Ambiente y Escena Urbana del Distrito, a la espera de informes sectoriales, si hay que talar o trasplantar arboles: hay que tramitar ese permiso.',
      'Junta Municipal de Distrito de Puente de Vallecas (Medio Ambiente y Escena Urbana)', '2026-01-19', 'alcaladeguadaira41', clave='ag41', trozo='informes sectoriales')
mania('El tecnico municipal de Puente de Vallecas pide los planos en DWG, version AutoCAD 2015.', 'Junta Municipal de Distrito de Puente de Vallecas', '2026-02-20', 'alcaladeguadaira41', clave='ag41', trozo='DWG', tecnico='Leandro (peralal@madrid.es)')
mania('Con la licencia concedida, no se puede cambiar el color de la fachada: si se cambia, hay que pedir una licencia nueva.', 'ECU (ACTECU)', '2026-10-01', 'algodre2', clave='algo2', trozo='color de la fachada')
mania('Inspeccion de actividad hecha por una ECU (A+ECU) por encargo del ayuntamiento: comprueban que lo construido coincide con los planos de la solicitud (la entreplanta no coincidia) y hay que legalizarlo.',
      'A+ECU / Ayuntamiento de Madrid (actividades)', '2025-02-10', 'alhambra24 - LOCAL',
      cita='10/02/2025 Vino una inspección del ayuntamiento el 28/01/2025 realizada por la ECU A+ECU (VER EN INCIDENCIA2). Nos enviarán un escrito o nos llamarán para decir cómo podemos legalizar la situación. La entreplanta actual no coincide con los planos aportados en la solicitud de licencia de actividad.')
mania('Cambiar la fachada (de ladrillo caravista a SATE) o poner aires acondicionados en el casco historico sin licencia trae orden de legalizacion; y para los CAEs tiene que estar todo legal (inicio y fin de obra).',
      'Ayuntamiento de Madrid', '2026-09-18', 'alonsocano63', cita=J(fijar('alonsocano63', 2026)))

resumen()
