# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda F (faro2 .. fuentesauco30, 39 carpetas). 7-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de

EFFIC = '1d2827a3-5a80-4e4e-b4da-6d9902be0122'; VALLECAS = 'df5e69f1-696b-4ae8-beba-63289e296c49'
GDADILLOS = 'dcf97da1-fcca-4a17-84ab-43430072d964'
PU.update(jagra='774c387a-15c5-40e7-a8c3-bcb7f305637c', gdadillos='cafbcbd6-88ae-446f-ad31-dae5d4de8c83', mblanco='67525999-7f12-416d-a311-1f2f02f37d99',
          jrodriguez='3bb9cbe7-f3d6-4223-be99-e76ad4a67a56', megias='4757522a-e0d2-4ca5-aa1b-5e898d2c07e0', velasco='94b4d0ec-edd7-4038-a58f-0823b287fa8f',
          jamarti='a1d2b7ed-7cab-4e9b-9b96-6cacc67500c5', oswaldo='26059992-8e15-423b-bc47-6c476b9b5e5c', olivares='fe2ea8b4-9be7-42b8-b64f-d644fa8198b1',
          fjcastro='1d29154f-dcd8-4f7f-ab72-6ded46b59993', oscar_cega='86273a6d-d0f1-4e29-874e-4aba61764673', fgallego='b65ec4b6-7517-47c9-b1c1-7acfe001e0f5',
          vreal='3606239e-1b7a-48c1-bea2-08c841efee80', afasoner='cfe65b99-2dcf-4af6-9c82-294632e7d3b8')


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto (telefono pegado al nombre...)."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


def motivo(n, i, m):
    """anade el motivo a la nota i (la fecha ya la puso partir)."""
    f, t = n[i]; n[i] = (f, t + '\n\n(' + m + ')'); return n


def hueco(fecha, texto, donde):
    return (fecha, texto + '\n\n(Escrito en el hueco ' + donde + ' de la ficha.)')


def cid_de(prefijo):
    cs = b.leer('comunidades?select=id&municipio=eq.MADRID&nombre=like.' + quote(prefijo) + '*'); assert len(cs) == 1, prefijo
    return cs[0]['id']


def relevar_admin(cid, emp_viejo, puesto_nuevo, nota):
    """la administracion vigente esta TACHADA en la ficha: deja de ser vigente (sin fecha: no se sabe) y entra la nueva."""
    for a in b.leer('comunidad_admin_responsable?select=id&vigente=eq.true&empresa_id=eq.%s&comunidad_id=eq.%s' % (emp_viejo, cid)):
        act('comunidad_admin_responsable?id=eq.' + a['id'], {'vigente': False, 'notas': nota})
    emp = b.leer('puesto?select=empresa_id&id=eq.' + puesto_nuevo)[0]['empresa_id']
    if not b.leer('comunidad_admin_responsable?select=id&vigente=eq.true&empresa_id=eq.%s&comunidad_id=eq.%s' % (emp, cid)):
        ins('comunidad_admin_responsable', [{'comunidad_id': cid, 'empresa_id': emp, 'puesto_id': puesto_nuevo, 'vigente': True}])


# ================================================================= 0. AGENDA (solo en contratas y organismos que ya existen)
persona_nueva('Jorge', 'Corona', 'técnico', '915883505', 'coronarj@madrid.es', organismo=VALLECAS,
              notas_='Junta de Puente de Vallecas: en "otros" de la ficha de Francisco Iglesias 15 (2022-2024).')
LAURA_EFFIC = persona_nueva('Laura Camila', None, 'técnico de presupuesto', None, 'laura.gutierrez.ext@effic.es', contrata=EFFIC,
                            notas_='EFFIC: tecnico de presupuesto del expediente AEFE-00017483 (Francisco Rodriguez 7, sep-2025).')
persona_nueva('Tomás', 'Morell Llorente', None, None, 'tmorell@elecnor.com', contrata=ELECNOR,
              notas_='Elecnor: pide los servicios anexos de Francisco Suarez 16 (licitacion, ene-2025).')

