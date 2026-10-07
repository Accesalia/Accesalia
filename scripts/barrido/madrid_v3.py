# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda V3 (villaamil38 .. vizcaya11, carpetas [58:87] de la V). 7-oct-2026. Sin --escribir: marcha en seco.
# La V1 [0:29] y la V2 [29:58] (y la T y el resto) las preparan otros agentes a la vez.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de

MYL = '7d4d4bd4-708c-40aa-a4f2-7d517710e8d6'; AEA_VILLAVERDE = '5e61503c-a458-430f-8ffb-0d4f02427860'; ARRIALSI = '9c4b40b3-0f8d-4082-a637-8a53e7beb05a'
AGISA = 'a32fc94c-1f70-42fa-b9ae-3da772396918'; GACOM = '6ff61d6b-743c-4db1-ba1c-bff417f66c0a'
PU.update(olivares='fe2ea8b4-9be7-42b8-b64f-d644fa8198b1', vanesa_dbb='05cda534-6907-43b0-b674-53cbe143a278', joserra='1fcd2334-fe92-4180-afb8-a9c9c547f238',
          effic_jf='07c4b0f4-059c-46a2-82f2-453a189a906b', jgonzalez_sch='5a588515-9c02-4058-8e31-7e51dec4737f', alba='61038fa7-f2fa-4dfa-a169-dae52465513c',
          ibai='129a505b-a0b0-4b3e-8102-42197b237a98')
O47 = 'virgendelaoliva47/sate/FICHA DATOS.docx'   # la ficha esta en la subcarpeta "sate"


def cid_de(prefijo):
    cs = b.leer('comunidades?select=id&municipio=eq.MADRID&nombre=like.' + quote(prefijo) + '*'); assert len(cs) == 1, prefijo
    return cs[0]['id']


def pc_unico(cid, nombre, rol, tel=None, doc=None, email=None, notas_=None):
    """pc() para roles que no son presidente, sin repetirla si el script se relanza."""
    ya = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&nombre=eq.%s' % (cid, quote(nombre)))
    return ya[0]['id'] if ya else pc(cid, nombre, rol, tel, doc, email, notas_)


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto (telefono o cargo pegado al nombre)."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)
    return d[0]['id'] if len(d) == 1 else None


def relevar_admin(cid, emp_viejo, puesto_nuevo, nota, hasta=None):
    """la administracion vigente esta TACHADA en la ficha: deja de ser vigente y entra la nueva."""
    for a in b.leer('comunidad_admin_responsable?select=id&vigente=eq.true&empresa_id=eq.%s&comunidad_id=eq.%s' % (emp_viejo, cid)):
        act('comunidad_admin_responsable?id=eq.' + a['id'], dict({'vigente': False, 'notas': nota}, **({'hasta': hasta} if hasta else {})))
    emp = EMPRESA_DE.get(puesto_nuevo) or b.leer('puesto?select=empresa_id&id=eq.' + puesto_nuevo)[0]['empresa_id']
    if not b.leer('comunidad_admin_responsable?select=id&vigente=eq.true&empresa_id=eq.%s&comunidad_id=eq.%s' % (emp, cid)):
        ins('comunidad_admin_responsable', [{'comunidad_id': cid, 'empresa_id': emp, 'puesto_id': puesto_nuevo, 'vigente': True}])


def alta_admin(nombre, notas_, telefono=None, direccion=None, email=None):
    """administracion de fincas nueva que lleva una comunidad de PRODUCCION (criterio de Monica, ADMONPATRIMONIOS, 7-oct-2026)."""
    ya = b.leer('empresa?select=id&nombre_accesalia=eq.' + quote(nombre))
    if ya: return ya[0]['id']
    i = nuevo_id()
    ins('empresa', [{'id': i, 'nombre_accesalia': nombre, 'tipo': 'administracion_fincas', 'activa': True, 'comercial_id': DANIEL,
                     'telefono': telefono, 'direccion': direccion, 'notas': notas_}])
    if email and not b.leer('correo?select=id&email=ilike.' + quote(email)):
        ins('correo', [{'empresa_id': i, 'email': email, 'etiqueta': 'general', 'principal': True}])
    return i


def trae(pcid):
    return {'quien_persona_comunidad_id': pcid, 'persona_comunidad_id': pcid}


def motivo(n, i, m):
    f, t = n[i]; n[i] = (f, t + '\n\n(' + m + ')'); return n


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
cl = lambda c, a, s=None: J(fijar(c, a, s))

# ================================================================= 0. AGENDA (ninguna junta nueva)
# ASEPRO ASESORES: administracion de Villamanin 48 (comunidad de PRODUCCION) que no estaba en la agenda -> alta (criterio ADMONPATRIMONIOS).
ASEPRO = alta_admin('ASEPRO ASESORES', 'Alta en el barrido de Madrid: administracion de Villamanin 48 (ficha de feb-2026; carpeta villamanin48). Contacto: Antonio Blanco.',
                    telefono='914630389')
ANTONIO_ASEPRO = persona_nueva('Antonio', 'Blanco', 'administrador', '914630389', None, empresa=ASEPRO,
                               notas_='Asepro Asesores: administrador y contacto de Villamanin 48 (feb-2026; carpeta villamanin48). Sin correo en la ficha.')
