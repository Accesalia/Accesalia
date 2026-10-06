# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda E (eduardourosa7 .. ezequielsolana97, 56 carpetas). 6-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de
from trocear2 import trocear2

SMFINCAS = 'd697e2cb-fadd-4e96-b68d-7c7af6843de3'; DELBRIO = '46b4fe1f-0534-434f-ae7c-cc098fde82cd'
CEGA = '32547b98-cb74-4c94-83fe-a156ffee8d95'; FAIN = 'fa005671-8d23-45a6-8172-0ea7ca8c8950'; NVR = '93dc1e47-e872-4ae0-a9c3-0becb9046569'
MORATALAZ = 'bdf43e64-c65d-452e-9890-6e5d6b9df528'; CARABANCHEL = '5b552d60-056c-42cf-a170-359fb05c7ff5'
PU.update(paramio='900b6af9-4a5c-4e31-8c09-322357ee402c', alemany='feb70e2c-3f94-4fd2-8515-f590d6cd67c4', escano='c73d526d-637c-415d-be44-8cde0611d14b',
          alba='61038fa7-f2fa-4dfa-a169-dae52465513c', justo='d3e649fb-351f-4ed1-bff1-2430a532ff57', oscar_cega='86273a6d-d0f1-4e29-874e-4aba61764673',
          dsanchez='cadc2119-99c7-4a97-a474-75d420deaa81', olivares='fe2ea8b4-9be7-42b8-b64f-d644fa8198b1', ivan='ed4a4c84-e7c9-41a9-82b0-f0c856c3d3ec',
          lpardo='6e27f72e-b454-4c8b-8e67-780a24476fce', gmoya='5a588515-9c02-4058-8e31-7e51dec4737f', yara='4f1ed255-98db-468a-a946-7f033b84fddd',
          jcmartinez='726a514f-dfe4-426c-a8fc-cfb433ccd3b2', cerezo='7f4218f5-8b8e-45a0-9cba-b2880ccfc4c3', rey='77db7824-2d93-4727-a8d4-10e7c5c32bae',
          olga='ef1332fc-cd83-4b25-9efd-ddca69691dd0', jasalamanca='01d0c4b9-17fe-4f25-a70c-0cb0d045bf45', elena_lys='43838908-bd76-43ce-a7c9-ec2d887a2e09',
          barrionuevo='2a638300-3df0-446c-9d5c-bf08209154e5', vanesa='05cda534-6907-43b0-b674-53cbe143a278', felisa='7346d7ca-d60c-40bb-b509-ff9f48b64d77')
SINF_JUSTO = ('2025-09-29', 'Correo de Justo Rojo del 29 de septiembre de 2025.')
IEE_ROJO = ('Fecha de llegada: 10/2025 (el correo es del 29/09/2025). Contacta: Justo Rojo Perez, del despacho de Diego Rojo (ROJO JUSDI; Alba Pedraja). Tipo de obra: IEE (%s propiedades), '
            'de la lista de 14 comunidades de Rojo Jusdi que debian pasar la IEE antes del 31/12/2025. Comercial interno: DANIEL. HE enviada 24/10/2025 al precio que indico Daniel.')


def notas_a_mano(c, anio, cambios):
    """notas troceadas + arreglos: cambios = {i: (fecha, motivo)}; motivo None = solo la fecha."""
    n = []
    for i, (f, t) in enumerate(_notas_de(c, anio)):
        if i in cambios:
            f = cambios[i][0]; t = t + ('\n\n(' + cambios[i][1] + ')' if cambios[i][1] else '')
        n.append((f, t))
    assert all(f for f, t in n), c
    return n


def renombrar_pc(mal, datos):
    d = b.leer('personas_comunidad?select=id&nombre=eq.' + quote(mal))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


def correo_a(puesto, email, principal=False):
    """correo nuevo en un puesto que YA existe (si el correo no esta ya en la agenda)."""
    if not b.leer('correo?select=id&email=ilike.' + quote(email)):
        ins('correo', [{'puesto_id': puesto, 'email': email, 'etiqueta': 'general', 'principal': principal}])


def motivo(n, i, m):
    """anade el motivo a la nota i (la fecha ya la puso partir)."""
    f, t = n[i]; n[i] = (f, t + '\n\n(' + m + ')'); return n


# ================================================================= 0. AGENDA (solo en empresas, contratas y organismos que ya existen)
persona_nueva('Sevi', 'Vilas Bouzas', None, '625886456', 'sevi.vilas@smfincas.es', empresa=SMFINCAS,
              notas_='SM Fincas: administradora de Eduardo Urosa 7 (2025); tiene el despacho al lado y deja las llaves.')
persona_nueva('Elena', 'Moreno', 'administración', '682 281 318 / 91 679 30 92', 'administracion@ascensorescega.com', contrata=CEGA,
              notas_='Ascensores CEGA, departamento de administracion (Encarnacion del Pino 2, 2024).')
persona_nueva('Manuel', 'Requena', 'jefe de obra', None, 'manuel.requena@fainascensores.com', contrata=FAIN,
              notas_='Fain: jefe de obra (Etruria 26-28, Enciso 1, Emilio Ferrari 101).')
persona_nueva('Abel', 'Bernardos', 'jefe de obra', None, 'abel.bernardos@fain.es', contrata=FAIN, notas_='Fain: jefe de obra (Etruria 26-28, Encomienda de Palacios 49).')
persona_nueva('Federico', 'Martín Hita', 'arquitecto técnico (Servicio de Medio Ambiente y Escena Urbana)', None, 'martinhfed@madrid.es', organismo=MORATALAZ,
              notas_='Junta de Moratalaz: tecnico de la licencia de Encomienda de Palacios 318 (2026).')
persona_nueva('Virginia', 'López Cano', 'técnico', '91 480 35 21', 'lopezcvi@madrid.es', organismo=MORATALAZ,
              notas_='Junta de Moratalaz: tecnica de la licencia de Encomienda de Palacios 49 (2022).')
persona_nueva('Margarita', 'Guerrero', 'jefa de sección', '915132240', None, organismo=MORATALAZ,
              notas_='Junta de Moratalaz: jefa de seccion (Entrearroyos 98, 2020; en la ficha "Guerreo").')
persona_nueva('Juan Pablo', 'Mondelo', 'técnico', None, None, organismo=CARABANCHEL, notas_='Junta de Carabanchel: tecnico de El Toboso 134-140 (2017).')
persona_nueva('Teresa Anna', 'Filipek', 'jefe de obra', None, 'teresa.filipek@tkelevator.com', contrata=TKE, notas_='TKE: jefe de obra de Esteban Collantes 31 (2017).')
persona_nueva('Sonia', 'Sacristán', 'administración', '91 508 18 20', 'gestion@nvr-edificios.com', contrata=NVR, notas_='NVR: administracion (Entrearroyos 56, 2022).')
persona_nueva('Javier', 'García', 'administrador de fincas', None, None, empresa=DELBRIO, notas_='Del Brio y Blanco: administrador de Esteban Carros 20 (2024).')
correo_a(PU['rosa'], 'rosersese@hotmail.com')            # Rosa Radal Sese (ROSERSESE), Encomienda de Palacios 320
correo_a(PU['jasalamanca'], 'joseantonio@asalamanca.es')  # "Mandar los correos a el" (Encomienda de Palacios 49)
correo_a(PU['elena_lys'], 'elena@lysasesores.com')        # Elena (LYS), Escribanos 5, 30-01-2026
correo_a(PU['barrionuevo'], 'barrionuevoalp@madrid.es')   # Laura Barrionuevo, Junta de Ciudad Lineal (Esteban Collantes 26)
correo_a(PU['lpardo'], 'tecnico@nvr-edificios.com')       # Laura Pardo (tco.) de NVR (Entrearroyos 56)

