# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda P2 (paseosantamariadelacabeza129 .. plazadegabrielmiro3, 55 carpetas [55:110] de la P). 7-oct-2026. Sin --escribir: marcha en seco.
# La P1 [0:55] y la P3 [110:165] las preparan otros agentes a la vez.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de, _lineas

DELBRIO = '46b4fe1f-0534-434f-ae7c-cc098fde82cd'; EUROLINOVA = '739b806d-2a29-4b7b-926a-551152689e3f'; CENTRO = '2819c6ac-dc50-40bb-af6d-a9e5375d2dc2'
PU.update(pedro_ag='74973890-c0a7-460e-a6dc-300d71ff283e', roberto_mtd='ace22bc1-51c2-493e-a2d2-f1858148b671', cdelbrio='cf9c0d74-d01a-4ed2-a0f0-8fcaadd6e4ae',
          mjruiz='c768611c-65ef-458f-8b45-c8a2f05e5f9a', ja_dbb='40b27949-a177-4d6f-9e7b-2498a064848f', pescalona='62b2404c-cf2c-4c66-bfc5-e7412a379559',
          fattio='c1e9fb98-a7bc-4121-8fc8-3d53932ac101', paramio='900b6af9-4a5c-4e31-8c09-322357ee402c', collado='0f2b3251-9e84-443d-b81e-32edfd1f7915',
          alberto_mc='31cb6a71-758a-4fe4-883a-610b1be4c5e0', jagra='774c387a-15c5-40e7-a8c3-bcb7f305637c', megias='4757522a-e0d2-4ca5-aa1b-5e898d2c07e0',
          paz='46e3614d-97fd-40bf-baac-07d9bd5e601f', jr_aea='1fcd2334-fe92-4180-afb8-a9c9c547f238', gmoya='5a588515-9c02-4058-8e31-7e51dec4737f')
PEZ11 = 'b125e57b-f761-461a-9f7b-aa490a8999cd'       # PEZ 11: el lector no la caso (busqueda a mano)
PDA44 = '672a87b7-80c6-4914-8344-93d42ec91315'       # PICO DE LOS ARTILLEROS 44: el lector no la caso (busqueda a mano)
PA39S = 'picodeartilleros39/sate/FICHA DATOS.docx'; PA39P = 'picodeartilleros39/poceria/FICHA DATOS TECNICOS.docx'


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto o ya no vigente."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


def pc_unico(cid, nombre, rol, tel=None, doc=None, email=None, notas_=None):
    """pc() para roles que no son presidente, sin repetirla si el script se relanza."""
    ya = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&nombre=eq.%s' % (cid, quote(nombre)))
    return ya[0]['id'] if ya else pc(cid, nombre, rol, tel, doc, email, notas_)


def bloque(c, i, j):
    """lineas i..j (incluidas) de la ficha, sin las vacias."""
    return '\n'.join(l for l in _lineas(c)[i:j + 1] if l.strip()).strip()


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))

# ================================================================= 0. AGENDA (ninguna administracion ni junta nueva)
AURA = persona_nueva('Aura', 'Briceño', None, None, 'aura@delbrioyblanco.es', empresa=DELBRIO,
                     notas_='Del Brio y Blanco: trae Pintor Sorolla 3 (feb-2026), Pico Cejo 9 (abr-2026) y Pena de la Atalaya 110 (jun-2026). Firma "Aura Briceño".')
persona_nueva('María Isabel', 'Matesanz', 'técnico', '915882313', None, organismo=CENTRO,
              notas_='Junta de Centro (Calle Mayor 72; 915 882 313 / 915 886 080; tecnicentro@madrid.es, el correo del servicio): tecnica del ascensor por patio de Pez 11 '
                     '(2022-2023; carpeta pez11).')

# ================================================================= 1. PRODUCCION (29 carpetas, 29 oportunidades)
# --- Paseo de Santa Maria de la Cabeza 27
n = partir(fijar('paseosantamariadelacabeza27', 2025), 6, '---------- Forwarded message', '2026-03-16')
rellenar('psmc27', 'PASEO SANTA MARIA DE LA CABEZA 27', 'paseosantamariadelacabeza27', {'fecha_apertura': '2025-03-17', 'referencia_catastral': '1131614VK4713A',
    'origen_notas': 'Fecha de llegada: 03/2025 (dia: la primera nota, 17/03/2025; el "Infrome Perceptivo" de dic-2024 de la carpeta es de plantilla). Contacta: Milagros Garcia Chaparro, '
                    'la presidenta (661 763 310; michaparro.milagros@gmail.com; "poner en copia de los correos que se le envian al administrador"). Paga la CP. Tipo de obra: ACCESIBILIDAD + CSS + SUBV '
                    '(ascensor nuevo de doble embarque con parada en planta baja, en sustitucion del de FAIN; rampa). Barrio: Palos de la Frontera. Tecnico: Julio -> Karla -> Israel -> Carlos. '
                    'Fecha encargo: 06/06/2025 (HE firmada de proyecto, CSS y subvencion; subvenciones contratadas el 06/06/2025, todas las convocatorias). Ano 1966. Administracion: AG FINCAS '
                    '(Pedro Garcia Bonnin o Virginia; Calle Isla de Arosa 37, 1o F, 28035; 91 739 97 60 / 686 84 83 14 whatsapp; secretaria@admongarcia.com y pedro.garcia@admongarcia.com; '
                    'de 9 a 2 de lunes a viernes y de 4 a 6 de lunes a jueves). PEM 59.921,00. Visado TL/015278/2025. Superficie 31,07 m2. DR por ECU (ACTECU) registrada en el Ayto; en mar-2026 '
                    'la comunidad pide modificar el proyecto (correo de Sergio Vega, un propietario, sergio.vega@upm.es); ok a la modificacion el 27/04/2026. Contrata: primero Rosersese; en jul-2026 '
                    'eligen FGR (Oscar Fernandez, ex CEGA), sin firmar a 09/09/2026. En la ficha: comercial CARLOS GARCIA.' + CAPTO_CARLOS},
    ('accesibilidad', 'css', 'subvenciones'), n=n, subvencion=trocear2(subv('paseosantamariadelacabeza27'), 2025),
    comunidad={'iban': 'ES28 0081 0639 1200 0119 8125'},
    presi=('Milagros García Chaparro', 'presidente', '661763310', None, 'michaparro.milagros@gmail.com'), trae_pc='presi', captador=CARLOS, lleva=ALVARO)

# --- Pastrana 5B
rellenar('pas5b', 'PASTRANA 5B', 'pastrana5b', {'fecha_apertura': '2026-02-12',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: la HE enviada y el modelo 3D, 12/02/2026; el .skb de ene-2026 es de plantilla). Contacta: Roberto (MATEDECON; 636 958 389; '
                    'rehabilitacionesmatedecon@gmail.com). Tipo de obra: RAMPA + SUBV. Hay modelo 3D. Comercial interno: DANIEL.'},
    ('rampa', 'subvenciones'), n=fijar('pastrana5b', 2026), trae_pu=PU['roberto_mtd'])

# --- Paterna 7
rellenar('pat7', 'PATERNA 7', 'paterna7', {'fecha_apertura': '2025-10-27',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: el de la ficha, 27/10/2025, el unico fichero). Tipo de obra: SATE Y ASCENSOR. CP 28021. La ficha no dice quien la trae y no tiene notas. '
                    'En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('sate', 'ascensor'), captador=CARLOS, lleva=ALVARO)

# --- Patriarca San Jose 11
n = partir(fijar('patriarcasanjose11', 2025), 1, '---------- Forwarded message', '2025-11-13')
rellenar('psj11', 'PATRIARCA SAN JOSE 11', 'patriarcasanjose11', {'fecha_apertura': '2025-10-27', 'referencia_catastral': '6859102VK4765H',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: la primera nota y el modelo 3D, 27/10/2025). Contacta: Diego Rojo (ROJO JUSDI; admirojojusdi@gmail.com; escribe tambien Alba Pedraja Sanchez). '
                    'Tipo de obra: ASC + SATE + SUBV (derribo completo de escalera, ascensor de 4 personas; rampa exterior; PEM 180.000 + IVA; el SATE, a estudiar). Ano 1960. La administracion pide '
                    'el coste del ascensor y del SATE por separado (13/11/2025). Comercial interno: DANIEL.'},
    ('ascensor', 'sate', 'subvenciones'), n=n, adm=PU['diego'], trae_pu=PU['diego'])

