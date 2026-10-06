# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda A2 (alvarezabellan41 .. argüeso7, 50 carpetas). 6-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa

SCHINDLER = '2ca18bd8-5fe2-4e4e-9093-6601c99bbc05'; FAIN = 'fa005671-8d23-45a6-8172-0ea7ca8c8950'; INMAPE = 'c431ee93-4c38-494e-a67f-d3c33a123998'
DELBRIO = '46b4fe1f-0534-434f-ae7c-cc098fde82cd'; ROJOJUSDI = '3c5b674c-f855-43c2-ba2e-e24582185f2a'; JAGRA = 'e5ccff18-133c-4e83-b8b7-4753c0e1c57d'
ANTONAYA = '34f0b172-5d39-4dfa-9d7a-46b3120d8624'
PU.update(paz='46e3614d-97fd-40bf-baac-07d9bd5e601f', paz_gesmadrid='5733290e-d53c-48d2-8fb7-efad8f352a4f', miguel_od='e6be66e5-35ae-48e1-8a3d-d325749f3d6a',
          alba='61038fa7-f2fa-4dfa-a169-dae52465513c', silvia='6c8e1a7f-999b-4ee9-ac91-cfeb7075dd8c', trebol='00c900df-1c1c-4f09-b45e-a28bc3c6381d',
          lesmes='91d23a32-367e-446c-a0ea-7033a57824f6', isaac='e5abf29a-a25f-4c87-8705-6dc523285e1f', jgonzalez='774c387a-15c5-40e7-a8c3-bcb7f305637c',
          oscar_cega='86273a6d-d0f1-4e29-874e-4aba61764673', ramirez='baf82829-24cc-4faf-9f99-43d797af4728')

# --- EFFIC: agente rehabilitador (coordina contratas en una rehabilitacion). Para la BD, como una contrata (igual que Iberdrola).
if ESCRIBIR and not b.leer('contratas?select=id&nombre=eq.EFFIC'):
    b.insertar('contratas', [{'nombre': 'EFFIC', 'tipo': 'otra', 'especialidad': 'AGENTE REHABILITADOR', 'activa': True,
                              'notas_comercial': 'Agente rehabilitador: coordina a las contratas de una obra de rehabilitacion. Colaboramos con ellos a veces (Monica, 6-oct-2026).'}])
elif not ESCRIBIR:
    SECO.append('INSERT contratas x1: EFFIC (otra, AGENTE REHABILITADOR)')

# ================================================================= 1. PRODUCCION (20)
rellenar('aab41', 'ÁLVAREZ ABELLÁN 41', 'alvarezabellan41', {'fecha_apertura': '2025-07-28',
    'origen_notas': 'Fecha de llegada: 07/2025. Contacta: Andrea Diaz Serrano (Elecnor, oficina tecnica). Tipo de obra: SATE + CUBIERTA (6 vecinos; el importe no viene en el correo). ' + ELEC + ' Barrio/distrito: Carabanchel. '
                    'Comercial interno: DANIEL. HE enviada 18/08/2025.'},
    ('sate', 'cubierta', 'df', 'css', 'cee', 'iee', 'lee', 'subvenciones'), n=fijar('alvarezabellan41', 2025), trae_pu=PU['andrea'])
rellenar('alz11', 'ALZINA 11', 'alzina11', {'fecha_apertura': '2026-07-21',
    'origen_notas': 'Fecha de llegada: 07/2026. Contacta: Paz Terradillos (CIUDADELA; "609 05 89 53, llamar SOLO a este telefono"; 919 01 50 88). Tipo de obra: ENVOLVENTE TERMICA (SATE y cubierta) y, en sept-2026, tambien ACCESIBILIDAD + SUBV '
                    '(elevador con derribo de escaleras; 4 paradas, 6 viviendas; aprox. 120.000). En la ficha: comercial interno CARLOS.' + EXT},
    ('sate', 'cubierta', 'accesibilidad', 'subvenciones'),
    n=partir(partir(fijar('alzina11', 2026), 0, '---------- Forwarded', '2026-09-08'), 1, '---------- Forwarded', '2026-09-09', vez=2),
    trae_pu=PU['paz'], captador=ALVARO, lleva=ALVARO)