# ================================================================= 1. PRODUCCION (29)
sv = trocear2(subv('elfo76'), 2025)
sv[0] = ('2025-05-22', sv[0][1] + '\n\n(Sin fecha; va con la subvencion contratada el 22/05/2025: presentaciones infinitas, indicado por Monica en mayo de 2025.)')
renombrar_pc('RAQUEL MUÑOZ RIOJA JESUS JIMENEZ GARCIA', {'nombre': 'JESUS JIMENEZ GARCIA', 'documento': '77350988X',
             'notas': 'Antes: Raquel Munoz Rioja (50080344Y; rioja-raquel@hotmail.com), tachada en la ficha.'})
rellenar('elf76', 'ELFO 76', 'elfo76', {'fecha_apertura': '2025-05-22', 'referencia_catastral': '5063601VK4756C',
    'origen_notas': 'Fecha de llegada: 05/2025 (dia: el de las HE firmadas y los primeros ficheros, 22/05/2025). Contacta: ROEN (la contrata; en la ficha, su comercial "Ya no esta JOSE LUIS"). '
                    'Tipo de obra: SATE + SUBVENCIONES + CAES + proyecto de andamios (con estudio de seguridad y salud) e IEE. Barrio: Quintana. Tecnico: Julio -> Israel. Fecha encargo: 22-05-2025. Ano 1960. '
                    'Tramitacion por AYUNTAMIENTO: LICENCIA (tachada en la ficha) -> DR; el 24/06/2026 el Ayto declara ineficaz la licencia y se registra DR el 16/07/2026; el 28/07/2026 piden la concesion demanial. '
                    'PEM 477.167,89. Visado TL/007718/2026. Expediente 350/2026/19552. Administracion: ASESORIA MARTIN GARCIA (Maria Jesus Martin; tachada) y desde 15/10/2025 ABELLO ASESORES '
                    '(Monica Barrera, 913 777 615; Alfredo Abello). Presidente: Jesus Jimenez Garcia (antes Raquel Munoz Rioja, tachada); Junta de Gobierno: Concepcion Kraus Frutos (ckraus@icam.es). '
                    'Subvencion contratada 22/05/2025. Comercial: DANIEL.'},
    ('sate', 'subvenciones', 'caes', 'iee'), n=fijar('elfo76', 2025), subvencion=sv,
    comunidad={'iban': 'ES13 0081 1543 8000 0128 3529'}, presi=('JESUS JIMENEZ GARCIA', 'presidente', None, '77350988X', 'jimenezgarciajesus19@gmail.com'))
pc(OPP['elf76'][0]['id'], 'CONCEPCION KRAUS FRUTOS', 'otro', None, None, 'ckraus@icam.es', 'Junta de Gobierno de la comunidad (2026).')
rellenar('prv31', 'EL PROVENCIO 31', 'elprovencio31', {'fecha_apertura': '2024-07-03', 'referencia_catastral': '6697108VK4769F',
    'origen_notas': 'Fecha de llegada: 07/2024 (dia: la primera nota, 03/07/2024: Iberlean envia planos y un informe de no viabilidad del ascensor y pregunta si cabria algun modelo). Contacta: IBERLEAN '
                    '(Miguel Alemany; Alfredo Jimenez, tachado). Tipo de obra: ASCENSOR (en abr-2026 Iberlean nos adjudica el proyecto: Motala B6 sin contrapeso, muro a terrazas rehecho mas fino, escalones al patio; '
                    'incluir el escaneo laser; la subvencion la gestiona Iberlean). Tecnicos: Alejandro Bello (EA), Jacob Hernandez (ER). Fecha encargo: 14/04/2026 (HE firmada). Ano 1970. '
                    'Proyecto terminado y enviado a Iberlean el 29/09/2026; pendiente del ok para tramitar. Comercial: DANIEL.'},
    ('ascensor',), n=partir(fijar('elprovencio31', 2024), 0, '---------- Forwarded message', '2026-04-08'), trae_pu=PU['alemany'])
rellenar('emb3', 'EMBAJADORES 3 ', 'embajadores3', {'fecha_apertura': '2026-01-09',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: el correo de Guillermo Pueyo, 9 de enero de 2026). Contacta: Guillermo Pueyo (DEL BRIO Y BLANCO; 91 477 41 91 y 91 478 69 11). '
                    'Tipo de obra: ASC + SUBV (derribo completo de escalera, ascensor de 5 paradas para 4 personas, modificacion completa de contadores; 200.000 + IVA de obra). HE con informe enviados 28-01-2026. '
                    'Comercial interno: DANIEL.'},
    ('ascensor', 'subvenciones'), n=notas_a_mano('embajadores3', 2026, {0: ('2026-01-09', 'Correo de Guillermo Pueyo del 9 de enero de 2026.')}),
    adm=PU['guillermo'], trae_pu=PU['guillermo'])