# ================================================================= 1. PRODUCCION (20)
rellenar('fa46', 'FARO 4-6', 'faro4-6', {'fecha_apertura': '2025-12-11', 'referencia_catastral': '8304902VK3780C',
    'origen_notas': 'Fecha de llegada: 12/2025 (dia: el correo de Jose Gonzalez, 11/12/2025). Contacta: Jose Gonzalez (JAGRA FINCAS; jgonzalez@jagrafincas.es; el correo joseglez@jagra-fincas.es esta tachado '
                    'en la ficha, "no valido"). Tipo de obra: SATE + SUBV (dos portales de cuatro plantas, tres letras por planta, y 2 locales). Barrio: Abrantes. Tecnico: Jhonatan -> Jacob. Fecha encargo: 09/02/2026. '
                    'Ano 1963. Presidenta: Rosa Madera. Proyecto terminado y enviado a la ECU el 08/07/2026; el administrador deja el visado para despues del verano y pide presupuestos. '
                    'En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('sate', 'subvenciones'), n=fijar('faro4-6', 2025, ('2025-12-11', 'Correo de Jose Gonzalez (Jagra) del 11 de diciembre de 2025.')),
    comunidad={'iban': 'ES56 0081 1388 2200 0120 6823'}, adm=PU['jagra'], trae_pu=PU['jagra'], captador=CARLOS, lleva=ALVARO)

# Francisco Fatou 24, Francisco Fatou 26 y Felipe Alvarez 28: tres portales del MISMO conjunto (misma parcela 7405301VK4770E y mismo CIF H78366291),
# tres comunidades en produccion y tres carpetas con la misma ficha. Monica (7-oct-2026): UNA opp con TRES hojas de encargo (una por portal, firmadas por separado).
# Se rellena la de Francisco Fatou 24, se le enlazan los accesos de 26 y 28, y las opps vacias de 26 y 28 se borran (borrar_opps_sobrantes.py).
FATOU = ('Fecha de llegada: 05/2024 (dia: la primera nota, 13/05/2024). Contacta: Jose Maria Martinez (GUERRERO DADILLOS, administrador de Puerto de Alazores 11; 91 331 90 25; jmmlflorida@gmail.com; tachado en la ficha). '
         'Tipo de obra: SUBVENCION de un PROYECTO EXTERNO (en 2024 se oferto proyecto de 3 ASCENSORES + DF + CSS, uno por portal, con presentacion 3D el 04/06/2024: tachado en la ficha). '
         'Conjunto de tres portales (Francisco Fatou 24 y 26 y Felipe Alvarez 28) con la misma referencia catastral (7405301VK4770E) y el mismo CIF (H78366291); cada portal tiene su carpeta. '
         'Fecha encargo: 15/06/2026 (HE de subvencion de proyecto externo recibida firmada; en la nota de felipealvarez28 pone 15/05/2026). UNA oportunidad con TRES hojas de encargo, una por portal, contratadas y firmadas por separado (Monica, 7-oct-2026). Administracion: DEL BRIO Y BLANCO (Manuel, manuel@delbrioyblanco.es; Vanesa, vanesa@delbrioyblanco.es; antes Guerrero Dadillos, tachado). '
         'Contactos: Dona Isabel, secretaria (isaarreba24@hotmail.com); Dona Virginia (virideas@gmail.com). Contacto de la comunidad: Jose de la Vega, 649 622 661 (josvega5@hotmail.com). Comercial: DANIEL.')
JOSE_VEGA = {'nombre': 'JOSÉ DE LA VEGA', 'telefono': '649622661', 'email': 'josvega5@hotmail.com'}
rellenar('ff24', 'FRANCISCO FATOU 24', 'franciscofatou24', {'fecha_apertura': '2024-05-13', 'origen_notas': FATOU}, ('subvenciones',), n=fijar('franciscofatou24', 2024),
         comunidad={'iban': 'ES87 2085 9286 0603 3029 9430'}, trae_pu=PU['gdadillos'])
OPP['ff26'] = ({'id': cid_de('FRANCISCO FATOU 26')},); OPP['fa28'] = ({'id': cid_de('FELIPE ALVAREZ 28')},)
for clave in ('ff24', 'ff26', 'fa28'):
    arreglar_pc(OPP[clave][0]['id'], 'rol=eq.presidente&nombre=eq.' + quote('JOSÉ DE LA VEGA 649 622 661'), JOSE_VEGA)
for acc in ('149711b0-9758-4b17-a5e1-3fed3c3c04ed', '2667f492-5fcb-476c-8fc2-22c8f2040d1f'):   # Fatou 26 y Felipe Alvarez 28
    if not b.leer('relacion_oportunidad_accesos?select=acceso_id&opp_id=eq.%s&acceso_id=eq.%s' % (OPP['ff24'][1], acc)):
        ins('relacion_oportunidad_accesos', [{'opp_id': OPP['ff24'][1], 'acceso_id': acc,
            'de_donde': 'Fatou 24-26 y Felipe Alvarez 28: un conjunto (misma parcela y CIF); UNA opp con tres hojas de encargo, una por portal (Monica, 7-oct-2026).'}])
for clave in ('ff24', 'ff26'):
    relevar_admin(OPP[clave][0]['id'], GDADILLOS, PU['mblanco'],
                  'Guerrero Dadillos esta TACHADA en la ficha; la administracion vigente es Del Brio y Blanco. Fecha del cambio desconocida (barrido de Madrid, 7-oct-2026).')

n = partir(fijar('felipecastro5', 2024), 5, '06-02-2026', '2026-02-06')
rellenar('fc5', 'FELIPE CASTRO 5', 'felipecastro5', {'fecha_apertura': '2024-03-22', 'referencia_catastral': '0108201VK4700G',
    'origen_notas': 'Fecha de llegada: la ficha dice 04/2024; la primera nota es del 22/03/2024 (visita con Schindler y Gradcom); se toma esa. Contacta: Javier Rodriguez Martin (SCHINDLER; 685 286 041) '
                    'y Eugenio (en la ficha "EUGENIO GRASCON": en la agenda, Eugenio Platonov, de GRADCOM). Tipo de obra: ASCENSOR SIN DERRIBO + SUBV (subvencion a exito); CSS (HE firmada 06/02/2026). '
                    'Barrio: Pradolongo. Tecnico: Julio. Jefe de obra: Alejandro Gonzalez Fernandez (657 596 500). Por orden de Daniel, DR por el AYUNTAMIENTO y no por ECU (26/08/2024). '
                    'Schindler pasa el ascensor; la obra civil (unos 50.000) la factura directamente la empresa que la haga. Administracion: GRUPO EUROLINOVA (Miguel Megias; 616 87 14 38 - 91 500 21 69). '
                    'Presidente: Alejandro Morales Lima. Visado TL/013352/2024. Expediente 350/2024/27393. Comercial: DANIEL.'},
    ('ascensor', 'subvenciones', 'css'), n=n, comunidad={'iban': 'ES07 2100 3259 6813 0078 0515'}, trae_pu=PU['jrodriguez'])

n = fijar('felipecastro6', 2024)
n = partir(partir(n, 5, '12/02/2025. ALEX', '2025-02-12'), 6, '27/02/2025. ALEX', '2025-02-27')
n = sorted(n + [hueco('2024-12-20', 'Pedidos docs cp 20/12/2024', 'del administrador')], key=lambda x: x[0])
rellenar('fc6', 'FELIPE CASTRO 6', 'felipecastro6', {'fecha_apertura': '2024-03-22', 'referencia_catastral': '0109106VK4700G',
    'origen_notas': 'Fecha de llegada: la ficha dice 04/2024; la primera nota es la visita del 22/03/2024 con Schindler y Gradcom; se toma esa. Contacta: Javier Rodriguez Martin (SCHINDLER; 685 286 041; "lo trajo"; tachado '
                    'en la ficha) -> desde jun-2025 Marta Reyes (Schindler, rehabilitacion; marta.reyes.molano@schindler.com); tambien Eugenio (en la ficha "EUGENIO GRASCON", tachado). Tipo de obra: ASCENSOR + DF + SUBV '
                    '(HE de proyecto con DF, sin CSS; obra estimada 108.000, la paga la comunidad; Schindler solo vende el ascensor) e IEE. Tecnico: Karla. Fecha encargo: 20/12/2024. Ano 1955. DR por ECU (ACTECU), '
                    'presentada 26-03-2025; en jun-2026, para prorrogarla hay que anular la DR y registrar una nueva. Visado TL/004771/2025. Administracion: GRUPO EUROLINOVA (Miguel Megias; 91 500 21 69 / 658 91 20 89; '
                    'L a V de 9 a 2 y L a J de 4 a 7). Presidente: Raul Herrero Contrina (2o centro), 609 016 805. IEE: la comunidad estaba obligada antes del 31/12/2024; desfavorable en fachada y sin registrar; '
                    'arreglo de fachada con Todo Vertical (Pedro, constructor, 680 812 037; info.trabajosverticales@gmail.com) - no esta en la agenda. "Noelia es 217/26 engloba toda la fachada". '
                    'En jun-2026 la obra no ha empezado (presupuestos de Envoltermia y Gradcom). Comercial: DANIEL.'},
    ('ascensor', 'df', 'subvenciones', 'iee'), n=n, comunidad={'iban': 'ES30 0081 5474 8100 0107 0910'},
    presi=('RAÚL HERRERO CONTRINA', 'presidente', '609016805'), trae_pu=PU['jrodriguez'])

rellenar('fd3', 'FELIPE DIAZ 3', 'felipediaz3', {'fecha_apertura': '2026-02-01',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia desconocido; el unico fichero, la ficha, es del 09/03/2026). Contacta: Jose Gonzalez (JAGRA FINCAS; joseglez@jagra-fincas.es). Tipo de obra: SATE + SUBV. '
                    'La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + EXT},
    ('sate', 'subvenciones'), adm=PU['jagra'], trae_pu=PU['jagra'], captador=ALVARO, lleva=ALVARO)

rellenar('fe10', 'FERIA 10', 'feria10', {'fecha_apertura': '2025-11-01',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia desconocido; Carlos Garcia crea la carpeta el 01/12/2025). Tipo de obra: ASCENSOR ("no hacer 3D"; hay 3D en glb del 01/12/2025). Presidenta: Veronica. '
                    'Administracion, segun la ficha de Feria 8: JUYMER SL (Jorge, 913 271 212) - no esta en la agenda; Feria 10 es uno de los portales del conjunto homogeneo de Feria 8. '
                    'En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), n=fijar('feria10', 2025), captador=CARLOS, lleva=ALVARO)

n = fijar('feria8', 2023)
n = motivo(partir(n, 11, 'CONTACTOS DE ADMINISTRADORES', '2026-03-04'), 12, 'Sin fecha; va con el contacto a las comunidades vecinas del 04/03/2026.')
n = partir(n, 9, '12/09 las recibimos', '2025-09-12')
n = sorted(n + [hueco('2025-04-08', 'Pedido acta renovación cargo 08/04/2025', 'del administrador')], key=lambda x: x[0])
rellenar('fer8', 'FERIA 8', 'feria8', {'fecha_apertura': '2023-06-16', 'referencia_catastral': '7660169VK4776B',
    'origen_notas': 'Fecha de llegada: 06/2023 (dia: la primera nota, visita del 16/06/2023). Contacta: Javier Velasco (ELECNOR). Tipo de obra: ASCENSOR (derribo de escalera y cambio de contadores), SATE Y CUBIERTA '
                    '(oferta de SATE de Elecnor aprobada 20/07/2023) + SUBV (HE de subvenciones firmada 10/04/2025). Tecnico: Susana -> Carla -> Jhonatan -> Israel. Fecha encargo: 10/07/2023. Ano 1960. '
                    'LICENCIA por el Ayto denegada (30/04/2024) por procedimiento incorrecto: habia que ir por DR y por ECU; luego por ECU (ACTECU): pasa a Patrimonio (Comision CPPHAN) y la concesion se notifica el 04/05/2026. '
                    'Conjunto homogeneo con Feria 6, Feria 10 y Albaida 6 (colores firmados por las comunidades vecinas). PEM 287.267,63. Visado TL/015343/2023. Administracion: AFASONER (Cristina; 913 240 469; '
                    'Av. de Canillejas a Vicalvaro 101). Presidenta: Carmen Doblado Segura (4o 3a), 647 411 026. Comision de obra: Carmen y Carlos (bajo 2; en la ficha "61666288", incompleto). Comercial: DANIEL.'},
    ('ascensor', 'sate', 'cubierta', 'subvenciones'), n=n, comunidad={'iban': 'ES02 2085 8008 2603 3033 6138'}, trae_pu=PU['velasco'])
arreglar_pc(OPP['fer8'][0]['id'], 'rol=eq.presidente', {'nombre': 'CARMEN DOBLADO SEGURA', 'telefono': '647411026', 'email': 'carmendobladosegura@yahoo.es',
                                                        'notas': '4º 3ª (en la ficha, pegado al nombre).'})

rellenar('fr38', 'FERNANDEZ DE LOS RIOS 38', 'fernandezdelosrios38', {'fecha_apertura': '2024-10-09',
    'origen_notas': 'Fecha de llegada: 10/2024 (dia: el primer correo de Jose Antonio Marti, 09/10/2024). Contacta: Jose Antonio Marti Almansa (ELECNOR, jefe de obra, Dpto. de Obras y Reformas; 676 18 16 61 / 917 251 004; '
                    'jamarti@elecnor.es), tras hablar con Lucia Davila (Elecnor). Tipo de obra: CERTIFICADO DE CALCULO ESTRUCTURAL de la estructura del ascensor y de las zancas (firmado por Daniel); los calculos de las zancas, '
                    'con un calculista externo (Miguel Carretero). Distrito Chamberi. CP 28015. Tecnico: Jonatan. La oportunidad de produccion no tiene acceso de Catastro. Comercial: DANIEL.'},
    ('informe_tecnico',), n=fijar('fernandezdelosrios38', 2024), trae_pu=PU['jamarti'])

n = fijar('fernandezdelosrios5', 2026, ('2026-03-19', 'Sin fecha; el aviso de Oswaldo, con los primeros ficheros de la carpeta (fotos de WhatsApp del 19/03/2026).'))
n = partir(partir(n, 2, '7-04-2026 enviada', '2026-04-07'), 1, '24-03-26', '2026-03-24')
rellenar('fr5', 'FERNANDEZ DE LOS RIOS 5', 'fernandezdelosrios5', {'fecha_apertura': '2026-03-19',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia: los primeros ficheros, fotos de WhatsApp del 19/03/2026). Contacta: Oswaldo Garcia (SCHINDLER; 689 868 453): "reunion el dia 24/03, hay que ser rapidos". '
                    'Tipo de obra: ACCESIBILIDAD + CSS (tienen una persona en silla de ruedas: ensanchar unos 20 cm el hueco del ascensor y quitar los escalones de la entrada con rampa); HE de subvencion enviada 07/04/2026. '
                    'Contacto en el edificio: Antonia, 663 618 163. Comercial interno: DANIEL.'},
    ('accesibilidad', 'css', 'subvenciones'), n=n, trae_pu=PU['oswaldo'])
pc(OPP['fr5'][0]['id'], 'ANTONIA', 'otro', '663618163', None, None, 'Contacto en el edificio (en la ficha "pta Antonia").')

rellenar('fp4', 'FERNANDO PESSOA 4', 'fernandopessoa4', {'fecha_apertura': '2026-02-09',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: el correo del presidente, 09/02/2026). Contacta: Pedro Madrigal, el presidente (3o D; 630 011 686; pmadmuga@hotmail.com): bajar el forjado del portal a nivel de calle. '
                    'Tipo de obra: ACC Y SUST ASC (accesibilidad y sustitucion de ascensor). HE y viabilidad en manos de Alvaro para enviar 12/02/2026. Comercial interno: ALVARO.'},
    ('accesibilidad', 'modificacion_asc'), n=fijar('fernandopessoa4', 2026, ('2026-02-09', 'Correo de Pedro Madrigal del 9 de febrero de 2026.')),
    presi=('PEDRO MADRIGAL', 'presidente', '630011686', None, 'pmadmuga@hotmail.com'), trae_pc='presi', captador=ALVARO, lleva=ALVARO)

