# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda C4 (clavijo3 .. cuchilleros10, 41 carpetas). 6-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de

MARAM = '481614b0-3c01-4730-aae5-8d990947a974'; VALLECAS = 'df5e69f1-696b-4ae8-beba-63289e296c49'
PU.update(paramio='900b6af9-4a5c-4e31-8c09-322357ee402c', mblanco='67525999-7f12-416d-a311-1f2f02f37d99', paz='46e3614d-97fd-40bf-baac-07d9bd5e601f',
          tercero='bba769a7-d9ba-40d8-a861-4da851324970', jrodriguez='3bb9cbe7-f3d6-4223-be99-e76ad4a67a56', collado='0f2b3251-9e84-443d-b81e-32edfd1f7915',
          sacristan='112162d0-2df1-4201-91cd-807a4c50d236', megias='4757522a-e0d2-4ca5-aa1b-5e898d2c07e0')
EUROLINOVA = b.leer('puesto?select=empresa_id&id=eq.' + PU['megias'])[0]['empresa_id']


def notas_a_mano(c, anio, cambios):
    n = []
    for i, (f, t) in enumerate(_notas_de(c, anio)):
        if i in cambios:
            f = cambios[i][0]; t = t + ('\n\n(' + cambios[i][1] + ')' if cambios[i][1] else '')
        n.append((f, t))
    assert all(f for f, t in n), c
    return n


def admin_empresa(cid, empresa):
    if not b.leer('comunidad_admin_responsable?select=id&vigente=eq.true&comunidad_id=eq.' + cid):
        ins('comunidad_admin_responsable', [{'comunidad_id': cid, 'empresa_id': empresa, 'puesto_id': None, 'vigente': True}])


def cerrar_perdida(clave, motivo, fecha, notas_):
    if ESCRIBIR:
        oid = OPP[clave][1]
        if not b.leer('motivo_cierre_oportunidad?select=id&oportunidad_id=eq.' + oid):
            b.insertar('motivo_cierre_oportunidad', [{'oportunidad_id': oid, 'resultado_final': 'perdido', 'motivo_perdido': motivo, 'fecha_cierre': fecha, 'notas': notas_}])
            b.actualizar('oportunidades?id=eq.' + oid, {'estado': 'cerrada'})
    else:
        SECO.append('INSERT motivo_cierre_oportunidad x1: %s perdido (%s) %s + UPDATE oportunidades estado=cerrada' % (clave, motivo, fecha))


def renombrar_pc(mal, datos):
    d = b.leer('personas_comunidad?select=id&nombre=eq.' + quote(mal))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


# ================================================================= 0. AGENDA
ELENA = persona_nueva('Elena', 'García', 'técnico', None, 'garciahel@madrid.es', organismo=VALLECAS,
                      notas_='Junta de Puente de Vallecas: tecnica de la licencia del ascensor de Corral de Cantos 19 (2022; en la ficha tambien "Helena").')

# ================================================================= 1. PRODUCCION (18)
rellenar('clv3', 'CLAVIJO 3', 'clavijo3', {'fecha_apertura': '2020-07-19',
    'origen_notas': 'Fecha de llegada: la ficha no la trae; 2020 (dia: el primer fichero, el croquis del 19/07/2020). Contacta: Juan Paramio (FAIN). Tipo de obra: ASCENSOR. Barrio: Casco historico de Vicalvaro. '
                    'Tecnico: Dennis. Jefe de obra: Juan Luis Ruiz de Mier. PEM 63.725,63. Visado TL/020671/2023. Superficie 21 m2. Contactos de la comunidad: Mari Cruz Sanchez Hernandez (917 760 064; '
                    'mcruzsanchezhernandez@gmail.com) y Ruben (rbncmm@hotmail.com). Obra hecha: en oct-2025 el Ayto de Vicalvaro pide el CFO y en jun-2026 notifica una incidencia del final de obra. Comercial: DANIEL.'},
    ('ascensor',), n=fijar('clavijo3', 2025), presi=('MARI CRUZ SANCHEZ HERNANDEZ', 'presidente', '917760064', None, 'mcruzsanchezhernandez@gmail.com'), trae_pu=PU['paramio'])
