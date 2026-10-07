# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda M1 (madresplazademayo28 .. marinalavandeira2, 37 carpetas [0:37]). 7-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de, _lineas
from trocear2 import trocear2

PU.update(godino='71ab2591-1dac-48b0-b094-12b9c2995bf4', jvelasco='94b4d0ec-edd7-4038-a58f-0823b287fa8f', juana='58951ea3-d9e8-48fa-ba2b-a58300331760',
          julio='ff071e63-d336-448b-ab50-60c1e9d6a3dc', silvia='6c8e1a7f-999b-4ee9-ac91-cfeb7075dd8c', paz='46e3614d-97fd-40bf-baac-07d9bd5e601f',
          pescalona='62b2404c-cf2c-4c66-bfc5-e7412a379559', olga='ef1332fc-cd83-4b25-9efd-ddca69691dd0', paranda='0a2fcfe0-3f8e-417d-a49e-1de02e8ecd1a')
# Marina Lavandeira 2: el HISTORICO EXPEDIENTE.docx de la carpeta (86 entradas fechadas, 29/08/2017 a 06/07/2023) va a notas de la opp.
# False = solo las notas de la ficha (y el historico se cita en origen_notas).
HISTORICO_A_NOTAS = True


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto (nombre con el piso pegado...)."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


def motivo(n, i, m):
    """anade el motivo a la nota i (la fecha ya la puso partir)."""
    f, t = n[i]; n[i] = (f, t + '\n\n(' + m + ')'); return n


def bloque(c, i, j):
    """lineas i..j (incluidas) de la ficha, sin las vacias."""
    return '\n'.join(l for l in _lineas(c)[i:j + 1] if l.strip()).strip()


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
M56 = 'manresa56/FICHA DATOS TECNICOS.docx'; M56S = 'manresa56/sate/FICHA DATOS TECNICOS.docx'; M2527 = 'manresa25-27/SATE/FICHA DATOS TECNICOS.docx'

# ================================================================= 0. AGENDA
# Junta de Salamanca (distrito 4): sale en la ficha de Maldonado 75 (2016). Sin su tecnico (Francisco Garcia, sin correo: queda en el texto de la clon).
SALAMANCA = junta(4, 'Salamanca', direccion='C/ Velazquez 52, 4a planta', telefono='91 588 64 18 (negociado de licencias)',
                  notas_='Datos de la ficha de Maldonado 75 (2016; carpeta maldonado75).')
# AJEDOS: administracion nueva de Marina Lavandeira 2 (comunidad de produccion); alta como ADMONPATRIMONIOS (madrid_g1) y FINCAS ESPINOSA (madrid_l2).
AJEDOS = (b.leer('empresa?select=id&nombre_accesalia=eq.' + quote('ASESORIA JURIDICA Y DE EMPRESA AJEDOS')) or [{'id': None}])[0]['id']
if not AJEDOS:
    AJEDOS = nuevo_id()
    ins('empresa', [{'id': AJEDOS, 'nombre_accesalia': 'ASESORIA JURIDICA Y DE EMPRESA AJEDOS', 'nombre_legal': 'ASESORIA JURIDICA Y DE EMPRESA AJEDOS SL',
                     'tipo': 'administracion_fincas', 'activa': True, 'comercial_id': DANIEL, 'direccion': 'Cl. Oca 110, 1o Izq. 28025 Madrid',
                     'telefono': '91 466 31 99 (ext. 1) / 615 09 37 22',
                     'notas': 'Alta en el barrido de Madrid (Marina Lavandeira 2; carpeta marinalavandeira2). En la ficha tambien "ASESORIA JURIDICA Y DE EMPRESA DOS SL". '
                              'Administrador colegiado n. 10.943 y 11.399. Dpto. Fincas: Pedro Carrascoso Jimenez, Ricardo Carrascoso Jimenez y Susana Rodriguez Jimenez; antes Miguel Belmonte. '
                              'Horario: de lunes a viernes de 9:30 a 14:00, martes y jueves de 16:00 a 18:00; agosto solo mananas (9:30 a 14:00).'}])
    ins('correo', [{'empresa_id': AJEDOS, 'email': 'administradoresajedos@aje-oca.com', 'etiqueta': 'general', 'principal': True}])
PCARRASCOSO = persona_nueva('Pedro', 'Carrascoso Jiménez', 'Dpto. Fincas', '678625807', None, empresa=AJEDOS,
                            notas_='AJEDOS: administrador de Marina Lavandeira 2 (carpeta marinalavandeira2; 91 466 31 99 / 678 625 807).')
persona_nueva('Miguel', 'Belmonte', 'Dpto. Fincas', None, 'miguelangelbelmonte@aje-oca.com', empresa=AJEDOS,
              notas_='AJEDOS: primer contacto de Marina Lavandeira 2 (2017; carpeta marinalavandeira2).')

# ================================================================= 1. PRODUCCION (13 carpetas, 13 oportunidades)
rellenar('mpm28', 'MADRES PLAZA DE MAYO 28', 'madresplazademayo28', {'fecha_apertura': '2026-05-11',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: el modelo 3D y la foto de WhatsApp, 11/05/2026). Contacta: la ficha dice "NO LO SE". Tipo de obra: ASCENSOR CON DERRIBO (derribo completo '
                    'de la escalera y del muro de escalera a la calle, escalera helicoidal nueva, ascensor de 4-5 personas, modificacion completa de contadores; 220.000 + IVA). '
                    'HE enviada a Carlos S el 18-05-26. En la ficha: comercial interno CARLOS S (Carlos Sepulveda, no es Carlos Garcia); la lleva Daniel.'},
    ('ascensor',), n=fijar('madresplazademayo28', 2026, ('2026-05-18', 'Sin fecha; la propuesta de Daniel que va con la HE enviada el 18-05-26.')))

