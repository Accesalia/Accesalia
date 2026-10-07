# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda G2 (ginzodelimia29 .. guzmanelbueno98, carpetas 39 a 77 de la G: 38). 7-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de
from trocear2 import trocear2

FAIN = 'fa005671-8d23-45a6-8172-0ea7ca8c8950'; QUABIT = '2e8aa057-4376-462e-aabf-24a5b96a425d'; AGISA = 'a32fc94c-1f70-42fa-b9ae-3da772396918'
HORTALEZA = 'd1f9fd48-7eba-4c25-a48e-892b03006d16'; CLINEAL = 'c9d678a9-96d2-4cf1-ba5e-5f30bfd71eed'
PU.update(paz='46e3614d-97fd-40bf-baac-07d9bd5e601f', escano='c73d526d-637c-415d-be44-8cde0611d14b', paramio='900b6af9-4a5c-4e31-8c09-322357ee402c',
          olivares='fe2ea8b4-9be7-42b8-b64f-d644fa8198b1', oscar_cega='86273a6d-d0f1-4e29-874e-4aba61764673', velasco='94b4d0ec-edd7-4038-a58f-0823b287fa8f',
          sara_bajo='92d3c6d3-3388-4b69-a65a-ea0e078cb04f', cristian_roen='309117e8-fd96-4c24-baee-8fc8fd6aedb3', cayetano='39cb0a4a-e6b3-4246-8fc0-e7fe58ddcf71',
          alvarez='742a028e-4219-4d05-90b2-d1819f4600c9', gestin='e5abf29a-a25f-4c87-8705-6dc523285e1f')


def notas_a_mano(c, anio, cambios):
    """notas troceadas + arreglos: cambios = {i: (fecha, motivo)}; motivo None = solo la fecha."""
    n = []
    for i, (f, t) in enumerate(_notas_de(c, anio)):
        if i in cambios:
            f = cambios[i][0]; t = t + ('\n\n(' + cambios[i][1] + ')' if cambios[i][1] else '')
        n.append((f, t))
    assert all(f for f, t in n), c
    return n


def motivo(n, i, m, fecha=None):
    """anade el motivo a la nota i (y la fecha, si se da)."""
    f, t = n[i]; n[i] = (fecha or f, t + '\n\n(' + m + ')'); return n


def cid_de(prefijo):
    cs = b.leer('comunidades?select=id&municipio=eq.MADRID&nombre=like.' + quote(prefijo) + '*'); assert len(cs) == 1, prefijo
    return cs[0]['id']


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto (telefono pegado al nombre...)."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


def pc_unico(cid, nombre, rol, tel=None, doc=None, email=None, notas_=None):
    """pc() para roles que no son presidente, sin repetirla si el script se relanza."""
    ya = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&nombre=eq.%s' % (cid, quote(nombre)))
    return ya[0]['id'] if ya else pc(cid, nombre, rol, tel, doc, email, notas_)


def trae(pcid):
    return {'quien_persona_comunidad_id': pcid, 'persona_comunidad_id': pcid}


def correo_a(puesto, email, principal=False):
    """correo nuevo en un puesto que YA existe (si el correo no esta ya en la agenda)."""
    if not b.leer('correo?select=id&email=ilike.' + quote(email)):
        ins('correo', [{'puesto_id': puesto, 'email': email, 'etiqueta': 'general', 'principal': principal}])


# ================================================================= 0. AGENDA (solo en empresas, contratas y organismos que ya existen)
persona_nueva('Eusebio', 'Medina Rodrigo', 'responsable técnico', '690618206', 'eusebio.medina@fainascensores.com', contrata=FAIN,
              notas_='Fain: responsable tecnico de la constructora (Doctor Esquerdo 57); Ginzo de Limia 55 (2024-2025).')
persona_nueva('David', 'Montealegre Moreno', None, '917381022', 'david.montealegremoreno@agisa.es', empresa=AGISA,
              notas_='AGISA (Plaza del Tuy 8): administrador de Ginzo de Limia 29 (2023).')
persona_nueva('Yolanda', None, None, '621180196', 'y.mostazo@quabitconstruccion.com', contrata=QUABIT,
              notas_='Quabit: trae Godella 1-3-5 (mar-2025; en la ficha "YOLANDA - QUABIT").')
persona_nueva('Emilio', 'Baeza', 'técnico', None, 'baezaje@madrid.es', organismo=HORTALEZA,
              notas_='Junta de Hortaleza: tecnico de la licencia del ascensor de Gomeznarro 233 (2021-2025); correo general tecnihortaleza@madrid.es.')
persona_nueva('Juan Manuel', 'Cruz', 'técnico', None, None, organismo=CLINEAL,
              notas_='Junta de Ciudad Lineal: tecnico del ayuntamiento en la ficha de gregoriodonas8 (ascensor de Gregorio Donas 8, 2020-2023).')
correo_a(PU['cristian_roen'], 'oficina@roen.es')   # "CRISTIAN - OFICINA@ROEN.ES" (Gonzalo de Cespedes 21; Jose Luis Jimenez tachado)

# ================================================================= 1. PRODUCCION (23)
rellenar('gl55', 'GINZO DE LIMIA 55 MADRID', 'ginzodelimia55', {'fecha_apertura': '2024-11-26',
    'origen_notas': 'Fecha de llegada: 11/2024 (dia: la primera nota, 26/11/2024). Contacta: Sara Bajo (FAIN; paga Fain). Tipo de obra: CALCULO ESTRUCTURAL: INFORME DE PUERTAS DE ASCENSOR (estudio de cargas con los '
                    'planos de estructura que manda Fain). Fecha encargo: 03/01/2025. Constructora: Fain (Eusebio Medina Rodrigo, responsable tecnico; 690 618 206; eusebio.medina@fainascensores.com). '
                    'HE del informe estructural enviada 10/12/2024. Comercial: DANIEL.'},
    ('informe_tecnico',), n=fijar('ginzodelimia55', 2024), trae_pu=PU['sara_bajo'])

