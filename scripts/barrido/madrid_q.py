# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda Q (quilichao6 .. quintana9, 5 carpetas [0:5]). 7-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de, _lineas

HIFEMAD = 'fcb4dac2-7aaa-441f-844a-df74833f282d'
PU.update(framirez='baf82829-24cc-4faf-9f99-43d797af4728', cristina_rey='7eb785da-3491-4f0f-b5b8-ea0107e55bc7', ofernandez_cega='86273a6d-d0f1-4e29-874e-4aba61764673')
ASC9 = 'quintana9/ascensor/FICHA DATOS TECNICOS.docx'; ATI9 = 'quintana9/atico/FICHA DATOS TECNICOS.docx'


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto o ya no vigente."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


cl = lambda c, a, s=None: J(fijar(c, a, s))

# ================================================================= 0. AGENDA (solo en empresas que ya existen; ninguna administracion ni junta nueva)
persona_nueva('Ana', 'Alfaro', None, '913825687', 'ana.alfaro@hifemad.com', empresa=HIFEMAD,
              notas_='Hifemad: nueva administradora de Quilichao 6 tras fallecer el administrador anterior, Javier Jimenez, en ene-2023 (carpeta quilichao6).')
persona_nueva('Diego A.', 'Virgili', 'Administrador de Fincas', '913825687', 'diego.virgili@hifemad.com', empresa=HIFEMAD,
              notas_='Hifemad: administrador de Quilichao 6 desde junio de 2023 (carpeta quilichao6).')

# ================================================================= 1. PRODUCCION (3 carpetas, 3 oportunidades)
rellenar('qa5', 'QUINCE DE AGOSTO 5', 'quincedeagosto5', {'fecha_apertura': '2026-05-21', 'referencia_catastral': '9811607VK3791B',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: el modelo 3D y la ficha, 21/05/2026). Contacta: el administrador, Fernando Ramirez (Administracion de Fincas Ramirez; 91 528 98 20; '
                    'femar_8596@cafmadrid.es, en la ficha "Femar_8596@cafmadrid.es"). Tipo de obra: ASCENSOR + SATE. En la ficha la calle esta escrita "QUINCE DE AGISTO" (errata). '
                    'Hay modelo 3D. La ficha no tiene notas. Comercial interno: ALVARO.'},
    ('ascensor', 'sate'), adm=PU['framirez'], trae_pu=PU['framirez'], captador=ALVARO, lleva=ALVARO)
rellenar('qa8', 'QUINCE DE AGOSTO 8', 'quincedeagosto8', {'fecha_apertura': '2026-06-29', 'referencia_catastral': '9712710VK3791B',
    'origen_notas': 'Fecha de llegada: 06/2026 (dia: el modelo 3D y la ficha, 29/06/2026). Contacta: "CRISTINA A." (se toma la Cristina de ADMINISTRACIONES REY de la agenda). '
                    'Tipo de obra: INSTALACION ASCENSOR. CP 28026. Administracion: Administraciones Rey C.B. (admonrey@admicove.com). Hay modelo 3D. La ficha no tiene notas. '
                    'Comercial interno: ALVARO.'},
    ('ascensor',), adm=PU['cristina_rey'], trae_pu=PU['cristina_rey'], captador=ALVARO, lleva=ALVARO)