n33 = partir(_notas_de('maldonado33', 2022), 0, '---------- Forwarded', '2026-01-13')
PARTE_2022 = n33[0][1]; n33 = motivo(n33[1:], 0, 'Correo de Sergio Godino (FAIN) del 13 de enero de 2026; delante, en la misma nota de la ficha, lo del informe de 2022 (va a la clon).')
rellenar('mal33', 'MALDONADO 33', 'maldonado33', {'fecha_apertura': '2026-01-13', 'referencia_catastral': '2363309VK4726C',
    'origen_notas': 'Encargo de 2026 (la ficha es la del de 2022, que va a la clon como "maldonado33 (2022)"). Fecha: el correo de Sergio Godino (FAIN) del 13/01/2026. Contacta: Sergio Godino (FAIN). '
                    'Tipo de obra: INFORME DE FOSO REDUCIDO del ascensor de servicio (acta del OCA con el defecto K23G; se adjunta el informe que se hizo en 2022 para el ascensor principal). '
                    'HE enviada 22/01/2026 y recibida firmada 26/01/2026. Tecnico (ficha, 2022): Daniel -> Carlos Daza. En la carpeta: el informe de foso reducido 2026 firmado (20/03/2026) y '
                    'modelos 3D de los ascensores principal y de servicio (mar-2026). La ficha no dice comercial interno; la lleva Daniel.'},
    ('informe_tecnico',), n=n33, trae_pu=PU['godino'])

n = partir(partir(_notas_de(M2527, 2022), 1, '---------- Forwarded', '2026-06-16'), 0, 'ENERO 2024', '2024-01-01')
n[0] = ('2022-02-01', n[0][1]); n = motivo(n, 0, 'Sin fecha; se toma la fecha de encargo de la ficha (01/02/2022).')
n = motivo(n, 1, 'Dia desconocido: "ENERO 2024".')
n = motivo(n, 3, 'Correo de Jose Luis Lopez Delgado (arquitecto, COAM 4.926) del 16 de junio de 2026, pegado en la ficha debajo de la nota del 18/02/2026.')
assert all(f for f, t in n)
rellenar('mr2527', 'MANRESA 25-27', 'manresa25-27', {'fecha_apertura': '2021-12-01', 'referencia_catastral': '1427910VK4812G',
    'origen_notas': 'Fecha de llegada: la ficha (subcarpeta SATE) dice 02/2022 y fecha de encargo 01/02/2022; el primer fichero es la oferta de SATE para el edificio ("ficha sate MANRESA 25 27", '
                    '01/12/2021: SATE de 10 cm y losa filtrante en cubierta, 126.000 + IVA); se toma esa. Cliente: la CDAD; contacto: Javier Velasco (ELECNOR); antes Ibai Calonge, tachado. '
                    'Tipo de obra: SATE + FV + SUBVENCION (propuesta condicionada a la subvencion; en ene-2024 se quita la fotovoltaica). Barrio: Valverde. Tecnico: Carla; mediciones: Jonatan. '
                    'Presupuesto firmado 18-02-2022. Ref. catastral: 1427910VK4812G (25) y 1427911VK4812G (27). Administracion: QUEVARU ASOCIADOS S.L. (David de Tapia; C/ Anastasia Lopez 1; '
                    '91 734 82 04; quevaru@gmail.com). Presidente: Martin Medina Gamez (n. 25, 4o A; 02881822Z; 669 363 245). Junta de Fuencarral: tecnico Luis Rodelgo; Antonio Navas '
                    '(91 480 06 14 / 91 588 68 54); tecnifuencarral@madrid.es. PEM 123.740,13. Visados TL-005946-2022 (proyecto) y TL/001585/2024. Expediente 108/2022/03391 (DECLARACION responsable). '
                    'Superficie 19,11. Subvencion: la tramitacion la hizo Renovae; en ene-2024 se prepara el cambio de representante a Accesalia (NG). En feb-2026 la comunidad renuncia a la obra '
                    '(renuncia a la DR registrada el 20-02-2026; confirmada por el Ayto en abr-2026) y en jun-2026 se da la venia a otro arquitecto. La ficha no dice comercial interno; la lleva Daniel.'},
    ('sate', 'fotovoltaica', 'subvenciones'), n=n, comunidad={'iban': 'ES07 2100 2886 4013 0037 5871'}, trae_pu=PU['jvelasco'],
    presi=('Martín Medina Gámez', 'presidente', '669363245', '02881822Z', 'martinmedina18169@gmail.com'),
    huecos=['[REVISAR EN FACTURACION] Proyecto de SATE hecho y visado (TL-005946-2022; TL/001585/2024) y DR registrada; la comunidad no hace la obra: el 18/02/2026 el administrador pide '
            'la devolucion del ICIO, el 20/02/2026 se registra la renuncia a la DR y el 18/06/2026 Daniel da la venia a otro arquitecto (Jose Luis Lopez Delgado). '
            'No se cierra: revisar en facturacion lo cobrado y lo pendiente.'])
arreglar_pc(OPP['mr2527'][0]['id'], 'rol=eq.presidente&nombre=eq.' + quote('Martín Medina Gámez (Nº 25 4º-A)'),
            {'nombre': 'MARTÍN MEDINA GÁMEZ', 'notas': 'Vive en el n. 25, 4o A (en la ficha, pegado al nombre: "(No 25 4o-A)").'})

rellenar('mr52', 'MANRESA 52', 'manresa52', {'fecha_apertura': '2025-09-30',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia: la HE enviada, 30/09/2025, que es tambien la fecha del fichero de la ficha). Contacta: Juan Manuel Morcilo (jmmorcilo@activagf.es), en el bloque del '
                    'administrador; el nombre de la administracion no esta en la ficha ni en la agenda. Tipo de obra: EFICIENCIA ENERGETICA FACHADA Y TEJADO, ASCENSOR + SUB (presupuesto de un SATE '
                    'normal y del proyecto, mas la tramitacion de subvenciones y la cesion de CAES). CP 28034. Comercial interno: DANIEL.'},
    ('sate', 'ascensor', 'subvenciones', 'caes'), n=fijar('manresa52', 2025, ('2025-09-30', 'Sin fecha; la propuesta de Daniel para la HE enviada el 30/09/2025.')))

