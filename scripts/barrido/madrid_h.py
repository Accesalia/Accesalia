# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda H (hachero16 .. huertavillaverde9, 46 carpetas: toda la H). 7-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de

BAYFER = 'c30840f5-26a3-4278-8c80-0aa241193015'; SERV_URBANOS = '57803d68-b6b4-4ec5-baf3-cfb839734765'; RAMIREZ = '23c55a24-fb9b-4fcf-a623-c592c7a570ba'
PU.update(parra='999aa5c8-3da7-4fda-93d3-b4e9c839d639', collado='0f2b3251-9e84-443d-b81e-32edfd1f7915', silvia='6c8e1a7f-999b-4ee9-ac91-cfeb7075dd8c',
          gmoya='5a588515-9c02-4058-8e31-7e51dec4737f', montoro='2d20b9b4-9a2d-4187-9481-28fb620eb3e7', remesal='f0ab984c-53be-424f-abd1-12c14956cb05',
          alfredo_iberlean='97fbfb50-5db7-43e7-a916-aa32441ced0d', alemany='feb70e2c-3f94-4fd2-8515-f590d6cd67c4', cerezo='7f4218f5-8b8e-45a0-9cba-b2880ccfc4c3',
          cnavarro='69fa0dfc-002e-4e0d-90f2-a70924c902ab', oscar_fgr='b48008bb-1984-4da0-bb4b-21a55d0f586e')
HP117 = 'fbaea3e2-03ab-4ed4-a580-1504d3615642'      # "HACIENDA DE PAVONES 117 MADRID"     -> el proyecto (puertas de ascensor, Schindler, 2023)
HP117_SUBV = '55084026-f443-4658-84a6-6c86a01f7f19'  # "HACIENDA DE PAVONES NUM 117 MADRID" -> la HE de subvenciones (2026)


def admin_empresa(cid, empresa):
    if not b.leer('comunidad_admin_responsable?select=id&vigente=eq.true&comunidad_id=eq.' + cid):
        ins('comunidad_admin_responsable', [{'comunidad_id': cid, 'empresa_id': empresa, 'puesto_id': None, 'vigente': True}])


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto o incompleto."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


def correo_a(puesto, email, principal=False):
    """correo nuevo en un puesto que YA existe (si el correo no esta ya en la agenda)."""
    if not b.leer('correo?select=id&email=ilike.' + quote(email)):
        ins('correo', [{'puesto_id': puesto, 'email': email, 'etiqueta': 'general', 'principal': principal}])


# ================================================================= 0. AGENDA (solo en empresas, contratas y organismos que ya existen; la Junta de Centro se crea)
CENTRO = junta(1, 'Centro')
persona_nueva('Sonia', 'Fernández', 'técnico', '913643527 (licencias) / 915132158 (servicios técnicos, citas)', 'tecnicentro@madrid.es', organismo=CENTRO,
              notas_='Junta de Centro: tecnica del ayuntamiento de Huerta del Bayo 13 (ascensor, 2022-2023).')
persona_nueva('Giovanni Vincenzo', 'Dangelone', 'jefe de obra', '620538393', 'gvdangelone.bayfer@orona.es', contrata=BAYFER,
              notas_='Bayfer (Orona): jefe de obra de Huerta del Bayo 13 (2024-2026).')
persona_nueva('Sergio', 'Fernández Domínguez', 'jefe de obra', '638964458', 'sfernandezdo.bayfer@orona.es', contrata=BAYFER,
              notas_='Bayfer (Orona): sustituye a Giovanni Dangelone en Huerta del Bayo 13 (oct-2024).')
persona_nueva('David', 'Avilés Novillo', None, None, 'daviles.bayfer@orona.es', contrata=BAYFER, notas_='Bayfer (Orona): Huerta del Bayo 13 (2024).')
persona_nueva('Antonio Javier', 'Coca Rubio', None, None, 'ajcoca.bayfer@outlook.es', contrata=BAYFER,
              notas_='Bayfer (Orona), la constructora de Huerta del Bayo 13. La ficha trae dos correos: ajcoca.bayfer@outlook.es y ajcoca.bayfer@orona.es.')
JNUNEZ = persona_nueva('Javier', 'Núñez Bruis', None, None, 'jnbruis@elecnor.com', contrata=ELECNOR,
                       notas_='Elecnor: contacto de Hermanos Machado 5 (antes Silvia Gonzalez Penalba y Daniel Navarro / Ibai, tachados en la ficha).')
SUSANA = persona_nueva('Susana', None, 'administradora de fincas', '91 445 00 93', 'susanamas@serviciosurbanos.com', empresa=SERV_URBANOS,
                       notas_='Servicios Urbanos: gestiona la comunidad de Herrera 22 (correo de Alfonso Montoro, 16/03/2026).')
correo_a(PU['oscar_fgr'], 'comercial@fgrascensores.com')   # Oscar Fernandez (antiguo CEGA), FGR Ascensores: Hermanos Garcia Noblejas 63