# INMHO de Arganzuela: administracion vigente de Villasandino 10 (comunidad de PRODUCCION) "vigente a mayo 2026"; en la agenda solo estan las oficinas de
# MOSTOLES, GETAFE y VALLECAS. Misma direccion que la de GACOMUNIDADES en la agenda (la administracion anterior, tachada). -> alta como oficina nueva (DUDA).
INMHO_ARG = alta_admin('INMHO Gestion de la Propiedad (ARGANZUELA)',
                       'Alta en el barrido de Madrid: en la ficha de Villasandino 10, "INMHO (vigente a mayo 2026)", P.o de Juan Antonio Vallejo-Najera Botas 56, Arganzuela, 28005 '
                       '(la misma direccion que tiene GACOMUNIDADES en la agenda, la administracion anterior, tachada en la ficha); carpeta villasandino10. '
                       'En la agenda ya estaban las oficinas de MOSTOLES, GETAFE y VALLECAS.',
                       telefono='915179064', direccion='P.o de Juan Antonio Vallejo-Najera Botas, 56, Arganzuela, 28005 Madrid')
SILVIA = persona_nueva('Silvia', 'Zimmer', 'administradora', '915179064', 'silvia.zimmer@inmho.es', empresa=INMHO_ARG,
                       notas_='INMHO: administradora de Villasandino 10, vigente a mayo 2026 (carpeta villasandino10).')
DANIEL_MYL = persona_nueva('Daniel', None, 'administrador', None, 'danielalvarez@martinylorente.es', empresa=MYL,
                           notas_='Martin y Lorente: contacto de Villafuerte 17 (may-2026) y Villafuerte 23 (sep-2026); carpetas villafuerte17 y villafuerte23.')
ALFONSO = persona_nueva('Alfonso', None, 'administrador', None, None, empresa=ARRIALSI,
                        notas_='Arrialsi ("ALFONSO ARRIALSI"): contacto de Virgen de Aranzazu 27 (jul-2025) y 21 (jul-2026); carpetas virgendearanzazu27 y virgendearanzazu21. '
                               'Sin correo propio: en la ficha, los de la empresa (info@arrialsi.com; secretaria@arrialsi.com) y sus telefonos (917 307 033 / 665 805 356).')
ANGELES = persona_nueva('Ángeles', None, 'empleada', '722857265', None, empresa=AEA_VILLAVERDE,
                        notas_='AEA Fincas Villaverde: "Angeles empleada de joserra" (Jose Ramon Lopez); es quien contacta a Daniel por Villajoyosa 67 (jun-2025; carpeta villajoyosa67).')
EDUARDO_AGISA = persona_nueva('Eduardo', None, 'administrador', '913043610', 'eduardobarranquero@agisa.es', empresa=AGISA,
                              notas_='AGISA: administrador de Virgen de la Oliva 43 y 45, del conjunto homogeneo de Virgen de la Oliva 49 (nota del 13/02/2025; carpeta virgendelaoliva49).')

# ================================================================= 1. PRODUCCION (19 carpetas, 19 oportunidades)
rellenar('va64', 'VILLAAMIL 64 MADRID', 'villaamil64', {'fecha_apertura': '2020-02-25', 'referencia_catastral': '0193212VK4709C',
    'origen_notas': 'Fecha de llegada: 25/02/2020 (la fecha de inicio de la ficha; los primeros ficheros, fotos, croquis y plano, son del 27/02/2020). Agente comercial: Jose Olivares '
                    '(ROSERSESE). Tipo de obra: INSTALACION DE ASCENSOR EN EDIFICIO RESIDENCIAL EXISTENTE. Barrio: Berruguete. Propiedad: CDAD PROP CL VILLAAMIL 64 MADRID (CIF '
                    'H79965547). CP 28039. PEM 103.827,97. Expediente 106/2020/05159. Ambito NZ4. Visado del proyecto TL/013297/2020 (nov-2020); CFO TL/008282/2025. Tecnico: Dennis; '
                    'requerimientos: Carla. Contactos de obra: Eddie, 624 850 184 (subcontrata de Rosersese); Javier, de Coinsa (coinsa@ascensorescoinsa.com; en la agenda, en COINSA '
                    'ASCENSORES, esta Francisco Javier Parra con otro correo). La licencia la tramito Rosersese. En la carpeta, "reclamacion comunidad": burofax del administrador de '
                    'fincas de Villaamil a Rosersese/CNAF (06/05/2022), que Rosa pasa a la oficina "para contestar"; fin de obra (fotos 04/04/2025), CFO y certificado final a origen '
                    '(jun-2025), acta de inicio (feb-2026) e informe de obra terminada (27/04/2026). La ficha no tiene notas ni comercial interno; la lleva Daniel.'},
    ('ascensor',), comunidad={'cif_comunidad': 'H79965547'}, trae_pu=PU['olivares'])