# --- Pedro Fernandez Labrada 3 esc 2: el presidente tenia pegado el tachado (nombre y DNI del anterior)
rellenar('pfl3', 'PEDRO FERNANDEZ LABRADA 3 ESC 2', 'pedrofernandezlabrada3esc2', {'fecha_apertura': '2023-12-13', 'referencia_catastral': '8338202VK3783G',
    'origen_notas': 'Fecha de llegada: 12/2023 (dia: la HE enviada y el CIF de la comunidad, 13/12/2023). En la ficha: empresa/cliente "olivares"; persona de contacto ROSA (sin mas datos). '
                    'Tipo de obra: ASCENSOR. Barrio: Puerta del Angel. Tecnico: Julio. Licencia por ECU, APROBADA 18-03-2025. Visado TL/019281/2024. Administracion: en la ficha "a traves de '
                    'Rosersese (pedidos docs 22/04)"; contacto Tomas Munoz (915 694 499 / 671 339 178; Administraciones Corcho, la de la app). Presidente: Alvaro Lopez Amor Galvez (presidente y '
                    'dueno de clinica dental; 609 216 760; clinica 914 636 264); antes ~~Jose Antonio Santiago Garcia~~, tachado. El 12/04/2024 se reanuda, pendiente de que paguen. La ficha no dice '
                    'comercial interno; la lleva Daniel.'},
    ('ascensor',), n=fijar('pedrofernandezlabrada3esc2', 2023))
CPFL = OPP['pfl3'][0]['id']
arreglar_pc(CPFL, 'rol=eq.presidente&nombre=eq.' + quote('ALVARO LOPEZ AMOR GALVEZ JOSE ANTONIO SANTIAGO GARCIA'),
            {'nombre': 'ALVARO LOPEZ AMOR GALVEZ', 'documento': '50853330P', 'telefono': '609216760',
             'notas': 'Presidente y dueno de clinica dental (clinica 914 636 264). Antes, en el mismo campo, el presidente anterior tachado (Jose Antonio Santiago Garcia).'})
pc_unico(CPFL, 'JOSE ANTONIO SANTIAGO GARCIA', 'otro', None, '05284856P', None, 'Presidente ANTERIOR (tachado en la ficha de Dropbox).')

# --- Pedro Laborde 58
rellenar('pla58', 'PEDRO LABORDE 58', 'pedrolaborde58', {'fecha_apertura': '2025-06-26',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: la fecha de encargo y la documentacion recibida, 26/06/2025; el "PPTO CEGA" de oct-2023 de la carpeta es del proyecto externo). '
                    'Contacta: Carlos del Brio (DEL BRIO Y BLANCO; C/ Carlos Martin Alvarez 65 bis, 1o B; 91 477 41 91; carlos@delbrioyblanco.es). Paga la CP. Tipo de obra: SUBVENCION DE ACCESIBILIDAD '
                    'de un PROYECTO EXTERNO (tecnico externo; en la carpeta, proyecto visado externo, IEE registrada, contrato de FAIN y presupuestos de Jonalo y Fain). Barrio: no consta (Puente de Vallecas). '
                    'Fecha encargo: 26/06/2025; subvenciones contratadas el 26/06/2025 (todas las convocatorias). Presidente: Rufino Vicente Movellan (2o C). La ficha no tiene notas. '
                    'Comercial interno: DANIEL.'},
    ('subvenciones',), comunidad={'iban': 'ES14 2100 1180 1180 1913 0029 2615'}, trae_pu=PU['cdelbrio'])

# --- Pedro Unanue 22
rellenar('pu22', 'PEDRO UNANUE 22', 'pedrounanue22', {'fecha_apertura': '2026-01-21', 'referencia_catastral': '1129409VK4712G',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: el correo de Maria Jose Ruiz, de Atiko, 21/01/2026, con la orden de ejecucion del Ayuntamiento que pide los ajustes razonables de accesibilidad; '
                    'los escritos de 2023-2025 de la carpeta son de plantilla). Contacta: Maria Jose Ruiz (ATIKO; C. del Amparo 86, 28012; 912 98 20 05; administracion@atikogestion.es). Tipo de obra: '
                    'INFORME (ajustes razonables). Barrio: Palos de la Frontera. Tecnico: Israel. Fecha encargo: 17/02/2026 (HE recibida firmada). Ano 1913. Informe enviado el 16/04/2026; el 20/04/2026 '
                    'se registra la orden de ejecucion de la parte del telefonillo; lo demas, segun el informe, no se puede hacer. Comercial interno: DANIEL.'},
    ('informe_tecnico',), n=fijar('pedrounanue22', 2026, ('2026-01-21', 'Correo de Maria Jose Ruiz (Atiko) del 21 de enero de 2026.')),
    comunidad={'iban': 'ES19 0081 7102 0600 0178 2284'}, trae_pu=PU['mjruiz'])

# --- Peironcely 40
rellenar('pei40', 'PEIRONCELY 40', 'peironcely40', {'fecha_apertura': '2025-01-17', 'referencia_catastral': '3105816VK4730E',
    'origen_notas': 'Fecha de llegada: 01/2025 (dia: la primera nota, 17/01/2025; los .cex de 2024 y de "BTORRIJOS23" son de plantilla). Contacta: Jose Antonio (DEL BRIO Y BLANCO; '
                    'C/ Carlos Martin Alvarez 65 bis, 1o B; 91 477 41 91 / 91 478 69 11 / 91 477 88 32; joseantonio@delbrioyblanco.es; lunes a viernes de 9:30 a 13:30). Paga la CP. Tipo de obra: '
                    'SUBVENCION de la CUBIERTA CON DESAMIANTADO (proyecto y obra externos: facturas de Rofran de 2022-2023; "en la hoja de encargo ponia subv de accesibilidad y sate, pero no es correcto"). '
                    'Barrio: Entrevias. Tecnico: externo. Fecha encargo: 30/01/2025. Ano 1970. Comercial interno: DANIEL.'},
    ('subvenciones',), n=fijar('peironcely40', 2025), comunidad={'iban': 'ES78 2085 9741 7303 3032 1186'}, trae_pu=PU['ja_dbb'])

# --- Pena de la Atalaya 110
rellenar('pat110', 'PEÑA DE LA ATALAYA 110', 'peñadelaatalaya110', {'fecha_apertura': '2026-06-29',
    'origen_notas': 'Fecha de llegada: 06/2026 (dia: el modelo 3D y la ficha, 29/06/2026). Contacta: Aura (DEL BRIO Y BLANCO). Tipo de obra: INSTALACION DE ASCENSOR. CP 28053. Hay modelo 3D. '
                    'La ficha no tiene notas. Comercial interno: ALVARO.'},
    ('ascensor',), adm=AURA, trae_pu=AURA, captador=ALVARO, lleva=ALVARO)

# --- Pena de la Miel 5
rellenar('pm5', 'PEÑA DE LA MIEL 5', 'peñadelamiel5', {'fecha_apertura': '2026-04-01',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia desconocido: la ficha, unico fichero, es del 06/05/2026). Contacta: Pedro (DEL BRIO Y BLANCO; en la agenda, Pedro Escalona). Tipo de obra: IEE. '
                    'IEE enviada el 07/05/2026. Comercial interno: ALVARO.'},
    ('iee',), n=fijar('peñadelamiel5', 2026, ('2026-05-07', 'La fecha va al final de la nota.')), adm=PU['pescalona'], trae_pu=PU['pescalona'], captador=ALVARO, lleva=ALVARO)

