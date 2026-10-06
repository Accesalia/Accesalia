# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda C3 (casimiroescudero11 .. clavelinas9, 40 carpetas). 6-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de

GESTIN = 'd104d96c-c75e-4d51-9c0f-5dd7e3ea0c04'; MERINO = '4ab397d8-df4d-45c9-956a-10310ec69e47'; MATERLEY = '10cae02d-4e53-44a7-a263-cd9ad7437d46'
LATINA = '4e61093a-5765-4ead-960b-0e021ce756d4'; NEG_LIC_LATINA = '17122dff-a251-4a76-8edc-d92671ff4f37'
PU.update(isaac='e5abf29a-a25f-4c87-8705-6dc523285e1f', cifuentes='37b818c1-fa3b-4a1e-a856-eabe5ba35837', alba='61038fa7-f2fa-4dfa-a169-dae52465513c',
          justo='d3e649fb-351f-4ed1-bff1-2430a532ff57', cristina_afa='cfe65b99-2dcf-4af6-9c82-294632e7d3b8', velasco='94b4d0ec-edd7-4038-a58f-0823b287fa8f',
          mblanco='67525999-7f12-416d-a311-1f2f02f37d99', vreal='3606239e-1b7a-48c1-bea2-08c841efee80', megias='4757522a-e0d2-4ca5-aa1b-5e898d2c07e0',
          gmoya='5a588515-9c02-4058-8e31-7e51dec4737f')
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


# ================================================================= 0. AGENDA (personas nuevas en administraciones que ya existen + Junta de Latina)
ESTHER = persona_nueva('Esther', 'Rodríguez Menéndez', None, '91 259 97 96', 'e.rodriguez@merinosyf.com', empresa=MERINO,
                       notas_='Merino (Cine 23, 2025). En nov-2025 deja Cine 15 a Glenda; escribe tambien desde es.rodriguez@merinosyf.com.')
if not b.leer('correo?select=id&email=eq.es.rodriguez@merinosyf.com'):
    ins('correo', [{'puesto_id': ESTHER, 'email': 'es.rodriguez@merinosyf.com', 'etiqueta': 'general', 'principal': False}])
GLENDA = persona_nueva('Glenda', None, None, '91 259 97 96', 'g.mora@merinosyf.com', empresa=MERINO, notas_='Merino: lleva Cine 15 desde nov-2025 (sustituye a Esther Rodriguez).')
persona_nueva('María', 'Martínez', 'facturación', None, 'mariamartinez@gestin.es', empresa=GESTIN, notas_='Gestin: facturacion (Castilla 7).')
persona_nueva('Armando', 'Mendoza', 'pagos ICIO', None, 'armandomendoza@gestin.es', empresa=GESTIN, notas_='Gestin: pagos del ICIO (Castilla 7).')
persona_nueva('Alba', 'Guerrero', 'técnico', None, 'guerreroba@madrid.es', organismo=LATINA, notas_='Junta de Latina: tecnica que lleva la licencia de Cebreros 1 (2024-2025).')
if not b.leer('correo?select=id&email=eq.licenciaslatina@madrid.es'):
    ins('correo', [{'organismo_area_id': NEG_LIC_LATINA, 'email': 'licenciaslatina@madrid.es', 'etiqueta': 'general', 'principal': True}])

# ================================================================= 1. PRODUCCION (23)
rellenar('ce11', 'CASIMIRO ESCUDERO 11', 'casimiroescudero11', {'fecha_apertura': '2026-04-01', 'referencia_catastral': '7014213VK3771C',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia desconocido). Contacta: Monica Cifuentes (SM FINCAS). Tipo de obra: IEE. Tecnico: Alex. Fecha encargo: 05/05/2026; HE recibida firmada 08/05/2026. Ano 1971. '
                    'Presidente 2026: Rafael Chicharro Garcia. OJO: el CIF de la comunidad empieza por E (E78950961). En la ficha: comercial interno CARLOS G.' + EXT},
    ('iee',), n=notas_a_mano('casimiroescudero11', 2026, {0: ('2026-05-08', None)}),
    comunidad={'iban': 'ES57 0081 0174 8100 0197 2908', 'cif_comunidad': 'E78950961'}, presi=('RAFAEL CHICHARRO GARCIA', 'presidente', '616464379', '50072110Y'),
    adm=PU['cifuentes'], trae_pu=PU['cifuentes'], captador=ALVARO, lleva=ALVARO)
