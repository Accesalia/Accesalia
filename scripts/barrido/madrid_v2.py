# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda V2 (valverde36 .. viejadepinto13, carpetas [29:58] de la V). 7-oct-2026. Sin --escribir: marcha en seco.
# La V1 [0:29] y la V3 [58:87] (y la T y el resto) las preparan otros agentes a la vez.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de

HORTALEZA = 'd1f9fd48-7eba-4c25-a48e-892b03006d16'; PVALLECAS = 'df5e69f1-696b-4ae8-beba-63289e296c49'   # juntas que ya existen
TEC_PV = '85316d8d-29a2-4900-bd1b-0114e364d294'   # Junta de Puente de Vallecas, area Servicios Tecnicos (ya existe)
PU.update(aura_dbb='b65c97b7-94a9-415b-922c-061ed117c187', ofernandez_cega='86273a6d-d0f1-4e29-874e-4aba61764673',
          fgallego_cega='b65ec4b6-7517-47c9-b1c1-7acfe001e0f5', cristian_fain='32d175de-5346-4104-b39c-ac98ec0790cd',
          paz_ciudadela='46e3614d-97fd-40bf-baac-07d9bd5e601f', carlos_conde='b2f056f4-53a3-45f6-84fe-9f61548c1f92',
          vreal_fain='3606239e-1b7a-48c1-bea2-08c841efee80', miguel_taulex='94dbb0da-fad1-4515-a1e5-361a6fcea256')
VB46A = 'velezblanco46/ascensor/FICHA DATOS TECNICOS.docx'   # dos fichas en la carpeta: ascensor (2021, a produccion) y SATE (2023, a la clon)
VB46S = 'velezblanco46/sate/FICHA DATOS TECNICOS.docx'


def cid_de(prefijo):
    cs = b.leer('comunidades?select=id&municipio=eq.MADRID&nombre=like.' + quote(prefijo) + '*'); assert len(cs) == 1, prefijo
    return cs[0]['id']


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto (tachado pegado al nombre...)."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


def pc_unico(cid, nombre, rol, tel=None, doc=None, email=None, notas_=None):
    """pc() para roles que no son presidente, sin repetirla si el script se relanza."""
    ya = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&nombre=eq.%s' % (cid, quote(nombre)))
    return ya[0]['id'] if ya else pc(cid, nombre, rol, tel, doc, email, notas_)


def trae(pcid):
    return {'quien_persona_comunidad_id': pcid, 'persona_comunidad_id': pcid}


def cerrar_perdida(clave, motivo, fecha, notas_):
    if ESCRIBIR:
        oid = OPP[clave][1]
        if not b.leer('motivo_cierre_oportunidad?select=id&oportunidad_id=eq.' + oid):
            b.insertar('motivo_cierre_oportunidad', [{'oportunidad_id': oid, 'resultado_final': 'perdido', 'motivo_perdido': motivo, 'fecha_cierre': fecha, 'notas': notas_}])
            b.actualizar('oportunidades?id=eq.' + oid, {'estado': 'cerrada'})
    else:
        SECO.append('INSERT motivo_cierre_oportunidad x1: %s perdido (%s) %s + UPDATE oportunidades estado=cerrada' % (clave, motivo, fecha))


def alta_admin(nombre, notas_, nombre_legal=None, email=None):
    """administracion de fincas nueva que lleva una comunidad de PRODUCCION (criterio de Monica, 7-oct-2026). Copiada de madrid_s1.py."""
    ya = b.leer('empresa?select=id&nombre_accesalia=eq.' + quote(nombre))
    if ya: return ya[0]['id']
    i = nuevo_id()
    ins('empresa', [{'id': i, 'nombre_accesalia': nombre, 'nombre_legal': nombre_legal, 'tipo': 'administracion_fincas', 'activa': True, 'comercial_id': DANIEL, 'notas': notas_}])
    if email:
        ins('correo', [{'empresa_id': i, 'email': email, 'etiqueta': 'general', 'principal': True}])
    return i


def partir_m(n, i, marca, fecha, motivo):
    """partir() y a la segunda mitad se le anade el motivo de su fecha."""
    n = partir(n, i, marca, fecha); f, t = n[i + 1]
    return n[:i + 1] + [(f, t + '\n\n(' + motivo + ')')] + n[i + 2:]


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
cl = lambda c, a, s=None: J(fijar(c, a, s))

# ================================================================= 0. AGENDA (ninguna junta nueva; una administracion nueva: AGUILA, que lleva Verja 27 de produccion)
AGUILA = alta_admin('ADMINISTRACION AGUILA', 'Alta en el barrido de Madrid (Verja 27; carpeta verja27, ene-2025). En la ficha: "Administración de Fincas ÁGUILA, S.L."; '
                    'contacto Hugo Larrad Sainz.', nombre_legal='Administración de Fincas ÁGUILA, S.L.')