# --- Pena Rubia 1
rellenar('pr1', 'PEÑA RUBIA 1', 'peñarubia1', {'fecha_apertura': '2026-04-15',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: la HE y el modelo 3D, 15/04/2026; el .skb de ene-2026 es de plantilla). Contacta: Fattio Maldonado (VESTALIA ADMINISTRADORES; Monte Oliveti 46 '
                    'Bj-7, 28038; 649 60 52 33; obras@vestaliadministradores.es). Tipo de obra: ASCENSOR POR HUECO DE ESCALERA con modificacion parcial de la escalera (torre para elevador de 6 personas; '
                    'invasion de 50 cm x 3 m en el local de la izquierda; PEM 98.000 + IVA). HE con viabilidad enviada 15-04-2026. Hay modelo 3D. Comercial interno: DANIEL.'},
    ('ascensor',), n=fijar('peñarubia1', 2026, ('2026-04-15', 'Sin fecha; la propuesta de Daniel para la HE del 15-04-2026.')), adm=PU['fattio'], trae_pu=PU['fattio'])

# --- Pez 11 (obra en curso)
rellenar('pez11', 'PEZ 11', 'pez11', {'fecha_apertura': '2022-05-25', 'referencia_catastral': '0251903VK4705A',
    'origen_notas': 'Fecha de llegada: 05/2022 (dia: la primera nota, 25/05/2022; los escritos de feb-mar 2022 son de plantilla). Contacta: Juan Paramio (FAIN; "NO poner en copia a Oswaldo"). '
                    'Tipo de obra: ASCENSOR A MEDIA ALTURA POR PATIO + CSS + SUBV. Barrio: Universidad. Tecnico: Fernan. Fecha encargo: 02/09/2022 ("ok ascensor Juan Paramio"). Jefes de obra: '
                    'Victor Esquinas y Abel Bernardos. Administracion: ADGESMOR (Toni Calero; C. de Alberto Aguilera 8, 3o dcha., 28015; 915 911 040; adgesmor3@adgesmor.es; docs pedidos 05/09/22). '
                    'Presidenta: Sonia Salas Gutierrez (666 356 566). Junta de Centro (Calle Mayor 72): tecnica Maria Isabel Matesanz (915 882 313 / 915 886 080; tecnicentro@madrid.es). '
                    'PEM 65.287,89. Visado TL/019925/2022. Expedientes 350/2022/13568 (licencia, procedimiento incorrecto: ~~licencia, es protegido, NZ 1 grado 1o~~) y 350/2023/02230 (DR: '
                    '"Licencia dicen que no. Presentarlo por DR"). Superficie 14,7. Requerimiento y visita al tecnico municipal (20/12/2023). HE de renovacion firmada el 19/05/2025 (por indicacion '
                    'del dpto de subvenciones). Obra en curso: apertura del centro de trabajo (may-2025) y actas de obra (jun-2025 a ago-2026). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'css', 'subvenciones'), n=fijar('pez11', 2022), presi=('SONIA SALAS GUTIERREZ', 'presidente', '666356566'), trae_pu=PU['paramio'], oid_fijo=PEZ11)

# --- Pico Cejo 9
rellenar('pc9', 'PICO CEJO 9', 'picocejo9', {'fecha_apertura': '2026-04-01',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia desconocido: los dos ficheros, la ficha y una captura, son del 05/05/2026). Contacta: Aura (DEL BRIO Y BLANCO). Tipo de obra: SATE. '
                    'La ficha no tiene notas. Comercial interno: ALVARO.'},
    ('sate',), adm=AURA, trae_pu=AURA, captador=ALVARO, lleva=ALVARO)

# --- Pico Cejos 55
rellenar('pcs55', 'PICO CEJOS 55', 'picocejos55', {'fecha_apertura': '2026-04-14',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: la primera nota, 14/04/2026). Contacta: Fattio Maldonado (VESTALIA ADMINISTRADORES; 649 60 52 33; obras@vestaliadministradores.es). '
                    'Tipo de obra: SATE + SUBV (un SATE empezado por otros arquitectos; la HE no incluye CSS; el PEM se valorara mas adelante). HE enviada 15-04-2026. Comercial interno: DANIEL.'},
    ('sate', 'subvenciones'), n=fijar('picocejos55', 2026), adm=PU['fattio'], trae_pu=PU['fattio'])

# --- Pico de Artilleros 39: poceria 2024 + SATE 2025 = UNA oportunidad (Monica, 7-oct-2026: la frase clave es "incluye lo de poceria")
rellenar('pa39', 'PICO DE ARTILLEROS 39', 'picodeartilleros39/sate', {'fecha_apertura': '2024-05-07', 'referencia_catastral': '5929311VK4752H',
    'origen_notas': 'Fecha de llegada: 05/2024 (dia: la primera nota de la poceria, 07/05/2024). UNA oportunidad con dos fichas: POCERIA (2024) y SATE (2025), porque la HE del SATE "incluye lo de poceria" (Monica, 7-oct-2026). Contacta: Adolfo '
                    'Collado (MC GESTION; Av. Doctor Garcia Tapia 129 local 2, 28030; 91 502 74 59 / 618 63 60 95; acollado@mcgestionfincas.com y moratalaz@mcgestionfincas.com; tambien Alberto Olvera, '
                    'alberto@mcgestionfincas.com; facturas a facturas@mcgestionfincas.com; contabilidad: Paloma, 676 555 254). Paga la CP. Tipo de obra: SATE + SUBV + CAES, "incluyendo lo de poceria" '
                    '(sin DF ni CSS). Barrio: Vinateros. Tecnico: Julio. Fecha encargo: 20/02/2025. Ano 1974. Presidente: Ignacio Duran Rubio (2o A; "muy mayor y no tiene correo"). Licencia por ECU '
                    '(ACTECU, expediente 1311025030003, pagada). La supracomunidad (colonia de 35 comunidades) no da el modelo estetico homogeneo de fachada; el 20/01/2026 "no hacer nada hasta nueva '
                    'orden"; a 16/06/2026 no hay autorizacion de la mancomunidad ni presupuesto firmado. Para el modelo homogeneo: Pico de Artilleros 35 y 37, ADINSA (Raul Alcala; 913 712 755; '
                    'raul@adinsa.com) - no esta en la agenda. POCERIA (2024, subcarpeta "poceria"): arreglo de humedades del sotano (levantamiento, informe de danos y proyecto de saneado, canalizacion y evacuacion; proyecto y DO); '
                    'jefe de obra Matedecon; DR por ECU presentada en el Ayto el 13-09-2024; visado TL/014305/2024; el 18/02/2025 se actualizan los 3 presupuestos de Matedecon. Comercial: DANIEL.'},
    ('sate', 'subvenciones', 'caes', 'otros_proyecto_tecnico', 'df'), n=fijar(PA39P, 2024) + fijar(PA39S, 2025), subvencion=trocear2(subv(PA39S), 2026),
    comunidad={'iban': 'ES35 0081 1479 3000 0149 6654'}, adm=PU['collado'], trae_pu=PU['collado'])
# Dos presidentes en la app: Francisco (ficha de la pocheria, nombrado en nov-2023) e Ignacio (ficha del SATE, 2025) -> Francisco pasa a presidente ANTERIOR (duda)
arreglar_pc(OPP['pa39'][0]['id'], 'rol=eq.presidente&nombre=eq.' + quote('FRANCISCO JOSE GALLEGO PEREZ'),
            {'rol': 'otro', 'telefono': '617793694', 'notas': 'Presidente ANTERIOR (ficha de la poceria, 2024; acta de nombramiento del 28-11-2023). En la ficha del SATE (feb-2025) el presidente es Ignacio Duran Rubio.'})