rellenar('cas106', 'CASTELLO 106', 'castello106', {'fecha_apertura': '2025-04-29',
    'origen_notas': 'Fecha de llegada: 04/2025. Contacta: Isaac Pizarroso (GESTIN; en la ficha "Alberto" tachado). Tipo de obra: primero ACCESIBILIDAD del portal (piden rampa; no cabe una que cumpla: plataforma elevadora vertical); '
                    'en may-2026 piden ademas proyecto, DF y subvenciones de la CUBIERTA (impermeabilizacion, aislamiento termico, retirada de uralita; la oferta de obra mas favorable es la de Luxor) y valorar el trastero comunitario. '
                    'Presidente: Jose Garcia Ines, 699 967 295. Conserje: Eduardo, 610 44 70 49. HE de accesibilidad 14-05-2025; HE de cubierta y de accesibilidad (tarifas actualizadas) enviadas 03-06-26. Comercial: DANIEL.'},
    ('plataforma', 'accesibilidad_portal', 'cubierta', 'df', 'subvenciones'),
    n=partir(fijar('castello106', 2025), 1, '---------- Forwarded message', '2026-05-29'),
    presi=('JOSE GARCIA INES', 'presidente', '699967295'), adm=PU['isaac'], trae_pu=PU['isaac'])
d = b.leer('personas_comunidad?select=id&nombre=eq.' + quote('presidente Jose García Ines 699 967 295'))
if d: act('personas_comunidad?id=eq.' + d[0]['id'], {'nombre': 'JOSE GARCIA INES', 'telefono': '699967295'})
rellenar('cst7', 'CASTILLA 7', 'castilla7', {'fecha_apertura': '2024-12-05', 'referencia_catastral': '0384906VK4708C',
    'origen_notas': 'Fecha de llegada: 12/2024. Contacta: Isaac (GESTIN SA). Tipo de obra: ASCENSOR CON DERRIBO de la escalera + SUBV (se presento tambien SATE; firman solo ascensor y subvencion). Barrio: Bellas Vistas. Tecnico: Karla. '
                    'Fecha encargo: 21/02/2025. Ano 1910. LICENCIA por ECU (ACTECU), presentada 04-07-2025. Contrata: ELECNOR (presupuesto firmado en junta 08/07/2025). Visado TL/010781/2025. '
                    'Gestin: Isaac Pizarroso, 91 447 10 09; facturacion mariamartinez@gestin.es; pagos del ICIO armandomendoza@gestin.es; horario L-J 9 a 2 y 4 a 6, V 9 a 2. '
                    'Presidenta: Almudena Yague Gonzalez; vicepresidente: Antonio Burgos. En 2026 la obra no empieza: un vecino moroso y no encuentran banco que les financie. Comercial: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('castilla7', 2024),
    comunidad={'iban': 'ES97 2100 1988 5013 0048 0838', 'cif_comunidad': 'H79811899'},
    presi=('ALMUDENA YAGÜE GONZALEZ', 'presidente', '616846600', '47234180T', 'ALMUDENA.YAGUE.G@hotmail.com'), adm=PU['isaac'], trae_pu=PU['isaac'])
pc(OPP['cst7'][0]['id'], 'ANTONIO BURGOS', 'vicepresidente', None, None, 'aburgosperez@gmail.com')
rellenar('car21', 'CASTILLO DE AREVALO 21', 'castilloarevalo21', {'fecha_apertura': '2025-06-23',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: el primer fichero, escaneo 3D del 23/06/2025). Contacta: "Administrador Carlos" (639 148 092; Cafercarretero@yahoo.es) - no esta en la agenda. '
                    'Tipo de obra: la ficha no lo dice (viabilidad y honorarios presentados el 26 de junio). Comercial interno: CARLOS.' + CAPTO_CARLOS},
    (), n=notas_a_mano('castilloarevalo21', 2025, {0: ('2025-06-26', 'Sin fecha delante; la fecha va dentro ("26 junio").')}), captador=CARLOS, lleva=ALVARO)
for clave, pref, carp, props in (('car2', 'CASTILLO DE AREVALO 2 ', 'castillodearevalo2', 18), ('car4', 'CASTILLO DE AREVALO 4', 'castillodearevalo4', 18),
                                 ('oro7', 'CASTILLO DE OROPESA 7', 'castillodeoropesa7', 8), ('oro9', 'CASTILLO DE OROPESA  9', 'castillodeoropesa9', 8),
                                 ('oro11', 'CASTILLO DE OROPESA 11', 'castillodeoropesa11', 8), ('cp17', 'CASTROPOL 17', 'castropol17', 10)):
    rellenar(clave, pref, carp, {'fecha_apertura': '2025-09-29', 'origen_notas': IEE_ROJO % props},
             ('iee',), n=fijar(carp, 2025, SINF_JUSTO), adm=PU['alba'], trae_pu=PU['justo'])