# ================================================================= 1. PRODUCCION (19 carpetas, 20 oportunidades)
n117 = fijar('haciendadepavones117', 2023)
rellenar('hp117', 'HACIENDA DE PAVONES 117', 'haciendadepavones117', {'fecha_apertura': '2023-12-04', 'referencia_catastral': '5929376VK4752H',
    'origen_notas': 'Fecha de llegada: 12/2023 (dia: la primera nota, 04/12/2023: HE enviada). Contacta: Javier Parra y Daniel Diaz (SCHINDLER; paga Schindler). Tipo de obra: SUSTITUCION DE 2 ASCENSORES '
                    'Y MODIFICACION DE PUERTAS (no reforma de portal ni bajada a cota cero): un "proyectito" de sustitucion de puertas y DR; las subvenciones, el presidente. Barrio: Vinateros. Tecnico: ISP. '
                    'Jefe de obra: Manuel Crespo. Ano 1974. DR por ECU (ACTECU); reapertura del expediente 30-06-2025. Sin administrador ("No tienen"). Presidente: Pedro Javier Valverde Garcia '
                    '(600 543 497; chaparrala3@hotmail.com); en la ficha tambien fernandezjm69@hotmail.com. Expediente 350/2024/02556. CFO sin visar (es una memoria valorada); visita de fin de obra de la ECU '
                    'favorable 27/02/2026. La HE de subvenciones de 2026 es la otra oportunidad de esta comunidad. Comercial: DANIEL.'},
    ('modificacion_asc', 'cambio_puertas'), n=n117[:13], presi=('PEDRO JAVIER VALVERDE GARCIA', 'presidente', '600543497', None, 'chaparrala3@hotmail.com'),
    trae_pu=PU['parra'], oid_fijo=HP117)
rellenar('hp117s', 'HACIENDA DE PAVONES 117', 'haciendadepavones117', {'fecha_apertura': '2026-03-23',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia: la HE de subvenciones, 23/03/2026, enviada a la comunidad el 24/03). Tipo de obra: TRAMITACION DE SUBVENCIONES de la sustitucion de puertas de '
                    'los 2 ascensores (el proyecto de 2023, de Schindler, es la otra oportunidad de esta comunidad). Paga la comunidad. Comercial: DANIEL.'},
    ('subvenciones',), n=n117[13:], oid_fijo=HP117_SUBV)
rellenar('hp151', 'HACIENDA DE PAVONES 151', 'haciendadepavones151', {'fecha_apertura': '2025-07-18', 'referencia_catastral': '5929365VK4752H',
    'origen_notas': 'Fecha de llegada: 07/2025 (dia: la HE enviada, 18/07/2025). Contacta: Adolfo Collado (AEA / MC GESTION FINCAS; lo lleva Alberto Olvera; 915 02 74 59 / 618 63 60 95; pedidos docs '
                    'a la CP 31/07 y 13/10). Tipo de obra: SATE + ASCENSOR CON SUBV. Tecnico: Jhonatan. Fecha encargo: 24/07/2025. Ano 1972. LICENCIA por el AYTO (registrada 06/02/2026; en may-2026, '
                    'en los Servicios Tecnicos del Distrito). Presidenta: Marta Monica Campos Feito (2o izda.), 636 044 628, martamcampos@hotmail.com. PEM 247.567,69. Visado TL/015672/2025. Comercial: DANIEL.'},
    ('sate', 'ascensor', 'subvenciones'), n=fijar('haciendadepavones151', 2025), comunidad={'iban': 'ES32 0081 5638 4700 0119 7424'},
    presi=('MARTA MONICA CAMPOS FEITO (2ºizda)', 'presidente', '636044628', None, 'martamcampos@hotmail.com'), trae_pu=PU['collado'])
rellenar('hp222', 'HACIENDA DE PAVONES 222', 'haciendadepavones222', {'fecha_apertura': '2025-07-18', 'referencia_catastral': '5826247VK4752F',
    'origen_notas': 'Fecha de llegada: 07/2025 (dia: la HE enviada, 18/07/2025). Contacta: Adolfo Collado (AEA / MC GESTION FINCAS; 915 02 74 59 / 618 63 60 95; facturas@mcgestionfincas.com). '
                    'Tipo de obra: SATE + ASCENSOR CON SUBV (mismo modelo que Avalada 8 y Hacienda de Pavones 151). Tecnico: Israel. Fecha encargo: 27/08/2025. Ano 1970. Primero por ECU; el 10/12/2025 '
                    'se decide tramitar por el AYTO; licencia registrada 03/03/2026. Presidente: Juan Pedro Bravo Roman (para la IEE: 637 376 397, juanpe_bravo@hotmail.com). PEM 247.522,26. '
                    'Visado TL/018745/2025. Comercial: DANIEL.'},
    ('sate', 'ascensor', 'subvenciones'), n=fijar('haciendadepavones222', 2025, ('2025-07-18', 'Sin fecha; va antes de la HE enviada el 18/07/2025.')),
    comunidad={'iban': 'ES24 2085 9738 1703 3045 4547'}, presi=('JUAN PEDRO BRAVO ROMAN', 'presidente', '637376397', None, 'juanpe_bravo@hotmail.com'), trae_pu=PU['collado'])
rellenar('hds25', 'HERMANDAD DE DONANTES DE SANGRE 25', 'hermandaddonantesdesangre25', {'fecha_apertura': '2025-09-24',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia: el correo de la administracion, 24/09/2025). Contacta: Administracion del Amo Ruiz (delamoruiz@yahoo.com; 621 01 93 48) - no esta en la agenda - de parte '
                    'de German Hernandez Zorita, tecnico de la NG (gharquitecto@gmail.com) - no esta en la agenda; "dar prioridad". Tipo de obra: RAMPA + SUBV Y PROPUESTA DE MODIFICACION DEL ASCENSOR ACTUAL '
                    '(rampa de 8 m, unos 12.500 EUR + IVA; o ascensor de doble embarque a 180 con bajada a cota cero, unos 40.000 EUR + IVA). Presidente: Juan Carlos (1o A), 696 29 09 38, '
                    'talaverajuancarlos@gmail.com. HE e informe de viabilidad enviados 07/10/2025 (honorarios rectificados por ser Madrid capital). Comercial interno: DANIEL.'},
    ('rampa', 'subvenciones', 'modificacion_asc'), n=fijar('hermandaddonantesdesangre25', 2025, ('2025-09-24', 'Correo de la Administracion del Amo Ruiz del 24 de septiembre de 2025.')),
    presi=('JUAN CARLOS (1º A)', 'presidente', '696290938', None, 'talaverajuancarlos@gmail.com'))
