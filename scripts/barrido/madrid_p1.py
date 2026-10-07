# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda P1 (pablolafargue10 .. paseosantamariadelacabeza127, 55 carpetas [0:55] de la P). 7-oct-2026. Sin --escribir: marcha en seco.
# La P2 [55:110] y la P3 [110:165] las preparan otros agentes a la vez.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de

FAIN = 'fa005671-8d23-45a6-8172-0ea7ca8c8950'; MATEDECON = '0bc4a0bd-3339-4a3c-84e1-66d122c1e502'
AGA = '34f0b172-5d39-4dfa-9d7a-46b3120d8624'; GUERRERO = 'dcf97da1-fcca-4a17-84ab-43430072d964'; TREBOL = '1dc85bf6-c0ef-4aae-94b9-ad65db1e15cd'
PU.update(velasco='94b4d0ec-edd7-4038-a58f-0823b287fa8f', olga_jimeco='ef1332fc-cd83-4b25-9efd-ddca69691dd0', isaac='e5abf29a-a25f-4c87-8705-6dc523285e1f',
          valentin='fc104c31-8b03-4891-ba32-f2d201431804', oscar_lopez='d1e23642-da9f-4493-8134-f9f9bdb16e74', montoro='2d20b9b4-9a2d-4187-9481-28fb620eb3e7',
          mozos='08ee90bc-7c51-4ca1-8e2c-b3096f79c755', magomez='84f6210b-6fc3-48c4-b18c-b8cffb9416c9', silvia='6c8e1a7f-999b-4ee9-ac91-cfeb7075dd8c',
          jagra='774c387a-15c5-40e7-a8c3-bcb7f305637c')

# Propuesta para Monica (como Fatou 24 / Besteiro): Palomares 75, 77, 79 y Paseo de los Ferroviarios 9 y 11 son la MISMA parcela (9368601VK3696G) y en
# feb-2026 Alvaro prepara a la vez "HE E INFORME" de ASC + SATE CON CAES para cada portal. Es UNA oportunidad con varias HE: se rellena PALOMARES 77
# y se le enlazan los accesos de 75, 79, Ferroviarios 9 y 11. La opp vacia de PASEO DE LOS FERROVIARIOS 9 se deja SIN tocar (para borrarla).
# False = cada portal por su lado: Palomares 77 y Ferroviarios 9 en produccion; 75, 79 y Ferroviarios 11 a la clon.
PALOMARES_UNA_OPP = True
ACC_CONJ = {'PALOMARES 75': ('9926779e-2d59-4ef8-af5f-7d6a49af60ae', 'f689c025-c213-4258-b414-863ebd0b5c00'), 'PALOMARES 79': ('6ba8fae3-c84b-467f-a8cc-f4a79c263129',),
            'FERROVIARIOS 9': ('3a2ed12b-b8d4-44f2-a5f2-70942426453a',), 'FERROVIARIOS 11': ('37f88b7d-86ea-4f27-8043-f12ca0ef5196',)}
PS9A = 'pabloserrano9/accesibilidad/FICHA DATOS TECNICOS.docx'
PS9S = 'pabloserrano9/sate/FICHA DATOS TECNICOS.docx'
PL10 = 'pablolafargue10/ascensor/FICHA DATOS.docx'


def trae(pcid):
    return {'quien_persona_comunidad_id': pcid, 'persona_comunidad_id': pcid}


def cid_de(prefijo):
    cs = b.leer('comunidades?select=id&municipio=eq.MADRID&nombre=like.' + quote(prefijo) + '*'); assert len(cs) == 1, prefijo
    return cs[0]['id']


def pc_unico(cid, nombre, rol, tel=None, doc=None, email=None, notas_=None):
    """pc() para roles que no son presidente, sin repetirla si el script se relanza."""
    ya = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&nombre=eq.%s' % (cid, quote(nombre)))
    return ya[0]['id'] if ya else pc(cid, nombre, rol, tel, doc, email, notas_)


def motivo(n, i, m):
    f, t = n[i]; n[i] = (f, t + '\n\n(' + m + ')'); return n


def enlazar(oid, accs, de_donde):
    for acc in accs:
        if not b.leer('relacion_oportunidad_accesos?select=acceso_id&opp_id=eq.%s&acceso_id=eq.%s' % (oid, acc)):
            ins('relacion_oportunidad_accesos', [{'opp_id': oid, 'acceso_id': acc, 'de_donde': de_donde}])


cl = lambda c, a, s=None: J(fijar(c, a, s))

# ================================================================= 0. AGENDA (ninguna junta nueva)
# ORTIZ GINESTAL: administracion de Padilla 56 (comunidad de produccion) que no esta en la agenda -> alta (criterio de ADMONPATRIMONIOS, madrid_g1).
ORTIZ = (b.leer('empresa?select=id&nombre_accesalia=eq.' + quote('ORTIZ GINESTAL')) or [{'id': None}])[0]['id']
if not ORTIZ:
    ORTIZ = nuevo_id()
    ins('empresa', [{'id': ORTIZ, 'nombre_accesalia': 'ORTIZ GINESTAL', 'tipo': 'administracion_fincas', 'activa': True, 'comercial_id': DANIEL,
                     'notas': 'Alta en el barrido de Madrid (Padilla 56: la administracion pide presupuesto el 25-06-2025; carpeta padilla56). '
                              'C/ Corregidor Alonso de Tobar 23, bajo B; 913 281 332. Sale tambien en Comercio 5 y Luis de Hoyos Sainz 108 (2025).'}])
MARISA = persona_nueva('Marisa', 'Lima', 'administradora de fincas', '629013340', None, empresa=ORTIZ,
                       notas_='Ortiz Ginestal: lleva Padilla 56 (correo del 25-06-2025; carpeta padilla56). Oficina 913 281 332, ext. 1. En la ficha el correo es solo "ortizginestal.com".')
SORALLA = persona_nueva('Soralla', None, 'administradora de fincas', '670098012', 'gd_inmobiliario@hotmail.com', empresa=GUERRERO,
                        notas_='Guerrero Dadillos: administradora de Paseo de Federico Garcia Lorca 16 (nov-2025; llega a traves de Jose Maria, administrador de '
                               'Puerto de Alazores 11). Oficina 913 319 025 (carpeta paseodefedericogarcialorca16).')
ANA_AGA = persona_nueva('Ana', None, 'administradora de fincas', None, None, empresa=AGA,
                        notas_='AGA Antonaya: "ANA ADMIN AGA (a traves de Roen)", quien contacta en Pablo Serrano 9 (2023-2025; carpeta pabloserrano9).')
DENISON = persona_nueva('Denison', 'Pinedo', 'jefe de obra', None, 'rehabilitacionesmatedecon@gmail.com', contrata=MATEDECON,
                        notas_='Matedecon: jefe de obra de la cubierta del garaje de Palomares 75-77-79 (2024-2025); trae Pablo Neruda 29 y Palomeras 17 (sep-2026; en las fichas '
                               '"DENNISON MATEDECOM").')
MAMEN = persona_nueva('Mamen', None, 'administradora de fincas', None, None, empresa=TREBOL,
                      notas_='Grupo Trebol (trebol.fincas@gmail.com): trae Paseo Olivos 54 (jul-2026; carpeta paseoolivos54).')