n = partir(_notas_de('castillodecoca9', 2025), 0, '---------- Forwarded message', '2025-09-29', vez=2)
n[0] = ('2025-10-14', n[0][1] + '\n\n(Correo de Diego Rojo del 14 de octubre de 2025.)'); n[1] = (n[1][0], n[1][1] + '\n\n(' + SINF_JUSTO[1] + ')')
rellenar('coca9', 'CASTILLO DE COCA 9', 'castillodecoca9', {'fecha_apertura': '2025-09-29',
    'origen_notas': 'Fecha de llegada: 10/2025 (primero, el 29/09/2025, en la lista de IEE de Justo Rojo: 10 propiedades). Contacta: Diego Rojo (ROJO JUSDI), que el 14/10/2025 pide ademas un informe previo de costes y viabilidad de un ASCENSOR. '
                    'Tipo de obra: ASCENSOR + IEE (ascensor por la calle, pero calle privada; modificar contadores; PEM estimado 200.000). HE de IEE 24/10/2025; HE e informe de viabilidad 27/10/2025. Comercial interno: DANIEL.'},
    ('ascensor', 'iee'), n=n, adm=PU['diego'], trae_pu=PU['diego'])
rellenar('sim7', 'CASTILLO DE SIMANCAS 7', 'castillodesimancas7', {'fecha_apertura': '2025-10-01', 'referencia_catastral': '6858710VK4765F',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia desconocido). Contacta: Silvia Campos, presidenta. Tipo de obra: REHABILITACION PARCIAL + SUBVENCIONES (tratamiento de humedades por capilaridad en los bajos y arreglo de cubierta; memoria valorada). '
                    'Tecnico: Carlos Daza. Fecha encargo: 16/01/2026. Ano 1960. DR por ECU (ACTECU). Contratas firmadas: Humetek (filtraciones) y Matedecon (cubierta). '
                    'Administracion: MANDATARIA (Esther; tachada en la ficha) hasta el 30/06/2026; desde julio-2026 MATERLEY (fincas@materley.es). '
                    'Presidencia: en la ficha "Silvia Campos, presidenta" (contacto) y Cristina Fernandez Alvarez (con DNI); el 30/06/2026 Mandataria da como presidenta a Paola (pamoreno.ramirez@gmail.com). Otro contacto: beltranpadillaaa@gmail.com. '
                    'Desde el 01/07/2026 TRAMITACION PARADA hasta nueva orden de la comunidad (la junta del 26/06/2026 no autoriza firmas ni tramites hasta revisar el proyecto). En la ficha: comercial interno CARLOS G.' + CAPTO_CARLOS},
    ('arreglo_cubierta', 'memoria_valorada', 'subvenciones'),
    n=fijar('castillodesimancas7', 2025, ('2026-01-16', 'Sin fecha; va antes del 17/04/2026: se pone la fecha de encargo de la ficha (16/01/2026).')),
    comunidad={'iban': 'ES83 0081 5730 1100 0149 8056', 'cif_comunidad': 'H79854519'},
    presi=('CRISTINA FERNANDEZ ALVAREZ', 'presidente', '686544419', '51100723J'), captador=CARLOS, lleva=ALVARO)
cs7 = OPP['sim7'][0]['id']
pc(cs7, 'SILVIA CAMPOS', 'otro', '616679087', None, None, 'En la ficha, contacto: "presidenta" (10/2025).')
pc(cs7, 'PAOLA', 'otro', None, None, 'pamoreno.ramirez@gmail.com', 'Presidenta segun Mandataria (30/06/2026); firma como tal el 01/07/2026.')
if not b.leer('comunidad_admin_responsable?select=id&vigente=eq.true&comunidad_id=eq.' + cs7):
    ins('comunidad_admin_responsable', [{'comunidad_id': cs7, 'empresa_id': MATERLEY, 'puesto_id': None, 'vigente': True}])
rellenar('ucl53', 'CASTILLO DE UCLES 53', 'castillodeucles53', {'fecha_apertura': '2025-01-30', 'referencia_catastral': '7260311VK4776A',
    'origen_notas': 'Fecha de llegada: 01/2025 (dia: el del encargo). Contacta: la administradora (AFASONER, Cristina); viene por Elecnor (Javier Velasco). Tipo de obra: SATE + cubierta + subvencion a exito + accesibilidad (plataforma, en paralelo) + CAES '
                    '(rehacer el proyecto de otro). Barrio: Simancas. Tecnico: Julio. Fecha encargo: 30/01/2025. ECU, licencia. Presidenta: Olvido, 629 586 341. Angel, de la comision de obras (6o B), 645 959 455. '
                    'La carpeta tiene dos fichas iguales (sate y accesibilidad): una sola oportunidad. PERDIDA: el 18-03-2025 dicen que no siguen con las subvenciones; el 13/05/2025 se confirma que no lo quieren hacer. Comercial: DANIEL.'},
    ('sate', 'cubierta', 'plataforma', 'subvenciones', 'caes'), n=fijar('castillodeucles53/sate/FICHA DATOS TECNICOS.docx', 2025),
    comunidad={'iban': 'ES58 2100 5465 6413 0015 3550', 'cif_comunidad': 'H80010341'}, presi=('OLVIDO', 'presidente', '629586341'),
    adm=PU['cristina_afa'], trae_pu=PU['velasco'])