rellenar('hds27', 'HERMANDAD DE DONANTES DE SANGRE 27', 'hermandaddonantesdesangre27', {'fecha_apertura': '2026-06-04',
    'origen_notas': 'Fecha de llegada: 06/2026 (dia: el escaneo 3D y la ficha, 04/06/2026). La ficha no tiene direccion, contacto, tipo de obra ni notas; hay escaneo 3D. Comercial interno: ALVARO.'},
    (), captador=ALVARO, lleva=ALVARO)
rellenar('hdp45', 'HERMANOS DE PABLO 45', 'hermanosdepablo45', {'fecha_apertura': '2026-05-01',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia desconocido; el escaneo 3D es del 02/06/2026). Contacta: Carlos Navarro (ADMON FINCAS NAVARRO; administracion@fincasnavarro.es). Tipo de obra: ASCENSOR. '
                    'La ficha no tiene notas. Los ficheros de 2021 de la carpeta (licencia y aplazamiento de la DO) son otro encargo y van a la clon. Comercial interno: ALVARO.'},
    ('ascensor',), adm=PU['cnavarro'], trae_pu=PU['cnavarro'], captador=ALVARO, lleva=ALVARO)
rellenar('hgn63', 'HERMANOS GARCIA NOBLEJAS 63', 'hermanosgarcianoblejas63', {'fecha_apertura': '2026-05-29',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: el correo de FGR, 29/05/2026; la ficha dice 06/2026). Contacta: Oscar Fernandez (antiguo CEGA), FGR ASCENSORES (626 319 039; comercial@fgrascensores.com). '
                    'Tipo de obra: ASC: proyecto y visado con gestion de subvenciones (en el correo, el numero 83 tachado). HE enviada a Oscar 02-06-2026. Comercial interno: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('hermanosgarcianoblejas63', 2026, ('2026-05-29', 'Correo de FGR Ascensores del 29 de mayo de 2026.')), trae_pu=PU['oscar_fgr'])
rellenar('hm41', 'HERMANOS MACHADO 41', 'hermanosmachado41', {'fecha_apertura': '2025-06-23', 'referencia_catastral': '5158310VK4755G',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: el escaneo 3D, 23/06/2025). Contacta: Silvia Arribas (ARRIALSI; 917 307 033 / 665 805 356; info@arrialsi.com; pedidos docs a la CP 04/07, 17/07 y 19/08). '
                    'Tipo de obra: ACCESIBILIDAD + DF, CSS Y SUBV (elevador con puertas automaticas, aparato con cabina). Tecnico: Jhonatan. Fecha encargo: 30-06-2025. Ano 1991. DR por ECU (ACTECU), registrada '
                    '09/04/2026. Contrata elegida: VALVERDE (Rafael). Vicepresidente: Isidoro Carruana Lopez (01623229G); el presidente "esta desaparecido" (dic-2025). PEM 27.276,96. Visado TL/005374/2026. '
                    'Superficie 9,08 m2. En jul-2026 la obra aun no ha empezado. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('accesibilidad', 'plataforma', 'df', 'css', 'subvenciones'), n=fijar('hermanosmachado41', 2025), comunidad={'iban': 'ES31 0081 0361 4400 0129 6733'},
    trae_pu=PU['silvia'], captador=CARLOS, lleva=ALVARO)
pc(OPP['hm41'][0]['id'], 'ISIDORO CARRUANA LOPEZ', 'vicepresidente', None, '01623229G', None, 'Vicepresidente; la administracion tira de el porque el presidente no responde (dic-2025).')
rellenar('hm5', 'HERMANOS MACHADO 5', 'hermanosmachado5', {'fecha_apertura': '2021-02-23', 'referencia_catastral': '5061402VK4756A',
    'origen_notas': 'Fecha de llegada: la ficha dice 06/2021, pero los ficheros de Accesalia empiezan el 23/02/2021 (escrito de aplazamiento al Ayto: el arquitecto anterior, Miguel Velerda / Projasp, renuncio y '
                    'se encarga a Daniel); se toma esa. Contacta: Javier Nunez Bruis (ELECNOR; antes Silvia Gonzalez Penalba y Daniel Navarro / Ibai, tachados); tambien Javier Velasco, Tomas Morell y Ana Encinas. '
                    'Tipo de obra: ASCENSOR (Elecnor) + SUBV (la CP). Barrio: Ventas. Tecnico: Julio. Jefe de obra: Andres Mulas. Ano 1978. Administracion: GOMEZ Y MORENO (Francisco Javier Benito Gomez, '
                    '91 415 14 59). Presidenta: Ma Carolina Gonzalez Alonso; contacto: Miguel Angel Lucas (620 20 93 10; malr447@gmail.com). Viviendas: 16. PEM 186.909,71. Historico de la ficha: licencia de '
                    '2019 (exp. 116/2019/596) caducada y cerrada (16/09/2022); DR del Ayto de 2022 (exp. 116/2022/00828, tachado) declarada ineficaz el 02/11/2023; desde el 15/11/2023, LICENCIA POR ECU '
                    '(tasas pagadas por Accesalia; el 20-03-2025 el Ayto deniega la bonificacion del ICIO de 2022 y pide 4.255,60 EUR). En la junta de julio de 2025 la comunidad decide no hacer nada; '
                    'el 22-01-2026 la administracion confirma que no lo aprueban y se informa a la ECU y a Elecnor para cerrar el expediente. Comercial: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('hermanosmachado5', 2021, ('2022-01-20', 'Sin fecha; la respuesta al correo de la oficina del 20 de enero de 2022 que va debajo.')),
    comunidad={'iban': 'ES93 2038 1043 1360 0083 9052'}, trae_pu=JNUNEZ,
    huecos=['[REVISAR EN FACTURACION] Proyecto hecho y licencia por ECU con tasas pagadas por Accesalia; la comunidad decide no hacer la obra (jul-2025). Cancelar la obra no es cancelar la oportunidad: revisar que se ha cobrado y que no queda nada pendiente (Monica, 7-oct-2026).'])
pc(OPP['hm5'][0]['id'], 'MIGUEL ANGEL LUCAS', 'otro', '620209310', None, 'malr447@gmail.com', 'Persona de contacto de la comunidad (ficha del ascensor).')
rellenar('ht62', 'HERMANOS TRUEBA 62', 'hermanostrueba62', {'fecha_apertura': '2025-02-06',
    'origen_notas': 'Fecha de llegada: la ficha dice 01/2025; la solicitud de presupuesto y el proyecto externo son del 06/02/2025; se toma esa. Contacta: Javier (DEL BRIO Y BLANCO; la ficha no da el apellido). '
                    'Tipo de obra: DF (y CSS) de un PROYECTO EXTERNO de ASCENSOR firmado por Velerda en 2018; HE de subvenciones del proyecto externo enviada 10/06/2025. Comercial: DANIEL.'},
    ('ascensor', 'df', 'css', 'subvenciones'), n=fijar('hermanostrueba62', 2025))
rellenar('hb27', 'HERMENEGILDO BIELSA 27', 'hermenegildobielsa27', {'fecha_apertura': '2025-06-04', 'referencia_catastral': '0613210VK4701D',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: el correo de Javier Gonzalez Moya, 04/06/2025, con las fotos de la visita). Contacta: Javier Gonzalez Moya (SCHINDLER; 616 991 079): reconstruir el nucleo '
                    'de comunicaciones, ganar 80-90 cm al patio, ascensor de doble embarque a 180 y reforma electrica integral; misma administracion que Hontanillas 2 (SSRR). Tipo de obra: ASC + SUBV. '
                    'Fecha encargo: 17/07/2026. Ano 1958. Presidenta: Ana Belen Santiago Perez (72049961T; 649 853 601). El 04/03/2026 Alvaro lo estudia a peticion de Araceli (RenovamosMadrid). '
                    'Comercial interno: ALVARO.'},
    ('ascensor', 'subvenciones'), n=fijar('hermenegildobielsa27', 2025, ('2025-06-04', 'Correo de Javier Gonzalez Moya del 4 de junio de 2025.')),
    presi=('ANA BELÉN SANTIAGO PEREZ', 'presidente', '649853601', '72049961T'), trae_pu=PU['gmoya'], captador=ALVARO, lleva=ALVARO)
arreglar_pc(OPP['hb27'][0]['id'], 'rol=eq.presidente&nombre=eq.' + quote('Ana Belén Santiago'), {'nombre': 'ANA BELÉN SANTIAGO PEREZ'})
rellenar('her22', 'HERRERA 22', 'herrera22', {'fecha_apertura': '2026-03-16',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia: el correo de Alfonso Montoro, 16/03/2026). Contacta: Alfonso Montoro Perez (SERVICIOS URBANOS; San Bernardo 122, 2o dcha.; 91 445 00 93), que quiere empezar '
                    'a trabajar con Daniel; la comunidad la gestiona Susana (susanamas@serviciosurbanos.com). Tipo de obra: PROYECTO PARA REPARACION DE PARAMENTOS VERTICALES Y CUBIERTA Y TRAMITACION DE LA '
                    'PARALIZACION DE LA ORDEN DE EJECUCION (orden recibida en enero de 2026). HE enviada 18-03-2026. Comercial interno: DANIEL.'},
    ('arreglo_fachada', 'arreglo_cubierta'), n=fijar('herrera22', 2026, ('2026-03-16', 'Correo de Alfonso Montoro del 16 de marzo de 2026.')), adm=SUSANA, trae_pu=PU['montoro'])