rellenar('alz3', 'ALZINA 3', 'alzina3', {'fecha_apertura': '2025-11-03', 'referencia_catastral': '6092911VK3669A',
    'origen_notas': 'Fecha de llegada: 11/2025. Contacta: la administradora, Paz (CIUDADELA, 609 058 953, mpazterradillos@gmail.com). Tipo de obra: ASC + SUBV ("muy interesados, aprobado hace un ano el ascensor"; elevador con foso '
                    'hiperreducido, tipo 4 de Jean). Tecnico: Alejandro Bello. Fecha encargo: 05/05/2026. Ano 1962. Por ECU (ACTECU). PEM 192.982,99. Superficie 87,75. "Leer bien la ficha al comenzar proyecto". '
                    'Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('ascensor', 'subvenciones'),
    n=partir(partir(fijar('alzina3', 2025), 2, 'El lun, 25 may 2026', '2026-05-25'), 3, '---------- Forwarded', '2026-05-29'),
    comunidad={'iban': 'ES63 2100 6352 3213 0042 5831'}, presi=('RAÚL DE ANDRÉS BAUTISTA', 'presidente', '641 34 51 72', '50186937V', 'deandres100@gmail.com'),
    trae_pu=PU['paz'], captador=CARLOS, lleva=ALVARO)
rellenar('ama34', 'AMANIEL 34', 'amaniel34', {'fecha_apertura': '2025-06-17',
    'origen_notas': 'Fecha de llegada: 06/2025. Contacta: el administrador, Miguel A. Delgado (FINCAS ORTEGA DELGADO, "es el nuevo de Huerta del Bayo 13"). Tipo de obra: SUBVENCION de un PROYECTO EXTERNO de PLATAFORMA ("INFINITAS A EXITO"). '
                    'Fecha encargo: 17/06/2025. En 2026 se prepara la subvencion del Ayuntamiento "ADAPTA 2026" (adaptacion para personas con discapacidad; hay una vecina del 5oB). Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('subvenciones',), presi=('FERNANDO ROYO PORTERO', 'presidente', '618549303', '05069040R'), trae_pu=PU['miguel_od'], captador=CARLOS, lleva=ALVARO)
ANGULO = persona_nueva('Andrés', 'Angulo', None, '660 050 873', 'andres.angulo@inmape.com', contrata=INMAPE)
rellenar('amor4', 'AMOR DE DIOS 4', 'amordedios4ysanta maria8', {'fecha_apertura': '2026-03-13',
    'origen_notas': 'Fecha de llegada: 03/2026. Contacta: Andres Angulo (INMAPE). Tipo de obra: INFORME TECNICO DE IMPOSIBILIDAD de modificar foso y huida (huida reducida; 2 ascensores de una comunidad: Amor de Dios 4, RAE 88573, y '
                    'Santa Maria 8, RAE 88572). Lo pide Industria. Va en el mismo correo que Carondelet 16 - chalet 23 (foso reducido): ver ese correo completo en su carpeta. Comercial interno: DANIEL. HE enviada a Monica para ok 19-03-2026.'},
    ('informe_tecnico',), n=fijar('amordedios4ysanta maria8', 2026, ('2026-03-13', 'Correo de Andres Angulo (Inmape) del 13 de marzo de 2026.')), trae_pu=ANGULO)
ANTON = persona_nueva('José Javier', 'Antón Fernández', None, '915 43 10 48 / 679 72 98 95', 'pepe.anton@schindler.com', contrata=SCHINDLER)
rellenar('amp36', 'AMPARO 36', 'amparo36', {'fecha_apertura': '2026-02-01',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia desconocido). Contacta: Jose Javier Anton (Schindler). Tipo de obra: ASCENSOR. Hay escaneo 3D. La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + EXT},
    ('ascensor',), trae_pu=ANTON, captador=ALVARO, lleva=ALVARO)
JUSTO = persona_nueva('Justo', 'Rojo Pérez', None, '652 819 256', 'rojoperez@icam.es', empresa=ROJOJUSDI, notas_='Del despacho de Diego Rojo Olalla. El 652 819 256 es su telefono personal (lo dice el).')
rellenar('amp20', 'AMPOSTA 20', 'amposta20', {'fecha_apertura': '2025-09-29',
    'origen_notas': 'Fecha de llegada: 10/2025 (el correo es del 29/09/2025). Contacta: Justo Rojo Perez, del despacho de Diego Rojo Olalla (ROJO JUSDI; Alba Pedraja, 913 750 530 / 625 145 522). Tipo de obra: IEE (20 propiedades). '
                    'Llega en una lista de 14 comunidades de Rojo Jusdi que tienen que pasar la IEE antes del 31/12/2025. Comercial interno: DANIEL. HE enviada 24/10/2025 al precio que indico Daniel.'},
    ('iee',), n=fijar('amposta20', 2025, ('2025-09-29', 'Correo de Justo Rojo del 29 de septiembre de 2025.')), adm=PU['alba'], trae_pu=JUSTO)
rellenar('ang35', 'ANGEL MUGICA, 35', 'angelmugica35', {'fecha_apertura': '2026-02-01',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia desconocido). Contacta: ARRIALSI (info@arrialsi.com). Tipo de obra: ASC + SUBV. La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + EXT +
                    ' El SATE con proyecto externo de 2021 (Elecnor) es OTRA oportunidad: va a la clon (Monica, 6-oct-2026).'},
    ('ascensor', 'subvenciones'), trae_pu=PU['silvia'], captador=ALVARO, lleva=ALVARO)
rellenar('ans54', 'ANSAR 54', 'ansar54', {'fecha_apertura': '2026-03-09',
    'origen_notas': 'Fecha de llegada: 03/2026. Contacta: Jose Luis Perez (jose10861@gmail.com; el mismo que aparece de administrador en Ballesta 12). Tipo de obra: QUITAR AMIANTO EN CUBIERTA + SATE. La ficha no tiene notas. '
                    'En la ficha: comercial interno CARLOS.' + EXT},
    ('cubierta', 'sate'), presi=('JOSE LUIS PEREZ', 'presidente', None, None, 'jose10861@gmail.com'), trae_pc='presi', captador=ALVARO, lleva=ALVARO)
rellenar('ans62', 'ANSAR 62', 'ansar62', {'fecha_apertura': '2026-06-23',
    'origen_notas': 'Fecha de llegada: 06/2026. Contacta: Grupo Trebol. Tipo de obra: INSTALACION ASCENSOR. Hay escaneo 3D. La ficha no tiene notas. Comercial interno: ALVARO.'},
    ('ascensor',), adm=PU['trebol'], trae_pu=PU['trebol'], captador=ALVARO, lleva=ALVARO)
rellenar('aar6', 'ANTONIO ARIAS 6', 'antonioarias6', {'fecha_apertura': '2025-09-22',
    'origen_notas': 'Fecha de llegada: 09/2025. Contacta: EFFIC (agente rehabilitador: coordina a las contratas de una rehabilitacion). Hay fotos de viabilidad. La ficha no dice el tipo de obra ni tiene notas. '
                    'Comercial interno: CARLOS.' + CAPTO_CARLOS},
    (), captador=CARLOS, lleva=ALVARO)
rellenar('aly13', 'ANTONIO DE LEYVA 13', 'antoniodeleyva13', {'fecha_apertura': '2026-09-01',
    'origen_notas': 'Fecha de llegada: 09/2026 (dia desconocido). Quien la trae: "a la espera de que Alvaro confirme". Tipo de obra: SATE + SUBV. Fecha encargo: 01/10/2026. Administracion: ADMINISTRACIONES PRIETO (Jacinto Verdaguer 8; '
                    'Jesus Torres; 914 69 25 41; admprieto@hotmail.com) - NO esta en la agenda. Presidente: Andres Botero Monsalve (anfe.botero@gmail.com). Comercial interno: ALVARO.'},
    ('sate', 'subvenciones'), comunidad={'iban': 'ES90 0081 2353 1100 0115 1322', 'cif_comunidad': 'H78185386'},
    presi=('ANDRES BOTERO MONSALVE', 'presidente', None, None, 'anfe.botero@gmail.com'), captador=ALVARO, lleva=ALVARO)
KIM = persona_nueva('Kimberlly', 'González', None, None, None, empresa=DELBRIO, notas_='Del Brio y Blanco: firma el correo de Antonio Duran Tovar 2 (mar-2026) desde la cuenta de Lesmes.')
rellenar('adt2', 'ANTONIO DURAN TOVAR 2', 'antoniodurantovar2', {'fecha_apertura': '2026-03-11',
    'origen_notas': 'Fecha de llegada: 03/2026. Contacta: Kimberlly Gonzalez (DEL BRIO Y BLANCO, desde lesmes@delbrioyblanco.es; en la ficha tambien "Javier"). Tipo de obra: ASC. Contacto para la visita: Hassan Elmorabet, 630 559 105. '
                    'Hay escaneo 3D. Comercial interno: ALVARO.'},
    ('ascensor',), n=fijar('antoniodurantovar2', 2026, ('2026-03-11', 'Correo de Del Brio del 11 de marzo de 2026.')), adm=KIM, trae_pu=KIM, captador=ALVARO, lleva=ALVARO)
c, _ = info('ANTONIO DURAN TOVAR 2')
HASSAN = pc(c['id'], 'HASSAN ELMORABET', 'vecino', '630559105', None, 'hassan.elmorabet@hotmail.com', 'Contacto para la visita (correo de Del Brio, mar-2026).')
act('oportunidades?id=eq.' + OPP['adt2'][1], {'persona_comunidad_id': HASSAN})
rellenar('agr7', 'ANTONIO GRILO 7', 'antoniogrilo7', {'fecha_apertura': '2026-06-05',
    'origen_notas': 'Fecha de llegada: 06/2026. Contacta: Isaac Pizarroso (GESTIN). Tipo de obra: REHABILITACION INTEGRAL (fachadas...) con mejora del aislamiento termico susceptible de subvencion: proyecto, DF, CSS y gestion de subvenciones. '
                    'Presidenta: Sofia Cano. Catastro no refleja bien el edificio (medir con mapas). Comercial interno: DANIEL. HE enviada 15-06-26.'},
    ('sate', 'df', 'css', 'subvenciones'), n=fijar('antoniogrilo7', 2026, ('2026-06-05', 'Correo de Isaac Pizarroso del 5 de junio de 2026.')),
    presi=('Sofía Cano', 'presidente', '626 025 499', None, 'chofacano@yahoo.es'), adm=PU['isaac'], trae_pu=PU['isaac'])
rellenar('alp137', 'ANTONIO LOPEZ 137', 'antoniolopez137', {'fecha_apertura': '2025-09-04',
    'origen_notas': 'Fecha de llegada: 09/2025. Contacta: Sonia Guillen (LUXOR ESPACIOS). Tipo de obra: "RH ORDEN EJECUCION" (rehabilitacion por orden de ejecucion). Presidente: Carlos Vasques (633 19 61 20, Cdvd15@gmail.com). '
                    '"La CP NO quiere que entre el administrador." Comercial interno: CARLOS.' + CAPTO_CARLOS + ' PERDIDA POR PRECIO el 6/11/2025.'},
    (), n=fijar('antoniolopez137', 2025, ('2025-11-06', 'Sin fecha delante; la fecha va dentro ("Perdida por precio 6/11/2025").')),
    presi=('Carlos Vasques', 'presidente', '633196120', None, 'Cdvd15@gmail.com'), trae_pu=PU['sonia'], captador=CARLOS, lleva=ALVARO)
# cerrada como PERDIDA (Monica: "es genial, asi testamos eso ademas")
if ESCRIBIR:
    oid = OPP['alp137'][1]
    if not b.leer('motivo_cierre_oportunidad?select=id&oportunidad_id=eq.' + oid):
        b.insertar('motivo_cierre_oportunidad', [{'oportunidad_id': oid, 'resultado_final': 'perdido', 'motivo_perdido': 'precio', 'fecha_cierre': '2025-11-06',
                                                  'notas': 'Perdida por precio (ficha de Dropbox). Cerrada en el barrido de Madrid (Monica, 6-oct-2026).'}])
        b.actualizar('oportunidades?id=eq.' + oid, {'estado': 'cerrada'})
else:
    SECO.append('INSERT motivo_cierre_oportunidad x1: Antonio Lopez 137 perdido (precio) 2025-11-06 + UPDATE oportunidades estado=cerrada')
MATESANZ = persona_nueva('Carmen', 'Matesanz', None, None, None, empresa=JAGRA, notas_='Jagra Fincas (info@jagrafincas.es): sustituye a Jose Gonzalez en Antonio Moreno 18 (2026).')
rellenar('amo18', 'ANTONIO MORENO 18', 'antoniomoreno18', {'fecha_apertura': '2026-02-01',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia desconocido). Contacta: Jose Gonzalez (JAGRA FINCAS), tachado en la ficha: ahora Carmen Matesanz (info@jagrafincas.es). Tipo de obra: SUBVENCION EXTERNA + CAEs. '
                    'Tecnico: Jacob Hernandez. Fecha encargo: 17/03/2026. Presidenta: Aranzazu, 685 13 00 22. Comercial interno: ALVARO.'},
    ('subvenciones', 'caes'), comunidad={'iban': 'ES48 0128 0034 1301 0006 5433'}, huecos=H(('HISTORIA', '~~JOSE GONZALEZ~~ Carmen Matesanz (Jagra Fincas); ~~joseglez@jagra-fincas.es~~ -> jgonzalez@jagrafincas.es')),
    trae_pu=PU['jgonzalez'], captador=ALVARO, lleva=ALVARO, subvencion=[('2026-06-11', subv('antoniomoreno18'))])
