# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda I (ibiza3 .. isturiz9, 20 carpetas: toda la I). 7-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de

PU.update(godino='71ab2591-1dac-48b0-b094-12b9c2995bf4', fjvelasco='94b4d0ec-edd7-4038-a58f-0823b287fa8f', aencinas='69dd910c-6468-49e4-90a4-5eeb9133daa7',
          mjdonaire='444e103d-3f02-40af-825e-0eec783d8306', cerezo='7f4218f5-8b8e-45a0-9cba-b2880ccfc4c3', vanesa='05cda534-6907-43b0-b674-53cbe143a278',
          guillermo='2497dcab-bcec-4572-bcc9-4cd4054c6fc8', diego='5a253cf3-33c2-433d-ab56-7eb65aaf2abe', apedraja='61038fa7-f2fa-4dfa-a169-dae52465513c',
          mario_comunia='61e3cc80-44a0-44bd-b57b-3249b5ee4c7f', cristina_afasoner='cfe65b99-2dcf-4af6-9c82-294632e7d3b8')


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto o incompleto."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


def correo_a(puesto, email, principal=False):
    """correo nuevo en un puesto que YA existe (si el correo no esta ya en la agenda)."""
    if not b.leer('correo?select=id&email=ilike.' + quote(email)):
        ins('correo', [{'puesto_id': puesto, 'email': email, 'etiqueta': 'general', 'principal': principal}])


def motivo(n, i, m):
    """anade el motivo a la nota i (la fecha ya la puso partir)."""
    f, t = n[i]; n[i] = (f, t + '\n\n(' + m + ')'); return n


def cid_de(nombre):
    c = b.leer('comunidades?select=id&municipio=eq.MADRID&nombre=eq.' + quote(nombre)); assert len(c) == 1, nombre
    return c[0]['id']


# ================================================================= 0. AGENDA (solo correos nuevos en puestos que ya existen; nada nuevo)
# (en seco, gestion@fincascomunia.com y afasoner@gmail.com ya estan en la tabla correo: correo_a no los repite; solo entra el de Maria Jose)
correo_a(PU['mario_comunia'], 'gestion@fincascomunia.com')       # Comunia (Mario / Nerea): Ibiza 3
correo_a(PU['cristina_afasoner'], 'afasoner@gmail.com')          # Afasoner (Cristina, titular): Iliada 19 y 39
correo_a(PU['mjdonaire'], 'mjdonaire@acayma.com')                # Acayma (Maria Jose Donaire): correo del 04/03/2026, Illescas 36

# ================================================================= 1. PRODUCCION (10 carpetas, 10 oportunidades)
rellenar('ib3', 'IBIZA 3', 'ibiza3', {'fecha_apertura': '2025-05-30', 'referencia_catastral': '2546412VK4724F',
    'origen_notas': 'Fecha de llegada: 05/2025 (dia: la primera nota, 30/05/2025, y el escaneo 3D del mismo dia). Contacta: Sergio Godino (FAIN; 630 125 072); paga el proyecto FAIN. '
                    'Tipo de obra: MODIFICACION DE ASCENSORES: sustituir los dos ascensores por otros mas grandes, invadiendo el patio y la zona de desembarco, con puertas semiautomaticas '
                    '(las subvenciones las tramita la administracion). Barrio: Ibiza. Tecnico: EA Indira/Santiago; ER KGS. Ano 1929. Por ECU (ACTECU): el 21/11/2025 pide "Separata de Patrimonio" '
                    'y "Archivo de Villa". Administracion: COMUNIA ADMINISTRACION DE FINCAS (Mario / Nerea; C/ Fernan Gonzalez 36, 4o dcha., 28009; 620 743 446 / 914 009 995; '
                    'gestion@fincascomunia.com). Presidente: Alvaro Maria Arbaiza Maneru (654 751 687; alarbaiza@hotmail.com). Superficie 32,74 m2. En ago-2026 la comunidad aun no ha '
                    'pagado la tasa ni firmado la HE de la ECU. La ficha no dice comercial interno; la lleva Daniel.'},
    ('modificacion_asc',), n=fijar('ibiza3', 2025), presi=('ALVARO MARIA ARBAIZA MAÑERU', 'presidente', '654751687', '46875160X', 'alarbaiza@hotmail.com'), trae_pu=PU['godino'])