pc(OPP['ucl53'][0]['id'], 'ANGEL', 'otro', '645959455', None, None, 'Comision de obras (6o B).')
if ESCRIBIR:
    oid = OPP['ucl53'][1]
    if not b.leer('motivo_cierre_oportunidad?select=id&oportunidad_id=eq.' + oid):
        b.insertar('motivo_cierre_oportunidad', [{'oportunidad_id': oid, 'resultado_final': 'perdido', 'motivo_perdido': 'no siguen adelante (no quieren hacerlo)', 'fecha_cierre': '2025-05-13',
                                                  'notas': '18-03-2025: no siguen con las subvenciones; 13/05/2025: confirmado que no quieren hacerlo (ficha de Dropbox). Cerrada en el barrido de Madrid (Monica, 6-oct-2026).'}])
        b.actualizar('oportunidades?id=eq.' + oid, {'estado': 'cerrada'})
else:
    SECO.append('INSERT motivo_cierre_oportunidad x1: Castillo de Ucles 53 perdido (no quieren hacerlo) 2025-05-13 + UPDATE oportunidades estado=cerrada')
rellenar('cser5', 'CASTROSERNA 5', 'castrocerna5', {'fecha_apertura': '2025-12-11',
    'origen_notas': 'Fecha de llegada: 12/2025. Contacta: Manuel Blanco (DEL BRIO Y BLANCO), que acaba de coger la comunidad y le piden llevar su presupuesto. Tipo de obra: SATE + SUBV (aislamiento de fachada). '
                    'La carpeta de Dropbox se llama "castrocerna5" (sic). Comercial interno: DANIEL.'},
    ('sate', 'subvenciones'), n=notas_a_mano('castrocerna5', 2025, {0: ('2025-12-11', 'Correo de Manuel Blanco del 11 de diciembre de 2025.'),
                                                                     1: ('2025-12-15', 'En la ficha "15/12/225": errata de 2025.')}),
    adm=PU['mblanco'], trae_pu=PU['mblanco'])
n = partir(fijar('cebreros1', 2022), 12, 'A fecha 1-07-2026', '2026-07-01')
n = partir(n, 14, 'SUBVENCIONES', None); sub_ceb = n.pop()[1]
rellenar('ceb1', 'CEBREROS 1', 'cebreros1', {'fecha_apertura': '2022-03-01', 'referencia_catastral': '7131904VK3773A',
    'origen_notas': 'Fecha de llegada: 03/2022 (dia desconocido). Contacta: FAIN (en la ficha Juan Paramio -> Oswaldo, tachados; ahora Vicente Real). Tipo de obra: ASCENSOR POR EXTERIOR + subvencion. Barrio: Puerta del Angel. '
                    'Tecnico: Enrique -> requerimientos Carla. Jefe de obra: Daniel Palacios (Fain). LICENCIA por la Junta de Latina (expediente 350/2022/05344; NZ 4), presentada en ago-2022 y concedida el 10/03/2026; '
                    'la tecnica es Alba Guerrero (guerreroba@madrid.es); licencias: licenciaslatina@madrid.es, 915 133 518 / 915 889 742 / 915 889 732, lunes y miercoles de 9 a 11 con cita previa. '
                    'La acera la ejecuta Vias (Obras Publicas), sin fecha; los vecinos esperan a Vias. PEM 116.111,86. Superficie 55,60. Subvencion concedida 92.421,19 (fin de obra hasta 24/12/2028). '
                    'Presidente: Fernando Rodriguez Alvarez; su hija: aran.rodriguezboti@gmail.com. En sep-2026 Fain envia el PSS y la apertura para empezar la obra. Comercial: DANIEL.'},
    ('ascensor', 'subvenciones'), n=n, subvencion=[(None, sub_ceb)],
    comunidad={'iban': 'ES05 2100 8340 0513 0000 6467', 'cif_comunidad': 'H79552097'},
    presi=('FERNANDO RODRIGUEZ ALVAREZ', 'presidente', '649559457', None, 'rodrifer45@hotmail.com'), trae_pu=PU['vreal'])
rellenar('cen1', 'CENTENERA 1', 'centenera1', {'fecha_apertura': '2025-10-08',
    'origen_notas': 'Fecha de llegada: 10/2025. Contacta: Javier Velasco (ELECNOR): presupuesto urgente de SATE y cubierta, la junta para elegir arquitecto es al dia siguiente; despues licitan varias empresas con nuestras mediciones. '
                    'Tipo de obra: SATE + cubierta + subvenciones. Comercial interno: DANIEL.'},
    ('sate', 'cubierta', 'subvenciones'), n=fijar('centenera1', 2025, ('2025-10-08', 'Correo de Javier Velasco (Elecnor) del 8 de octubre de 2025.')), trae_pu=PU['velasco'])