# Girasol 21: dos subcarpetas, informe pericial (nov-2025) y SATE (mar-2026). La misma epoca y el mismo cliente: UNA opp (como Blasco de Garay 46).
GP = 'girasol21/GIRASOL21 - INFORME PERICIAL/FICHA DATOS.docx'; GS = 'girasol21/GIRASOL21 - SATE/FICHA DATOS.docx'
np_ = partir(_notas_de(GP, 2025), 0, '2 juntas realizadas', '2026-01-12')
np_ = motivo(np_, 0, 'Correo de Carlos Garcia del 4 de noviembre de 2025.', '2025-11-04')
np_ = motivo(np_, 1, 'La fecha va al final de la linea ("12/01/2026").')
rellenar('gi21', 'GIRASOL 21 MADRID', 'girasol21', {'fecha_apertura': '2025-11-04', 'referencia_catastral': '6593110VK3669C',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia: el correo de Carlos Garcia del 4 de noviembre de 2025 con las medidas de la escalera; el 3D es del 05/11/2025). Contacta: Paz Terradillos (CIUDADELA). '
                    'Dos encargos en dos subcarpetas, la misma epoca: (1) INFORME PERICIAL de la cubierta (obra hecha por otros, "de lo mal que lo han hecho"; humedades en el piso del presidente; escaneo con movil 05/03/2026; '
                    'informe enviado 12/03/2026; tecnico Carlos Daza); (2) SATE + SUBV: proyecto basico y de ejecucion de rehabilitacion de la envolvente termica (HE recibida firmada 18/03/2026 = fecha de encargo; tecnica Angela), '
                    'LICENCIA por ECU (ACTECU); en sep-2026 pagados ICIO y aval. Ofertas de Elecnor de SATE y accesibilidad (20/11/2025). Barrio: Buenavista. Ano 1969. Dos juntas con empate para SATE y subvencion (12/01/2026). '
                    'Ojo: en Google Maps el edificio sale como Girasol 15. Presidente: Manuel Gutierrez Sampedro (604 987 515). Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('pericial', 'sate', 'subvenciones'), n=np_ + fijar(GS, 2026), subvencion=trocear2(subv(GS), 2026),
    comunidad={'iban': 'ES41 2100 2479 6513 0057 7132'}, trae_pu=PU['paz'], captador=CARLOS, lleva=ALVARO)
arreglar_pc(OPP['gi21'][0]['id'], 'rol=eq.presidente&nombre=eq.' + quote('MANUEL GUTIERREZ SAMPEDRO 604 987 515'),
            {'nombre': 'MANUEL GUTIERREZ SAMPEDRO', 'telefono': '604987515'})