rellenar('cer29', 'COLONIA ERILLAS 29', 'coloniaerillas29', {'fecha_apertura': '2025-06-16',
    'origen_notas': 'Fecha de llegada: 06/2025. Contacta: Manuel Blanco (DEL BRIO Y BLANCO; tambien Lesmes Zaballos): portal pequeno de 10 vecinos que quiere ascensor. Tipo de obra: ASC + SUBV '
                    '(derribo completo de escalera y fachada; ascensor de 6 paradas, doble embarque a 180, 5-6 personas; invade 1 m la calle privada; contadores a armario homologado). Presidente: Juan Carlos, 686 716 077. '
                    'HE enviada 18-06-2025. Comercial interno: DANIEL.'},
    ('ascensor', 'subvenciones'), n=notas_a_mano('coloniaerillas29', 2025, {0: ('2025-06-16', 'Correo de Manuel Blanco del 16 de junio de 2025.')}),
    presi=('JUAN CARLOS', 'presidente', '686716077'), adm=PU['mblanco'], trae_pu=PU['mblanco'])
rellenar('cf28', 'COMANDANTE FORTEA 28', 'comandantefortea28', {'fecha_apertura': '2026-05-17',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: el de la ficha). Tipo de obra: ENVOLVENTE TERMICA. La ficha no dice quien la trae y no tiene notas. Comercial interno: ALVARO.'},
    ('sate',), captador=ALVARO, lleva=ALVARO)
rellenar('com5', 'COMERCIO 5', 'comercio5', {'fecha_apertura': '2025-04-16',
    'origen_notas': 'Fecha de llegada: 04/2025. Contacta: Gema Callejas, de la administracion ORTIZ GINESTAL (C/ Corregidor Alonso de Tobar 23, bajo B; 913 281 332; averias@ortizginestal.com; administradora Ma Dolores Ginestal, '
                    'direccion@ortizginestal.com) - no esta en la agenda. Tipo de obra: primero SUBVENCIONES (impermeabilizacion y mejora de accesibilidad); en jun-2025, IEE (la tienen que pasar en 2026) y estudio, definicion y DF '
                    'del arreglo de filtraciones del garaje; en jul-2025 piden rehacer: la accesibilidad la lleva otro arquitecto; solo humedades, IEE, DF y subvenciones (accesibilidad e IEE por separado). Comercial: DANIEL.'},
    ('subvenciones', 'iee', 'df'), n=fijar('comercio5', 2025))
rellenar('cdq48', 'CONDE DUQUE 48', 'condeduque48', {'fecha_apertura': '2025-09-16',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia: el del escaneo 3D). Administracion: VIPAMA (Francisco Jose Pichon) - no esta en la agenda. Tipo de obra: la ficha no lo dice. Hay escaneo 3D. La ficha no tiene notas. '
                    'En la ficha: comercial interno "DANIEL O CARLOS"; la lleva Daniel.'},
    ())
rellenar('ct10', 'CONDESA DE TEBA 10', 'condesadeteba10', {'fecha_apertura': '2026-05-13',
    'origen_notas': 'Fecha de llegada: 05/2026. Tipo de obra: la ficha no lo dice. Por orden de Daniel se le pide a Raul Cerezo una HE superior a nuestros honorarios para enviarla a Carlos Garcia. '
                    'En la ficha: comercial interno CARLOS G; la trae y la lleva DANIEL (Monica, 6-oct-2026).'},
    (), n=fijar('condesadeteba10', 2026))
rellenar('ct21', 'CONDESA DE TEBA 21', 'condesadeteba21', {'fecha_apertura': '2026-05-01', 'referencia_catastral': '5597702VK3659F',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia desconocido). Contacta: Paz (Maria Paz Terradillos, CIUDADELA). Tipo de obra: ASC + SUBV (en ago-2026 el comercial habla de invadir el patio para la accesibilidad). '
                    'Tecnico: Carlos Daza. Fecha encargo: 29/05/2026. Ano 1971. Presidente: Israel Garcia Gallego, 616 586 002; vicepresidente: Julian, 630 27 76 53. En la ficha: comercial interno CARLOS G.' + EXT},
    ('ascensor', 'subvenciones'), n=fijar('condesadeteba21', 2026),
    comunidad={'iban': 'ES83 2100 2479 6913 0034 4253', 'cif_comunidad': 'H79570404'}, adm=PU['paz'], trae_pu=PU['paz'], captador=ALVARO, lleva=ALVARO)
