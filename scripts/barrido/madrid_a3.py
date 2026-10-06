# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda A3 (armenteros21 .. athos32 + ayala27 .. azcona5eraso6ardemans9, 29 carpetas). 6-oct-2026.
# Incluye el ARREGLO de dos carpetas coladas que fueron a la clon teniendo comunidad en produccion
# (aeronave33 dentro de acuerdo34; albalatedelarzobispo5 dentro de alameda4).
# Sin --escribir: marcha en seco. Con --borrar-clon ademas borra esas dos filas de la clon (copia antes en Descargas).
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa

FAIN = 'fa005671-8d23-45a6-8172-0ea7ca8c8950'; LOZANO = 'ee72f36d-70c0-4e75-8b0a-9ea473ca798d'
PU.update(arodriguez='d852e645-2ceb-43d1-b338-b3bbd6267f7a', jrodriguez='3bb9cbe7-f3d6-4223-be99-e76ad4a67a56', vreal='3606239e-1b7a-48c1-bea2-08c841efee80',
          raul_rodisa='d01ec2c9-4a66-475f-aaba-38247429e88c', cesar_rodisa='6b24ade0-b593-4afb-bf9f-628afd1bd77f', pujol='37e7d0f8-8fda-434d-95f1-f739688a0c61',
          collado='0f2b3251-9e84-443d-b81e-32edfd1f7915', aida='fb1639f0-a4b0-437f-a739-f3986b59aca8', pelaez='4cd6ac6f-d4b4-44d8-af84-f97812b360ef',
          areste='f4a98989-2875-4a7c-bb99-212c66a5049a', ivan_fain='ed4a4c84-e7c9-41a9-82b0-f0c856c3d3ec', dsanchez_fain='cadc2119-99c7-4a97-a474-75d420deaa81',
          manuel_dbb='67525999-7f12-416d-a311-1f2f02f37d99')

# ================================================================= 0. ARREGLO: aeronave33 y albalatedelarzobispo5, de la clon a produccion
rellenar('aer33', 'AERONAVE 33', 'aeronave33', {'fecha_apertura': '2020-08-13', 'referencia_catastral': '0305102VK5800E',
    'origen_notas': 'Fecha: 08/2020. La carpeta esta COLADA dentro de "acuerdo34" (MADRID\\acuerdo34\\aeronave33). Contacta: Ivan Vazquez (FAIN, 669 148 318). Tipo de obra: INSTALACION DE ASCENSOR. Barrio: Timon. Tecnico: Enrique. '
                    'Jefes de obra: Ma Angeles Perez, Abel Bernardos. Administracion: Juan Carlos Areste (676 120 100, adfincasareste@gmail.com). Presidente: Jose Miguel Mañero Montes (52865513J). PEM 53.512,38; residuos 300. '
                    'Visado TL/013778/2020; CFO TL/004914/2024: obra terminada; queda abierta (no se inventa fecha de cobro). Comercial: DANIEL. '
                    '(Se dio de alta por error en la clon el 6-oct-2026 porque el lector no miraba las carpetas coladas; corregido.)'},
    ('ascensor',), n=fijar('acuerdo34/aeronave33/FICHA DATOS TECNICOS.docx', 2022, ('2022-01-10', 'Sin fecha; la reunion es del 24/01/22.')),
    comunidad={'cif_comunidad': 'H78892098'}, presi=('JOSE MIGUEL MAÑERO MONTES', 'presidente', None, '52865513J'), trae_pu=PU['ivan_fain'])
rellenar('alb5', 'ALBALATE DEL ARZOBISPO 5', 'albalatedelarzobispo5', {'fecha_apertura': '2024-11-12',
    'origen_notas': 'Fecha: 11/2024. La carpeta esta COLADA dentro de "alameda4" (MADRID\\alameda4\\albalatedelarzobispo5). Contacta: David Sanchez (FAIN, 672 048 646, d.sanchez@fainascensores.com), que manda el presupuesto aceptado. '
                    'Tipo de obra: SUBVENCION EXTERNA de un proyecto de ascensor por hueco; el proyecto no lo hicimos (no hubo acuerdo con FAIN). Barrio/distrito: Puente de Vallecas. Fecha encargo: 23/06/2025 (HE de subvenciones firmada). '
                    'Administracion: Del Brio y Blanco (Manuel / Carlos, 616 42 70 62, manuel@delbrioyblanco.es). Comercial: DANIEL. '
                    '(Se dio de alta por error en la clon el 6-oct-2026 porque el lector no miraba las carpetas coladas; corregido.)'},
    ('subvenciones',), n=fijar('alameda4/albalatedelarzobispo5/FICHA DATOS TECNICOS.docx', 2024),
    comunidad={'iban': 'ES18 2085 9741 7203 3032 3964'}, presi=('LUIS LOPEZ ALMAZAN', 'presidente', None, '05894982J'), trae_pu=PU['dsanchez_fain'])