# Manresa 56: dos encargos. El ascensor (FAIN, 2022, hecho; en 2026 se justifican subvenciones) va a la clon "manresa56 (2022)"; la opp es el del SATE de Elecnor (2022) que en 2026
# queda en "solo cubierta + subv" (como Corral de Cantos 19: el vivo/reciente en produccion). Duda para Monica.
n = partir(_notas_de(M56S, 2022), 0, '---------- Forwarded', '2026-02-24')
assert n[0][1].replace('\n', ' ').strip() == '25/04/2022 2026', n[0]
n = motivo(n[1:], 0, 'Correo de Andrea Diaz Serrano (Elecnor) del 24 de febrero de 2026, pegado en la ficha debajo de "25/04/2022" y "2026".')
rellenar('mr56', 'MANRESA 56', 'manresa56', {'fecha_apertura': '2022-04-25', 'referencia_catastral': '12298K9VK4812G',
    'origen_notas': 'Ficha de la subcarpeta "sate". Fecha de llegada: la ficha dice 05/2022; la primera nota es solo la fecha 25/04/2022 (sin texto; debajo, "2026"); se toma esa. '
                    'Contacta: ELECNOR: Andrea (Andrea Diaz Serrano, 2026); antes Ibai, tachado. Tipo de obra: SATE, tachado -> SOLO CUBIERTA + SUBV (2026): rehabilitacion de la cubierta '
                    '(retirada de uralita), obra de 44.666,50 sin IVA, 10 vecinos; servicios pedidos: proyecto basico y de ejecucion, DO y CFO, CSS, CEE inicial y final, IEE, libro del edificio '
                    'y gestion de subvenciones. HE enviada 24/02/2026 con el precio de Daniel (documentacion tecnica, no proyecto). En la subcarpeta, una incidencia del administrador de may-2023. '
                    'Administracion: QUEVARU ASOCIADOS S.L. (David de Tapia). Presidenta: Ma Carmen Camacho Rodriguez (02630144W); antes Jesus Vidal Roman (50176489B), tachado. '
                    'El ascensor de FAIN (2022, hecho) esta en la clon como "manresa56 (2022)". La ficha no dice comercial interno; la lleva Daniel.'},
    ('arreglo_cubierta', 'subvenciones'), n=n, comunidad={'iban': 'ES17 2100 2886 4113 0054 0833'}, trae_pu=PU['andrea'])

rellenar('maq82', 'MAQUEDA 82', 'maqueda82', {'fecha_apertura': '2026-02-06',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: el correo de ACAYMA del 06/02/2026). Contacta: ACAYMA ASESORES (Juana Gonzalez Martin; 91 509 97 37; comunidades@acayma.com), con copia a '
                    'Miguel DS, Monica Jimenez, Juanra Jimenez Ruiz y Fermin Riego. Tipo de obra: SUBV PRY EXT ASC (subvenciones de un proyecto externo de ascensor). HE enviada 11-02-2026. '
                    'Comercial interno: DANIEL.'},
    ('subvenciones',), n=fijar('maqueda82', 2026, ('2026-02-06', 'Correo de ACAYMA (comunidades@acayma.com) del 6 de febrero de 2026.')), adm=PU['juana'], trae_pu=PU['juana'])