# --- Pico de los Artilleros 44
rellenar('pa44', 'PICO DE LOS ARTILLEROS 44', 'picodeartilleros44', {'fecha_apertura': '2025-10-14',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: el correo de Alberto, de MC Gestion, 14/10/2025; el .skb de ene-2026 es de plantilla). Contacta: Alberto (MC GESTION FINCAS; '
                    'alberto@mcgestionfincas.com). Tipo de obra: ~~RAMPA DE ACC PORTAL~~ (tachado) -> INFORME. Contacto de la comunidad: Cristina, vecina que lleva el tramite (696 078 968). '
                    'Se vuelve a visitar el 11-02-2026 con una propuesta nueva; HE enviada. Hay modelo 3D. Comercial interno: DANIEL.'},
    ('informe_tecnico',), n=fijar('picodeartilleros44', 2025, ('2025-10-14', 'Correo de Alberto (MC Gestion) del 14 de octubre de 2025.')),
    adm=PU['alberto_mc'], trae_pu=PU['alberto_mc'], oid_fijo=PDA44)
pc_unico(OPP['pa44'][0]['id'], 'CRISTINA', 'otro', '696078968', None, None, 'Vecina que lleva el tramite de la rampa (correo de MC Gestion del 14/10/2025).')

# --- Pico de Artilleros 56
rellenar('pa56', 'PICO DE ARTILLEROS 56', 'picodeartilleros56', {'fecha_apertura': '2025-12-03',
    'origen_notas': 'Fecha de llegada: 12/2025 (dia: la ficha, unico fichero, 03/12/2025). Contacta: Adolfo Dorado, vecino (639 14 19 94; adolfodorado@hotmail.com). Tipo de obra: SATE. CP 28030. '
                    'La ficha no tiene notas. En la ficha: comercial interno "DANIEL O CARLOS"; la lleva Daniel.'},
    ('sate',), presi=('ADOLFO DORADO', 'vecino', '639141994', None, 'adolfodorado@hotmail.com', 'Vecino; quien contacta (ficha de dic-2025).'), trae_pc='presi')

# --- Pico Veleta 5
n = partir(fijar('picoveleta5', 2025), 4, '15-04-2026 ENVIADO', '2026-04-15')
rellenar('pv5', 'PICO VELETA 5', 'picoveleta5', {'fecha_apertura': '2025-03-26',
    'origen_notas': 'Fecha de llegada: 03/2025 (dia: el correo de Vestalia, 26/03/2025). Contacta: Fattio Maldonado (VESTALIA ADMINISTRADORES; C/ Monte Oliveti 46 Bj-7, 28038; '
                    'obras@vestaliadministradores.es). Tipo de obra: ~~ASCENSOR~~ ELEVADOR Y PLATAFORMA VERTICAL + SUBV (derribo y escalera nueva; elevador de puertas automaticas, 4 paradas y 5 '
                    'personas; contadores; plataforma elevadora ~~inclinada~~ vertical en la entrada). Barrio: no consta (Puente de Vallecas). Presidenta: Susana (616 671 099); otro propietario '
                    'encargado: Jose Ramon (607 644 754). Informe de viabilidad y HE + subv enviados 02/04/2025; actualizados y reenviados el 15-04-2026 manteniendo el precio. Comercial: DANIEL.'},
    ('ascensor', 'plataforma', 'subvenciones'), n=n, presi=('SUSANA', 'presidente', '616671099'), adm=PU['fattio'], trae_pu=PU['fattio'])
pc_unico(OPP['pv5'][0]['id'], 'JOSE RAMON', 'otro', '607644754', None, None, 'Propietario encargado del asunto del ascensor (correo de Vestalia del 26/03/2025).')

# --- Piedrabuena 18
rellenar('pb18', 'PIEDRABUENA 18', 'piedrabuena18', {'fecha_apertura': '2025-09-18',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia: el correo de Jose Gonzalez, de Jagra Fincas, 18/09/2025, con el presupuesto de fachada de DESTACA; el asunto dice "CP PIEDRABUENA 19": '
                    'errata, la carpeta y la ficha dicen 18). Contacta: Jose Gonzalez (JAGRA FINCAS; joseglez@jagra-fincas.es), que acaba de coger la comunidad. Tipo de obra: SATE CON CAES + SUBV '
                    '(proyecto y subvenciones). HE enviada 19/09/2025. Comercial interno: DANIEL.'},
    ('sate', 'caes', 'subvenciones'), n=fijar('piedrabuena18', 2025, ('2025-09-18', 'Correo de Jose Gonzalez (Jagra Fincas) del 18 de septiembre de 2025.')),
    adm=PU['jagra'], trae_pu=PU['jagra'])

# --- Piedrahita 2
n = partir(fijar('piedrahita2', 2025), 1, 'Enviada viabilidad 17/03', '2025-03-17')
rellenar('ph2', 'PIEDRAHITA 2', 'piedrahita2', {'fecha_apertura': '2025-03-07', 'referencia_catastral': '6901701VK3760B',
    'origen_notas': 'Fecha de llegada: 03/2025 (dia: la primera nota, 07/03/2025). Contacta: ~~Leandro, administrador (FINCASA; fincasa@gmx.es)~~, todo tachado: el 12/06/2026 la administracion '
                    'pasa por jubilacion al hijo de Leandro, Alejandro Manzano (MzB ADMINISTRACION DE FINCAS; C/ Delfos 6, 28341 Valdemoro; alejandro.manzano@fincasmzb.es). Paga la comunidad. '
                    'Tipo de obra: ASCENSOR CON INVASION DE LOCAL (almacen del local de abajo; embarque sencillo, 4 paradas, foso reducido; coste de obra 140.000 + IVA) + DO + subvenciones '
                    '(tramitacion por un ano). Barrio: no consta (Carabanchel). Tecnico: Jhonatan; arreglos, Carlos D. Ref: 10/2025. HE de proyecto recibida firmada el 29/10/2025; la de la subvencion, '
                    'aun no. Ano 1992. Superficie 56,30. Proyecto terminado y enviado a la ECU (09/12/2025). En la finca vive un empleado de FAIN y piden que la obra sea para ellos (09/03/2026). '
                    'La comunidad pide licencia; ACTECU dice que corresponde DR (27/08/2026) y se sigue con la DR. Comercial: DANIEL.'},
    ('ascensor', 'df', 'subvenciones'), n=n, subvencion=[('2025-10-21', subv('piedrahita2') + '\n\n(Sin fecha en la ficha; es lo mismo que dice Daniel en la nota del 21/10/2025.)')],
    comunidad={'iban': 'ES33 0081 5142 6900 0123 7230'}, presi=('PEDRO ANTON DOMINGUEZ', 'presidente', '607709563', '50451294N'))

# --- Pilarica 8
rellenar('pil8', 'PILARICA 8', 'pilarica8', {'fecha_apertura': '2025-09-26',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia: la ficha, el modelo 3D y la HE, 26/09/2025). Contacta: Miguel (GRUPO EUROLINOVA; C/ Felipe Castro 4, 28026; 91 500 21 69, atencion al '
                    'cliente L-J 9-14 y 16-19, V 9-14; miguel@grupoeurolinova.com). Tipo de obra: ASCENSOR (derribo de escalera en zonas comunes y de toda la fachada, cerrada con una metalica sin '
                    'invadir la calle; contadores a armario; 5 personas, embarque simple; 220.000 + IVA). HE e informe de viabilidad enviados 26/09/2025. Hay modelo 3D. Comercial interno: DANIEL.'},
    ('ascensor',), n=fijar('pilarica8', 2025, ('2025-09-26', 'Sin fecha; la propuesta de Daniel para la HE del 26/09/2025.')), adm=PU['megias'], trae_pu=PU['megias'])

