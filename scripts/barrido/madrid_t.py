# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda T (tacona75 .. tucurinca4, las 33 carpetas de la T). 7-oct-2026. Sin --escribir: marcha en seco.
# La V (en tres trozos) y el resto (U, W, Z y 2demayo6) los preparan otros agentes / otro script a la vez.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de, _lineas

FAIN = 'fa005671-8d23-45a6-8172-0ea7ca8c8950'
TETUAN = '8e6ed8b3-94ab-4e66-a294-bdb45aab37c9'   # Junta Municipal de Distrito de Tetuan (ya existe)
PU.update(felisa='7346d7ca-d60c-40bb-b509-ff9f48b64d77', atiko_mj='c768611c-65ef-458f-8b45-c8a2f05e5f9a', mj_antonaya='8c652ae9-f9ec-4614-8d60-94f6387a1a23',
          vanesa_dbb='05cda534-6907-43b0-b674-53cbe143a278', joseantonio_dbb='40b27949-a177-4d6f-9e7b-2498a064848f', pizarroso='e5abf29a-a25f-4c87-8705-6dc523285e1f')
TF8 = 'tenerife8/ascensor/FICHA DATOS TECNICOS.docx'          # dos fichas en subcarpetas
TF8_RE = 'tenerife8/reforma eléctrica/FICHA DATOS.docx'
ALIO_BUENA = '249d9a74-a1ca-4b96-be7d-90eee810ee3f'          # "TRAVESÍA DE SANTIAGO ALIO 2 MADRID" (se rellena)
ALIO_SOBRA = '80dc96f6-9c8b-4888-afd4-3654221bb4f1'          # "TRAVESIA SANTIAGO ALIO 2 MADRID": vacia y duplicada, NO se toca (duda: borrarla)


def cid_de(prefijo):
    cs = b.leer('comunidades?select=id&municipio=eq.MADRID&nombre=like.' + quote(prefijo) + '*'); assert len(cs) == 1, prefijo
    return cs[0]['id']


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto (telefono pegado al nombre, tachado pegado...)."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


def pc_unico(cid, nombre, rol, tel=None, doc=None, email=None, notas_=None):
    """pc() para roles que no son presidente, sin repetirla si el script se relanza."""
    ya = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&nombre=eq.%s' % (cid, quote(nombre)))
    return ya[0]['id'] if ya else pc(cid, nombre, rol, tel, doc, email, notas_)


def trae(pcid):
    return {'quien_persona_comunidad_id': pcid, 'persona_comunidad_id': pcid}


def admin_nueva(nombre, notas_):
    """administracion de fincas nueva que lleva una comunidad de produccion (como ADMONPATRIMONIOS en madrid_g1)."""
    ya = b.leer('empresa?select=id&nombre_accesalia=eq.' + quote(nombre))
    if ya: return ya[0]['id']
    i = nuevo_id()
    ins('empresa', [{'id': i, 'nombre_accesalia': nombre, 'tipo': 'administracion_fincas', 'activa': True, 'comercial_id': DANIEL, 'notas': notas_}])
    return i


def fila_muni(muni, carp, fecha, estado, cierre, trajo, cif, ref, texto, comercial='Daniel'):
    """como fila(), pero con el municipio oficial (la carpeta conserva su ruta en MADRID). Copiada de madrid_o.py."""
    if b.leer(T + '?select=id&municipio=eq.%s&carpeta=eq.%s' % (quote(muni), quote(carp))):
        print('clon ya escrita, se salta:', carp); return
    i = nuevo_id(); CLON[carp] = i
    ins(T, [{'id': i, 'comunidad_autonoma': 'COMUNIDAD DE MADRID', 'municipio': muni, 'carpeta': carp, 'ruta_dropbox': R(carp), 'tiene_tarjeta_cif': False, 'cif_en_la_ficha': cif,
             'ref_catastral_de_la_ficha': ref, 'comercial_interno': comercial, 'estado': estado, 'cierre_notas': cierre, 'fecha_apertura': fecha, 'trajo_persona': trajo, 'notas_de_la_ficha': texto}])


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
cl = lambda c, a, s=None: J(fijar(c, a, s))

# ================================================================= 0. AGENDA
# Dos administraciones de fincas nuevas que llevan comunidades de PRODUCCION (criterio de ADMONPATRIMONIOS, Monica 7-oct-2026).
ECUANIME = admin_nueva('ECUANIME FINCAS', 'Alta en el barrido de Madrid (Teniente Munoz Diaz 27, feb-2026; carpeta tenientemuñozdiaz27).')
JORGE_ECU = persona_nueva('Jorge', None, 'administrador', '619509482', 'Ecuanime.fincas@gmail.com', empresa=ECUANIME,
                          notas_='Ecuanime Fincas: administrador de Teniente Munoz Diaz 27 (feb-2026). El correo es el general de la administracion.')