renombrar_pc('ISRAEL GARCIA GALLEGO 616 586 002', {'nombre': 'ISRAEL GARCIA GALLEGO', 'telefono': '616586002'})
pc(OPP['ct21'][0]['id'], 'JULIAN', 'vicepresidente', '630277653')
rellenar('cb6', 'CONDES DE BARCELONA 6', 'condesdebarcelona6', {'fecha_apertura': '2025-01-03',
    'origen_notas': 'Fecha de llegada: 01/2025. Contacta: el administrador, Jose Antonio Tercero (ARCOS OLEA; documentos pedidos a la comunidad 07/01/2025). Tipo de obra: SUBVENCION A EXITO de una REHABILITACION INTEGRAL '
                    'con proyecto externo. Presidente: Alberto Movilla Carreres. PERDIDA (la rechazamos nosotros, 27/01/2025): la obra esta acabada y se hizo sin proyecto visado ni licencia, que la subvencion exige. Comercial: DANIEL.'},
    ('subvenciones',), n=fijar('condesdebarcelona6', 2025),
    comunidad={'iban': 'ES94 2085 9971 6203 3032 5748', 'cif_comunidad': 'H28973063'},
    presi=('ALBERTO MOVILLA CARRERES', 'presidente', '616485943', None, 'jalbertomc1@hotmail.com'), adm=PU['tercero'], trae_pu=PU['tercero'])
cerrar_perdida('cb6', 'rechazada por nosotros: obra acabada sin proyecto visado ni licencia', '2025-01-27',
               'La obra se hizo sin proyecto visado ni licencia, obligatorios para la subvencion; Accesalia rechaza el encargo (ficha de Dropbox). Cerrada en el barrido de Madrid (Monica, 6-oct-2026).')
rellenar('cnr4', 'CONRADO DEL CAMPO 4', 'conradodelcampo4', {'fecha_apertura': '2026-05-27',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: el de la ficha). Contacta: la administracion CARABANA PEREZ - no esta en la agenda. Tipo de obra: SATE + ACCESIBILIDAD + SANEAMIENTO + SUBV. La ficha no tiene notas. '
                    'Comercial interno: ALVARO.'},
    ('sate', 'accesibilidad', 'subvenciones'), captador=ALVARO, lleva=ALVARO)
rellenar('cns41', 'CONSTANCIA 41', 'constancia41', {'fecha_apertura': '2026-01-12',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: el del escaneo 3D). Contacta: el presidente, Alvaro, 665 784 577. Tipo de obra: ASC + ACCESIBILIDAD. Hay escaneo 3D. La ficha no tiene notas. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('ascensor', 'accesibilidad'), presi=('ALVARO', 'presidente', '665784577'), trae_pc='presi', captador=CARLOS, lleva=ALVARO)
renombrar_pc('ALVARO / 665 784 577', {'nombre': 'ALVARO', 'telefono': '665784577'})
rellenar('cdc19', 'CORRAL DE CANTOS 19', 'corraldecantos19', {'fecha_apertura': '2025-08-25', 'referencia_catastral': '3214806VK4731C',
    'origen_notas': 'Fecha de llegada: 25-08-2025: llama Jose Manuel, el presidente, para retomar el SATE. Tipo de obra: SATE + SUBVENCIONES + CAES (HE enviada el mismo dia, con precio actualizado). '
                    'Historia: el proyecto de ASCENSOR de 2021 (pagado por Fain, subvencion concedida) es OTRA oportunidad y va a la clon; en 2022 contrataron un proyecto de SATE (+ FV) que se cancelo por falta de dinero '
                    '(se facturo y se anulo con un abono). Quieren pagar la fachada con la subvencion del ascensor; se les aclara que la subvencion es para lo que se concedio. Administracion: MARAM ASESORES (Guillermo, 640 713 875). '
                    'La OPP de produccion es la del SATE (Monica, 6-oct-2026). Comercial: DANIEL.'},
    ('sate', 'subvenciones', 'caes'), n=fijar('corraldecantos19/SATE+FV/CORRALDECANTOS19 FICHA SATE.docx', 2025),
    comunidad={'iban': 'ES51 0081 7115 1300 0191 3702'}, presi=('JOSE MANUEL PARRA GARCIA', 'presidente', '629721229', None, 'josempd1942@gmail.com'), trae_pc='presi')