# --- Pinguino 9
n = partir(fijar('pingüino9', 2025), 4, '03-12-2025 solicitud', '2025-12-03')
rellenar('pin9', 'PINGÜINO 9', 'pingüino9', {'fecha_apertura': '2025-03-11', 'referencia_catastral': '6202610VK3760A',
    'origen_notas': 'Fecha de llegada: 03/2025 (dia: las fotos de la visita de viabilidad, 11/03/2025). Contacta: Leandro, administrador (FINCASA; 690 953 948; fincasa@gmx.es), tachado como '
                    'administracion: desde el 12/06/2026, MzB ADMINISTRACION DE FINCAS (Alejandro Manzano; C/ Delfos 6, 28341 Valdemoro; alejandro.manzano@fincasmzb.es y administracion@fincasmzb.es). '
                    'Paga el proyecto: SAACO BROTHER (TOP LEVEL), la constructora (Emilio Corral, 91 895 05 39, administracion@saacobrother.com; Inaki, ignacio@toplevelascensores.com). Tipo de obra: '
                    'ASCENSOR, DF Y CSS + SUBV contratada (HE de subv firmada el 19/09/2025). Barrio: Vista Alegre. Tecnico: Israel. Fecha encargo: 11/07/2025. Ano 1971. En la ficha, la comunidad '
                    'es "CL PARQUE EUGENIA DE MONTIJO N 41" ("El CIF es correcto!!"). Presidente del garaje: German (617 993 771). PEM 135.672,27. Visado TL/005064/2026. Superficie 94,53. '
                    'Licencia por el AYUNTAMIENTO (no por ECU: la ECU pedia acreditar la titularidad del suelo), registrada en el SLIM el 22/04/2026. En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('ascensor', 'df', 'css', 'subvenciones'), n=n, subvencion=trocear2(subv('pingüino9'), 2025),
    presi=('JOSE ANTONIO CAMARA HOLGADO', 'presidente', '620526494', None, 'jose.camara.holgado@gmail.com'), trae_pu=PU['leandro'], captador=CARLOS, lleva=ALVARO)
pc_unico(OPP['pin9'][0]['id'], 'GERMAN', 'otro', '617993771', None, None, 'Presidente del GARAJE (ficha, 2025).')

# --- Pintor Sorolla 3
rellenar('ps3', 'PINTOR SOROLLA 3', 'pintorsorolla3', {'fecha_apertura': '2026-02-19',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: el correo de Aura, de Del Brio y Blanco, 19/02/2026; el .skb de ene-2026 es de plantilla). Contacta: Aura Briceno (DEL BRIO Y BLANCO; '
                    'aura@delbrioyblanco.es). Tipo de obra: ASC (viabilidad del ascensor). Presidente: Javier (635 313 400). Hay modelo 3D. Comercial interno: ALVARO.'},
    ('ascensor',), n=fijar('pintorsorolla3', 2026, ('2026-02-19', 'Correo de Aura (Del Brio y Blanco) del 19 de febrero de 2026.')),
    presi=('JAVIER', 'presidente', '635313400'), adm=AURA, trae_pu=AURA, captador=ALVARO, lleva=ALVARO)

# --- Piquenas 14
rellenar('pq14', 'PIQUEÑAS 14', 'piqueñas14', {'fecha_apertura': '2026-03-01',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia desconocido: la ficha, unico fichero, es del 06/04/2026). Contacta: Paz Terradillos (CIUDADELA; paz.terradillos@ciudadela.eu). Tipo de obra: '
                    'SATE + ASC. La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + EXT},
    ('sate', 'ascensor'), adm=PU['paz'], trae_pu=PU['paz'], captador=ALVARO, lleva=ALVARO)

# --- Pizarro 12
rellenar('piz12', 'PIZARRO 12', 'pizarro12', {'fecha_apertura': '2025-12-30',
    'origen_notas': 'Fecha de llegada: 12/2025 (dia: el modelo 3D, 30/12/2025). Contacta: David, vecino (639 163 332; david@novaes.es). Paga la CP. Tipo de obra: ASCENSOR + SUBV. '
                    'El 25/02/2026 se envia una simulacion de financiacion del BBVA (menos de 10 vecinos). En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('ascensor', 'subvenciones'), n=fijar('pizarro12', 2025),
    presi=('DAVID', 'vecino', '639163332', None, 'david@novaes.es', 'Vecino; quien contacta (ficha de dic-2025).'), trae_pc='presi', captador=CARLOS, lleva=ALVARO)

# --- Platino 36 (en pausa por financiacion)
n = partir(fijar('platino36', 2025), 5, 'De:' + chr(160) + 'Oficina Accesalia', '2026-02-23')
rellenar('pla36', 'PLATINO 36', 'platino36', {'fecha_apertura': '2025-01-21', 'referencia_catastral': '1668405VK4616H',
    'origen_notas': 'Fecha de llegada: 01/2025 (dia: la primera nota, la visita de Daniel del 21/01/2025; los ficheros de 2022-2024 de la carpeta son de plantilla). Contacta: Jose Ramon Lopez '
                    '(AEA FINCAS VILLAVERDE; Calle Alegria de la Huerta 24, loc 5, 28041; 91 797 10 17 / 672 862 102; Angeles, 722 85 72 65; villaverde@aeafincas.es; "Joseramon3l@hotmail.com, '
                    'correo personal, NO USAR"). Tipo de obra: ASCENSOR CON DERRIBO DE ESCALERA + ELEVADOR + SATE Y SUBV (HE de ascensor y SATE con CAES). Barrio: Los Rosales. Tecnico: Israel. '
                    'Fecha encargo: 13/06/2025 (HE recibida firmada). Ano 1966. Constructora: NVR; Julio, de Envoltermia, busca financiacion. PROYECTO EN PAUSA desde el 19/06/2025: no pagan, '
                    'buscan financiacion (8 viviendas; UCI no financia a menos de 10). Comercial: DANIEL.'},
    ('ascensor', 'plataforma', 'sate', 'caes', 'subvenciones'), n=n, comunidad={'iban': 'ES33 0049 3125 7222 9402 3575'},
    presi=('RAQUEL MATEY BRAVO', 'presidente', '637180778'), trae_pu=PU['jr_aea'])

# --- Plaza de las Asambleas 1 y 2 (Eurolinova; parcelas distintas)
n = partir(fijar('plazaasambleas1', 2026, ('2026-06-04', 'Sin fecha; la propuesta de Daniel para la HE del 04-06-2026.')), 1, '11-06-26', '2026-06-11')
rellenar('pa1', 'PLAZA DE LAS ASAMBLEAS 1', 'plazaasambleas1', {'fecha_apertura': '2026-05-01',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia desconocido; "igual a la Plaza de las Asambleas 2", cuyo modelo 3D es del 29/05/2026). Contacta: Miguel Megias (GRUPO EUROLINOVA; '
                    'C/ Felipe Castro 4, 28026; 616 87 14 38 / 91 500 21 69; miguel@grupoeurolinova.com y comunidades@grupoeurolinova.com). Tipo de obra: ASCENSOR POR HUECO de escalera (agrandando '
                    'el ojo; embarque sencillo, 5 personas; rampa exterior en el portal; 110.000 + IVA). HE con viabilidad enviada a la CP 11-06-26. Comercial interno: DANIEL.'},
    ('ascensor',), n=n, adm=PU['megias'], trae_pu=PU['megias'])
n = partir(fijar('plazaasambleas2', 2026, ('2026-06-04', 'Sin fecha; la propuesta de Daniel para la HE del 04-06-2026.')), 1, '11-06-26', '2026-06-11')
rellenar('pa2', 'PLAZA DE LAS ASAMBLEAS 2', 'plazaasambleas2', {'fecha_apertura': '2026-05-29',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: el modelo 3D, 29/05/2026). Contacta: Miguel Megias (GRUPO EUROLINOVA). Tipo de obra: ASC con derribo + SUBV + CSS (ascensor por hueco de escalera '
                    'ampliando el hueco; rampa bajo soportales; 100.000 + IVA). Presidenta: Cristina (606 665 823; critinamaganlopez@yahoo.es). HE con viabilidad enviada a la administracion 11-06-26. '
                    'El 11-09-26 Eurolinova dice que ya no administra la comunidad (no se sabe la nueva). Comercial interno: DANIEL.'},
    ('ascensor', 'subvenciones', 'css'), n=n, presi=('CRISTINA', 'presidente', '606665823', None, 'critinamaganlopez@yahoo.es'), trae_pu=PU['megias'])
if not b.leer('comunidad_admin_responsable?select=id&comunidad_id=eq.%s&empresa_id=eq.%s' % (OPP['pa2'][0]['id'], EUROLINOVA)):
    ins('comunidad_admin_responsable', [{'comunidad_id': OPP['pa2'][0]['id'], 'empresa_id': EUROLINOVA, 'puesto_id': PU['megias'], 'vigente': False, 'hasta': '2026-09-11',
                                         'notas': 'El 11-09-2026 Eurolinova dice que ya no administra la comunidad (ficha de Dropbox). Fecha "hasta" = la de la nota. No se sabe la nueva.'}])

# --- Plaza Castanares 2: la HE la firma un VECINO, no la comunidad
rellenar('pc2', 'PLAZA CASTAÑARES 2', 'plazacastañares2', {'fecha_apertura': '2024-10-01', 'referencia_catastral': '4382911VK4848A',
    'origen_notas': 'Fecha de llegada: la ficha dice 10/2024 (dia desconocido; la primera nota es de jun-2025 y el .rfa de feb-2025 es de plantilla). Contacta: ~~Javier Rodriguez Martin '
                    '(SCHINDLER)~~, tachado; desde el 13/06/2025, Javier Gonzalez Moya (SCHINDLER). Cliente: un VECINO, NO LA CP ("la CP no quieren el ascensor, es a peticion de un vecino '
                    'particular"): Marcos Ramos Lama (2o izq.; 51086553B; 625 884 333; ramos.marcos.lama@gmail.com), que tiene ELA; su mujer, Marina Arribas (617 374 182; arribas.marina@hotmail.com), '
                    'hija de Jorge Arribas, propietario (670 531 118; jarribas@arribasm.es); Rosa, familiar (620 028 255; para visitas de IEE y mediciones). HE FIRMADA POR EL VECINO, NO POR LA '
                    'COMUNIDAD, el 08/07/2025 ("caso especial"). Tipo de obra: ASCENSOR CON DERRIBO, por el exterior + SUBVENCIONES. Barrio: San Juan Bautista. Tecnico: Jhonatan. Ano 1961. '
                    'PEM 183.287,92. Visado TL/000497/2026. Expediente 350/2026/01035. Alineacion oficial 22,65 m. Superficie 122,15 m2. ACTECU no puede tramitarla (ocupa acera de uso publico): '
                    'licencia en el Ayuntamiento, registrada en el SLIM el 15/01/2026. Comercial: DANIEL.'},
    ('ascensor', 'subvenciones'),
    n=fijar('plazacastañares2', 2025, ('2025-06-13', 'Sin fecha; datos de Jorge Arribas, de cuando se cambia el contacto (13/06/2025) y antes de la HE enviada el 16/06/2025.')),
    trae_pu=PU['gmoya'])
CPC2 = OPP['pc2'][0]['id']
pc_unico(CPC2, 'MARCOS RAMOS LAMA', 'vecino', '625884333', '51086553B', 'ramos.marcos.lama@gmail.com',
         'Vecino del 2o izq. (con ELA): PROMOTOR del ascensor; firma la HE como particular el 08/07/2025 (la comunidad no quiere el ascensor).')
pc_unico(CPC2, 'MARINA ARRIBAS', 'otro', '617374182', None, 'arribas.marina@hotmail.com', 'Mujer de Marcos Ramos e hija de Jorge Arribas (jul-2025).')
pc_unico(CPC2, 'JORGE ARRIBAS', 'vecino', '670531118', None, 'jarribas@arribasm.es', 'Propietario; padre de Marina Arribas (jun-2025).')
pc_unico(CPC2, 'ROSA', 'otro', '620028255', None, None, 'Familiar del vecino del 2o izq.; llamarla para las visitas de IEE y mediciones (ficha).')

# ================================================================= 2. CLON
REVS = [
    ('paseovirgendelpuerto27', '2026-01-28', None, None, None,
     'PASEO VIRGEN DEL PUERTO 27 MADRID. Fecha: 01/2026 (dia: el modelo 3D, 28/01/2026). Tipo de obra: RAMPA. CP 28005. Ficha casi vacia: sin contacto ni notas. Hay modelo 3D y la ficha de '
     'Catastro (8938403VK3783H). En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS),
    ('peal20', '2024-11-08', 'JAVIER GARCIA (DEL BRIO Y BLANCO)', None, None,
     'PEAL 20 MADRID. Fecha: 11/2024 (dia: la primera nota, 08/11/2024). Tipo de obra: ASCENSOR (solo por la fachada principal, al patio comunitario; por la calle es inviable). '
     'Distrito Puente de Vallecas. CP 28053. Administracion: DEL BRIO Y BLANCO (Javier Garcia; C/ Pena de la Miel 1, bajo; 91 477 41 91 / 91 478 69 11; javier@delbrioyblanco.es). Contactos: '
     'Julia Gutierrez (645 964 751) y el vicepresidente, Jesus Morcillo (654 612 379). Presupuestos de Fain, Aszende e Inyman; quieren uno de EDITE (no esta en la agenda). HE de proyecto y DF '
     '(sin CSS) y subvenciones enviada el 19/11/2024. En produccion esta PENA DE LA MIEL 5, no Peal 20.\n\n' + crudo('peal20', 2024)),
    ('pedrojimenez8', '2021-08-06', 'RAUL CEREZO (ELECNOR)', None, None,
     'PEDRO JIMENEZ 8 MADRID. Fecha: 08/2021 (dia: el correo de Raul Cerezo de la visita, viernes 6 de agosto; la oferta de Elecnor es del 25/08/2021). Tipo de obra: ASCENSOR (demoler la '
     'escalera y adosar el ascensor a la fachada). Administradora: Samantha (FRAMESAN; 685 694 966) - no esta en la agenda. Dentro de la carpeta esta colada la carpeta '
     '"paseosantamariadelacabeza149" (2015-2017), que va en su propia fila.\n\n' + bloque('pedrojimenez8', 81, 107)),
    ('pedroromero1', '2024-01-31', 'NICOLAS MEDIAVILLA (FAIN) - ELENA ARANGUEZ', None, None,
     'PEDRO ROMERO 1 MADRID. Encargo PRIVADO de Nicolas Mediavilla (presidente de FAIN): su casa (la de Gema). Fecha: 01/2024 (dia: el correo de Mayte Cesteros, de FAIN, 31/01/2024, con la '
     'documentacion del vado; la ficha dice 02/2024). Tipo de obra: VADOS (quitaron el de la C/ Sobradiel y abrieron otro en Pedro Romero 1, y pagan dos). Distrito Hortaleza. Contacto: Elena '
     'Aranguez (secretaria de Mediavilla en FAIN; 687 28 24 83; elena.aranguez@fainascensores.com), que sustituye a Mayte Cesteros, jubilada el 31/01/2024. Tramitacion de la supresion del '
     'vado registrada el 05/02/2024; el 28/05/2024 llega un requerimiento (eliminaron el vado sin autorizacion de obras): hay que hacer un proyecto completo y se manda HE a Mediavilla.\n\n'
     + crudo('pedroromero1', 2024)),
    ('pedrounanue8', '2023-01-16', 'RAUL (FAIN)', None, None,
     'PEDRO UNANUE 8 MADRID. Fecha: 01/2023 (dia: la primera nota y la nube de puntos, 16/01/2023). Tipo de obra: ASCENSOR. Distrito Arganzuela. CP 28045. Contacto: Raul (FAIN; la ficha no dice '
     'cual). En la carpeta: nube de puntos, fotos, modelo 3D y BIM (ene-2023). Nota: "16/01/23 PREPARAR 3D". En produccion esta PEDRO UNANUE 22, no el 8.'),
    ('peñadelamiel6', '2025-03-26', 'JOSE ANTONIO (DEL BRIO Y BLANCO)', 'E78367125', None,
     'PENA DE LA MIEL 6 MADRID. Fecha: 03/2025 (dia: el correo de Jose Antonio, de Del Brio y Blanco, 26/03/2025). Tipo de obra: ASCENSOR (+ subvenciones). Distrito Puente de Vallecas. '
     'CP 28018. CIF en el correo: E78367125. Contacto de la comunidad: Pedro Caguana (3o A; 661 986 862). HE y subv enviadas 26/03/2025; informe de viabilidad 03/04/2025. En produccion esta '
     'PENA DE LA MIEL 5, no el 6.\n\n' + crudo('peñadelamiel6', 2025)),
    ('pensamiento9', '2024-05-13', 'OSCAR LOPEZ (FAIN)', None, None,
     'PENSAMIENTO 9 MADRID. Fecha: 05/2024 (dia: la nota del 13/05/2024). Tipo de obra: ASCENSOR. Distrito Tetuan. CP 28020.\n\n' + crudo('pensamiento9', 2024)),
    ('picobalaitus41', '2022-09-26', 'JOSE VICENTE (LORMAN)', None, None,
     'PICO BALAITUS 41 MADRID. Fecha: 09/2022 (dia: la primera nota, 26/09/2022). Tipo de obra: ASCENSOR (5 plantas, derribo de escalera y rampa de entrada; "similar a Eras 9 Fuenlabrada"). '
     'Distrito Fuencarral - El Pardo. CP 28035. Administracion: LORMAN (Jose Vicente).\n\n' + crudo('picobalaitus41', 2022)),
    ('picodeartilleros30', '2023-09-12', 'JAVIER (ELECNOR)', None, None,
     'PICO DE ARTILLEROS 30 MADRID. Fecha: la ficha dice 10/2023; la primera nota es del 12/09/2023; se toma esa. Tipo de obra: ASCENSOR (igual que Paseo de Extremadura 224, con ascensor '
     'semiautomatico). Distrito Moratalaz. CP 28030. Administracion: GARFINCAS (Ricardo Escobar, administrador de Moratalaz; C/ Corregidor Juan Francisco de Lujan 17, 28030; 91 505 69 47 / '
     '657 570 046; ricardo.escobar@garfincas.com) - no esta en la agenda. Presidente: Emilio Allen (2o A; 639 68 89 28). HE enviadas al administrador el 20/02/2024.\n\n'
     + crudo('picodeartilleros30', 2023)),
    ('picodesalvaguardia6', '2022-09-30', 'JOSE VICENTE (LORMAN)', None, None,
     'PICO DE SALVAGUARDIA 6 MADRID. Fecha: 09/2022 (dia: la nota del 30/09/2022). Tipo de obra: ASCENSOR + PLATAFORMA (ascensor por el hueco del patio invadiendo cocinas, y plataforma '
     'elevadora). Distrito Fuencarral - El Pardo. CP 28035. Administracion: LORMAN (Jose Vicente).\n\n' + crudo('picodesalvaguardia6', 2022)),
    ('pintorjuangris4', '2022-12-01', 'GEMA SANCHEZ (PRESIDENTA)', None, None,
     'PINTOR JUAN GRIS 4 MADRID. Fecha: 12/2022 (dia desconocido; los primeros ficheros, para Iberdrola, son de ene-2023). Tipo de obra: SATE, CALDERA Y ACCESIBILIDAD (documentacion para '
     'Iberdrola, mediciones, nube de puntos y 3D, ene-abr 2023). Distrito Tetuan. CP 28020. Administracion: Victoria (915 740 393; victoriahl@henriquezdeluna.com; Henriquez de Luna) - no '
     'esta en la agenda. Presidenta: Gema Sanchez ("vecina quiere hablar para explicar", 619 110 115). Portero: Jesus (608 270 041; de 7:30 a 14 y de 5 a 8; ugecor@yahoo.es). Tras la '
     'reunion de vecinos (25/04/2023) vuelven a la idea de un salvaescaleras; el SATE, mas adelante.\n\n' + crudo('pintorjuangris4', 2023)),
    ('pitagoras2', '2024-02-22', 'ANDREA DIAZ (ELECNOR)', None, None,
     'PITAGORAS 2 MADRID. Fecha: 02/2024 (dia: el correo de Andrea Diaz, de Elecnor, 22/02/2024). Tipo de obra: ASCENSOR (encaje en la caja de escalera; piden el encaje en dwg). Distrito '
     'San Blas - Canillejas. CP 28022. En la carpeta, los planos de encaje para Elecnor (mar-2024).\n\n' + crudo('pitagoras2', 2024)),
    ('pitagoras3', '2023-06-27', 'JAVIER (ELECNOR)', None, None,
     'PITAGORAS 3 MADRID. Fecha: la ficha dice 10/2023; la primera nota (visita de Javier) es del 27/06/2023; se toma esa. Tipo de obra: ASCENSOR + SALVAESCALERA. Distrito 20 - San Blas - '
     'Canillejas (Canillejas). CP 28022. HE (proyecto, DO y subvenciones) enviada 15-01-2024.\n\n' + crudo('pitagoras3', 2023)),
    ('plazaarteijo14', '2023-06-05', 'JUAN PARAMIO (FAIN)', None, None,
     'PLAZA ARTEIJO 14 MADRID. Fecha: la ficha dice 10/2023; la nota es del 05/06/2023; se toma esa. Tipo de obra: SUSTITUCION DE PUERTAS. Distrito Fuencarral - El Pardo. CP 28029. '
     'La ficha no tiene mas datos.'),
    ('plazadealmuñecar1-2', '2023-01-02', 'JOSE GORDILLO', None, None,
     'PLAZA DE ALMUNECAR 1-2 MADRID. Fecha: 01/2023 (dia: la nota del 02/01/2023). Tipo de obra: SATE + CALDERA COMUNITARIA (IBERDROLA). Distrito Moncloa - Aravaca. CP 28005. Contacto: Jose '
     'Gordillo (bernajgl@yahoo.es). Mancomunidad con Plaza de Almunecar 3-4 (otra carpeta), con su propia calefaccion. En la carpeta, documentacion para Iberdrola y mediciones de los portales '
     '1 y 2 (feb-mar 2023).\n\n' + crudo('plazadealmuñecar1-2', 2023)),
    ('plazadealmuñecar3-4', '2023-01-02', 'JOSE GORDILLO', None, None,
     'PLAZA DE ALMUNECAR 3-4 MADRID. Fecha: 01/2023 (dia: la nota del 02/01/2023). Tipo de obra: SATE + CALDERA COMUNITARIA (IBERDROLA; solo calefaccion; aprovechar para cambiar la cubierta). '
     'Distrito Moncloa - Aravaca. CP 28008. Contacto: Jose Gordillo (bernajgl@yahoo.es). Coincide con la calle Aniceto Marinas 96. Mancomunidad con Plaza de Almunecar 1-2 (otra carpeta). '
     'En la carpeta, documentacion para Iberdrola y mediciones de los portales 3 y 4 (feb-mar 2023).\n\n' + crudo('plazadealmuñecar3-4', 2023)),
    ('plazadealmuñecar6-7', '2019-02-20', 'ANTONIO MIRA (ANYLOR)', None, None,
     'PLAZA DE ALMUNECAR 6 Y 7 MADRID. Fecha: 02/2019 (dia: el croquis y el plano, 20/02/2019; el "Borrador escalera.bak" de oct-2018 es de plantilla). Tipo de obra: ASCENSOR. Distrito '
     'Moncloa - Aravaca. CP 28008. Contacto: Antonio Mira (ANYLOR). En la ficha, una nota del 06/07/2023: "ASCENSOR / VICENTE REAL - FAIN" (vuelve a salir en 2023 con FAIN, sin mas datos; '
     'el mismo dia que Plaza de Almunecar 9).'),
    ('plazadealmuñecar9', '2023-07-06', 'VICENTE REAL (FAIN)', None, None,
     'PLAZA DE ALMUNECAR 9 MADRID. Fecha: la ficha dice 10/2023; la nota es del 06/07/2023; se toma esa. Tipo de obra: ASCENSOR. Distrito Moncloa - Aravaca. CP 28008. La ficha no tiene mas datos.'),
    ('plazadegabrielmiro3', '2026-06-24', 'ISAAC PIZARROSO (GESTIN)', None, None,
     'PLAZA DE GABRIEL MIRO 3 MADRID. Fecha: 06/2026 (dia: el correo de Isaac Pizarroso, de Gestin, 24/06/2026). Tipo de obra: SATE (proyecto, DF y subvenciones; IEE desfavorable; dos '
     'alternativas: rehabilitacion tradicional o con SATE). Administracion: GESTIN SAP (Isaac Pizarroso Arnao; Alberto Aguilera 7, 1 izda., 28015; 91 447 10 09; isaacpizarroso@gestin.es). '
     'Presidente: Luis Alvarez (4o E; 609 056 589; l.alvarez@telefonica.net); vicepresidenta: Catalina Ribas (3o E; 686 979 567; catiribasprats@hotmail.com). IEE facilitada. Estudio de Daniel '
     'con las dos actuaciones enviado 01-07-26. La comunidad no esta en produccion.\n\n' + crudo('plazadegabrielmiro3', 2026))]
for carp, fecha, trajo, cif, ref, t, *ruta in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, comercial='Alvaro' if carp == 'paseovirgendelpuerto27' else 'Daniel', ruta=ruta[0] if ruta else None)
for carp, fecha, trajo, t, *ruta in [
        ('paseosantamariadelacabeza129', '2016-02-04', 'FELIPE OSADO (ENOR)',
         'PASEO SANTA MARIA DE LA CABEZA 129 MADRID. Fecha: 04/02/2016 (la fecha de inicio de la ficha). Ficha vacia; hay la oferta de ENOR del ascensor y un documento (abr-2016).'),
        ('paseosantamariadelacabeza129-131', '2015-04-15', None,
         'Carpeta "paseosantamariadelacabeza129-131" SIN ficha de datos: solo un .doc y un pdf del 15/04/2015.'),
        ('paseosantamariadelacabeza7', '2015-01-09', 'PEDRO ARANDA (THYSSEN)',
         'PASEO SANTA MARIA DE LA CABEZA 7 MADRID. Fecha: 01/2015 (dia: la visita a la Junta de Arganzuela, 09/01/2015; las fotos dicen 01/01/2015). Tipo de obra: ascensor en planta. Ficha vacia '
         'salvo: "Visite junta de distrito Arganzuela 9/1/2015. Esta protegida la escalera y el patio".'),
        ('paseosantamariadelacabeza149', '2015-10-23', None,
         'Carpeta COLADA dentro de "pedrojimenez8". PASEO SANTA MARIA DE LA CABEZA 149 MADRID. Fecha: la de la ficha, 23/10/2015 (ficha vacia, sin agente ni datos); hay croquis, plano y '
         'presupuesto (feb-2017).', B.join(['MADRID', 'pedrojimenez8', 'paseosantamariadelacabeza149'])),
        ('pedrounanue16', '2015-12-03', 'PEDRO ARANDA (THYSSEN)',
         'PEDRO DE UNANUE 16 MADRID. Fecha: 03/12/2015 (la de la ficha y las fotos). Tipo de obra: CARACOL; ascensor de embarque doble a 90, 4 paradas, foso reducido, cambiar cuarto de '
         'contadores, acunamiento (debajo hay garaje). Contacto: Guillermo (629 239 414). Hay croquis, plano y oferta (dic-2015).'),
        ('pelayo51', '2016-10-06', 'LUIS MIGUEL NUNES (THYSSEN)',
         'PELAYO 51 MADRID. Fecha: 06/10/2016 (la de la ficha y el correo de Luis Miguel Nunes con el croquis). Ascensor de 5 paradas, doble embarque a 180, cabina accesible 1000 x 1250 '
         '(corrala; acceso desde la calle por el patio). Hay croquis y presupuesto (dic-2016).'),
        ('plazadecascorro1', '2016-06-20', 'PEDRO ARANDA (THYSSEN)',
         'PLAZA DE CASCORRO 1 MADRID. Fecha: 20/06/2016 (la de la ficha). Ficha vacia salvo el correo de Pedro Aranda: si la escalera no esta protegida, presupuesto modificandola (ancho 2,30 m, '
         'fondo 4,50 m, 7 paradas frontales). Hay ficha de condiciones urbanisticas (jun-2016), croquis, presupuesto y plano (sep-oct 2017).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t, ruta=ruta[0] if ruta else None)
# Pensamiento 24: sin ficha, pero proyecto hecho y tasas de licencia pagadas -> abierta (como Goya 55; revision de Monica/Claude, 7-oct-2026)
fila('pensamiento24', '2018-09-02', 'abierta', None, None, None, None,
     'Carpeta "pensamiento24" SIN ficha de datos: "DATOS VIEJOS" (sep-2018 a mar-2019: presupuesto y mediciones de BENEMADRID, tasas de licencia e ICIO pagadas en mar-2019), "Datos nuevos" '
     '(jun-2019 a jun-2020), propuesta (sep-2019), proyecto (2019-2021) y planta actual (nov-2021). Proyecto hecho.' + REV)

# ================================================================= 3. MANIAS (todas de ACTECU, con cita literal)
mania('Si las obras son de reestructuracion puntual (art. 1.4.8 del PGOUM), ACTECU las tramita por DECLARACION RESPONSABLE y no por licencia, aunque la comunidad pida licencia.',
      'ECU (ACTECU)', '2026-08-27', 'piedrahita2', clave='ph2', trozo='Reestructuración Puntual')
mania('Para un ascensor sobre suelo de titularidad dudosa, ACTECU pide acreditar la titularidad con el Inventario del Ayuntamiento de Madrid y el Inventario Separado de Vias Publicas y '
      'Zonas Verdes; el del Patrimonio Municipal del Suelo no basta.', 'ECU (ACTECU)', '2026-03-10', 'pingüino9', clave='pin9', trozo='Inventario Separado de Vías Públicas')
mania('ACTECU no devuelve las tarifas de un expediente ya estudiado (con requerimientos), aunque la comunidad no pueda seguir con la tramitacion; se puede pedir una prorroga para contestar.',
      'ECU (ACTECU)', '2026-01-22', 'picodeartilleros39', clave='pa39',
      cita='Este expediente 1311025030003 se ha estudiado y revisado y se le hizo 2 requeridos y 1 incompleto, por lo que no tienen derecho a devolución de los tarifas abonadas. '
           'En relación al  plazo pueden pedir una nueva prórroga para contestar al requerimiento hasta el 30/06/2026.')

resumen()