rellenar('mrv45', 'MARCELINO ROA VAZQUEZ 45', 'marcelinoroavazquez45', {'fecha_apertura': '2025-02-18', 'referencia_catastral': '5757202VK4755H',
    'origen_notas': 'Fecha de llegada: 02/2025 (dia: la primera nota, 18/02/2025: viene de Julio, de Envoltermia). Contacta: Rebeca, vecina (660 955 038), de parte de Julio Garcia (ENVOLTERMIA, '
                    'ex TKE; jgarcia@envoltermia.com): "independiente tener detalle con Julio". Paga: la CP. Tipo de obra: ASCENSOR Y PLATAFORMA + CSS + SUBVENCIONES. Tecnico: Israel. '
                    'Fecha encargo: 22/04/2025 (HE firmada; cobrar la CSS cuando se firme el plan de seguridad y salud). Ano 1970. DR por ECU (ACTECU). Administracion: ALSER FINCAS (Jose Miguel; '
                    'C. de Bravo Murillo 21; 914 47 56 13, L a V de 9:30 a 14:30; WhatsApp 695 93 49 79, "es mas rapido en contestar por whatsapp que por correo"; info@alserfincas.com); poner '
                    'en copia de todo a Rebeca. Presidenta: Rebeca Lahoya Cuende (71340945M; 660 95 50 38; rebeca.lahoya@hotmail.com). Contactos: Rebeca Lahoya, Cesar Seijo '
                    '(seticesar@gmail.com) y David Hernandez; Ivan, del local GNOSIS bajo el portal (620 563 194). PEM 115.677,20. Visado TL/006246/2026. Superficie 82,45. DR registrada '
                    '24/04/2026; proyecto visado enviado 18/05/2026; pendiente la fecha de inicio de obra. Simulacion de financiacion con UCI (feb-2026). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'plataforma', 'css', 'subvenciones'), n=fijar('marcelinoroavazquez45', 2025), comunidad={'iban': 'ES96 0081 4149 6100 0125 7232'},
    presi=('REBECA LAHOYA CUENDE', 'presidente', '660955038', '71340945M', 'rebeca.lahoya@hotmail.com'), trae_pu=PU['julio'])
cmr = OPP['mrv45'][0]['id']
pc(cmr, 'CESAR SEIJO', 'otro', None, None, 'seticesar@gmail.com', 'Persona de contacto de la comunidad (con Rebeca Lahoya y David Hernandez; ficha 2025).')
pc(cmr, 'DAVID HERNANDEZ', 'otro', None, None, None, 'Persona de contacto de la comunidad (con Rebeca Lahoya y Cesar Seijo; ficha 2025).')
pc(cmr, 'IVAN (LOCAL GNOSIS)', 'otro', '620563194', None, None, 'Del local GNOSIS, debajo del portal: "es quien alquila" (ficha 2025).')

rellenar('mo16', 'MARCOS DE ORUETA 16', 'marcosdeorueta16', {'fecha_apertura': '2026-06-01',
    'origen_notas': 'Fecha de llegada: 06/2026 (dia desconocido; el modelo 3D y la ficha son del 01/07/2026). Contacta: Silvia (ARRIALSI). Tipo de obra: ASCENSOR Y SATE. CP 28034. '
                    'Administracion: ARRIALSI. La ficha no tiene notas. Comercial interno: ALVARO.'},
    ('ascensor', 'sate'), adm=PU['silvia'], trae_pu=PU['silvia'], captador=ALVARO, lleva=ALVARO)

rellenar('mda11', 'MAR DE ARAL 11', 'mardearal11', {'fecha_apertura': '2026-06-18',
    'origen_notas': 'Fecha de llegada: 06/2026 (dia: el modelo 3D y la ficha, 18/06/2026). La ficha solo trae la fecha y el comercial: ni contacto, ni tipo de obra, ni notas; hay modelo 3D y una foto. '
                    'Comercial interno: ALVARO.'},
    (), captador=ALVARO, lleva=ALVARO)

rellenar('mar5', 'MARIANISTAS 5', 'marianistas5', {'fecha_apertura': '2026-01-13',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: la nota y el IEE de la carpeta, 13/01/2026). Contacta: la ficha no lo dice; administracion: PAZ (CIUDADELA). Tipo de obra: SATE. En la carpeta, '
                    'el IEE desfavorable del 30-12-2024. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('sate',), n=fijar('marianistas5', 2026, otros={0: ('2026-01-13', 'En la ficha "13/01/2025": errata del ano, es 2026 (la ficha es de 01/2026 y el IEE se guardo en la carpeta el 13/01/2026).')}),
    adm=PU['paz'], captador=CARLOS, lleva=ALVARO)

rellenar('mp25', 'MARIA PEDRAZA 25', 'mariapedraza25', {'fecha_apertura': '2026-01-08', 'referencia_catastral': '9984610VK3798D',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: el correo de Pedro Escalona del 08/01/2026). Contacta: Pedro Escalona (DEL BRIO Y BLANCO; 680 503 243; pedro@delbrioyblanco.es): la junta de '
                    'gobierno quiere la subvencion para aislar el tejado de uralita y un posible SATE. Tipo de obra: SATE + SUBV (proyecto basico y de ejecucion de rehabilitacion de la envolvente '
                    'termica). Barrio: Bellas Vistas. Tecnico: Carlos Daza. Fecha encargo: 06/03/2026. Presidente: Roberto Ruiz Mena (46869648H; 679 398 162; robertoruizmena@gmail.com). '
                    'PEM 74.885,00. Superficie 59,16. Tramitacion por ECU (ACTECU): proyecto enviado 23/07/2026; hoja de encargo de la ECU firmada y tasa pagada 18/09/2026; requerimiento, ICIO y '
                    'aval 25/09/2026, pagados 30/09/2026. En la carpeta, ficheros de trabajo de certificado energetico de 2022-2024 copiados de una plantilla (no cuentan para la fecha). '
                    'Comercial interno: ALVARO.'},
    ('sate', 'subvenciones'), n=fijar('mariapedraza25', 2026, otros={0: ('2026-01-08', 'Correo de Pedro Escalona (Del Brio y Blanco) del 8 de enero de 2026.'),
                                                                     1: ('2026-01-16', 'En la ficha "16/01/2025": errata del ano, es 2026 (va despues del correo del 08/01/2026 y la ficha es de 01/2026).')}),
    comunidad={'iban': 'ES35 0081 7125 9100 0181 8682'}, presi=('ROBERTO RUIZ MENA', 'presidente', '679398162', '46869648H', 'robertoruizmena@gmail.com'),
    trae_pu=PU['pescalona'], captador=ALVARO, lleva=ALVARO)