PGL = admin_nueva('PGL GESTORES', 'Alta en el barrido de Madrid (Tomas Borras 6, mar-2026; carpeta tomasborras6).')
JESUS_PGL = persona_nueva('Jesús', None, 'administrador', '692326632', 'J.pglgestores@gmail.com', empresa=PGL,
                          notas_='PGL Gestores: administrador de Tomas Borras 6 (mar-2026).')
# FAIN (contrata ya existe): jefe de obra de Torrecilla del Leal 21 (antes, tachado, Victor Esquinas).
ARTURO_FAIN = persona_nueva('Arturo', 'García', 'jefe de obra', None, 'arturo.garcia@fainascensores.com', contrata=FAIN,
                            notas_='FAIN: jefe de obra de Torrecilla del Leal 21 (inicio de obra 17/07/2025; carpeta torrecilladelleal21). Sustituye a Victor Esquinas (tachado en la ficha).')
# Junta de Tetuan (ya existe): servicios tecnicos, con el telefono y el correo de la ficha de Tenerife 8.
TEC_TET = area(TETUAN, 'Servicios Técnicos', '913 821 499', 'Dato de la ficha de Tenerife 8 (2022-2025).')
if not b.leer('correo?select=id&email=eq.tecnitetuan@madrid.es'):
    ins('correo', [{'organismo_area_id': TEC_TET, 'email': 'tecnitetuan@madrid.es', 'etiqueta': 'general', 'principal': True}])

# ================================================================= 1. PRODUCCION (13 carpetas, 13 oportunidades)
rellenar('tj6', 'TAJUYA 6', 'tajuya6', {'fecha_apertura': '2026-04-24',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: la primera nota, 24/04/2026; el unico fichero es la ficha, del 29/04/2026). Contacta: Felisa Velazquez, comercial de REMICA '
                    '(contrata; 666 767 855; mfvelazquez@remica.es). Tipo de obra: ASC modelo homologado (coste de obra estimado por Daniel 220.000 EUR + IVA). HE enviada '
                    '27/04/2026. Comercial interno: DANIEL.'},
    ('ascensor',), n=fijar('tajuya6', 2026), trae_pu=PU['felisa'])

# --- Tenerife 8: dos fichas. La de ASCENSOR (2022, viva: HE modificada el 05/10/2026) va a la opp de produccion; la de REFORMA ELECTRICA (2026) a la clon.
ctf = cid_de('TENERIFE 8')
arreglar_pc(ctf, 'rol=eq.presidente', {'nombre': 'ROBERTO', 'telefono': '654232262',
                                       'notas': 'En la ficha, pegado: "Presidente ROBERTO / Vicenpresidenta"; el telefono va en la linea "Roberto (presidente) 654232262". '
                                                'El DNI 02900212G es el de la casilla DNI PRESIDENTE (no se dice de quien; en 2022 la presidenta era Inmaculada).'})
pc_unico(ctf, 'INMACULADA JIMENEZ', 'vicepresidente', '656400987', None, 'ijselfa@hotmail.com',
         'Inma, 1o-2. En la ficha: "Vicenpresidenta" (errata: vicepresidenta). En jul-oct 2022 era la presidenta (notas de la ficha).')