rellenar('hig7', 'HIGUERAS 7', 'higueras7', {'fecha_apertura': '2025-10-27', 'referencia_catastral': '7134206VK3773C',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: la nota y el escaneo 3D de las dos escaleras, 27/10/2025; la ficha da 11/2025 en la referencia). Contacta: EFFIC (cliente; la ficha no dice la persona). '
                    'Tipo de obra: 2 ASCENSORES Y SATE (las dos escaleras practicamente iguales). Ano 1947. En la carpeta hay un dxf de Catastro de 2016. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('ascensor', 'sate'), n=fijar('higueras7', 2025), captador=CARLOS, lleva=ALVARO)
rellenar('hor54', 'HORTALEZA 54', 'hortaleza54', {'fecha_apertura': '2026-01-20',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: el de la ficha, 20/01/2026). Contacta: Jesus Alberto Remesal Sanchez (MP ASCENSORES; JARS@mpascensores.com; en la ficha, en el hueco del administrador). '
                    'Tipo de obra: ASCENSOR. La ficha no tiene notas. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), trae_pu=PU['remesal'], captador=CARLOS, lleva=ALVARO)
rellenar('hc13', 'HUERTA DE CASTAÑEDA 13', 'huertadecastañeda13', {'fecha_apertura': '2024-02-09', 'referencia_catastral': '7234619VK3773C',
    'origen_notas': 'Fecha de llegada: 02/2024 (dia: la primera nota, 09/02/2024: Iberlean manda planos, presupuesto y contrato). Contacta: Alfredo Jimenez (IBERLEAN; 659 27 30 00) y Miguel Alemany. '
                    'Tipo de obra: ASCENSOR POR FACHADA con desembarco a las terrazas (Iberlean; licencia por ECU aunque sea procedimiento ordinario) + IEE (la CP; HE de 25/09/2024; las subvenciones las '
                    'tramita Iberlean). Barrio: Puerta del Angel. Tecnico: Israel -> Alejandro; en jul-2026, rehacer el proyecto -> Israel. Ano 1972. Administracion: FINCAS ZUGASTI (Olga Martinez, '
                    'o.martinez@smifincas.com, 650 502 949 / 611 383 164; antes Gema Zugasti, tachada); todo a traves de Alfredo; "si se manda algo al administrador, poner en copia a Miguel Alemany". '
                    'Presidente: Joaquin Espejel Brasero (3o B; joarefor@hotmail.es). Visado TL/009384/2024. Expediente 350/2024/18200. Superficie 53,11 m2. En feb-2026 el expediente esta en la Mesa Tecnica '
                    'de Ascensores; presupuesto de obra casi definitivo 188.268,68 EUR (Iberlean, 02-10-2026). Comercial: DANIEL.'},
    ('ascensor', 'iee'), n=partir(fijar('huertadecastañeda13', 2024), 8, 'Presupuesto aproximado', '2026-10-02'),
    presi=('JOAQUIN ESPEJEL BRASERO (3º B)', 'presidente', None, None, 'joarefor@hotmail.es'), trae_pu=PU['alfredo_iberlean'])
rellenar('hc26', 'HUERTA DE CASTAÑEDA 26', 'huertadecastañeda26', {'fecha_apertura': '2024-04-19', 'referencia_catastral': '7133102VK3773C',
    'origen_notas': 'Fecha de llegada: 04/2024 (dia: la primera nota, 19/04/2024: revision en oficina con Miguel y Alfredo de los ficheros Revit de Iberlean; esos ficheros conservan la fecha de Iberlean, nov-2023). '
                    'Contacta: Miguel Alemany y Alfredo Jimenez (IBERLEAN). Tipo de obra: ASCENSOR CON DERRIBO DE ESCALERA (rampa corta en el portal; escalera restringida; el muro con las terrazas, linea roja '
                    'de los vecinos). Barrio: Puerta del Angel. Tecnico: Israel. Administracion: ASESORIA JOVELLANOS (en la planta baja del edificio; 915 262 148 / 914 645 248 / 676 292 268); la peticion de datos, '
                    'a traves de Iberlean. El 14/10/2024 la comunidad quiere rescindir el contrato con Iberlean; Iberlean no nos ha pagado nada y no se cobrara hasta que cobren ellos. Comercial: DANIEL.'},
    ('ascensor',), n=fijar('huertadecastañeda26', 2024), trae_pu=PU['alemany'])
rellenar('hdb13', 'HUERTA DEL BAYO 13', 'huertadelbayo13', {'fecha_apertura': '2022-07-28', 'referencia_catastral': '0234202VK4703C',
    'origen_notas': 'Fecha de llegada: 07/2022 (dia: la primera nota, 28/07/2022: paga la comunidad). Contacta: la comunidad (Ivan Camacho, tachado). Tipo de obra: ASCENSOR, DO Y CSS + SUBVENCIONES '
                    '(habia un proyecto de otro arquitecto; Accesalia hace el proyecto y la DR por ECU). Barrio: Embajadores. Tecnico: Susana. Contrata: BAYFER (Orona): David Aviles, Giovanni Dangelone '
                    '(jefe de obra) y Sergio Fernandez (le sustituye); Carlos Gomez (INOXSHEET, c.gomez@inoxsheet.es) - no esta en la agenda; en 2024 se pregunta si no era ELCO. Administracion: ATIKO (tachado) '
                    '-> desde may-2025 FINCAS ORTEGA DELGADO (Miguel; 915 943 933 / 638 803 712). Presidenta: Maria Teresa Garcia Abad. Junta de Centro: Sonia Fernandez (913 643 527 licencias; '
                    '915 132 158 servicios tecnicos, citas; tecnicentro@madrid.es). NZ 1 grado 2o ("zona protegida, pedir por licencia", tachado: "va por declaracion responsable"). PEM 107.338,18. '
                    'Expedientes 350/2022/14441 (licencia, no vale) y 350/2023/15243 (DR 22/05/2023). Obra empezada (derribo de escalera 21/10/2024); en 2026 la comunidad desplaza los contadores con otra '
                    'contrata; plazo de ejecucion de la subvencion hasta 24/12/2027. Comercial: DANIEL.'},
    ('ascensor', 'df', 'css', 'subvenciones'), n=partir(fijar('huertadelbayo13', 2022), 3, 'De:' + chr(160) + 'Sergio Fernandez', '2024-10-21'),
    comunidad={'iban': 'ES98 0081 0259 1400 0192 9493'})
rellenar('hu55', 'HUERTAS 55', 'huertas55', {'fecha_apertura': '2026-05-14',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: el escaneo 3D, 14/05/2026). Contacta: Betina (la ficha no dice quien es). Tipo de obra: ASCENSOR. Administracion: ADMINISTRACION RAMIREZ (915 289 820; '
                    'femar_8596@cafmadrid.es). IV y HE enviados 18/05/2026. Comercial interno: ALVARO.'},
    ('ascensor',), n=fijar('huertas55', 2026, otros={0: ('2026-05-18', 'En la ficha "18/05/206": errata del ano, es 2026.')}), captador=ALVARO, lleva=ALVARO)
admin_empresa(OPP['hu55'][0]['id'], RAMIREZ)
rellenar('hv42', 'CALLE HUERTA DE VILLAVERDE 42', 'huertavillaverde42', {'fecha_apertura': '2026-02-13',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: el correo de Raul Cerezo, 13/02/2026). Contacta: Raul Cerezo (freelance; trae la opp). Tipo de obra: ASC + SUBV: proyecto, direccion y peticion de subvenciones '
                    'de un ascensor en el hueco de la escalera (3 paradas, en principio sin demolerla). HE enviada 16-02-2026. Comercial interno: DANIEL.'},
    ('ascensor', 'df', 'subvenciones'), n=fijar('huertavillaverde42', 2026, ('2026-02-13', 'Correo de Raul Cerezo del 13 de febrero de 2026.')), trae_pu=PU['cerezo'])

# ================================================================= 2. CLON
crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
REVS = [
    ('hachero16', '2024-12-11', 'RAQUEL MORENO (VECINA; en su correo, presidenta)', None, None,
     'CALLE HACHERO 16 MADRID. Fecha: 12/2024 (dia: el correo de Raquel Moreno, 11/12/2024). Tipo de obra: SATE Y SUBV (la ITE/IEE de 2024 salio desfavorable por tejado y fachada; ya tienen un presupuesto '
     'de reforma integral de otra empresa). Distrito Puente de Vallecas. CP 28053. Contacto: Raquel Moreno (organizaraquel@gmail.com; 614 319 130 / 622 082 364); nos recomienda su nueva administracion. '
     'Se le contesto el 18/12 y el 02/01 para que llame; no ha llamado.\n\n' + crudo('hachero16', 2024)),
    ('haciendadepavones164', '2022-05-17', 'NUNCI CALDERON (CDAD)', None, None,
     'CALLE HACIENDA DE PAVONES 164 MADRID. Fecha: 05/2022 (dia: la nota del 17/05/2022). Tipo de obra: ASCENSOR (paga la comunidad). Distrito 14 - Moratalaz (Fontarron). '
     'Hay presupuesto con financiacion (22-285-00311, oct-2022).\n\n' + crudo('haciendadepavones164', 2022)),
    ('haciendadepavones252', '2022-05-17', 'NUNCI CALDERON (CDAD)', None, None,
     'CALLE HACIENDA DE PAVONES 252 MADRID. Fecha: 05/2022 (dia: la nota del 17/05/2022). Tipo de obra: ASCENSOR (paga la comunidad). Distrito 14 - Moratalaz (Fontarron). '
     'Hay presupuesto con financiacion (22-285-00312, oct-2022).\n\n' + crudo('haciendadepavones252', 2022)),
    ('haciendadepavones51', '2023-11-23', 'RAUL CEREZO (ELECNOR)', None, '5231243VK4753A',
     'HACIENDA DE PAVONES 51 MADRID. Fecha: 11/2023 (dia: la primera nota, 23/11/2023; la ficha dice 12/2023). Tipo de obra: SATE + NEXT GENERATION (proyecto con CSS incluida y subvenciones). '
     'Distrito 14 - Moratalaz (Vinateros). CP 28030. Ano 1960.\n\n' + crudo('haciendadepavones51', 2023)),
    ('hermanosdelmoral75', '2022-03-22', 'JOSE MANUEL REINA (FAIN)', None, None,
     'CALLE HERMANOS DEL MORAL 75 MADRID. Fecha: 03/2022 (dia: 22/03/2022, Jose Manuel Reina, de Fain, reenvia a Daniel el correo de la comunidad; en la ficha "JUAN MANUEL REINA"). Tipo de obra: ASCENSOR '
     '(la comunidad ya tiene la conformidad del Ayto, de 24/01/2022, a la consulta urbanistica especial de CARRO GONZALEZ ARQUITECTOS, y un proyecto basico/ejecucion con derribo de escalera; '
     'piden oferta de obra a Fain; Reina pide asesoria sobre la rampa y el equipo). Distrito 11 - Carabanchel (Opanel). Contacto de la comunidad: Candido Duran Corral (656 448 126; '
     'candido.duran@gmail.com). La ficha no tiene notas; el correo esta en DATOS/DATOS.docx; hay fotos.'),
    ('hermanosgomez38', '2025-02-25', 'OLIVARES', None, None,
     'CALLE HERMANOS GOMEZ 38 MADRID. Fecha: 02/2025 (dia: la nota del 25/02/2025). Tipo de obra: ASCENSOR CON DERRIBO (paga la CP). Distrito Ciudad Lineal. CP 28017. Contacto: Olivares.\n\n'
     + crudo('hermanosgomez38', 2025)),
    ('herminiopuertas4', '2025-02-17', 'JAVIER (GRUPO TREBOL)', None, None,
     'CALLE HERMINIO PUERTAS 4 MADRID (en el correo de Trebol, "Herminio Puertas 4-6"). Fecha: 02/2025 (dia: las fotos de la visita, 17/02/2025). Tipo de obra: ASCENSOR + PLATAFORMA ELEVADORA (115.000 EUR). '
     'Distrito Latina. CP 28011. Administracion: GRUPO TREBOL (Javier; C/ Cayetano Pando 2, 28047; 91 526 54 90 / 699 086 641; trebol.fincas@gmail.com). Contacto de la comunidad: Antonio, 606 02 13 40. '
     'El 3D se presento a los vecinos el 07/04/2025.\n\n' + crudo('herminiopuertas4', 2025)),
    ('herminiopuertas49', '2026-07-30', 'OBDULIA (VECINA)', None, None,
     'CALLE HERMINIO PUERTAS 49 MADRID. Fecha: 07/2026 (dia: el escaneo 3D y la ficha, 30/07/2026). Tipo de obra: la ficha no lo dice. Contacto: Obdulia, vecina (obdulia.tejon@gmail.com). '
     'Administracion: DEXTRAFINCAS (Pedro Maestro, pmaestro@dextrafincas.com) - no esta en la agenda. Hay escaneo 3D. La ficha no tiene notas. Comercial interno: ALVARO.'),
    ('hernandeziglesias5', '2021-09-28', 'CARLOS PUJOL (SCHINDLER)', None, None,
     'CALLE HERNANDEZ IGLESIAS 5 MADRID. Fecha: 09/2021 (dia: el correo de Carlos Pujol, 28/09/2021; en la ficha "Carlos Pujol IGLESIAS"). Tipo de obra: ASCENSOR (la solucion que les cuadra: ascensor '
     'al fondo y escalera delante). Distrito 15 - Ciudad Lineal (La Concepcion). CP 28027. Hay croquis y plano (oct-2021).\n\n' + crudo('hernandeziglesias5', 2021)),
    ('hernani29', '2022-11-11', 'ANGEL RODRIGUEZ (ADMINISTRADOR)', None, None,
     'CALLE HERNANI 29 MADRID. Fecha: 11/2022 (dia: la nota del 11/11/2022). Tipo de obra: SATE Y AEROTERMIA (pasar oferta a Iberdrola). Distrito 06 - Tetuan (Cuatro Caminos).\n\n' + crudo('hernani29', 2022)),
    ('hernani33', '2022-11-11', 'ANGEL RODRIGUEZ (ADMINISTRADOR)', None, None,
     'HERNANI 33 MADRID. Fecha: 11/2022 (dia: la nota del 11/11/2022). Tipo de obra: SATE Y FV (pasar oferta a empresa de FV). Distrito 06 - Tetuan (Cuatro Caminos).\n\n' + crudo('hernani33', 2022)),
    ('hernani66', '2023-01-01', 'JOSE MANUEL REINA (FAIN)', None, None,
     'HERNANI 66 MADRID. Fecha: 01/2023 (dia desconocido; los primeros ficheros son del 01/02/2023: oferta y anteproyecto de Fain, "URGE Oferta / Anteproyecto 222519 - HERNANI, 66 (MONTACOCHES)"). '
     'Tipo de obra: ASCENSOR MONTACOCHES. Distrito 06 - Tetuan (Cuatro Caminos). Hay nube de puntos (escaneo FARO, mar-2023). La ficha no tiene notas.'),
    ('higueras34', '2026-03-26', 'CRISTINA GONZALEZ', None, None,
     'HIGUERAS 34 MADRID. Fecha: 03/2026 (dia: el 3D y la ficha, 26/03/2026). Tipo de obra: ASC. Contacto: Cristina Gonzalez (cris.g.saez@gmail.com; 659 51 38 04); en el hueco del presidente, '
     'marubmontes@gmail.com. Hay escaneo 3D. La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + EXT),
    ('hilarioneslava51y53', '2023-01-01', 'JOSE GORDILLO', None, None,
     'CALLE HILARION ESLAVA 51 y 53 MADRID. Fecha: 01/2023 (dia desconocido; los primeros ficheros son del 08/02/2023: listado de inmuebles, plano para mediciones y documentacion para Iberdrola). '
     'Tipo de obra: SATE Y CALDERA (IBERDROLA). Distrito 07 - Chamberi (Gaztambide). Contacto: Jose Gordillo (bernajgl@yahoo.es). La ficha no tiene notas.'),
    ('hinojal4', '2025-04-10', 'CRISTINA (AFASONER)', None, None,
     'HINOJAL 4 MADRID. Fecha: 04/2025 (dia: el escaneo 3D, 10/04/2025). Tipo de obra: RAMPA de accesibilidad en las entradas (piden presupuesto de proyecto y rampa; "mandar a JL"). Distrito San Blas - Canillejas. '
     'CP 28037. Administracion: AFASONER (Cristina; Av. Canillejas a Vicalvaro 101, 28022; 913 240 469 / 913 060 613; afasoner@gmail.com). Presidente: Jose Luis (1o C), 606 291 718.\n\n'
     + crudo('hinojal4', 2025)),
    ('hornachos3', '2025-02-27', 'JOSE ANTONIO (DEL BRIO Y BLANCO)', 'H79233094', None,
     'HORNACHOS 3 MADRID. Fecha: 02/2025 (dia: el correo de Del Brio, 27/02/2025; la ficha dice 03/2025). Tipo de obra: ASCENSOR (se hablo en la junta; piden presupuesto y propuestas). Distrito Puente de Vallecas. '
     'CP 28053. Contacto de la comunidad: Francisca Munoz (3o B), 651 15 50 08. Fotos y video de la visita 05/03/2025.\n\n' + crudo('hornachos3', 2025)),
    ('hornolabradores13', '2021-05-19', 'VICENTE (FAIN)', None, None,
     'Calle HORNO LABRADORES 13 MADRID. Fecha: 05/2021 (fotos del 19/05/2021; la ficha dice 06/2021). Distrito 19 - Vicalvaro (Casco historico de Vicalvaro). Ficha vacia; hay fotos.'),
    ('huertadelconvento24', '2023-10-26', 'JAVIER (ELECNOR)', None, None,
     'Calle HUERTA DEL CONVENTO 24 MADRID. Fecha: 10/2023 (dia: la nota del 26/10/2023). Tipo de obra: ASCENSOR. Distrito 19 - Vicalvaro (Casco historico de Vicalvaro). CP 28032.\n\n'
     + crudo('huertadelconvento24', 2023)),
    ('huertas24', '2025-01-10', 'ANDRES HERAS', None, None,
     'HUERTAS 24 MADRID. Fecha: 01/2025 (dia: la nota del 10/01/2025). Tipo de obra: ASCENSOR (con hueco de escalera protegida; presupuesto con el extra). Distrito Centro. CP 28014.\n\n' + crudo('huertas24', 2025)),
    ('huertas3', '2025-01-10', 'ANDRES HERAS', None, None,
     'HUERTAS 3 MADRID. Fecha: 01/2025 (dia: la nota del 10/01/2025). Tipo de obra: DF Y CSS de un proyecto externo de ascensor con licencia (la DF anterior causo baja). Distrito Centro. CP 28012. '
     'En la carpeta, el proyecto visado externo (15/01/2025).\n\n' + crudo('huertas3', 2025)),
    ('huertavillaverde9', '2022-02-04', 'JUAN ANTONIO ALVAREZ (FAIN)', 'H79605549', '9868102VK3696H',
     'CALLE HUERTA DE VILLAVERDE 9 MADRID. Fecha: 02/2022 (dia: el presupuesto de Fain firmado y la fecha de encargo, 04/02/2022). Tipo de obra: SALVAESCALERAS VERTICAL (en el lateral de la escalera del portal, '
     'hueco de 1300 x 1300) + SUBVENCION. Distrito 17 - Villaverde (Villaverde Alto - Casco Historico de Villaverde). CP 28021. Tecnico: Enrique. Jefe de obra: Jose Luis Lorenzo Talavera. Sin administrador. '
     'Presidente: Antonio Rodriguez Torrejon (01910839E; 646 608 957; antoniorguezt@gmail.com desde el 13/02/2025; antes antonio.rodriguez@economia.gob.es, tachado). Cuenta ES58 2100 2684 8313 0043 1155 '
     '(en el presupuesto de Fain). Junta de Villaverde. PEM 19.441,68. Visados TL/004351/2024 y TL/004411/2024 (justificacion de obra). Expediente 112/2022/02570. Declaracion responsable. '
     'El 29/04/2025 el presidente rechaza la HE de renovacion de la subvencion ("no consideramos que compense continuar").\n\n' + crudo('huertavillaverde9', 2022)),
    ('hermanosdepablo45 (2021)', '2021-02-25', None, None, None,
     'CALLE HERMANOS DE PABLO 45 MADRID - encargo de 2021, distinto del ascensor de 2026 (que es la oportunidad de produccion). Sin ficha de este encargo; en la carpeta: correos, presupuesto y solicitud '
     'de licencia numerados "53.-" (25/02/2021; la misma tanda que Hermanos Gomez 45 y Hermanos Machado 5, proyectos de otro arquitecto que paso a Daniel), escrito de aplazamiento de la DO al Ayto '
     'registrado el 03/03/2021 y "datos expediente".', R('hermanosdepablo45'))]
for carp, fecha, trajo, cif, ref, t, *ruta in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, comercial='Alvaro' if carp in ('herminiopuertas49', 'higueras34') else 'Daniel', ruta=ruta[0] if ruta else None)
fila('hermanosgomez45', '2021-02-25', 'cerrada', 'Anulada: en la ficha, "TIPO DE OBRA: ANULADO YA NO TENGO NADA".', 'IÑIGO (INVER)', None, None,
     'CALLE HERMANOS GOMEZ 45 MADRID. Fecha: 02/2021 (los primeros ficheros, 25/02/2021: correos, presupuesto, solicitud de licencia y proyecto sin visar numerados "54.-"; escrito de aplazamiento de la DO '
     'al Ayto, 03/2021). Empresa: GESVYSEN (695 816 037; contacto David Espinosa).')
for carp, fecha, trajo, t in [
        ('hacienda22', '2020-10-01', None, 'Carpeta "hacienda22" SIN ficha de datos: solo un calculo de deflexiones a nombre de Daniel de Soto (oct-2020). La carpeta no dice la calle completa.'),
        ('haciendadepavones308', '2016-09-25', 'FELIPE OSADO (ENOR)', 'Calle HACIENDA DE PAVONES 308 MADRID. Fecha: 09/2016. Distrito 14 - Moratalaz (Fontarron). Contacto: Julio Garrido, 616 395 770. '
         'Ficha vacia; hay croquis, presupuesto, valoracion y render (sep-oct 2016).'),
        ('hermosilla71', '2017-05-25', 'LUIS MIGUEL NUNES (THYSSEN)', 'Calle HERMOSILLA 71 MADRID. Fecha: 05/2017. Distrito 04 - Salamanca (Goya). Ficha vacia; hay croquis y plano (may-jun 2017).'),
        ('hospitaldelafuenfria', '2017-05-01', 'LUIS MIGUEL NUNES (THYSSEN)', 'Calle HOSPITAL DE LA FUENFRIA MADRID (sin numero en la carpeta ni en la ficha). Fecha: 05/2017 (dia desconocido; '
         'croquis y fotos del 09/09/2017). Contacto: Julio Aparicio, 91 856 27 08. Ficha vacia; hay croquis y fotos.'),
        ('huertadelbayo4', '2017-05-11', 'PEDRO ARANDA (THYSSEN)', 'Calle HUERTA DEL BAYO 4 MADRID. Fecha: 05/2017. Distrito 01 - Centro (Embajadores). Ficha vacia; hay croquis y presupuesto.')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 3. MANIAS
mania('Mejora de la accesibilidad en planta baja en Norma Zonal 4: va por Declaracion Responsable, no por licencia.', 'ECU (ACTECU)', '2025-09-02',
      'hermanosmachado41', clave='hm41', trozo='Norma Zonal 4')
mania('Ascensor por fachada (desembarco a terrazas): el expediente de licencia se eleva a la Mesa Tecnica de Ascensores y queda a la espera de su estudio.',
      'Junta Municipal de Distrito de Latina', '2026-02-17', 'huertadecastañeda13', clave='hc13', trozo='Mesa Técnica de Ascensores')
mania('Declara ineficaz la Declaracion Responsable del ascensor sin haber mandado requerimientos antes.', 'Junta Municipal de Distrito de Ciudad Lineal', '2023-11-02',
      'hermanosmachado5', clave='hm5', trozo='la declaran ineficaz')

resumen()