# ================================================================= 1. PRODUCCION
rellenar('pl10', 'PABLO LAFARGUE 10', 'pablolafargue10', {'fecha_apertura': '2025-11-24',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia: el correo de Javier Velasco, 24/11/2025: "PRESUPUESTO ASCENSOR + IEE + RECRECIDO DE TERRAZAS"). Contacta: Javier Velasco (ELECNOR; '
                    '680 967 159; fjvelasco@elecnor.com). Tipo de obra: ASCENSOR + SUBV y RECRECIDO DE TERRAZAS a ambos lados de la fachada (dos fichas, una por encargo, en las subcarpetas '
                    '"ascensor" y "recrecido de terraza", con las mismas notas: es un solo encargo). HE enviada 25/11/2025. Comercial interno: DANIEL.'},
    ('ascensor', 'subvenciones', 'iee', 'otros_proyecto_tecnico'), n=fijar(PL10, 2025, ('2025-11-24', 'Correo de Javier Velasco (Elecnor) del 24 de noviembre de 2025.')),
    trae_pu=PU['velasco'])

rellenar('pl38', 'PABLO LAFARGUE 38', 'pablolafargue38', {'fecha_apertura': '2025-09-11', 'referencia_catastral': '4649920VK4744H',
    'origen_notas': 'Fecha de llegada: la ficha dice 12/2025; en la carpeta hay antes el CEE firmado y registrado (11/09/2025) y la IEE firmada y registrada (sep-oct 2025); manda la huella. '
                    'Contacta: Olga (JIMECO; 611 383 164; administracion@jimeco.es); "vino por Siglo XXI". Paga la CP. Tipo de obra: ASC + SUBV. Tecnico: Claribel Salazar. Fecha encargo: '
                    '08/06/2026. Ano 1960. Contacto de la comunidad: Javier, vecino (637 99 68 75). Proyecto terminado y enviado a los interesados el 29/09/2026; a la espera del ok para tramitar. '
                    'En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('ascensor', 'subvenciones'), n=fijar('pablolafargue38', 2026), comunidad={'iban': 'ES30 2100 0579 6713 0031 8085'},
    trae_pu=PU['olga_jimeco'], captador=CARLOS, lleva=ALVARO)
pc_unico(OPP['pl38'][0]['id'], 'JAVIER (VECINO)', 'vecino', '637996875', None, None, 'Vecino; persona de contacto de la comunidad (ficha, 2025-2026).')

# Pablo Serrano 9: dos encargos con ficha propia. En produccion va el VIVO (accesibilidad, 2025-2026); el SATE (2023-2026, obra hecha) a la clon.
rellenar('ps9', 'PABLO SERRANO 9', 'pabloserrano9', {'fecha_apertura': '2025-01-08', 'referencia_catastral': '5303217VK4850C',
    'origen_notas': 'Fecha de llegada: 01/2025 (dia: la primera nota, HE de accesibilidad enviada el 08/01/2025 "para resolver IEE y subvenciones"; la comunidad ya era cliente por el SATE '
                    'de 2023, que va aparte a la clon como "pabloserrano9 (2023)"). Contacta: Ana (AGA ANTONAYA), a traves de Roen. Tipo de obra: ACCESIBILIDAD + SUBV. Barrio: Pinar del Rey. '
                    'Tecnico: Julio. Fecha encargo: enero 2025 (HE firmada en la reunion del 17/01/2025). Ano 1972. Administracion: A.G.A. ANTONAYA (C/ Pegaso 32, local; Alfonso y Marian; '
                    'Raquel Maestro, 666 65 36 65; 91 759 39 09; raquelmaestro@antonaya.com, alfonso@antonaya.com). Licencia en la Junta de Hortaleza presentada 16-06-2025, con licencia de '
                    'invasion de espacio publico; visado TL/003728/2025; expediente 350/2025/18423; en 2026 sigue en informe tecnico. En jul-2026 se envian proyecto y ciego a la '
                    'administracion y se piden precios a Elecnor, Matedecon y Didepro. Presidente: Jorge Vazquez Guzman; antes ~~Josefa Gonzalez Melero (50398100V)~~, tachada. '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('accesibilidad', 'subvenciones'), n=fijar(PS9A, 2025), trae_pu=ANA_AGA)

PADILLA = 'Fecha de llegada: 06/2025 (dia: el correo de la administracion, 25/06/2025). Contacta: Marisa Lima (ORTIZ GINESTAL; C/ Corregidor Alonso de Tobar 23, bajo B; 629 013 340 / ' \
          '913 281 332 ext. 1; administracion dada de alta en el barrido). Tipo de obra: ARREGLO DE FACHADA (fachada exterior protegida y patios interiores: proyecto para pedir presupuestos, ' \
          'valoracion y DF), SATE en el futuro. Daniel visita el 07/07/2025: oferta del arreglo sin subvencion y aparte los costes de SATE + SUBV. HE enviada 21/07/2025: "de momento no les ' \
          'interesa". Comercial interno: DANIEL.'
rellenar('pad56', 'PADILLA 56', 'padilla56', {'fecha_apertura': '2025-06-25', 'origen_notas': PADILLA}, ('arreglo_fachada',), n=fijar('padilla56', 2025),
         adm=MARISA, trae_pu=MARISA)

n = fijar('padreclaret21', 2025, ('2025-12-03', 'Correo de Isaac Pizarroso (Gestin) del 3 de diciembre de 2025.'))
n = motivo(partir(n, 0, 'DANIEL:', '2025-12-11'), 1, 'Sin fecha; la viabilidad de Daniel que va con la HE del 11/12/2025.')
rellenar('pc21', 'PADRE CLARET 21', 'padreclaret21', {'fecha_apertura': '2025-12-03',
    'origen_notas': 'Fecha de llegada: 12/2025 (dia: el correo de Isaac Pizarroso, 03/12/2025, tras la junta del dia anterior; en la carpeta hay un modelo .skp del 22/10/2025, sin otra '
                    'huella de esa fecha). Contacta: Isaac Pizarroso Arnao (GESTIN; C/ Alberto Aguilera 7, 1o izda.; 91 447 10 09; isaacpizarroso@gestin.es). Tipo de obra: MODIFICACION DE '
                    'RAMPAS + SUBV (rampa nueva de tres tramos con doble pasamanos, se modifican las 2 rampas exteriores; contrata 45.000 EUR + IVA). Vicepresidente: Luis Alvarez (609 056 589; '
                    'l.alvarez@telefonica.net). En copia del correo, la junta rectora: Fatima Ruiz del Olmo (5o F; fatima.ruiz@icloud.com) y Amparo Alberruche (amparoalberruche@gmail.com). '
                    'HE con viabilidad enviada 11/12/2025. Comercial interno: DANIEL.'},
    ('rampa', 'accesibilidad', 'subvenciones'), n=n, adm=PU['isaac'], trae_pu=PU['isaac'])
pc_unico(OPP['pc21'][0]['id'], 'LUIS ALVAREZ', 'vicepresidente', '609056589', None, 'l.alvarez@telefonica.net', 'Vicepresidente (correo de Gestin del 03/12/2025).')

# Palomares 75-77-79 (comunidad del GARAJE de toda la manzana): el arreglo de la cubierta del garaje (2024-2026).
n = fijar('palomares75-77-79', 2022, otros={0: ('2022-09-29', 'Sin dia; el unico dia que da la nota es el del correo a Renovae, 29/09/2022. Todo lo tachado de 2022-2023 '
                                                               '(ascensores, SATE y FV de los portales) ya no vale.')})
for i, (marca, fecha) in enumerate((('~~07/03/2023 MANDADA', '2023-03-07'), ('~~29/05/2023~~', '2023-05-29'), ('~~12/06/2023~~', '2023-06-12'),
                                    ('~~31/08/2023', '2023-08-31'), ('~~24/10/2023', '2023-10-24'), ('Mayo 2024:', '2024-05-01'))):
    n = partir(n, i, marca, fecha)
n = motivo(n, 6, 'Dia desconocido: la nota dice "Mayo 2024".')
rellenar('pal_garaje', 'PALOMARES 75-77-79', 'palomares75-77-79', {'fecha_apertura': '2022-09-29', 'referencia_catastral': '9368601VK3696G',
    'origen_notas': 'Fecha de llegada: 09/2022 (dia: el correo a Renovae del 29/09/2022, que cita la primera nota). Contacta: Valentin (ADMINISTRACIONES ALCORA; 617 35 47 03 / 916 978 551; '
                    'administracion@administracionesalcora.es). Tipo de obra: ~~3 ASCENSORES Y SATE + FV~~ (2022-2023, tachado) -> REPARACION DE LA CUBIERTA DEL GARAJE DE TODA LA MANZANA '
                    '(calles Talco, Palomares, Puerto Lapice y Paseo de los Ferroviarios) + OBRA DE POCERIA DEL GARAJE, firmada en mayo de 2024. Barrio: Villaverde Alto - Casco Historico de '
                    'Villaverde. Tecnico: Julio. Promotor: CDAD PROP PALOMARES 75 GARAJE (CIF H88443007; C/ Palomares 75, garaje; IBAN ES83 2085 9291 5103 3053 2757); presidente de los '
                    'garajes: Tomas Boldo Ochoa (01897464X; 629 715 253). Ano 1976. Jefe de obra: Denison Pinedo (MATEDECON). Inicio de obra: 23-10-2024. PEM 229.240,13. Visados TL/015513/2024, '
                    'TL/015528/2025 (OK) y TL/015847/2025 (se anula). Expediente 350/2024/22885. Fin de obra con visita de la ECU (11/12/2025); el Ayto no devuelve el aval de residuos hasta que la '
                    'ITE sea favorable; en sep-2026, certificado de idoneidad pedido. Comercial: ALVARO.'},
    ('arreglo_cubierta', 'df'), n=n, presi=('TOMAS BOLDO OCHOA', 'presidente', '629715253', '01897464X'), captador=ALVARO, lleva=ALVARO)

PAL = ('Contacta: Valentin (ADMINISTRACIONES ALCORA; 617 35 47 03 / 916 978 551; administracion@administracionesalcora.es). Tipo de obra: ASC + SATE CON CAES. HE e informe elaborados '
       '10-02-2026, "en manos de Alvaro". Comercial interno: ALVARO.')
if PALOMARES_UNA_OPP:
    n = [(f, '[PALOMARES 77] ' + t) for f, t in fijar('palomares77', 2026)]
    n += [(f, '[PALOMARES 75] ' + t) for f, t in fijar('palomares75', 2026)] + [(f, '[PALOMARES 79] ' + t) for f, t in fijar('palomares79', 2026)]
    n += [(f, '[PASEO DE LOS FERROVIARIOS 9] ' + t) for f, t in fijar('paseodelosferroviarios9', 2023)]
    n += [(f, '[PASEO DE LOS FERROVIARIOS 11] ' + t) for f, t in fijar('paseodelosferroviarios11', 2025)]
    rellenar('pal77', 'PALOMARES 77', 'palomares77', {'fecha_apertura': '2026-02-06', 'referencia_catastral': '9368601VK3696G',
        'origen_notas': 'Fecha de llegada: 02/2026 (dia: las fotos de WhatsApp del 06/02/2026; el .skb de ene-2026 es de plantilla). CONJUNTO de cinco portales de la misma parcela, '
                        'con HE e informe por portal: Palomares 75, 77 y 79 y Paseo de los Ferroviarios 9 y 11 (carpetas palomares75, palomares77, palomares79, paseodelosferroviarios9 '
                        'y paseodelosferroviarios11; las notas llevan delante el portal). ' + PAL + ' Antecedentes: Ferroviarios 9, 10/03/2023 (propuesta de honorarios y ascensor con '
                        'Fain; tipo de obra ~~ASCENSOR + SATE + FV ZONAS COMUNES~~, tachado); Ferroviarios 11, ene-2025, viene de ~~Javier Gonzalez Moya (SCHINDLER)~~, tachado: "POR '
                        'MUESTRA CUENTA 2026", Alvaro visita por nuestra cuenta el 07/02/2026 (en la ficha, administracion "URBA GESTORES??"). El garaje de la manzana (cubierta, 2024) es '
                        'otra oportunidad: PALOMARES 75-77-79.'},
        ('ascensor', 'sate', 'caes'), n=n, adm=PU['valentin'], trae_pu=PU['valentin'], captador=ALVARO, lleva=ALVARO)
    for k, accs in ACC_CONJ.items():
        enlazar(OPP['pal77'][1], accs, 'Conjunto Palomares 75-77-79 / Ferroviarios 9-11 (misma parcela 9368601VK3696G): HE de ASC + SATE con CAES por portal, feb-2026 '
                                       '(carpetas palomares75, palomares79, paseodelosferroviarios9 y 11). Portal: %s.' % k)
else:
    rellenar('pal77', 'PALOMARES 77', 'palomares77', {'fecha_apertura': '2026-02-06', 'referencia_catastral': '9368601VK3696G',
        'origen_notas': 'Fecha de llegada: 02/2026 (dia: las fotos de WhatsApp del 06/02/2026; el .skb de ene-2026 es de plantilla). ' + PAL},
        ('ascensor', 'sate', 'caes'), n=fijar('palomares77', 2026), adm=PU['valentin'], trae_pu=PU['valentin'], captador=ALVARO, lleva=ALVARO)
    rellenar('fer9', 'PASEO DE LOS FERROVIARIOS 9', 'paseodelosferroviarios9', {'fecha_apertura': '2023-03-10', 'referencia_catastral': '9368601VK3696G',
        'origen_notas': 'Fecha de llegada: 03/2023 (dia: la primera nota, 10/03/2023). Barrio: Moscardo. Tipo de obra: ~~ASCENSOR + SATE + FV ZONAS COMUNES~~ (tachado) -> en feb-2026, '
                        'ASC + SATE CON CAES como el resto de portales de la parcela. ' + PAL},
        ('ascensor', 'sate', 'caes'), n=fijar('paseodelosferroviarios9', 2023), adm=PU['valentin'], trae_pu=PU['valentin'], captador=ALVARO, lleva=ALVARO)

cem8 = cid_de('PARQUE EUGENIA DE MONTIJO 8')
jlp = pc_unico(cem8, 'JOSE LUIS PEREZ', 'otro', None, None, 'jose10861@gmail.com', 'Contacta (quien contacta y persona de contacto en la ficha, mar-2026).')
rellenar('pem8', 'PARQUE EUGENIA DE MONTIJO 8', 'parqueeugeniademontijo8', dict({'fecha_apertura': '2026-03-09',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia: el de la ficha, unico fichero de la carpeta). Contacta: Jose Luis Perez (jose10861@gmail.com). Tipo de obra: QUITAR AMIANTO, CHOVATERM EN '
                    'CUBIERTA + SATE. La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + EXT}, **trae(jlp)),
    ('arreglo_cubierta', 'sate'), captador=ALVARO, lleva=ALVARO)

rellenar('pa27', 'PARVILLAS ALTAS 27', 'parvillasaltas27', {'fecha_apertura': '2022-06-14', 'referencia_catastral': '9864602VK3696D',
    'origen_notas': 'Fecha de llegada: 06/2022 (dia: la primera nota, 14/06/2022: presentado con 3D generico). Contacta: Oscar Lopez (FAIN). Paga FAIN ("No va con hoja de encargo. Datos en '
                    'correo de Oscar Lopez", 31/08/2022). Tipo de obra: ASCENSOR + CSS + SUBV. Barrio: Villaverde Alto - Casco Historico de Villaverde. Tecnico: Javier -> valoracion Carlos Alberto. '
                    'Fecha encargo: 02/09/2022. Jefes de obra: Daniel Palacios y Abel Bernardos (FAIN). Administracion: ASESORAMIENTO Y GESTION LYS (Elena Lozano Diaz; P. de las Moreras 13, '
                    'local; 917 109 098, de lunes a viernes 9:30-14:30 y 16:30-19:30; elena@lysasesores.com; ~~info@lysasesores.com~~ "no los recibe"). Presidente: Daniel Lozano Moreno '
                    '(649 562 100). Junta de Villaverde: "NZ4. OJO VILLAVERDE: TIENE QUE IR POR LICENCIA. Lo tramitamos nosotros, no a traves de ECU". PEM 148.323,74. Visados TL/018626/2022 '
                    'y TL/005510/2026 (CFO). Expediente 350/2022/12369. Superficie 54,73. Obra con actas (ene-mar 2025); CFO visado y enviado en abr-2026. La ficha no dice comercial interno; '
                    'la lleva Daniel.'},
    ('ascensor', 'css', 'subvenciones', 'cfo'), n=fijar('parvillasaltas27', 2022), presi=('DANIEL LOZANO MORENO', 'presidente', '649562100'), trae_pu=PU['oscar_lopez'])

rellenar('pe150', 'PASEO DE EXTREMADURA 150', 'paseodeextremadura150', {'fecha_apertura': '2026-07-13',
    'origen_notas': 'Fecha de llegada: 07/2026 (dia: el correo de Alfonso Montoro, 13/07/2026). Contacta: Alfonso Montoro (SERVICIOS URBANOS; San Bernardo 122, 2o dcha.; 91 445 00 93; '
                    'amontoro@serviciosurbanos.com). Tipo de obra: CUBIERTA + SUBV: honorarios de memoria y mediciones para el concurso de empresas, tramitacion de la DR, DF y solicitud de '
                    'subvenciones; la hoja tecnica (5.300 EUR) la manda Lopez Osa (HERMANOS LOPEZ OSA, constructora). HE enviada 16-07-2026 tras el ok de Monica. Comercial interno: DANIEL.'},
    ('arreglo_cubierta', 'memoria_valorada', 'df', 'subvenciones'),
    n=fijar('paseodeextremadura150', 2026, ('2026-07-13', 'Correo de Alfonso Montoro (Servicios Urbanos) del 13 de julio de 2026.')), adm=PU['montoro'], trae_pu=PU['montoro'])

rellenar('fgl16', 'PASEO FEDERICO GARCIA LORCA 16', 'paseodefedericogarcialorca16', {'fecha_apertura': '2025-11-26',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia: el escaneo 3D y la HE, 26/11/2025). Contacta: Soralla, administradora (GUERRERO DADILLOS; 913 319 025 / 670 098 012; '
                    'gd_inmobiliario@hotmail.com), a traves de Jose Maria, administrador de Puerto de Alazores 11 (en la ficha "Puerto de las Azores"). Tipo de obra: ASCENSOR CON DERRIBO + SUBV '
                    '(derribo completo de la escalera sin tocar el patio; torre para un ascensor electrico gearless de 4 plazas; contrata 185.000 EUR + IVA). HE con informe de viabilidad enviada '
                    '26/11/2025. Comercial interno: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('paseodefedericogarcialorca16', 2025, ('2025-11-26', 'Sin fecha; la viabilidad de Daniel que va con la HE del 26/11/2025.')),
    adm=SORALLA, trae_pu=SORALLA)

n = fijar('paseodelahabana80', 2025, ('2025-11-26', 'Sin fecha; la viabilidad de Daniel que va con la HE del 26/11/2025.'))
n = partir(n, 1, '---------- Forwarded message', '2026-06-15')
rellenar('ph80', 'PASEO DE LA HABANA 80', 'paseodelahabana80', {'fecha_apertura': '2025-11-26', 'referencia_catastral': '2387507VK4728G',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia: el escaneo 3D y la HE con viabilidad, 26/11/2025). Contacta: Fernando Mozos (ITACA FINCAS; fmozos@itacafincas.net). Paga la CP. Tipo de '
                    'obra: ACCESIBILIDAD (plataforma elevadora vertical en el portal y modificacion de la escalera del primer tramo) + SUBV; el 26/06/2026 pasa a proyecto conjunto SATE + '
                    'accesibilidad + subvenciones: aislamiento de la fachada principal, arreglo y aislamiento de la cubierta y saneado de la fachada de patio (HE rehecha tras la visita del '
                    '07/07/2026). Fecha encargo: 09/09/2026 (HE de proyecto y de subvenciones recibidas firmadas). Ano 1961. Itaca quiere el SATE de la marca STO (similitud con ladrillo). '
                    'Comercial interno: DANIEL.'},
    ('accesibilidad', 'plataforma', 'sate_fachada', 'arreglo_cubierta', 'subvenciones'), n=n,
    comunidad={'cif_comunidad': 'H79874699', 'iban': 'ES46 2100 2223 5402 0027 7477'}, adm=PU['mozos'], trae_pu=PU['mozos'])

rellenar('pon29', 'PASEO DE LOS PONTONES 29', 'paseodelospontones29', {'fecha_apertura': '2025-02-24', 'referencia_catastral': '9531114VK3793B',
    'origen_notas': 'Fecha de llegada: la ficha dice 03/2025; la primera nota es del 24/02/2025 (piden visita de viabilidad); se toma esa. Contacta: Miguel Angel Gomez (FAIN); antes ~~David '
                    'Camara Cozar (FAIN)~~, tachado. Paga FAIN (facturas: Noelia Morente, de FAIN). Tipo de obra: ELEVADOR VERTICAL. Tecnico: Jhonatan. Fecha encargo: 04/04/2025 (HE recibida '
                    'firmada). Jefe de obra: Manuel Requena - no esta en la agenda. Ano 1968. DR por ECU (ACTECU), presentada 25-06-2025. Administracion: GESTION SAN JOSE (Fernando San Jose '
                    'Flores; 699 25 28 98; gestionsanjose6@gmail.com), a traves de David Camara. La comunidad se llama "CDAD PROP PS DOCTOR VALLEJO NAGERA 56" ("no es un error!!"). Visados '
                    'TL/009912/2025 y TL/005622/2026 (CFO). HE de CSS (jul-2025) y de subvenciones (firmada 02/02/2026); en la carpeta, la solicitud de la convocatoria 2026 del Ayto de Madrid '
                    '(may-2026). La ficha no dice comercial interno; la lleva Daniel.'},
    ('plataforma', 'css', 'subvenciones', 'cfo'), n=fijar('paseodelospontones29', 2025), comunidad={'iban': 'ES44 0081 5735 4100 0171 5579'}, trae_pu=PU['magomez'])

SILVIA = 'Silvia Arribas (ARRIALSI; Camino de Ganapanes 35, local AF; 917 307 033 / 665 805 356; info@arrialsi.com)'
rellenar('si3', 'PASEO DE SAN ILLAN 3', 'paseodesanillan3', {'fecha_apertura': '2025-06-10',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: la primera nota, 10/06/2025). Contacta: ' + SILVIA + '. Paga la CP. Tipo de obra: ASCENSOR CON DERRIBO + SUBV ("igual que Paseo de San Illan '
                    '7"). HE enviada 11-06-2025; HE firmada 16-09-2026 (fecha encargo). Comercial interno: ALVARO.'},
    ('ascensor', 'subvenciones'), n=fijar('paseodesanillan3', 2025), comunidad={'cif_comunidad': 'H79533170', 'iban': 'ES17 0081 0361 4200 0153 0659'},
    adm=PU['silvia'], trae_pu=PU['silvia'], captador=ALVARO, lleva=ALVARO)

rellenar('si5', 'PASEO SAN ILLAN 5', 'paseodesanillan5', {'fecha_apertura': '2022-06-07', 'referencia_catastral': '8628616VK3782H',
    'origen_notas': 'Fecha de llegada: 06/2022 (dia: la primera nota, 07/06/2022: de parte de MATEDECON, aprobado en junta, quieren arquitecto aparte). Contacta: ' + SILVIA + ' y Vicente '
                    'Real (FAIN), que hace el diseno (presupuesto firmado, 14/09/2022). Tipo de obra: ASCENSOR FAIN EXTERIOR. Barrio: San Isidro. Tecnico: Javier. Jefes de obra: Victor Esquinas, '
                    'Abel Bernardos y Juan Luis (FAIN). PEM 118.983,19. Visado TL/018021/2022. Expediente 350/2022/13172. NZ 3.1.a; licencia ("es por fuera"). Superficie 137,39. HE de renovacion '
                    'de la subvencion enviada 19-05-2025. 2026: estudio geotecnico (GEOTECAM, informe 04/03/2026); la obra no arranca y se presiona a FAIN; nuevo plazo para acometer las obras: '
                    '24/12/2027. El 03-06-2026 se envia ademas HE con oferta de SATE. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=fijar('paseodesanillan5', 2022), trae_pu=PU['silvia'])

rellenar('si7', 'PASEO DE SAN ILLAN 7', 'paseodesanillan7', {'fecha_apertura': '2025-06-10',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: la primera nota, 10/06/2025). Contacta: ' + SILVIA + '. Tipo de obra: ASCENSOR POR HUECO DE ESCALERA ("preparar derribo sin salir a '
                    'iglesia"). HE enviada 11-06-2025. Hay escaneo 3D (jun-2025). Comercial interno: ALVARO.'},
    ('ascensor',), n=fijar('paseodesanillan7', 2025), adm=PU['silvia'], trae_pu=PU['silvia'], captador=ALVARO, lleva=ALVARO)

cmz = cid_de('MARQUES DE ZAFRA 38 BIS')
anton = pc_unico(cmz, 'ANTONIO (VECINO)', 'vecino', '649927218', None, None, 'Vecino; contacta (ficha del 01/09/2025; en la ficha "ANTONIO VECINIO").')
rellenar('mz38', 'MARQUES DE ZAFRA 38 BIS', 'paseomarquesdezafra38bis', dict({'fecha_apertura': '2025-09-01',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia: la ficha, "FICHA DATOS 01-09-2025"; escaneo 3D del 04/09/2025). Contacta: Antonio, vecino (649 927 218). Tipo de obra: SALVAESCALERAS. '
                    'La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS}, **trae(anton)),
    ('accesibilidad',), captador=CARLOS, lleva=ALVARO)

rellenar('per15', 'PASEO PERALES 15 PORTAL 1', 'paseoperales15portal1', {'fecha_apertura': '2026-05-25',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: la fecha de encargo de la ficha, 25/05/2026; los editables de subvencion de abr-may 2026 son de plantilla). Contacta: Jose Gonzalez (JAGRA '
                    'FINCAS; 645 77 36 72; jgonzalez@jagrafincas.es; Carmen, 91 417 37 24; info@jagrafincas.es). Paga la CP. Tipo de obra: SUBVENCION DE OBRA YA HECHA ("SUBV EXT"; la obra '
                    'acabo en 2024; no hay presupuesto de contrata firmado, solo factura y justificante de pago). La ficha no tiene notas de encargo; las de subvenciones van aparte. '
                    'Comercial interno: ALVARO.'},
    ('subvenciones',), comunidad={'iban': 'ES63 0081 5474 8600 0147 1651'}, trae_pu=PU['jagra'], captador=ALVARO, lleva=ALVARO,
    subvencion=[('2026-07-08', '08/07/2026 Hablo con Carmen de JAGRA. Obra acabada. Subvenciones ha solicitado al admin que les indique si el tramitador anterior de subvenciones hubiera '
                               'solicitado ya algún rehabilita. No hay presup de contrata firmado, solamente hay factura y justificante de pago.'),
                ('2026-09-21', '21/09/2026 No se puede presentar a Rehabilita 2026 con modelo III, porque no se ha presentado en ningún año anterior: 2023,2024,2025 Al Ayto de Madrid, se ha '
                               'presentado Adapta 2025 y a la CAM 2025 por su cuenta. Pendiente confirmar que se pueda presentar a CAM siendo que la obra está finalizada en 2024')])
assert subv('paseoperales15portal1').startswith('08/07/2026 Hablo con Carmen'), 'perales: las notas de subvenciones han cambiado'

# ================================================================= 2. CLON
REVS = [
    ('pabloluna4', '2023-07-21', 'OSCAR LOPEZ (FAIN) -> ADMIN ALDAGESTION', None, None,
     'PABLO LUNA 4 MADRID. Fecha: la ficha dice 08/2023; la nota de Monica (presupuesto enviado) es del 21/07/2023; se toma esa. Tipo de obra: SATE, CUBIERTA Y SUBV. Distrito Chamartin. CP 28046. '
     'Contacto: Oscar Lopez (FAIN) -> administracion ALDAGESTION (no esta en la agenda).\n\n' + cl('pabloluna4', 2023)),
    ('pabloneruda29', '2026-09-09', 'DENISON PINEDO (MATEDECON)', None, None,
     'PABLO NERUDA 29 MADRID. Fecha: 09/2026 (dia: el escaneo 3D, 09/09/2026). Tipo de obra: SATE Y ASCENSOR. Contacta: Denison (MATEDECON; rehabilitacionesmatedecon@gmail.com; en la ficha '
     '"DENNISON MATEDECOM"). Administracion: Montserrat (Miasesoria2015@gmail.com) - no esta en la agenda. Contacto de la comunidad: Francisco (comunidadpn@gmail.com; 689 049 625). '
     'La ficha no tiene notas. Comercial interno: ALVARO.'),
    ('pablorica25', '2024-03-18', 'CARMEN (DEL BRIO Y BLANCO)', None, '3313509VK4731D',
     'PABLO RICA 25 MADRID. Fecha: 03/2024 (dia: la primera nota, 18/03/2024). Tipo de obra: ASCENSOR + SUBV. Distrito 13 - Puente de Vallecas (San Diego). CP 28053. Ano 1994. Paga la CP. '
     'Administracion: DEL BRIO Y BLANCO (Carmen; C/ Carlos Martin Alvarez 65 bis, 1o B; 91 477 41 91 y 91 478 69 11; 680 503 243; carmen@delbrioyblanco.es). Presidente: Emilio (678 551 154; '
     'emilisacos@hotmail.com; en la nota "678551754"). HE de proyecto y subvenciones enviada 25/04/2024.\n\n' + cl('pablorica25', 2024)),
    ('pabloserrano7', '2022-06-23', 'JUANI FERNANDEZ (DIDEPRO)', None, None,
     'PABLO SERRANO 7 MADRID. Fecha: la ficha dice 07/2022; la nota del presupuesto enviado es del 23/06/2022; se toma esa. Tipo de obra: PROYECTO + CEE Y SUBV. Distrito Hortaleza. CP 28043. '
     'Contacto: Juani Fernandez (DIDEPRO; jfernandez@didepro.es; en la agenda esta como Juana Maria Fernandez Blazquez, administracion@didepro.es).\n\n' + cl('pabloserrano7', 2022)),
    ('pabloserrano9 (2023)', '2023-09-25', 'ANA (AGA ANTONAYA), A TRAVES DE ROEN', 'E78156957', '5303217VK4850C',
     'PABLO SERRANO 9 MADRID - SATE (subcarpeta "sate"). Fecha: 09/2023 (dia: la primera nota, 25/09/2023; hay un JPG de dic-2022 de calculo de puentes termicos sin otra huella). Tipo de obra: '
     'SATE Y NEXT GENERATION + PROYECTO DE ANDAMIOS. Distrito 16 - Hortaleza (Pinar del Rey). CP 28043. Ano 1972. Tecnico: Julio. Fecha encargo: enero 2024. Contrata y jefe de obra: ROEN '
     '(financiacion bancaria y precio de venta CAES). Licencia por ECU (concedida 07/11/2024); orden de ejecucion por ITE desfavorable. Administracion: A.G.A. ANTONAYA (Alfonso, Marian, '
     'Raquel Maestro). Presidente: Jorge Vazquez Guzman (01930495J); anterior ~~Josefa Gonzalez Melero (50398100V)~~, tachada. PEM 244.382,92. Visados TL/004399/2024 y TL/010028/2026 (CFO). '
     'El CSS no se cobra (la contrata empezo la obra sin centro de trabajo ni PSS aprobado, 31/03/2025). La accesibilidad de 2025 de la misma comunidad es la oportunidad de produccion '
     'PABLO SERRANO 9.\n\n' + cl(PS9S, 2023), R('pabloserrano9') + B + 'sate'),
    ('padreclaret16', '2024-03-12', 'ANTONIO TABASCO', None, None,
     'PADRE CLARET 16 MADRID. Fecha: 03/2024 (dia: la primera nota, 12/03/2024). Tipo de obra: CUBIERTA CON URALITA (sustitucion basica, o con solucion para construir trasteros en el futuro). '
     'Distrito Chamartin. CP 28002. Contacto: Antonio Tabasco (A_tabasco@hotmail.com; 686 62 93 49).\n\n' + cl('padreclaret16', 2024)),
    ('palomeras17', '2026-09-09', 'DENISON PINEDO (MATEDECON)', None, None,
     'PALOMERAS 17 MADRID. Fecha: 09/2026 (dia: la ficha, 09/09/2026, unico fichero). Tipo de obra: SATE. Contacta: Denison (MATEDECON; rehabilitacionesmatedecon@gmail.com). Contacto: '
     'Montserrat (674 458 843). La ficha no tiene notas. Comercial interno: ALVARO.'),
    ('parvillasaltas12', '2020-05-14', 'OSCAR LOPEZ FERNANDEZ (FAIN)', 'H80803778', '9965109VK3696F',
     'PARVILLAS ALTAS 12 MADRID. Fecha: la ficha dice 13 mayo 2020; los primeros ficheros son del 14/05/2020 (acta, presupuesto, CIF). Tipo de obra: INSTALACION DE ASCENSOR. Distrito Villaverde. '
     'CP 28021. Ano 1970. 19 viviendas. Presidenta: Maximina Librero Hernandez (02208789F; 627 047 748; Maximina.librerohernandez@gmail.com). IBAN ES24 2038 1886 3760 0014 7262. PEM '
     '108.002,18. COAM: nuevo fin de obra y anulacion del anterior, TL/005494/2024. Obra hecha (fin de obra 2021-2022). Subvencion CAM 2021 concedida y no cobrada: no se aporto a tiempo el fin '
     'de obra (registrado en abr-2024); la comunidad, en juicio con un vecino (31-10-2024). La ficha recoge un correo de Gerencia (oct-2024): "No pedimos nada al tecnico. POR FA, NO LLAMAR. A la '
     'comunidad la acabo de llamar y le he explicado que hacer, ya esta todo en marcha. Lo podemos archivar". En la carpeta sigue trabajo de subvenciones hasta jul-2026.'),
    ('pasajedellince 8', '2020-07-15', 'CRISTIAN RODRIGUEZ NIETO (FAIN)', 'E78191228', '3536619VK4733F',
     'PASAJE DEL LINCE 8 MADRID. Fecha: la ficha dice DICIEMBRE 2020; los primeros ficheros son del 15/07/2020 ("FAIN. Cambio arquitecto obra", proyecto visado y licencia del arquitecto '
     'anterior); se toma esa. Tipo de obra: INSTALACION DE ASCENSOR EN EDIFICIO RESIDENCIAL EXISTENTE (Accesalia entra por cambio de arquitecto). Distrito Retiro. CP 28007. Mediador: Cristian '
     'Rodriguez Nieto (FAIN Project Manager; 914 093 101 / 673 585 158). Administracion: PRODEFINCAS (Carlos Izquierdo; 914 094 540) - no esta en la agenda; dato de 2020. PEM 75.321,06 '
     '(arquitecto anterior), 106.185,34 (fin de obra). Superficie 77,78. "Se cobra 400 EUR el coste del proyecto". Obra: inicio sep-2021, fin de obra y certificado final a origen (2022).'),
    ('paseodeextremadura244duplicado', '2016-09-13', 'PEDRO ARANDA (THYSSEN)', 'H79672945', '6433810VK3763C',
     'PASEO DE EXTREMADURA 244 DUPLICADO MADRID (CP PASEO EXTREMADURA 244 BIS). Fecha: 13/09/2016 (la de la ficha). Tipo de obra: ASCENSOR (hidraulico, piston lateral, 3 personas). Distrito '
     '10 - Latina. APIRU 10.11 Colonia Batan. CP 28011. Administracion: AFIMOR (Susana; C/ Cine 42-44, local; 915 189 336; susana@afimor.com). Contacto: Ricardo Lopez Martin (91 214 89 30 / '
     '675 622 510). Fachada 14,50 m. PEM 89.496 (residuos 300). Superficie 90,90. Junta de Latina: arquitecto Carlos Borrallo; expediente 110/2016/07033; negociado de licencias 91 588 97 32. '
     'Nota: "Se ha copiado, como ordenaste, el presupuesto de Rio Duero 12 ... para enviar a Olivares en forma de ciego". Obra: acta de inicio (sep-2020), certificaciones (2020-2022), fin de '
     'obra (may-2022) y certificado de correcta realizacion (oct-2022); duda de un vecino sobre vigas (2023).'),
    ('paseodelaflorida57', '2023-01-03', 'JOSE GORDILLO', None, None,
     'PASEO DE LA FLORIDA 57 MADRID. Fecha: 01/2023 (dia: la foto del 03/01/2023). Tipo de obra: SATE + FOTOVOLTAICA + ASCENSOR (ascensor ya preguntado en la junta de distrito; hay consulta '
     'favorable del ascensor con anteproyecto). Distrito Moncloa - Aravaca. CP 28008. Contacto: Jose Gordillo - no esta en la agenda.\n\n'
     + cl('paseodelaflorida57', 2023, ('2023-01-03', 'Sin fecha; la de la foto de la carpeta.'))),
    ('paseodelahabana109', '2023-06-20', 'ALVARO (ELECNOR)', None, None,
     'PASEO DE LA HABANA 109 MADRID. Fecha: 06/2023 (dia: el correo "20-06-2023 Gmail - Subvenciones Paseo de la Habana 109"). Tipo de obra: FACHADA VENTILADA. Distrito Chamartin. CP 28036. '
     'Contacto: Alvaro, de ELECNOR (no esta en la agenda con ese nombre). En la carpeta, el presupuesto de fachada de Elecnor.\n\n' + cl('paseodelahabana109', 2023)),
    ('paseodelahaya2', '2022-05-01', 'JOSE VICENTE (LORMAN)', None, None,
     'PASEO DE LA HAYA 2 MADRID. Fecha: 05/2022 (dia desconocido; la ficha es el unico fichero). Tipo de obra: ELEVADOR. Distrito Carabanchel. CP 28044. Contacto: Jose Vicente (LORMAN '
     'ADMINISTRACIONES). La ficha no tiene notas.'),
    ('paseodelasacacias59', '2017-10-10', 'PEDRO ARANDA (THYSSEN)', None, None,
     'PASEO DE LAS ACACIAS 59 MADRID. Fecha: 10/10/2017 (la de la ficha; croquis y presupuesto del 13/10/2017). Distrito 02 - Arganzuela. Ficha casi vacia; nota: "Ahora (20/01/2020) ha llegado '
     'de Loly (amiga de Patricia) 620 82 93 45, 7mlo.ly@gmail.com"; oferta de honorarios del 23/01/2020 y notificacion de acometida (abr-2022).'),
    ('paseoermitadelsanto41-43', '2023-01-02', 'JOSE GORDILLO', None, None,
     'PASEO ERMITA DEL SANTO 41-43 MADRID. Fecha: 01/2023 (dia: la primera nota, 02/01/2023). Tipo de obra: SATE + CALDERA COMUNITARIA (IBERDROLA); 2 comunidades que comparten caldera de gas. '
     'Distrito Latina. CP 28011. Contacto: Jose Gordillo - no esta en la agenda.\n\n' + cl('paseoermitadelsanto41-43', 2023)),
    ('paseoimperial23', '2015-11-02', 'PEDRO ARANDA (THYSSEN)', 'H79209029', '935127VK379E',
     'PASEO IMPERIAL 23 MADRID. Fecha: 02/11/2015 (la de la ficha). Tipo de obra: PARADA EN PLANTA CON DERRIBO (ascensor por el patio modificando la escalera). Distrito 02 - Arganzuela. '
     'CP 28005. Contacto: Lola Catalan (659 120 114); Thyssen: fernando.villegas@tkelevator.com. Referencia catastral de la ficha incompleta ("935127VK379E"). Fachada 15,60. Superficie 73,60. '
     'PEM 50.000 (residuos 300). Facturas de Thyssen al cliente: 118.214,50 EUR sin IVA (2020-2022). Junta de Arganzuela: expediente 102/2019/00118; tecnico Angel Vidal (91 480 03 96); '
     'licencias 915 886 209. Constructor: MURARIUS (Roberto Plaza; 625 815 634; roberto.plaza@murarius.es) - no esta en la agenda. COAM: TL/020998/2017 y CFO TL/002011/2022. Obra con '
     'certificaciones (2020-2021) y fin de obra (2022).'),
    ('paseomaestramariasanchezarbos1-3', '2025-03-11', 'YOLANDA (QUABIT)', None, None,
     'PASEO MAESTRA MARIA SANCHEZ ARBOS 1-3 MADRID. Fecha: 03/2025 (dia: el primer escaneo 3D, 11/03/2025, guardado con el nombre "San Dacio 35"; la nota del 18/03 pide escanear de nuevo). '
     'Tipo de obra: ASCENSOR CON DERRIBO. Distrito Moncloa - Aravaca. CP 28039. Contacto: Yolanda (QUABIT; 621 180 196; y.mostazo@quabitconstruccion.com). HE enviadas a Quabit el '
     '19/03/2025.\n\n' + cl('paseomaestramariasanchezarbos1-3', 2025)),
    ('paseomelancolicos51', '2021-06-01', 'ANTONIO MIRA (ANYLOR)', 'Q2880005J', '9029401VK3792G',
     'PASEO DE LOS MELANCOLICOS 51 MADRID - IES GRAN CAPITAN (Instituto de Bachillerato Mixto Gran Capitan). Fecha: la ficha no la trae; el primer fichero es del 01/06/2021 (DNI de Daniel '
     'para la declaracion responsable). Tipo de obra: INSTALACION DE ASCENSOR. Distrito Arganzuela. CP 28005. Contacto: la directora, Paloma Ovejero Morcillo. Agente: Antonio Mira (ANYLOR; '
     '917 502 199; a.mira@anylor.com). Presupuesto de contrata 39.950 EUR; presupuesto general 43.945 EUR. Tecnico: Fernan. Visado TL/017901/2021. Expediente de Arganzuela 102-2021-4190. '
     'Declaracion responsable y fin de obra (nov-2021 a ene-2022); devolucion de tasas (dic-2022).'),
    ('paseoolivos54', '2026-07-30', 'MAMEN (GRUPO TREBOL)', None, None,
     'PASEO OLIVOS 54 MADRID. Fecha: 07/2026 (dia: el escaneo 3D, 30/07/2026). Tipo de obra: ASCENSOR. Administracion: GRUPO TREBOL (Mamen; trebol.fincas@gmail.com). Contacto de la comunidad: '
     'Petra (671 470 030). La ficha no tiene notas. Comercial interno: ALVARO.'),
    ('paseoreinacristina15-17', '2023-01-05', 'MARIA GALAN (ADMINISTRADORA)', None, None,
     'PASEO REINA CRISTINA 15 Y 17 MADRID. Fecha: 01/2023 (dia: la primera nota, 05/01/2023). Tipo de obra: SATE + CALDERA COMUNITARIA (IBERDROLA). Distrito Retiro. CP 28014. Administracion: '
     'Maria Galan - no esta en la agenda. Empresa de mantenimiento: Sibecal (Vicente Dominguez, 606 265 264) - no esta en la agenda.\n\n' + cl('paseoreinacristina15-17', 2023)),
    ('paseoreinacristina19 y tentativo21', '2023-01-05', 'MARIA GALAN (ADMINISTRADORA)', None, None,
     'PASEO REINA CRISTINA 19 (y 21, segun) MADRID. Fecha: 01/2023 (dia: la primera nota, 05/01/2023). Tipo de obra: SATE + CALDERA COMUNITARIA (IBERDROLA; el 19 comparte con el 21). '
     'Distrito Retiro. CP 28014. Administracion: Maria Galan - no esta en la agenda. Presidente: 635 497 582.\n\n' + cl('paseoreinacristina19 y tentativo21', 2023))]
if not PALOMARES_UNA_OPP:
    REVS += [(c, f, 'VALENTIN (ADMINISTRACIONES ALCORA)', None, '9368601VK3696G',
              '%s MADRID. Fecha: 02/2026 (dia: %s). Tipo de obra: ASC + SATE CON CAES (parcela 9368601VK3696G, como Palomares 77 y Ferroviarios 9). Distrito Villaverde. %s\n\n%s'
              % (d, dia, PAL, cl(c, a))) for c, f, d, dia, a in (
                 ('palomares75', '2026-02-06', 'PALOMARES 75', 'el escaneo 3D del 06/02/2026', 2026), ('palomares79', '2026-02-06', 'PALOMARES 79', 'la foto de WhatsApp del 06/02/2026', 2026),
                 ('paseodelosferroviarios11', '2025-01-30', 'PASEO DE LOS FERROVIARIOS 11', 'la primera nota, 30/01/2025; viene de ~~Javier Gonzalez Moya (Schindler)~~', 2025))]
for carp, fecha, trajo, cif, ref, t, *ruta in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV,
         comercial='Alvaro' if carp in ('pabloneruda29', 'palomeras17', 'paseoolivos54', 'palomares75', 'palomares79', 'paseodelosferroviarios11') else 'Daniel',
         ruta=ruta[0] if ruta else None)

# cerradas con su motivo
fila('paloma9', '2022-05-27', 'cerrada', 'Perdida: "30/05/22 DICE QUE NO LO HACEN CON NOSOTROS" (nota de la ficha).', 'IGNACIO BERMEJO (FAIN)', 'H78824877', None,
     'LA PALOMA 9 MADRID. Fecha: 05/2022 (dia: la primera nota, 27/05/2022). Tipo de obra: ASCENSOR. CP 28005. Contacto: Ignacio Bermejo (FAIN). Presidente: Pedro Martin Moran (71922513H; '
     '661 298 615; pedrovigotsky@gmail.com). Comision de obras: Guillermo (guillermosempere@gmail.com; 629 165 413).\n\n' + cl('paloma9', 2022))
fila('paseodelahabana17', '2024-04-16', 'cerrada', 'La rechazamos: "Nosotros no hacemos proyectos de viviendas particulares, actuamos solo a nivel de edificio" (16/04/2024).',
     'ALVARO LOPEZ (ENVOLTERMIA)', None, None,
     'PASEO DE LA HABANA 17 MADRID. Fecha: 04/2024 (dia: la nota del 16/04/2024). Tipo de obra: AISLAMIENTO DE UN APARTAMENTO DE 60 M2 (insuflado) Y CAMBIO DE 4 VENTANAS. Distrito '
     'Chamartin. CP 28036. Contacto: Alvaro Lopez (ENVOLTERMIA).\n\n' + cl('paseodelahabana17', 2024))
for carp, fecha, trajo, t in [
        ('paravicinos14', '2017-01-03', 'LUIS MIGUEL NUNES (THYSSEN)', 'PARAVICINOS 14 MADRID. Fecha: 03/01/2017 (la de la ficha). Ficha vacia; hay croquis, planos y presupuesto (ene-2017).'),
        ('paseodeextremadura242', '2015-05-29', None, 'Carpeta "paseodeextremadura242" SIN ficha de datos: solo un dwg, un pdf y un doc del 29/05/2015.'),
        ('paseodeextremadura244', '2016-11-05', None, 'Carpeta "paseodeextremadura244" SIN ficha de datos: solo dos presupuestos de obra civil (05/11/2016).'),
        ('paseodelahabana15', '2020-11-16', None, 'Carpeta "paseodelahabana15" SIN ficha de datos: una subcarpeta "SOLO SE CONTRATA PARA SUBVENCION AYTO Y SEGUIMIENTO DE CAM" con CEE '
                                                   '(nov-2020), proyecto, licencia, acta de inicio, certificado final de obra e IEE de otros, y solicitudes de subvencion (2021-2022).'),
        ('paseodeloscastellanos17', '2016-09-28', 'PEDRO ARANDA (THYSSEN)', 'PASEO DE LOS CASTELLANOS 17 MADRID. Fecha: 28/09/2016 (la de la ficha). Ficha vacia; solo un croquis (sep-2016).'),
        ('paseodeloscastellanos41', '2016-09-14', 'THYSSEN ("YO Q LO PASE A THYSSEN")', 'PASEO DE LOS CASTELLANOS 41 MADRID. Fecha: 14/09/2016 (la de la ficha). Ficha vacia salvo el '
                                                   'contacto: Adoracion (629 882 174). Hay croquis, borrador, presupuesto y un video (sep-2016).'),
        ('paseodelosJesuitas16', '2018-09-27', None, 'Carpeta "paseodelosJesuitas16" SIN ficha de datos: croquis, fotos, videos y planos (sep-oct 2018).'),
        ('paseoesperanza37', '2016-02-08', 'PEDRO ARANDA (THYSSEN)', 'PASEO ESPERANZA 37 MADRID. Fecha: 08/02/2016 (la de la ficha). Ficha vacia salvo el tipo de obra: ASCENSOR POR '
                                                   'HUECO. Hay croquis, valoracion y presupuesto (feb-2016).'),
        ('paseomelancolicos8', '2015-12-03', 'FELIPE OSADO (ENOR)', 'PASEO MELANCOLICOS 8 MADRID. Fecha: 03/12/2015 (la de la ficha). Ficha vacia salvo la administradora: Reyes Cozar '
                                                   '(913 645 484). Hay croquis y oferta del ascensor (ene-2016).'),
        ('paseosantamariadelacabeza125', '2016-02-04', 'FELIPE OSADO (ENOR)', 'PASEO SANTA MARIA DE LA CABEZA 125 MADRID. Fecha: 04/02/2016 (la de la ficha). Ficha vacia; hay croquis, '
                                                   'fotos y planos (mar-2016).'),
        ('paseosantamariadelacabeza127', '2016-02-04', 'FELIPE OSADO (ENOR)', 'PASEO SANTA MARIA DE LA CABEZA 127 MADRID. Fecha: 04/02/2016 (la de la ficha). Ficha vacia; hay croquis, '
                                                   'foto, plano y oferta del ascensor (mar-abr 2016).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 3. MANIAS: ninguna (lo de Villaverde "tiene que ir por licencia" es la norma zonal NZ4, sin quien lo pida).

resumen()