n = fijar(TF8, 2022, otros={0: ('2022-07-08', 'En la ficha, solo "08/07", sin ano ni texto, encima de la nota del 19/07/22; por la llegada, 07/2022, es el 08/07/2022.')})
n = partir(n, 5, 'Listado de gestiones a fecha 21-09-2023', '2023-09-21')
rellenar('tf8', 'TENERIFE 8', 'tenerife8', {'fecha_apertura': '2022-07-08', 'referencia_catastral': '0380219VK4708A',
    'origen_notas': 'Fecha de llegada: 07/2022 (dia: la primera nota, "08/07"; el escaneo FARO es del 02-03/08/2022; los "DOCUMENTOS COMUNES" de 2007 son papeles de la comunidad). '
                    'Carpeta "tenerife8\\ascensor" (en "tenerife8\\reforma electrica" hay otro encargo de 2026, que va a la clon). Cliente: la CDAD (SATE y subvenciones) + FAIN '
                    '(ascensor); el contacto, ~~Vicente Real (FAIN)~~, tachado: "Han roto peras con fain". Tipo de obra: ASCENSOR (~~FAIN~~ -> TKE, elegida el 21/05/2026) + SATE '
                    '(ELECNOR, Lucia Davila) y FOTOVOLTAICA (ADRATEK, Francisco Rodriguez; no esta en la agenda) + subvenciones. Barrio: Bellas Vistas. Tecnicos: Fernan / John -> '
                    'Carla -> Jhonatan. Fecha encargo: 26/10/2022. Ano 1920. Tramita la ECU (ACTECU): licencia presentada 02/06/2025 y aprobada 11/11/2025. Administracion: '
                    'antes, tachada, G M FINCAS S L (Angel Rodriguez; C Juan Pantoja 28, 28039; 915 533 044; angel@gmfincas.com); ahora JUAN CARLOS MULERO GUTIERREZ, '
                    'administrador de fincas (colegiado 10971; 625 211 968; info@afmulero.es): "Nuevo admon no va a tratar ningun tema referente a subvenciones y su gestion, si '
                    'gestionara pagos". Comunidad: CDAD PROP CL TENERIFE 8 MADRID (CIF H78176971). Presidente: Roberto (654 232 262); vicepresidenta: Inma (Inmaculada Jimenez, '
                    '656 400 987; ijselfa@hotmail.com), presidenta en 2022. Junta de Tetuan: 913 821 499; tecnitetuan@madrid.es. PEM 357.829,92. Visado ~~TL/001198/2023~~ '
                    'TL/008465/2025. Expediente ~~350/2023/02469~~ ("licencia no vale") -> 350/2023/07250, DR del 09/03/2023. NZ 4. Superficie 296,05. En oct-2026: "esta '
                    'costando trabajo para que paguen lo que nos deben de proyecto y de DF" (Alejandra). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'df', 'sate', 'fotovoltaica', 'subvenciones'), n=n, comunidad={'iban': 'ES17 2085 9254 1803 0030 2803'})

ctm = cid_de('TENIENTE MU')
rellenar('tm27', 'TENIENTE MU', 'tenientemuñozdiaz27', {'fecha_apertura': '2026-02-01',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia desconocido: el escaneo 3D es del 04/03/2026 y la ficha del 05/03/2026; el .skb del 12/01/2026 es de plantilla, el mismo que '
                    'el de Tenerife 8). Contacta: Ana, la presidenta. Administracion: ECUANIME FINCAS (Jorge; 619 509 482; Ecuanime.fincas@gmail.com; administracion nueva, dada '
                    'de alta en el barrido). La ficha no dice tipo de obra ni tiene notas. Comercial interno: ALVARO.'},
    (), presi=('ANA', 'presidente', None, None, None, 'En la ficha: "Ana presidenta" (quien contacta).'), trae_pc='presi', adm=JORGE_ECU, captador=ALVARO, lleva=ALVARO)

cte = cid_de('TERCIO 1')
pilar = pc_unico(cte, 'PILAR RODRIGUEZ', 'vecino', '629824071', None, 'prs22prs@gmail.com', 'Persona de contacto de la comunidad (ficha, jun-2026); es quien contacta.')
rellenar('te1', 'TERCIO 1', 'tercio1', dict({'fecha_apertura': '2026-06-09',
    'origen_notas': 'Fecha de llegada: 06/2026 (dia: el escaneo 3D y la ficha, 09/06/2026). Contacta: Pilar Rodriguez, de la comunidad (629 82 40 71; prs22prs@gmail.com). '
                    'Tipo de obra: ASCENSOR. La ficha no tiene notas. Comercial interno: ALVARO.'}, **trae(pilar)),
    ('ascensor',), captador=ALVARO, lleva=ALVARO)

ctt = cid_de('TETUAN 34')
paula = pc_unico(ctt, 'PAULA MARTINEZ', 'vecino', '657091265', None, 'berbellstudio@gmail.com', 'Persona de contacto de la comunidad (ficha, sep-2025).')
rellenar('tt34', 'TETUAN 34', 'tetuan34', dict({'fecha_apertura': '2025-09-12',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia: las fotos del estudio de viabilidad y el primer escaneo 3D, 12/09/2025). Contacta y paga: la comunidad; persona de contacto, '
                    'Paula Martinez (657 091 265; berbellstudio@gmail.com). Tipo de obra: "Cipham hueco" (ascensor por el hueco de escalera). En la carpeta, tres escaneos 3D '
                    '(sep-oct 2025). La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS}, **trae(paula)),
    ('ascensor',), captador=CARLOS, lleva=ALVARO)

cta = cid_de('TOMAS APARICIO 3')
dani = pc_unico(cta, 'DANIEL', 'vecino', None, None, 'dani.izquierdo95@gmail.com', 'Vecino; es quien contacta (ficha, may-2026).')
rellenar('ta3', 'TOMAS APARICIO 3', 'tomasaparicio3', dict({'fecha_apertura': '2026-05-14',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: el escaneo 3D, 14/05/2026). Contacta: Daniel, vecino (dani.izquierdo95@gmail.com). Tipo de obra: ASCENSOR. Informe de '
                    'viabilidad y HE enviados 18/05/2026. Comercial interno: ALVARO.'}, **trae(dani)),
    ('ascensor',), n=fijar('tomasaparicio3', 2026, ('2026-05-18', 'Sin fecha delante; la fecha va dentro de la nota.')), captador=ALVARO, lleva=ALVARO)

ctb = cid_de('TOMAS BORRAS 6')
dtb = pc_unico(ctb, 'DANIEL', 'vecino', '687018542', None, None, 'Vecino; es quien contacta (ficha, mar-2026).')
rellenar('tb6', 'TOMAS BORRAS 6', 'tomasborras6', dict({'fecha_apertura': '2026-03-04',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia: el escaneo 3D, 04/03/2026). Contacta: Daniel, vecino (687 018 542). Tipo de obra: ACCESIBILIDAD. Administracion: PGL GESTORES '
                    '(Jesus; 692 326 632; J.pglgestores@gmail.com; administracion nueva, dada de alta en el barrido). "Enviado 09/03/2026" (la ficha no dice que). '
                    'Comercial interno: ALVARO.'}, **trae(dtb)),
    ('accesibilidad',), n=fijar('tomasborras6', 2026, ('2026-03-09', 'Sin fecha delante; la fecha va dentro de la nota.')), adm=JESUS_PGL, captador=ALVARO, lleva=ALVARO)

rellenar('tl21', 'TORRECILLA DEL LEAL 21', 'torrecilladelleal21', {'fecha_apertura': '2023-07-24', 'referencia_catastral': '0837221VK4703H',
    'origen_notas': 'Fecha de llegada: 07/2023 (dia: la primera nota, 24/07/2023: Atiko envia la consulta vinculante que hizo Velerda en 2021; la consulta previa aprobada de la '
                    'carpeta se guardo el 25/07/2023). Contacta: ATIKO GESTION (Maria Jose Ruiz / Barbara Mendez, secretaria; C/ Amparo 86, local, 28012; 912 982 005 - '
                    '674 319 134; administracion@atikogestion.es) + Ivan Camacho (en la agenda hay un Ivan Camacho de la contrata TRES JOTAS; la ficha no dice si es el mismo). Paga: '
                    'la CDAD. Tipo de obra: ASCENSOR POR PATIO CORRALA + DF + subvenciones (HE de subvenciones de accesibilidad enviada 06/02/2024). Barrio: Embajadores. Tecnicos: '
                    'Susana -> Carla. Fecha encargo: 03/10/2023 (HE firmada, nota del 10/10/2023). Ano 1907. Tramita la ECU (ACTECU; "Por ecu"): licencia aprobada 05/06/2025. '
                    'Contrata: FAIN ASCENSORES (Raul Garcia, comercial); jefe de obra Arturo Garcia (FAIN), antes ~~Victor Esquinas~~. Inicio de obra: 17/07/2025. Arqueologia: '
                    'Lourdes Lopez, de LURE ARQUEOLOGIA (663 045 216; llopez@lurearqueologia.es; no esta en la agenda); permiso de la Comunidad de Madrid el 02/12/2025 y '
                    'aprobacion de Patrimonio el 17/02/2026. No tienen contratada CSS. Comunidad: CDAD PROP TORRECILLA DEL LEAL 21 MADRID (CIF H79238879). Presidente: Jaime '
                    'Reinoso Valdivia (28794408H; 655 854 106; jaimereival@gmail.com). Visado TL/005516/2025. En la visita del 23/07/2026, el foso abierto y la obra parada. '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'df', 'subvenciones'), n=fijar('torrecilladelleal21', 2023), comunidad={'iban': 'ES34 0081 0259 1900 0159 8660'},
    presi=('JAIME REINOSO VALDIVIA', 'presidente', '655854106', '28794408H', 'jaimereival@gmail.com'), trae_pu=PU['atiko_mj'])

ST = subv('torregrosa6'); i1 = ST.index('03/07/2025 DANIEL'); i2 = ST.index('08/07/2025 HE')
rellenar('tg6', 'TORREGROSA 6', 'torregrosa6', {'fecha_apertura': '2025-07-03', 'referencia_catastral': '5204308VK4850E',
    'origen_notas': 'Fecha de llegada: 07/2025 (dia: la fecha de encargo de la ficha y la llamada de Daniel a la administradora, 03/07/2025). Contacta: Maria Jose Garcia (AGA '
                    'ANTONAYA S.A.U.; Calle de Pegaso 32, local, 28043; 91 759 39 09; mariajose@antonaya.com). Tipo de obra: SUBV PRY EXTERNO SATE (obra de SATE "ya muy avanzada"; '
                    'piden presupuesto para la subvencion Rehabilita, "la anterior convocatoria ya lo solicitaron", y la de la CAM). Fecha encargo: 03/07/2025. HE enviada '
                    '08/07/2025. Las notas van en el bloque de subvenciones de la ficha. Comercial interno: DANIEL.'},
    ('subvenciones',),
    subvencion=[('2025-07-03', ST[:i1].strip() + '\n\n(Correo de Maria Jose Garcia (AGA Antonaya), sin fecha; "Tal y como hemos conversado por telefono": se pone la de la '
                                                  'llamada de Daniel, 03/07/2025.)'),
                ('2025-07-03', ST[i1:i2].strip()), ('2025-07-08', ST[i2:].strip())],
    adm=PU['mj_antonaya'], trae_pu=PU['mj_antonaya'])

ctp = cid_de('TRAVESIA PALOMERAS 7')
rellenar('tp7', 'TRAVESIA PALOMERAS 7', 'travesiadepalomeras7', {'fecha_apertura': '2026-03-23', 'referencia_catastral': '3114404VK4731C',
    'origen_notas': 'Fecha de llegada: la ficha dice 04/2026; el correo de Vanesa es del 23/03/2026; se toma ese (la documentacion de la administracion se guardo el 13/04/2026). '
                    'Contacta: Vanesa (DEL BRIO Y BLANCO; Calle Pena de la Miel 1, bajo; vanesa@delbrioyblanco.es). Tipo de obra: IEE Y SATE (presupuesto para subsanar las '
                    'deficiencias de la IEE y para rehabilitar la fachada, simple o con SATE, con honorarios de arquitecto y subvenciones). Presidente: Francisco (671 156 443). '
                    'En la carpeta, la IEE, el CEE y su registro. Comercial interno: ALVARO.'},
    ('iee', 'sate', 'subvenciones'),
    n=fijar('travesiadepalomeras7', 2026, ('2026-03-23', 'Correo de Vanesa (Del Brio y Blanco) del 23 de marzo de 2026, reenviado.')),
    presi=('FRANCISCO', 'presidente', '671156443', None, None, 'En el correo de la administracion (23/03/2026): "Franciso" (errata: Francisco).'),
    adm=PU['vanesa_dbb'], trae_pu=PU['vanesa_dbb'], captador=ALVARO, lleva=ALVARO)

cal = cid_de('TRAVESÍA DE SANTIAGO ALIO 2')
pc_unico(cal, 'LUIS BONILLA', 'vecino', '629921244', None, None, '1o izquierda; contacto para la visita (correo de la administracion, 05/06/2025).')
rellenar('tsa2', 'TRAVESÍA DE SANTIAGO ALIO 2', 'travesiadesantiagoalio2', {'fecha_apertura': '2025-06-05', 'referencia_catastral': '5212720VK4751C',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: el correo de Jose Antonio, de Del Brio y Blanco, 05/06/2025). Contacta: Jose Antonio / Javier (DEL BRIO Y BLANCO, S.L.; '
                    'C/ Carlos Martin Alvarez 65 bis, 1o B, 28018; 91 477 41 91 / 91 478 69 11 / 91 477 88 32; joseantonio@delbrioyblanco.es): "se comento en la Junta la '
                    'posibilidad de instalar ascensor". Tipo de obra: ASCENSOR. Contacto para la visita: Luis Bonilla, 1o izq. (629 921 244). CIF de la comunidad H79986626. '
                    'HE enviadas 10/06/2025. Comercial interno: ALVARO.'},
    ('ascensor',),
    n=fijar('travesiadesantiagoalio2', 2025, ('2025-06-05', 'Correo de Jose Antonio (Del Brio y Blanco) del 5 de junio de 2025, reenviado.')),
    comunidad={'cif_comunidad': 'H79986626'}, adm=PU['joseantonio_dbb'], trae_pu=PU['joseantonio_dbb'], captador=ALVARO, lleva=ALVARO, oid_fijo=ALIO_BUENA)

rellenar('tp7b', 'TRES PECES 7', 'trespeces7', {'fecha_apertura': '2025-11-18', 'referencia_catastral': '0738111VK4703H',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia: la nota y el modelo 3D, 18/11/2025: "CREAR CARPETA, NO HACER 3D"). Tipo de obra: ASCENSOR PATIO. CP 28012. Ficha casi vacia: '
                    'sin contacto. En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), n=fijar('trespeces7', 2025), captador=CARLOS, lleva=ALVARO)

ctr = cid_de('TRUJILLOS 5')
ismael = pc_unico(ctr, 'ISMAEL MARIN FERNANDEZ', 'vecino', '654956764', None, 'imarinfernandez@gmail.com',
                  '4o izquierda; contacto para la visita y miembro de la junta rectora (correo de Gestin, 15/10/2025).')
rellenar('tr5', 'TRUJILLOS 5', 'trujillos5', {'fecha_apertura': '2025-10-15', 'referencia_catastral': '0046403VK4704E',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: el correo de Isaac Pizarroso, 15/10/2025). Contacta: Isaac Pizarroso Arnao, el administrador (GESTIN SAP; C/ Alberto Aguilera 7, '
                    '1o izq., 28015; 91 447 10 09; isaacpizarroso@gestin.es), con copia a la junta rectora: Ana Cha (anacha3@gmail.com), Susana Garcia (sgfdz21@yahoo.com) e Ismael '
                    'Marin Fernandez (imarinfernandez@gmail.com; 4o izq., 654 956 764, contacto para la visita). Junta de la comunidad el 30/10/2025. Tipo de obra: ASCENSOR POR '
                    'PATIO, ESCALERA PROTEGIDA (torre de vidrio, 6 plazas, paradas a media altura; ascensor 115.000 EUR + IVA). HE e informe de viabilidad enviados 22/10/2025. '
                    'Comercial interno: DANIEL.'},
    ('ascensor',),
    n=fijar('trujillos5', 2025, ('2025-10-15', 'Correo de Isaac Pizarroso (Gestin) del 15 de octubre de 2025, reenviado; debajo, la valoracion de Daniel.')),
    adm=PU['pizarroso'], trae_pu=PU['pizarroso'])

# ================================================================= 2. CLON
REVS = [
    ('tacona83', '2022-05-17', 'NUNCI CALDERON (COMUNIDAD)', None, None,
     'TACONA 83 MADRID. Fecha: 05/2022 (dia: la nota, 17/05/2022). Cliente: la CDAD; contacto, Nunci Calderon (no esta en la agenda; sin telefono ni correo). Tipo de obra: '
     'ASCENSOR Y SATE. Distrito Moratalaz. CP 28030. La carpeta solo tiene la ficha.\n\n' + crudo('tacona83', 2022)),
    ('tajuya2', '2018-02-09', 'ANDRES (ENGWE)', None, None,
     'C/ TAJUYA 2 MADRID. Fecha: 09/02/2018 (la de la ficha). Agente comercial: "ANDRES ENGWE" (en la agenda, ENGWE esta marcada "CUIDADO ESTOS NO"). Ficha vacia; hay croquis, '
     'fotos y borrador de escalera (mar-2018).'),
    ('tiscar15', '2024-05-09', 'CARMEN (DEL BRIO Y BLANCO)', None, None,
     'TISCAR 15 MADRID. Fecha: 05/2024 (dia: la nota, 09/05/2024). Cliente: la Cdad. prop.; contacto, Carmen, de DEL BRIO Y BLANCO (la administracion; en la agenda, Carmen '
     'Garcia, carmen@delbrioyblanco.es). Tipo de obra: ASCENSOR POR FACHADA CON INVASION DE VIA PUBLICA (derribo de fachada y escalera; cabina de 1250 x 1000, 6 personas; '
     'licencia por procedimiento ordinario, unos 20 meses; obra estimada en 195.000 EUR). Distrito Puente de Vallecas. CP 28053. Presidenta: Amelia (636 631 909). '
     'La carpeta solo tiene la ficha.\n\n' + crudo('tiscar15', 2024)),
    ('torrearias25', '2024-07-01', 'MIGUEL ANGEL GOMEZ PEREZ (FAIN)', None, None,
     'TORRE ARIAS 25 MADRID. Fecha: 07/2024 (dia desconocido; la nota es del 02/08/2024). Cliente: FAIN (Miguel Angel Gomez Perez). Tipo de obra: DF ASCENSOR LENTO ("quieren solo '
     'DF de licencia concedida"; bajo el forjado hay un local que no se puede tocar). Distrito San Blas - Canillejas. CP 28022. La carpeta solo tiene la ficha.\n\n'
     + crudo('torrearias25', 2024)),
    ('totana36', '2023-07-05', 'JULIO (TKE)', None, None,
     'TOTANA 36 MADRID. Fecha: la ficha dice 10/2023; la nota es del 05/07/2023 y el modelo del 09/07/2023; se toma la nota. Cliente: TKE (Julio; en la agenda, Julio Cesar Saiz '
     'Tejera). Tipo de obra: ASCENSOR (sustitucion de ascensor a media altura). Distrito 16 - Hortaleza (Pinar del Rey). CP 28033. En la carpeta, el modelo y un dwg.\n\n'
     + crudo('totana36', 2023)),
    ('travesiagerardocordon3', '2024-02-14', 'DANIEL DIAZ (SCHINDLER)', None, None,
     'TRAVESIA GERARDO CORDON 3 MADRID. Fecha: 02/2024 (dia: el listado de inmuebles de la carpeta, 14/02/2024). Cliente: SCHINDLER (Daniel Diaz). Tipo de obra: SATE Y NG (Next '
     'Generation). Distrito Ciudad Lineal. CP 28017. No es Gerardo Cordon 49 (produccion).\n\n'
     + cl('travesiagerardocordon3', 2024, ('2024-02-16', 'Sin fecha delante; la fecha va dentro de la nota.'))),
    ('travesiainfantamercedes4', '2021-08-01', 'JOSE MARIA GALVEZ (FAIN)', 'H79141453', '0886506VK4708F',
     'TRAVESIA INFANTA MERCEDES 4 MADRID. Fecha: 08/2021 (dia desconocido; las fotos de la visita son del 30/09/2021; el DNI de Daniel de jun-2021 es de plantilla). Ref: 141/2021. '
     'Cliente: FAIN (Jose Maria Galvez). Tipo de obra: ASCENSOR + CSS (sustitucion de un ascensor completo con ampliacion de parada y modificacion de un tramo de escalera). '
     'Distrito 06 - Tetuan. Tecnico: Fernan. Fecha encargo: 10/2021. CP 28020. Comunidad: Cdad Prop Tr Infanta Mercedes N 4 de Madrid (CIF H79141453). Presidente: Antonio Sanchez '
     'Nieto (bajo izda.; 50418001T). PEM 52.270 (residuos 300). Visado TL/018848/2021 (03/11/2021). Expediente 106/2021/04869 (declaracion responsable). En la carpeta, PSS, '
     'apertura del centro de trabajo, actas de obra y fin de obra visado TL-018201-2022 (oct-2022). La ficha no tiene notas fechadas: "Mejora de accesibilidad: sustitucion de un '
     'ascensor completo con ampliacion de parada y modificacion de un tramo de escalera."'),
    ('travesiavillaescusa2-4', '2022-02-07', 'MARTINEZ LIRIA', None, None,
     'TRAVESIA VILLAESCUSA 2-4 MADRID. Fecha: la ficha dice 10/2024; la primera nota es del 07/02/2022 (contacta Martinez Liria por SATE) y la visita de mar-2022; el encargo '
     'se retoma en oct-2024; se toma la primera. Cliente: la CP. Tipo de obra: SATE, 2 SALVAESCALERAS, REPARACION DE CALDERA E INSTALACION DE TUBERIAS (en oct-2024, HE de '
     'SATE + aerotermia y subvenciones a exito; en mar-2025 la junta vota SATE si, aerotermia no). Distrito Ciudad Lineal. CP 28017. Dos portales, 50 viviendas. '
     'Administracion: Administracion de Fincas La Elipa, S.L. (MARTINEZ LIRIA; Av. Marques de Corbera 8, local 3, 28017; 91 726 52 34 / 91 726 99 92 / 607 869 079; '
     'fincasmliria@gmail.com). Presidente: Yoenis Baratute (portal 4, 6o C; 653 053 502; ybarar@gmail.com). En mar-2022 el correo va a Isabelino (no esta en la agenda), de '
     'la epoca de Renovae. En la carpeta, el estudio de costes y los consumos de gas 2022-2024.\n\n' + crudo('travesiavillaescusa2-4', 2022)),
    ('triunfo11', '2025-04-01', 'ALFREDO (IBERLEAN)', None, None,
     'TRIUNFO 11 MADRID. Fecha: 04/2025 (dia: la nota y el escaneo con iPhone, 01/04/2025). Contacto: "Alfredo Iberlean" (en la agenda, Alfredo Jimenez, de IBERLEAN '
     'ACCESIBILIDAD). Tipo de obra: ASCENSOR CON DERRIBO. Distrito Latina. CP 28011. En la carpeta, modelo 3D, croquis de escalera con 3 opciones e imagenes (abr-2025).\n\n'
     + crudo('triunfo11', 2025)),
    ('tucurinca4', '2015-10-16', 'JERONIMO RIESGO', None, None,
     'TUCURINCA 4 MADRID. Fecha: 16/10/2015 (la de la ficha). Agente comercial: Jeronimo Riesgo (676 352 078; no esta en la agenda; el mismo telefono que "Jeronimo" de BAUHAUS en '
     'la ficha de Ribota 11). Tipo de obra: ASCENSOR EN PLANTA (baja + 4, doble embarque a 180). En la carpeta, planos actual y reformado y presupuesto (oct-nov 2015). '
     'Notas de la ficha, sin fecha: "No se retirarian contadores si excavamos bajada a sotano. ES MEJOR CAMBIAR CONTADORES. Desviar gas de fachada."'),
]
for carp, fecha, trajo, cif, ref, t in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV)

# Tenerife 8, REFORMA ELECTRICA (2026): encargo distinto del ascensor de 2022 (que va a la opp de produccion). Fila aparte, con su ruta.
fila('tenerife8 (2026)', '2026-02-25', 'abierta', None, 'LUIS MIGUEL HERNANDEZ', None, None,
     'TENERIFE 8 MADRID, REFORMA ELECTRICA (encargo de 2026). Carpeta "tenerife8\\reforma electrica". Fecha: 02/2026 (dia: el escaneo 3D y la ficha, 25/02/2026; el .skb del '
     '12/01/2026 es de plantilla). Contacto: Luis Miguel Hernandez (luismiguelhernandez11@gmail.com; la ficha no dice si es vecino). Tipo de obra: REFORMA ELECTRICA. Distrito '
     'Tetuan. CP 28039. El encargo del ascensor + SATE de 2022 de este edificio esta en la oportunidad de produccion de Tenerife 8. La ficha no tiene notas. En la ficha: '
     'comercial interno CARLOS.' + EXT + REV, comercial='Alvaro', ruta=R('tenerife8' + B + 'reforma eléctrica'))

for carp, fecha, trajo, t in [
        ('tacona75', '2016-05-12', 'FELIPE OSADO (ENOR)',
         'TACONA 75 MADRID. Fecha: 12/05/2016 (la de la ficha). Ficha vacia; hay croquis, borrador de escalera y presupuesto (jul-2016).'),
        ('thader16', '2017-02-03', 'PEDRO ARANDA (THYSSEN)',
         'C/ THADER 16 MADRID. Fecha: 03/02/2017 (la de la ficha). Ficha vacia; hay croquis, plano y presupuesto (feb-2017).'),
        ('tiscar9', '2016-10-14', 'PEDRO ARANDA (THYSSEN)',
         'TISCAR 9 MADRID. Fecha: 14/10/2016 (la de la ficha). Ficha vacia; hay croquis, borrador de escalera, plano y presupuesto de ascensor con forma de pago (oct-2016 a mar-2017).'),
        ('toledo6', '2018-06-08', 'PEDRO ARANDA (THYSSEN)',
         'C/ TOLEDO 6 MADRID. Fecha: 08/06/2018 (la de la ficha). Ficha vacia salvo "EMPRESA: SERGIO"; hay un presupuesto (jun-2018).'),
        ('travesiaantonialancha1', '2016-03-11', 'PEDRO ARANDA (THYSSEN)',
         'TRAVESIA ANTONIA LANCHA 1 MADRID. Fecha: 11/03/2016 (la de la ficha). Ficha vacia salvo un contacto: Pablo, 2o D, 91 460 60 70. Hay croquis, borrador de escalera y '
         'presupuesto (mar-abr 2016).'),
        ('travesiasanmateo15', '2017-11-17', 'LUIS MIGUEL NUNES (THYSSEN)',
         'TRAVESIA DE SAN MATEO 15 MADRID. Fecha: 17/11/2017 (la de la ficha). Ficha vacia; hay croquis y un enlace a fotos (nov-2017).'),
        ('tercio5', '2016-01-23', None,
         'TERCIO 5 MADRID. Carpeta SIN ficha de datos: croquis, planos y presupuesto (ene-2016).'),
        ('timon22', '2015-05-09', None,
         'TIMON 22 MADRID. Carpeta SIN ficha de datos: valoracion y presupuesto (may-2015).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# "TIA MARIA HELENA": NO es una comunidad de Madrid. Son dos planos (dwg) de una vivienda unifamiliar con piscina en C/ VALLE DE LA MANSILLA 13, BOADILLA DEL MONTE
# (estado actual, planta baja y primera; el cajetin dice MARZO-2004 y "TECNICOS ASOCIADOS S.L."), guardados el 14/11/2019. Sin ficha. Propuesta: clon cerrada en
# BOADILLA DEL MONTE (municipio de la vivienda), con la ruta tal cual. DUDA para Monica (puede ser la casa de un familiar y no un encargo: entonces, sin fila).
# Sin fila: es algo familiar, no se traslada a la BD (Monica, 7-oct-2026).

# Sin fila: "toreros51" solo tiene "PRESUPUESTO ELEVADOR TOREROS 51.pdf" (Rosersese, 12/09/2024), el mismo que esta en avtoreros51, que ya tiene su fila en la clon (A).

# ================================================================= 3. MANIAS
# (Mania de Tenerife 8 quitada: la nota no dice quien llama; revision, 7-oct-2026)
resumen()