rellenar('il19', 'ILIADA 19', 'iliada19', {'fecha_apertura': '2024-05-07', 'referencia_catastral': '8365711VK4786E',
    'origen_notas': 'Fecha de llegada: 05/2024 (dia: la visita con Javier y Ana Encinas, 07/05/2024). Contacta: Javier Velasco (ELECNOR; 680 967 159); paga la comunidad. '
                    'Tipo de obra: ASCENSOR CON DERRIBO + SUBV (y la IEE: "ASCENSOR + IEE" en la toma de datos). Barrio: Canillejas. Tecnico: Jhonatan. Fecha encargo: 26/02/2025 (HE firmadas por '
                    'la comunidad; falta el numero de cuenta). Ano 1960. LICENCIA por ECU (ACTECU): registrada en el Ayto 12/03/2026, concedida 06/05/2026. Administracion: AFASONER (Cristina; '
                    '91 324 04 69; afasoner@gmail.com; pedidos docs a la CP 28/02). Presidente: Pascual Vicente Vicente (605 941 233). Locales: bar (Jose Antonio, 690 663 768) y nave '
                    '(Juan Luis, 663 423 199); el problema del almacen del bar condiciona la solucion. Subvenciones contratadas 25/02/2025: una presentacion al Ayto y una a la CAM. '
                    'PEM 167.426,55. Visado TL/006879/2026. Superficie 78,63 m2. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones', 'iee'),
    n=fijar('iliada19', 2024, otros={1: ('2025-01-10', 'En la ficha "10/01/2024"; va despues de la visita del 07/05/2024 y antes de la nota del 15/01/2025: errata del ano, es 2025.')}),
    subvencion=trocear2(subv('iliada19'), 2025), presi=('PASCUAL VICENTE VICENTE', 'presidente', '605941233', '70980047T'), trae_pu=PU['fjvelasco'])
pc(OPP['il19'][0]['id'], 'JOSE ANTONIO (LOCAL BAR)', 'otro', '690663768', None, None, 'Local del bar (ficha de Dropbox).')
pc(OPP['il19'][0]['id'], 'JUAN LUIS (LOCAL NAVE)', 'otro', '663423199', None, None, 'Local de la nave (ficha de Dropbox).')