HUGO = persona_nueva('Hugo', 'Larrad Sainz', None, '659543404', 'hugo@administracionaguila.es', empresa=AGUILA,
                     notas_='Administracion Aguila: administrador de Verja 27 (ene-2025; carpeta verja27).')
persona_nueva('Olga', 'Moreno Cano', 'técnico municipal', None, 'morenocol@madrid.es', organismo=PVALLECAS, area=TEC_PV,
              notas_='Junta de Puente de Vallecas: tecnico de la licencia del ascensor de Venancio Martin 48 (expediente 350/2025/04942); el 25/09/2026 pide cambios en la '
                     'contestacion al requerimiento. Correo del departamento: tecnipvallecas@madrid.es.')
persona_nueva('Lola', None, 'técnico', '914220300', None, organismo=HORTALEZA,
              notas_='Junta de Hortaleza: tecnico de la licencia del ascensor de Velez Blanco 46 (expediente 350/2022/02188; carpeta velezblanco46). El apellido no es seguro: '
                     'en la ficha, "LOLA CANDOSCIO, CARDOSO, CANDOSO?". Correo del departamento: tecnihortaleza@madrid.es.')

# ================================================================= 1. PRODUCCION (11 carpetas, 11 oportunidades)
cvm39 = cid_de('VAZQUEZ DE MELLA 39')
angeles = pc_unico(cvm39, 'ANGELES MOLINA', 'otro', '660938838', None, 'anyulina000@gmail.com',
                   'Persona de contacto de la comunidad en la ficha (may-2026). En "quien contacta": "PRESIDENTA DE FRANCISCO MADARIAGA 15 de Olivares".')
rellenar('vm39', 'VAZQUEZ DE MELLA 39', 'vazquezdemella39', dict({'fecha_apertura': '2026-05-06',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: el modelo 3D, 06/05/2026; el .skb de ene-2026 es de plantilla). Contacta: Angeles Molina (660 938 838; anyulina000@gmail.com); '
                    'en la ficha, "PRESIDENTA DE FRANCISCO MADARIAGA 15 de Olivares". Tipo de obra: ASC (Daniel: derribo completo de escalera, ascensor de tres personas y '
                    'plataforma elevadora vertical a la entrada; presupuesto 230.000 EUR + IVA). HE con viabilidad enviada 14/05/2026. Comercial interno: DANIEL.'}, **trae(angeles)),
    ('ascensor', 'plataforma'),
    n=fijar('vazquezdemella39', 2026, ('2026-05-12', 'Sin fecha; es la valoracion de Daniel que va con la HE con viabilidad del 12/05/2026.')))

cvb46 = cid_de('VELEZ BLANCO 46')
arreglar_pc(cvb46, 'rol=eq.presidente', {'notas': 'En la ficha, "Presidente y vicepresidente (no sabemos quién es qué)": jesusmanuelfernandezdiaz@hotmail.com y '
                                                  'josemanuel-norris@hotmail.com ("jose manuel ambros deus PRESIDENTE"). Tachado: jcjarasan2003@hotmail.com.'})