rellenar('q9', 'QUINTANA 9', 'quintana9', {'fecha_apertura': '2024-07-29', 'referencia_catastral': '9356201VK3795E',
    'origen_notas': 'Fecha de llegada: 07/2024 (dia: la primera nota, 29/07/2024; la documentacion de la comunidad es del 23/08/2024). Contacta: Oscar Fernandez (CEGA ASCENSORES; '
                    'o.fernandez@ascensorescega.com). Cliente: CEGA ASCENSORES. Tipo de obra: MODIFICACION ASCENSOR (el 30/10/2024 pasa a ascensor con huida reducida: Patrimonio no deja '
                    'invadir la cubierta). Barrio: Argüelles. Tecnico: Carla => requerimiento, Isra. Fecha encargo: 02/08/2024. Ano 1960. DR por ECU: EICI (las notas y la carpeta la nombran: Sr. Ferri, "RECIBIDO DE EICI", "CONSULTA A EICI"; Monica, 7-oct-2026), presentada '
                    '23-06-2025. '
                    'Constructora: CEGA (departamento de administracion: 682 281 318 / 91 679 30 92; administracion@ascensorescega.com; b.cespedes@ascensorescega.com). En la ficha: "La empresa '
                    'que les contrata es JICAN, nos aportaran presupuesto." En el atico hay una reforma: jefe de obra Carlos Jimenez, de ABATON Arquitectura y Construccion (carlosj@abaton.es; '
                    '660 68 44 84; su companero Egoitz, egoitz.e@abaton.es) - no esta en la agenda; estudio de arquitectura del atico: Camino Alonso (676 53 63 76) - no esta en la agenda. '
                    'Administracion: DOCANDO (Domingo Bueno; 91 504 47 99; domingo.bueno@docando.info). Presidente: Diego Lucini Mateo (3o 6; 50708870B; 646 205 013; '
                    'diegolucini2010@gmail.com). Visado TL/009996/2025. El levantamiento del atico (Estudio de arquitectura Marie Esser, nov-2024) es otro encargo: va a la clon. '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('modificacion_asc',), n=fijar(ASC9, 2024), presi=('DIEGO LUCINI MATEO (3º 6)', 'presidente', '646205013', None, 'diegolucini2010@gmail.com'),
    trae_pu=PU['ofernandez_cega'])
arreglar_pc(OPP['q9'][0]['id'], 'rol=eq.presidente&nombre=eq.' + quote('DIEGO LUCINI MATEO (3º 6)'),
            {'nombre': 'DIEGO LUCINI MATEO', 'notas': 'Piso 3o 6 (en la ficha va pegado al nombre: "DIEGO LUCINI MATEO (3º 6)").'})

# ================================================================= 2. CLON
fila('quilichao6', '2019-07-11', 'abierta', None, 'RUBEN CABACO (FAIN)', 'H79875506', '6206616VK4860E',
     'CALLE QUILICHAO 6 MADRID. Fecha: 07/2019 (la ficha no la trae; dia: los primeros ficheros de trabajo, documentacion de la comunidad y ficha en PDF, 11/07/2019; el compromisoCARTEL.docx '
     'de 2017 es de plantilla). Tipo de obra: INSTALACION DE ASCENSOR (encargo de FAIN; agente comercial Ruben Cabaco). Distrito 16 - Hortaleza. CP 28033. Superficies: planta baja 10 m2, '
     'planta tipo (1o a 5o) 9,00 x 5 = 45 m2; total 55 m2. Proyecto visado TL-015830-2019; requerimientos del Ayuntamiento en 2020 (incidencias 1 y 2); licencia (mar-2021); obra con FAIN '
     '(certificado de inicio firmado 01-04-2022, actas de obra 2022-2023, deflexiones nov-2022); fin de obra visado TL/020030/2023 y TL/020936/2023 (dic-2023; en feb-2024 "NO VALE anexo2 - '
     'sustituir cfo visado incorrecto"). Administracion: "Nos comunican que ha fallecido Javier Jimenez en Enero 2023. Nueva administradora:" HIFEMAD ASESORES S.L (C/ Tunaima 4, local 2; '
     '91 382 56 87): Ana Alfaro (ana.alfaro@hifemad.com) y, desde junio de 2023, Diego A. Virgili, administrador de fincas (diego.virgili@hifemad.com). Proyecto hecho y obra terminada; '
     'no esta en produccion.' + REV)
fila('quincedeagosto7', '2015-11-19', 'abierta', None, 'PEDRO ARANDA (THYSSEN)', 'H81153520', '9711609VK3791B',
     'QUINCE DE AGOSTO 7 MADRID. Fecha: 11/2015 (la ficha no la trae; dia: el primer fichero, el presupuesto quincedeagosto7.doc, 19/11/2015; croquis y render de jul-2016). Tipo de obra: '
     'ASCENSOR (HIDRAULICO; hueco minimo y aplomado 1170 x 950 mm; carga 225 kg / 3 personas; cabina interior 786 x 748 x 2100 mm; puertas Bus/Bsa 700 x 2000 mm semiautomaticas; '
     'foso 1700 mm; RLS 3500 mm hasta los ganchos). Distrito 12 - Usera. APIRU 12.05 Colonia Moscardo. CP 28026. Administracion: AGENCIA JURIDICO INMOBILIARIA "DIME" S.L. '
     '(C/ Pedro Faura 17, Pinto, 28320; 916 912 472; agenciadime2016@gmail.com; contacto: Angela - Javier) - dato antiguo, no esta en la agenda. Fachada 14,80 m. PEM 79.580; residuos 300; '
     '94.700 + IVA. Superficie 41,5 m2. Junta de Usera: tecnico Nuria Valduque; lunes, miercoles y viernes de 9 a 11; C/ Rafael Ibarra 62; negociado de licencias 91 588 72 50. '
     'Expediente 113/2016/3499. Proyecto visado TL-020438-2016 (nov-2016); incidencias y requerimientos del Ayuntamiento en 2017-2018; ultimos ficheros de licencia de mar-2019. '
     'La ficha no tiene notas.' + REV)
fila('quintana9 (atico)', '2024-11-29', 'abierta', None, 'ESTUDIO ARQUITECTURA MARIE ESSER', None, None,
     'QUINTANA 9 - ATICO - MADRID. Fecha: 11/2024 (dia: la nota, 29/11/2024). Encargo aparte del ascensor de la comunidad (que esta en produccion, QUINTANA 9): lo pide el ESTUDIO DE '
     'ARQUITECTURA MARIE ESSER (no esta en la agenda), que lleva la reforma del atico. Tipo de obra: LEVANTAMIENTO DEL ATICO, en planos y en 3D, con entrega de archivo Revit. '
     'En la carpeta, antecedentes (19/12/2024).\n\n' + cl(ATI9, 2024) + REV, ruta=R('quintana9\\atico'))

resumen()