n = fijar('centeno27', 2024, otros={9: ('2025-09-10', 'En la ficha "10/09" sin ano; va despues del 23/07/2025: es 2025.')})
n = partir(n, 4, 'Alejandra : 09/09/2025', '2025-09-09')
rellenar('cto27', 'CENTENO 27', 'centeno27', {'fecha_apertura': '2024-03-22', 'referencia_catastral': '9402546VK3790C',
    'origen_notas': 'Fecha de llegada: 03/2024 (en la ficha 10/2024). Contacta: Javier Rodriguez (Schindler; tachado en la ficha) y Eugenio (Grascon); ya se habia visto con Pedro Aranda en 2016. '
                    'Tipo de obra: ASCENSOR (por fuera) + SATE CON CUBIERTA + CAES + SUBVENCIONES, con DF y CSS (la maquina tiene que ser de Schindler). Barrio: Zofio. Tecnico: Israel. Fecha encargo: 04/07/2025 (HE firmada). '
                    'Ano 1960. Contrata: ENVOLTERMIA ("lo hace Envoltermia todo"). Licencia por el AYUNTAMIENTO, registrada 01/12/2025. Administracion: GRUPO EUROLINOVA (Miguel Megias; 91 500 21 69, L-J 9-14 y 16-19, V 9-14; '
                    'comunidades@grupoeurolinova.com). PONER EN COPIA DE TODO AL PRESIDENTE (Jose Luis; tambien 911 865 517). PEM 413.185,82. Visado TL/017773/2025. Superficie 233,78. '
                    'Direccion del CIF "C Centeno 27"; la real, "C del Centeno 27". Comercial: DANIEL.'},
    ('ascensor', 'sate', 'cubierta', 'df', 'css', 'subvenciones', 'caes'), n=n,
    comunidad={'iban': 'ES75 2100 4094 7113 0149 9135', 'cif_comunidad': 'H79697124'},
    presi=('JOSE LUIS FERNANDEZ MARTINEZ', 'presidente', '620838475', '05910071Z', 'fm311070@gmail.com'), adm=PU['megias'], trae_pu=PU['jrodriguez'])
rellenar('cbl1', 'CERRO BLANCO 1', 'cerroblanco1', {'fecha_apertura': '2025-05-26',
    'origen_notas': 'Fecha de llegada: 05/2025. Contacta: Javier Gonzalez Moya (Schindler). Tipo de obra: ASCENSOR + DERRIBO DE ESCALERA. Viabilidad dada a "JL" a traves de el (26-05-2025); HE enviada 02-06-2025. Comercial: DANIEL.'},
    ('ascensor',), n=fijar('cerroblanco1', 2025), trae_pu=PU['gmoya'])
rellenar('cca187', 'CERRO CASTAÑAR 187', 'cerrocastañar187', {'fecha_apertura': '2026-04-10',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: el de la ficha). Contacta: Javier Rodriguez (Schindler). Tipo de obra: ASCENSOR + ACCESIBILIDAD. La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + EXT},
    ('ascensor', 'accesibilidad'), trae_pu=PU['jrodriguez'], captador=ALVARO, lleva=ALVARO)
rellenar('cgr23', 'CESAR GONZALEZ RUANO 23', 'cesargonzalezruano23', {'fecha_apertura': '2025-12-09',
    'origen_notas': 'Fecha de llegada: 12/2025 (dia: el del escaneo 3D). Contacta: Antonio, vecino, 669 279 228. Tipo de obra: la ficha no lo dice. Hay escaneo 3D. La ficha no tiene notas. '
                    'En la ficha: comercial interno "DANIEL O CARLOS"; la lleva Daniel.'},
    (), presi=('ANTONIO', 'vecino', '669279228'), trae_pc='presi')
rellenar('chu12', 'CHUCURI 12', 'chucuri12', {'fecha_apertura': '2024-05-16',
    'origen_notas': 'Fecha de llegada: 05/2024. Contacta: Juani Fernandez (DIDEPRO, administracion; 914 929 628; jfernandez@didepro.es) - no esta en la agenda. Tipo de obra: SATE y cubierta: proyecto, licencia, DF y CSS; '
                    'la subvencion (Next Generation, programa 5) la tramitan ellos y nosotros preparamos libro del edificio, CEE e IEE. Hay mediciones recibidas de Didepro. Comercial: DANIEL.'},
    ('sate', 'cubierta', 'licencia', 'df', 'css', 'lee', 'cee', 'iee'), n=fijar('chucuri12', 2024))
rellenar('cn15', 'CINE 15', 'cine15', {'fecha_apertura': '2025-11-28',
    'origen_notas': 'Fecha de llegada: 11/2025. Contacta: Esther Rodriguez (MERINO), que deja la finca a su companera Glenda (g.mora@merinosyf.com; 91 259 97 96). Tipo de obra: ASC + SUBV, con proyecto y DF '
                    '(6 plantas, bajo y 1o a 5o, dos viviendas por planta; derribo completo de escalera, ascensor de 8 plazas de doble embarque a 90 con entrada directa al portal; modificar contadores; PEM 220.000 + IVA). '
                    'Comercial interno: ALVARO.'},
    ('ascensor', 'df', 'subvenciones'), n=fijar('cine15', 2025, ('2025-11-28', 'Correo de Esther Rodriguez (Merino) del 28 de noviembre de 2025.')),
    adm=GLENDA, trae_pu=ESTHER, captador=ALVARO, lleva=ALVARO)