rellenar('gd237', 'GODELLA 237 MADRID', 'godella237', {'fecha_apertura': '2024-11-14', 'referencia_catastral': '1861920VK4616B',
    'origen_notas': 'Fecha de llegada: 11/2024 (dia: la primera nota, 14/11/2024: conversacion telefonica y HE enviada). Contacta: Oscar Fernandez (CEGA). Tipo de obra: ASCENSOR + SUBV (subvencion contratada en enero 2025): '
                    'ascensor por el patio (camara sanitaria debajo) con plataforma elevadora vertical (no inclinada, por normativa) y desvio de contadores; cuidado con la cubierta de fibrocemento. Tecnico: Israel. '
                    'Fecha encargo: 29/11/2024. Ano 1965. DR por ECU (ACTECU), declaracion 30/01/2025. Visado TL/001444/2025. Archivo de la Villa: expediente 511/2025/00518. PEM 95.336,13 (presupuesto de contrata 113.450,00; '
                    'Monica manda restar 5.500 de DO y 850 de CSS porque la contrata no los separa). Contratista: Ascensores CEGA (Boris Cespedes; 682 281 318 / 91 679 30 92). '
                    'Administracion: SANJUFINCAS, a traves de CEGA (Yajaira Morejon, Elena Perez Garcia-Osorio; 912 125 169). Presidente: Antonio Jose Luque Conejo. Comercial: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('godella237', 2024), trae_pu=PU['oscar_cega'])

rellenar('ga10', 'GOMEZ DE ARTECHE 10 MADRID', 'gomezdearteche10', {'fecha_apertura': '2025-10-01',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia desconocido; los primeros ficheros son de dic-2025). Contacta: Paz (CIUDADELA, la administracion). Tipo de obra: SATE + ASCENSOR. '
                    'Hay simulaciones de financiacion de UCI (pedido 17-12-2025). La ficha no tiene notas. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('sate', 'ascensor'), trae_pu=PU['paz'], captador=CARLOS, lleva=ALVARO)

rellenar('ga38', 'GOMEZ DE ARTECHE 38 MADRID', 'gomezdearteche38', {'fecha_apertura': '2025-10-27', 'referencia_catastral': '5691711VK3659B',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: los primeros ficheros, el 3D del 27/10/2025). Contacta: Paz (CIUDADELA, la administracion). Tipo de obra: la ficha no lo dice; en las notas, ELEVADOR tipo 4 sin salir de fachada '
                    '(hueco reducido; fondo de escalera 2900 mm aprox.) y elevador vertical en el portal para salvar los primeros escalones. Ano 1967. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('plataforma',), n=fijar('gomezdearteche38', 2025), adm=PU['paz'], trae_pu=PU['paz'], captador=CARLOS, lleva=ALVARO)

rellenar('gn10', 'GOMEZNARRO 10 MADRID', 'gomeznarro10', {'fecha_apertura': '2025-09-10',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia: el 3D, 10/09/2025). Contacta: EFFIC (agente rehabilitador; la ficha no dice la persona). Tipo de obra: la ficha no lo dice. HE enviada 27/04/2026. '
                    'Comercial interno: ALVARO.'},
    (), n=notas_a_mano('gomeznarro10', 2025, {0: ('2026-04-27', 'La fecha va dentro ("HE enviado 27/04/2026").')}), captador=ALVARO, lleva=ALVARO)

rellenar('gn233', 'GOMEZNARRO 233 MADRID', 'gomeznarro233', {'fecha_apertura': '2021-05-23', 'referencia_catastral': '5194412VK4759E',
    'origen_notas': 'Fecha de llegada: 05/2021 (dia: los primeros ficheros, el informe y plano del modelo de ascensor del Ayto, 23/05/2021). Contacta: Javier Parra Rodriguez (SCHINDLER; 639 35 19 42). Tipo de obra: ASCENSOR '
                    '(en 2021 se facturo el proyecto); en 2025-2026, renovacion de la subvencion (CAM 2025; el 13-05-2025 dicen que no les interesa, se les vuelve a ofrecer) y HE de CSS + DF recibida firmada 09-02-2026. '
                    'Barrio: Canillas. Tecnico: Carla (requerimiento) -> Alejandro (refundido). Jefe de obra: Alvaro Gomez. En la casilla de fecha de construccion: 16/02/2026. Ano 1959; 8 viviendas. '
                    'Licencia aprobada 09/05/2025 (Junta de Hortaleza; tecnico Emilio Baeza, baezaje@madrid.es; tecnihortaleza@madrid.es). PEM 92.974,79. Visados TL/010757/2021, TL/002616/2024 (anulado) y TL/004941/2024. '
                    'Expediente 118/2021/2835. Administracion: AGA ANTONAYA (Daniel Gimenez; 91 759 39 09 / 666 653 494; correos daniel@, isabel@ y raquelv@antonaya.com, "usar este"). '
                    'Presidenta: Margarita Serrano Cabra. Comercial: DANIEL.'},
    ('ascensor', 'subvenciones', 'css', 'df'), n=partir(fijar('gomeznarro233', 2025), 5, '16/01/2026', '2026-01-16'),
    comunidad={'iban': 'ES26 0081 0364 8100 0163 7270'}, trae_pu=PU['parra'])

CID247 = cid_de('GOMEZNARRO 247 MADRID')
P247 = pc_unico(CID247, 'DANIEL CARDENAS PORTILLO', 'vecino', '687169727', None, 'd.cardenasportillo@gmail.com', 'Vecino; trae la oportunidad (dic-2025).')
rellenar('gn247', 'GOMEZNARRO 247 MADRID', 'gomeznarro247', dict(trae(P247), **{'fecha_apertura': '2025-12-09',
    'origen_notas': 'Fecha de llegada: 12/2025 (dia: el de la ficha, unico fichero de la carpeta). Contacta: Daniel Cardenas Portillo, vecino (687 169 727; d.cardenasportillo@gmail.com). Tipo de obra: ASCENSOR. '
                    'La ficha no tiene notas. En la ficha: comercial interno "DANIEL O CARLOS"; la lleva Daniel.'}),
    ('ascensor',))

CID249 = cid_de('GOMEZNARRO 249 MADRID')
P249 = pc_unico(CID249, 'HECTOR RUIZ RODRIGO', 'otro', '650676563', None, 'hector.ruiz.rodrigo@gmail.com', 'Antiguo presidente; trae la oportunidad. "Poner en copia".')
pc_unico(CID249, 'JUANMA (3º DCHA)', 'vecino', '636733513', None, None, 'Vecino del tercero derecha; da acceso al portal y zonas comunes (dic-2025).')
rellenar('gn249', 'GOMEZNARRO 249 MADRID', 'gomeznarro249', dict(trae(P249), **{'fecha_apertura': '2025-10-15', 'referencia_catastral': '5194408VK4759E',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: la primera nota, 15-10-2025: HE de proyecto + subvenciones enviadas, "obra caliente"). Contacta: Hector Ruiz Rodrigo, el antiguo presidente (650 676 563; '
                    'hector.ruiz.rodrigo@gmail.com; "poner en copia"). Tipo de obra: ASCENSOR Y SUBV (puerta de portal con brazo automatico; acceso independiente a cubierta y punto de agua en PB como extras). '
                    'Barrio: Canillas. Tecnico: Carlos Alberto. Fecha encargo: 20/11/2025 (HE firmada). LICENCIA por el AYUNTAMIENTO: la ECU no tiene competencias (NZ 3.1.a con modelo de ascensor en suelo publico); '
                    'registrada en SLIM 16/02/2026; en sep-2026 sigue en manos del tecnico de la Junta de Hortaleza. PEM 159.421,15. Visado TL/001095/2026. Expediente 350/2026/04664. Superficie 96,68 m2. '
                    'Financiacion solicitada a BBVA (09/02/2026); presupuestos pedidos a Schindler y CEGA. Administracion: Guillen y Plaza Gestion (Pilar Moreno Jimenez, 917 599 390). '
                    'Presidenta: Cristina Guijarro Kaneko. Comercial interno: CARLOS.' + CAPTO_CARLOS}),
    ('ascensor', 'subvenciones'), n=partir(fijar('gomeznarro249', 2025), 0, 'Firmado 20-11-2025', '2025-11-20'),
    subvencion=trocear2(subv('gomeznarro249'), 2025), comunidad={'iban': 'ES92 0081 0364 8900 0165 8776'}, captador=CARLOS, lleva=ALVARO)

rellenar('gb55', 'GONZALO DE BERCEO 55 MADRID', 'gonzaloberceo55', {'fecha_apertura': '2025-07-01',
    'origen_notas': 'Fecha de llegada: 07/2025 (dia: la primera nota, 1-07-2025: visita; fotos del estudio de viabilidad 02/07/2025). Contacta: la administracion, ALSER (Jose Miguel Escano; su 914 47 56 13 esta tachado). '
                    'Tipo de obra: "Hueco escalera" (asi en la ficha). Presidente: Ruben, 639 470 199. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    (), n=fijar('gonzaloberceo55', 2025), presi=('RUBEN', 'presidente', '639470199'), adm=PU['escano'], trae_pu=PU['escano'], captador=CARLOS, lleva=ALVARO)

rellenar('gc21', 'GONZALO CESPEDES 21 MADRID', 'gonzalodecespedes21', {'fecha_apertura': '2025-06-10', 'referencia_catastral': '1004704VK5810C',
    'origen_notas': 'Fecha de llegada: la ficha dice 07/2025, pero el primer contacto es el correo de Jose Luis Jimenez (ROEN) del 10/06/2025 pidiendo honorarios (proyecto, IEE, LEEx, DO, CSS y subvencion Plan Rehabilita, '
                    'sin cesion de CAES); se toma esa. Contacta: ROEN (Jose Luis Jimenez, tachado -> Cristian, oficina@roen.es; 916 884 566 / 645 369 037). Tipo de obra: SATE + andamios + SUBV, SIN CAES (proyecto de andamios). '
                    'Barrio: Casco Historico de Barajas. Tecnico: Julio -> Alejandro (requerimiento). Fecha encargo: 18/07/2025 (HE firmada 21/07/2025). Ano 1975. LICENCIA por ECU (ACTECU); concedida 02/07/2026. '
                    'PEM 93.409,12. Visado TL/005163/2026. Superficie 239,87. Administracion: CUESTA Y ARESTE (Juan Carlos Areste, 676 120 100, de baja por paternidad en oct-2025; Noelia, la secretaria: el 609 521 994 '
                    'esta tachado y no es suyo). Intermediario: RECOLETOS CONSULTORES (Jorge, 649 45 75 51; jferrer@recoletosconsultores.es; profesionales@brokerfincas.es) - no esta en la agenda; '
                    '"poner en copia de todos los correos que se manden al administrador". Presidente: Miguel Angel Pavon Arevalo (640 249 545; mapa007@msn.com). Comercial: DANIEL.'},
    ('sate', 'subvenciones', 'iee'), n=fijar('gonzalodecespedes21', 2025, ('2025-06-10', 'Correo de Jose Luis Jimenez (ROEN) del 10 de junio de 2025.')),
    subvencion=trocear2(subv('gonzalodecespedes21'), 2025),
    presi=('MIGUEL ANGEL PAVON AREVALO', 'presidente', '640249545', None, 'mapa007@msn.com'), trae_pu=PU['cristian_roen'])

rellenar('gd8', 'GREGORIO DONAS 8 MADRID', 'gregoriodonas8', {'fecha_apertura': '2020-08-13', 'referencia_catastral': '5957801VK4755F',
    'origen_notas': 'Fecha de llegada: la ficha dice 10/2023 (copiada), pero los ficheros empiezan con el croquis y las fotos de la visita del 13/08/2020 (IMG_20200813) y el expediente es de 2020; se toma esa. '
                    'Contacta: Jose Olivares. Tipo de obra: INSTALACION DE ASCENSOR EN EDIFICIO RESIDENCIAL EXISTENTE. Barrio: Pueblo Nuevo. Junta de Ciudad Lineal: tecnico Juan Manuel Cruz. PEM 103.475,24. '
                    'Visados TL/003698/2022 y TL/020090/2023. Expediente 116/2020/03276. Superficie 57,25 m2. Proyecto rehecho entero en respuesta al requerimiento 3 (01/03/2022). Obra hecha: fin de obra visado 13/12/2023. '
                    'Comercial: DANIEL.'},
    ('ascensor',), n=notas_a_mano('gregoriodonas8', 2023, {0: ('2022-03-01', 'La fecha va dentro ("el 01/03/2022").')}), trae_pu=PU['olivares'])

CIDGU = cid_de('GUABAIRO 20 MADRID')
PGU = pc_unico(CIDGU, 'SHEILA', 'vecino', '610710784', None, 'sheila.navamuel@gmail.com', 'Vecina; trae la oportunidad (ago-2025).')
rellenar('gu20', 'GUABAIRO 20 MADRID', 'guabairo20', dict(trae(PGU), **{'fecha_apertura': '2025-08-26',
    'origen_notas': 'Fecha de llegada: 08/2025 (dia: la primera nota y el escaneo de Carlos, 26/08/2025). Contacta: Sheila, vecina (610 710 784; sheila.navamuel@gmail.com). Tipo de obra: ACCESIBILIDAD DEL PORTAL '
                    '(quitar los peldanos de la entrada, bajar la puerta del portal; salvaescaleras o elevador de Magar). Administracion: DOMINGO MARTIN GOMEZ (C/ Espinar 10; David, 914 666 495; '
                    'dmartin@administracionmartin.es) - no esta en la agenda. 18-06-2026: se vuelve a ofertar, HE enviada a Carlos. Comercial interno: CARLOS.' + CAPTO_CARLOS}),
    ('accesibilidad_portal',), n=fijar('guabairo20', 2025), captador=CARLOS, lleva=ALVARO)

rellenar('gl13', 'GUADALETE 13 MADRID', 'guadalete13', {'fecha_apertura': '2025-10-09',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: el correo de Jose Alfredo Vicente, 9 de octubre de 2025, con el plano de ubicacion del ascensor). Contacta: Jose Alfredo Vicente Sanchez (ALVAREZ ASESORES, departamento de fincas). '
                    'Tipo de obra: ASCENSOR con derribo de escalera e invasion de calle, segun el MODELO del Ayuntamiento (5 paradas; 195.000 + IVA de obra). HE e informe enviados 20/10/2025. Comercial interno: DANIEL.'},
    ('ascensor',), n=fijar('guadalete13', 2025, ('2025-10-09', 'Correo de Jose Alfredo Vicente (Alvarez Asesores) del 9 de octubre de 2025.')),
    adm=PU['alvarez'], trae_pu=PU['alvarez'])

# Guadalete 6: SATE (jul-2025, HE firmada) y ascensor externo (pedido ya el 01/07/2025; ficha propia en may-2026). La misma epoca: UNA opp (como Hernan Cortes 13).
G6S = 'guadalete6/sate externo/FICHA DATOS.docx'; G6A = 'guadalete6/ascensor externo/FICHA DATOS ASCENSOR EXTERNO.docx'
n6 = partir(_notas_de(G6S, 2025), 7, '10/03/2026se', '2026-03-10')
n6 = partir(n6, 12, '14-04-2026 enviada', '2026-04-14')
n6 = motivo(n6, 12, 'En la ficha "7-04-2024": errata del ano; va entre notas de marzo y abril de 2026.', '2026-04-07')
n6 = n6 + fijar(G6A, 2026)
assert all(f for f, t in n6)
rellenar('gl6', 'GUADALETE 6 MADRID', 'guadalete6', {'fecha_apertura': '2025-07-01', 'referencia_catastral': '9414914VK3791C',
    'origen_notas': 'Fecha de llegada: 07/2025 (dia: la primera nota, 01/07/2025: Fernando, vecino, confirma que la junta aprueba la obra de fachada y cubierta con Accesalia y ROEN; la HE del SATE se habia enviado '
                    'hacia el 20/06/2025). Contacta: ROEN (la contrata; su comercial Jose Luis Jimenez, tachado). Dos fichas en dos subcarpetas, la misma epoca: (1) SATE: LICENCIA, DF, CSS Y SUBV (contratado) de un '
                    'PROYECTO EXTERNO (con la NG ya concedida, 116.000 EUR); HE firmada 07/07/2025 = fecha de encargo; DR por el Ayto 21/07/2025 (expediente 350/2025/22885, con tasas de otro proyecto) y luego LICENCIA por ECU '
                    '(ACTECU), concedida 28/04/2026; HE de subvenciones recibida firmada 28/04/2026; el 30/04/2026 la comunidad decide en junta NO hacer la obra (no llegaban a plazo para la subvencion); al final eligieron a '
                    'GREEN REHABILITACIONES para la obra; PEM 125.225,76. (2) ASCENSOR EXTERNO: subvencion de un proyecto de ascensor de otro estudio (visado, feb-2024; doble embarque a 180, hay modelo homogeneo a 90); '
                    'NO CONTRATADO (may-2026: "no nos han pagado nada, Carlos debe conseguir que firmen alguna hoja de encargo"). Barrio: Comillas. Administracion: JAGRA FINCAS (Jose Antonio Gonzalez, 645 773 672; '
                    'jgonzalez@jagrafincas.es; el correo joseglez@jagra-fincas.es esta tachado). Presidente: Pedro Agustin de la Fuente Sanchez (650 959 531). Vecino: Fernando, 699 046 349. '
                    'Comercial: DANIEL (SATE); el ascensor lo llevaba CARLOS (tachado en la ficha del SATE; "CARLOS G" en la del ascensor, may-2026).'},
    ('sate', 'df', 'css', 'subvenciones', 'ascensor'), n=n6, subvencion=trocear2(subv(G6S), 2025),
    huecos=['[REVISAR EN FACTURACION] SATE con HE firmada y licencia concedida (28/04/2026); la comunidad no hace la obra (30/04/2026) y el ascensor externo no esta contratado: '
            '"Como en este proyecto no nos han pagado nada" (19/05/2026). Queda abierta.'],
    comunidad={'iban': 'ES21 0081 7122 5900 0121 0231'})
arreglar_pc(OPP['gl6'][0]['id'], 'rol=eq.presidente&documento=eq.11794982F',
            {'nombre': 'PEDRO AGUSTIN DE LA FUENTE SANCHEZ', 'telefono': '650959531', 'email': 'pagustindelafuentesanchez@gmail.com'})
pc_unico(OPP['gl6'][0]['id'], 'FERNANDO', 'vecino', '699046349', None, None, 'Vecino; avisa por whatsapp de la aprobacion en junta (01/07/2025).')

rellenar('gr26', 'GUADARRAMA 26 MADRID', 'guadarrama26', {'fecha_apertura': '2021-10-01', 'referencia_catastral': '8038819VK3783G',
    'origen_notas': 'Fecha de llegada: la ficha dice 01/2022, pero el 3D lo hizo Dennis en octubre de 2021 (dia desconocido) y hay acta de aprobacion de la comunidad del 29/09/2021 y comunicado a Fain (nov-2021); se toma oct-2021. '
                    'Contacta: Vicente Real (FAIN). Tipo de obra: ASCENSOR Y NUCLEO DE COMUNICACION por rellano (+ renovacion de la subvencion, may-2025). Barrio: Puerta del Angel. Tecnico: Fernan; requerimiento: Carla. '
                    'Fecha encargo: 05/04/2022. DECLARACION. PEM 121.588,24. Visado TL/003158/2022. Expediente 110/2022/03316. Superficie 59,70 m2. Refundido enviado 08-10-2024 por la aprobacion de la licencia. '
                    'Devolucion del ICIO duplicado en tramite (nov-2025 - abr-2026). Administracion: ADMINISTRACIONES RUBIO (Luis Antonio Rubio Gonzalez; 914 64 96 28 / 630 881 640; luis@ y carmen@administracionesrubio.es). '
                    'Presidenta: desde dic-2023 Laura Longobardo (610 981 270); antes Natalia Mulas Rodriguez, tachada. Comercial: DANIEL.'},
    ('ascensor', 'subvenciones'), n=notas_a_mano('guadarrama26', 2022, {0: ('2021-10-01', 'Octubre de 2021, dia desconocido.')}), trae_pu='3606239e-1b7a-48c1-bea2-08c841efee80')
arreglar_pc(OPP['gr26'][0]['id'], 'rol=eq.presidente&documento=eq.50729234C',
            {'nombre': 'LAURA LONGOBARDO', 'telefono': '610981270', 'documento': None, 'email': None,
             'notas': 'Presidenta a diciembre de 2023. Antes: Natalia Mulas Rodriguez (50729234C; nataliamulas@gmail.com), tachada en la ficha.'})

rellenar('gu1', 'GUANCHA 1 MADRID', 'guancha1', {'fecha_apertura': '2025-06-25', 'referencia_catastral': '6260920VK4766A',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: la primera nota, 25-06-2025: Javier la pide a Daniel por whatsapp y se envia la HE). Contacta: Javier Velasco (ELECNOR; 680 967 159). Tipo de obra: ASCENSOR, DF, CSS Y SUBV '
                    '(proyecto de accesibilidad; hay modelo homogeneo). Barrio: Pueblo Nuevo. Tecnico: KGS. Fecha encargo: 25/06/2025 (HE firmada 08/07/2025). Ano 1960. LICENCIA por el AYUNTAMIENTO, registrada 20/03/2026 '
                    '(expediente 350/2026/08998; en sep-2026 en Medio Ambiente y Escena Urbana - Servicios Tecnicos de la Junta de Ciudad Lineal). PEM 163.156,69. Visado TL/002923/2026. Superficie 94,78. '
                    'Administracion: AFASONER (Cristina, 913 24 04 69). Presidenta: Gloria Pascual Ureta. Comercial: DANIEL.'},
    ('ascensor', 'df', 'css', 'subvenciones'), n=fijar('guancha1', 2025), subvencion=[(None, subv('guancha1'))],
    comunidad={'iban': 'ES35 2100 8339 4513 0051 8893'}, trae_pu=PU['velasco'])

rellenar('gua6', 'GUARNICIONEROS 6 MADRID', 'guarnicioneros6', {'fecha_apertura': '2026-03-09',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia: la nota "Enviado 09/03/2026" y el 3D del mismo dia). Contacta: Jorge (ECUANIME FINCAS; 619 509 482; Ecuanime.fincas@gmail.com) - no esta en la agenda. '
                    'Tipo de obra: ASCENSOR ("asc"). La cabecera de la ficha dice "GUARNICIONERO 6". Comercial interno: ALVARO.'},
    ('ascensor',), n=notas_a_mano('guarnicioneros6', 2026, {0: ('2026-03-09', 'La fecha va dentro ("Enviado 09/03/2026").')}), captador=ALVARO, lleva=ALVARO)

rellenar('gc13', 'GUILLEN DE CASTRO 13 MADRID', 'guillendecastro13', {'fecha_apertura': '2020-08-13', 'referencia_catastral': '5457806VK4755E',
    'origen_notas': 'Fecha de llegada: 08/2020 (dia: el croquis y las fotos de la visita, IMG_20200813). Contacta: Jose Olivares (ROSERSESE; tambien jefe de obra). Tipo de obra: INSTALACION DE ASCENSOR EN EDIFICIO '
                    'RESIDENCIAL EXISTENTE. Barrio: Pueblo Nuevo. Tecnico: Dennis -> requerimiento Carla -> CFO Karla. Administracion: "a traves de Rosa" (Esther Diaz, MANDATARIA). PEM 72.363,84. '
                    'CFO visado TL/005986/2025. Expediente 116/2020/03275. Comercial: DANIEL.'},
    ('ascensor', 'cfo'), n=fijar('guillendecastro13', 2020), trae_pu=PU['olivares'])

rellenar('gt8', 'GUTEMBERG 8 MADRID', 'gutemberg8', {'fecha_apertura': '2025-10-27',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: el de la ficha). Paga el proyecto: LUXOR (Luxor Espacios). Tipo de obra: REHABILITACION PARCIAL (asi en la ficha). La ficha no tiene mas datos ni notas; '
                    'en la carpeta hay un documento del edificio (30/10/2025). Comercial interno: CARLOS.' + CAPTO_CARLOS},
    (), captador=CARLOS, lleva=ALVARO)

CIDG16 = cid_de('GUTENBERG 16 MADRID')
PG16 = pc_unico(CIDG16, 'OSCAR BALLESTEROS', 'otro', None, None, 'oskar77es@hotmail.com', 'Persona de contacto de la comunidad; trae la oportunidad (may-2026).')
rellenar('gt16', 'GUTENBERG 16 MADRID', 'gutenberg16', dict(trae(PG16), **{'fecha_apertura': '2026-05-01',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia desconocido; los primeros ficheros, el 3D, son del 02/06/2026). Contacta: Oscar Ballesteros (oskar77es@hotmail.com). Tipo de obra: INSTALACION DE 2 ASCENSORES. '
                    'Administracion: MARTIN GONZALEZ ADMON FINCAL SL (Jesus Martin; jesus@afmartingonzalez.es) - no esta en la agenda. Presidente: Luca Nizzardo (l.nizzardo@gmail.com). La ficha no tiene notas. '
                    'Comercial interno: ALVARO.'}),
    ('ascensor',), captador=ALVARO, lleva=ALVARO)