cvm28 = cid_de('VILLA DE MARIN 28')
corella = pc_unico(cvm28, 'JORGE CORELLA', 'vecino', '687101830', None, 'jcorellaramos@gmail.com', 'Persona de contacto de la comunidad; es quien contacta (ficha, feb-2026).')
rellenar('vm28', 'VILLA DE MARIN 28', 'villademarin28', dict({'fecha_apertura': '2026-02-09',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: el escaneo 3D y la ficha, 09/02/2026; el .skb del 12/01/2026 es de plantilla: el mismo fichero, con la misma hora, esta en '
                    'villamanin48). Contacta: Jorge Corella (687 10 18 30; jcorellaramos@gmail.com), persona de contacto de la comunidad. Tipo de obra: ASC (SUSTITUCION) Y BAJADA '
                    'COTA CERO. CP 28029. La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + EXT}, **trae(corella)),
    ('modificacion_asc', 'cota_cero'), captador=ALVARO, lleva=ALVARO)

cvf17 = cid_de('VILLAFUERTE 17')
javier17 = pc_unico(cvf17, 'JAVIER', 'vecino', None, None, 'javidavid85@gmail.com', 'Vecino; es quien contacta (ficha, may-2026).')
rellenar('vf17', 'VILLAFUERTE 17', 'villafuerte17', dict({'fecha_apertura': '2026-05-14',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: el escaneo 3D, 14/05/2026). En el titulo de la ficha, "VILL.BAJO" (Villaverde Bajo). Contacta: Javier, vecino '
                    '(javidavid85@gmail.com). Administracion: MARTIN Y LORENTE (Daniel; danielalvarez@martinylorente.es). La ficha no dice tipo de obra. Informe de viabilidad '
                    'y HE enviados 18/05/2026. Comercial interno: ALVARO.'}, **trae(javier17)),
    (), n=fijar('villafuerte17', 2026, ('2026-05-18', 'Sin fecha delante; la fecha va dentro de la nota.')), adm=DANIEL_MYL, captador=ALVARO, lleva=ALVARO)

EFFIC_CORREO = ('2025-09-10', 'Correo de Juan Francisco Martinez (EFFIC) del 10 de septiembre de 2025, que pide visita para Villagarcia 8 y 10; debajo, la valoracion de Daniel.')
rellenar('vg10', 'VILLAGARCIA 10 MADRID', 'villagarcia10', {'fecha_apertura': '2025-09-10', 'referencia_catastral': '6031311VK3763A',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia: el correo de EFFIC, 10/09/2025, por Villagarcia 8 y 10). Contacta: ahora Javier Gonzalez (SCHINDLER); antes, tachado en la '
                    'ficha, Juan Francisco (EFFIC, contrata-agente rehabilitador). Tipo de obra: ASCENSOR + SATE ("exactamente igual que el de Villagarcia 8 pero simetrico"). HE '
                    'enviada con viabilidad de obra 26/09/2025; el 04/11/2025, visitado con Javier Gonzalez (Schindler) y enviados honorarios de proyecto + subvencion. En la ficha: '
                    'comercial interno CARLOS (antes, tachado, "DANIEL y Carlos Schindler"); la nota del 04/11/2025 dice "Carlos Garcia (hablado con Monica)".' + CAPTO_CARLOS},
    ('ascensor', 'sate', 'subvenciones'), n=fijar('villagarcia10', 2025, EFFIC_CORREO), trae_pu=PU['jgonzalez_sch'], captador=CARLOS, lleva=ALVARO)

rellenar('vg8', 'VILLAGARCIA 8 MADRID', 'villagarcia8', {'fecha_apertura': '2025-09-10', 'referencia_catastral': '6031349VK3763A',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia: el correo de EFFIC, 10/09/2025, por Villagarcia 8 y 10; el escaneo 3D es del 23/09/2025). Contacta: Juan Francisco Martinez '
                    '(EFFIC; juan.martinez@effic.es), contrata-agente rehabilitador. Tipo de obra: ASCENSOR + SATE (ascensor doble embarque de siete paradas para 3 personas, derribo '
                    'completo de escalera sin tocar contadores, remodelacion completa del portal). HE enviada con viabilidad 26/09/2025. Comercial interno: DANIEL.'},
    ('ascensor', 'sate'), n=fijar('villagarcia8', 2025, EFFIC_CORREO), trae_pu=PU['effic_jf'])

rellenar('vj67', 'VILLAJOYOSA 67 MADRID', 'villajoyosa67', {'fecha_apertura': '2025-06-05', 'referencia_catastral': '1476735VK4617E',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: la primera nota, 05/06/2025). Contacta: Joserra, Jose Ramon Lopez (AEA FINCAS, equipo de administradores de Villaverde; '
                    'socio de Adolfo Collado; 672 862 102; villaverde@aeafincas.es; su correo personal, Joseramon3l@hotmail.com, "no usar"); llama a Daniel Angeles, empleada de '
                    'Joserra (722 857 265). Tipo de obra: SATE CON CESION CAES + BAJADA A COTA 0 ASCENSOR (sustituir el ascensor por uno mas ancho y profundo para silla de ruedas; '
                    'SATE en proyecto aparte; HE aparte de subvenciones). HE enviada 13/06/2025. Junta el 30/06/2025 para votar ascensor y SATE, con Mari Jose (UCI) para la '
                    'financiacion; presupuestos y financiacion de EXCELSIOR (19/06/2025). 3D presentado a los vecinos el 01/07/2025 (en la carpeta el 3D se llama "Villajoyosa 27"). '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('sate', 'caes', 'cota_cero', 'subvenciones'), n=fijar('villajoyosa67', 2025), adm=PU['joserra'], trae_pu=PU['joserra'])

rellenar('vl73', 'VILLALOBOS 73 MADRID', 'villalobos73', {'fecha_apertura': '2026-05-18', 'referencia_catastral': '5004212VK4750C',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: la ficha, 18/05/2026, el unico fichero). Contacta: Vanesa (DEL BRIO Y BLANCO). Tipo de obra: IEE. La ficha no tiene notas. '
                    'Comercial interno: ALVARO.'},
    ('iee',), adm=PU['vanesa_dbb'], trae_pu=PU['vanesa_dbb'], captador=ALVARO, lleva=ALVARO)

