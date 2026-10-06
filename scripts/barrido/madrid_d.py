# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda D (datil7 .. duraton6, 28 carpetas). 6-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de

SATE21 = 'b51d6881-f2bc-4ff5-89f0-4ccd1fee8462'
PU.update(paz='46e3614d-97fd-40bf-baac-07d9bd5e601f', gmoya='5a588515-9c02-4058-8e31-7e51dec4737f', velasco='94b4d0ec-edd7-4038-a58f-0823b287fa8f',
          silvia='6c8e1a7f-999b-4ee9-ac91-cfeb7075dd8c', oscar_cega='86273a6d-d0f1-4e29-874e-4aba61764673', alfredo_iberlean='97fbfb50-5db7-43e7-a916-aa32441ced0d',
          mediavilla='de02c190-999a-42c3-bd1c-e7c56fe250e5')


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto (telefono en el campo del DNI...)."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


# ================================================================= 0. AGENDA (Junta de Villaverde con su tecnica; Cayetano en SATE 21; correo de Oscar en CEGA)
VILLAVERDE = junta(17, 'Villaverde', direccion='Calle Arroyo Bueno, 53')
persona_nueva('Laura', 'Andueza', 'técnico', '915885591', None, organismo=VILLAVERDE,
              notas_='Junta de Villaverde: tecnica de la licencia del ascensor de Domingo Parraga 62 (requerimiento, feb-2025).')
CAYETANO = persona_nueva('Cayetano', None, None, None, None, contrata=SATE21,
                         notas_='SATE 21 Fachadas: trae Doctor Esquerdo 169 (ene-2026; en la ficha "CAYETANO DE SATE 21").')
if not b.leer('correo?select=id&email=eq.o.fernandez@ascensorescega.com'):
    ins('correo', [{'puesto_id': PU['oscar_cega'], 'email': 'o.fernandez@ascensorescega.com', 'etiqueta': 'general', 'principal': True}])