rellenar('gb75', 'GUZMAN EL BUENO 75 MADRID', 'guzmanelbueno75', {'fecha_apertura': '2026-01-08',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: la ficha y el 3D en glb, 08/01/2026; hay un modelo .skb del 22/10/2025). Contacta: Cayetano (en la ficha solo "CAYETANO"; se toma el de SATE 21, que trae Doctor Esquerdo 169 '
                    'el mismo mes). Tipo de obra: ASCENSOR + RAMPA. La ficha no tiene notas. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('ascensor', 'rampa'), trae_pu=PU['cayetano'], captador=CARLOS, lleva=ALVARO)

rellenar('gb98', 'GUZMAN EL BUENO 98', 'guzmanelbueno98', {'fecha_apertura': '2025-05-13',
    'origen_notas': 'Fecha de llegada: 05/2025 (dia: el correo de Isaac Pizarroso del 13/05/2025: la junta del dia anterior acuerda pedir soluciones de accesibilidad entre el portal exterior y el interior, donde hay una '
                    'plataforma salvaescaleras). Contacta: Isaac Pizarroso Arnao (GESTIN; 914 471 009). Tipo de obra: ACCESIBILIDAD. Fecha encargo: 13-05-2025. Vecino: Alberto (6o D), 655 64 88 12; en copia del correo '
                    'J. Alberto Reche Sainz (jalbres@yahoo.es), Victoria Yague y Javier Gonzalez. Informe (28/05/2025) y HE enviadas 02-06-2025. Comercial: DANIEL.'},
    ('accesibilidad',), n=fijar('guzmanelbueno98', 2025), adm=PU['gestin'], trae_pu=PU['gestin'])
pc_unico(OPP['gb98'][0]['id'], 'ALBERTO (6º D)', 'vecino', '655648812', None, None, 'Vecino del 6o D (may-2025).')

# ================================================================= 2. CLON
cl = lambda c, a, s=None: J(fijar(c, a, s))
crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
REVS = [
    ('ginzodelimia29', '2023-02-16', 'JUAN PARAMIO (FAIN)', None, None,
     'CALLE GINZO DE LIMIA 29 MADRID. Fecha: 02/2023. Tipo de obra: ELEVADOR VERTICAL en el portal (el proyecto lo paga la comunidad; primero el proyecto y con el, los presupuestos). Distrito 08 - Fuencarral-El Pardo (Pilar). '
     'Administracion: AGISA (David Montealegre Moreno, 917 381 022, david.montealegremoreno@agisa.es; C/ Plaza del Tuy 8; pedidos docs 16/02/23, telefono de la oficina 24/02). Daniel ya lo habia visto en verano; '
     'Paramio quiere ensenar el portal 31 de la misma calle, que ya tiene el proyecto hecho. Hay nube de puntos y fotos (feb-2023) y presupuesto de Fain del elevador (20/04/2023). HE enviada.\n\n' + cl('ginzodelimia29', 2023)),
    ('godella1-3-5', '2025-03-17', 'YOLANDA (QUABIT)', None, None,
     'GODELLA 1-3-5 MADRID. Fecha: 03/2025 (dia: las primeras fotos, 17/03/2025). Tipo de obra: 3 ASCENSORES CON DERRIBO + SUBV (la viabilidad, por separado para cada portal: 1 y 3 para enviar; con el 5 se va a hablar). '
     'Distrito 17 - Villaverde. Contacto: Yolanda (QUABIT; 621 180 196; y.mostazo@quabitconstruccion.com). Propietaria: Aigerim, 666 83 47 39, aigerim.ibraevablt@gmail.com. '
     'HE de proyecto y subvenciones e informe de viabilidad enviados 19/03/2025.\n\n' + cl('godella1-3-5', 2025)),
    ('goiri33', '2022-08-23', 'JUAN PARAMIO -> VICENTE REAL (FAIN)', None, '0385510VK4708E',
     'CALLE GOIRI 33 MADRID. Fecha: 08/2022 (dia: la primera nota). Tipo de obra: ASCENSOR. Distrito 06 - Tetuan (Bellas Vistas). CP 28039. Presentacion con 3D reciclado (dic-2022).\n\n' + cl('goiri33', 2022)),
    ('gomeznarro82', '2025-02-19', 'ANDRES HERAS', None, None,
     'GOMEZ NARRO 82 MADRID. Fecha: 02/2025 (dia: la primera nota). Tipo de obra: ASCENSOR. Distrito 16 - Hortaleza. CP 28043. Visita de JL el 24/02/2025 (fotos); informe de viabilidad hecho.\n\n' + cl('gomeznarro82', 2025)),
    ('goya53', '2024-11-13', 'SERGIO GODINO (FAIN)', None, None,
     'GOYA 53 MADRID. Fecha: 11/2024 (dia: la primera nota). Tipo de obra: ASCENSOR POR PATIO (puede implicar subir una planta mas y pasar de hidraulico a electrico; ascensor protegido). Distrito 04 - Salamanca. CP 28001. '
     'Vecino: Guillermo Soria Santos (g.soria.santos@hotmail.com). Es un proyecto de Sergio Godino (Fain): ellos coordinan; nosotros solo la HE del proyecto. Visita 28/01/2025; hay 3D (ene-2025); pendiente HE.\n\n'
     + cl('goya53', 2024)),
    ('granvia62', '2017-04-08', 'SANTIAGO ROJAS (THYSSEN)', None, None,
     'CALLE GRAN VIA 62 MADRID. Fecha: 04/2017 (la ficha dice 03/2017; los presupuestos y el video son del 08/04/2017). Distrito: en la ficha "Salamanca" (CP 28013). Hay presupuesto y presupuesto de torre (abr-2017).\n\n'
     + crudo('granvia62', 2017)),
    ('gutierredecetina71', '2022-12-01', 'OSCAR FERNANDEZ (FAIN)', None, None,
     'CALLE GUTIERRE DE CETINA 71 MADRID. Fecha: 12/2022 (dia desconocido). Paga: CDAD / FAIN. Tipo de obra: ASCENSOR (Oscar Fernandez, de Fain, da el presupuesto completo). Distrito 15 - Ciudad Lineal (Pueblo Nuevo). '
     'Presidenta: Paqui Intriago, la vecina que lo pide (619 33 46 18; Paqui.intriago@hotmail.com; "ver para despues de Reyes"). HE sin CSS enviada 29/05/2023. '
     'Dentro de esta carpeta esta colada la de GUZMAN EL BUENO 56 (salvaescaleras, 2014).\n\n' + cl('gutierredecetina71', 2022))]
for carp, fecha, trajo, cif, ref, t in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV)
fila('goya55', '2022-01-12', 'abierta', None,
     'SERGIO GODINO (FAIN)', 'H79993390', '2354814VK4725C',
     'CALLE GOYA 55 MADRID. Fecha: 01/2022 (dia: la fecha de encargo y el presupuesto de Fain firmado, 12/01/2022). Tipo de obra: ASCENSOR hidraulico en la escalera de servicio (hueco que tuvo un ascensor; '
     'huida reducida, maquinaria en armario en el sotano). Distrito 04 - Salamanca (Recoletos). CP 28001. Tecnico: Quique. Administrador: Jose M. Fernandez Moya (915 333 289, de 9 a 14 y de 16 a 17.30; '
     'admin@amoncloa.es) - no esta en la agenda. Presidente: Jose Alejandro Blanco (914 363 670). DECLARACION; expediente 104/2022/02271. PEM 32.655,98. Certificado de viabilidad enviado 09/05/2022 para iniciar obras.\n\n'
     + crudo('goya55', 2022) + chr(10) + chr(10) + 'Obra anulada por el cliente ("FUE ANULADA POR PARTE DEL CLIENTE", Sergio Godino, de Fain, 22-05-2025); el proyecto si se hizo.' + REV)
CC71 = R('gutierredecetina71' + B + 'guzmanelbueno56')
for carp, fecha, trajo, t, ruta in [
        ('gorrion55', '2017-10-13', 'PEDRO ARANDA (THYSSEN)', 'Calle GORRION 55 MADRID. Fecha: 10/2017. Distrito 11 - Carabanchel (San Isidro). Ficha vacia; hay croquis y presupuesto.', None),
        ('gregoriovacas14', '2015-12-06', 'PEDRO (THYSSEN)', 'Calle GREGORIO VACAS 14 MADRID. Fecha: 12/2015 (la ficha no la trae: xx/20xx). Distrito 10 - Latina (Lucero). Ficha vacia salvo: "Hay que poner unas '
         'escaleras nuevas por el patio y el ascensor por el interior. Ascensor de embarque simple 5 paradas. Foso normal hueco 1320 x 1550". Hay croquis y oferta.', None),
        ('guadaira9', '2016-06-04', 'PEDRO ARANDA (THYSSEN)', 'CALLE GUADAIRA 9 MADRID. Fecha: 05/2016 (croquis del 04/06/2016). Distrito 13 - Puente de Vallecas (Portazgo). Ficha vacia; hay croquis, borrador de escalera '
         'y presupuesto (2016, modificado en 2017; los ficheros se llaman "guabairo9").', None),
        ('guadalix3', '2017-11-18', 'LUIS MIGUEL NUNES (THYSSEN)', 'Calle GUADALIX 3 MADRID. Fecha: 11/2017. Distrito 06 - Tetuan (Berruguete). Ficha vacia; hay un croquis (llamado "Guadalix 6") y un enlace a fotos.', None),
        ('grafito49', '2017-10-26', None, 'GRAFITO 49 MADRID. Carpeta SIN ficha de datos: un .doc (oct-2017).', None),
        ('gomeznarro64', '2022-03-04', None, 'GOMEZNARRO 64 MADRID. Carpeta SIN ficha de datos: solo el modelo de ascensor del Ayuntamiento (MOD_C22_17, mar-2022).', None),
        ('gutierredecetina123', '2025-11-13', None, 'GUTIERRE DE CETINA 123 MADRID. Carpeta SIN ficha de datos: modelo 3D (nov-2025) y croquis EA/ER con la ficha catastral 5955404VK4755F (jul-2026).', None),
        ('guzmanelbueno56', '2014-06-05', None, 'GUZMAN EL BUENO 56 MADRID. Carpeta colada dentro de "gutierredecetina71", SIN ficha de datos: catalogo de salvaescaleras ArcoLift y croquis (jun-jul 2014).', CC71)]:
    if carp == 'gutierredecetina123':   # sin ficha pero con trabajo reciente: abierta (Monica, 7-oct-2026)
        fila(carp, fecha, 'abierta', None, trajo, None, '5955404VK4755F', t + REV, ruta=ruta); continue
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t, ruta=ruta)