rellenar('cn23', 'CINE 23', 'cine23', {'fecha_apertura': '2025-03-19',
    'origen_notas': 'Fecha de llegada: 03/2025 (el correo es del 19/03/2025). Contacta: Esther Rodriguez (MERINO). Tipo de obra: ASCENSOR, DIRECCION FACULTATIVA Y SUBVENCIONES. Presidente: Ignacio, 639 444 183. '
                    'Informe de viabilidad 24/03/2025; HE y subvenciones 1/04/2025. Comercial: DANIEL.'},
    ('ascensor', 'df', 'subvenciones'), n=fijar('cine23', 2025), presi=('IGNACIO', 'presidente', '639444183'), adm=ESTHER, trae_pu=ESTHER)

# ================================================================= 2. CLON
cl = lambda c, a, s=None: J(fijar(c, a, s))
REVS = [
    ('cavaalta8', '2025-05-19', 'CARLOS JAVIER LEON (presidente)', None, None,
     'CAVA ALTA 8 MADRID. Fecha: 05/2025. Tipo de obra: ASCENSOR por el patio de luces izquierdo (para quitar la rampa del portal; la vecina del bajo izquierdo entraria por una pasarela). Administradora: Virginia (info@carrascogaldon.es). '
     'Presidente: Carlos Javier Leon, 659 469 283, perenkenbocanegra@gmail.com. 4/06/2025: por el patio no se puede (afecta al local y a ventanas de viviendas) y por el hueco de escalera no lo quieren.\n\n'
     + J(partir(fijar('cavaalta8', 2025, ('2025-05-19', 'Correo de Carlos Javier Leon del 19 de mayo de 2025.')), 0, 'Hablo con Carlos Javier', '2025-06-04'))),
    ('cavadesanmiguel7', '2025-06-24', 'ANA NOGUEIRA (vecina)', None, None,
     'CAVA DE SAN MIGUEL 7 MADRID. Fecha: 06/2025 (visita 24-06-2025). Tipo de obra: SILLA SALVAESCALERAS pegada a la pared de la planta baja a la segunda (el ascensor existente solo funciona de la segunda hacia arriba). '
     'EDIFICIO CATALOGADO TOTALMENTE PROTEGIDO. Ana Nogueira, 656 824 593, ananogueira.noriega@gmail.com. Consulta a la ECU (Ramon): DR por ECU con respuesta de Patrimonio, o consulta urbanistica vinculante; '
     'la respuesta y los documentos de la ECU, en 1.DATOS/RECIBIDO DE LA ECU. 01/07/2025: se le dice a la vecina que vemos viable la plataforma para salvar dos plantas. Comercial interno: DANIEL.\n\n' + cl('cavadesanmiguel7', 2025)),
    ('cazorla4', '2025-01-03', 'MANUEL BLANCO (DEL BRIO Y BLANCO)', None, None,
     'CAZORLA 4 MADRID (la cabecera de la ficha esta en blanco; la direccion la da la carpeta). Fecha: 01/2025. Tipo de obra: RAMPA + SUBV. Distrito Puente de Vallecas. CP 28053. '
     'HE de proyecto, DF y subvencion enviada 03/01/2025; junta el 8/01 (no vamos).\n\n' + cl('cazorla4', 2025)),
    ('cebreros31', '2025-02-06', 'GRUPO TREBOL', None, None,
     'CEBREROS 31 MADRID. Fecha: 02/2025. Administracion: Trebol. Tipo de obra: ASCENSOR CON DERRIBO + PLATAFORMA ELEVADORA (nueva escalera, ascensor de 3 personas y plataforma vertical en la entrada; 182.000). Distrito Latina. '
     'Visitado 06/02/2025; informe en DATOS; HE enviada.\n\n' + cl('cebreros31', 2025)),
    ('ceferinorodriguez17 (SATE)', '2021-09-15', 'ANTONIO MIRA (ANYLOR)', 'H80439763', '1099201VK4719G',
     'CEFERINO RODRIGUEZ 17 MADRID. Fecha: 2021 (encargo 15-09-2021). Tipo de obra: PROYECTO DE SATE (constructora Anylor). Distrito 06 - Tetuan (Valdeacederas). Tecnico: Enrique. Administracion a traves de Anylor (administracion@anylor.com). '
     'CP Ceferino Rodriguez 17. Presidenta (sept-2021): Lourdes Tejedor Perez (50730822K). PEM 54.268,07. Visados TL/019167/2021 y TT/103103/2023. Expediente 106/2022/00517. Superficie 7,71 m2. Proyecto hecho. '
     'Dic-2024: a Anylor no le terminan de pagar y la comunidad se agarra a un requerimiento del Ayuntamiento; Daniel (02/01/2025): que pidan cita en el Ayto con el expediente (nueva solicitud de licencia con el mismo proyecto, o recurso).\n\n'
     + cl('ceferinorodriguez17/SATE/FICHA DATOS TECNICOS.docx', 2024, ('2025-01-02', 'Correo de Daniel del 2 de enero de 2025, que contesta al de Antonio Mira del 19/12/2024.')),
     R('ceferinorodriguez17' + B + 'SATE')),
    ('ceferinorodriguez17 (informe carga patio)', '2023-01-01', 'ANTONIO MIRA (ANYLOR)', 'H80439763', '1099201VK4719G',
     'CEFERINO RODRIGUEZ 17 MADRID. Fecha: 01/2023 (dia desconocido). Tipo de obra: INFORME DE CARGA DEL PATIO (lo pide Antonio Mira, Anylor). Distrito Tetuan. Presidenta (sept-2021): Lourdes Tejedor Perez. '
     'IBAN ES86 0081 0639 16 0001388848. La ficha no tiene notas. Encargo distinto del SATE de 2021: fila aparte.', R('ceferinorodriguez17' + B + 'INFORME CARGA PATIO')),
    ('cerrodelaalcazaba19', '2016-05-01', 'FELIPE OSADO (ENOR)', 'E78679057', '3007514VK4730G',
     'Calle CERRO DE LA ALCAZABA 19 MADRID. Fecha: 05/2016 (dia desconocido). Tipo de obra: ASCENSOR. Distrito 13 - Puente de Vallecas (Entrevias). Administracion: MBASILIO, 917 860 596. '
     'CP Cerro de la Alcazaba 19 (CIF con E). Vicepresidente: Alberto, 636 757 816. PEM 90.214,28; residuos 300. NZ 4. Fachada 29,65 m; superficie 42,60. Hay carpetas de PROYECTO y OBRA. '
     'Correo de Felipe (sin fecha): se puede instalar; para la accesibilidad hay que quitar unos peldanos en planta baja; conservar la salida al tejado.\n\n'
     + cl('cerrodelaalcazaba19', 2016, ('2016-05-01', 'Sin fecha; la de la ficha (05/2016).'))),
    ('chantada46', '2021-11-29', 'JUAN PARAMIO / JOSE MARIA GALVEZ (FAIN)', None, None,
     'CALLE CHANTADA 46 MADRID. Fecha: 04/2022 (primer correo 29/11/2021). Tipo de obra: SUSTITUCION DE 2 ASCENSORES (paradas -2 a 9a; licencia de obra menor telematica); en mar-2022 Fain pregunta por las ayudas '
     '(ascensores de 375 kg, puertas de 800, cabina 980 x 1130). Distrito 08 - Fuencarral-El Pardo (Penagrande). Presupuesto SIN FIRMAR en 1.DATOS/3.PRESUPUESTO.\n\n'
     + J(partir(fijar('chantada46', 2021, ('2021-11-29', 'Correo de Juan Paramio del 29 de noviembre de 2021.')), 0, '---------- Forwarded message', '2022-03-16'))),
    ('chucuri10', '2020-01-14', 'NACHO (FAIN)', 'H80590615', '6208042VK4850H',
     'Calle CHUCURI 10 MADRID. Fecha: 2020 (la ficha es de 10/2023). Tipo de obra: INSTALACION DE ASCENSOR. Distrito 16 - Hortaleza (Pinar del Rey). Licencia TL/000968/2020. Superficie 86,80. '
     'Obra hecha: fin de obra con valoracion de 140.397,20 (carpeta OBRA/FIN DE OBRA).'),
    ('clavelinas9', '2025-07-04', 'ADOLFO COLLADO (MC GESTION FINCAS)', None, None,
     'CLAVELINAS 9 MADRID. Fecha: 07/2025. Tipo de obra: PROYECTO EXTERNO de revestimiento termico de fachadas y cubiertas. Administracion: MC Gestion Fincas (Avda. del Doctor Garcia Tapia 129, local 2; Adolfo Collado 618 63 60 95; '
     'Angel 636 97 25 08; 915 027 459; angel@mcgestionfincas.com; alberto@mcgestionfincas.com, preferente).\n\n' + cl('clavelinas9', 2025))]