rellenar('vb46', 'VELEZ BLANCO 46', 'velezblanco46', {'fecha_apertura': '2021-07-08', 'referencia_catastral': '4012997VK4831D',
    'origen_notas': 'Encargo del ASCENSOR (subcarpeta "ascensor"; el SATE de 2023 de la subcarpeta "sate" va aparte, a la clon). Fecha de llegada: la ficha dice xx/2021; '
                    'se toma la visita, 08/07/2021 (fotos; el DNI de jun-2021 es copia). En la carpeta hay ademas croquis, borrador y presupuesto de jul-2016 ("papeles viejos"). '
                    'Empresa/cliente: ELECNOR (tachado; contactos Ibai > Lucia Davila, tachados): "La comunidad se pasa a FAIN" (04/03/2024: "SE HAN IDO DE ELECNOR Y AHORA LO '
                    'QUIEREN HACER CON FAIN"); contacto ahora Vicente Real (FAIN). "RESTO LO PAGA LA COMUNIDAD". Tipo de obra: ASCENSOR + subv (nunci). Barrio: Apostol Santiago. '
                    'Tecnico: Carla ("valoracion asignar otro tecnico"). Jefes de obra: Juan Luis Ruiz de Mier y Abel Bernardos. Administracion: TAU LEX (Miguel / Maria Jose; '
                    'Pilar, secretaria; C. de Somontin 65, 28033; 91 574 98 27 / 656 253 677; m.josetorres@cafmadrid.es); antes, tachada, CRS GESTION FIN (Alfonso Rodriguez; '
                    'Arturo Soria 282; 605 627 152; info@crsgestion.es). Comunidad: CDAD PROP VELEZ BLANCO 46 MADRID (CIF H80718141). Cuenta: ES62 2100 0929 4013 0053 9564. '
                    'Presidente: Jose Manuel Ambros Deus (47017010L; 661 762 605; josemanuel-norris@hotmail.com). PEM 154.269,56 (julio 2022). Licencia por el Ayuntamiento '
                    '(procedimiento ordinario, mar-2022), expediente 350/2022/02188. Subvencion del Ayto 2022 concedida (sep-2023) y CAM 2025. En la carpeta, obra en marcha '
                    'desde ago-2024 (acta de replanteo, PSS, actas de obra con fotos hasta el 02/07/2026), retranqueo del Canal de Isabel II y fin de obra en preparacion. '
                    'El 01/10/2026 llega un BUROFAX de la comunidad: hablar con Daniel antes de enviar el CFO. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'df', 'subvenciones'),
    n=fijar(VB46A, 2023, ('2023-09-01', 'Sin dia en la ficha: "Septiembre 2023" (dia desconocido).')),
    comunidad={'iban': 'ES62 2100 0929 4013 0053 9564'},
    presi=('JOSE MANUEL AMBROS DEUS', 'presidente', '661762605', '47017010L', 'josemanuel-norris@hotmail.com'),
    adm=PU['miguel_taulex'], trae_pu=PU['vreal_fain'])

cvm20 = cid_de('VELEZ MALAGA 20')
joaquin = pc_unico(cvm20, 'JOAQUIN', 'vecino', '651892758', None, None, 'Contacto en la finca (correo de Aura, Del Brio y Blanco, 26/01/2026).')
rellenar('vm20', 'VELEZ MALAGA 20', 'velezmalaga20', {'fecha_apertura': '2026-01-26',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: el correo de Aura, 26/01/2026; el .skb del 12/01/2026 es de plantilla). Contacta: Aura (DEL BRIO Y BLANCO; '
                    'aura@delbrioyblanco.es): la comunidad quiere saber si es viable un ascensor. Contacto en la finca: Joaquin, 651 892 758. Tipo de obra: ASC. Escaneo 3D '
                    '12/02/2026; HE con viabilidad en manos de Alvaro para envio (12/02/2026). Comercial interno: ALVARO.'},
    ('ascensor',),
    n=fijar('velezmalaga20', 2026, ('2026-01-26', 'Correo de Aura (Del Brio y Blanco) del 26 de enero de 2026.'),
            otros={1: ('2026-02-12', 'En la ficha pone "12-02-206": errata por 2026.')}),
    adm=PU['aura_dbb'], trae_pu=PU['aura_dbb'], captador=ALVARO, lleva=ALVARO)

cvn48 = cid_de('VENANCIO MARTIN 48')
arreglar_pc(cvn48, 'rol=eq.presidente', {'nombre': 'CARLOS JIMENEZ PEREZ', 'documento': '51849230P',
                                         'notas': 'En la ficha, tachada: Nuria Reduello Montoro (2025), presidenta anterior.'})
pc_unico(cvn48, 'NURIA REDUELLO MONTORO', 'otro', '665520487', '05406401K', None,
         'Presidenta ANTERIOR: tachada en la ficha ("Nuria Reduello Montoro 2025"; DNI 05406401K, tambien tachado). Telefono: "665520487 (numero de presidenta Nuria)". '
         '13/01/2025: hay que citarla para revisar el proyecto con la comision de obras antes de visarlo.')
pc_unico(cvn48, 'PURI RUIZ', 'vecino', None, None, 'iripur@telefonica.net', 'De la comision de obras de la comunidad (correo del 14/02/2025: "la comision que estuvimos contigo el dia 6/2").')
rellenar('vn48', 'VENANCIO MARTIN 48', 'venanciomartin48', {'fecha_apertura': '2024-10-30', 'referencia_catastral': '4222610VK4742C',
    'origen_notas': 'Fecha de llegada: 10/2024 (dia: la primera nota, 30/10/2024, "ENVIADA HOJA DE ENCARGO"). Contacta: Daniel (DEL BRIO Y BLANCO; Calle Pena de la Miel 1, local, '
                    '28018; 91 477 41 91 / 680 503 243; daniel@delbrioyblanco.es); pedidos docs de la CP 13/01/2025. Tipo de obra: ASCENSOR con invasion de espacio publico + SUBV '
                    '(PRY y DF; al principio "SUBV SE LAS HACEN ELLOS"; HE de subvencion firmada 05/11/2025). Barrio: Numancia. Tecnico: Jhonatan -> Israel (requerimiento). '
                    'Fecha encargo: 23/12/2024. Ano 1962. Jefe de obra: Jose Olivares (ROSERSESE); la comunidad voto el presupuesto de Olivares (contrato Rosersese - Coinsa, '
                    'oct-2025). "OBRA CONDICIONADA A CONCESION DE SUBVENCION". Comunidad: CDAD PROP CL VENANCIO MARTIN 48 MADRID (CIF H80014046). Presidente: Carlos Jimenez Perez '
                    '(51849230P); antes, tachada, Nuria Reduello Montoro (2025). "Hay que avisar a la presidenta en cuanto se termine el proyecto". Visado TL/001885/2025. '
                    'Licencia por el Ayuntamiento, expediente 350/2025/04942: requerimiento; el 25/09/2026 la tecnico (Olga Moreno Cano) pide cambios en la contestacion. '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'df', 'subvenciones'),
    n=fijar('venanciomartin48', 2024, otros={2: ('2025-01-13', 'En la ficha pone 13/01/2024: errata por 2025 (va entre el 23/12/2024 y el 28/01/2025, y la llegada es de 10/2024).')}),
    adm=PU['dbrio'], trae_pu=PU['dbrio'])

n = partir_m(fijar('verja27', 2025), 1, '--------- Forwarded message', '2025-07-04', 'Correo de Oscar Fernandez (CEGA) del 4 de julio de 2025.')
rellenar('ve27', 'VERJA 27', 'verja27', {'fecha_apertura': '2025-01-22',
    'origen_notas': 'Fecha de llegada: 01/2025 (dia: la primera nota, 22/01/2025, "Llama oscar cega"). Contacta: Oscar Fernandez (CEGA; Director Comercial; 616 295 646; '
                    'o.fernandez@ascensorescega.com). Tipo de obra: ASCENSOR + SUBV; en jul-2025 CEGA pide precio de un estudio de viabilidad vinculante (HE enviada '
                    '07/07/2025). Administracion: Administracion de Fincas AGUILA, S.L. (Hugo Larrad Sainz; 659 543 404; hugo@administracionaguila.es) - alta en este barrido. '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=n, adm=HUGO, trae_pu=PU['ofernandez_cega'])

rellenar('vl130', 'VIA LUSITANA 130', 'vialusitana130', {'fecha_apertura': '2026-03-23',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia: el correo de Cristian Rodriguez, de FAIN, 23/03/2026). Contacta: Cristian Rodriguez Nieto (FAIN; '
                    'cristian.rodriguez@fainascensores.com). Tipo de obra: 2 ASC. A 1 ASC. TKE + PLATAFORMA (sustitucion completa + plataforma de accesibilidad; FAIN pide '
                    'honorarios de proyecto y DF completa). HE para proyecto de modificacion de 2 ascensores + plataforma elevadora y decoracion de portal, enviada a Monica para '
                    'su ok 14/04/2026 ("enviado"). Comercial interno: DANIEL.'},
    ('modificacion_asc', 'plataforma'),
    n=fijar('vialusitana130', 2026, ('2026-03-23', 'Correo de Cristian Rodriguez (FAIN) del 23 de marzo de 2026.')), trae_pu=PU['cristian_fain'])

rellenar('vj8', 'VICENTA JIMENEZ 8', 'vicentajimenez8', {'fecha_apertura': '2026-07-10',
    'origen_notas': 'Fecha de llegada: 07/2026 (dia: el correo de Carlos Garcia a Alejandra, 10/07/2026). Contacta: Paz Terradillos (CIUDADELA; 609 05 89 53, "LLAMAR SOLO A ESTE '
                    'TELEFONO"; 919 01 50 88; paz.terradillos@ciudadela.eu). Tipo de obra: SATE (envolvente termica, 950 m2; proyecto + gestion de subvenciones; coste de obra '
                    'aprox. 161.500 + IVA). HE enviada 13/07/2026. En la ficha: comercial interno CARLOS.' + EXT},
    ('sate', 'subvenciones'),
    n=fijar('vicentajimenez8', 2026, ('2026-07-10', 'Correo de Carlos Garcia del 10 de julio de 2026.')),
    adm=PU['paz_ciudadela'], trae_pu=PU['paz_ciudadela'], captador=ALVARO, lleva=ALVARO)

cvc1 = cid_de('VICENTE CAMARON 1')
pc_unico(cvc1, 'ANGEL', 'otro', '679507905', None, None,
         'En la nota del 18/11/2024: "Presidente Angel, 679507905". En los datos de la comunidad de la ficha el presidente es Benjamin Carmona Carmona.')
rellenar('vc1', 'VICENTE CAMARON 1', 'vicentecamaron1', {'fecha_apertura': '2024-11-18', 'referencia_catastral': '7432316VK3773C',
    'origen_notas': 'Fecha de llegada: 11/2024 (dia: la primera nota, 18/11/2024, "VER VIABILIDAD"). Contacta: Carlos (CONDE ASESORES, administrador; 91 479 41 39 - 660 443 286; '
                    'condeasesoresadmon@gmail.com). Tipo de obra: ASCENSOR + SUBV (por el hueco; HE de proyecto y subvencion). Tecnico: EA Indira / Jhonatan. Fecha encargo: '
                    '06/10/2025 (HE recibida). Ano 1957. Comunidad: COM. PROP. VICENTE CAMARON 1 (CIF E78259629; letra E: comunidad de bienes). Presidente: Benjamin Carmona '
                    'Carmona (01080438-J; 644 784 089); en la nota del 18/11/2024, "Presidente Angel, 679507905". Superficie 62,01 m2. Tramita la ECU (ACTECU): proyecto enviado '
                    '12/11/2025 y tasas de la ECU sin pagar (la comunidad no tiene tesoreria). El local de abajo no se puede escanear (el que lo usa no deja entrar): Daniel lo deja '
                    'PAUSADO hasta que la comunidad lo resuelva (09/03/2026); el 10/09/2026, "EL PROYECTO NO VALE, A LA ESPERA DE QUE CARLOS G NOS INFORME". '
                    'En la ficha: comercial CARLOS.' + CAPTO_CARLOS},
    ('ascensor', 'subvenciones'), n=fijar('vicentecamaron1', 2024), comunidad={'iban': 'ES95 0081 0513 4400 0149 8859'},
    presi=('BENJAMIN CARMONA CARMONA', 'presidente', '644784089', '01080438-J'),
    adm=PU['carlos_conde'], trae_pu=PU['carlos_conde'], captador=CARLOS, lleva=ALVARO)

rellenar('vca17', 'VICENTE CARBALLAL 17', 'vicentecarballal17', {'fecha_apertura': '2025-09-30',
    'origen_notas': 'Fecha de llegada: la ficha dice 10/2025; la nota de Carlos ("Tienen reunion el 8 de octubre, necesito el 3D urgente") es del 30/09/2025; se toma esa. '
                    'Paga el proyecto: EFFIC (agente rehabilitador). La ficha no dice quien contacta ni tipo de obra; en la carpeta, el escaneo de Carlos y el 3D (08/10/2025). '
                    'En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    (), n=fijar('vicentecarballal17', 2025), captador=CARLOS, lleva=ALVARO)

n = partir(fijar('vicentequesada3', 2025), 1, 'Tras junta de vecinos', '2025-11-15')
rellenar('vq3', 'VICENTE QUESADA 3', 'vicentequesada3', {'fecha_apertura': '2025-10-27',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: el modelo 3D del edificio y del garaje, 27/10/2025). Paga: la CP. Contacta: la comunidad. Tipo de obra: ASCENSOR (cuanto hay '
                    'que salir de fachada para un ascensor accesible, y un cuarto de basuras bajo la escalera). Tras la junta de vecinos, "deciden no hacer el ascensor" '
                    '(15/11/2025). En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), n=n, captador=CARLOS, lleva=ALVARO)
cerrar_perdida('vq3', 'tras la junta de vecinos deciden no hacer el ascensor', '2025-11-15',
               'En la ficha: "Tras junta de vecinos, deciden no hacer el ascensor 15-11-2025". Cerrada en el barrido de Madrid.')

cvi3 = cid_de('VIDRIERIA 3')
arreglar_pc(cvi3, 'rol=eq.presidente', {'notas': 'En la ficha: "PRESIDENTE (tiene voz de mujer – ES UNA PERSONA MAYOR QUE NECESITA AYUDA CON LOS TRÁMITES Y NO TIENE '
                                                 'CERTIFICADO DIGITAL)". "SIEMPRE EN COPIA A MERCEDES-CEGA (administracion@ascensorescega.com) Y A OSCAR (o.fernandez@ascensorescega.com)".'})
rellenar('vi3', 'VIDRIERIA 3', 'vidrieria3', {'fecha_apertura': '2025-06-01', 'referencia_catastral': '8055443VK4785E',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia desconocido; la primera nota es del 01/07/2025 y el certificado COAM de ene-2025 de la carpeta es una copia). Paga el '
                    'proyecto: CEGA. Contacta: Francisco Gallego (CEGA; 617 47 15 09; administracion@ascensorescega.com). Tipo de obra: ascensor con derribo de escalera + subv '
                    '(intervencion en suelo urbano; hay modelo de ascensor establecido por el ayuntamiento). Tecnico: KGS -> Israel (requerimiento). Fecha encargo: 11/07/2025 '
                    '(HE firmada). Ano 1960. "No tienen admin"; pedidos docs de la CP a CEGA 14/07, reclamados 29/07. Comunidad: CDAD PROP CL VIDRIERIA 3 MADRID (CIF H81833337). '
                    'Presidente: Juan Lopez Alarcon (51621141X; 670 45 32 81; sanblasjuan@yahoo.es): persona mayor que necesita ayuda con los tramites y no tiene certificado '
                    'digital; siempre en copia a Mercedes (CEGA, administracion@ascensorescega.com) y a Oscar (o.fernandez@ascensorescega.com). PEM 151.050,42. Visado '
                    'TL/012009/2025 (25/08/2025). Licencia por el Ayuntamiento, expediente 350/2025/24104 (requerimiento; consulta el 17/09/2026). Superficie 79,28. '
                    'Comercial interno: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('vidrieria3', 2025),
    presi=('JUAN LOPEZ ALARCON', 'presidente', '670453281', '51621141X', 'sanblasjuan@yahoo.es'), trae_pu=PU['fgallego_cega'])

# ================================================================= 2. CLON
REVS = [
    ('valverde36', '2022-10-26', 'RAUL CEREZO', 'H84478551', None,
     'VALVERDE 36 MADRID. Fecha: 10/2022 (dia: la nota y el presupuesto ciego, 26/10/2022). Contacto: Raul Cerezo ("El admin es amigo de Raul Cerezo"). Tipo de obra: REPARACIONES '
     'VARIAS (proyecto para arreglar los defectos aparecidos en la ITE). Distrito Centro. CP 28004. Administracion: Miguel Angel Ruiz (pedidos docs 09/01; C/ Puerto de Pozazal 4, '
     'local 20 bis, 28031; 91 290 28 38 - 91 434 53 65; mruiz@itacafincas.net) - por el correo, ITACA FINCAS, que esta en la agenda; Miguel Angel Ruiz no. Comunidad: CDAD PROP '
     'VALVERDE 36 MADRID (CL Valverde 36; CIF H84478551). Presidenta: Miriam Llamazares Garcia (71426681C; 696 507 573; miriamllamazaresgarcia@gmail.com). En la carpeta, acta, '
     'NIF, DNI de la presidenta y otorgamiento de representacion "DEFICIENCIAS" (ene-2023).\n\n' + crudo('valverde36', 2022)),
    ('vedra22', '2023-04-03', 'JUAN ANTONIO (FAIN)', None, None,
     'VEDRA 22 MADRID. Fecha: la ficha dice 05/2023; la nota es del 03/04/2023; se toma esa. Contacto: Juan Antonio (FAIN; no esta en la agenda). Tipo de obra: SATE Y CUBIERTA '
     '(conjunto de adosados en mancomunidad; es la vivienda de Juan Antonio). Distrito Puente de Vallecas. CP 28053. La carpeta solo tiene la ficha.\n\n' + crudo('vedra22', 2023)),
    ('velezblanco19', '2024-09-16', 'JAVIER VELASCO Y ALVARO MARTIN CICERO (ELECNOR)', None, None,
     'VELEZ BLANCO 19 MADRID. Fecha: 09/2024 (dia: la nota, 16/09/2024). Paga: la CP. Contacto: Javier Velasco y Alvaro Martin Cicero (ELECNOR). Tipo de obra: SATE + ASC + SUBV '
     '(presupuesto combinado con Next Generation y descuento, 16/09/2024). Distrito Hortaleza. CP 28033. Presidente: Alberto (608 089 776, "no coge el tlf, contesto por whatsapp"; '
     'albertogonvi@gmail.com). Vecino que queria estar en la visita: Luis (692 164 557; luispaulgallut@gmail.com). La carpeta solo tiene la ficha.\n\n' + crudo('velezblanco19', 2024)),
    ('velezrubio195', '2015-04-27', 'FELIPE (ENOR)', 'H79638516', '4114906VK4841C',
     'VELEZ RUBIO 195 MADRID. Fecha: 27/04/2015 (la de la ficha). Agente comercial: Felipe (ENOR). Tipo de obra: DERRIBO ESCALERA. PARADA EN PLANTA. Promotor: CP VELEZ RUBIO 195 '
     '(CIF H-79638516). Contacto: Manuel Garcia (608 508 989; electroantel@yahoo.es). Representante que firma: Maria Teresa (913 020 420). CP 28033. Fachada 20,4 m. PEM 50.000 '
     '(residuos 1.000). Superficie 43,40 m2. Distrito 16 - Hortaleza (Junta: Carretera de Canillas 2; 91 588 76 34); tramitacion: Lourdes Santa Maria; departamento tecnico: '
     'Susana, 91 588 76 44. Expediente 118/2016/2837 ("lo ha llevado Jose Ignacio"); resolucion positiva del 04/04/2016 ("la cabina medira 1.00 m"). En la carpeta, consulta '
     'urbanistica (2016), proyecto (2016-2017) y obra (2016-2019). La ficha no tiene notas.'),
    ('veza14', '2017-02-28', 'LUIS MIGUEL NUNES (THYSSEN)', 'H79662961', '1099712VK4719G',
     'VEZA 14 MADRID. Fecha: 28/02/2017 (la de la ficha). Agente comercial: Luis Miguel Nunes (THYSSEN). Tipo de obra: ascensor. Propiedad: CP VEZA 14. CP 28029. Fachada 13,80. '
     'PEM 50.000 (residuos 300). Superficie 39,10. Ordenanza NZ4. Distrito 06 Tetuan (departamento tecnico 91 588 66 30-33; negociado de licencias 91 588 66 44-48). '
     'Administracion: RODISA (Raul Diaz, 913 73 51 43; raul.diaz@administracionrodisa.es). Presidenta: Gloria Peregrina Perez (670 53 97 52; gloriaperegrina@gmail.com). '
     'Expediente 106/2017/4819; tecnico Miguel Duran (91 588 66 26; "su jefa se llama Gemma"). Visado COAM TL-016336-2017. Expediente de reclamacion de la bonificacion del '
     'ICIO, denegada: 205/2022/10522. En la carpeta, proyecto (2017-2018) y obra (2017-2022). La ficha no tiene notas.'),
    ('viacarpetana191', '2022-06-14', 'GUSTAVO GOMEZ (EXPRESS ELEVADORES)', None, None,
     'VIA CARPETANA 191 MADRID. Fecha: 06/2022 (dia: el correo de Gustavo Gomez, 14/06/2022). Contacto: Gustavo Adolfo Gomez (EXPRESS ELEVADORES), que pide presupuesto urgente '
     'del ascensor (en su dia lo presupuesto INVER). Tipo de obra: ASCENSOR. Distrito Carabanchel. CP 28047. En la carpeta, medidas, plano y croquis (jun-2022).\n\n'
     + crudo('viacarpetana191', 2022)),
    ('vicalvaro68', '2025-03-21', 'CRISTINA (AFASONER)', None, None,
     'AV. CANILLEJAS A VICALVARO 68 MADRID. Fecha: 03/2025 (dia: el correo de Afasoner, 21/03/2025). Contacto: Cristina, administradora (AFASONER SL; afasoner@gmail.com), que pide '
     'en el mismo correo presupuesto para German Perez Carrasco 58. Tipo de obra: proyecto y realizacion de rampa. Distrito San Blas-Canillejas. CP 28022. Presidente: Luis '
     '(655 180 322). HE de proyecto enviada 24/03/2025. En produccion esta Av. Canillejas a Vicalvaro 63, no este numero. La carpeta solo tiene la ficha.\n\n' + crudo('vicalvaro68', 2025)),
    ('vicentecamaron16', '2024-05-14', 'JAVIER (GRUPO TREBOL)', None, None,
     'VICENTE CAMARON 16 MADRID. Fecha: 05/2024 (dia: la nota, 14/05/2024). Cliente: la comunidad; contacto Javier (GRUPO TREBOL; Cayetano Pando 2, 28047; 91 526 54 90 / '
     '699 086 641; trebol.fincas@gmail.com). Contacto de la comunidad: Almudena, 680 837 446. Tipo de obra: ASCENSOR (derribo de escalera, ascensor de 5 personas por DR con ECU; '
     'coste estimado 175.000 EUR). Distrito Latina. CP 28011. La carpeta solo tiene la ficha.\n\n' + crudo('vicentecamaron16', 2024)),
    ('viejadepinto13', '2025-04-25', 'SUSANA GOMEZ SANZA (VECINA, VIA WEB)', None, None,
     'VIEJA DE PINTO 13 MADRID. Fecha: la ficha dice 04/2025 (dia: la nota, 25/04/2025). Contacto: Susana Gomez Sanza, vecina, via la web de Accesalia (618 246 052; '
     'susanagomezsanza@gmail.com). Tipo de obra: ASCENSOR. Distrito Villaverde. CP 28021. En la carpeta, 3D con tres opciones (05/05/2025) e informe de viabilidad (13/05/2025).\n\n'
     + crudo('viejadepinto13', 2025)),
    ('velezblanco46 (2023)', '2023-06-22', 'ELECNOR (ALVARO, TACHADO) / TAU LEX (MIGUEL / MARIA JOSE)', None, None,
     'VELEZ BLANCO 46 MADRID, encargo del SATE (subcarpeta "sate" de velezblanco46). El ascensor de 2021 de la misma comunidad esta en la oportunidad de produccion. Fecha: la ficha '
     'dice 07/2023; la primera nota es del 22/06/2023 ("Monica manda hoja de encargo"); se toma esa. Empresa/cliente: ELECNOR (tachado; contacto Alvaro, tachado); contacto ahora '
     'Miguel / Maria Jose (TAU LEX). Tipo de obra: SATE Y CUBIERTA + SUBVENCION (programa 5). Distrito 16 - Hortaleza (Apostol Santiago). Administracion: TAU LEX (C. de Somontin 65, '
     '28033; Pilar, secretaria; 91 574 98 27 / 656 253 677; m.josetorres@cafmadrid.es). En la carpeta, presupuesto modificado con financiacion (jul-2023). El 16/06/2025 '
     '"el comercial de Velez Blanco 46" quiere encargar el proyecto de SATE y llevarlo a la subvencion del Ayto.\n\n' + crudo(VB46S, 2023), R('velezblanco46' + B + 'sate')),
]
for carp, fecha, trajo, cif, ref, t, *ruta in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, ruta=ruta[0] if ruta else None)

for carp, fecha, trajo, t in [
        ('velarde16', '2017-09-19', 'LUIS MIGUEL NUNES (THYSSEN)',
         'VELARDE 16 MADRID. Fecha: la ficha dice 13/02/2018; las fotos de la visita son del 19/09/2017; se toma esa. Ficha vacia; hay croquis, borrador de escalera y plano '
         '(feb-mar 2018) y render (may-2018).'),
        ('viacarpetana143', '2017-02-18', 'NICOLAS, PARA PEDRO ARANDA (THYSSEN)',
         'VIA CARPETANA 143 MADRID. Fecha: 18/02/2017 (la de la ficha). Ficha vacia salvo "Propiedad: CP VIA CARPETANA 143", ordenanza NZ4, distrito Carabanchel. Hay croquis y '
         'presupuesto (mar-abr 2017), ofertas de ENGWE (sep-2017) y de FAIN (mar-2018) y plano tipo (jun-2018).'),
        ('viacarpetana180', '2016-10-17', 'PEDRO ARANDA (THYSSEN)',
         'VIA CARPETANA 180 MADRID. Fecha: 17/10/2016 (la de la ficha). Ficha vacia; hay croquis, borrador de escalera, plano y presupuesto (oct-2016).'),
        ('viacarpetana199', '2016-04-25', 'FELIPE OSADO (ENOR)',
         'VIA CARPETANA 199 MADRID. Fecha: 25/04/2016 (la de la ficha). Ficha vacia salvo el correo de Felipe Osado (ENOR; osado@enor.es): "veas si es posible la instalacion de dos '
         'ascensores, uno para cada escalera. Ten en cuenta que hay viviendas en los sotanos". Hay croquis, borrador de escalera, plano y presupuesto (may-2016).'),
        ('victormanuelIII5', '2017-04-10', 'PEDRO ARANDA (THYSSEN)',
         'C/ VICTOR MANUEL III 5 MADRID. Fecha: 10/04/2017 (la de la ficha). Ficha vacia; hay croquis (abr-2017).'),
        ('venanciomartin36', '2016-11-04', None,
         'VENANCIO MARTIN 36 MADRID. Carpeta SIN ficha de datos: oferta de ascensor de ENOR a Rehabilitaciones Tecnicas INVER (04/11/2016) y presupuesto de obra civil '
         '(derribo de escalera, nov-2016).'),
        ('viacarpetana83', '2015-04-15', None,
         'VIA CARPETANA 83 MADRID. Carpeta SIN ficha de datos: presupuesto de obra civil para un ascensor de cinco paradas (abr-2015).'),
        ('viacarpetana', '2018-04-05', None,
         'VIA CARPETANA (sin numero) MADRID. Carpeta SIN ficha de datos: planos inicial y completo "M1801807" (abr-2018). El lector la caso con VIA CARPETANA 348 DUPLICADO '
         'CARABANCHEL de produccion, pero nada en la carpeta dice el 348: no se casa.'),
        ('veza', '2018-09-02', None,
         'VEZA (sin numero) MADRID. Carpeta SIN ficha de datos: un DATOS.docx ("REHABILITACION DE OBRA DE GLORIA. Lo presupuestara DIAN"), un pdf "Gloria. 6,35" y planos de estado '
         'actual y reformado (sep-2018). (La presidenta de Veza 14 en 2017 era Gloria Peregrina; la carpeta no dice si es la misma.)')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 3. MANIAS
mania('El modelo homogeneo de ascensor en via publica, que es muy antiguo, hay que adaptarlo a la normativa actual: paso de acera frente al ascensor de al menos 1,20 m, '
      'retranqueado de la linea de aparcamiento (5 cm + los 15 cm de la linea); laterales en diagonal por los coches que aparcan pegados al bordillo; muro de ladrillo de 1,5 m; '
      'y ascensor transparente.', 'Ayuntamiento de Madrid (modelo homogeneo; licencia del ascensor, San Blas-Canillejas)', '2026-09-17', 'vidrieria3', clave='vi3',
      trozo='adaptar el modelo')

resumen()