rellenar('mts34', 'MARIA TERESA SAENZ DE HEREDIA 34', 'mariateresasaenzdeheredia34', {'fecha_apertura': '2025-12-30',
    'origen_notas': 'Fecha de llegada: 12/2025 (dia: el modelo 3D, 30/12/2025; el .skb y la plantilla de oct-2025 no cuentan). Contacta: Olga (JIMECO; 611 383 164; administracion@jimeco.es). '
                    'Paga: la CP. Tipo de obra: la ficha no lo dice (nota: ancho de escalera 2,43, 180 grados). HE enviada 8/1/2026. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    (), n=fijar('mariateresasaenzdeheredia34', 2025, ('2026-01-08', 'La fecha va dentro de la nota: "HE enviada 8/1/2026".')), adm=PU['olga'], trae_pu=PU['olga'],
    captador=CARLOS, lleva=ALVARO)

n = [('2023-07-13', bloque('marinalavandeira2', 125, 125)),
     ('2024-01-17', bloque('marinalavandeira2', 128, 146) + '\n\n(Correo de Pedro Aranda (TKE) del 17 de enero de 2024.)')]
if HISTORICO_A_NOTAS:
    from leer_fichas import texto_del_docx
    from notas_de_ficha import D as _D
    h = trocear2('\n'.join(texto_del_docx(os.path.join(_D, 'marinalavandeira2', 'HISTORICO EXPEDIENTE.docx'))), 2017)
    assert len(h) == 86 and all(f for f, t in h), len(h)
    n = sorted([(f, t + '\n\n(Del HISTORICO EXPEDIENTE.docx de la carpeta.)') for f, t in h] + n, key=lambda x: x[0])
rellenar('ml2', 'MARINA LAVANDEIRA 2', 'marinalavandeira2', {'fecha_apertura': '2017-03-21', 'referencia_catastral': '7211307VK3771A',
    'origen_notas': 'Fecha de llegada: la ficha dice 21/03/2017 (los primeros ficheros, croquis, plano y presupuesto, son del 29/03/2017). Contacta: Pedro Aranda (THYSSEN). '
                    'Tipo de obra: la ficha no lo dice; por la carpeta y su HISTORICO EXPEDIENTE: ASCENSOR con CONSULTA URBANISTICA especial (escalera curva; registrada 03/10/2017, denegada '
                    '06/03/2019) y despues ascensor por el exterior con ocupacion de la via publica (licencia solicitada 24/09/2019, expediente 111/2019/05608; seis requerimientos; mesa de ascensores; '
                    'licencia concedida, notificacion recibida 13-07-2023; prorroga pedida 24-06-2024). Subvencion solicitada en nov-2017. Administracion: ASESORIA JURIDICA Y DE EMPRESA AJEDOS SL '
                    '(Pedro Carrascoso; antes Miguel Belmonte; 91 466 31 99 / 678 625 807; administradoresajedos@aje-oca.com). Vecino interesado: Vicente Lopez (soyvicentelopez@gmail.com). '
                    'Tecnica del Ayto: Ana Ferrero. PEM 105.798 (residuos 300); total 125.900. Fachada 23,15. NZ4. En ene-2024 Thyssen avisa de que no ha enviado documentacion ni dado la venia '
                    'a ninguna empresa. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'consulta_urbanistica'), n=n, comunidad={'cif_comunidad': 'H79667325'}, trae_pu=PU['paranda'])
pc(OPP['ml2'][0]['id'], 'VICENTE LOPEZ', 'vecino', None, None, 'soyvicentelopez@gmail.com', 'Vecino interesado (ficha).')
admin(OPP['ml2'][0]['id'], PCARRASCOSO)

# ================================================================= 2. CLON
FICHA_ML15 = bloque('ManuelLaborda15-Carmelitas22', 28, 71)
REVS = [
    ('maldonado33 (2022)', '2022-01-28', 'SERGIO GODINO (FAIN)', 'H79121471', '2363309VK4726C',
     'CALLE MALDONADO 33 MADRID. Encargo de 2022 (el de 2026, foso reducido del ascensor de servicio, esta en produccion). Fecha: 01/2022 (dia: la fecha de encargo, 28/01/2022). '
     'Tipo de obra: INFORME DE FOSO REDUCIDO del ascensor principal (inspeccion periodica desfavorable; FAIN pide un informe que justifique el foso existente, 650 mm, para pedir a Industria '
     'la exencion de norma). Distrito: SALAMANCA. CP 28006. Tecnico: Daniel -> Carlos Daza. En la carpeta: informacion de FAIN (feb-2022: informe de espacio extremo inferior no conforme, '
     'RAE 503216-2021) y la memoria de foso reducido firmada (25/03/2022).\n\nLo escrito en la ficha (sin fecha):\n' + PARTE_2022, R('maldonado33')),
    ('maldonado75', '2015-12-14', 'FELIPE OSADO (ENOR -> ELECNOR)', 'H79487039', '2963208VK4726D',
     'CALLE MALDONADO 75 MADRID. Fecha: 14/12/2015 (la de la ficha; los primeros ficheros, croquis y oferta de Enor 21M.0904, son de ene-feb 2016). Tipo de obra: ASCENSOR (por un patio; '
     'escalera con peldanos compensados en el desembarque). Distrito 04 Salamanca. CP 28006. NZ1 grado 3. Administracion: efebe administracion de fincas (Sandra Rincon; 979 70 05 78; '
     'efebe@efebe.com; Fernando Blanco, fernando@efebe.com) - no esta en la agenda. Contacto: Mercedes, 5o (639 981 188; gonzalezfontm@gmail.com). Presidente (a mayo 2023): Oscar Sevillano '
     'Fernandez (04845051D). Fachada 7,20. PEM 82.494,96 (residuos 300). Superficie 57,10 m2. En la carpeta: proyecto (nov-2016), presupuestos firmados (ene-abr 2022), apertura del centro de '
     'trabajo, fin de obra visado TL/014493/2023 (sep-2023) y una nota "facturar": "total 4000 con css incluida; cobrado ya 1000+1400; falta facturar 1600" (27/07/2023).\n\n'
     'Lo escrito en las NOTAS de la ficha (sin fechas):\n' + bloque('maldonado75', 75, 126), None),
    ('mancomunidad fortunata y jacinta31-orense43-pedroteixeira5', '2023-10-01', 'JAVIER VELASCO (ELECNOR)', None, None,
     'MANCOMUNIDAD FORTUNATA Y JACINTA 31, ORENSE 43, PEDRO TEIXEIRA 5 MADRID. Fecha: 10/2023 (dia desconocido). Tipo de obra: SATE Y NEXT GEN. Distrito 06 - Tetuan (Cuatro Caminos). '
     'CP 28020. La carpeta solo tiene la ficha.\n\n' + crudo('mancomunidad fortunata y jacinta31-orense43-pedroteixeira5', 2023), None),
    ('manojoderosas57', '2021-05-18', 'JUAN ANTONIO ALVAREZ (FAIN)', 'H78673134', None,
     'C/ LA DEL MANOJO DE ROSAS 57 MADRID. Fecha: 18/05/2021 (la de la ficha). Tipo de obra: MODERNIZACION (del ascensor). CP 28041. Administrador: Jose Luis Arranz Arranz '
     '(arranzarranz@gmail.com) - no esta en la agenda. En la ficha: "Cobrar 1200". En la carpeta: fotos (jul-2021), memoria valorada y planos (jul-oct 2021), declaracion responsable '
     'registrada (14/10/2021) y licencia complementaria con su tasa pagada (abr-2022).', None),
    ('manresa17-19', '2022-05-04', 'IBAI CALONGE (ELECNOR)', 'H79612396', '1427914VK4812G (17) 1427915VK4812G (19)',
     'CALLE MANRESA 17-19 MADRID. Fecha: 05/2022 (dia: la primera nota, 04/05/2022). Tipo de obra: SUBV MEJORA EFICIENCIA ENERGETICA (proyecto de otro arquitecto, visado en 2019; licencia '
     'solicitada 22/07/2019 y concedida; Elecnor propone que Daniel termine la direccion de obra y emita el fin de obra para no perder la subvencion; HE enviada el 13 de septiembre a Daniel '
     'Navarro e Ibai, aceptada). Distrito Fuencarral. CP 28034. Administracion: QUEVARU ASOCIADOS (David de Tapia; 91 734 82 04; quevaru@gmail.com). Presidente: Jose Bienvenido Bernal '
     'Montejo (07814384L; 626 340 662; josbermon@hotmail.com). Gestion de subvenciones: Oscar Martin Perez (678 05 52 53; oscarmarper@gmail.com). Contacto: Francisco Maranon Perez '
     '(607 118 331; Curro2007@outlook.com). Cuenta: ES09 0081 7116 6200 0123 2328. Jefe de obra: Rocio Ulloa. Visado TL/013966/2023 (direccion de obra y CFO). En la carpeta: subvencion de la '
     'CAM NG 2022 concedida (requerimientos y justificacion hasta nov-2025, con contratos de financiacion) y subvenciones del Ayto 2025-2026 (Transforma 2026; ficheros hasta jun-2026).\n\n'
     + crudo('manresa17-19', 2022), None),
    ('manresa33-35', '2023-03-15', 'TOMAS MORELL (ELECNOR)', None, None,
     'MANRESA 33-35 MADRID. Fecha: 03/2023 (dia: la nota del 15/03/2023). Tipo de obra: 2 ASCENSORES + CSS + SUBV. Distrito Fuencarral-El Pardo. CP 28034. La carpeta solo tiene la ficha.\n\n'
     + crudo('manresa33-35', 2023), None),
    ('manresa56 (2022)', '2022-01-17', 'JOSE MARIA GALVEZ / JUAN PARAMIO (FAIN)', 'H79675328', '12298K9VK4812G',
     'CALLE MANRESA 56 MADRID. Encargo del ASCENSOR (la opp de produccion es la del SATE / cubierta de Elecnor, subcarpeta "sate"). Fecha: 01/2022 (dia: la fecha de encargo, 17/01/2022, '
     'la del "mail de encargo"). Tipo de obra: ASCENSOR: los anteriores arquitectos (Diana Hernando Navarro, estudiobher; 651 478 886; arquitectos@estudiobher.com) solo habian hecho el '
     'proyecto basico; HE de proyecto basico y de ejecucion a FAIN (23/02/2023) y direccion de obra; proyecto de ejecucion en Simetria (Susana, 03/2023). Distrito Fuencarral. CP 28034. '
     'Administracion: QUEVARU ASOCIADOS (David de Tapia). Presidenta: Ma Carmen Camacho Rodriguez (02630144W); antes Jesus Vidal Roman, tachado. Jefes de obra: Cristian Rodriguez y Abel; '
     'obra empezada 23/09/22. PEM 345.865,61 (memoria) / 345.885,60 (presupuesto). Visados TL/002760/2023 (DO), TL/006650/2023, TL/008511/2023 (proyecto de ejecucion en Simetria) y '
     'TL/004956/2024 (CFO del ascensor). Expediente 108/2019/05292. Superficie construida afectada 97,8 m2; fachadas 613 m2; cubierta 173 m2. En la carpeta "ascensor terminado": licencia '
     '(jul-2022), actas de obra (2022-2024), fin de obra y justificacion de subvenciones (Ayto 2024, RH 2026 y Transforma 2026; facturas hasta jul-2026).\n\n' + crudo(M56, 2022), R('manresa56')),
    ('manuellaborda11', '2022-11-04', 'JULIA REDONDO', None, None,
     'MANUEL LABORDA 11 MADRID. Fecha: 11/2022 (dia: la nota del 04/11/22). Tipo de obra: CAMBIO LOCAL A VIVIENDA. Distrito Villaverde. CP 28021. La carpeta solo tiene la ficha.\n\n'
     + crudo('manuellaborda11', 2022), None),
    ('ManuelLaborda15-Carmelitas22', '2019-12-02', 'PEDRO SANCHO (ASERPEMAR)', 'H79966685 (Carmelitas 22) / H79500757 (Manuel Laborda 15)', None,
     'MANUEL LABORDA 15 y CARMELITAS 22 MADRID. Fecha: la ficha no la trae; el primer fichero es un documento escaneado del 02/12/2019 (incidencia 1, contestada al Ayto el 27/12/2019); '
     'se toma esa. Contacta: "Pedro impe"; paga la CP. Tipo de obra: IMPERMEABILIZACION. Distrito Villaverde. CP 28021. Dos comunidades: CDAD PROP CL CARMELITAS N 22 y CDAD PROP CL MANUEL '
     'LABORDA 15. En la carpeta: presupuesto de Pedro (ene-2020), declaracion responsable con tasas pagadas (feb-2020), orden de abstencion con requerimiento 112-20-836 y escrito de aplazamiento '
     '(jul-2020) y las incidencias 3 a 7 (2021-2022: requerimientos, recurso de reposicion y una tasa en via ejecutiva, pagada el 14/06/2022). La ficha no tiene notas.\n\n'
     'Lo escrito en la ficha:\n' + FICHA_ML15, None),
    ('manuelmariaiglesias2', '2021-09-30', 'DANIEL (SCHINDLER)', None, None,
     'C/ MANUEL MARIA IGLESIAS 2 MADRID. Fecha: 30/09/2021 (la de la ficha). Tipo de obra: RAMPAS PORTALES (tres escaleras). La ficha no tiene mas datos; en la carpeta, croquis de las tres '
     'rampas, videos de las escaleras y un plano tipo (08/10/2021). En la agenda, en SCHINDLER, hay un Daniel Diaz.', None),
    ('manuelnoya27', '2024-09-04', 'MARINA, VECINA (DE PARTE DE JAVIER GONZALEZ MOYA, SCHINDLER)', None, None,
     'MANUEL NOYA 27 MADRID. Fecha: 09/2024 (dia: la primera nota, 04/09/2024). Contacta: Marina, vecina (607 31 27 15; malonso@icam.es), de parte de Javier Gonzalez Moya (SCHINDLER). '
     'Tipo de obra: ASCENSOR POR DENTRO (con derribo); en nov-2024 piden tambien SATE: HE con todo (ascensor, SATE y subvencion a exito). Distrito Usera. CP 28026.\n\n'
     + crudo('manuelnoya27', 2024), None),
    ('maqueda105', '2025-02-24', 'ACAYMA + RAUL CEREZO', None, None,
     'MAQUEDA 105 MADRID. Fecha: 02/2025 (dia: la primera nota, 24/02/2025). Contacta: ACAYMA ASESORES (Maria Jose Donaire, Sonia y Fernando, el administrador; 915 099 737; '
     'comunidades@acayma.com; de lunes a jueves de 10:00 a 14:00 y de 17:00 a 19:00, viernes de 10:00 a 14:00; del 15 de junio al 15 de septiembre, de lunes a viernes de 10:00 a 14:00) '
     'y Raul Cerezo. Tipo de obra: ACCESIBILIDAD, PROYECTO EXTERNO (rampa en el portal: el tecnico anterior desaparecio y piden honorarios para licencia y subvenciones; cambio de puertas '
     'de ascensor solo si hay subvencion). Distrito Latina. CP 28024. Presidente: Fernando (629 94 31 44). En la carpeta: el proyecto externo, croquis y presupuestos (Altair firmado y puertas).\n\n'
     + crudo('maqueda105', 2025), None),
    ('marbella66', '2022-05-01', 'JOSE VICENTE (LORMAN)', None, None,
     'MARBELLA 66 MADRID. Fecha: 05/2022 (dia desconocido). Contacta: Jose Vicente (LORMAN ADMINISTRACIONES). Tipo de obra: SOLO FV. Distrito Fuencarral-El Pardo. CP 28034. '
     'La carpeta solo tiene la ficha.\n\nNota de la ficha (sin fecha): ' + crudo('marbella66', 2022), None),
    ('marbella8', '2022-06-01', 'JUAN PARAMIO (FAIN)', None, None,
     'MARBELLA 8 MADRID. Fecha: 06/2022 (dia desconocido). Tipo de obra: 2 ASCENSORES. Distrito Fuencarral-El Pardo. CP 28034. La carpeta solo tiene la ficha, sin notas.', None),
    ('marcosdeorueta15', '2025-06-16', 'BORJA FERNANDEZ (AYA ADMINISTRACIONES)', None, None,
     'MARCOS DE ORUETA 15 MADRID. Fecha: 06/2025 (dia: el correo de Borja Fernandez del 16/06/2025). Contacta: Borja Fernandez (AYA ADMINISTRACIONES; C/ Virgen de Aranzazu 35 local A; '
     '917 292 867; borja@ayaadministraciones.es): una comunidad quiere una obra de envolvente completa (proyecto, subvenciones, licencias y seguimiento de obra). Tipo de obra: SATE + SUBV. '
     'La carpeta solo tiene la ficha. Comercial interno: DANIEL.\n\n' + crudo('marcosdeorueta15', 2025), None),
    ('mariadeguzman42', '2021-04-15', 'VICENTE REAL (FAIN)', None, None,
     'C/ MARIA DE GUZMAN 42 MADRID. Fecha: la ficha dice 19/04/2021; las primeras fotos son del 15/04/2021; se toma esa. Tipo de obra: la ficha no lo dice (en la carpeta, analisis de la '
     'edificacion, un modelo y la oferta 285_21_463 "con financiacion", de oct-2021). La ficha no tiene mas datos.', None),
    ('mariadomingo6', '2024-02-08', 'DAVID SANCHEZ (FAIN)', None, None,
     'MARIA DOMINGO 6 MADRID. Fecha: 02/2024 (dia: la nota del 08/02/2024). Tipo de obra: ASCENSOR. Distrito Carabanchel. CP 28025. La carpeta solo tiene la ficha.\n\n'
     + crudo('mariadomingo6', 2024), None),
    ('mariazurita10', '2023-07-06', 'ANA ENCINAS (ELECNOR)', None, None,
     'MARIA ZURITA 10 MADRID. Fecha: la ficha dice 10/2023; la nota es del 06/07/2023; se toma esa. Tipo de obra: ASCENSOR. Distrito 11 - Carabanchel (Buenavista). CP 28044. '
     'La carpeta solo tiene la ficha.\n\n' + crudo('mariazurita10', 2023), None),
    ('mariblanca23', '2024-10-14', 'IGM', None, None,
     'MARIBLANCA 23 MADRID. Fecha: 10/2024 (dia: la nota del 14/10/2024). Contacta: IGM; paga la CP. Tipo de obra: INFORME Y MEMORIA PARA SUBSANACION DE DEFICIENCIAS (multa por inmueble en '
     'mal estado). Distrito Usera. CP 28026. En la carpeta, el requerimiento del Ayto de Madrid por las deficiencias.\n\n' + crudo('mariblanca23', 2024), None),
    ('maricara17', '2022-10-24', 'RAUL / IBERDROLA', None, None,
     'MARICARA 17 MADRID. Fecha: 10/2022 (dia: la nota del 24/10/22; el presupuesto de la carpeta, del 06/10/2022, es de otra direccion: "LUIS VIVES 11 - SALVAESCALERAS"). Tipo de obra: '
     'SATE + AEROTERMIA. Distrito Villaverde. CP 28021.\n\n' + crudo('maricara17', 2022), None)]
for carp, fecha, trajo, cif, ref, t, ruta in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, ruta=ruta)
fila('marianistas6', '2026-03-01', 'abierta', None, 'PAZ TERRADILLO (CIUDADELA)', None, None,
     'MARIANISTAS 6 MADRID. Fecha: 03/2026 (dia desconocido; el modelo 3D y la nota son del 08/04/2026; el .skb de ene-2026 no cuenta). Contacta: la administracion, CIUDADELA (Paz '
     'Terradillo). Tipo de obra: ASCENSOR (avanzar en fachada ocupando poco la acera). CP 28044. Comercial interno: CARLOS.' + EXT + '\n\n' + crudo('marianistas6', 2026) + REV,
     comercial='Alvaro (Carlos externo)')
for carp, fecha, trajo, t, ruta in [
        ('magincalvo5', '2014-12-19', 'PEDRO ARANDA (THYSSEN)', 'MAGIN CALVO 5 MADRID. Fecha: 19/12/2014 (la de la ficha). Ficha vacia salvo el vecino Jose Luis ("es de Leon"; '
         '618 337 182; Joseluis.bello@fnmt.es); hay fotos, planos y presupuesto (ene-2015).', None),
        ('manuelcaldeiro18', '2016-12-23', 'LUIS MIGUEL NUNES (THYSSEN)', 'C/ MANUEL CALDEIRO 18 MADRID. Fecha: 23/12/2016 (la de la ficha). Distrito 05 Chamartin; proteccion estructural. '
         'Ficha vacia; hay croquis, plano "borrador escalera" y oferta (dic-2016 a feb-2017).', None),
        ('margarita41', '2017-01-25', 'LUIS MIGUEL NUNES (THYSSEN)', 'C/ MARGARITA 41 MADRID. Fecha: 25/01/2017 (la de la ficha). Distrito 6 Tetuan; NZ4. Ficha vacia; hay plano, croquis, '
         'render y presupuesto (ene-nov 2017).', None),
        ('manresa21', '2023-02-14', None, 'MANRESA 21 MADRID. Carpeta SIN ficha de datos: solo el calculo de deflexiones ION 95002399-01 y sus planos (14/02/2023).', None),
        ('manresa23', '2023-02-14', None, 'MANRESA 23 MADRID. Carpeta SIN ficha de datos: solo el calculo de deflexiones ION 95002400-01 y sus planos (14/02/2023).', None),
        ('manresa17-19 (2016)', '2016-06-21', None, 'CALLE MANRESA 17 MADRID. Encargo anterior, de 2016, en la carpeta manresa17-19 (1.DATOS): fotos de Manresa 17 (21/06/2016), croquis, '
         'plano "borrador escalera" y presupuesto (sep-2016); SIN ficha de datos.', R('manresa17-19'))]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t, ruta=ruta)

# ================================================================= 3. MANIAS
mania('Para que devuelvan el ICIO de una obra que no se hace, primero hay que presentar una instancia de renuncia; con la notificacion del Ayto que confirma la renuncia, se pide la devolucion.',
      'Ayuntamiento de Madrid - tributos (ICIO)', '2026-02-20', 'manresa25-27', clave='mr2527', ruta=R('manresa25-27\\SATE'),
      cita='tributario informa que primero hay que realizar una instancia solicitando la renuncia y una vez el ayto confirme esa renuncia solicitar la devolucion con esa notificación del ayto '
           '(fichero "20-02-2026 llama tributario.txt" de la carpeta)')
mania('Ascensor por el interior (escalera curva) por consulta urbanistica especial: el Ayto pide un levantamiento de la calle con la propuesta de ascensor por el exterior dibujada, para '
      'demostrar que es inviable y que la unica solucion es por dentro.', 'Ayuntamiento de Madrid (consulta urbanistica especial)', '2019-01-19', 'marinalavandeira2', clave='ml2',
      cita='19/01/2019 Daniel explica: "Se me ha pedido desde el ayuntamiento un levantamiento planimétrico de la calle entorno al edificio, con la propuesta dibujada de un ascensor por el '
           'exterior para que se vea su inviabilidad y demostrar que la única solución es por el interior." (HISTORICO EXPEDIENTE.docx de la carpeta)')
mania('Ascensor exterior que ocupa la via publica: aunque el informe de los tecnicos sea favorable, el expediente pasa a la mesa de ascensores (viabilidad de la ocupacion de la calle) y '
      'necesita ademas el informe de Vias Publicas.', 'Ayuntamiento de Madrid - mesa de ascensores', '2020-02-26', 'marinalavandeira2', clave='ml2',
      cita='26/02/2020 Cita en el ayuntamiento. Daniel explica a Pedro que el informe de los técnicos es favorable, pero que pasa a mesa de ascensores para ver si es viable el diseño de '
           'ocupación de la calle. Mesa muy colapsada, habrá que esperar mínimo dos meses. / 13/07/2020 ... Contestan que están a la espera del informe de vías públicas. '
           '(HISTORICO EXPEDIENTE.docx de la carpeta)')

resumen()