rellenar('fll3', 'FLORENCIO LLORENTE 3', 'florenciollorente3', {'fecha_apertura': '2025-11-28',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia: la nota y la ficha, 28/11/2025). Contacta: Javier Velasco (ELECNOR; 680 967 159). Tipo de obra: ASC + SUBV. HE enviada 28/11/2025 con la forma de pago acordada '
                    'entre Daniel y Elecnor. Comercial interno: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('florenciollorente3', 2025), trae_pu=PU['velasco'])

BERNABE = pc(cid_de('FOMENTO 19'), 'BERNABÉ', 'vecino', '687753164', None, 'bergonmo@gmail.com', 'Vecino; contacto de la oportunidad.')
rellenar('fo19', 'FOMENTO 19', 'fomento19', {'fecha_apertura': '2025-10-30', 'quien_persona_comunidad_id': BERNABE, 'persona_comunidad_id': BERNABE,
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: la HE, enviada el 30/10/2025). Contacta: Bernabe, vecino (687 753 164; bergonmo@gmail.com). Tipo de obra: ASCENSOR (viabilidad 06/11/2025: ascensor + elevador; '
                    'edificio y patio protegidos). Hay escaneo 3D (11/11/2025). En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), n=fijar('fomento19', 2025, otros={0: ('2025-10-30', 'Sin fecha delante; la fecha va dentro ("HE enviado 30/10/2025").')}), captador=CARLOS, lleva=ALVARO)

n = fijar('franciscoiglesias15', 2022, ('2022-08-18', 'Sin fecha; correo de Fain que contesta a uno de Vicente Real del 18/08/2022 (la fecha citada dentro).'))
rellenar('fi15', 'FRANCISCO IGLESIAS 15', 'franciscoiglesias15', {'fecha_apertura': '2022-06-01', 'referencia_catastral': '3525821VK4732F',
    'origen_notas': 'Fecha de llegada: 06/2022 (dia desconocido; el escaneo FARO es del 12/07/2022). Contacta: Vicente Real (FAIN). Tipo de obra: ASCENSOR (foso colgado de acero sobre el garaje). Barrio: Numancia. '
                    'Tecnico: Fernan -> Alejandro. DECLARACION (22/09/22), denegada; expediente 350/2022/07787 y recurso de la denegacion 114/2024/00017; en nov-2024 se pide a Fain autorizacion para tramitar por ECU. '
                    'Junta de Puente de Vallecas: tecnica "Sra. Adrian" (adrianoa@madrid.es; 91 511 03 76; tecnipvallecas@madrid.es); otros: Jorge Corona (91 588 35 05; coronarj@madrid.es). PEM 131.554,62. Superficie 39,24. '
                    'Administracion: DEL BRIO Y BLANCO (Carlos del Brio, 616 427 064, carlos@delbrioyblanco.es; Francisco Blanco, 616 427 063; Manuel Blanco, el administrador, 616 427 062, lleva las subvenciones: '
                    '"tratar todo con Carlos"). Presidente: Carlos Ortiz del Gallo (antes Urbana Salinas Ramirez, tachada). 19/02/2025: la comunidad aplaza el ascensor (primero reparaciones del edificio); queda abierta. '
                    'Comercial: DANIEL.'},
    ('ascensor',), n=n, comunidad={'iban': 'ES24 0081 7115 1000 0178 9787'}, trae_pu=PU['vreal'])
arreglar_pc(OPP['fi15'][0]['id'], 'rol=eq.presidente', {'nombre': 'CARLOS ORTIZ DEL GALLO', 'documento': '51997305D',
                                                        'notas': 'Antes: Urbana Salinas Ramirez (51832670P), tachada en la ficha.'})

n = fijar('franciscomadariaga15', 2026, ('2026-04-15', 'Correo de Ana Santamarta del 15 de abril de 2026.'))
rellenar('fm15', 'FRANCISCO MADARIAGA 15', 'franciscomadariaga15', {'fecha_apertura': '2026-04-15',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: el correo de Ana del 15/04/2026: llama Jose Olivares). Contacta: Jose Olivares (ROSERSESE). Tipo de obra: ASC (eliminar el escalon del portal, derribo completo de escalera '
                    'y del muro a patio, ascensor de 5 personas, escalera nueva invadiendo 40 cm el patio; toca el local). Contacto: Angeles Molina, vecina del 2o B, 660 93 88 38. HE con viabilidad enviada 14/05/2026. '
                    'Comercial interno: DANIEL.'},
    ('ascensor',), n=partir(n, 2, 'enviada 14/05', '2026-05-14'), trae_pu=PU['olivares'])
pc(OPP['fm15'][0]['id'], 'ANGELES MOLINA', 'vecino', '660938838', None, None, 'Vecina del 2º B; contacto de la viabilidad (abr-2026).')

rellenar('frd7', 'FRANCISCO RODRÍGUEZ 7', 'franciscorodriguez7', {'fecha_apertura': '2025-09-11', 'referencia_catastral': '6896606VK3669F',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia: la asignacion del expediente EFFIC AEFE-00017483, 11/09/2025). Contacta: EFFIC (comercial Francisco Javier Castro; tecnico de presupuesto Laura Camila, '
                    'laura.gutierrez.ext@effic.es). Tipo de obra: SATE de todo el edificio, CUBIERTA de amianto (uralita) y ASCENSOR con derribo de escalera y plataforma; aparte, saneado de sotano. Visita 23/09/2025. '
                    'Contacto de la comunidad: Belkis Betancourt, +34 641 849 244. HE enviada 26/09/2025 con costes y viabilidad. Comercial interno: DANIEL.'},
    ('sate', 'arreglo_cubierta', 'ascensor', 'plataforma'), n=fijar('franciscorodriguez7', 2025, ('2025-09-11', 'Correo de EFFIC del 11 de septiembre de 2025.')), trae_pu=PU['fjcastro'])
pc(OPP['frd7'][0]['id'], 'BELKIS BETANCOURT', 'otro', '641849244', None, None, 'Contacto de la comunidad para la visita de EFFIC (23/09/2025).')

n = fijar('franciscosilvela26', 2026, ('2026-03-19', 'Sin fecha; el aviso de Oswaldo, con los primeros ficheros de la carpeta (foto de WhatsApp del 19/03/2026).'))
rellenar('fs26', 'FRANCISCO SILVELA 26', 'franciscosilvela26', {'fecha_apertura': '2026-03-19',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia: los primeros ficheros, foto de WhatsApp del 19/03/2026). Contacta: Oswaldo Garcia (SCHINDLER; 689 868 453). Tipo de obra: ACCESIBILIDAD BAJADA A COTA CERO '
                    'del ascensor (por el patio; ascensor nuevo con doble embarque a 180 y cerramiento de vidrio); Oswaldo pide presupuesto de proyecto, DF y ayudas. Contacto en el edificio: Maria Carnicero '
                    '(669 795 383; mcarnicerg@gmail.com). HE con informe enviada 24/03/2026; el 06/04/2026, a peticion de Oswaldo, a la comunidad solo la HE. Comercial interno: DANIEL.'},
    ('accesibilidad', 'cota_cero'), n=partir(n, 1, '24/03/2026', '2026-03-24'), trae_pu=PU['oswaldo'])
pc(OPP['fs26'][0]['id'], 'MARÍA CARNICERO', 'otro', '669795383', None, 'mcarnicerg@gmail.com', 'Contacto en el edificio (2026).')

rellenar('fv21', 'FRANCISCO VIVANCOS 21', 'franciscovivancos21', {'fecha_apertura': '2025-09-25',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia: la llamada de Oscar, 25/09/2025). Contacta: Oscar Fernandez (CEGA; 616 295 646). Tipo de obra: SATE + SUBV con CAES (en el patio hay tela asfaltica con filtraciones). '
                    'HE enviada 29/09/2025. Comercial interno: DANIEL.'},
    ('sate', 'subvenciones', 'caes'), n=fijar('franciscovivancos21', 2025, otros={1: ('2025-09-29', 'En la ficha "29/09/2525": errata del ano.')}), trae_pu=PU['oscar_cega'])

n = sorted(fijar('frayjosecerdeiriña66', 2025) + [hueco('2025-07-14', 'PEIDDOS DOCS CP A CEGA 14/07', 'del administrador')], key=lambda x: x[0])
rellenar('fjc66', 'FRAY JOSE CERDEIRIÑA 66', 'frayjosecerdeiriña66', {'fecha_apertura': '2025-06-01', 'referencia_catastral': '3809727VK3730H',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia desconocido; la primera nota es del 01/07/2025). Contacta y paga el proyecto: CEGA (Francisco Gallego; "ya no es de CEGA"; 91 679 30 92 / 682 281 318; '
                    'administracion@ascensorescega.com, ascensorescega.ad@gmail.com). Tipo de obra: ASCENSOR CON DERRIBO DE ESCALERA + SUBV. Distrito Latina. Tecnico: Israel. Fecha encargo: 11/07/2025. Ano 1968. '
                    'Por ECU (ACTECU); en la ficha DR, en las notas "solicitud de licencia" y LICENCIA APROBADA el 08/01/2026. PEM 132.336,13. Visado TL/000198/2026. Superficie 83,00 m2. '
                    'Administracion: FINCAS MADRID WS (gestion@madridws.com). Presidenta: Paloma Sanchez Rivillo. En la carpeta hay una propuesta de 2015 (otro encargo; va a la clon). Comercial: DANIEL.'},
    ('ascensor', 'subvenciones'), n=n, trae_pu=PU['fgallego'])

# ================================================================= 2. CLON
cl = lambda c, a, s=None, o=None: J(fijar(c, a, s, o))
crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
REVS = [
    ('federicogutierrez24', '2017-01-01', 'JUAN CARLOS (THYSSEN)', None, None,
     'Calle FEDERICO GUTIERREZ 24 MADRID. Fecha: 01/2017 (dia desconocido; croquis y planos del 05/02/2017, renders de mayo-2017; la referencia de la ficha, xxx/2023, es de la plantilla). Tipo de obra: ASCENSOR '
     '(5 paradas, embarque simple; reduciendo la pared del fondo cabe un accesible hidraulico de 1000 x 1250) + plataforma elevadora a la entrada. Distrito 15 - Ciudad Lineal (Quintana).\n\n' + crudo('federicogutierrez24', 2017)),
    ('felipecastro9', '2024-10-07', 'JAVIER RODRIGUEZ MARTIN (SCHINDLER)', None, None,
     'FELIPE CASTRO 9 MADRID. Fecha: 10/2024. Tipo de obra: ASCENSOR Y SUBV. Distrito Usera. CP 28026. Administracion: Grupo Eurolinova (Miguel Megias; 91 500 21 69). La nota es la misma que la de Felipe Castro 6 '
     'del mismo dia, mas "OJO COMISION PARA EL ADMINISTRADOR". En la carpeta solo esta la ficha.\n\n' + cl('felipecastro9', 2024)),
    ('ferencpuska28', '2026-08-31', 'ALBERTO / ADOLFO COLLADO (MC GESTION FINCAS)', 'H16775991', None,
     'FERENC PUSKAS 28 MADRID. Fecha: la ficha dice 09/2026; el correo de Natalia Molino es del 31/08/2026. Tipo de obra: REDACCION DE MEDICIONES Y PRESUPUESTO CIEGO CON INFORME de patologias por mala ejecucion '
     'de la constructora (la comunidad quiere luego un arquitecto propio para la DF). CP 28052. Fecha encargo: 25/09/2026 (HE recibida firmada). Administracion: AEA / MC Gestion Fincas (Alberto, alberto@mcgestionfincas.com; '
     'Adolfo Collado; 915 02 74 59 / 618 63 60 95). Contacto: Natalia Molino, interlocutora de la comunidad (639 826 319; nataliamolino@gmail.com); en copia, Juan Antonio Zea Herranz, Franva y Cristina Gimenez Diaz '
     '(comision, presidente y vicepresidente). Cuenta ES47 0081 7118 5100 0177 8678. Comercial interno: DANIEL / ALVARO.\n\n'
     + cl('ferencpuska28', 2026, ('2026-08-31', 'Correo de Natalia Molino del 31 de agosto de 2026.'))),
    ('fermincaballero75', '2022-10-26', 'RAUL CEREZO (ELECNOR; ya no esta en Elecnor)', 'H79593661', None,
     'Calle FERMIN CABALLERO 75 MADRID: MANCOMUNIDAD CONJUNTO RESIDENCIAL FROILAN PONCE DE LEON. Fecha: la ficha dice 02/2023; los primeros ficheros de trabajo son de oct-nov 2022 (acta y DNI de la presidenta, '
     '26-27/10/2022; fotos de Iberdrola, 04/11/2022). Tipo de obra: SATE + FV + AEROTERMIA (?) + CEE inicial y final + LIBRO DEL EDIFICIO, con ELECNOR e IBERDROLA (3 calderas Viessmann; central termica). '
     'Distrito 08 - Fuencarral-El Pardo (Penagrande). CP 28034. Contacto de la mancomunidad: Rosa Ma Garcia, responsable de administracion (91 739 85 37; crfroilanponcedeleon@hotmail.com). '
     'Presidenta: Olga Maria Palmero Mazon (02893003V). Relacion con Ullastres: Angel Martin (680 454 461) y Manuel Lozano (661 679 774). Reunion con los vecinos 24/04/2023 (Iberdrola, Carla y Jonatan).\n\n'
     + cl('fermincaballero75', 2023)),
    ('fernandoelcatolico47', '2025-01-22', 'IGNACIO (ADMINISTRACIONES MARCSA), via JOSE LUIS (BIOK)', None, None,
     'FERNANDO EL CATOLICO 47 MADRID. Fecha: 01/2025. Tipo de obra: SATE + SUBVENCION + ACCESIBILIDAD (fachada trasera; quitar 2 escalones de la entrada con rampa hacia el interior). Distrito Chamberi. CP 28015. '
     'Administracion: Marcsa (Ignacio; ihierroa@gmail.com) - no esta en la agenda. Viene a traves de Jose Luis, de Biok (pedraza@biokenergy.com; 629 071 657) - no esta en la agenda.\n\n' + cl('fernandoelcatolico47', 2025)),
    ('fernandoelcatolico73', '2023-09-01', 'CANO ABOGADOS (administracion) / JAVIER GONZALEZ MOYA (SCHINDLER)', None, None,
     'Calle FERNANDO EL CATOLICO 73 MADRID. Fecha: 09/2023 (dia desconocido; presupuesto de honorarios de ascensor enviado en sept-2023). Tipo de obra: ASCENSOR (el administrador pide presupuesto de obra para '
     'las soluciones 2 y 3 de los planos: patio interior derecho y centro; hay que salvar dos tramos de escalera); el 27/11/2024 Schindler pide SUBVENCION de PROYECTO EXTERNO (HE enviada). '
     'Distrito 07 - Chamberi (Gaztambide). CP 28015. Administracion: Cano Abogados (administracion@canoabogados.com) - no esta en la agenda. La visita de 2017 con Thyssen es otra fila.\n\n'
     + cl('fernandoelcatolico73', 2023, ('2023-09-01', 'Sin fecha; el presupuesto de honorarios se envio en sept-2023, dia desconocido.'))),
    ('ferrovial9', '2023-03-07', 'VALENTIN (ADMINISTRACIONES ALCORA)', None, None,
     'Calle FERROVIAL 9 MADRID. Fecha: 03/2023. Tipo de obra: SATE + ASCENSOR + FOTOVOLTAICA (estudiar la impermeabilizacion con Matedecon). Distrito 02 - Arganzuela (Delicias).\n\n' + cl('ferrovial9', 2023)),
    ('fidias9', '2024-04-29', 'JOSE LUIS (ROEN)', None, None,
     'FIDIAS 9 MADRID. Fecha: 04/2024. Tipo de obra: SATE Y NEXT GENERATION (7 vecinos; segun Catastro 8 viviendas + 1 local; PEM 86.000). Distrito Latina. CP 28011.\n\n' + cl('fidias9', 2024)),
    ('florenciogarcia11', '2018-01-31', 'ANTONIO MIRA (ANYLOR)', 'H79673489', '5767405VK4756H',
     'Calle FLORENCIO GARCIA 11 MADRID. Fecha: la ficha dice 10/2023 (copiada); los ficheros empiezan con las fotos del 31/01/2018. Tipo de obra: INSTALACION DE ASCENSOR (ascensor electrico gearless de Anylor, '
     '4 paradas). Distrito 15 - Ciudad Lineal (Quintana). CP 28027. PEM 90.379,83. Proyecto hecho: visado TL/022227/2019, tramitacion de licencia, incidencias del proyecto y fin de obra en la carpeta (2019-2023).'),
    ('franciscoguzman1', '2016-12-19', 'PEDRO ARANDA (THYSSEN)', None, None,
     'Calle FRANCISCO GUZMAN 1 MADRID. Fecha: 12/2016 (croquis del 19/12/2016; oferta del 20/12/2016). Tipo de obra: 2 ASCENSORES Y 1 PLATAFORMA ELEVADORA (una escalera se derriba y la otra se agranda; '
     'fosos colgados por los garajes; salvaescaleras para salvar 1 m). Distrito 11 - Carabanchel (Puerta Bonita).\n\n' + crudo('franciscoguzman1', 2016)),
    ('franciscoordoñez5', '2022-05-24', 'JOSE Mª GALVEZ (FAIN)', None, None,
     'Calle FRANCISCO ORDOÑEZ 5 MADRID. Fecha: 05/2022. Tipo de obra: ASCENSOR. Distrito 17 - Villaverde (Villaverde Alto - Casco Historico de Villaverde). En la carpeta solo esta la ficha.\n\n' + cl('franciscoordoñez5', 2022)),
    ('franciscosuarez16', '2025-01-09', 'TOMAS MORELL (ELECNOR)', None, None,
     'FRANCISCO SUAREZ 16 MADRID. Fecha: 01/2025. Tipo de obra: SATE con DF y CSS + SUBV (licitacion de Elecnor con sistemas de Sto Iberica: comunidad de 3 edificios, unos 5.700 m2, obra de 1 a 2 M EUR; '
     'proyecto con libro del edificio y CEE, CSS, direccion de obra y subvenciones). Distrito Chamartin. CP 28036.\n\n'
     + cl('franciscosuarez16', 2025, ('2025-01-09', 'Correo de Tomas Morell (Elecnor) del 9 de enero de 2025.'),
          {1: ('2025-01-10', 'En la ficha "10/01/2024": errata del ano; el correo de Elecnor es del 9/01/2025.')})),
    ('fresnedillas7', '2023-05-17', 'RICARDO (DIDEPRO)', None, None,
     'Calle FRESNEDILLAS 7 MADRID (MANCOMUNIDAD LOS ROBLES). Fecha: 05/2023. Tipo de obra: SATE + SUBVENCION. Distrito 08 - Fuencarral-El Pardo (Fuentelarreina).\n\n' + cl('fresnedillas7', 2023))]
for carp, fecha, trajo, cif, ref, t, *ruta in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, ruta=ruta[0] if ruta else None)
for carp, fecha, trajo, t, *ruta in [
        ('franciscopaino33', '2016-09-01', 'FELIPE (ENOR)', 'Calle FRANCISCO PAINO 33 MADRID. Fecha: 09/2016 (dia desconocido; croquis y video del 03/12/2016). Distrito 11 - Carabanchel (Abrantes). '
         'Contactos: Angel Vega (2o A); vecina interesada: Cruz Ma Orfila (3o A), 678 657 447. Ficha vacia; hay croquis y video.'),
        ('fuencarral26', '2017-05-17', 'LUIS MIGUEL NUNES (THYSSEN)', 'CALLE FUENCARRAL 26 MADRID. Fecha: 05/2017 (la ficha, copiada, dice 10/2023; foto del 17/05/2017). Distrito 01 - Centro (Justicia). Ficha vacia; hay una foto.'),
        ('fuentesauco30', '2015-04-01', 'PEDRO ARANDA (THYSSEN)', 'Calle FUENTESAUCO 30 MADRID. Fecha: 04/2015 (dia desconocido; presupuesto y valoracion del 11/05/2015). Distrito 10 - Latina (Campamento). '
         'Ficha vacia; hay presupuesto y valoracion.'),
        ('fernandoelcatolico73 (2017)', '2017-10-03', 'LUIS MIGUEL NUNES (THYSSEN)', 'Calle FERNANDO EL CATOLICO 73 MADRID: PRIMER ENCARGO (2017). Fecha: 10/2017 (fotos y planos del 03/10/2017). '
         '"VISTO EN 2017 CON THYSSEN LUIS MIGUEL NUNES" (ficha de fernandoelcatolico73). Distrito 07 - Chamberi (Gaztambide). El encargo de 2023-2024 es otra fila.', R('fernandoelcatolico73' + B + 'DATOS')),
        ('frayjosecerdeiriña66 (2015)', '2015-02-15', None, 'FRAY JOSE DE CERDEIRIÑA 66 MADRID: ENCARGO DE 2015, sin ficha propia: propuesta, fotos (22/02/2015) y presupuestos de ascensor con derribo de escalera '
         '(modelos E y E\', foso colgado; ascensor por patio) de feb-2015, en 1.DATOS de la carpeta. El encargo de 2025 (CEGA) es la oportunidad de produccion.', R('frayjosecerdeiriña66' + B + '1.DATOS')),
        ('faro2', '2021-02-25', None, 'FARO 2 MADRID. Carpeta SIN ficha de datos: correos, presupuesto, licencia concedida y proyecto visado (ficheros "20.-", 25/02/2021). OJO: en produccion hay "FARO 4-6", que no es este numero.'),
        ('fermincaballero24', '2020-11-11', None, 'FERMIN CABALLERO 24 MADRID. Carpeta SIN ficha de datos: un certificado (.docx y .pdf, nov-2020).'),
        ('fernandoelcatolico29', '2017-04-22', None, 'FERNANDO EL CATOLICO 29 MADRID. Carpeta SIN ficha de datos: certificados de idoneidad (22/04/2017), solicitud de visado voluntario, alcance de las obras ejecutadas '
         'y visado TL-007568-2017 (may-2017). Dentro esta colada la carpeta franciscodemadariaga27 (fila aparte).'),
        ('franciscodemadariaga27', '2016-02-10', 'FELIPE OSADO (ENOR)', 'FRANCISCO DE MADARIAGA 27 MADRID (carpeta colada dentro de fernandoelcatolico29). Fecha: 10/02/2016 (la de la ficha). Contacto: Maximo Urrea. '
         'Ficha vacia; hay borrador de escalera, croquis, fotos, oferta de ascensor Enor Atrium y valoracion (mar-abr 2016).', R('fernandoelcatolico29' + B + 'franciscodemadariaga27'))]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t, ruta=ruta[0] if ruta else None)

# ================================================================= 3. MANIAS
mania('Prorroga de una DR: no se prorroga; hay que anular la DR y registrar una nueva (unos 500 EUR), reciclando la tasa ICIO y el aval de residuos.', 'ECU (ACTECU)', '2026-06-15',
      'felipecastro6', clave='fc6', trozo='prórroga es necesario anular')
mania('Ascensor + SATE + cubierta: deniega la licencia por procedimiento incorrecto; tenia que ir por Declaracion Responsable y por ECU.', 'Junta Municipal de Distrito de San Blas-Canillejas', '2024-04-30',
      'feria8', clave='fer8', trozo='procedimiento incorrecto')

OPP.pop('ff26', None); OPP.pop('fa28', None)
resumen()