for carp, fecha, trajo, cif, ref, t, *ruta in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, ruta=ruta[0] if ruta else None)
fila('cerrodelcarrasco2', '2024-07-16', 'cerrada', 'Perdida: "Los vecinos han votado que no" (05/12/2024).', 'ADMIN GUERRERO DADILLOS', None, None,
     'CERRO DEL CARRASCO 2 MADRID. Fecha: 07/2024. Tipo de obra: ASCENSOR (derribo del nucleo de escalera) + PLATAFORMA ELEVADORA + SUBVENCIONES (190.000 + IVA estimado). Distrito Vallecas. CP 28031. '
     'Administracion: Guerrero Dadillos (jmmlflorida@gmail.com). Vecina: Beatriz Santos, 616 57 44 05 (beatriz.santos@catastro.hacienda.gob.es).\n\n' + cl('cerrodelcarrasco2', 2024))
fila('claracampoamor15', '2023-02-13', 'cerrada', 'Perdida: "Ojo, se cae. El ascensor que habian visto con Daniel al final se lo dio a otro arquitecto."', 'FELIX UREÑA (URVALL)', None, None,
     'CLARA CAMPOAMOR 15 MADRID. Fecha: 02/2023 (hay un croquis de 2019). Tipo de obra: SATE, y ver que se mete en subvencion con los dos ascensores (229.000 + IVA; escaleras ya reconstruidas). '
     'Distrito 11 - Carabanchel (Puerta Bonita).\n\n' + cl('claracampoamor15', 2023))