rellenar('emb56', 'EMBAJADORES 56', 'embajadores56', {'fecha_apertura': '2026-01-29',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: el correo del 29/01/2026 en que la oficina pasa la peticion a Alejandra, de comercial). Contacta: Jose Miguel (ALSER FINCAS; 914 47 56 13, L a V de 9.30 a 14.30; '
                    'whatsapp 695 93 49 79). Tipo de obra: ELEVADOR (interior: torre en el patio para 4 personas, 0,15 m/s, 4 paradas; o exterior, tambien de 4 personas y 4 paradas; 98.000 + IVA de obra). '
                    'HE con viabilidad enviados 05-02-2026. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('plataforma',), n=notas_a_mano('embajadores56', 2026, {0: ('2026-01-29', 'Correo de la oficina a Alser del 29 de enero de 2026.')}),
    adm=PU['escano'], trae_pu=PU['escano'], captador=CARLOS, lleva=ALVARO)
rellenar('egf40', 'EMILIO GASTESI FERNANDEZ 40', 'emiliogastesifernandez40', {'fecha_apertura': '2024-10-07',
    'origen_notas': 'Fecha de llegada: 10/2024 (dia: el correo de la presidencia, 07/10/2024). Contacta: la presidencia de la comunidad (presidencia.gastesi.40@gmail.com); Pedro, vecino, 616 642 407 (visita el 08/10/2024). '
                    'Tipo de obra: SATE: proyecto de ingenieria de rehabilitacion energetica (aislamiento de fachada y azotea, acristalamiento de zonas comunes, aerotermia de apoyo a la calefaccion central y para ACS); '
                    'edificio exento, las 4 fachadas. Distrito Ciudad Lineal. Comercial: ALVARO.'},
    ('sate', 'aerotermia'), n=fijar('emiliogastesifernandez40', 2024), captador=ALVARO, lleva=ALVARO)
pc(OPP['egf40'][0]['id'], 'PEDRO', 'vecino', '616642407', None, None, 'Vecino; visita con Daniel el 08/10/2024.')
rellenar('emu11', 'EMILIO MUÑOZ 11', 'emiliomuñoz11', {'fecha_apertura': '2025-09-29', 'origen_notas': IEE_ROJO % 18},
         ('iee',), n=fijar('emiliomuñoz11', 2025, SINF_JUSTO), adm=PU['alba'], trae_pu=PU['justo'])
rellenar('edp2', 'ENCARNACION DEL PINO 2', 'encarnaciondelpino2', {'fecha_apertura': '2024-12-10', 'referencia_catastral': '9766219VK3696F',
    'origen_notas': 'Fecha de llegada: 12/2024 (dia: la primera nota, 10/12/2024: mandan su presupuesto firmado). Contacta: Oscar Fernandez (CEGA). Tipo de obra: ASCENSOR + SUBV (contratada en enero de 2025): '
                    'derribo de escalera de dos tramos tipo caracol por el interior, sin invadir los locales. Barrio: Villaverde Alto - Casco Historico de Villaverde. Tecnico: Julio -> Carlos. Fecha encargo: 11/12/2024. '
                    'Jefe de obra: Francisco Gallego (CEGA). LICENCIA por ECU (ACTECU), aprobada 03/04/2025. Administracion: SANJUFINCAS, a traves de CEGA (Yajaira Morejon, 912 125 169). '
                    'Contacto de la comunidad: Marta, 658 644 103, "presidenta de la comunidad" (la ficha da como presidenta a Maria del Mar Santin de la Fuente). PEM 131.722,69. '
                    'Visados TL/003689/2025, TL/013233/2026 (CFO) y TL/013742/2026 (EBSS). Obra terminada: la ECU da la conformidad el 21/09/2026. Comercial: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('encarnaciondelpino2', 2024), trae_pu=PU['oscar_cega'])
rellenar('enc1', 'ENCISO 1', 'enciso1', {'fecha_apertura': '2022-10-24', 'referencia_catastral': '7933844VK4773D',
    'origen_notas': 'Fecha de llegada: 10/2022 (dia: la primera nota, 24/10/2022). Contacta: David Sanchez (FAIN; antes Juan Paramio y Oswaldo, tachados): la presidenta pidio a Fain en jun-2022 el ascensor, con licencia '
                    'concedida en 2022 a un proyecto de otro arquitecto. Tipo de obra: primero CSS + SUBVENCIONES; desde ene-2024 tambien proyecto nuevo (MODIFICACION del proyecto de ascensor, por el exterior / espacio publico) '
                    'y DF, por ECU. Barrio: Casco historico de Vicalvaro. Tecnico: Susana -> requerimiento Carla (nov-2024) -> Julio (may-2025). Fecha encargo: 01/02/2024. Jefe de obra: Daniel Palacios (antes Manuel Requena, tachado). '
                    'Sin administrador (es la misma presidenta que Clavijo 3: Mari Cruz Sanchez Hernandez). Visado TL/006594/2024. Expedientes 119/2019/00322 (antiguo) y 350/2024/17722 (nuevo). LICENCIA CONCEDIDA 24/10/2025. '
                    'HE de renovacion de la subvencion firmada 12-06-2025. Comercial: DANIEL.'},
    ('css', 'subvenciones', 'ascensor', 'df'), n=fijar('enciso1', 2022),
    comunidad={'iban': 'ES02 0049 3132 0318 9039 4644'}, presi=('MARI CRUZ SANCHEZ HERNANDEZ', 'presidente', '696699645', None, 'mcruzsanchezhernandez@gmail.com'), trae_pu=PU['dsanchez'])
rellenar('ep318', 'ENCOMIENDA DE PALACIOS 318', 'encomiendadepalacios318', {'fecha_apertura': '2019-09-25', 'referencia_catastral': '6121215VK4762A',
    'origen_notas': 'Fecha de llegada: 09/2019 (dia: las fotos de la visita, IMG_20190925). Contacta: Jose Olivares (OLIVARES / ROSERSESE). Tipo de obra: INSTALACION DE ASCENSOR + SUBV (la subvencion la tramito Rosersese; '
                    'concedida RM23). Barrio: Pavones. Tecnico: Dennis. Administracion: FINCAS ORTIZ (Jesus Ortiz Benito, 91 032 77 48 y 658 391 920). Presidente: Mariano Lopez (1o A), 670 538 609. '
                    'Junta de Moratalaz: Federico Martin Hita, arquitecto tecnico del Servicio de Medio Ambiente y Escena Urbana (martinhfed@madrid.es; licenciasmoratalaz@madrid.es). LICENCIA. NZ 3.1.a. '
                    'PEM 90.109,95. Expediente 350/2021/04390. El 01/09/2026 orden de paralizacion: la ejecucion no se ajusta al proyecto. Comercial: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('encomiendadepalacios318', 2019), presi=('MARIANO LOPEZ 1º-A', 'presidente', '670538609'), trae_pu=PU['olivares'])
rellenar('ep320', 'ENCOMIENDA DE PALACIOS 320', 'encomiendadepalacios320', {'fecha_apertura': '2025-06-03', 'referencia_catastral': '6121218VK4762A',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: el correo de Rosa Radal Sese, 3 de junio de 2025: "proyecto urgente"). Contacta: ROSERSESE (Rosa Radal Sese, 960 230 178, rosersese@hotmail.com). '
                    'Tipo de obra: ASCENSOR. Barrio: Pavones. Tecnico: Jhonatan -> Israel (requerimiento). Ano 1972. LICENCIA por el AYTO (invasion de espacio publico), presentada 07-07-2025; en jun-2026 sigue en estudio. '
                    'Administracion: LOZANO MASIPIE (Susana, 635 537 524). HE a precio especial 04-06-2025, firmada 05-06-2025. PEM 121.888,27. Visado TL/009873/2025. Expediente 350/2025/21116. Comercial: DANIEL.'},
    ('ascensor',), n=notas_a_mano('encomiendadepalacios320', 2025, {0: ('2025-06-03', 'Correo de Rosa Radal Sese del 3 de junio de 2025.')}), trae_pu=PU['rosa'])
rellenar('ep49', 'ENCOMIENDA DE PALACIOS 49', 'encomiendadepalacios49', {'fecha_apertura': '2022-02-04', 'referencia_catastral': '58262G6VK4752F',
    'origen_notas': 'Fecha de llegada: 02/2022 (dia: la fecha de encargo y el presupuesto aceptado, 04/02/2022). Contacta: Ivan Vazquez y David Sanchez de la Calle (FAIN). Tipo de obra: ASCENSOR + CSS + SUBVENCION + IEE '
                    '(misma configuracion que el portal de al lado, el 51, ya terminado). Barrio: Fontarron. Tecnico: Paloma. Fecha encargo: 04/02/2022. Jefes de obra: Victor Esquinas y Abel Bernardos (Fain). '
                    'Administracion: ADMINISTRACIONES SALAMANCA (Jose Antonio Sanchez Lucas, joseantonio@asalamanca.es, "mandar los correos a el"; 913 282 324 / 687 824 446). Comision de obras: Raul Valera. '
                    'Junta de Moratalaz: Virginia Lopez Cano (91 480 35 21). LICENCIA ("va por fuera aunque en la memoria no lo pone"); la DR 115/2022/01094 se declaro ineficaz (06/07/2023) y se devolvieron tasas e ICIO. '
                    'NZ 3.1.a. PEM 100.211,78. Visado TL/006303/2022. Expediente 350/2022/03440. Fin de obra 04-09-2025 (carpeta de obra). Comercial: DANIEL.'},
    ('ascensor', 'css', 'subvenciones', 'iee'),
    n=notas_a_mano('encomiendadepalacios49', 2022, {0: ('2022-02-04', 'Sin fecha; la solicitud de encargo de Fain (fecha de encargo de la ficha: 04/02/2022).')}),
    presi=('EDUARDO VIÑALES MARQUEZ', 'presidente', '691300583', None, 'eduardovinales@hotmail.com'), trae_pu=PU['ivan'])
pc(OPP['ep49'][0]['id'], 'RAUL VALERA', 'otro', '620545424', None, 'Izan517@gmail.com', 'Comision de obras de la comunidad.')
rellenar('ef27', 'ENRIQUE FUENTES 27', 'enriquefuentes27', {'fecha_apertura': '2024-02-27',
    'origen_notas': 'Fecha de llegada: 02/2024 (dia: la primera nota, 27/02/2024). Contacta: Jesus Manilla (jesus.manilla@yahoo.es; paga la comunidad). Tipo de obra: SATE Y NEXT GENERATION. Distrito Usera. '
                    'Monica envia estudio de costes y HE el 27/02/2024. Comercial interno: ALVARO.'},
    ('sate', 'subvenciones'), n=fijar('enriquefuentes27', 2024), captador=ALVARO, lleva=ALVARO)
pc(OPP['ef27'][0]['id'], 'JESUS MANILLA', 'otro', None, None, 'jesus.manilla@yahoo.es', 'Contacto de la comunidad (2024).')
rellenar('ea56', 'ENTREARROYOS 56', 'entrearroyos56', {'fecha_apertura': '2022-06-21', 'referencia_catastral': '45339A0VK4743D',
    'origen_notas': 'Fecha de llegada: 06/2022 (dia: la HE firmada, 21/06/2022). Contacta: Laura Pardo (NVR, el constructor de Albufera 250; todas las visitas a traves de ellos). Tipo de obra: ASCENSOR + SATE + subvencion '
                    'Next Generation (por fuera, ocupando via publica; licencia con aumento de volumetria en altura). Barrio: Media Legua. Tecnico: Fernan. Administracion: PEDRO ALVAREZ VALVERDE, a traves de NVR '
                    '(Lidia Martin, 91 508 18 20). NZ 3.1.a. PEM 129.955,56. Visados TL/015824/2022 y TL/006441/2023. Expediente 350/2022/06023 (lo tramito NVR, que presento la licencia por su cuenta con el proyecto '
                    'sin visar ni firmar); licencia aprobada en jun-2024 a NVR. En jun-2025 la vicepresidenta, Sara Vacas (610 97 64 58), pide presupuestos de DF a otros arquitectos (Jose Miguel Alonso Alvarez, '
                    'COAM 6350, 696 91 71 96). Comercial: DANIEL.'},
    ('ascensor', 'sate', 'subvenciones'), n=fijar('entrearroyos56', 2022), trae_pu=PU['lpardo'])
pc(OPP['ea56'][0]['id'], 'SARA VACAS', 'vicepresidente', '610976458')
rellenar('ea74', 'ENTREARROYOS 74', 'entrearroyos74', {'fecha_apertura': '2026-04-25',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: el primer fichero, una captura del 25/04/2026). Contacta: Belen Garcia (GARFINCAS; belen.garcia@garfincas.com) - no esta en la agenda. Tipo de obra: la ficha no lo dice. '
                    'Presidenta: Elena, 665 613 389. HE con informe de viabilidad enviados 27/04/2026. Comercial interno: ALVARO.'},
    (), n=notas_a_mano('entrearroyos74', 2026, {0: ('2026-04-27', 'La fecha va al final ("enviado 27/04/2026").')}),
    presi=('ELENA', 'presidente', '665613389'), captador=ALVARO, lleva=ALVARO)
rellenar('ep25', 'EPOCA 25', 'epoca25', {'fecha_apertura': '2025-10-22',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: el escaneo 3D, 22/10/2025). Contacta: Leandro (FINCASA). Tipo de obra: 2 ASCENSORES (ancho de escalera 2200; no baja a garaje; foso hiperreducido o elevador sin foso). '
                    'Contacto: joseantoniomaganwals@gmail.com, +34 669 52 86 09 ("viene de Rodriguez Lazaro 14"). HE enviada 1-12-2025. OJO: Epoca 23 (tambien en produccion) tiene la misma referencia catastral. '
                    'Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), n=partir(fijar('epoca25', 2025), 0, 'HE enviada', '2025-12-01'), adm=PU['leandro'], trae_pu=PU['leandro'], captador=CARLOS, lleva=ALVARO)
rellenar('er12', 'ERASO 12', 'eraso12', {'fecha_apertura': '2025-11-24',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia: la ficha y el 3D en glb, 24/11/2025; el escaneo es del 22/10/2025). Tipo de obra: ASCENSOR. Hay escaneo 3D. La ficha no dice quien la trae y no tiene notas. '
                    'Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), captador=CARLOS, lleva=ALVARO)
n = motivo(partir(fijar('escribanos5', 2022, ('2022-09-29', 'Sin fecha delante; la fecha va dentro ("29/09"); el ano es el de la llegada de la ficha.')), 6, 'Mayo 2024', '2024-05-01'),
           7, 'Mayo de 2024, dia desconocido.')
rellenar('esc5', 'ESCRIBANOS 5', 'escribanos5', {'fecha_apertura': '2022-09-29', 'referencia_catastral': '9762208VK3696D',
    'origen_notas': 'Fecha de llegada: 09/2022 (dia: la primera nota, "29/09"). Contacta: Valentin (ADMINISTRACIONES ALCORA), tachado en la ficha. Tipo de obra: SATE + FV (proyecto, DO y tramitacion de subvenciones; '
                    'IEE). Barrio: Villaverde Alto - Casco Historico de Villaverde. Tecnico: Julio. Ano 1960. Administracion: hasta may-2024 ADMINISTRACIONES ALCORA (Valentin, tachado); desde may-2024 LYS (Nuria; Elena, '
                    'elena@lysasesores.com; 917 109 098). Presidenta: Maria Esther Olmo Gonzalez (fanyas2@hotmail.com; "ojo, se llevan mal con el administrador, pedirle todo a la presidenta"). Presupuesto de obra de ARE '
                    'aprobado (28/11/2023). Visado TL/012148/2024 (con la fotovoltaica, por decision de Daniel). En ago-2024 no firman la IEE; en ene-2026 LYS pide retomar el asunto. Comercial: DANIEL.'},
    ('sate', 'fotovoltaica', 'df', 'subvenciones', 'iee'), n=n,
    comunidad={'iban': 'ES57 0081 0337 1600 0152 1161'}, presi=('MARIA ESTHER OLMO GONZALEZ', 'presidente', None, None, 'fanyas2@hotmail.com'))
rellenar('esp11', 'ESPERANZA 11', 'esperanza11', {'fecha_apertura': '2026-05-17',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: el de la ficha). Tipo de obra: IEE. La ficha no dice quien la trae y no tiene notas (su cabecera dice "ESPERANZA 1"; la carpeta, esperanza11). Comercial interno: ALVARO.'},
    ('iee',), captador=ALVARO, lleva=ALVARO)
rellenar('es26', 'ESPIRITU SANTO 26', 'espiritusanto26', {'fecha_apertura': '2025-08-26',
    'origen_notas': 'Fecha de llegada: 08/2025 (dia: la primera nota, 26/08/2025). Contacta: Olivia, la presidenta (oliwia; joannaoliwiagornicka@gmail.com; 666 261 929). Tipo de obra: "Ascensor chiphan": 4 paradas '
                    '(baja + 3; en la ultima no para, silla o similar); un cuarto de planta baja para el simple embarque. Distrito Centro. Administracion: Guillermo Carrillo (CAF; Juan de Dios 3, 1o D; 915 476 580; '
                    'g.carrillodealbornozn@cafmadrid.es) - no esta en la agenda. 23-09-2025: Olivia quiere solo el exito (3,5 %) en subvenciones; nos negamos y ella no accede. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), n=fijar('espiritusanto26', 2025), presi=('oliwia', 'presidente', '666261929', None, 'joannaoliwiagornicka@gmail.com'), trae_pc='presi', captador=CARLOS, lleva=ALVARO)
rellenar('ef8', 'ESTANISLAO FIGUERAS 8', 'estanislaofigueras8', {'fecha_apertura': '2025-02-07', 'referencia_catastral': '9249514VK3794G',
    'origen_notas': 'Fecha de llegada: 02/2025 (dia: la primera nota, 07/02/2025: piden presupuesto de la ITE con la carta del Ayuntamiento). Contacta: Estefania (YARA ADMINISTRACION). Tipo de obra: IEE. '
                    'Distrito Moncloa-Aravaca. Tecnico: Alex. Ano 1994. Presidente: Martin Roberto Garcia Saenz (Roberto, 629 544 992). HE de IEE recibida firmada 5/11/2025. Comercial: DANIEL.'},
    ('iee',), n=fijar('estanislaofigueras8', 2025), comunidad={'iban': 'ES58 0081 0623 5800 0123 6034'},
    presi=('MARTIN ROBERTO GARCIA SAENZ', 'presidente', '629544992'), trae_pu=PU['yara'])
rellenar('ec26', 'ESTEBAN COLLANTES 26', 'estebancollantes26', {'fecha_apertura': '2022-04-20', 'referencia_catastral': '5860126VK4756B',
    'origen_notas': 'Fecha de llegada: 04/2022 (dia: los primeros ficheros del proyecto, 20/04/2022). Contacta: Javier Moya (SCHINDLER; antes Javier Parra, tachado). Tipo de obra: ASCENSOR + RAMPA (la subvencion iba '
                    'incluida en los honorarios del proyecto de 2022; HE de renovacion de la subvencion 24/11/2025). Barrio: Pueblo Nuevo. Tecnico: Susana + Daniel -> Karla. Fecha encargo: abril 2022. '
                    'Jefe de obra: Luis A. Gonzalez Koves (+ Victor Sarban, colabora con Schindler). Administracion: ALSER (Javier Hernandez Martin; 914 475 613 / 911 837 711 / 695 934 979). '
                    'Presidenta: Maria Belen Garcia Martinez (680 92 76 08). Junta de Ciudad Lineal: Laura Barrionuevo. DR (es por interior), NZ4. PEM 186.798. Visados TL/015128/2022 y TL/010293/2026 (CFO); '
                    'CFO registrado en el Ayto 14/07/2026. Comercial: DANIEL.'},
    ('ascensor', 'rampa', 'subvenciones'),
    n=notas_a_mano('estebancollantes26', 2022, {0: ('2025-11-24', 'Sin fecha; va con la HE de renovacion de la subvencion del 24/11/2025.')}),
    comunidad={'iban': 'ES51 2085 9301 3703 3015 3764'}, presi=('MARIA BELEN GARCIA MARTINEZ', 'presidente', '680927608'), trae_pu=PU['gmoya'])
rellenar('ec31', 'ESTEBAN COLLANTES 31', 'estebancollantes31', {'fecha_apertura': '2017-05-10', 'referencia_catastral': '5761712VK4756B',
    'origen_notas': 'Fecha de llegada: 05/2017 (dia: el primer fichero, los honorarios de la consulta, 10/05/2017). Contacta: Juan Carlos Martinez (THYSSEN). Tipo de obra: ASCENSOR; primero CONSULTA URBANISTICA '
                    '(presentada jul-2017, aprobada ene-2018). Barrio: Pueblo Nuevo. Tecnico: Carlos. Jefe de obra: Teresa Anna Filipek (TKE). Administracion: JEGUEYMA (Isabel Posada, 914 078 700; la factura a Oscar, el administrador). '
                    'Presidente: Felipe Rebollo; representante: Susana Gomez, 606 38 57 07 (en las notas, "la presidenta Susana", Susana Dominguez, 638 793 375). Junta de Ciudad Lineal: Laura Barrionuevo '
                    '(91 588 75 30, L-X-V 9.00-10.30 sin cita). NZ4. PEM 50.000. Expediente 116/2018/5149. Comercial: DANIEL.'},
    ('ascensor', 'consulta_urbanistica'),
    n=notas_a_mano('estebancollantes31', 2017, {0: ('2017-05-10', 'Sin fecha; el encargo de la consulta urbanistica (primer fichero, 10/05/2017).')}), trae_pu=PU['jcmartinez'])
rellenar('et10', 'ETNA 10', 'etna10', {'fecha_apertura': '2026-02-13',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: el correo de Raul Cerezo, 13 de febrero de 2026). Contacta: Raul Cerezo (freelance; trae la opp). Tipo de obra: SATE EN FACHADA Y CUBIERTA + SUBV '
                    '(proyecto, direccion y peticion de subvenciones). HE enviada 16-02-2026. Comercial interno: DANIEL.'},
    ('sate', 'cubierta', 'df', 'subvenciones'), n=notas_a_mano('etna10', 2026, {0: ('2026-02-13', 'Correo de Raul Cerezo del 13 de febrero de 2026.')}), trae_pu=PU['cerezo'])
rellenar('et14', 'ETNA 14', 'etna14', {'fecha_apertura': '2024-10-11', 'referencia_catastral': '5112824VK4751A',
    'origen_notas': 'Fecha de llegada: 10/2024 (dia: la primera nota, 11/10/2024: HE enviada). Contacta: Rosa (OLIVARES / ROSERSESE); la administracion, "a traves de Rosa". Tipo de obra: ASCENSOR (ojo: servidumbres '
                    'aeronauticas de Getafe y Torrejon; los vecinos no quieren tocar el trastero). Barrio: Portazgo. Tecnico: Carla. Ano 1963. Presidenta: Jennifer Roxana Ramon Moreira (4o C), 653 521 327. '
                    'Visado TL/017810/2024. Expediente 350/2024/36689: en ago-2026 sigue pendiente de informe tecnico (cambio de tecnico en la Junta de Puente de Vallecas). Comercial: DANIEL.'},
    ('ascensor',), n=partir(fijar('etna14', 2024), 1, 'De:\xa0Departamento', '2025-08-11'), presi=('JENNIFER ROXANA RAMON MOREIRA', 'presidente', '653521327'), trae_pu=PU['rosa'])
renombrar_pc('LUIS FERNANDO ALEJANDRE SERRANO', {'nombre': 'CHRISTIAN GONZALEZ BUDIA', 'documento': '52878875N', 'telefono': '630404668', 'email': 'Chris.juymer@gmail.com',
             'notas': 'Presidente tambien de la Mancomunidad. Antes: Luis Fernando Alejandre Serrano (01892162K; 654 45 97 87; luisfer.alejandre@gmail.com), tachado en la ficha del ascensor.'})
rellenar('etr26', 'ETRURIA 26-28 LUCANO 65', 'etruria26-28lucano65', {'fecha_apertura': '2019-09-30', 'referencia_catastral': '8465201VK4786E',
    'origen_notas': 'Fecha de llegada: la ficha del ascensor dice 03/2022 (copiada de la del SATE), pero los ficheros del ascensor empiezan el 30/09/2019 (escritos del proyecto); se toma esa. Contacta: Juan Paramio (FAIN). '
                    'Tipo de obra: ASCENSOR + SUBV (licencia denegada en 2021 y luego DR; subvenciones Ayto 2021, CAM 2022-2023 y Ayto 2025 concedidas). Barrio: Canillejas. Tecnico: Fernan. '
                    'Jefes de obra: Manuel Requena y Abel Bernardos (Fain). Administracion: PICAZO YAGUE (91 243 00 81 / 601 20 48 48); el 31/08/2023 el administrador anterior, Francisco Javier Caballero (AXIAL), pide '
                    'no mandarle nada mas y escribir al presidente, con copia a Christian Gonzalez. Presidente: Christian Gonzalez Budia (tambien de la Mancomunidad; antes Luis Fernando Alejandre Serrano, tachado). '
                    'Viviendas y locales: 30. PEM 236.929,94. CFO TL/019153/2024. Expediente 117/2022/01875. El SATE (2022, no lo hicieron) es OTRO encargo y va a la clon. Comercial: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('etruria26-28lucano65/ASCENSOR/FICHA DATOS TECNICOS.docx', 2022),
    comunidad={'iban': 'ES36 0081 0532 4400 0150 9253'}, trae_pu=PU['paramio'])
renombrar_pc('ALVARO FRANCISCO /', {'nombre': 'ALVARO FRANCISCO LOZOYA LOPEZ', 'documento': '50451158Z', 'email': 'alvarolozoya@gmail.com'})
rellenar('ez105', 'EZEQUIEL SOLANA 105', 'ezequielsolana105', {'fecha_apertura': '2026-02-10', 'referencia_catastral': '5755212VK4755F',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: los primeros ficheros de febrero, 10/02/2026: papeles del otro arquitecto y propuesta de IEE+CEE; el escaneo 3D es del 12/01/2026). Contacta: Lara Rey (ADMINISTRACIONES REY; '
                    '915 65 25 25 / 696 46 11 64; "poner siempre en copia al presidente", 04/09/2026). Tipo de obra: DF, CSS y SUBV de un proyecto externo de ASCENSOR; el arquitecto anterior lo tramito por DR, denegada 2-3 veces, '
                    'con la obra al 80 % (derribo de escalera); Accesalia hace proyecto nuevo (terminado 12/05/2026) y lo tramita por LICENCIA con la ECU (ACTECU). Contrata: ROSERSESE. Barrio: Pueblo Nuevo. Tecnico: Jhonatan. '
                    'Ano 1970. Presidente: Alvaro Francisco Lozoya Lopez (687 91 80 59). PEM 112.882,80. En la ficha: comercial interno CARLOS (la capto antes de irse: escaneo 3D del 12/01/2026; Monica, 6-oct-2026).' + CAPTO_CARLOS},
    ('ascensor', 'df', 'css', 'subvenciones'),
    n=notas_a_mano('ezequielsolana105', 2026, {0: ('2026-02-19', 'La fecha va dentro ("CONSULTA A LA ECU 19/02/2026").')}),
    comunidad={'iban': 'ES71 2100 3336 1513 0071 2344'}, presi=('ALVARO FRANCISCO LOZOYA LOPEZ', 'presidente', '687918059', '50451158Z', 'alvarolozoya@gmail.com'),
    trae_pu=PU['rey'], captador=CARLOS, lleva=ALVARO)
rellenar('ez118', 'EZEQUIEL SOLANA 118', 'ezequielsolana118', {'fecha_apertura': '2025-12-29',
    'origen_notas': 'Fecha de llegada: 12/2025 (dia: el de la ficha). Contacta: Olga (JIMECO; en la ficha "JIMACO"; 611 383 164; administracion@jimeco.es). Tipo de obra: la ficha no lo dice. La ficha no tiene notas; '
                    'en la carpeta, "Wetransfer caducado. Deben enviarlo nuevamente". Comercial interno: CARLOS.' + CAPTO_CARLOS},
    (), adm=PU['olga'], trae_pu=PU['olga'], captador=CARLOS, lleva=ALVARO)
rellenar('ez85', 'EZEQUIEL SOLANA 85-87', 'ezequielsolana85-87', {'fecha_apertura': '2021-02-25',
    'origen_notas': 'Fecha de llegada: la ficha no la trae (xx/20xx); 02/2021 (dia: los primeros ficheros, 25/02/2021: correos, contrato y licencia concedida). Tipo de obra: la ficha no lo dice; en la carpeta hay '
                    'contrato, licencia concedida, DO visada (TL/006152/2021) y un escrito al COAM "de no haber participado" (jun-2022). Barrio: Pueblo Nuevo. Presidenta: Susana, 652 123 379. '
                    '"Se han gastado ya 80.000 EUR de INVER". Comercial: DANIEL.'},
    (), n=notas_a_mano('ezequielsolana85-87', 2021, {0: ('2021-02-25', 'Sin fecha; los primeros ficheros (25/02/2021).')}), presi=('SUSANA', 'presidente', '652123379'))
rellenar('ez97', 'EZEQUIEL SOLANA 97', 'ezequielsolana97', {'fecha_apertura': '2024-07-26', 'referencia_catastral': '5656707VK4755F',
    'origen_notas': 'Fecha de llegada: 07/2024 (dia: la primera nota, 26/07/2024). Contacta: Miguel Alemany (IBERLEAN; tambien Alfredo Jimenez). Tipo de obra: ASCENSOR (sin demoler la escalera, en el centro) + IEE '
                    '(contratada 24/10/2024; la subvencion la tramitan ellos). Distrito Ciudad Lineal. Tecnico: Jhonatan. Fecha encargo: 29/07/2024. Ano 1970. DR por ECU (ACTECU), presentada 30-04-2025; en jun-2026 la ECU '
                    'da prorroga hasta septiembre. Administracion: MANDATARIA (Eduardo J. Reategui Monsalve). Presidente: Jose Luis Izquierdo Ruiz (4o C); vecina: Sole (2o A), 679 594 227. Visado TL/006798/2025. Comercial: DANIEL.'},
    ('ascensor', 'iee'), n=fijar('ezequielsolana97', 2024), comunidad={'iban': 'ES77 0081-5730-11-000169 1970'}, trae_pu=PU['alemany'])
pc(OPP['ez97'][0]['id'], 'SOLE (2º A)', 'vecino', '679594227')

# ================================================================= 2. CLON
cl = lambda c, a, s=None: J(fijar(c, a, s))
crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
SATE_ETR = 'etruria26-28lucano65/SATE_no lo van a hacer/FICHA DATOS TECNICOS.docx'
REVS = [
    ('eduardourosa7', '2025-03-27', 'SEVI VILAS BOUZAS (SM FINCAS)', 'E78801669', None,
     'CALLE EDUARDO UROSA 7 MADRID. Fecha: 03/2025 (la ficha dice llegada 02/2016: de entonces solo hay un croquis). Tipo de obra: ASCENSOR (uno o dos: son dos escaleras; una creo que es viable, la otra es mas pequena). '
     'Distrito 11 - Carabanchel (Vista Alegre). CP 28025. Administracion: SM Fincas (Sevi Vilas Bouzas, 625 886 456, sevi.vilas@smfincas.es; tiene el despacho al lado y deja las llaves). '
     'Presidenta: Monica, 687 61 94 27. Informe de viabilidad enviado 02/04/2025. OJO: en produccion hay "EDUARDO UROSA 5 CARABANCHEL", que no es este numero.\n\n' + cl('eduardourosa7', 2025)),
    ('eltoboso134-140', '2017-05-08', None, 'H78594116', '7418521VK3771G (134), 7418520VK3771G (136), 7418518VK3771G (138), 7418519VK3771G (140)',
     'CALLE EL TOBOSO 134-140 MADRID. Fecha: 05/2017. Tipo de obra: la ficha no lo dice (en la carpeta, informe de actuacion de aceras y peticion al ayuntamiento). Distrito 11 - Carabanchel (San Isidro). CP 28019. '
     'Administrador: Nicolas. Presidente: Juan Jose Gomez Santiago (02182788L). Junta de Carabanchel: tecnico Juan Pablo Mondelo. INFORME FAVORABLE 15/11/2017. PEM 21.824,80. Expediente 111/2017/01449. '
     'NZ 3.1.a. Fachada 68,70 m; superficie 115,80 m2.'),
    ('eltoboso136', '2016-09-11', 'NICOLAS GARCIA', None, None,
     'CALLE EL TOBOSO 136 MADRID. Fecha: 09/2016. Tipo de obra: PLATAFORMA ELEVADORA (escalera Flexstep de Gilfer, 16.922 + IVA). Distrito 11 - Carabanchel (San Isidro). Contacto: Nicolas Garcia, 678 050 069, '
     'nahh123@gmail.com. Oferta de honorarios de may-2017.\n\n' + crudo('eltoboso136', 2016)),
    ('emilioferrari101', '2020-04-13', 'OSCAR FERNANDEZ (FAIN)', 'H79979191', '5957805VK4755F',
     'CALLE EMILIO FERRARI 101 MADRID. Fecha: 04/2020. Tipo de obra: INSTALACION DE ASCENSOR (contrato firmado entre la comunidad y Fain; Fain encarga proyecto y coordinacion; las subvenciones, aparte). '
     'Distrito 15 - Ciudad Lineal (Pueblo Nuevo). Jefe de obra: Manuel Requena (Fain). Administrador: Jose Manuel Aliaga Perez (c/ Pedro Antonio de Alarcon 51, 3o; 676 367 613 / 914 072 082; jmaliaga1936@gmail.com) - '
     'no esta en la agenda. Presidenta: Adelina Blanco Garcia (51585165Y; 91 407 84 83 personal / 606 05 79 43 sobrina). Cuenta ES84 2085 9301 3903 3029 6244. Visados TL/020818/2023 y TL/006348/2024 (justificacion de obra). '
     'Expediente 116/2020/01293.\n\n' + crudo('emilioferrari101', 2020)),
    ('encarnacionoviol50', '2016-01-21', 'PEDRO ARANDA (THYSSEN)', 'H79653788', '1770601VK4617B',
     'CALLE ENCARNACION OVIOL 50 MADRID. Fecha: 01/2016 (la ficha, copiada, dice 10/2023). Tipo de obra: ASCENSOR (Synergy Element, 4 paradas frontales, 1 m/s, cabina 1.000 x 1.250; presupuesto cerrado con la comunidad '
     '61.600 + IVA). Distrito 17 - Villaverde (Los Rosales). Administracion: Martin y Lorente (Marisa Valero, 91 796 00 43). Presidenta: Carmen Pascual (1o B; 02701150F; 917 980 513). Junta de Villaverde: '
     'C/ Arroyo Bueno 53 (en la ficha "ARROLLO"); negociado de licencias 91 588 77 29 / 91 588 77 30, L-X-V 9.00-11.00. PEM 40.000. Fachada 39 m. Licencia solicitada en sep-2016.\n\n' + crudo('encarnacionoviol50', 2016)),
    ('encomiendadepalacios107', '2022-05-23', 'NUNCI', None, None,
     'CALLE ENCOMIENDA DE PALACIOS 107 MADRID. Fecha: 05/2022. Tipo de obra: ASCENSOR (paga la comunidad). Distrito 14 - Moratalaz (Fontarron). Hay modelo y oferta con financiacion (jun-2022).\n\n'
     + cl('encomiendadepalacios107', 2022)),
    ('encomiendadepalacios18', '2022-05-23', 'NUNCI', None, None,
     'CALLE ENCOMIENDA DE PALACIOS 18 MADRID. Fecha: 05/2022. Tipo de obra: ASCENSOR (paga la comunidad). Distrito 14 - Moratalaz (Fontarron). Hay modelo y oferta con financiacion (jun y oct-2022).\n\n'
     + cl('encomiendadepalacios18', 2022)),
    ('encomiendadepalacios60', '2021-06-22', 'VICENTE REAL (FAIN)', None, None,
     'CALLE ENCOMIENDA DE PALACIOS 60 MADRID. Fecha: 06/2021. Distrito 14 - Moratalaz (Fontarron). Ficha vacia (en la ficha "VICENTE", de Fain); hay fotos de la visita (22/06/2021).'),
    ('enriquevelasco18', '2018-05-24', 'ANTONIO MIRA (ANYLOR)', None, None,
     'CALLE ENRIQUE VELASCO 18 MADRID. Fecha: 05/2018 (fotos y croquis del 24/05/2018; la ficha dice 06/2015). Distrito 13 - Puente de Vallecas (Numancia). Ficha vacia; hay croquis y fotos.'),
    ('entrearroyos98', '2020-02-10', 'NACHO SAN FELIPE (FAIN)', 'E78204864', '4533950VK4743D',
     'CALLE ENTREARROYOS 98 MADRID. Fecha: 02/2020 (la ficha no la trae; fotos del 10/02/2020). Tipo de obra: DF (10 % de la obra). Distrito 14 - Moratalaz (Media Legua). CP 28030. Contacto de la administracion: '
     'carlos.izquierdo@prodefincas.com. OJO: el CIF de la comunidad empieza por E. Junta de Moratalaz: Margarita Guerrero, jefa de seccion (915 132 240; tecnimoratalaz@madrid.es); licencias 915 887 407 '
     '(licenciasmoratalaz@madrid.es), negociado de licencias 915 887 481 (sirnindumoratalaz@madrid.es), autorizaciones 915 887 403 (sirnviasmoratalaz@madrid.es), disciplina urbanistica 915 132 240 '
     '(sirpsanmoratalaz@madrid.es), gestion 915 887 404 (nobrasmoratalaz@madrid.es); L, M y J de 9 a 12. Obra hecha: fin de obra ago-oct 2020.'),
    ('escalonilla17', '2022-01-11', 'IBAI CALONGE (ELECNOR)', None, '7222208VK3772A',
     'CALLE ESCALONILLA 17 MADRID. Fecha: 01/2022 (fotos del 11/01/2022). Tipo de obra: RENDERIZADO. Distrito 10 - Latina (Los Carmenes). CP 28047. Fecha encargo: 17/01/2022.'),
    ('esmeralda12', '2015-02-02', None, None, None,
     'CALLE ESMERALDA 12 MADRID. Fecha: 02/2015 (la ficha no la trae; presupuestos del 02/02/2015). Distrito 12 - Usera (Moscardo). Ficha vacia; hay presupuesto y valoracion.'),
    ('espada12', '2025-03-12', 'EMILIO GALLARDO (PRESIDENTE)', None, None,
     'ESPADA 12 MADRID. Fecha: 03/2025 (fotos de la visita, 12/03/2025). Tipo de obra: ASCENSOR. Distrito Centro. Contacto: Emilio Gallardo, presidente, 679 053 772, emiliogallardo@live.com. Visitado por JL.\n\n'
     + cl('espada12', 2025)),
    ('espalter13', '2017-05-31', 'LUIS MIGUEL NUNES (THYSSEN)', None, None,
     'CALLE ESPALTER 13 MADRID. Fecha: 05/2017. Tipo de obra: ASCENSOR (7 plantas + baja, 8 paradas; la escalera es protegida). Distrito 03 - Retiro (Los Jeronimos).\n\n' + crudo('espalter13', 2017)),
    ('estanislaofigueras5', '2024-05-01', 'FERNANDO MOZOS (ITACA FINCAS)', None, None,
     'ESTANISLAO FIGUERAS 5 MADRID. Fecha: 05/2024 (dia desconocido). Tipo de obra: SUBVENCION de un PROYECTO EXTERNO (accesibilidad). Distrito Moncloa-Aravaca (en la ficha "Noncloa"). CP 28008. '
     'Contacto: Fernando Mozos, administrador.\n\n' + cl('estanislaofigueras5', 2024)),
    ('estebancarros20', '2024-11-20', 'JAVIER GARCIA (DEL BRIO Y BLANCO)', None, None,
     'ESTEBAN CARROS 20 MADRID. Fecha: 11/2024. Tipo de obra: ASCENSOR sencillo por el interior para las viviendas de la planta primera, que esta muy alta (modificar el primer tramo de escalera de entrada); '
     'oferta de proyecto (ojo, administrador) y tramitacion de subvencion. Distrito Puente de Vallecas. CP 28053. Presidenta: Raquel Ojeda, 612 234 729. Hay escaneo 3D (abr-2025).\n\n' + cl('estebancarros20', 2024)),
    ('estebancarros4', '2025-02-27', 'VANESA (DEL BRIO Y BLANCO)', None, None,
     'ESTEBAN CARROS 4 MADRID. Fecha: 02/2025. Tipo de obra: ELEVADOR Y SUBV. Distrito Puente de Vallecas. CP 28053. Contacto de la comunidad: Ana, 651 071 452. Visita y fotos 03/03/2025.\n\n' + cl('estebancarros4', 2025)),
    ('estebancollantes33', '2022-07-18', 'SCHINDLER (Javier Parra y Javier Moya, los dos tachados)', None, None,
     'ESTEBAN COLLANTES 33 MADRID. Fecha: 07/2022. Tipo de obra: ASCENSOR (puerta de portal automatica y telefonillos, derribo de escalera y muro a patio con invasion de 5-10 cm, plataforma vertical en la entrada, '
     'ascensor interior de 6 paradas y 5 personas, contadores a armario homologado). Distrito 15 - Ciudad Lineal (Pueblo Nuevo). Datos pedidos a Parra 24/08/2022. Comercial: ALVARO.\n\n' + cl('estebancollantes33', 2022)),
    ('estebancollantes44', '2026-04-01', 'FELISA VELAZQUEZ (REMICA)', None, None,
     'ESTEBAN COLLANTES 44 MADRID (la cabecera de la ficha dice "COLLANATES"). Fecha: 04/2026 (dia desconocido; hay un escaneo 3D del 12/01/2026). Tipo de obra: ASC: retirar las dos torres y los dos ascensores actuales, '
     'derribo de las dos escaleras, ascensor de 6 plazas y 6 paradas, embarque simple; 450.000 EUR. Contacto: Felisa (REMICA; 666 767 855; mfvelazquez@remica.es). HE con informe a Monica 22/05/26, enviada 26-05-26. '
     'Comercial interno: DANIEL.\n\n' + crudo('estebancollantes44', 2026)),
    ('etruria43', '2015-12-01', 'FELIPE OSADO (ENOR)', 'H79656799', '8466405VK4786E',
     'CALLE ETRURIA 43 MADRID. Fecha: 12/2015 (dia desconocido). Tipo de obra: ASCENSOR (hay tambien croquis y oferta de Enor de Etruria 45). Distrito 20 - San Blas-Canillejas (Canillejas). CP 28022. '
     'Administrador: Antonio Chica (647 555 284; info@ancaro.es). Presidenta: Carmen (4o A), 619 821 558. Junta de San Blas-Canillejas: Av. Arcentales 28; 91 588 80 35; tecnisanblas@madrid.es. '
     'Consulta aprobada favorablemente 19/12/2016. PEM 50.000. Expedientes 117/2017/03824 (proyecto), 117/2019/9444 y 135/2018/01152 (subvencion). Fachada 38,10 m; superficie 51 m2.\n\n' + crudo('etruria43', 2016)),
    ('ezequielsolana18', '2021-05-12', 'SILVIA (ELECNOR)', None, None,
     'CALLE EZEQUIEL SOLANA 18 MADRID. Fecha: 05/2021. Distrito 15 - Ciudad Lineal (Pueblo Nuevo). Ficha vacia; hay planos y 3D (may-2021).')]
for carp, fecha, trajo, cif, ref, t, *ruta in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, comercial='Alvaro' if carp == 'estebancollantes33' else 'Daniel', ruta=ruta[0] if ruta else None)
fila('etruria26-28lucano65 (SATE)', '2022-03-01', 'cerrada',
     'Perdida: "No van a hacer el proyecto de sate. NO merecia la pena porque son muchas terrazas. Solamente han arreglado lo que estaba estropeado" (05/06/2024).', 'LA COMUNIDAD (paga la CDAD)', 'H78325750', '8465201VK4786E',
     'CALLE ETRURIA 26-28 LUCANO 65 MADRID. Fecha: 03/2022 (dia desconocido). Tipo de obra: SATE (presupuesto de Envoltermia sin firmar; DR presentada el 13/06/2022 sin pagar las tasas, para poder pedir la subvencion). '
     'Distrito 20 - San Blas-Canillejas (Canillejas). Tecnico: Fernan. Administracion: AXIAL (Fran Caballero, tachado) -> Picazo Yague. Presidente: Luis Fernando Alejandre Serrano; tambien Christian Gonzalez Budia. '
     'El 25-11-2024 el Ayto avisa de que denegara la DR del SATE. El ASCENSOR del mismo edificio es la oportunidad de produccion.\n\n' + crudo(SATE_ETR, 2022),
     ruta=R('etruria26-28lucano65' + B + 'SATE_no lo van a hacer'))
for carp, fecha, trajo, t in [
        ('elche3', '2018-04-16', 'PEDRO ARANDA (THYSSEN)', 'Calle ELCHE 3 MADRID. Fecha: 04/2018 (la ficha, copiada, dice 10/2023). Distrito 17 - Villaverde (Los Rosales). Ficha vacia; hay croquis y presupuesto.'),
        ('encomiendadepalacios38', '2016-06-29', 'FELIPE OSADO (ENOR)', 'Calle ENCOMIENDA DE PALACIOS 38 MADRID. Fecha: 06/2016. Distrito 14 - Moratalaz (Fontarron). Contacto: Jose Manuel Ocana, 606 296 073. '
         'Ficha vacia; hay croquis y presupuesto.'),
        ('espiritusanto18', '2015-05-04', 'LUIS MIGUEL NUNES (THYSSEN)', 'Calle ESPIRITU SANTO 18 MADRID. Fecha: 05/2015 (la ficha no la trae; en ella "LUIS MANUEL NUNES"). Distrito 01 - Centro (Universidad). '
         'Ficha vacia; hay croquis y propuesta.'),
        ('etruria38', '2016-09-24', 'FELIPE OSADO (ENOR)', 'Calle ETRURIA 38 MADRID. Fecha: 09/2016. Distrito 20 - San Blas-Canillejas (Canillejas). Contacto: Mariano Ruano, 605 415 466. Ficha vacia; hay croquis y presupuesto.'),
        ('eusebiomoran10', '2017-04-12', 'PEDRO ARANDA (THYSSEN)', 'Calle EUSEBIO MORAN 10 MADRID. Fecha: 04/2017. Distrito 11 - Carabanchel (Opanel). Ficha vacia; hay croquis.'),
        ('encarnacionoviol45', '2016-05-27', None, 'ENCARNACION OVIOL 45 MADRID. Carpeta SIN ficha de datos: croquis y borrador de escalera (may-jun 2016).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 3. MANIAS
mania('El SATE se pide por LICENCIA en San Blas: avisa de que denegara la DR del SATE (tasas sin pagar y no cumple normativa).', 'Junta Municipal de Distrito de San Blas-Canillejas', '2024-11-25',
      'etruria26-28lucano65 (SATE)', ruta=R('etruria26-28lucano65' + B + 'SATE_no lo van a hacer'),
      cita='LLAMAN DEL AYTO QUE VAN A DENEGAR LA DR DEL SATE POR TASAS NO PAGADAS Y PORQUE NO CUMPLE NORMATIVA, SATE SE PIDE POR LICENCIA EN SAN BLAS.')
mania('SATE: declara ineficaz la licencia y obliga a tramitarlo por Declaracion Responsable (la ECU sostenia que solo podia ir por licencia).', 'Junta Municipal de Distrito de Ciudad Lineal', '2026-06-24',
      'elfo76', clave='elf76', trozo='ineficacia de la licencia')
mania('Proyecto conjunto de fachada: no lo exige si en la zona no hay edificios de las mismas caracteristicas; el SATE, de un color acorde con el entorno.', 'ECU (ACTECU)', '2025-10-01',
      'elfo76', clave='elf76', trozo='proyecto conjunto de fachada')
mania('En Madrid capital hay que tapar todos los aires acondicionados de fachada con una celosia (requerimiento a la licencia; quitarlos vale, pero si alguien denuncia es un problema).', 'Ayuntamiento de Madrid', '2022-08-22',
      'entrearroyos56', clave='ea56', trozo='celosía')
mania('Ascensor en hueco de escalera sin intervenir en ella ni empeorar sus condiciones: solo analiza la normativa de la instalacion del ascensor (se puede mantener un trazado de escalera no acreditado en antecedentes); '
      'el proyecto debe reflejar solo los elementos objeto de intervencion.', 'Ayuntamiento de Madrid, via ECU', '2025-02-18', 'ezequielsolana97', clave='ez97', trozo='huecos de escalera')

resumen()