rellenar('il39', 'ILIADA 39', 'iliada39', {'fecha_apertura': '2023-01-19', 'referencia_catastral': '8566604VK4786F',
    'origen_notas': 'Fecha de llegada: 01/2023 (dia: la visita con Ana Encinas, 19/01/2023). Contacta: ELECNOR: Ana Encinas, Javier Velasco y Lucia Davila (antes Alvaro Martin Cicero, '
                    'amartincicero@elecnor.com, tachado). Tipo de obra: ASCENSOR Y PLATAFORMA + CSS (derribo de escaleras; el diseno se mantiene por dentro). Barrio: Canillejas. Tecnico: Julio. '
                    'Fecha encargo: 22/05/2023. Ano 1974. Licencia aprobada por ECU (ACTECU). Jefes de obra: Adrian Donaire (Elecnor) y Maria Martinez Arias (02-02-2026) - no esta en la agenda. '
                    'Administracion: AFASONER (Juan Fco. Garcia Lopez; Ma Jose / Juan Fco para firmas; Av. de Canillejas a Vicalvaro 101, 28022; 913 24 04 69; afasoner@gmail.com). Presidenta: '
                    'Maria Blanca Toral Munoz (637 495 794); sigue siendo presidenta el 22/11/2024. PEM 129.717,92. Visados TL/018111/2023, TL/001646/2026 (CFO) y TL/014790/2026 (EBSS). '
                    'Superficie 71,42 m2. CFO visado enviado 09/02/2026 y DR de funcionamiento 10/02/2026. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'plataforma', 'css'), n=fijar('iliada39', 2023), presi=('MARIA BLANCA TORAL MUÑOZ', 'presidente', '637495794', '51688458Y'), trae_pu=PU['aencinas'])

n36 = partir(_notas_de('illescas36', 2026), 0, 'DANIEL:', '2026-03-10')
n36[0] = ('2026-03-04', n36[0][1] + '\n\n(Correo de Maria Jose Donaire, de Acayma, del 4 de marzo de 2026.)')
n36 = motivo(n36, 1, 'Sin fecha; la propuesta de Daniel para la HE con viabilidad enviada el 10/03/2026.')
rellenar('il36', 'ILLESCAS 36', 'illescas36', {'fecha_apertura': '2026-03-04',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia: el correo de Maria Jose, de Acayma, 04/03/2026). Contacta: Maria Jose Donaire (ACAYMA ASESORES - ABOGADOS ADMIN FINCAS; C/ Camarena 115, '
                    'local 1 dcha., 28047; 915 099 737; comunidades@acayma.com; horario: lunes a jueves de 10 a 14 y de 17 a 19, viernes de 10 a 14; del 15 de junio al 15 de septiembre, '
                    'de lunes a viernes de 10 a 14). Tipo de obra: ACCESIBILIDAD (escaleras de entrada que bajan al portal y suben al ascensor; debajo, los sotanos de un local). Propuesta de Daniel: '
                    'modificar los tramos de escalera y rampa exterior, PEM 40.000 EUR + IVA. HE con viabilidad enviada 10-03-2026, en CCO a Raul Cerezo. Presidenta: Marta (699 199 932); vecino '
                    'jubilado: Candido (656 803 551). El 29/04/2026 el vecino afectado no acepta que se haga nada en su casa. Comercial interno: DANIEL.'},
    ('accesibilidad',), n=n36, adm=PU['mjdonaire'], trae_pu=PU['mjdonaire'])
arreglar_pc(OPP['il36'][0]['id'], 'rol=eq.presidente&nombre=eq.' + quote('MARTA 699 199 932'), {'nombre': 'MARTA', 'telefono': '699199932'})
pc(OPP['il36'][0]['id'], 'CANDIDO', 'vecino', '656803551', None, None, 'Vecino jubilado; puede atender a cualquier hora (correo de Acayma, 04/03/2026).')

rellenar('il70', 'ILLESCAS 70', 'illescas70', {'fecha_apertura': '2023-10-18',
    'origen_notas': 'Fecha de llegada: 10/2023 (dia: la visita, 18/10/2023). Contacta: Raul Cerezo (freelance; trae la opp; "OJO COMISIONES para el"). Tipo de obra: en la ficha "A~~SCENSOR~~ DF, CSS '
                    'Y SUBV (pry ext)": en 2023 se presupuesto el ascensor; en nov-2025 la comunidad tiene un proyecto pagado de UREKA (por la zona de las cocinas) y nos adscribimos a el: '
                    'DF, CSS y subvenciones (y presupuesto aparte por el hueco de la escalera). Barrio: Aluche. Administracion: ACAYMA. Escaneo de Daniel 12/11/2025; presupuesto de obra pedido '
                    'a Rosersese 18/11/2025. HE de CSS, DF y SUBV enviada 18/02/2026 (sin licencia cotizada). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'df', 'css', 'subvenciones'), n=fijar('illescas70', 2023), trae_pu=PU['cerezo'])

rellenar('im32', 'IMAGEN 32', 'imagen32', {'fecha_apertura': '2025-06-11', 'referencia_catastral': '3307607VK4730E',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: la fecha de encargo, 11/06/2025; el fichero de 2023 de la carpeta es una muestra de presupuesto de Rosersese). Contacta: Vanesa (DEL BRIO Y '
                    'BLANCO; vanesa@delbrioyblanco.es; pedidos docs a la CP 13/06/2025). Tipo de obra: SUBVENCIONES DE UN PROYECTO EXTERNO ("infinitas a exito"). Presidente: Pablo Alcazar Arias '
                    '("revisar cuando llegue", en la ficha). La ficha no tiene notas. La ficha no dice comercial interno; la lleva Daniel.'},
    ('subvenciones',), comunidad={'iban': 'ES59 2085 9741 7903 3020 6968'}, trae_pu=PU['vanesa'])

rellenar('im9', 'IMAGEN 9', 'imagen9', {'fecha_apertura': '2026-06-09',
    'origen_notas': 'Fecha de llegada: 06/2026 (dia: el escaneo 3D y la ficha, 09/06/2026). Contacta: Guillermo (DEL BRIO Y BLANCO). Tipo de obra: ASCENSOR. La ficha no tiene notas. '
                    'Comercial interno: ALVARO.'},
    ('ascensor',), adm=PU['guillermo'], trae_pu=PU['guillermo'], captador=ALVARO, lleva=ALVARO)

rellenar('inf3', 'INFIESTO 3', 'infiesto3', {'fecha_apertura': '2025-09-29',
    'origen_notas': 'Fecha de llegada: la ficha dice 10/2025; el correo del despacho de Diego Rojo con la lista de IEE a pasar antes del 31/12/2025 es del 29/09/2025; se toma esa. '
                    'Contacta: Diego Rojo (ROJO JUSDI ADMINISTRACION; C/ Valdecanillas 90, local 1, 28037; 913 750 530 / 625 145 522; admirojojusdi@gmail.com); el correo lo manda Justo Rojo '
                    'Perez (rojoperez@icam.es; 652 819 256); persona de contacto: Alba Pedraja. Tipo de obra: IEE (8 propiedades; es una de las 14 comunidades de la lista). HE enviada 24/10/2025 '
                    'a precio indicado por Daniel. Comercial interno: DANIEL.'},
    ('iee',), n=fijar('infiesto3', 2025, ('2025-09-29', 'Correo de Justo Rojo Perez, del despacho de Diego Rojo, del 29 de septiembre de 2025.')),
    adm=PU['apedraja'], trae_pu=PU['diego'])

# Isturiz 11: dos encargos en dos subcarpetas. A produccion va el SATE (2025-2026, el mas reciente); la accesibilidad (2024) va a la clon.
I11 = cid_de('ISTURIZ 11 MADRID')
FM = pc(I11, 'FERNANDO MORENO', 'vecino', '696671015', None, 'fmorenoper@gmail.com', 'Vecino; contacta en los dos encargos (accesibilidad 2024 y SATE 2025).')
rellenar('is11', 'ISTURIZ 11', 'isturiz11', {'fecha_apertura': '2025-05-08', 'referencia_catastral': '0579208VK4707H', 'quien_persona_comunidad_id': FM, 'persona_comunidad_id': FM,
    'origen_notas': 'Fecha de llegada: la ficha dice 09/2025, pero la primera nota es del 08/05/2025 (llamada con Guillermo); se toma esa. Contacta: el vecino Fernando Moreno (696 671 015; '
                    'fmorenoper@gmail.com); paga la comunidad. Tipo de obra: SATE + SUBV: "Proyecto basico y de ejecucion para rehabilitacion de envolvente termica e instalacion de aerotermia '
                    'y fotovoltaica en edificio residencial existente"; la HE firmada (15/01/2026) incluye la DF y la CSS. Barrio: Cuatro Caminos. Tecnico: Carlos Daza. Por el AYTO (Daniel). '
                    'Administracion: ITACA FINCAS (Fernando Mozos; 91 290 28 38 / 639 181 314). Presidente: Guillermo Garcia-Badell Delibes, arquitecto y vecino (687 892 560; '
                    'guille.gbadell@gmail.com), que revisa el proyecto. PEM 716.969,36. Visados TL/013246/2024 (general) y TL/007831/2026 (SATE). Superficie 498,66 m2. Cuentas: ES58 0182 2970 '
                    '6102 0156 1090 (BBVA) y ES81 0081 0571 9200 0112 6617 (Sabadell, en la ficha de la accesibilidad). El encargo de accesibilidad de 2024 (subcarpeta "accesibilidad") '
                    'esta en la clon. Comercial interno: DANIEL.'},
    ('sate', 'aerotermia', 'fotovoltaica', 'df', 'css', 'subvenciones'),
    n=fijar('isturiz11/sate/FICHA DATOS.docx', 2025, otros={3: ('2026-04-23', 'En la ficha "23/04" sin ano; va entre la HE firmada (15/01/2026) y el proyecto terminado (21/05/2026): 2026.')}),
    comunidad={'iban': 'ES58 0182 2970 6102 0156 1090'}, presi=('GUILLERMO GARCIA-BADELL DELIBES', 'presidente', '687892560', '50876809G', 'guille.gbadell@gmail.com'))
pc(I11, 'TEO (PORTERO)', 'otro', '627913637', None, None, 'Portero de la finca (ficha de la accesibilidad, 2024).')

I9 = cid_de('ISTURIZ 9 MADRID')
AF = pc(I9, 'ANA FERNÁNDEZ', 'vecino', '678717678', None, 'ana.ferlabrujita@hotmail.com', 'Vecina; contacta (ficha de Dropbox, 2026).')
rellenar('is9', 'ISTURIZ 9', 'isturiz9', {'fecha_apertura': '2026-05-05', 'quien_persona_comunidad_id': AF, 'persona_comunidad_id': AF,
    'origen_notas': 'Fecha de llegada: la ficha dice 06/2026 (fecha encargo 08/06/2026), pero el escaneo 3D es del 05/05/2026; se toma esa (los editables de subvenciones de abril son plantilla). '
                    'Contacta: la vecina Ana Fernandez (678 71 76 78; ana.ferlabrujita@hotmail.com); paga la comunidad. Tipo de obra: ASC + SUBV. Tecnico: Angela. Sin administrador '
                    '("No tienen"). CIF E78090404 (con E: comunidad de bienes). Presidente: Victor Alexis Castro Ransan. Proyecto terminado enviado a los interesados y a la ECU (ACTECU) '
                    '11/09/2026; pendiente del OK. Comercial interno: ALVARO.'},
    ('ascensor', 'subvenciones'), n=fijar('isturiz9', 2026), comunidad={'iban': 'ES83 0081 7114 7600 0127 4933'}, captador=ALVARO, lleva=ALVARO)

# ================================================================= 2. CLON
crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
REVS = [
    ('illescas24', '2025-06-24', 'ANA SANTAMARTA (PUERTA FRIA)', None, None,
     'ILLESCAS 24 MADRID. Fecha: 06/2025 (dia: la nota del 24/06/2025). Tipo de obra: SATE Y SUBV CON CESION DE CAES. A traves de Ana Santamarta se sabe que la comunidad valora poner SATE; '
     'se contacta "a puerta fria". Administracion: MARTIN ANTON (administracion@martinanton.com) - no esta en la agenda. Comercial interno: CARLOS.' + CAPTO_CARLOS + '\n\n'
     + crudo('illescas24', 2025)),
    ('imagen18', '2026-06-01', 'NOELIA', None, None,
     'IMAGEN 18 MADRID. Fecha: 06/2026 (dia desconocido; los ficheros, el escaneo 3D, son del 14/09/2026). Tipo de obra: ASCENSOR. Administracion: DEL BRIO Y BLANCO (la ficha no dice '
     'la persona; contacta Noelia, que no esta en la agenda de Del Brio). Contacto de la comunidad: Ricardo, 649 781 634. Hay escaneo 3D. Comercial interno: ALVARO.\n\n'
     'Informe de viabilidad (sin fecha en la ficha):\n' + crudo('imagen18', 2026)),
    ('indias16', '2025-01-20', 'TOÑI CARDENAS (ADMINISTRADORA)', None, None,
     'INDIAS 16 MADRID. Fecha: 01/2025 (dia: el correo de Toni Cardenas, 20/01/2025). Tipo de obra: ASCENSOR, SATE, SUBVENCIONES (pide presupuesto de la consulta urbanistica; se mandan '
     '4 presupuestos el 21/01/2025: ascensor, SATE, subvenciones y proyecto conjunto con descuento). Administradora: Toni Cardenas (en la agenda hay una Toni Cardenas en MARCAL ASESORES, '
     'Leganes; la ficha no dice la administracion). Presidenta: Carmen de Pablo, 616 706 369. Vicepresidente: 911 738 385.\n\n' + crudo('indias16', 2025)),
    ('inmaculada13', '2022-11-18', 'OSCAR LOPEZ (FAIN)', None, None,
     'CALLE DE LA INMACULADA 13 MADRID. Fecha: 11/2022 (dia: la nota del 18/11/2022). Tipo de obra: ASCENSOR. Distrito 11 - Carabanchel (Comillas). La ficha solo tiene esa nota.\n\n'
     + crudo('inmaculada13', 2022)),
    ('Iriarte27', '2018-10-05', 'ANTONIO MIRA (ANYLOR)', None, None,
     'CALLE IRIARTE 27 MADRID. Fecha: 10/2018 (dia: las fotos y el video de la visita, 05/10/2018). Distrito 04 - Salamanca (Guindalera). Ficha vacia (sin tipo de obra); hay fotos, video, '
     'plano actual y propuesta (05-06/10/2018).'),
    ('isladearosa', '2022-10-24', 'RAUL / IBERDROLA', None, None,
     'Calle ISLA DE AROSA MADRID (sin numero en la carpeta ni en la ficha). Fecha: 10/2022 (dia: la nota del 24/10/2022). Tipo de obra: SATE + AEROTERMIA. Distrito 08 - Fuencarral - El Pardo '
     '(Penagrande). En la carpeta solo hay un presupuesto firmado de otra direccion (LUIS VIVES 11 - SALVAESCALERAS, sep-2022).\n\n' + crudo('isladearosa', 2022)),
    ('islamalaita5', '2022-05-01', 'JOSE MARIA GALVEZ (FAIN)', 'H79223921', '8808801VK3880H',
     'CALLE ISLA MALAITA 5 MADRID. Fecha: 05/2022 (dia desconocido; la primera nota dice "Mayo 2022"). Tipo de obra: SUSTITUCION DE DOS ASCENSORES: proyecto (memoria valorada) + CSS + DO. '
     'Distrito 08 - Fuencarral - El Pardo (Penagrande). CP 28035. Tecnico: John / Carla. Jefe de obra: Eusebio Medina. Administracion: Ma Jose Montero (620 550 855; admon2.montero@yahoo.es; '
     'docs a la CP pedidos 15-11-22) - no esta en la agenda. Presidente: Julio Sanchez Gonzalez (33528068W; 63728112, asi en la ficha). PEM 68.698,79. No va visado. Expediente 350/2022/14139 '
     '(DR; NZ 3.2). Superficie 7,44. En la carpeta hay obra: planos de fabricacion de los ascensores (ene-2023), apertura del centro de trabajo y PSS (feb-2023) y fin de obra sin visado '
     '(oct-2023).\n\n' + crudo('islamalaita5', 2022)),
    ('isturiz11 (2024)', '2024-04-26', 'CARLOS PUJOL (SCHINDLER)', 'H28984292', '0579208VK4707H',
     'ISTURIZ 11 MADRID - encargo de ACCESIBILIDAD de 2024 (subcarpeta "accesibilidad"), distinto del SATE de 2025-2026, que es la oportunidad de produccion. Fecha: 04/2024 (dia: la '
     'primera nota, 26/04/2024). Tipo de obra: ACCESIBILIDAD Y SUSTITUCION DE ASCENSORES, DF Y SUBVENCIONES + CSS (bajada a cota cero de las dos escaleras, sin plataformas). Distrito 06 - '
     'Tetuan (Cuatro Caminos). CP 28020. Tecnico: Julio -> Israel. Jefe de obra: Jorge Tirado Sanchez (SCHINDLER). Ano 1965. Fecha inicio obra: 30/10/2025. Administracion: ITACA FINCAS '
     '(Fernando Mozos). Presidente: Guillermo Garcia-Badell Delibes (687 892 560; guille.gbadell@gmail.com). Vecino: Fernando Moreno (696 67 10 15; fmorenoper@gmail.com). Portero: Teo '
     '(627 913 637). Cuentas ES58 0182 2970 6102 0156 1090 (BBVA) y ES81 0081 0571 9200 0112 6617 (Sabadell). Visado TL/013246/2024.\n\n'
     + crudo('isturiz11/accesibilidad/FICHA DATOS TECNICOS.docx', 2024), B.join(['MADRID', 'isturiz11', 'accesibilidad']))]
ALV = {'illescas24': 'Alvaro (capto Carlos)', 'imagen18': 'Alvaro'}
for carp, fecha, trajo, cif, ref, t, *ruta in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, comercial=ALV.get(carp, 'Daniel'), ruta=ruta[0] if ruta else None)
fila('iliada5', '2022-06-14', 'cerrada', 'Perdida: en la ficha, "25/10/2023 TUVIERON EL 25 REUNION DE VECINOS Y HA SALIDO QUE NO POR EL LOCAL".', 'JAVIER (ELECNOR)', None, None,
     'CALLE ILIADA 5 MADRID. Fecha: 06/2022 (dia: la visita con Oscar, 14/06/2022). Tipo de obra: ASCENSOR CON DERRIBO DE ESCALERA. Distrito 20 - San Blas - Canillejas (Canillejas). CP 28022. '
     'Cliente: ELECNOR (Javier Velasco); antes FAIN (Oscar Fernandez), tachados en la ficha. "OJO: SOLO SE PUEDE HACER CON FAIN" (09/03/2023).\n\n' + crudo('iliada5', 2022))
for carp, fecha, trajo, t in [
        ('IGLESIA4', '2019-06-25', None, 'Carpeta "IGLESIA4" SIN ficha de datos: solo un presupuesto y mediciones y su resumen (RTF, 25/06/2019). La carpeta no dice la calle completa.'),
        ('illescas72', '2017-06-20', 'PEDRO ARANDA (THYSSEN)', 'Calle ILLESCAS 72 MADRID. Fecha: 06/2017. Distrito 10 - Latina (Aluche). Ficha vacia; hay croquis y presupuesto (20/06/2017).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 3. MANIAS: ninguna (no hay reglas de organismo con cita en esta tanda)

resumen()