fila('claudiocoello14', '2023-12-18', 'cerrada', 'Cancelado (18/12/2023): el ascensor lo hace la empresa SUMA ASTRAL INMUEBLES, S.L. (tiene la escalera derecha en exclusiva), no la comunidad.', 'OSCAR FERNANDEZ (FAIN)',
     'B86496031', '1850611VK4715B',
     'CLAUDIO COELLO 14 MADRID. Fecha: 12/2023. Tipo de obra: ASCENSOR LENTO EN HUECO DE ESCALERA. Distrito 04 - Salamanca (Recoletos). Ano 1989. Cliente: SUMA ASTRAL INMUEBLES, S.L. (Claudio Coello 14, esc. dcha., 1o A). '
     'Contactos: Eva Luque, 630 125 622, eval@consultingwshop.com; Beatriz Samperio Perez, b.samperio@sumaastral.com. Es amigo del Sr. Mediavilla: avisar al comercial antes de ir a escanear.\n\n' + cl('claudiocoello14', 2023))
for carp, fecha, trajo, t in [
        ('cebreros112', '2017-10-13', 'PEDRO ARANDA (THYSSEN)', 'Calle CEBREROS 112 MADRID. Fecha: 10/2017. Distrito 10 - Latina (Lucero). Ficha vacia; hay croquis.'),
        ('claracampoamor7', '2016-10-10', 'PEDRO ARANDA (THYSSEN)', 'Calle CLARA CAMPOAMOR 7 MADRID. Fecha: 10/2016. Tipo de obra: ASCENSOR (5 paradas, embarque simple, hueco 1450 x 1330; picando la pared del fondo, 1450 x 1450 adaptado, +1.000). '
         'Distrito 11 - Carabanchel (Puerta Bonita). Hay croquis.'),
        ('claudiocoello93', '2017-07-20', 'LUIS MIGUEL NUNES (THYSSEN)', 'Calle CLAUDIO COELLO 93 MADRID. Fecha: 07/2017. Distrito 04 - Salamanca (Castellana). Ficha vacia; hay un presupuesto.'),
        ('castrodeoro8', '2015-10-12', None, 'CASTRO DE ORO 8 MADRID. Carpeta SIN ficha de datos: croquis (.doc, .dwg, .pdf) de oct-2015.'),
        ('ciudaddebarcelona39', '2021-11-04', None, 'AVDA. CIUDAD DE BARCELONA 39 MADRID. Carpeta SIN ficha de datos: en OBRA, propuesta de SATE de EOS (oct-2021) y presupuestos de SATE con aerotermia y de fotovoltaica (11/11/2021).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 3. MANIAS
mania('En zona ZETU, si la comunidad pide subvencion, el Ayuntamiento pedira que se contemple el ascensor y la accesibilidad.', 'Ayuntamiento de Madrid', '2026-06-30', 'castillodesimancas7',
      clave='sim7', trozo='ZETU')
mania('Por el cambio en la tramitacion de las licencias, cualquier consulta sobre una licencia se pide al Negociado de Licencias de la Junta (licenciaslatina@madrid.es).', 'Junta Municipal de Distrito de Latina (licencias)',
      None, 'cebreros1', clave='ceb1',
      cita='debido a cambio en la tramitación de expedientes de licencia, cualquier consulta relativa a las mismas deberá ser solicitado al Negociado de Licencias')
mania('Ascensor que toca la acera: piden quitar el plano de la manzana completa y dibujar solo las actuaciones a realizar (incluida la modificacion de acera), y esa obra de acera la paga la comunidad aunque haya proyecto de Vias.',
      'Junta Municipal de Distrito de Latina', '2025-04-03', 'cebreros1', clave='ceb1', trozo='plano de manzana')
mania('La licencia del ascensor incorpora las obras de urbanizacion (acera) a cargo de la comunidad; si la comunidad espera a que Vias remodele la calle, la acera la paga Vias. Vias no da fecha.',
      'Ayuntamiento de Madrid (Obras Publicas / Vias)', '2026-04-06', 'cebreros1', clave='ceb1', trozo='obras de urbanización')

resumen()
