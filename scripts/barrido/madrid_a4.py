# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda A4 (avenidas avabrantes .. avhellin19, 41 carpetas). 6-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from trocear2 import trocear2

ENVOLTERMIA = '19ee20c9-bdb2-4dc9-930c-be79a7379194'; IBERLEAN = 'e94998bc-b945-455b-b700-2f6ec6265b8c'; EFFIC = '1d2827a3-5a80-4e4e-b4da-6d9902be0122'
AGISA = 'a32fc94c-1f70-42fa-b9ae-3da772396918'
PU.update(adelgado='ac92631c-b667-4155-bbc8-e1575a83c70c', collado='0f2b3251-9e84-443d-b81e-32edfd1f7915', alberto_mc='31cb6a71-758a-4fe4-883a-610b1be4c5e0',
          alfredo_ib='97fbfb50-5db7-43e7-a916-aa32441ced0d', oscar_lopez='d1e23642-da9f-4493-8134-f9f9bdb16e74', paramio='900b6af9-4a5c-4e31-8c09-322357ee402c',
          mohammed='8ea348ed-3528-40e7-852d-05ff1a723230', pujol='37e7d0f8-8fda-434d-95f1-f739688a0c61', reina='0852e365-a03b-4bdc-8a32-02f27b5d7b26',
          rocha='b4bb0076-ea69-472e-8aee-0b7132a41c10', vreal='3606239e-1b7a-48c1-bea2-08c841efee80', lamarca='f84c4182-bae8-4382-b5d7-38687cdd99c7',
          velasco='94b4d0ec-edd7-4038-a58f-0823b287fa8f', justo='d3e649fb-351f-4ed1-bff1-2430a532ff57', alba='61038fa7-f2fa-4dfa-a169-dae52465513c',
          cecilio='29f04826-a533-4514-be1e-4be43ecdc007', vanesa='05cda534-6907-43b0-b674-53cbe143a278')
GANADA = ' [REVISAR EN FACTURACION]'


def firma_hecha(oid, fecha, nota):
    h = b.leer('hitos_oportunidad?select=id,estado&oportunidad_id=eq.%s&hito=eq.firma' % oid) if ESCRIBIR else [{'id': 'x', 'estado': 'pendiente'}]
    if h and h[0]['estado'] != 'hecho':
        act('hitos_oportunidad?id=eq.' + h[0]['id'], {'estado': 'hecho', 'fecha': fecha, 'notas': nota})


def nota_app(clave, texto):
    ins('notas_oportunidad', [{'oportunidad_id': OPP[clave][1], 'fecha': None, 'texto': texto, 'origen': 'app', 'autor': 'Monica (6-oct-2026, en el barrido)'}])


def renombrar_pc(mal_empieza, datos):
    d = b.leer('personas_comunidad?select=id,nombre&nombre=like.' + quote(mal_empieza) + '*')
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