rellenar('apr25', 'ANTONIO PRIETO 25', 'antonioprieto25', {'fecha_apertura': '2025-11-28',
    'origen_notas': 'Fecha de llegada: 11/2025. Contacta: Paz (GESMADRID, administradora). Tipo de obra: SATE (~~ascensor~~: se hace escaneo para ver en el futuro el ascensor). Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('sate',), n=fijar('antonioprieto25', 2025), adm=PU['paz_gesmadrid'], trae_pu=PU['paz_gesmadrid'], captador=CARLOS, lleva=ALVARO)
rellenar('asa40', 'ANTONIO SANCHA 40', 'antoniosancha40', {'fecha_apertura': '2026-01-26',
    'origen_notas': 'Fecha de llegada: 01/2026. Contacta: Agantangelo Soler, vecino (690 086 645). Tipo de obra: SUBVENCIONES Y SATE EN PLANTA BAJA: hoja solo informativa, con las bondades del SATE y el coste de obra, sin coste de proyecto. '
                    'Comercial interno: ALVARO. HE entregada a Alvaro el 26-01-2026.'},
    ('sate', 'subvenciones'), n=fijar('antoniosancha40', 2026, ('2026-01-26', 'Sin fecha delante; instrucciones de Daniel para la hoja del 26-01-2026.')),
    presi=('AGANTANGELO SOLER', 'vecino', '690086645', None, None, 'Vecino; trajo la oportunidad.'), trae_pc='presi', captador=ALVARO, lleva=ALVARO)
rellenar('adj68', 'ARCOS DE JALON 68', 'arcosdejalon68', {'fecha_apertura': '2024-07-18', 'referencia_catastral': '7750409VK4775B',
    'origen_notas': 'Fecha de llegada: 07/2024. Contacta: Oscar Fernandez (CEGA ASCENSORES; el de CEGA, hoy en FGR). Tipo de obra: ASCENSOR (por el ojo de la escalera) + SUBV contratada en enero 2025. Tecnico: Jhonatan. Fecha encargo: 27/11/2024. '
                    'Jefe de obra: Boris Cespedes (CEGA). Ano 1974. Administracion: a traves de CEGA, Administracion de Fincas Ramirez (Fernando, 915 289 820, femar_8596@cafmadrid.es). Contratista: Ascensores CEGA (682 281 318 / 91 679 30 92; '
                    'administracion@ascensorescega.com). DR por ECU (ACTECU), presentada 26-02-2025. PEM 74.411,76. Visado TL/003135/2025; CFO TL/004644/2026 (visado y enviado abr-2026): obra terminada; queda abierta. Comercial: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('arcosdejalon68', 2024), presi=('FELIPE PASTOR', 'presidente', None, '51612868V'), trae_pu=PU['oscar_cega'])
INAKI = persona_nueva('Iñaki', 'Sánchez', None, None, 'ignacio.sanchez@fainascensores.com', contrata=FAIN)
rellenar('arg7', 'ARGÜESO 7', 'argüeso7', {'fecha_apertura': '2026-04-10',
    'origen_notas': 'Fecha de llegada: 04/2026. Contacta: Iñaki (Ignacio) Sanchez (FAIN). Tipo de obra: ACCESIBILIDAD en planta baja y una parada mas en el sotano. Comercial interno: DANIEL. HE a Monica para ok 10-04-2026, enviada 14-04-2026.'},
    ('accesibilidad', 'anadir_parada'), n=fijar('argüeso7', 2026, ('2026-04-10', 'Sin fecha delante; instrucciones de Daniel para la HE del 10-04-2026.')), trae_pu=INAKI)

# arreglos: presidentes grabados con barras en el nombre
for mal, bien, tel in (('RAÚL DE ANDRÉS BAUTISTA /', 'RAÚL DE ANDRÉS BAUTISTA', '641 34 51 72'), ('ARANZAZU //', 'ARANZAZU', '685 13 00 22')):
    d = b.leer('personas_comunidad?select=id,telefono&nombre=eq.' + quote(mal))
    if d: act('personas_comunidad?id=eq.' + d[0]['id'], {'nombre': bien, 'telefono': d[0]['telefono'] or tel})

# ================================================================= 2. AGENDA Y ORGANISMOS
persona_nueva('Nicolás', 'Mediavilla Ferruz', 'presidente', None, None, contrata=FAIN, notas_='Presidente de FAIN. Encargos privados suyos y de su empresa Ostalazar SL (Andarrios 5 y 9, local Antonio Casero 16).')
persona_nueva('Elena', 'Aranguez Rodríguez', 'secretaria', '914 093 101 / 627 204 303', 'elena.aranguez@fainascensores.com', contrata=FAIN,
              notas_='Secretaria de Nicolas Mediavilla en FAIN; sustituye a Mayte Cesteros (tachada en Andarrios 9, dic-2023).')
persona_nueva('Roberto', 'España', 'gestor de fincas', '91 759 39 09', 'roberto@antonaya.com', empresa=ANTONAYA)
CARA = junta(11, 'Carabanchel')
area(CARA, 'Negociado de licencias', '91 588 71 15 / 91 588 71 16', 'Con cita previa; solo atienden los miercoles, 91 480 35 35 (dato de 2017, Angel Ripoll 52).')

# ================================================================= 3. CLON
cl = lambda c, a, s=None: J(fijar(c, a, s))
REVS = [
    ('amadeogomez45', '2022-05-01', 'JAVIER PARRA (SCHINDLER)', None, None,
     'AMADEO GOMEZ 45 MADRID. Fecha: 05/2022. Distrito 08 - Fuencarral-El Pardo (Peñagrande). En la ficha: "OJO QUE LO ESTOY VIENDO CON PARAMIO FAIN, YA LES HE DICHO QUE SOLO LO HAGO CON FAIN". Nada mas.'),
    ('amparo45', '2024-06-21', 'FERMIN ASENSIO, presidente; luego Oscar Lopez (FAIN)', None, None,
     'AMPARO 45 MADRID. Fecha: 06/2024. Tipo de obra: 2 ELEVADORES. Distrito Centro. Presidente: Fermin Asensio, 699 762 201, fermin.asensio@yahoo.es. Administrador: ?, 655 806 625 ("creo que es ALDA GESTION, 91 530 85 25").\n\n' + cl('amparo45', 2024)),
    ('ampelido25', '2024-05-14', 'JAVIER (GRUPO TREBOL), administrador', None, None,
     'AMPELIDO 25 MADRID. Fecha: 05/2024. Tipo de obra: ASCENSOR exterior con pasarelas (invasion de espacio publico). Distrito Latina. Administracion: Grupo Trebol (Javier; Maribel; 91 526 54 90 / 699 086 641; trebol.fincas@gmail.com). '
     'Contacto: Delia, 663 344 411. HE y subvenciones enviadas 03/04/2025; informe de viabilidad 07/04/2025.\n\n' + cl('ampelido25', 2024)),
    ('andaluces24', '2024-05-09', 'JAVIER GARCIA (DEL BRIO Y BLANCO), administrador', None, None,
     'ANDALUCES 24 MADRID. Fecha: 05/2024. Tipo de obra: HUMEDADES -> SATE (y cubierta). Distrito Vallecas. Administracion: Del Brio y Blanco (Javier Garcia, 91 477 41 91 / 91 478 69 11, javier@delbrioyblanco.es). '
     'Presidenta: Raquel Plaza (12 D), 664 317 493.\n\n' + cl('andaluces24', 2024)),
    ('Andarrios5', '2022-11-07', 'NICOLAS MEDIAVILLA (presidente de FAIN)', None, '6487232VK4768G0001WS',
     'CALLE ANDARRIOS 5 MADRID. Encargo PRIVADO de Nicolas Mediavilla Ferruz (presidente de FAIN; 50262931L). Fecha: 11/2022. Tipo de obra: OBRAS DE VALLADO Y EN ZONA EXTERIOR, por ECU. Distrito 16 - Hortaleza (Piovera). '
     'Tecnico: Susana. Ano 1960. Secretaria: Mayte Cesteros (914 093 101 / 627 204 303, mayte.cesteros@fainascensores.com).\n\n' + cl('Andarrios5/FICHA DATOS TECNICOS.docx', 2022)),
    ('Andarrios9', '2022-06-01', 'NICOLAS MEDIAVILLA (presidente de FAIN) / OSTALAZAR SL', 'B28111516', '6487231VK4768G 0001',
     'CALLE ANDARRIOS 9 MADRID. Encargo PRIVADO de OSTALAZAR SL (B28111516; C/ Doctor Esquerdo 57; administrador unico Nicolas Mediavilla Ferruz, presidente de FAIN). Fecha: 06/2022. Tipo de obra: DEMOLICION DE VIVIENDA UNIFAMILIAR AISLADA '
     '+ dar de baja en el ayuntamiento el paso de carruajes y el edificio (subcarpetas "1 DEMOLICION" y "2 DAR DE BAJA..."). Distrito 16 - Hortaleza (Piovera). Tecnico: Enrique. PEM 25.913,64; superficie 666,68. Expediente 118/2022/02895. '
     'Declaracion responsable por ACTECU (EXPACT22014R). Cuenta ES69 2100 8647 3102 0004 2641. Secretaria: Mayte Cesteros. El proyecto de VALLAS de la parcela (dic-2023) es otra fila.\n\n'
     + cl('Andarrios9/1 DEMOLICION/FICHA DATOS TECNICOS.docx', 2022)),
    ('Andarrios9 (vallas parcela)', '2023-12-01', 'NICOLAS MEDIAVILLA (presidente de FAIN) / OSTALAZAR SL', 'B28111516', '6487231VK4768G 0001',
     'CALLE ANDARRIOS 9 MADRID: PROYECTO DE VALLAS DE LA PARCELA (subcarpeta "3 PROYECTO VALLAS PARCELA"). Encargo PRIVADO de Ostalazar SL (Nicolas Mediavilla, presidente de FAIN). Fecha: 12/2023. Tecnico: Susana. PEM 21.987,14; 47 m2. '
     'Secretaria: ~~Mayte Cesteros~~ -> Elena Aranguez Rodriguez (elena.aranguez@fainascensores.com). Encargo distinto en el tiempo de la demolicion de 2022.'),
    ('andevalo38', '2024-05-14', 'CARMEN GARCIA (DEL BRIO Y BLANCO), administradora', None, None,
     'ANDEVALO 38 MADRID. Fecha: 05/2024. Tipo de obra: ASCENSOR. Distrito Puente de Vallecas. Contacto: Julian, 659 782 877. Presentado el 3D a los vecinos: recaudaran derrama para encargarlo en un ano.\n\n' + cl('andevalo38', 2024)),
    ('andorra91', '2024-11-08', 'ROBERTO ESPAÑA (AGA ANTONAYA), gestor de fincas', None, None,
     'ANDORRA 91 MADRID. Fecha: 11/2024. Tipo de obra: SATE + SUBVENCION (64 viviendas, desperfectos en fachada): solo proyecto (sin DF ni CSS) + subvencion a exito. Distrito Hortaleza. Contacto: Abel, 616 227 382. '
     'Antonaya: Calle de Pegaso 32 local; 91 759 39 09; Raquel Maestro en copia.\n\n' + cl('andorra91', 2024)),
    ('angelmugica35 (SATE proyecto externo)', '2021-08-01', '~~ANA ENCINAS (ELECNOR)~~', None, None,
     'CALLE ANGEL MUGICA 35 MADRID: SATE con PROYECTO EXTERNO (subcarpeta "SATE - PROYECTO EXTERNO"). Fecha: 08/2021. Distrito 08 - Fuencarral-El Pardo (Valverde). En la ficha, Elecnor y Ana Encinas estan tachados. '
     'Ficha sin mas datos. Es una oportunidad distinta del ascensor de 2026, que esta en produccion (Monica, 6-oct-2026).'),
    ('angelripoll52', '2017-12-26', 'ANTONIO MIRA (ANYLOR)', 'H79855920', '7907819VK3770F',
     'C/ ANGEL RIPOLL 52 MADRID. Fecha: 12/2017 (presupuesto firmado). Distrito 11 - Carabanchel (Puerta Bonita). Presidente: Carlos Alarcon Torres (70551757Q); Antonio, 656 524 334. Junta de Carabanchel: negociado de licencias 91 588 71 15 / 71 16; '
     'cita previa, solo los miercoles, 91 480 35 35. PEM 78.529; residuos 300. Expediente 111/2018/01330. NZ4. Fachada 20,40; superficie 49,08 m2. Proyecto hecho.'),
    ('anguita17', '2024-07-12', 'JAVIER VELASCO (ELECNOR)', None, None,
     'ANGUITA 17 MADRID. Fecha: 07/2024. Tipo de obra: 2 ASCENSORES (doble embarque a 180). Distrito Barajas. Visitado con Ana Encinas y Javier Velasco.'),
    ('anicetomarinas112', '2023-01-02', 'JOSE GORDILLO, con RAUL (ELECNOR)', None, None,
     'ANICETO MARINAS 112 MADRID. Fecha: 01/2023. Tipo de obra: SATE + CALDERA. Distrito 09 - Moncloa-Aravaca (Casa de Campo). Hay fotos de la caldera. Ficha sin notas.'),
    ('antoniacalvo11', '2024-11-06', 'GRUPO TREBOL', None, None,
     'ANTONIA CALVO 11 MADRID. Fecha: 11/2024. Tipo de obra: CUBIERTA DE PANEL SANDWICH: piden presupuesto para tramitar la licencia (Impersed, 20.010 + IVA). Distrito Latina.'),
    ('antoniocasero16', '2020-01-08', 'NICOLAS MEDIAVILLA (presidente de FAIN)', None, None,
     'LOCAL ANTONIO CASERO 16 MADRID. Fecha: 01/2020. "Viene de Nicolas Mediavilla". Hay nota simple y escrituras. Ficha sin mas datos.'),
    ('antoniocumella3-5-7-9', '2023-09-11', 'ADOLFO, administrador', None, None,
     'ANTONIO CUMELLA 3-5-7-9 MADRID. Fecha: 10/2023. Tipo de obra: SATE Y FOTOVOLTAICA. Distrito 14 - Moratalaz (Marroquina). 11/09/2023: preparar presupuesto con Elite.'),
    ('antoniogrilo12', '2025-02-19', 'ISAAC PIZARROSO (GESTIN), administrador', None, None,
     'ANTONIO GRILO 12 MADRID. Fecha: 02/2025. Tipo de obra: ASCENSOR EN ESCALERA EXTERIOR (no en la interior de corrala). Distrito Centro. Presidente: Antonio Hernandez (690 178 637; antonio.hernandez@tcu.es); vecino de la buhardilla: '
     'Mariano Venancio (679 892 007, mvenanciot@gmail.com). Proteccion: BIC Conjunto Historico Villa de Madrid (Cerca y Arrabal de Felipe II), zona de amortiguamiento del Paisaje de la Luz (UNESCO), zona arqueologica; '
     'catalogo 00313, proteccion estructural. HE enviadas 07-05-2025.\n\n' + cl('antoniogrilo12', 2025)),
    ('antoniopirala9', '2024-07-09', 'ABARCA ANALISIS Y ESTRATEGIA (administrador)', 'E80180235', None,
     'ANTONIO PIRALA 9 MADRID. Fecha: 07/2024. Tipo de obra: SUBVENCION EXTERNA. Distrito Ciudad Lineal. Propiedad: Herederos de Julia Almorox C.B. (E80180235). Administracion: Abarca Analisis y Estrategia, S.L. (C/ Marroquina 12 posterior; '
     '91 301 69 67; j.garcia@asesoria-abarca.es). 09/07/2024: presupuesto enviado para subvencion externa.'),
    ('apostolsantiago25', '2023-09-06', 'ANA ENCINAS (ELECNOR)', None, None,
     'APOSTOL SANTIAGO 25 MADRID. Fecha: 10/2023. Tipo de obra: ASCENSOR. Distrito 15 - Ciudad Lineal (Ventas). 06/09/2023: proyecto completo; pasar presupuesto del PEM propuesto por Elecnor.'),
    ('apostolsantiago49', '2016-10-10', 'ANDRES (ENGWE)', 'H79832499', '4556801VK4745F',
     'C/ APOSTOL SANTIAGO 49 MADRID. Fecha: 01/2017 (primeros ficheros, oct-2016). Distrito 15 - Ciudad Lineal (Ventas). Presidente: Juan Jose Martin Martinez (50795449H). PEM 52.624; residuos 322,36. NZ4. Superficie 55 m2. Proyecto hecho.'),
    ('arcosdejalon48', '2025-01-15', 'OSCAR FERNANDEZ (CEGA)', None, None,
     'ARCOS DE JALON 48 MADRID. Fecha: 01/2025. Tipo de obra: ASCENSOR (doble embarque 90, sin invasion de espacio publico). Distrito San Blas-Canillejas. Escaneado con iPhone por Daniel; 3D hecho 22/01/2025.\n\n' + cl('arcosdejalon48', 2025)),
    ('arcosdejalon62', '2025-01-15', 'OSCAR FERNANDEZ (CEGA)', None, None,
     'ARCOS DE JALON 62 MADRID. Fecha: 01/2025. Tipo de obra: ASCENSOR. Viable: igual que el proyecto del 68, ya hecho con CEGA. Escaneado con iPhone.'),
    ('arganda4', '2025-05-07', 'ANDREA DIAZ SERRANO (ELECNOR)', None, None,
     'ARGANDA 4 MADRID. Fecha: 05/2025. Tipo de obra: SATE. Distrito Arganzuela. 07-05-2025: Monica envia la hoja de encargo para SATE.')]
for carp, fecha, trajo, cif, ref, t in REVS:
    ruta = {'Andarrios9 (vallas parcela)': R('Andarrios9\\3 PROYECTO VALLAS PARCELA'), 'angelmugica35 (SATE proyecto externo)': R('angelmugica35\\SATE - PROYECTO EXTERNO')}.get(carp)
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, ruta=ruta)
for carp, fecha, trajo, t in [
        ('anis10', '2017-01-27', 'LUIS MIGUEL NUNES (THYSSEN)', 'C/ ANIS 10 MADRID. Fecha: 01/2017. Distrito 09 - Moncloa-Aravaca (Aravaca). Solo la propuesta de Thyssen: torre de ladrillo amarillo, pasarela cerrada en cristal a la 3a parada, '
         'quitar el lucernario, foso de 1.000 mm, valorar aumento de potencia.'),
        ('antoniovelascozazo29', '2017-03-18', 'PEDRO ARANDA (THYSSEN)', 'Calle ANTONIO VELASCO ZAZO 29 MADRID. Fecha: 03/2017. Distrito 12 - Usera (Pradolongo). Ficha vacia; hay croquis.'),
        ('arapiles17', '2016-06-04', 'LUIS MIGUEL NUNES (THYSSEN)', 'Calle ARAPILES 17 MADRID. Fecha: 06/2016. Distrito 07 - Chamberi (Arapiles). "Lo estoy mirando con THYSSEN": 2 ascensores en garaje.'),
        ('argos35', '2018-09-27', 'RAUL (ANYLOR)', 'Calle ARGOS 35 MADRID. Fecha: 09/2018. Distrito 20 - San Blas-Canillejas (Simancas). Ficha vacia; hay croquis.'),
        ('ampostas34', '2022-07-18', None, 'AMPOSTA 34 MADRID (carpeta "ampostas34"). Carpeta SIN ficha de datos: planos de deflexiones de obra nueva (jul-2022).'),
        ('angel8', '2022-02-07', None, 'ANGEL 8 MADRID. Carpeta SIN ficha de datos: planos de deflexiones terminados (feb-2022).'),
        ('antoniarodriguezsacristan31', '2015-10-30', None, 'ANTONIA RODRIGUEZ SACRISTAN 31 MADRID. Carpeta SIN ficha de datos: planos (2015-2016).'),
        ('aravaca24', '2022-03-21', None, 'CL ARAVACA 24 MADRID (3 escaleras). Carpeta SIN ficha de datos: un PDF (mar-2022).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 4. MANIAS
mania('Si el ascensor invade espacio publico, la licencia es ORDINARIA y se pide directamente a los servicios urbanisticos del ayuntamiento (no por ECU); tarda unos 20 meses.',
      'Ayuntamiento de Madrid (servicios urbanisticos)', '2024-05-18', 'ampelido25', cita=dict(fijar('ampelido25', 2024))['2024-05-18'])
mania('Negociado de licencias de Carabanchel: con cita previa y solo atienden los miercoles (91 480 35 35).', 'Junta Municipal de Distrito de Carabanchel (negociado de licencias)', '2017-12-26', 'angelripoll52',
      cita='Negociado de Licencias 91 588 71 15 y 91 588 71 16 / Se pide cita previa. Sólo se atiende los miércoles 91 480 35 35')
mania('Si la solucion afecta a una cubierta protegida, la ECU pide planos e informe de Patrimonio; cambiando la solucion para no tocarla, deja de pedirlos.', 'ECU (ACTECU)', '2025-02-17', 'arcosdejalon68',
      clave='adj68', trozo='cubierta protegida')

resumen()