# ================================================================= 1. PRODUCCION (11)
rellenar('dat7', 'DATIL 7', 'datil7', {'fecha_apertura': '2025-05-20', 'referencia_catastral': '6500618VK3760B',
    'origen_notas': 'Fecha de llegada: 05/2025. Contacta: Susana Banderas Navajas, la presidenta (686 174 890; susana.banderas@artw.es). Tipo de obra: ELEVADOR Y RAMPA + SUBV (elevador en vez de ascensor para no tocar el sotano '
                    'de la propietaria ni hacer huida bajo el atico; hay que retrasar la puerta contravientos). Barrio: Puerta Bonita. Tecnico: Carlos Daza. Fecha encargo: 26/12/2025 (HE recibida firmada 29/12/2025). '
                    'DR por ECU (ACTECU). Superficie 21,01. Administracion: CIUDADELA (Paz Terradillos; "609 05 89 53 - llamar SOLO a este telefono"; 919 01 50 88). '
                    'En sep-2026, ICIO y aval de residuos pagados; falta la solicitud firmada por la presidenta. En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('plataforma', 'rampa', 'subvenciones'), n=fijar('datil7', 2025),
    comunidad={'iban': 'ES41 2100 2625 9513 0084 6461'}, presi=('SUSANA BANDERAS NAVAJAS', 'presidente', '686174890', '50178550W', 'susana.banderas@artw.es'),
    trae_pc='presi', adm=PU['paz'], captador=CARLOS, lleva=ALVARO)
n = fijar('diariolanacion18', 2024) + [('2025-01-24', 'Pedidos docs cp 24/01/2025. Recordado por tlf y mail 30/01/2025\n\n(Escrito en el hueco del administrador de la ficha.)')]
rellenar('dln18', 'DIARIO LA NACION 18', 'diariolanacion18', {'fecha_apertura': '2024-12-18', 'referencia_catastral': '6500611VK3760B',
    'origen_notas': 'Fecha de llegada: 12/2024. Contacta: Javier Gonzalez Moya (Schindler). Tipo de obra: SOLO SUBVENCION DE ACCESIBILIDAD (con IEE y CEE), para proyecto propio: piden precio ajustado. Barrio: Puerta Bonita. '
                    'Tecnico: Sandra + Alex. Fecha encargo: 18/12/2024. Ano 1972. La referencia catastral la comparten 4 portales (tambien Diario de la Nacion 20). Administracion: ESTUDIO GESTION (Mila; 91 309 45 53 / 91 511 17 30 / '
                    '626 959 285). Presidente: Jesus Angel Sacristan Escobar (en el contacto de la ficha "Jesus Angel Escobar Sacristan"; 629 512 723; dr_jesusescobar@hotmail.com). Comercial: DANIEL.'},
    ('subvenciones', 'iee', 'cee'), n=n,
    presi=('JESUS ANGEL SACRISTAN ESCOBAR', 'presidente', '629512723', '03778287P', 'dr_jesusescobar@hotmail.com'), adm=PU['mila'], trae_pu=PU['gmoya'])
rellenar('dln20', 'DIARIO LA NACION 20', 'diariolanacion20', {'fecha_apertura': '2024-12-18', 'referencia_catastral': '6500611VK3760B',
    'origen_notas': 'Fecha de llegada: 12/2024. Contacta: Javier Gonzalez Moya (Schindler). Tipo de obra: SOLO SUBVENCION DE ACCESIBILIDAD, para proyecto propio: piden precio ajustado (ascensor proyectado por Schindler: foso estandar '
                    'hasta 1100 mm, resto ciego, huida 3400 mm; 165.218,11 + IVA). Barrio: Puerta Bonita. Ano 1972. La referencia catastral la comparten 4 portales (tambien Diario de la Nacion 18). '
                    'Administracion: ESTUDIO GESTION (Mila). Presidenta: Agustina Garcia Mateos (649 598 369; agustina59.gm@gmail.com). Comercial: DANIEL.'},
    ('subvenciones',), n=fijar('diariolanacion20', 2024),
    presi=('AGUSTINA GARCIA MATEOS', 'presidente', '649598369', '50938275Z', 'agustina59.gm@gmail.com'), adm=PU['mila'], trae_pu=PU['gmoya'])
# Discobolo 67: dos encargos. El de 2023 (Agustin, vecino comisionista) va a la clon; el de 2026 (Iberlean, HE firmada) es la opp de produccion.
n67 = partir(fijar('discobolo67', 2023), 1, '---------- Forwarded message', '2026-03-22')
rellenar('dis67', 'DISCOBOLO 67', 'discobolo67', {'fecha_apertura': '2026-03-22', 'referencia_catastral': '8273312VK4787C',
    'origen_notas': 'Fecha de llegada: 03/2026 (correo de Miguel Alemany, Iberlean, del 22/03/2026; en la ficha 10/2023, que es el encargo anterior). Contacta: IBERLEAN ACCESIBILIDAD, la contrata (Miguel Alemany; '
                    'Alfredo Jimenez, alfredo.jimenez@iberlean.com), que ya ha vendido el ascensor a la comunidad y aporta su nube de puntos (BLK 360) y su solucion. Tipo de obra: PROYECTO BASICO Y DE EJECUCION PARA INSTALACION '
                    'DE ASCENSOR (refuerzo estructural por una viga que atraviesa el hueco). Barrio: Canillejas. Tecnico: Alejandro Bello. HE recibida firmada 08/04/2026. Licencia por ECU (ACTECU). PEM 124.215,34. Superficie 68,94. '
                    'Presidenta: Francisca Carrasquilla Hernandez. Lo aportado por la contrata, en 2.PROYECTO/ENVIADO POR LA CONTRATA. Historia: en 2023 hubo un primer encargo (Agustin, vecino de Santa Tecla 46 que pedia comision; '
                    'presentacion 3D y presupuesto el 10/10/2023): va a la clon. Comercial: DANIEL.'},
    ('ascensor',), n=n67[2:], comunidad={'cif_comunidad': 'H88372594'},
    presi=('FRANCISCA CARRASQUILLA HERNANDEZ', 'presidente', None, '02165303Z'), trae_pu=PU['alfredo_iberlean'])
rellenar('dv7', 'DIVINO VALLES 7', 'divinovalles7', {'fecha_apertura': '2025-07-30',
    'origen_notas': 'Fecha de llegada: 07/2025 (dia: el de la ficha). Tipo de obra: la ficha no lo dice. Hay escaneo 3D (18/08/2025). La ficha no dice quien la trae y no tiene notas. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    (), captador=CARLOS, lleva=ALVARO)
rellenar('de169', 'DOCTOR ESQUERDO 169', 'doctoresquerdo169', {'fecha_apertura': '2026-01-12',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: el del escaneo 3D). Contacta: Cayetano, de SATE 21 (en la ficha "CAYETANO DE SATE 21"). Tipo de obra: ACCESIBILIDAD + REFORMA DE PORTAL. Hay escaneo 3D. '
                    'Presidenta: Ana, 675 935 777 (en la ficha, el telefono esta en la casilla del DNI). La ficha no tiene notas. En la ficha: comercial interno "DANIEL O CARLOS"; la lleva Daniel.'},
    ('accesibilidad', 'accesibilidad_portal'), presi=('ANA', 'presidente', '675935777'), trae_pu=CAYETANO)
arreglar_pc(OPP['de169'][0]['id'], 'documento=eq.' + quote('675 935 777'), {'documento': None, 'telefono': '675935777'})
rellenar('de55', 'DOCTOR ESQUERDO 55 LOCAL', 'doctoresquerdo55 local FAIN', {'fecha_apertura': '2023-02-07', 'referencia_catastral': '3347601VK4734G0008QI',
    'origen_notas': 'Fecha de llegada: 02/2023 (dia: el del escaneo FARO, 07/02/2023). Encargo PRIVADO de OSTALAZAR SL (B28111516; C/ Doctor Esquerdo 57; representante Nicolas Mediavilla Ferruz, presidente de FAIN, 50262931L). '
                    'Contacta: Nicolas Mediavilla y Mayte Cesteros (FAIN; mayte.cesteros@fainascensores.com; 627 204 303). Tipo de obra: REFORMA DE LOCAL COMERCIAL (el acceso queda con un peldano de 15 cm a linea de fachada '
                    'por una viga del garaje; no se puede hacer accesible). Barrio: Estrella. Tecnico: Susana; modificado: Israel. Fecha encargo: 16/10/2023. Por ECU (ACTECU). PEM 30.747,43. Visado TL/000962/2024; CFO TL/001151/2026. '
                    'Expediente 350/2024/00480. Contrata: albanil Doru (617 97 32 87) y cerrajero Carlos (667 68 91 05); la obra la sigue Cristian Rodriguez (FAIN). Obra terminada: CFO visado 24/02/2026; visita de fin de obra '
                    'favorable de la ECU 09/03/2026. Queda abierta. Comercial: DANIEL.'},
    ('otros_proyecto_tecnico', 'cfo'), n=partir(fijar('doctoresquerdo55 local FAIN', 2023), 2, '---------- Forwarded message', '2024-08-14'), trae_pu=PU['mediavilla'])
rellenar('df44', 'DOCTOR FLEMING 44', 'doctorfleming44', {'fecha_apertura': '2025-12-01',
    'origen_notas': 'Fecha de llegada: 12/2025 (dia desconocido). Contacta: el administrador Isabelino (isabelino@administracionimm.com) - no esta en la agenda. Tipo de obra: IEE. HE enviada 22-12-2025. Comercial interno: ALVARO.'},
    ('iee',), n=fijar('doctorfleming44', 2025, otros={0: ('2025-12-22', 'Sin fecha delante; la fecha va dentro.')}), captador=ALVARO, lleva=ALVARO)
rellenar('dvl39', 'DOCTOR VALLEJO 39', 'doctorvallejo39', {'fecha_apertura': '2025-07-14',
    'origen_notas': 'Fecha de llegada: 07/2025 (correo de Silvia Arribas del 14/07/2025). Contacta: Silvia Arribas (ARRIALSI; 917 307 033 / 665 805 356; info@arrialsi.com, secretaria@arrialsi.com), que pide ver si se puede '
                    'poner ascensor. Tipo de obra: ASC + SUBV. Fecha encargo: 12-06-2026. HE enviada 23/07/2025. Presidente: Javier Vaquez Herro, 650 410 727. Comercial interno: ALVARO.'},
    ('ascensor', 'subvenciones'), n=fijar('doctorvallejo39', 2025, ('2025-07-14', 'Correo de Silvia Arribas (Arrialsi) del 14 de julio de 2025.')),
    comunidad={'iban': 'ES86 0081 0134 9400 0161 7565'}, presi=('Javier Váquez Herro', 'presidente', '650410727'), adm=PU['silvia'], trae_pu=PU['silvia'], captador=ALVARO, lleva=ALVARO)
rellenar('dp62', 'DOMINGO PARRAGA 62', 'domingoparraga62', {'fecha_apertura': '2024-07-18', 'referencia_catastral': '9362801VK3696A',
    'origen_notas': 'Fecha de llegada: 07/2024. Contacta: Oscar Fernandez (CEGA ASCENSORES, director comercial; el de CEGA, hoy en FGR; 616 295 646; o.fernandez@ascensorescega.com): presupuesto de la contrata aceptado. '
                    'Tipo de obra: ASCENSOR + SUBV (subvencion contratada en enero 2025). Barrio: Villaverde Alto - Casco Historico de Villaverde. Tecnico: Dario -> Julio. Fecha encargo: 19/07/2024. Ano 1970. '
                    'LICENCIA por la Junta de Villaverde (C/ Arroyo Bueno 53; tecnica Laura Andueza, 915 885 591); expediente 350/2024/36708. Visado TL/016448/2024. Por instrucciones de Daniel se invade el espacio publico '
                    '(rampa de 1,50 m en vez de 1,80 m) para respetar el presupuesto de la contrata. Requerimiento contestado en oct-2025; en may-2026 aun sin respuesta. En la inspeccion para la IEE (20/02/2025) se ve que la cubierta '
                    'es de fibrocemento, que no estaba en los presupuestos. Administracion: a traves de CEGA, POZOFRA (Iratxe, 911 53 58 61). Contratista: Ascensores CEGA (682 281 318 / 91 679 30 92; administracion@ascensorescega.com; '
                    'Boris Cespedes). Presidente: Jose Ramon Morales del Valle, 651 721 642. Comercial: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('domingoparraga62', 2024),
    presi=('JOSE RAMON MORALES DEL VALLE', 'presidente', '651721642', '02256761R'), trae_pu=PU['oscar_cega'])
n = fijar('duquedesesto22', 2024)
n = n[:2] + [('2025-01-30', 'Pedidos docs cp 30/01/2025\n\n(Escrito en el hueco del administrador de la ficha.)')] + n[2:]
rellenar('dds22', 'DUQUE DE SESTO 22', 'duquedesesto22', {'fecha_apertura': '2024-12-18', 'referencia_catastral': '2650702VK4725B',
    'origen_notas': 'Fecha de llegada: 12/2024. Contacta: Carlos Moreno, vecino y vicepresidente (609 811 357; morenodelapaz@gmail.com); viene de Elecnor (Javier Velasco) "a traves de MP" (no se sabe quien es MP; trae: Javier Velasco). Tipo de obra: ASCENSOR + DF + CSS + SUBV '
                    '(el 30/01/2025 votan a favor pero no aprueban las subvenciones; la HE de subvenciones se firma el 10-06-2025). Barrio: Goya. Tecnico: Julio. Fecha encargo: 30/01/2025. Jefe de obra: Omar (en la ficha '
                    'Adrian Donaire Aramedia, tachado). DR por ECU (ACTECU). Contrata: ELECNOR. PEM 87.973,86. Visado TL/016799/2025 (20/11/2025; ya se puede empezar la obra). Superficie 126,60 m2. Administracion: PILAR ALVAREZ '
                    '(606 333 000; piluca2108@hotmail.com). HAY QUE PONER EN COPIA DE TODO AL PRESIDENTE Y VICEPRESIDENTE. Presidenta: Carmen Maria Caubet Suanzes (en la ficha, suanzes@yahoo.com y, en otro sitio, suanzes@yahoo.es). '
                    'Comercial: DANIEL.'},
    ('ascensor', 'df', 'css', 'subvenciones'), n=n,
    comunidad={'iban': 'ES46 0081 7305 1800 0241 1745'}, presi=('CARMEN MARIA CAUBET SUANZES', 'presidente', None, '03454923R', 'suanzes@yahoo.com'), trae_pu=PU['velasco'])
arreglar_pc(OPP['dds22'][0]['id'], 'rol=eq.presidente&notas=is.null', {'notas': 'La ficha trae dos correos: suanzes@yahoo.com y suanzes@yahoo.es (se guardan ambos; Monica, 6-oct-2026).'})
pc(OPP['dds22'][0]['id'], 'CARLOS MORENO', 'vicepresidente', '609811357', None, 'morenodelapaz@gmail.com', 'Vicepresidente; contacto de la oportunidad (vecino).')

# ================================================================= 2. CLON
cl = lambda c, a, s=None: J(fijar(c, a, s))
REVS = [
    ('delasalle 12hospitalvithas', '2023-10-24', 'OSCAR SANCHEZ (ELECNOR)', None, None,
     'Calle DE LA SALLE 12 MADRID (HOSPITAL VITHAS). Fecha: 10/2023. Tipo de obra: INFORME DE ESTRUCTURA (que un trasdosado no compromete ningun elemento estructural del edificio); se factura a Elecnor. '
     'Distrito 09 - Moncloa-Aravaca (Valdemarin). CP 28023. Contacto: Oscar Sanchez (Elecnor; sanchez.oscar@elecnor.com) - no esta en la agenda.\n\n' + cl('delasalle 12hospitalvithas', 2023)),
    ('diamante29', '2015-11-01', 'PEDRO (THYSSEN)', None, None,
     'Calle DIAMANTE 29 MADRID. Fecha: 11/2015 (dia desconocido). Tipo de obra: ASCENSOR (presupuesto: derribo de escalera con ascensor de hueco libre 910 x 1200, 4 paradas, embarque simple; precio parecido al de '
     'Pedro Unanue 16). Distrito 17 - Villaverde (Los Rosales). Hay croquis, plano y oferta (dic-2015).\n\n'
     + cl('diamante29', 2015, ('2015-12-06', 'Sin fecha; la de la oferta ofertadiamante29.doc (06/12/2015).'))),
    ('diez6', '2022-10-21', 'MATEDECON', None, None,
     'CALLE DIEZ 6 MADRID. Fecha: 10/2022. Tipo de obra: SATE + SUBV (Matedecon pide precio de honorarios; HE enviada). Distrito 20 - San Blas-Canillejas (Rejas). '
     'En la carpeta solo hay un presupuesto de salvaescaleras de LUIS VIVES 11 (oct-2022), que es de otra direccion.\n\n' + cl('diez6', 2022)),
    ('discobolo63', '2023-10-10', 'ROSA (GESFINCAS MADRID)', None, None,
     'DISCOBOLO 63 MADRID. Fecha: 10/2023. Tipo de obra: ASCENSOR (han visto la presentacion de Discobolo 67; darles presupuesto). Distrito 20 - San Blas-Canillejas (Canillejas). CP 28022. '
     'Administracion: Gesfincas Madrid SL (C/ San Faustino 2, local; Rosa, 91 742 46 01 / 646 851 268; correo@gesfincasmadrid.es; mananas 9.30-13.30, miercoles 17-19) - no esta en la agenda. '
     'Agustin (625 395 100), vecino de Santa Tecla 46, lo mueve y quiere comision.\n\n' + cl('discobolo63', 2023)),
    ('discobolo63-67', '2023-07-05', 'AGUSTIN (vecino de Santa Tecla 46; pide comision)', None, '8273312VK4787C',
     'DISCOBOLO 67 MADRID: PRIMER ENCARGO (2023). Fecha: 07/2023. Tipo de obra: ASCENSOR (el hueco de la escalera baja hasta un local; visita 02-10-2023; presentacion 3D, presupuesto y CSS el 10/10/2023; '
     '"los vecinos de al lado estan tambien interesados", ver discobolo63). Distrito 20 - San Blas-Canillejas (Canillejas). Administracion: Gesfincas Madrid SL (91 742 46 01 / 91 260 31 22; correo@gesfincasmadrid.es). '
     'Agustin, 625 395 100. Las notas de 2023 estan en esta carpeta y en la ficha de discobolo67. El encargo de 2026 (Iberlean, HE firmada) es la oportunidad de produccion.\n\n'
     + cl('discobolo63-67', 2023) + '\n\n(De la ficha de discobolo67:)\n\n' + J(n67[:2])),
    ('doctorblancosoler26', '2024-01-10', None, None, None,
     'DOCTOR BLANCO SOLER 26 MADRID (la direccion la da la carpeta). Fecha: 01/2024 (dia: el de la ficha). Ficha en blanco (plantilla "Calle municipio"). Hay nube de puntos (escaneo 18-22/01/2024, '
     'en la misma sesion que Doctor Bellido 41).'),
    ('doctorcasal17', '2025-03-26', 'JUAN CARLOS LOPEZ (vecino)', None, None,
     'DOCTOR CASAL 17 MADRID. Fecha: 03/2025. Tipo de obra: BAJADA A COTA CERO del ascensor existente (no salva 8-9 escalones). Distrito Moncloa-Aravaca. CP 28008. Llama un vecino, Juan Carlos Lopez (654 35 39 07), '
     'por consejo de su abogado (Bermejo Abogados, alvaro@bermejoabogados.es; no son los administradores): 9 de 10 vecinos votaron que no. Correos: Ogarciar68@gmail.com, millacolor63@gmail.com. '
     'Informe de viabilidad enviado 03/04/2025.\n\n' + cl('doctorcasal17', 2025)),
    ('doctoresquerdo59', '2023-01-05', 'MARIA GALAN (MSGI, administradora)', 'H81900466', None,
     'DOCTOR ESQUERDO 59 MADRID. Fecha: 01/2023. Tipo de obra: SATE + CALDERA COMUNITARIA (mediciones para IBERDROLA); en feb-2023 la administradora pide ademas informe y presupuesto de reparacion de grietas de la '
     'fachada posterior. Distrito 03 - Retiro (Estrella). Administracion: MEDITERRANEO SERVICIOS DE GESTION INTEGRAL SAU (C/ Princesa 25-27, 5o 1, Edificio Hexagono; Maria Galan, 915 489 940, mgalan@msgi.es) - no esta en la agenda. '
     'Conserje: Gonzalo, 660 786 035 (decir que vamos a lo de la eficiencia energetica). FAIN tiene aqui alguna oficina y el local del bajo (alquilado).\n\n'
     + J(partir(fijar('doctoresquerdo59', 2023), 0, '---------- Forwarded message', '2023-02-06'))),
    ('doctoresquerdo59 local FAIN (paso de local a oficina)', '2019-10-29', 'FAIN / OSTALAZAR SL (Nicolas Mediavilla)', 'B28111516', '3347623VK4734G0001MQ',
     'DOCTOR ESQUERDO 59 MADRID, LOCAL (los planos se llaman "Dr.Esquerdo57"). Encargo PRIVADO de FAIN ASCENSORES / OSTALAZAR SL. Fecha: 11/2019 (la ficha dice noviembre de 2019; el primer fichero, el croquis, es del 29/10/2019). '
     'Tipo de obra: REHABILITACION DE LOCAL (paso de local a oficina). Distrito Retiro. CP 28007. PEM 29.000 (con interrogacion); unos 100 m2. Hay DR presentada (nov-2019), ocupacion de via publica (ene-2020) '
     'y fin de obra presentado al Ayuntamiento (jul-2020). Proyecto hecho.', R('doctoresquerdo59 local FAIN' + B + 'paso de local a oficina')),
    ('doctoresquerdo59 local FAIN (licencia de funcionamiento)', '2022-11-04', 'FAIN / OSTALAZAR SL (Nicolas Mediavilla)', None, None,
     'DOCTOR ESQUERDO 59 MADRID, LOCAL ANTIGUA OPTICA. Encargo de FAIN. Fecha: 11/2022 (dia: el de la ficha, en blanco). Tipo de obra: LICENCIA DE FUNCIONAMIENTO (DR por ECU: hoja de encargo y presupuesto de la ECU '
     'recibidos 15/11/2022). Encargo distinto de la reforma de 2019: fila aparte.', R('doctoresquerdo59 local FAIN' + B + 'licencia de funcionamiento')),
    ('doloresarmengot31', '2021-04-15', 'ANTONIO (ANYLOR)', None, None,
     'Calle DOLORES ARMENGOT 31 MADRID. Fecha: 04/2021. Distrito 11 - Carabanchel (Vista Alegre). Ficha sin tipo de obra ni notas; hay un plano (abr-2021).'),
    ('doloresbarranco72', '2025-03-04', 'MIGUEL MEGIAS (GRUPO EUROLINOVA)', None, None,
     'DOLORES BARRANCO 72 MADRID. Fecha: 03/2025. Tipo de obra: SATE Y ASCENSOR (estudio de costes de ascensor y SATE 11/03/2025; estudio de viabilidad del ascensor 17/03/2025). Distrito Usera. CP 28026. '
     'Administracion: Grupo Eurolinova (Miguel Megias, 616 871 438; comunidades@grupoeurolinova.com). Hay escaneo 3D.\n\n' + cl('doloresbarranco72', 2025)),
    ('duraton6', '2025-04-02', 'BEGOÑA (GRUPO TREBOL)', None, None,
     'DURATON 6 MADRID. Fecha: 04/2025 (la ficha dice 03/2025; el correo de llegada es del 02/04/2025). Tipo de obra: ASCENSOR. Distrito Latina. Administracion: Grupo Trebol (Begona; trebol.fincas@gmail.com). '
     'Contacto: Nicoletta, 667 271 659. Informe de viabilidad y HE + subvencion enviados 07/04/2025.\n\n' + cl('duraton6', 2025))]
for carp, fecha, trajo, cif, ref, t, *ruta in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, ruta=ruta[0] if ruta else None)
fila('doctorbellido41', '2023-12-21', 'cerrada', 'Perdida: "PRESENTACION 3D Y DECIDEN NO HACER ASCENSOR" (07/11/2024).', 'CARMEN (DEL BRIO Y BLANCO)', None, None,
     'DOCTOR BELLIDO 41 MADRID. Fecha: 12/2023. Tipo de obra: ASCENSOR POR DENTRO. Distrito Puente de Vallecas. CP 28018. Administracion: Del Brio y Blanco (Carmen); garajes: Maram Asesores (640 713 875; maramasesore@gmail.com). '
     'Juan Jeronimo Vicente, presidente saliente a abril 2024, mueve el asunto aunque firme la presidenta entrante (juanjeronimovicente@gmail.com; 639 12 29 02). En abr-2024 deciden no hacerlo por ahora; '
     'en nov-2024 se manda HE, se presenta el 3D y deciden no hacer ascensor.\n\n' + cl('doctorbellido41', 2023))
for carp, fecha, trajo, t in [
        ('doloresarmengot27', '2015-10-18', None, 'DOLORES ARMENGOT 27 MADRID. Carpeta SIN ficha de datos: croquis (.doc, .dwg, .pdf) de oct-dic 2015.'),
        ('doloresarmengot6', '2015-10-19', None, 'DOLORES ARMENGOT 6 MADRID. Carpeta SIN ficha de datos: croquis (.doc, .dwg, .pdf) de oct-2015.'),
        ('doloresbarranco57', '2016-08-10', 'PEDRO ARANDA (THYSSEN)', 'Calle DOLORES BARRANCO 57 MADRID. Fecha: 08/2016. Distrito 12 - Usera (Pradolongo). Ficha vacia; hay croquis y presupuesto.'),
        ('dolorosa12', '2018-03-30', 'PEDRO ARANDA (THYSSEN)', 'Calle DOLOROSA 12 MADRID. Fecha: 03/2018. Distrito 17 - Villaverde (Angeles). Ficha vacia; hay croquis, borrador de escalera y presupuesto.')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 3. MANIAS
mania('Si en el Archivo de la Villa no constan antecedentes de intervenciones existentes que se dibujan (patio interior), las requiere; la alternativa es pedir al Ayuntamiento un expediente de prescripcion '
      'urbanistica, que tarda muchisimo (casi un ano). Se opto por no representarlas en los planos.', 'ECU (ACTECU)', '2025-09-18', 'duquedesesto22', clave='dds22', trozo='Almudena de ACTECU', tecnico='Almudena')

resumen()