# ================================================================= 1. PRODUCCION (20)
rellenar('abr81', 'AVDA ABRANTES 81', 'avabrantes 81-83-85', {'fecha_apertura': '2025-11-24',
    'origen_notas': 'Fecha de llegada: 11/2025. Administracion: ASESORIA Y TRAMITACION SLP (GASYTRA; Juan A. Pretel Cuenca; 915 609 616 / 8018; gasytra@gestores.net) - NO esta en la agenda. Tipo de obra: SATE. '
                    'La ficha no tiene notas. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('sate',), captador=CARLOS, lleva=ALVARO)
rellenar('agu74', 'AV AGUILAS 74', 'avaguilas74', {'fecha_apertura': '2023-07-06', 'referencia_catastral': '3606344VK3730F',
    'origen_notas': 'Fecha de llegada: 06/2023. Antes, AVENIDA GENERAL FANJUL 74. Contacta: el presidente, Jonatan Gonzalez Sanchez, que entonces era tecnico de Accesalia ("casa de Jonatan"; hoy ya no trabaja aqui; es una oportunidad normal - Monica, 6-oct-2026). '
                    'Tipo de obra: SATE + ASCENSOR + SUBV + CSS gratis (desde abr-2025, por indicacion de Daniel). Barrio: Aguilas. Tecnico: Jonatan. Ano 1967. Contrata: IBERLEAN (Alfredo Jimenez, 696 133 376; jefe de obra Leonardo Betancourt); '
                    'Arquiobras (Susana Barco). Administracion: ~~Administraciones ATB (Angel, 915 094 462)~~ -> desde abr-2025 Administracion Antonio Delgado (C/ Blas Cabrera 74 posterior; 917 057 376). OJO: CIF con E (E78913308). '
                    'Catastro confunde el 74 con el 76: la referencia buena es 3606344VK3730F (la de las escrituras). Licencia por ECU (ACTECU). PEM 318.549,53. Visados TL/013830/2023 y TL/000809/2024; CFO TL/010291/2026; EBSS TL/013813/2026. '
                    'Superficie 400,25. CFO enviado 18/08/2026: obra terminada; queda abierta. Comercial: DANIEL.'},
    ('sate', 'ascensor', 'subvenciones', 'css'), n=fijar('avaguilas74', 2023),
    presi=('JONATAN GONZALEZ SANCHEZ', 'presidente', '638 07 57 64', '50111979Q', 'gonzalez.sanchez.jntn@gmail.com'), trae_pc='presi')
rellenar('alb134', 'AVDA ALBUFERA 134', 'avalbufera134', {'fecha_apertura': '2025-12-16',
    'origen_notas': 'Fecha de llegada: 12/2025. Contacta: el administrador (Miguel Ortega). Tipo de obra: SATE. En la ficha: comercial interno "DANIEL O CARLOS"; en la duda, Daniel. HE enviada 16/12/2025.'},
    ('sate',), n=fijar('avalbufera134', 2025))
rellenar('alb145', 'AVDA ALBUFERA 145', 'avalbufera145', {'fecha_apertura': '2026-04-01',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia desconocido). Tipo de obra: SUBVENCION de un PROYECTO EXTERNO (hay documentacion de la comunidad de may-2026). La ficha no tiene notas. Comercial interno: ALVARO.'},
    ('subvenciones',), captador=ALVARO, lleva=ALVARO)
ALVARO_ENV = persona_nueva('Álvaro', 'López Megía', None, '621 272 978 / 910 054 135', 'alopez@envoltermia.com', contrata=ENVOLTERMIA)
persona_nueva('Antonio', 'Cuartero', None, None, 'antonio.cuartero@tkelevator.com', contrata='f181ab05-fc99-4415-91af-2c5b62389a55')
rellenar('alb250', 'AV ALBUFERA 250', 'avalbufera250', {'fecha_apertura': '2022-04-11', 'referencia_catastral': '5212701VK4751C',
    'origen_notas': 'Fecha de llegada: 04/2022 (ficha del portal D: "Oswalda para administrador", Adolfo Collado). Contacta: Adolfo Collado (MC GESTION FINCAS; ahora lo lleva Alberto, preferente; Angel 636 97 25 08). ~~NVR~~ tachado. '
                    'Tipo de obra: 9 ASCENSORES + 9 SATES + SUBV, e IEEs (el administrador contrata 9 IEEs el 15/11/22); en ago-2025 se anade la hibridacion de aerotermia (Envoltermia). Barrio: Portazgo. '
                    'Tecnicos: Fernan / Susana / Carla -> Julio -> Israel. Jefe de obra: Alejandro Gonzalez Fernandez (657 596 500). Contratas: ENVOLTERMIA (Alvaro Lopez Megia) y TKE (Antonio Cuartero); ~~FAIN (Oswaldo)~~. '
                    'Conserje (portales A B C): Alberto, 650 317 001. La DR del ayuntamiento se paralizo (10 meses sin abrir el expediente; devolvieron la fianza sin conceder ni requerir); se paso a LICENCIA por ECU (ACTECU), '
                    'aprobada 11-06-2025 (350/2025/08724). Inicio de obra 24/07/2025. PEM 2.980.644,35. Visados TL/015827/2022, TL/020321/2023 (memoria) y CFO TL/010147/2026. Superficie 1.701,23 (ascensores 407,33 + fachadas 1.293,90). '
                    'Tecnico del ayuntamiento para subvenciones: Isabel, 630 70 35 50. Cuenta desde julio-2025: ES70 2100 1180 1802 0028 4884. Comercial: DANIEL.'},
    ('ascensor', 'sate', 'subvenciones', 'iee', 'aerotermia'), n=fijar('avalbufera250/FICHA DATOS TECNICOS.docx', 2022),
    huecos=H(('HISTORIA', 'Presidenta: ~~Maria Carmen Sopeña Maestro (51829915J)~~ -> Maria Dolores (Lola) Gonzalez Escribano (52860480V), 669 393 051, lolaglez28@gmail.com'),
             ('HISTORIA', 'Cuenta: ~~ES66 2085 9978 88 0330389909~~ -> ES70-2100-1180-1802-0028-4884 (julio 2025)'),
             ('TRAMITACION', 'Expedientes: ~~350/2022/10989 (licencia no vale)~~; ~~350/2023/28418 (DR septiembre 2023)~~; ~~511/2024/42394 (Archivo de la Villa)~~; ~~350/2024/35731 (DR nueva para subvencion)~~; 350/2025/08724 LICENCIA ECU')),
    comunidad={'iban': 'ES70 2100 1180 1802 0028 4884'}, adm=PU['collado'], trae_pu=PU['collado'])
renombrar_pc('MARIA CARMEN SOPEÑA MAESTRO MARIA DOLORES', {'nombre': 'MARIA DOLORES GONZALEZ ESCRIBANO', 'documento': '52860480V', 'telefono': '669393051', 'email': 'lolaglez28@gmail.com',
                                                       'notas': 'Presidenta (Lola). Antes ~~Maria Carmen Sopeña Maestro (51829915J)~~: estaban las dos en el mismo nombre (arreglado 6-oct-2026).'})
LEONARDO = persona_nueva('Leonardo', 'Betancourt', 'jefe de obra', None, None, contrata=IBERLEAN, notas_='Iberlean: jefe de obra (Av. America 13, Av. Aguilas 74).')
rellenar('ame13', 'AV AMERICA 13', 'avamerica13', {'fecha_apertura': '2022-11-24', 'referencia_catastral': '2769808VK4726H',
    'origen_notas': 'Fecha de llegada: 11/2022. Contacta: Alfredo y Miguel (IBERLEAN). Tipo de obra: ASCENSOR. Barrio: Prosperidad. Tecnicos: Javier + Carla. Jefe de obra: Leonardo Betancourt (Iberlean). '
                    'Administracion: Ana Gonzalez Fernandez (administracionglez@gmail.com). Presidenta: Sonia de Vicente (sonia.devicente69@gmail.com). Junta de Chamartin: Marta Gomez Gil (91 588 03 33, gomezg@madrid.es). '
                    'OJO: el CIF del proyecto, del COAM y del ayuntamiento esta mal (nos dieron otro incorrecto; pedido al COAM que lo corrija). La ECU decia que iba por licencia; por la subvencion se presento como DR, de acuerdo con Alemany (10/01/2023). '
                    'PEM 103.969,59. Visados TL/022273/2022, TL/000312/2023, TL/000830/2023; CFO TL/008721/2024: obra terminada; queda abierta. Expediente 350/2023/00900. Zona 3, grado 1, nivel a. Superficie 58,29. Comercial: DANIEL.'},
    ('ascensor',), comunidad={'cif_comunidad': 'H80180573'}, presi=('SONIA DE VICENTE', 'presidente', None, '50838018Z', 'sonia.devicente69@gmail.com'), trae_pu=PU['alfredo_ib'])
rellenar('avi91', 'AV AVIACION 91 A 101', 'avaviacion91a101', {'fecha_apertura': '2024-05-07',
    'origen_notas': 'Fecha de llegada: 05/2024. Contacta: Oscar Lopez (FAIN), que encarga el proyecto con CSS (la facturacion de FAIN la lleva Fuenlabrada: Noelia Morente). Tipo de obra: 6 PLATAFORMAS ELEVADORAS (salvaescaleras) + rampas + SUBVENCION; '
                    'una sola comunidad (mancomunidad de 6 portales, 91 a 101, cada uno con su referencia catastral). Barrio: Aguilas. Tecnico: Carla. Fecha encargo: 29/05/2024. Jefe de obra: Mariano Loriente. Ano 1970. '
                    'Administracion: Antonio Delgado (91 705 73 76). Presidenta: Sandra Garcia Martinez (97 4oA, 618 402 294); Patricia, vecina, 606 255 327. Ocupa via publica: se tramito por DR y Daniel lo justificara despues; la comunidad dice que los terrenos son suyos '
                    '(firma documento eximiendo a FAIN y a la DF). PEM 73.056,66. Visado TL/011458/2024; CFO TL/008701/2026 (obra empezada y terminada, acta 27/05/2026): obra terminada; queda abierta. Expediente 350/2024/22429. Comercial: DANIEL.'},
    ('plataforma', 'css', 'subvenciones', 'iee'), n=fijar('avaviacion91a101/FICHA DATOS TECNICOS.docx', 2024),
    presi=('Sandra Garcia Martinez 97 4ºA', 'presidente', '618402294', '50453946L'), trae_pu=PU['oscar_lopez'])
ALBERTO_EFFIC = persona_nueva('Alberto Miguel', 'Jiménez Cárceles', None, None, 'albertomiguel.jimenez@effic.es', contrata=EFFIC)
persona_nueva('Juan Francisco', 'Martínez Pérez', None, None, 'juan.martinez@effic.es', contrata=EFFIC)
rellenar('bad18', 'AV BADAJOZ 18', 'avbadajoz18', {'fecha_apertura': '2026-01-29',
    'origen_notas': 'Fecha de llegada: 01/2026. Contacta: Alberto Miguel Jimenez Carceles (EFFIC, agente rehabilitador; companero de Juan Francisco Martinez). Tipo de obra: ASCENSOR por fuera del edificio derribando la escalera actual, '
                    'dentro de un presupuesto de intervencion integral de mejora de la envolvente. Hay escaneo 3D. Comercial interno: ALVARO. HE entregada a Alvaro 04/02/2026.'},
    ('ascensor',), n=fijar('avbadajoz18', 2026, ('2026-01-29', 'Correo de EFFIC del 29 de enero de 2026.')), trae_pu=ALBERTO_EFFIC, captador=ALVARO, lleva=ALVARO)
CASALLO = persona_nueva('Antonio', 'Casallo Tamayo', None, None, 'antonio.casallotamayo@agisa.es', empresa=AGISA)
persona_nueva('Alberto', 'Rey Vallejo', None, None, 'alberto.reyvallejo@agisa.es', empresa=AGISA)
rellenar('bet74', 'AV BETANZOS 74', 'avbetanzos74', {'fecha_apertura': '2021-05-01', 'referencia_catastral': '9617901VK3891F',
    'origen_notas': 'Fecha de llegada: 05/2021 (dia desconocido). Contacta: Juan Paramio (FAIN). Tipo de obra: PLATAFORMA ELEVADORA VERTICAL. Barrio: Pilar. Jefe de obra: Eusebio Medina. Administracion: AGISA (Plaza de Tuy 14; Mohammed El Moallem, '
                    '917 300 578; Antonio Casallo Tamayo; Alberto Rey Vallejo). PEM 39.632,87. Visado TL/000814/2024. Expediente 108/2021/04588. La ficha no tiene notas. Comercial: DANIEL.'},
    ('plataforma',), presi=('Jose estepa', 'presidente', None, None, 'joseestepa@hotmail.com'), trae_pu=PU['paramio'])
rellenar('can63', 'AV CANILLEJAS A VICALVARO 63', 'avcanillejasavicalvaro63', {'fecha_apertura': '2022-03-01', 'referencia_catastral': '8264312VK4786C',
    'origen_notas': 'Fecha de llegada: 03/2022 (dia desconocido). Contacta: Carlos Pujol Giralt (Schindler). Tipo de obra: ASCENSOR por patio (DR, NZ 4). Barrio: Canillejas. Tecnico: Enrique. Jefe de obra: Manuel Crespo Garcia Abad (Schindler). '
                    'Administracion: ~~AlonsoGest (Alberto de la Orden / Agueda; 91 313 01 07; fincas@alonsogest.com)~~ -> INMO PIRAMIDES (Paseo Vallejo Najera Botas 56 local; 915 179 060; higinio.hidalgo@inmho.es) - no esta en la agenda. '
                    'Juan, vecino y expresidente: 658 616 133. PEM 59.495,80. CFO TL/014099/2024: obra terminada; queda abierta. Expediente 350/2022/05497 (Slim). Superficie 31,37. Comercial: DANIEL.'},
    ('ascensor',), n=fijar('avcanillejasavicalvaro63', 2022), presi=('MARIA DEL CARMEN SERRANO AYLLON', 'presidente', None, '02504964B'), trae_pu=PU['pujol'])
rellenar('cab16', 'AV CARABANCHEL ALTO 16', 'avcarabanchelalto16', {'fecha_apertura': '2022-05-11', 'referencia_catastral': '6295408VK3669E',
    'origen_notas': 'Fecha de llegada: 05/2022. Contacta: FAIN (Jose Manuel Reina; Ignacio Bermejo Simon). Tipo de obra: ASCENSOR (caracol, derribo de escalera) + SALVAESCALERAS + SUBV. Barrio: Buenavista. Tecnicos: ~~Javier~~ -> Julio -> Carlos. '
                    'Fecha encargo: 21/07/2022 (presupuesto firmado por la presidenta el 11/07/22; 7% a la firma y el resto antes de empezar). Jefes de obra: Juan Luis Ruiz y Abel Bernardos. Administracion: FINCAS ROCHA (Jose Maria Barragan, 91 112 43 14). '
                    'Presidenta: ~~Laura Barbulescu Bardac (3oB)~~ -> desde mayo-2024 Marina Calvo, 616 097 681. La DR del ayuntamiento se DENEGO (APE 11.08 Casco de Carabanchel Alto: "ayto no vale") -> LICENCIA por ECU (en tramite 20/03/2024). '
                    'Inicio de obra 31-03-2025. PEM 159.617,81. Visado TL/017459/2022; CFO TL/013963/2026; EBSS TL/014838/2026: obra terminada; queda abierta. Superficie 63,26. Comercial: DANIEL.'},
    ('ascensor', 'plataforma', 'subvenciones'), n=fijar('avcarabanchelalto16', 2022), adm=PU['rocha'], trae_pu=PU['reina'])
d = b.leer('personas_comunidad?select=id,rol&nombre=like.' + quote('Laura Barbulescu') + '*')
if d and d[0]['rol'] == 'presidente':
    act('personas_comunidad?id=eq.' + d[0]['id'], {'rol': 'otro', 'notas': 'Presidenta hasta mayo-2024 (tachada en la ficha). La sustituye Marina Calvo (6-oct-2026).'})
    c, _ = info('AV CARABANCHEL ALTO 16')
    ins('personas_comunidad', [{'id': nuevo_id(), 'comunidad_id': c['id'], 'nombre': 'Marina Calvo', 'rol': 'presidente', 'telefono': '616097681', 'email': None, 'documento': None,
                                'es_contacto_principal': False, 'notas': 'Presidenta desde mayo-2024 (ficha de Dropbox).'}])
rellenar('cho260', 'AV CARDENAL HERRERA ORIA 260', 'avcardenalherreraoria260', {'fecha_apertura': '2022-02-28', 'referencia_catastral': '8816815VK3881F',
    'origen_notas': 'Fecha de llegada: 02/2022. Antes, CADALSO DE LOS VIDRIOS 2. Contacta: Vicente Real (FAIN), que vende un ascensor de embarque simple, 5 paradas. Tipo de obra: ASCENSOR + SUBV. Barrio: Peñagrande. Tecnico: Fernan. '
                    'Fecha encargo: 28/02/2022. Jefes de obra: Juan Luis Ruiz de Mier y Abel Bernardos. Administracion: no tienen. Presidente: Husam Ghadieh (615 880 545, husam.rg@hotmail.com); Roberto Gutierrez dice ser vicepresidente (gevaudan37@yahoo.es). '
                    'Junta de Fuencarral (Av. de Monforte de Lemos 40): Luis Norberto Rodelgo Torremocha, 91 588 61 60 / 91 588 68 54, rodelgotln@madrid.es. DR. PEM 110.084,03 (PC 131.000 + IVA). Visados TL/014194/2022, CFO TL/013759/2024 ("no vale") '
                    'y nuevo CFO TL/001307/2026 (fecha fin corregida). Expediente 350/2022/05936. Superficie 44,16. Renovacion de la HE de subvenciones 19/5/2025. Comercial: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('avcardenalherreraoria260/FICHA DATOS TECNICOS.docx', 2022, ('2022-02-28', 'Sin fecha: correo de Vicente Real para la exposicion del 2 de marzo.')),
    comunidad={'iban': 'ES12 0081 1534 5900 0113 6519', 'cif_comunidad': 'H80089824'}, presi=('HUSAM GHADIEH', 'presidente', '615 880 545', '49689678H', 'husam.rg@hotmail.com'), trae_pu=PU['vreal'])
# --- 283: UNA opp con tres fichas; GANADA (HE firmada y proyecto hecho) aunque se rescindio en nov-2024
F283 = 'avcardenalherreraoria283/'
n283 = [(f, '[PROYECTO CONJUNTO] ' + t) for f, t in fijar(F283 + '1 conjunto ascensor y sate/FICHA DATOS TECNICOS.docx', 2023)]
ya = {t.split('] ', 1)[1][:60] for f, t in n283}
n283 += [(f, '[ASCENSOR] ' + t) for f, t in fijar(F283 + '1a ascensor/FICHA DATOS TECNICOS ASCENSOR.docx', 2023, ('2024-11-01', 'Sin fecha; habla de la rescision de noviembre de 2024.')) if t[:60] not in ya]
rellenar('cho283', 'AV CARDENAL HERRERA ORIA 283', 'avcardenalherreraoria283', {'fecha_apertura': '2023-02-14', 'referencia_catastral': '8613217VK3881D',
    'origen_notas': 'Fecha de llegada: 02/2023. Contacta: Vicente Real (FAIN). UNA oportunidad con tres fichas (proyecto conjunto 2023, ascensor y SATE). Tipo de obra: ASCENSOR (lo paga FAIN) + SATE (lo paga la comunidad; se cobra por Next Generation) '
                    '+ cota cero en planta baja con rampa; subvenciones aparte. Barrio: Peñagrande. Tecnicos: Susana; Julio (ascensor). Ano 1955. Administracion: ~~Administraciones DTI (Lourdes Tejedor)~~ -> Administraciones Lamarca Fincas '
                    '(Tomasa Lamarca Muro; Cl. Isla de Ons 12 bajo; 91 176 07 02; administracion@lamarcafincas.com). Presidentas: ~~Mercedes Paule Sastre (3o dcha)~~ -> Almudena Uriarte Blanco; desde 14/12/2023 Julia Monero (637 91 57 87, cla_ros_8@hotmail.com); '
                    'ademas Vanessa Garcia Jimenez (679 14 51 69, "añadir a Vanessa en toda comunicacion"). Junta de Fuencarral: Luis N. Rodelgo, arquitecto tecnico. PEM 263.555,31. DR 18/08/2023 (350/2023/25337). Visado TL/010071/2023; '
                    'ascensor TL/018762/2024, licencia por ECU aprobada 28-03-2025. NZ 8.4. Superficie 370,53. Constructor: Luis (Buildy, 657 973 170). '
                    'NOVIEMBRE 2024: por diferencias con la comunidad se rescinde el contrato; el ascensor sigue con FAIN por separado y se da la venia para el SATE a una arquitecta externa (Teresa Cardiel, Detaller Arquitectos). '
                    '12/02/2025: nos desvinculamos del proyecto y de la licencia. GANADA: la HE se firmo y el proyecto se hizo (Monica, 6-oct-2026). Comercial: DANIEL.'},
    ('ascensor', 'sate', 'cota_cero', 'subvenciones'), n=n283, presi=('ALMUDENA URIARTE BLANCO', 'presidente', None, '00809783E'), trae_pu=PU['vreal'])
renombrar_pc('Mercedes Paule Sastre', {'nombre': 'ALMUDENA URIARTE BLANCO', 'documento': '00809783E',
                                       'notas': 'Antes ~~Mercedes Paule Sastre (3o dcha, 00378906G)~~: estaban las dos en el mismo nombre (arreglado 6-oct-2026).'})
if ESCRIBIR: firma_hecha(OPP['cho283'][1], '2023-08-18', 'Proyecto hecho y visado (TL/010071/2023; DR 18/08/2023). La HE no trae fecha en la ficha.')
else: firma_hecha(None, None, None)
nota_app('cho283', '[REVISAR EN FACTURACION] Ganada: HE firmada y proyecto hecho (visado TL/010071/2023). En nov-2024 se rescinde el contrato y en feb-2025 nos desvinculamos de la licencia. Revisar que se ha cobrado y que no queda nada pendiente.')
rellenar('cho291', 'CARDENAL HERRERA ORIA 291', 'avcardenalherreraoria291', {'fecha_apertura': '2025-03-31', 'referencia_catastral': '8613213VK3881D',
    'origen_notas': 'Fecha de llegada: 04/2025 (el correo es del 31/03/2025). Contacta: Javier Velasco Redondo (Elecnor); en copia Ana Encinas y Alvaro Martin Cicero. Tipo de obra: CONSULTA VINCULANTE al ayuntamiento y despues el proyecto de ASCENSOR. '
                    'Barrio/distrito: Fuencarral-El Pardo. Ano 1955. OJO: el asunto del correo dice "CARDENAL HERRERA ORIA 297": se toma por errata (esta en la carpeta del 291). HE y subvenciones enviadas 1/04/2025. '
                    'La peticion de 2023 de un vecino (ascensor y SATE) es otra oportunidad: va a la clon (Monica, 6-oct-2026). Comercial: DANIEL.'},
    ('consulta_urbanistica', 'ascensor', 'subvenciones'), n=fijar('avcardenalherreraoria291/FICHA DATOS.docx', 2025), trae_pu=PU['velasco'])
rellenar('hel4', 'AVDA DE HELLIN 4', 'avdehellin4', {'fecha_apertura': '2025-09-29',
    'origen_notas': 'Fecha de llegada: 10/2025 (el correo es del 29/09/2025). Contacta: Justo Rojo Perez, del despacho de Diego Rojo (ROJO JUSDI; Alba Pedraja). Tipo de obra: IEE (20 propiedades), dentro de la lista de 14 comunidades de Rojo Jusdi '
                    'que tienen que pasar la IEE antes del 31/12/2025 (como Amposta 20). Comercial interno: DANIEL. HE enviada 24/10/2025 al precio que indico Daniel.'},
    ('iee',), n=fijar('avdehellin4', 2025, ('2025-09-29', 'Correo de Justo Rojo del 29 de septiembre de 2025.')), adm=PU['alba'], trae_pu=PU['justo'])
rellenar('gt133', 'AV DOCTOR GARCIA TAPIA', 'avdoctorgarciatapia133-135-137', {'fecha_apertura': '2026-02-20', 'referencia_catastral': '6037808VK4763E',
    'origen_notas': 'Fecha de llegada: 02/2026. Contacta: Adolfo Collado (MC GESTION FINCAS); lo lleva Alberto Olvera. Tipo de obra: DIRECCION FACULTATIVA y CERTIFICADO DE IDONEIDAD por una orden de ejecucion; despues, DR (HE urgente 23-03-2026). '
                    'Barrio: Marroquina. Tecnico: Israel. Fecha encargo: 20/02/2026 (HE firmada el mismo dia). Ano 1985. Contrata: HOGAR Y HOBBY (Jose Luis, 645 921 521, hogaryhobby@gmail.com). DR registrada 06/04/2026; '
                    'CFO por Slim (no hay que visarlo) y certificado de idoneidad, 20/04/2026: obra hecha; queda abierta. Comercial interno: DANIEL.'},
    ('df', 'informe_tecnico'), n=fijar('avdoctorgarciatapia133-135-137', 2026),
    comunidad={'iban': 'ES58 0081 0571 9400 0127 2530'}, presi=('MARIA DEL PILAR TOMAS SUAREZ', 'presidente', None, '51871412H'), trae_pu=PU['alberto_mc'])
rellenar('don18', 'AVDA DONOSTIARRA 18', 'avdonostiarra18', {'fecha_apertura': '2025-12-29',
    'origen_notas': 'Fecha de llegada: 12/2025. Administracion: "ISABELINO" (no esta en la agenda). La ficha no dice tipo de obra ni tiene notas. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    (), captador=CARLOS, lleva=ALVARO)
rellenar('don3', 'AV DONOSTIARRA 3', 'avdonostiarra3', {'fecha_apertura': '2026-06-11',
    'origen_notas': 'Fecha de llegada: 06/2026. Contacta: Cecilio Jimenez Lopez (JICAN ASCENSORES; 639 223 819 / 914 652 963; jican@ascensoresjican.es). Tipo de obra: MODIFICACION DE ASCENSOR: ampliar 3 paradas en sotanos (de 12 a 15), '
                    'rompiendo forjados. Comercial interno: DANIEL. HE a Monica para ok 16-06-26, enviada 22/06/26.'},
    ('modificacion_asc', 'anadir_parada'), n=fijar('avdonostiarra3', 2026, ('2026-06-11', 'Correo de Jican del 11 de junio de 2026.')), trae_pu=PU['cecilio'])
if not b.leer('correo?select=id&email=eq.jican@ascensoresjican.es'):
    ins('correo', [{'puesto_id': PU['cecilio'], 'email': 'jican@ascensoresjican.es', 'etiqueta': 'general', 'principal': True}])
    act('puesto?id=eq.' + PU['cecilio'], {'telefono_empresa': '639 223 819 / 914 652 963'})
rellenar('rub19', 'AVDA DOCTOR FEDERICO RUBIO', 'avdrfedericorubioygali19', {'fecha_apertura': '2025-11-25',
    'origen_notas': 'Fecha de llegada: 11/2025. Contacta: la comunidad (Angel). Tipo de obra: ACCESIBILIDAD EN EL PORTAL (elevador vertical). Administracion: ADM BAEZA ("tiene la oficina alli") - no esta en la agenda. Hay escaneo 3D. '
                    'Comercial interno: CARLOS.' + CAPTO_CARLOS + ' HE y viabilidad enviadas 25-11-2025.'},
    ('accesibilidad', 'plataforma'), n=fijar('avdrfedericorubioygali19', 2025), captador=CARLOS, lleva=ALVARO)
sv = [(('2024-12-01' if f is None else f), t) for f, t in trocear2(subv('avelinofernandezdelapoza11'), 2024)]
sv = [(f, t.replace('04/06/2006', '04/06/2006 [errata: 2026]')) for f, t in sv]
rellenar('ave11', 'AVELINO FERNANDEZ DE LA POZA 11', 'avelinofernandezdelapoza11', {'fecha_apertura': '2024-10-30', 'referencia_catastral': '3009912VK4730G',
    'origen_notas': 'Fecha de llegada: 10/2024 (lo vio Pedro Aranda, de Thyssen, en 2016; hay croquis). Contacta: la administradora (DEL BRIO Y BLANCO: Vanesa; 91 477 41 91; administradores@ y vanesa@delbrioyblanco.es; de lunes a viernes de 9:30 a 13:30; '
                    'facturas a facturacion@delbrioyblanco.es; Francisco Blanco). Tipo de obra: ASCENSOR CON DERRIBO + SUBV (ascensor interior con acceso desde el sotano, invadiendo una plaza de garaje; plataforma salvaescaleras inclinada; escalera al patio). '
                    'Barrio: Entrevias. Tecnico: Julio. Fecha encargo: 11/12/2024. Ano 1981. Contrata elegida: GRADCOM. PEM 152.615,28. Visados TL/006760/2025 y TL/015861/2025. Superficie 154,68. '
                    'La obra esta supeditada a la concesion de la subvencion (presentada a Rehabilita 2026 el 04/06/2026); falta formalizar el cambio de titularidad de la plaza de garaje a la comunidad. Comercial: DANIEL.'},
    ('ascensor', 'plataforma', 'subvenciones'), n=fijar('avelinofernandezdelapoza11', 2024, ('2016-10-01', 'Sin fecha: visita de 2016 con Pedro Aranda.')),
    comunidad={'iban': 'ES60 2085 9741 7203 3034 7846'}, presi=('LAURA GONZALO DE MINGO', 'presidente', '684261611', '50991628F'), trae_pu=PU['vanesa'], subvencion=sv)

# ================================================================= 2. ORGANISMOS
FUEN = junta(8, 'Fuencarral-El Pardo')
if ESCRIBIR and not b.leer('organismos?select=direccion&id=eq.' + FUEN)[0]['direccion']:
    b.actualizar('organismos?id=eq.' + FUEN, {'direccion': 'Av. de Monforte de Lemos 40, 28029 Madrid'})
persona_nueva('Luis Norberto', 'Rodelgo Torremocha', 'arquitecto técnico', '91 588 61 60 / 91 588 68 54', 'rodelgotln@madrid.es', organismo=FUEN,
              notas_='Junta de Fuencarral-El Pardo (Cardenal Herrera Oria 260 y 283, 2023): da cita telefonica.')
CHAM = junta(5, 'Chamartín')
persona_nueva('Marta', 'Gómez Gil', None, '91 588 03 33', 'gomezg@madrid.es', organismo=CHAM, notas_='Junta de Chamartin (Av. America 13, 2022).')
CARA = junta(11, 'Carabanchel')
for nom in ('Medio Ambiente y Escena Urbana', 'Negociado Administrativo', 'Servicios Técnicos'):
    area(CARA, nom, '915 132 110', 'Miercoles de 9 a 11, con cita previa en citatecnicarabanchel@madrid.es (Av. Carabanchel Alto 16, 2022-24).')
if not b.leer('correo?select=id&email=eq.citatecnicarabanchel@madrid.es'):
    ins('correo', [{'organismo_id': CARA, 'email': 'citatecnicarabanchel@madrid.es', 'etiqueta': 'general', 'principal': True, 'notas': 'Para pedir cita con los servicios de la Junta (miercoles de 9 a 11).'}])
PV = junta(13, 'Puente de Vallecas')
persona_nueva('Isabel', None, 'técnica (subvenciones)', '630 70 35 50', None, organismo=PV, notas_='Tecnico del ayuntamiento para las subvenciones (Av. Albufera 250).')
EICI = organismo('EICI', 'ecu', 'autonomico', 'Entidad colaboradora urbanistica (Av. Betanzos 60, 2023).', ca='COMUNIDAD DE MADRID')
persona_nueva('Iván', 'Fernández', None, '636 81 59 30', 'i.fernandez@eici.es', organismo=EICI)

# ================================================================= 3. CLON
cl = lambda c, a, s=None: J(fijar(c, a, s))
REVS = [
    ('avaviacion71', '2021-10-08', 'VICENTE REAL (FAIN); presidenta Mª Angeles Fernandez Arcones', None, '4299412VK3649G',
     'AV AVIACION 71 MADRID. Fecha: 10/2021. Tipo de obra: ANTEPROYECTO, informe pericial y defensa (en junta y, si llega, en juzgado) de la instalacion de ascensor y nucleo de comunicacion por el interior, en una mancomunidad (portales 71, 65, 61...). '
     'Barrio: Aguilas. Tecnico: Fernan. Presidenta de la mancomunidad: Maria Angeles Fernandez Arcones (portal 69 3oB; 626 947 105; angelesarcones@hotmail.com; trabaja en la administracion ARESI). PEM 52.270; residuos 300. Superficie 54,31.\n\n'
     + cl('avaviacion71', 2021, ('2021-10-08', 'Correo de Angeles Fernandez del 8 de octubre de 2021.'))),
    ('avbetanzos60', '2023-10-18', 'IBERDROLA (Tomas Humada, Eduardo Rihuete, Javier Gomez, Jose Manuel Moreno)', 'H79749693', '9716203VK3891F',
     'AV BETANZOS 60 MADRID. Fecha: 10/2023. Cliente: IBERDROLA (agente rehabilitador; contrato para la TORRE 1). Tipo de obra: LIBRO DEL EDIFICIO, PROYECTO DE SATE, INSTALACIONES (aerotermia y fotovoltaica) Y NEXT GENERATION '
     '(sin DF, gestion de licencias ni CSS). Barrio: Pilar. Tecnico: ISP. Administracion: AGISA (David Montealegre Moreno, 91 730 05 78). Presidente: Emilio Murcia Quintana (05244269Q). Portero: Jose, 662 23 15 99. '
     'Mancomunidad promotora: CDAD PROP CONJUNTO RESIDENCIAL FROILAN PONCE DE LEON (C/ Fermin Caballero 75; H79593661; Olga Maria Palmero Mazon). ECU: EICI (Ivan Fernandez, 636 81 59 30, i.fernandez@eici.es). '
     'Contactos de obra: Seingenia (Coral Souto), Elecnor (Alvaro Martin Cicero; Hector Ortiz), Ullastres (Angel Martin; Carlos Caravias), Iberdrola (Eduardo Rihuete 647 33 73 20; Jose Manuel Moreno 686 22 00 51; Tomas Humada 677 40 25 88).\n\n'
     + cl('avbetanzos60', 2023)),
    ('avbetanzos77', '2022-11-10', 'ELECNOR (Raul Cerezo)', None, None, 'AVENIDA DE BETANZOS 77 MADRID. Fecha: 11/2022. Tipo de obra: LIBRO DEL EDIFICIO + posible SATE. Barrio: Peñagrande.\n\n' + cl('avbetanzos77', 2022)),
    ('avbonn13', '2024-03-04', 'ALEJANDRO JIMENEZ, presidente', None, None, 'AVDA DE BONN 13 MADRID. Fecha: 03/2024. Tipo de obra: SATE Y AEROTERMIA (visitado con Carlos Rosa, de Envoltermia). Distrito Salamanca. Presidente: Alejandro Jimenez, 639 064 268.\n\n' + cl('avbonn13', 2024)),
    ('avburgos16.A', '2019-11-29', 'OSWALDO (FAIN)', 'H79207411', '2808909VK4820H',
     'AVENIDA DE BURGOS 16-A MADRID. Fecha: 11/2019. Tipo de obra: CAMBIO DE PUERTAS DE 4 ASCENSORES. Distrito 05 - Chamartin (Castilla). Presidenta: Monica Carrillo Arnaldos (48427582R). PEM 103.803,13; residuos 300.'),
    ('avcanillejasavicalvaro65', '2024-12-02', 'DIEGO ROJO, administrador (Rojo Jusdi)', None, None,
     'AV CANILLEJAS A VICALVARO 65 MADRID. Fecha: 12/2024. Tipo de obra: ASCENSOR + SATE Y CUBIERTA (transitable) + subv; HE con estudio de costes de SATE y ascensor por separado. Distrito San Blas-Canillejas. Ya hicimos el ascensor del 63.\n\n'
     + cl('avcanillejasavicalvaro65', 2024)),
    ('avcardenalherreraoria116', '2022-11-11', 'IBAI (ELECNOR)', None, None,
     'AV CARDENAL HERRERA ORIA 116 MADRID. Fecha: 11/2022. Tipo de obra: ASCENSOR. Barrio: Valverde. "Es el modelo de Badalona 48, hay que atenerse a ese modelo".'),
    ('avcardenalherreraoria291 (2023)', '2023-03-13', 'un vecino (familigoman@telefonica.net)', None, None,
     'AV CARDENAL HERRERA ORIA 291 MADRID: la peticion de 2023 (ficha "FICHA DATOS TECNICOS" de la carpeta). Tipo de obra: ASCENSOR Y SATE: han ido a la presentacion del 283 y quieren presupuesto (Monica lo manda). Barrio: Peñagrande. '
     'La de 2025 (Elecnor, consulta vinculante) esta en produccion (Monica, 6-oct-2026).\n\n' + cl('avcardenalherreraoria291/FICHA DATOS TECNICOS.docx', 2023)),
    ('avcardenalherreraoria295', '2024-04-08', 'MIGUEL ANGEL PORRAS FERNANDEZ, presidente', None, None,
     'AV CARDENAL HERRERA ORIA 295 MADRID. Fecha: 04/2024. Tipo de obra: SATE Y NEXT GENERATION. Presidente: Miguel Angel Porras Fernandez (665 803 658, mig.ang.porras@gmail.com). Presupuesto enviado 08/04/2024.'),
    ('avcardenalherreraoria297-299', '2023-03-09', 'FRANCISCO RUIZ, vecino', None, None,
     'AV CARDENAL HERRERA ORIA 297 Y 299 MADRID. Fecha: 03/2023. Tipo de obra: SATE, CUBIERTA Y SUBVENCIONES. Barrio: Peñagrande. Francisco Ruiz, vecino, 626 95 99 77.\n\n' + cl('avcardenalherreraoria297-299', 2023)),
    ('avcardenalherreraoria301', '2023-10-23', 'ESTHER HORTELANO, presidenta', None, None,
     'AV CARDENAL HERRERA ORIA 301 MADRID. Fecha: 10/2023. Tipo de obra: REPARACION DE LAS VERTICALES DE LAS TERRAZAS. Barrio: Peñagrande. Administracion: ADOSM Asesoria Integral (91 433 13 76, adosmasesoria@adosm.e.movistar.es). '
     'Presidenta: Esther Hortelano, 619 21 97 06. "Han visto el edificio de enfrente y nos han recomendado".'),
    ('aventrevias78', '2024-02-19', 'CARMEN GARCIA (DEL BRIO Y BLANCO)', None, None,
     'AV ENTREVIAS 78 MADRID. Fecha: 02/2024. Tipo de obra: CONSULTA DE VIABILIDAD DE ASCENSOR (posible ascensor para minusvalidos; obra aprox. 160.000). Distrito Puente de Vallecas. Presidente: Bryan, 618 552 544.\n\n' + cl('aventrevias78', 2024)),
    ('avfelipeii30', '2025-03-03', 'JULIO GARCIA (ENVOLTERMIA)', None, None,
     'AV FELIPE II 30 MADRID. Fecha: 03/2025. Tipo de obra: ASCENSOR POR HUECO Y PLATAFORMA INCLINADA. Distrito Salamanca. HE de proyecto y subvenciones para Envoltermia; 3D de Alex.\n\n' + cl('avfelipeii30', 2025)),
    ('avfilipinas28', '2022-10-03', 'ALFREDO CABRERO (FAIN)', None, None, 'AVENIDA FILIPINAS 28 MADRID. Fecha: 10/2022. Tipo de obra: ASCENSOR (derribo de escalera). Distrito 07 - Chamberi (Vallehermoso).'),
    ('avhellin19', '2022-01-19', None, None, '7958401VK4775H',
     'AV HELLIN 19 MADRID. Fecha: 01/2022. Tipo de obra: FACHADA. Distrito 20 - San Blas-Canillejas (Hellin). Edificio en forma de trebol: toda una urbanizacion de edificios identicos; proyecto piloto en el de la esquina. Hay informe de nube de puntos.')]
for carp, fecha, trajo, cif, ref, t in REVS:
    ruta = R('avcardenalherreraoria291') if carp.startswith('avcardenalherreraoria291') else None
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, ruta=ruta)
fila('avcardenalherreraoria293', '2023-03-30', 'cerrada', 'Perdida: "30/11/2023 han hecho el proyecto copiado de Daniel con otro arquitecto".', 'VICENTE REAL (FAIN)', None, None,
     'AV CARDENAL HERRERA ORIA 293 MADRID. Fecha: 03/2023. Tipo de obra: ASCENSOR Y SATE (ascensor por dentro, 5 paradas, foso reducido; local comercial). Barrio: Peñagrande. Administracion: Finorte (917 302 800; avd. Betanzos 70 1B; '
     'comunidades@finorte.com; Fernando, 630 48 44 36, administra tambien la mancomunidad). Proponen su propio acabado de fachada (Matta Arquitectos).\n\n'
     + cl('avcardenalherreraoria293', 2023, None))
for carp, fecha, trajo, t in [
        ('avaguilas87', '2018-07-01', 'PEDRO ARANDA (THYSSEN)', 'AV DE LAS AGUILAS 87-89 MADRID. Fecha: 07/2018. Distrito 10 - Latina (Aguilas). Ficha vacia; hay croquis.'),
        ('avcardenalherreraoria2', '2016-12-03', 'FELIPE (ENOR), con Juan Luis', 'AVENIDA CARDENAL HERRERA ORIA 2 MADRID. Fecha: 12/2016. Distrito 08 - Fuencarral-El Pardo (Valverde). Ficha vacia; hay croquis.'),
        ('avelinofernandezdelapoza35', '2016-09-30', 'DANIEL, para INVER', 'AVELINO FERNANDEZ DE LA POZA 35 MADRID. Fecha: 30/09/2016. Sin administrador; contacto: Conchi, 630 676 888. Hay croquis.'),
        ('avemaria27', '2016-09-20', 'PEDRO ARANDA (THYSSEN)', 'C/ AVE MARIA 27 MADRID. Fecha: 09/2016. Distrito 01 - Centro (Embajadores). Administracion: AGF (915 398 281, agf@berenguerslp.com). Amaya (amaya_solas@hotmail.com).'),
        ('avemaria45', '2016-09-20', 'PEDRO ARANDA (THYSSEN)', 'AVE MARIA 45 MADRID. Fecha: 09/2016. Ficha vacia; hay croquis.'),
        ('aventrevias82', '2017-05-11', 'INVER', 'AV ENTREVIAS 82 MADRID. Fecha: 05/2017. Distrito 13 - Puente de Vallecas (Entrevias). Contacto: Javier Salvador (640 329 775, javier.salvador.olmo@gmail.com). Ficha vacia.')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 4. MANIAS
mania('Si la DR del ayuntamiento se atasca (en Puente de Vallecas, 10 meses sin abrir el expediente y la fianza devuelta sin conceder ni requerir), se renuncia y se pide por ECU para poder empezar la obra.',
      'Junta Municipal de Distrito de Puente de Vallecas', '2024-07-23', 'avalbufera250', clave='alb250', trozo='ni siquiera han empezado')
mania('El ayuntamiento llego a decir (incidencia de la IEE) que las comunidades "no son subvencionables" porque tienen capacidad de hacer las obras de accesibilidad; hubo que explicar la IEE y aportar planos, presupuesto y la recaudacion anual de la comunidad.',
      'Ayuntamiento de Madrid (subvenciones / IEE)', '2024-11-05', 'avaviacion91a101', clave='avi91', trozo='no son subvencionables')
mania('Si el proyecto ocupa via publica, se tramito por DR y se justifica despues; si la comunidad dice que el terreno es suyo, que firme un documento eximiendo a la contrata y a la DF.',
      'Ayuntamiento de Madrid', '2024-07-09', 'avaviacion91a101', clave='avi91', trozo='ocupación de vía pública')
mania('En el APE 11.08 (Casco de Carabanchel Alto) el ayuntamiento denego la DR del ascensor: hubo que pedir LICENCIA por ECU.', 'Ayuntamiento de Madrid', '2024-03-20', 'avcarabanchelalto16', clave='cab16',
      cita='~~350/2022/08709~~ DENEGADA. ~~DECLARACION. APE.11.08 CASCO CARABANCHEL ALTO.~~ AYTO NO VALE. LICENCIA POR ECU 20/03/2024 EN TRÁMITE')
mania('Junta de Carabanchel: Medio Ambiente y Escena Urbana, Negociado Administrativo y Servicios Tecnicos solo atienden los miercoles de 9 a 11, con cita previa por correo (citatecnicarabanchel@madrid.es) o en el 915 132 110.',
      'Junta Municipal de Distrito de Carabanchel', '2022-07-21', 'avcarabanchelalto16', clave='cab16',
      cita='Servicio de Medio ambiente y escena urbana: Miércoles de 9 a 11 horas, previa petición de cita en citatecnicarabanchel@madrid.es / 915 132 110 (igual Negociado Administrativo y Departamento de Servicios técnicos)')
mania('En una mancomunidad, el tecnico municipal exige que el SATE se ponga de acuerdo con la mancomunidad para un conjunto homogeneo de fachada (el ascensor no da problema).',
      'Junta Municipal de Distrito de Fuencarral-El Pardo', '2023-12-12', 'avcardenalherreraoria283', clave='cho283', trozo='conjunto homogéneo')
mania('La ECU considero que el ascensor iba por LICENCIA; por la subvencion se presento como DR, "y ya se arreglara a posteriori".', 'ECU (ACTECU)', '2023-01-10', 'avamerica13', clave='ame13',
      cita='Según ECU hay que meterlo por licencia. Por temas con la subvención, se decide de acuerdo con Alemany meterlo como DR, y ya se arreglará a posteriori (10/01/2023)')
mania('En Fuencarral hay modelo homogeneo de ascensor (el de Badalona 48) y hay que atenerse a el.', 'Junta Municipal de Distrito de Fuencarral-El Pardo', '2022-11-11', 'avcardenalherreraoria116',
      cita='11/11/22 Es el modelo de Badalona 48, hay que atenerse a ese modelo.')

resumen()