rellenar('vm20', 'VILLAMANIN 20 MADRID', 'villamanin20', {'fecha_apertura': '2025-11-07', 'referencia_catastral': '6635618VK3763F',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia: el correo de Carlos con el zip del 3D, 07/11/2025: "Para crear carpeta. No hacer 3D"). La ficha no dice contacto ni tipo de '
                    'obra. En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    (), n=fijar('villamanin20', 2025, ('2025-11-07', 'Sin fecha delante; la fecha va en el asunto del correo (07/11/2025).')), captador=CARLOS, lleva=ALVARO)

cvm37 = cid_de('VILLAMANIN 37')
andres = arreglar_pc(cvm37, 'rol=eq.presidente', {'nombre': 'ANDRES CUBINO BOHOYO', 'telefono': '696923641', 'email': 'andrescubino@gmail.com',
                                                   'notas': 'Presidente y arquitecto; propietario del 6o A y 6o B (en la ficha iba pegado al nombre: "PRESIDENTE y arquitecto 6 A y 6B").'})
pc_unico(cvm37, 'MANUEL MARTIN', 'vecino', None, None, 'mamargo@gmail.com',
         'Vecino ("Manuel Martin VILLAMANIN"); su correo esta en la ficha junto al del presidente y va en copia de sus correos (jun-jul 2025).')
pc_unico(cvm37, 'ANA', 'otro', '696209041', None, None, 'Portera de la finca (ficha).')
n = _notas_de('villamanin37', 2023)
n = partir(n, 3, '---------- Forwarded message', '2025-07-17')
n = partir(n, 1, 'Mail a ECU 26-07-2023', '2023-07-26')
n[4] = ('2025-06-03', n[4][1] + '\n\n(Correo de Andres Cubino del 3 de junio de 2025; delante lleva suelta la fecha 24/01/2024 de la nota anterior.)')
n = motivo(n, 5, 'Correo reenviado por Andres Cubino el 17 de julio de 2025.')
assert all(f for f, t in n), n
rellenar('vm37', 'VILLAMANIN 37 MADRID', 'villamanin37', dict({'fecha_apertura': '2023-03-22', 'referencia_catastral': '6333423VK3763C',
    'origen_notas': 'Fecha de llegada: 03/2023 (dia: la primera nota, 22/03/2023). Contacta: Andres Cubino Bohoyo, presidente y arquitecto (696 923 641; andrescubino@gmail.com). '
                    'Paga: la CDAD. Tipo de obra: SATE + CUBIERTA + SUBVENCION + CSS (Next Generation). Barrio: Lucero. Tecnico: Israel. Fecha encargo: 19/05/2023. Ano 1970. '
                    'Administracion: CONDE ASESORES (Carlos; C/ de los Sagrados Corazones 23, 28011; 914 79 41 39 / 660 443 286; condeasesoresadmon@gmail.com; de 9:30 a 14:00 de '
                    'lunes a viernes y martes y jueves de 17 a 19:30). Portera: Ana, 696 209 041. Constructora: RONAFE (Pedro Rodriguez, 678 743 334, ronafe@telefonica.net; facturas: '
                    'Pedro, el padre, 607 318 477) - no esta en la agenda. Tramitado por la ECU (ACTECU), por LICENCIA: expediente 350/2023/27213. PEM 311.811,79. Visado '
                    'TL/011696/2023; CFO TL/010101/2026. NZ 3.1.a, zona APIRU. Superficie 452,19. Obra prevista para sep-2025 (andamios puestos el 01/09/2025); HE de CSS firmada '
                    '21/08/2025; HE de adecuacion del proyecto a los cambios de cubierta hechos por la comunidad firmada en jun-2026. En la carpeta, subvencion CAM Next Generation '
                    '2022: Programa 3 concedido (26/05/2026, con requerimiento de justificacion el 06/10/2026) y Programa 5 desestimado por agotamiento. La ficha no dice comercial '
                    'interno; la lleva Daniel.'}, **(trae(andres) if andres else {})),
    ('sate', 'cubierta', 'subvenciones', 'css'), n=n, comunidad={'iban': 'ES10 0234 0001 0310 0262 6024'})

rellenar('vm48', 'VILLAMANIN 48', 'villamanin48', {'fecha_apertura': '2026-02-23', 'referencia_catastral': '6031302VK3763A',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: la ficha, 23/02/2026; el escaneo 3D es de mar-2026 y el .skb del 12/01/2026 es de plantilla: el mismo fichero, con la misma '
                    'hora, esta en villademarin28). Contacta: Antonio Blanco (ASEPRO ASESORES, la administracion; 914 63 03 89). Tipo de obra: BAJADA A COTA 0. CP 28011. La '
                    'ficha no tiene notas. En la ficha: comercial interno CARLOS.' + EXT},
    ('cota_cero',), adm=ANTONIO_ASEPRO, trae_pu=ANTONIO_ASEPRO, captador=ALVARO, lleva=ALVARO)

cvs10 = cid_de('VILLASANDINO 10')
n = partir(fijar('villasandino10', 2024), 10, '---------- Forwarded message', '2025-10-01')
n = motivo(n, 11, 'Correo de Gines Granados, presidente, del 1 de octubre de 2025.')
rellenar('vs10', 'VILLASANDINO 10 MADRID', 'villasandino10', {'fecha_apertura': '2024-04-02', 'referencia_catastral': '6333440VK3763C',
    'origen_notas': 'Fecha de llegada: 04/2024 (dia: la primera nota, 02/04/2024; los ficheros sueltos anteriores de la carpeta, el manual de uso de may-2023 y la justificacion de '
                    'escalera de mar-2024, parecen de plantilla). Contacta: "A traves de Jonatan" (el tecnico). Paga: la CP. Tipo de obra: ASCENSOR CON DERRIBO Y SUBVENCIONES. '
                    'Tecnico: Jonatan -> Dario -> Carla. Fecha encargo: 17/05/2024. Ano 1966. Licencia por la ECU (ACTECU), expediente 350/2024/27705, aprobada 20/03/2025. '
                    'Administracion: INMHO (vigente a mayo 2026; Silvia Zimmer, 915 179 064, silvia.zimmer@inmho.es; P.o de Juan Antonio Vallejo-Najera Botas 56, 28005); antes, '
                    'tachadas: GA COMUNIDADES (Antonio Vila - Tamara Vila; Calle Asterix 6, Rivas-Vaciamadrid; 615 376 831 / 625 301 315; gacomunidades@hotmail.com, '
                    'gactamara@hotmail.com) y AFIMOR (Antonio Vila; C/ Del Cine 42; Simona, Mario Moral, Soledad Gutierrez; 915 189 336; 658 86 05 17; simona@afimor.com, '
                    'mmoral@afimor.com, soledad@afimor.com). Presidente: Gines Granados Bayona (25715362M; 722 614 708; ginesgb@gmail.com); antes, tachado, Antonio Javier Martinez '
                    'Lopez (4o 1; 915 260 373 / 654 04 03 86; anjamalo@hotmail.com). En oct-2025 la comunidad para la actividad por un proceso judicial contra la adjudicataria '
                    '(TKE) y el anterior administrador; en la carpeta, acta de la junta del 02/12/2025 que elige a IBERLEAN y solicitud de la subvencion del Ayuntamiento 2026 '
                    '(04/06/2026). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=n, comunidad={'iban': 'ES89 0081 5395 3500 0190 2395'},
    presi=('GINES GRANADOS BAYONA', 'presidente', '722614708', '25715362M', 'ginesgb@gmail.com',
           'Antes, tachado en la ficha: Antonio Javier Martinez Lopez (4o 1; 915260373 / 654040386; anjamalo@hotmail.com).'))
relevar_admin(cvs10, GACOM, SILVIA, 'Tachada en la ficha de Villasandino 10; la administracion vigente a mayo 2026 es INMHO (carpeta villasandino10).')

rellenar('va21', 'VIRGEN DE ARANZAZU 21', 'virgendearanzazu21', {'fecha_apertura': '2026-07-01', 'referencia_catastral': '1621306VK4812B',
    'origen_notas': 'Fecha de llegada: 07/2026 (dia: la ficha y el escaneo 3D, 01/07/2026). Contacta: Alfonso (ARRIALSI, la administracion; Camino de Ganapanes 35, local AF, '
                    '28035; 917 307 033 / 665 805 356; info@arrialsi.com, secretaria@arrialsi.com). Tipo de obra: SATE CON AEROTERMIA, CAMBIAR ASCENSORES Y PONER PUERTAS '
                    'AUTOMATICAS FUERA DEL HUECO Y EXTERIOR. CP 28034. La ficha no tiene notas. Comercial interno: ALVARO.'},
    ('sate', 'aerotermia', 'modificacion_asc', 'cambio_puertas'), adm=ALFONSO, trae_pu=ALFONSO, captador=ALVARO, lleva=ALVARO)

cva23 = cid_de('VIRGEN DE ARANZAZU 23')
pc_unico(cva23, 'NURIA', 'otro', '619947997', None, 'nmorenovazquez@yahoo.es', 'Hija del presidente; contacto de la comunidad para los documentos (ficha, dic-2024).')
rellenar('va23', 'VIRGEN DE ARANZAZU 23', 'virgendearanzazu23', {'fecha_apertura': '2024-12-11', 'referencia_catastral': '1621307VK4812B',
    'origen_notas': 'Fecha de llegada: 12/2024 (dia: la primera nota y el presupuesto de Schindler elegido, 11/12/2024). Contacta: Javier Rodriguez Martin (SCHINDLER). Paga: la '
                    'CP. Tipo de obra: SUSTITUCION DE 2 ASCENSORES + CSS + SUBV (subvencion de mejora de accesibilidad; mas adelante, quiza SATE con ayudas). Tecnico: JGO. Ano 1969. '
                    'Administracion: COMUNIDADES URQUIJO (Lola; C. del Marques de Urquijo 24, 1o F, 28008; 910 82 71 69; comunidades@abogadosurquijo24.com; facturas a '
                    'abogadosurquijo24.facturas@gmail.com); documentos pedidos a Nuria el 16/12. Contacto de la comunidad: Nuria, hija del presidente (619 94 79 97; '
                    'nmorenovazquez@yahoo.es). Comunidad: CDAD PROP CL VIRGEN DE ARANZAZU 23 MADRID (CIF H78170446). Tramita la ECU (ACTECU): expediente 1311025026826. Visado '
                    'TL/008661/2025. En 2026, IBERLEAN oferta a la comunidad y se queda con las subvenciones (11/06/2026: pedido al administrador que autorice el traspaso de la '
                    'documentacion). La ficha no dice comercial interno; la lleva Daniel.'},
    ('modificacion_asc', 'css', 'subvenciones'), n=fijar('virgendearanzazu23', 2024), comunidad={'iban': 'ES43 0081 0361 4900 0192 5996'},
    trae_pu=PU['jrodriguez'])

rellenar('va27', 'VIRGEN DE ARANZAZU 27', 'virgendearanzazu27', {'fecha_apertura': '2025-07-23', 'referencia_catastral': '1621301VK4812D',
    'origen_notas': 'Fecha de llegada: 07/2025 (dia: la primera nota, 23/07/2025; la visita y el escaneo 3D son del 29/07/2025). Contacta: Alfonso (ARRIALSI, la administracion; '
                    '917 307 033 / 665 805 356; info@arrialsi.com, secretaria@arrialsi.com). Tipo de obra: SATE CON AEROTERMIA Y BAJADA A COTA CERO, CAMBIAR ASCENSORES Y PONER '
                    'PUERTAS AUTOMATICAS FUERA DEL HUECO (ascensor nuevo de doble embarque a 180 con una parada mas, 12 paradas). HE e informe de viabilidad enviados 30/07/2025. '
                    'Comercial interno: DANIEL.'},
    ('sate', 'aerotermia', 'cota_cero', 'modificacion_asc', 'cambio_puertas'), n=fijar('virgendearanzazu27', 2025), adm=ALFONSO, trae_pu=ALFONSO)

rellenar('vo2', 'VIRGEN DE LA OLIVA 2 PORTAL 4', 'virgendelaoliva2portal4', {'fecha_apertura': '2025-09-29', 'referencia_catastral': '6959701VK4765H',
    'origen_notas': 'Fecha de llegada: la ficha dice 10/2025; el correo de Justo Rojo Perez (despacho de Diego Rojo) con la relacion de comunidades que tienen que pasar la IEE '
                    'antes del 31/12/2025 es del 29/09/2025; se toma ese. Contacta: Diego Rojo (ROJO JUSDI ADMINISTRACION; C/ Valdecanillas 90, local 1, 28037; 913 750 530 / '
                    '625 145 522; admirojojusdi@gmail.com); persona de contacto de la administracion: Alba Pedraja. Tipo de obra: IEE (10 propiedades). HE enviada 24/10/2025 a '
                    'precio indicado por Daniel. Comercial interno: DANIEL.'},
    ('iee',), n=fijar('virgendelaoliva2portal4', 2025, ('2025-09-29', 'Correo de Justo Rojo Perez (Rojo Jusdi) del 29 de septiembre de 2025.')),
    adm=PU['alba'], trae_pu=PU['diego'])

rellenar('vo30', 'VIRGEN DE LA OLIVA 30', 'virgendelaoliva30', {'fecha_apertura': '2025-11-19', 'referencia_catastral': '7260319VK4776A',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia: el correo de Rojo Jusdi, 19/11/2025, que pide tambien el estudio de German Perez Carrasco 73 y 73 bis y la reunion con el '
                    'presidente de Valdecanillas 51). Contacta: Diego Rojo (ROJO JUSDI ADMINISTRACION; 913 750 530 / 625 145 522; admirojojusdi@gmail.com). Tipo de obra: ASC + '
                    'SUBV: bajar el ascensor a cota cero; Daniel propone eliminar uno de los dos ascensores y poner otro mas grande, de doble embarque a 180, con una segunda '
                    'entrada desde la calle paralela (PEM estimado 65.000 EUR + IVA). HE enviada con viabilidad 02/12/2025. Comercial interno: DANIEL.'},
    ('cota_cero', 'modificacion_asc', 'subvenciones'),
    n=fijar('virgendelaoliva30', 2025, ('2025-11-19', 'Correo de Diego Rojo (Rojo Jusdi) del 19 de noviembre de 2025, con la valoracion de Daniel debajo.')),
    adm=PU['diego'], trae_pu=PU['diego'])

s47 = subv(O47)
assert s47.startswith('---------- Forwarded message') and '12-06-2025 HE ENVIADA' in s47 and s47.endswith('si tienen uno elegido'), s47[-80:]
k1 = s47.index('12-06-2025 HE ENVIADA'); k2 = s47.index('08/09/2025 CESAR'); k3 = s47.index('28/05/2026 preguntado')
SUBV47 = [('2025-06-11', s47[:k1].strip() + '\n\n(Correo de Rojo Jusdi del 11 de junio de 2025.)'), ('2025-06-12', s47[k1:k2].strip()),
          ('2025-09-08', s47[k2:k3].strip()), ('2026-05-28', s47[k3:].strip())]
rellenar('vo47', 'VIRGEN DE LA OLIVA 47', 'virgendelaoliva47', {'fecha_apertura': '2025-06-11', 'referencia_catastral': '6959560VK4765H',
    'origen_notas': 'Ficha en la subcarpeta "sate". Fecha de llegada: 06/2025 (dia: el correo de Rojo Jusdi, 11/06/2025, que pide presupuesto para tramitar las ayudas: "la IEE ya '
                    'la tienen pasada, y el proyecto pendiente de presentar al ayuntamiento"; el .dwg de jul-2023 de la carpeta es de plantilla). Contacta: Alba Pedraja Sanchez '
                    '(ROJO JUSDI S.L.; tambien Diego Rojo Olalla; 625 14 55 22 / 913 75 05 30). Paga: la CP. Tipo de obra: SUBV PRY EXTERNO SATE (el proyecto es de otro arquitecto, '
                    'Cesar, 660 765 766). Fecha encargo: 12/06/2025 (HE enviada y firmada). Ano 1960. Comunidad: CDAD PROP CL VIRGEN DE LA OLIVA 47 MADRID (CIF H80923873). '
                    'Presidente: Diego, 669 076 706. Honorarios: "A EXITO INFINITAS PRESENTACIONES". Las notas estan en el bloque de subvenciones. Forma conjunto homogeneo con '
                    'Virgen de la Oliva 49. La ficha no dice comercial interno; la lleva Daniel.'},
    ('subvenciones',), subvencion=SUBV47, comunidad={'iban': 'ES18 6724 8440 0187 2954 6917'},
    presi=('Diego', 'presidente', '669076706'), trae_pu=PU['alba'])

n = fijar('virgendelaoliva49', 2024)
rellenar('vo49', 'VIRGEN DE LA OLIVA 49', 'virgendelaoliva49', {'fecha_apertura': '2024-11-22', 'referencia_catastral': '6959559VK4765H',
    'origen_notas': 'Fecha de llegada: 11/2024 (dia: la primera nota, 22/11/2024; los ficheros de 2022-2023 de "Cert. Energetico/TRABAJO" y la herramienta de cuantia de la '
                    'subvencion parecen de plantilla). Contacta: Diego Rojo, el administrador (ROJO JUSDI S.L.; C/ Valdecanillas 90, local 1, 28037; 625 14 55 22 / 913 75 05 30; '
                    'admirojojusdi@gmail.com); documentos de la CP pedidos el 17/01 y el 13/02. Paga: la CP. Tipo de obra: ASCENSOR CON DERRIBO + SATE + SUBV (derribo de escalera, '
                    'ascensor con escalera restringida, invasion de patio, bajada a sotano con viviendas y plataforma a la entrada): "PROYECTO BASICO Y DE EJECUCION PARA '
                    'INSTALACION DE ASCENSOR Y REHABILITACION DE ENVOLVENTE TERMICA EN EDIFICIO RESIDENCIAL EXISTENTE". Barrio: Simancas. Tecnico: Jhonatan; requerimientos: Jacob. '
                    'Ano 1960. Comunidad: CDAD PROP CL VIRGEN DE LA OLIVA 49 MADRID (CIF H79112926). Presidenta: Maria Isabel Solis Buiza, Maribel (51657648Q; 627 537 174). '
                    'Cuenta: ES79 6724 8440 0495 1291 6023 (la anterior, tachada, ES30 0081 0532 4800 0122 9126, la cerraron el 27/03/2025). Conjunto homogeneo con Virgen de la '
                    'Oliva 43 y 45 (administrador: Eduardo, de AGISA) y 47 (proyecto de Cesar, arquitecto). Tramita la ECU (ACTECU). PEM 229.347,70. Visado TL/009831/2026 '
                    '(proyecto visado enviado 17/09/2026; en la carpeta, contestacion a la incidencia 8 de la ECU, oct-2026). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'sate', 'plataforma', 'subvenciones'), n=n, comunidad={'iban': 'ES79 6724 8440 0495 1291 6023'},
    presi=('MARIA ISABEL SOLIS BUIZA', 'presidente', '627537174'), trae_pu=PU['diego'])

rellenar('vl140', 'VIRGEN DEL LLUC 140', 'virgendellluc140', {'fecha_apertura': '2022-04-27', 'referencia_catastral': '5567540VK4756H',
    'origen_notas': 'Fecha de llegada: la ficha dice 05/2022; la primera nota (reunion con vecinos) es del 27/04/2022; se toma esa (el "compromiso CARTEL" y los escritos de '
                    'feb-mar 2022 son de plantilla). Contacta: Ibai (ELECNOR); en la ficha tambien Lucia Davila Moreira (ldavila@elecnor.com) y Javier Nunez Bruis '
                    '(jnbruis@elecnor.com). Paga: la CP. Tipo de obra: ASCENSOR + SUBV. Barrio: La Concepcion. Tecnico: Fernan. Jefe de obra: Adrian Donaire (antes, tachado, Andres '
                    'Mulas); en la ficha tambien portico@arquiresa.e.telefonica.net. Administracion: ASESORIA MARTIN GARCIA (Maria Jesus Martin; 913 772 326; '
                    'mariajesus@mgasesoria.com). Comunidad: CDAD PROP CL VIRGEN DE LLUC 140 MADRID (CIF H79488409). Presidente: Jose Angel Ponce Monasor (07225510Z; 619 846 576; '
                    'teresa.qb@gmail.com). Tecnico de la Junta: tecniclineal@madrid.es. PEM 115.036,33. Visado TL/016297/2022; CFO TL/000422/2025. Expediente 350/2022/08053, DR, NZ '
                    '3.1.a. Superficie 83,92. Subvencion del Ayuntamiento 2022 concedida (justificacion, oct-2025). En jun-2025 se ofrece una HE nueva de subvenciones y la comunidad '
                    'no esta interesada (03/06/2025). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=fijar('virgendellluc140', 2022),
    presi=('JOSE ANGEL PONCE MONASOR', 'presidente', '619846576', '07225510Z', 'teresa.qb@gmail.com'), trae_pu=PU['ibai'])

# ================================================================= 2. CLON
REVS = [
    ('villachurriana13', '2018-02-19', 'RAUL (ANYLOR)', None, None,
     'C/ VILLA CHURRIANA 13 MADRID. Fecha: 19/02/2018 (la de la ficha). Agente: Raul, de ANYLOR. Ficha vacia; hay un croquis (mar-2018).', 'Daniel'),
    ('villafuerte23', '2026-09-09', 'DANIEL (MARTIN Y LORENTE)', None, None,
     'VILLAFUERTE 23 MADRID (en el titulo de la ficha, "VILL.BAJO": Villaverde Bajo). Fecha: la ficha dice 05/2026, pero es copia de la de Villafuerte 17 (misma '
     'administracion y la misma cabecera); todos los ficheros (escaneo 3D y foto) son del 09/09/2026 y la ficha del 11/09/2026; se toma el 09/09/2026. Contacta: Daniel '
     '(MARTIN Y LORENTE, la administracion; danielalvarez@martinylorente.es). Tipo de obra: PLATAFORMA Y/O BAJADA A GARAJE ASCENSOR. Distrito Villaverde. '
     'Comercial interno: ALVARO.\n\n' + cl('villafuerte23', 2026, ('2026-09-11', 'Sin fecha; la valoracion del informe de viabilidad, con la fecha de la ficha (11/09/2026).')),
     'Alvaro'),
    ('villajimena109', '2025-01-10', 'RUTH (ADMINISTRACIONES ATOCHA)', None, None,
     'VILLAJIMENA 109 MADRID. Fecha: 01/2025 (dia: la nota, 10/01/2025). Paga: la CP. Contacta: Ruth (ADMINISTRACIONES ATOCHA; C/ Villalmanzo 6, 28032; 91 776 99 49; '
     'incidencias@adminatocha.es) - no esta en la agenda. Contacto de la comunidad: Laura, 663 580 136. Tipo de obra: SATE CON CAES Y SUBV. Distrito Vicalvaro. CP 28032. '
     'La carpeta solo tiene la ficha.\n\n' + crudo('villajimena109', 2025), 'Daniel'),
    ('villasandino22', '2016-09-30', 'NACHO (FAIN)', 'H79649281', '6333434VK3763C',
     'VILLA SANDINO 22 MADRID. Fecha: la ficha dice 15/12/2016; la propuesta de honorarios de la carpeta esta fechada el 30/09/2016; se toma esa. Agente comercial: Nacho '
     '(FAIN). Tipo de obra: ASCENSOR (propuesta de honorarios: consulta urbanistica 1.300 EUR y proyecto de ejecucion y direccion de obra 3.900 EUR; "En caso de que la consulta '
     'sea favorable, y que la obra se le adjudique a ascensores FAIN, la consulta urbanistica no tendra coste alguno"). Administracion: AFIGECO (Jose Navarro Espanol; '
     'Fuente Vieja 4-6, local, Parla 28981; 91 699 14 16; pepenavarro@afigeco.com). Propiedad: CP VILLASANDINO 22. CP 28011. Fachada 14,70 m. Distrito 10 - Latina. '
     'Tecnico: Carlos Borrallo. En la carpeta, la consulta urbanistica: tasa pagada y presentada (ene-2017) y aprobada (oct-2017). La ficha no tiene notas.', 'Daniel'),
    ('villastar4', '2022-07-19', 'JUAN ANTONIO ALVAREZ NOVILLO (FAIN)', None, None,
     'VILLASTAR 4 MADRID. Fecha: 07/2022 (dia: el plano del estado actual, 19/07/2022). Cliente: FAIN (Juan Antonio Alvarez Novillo). Tipo de obra: ASCENSOR. Distrito '
     'Villaverde. CP 28021. La ficha no tiene notas.', 'Daniel'),
    ('virgendebelen20', '2024-04-25', 'MARIA LUISA (VECINA)', None, None,
     'VIRGEN DE BELEN 20 MADRID. Fecha: 04/2024 (dia: la primera nota, 25/04/2024). Contacto: Maria Luisa, vecina del 2o A (661 149 264). Tipo de obra: DOS ASCENSORES CON '
     'DERRIBO. Distrito Carabanchel. CP 28019. El 22/01/2025 Daniel se reune con los vecinos y lleva la HE; falta que voten. La carpeta solo tiene la ficha.\n\n'
     + crudo('virgendebelen20', 2024), 'Daniel'),
    ('virgendelaoliva57', '2026-02-04', 'DIEGO ROJO (ROJO JUSDI)', None, None,
     'VIRGEN DE LA OLIVA 57 MADRID. Fecha: 02/2026 (dia: el correo de Rojo Jusdi, 04/02/2026). Contacta: Diego Rojo (ROJO JUSDI S.L.; C/ Valdecanillas 90, local 1, 28037; '
     '625 14 55 22 / 913 75 05 30; admirojojusdi@gmail.com). Contacto de la comunidad: Jorge (615 672 282; cecinco@hotmail.com). Tipo de obra: ASC (proyecto de ascensor a '
     'doble embarque; eliminacion de barreras, "es urgente"). Estudiado con Javier Parra (Schindler): cuando la comunidad acepte su oferta, que ya incluye nuestros '
     'honorarios de proyecto, se le pasa nuestro encargo. La carpeta solo tiene la ficha. Comercial interno: DANIEL.\n\n'
     + cl('virgendelaoliva57', 2026, ('2026-02-04', 'Correo de Diego Rojo (Rojo Jusdi) del 4 de febrero de 2026.')), 'Daniel'),
    ('vizcaya11', '2022-10-26', 'JAVIER PARRA (SCHINDLER)', None, None,
     'CALLE VIZCAYA 11 MADRID. Fecha: 10/2022 (dia: la nota, 26/10/2022; el unico fichero de octubre, del 06/10/2022, es un presupuesto de salvaescaleras de otra direccion, '
     '"LUIS VIVES 11"). Cliente: SCHINDLER (Javier Parra). Tipo de obra: BAJADA A 0 Y CAMBIAR PUERTAS (3 ascensores). Distrito Arganzuela. CP 28045.\n\n'
     + crudo('vizcaya11', 2022), 'Daniel'),
]
for carp, fecha, trajo, cif, ref, t, com in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, comercial=com)

for carp, fecha, trajo, t in [
        ('villaamil38', '2017-07-27', 'LUIS MIGUEL NUNES (THYSSEN)',
         'C/ VILLAAMIL 38 MADRID (en la ficha, "VILLAALMIL"). Fecha: 27/07/2017 (la de la ficha). Ficha vacia; hay un croquis (nov-2017).'),
        ('villagarcia5', '2016-04-29', 'PEDRO ARANDA (THYSSEN)',
         'VILLA GARCIA 5 MADRID. Fecha: 29/04/2016 (la de la ficha). Ficha vacia salvo una linea: "Nosotros instalamos en su dia el numero 9, enviame por favor opcion '
         'exterior e interior si es posible". Hay croquis, foto, plano, borrador de escalera y presupuesto (abr-may 2016).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 3. MANIAS
mania('Ayuntamiento de Madrid (consulta de la ECU): si el edificio tiene dos ascensores, intervenir en uno solo (por ejemplo, para ampliar las plantas servidas) no obliga a '
      'adecuar el otro, salvo que se hagan otras obras cuyo nivel de intervencion lo exija (art. 6.8.2 de las NNUU: las condiciones de dotaciones solo se aplican a obra nueva '
      'y reestructuracion general).', 'Ayuntamiento de Madrid (via ECU ACTECU)', '2025-02-18', 'virgendearanzazu23', clave='va23',
      trozo='no implicará necesariamente la adecuación del otro ascensor')

resumen()