# ================================================================= 3. MANIAS
mania('Ascensor en suelo publico con modelo del Ayuntamiento en NZ 3.1.a: la ECU no tiene competencias; se tramita por el Ayuntamiento.', 'ECU (ACTECU)', '2026-01-09', 'gomeznarro249', clave='gn249',
      cita='"Este edificio se encuentra en Norma Zonal 3.1.a, contando con modelo de ascensor en suelo público. Por lo que como ECU no tendríamos competencias para actuar en este expediente." Se gestiona por ayuntamiento')
mania('SATE que cambia el acabado de la fachada (ladrillo visto por enfoscado y pintura): va por LICENCIA; la DR no vale, y no se puede empezar la obra hasta la resolucion.', 'ECU (ACTECU)', '2026-03-23',
      'guadalete6', clave='gl6', trozo='cambio del acabado')
mania('Muro colindante (f3.1): no admite el SATE; se cambia por aislamiento de aerogel de 2 cm (con cambio del certificado energetico y de los planos).', 'ECU (ACTECU)', '2026-05-28', 'gonzalodecespedes21', clave='gc21',
      cita='28/05/2026: de acuerdo con la solicitud de la ECU, en la cual informan que se debe modificar el muro (f3.1) debido a que es colindante, se hace el cambio de muro SATE a muro con AEROGEL de 2cm')
mania('Escalera preexistente estrecha que el proyecto reduce: exige tirarla entera y hacerla nueva en lugar de un derribo parcial (si no, deniega).', 'Junta Municipal de Distrito de Ciudad Lineal', '2022-02-23',
      'guillendecastro13', clave='gc13', trozo='tirar toda la escalera')
mania('Concedida la licencia del ascensor, el promotor debe pedir al Canal de Isabel II autorizacion para retranquear los absorbedores (alcantarillas) antes de las obras.',
      'Junta Municipal de Distrito de Hortaleza / Canal de Isabel II', '2025-03-11', 'gomeznarro233', clave='gn233', trozo='absorbedores')

resumen()