if '--borrar-clon' in sys.argv and ESCRIBIR:
    filas = b.leer(T + '?select=*&municipio=eq.MADRID&carpeta=in.(aeronave33,albalatedelarzobispo5)')
    assert len(filas) <= 2 and not b.leer('manias_organismos?select=id&clon_id=in.(%s)' % ','.join(f['id'] for f in filas) if filas else 'manias_organismos?select=id&limit=0')
    if filas:
        json.dump(filas, open(r'C:\Users\mfavi\Downloads\copia_clon_aeronave33_albalate5_borradas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=str)
        for f in filas: b.borrar(T + '?id=eq.' + f['id'])
elif not ESCRIBIR:
    SECO.append('DELETE clon x2: aeronave33, albalatedelarzobispo5 (solo con --borrar-clon; copia en Descargas)')

# ================================================================= 1. PRODUCCION (10)
rellenar('arm21', 'ARMENTEROS 21', 'armenteros21', {'fecha_apertura': '2024-03-22', 'referencia_catastral': '9895217VK3799F',
    'origen_notas': 'Fecha de llegada: 03/2024. Contacta: a traves de Javier Rodriguez (Schindler) y Eugenio (Gradcom). Tipo de obra: ASCENSOR CON CSS Y SUBV (hay modelo; hay que proponer un sistema alternativo al de la mesa de ascensores). '
                    'Barrio/distrito: Moncloa-Aravaca. Tecnico: Carlos Alberto. Fecha encargo: 11/11/2025. Ano 1950. Administracion: Antonio Rodriguez Gomez (Clara del Rey 52; 639 123 979; agfincass@gmail.com). '
                    'Presidente: Javier Armesto Iglesias (jarmesto@hotmail.com). Secretaria de la comunidad: Rosa Zorrilla (617 33 24 68, zolenro@gmail.com). "No enviar proyecto terminado hasta que paguen" (ene-2026). '
                    'Sep-2026: es una orden de ejecucion. Comercial: CARLOS.' + CAPTO_CARLOS},
    ('ascensor', 'css', 'subvenciones'),
    n=fijar('armenteros21', 2024, otros={3: ('2025-05-22', 'En la ficha "22-05" sin ano; va despues del 05/05/2025: es 22/05/2025.')}),
    comunidad={'iban': 'ES41 2085 9742 1703 3041 4077'}, presi=('JAVIER ARMESTO IGLESIAS', 'presidente', None, None, 'jarmesto@hotmail.com'),
    trae_pu=PU['jrodriguez'], captador=CARLOS, lleva=ALVARO)
c, _ = info('ARMENTEROS 21')
pc(c['id'], 'Rosa Zorrilla', 'secretario', '617 33 24 68', None, 'zolenro@gmail.com', 'Secretaria de la comunidad.')
rellenar('arm28', 'ARMENTEROS 28', 'armenteros28', {'fecha_apertura': '2021-10-01', 'referencia_catastral': '9797909VK3799F',
    'origen_notas': 'Fecha de llegada: 10/2021. Contacta: Vicente Real Muñoz (FAIN). Tipo de obra: ASCENSOR con invasion (existe modelo homogeneo). Barrio: Valdezarza. Tecnico: Enrique. Administracion: RODISA (Raul Diaz; Cl Valdesangil 16 local; '
                    '91 373 51 43; raul.diaz@administracionrodisa.es), administradores nuevos. Presidente: Jose Manuel Juan Martinez (679 35 85 44, jmanuel.jmartinez@gmail.com): PONERLE EN COPIA DE TODO. '
                    'Comision de obras: rafarojasdiez@hotmail.com, albertodelacruza@gmail.com, amjuste@ghis.ucm.es. Junta de Moncloa: Miguel Manso (914 801 608, mansojm@madrid.es); tecnimoncloa@madrid.es. '
                    'PEM 102.159,66; residuos 300. Visado TL/018112/2021. Expediente 350/2022/03413. Obra hecha; el CFO se retiene (jun-jul 2026) hasta que FAIN haga los repasos, que van tras el verano; la subvencion vence en enero. '
                    'Nueva cuenta desde nov-2021: ES04 2100 3393 1513 0044 8218. Comercial: DANIEL.'},
    ('ascensor',), n=fijar('armenteros28', 2026, ('2021-10-01', 'Sin fecha: la comision de obras.')),
    comunidad={'iban': 'ES04 2100 3393 1513 0044 8218'}, presi=('José Manuel JUAN MARTINEZ', 'presidente', '679 35 85 44', '49009919R', 'jmanuel.jmartinez@gmail.com'),
    adm=PU['raul_rodisa'], trae_pu=PU['vreal'])
SACRISTAN = None
rellenar('arm51', 'ARMENTEROS 51', 'armenteros51', {'fecha_apertura': '2024-09-27',
    'origen_notas': 'Fecha de llegada: 09/2024. Contacta: Maria Angeles Peña, de Quabit; desde el 13/05/2026, Miguel Angel Sacristan (masacristan@telefonica.net). Tipo de obra: ASCENSOR EXTERIOR; desde may-2026, ascensor y SATE de fachada. '
                    '"Igual que el edificio de al lado": 4.000 sin CSS, precio super reducido. Comercial en la ficha: ALVARO (2026); la capto Daniel en 2024.'},
    ('ascensor', 'sate'), n=fijar('armenteros51', 2024), captador=DANIEL, lleva=ALVARO)
DANIEL_LM = persona_nueva('Daniel', None, None, '913 283 109 / 607 755 895', 'daniel@lozanomasipe.es', empresa=LOZANO,
                          notas_='Lozano Masipe (Arroyo de la Media Legua 27); sustituye a Fº Javier Calzado Garcia, tachado. "607 755 895 director".')
rellenar('aml27', 'ARROYO DE LA MEDIA LEGUA 27', 'arroyodelamedialegua27', {'fecha_apertura': '2024-12-11', 'referencia_catastral': '4235203VK4743E',
    'origen_notas': 'Fecha de llegada: 12/2024. Contacta: Carlos Pujol (Schindler); tambien Manuel Crespo. Tipo de obra: TRANSFORMACION (SUSTITUCION) DE 2 ASCENSORES (Schindler) + subvenciones a exito con Accesalia (feb-2025). Distrito Moratalaz. '
                    'Tecnico: Dario -> Angela. Fecha encargo: 13/12/2024. Administracion: Lozano Masipe (C. Vinateros 124 bj. B; 913 283 109; daniel@lozanomasipe.es; ~~Fº Javier Calzado Garcia~~). PEM 80.527,39. Visado TL/008202/2025; '
                    'CFO TL/012996/2026: obra terminada; queda abierta. Superficie 68,96. Comercial: DANIEL.'},
    ('modificacion_asc', 'subvenciones'), n=fijar('arroyodelamedialegua27', 2024),
    presi=('OSCAR LOPEZ-SEPULVEDA JIMENEZ', 'presidente', '637 38 24 34', '50299490P', 'daosponte@yahoo.com'), trae_pu=PU['pujol'])
rellenar('aml30', 'ARROYO MEDIA LEGUA 30', 'arroyodelamedialegua30', {'fecha_apertura': '2026-02-24',
    'origen_notas': 'Fecha de llegada: 02/2026. Contacta: Adolfo Collado (AEA / MC GESTION FINCAS, jefe; Av. del Dr. Garcia Tapia 129 local 2; 915 02 74 59 / 618 63 60 95). Tipo de obra: SATE + ASCENSOR de modelo homogeneo con derribo de escalera '
                    'e invasion de espacio publico (doble embarque 90, 6 personas, 5 paradas). Proyecto y subvenciones; la DF y la CSS se ofrecen y cobran al inicio de obra. Comercial interno: DANIEL. HE 25/02/2026, reenviada 03-03-2026.'},
    ('sate', 'ascensor', 'subvenciones'), n=fijar('arroyodelamedialegua30', 2026, ('2026-02-24', 'Correo de Adolfo Collado del 24 de febrero de 2026.')),
    adm=PU['collado'], trae_pu=PU['collado'])
rellenar('af233', 'ARROYO FONTARRON 233', 'arroyofontarron233', {'fecha_apertura': '2025-06-13',
    'origen_notas': 'Fecha de llegada: 06/2025. Contacta: Maria Luisa, vecina (615 36 25 74, marialuisagarciarivas@yahoo.es): "no lo tienen aprobado, es iniciativa de Maria Luisa". Tipo de obra: SATE + ACCESIBILIDAD. Escaneado con iPhone. '
                    'Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('sate', 'accesibilidad'), n=fijar('arroyofontarron233', 2025),
    presi=('MARIA LUISA GARCIA RIVAS', 'vecino', '615362574', None, 'marialuisagarciarivas@yahoo.es', 'Vecina; trajo la oportunidad.'), trae_pc='presi', captador=CARLOS, lleva=ALVARO)
rellenar('af381', 'ARROYO DE FONTARRON 381', 'arroyofontarron381', {'fecha_apertura': '2026-01-23', 'referencia_catastral': '6121292VK4762A',
    'origen_notas': 'Fecha de llegada: 01/2026. Contacta: Adolfo Collado (AEA / MC GESTION FINCAS). Tipo de obra: SATE + ASCENSOR + SUBV (proyecto conjunto; ascensor exterior doble embarque 180 con derribo de escalera, modelo del Ayuntamiento). '
                    'Comparte referencia catastral con los portales 385-383-381-379. Comercial interno: DANIEL. HE firmada 02-02-2026; el 10/02/2026 la administracion comunica que la comunidad RECHAZA el presupuesto y pide anular la factura: PERDIDA.'},
    ('sate', 'ascensor', 'subvenciones'),
    n=partir(fijar('arroyofontarron381', 2026, ('2026-01-23', 'Sin fecha delante; la solucion de Daniel para la HE del 23/01/2026.')), 3, '---------- Forwarded', '2026-02-10'),
    comunidad={'iban': 'ES73 2085 9738 1503 3042 8155'}, presi=('Begoña Gonzalez', 'presidente', '600759276'), adm=PU['collado'], trae_pu=PU['collado'])
rellenar('ath32', 'ATHOS 32', 'athos32', {'fecha_apertura': '2026-03-01',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia desconocido). Contacta: Julian Parrales Mateos (600 32 46 55, julianparrales@gmail.com). Tipo de obra: ASCENSOR. Hay escaneo 3D. La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + EXT},
    ('ascensor',), presi=('JULIAN PARRALES MATEOS', 'presidente', '600324655', None, 'julianparrales@gmail.com'), trae_pc='presi', captador=ALVARO, lleva=ALVARO)
rellenar('aya2', 'AYAMONTE 2', 'ayamonte2portala-b', {'fecha_apertura': '2026-01-30', 'referencia_catastral': '6799202VK3669H',
    'origen_notas': 'Fecha de llegada: 01/2026. Contacta: el presidente, Jorge Rio Esteban, que nos encontro por la web. Tipo de obra: INSTALACION DE ASCENSOR (torre exterior, derribo de escalera) + mantenimiento de CUBIERTA, ascendentes y bajantes, '
                    'mejora de accesibilidad, pintura de barandilla, ascensores existentes + SUBV. Antes la comunidad encargo todo a otra arquitecta (mar-2024) que no presento licencia ni subvenciones y dimitio; '
                    'tienen firmado con GRUPO PATRIMONIA. 48 viviendas y 3 locales, 2 escaleras (portales A y B comparten referencia catastral); morosidad alta. Barrio: Puente Bonita. Tecnico: Jacob Hernandez. Fecha encargo: 25/03/2026. '
                    'Ano 1964. Licencia por el Ayuntamiento (registrada 21/09/2026). PEM 355.572,43. Superficie 1.005,86. Administracion: Estudio Gestion (Aida, 913 09 45 53; "si no cogen el telefono, los correos los responden rapido"); '
                    '"el administrador no se implica, lo mueve todo el presidente". Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('ascensor', 'cubierta', 'accesibilidad', 'subvenciones'), n=fijar('ayamonte2portala-b', 2026),
    comunidad={'iban': 'ES93 0081 5142 6000 0112 2713'}, presi=('JORGE RIO ESTEBAN', 'presidente', '679.333.693', '45675771W', 'jorgerioesteban@gmail.com'),
    trae_pc='presi', captador=CARLOS, lleva=ALVARO)
rellenar('azc5', 'AZCONA 5 ERASO 6', 'azcona5eraso6ardemans9', {'fecha_apertura': '2024-04-04', 'referencia_catastral': '3162301VK4736C',
    'origen_notas': 'Fecha de llegada: 04/2024. Contacta: Ivan Portero (629 36 80 34, 661 580 322), de la mancomunidad Azcona 5, Ardemans 9 y Eraso 6. Tipo de obra: 3 PLATAFORMAS + CSS (supresion de barreras; Azcona 5, dificil por el ancho de escalera); '
                    'incluye revisar los presupuestos de obra y asesorar. Distrito Salamanca. Tecnico: Julio; Alexa Valy. Fecha encargo: 15/09/2025. Contrata: MEC LEVEN (Antonio, 699 933 358, antonio@mecleven.com). '
                    'Administracion: Administraciones Herrero Pelaez (Maria Pelaez Herrero, 619 152 784; 91 747 23 74; herreroleon@yahoo.es). DR por ECU (ACTECU), registrada 02-10-2024. PEM 77.461,00. Visado TL/015252/2024; '
                    'CFO TL/008197/2026 (visado jun-2026): obra terminada; queda abierta. Comercial: DANIEL.'},
    ('plataforma', 'css'), n=fijar('azcona5eraso6ardemans9', 2024),
    comunidad={'iban': 'ES71 0081 5732 0000 0112 9820'}, presi=('María Jesús López Torres', 'presidente', None, '06242679L'), adm=PU['pelaez'])
c, _ = info('AZCONA 5 ERASO 6')
IVAN = pc(c['id'], 'IVAN PORTERO', 'vecino', '629 36 80 34 / 661 580 322', None, None, 'Trajo la oportunidad (abr-2024).')
act('oportunidades?id=eq.' + OPP['azc5'][1], {'quien_persona_comunidad_id': IVAN, 'persona_comunidad_id': IVAN})

# perdida: Arroyo de Fontarron 381
if ESCRIBIR:
    oid = OPP['af381'][1]
    if not b.leer('motivo_cierre_oportunidad?select=id&oportunidad_id=eq.' + oid):
        b.insertar('motivo_cierre_oportunidad', [{'oportunidad_id': oid, 'resultado_final': 'perdido', 'motivo_perdido': 'rechazan el presupuesto', 'fecha_cierre': '2026-02-10',
            'notas': 'La comunidad rechazo el presupuesto despues de firmar la HE (02-02-2026); la administracion pide anular la factura (10/02/2026). Cerrada en el barrido de Madrid (6-oct-2026).'}])
        b.actualizar('oportunidades?id=eq.' + oid, {'estado': 'cerrada'})
else:
    SECO.append('INSERT motivo_cierre_oportunidad x1: Arroyo de Fontarron 381 perdido (rechazan el presupuesto) 2026-02-10 + UPDATE estado=cerrada')

# arreglo: el correo de Raul Diaz estaba en el puesto de Cesar Rodriguez (Rodisa)
co = b.leer('correo?select=id,puesto_id&email=eq.raul.diaz@administracionrodisa.es')
if co and co[0]['puesto_id'] == PU['cesar_rodisa']:
    act('correo?id=eq.' + co[0]['id'], {'puesto_id': PU['raul_rodisa'], 'notas': 'Estaba en el puesto de Cesar Rodriguez; es de Raul Diaz (ficha de Armenteros 28; 6-oct-2026).'})

# ================================================================= 2. ORGANISMOS
MON = junta(9, 'Moncloa-Aravaca', telefono='91 141 77 14 / 917 310 296')
TEC_M = area(MON, 'Servicios Técnicos', '914 801 608', None)
if not b.leer('correo?select=id&email=eq.tecnimoncloa@madrid.es'):
    ins('correo', [{'organismo_area_id': TEC_M, 'email': 'tecnimoncloa@madrid.es', 'etiqueta': 'general', 'principal': True}])
persona_nueva('Miguel', 'Manso', 'técnico', '914 801 608', 'mansojm@madrid.es', organismo=MON, area=TEC_M, notas_='Junta de Moncloa-Aravaca (Armenteros 28, 2021-22).')

# ================================================================= 3. CLON
cl = lambda c, a, s=None: J(fijar(c, a, s))
REVS = [
    ('arroyobelincoso30', '2023-06-14', 'DAVID (PROYECTON)', 'ARROYO BELINCOSO 30 MADRID. Fecha: 06/2023. Tipo de obra: SATE + NEXT GENERATION. Distrito 14 - Moratalaz (Marroquina). Presidente: Francisco Gil, 609 884 881.\n\n' + cl('arroyobelincoso30', 2023)),
    ('arroyofontarron121', '2021-11-15', None, 'ARROYO FONTARRON 121 MADRID. Fecha: 11/2021. Distrito 14 - Moratalaz (Fontarron). Ficha vacia; hay ofertas de ascensores de la competencia (Schindler...).'),
    ('arroyofontarron91', '2024-09-19', 'JUAN LEON, administrador (Grupo Embla)', 'ARROYO FONTARRON 91 MADRID. Fecha: 09/2024. Tipo de obra: ASCENSOR. Distrito Moratalaz. Presupuesto de Rosersese (nov-2024).\n\n' + cl('arroyofontarron91', 2024)),
    ('arroyoopañiel9', '2018-04-16', 'PEDRO ARANDA (THYSSEN)', 'C/ ARROYO OPAÑIEL 9 MADRID. Fecha: 04/2018. Distrito Carabanchel. Administracion: C/ Salasierra 5 bajo dcha.; Alicia Berzal Molina (91 460 89 43 / 657 24 83 77). PEM 59.663,87; residuos 300.'),
    ('artajona16', '2023-02-27', 'GABRIEL DE LA FUENTE', 'ARTAJONA 16 MADRID. Fecha: 02/2023. Tipo de obra: SATE. Distrito 09 - Moncloa-Aravaca (Valdezarza). Gabriel de la Fuente: 677 040 930, g.fuente@gmail.com.\n\n' + cl('artajona16', 2023)),
    ('arte1', '2023-03-09', 'JUAN PARAMIO -> VICENTE REAL (FAIN)', 'ARTE 1 MADRID. Fecha: 03/2023. Tipo de obra: ASCENSOR (7 paradas, doble embarque 180) Y RAMPAS (dos de 9 m en el patio). Distrito 15 - Ciudad Lineal (Costillares). '
     'Presidenta: Elena Sabater, 609 603 823.\n\n' + cl('arte1', 2023)),
    ('arte3', '2023-11-10', 'ANGEL SOTO, presidente (via Juan Paramio, FAIN)', 'ARTE 3 MADRID. Fecha: 11/2023. Tipo de obra: ACCESIBILIDAD DIRECTA AL GARAJE DESDE EL EDIFICIO (complementa lo presentado en la junta de la CP Arte 5 Garaje). '
     'Presidente: Angel Soto, 618 114 188, angelsotoperez@gmail.com.\n\n' + cl('arte3', 2023)),
    ('arturosoria244', '2019-11-05', 'JUAN PARAMIO (FAIN)', 'C/ ARTURO SORIA 244 MADRID. Fecha: 11/2019. Distrito 15 - Ciudad Lineal (Atalaya). Fichas vacias; hay croquis.'),
    ('arturosoria54-56', '2025-05-19', 'PAULA (GRUPO EMBLA)', 'ARTURO SORIA 54-56 MADRID. Fecha: 05/2025. Tipo de obra: ASCENSOR (encargo a traves de Daniel, evaluar viabilidad). Administracion: Grupo Embla (Juan de Leon; Calle de Canarias 25, San Sebastian de los Reyes; '
     'Paula, 931 032 7318; admin@fincas-embla.es). HE enviadas 26-05-2025.\n\n' + cl('arturosoria54-56', 2025)),
    ('arturosoria7', '2022-01-19', 'CASIMIRO AVILLA, presidente', 'ARTURO SORIA 7 MADRID. Fecha: 01/2022. Tipo de obra: MEJORA DE ACCESIBILIDAD (muchas escaleras de acceso a cada portal y en los patios). Distrito 15 - Ciudad Lineal (Quintana). '
     'Presidente: Casimiro Avilla, 669 401 898, cavillah@gmail.com. Reunion con el y con IBERLEAN el 21/01/22; presupuesto de Iberlean.\n\n' + cl('arturosoria7', 2022, ('2022-01-19', 'Correo de la oficina del 19 de enero de 2022.'))),
    ('ascao53', '2022-05-11', 'VICENTE REAL (FAIN); antes, en 2016, Felipe (ENOR)', 'ASCAO 53 MADRID. Fecha: 05/2022. Tipo de obra: ASCENSOR DOBLE EMBARQUE 90. Distrito 15 - Ciudad Lineal (Pueblo Nuevo). Hay una ficha antigua de 23/05/2016 '
     '(Felipe, ENOR: "como Velez Rubio 195, pero con una altura mas; hay que cambiar contadores").\n\n' + cl('ascao53/FICHA DATOS TECNICOS.docx', 2022)),
    ('ayamonte2', None, None, None)]
for carp, fecha, trajo, t in REVS:
    if t: fila(carp, fecha, 'abierta', None, trajo, None, None, t + REV)
for carp, fecha, trajo, t in [
        ('arroyofontarron165', '2016-05-01', 'FELIPE (ELECNOR / ENOR)', 'Calle ARROYO FONTARRON 165 MADRID. Fecha: 04/2016. Distrito 14 - Moratalaz (Fontarron). Ficha vacia; hay croquis.'),
        ('arzua16', '2017-05-06', 'INVER', 'Calle ARZUA 16 MADRID. Fecha: 05/2017. Distrito 16 - Hortaleza (Pinar del Rey). Ficha vacia; hay croquis.'),
        ('ascensionbielsa19', '2016-10-26', 'FELIPE (ENOR)', 'ASCENSION BIELSA 19 MADRID. Fecha: 10/2016. Distrito 13 - Puente de Vallecas (Numancia). Hay otra carpeta del mismo edificio, "Ascension Bielsa 19" (un .doc de nov-2016).\n\n'
         'Baja + 4; derribo de escalera; en vez de dar a patio, damos a calle; no hace falta derribar la pared; 19 vecinos; hay que tocar el cuarto de contadores; 5 paradas.'),
        ('ayala27', '2017-08-01', 'LUIS MIGUEL NUNES (THYSSEN)', 'CALLE AYALA 27 MADRID. Fecha: 08/2017. Distrito 09 - Moncloa-Aravaca (Casa de Campo). Ficha vacia.'),
        ('ayala61', '2016-07-17', 'LUIS MIGUEL NUNES (THYSSEN)', 'CALLE AYALA 61 MADRID. Fecha: 07/2016. Distrito 04 - Salamanca (Goya). Consulta especial por la escalera interior: ancho 2.170 mm; fondo desde puertas a la pared de los rellanos 3.940 mm.'),
        ('arroyodelolivar180', '2020-02-24', None, 'ARROYO DEL OLIVAR 180 MADRID. Carpeta SIN ficha de datos: planos de deflexiones de la obra (feb-2020).'),
        ('azcoitia16', '2015-02-15', None, 'AZCOITIA 16 MADRID. Carpeta SIN ficha de datos: una propuesta (feb-2015).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 4. MANIAS
mania('La mesa de ascensores del Ayuntamiento fija el sistema (modelo homogeneo); si no se sigue, hay que proponer un sistema alternativo y la comunidad tiene que aprobar el modelo nuevo (junta extraordinaria).',
      'Ayuntamiento de Madrid (mesa de ascensores)', '2024-03-22', 'armenteros21', clave='arm21', trozo='MESA DE ASCENSORES')
mania('Donde hay modelo homogeneo de ascensor hay que seguirlo, aunque suponga derribar entera la escalera e invadir espacio publico.',
      'Ayuntamiento de Madrid (modelo homogeneo)', '2026-03-02', 'arroyodelamedialegua30', clave='aml30', trozo='modelo homogéneo')
mania('Para la DR, la ECU pide el Archivo de la Villa y, al administrador, todas las obras y proyectos ejecutados hasta ahora en el edificio.', 'ECU (ACTECU)', '2024-08-22', 'azcona5eraso6ardemans9',
      clave='azc5', trozo='ARCHIVO DE LA VILLA')

resumen()