admin_empresa(OPP['cdc19'][0]['id'], MARAM)
rellenar('cbsp25', 'CORREDERA BAJA DE SAN PABLO 25', 'correderabajadesanpablo25', {'fecha_apertura': '2025-10-07',
    'origen_notas': 'Fecha de llegada: 10/2025. Tipo de obra: ASCENSOR POR HUECO DE ESCALERA (no hacer 3D). La ficha no dice quien la trae. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), n=fijar('correderabajadesanpablo25', 2025), captador=CARLOS, lleva=ALVARO)
rellenar('cat16', 'CORREGIDOR ALONSO DE TOBAR 16', 'corregidoralonsodetobar16', {'fecha_apertura': '2026-04-08',
    'origen_notas': 'Fecha de llegada: 04/2026. Contacta: Javier Rodriguez (Schindler). Tipo de obra: MODIFICACION DE ASCENSOR: cambio completo anadiendo una parada por debajo de la planta baja y otra por encima, a 90, '
                    'para dar accesibilidad a esas dos plantas; y, aparte, gestion de ayudas. Hay escaneo 3D. Comercial interno: ALVARO.'},
    ('modificacion_asc', 'anadir_parada', 'subvenciones'), n=notas_a_mano('corregidoralonsodetobar16', 2026, {0: ('2026-04-08', 'Correo de Javier Rodriguez (Schindler) del 8 de abril de 2026.')}),
    trae_pu=PU['jrodriguez'], captador=ALVARO, lleva=ALVARO)
rellenar('cdv18', 'CORREGIDOR DIEGO CABEZA DE VACA 18', 'corregidordiegocabezadevaca18', {'fecha_apertura': '2023-10-25', 'referencia_catastral': '4535909VK4743F',
    'origen_notas': 'Fecha de llegada: 10/2023. Contacta: Adolfo Collado (AEA / MC GESTION FINCAS). Tipo de obra: ASCENSOR + DF + CSS + SUBV (en 2023 se presupuesto tambien SATE del programa 5). Barrio: Media Legua. '
                    'En nov-2024 deciden no hacer ascensor; el 19-06-2025 la junta lo aprueba y la HE se firma el 20-06-2025 (fecha de encargo de la ficha: 19/06/2025). Ano 1968. Una vecina se opone (23-06-2025); '
                    'PROYECTO EN STANDBY. OJO: el 3D que esta en datos no corresponde. El 11/03/2026 MC Gestion avisa de que ya no administra la comunidad (dio la documentacion a la presidenta). Comercial: DANIEL.'},
    ('ascensor', 'df', 'css', 'subvenciones'), n=partir(fijar('corregidordiegocabezadevaca18', 2023), 7, '---------- Forwarded message', '2026-03-11'),
    comunidad={'iban': 'ES68 0081 1479 3400 0148 9559'}, trae_pu=PU['collado'])
for a in b.leer('comunidad_admin_responsable?select=id&vigente=eq.true&empresa_id=eq.91d77ff2-17d5-4311-b01d-969d38ff838f&comunidad_id=eq.' + OPP['cdv18'][0]['id']):
    act('comunidad_admin_responsable?id=eq.' + a['id'], {'vigente': False, 'hasta': '2026-03-11',
                                                          'notas': 'MC Gestion avisa el 11/03/2026 de que ya no administra la comunidad (ficha de Dropbox; Monica, 6-oct-2026).'})
rellenar('cjp16', 'CORREGIDOR JOSE DE PASAMONTE 1 Y 6', 'corregidorjosedepasamonte1-6', {'fecha_apertura': '2025-07-24',
    'origen_notas': 'Fecha de llegada: 07/2025. Contacta: Adolfo Collado (AEA / MC GESTION FINCAS). Tipo de obra: SUBVENCION de un PROYECTO EXTERNO de SATE. HE con caracteristicas especiales (correo a Ana del 24/07/2025); '
                    'HE enviada 28/07/2025. Comercial interno: DANIEL.'},
    ('sate', 'subvenciones'), subvencion=[('2025-07-24', 'ALEJANDRA : HE CON CARACTERISTICAS ESPECIALES , ENVÍO CORREO A ANA CON FECHA DE HOY PARA SI EN EL FUTURO TUBIESEMOS QUE CONSULTAR ESTAS CARACTERISTICAS.'),
                                         ('2025-07-28', 'HE SUBV PROY EXTERNO ENVIADA')],
    adm=PU['collado'], trae_pu=PU['collado'])
rellenar('cjl34', 'CORREGIDOR JUAN FRANCISCO DE LUJAN 34', 'corregidorjuanfranciscodelujan34', {'fecha_apertura': '2026-01-12',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: el del escaneo 3D). Contacta: Adolfo Collado (AEA / MC GESTION FINCAS). Tipo de obra: SATE + SUBV y ASCENSOR (la carpeta tiene dos fichas iguales, SATE y ASCENSOR: '
                    'una sola oportunidad). Ascensor: derribo completo de escalera y del muro trasero; 4 personas, 5 paradas, embarque simple; no se tocan contadores; PEM 195.000 + IVA; el SATE se valora aparte. '
                    'HE con informe enviados 22/01/2026. Comercial interno: DANIEL.'},
    ('ascensor', 'sate', 'subvenciones'),
    n=notas_a_mano('corregidorjuanfranciscodelujan34/SATE/FICHA DATOS.docx', 2026, {0: ('2026-01-22', 'Sin fecha; la propuesta de Daniel para la HE del 22/01/2026.')}),
    adm=PU['collado'], trae_pu=PU['collado'])
n = notas_a_mano('cristodelavictoria129', 2026, {0: ('2026-06-11', 'Sin fecha; la propuesta de Daniel para la HE del 11-06-26.')})
rellenar('cv129', 'CRISTO DE LA VICTORIA 129', 'cristodelavictoria129', {'fecha_apertura': '2026-06-08',
    'origen_notas': 'Fecha de llegada: 06/2026 (dia: el del escaneo 3D). Contacta: la administracion GRUPO EUROLINOVA. Tipo de obra: ASCENSOR (derribo completo de escalera sin tocar zonas comunes; 6 plazas, 450 kg, '
                    'embarque simple, 4 paradas; PEM 165.000 + IVA). Contacto de la comunidad: Francisco, 616 490 411, paco_fks1@telefonica.net. HE a Monica 11-06-26, enviada 15-06-26. Comercial interno: DANIEL.'},
    ('ascensor',), n=partir(n, 1, '15-06-26', '2026-06-15'), presi=('FRANCISCO', 'presidente', '616490411', None, 'paco_fks1@telefonica.net'))
admin_empresa(OPP['cv129'][0]['id'], EUROLINOVA)
rellenar('cch10', 'CUCHILLEROS 10', 'cuchilleros10', {'fecha_apertura': '2025-12-02',
    'origen_notas': 'Fecha de llegada: 12/2025. Contacta: Miguel Angel Sacristan Paz (administrador; 913 452 565 / 616 457 235). Tipo de obra: ASCENSOR INVADIENDO VIVIENDAS (6 personas, 450 kg, doble embarque a 180, 6 paradas, '
                    'entrada directa desde el portal; las escaleras estan protegidas y no se pueden reducir; PEM 150.000 + IVA sin las indemnizaciones por los 2,8 m2 de vivienda invadidos). HE con informe de viabilidad 11/12/2025. '
                    'Comercial interno: DANIEL.'},
    ('ascensor',), n=notas_a_mano('cuchilleros10', 2025, {0: ('2025-12-02', 'Correo de Miguel Angel Sacristan del 2 de diciembre de 2025.')}),
    adm=PU['sacristan'], trae_pu=PU['sacristan'])

# ================================================================= 2. CLON
cl = lambda c, a, s=None: J(fijar(c, a, s))
crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
GORDILLO = 'Contacta: Jose Gordillo. Distrito 09 - Moncloa-Aravaca (Casa de Campo). '
REVS = [
    ('corraldecantos19 (ascensor)', '2021-10-20', 'VICENTE REAL MUÑOZ (FAIN)', 'H80166309', '3214806VK4731C',
     'C/ CORRAL DE CANTOS 19 MADRID. Fecha: 10/2021 (encargo de proyecto de Fain del 20/10/2021). Tipo de obra: ASCENSOR (proyecto pagado por Fain) + SUBVENCION (Rehabilita 2022, tramitada por Nunci, concedida; '
     'la renovacion ultima, de enero-2024, la pagaron ellos). Distrito 13 - Puente de Vallecas (San Diego). Tecnico: Dennis. Manuel Requena / Abel Bernardos. Administracion: Maram Asesores (Guillermo, 640 713 875). '
     'Presidente: Jose Manuel Parra Garcia (629 721 229 / 914 780 866). Junta de Puente de Vallecas: tecnica Elena Garcia (garciahel@madrid.es). PEM 141.176,47. Visados TL/019156/2021 y TL/017359/2024 (CFO). '
     'Expediente 114/2021/05556 (declaracion). Fain no paga hasta que Daniel envie el descargo de responsabilidad para empezar la obra. El SATE es la oportunidad de produccion (Monica, 6-oct-2026).\n\n'
     + crudo('corraldecantos19/ASCENSOR/FICHA DATOS TECNICOS.docx', 2022), R('corraldecantos19' + B + 'ASCENSOR')),
    ('comandantefortea18', '2023-01-03', 'JOSE GORDILLO', None, None,
     'CALLE COMANDANTE FORTEA 18 MADRID. Fecha: 01/2023. ' + GORDILLO + 'Tipo de obra: SATE + FOTOVOLTAICA + ASCENSOR (20 viviendas).'),
    ('comandantefortea48', '2023-01-02', 'JOSE GORDILLO', None, None,
     'PASEO COMANDANTE FORTEA 48 MADRID. Fecha: 01/2023. ' + GORDILLO + 'Tipo de obra: SATE + FV. 02/01/2023: ojo, mirar el ano de construccion de "estos 8 portales".'),
    ('comandantefortea9bis', '2023-01-02', 'JOSE GORDILLO', None, None,
     'COMANDANTE FORTEA 9 BIS MADRID (la cabecera de la ficha dice "CALLE SANTOVENIA 8"). Fecha: 01/2023. ' + GORDILLO + 'Tipo de obra: SATE + FV; calderas individuales; 8 portales de 5 pisos, 40 viviendas. '
     'OJO AL ANO DE CONSTRUCCION.'),
    ('concepcion8', '2023-04-16', 'JUANI DI-SILVESTRO (LAGO ASESORES)', None, None,
     'CALLE CONCEPCION 8 MADRID. Fecha: 04/2023. Tipo de obra: SATE + SUBVENCION. Distrito 13 - Puente de Vallecas (Palomeras Bajas). Administracion: Lago Asesores (Avda. Buenos Aires 67, local; Juani Di-Silvestro, '
     'contabilidad; 917 780 503; contabilidad.lagoasesores@hotmail.com). Son los administradores de la comunidad donde vive Ana.\n\n' + cl('concepcion8', 2023)),
    ('conchaespina19', '2016-07-01', 'FELIPE OSADO (ENOR)', None, None,
     'AV. CONCHA ESPINA 19 MADRID. Fecha: 07/2016. Tipo de obra: ASCENSOR. Distrito 05 - Chamartin (Hispanoamerica). Hay que ofertar bajando a los trasteros y sin bajar. El vecino que contacto dice que los portales 17 y 21 '
     'tambien podrian estar interesados (misma tipologia, otras paradas). Ricardo Moreno, 606 734 055.'),
    ('condedetorralba10', '2023-07-21', 'OSCAR LOPEZ (FAIN) -> ADMIN ALDAGESTION', None, None,
     'CONDE DE TORRALBA 10 MADRID. Fecha: 08/2023. Tipo de obra: SATE, CUBIERTA Y SUBV. Distrito 05 - Chamartin (Castilla). Presupuesto enviado por Monica el 21/07/2023.\n\n' + cl('condedetorralba10', 2023)),
    ('cordilleradecuera3', '2017-04-25', 'PEDRO ARANDA (THYSSEN)', None, None,
     'CALLE CORDILLERA DE CUERA 3 MADRID. Fecha: 04/2017. Tipo de obra: ASCENSOR. Distrito 13 - Puente de Vallecas (San Diego). Contacto: Ana Rico Galeano (arico4@hotmail.com; 654 04 39 30), amiga de Isabel Castillo '
     'Martin Palomero (mcasma1@oc.mde.es), que pide el presupuesto porque tienen reunion de vecinos.'),
    ('cordovin6', '2024-11-22', 'ADMINISTRACION ATOCHA', None, None,
     'CORDOVIN 6 MADRID. Fecha: 11/2024. Tipo de obra: ASCENSOR. Distrito Vicalvaro. CP 28032. 22/11/2024: presupuesto igual que el definitivo de Calahorra 26 (ojo, administracion).\n\n' + cl('cordovin6', 2024)),
    ('corregidordiegocabezadevaca20', '2025-11-11', 'JAVIER VELASCO (ELECNOR)', None, None,
     'CORREGIDOR DIEGO CABEZA DE VACA 20 MADRID. Fecha: 11/2025. Tipo de obra: ASCENSOR CON DERRIBO, igual que Camarena 200 pero metiendo 60 cm hacia dentro las puertas de los cuatro vecinos; mismo presupuesto que Camarena 200. '
     'Comercial interno: DANIEL.\n\n' + crudo('corregidordiegocabezadevaca20', 2025)),
    ('corregidorjosedepasamonte5-7-9', '2023-09-11', 'ADOLFO COLLADO (MC GESTION FINCAS)', None, '5037437VK4753G',
     'CORREGIDOR JOSE DE PASAMONTE 5-7-9 MADRID. Fecha: 10/2023 (primera nota 11/09/2023). Tipo de obra: SATE, cubierta, aerotermia, placas y caldera (la de gasoil, ver alternativas; mediciones tipo Iberdrola), y todas las subvenciones. '
     'Distrito 14 - Moratalaz (Marroquina). Ano 1973. 30/10/2023: cobrar el 6,5 % del PEM, sin DF ni CSS, con un porcentaje para Adolfo; PC supuesto 856.000.\n\n' + cl('corregidorjosedepasamonte5-7-9', 2023)),
    ('corregidorseñordelaelipa11', '2023-07-13', 'JAVIER (ELECNOR)', None, None,
     'CORREGIDOR SEÑOR DE LA ELIPA 11 MADRID. Fecha: 10/2023 (reunion con la comunidad y Javier el 13/07/2023). Tipo de obra: SATE + NEXT GENERATION. Distrito 14 - Moratalaz (Marroquina).\n\n' + cl('corregidorseñordelaelipa11', 2023)),
    ('costabrava18', '2023-10-01', 'ALVARO MARTIN CICERO (ELECNOR)', None, '9734406VK3893F0097RG',
     'CALLE COSTA BRAVA 18 MADRID. Fecha: 10/2023 (dia desconocido). Tipo de obra: SATE Y NEXT GENERATION. Distrito 08 - Fuencarral-El Pardo (Mirasierra). Direccion de contacto: Costa Brava 18, portal 6, 2o N. '
     'Diego Cordon Viani (dcordonv@gmail.com; 51097273-J). 03/11/2023: ver condiciones en el correo.\n\n' + cl('costabrava18', 2023)),
    ('cuatroamigos5-7', '2023-05-31', 'CONTACTO DE MONICA', None, '1599201VK4719H',
     'CUATRO AMIGOS 5-7 MADRID. Fecha: 05/2023. Tipo de obra: MEDICIONES para IBERDROLA (no 5, 2 escaleras; no 7, 2 escaleras). Distrito 06 - Tetuan (Almenara). Presentacion de la oferta a los vecinos el 31/05/2023.\n\n'
     + cl('cuatroamigos5-7', 2023))]
for carp, fecha, trajo, cif, ref, t, *ruta in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, ruta=ruta[0] if ruta else None)
fila('coslada7', '2024-10-10', 'cerrada', 'Perdida: "contestan que finalmente no van a hacer la obra" (02/12/2024).', 'JOANA (MORALES ABOGADOS)', None, None,
     'COSLADA 7 MADRID. Fecha: 10/2024. Tipo de obra: ACCESIBILIDAD (eliminar dos tramos de escalera hasta el ascensor: salvaescaleras o plataforma). Distrito Salamanca. CP 28028. Administracion: Morales Abogados '
     '(Joana, 650 48 98 33; abogados@moralesreventun.es). HE de proyecto de accesibilidad del portal e instalacion de plataforma 11/10/2024; presupuesto de Olivares enviado.\n\n'
     + cl('coslada7', 2024, ('2024-10-10', 'Sin fecha delante; la cita del 10/10.')))
for carp, fecha, trajo, t in [
        ('comandantefontanes11', '2019-02-20', 'PEDRO ARANDA (THYSSEN)', 'Calle COMANDANTE FONTANES 11 MADRID. Fecha: 2019 (la ficha, copiada, dice 01/2023). Distrito 11 - Carabanchel (San Isidro). Ficha vacia; hay un borrador de escalera.'),
        ('condevistahermosa32', '2018-01-01', 'PEDRO ARANDA (THYSSEN)', 'Calle CONDE VISTAHERMOSA 32 MADRID. Fecha: 01/2018. Distrito 11 - Carabanchel (Comillas). Ficha vacia; hay croquis.'),
        ('consueloguzman1', '2018-02-01', 'PEDRO ARANDA (THYSSEN)', 'Calle CONSUELO GUZMAN 1 MADRID. Fecha: 02/2018. Distrito 11 - Carabanchel (Buenavista). Ficha vacia; hay croquis.'),
        ('corregidorjuandebobadilla11', '2015-12-01', 'FELIPE OSADO (ENOR)', 'Calle CORREGIDOR JUAN DE BOBADILLA 11 MADRID. Fecha: 12/2015. Distrito 14 - Moratalaz (Vinateros). Contactos: Mario, 91 409 45 40; '
         'Mariano (3o A), 91 773 49 61. Ficha vacia; hay croquis.'),
        ('cortedelfaraon24', '2018-03-30', 'PEDRO ARANDA (THYSSEN)', 'Calle CORTE DEL FARAON 24 MADRID. Fecha: 03/2018. Distrito 17 - Villaverde (Angeles). Ficha vacia; hay croquis.'),
        ('cristodelavictoria177', '2018-01-01', 'PEDRO ARANDA (THYSSEN)', 'Calle CRISTO DE LA VICTORIA 177 MADRID. Fecha: 01/2018. Distrito 12 - Usera (Pradolongo). NZ 3.1.a. Ficha vacia; hay croquis.'),
        ('cruzdelsur17', '2017-11-18', 'LUIS MIGUEL NUNES (THYSSEN)', 'Calle CRUZ DEL SUR 17 MADRID. Fecha: 11/2017. Distrito 03 - Retiro (Estrella). Ficha vacia; hay croquis.'),
        ('corregidorjuandeboadilla37', '2019-06-18', None, 'CORREGIDOR JUAN DE BOBADILLA 37 MADRID (la carpeta dice "boadilla"). Carpeta SIN ficha de datos: modelo 3D (jun-2019).'),
        ('corregidorjuandebobadilla18', '2020-02-03', None, 'CORREGIDOR JUAN DE BOBADILLA 18 MADRID. Carpeta SIN ficha de datos: croquis (feb-2020).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 3. MANIAS (Junta de Puente de Vallecas, ascensor de Corral de Cantos 19 -> clon)
CC = ('corraldecantos19 (ascensor)', R('corraldecantos19' + B + 'ASCENSOR'))
mania('Escaleras: no exige un unico centro; comprueba que cada escalon cumpla por separado.', 'Junta Municipal de Distrito de Puente de Vallecas', '2022-03-17', CC[0], ruta=CC[1],
      tecnico='Elena Garcia', cita='Las escaleras en vallecas no tienen que tener un único centro, sino que comprueba que cumpla cada escalón por separado.')
mania('Si la cabina no es accesible (no cumple 1 x 1,25), no hace falta dejar el circulo de 1,20 para entrar; puede ser menor. Solo en este distrito.', 'Junta Municipal de Distrito de Puente de Vallecas', '2022-03-17',
      CC[0], ruta=CC[1], tecnico='Elena Garcia',
      cita='cuando la cabina no es accesible (no cumple los 1x125), no hace falta que dejen el 1.20 para entrar de diámetro; podría ser un círculo menor, pero solo en este distrito.')
mania('No acepta escaleras que tapen las ventanas de las plantas habitables ni el tramex (quiere algo que los ancianos pisen con seguridad); acepta escalera abierta tipo corrala, recta o a 45, sin cerramiento, solo barrotes.',
      'Junta Municipal de Distrito de Puente de Vallecas', '2022-03-17', CC[0], ruta=CC[1], tecnico='Elena Garcia',
      cita='NO LE HA GUSTADO LA SOLUCIÓN DEL TRAMEX. Quiere algo que los ancianos puedan pisar con seguridad. ... le parece bien la solución de escalera abierta. Si queremos podemos hacerla a 45º o dejarla recta. '
           'No poner ningún cerramiento, solo barrotes, para ventilación y luminosidad.')

resumen()
