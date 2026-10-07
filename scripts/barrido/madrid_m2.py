# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda M2 (mariscalgutierrezotero9 .. mesondeparedes80, 38 carpetas [37:75] de la M). 7-oct-2026. Sin --escribir: marcha en seco.
# La M1 [0:37], la M3 [75:112] y la N las preparan otros agentes a la vez.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de

SCHINDLER = '2ca18bd8-5fe2-4e4e-9093-6601c99bbc05'; ANYLOR = '06f6c93d-fcb3-449d-ba51-b14175900d45'; VESTALIA = '66d1bdfc-9e34-4e68-b3e5-cfff02cc55b9'
MONCLOA = 'eeabaa92-d976-4a5c-8f21-a1d4c8e5af90'; TEC_MONCLOA = '4f4773eb-7c2e-4d0d-bc4c-03d9155c09a9'   # Junta de Moncloa-Aravaca y su area "Servicios Tecnicos"
PU.update(oscar_cega='86273a6d-d0f1-4e29-874e-4aba61764673', pescalona='62b2404c-cf2c-4c66-bfc5-e7412a379559', fmozos='08ee90bc-7c51-4ca1-8e2c-b3096f79c755',
          omunoz='d635aab8-1d33-4937-b425-2a5db1012724', mjruiz_atiko='c768611c-65ef-458f-8b45-c8a2f05e5f9a')


def motivo(n, i, m):
    """anade el motivo a la nota i (la fecha ya la puso partir)."""
    f, t = n[i]; n[i] = (f, t + '\n\n(' + m + ')'); return n


def pc_unico(cid, nombre, rol, tel=None, doc=None, email=None, notas_=None):
    """pc() para roles que no son presidente, sin repetirla si el script se relanza."""
    ya = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&nombre=eq.%s' % (cid, quote(nombre)))
    return ya[0]['id'] if ya else pc(cid, nombre, rol, tel, doc, email, notas_)


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))

# ================================================================= 0. AGENDA (solo en contratas, empresas y organismos que ya existen; ninguna administracion ni junta nueva)
MANGUDO = persona_nueva('Alejandro', 'Mangudo', None, None, 'alejandro.mangudo@schindler.com', contrata=SCHINDLER,
                        notas_='Schindler: trae Martin de los Heros 59 bis (may-2022; carpeta martindelosheros59b).')
FATTIO = persona_nueva('Fattio', 'Maldonado', 'Responsable Técnico de Obras', '649 60 52 33', None, empresa=VESTALIA,
                       notas_='Vestalia Administradores, departamento de obras (escribe desde obras@vestaliadministradores.es, que ya esta en la agenda como correo de la empresa). '
                              'Trae Mendivil 64 (abr-2026; carpeta mendivil64).')
persona_nueva('Pilar', 'García', 'técnico', '915884420', None, organismo=MONCLOA, area=TEC_MONCLOA,
              notas_='Junta de Moncloa-Aravaca, servicios tecnicos (tecnimoncloa@madrid.es): tecnica del ayuntamiento en Martin de los Heros 59 bis (2022-2026; carpeta martindelosheros59b).')
persona_nueva('Raúl', None, None, None, 'rlopez@anylor.com', contrata=ANYLOR,
              notas_='Anylor ("Raul Anylor"): en copia en Mercedes Arteaga 45-47 (oct-2023) y agente comercial de Maximiliano 31 (2018; carpetas mercedesarteaga45-47 y maximiliano31).')
persona_nueva('Lorena', None, 'administración', '620 989 678', 'administracion@anylor.com', contrata=ANYLOR,
              notas_='Anylor: administracion (Mercedes Arteaga 45-47, 2021-2024; carpeta mercedesarteaga45-47).')

# ================================================================= 1. PRODUCCION (10 carpetas, 10 oportunidades)
rellenar('ms11', 'MARQUESA DE SILVELA 11', 'marquesadesilvela11', {'fecha_apertura': '2024-07-01', 'referencia_catastral': '9410403VK3791A',
    'origen_notas': 'Fecha de llegada: 07/2024 (dia desconocido; el primer fichero de trabajo es el presupuesto de CEGA firmado, 20/08/2024; la portada de memoria de may-2024 es de plantilla). '
                    'Contacta: Oscar Fernandez (ASCENSORES CEGA; o.fernandez@ascensorescega.com). Constructora: Ascensores CEGA (movil administracion 682 281 318; fijo 91 679 30 92; '
                    'administracion@ascensorescega.com y b.cespedes@ascensorescega.com); en la ficha: "He hablado con Kiko Francisco (617471509) 689499527 Boris". Tipo de obra: ASCENSOR por el '
                    'exterior con ocupacion de via publica + SUBV (contratada en enero de 2025; en la carpeta, subvenciones CAM 2025, Ayto 2025 y Ayto RH 2026, con IEE desfavorable y CEE de ene-2025). '
                    'Barrio: Moscardo. Tecnico: Jonatan Glez -> requerimiento, Jhonatan. Fecha encargo: 20/08/2024. Administracion: URBA GESTORES (Santiago o Nuria; 910 149 444; '
                    'nuria@urbagestores.es, santiago@urbagestores.es, comunidades@urbagestores.es). Presidente: Jose Segura Diaz (00777146E). Visado TL/016464/2024 y TL/002075/2026 (vuelto a visar '
                    'por requerimiento del ayuntamiento). Expediente 350/2024/34483 (Junta de Usera; elevado a la Mesa Tecnica de Ascensores en sep-2025). Licencia concedida (notificada 16/04/2026); '
                    'a la espera de la fecha de inicio de obra. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=fijar('marquesadesilvela11', 2024), trae_pu=PU['oscar_cega'])

rellenar('mt18', 'MARTELL 18', 'martell18', {'fecha_apertura': '2026-04-01',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia desconocido; la ficha se crea el 06/05/2026 y es el unico fichero de la carpeta). Contacta: Pedro (DEL BRIO Y BLANCO; en la agenda, Pedro Escalona). '
                    'Tipo de obra: IEE. La unica nota dice "IEE ENVIADA 07/05/2025" (ano tal cual en la ficha; no cuadra con la llegada de 04/2026). Comercial interno: ALVARO.'},
    ('iee',), n=fijar('martell18', 2026, ('2026-05-07', 'En la ficha "IEE ENVIADA 07/05/2025": errata del ano; la ficha dice llegada 04/2026 y se creo el 06/05/2026.')),
    adm=PU['pescalona'], trae_pu=PU['pescalona'], captador=ALVARO, lleva=ALVARO)

n = fijar('martell27', 2025, ('2025-06-09', 'Correo de Pedro Escalona (Del Brio y Blanco) del 9 de junio de 2025; debajo, la propuesta de Daniel, sin fecha (la HE se envia el 16-06-2025).'))
rellenar('mt27', 'MARTELL 27', 'martell27', {'fecha_apertura': '2025-06-09', 'referencia_catastral': '3409607VK4730G',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: el correo de Pedro Escalona, 09/06/2025: la comunidad pide estudio de viabilidad del ascensor; el certificado de 2023 de la carpeta es de plantilla). '
                    'Contacta: Pedro Escalona (DEL BRIO Y BLANCO; 680 503 243 / 914 778 832; 91 477 41 91 / 91 478 69 11 / 91 477 88 32; pedro@delbrioyblanco.es). Paga la CP. Tipo de obra: '
                    'ASCENSOR + SUBV (derribo completo de escalera; ascensor de 2-3 personas; plataforma elevadora vertical en la entrada; contadores y LGP nuevos; obra aprox. 244.000 IVA incluido). '
                    'Barrio: no lo dice. Tecnico: Carlos Daza. Fecha encargo: 11/12/2025 (HE recibida firmada). Ano 1965. LICENCIA por ECU (ACTECU): proyecto enviado a la ECU 06/02/2026; tasa '
                    'pagada y hoja firmada enviadas a la ECU 30/07/2026; el 30/09/2026 la ECU envia la tasa ICIO y el aval de residuos. Contrata elegida: FAIN, supeditado a la concesion de la '
                    'subvencion. Presidenta: Sonia Rodriguez Fernandez (04186314S; 620 348 920; SoniaRodriFer@gmail.com). Superficie 51,74. En notas de subvenciones: "Obra condicionada a '
                    'concesion de subvencion." La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=n, comunidad={'iban': 'ES98 2085 9741 7503 3035 5260'},
    presi=('SONIA RODRIGUEZ FERNANDEZ', 'presidente', '620348920', '04186314S', 'SoniaRodriFer@gmail.com'), trae_pu=PU['pescalona'])

rellenar('mt28', 'MARTELL 28', 'martell28', {'fecha_apertura': '2025-01-28', 'referencia_catastral': '3308401VK4730G',
    'origen_notas': 'Fecha de llegada: 01/2025 (dia: la primera nota, 28/01/2025: solicita presupuesto para proyecto de ascensor). Contacta: Rosa Radal Sese (ROSERSESE); empresa/cliente: OLIVARES '
                    '(Jose Olivares, jefe de obra). Constructora: ROSERSESE SERVICIOS INTEGRALES SL (Poligono Banuelos nave 6, 28806 Alcala de Henares; 918 949 422; rosersese@hotmail.com). La HE la '
                    'firma Rosa para comenzar (29/01/2025); pedidos los documentos de la CP a Rosa el 29/01/2025. Tipo de obra: ASCENSOR. Barrio: San Diego. Tecnico: KGS -> foso reducido, Carlos. '
                    'Ano 1975. LICENCIA por ECU (ACTECU), aprobada 13-06-2025. Administracion: FINCASA FIXCONTE (fincasafixconte@gmail.com). Presidenta: Maria Soledad Sanchez Lopez (50948507B; '
                    '652 40 37 36; marisol@sanchezbraojos.es; fijo para la IEE 914 789 347). Visado TL/006796/2025. El 07-04-2026, a peticion de Rosa, Alvaro envia la HE de tramitacion de '
                    'subvenciones (con descuento por IEE valida de menos de 2 anos). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor',), n=fijar('martell28', 2025), comunidad={'iban': 'ES50 2085 9741 7803 3034 3270'},
    presi=('MARIA SOLEDAD SANCHEZ LOPEZ', 'presidente', '652403736', '50948507B', 'marisol@sanchezbraojos.es'), trae_pu=PU['rosa'])

rellenar('mh59', 'MARTIN DE LOS HEROS 59B', 'martindelosheros59b', {'fecha_apertura': '2022-05-13', 'referencia_catastral': '9257901VK3795G',
    'origen_notas': 'Fecha de llegada: 05/2022 (dia: la primera nota, la visita del 13/05/2022; el dxf de Catastro de 2021 es una descarga). Contacta: Alejandro Mangudo (SCHINDLER; '
                    'alejandro.mangudo@schindler.com). Paga la CP. Tipo de obra: ELEVADOR + RAMPAS + CSS ("Proyecto basico y de ejecucion para instalacion de ascensor y mejora de accesibilidad '
                    'en edificio residencial existente"; derribo de escalera, todo en vidrio, elevador de 2 paradas sin foso; Schindler estima la obra en unos 25.000). Barrio: Arguelles. '
                    'Tecnico: Susana. Jefe de obra: Manuel Crespo (Schindler; 686 188 207). Administracion: GEIMPRO (Rafael Mendoza; 915 445 456 / 615 188 674; rmendoza@geimpro.net). '
                    'Presidente: Pedro Costa Matanzo (50267953G; 637 426 235). Junta de Moncloa-Aravaca: Pilar Garcia (915 884 420; tecnimoncloa@madrid.es). PEM 41.430,44. Visados TL/019871/2022, '
                    'TL/015986/2023 y TL/013051/2026 (CFO). Expediente 350/2022/13220 (tachado) -> nuevo 350/2023/30241. Licencia (DR tachado); NZ 1 grado 3. Superficie 38,12. Ref. catastral: '
                    '"ojo: el bis corresponde a CL MARTIN DE LOS HEROS 59 (D) Es:2"; segun Catastro hay 2 escaleras con la misma referencia. Obra terminada: CFO visado y registrado en el ayto '
                    '(25-26/08/2026). La ficha no dice comercial interno; la lleva Daniel.'},
    ('plataforma', 'rampa', 'css', 'df'), n=fijar('martindelosheros59b', 2022),
    presi=('PEDRO COSTA MATANZO', 'presidente', '637426235', '50267953G'), trae_pu=MANGUDO)

n = fijar('mejorana6', 2025, ('2025-09-18', 'Correo de Guillermo Pueyo (Del Brio y Blanco) del 18 de septiembre de 2025.'))
rellenar('mj6', 'MEJORANA 6', 'mejorana6', {'fecha_apertura': '2025-09-18',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia: el correo de Guillermo Pueyo, 18/09/2025, que pide la viabilidad del ascensor para la junta del 29 de septiembre). Contacta: Guillermo Pueyo '
                    '(DEL BRIO Y BLANCO; 91 477 41 91 y 91 478 69 11; guillermo@delbrioyblanco.es). Tipo de obra: ASCENSOR (derribo completo de escalera y parcial del muro al patio; ascensor de '
                    '2-3 personas, seis paradas, embarque simple; modificar contadores). HE e informe enviados 22/09/2025. Hay modelo 3D (sep-2025). Comercial interno: DANIEL.'},
    ('ascensor',), n=n, adm=PU['guillermo'], trae_pu=PU['guillermo'])

rellenar('mv64', 'MENDÍVIL 64', 'mendivil64', {'fecha_apertura': '2026-04-28',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: el correo de Vestalia, 28/04/2026, que pide presupuesto de proyecto de ascensor y un modelo 3D para la reunion del dia siguiente). Contacta: '
                    'Fattio Maldonado, responsable tecnico de obras de VESTALIA ADMINISTRADORES (C/ Monte Oliveti 46, Bj-7, 28038; 649 60 52 33; obras@vestaliadministradores.es). Tipo de obra: '
                    'ASCENSOR (derribo completo de escalera; ascensor de 3 personas y cuatro paradas, embarque simple; contadores nuevos; 195.000 EUR + IVA). HE con viabilidad enviada 29-04-2026. '
                    'Comercial interno: DANIEL.'},
    ('ascensor',), n=fijar('mendivil64', 2026, ('2026-04-28', 'Correo de Fattio Maldonado (Vestalia) del 28 de abril de 2026; debajo, la propuesta de Daniel, sin fecha (la HE se envia el 29-04-2026).')),
    adm=FATTIO, trae_pu=FATTIO)

n = partir(fijar('menorca40', 2026, ('2026-03-12', 'Correo de Fernando Mozos (Itaca Fincas) del 12 de marzo de 2026.')), 2, '14-04-2026', '2026-04-14')
rellenar('mn40', 'MENORCA 40', 'menorca40', {'fecha_apertura': '2026-03-12',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia: el correo de Fernando Mozos, 12/03/2026, que necesita hablar con Daniel con urgencia y manda documentacion; el .skb de ene-2026 es de plantilla). '
                    'Contacta: Fernando Mozos (ITACA FINCAS; 91 290 28 38 / 639 181 314; fmozos@itacafincas.net). Tipo de obra: ACCESIBILIDAD Y MODIFICACION DEL ASCENSOR. Informe tecnico '
                    'enviado 24-03-2026; HE enviada 14-04-2026. Comercial interno: DANIEL.'},
    ('accesibilidad', 'modificacion_asc'), n=n, adm=PU['fmozos'], trae_pu=PU['fmozos'])

n = _notas_de('mercedesarteaga45-47', 2021)
n[0] = ('2023-01-23', n[0][1])                       # sin fecha delante: se parte primero y los motivos van despues
n = partir(n, 0, 'De: ÓSCAR MUÑOZ PÉREZ', '2023-10-23')
n = partir(n, 1, 'De:\xa0Beatriz Pallares', '2024-02-29')
n = partir(n, 2, 'De:\xa0Beatriz Pallares', '2024-12-03', vez=2)
n = motivo(n, 0, 'Sin fecha delante; la fecha va dentro de la nota: "A fecha 23/01/2023 la comunidad todavia no ha tomado una decision".')
n = motivo(n, 1, 'Correo de Oscar Munoz (Advocati) del 23 de octubre de 2023, pegado en la ficha.')
n = motivo(n, 2, 'Correo de Beatriz Pallares del 29 de febrero de 2024, pegado en la ficha.')
n = motivo(n, 3, 'Correo de Beatriz Pallares del 3 de diciembre de 2024, pegado en la ficha.')
assert all(f for f, t in n) and len(n) == 5
rellenar('ma45', 'MERCEDES ARTEAGA 45-47', 'mercedesarteaga45-47', {'fecha_apertura': '2021-03-05', 'referencia_catastral': '8716615VK3781F',
    'origen_notas': 'Fecha de llegada: la ficha dice 05/2021, pero su fecha de encargo es 05/03/2021 y las fotos de la visita son del 09/03/2021; se toma la de encargo. Empresa/cliente: ANYLOR '
                    '(ANYLOR CONSTRUCCIONES, S.L., constructora; Av. Niceto Alcala Zamora 28, 5o B, 28050; 917 502 199; Lorena, administracion@anylor.com, 620 989 678; Antonio, a.mira@anylor.com). '
                    'Contacta: Oscar Munoz Perez, de la administracion ADVOCATI (Mercedes Arteaga 56, 28019; 91 364 58 38; oscar@advocati.es, administracion@advocati.es, info@advocati.es, '
                    'asesoria@advocati.es). Tipo de obra: ASCENSOR. Barrio: Opanel. Tecnico: Enrique. Presidente: Ulysse Vaussy (655 171 745; ulysse.vaussy@gmail.com), DATO CADUCADO: es lo ultimo que se sabia en 2023-2024, hay que confirmarlo antes de '
                    'contactar; presidente anterior: Buenaventura Ramos Monsalvo (00346357T) (Monica, 7-oct-2026). PEM 115.882,35 (noviembre 2021). Visado TL/010012/2021. DR 01/02/22. Superficie 54,03. El ayuntamiento '
                    'deniega por los trasteros sin legalizar de la cubierta (expediente de denegacion 111/2022/00412; devolucion de la tasa 111/2022/05131); la legalizacion por prescripcion la '
                    'tramita la arquitecta de la comunidad, Beatriz Pallares (627 824 881; bpmbpmbpm@outlook.es), y la licencia se pide de nuevo (expediente 350/2023/36181). En jun-2025 la licencia '
                    'esta concedida y la obra en marcha. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor',), n=n, trae_pu=PU['omunoz'])
# Buenaventura pasa a presidente ANTERIOR; Ulysse, presidente con el dato CADUCADO (Monica, 7-oct-2026: 'marcarlo como caducado para no darlo por hecho')
for x in b.leer('personas_comunidad?select=id&rol=eq.presidente&nombre=eq.BUENAVENTURA%20RAMOS%20MONSALVO&comunidad_id=eq.' + OPP['ma45'][0]['id']):
    act('personas_comunidad?id=eq.' + x['id'], {'rol': 'otro', 'notas': 'Presidente ANTERIOR (ficha de 2021).'})
if not b.leer('personas_comunidad?select=id&nombre=eq.ULYSSE%20VAUSSY&comunidad_id=eq.' + OPP['ma45'][0]['id']):
    ins('personas_comunidad', [{'id': nuevo_id(), 'comunidad_id': OPP['ma45'][0]['id'], 'nombre': 'ULYSSE VAUSSY', 'rol': 'presidente', 'telefono': '655171745',
        'email': 'ulysse.vaussy@gmail.com', 'documento': None, 'es_contacto_principal': False, 'notas':
         '[DATO CADUCADO] Ultimo presidente conocido (ficha y correos de 2023-2024: "Ha llamado ULYSSE que dice ser el presidente"). Confirmar antes de contactar (Monica, 7-oct-2026).'}])

n = partir(fijar('mesondeparedes80', 2026, ('2026-07-15', 'Sin fecha; la propuesta de Daniel que va con la HE enviada el 15-07-2026.')), 1, '17/07', '2026-07-17')
rellenar('mp80', 'MESON DE PAREDES 80', 'mesondeparedes80', {'fecha_apertura': '2026-07-15',
    'origen_notas': 'Fecha de llegada: 07/2026 (dia: la HE, 15/07/2026; la ficha es del 17/07/2026). Contacta: Maria Jose (ATIKO; C. del Amparo 86, 28012; 912 98 20 05; '
                    'administracion@atikogestion.es). Tipo de obra: ASCENSOR (torre de ascensor en la corrala con pasarelas; ascensor para discapacitados de 1,30 x 1 m con puerta automatica de 80 cm; '
                    'obra aprox. 150.000 + IVA). HE enviada a la CP el 17/07/2026. Comercial interno: DANIEL.'},
    ('ascensor',), n=n, adm=PU['mjruiz_atiko'], trae_pu=PU['mjruiz_atiko'])

# ================================================================= 2. CLON
REVS = [
    ('marmenor21-23-25', '2026-07-01', 'BELEN LOPEZ (DIDEPRO)', None, None,
     'MAR MENOR 21-23-25 MADRID. Fecha: 07/2026 (dia desconocido; el correo de Didepro es del 20/08/2026). Tipo de obra: SATE SOLO FACHADA + SUBV (proyecto de rehabilitacion de la fachada con SATE, '
     'la cubierta ya la cambiaron; con IEE, CEx y LEEx para las ayudas, gestion de las ayudas y DF y CSS supeditadas a su concesion; obra estimada entre 1.000.000 y 1.500.000 EUR; plazo del proyecto '
     '30/10/2026). Distrito Hortaleza. CP 28033. Contacta: Belen Lopez (DIDEPRO; 625 837 685; blopez@didepro.es). En la ficha, la nota "26-05-26 Se rehace la oferta..." va despues de la del '
     '21-08-26 (puede ser errata por 26-08-26). Comercial interno: DANIEL.\n\n' + crudo('marmenor21-23-25', 2026)),
    ('marmenor24', '2022-05-02', 'DIEGO PARDO Y JAVIER (COINSA)', 'H80609498', '5608307VK4850H',
     'MAR MENOR 24 MADRID. Fecha: 05/2022 (dia: la nube de puntos, 02/05/2022; las imagenes de plataformas de jun-2021 parecen de catalogo). Tipo de obra: PLATAFORMA. Distrito Hortaleza. CP 28033. '
     'Tecnico: Carla. Constructor: MONTAJE DE ASCENSORES COINSA, S.L. (Diego Pardo, dpardo@ascensorescoinsa.com). Administracion: Administraciones y Servicios Noroeste, S.L. (C/ Mar Caspio 10, '
     'bajo 1, 28033; 91 764 64 84; lap@asnoroeste.com; admon@asnoroeste.com) - no esta en la agenda (hay una "Admon Fincas Noroeste" con otro dominio). Presidente: Raul Rubio Pinillos '
     '(00838654M). PEM 39.120,00. Visados TL/009949/2022 y TL/006086/2024 (certificado de no modificacion de obra). Expediente 350/2022/04574 (licencia). Superficie 12,55. En la carpeta, '
     'proyecto visado (jul-2022) y tramitacion de la licencia hasta ene-2023. En produccion esta MAR MENOR 12, no el 24.\n\n' + crudo('marmenor24', 2022)),
    ('marquesdecubas6', '2022-03-04', None, None, None,
     'MARQUES DE CUBAS 6 MADRID. Fecha: 03/2022 (dia: los planos "MC-6", 04/03/2022; la hoja de direccion de obra semi-rellenada de ene-2022 es de plantilla). Distrito Centro. CP 28014. '
     'Ficha casi vacia: sin contacto, tipo de obra ni notas.'),
    ('marquesdeviana55', '2026-09-01', 'JAVIER VELASCO (ELECNOR)', None, None,
     'MARQUES DE VIANA 55 MADRID. Fecha: 09/2026 (dia desconocido; la ficha se crea el 01/10/2026). Paga la CP. Tipo de obra: ASC + SUB. Contacta: Javier Velasco (ELECNOR; 680 967 159; '
     'fjvelasco@elecnor.com). Comercial interno: DANIEL.\n\n' + crudo('marquesdeviana55', 2026)),
    ('martin de los heros 38', '2021-08-05', None, 'E78274834', '9455908VK3795E',
     'MARTIN DE LOS HEROS 38 MADRID. Fecha: la ficha dice 01/2022; los primeros ficheros son del 05/08/2021 (subcarpeta "SOLO SE NOS CONTRATO PARA SUBVENCION": facturas 84-2021 y 93-2021, IEE, CEE '
     'y proyecto visado de otros, y la presentacion de la subvencion del 06/08/2021); se toma esa. Paga la CDAD. Tipo de obra: SUBVENCION Ayto Madrid 2021, REPARACION DE DANOS ESTRUCTURALES '
     '(despues, subvencion Ayto 2022). Distrito Moncloa-Aravaca. CP 28008. Administracion: ARCOS OLEA (Raquel Caravantes, contabilidad, y Jose Antonio Tercero; 609 536 365 / 653 133 929; '
     'raquel@arcosolea.es; j.tercero@arcosolea.es), tachada en la ficha; nueva administradora desde septiembre de 2024: Estrella Sacristan Benito, S & S ABOGADAS ADMINISTRADORAS DE FINCAS '
     '(91 401 28 62; fax 91 309 26 72; estrella_sys@yahoo.es - despachosys@gmail.com) - no esta en la agenda. Contrata: Gutierrez y Moralo, S.L. - no esta en la agenda. Hecha la subvencion '
     'de 2021 (y presentada la de 2022); en nov-2023 no se puede presentar a Rehabilita 2023 y se les devuelve el dinero de la renovacion; el 12/05/2026 "NO CUMPLE CONDICIONES PARA '
     'PRESENTARSE A NINGUNA CONVOCATORIA".\n\n' + crudo('martin de los heros 38', 2023)),
    ('martinezizquierdo39', '2025-07-24', 'ANDRES MULAS (ELECNOR)', None, None,
     'MARTINEZ IZQUIERDO 39 MADRID. Fecha: 07/2025 (dia: la visita del 24/07/2025). Tipo de obra: PISCINA (estudiar la piscina y revisar la estructura). Distrito Salamanca. CP 28028. '
     'Contacta: Andres Mulas (ELECNOR; 689 778 586; amulas@elecnor.com; en la agenda esta con amulas@elecnor.es). En la carpeta, la peticion al registro de edificios del Archivo de la Villa '
     '(25/08/2025) y el CIF. Comercial interno: DANIEL.\n\n' + crudo('martinezizquierdo39', 2025)),
    ('mataro17-19-21-23', '2024-01-17', 'ANA ENCINAS (ELECNOR)', None, None,
     'MATARO 17, 19, 21, 23 MADRID. Fecha: 01/2024 (dia: la nota del 17/01/2024). Tipo de obra: la ficha no lo dice. Distrito Fuencarral - El Pardo (Valverde). CP 28034. La carpeta solo tiene la '
     'ficha. En produccion esta MATARO 13, no estos numeros.\n\n' + crudo('mataro17-19-21-23', 2024)),
    ('mataro8', '2025-03-19', 'ANDREA DIAZ SERRANO (ELECNOR)', None, None,
     'MATARO 8 MADRID. Fecha: 03/2025 (dia: la nota del 19/03/2025). Tipo de obra: REHABILITACION DE CUBIERTA. Distrito Fuencarral - El Pardo. Contacta: Andrea Diaz Serrano (ELECNOR; '
     '669 242 519; andrea.diaz@elecnor.com). La carpeta solo tiene la ficha.\n\n' + crudo('mataro8', 2025)),
    ('maximiliano31', '2018-05-09', 'RAUL (ANYLOR)', 'H79577425', '4653309VK4745D',
     'C/ MAXIMILIANO 31 MADRID (en los ficheros, "san maximiliano 31"). Fecha: 09/05/2018 (la de la ficha y el croquis). Tipo de obra: ASCENSOR (lo dicen el proyecto y la obra; la ficha no lo '
     'dice). Distrito 15 - Ciudad Lineal. CP 28017. NZ 4. Agente comercial: Raul (ANYLOR). Presidenta: Alejandra Sanchez Fernandez (02668491P). Fachada 18,5 m. PEM 50.000 (residuos 300). '
     'Superficie 38 m2. Expediente 116/2018/03514. En la carpeta: proyecto visado (jul-2018), dos requerimientos contestados (nov-2018 y feb-2019), ICIO (may-2019) y licencia (jun-2019). '
     'En produccion esta SAN MAXIMILIANO 23, no el 31. La ficha no tiene notas.'),
    ('mayor43', '2024-11-25', 'CARLOS (CONDE ASESORES)', None, None,
     'MAYOR 43 MADRID. Fecha: 11/2024 (dia: la cita de la visita, 25/11/2024). Tipo de obra: ASCENSOR ("escalera muy complicada, ver viabilidad"; ascensor en el patio con acceso por la ventana de '
     'la cocina de cada vivienda; obra estimada en 130.000). Distrito Centro. CP 28012. Administracion: CONDE ASESORES (Carlos; condeasesoresadmon@gmail.com). Contactos de la comunidad: Federico '
     'Yebra (670 622 822, preferente) y Mabel, presidenta (667 448 945; mabelalonso@telefonica.net). HE de proyecto + subvencion enviada. La ficha no dice comercial interno.\n\n'
     + crudo('mayor43', 2024)),
    ('medellin10', '2023-04-18', 'MANUELA MARTINEZ (CONTESA AUDITORES)', None, None,
     'MEDELLIN 10 MADRID. Fecha: 04/2023 (dia: la nota del 18/04/2023). Paga la CDAD. Tipo de obra: ACCESIBILIDAD O ASCENSOR. Distrito 07 - Chamberi (Trafalgar). CP 28010. NZ 1 grado 4. '
     'Administracion: Contesa Auditores, S.L. (Manuela Martinez; C/ Aragon 35-37, Urb. Valderrey, 28110 Algete; 699 941 254; manuelamartinez@contesa-auditores.com) - no esta en la agenda. '
     'Hay un video de las zonas comunes (24/04/2023).\n\n' + crudo('medellin10', 2023)),
    ('mercedesarteaga50', '2017-04-05', 'ANDRES (ENGWE)', 'H79719456', '8716213VK3781F',
     'MERCEDES ARTEAGA 50 MADRID. Fecha: 05/04/2017 (la de la ficha; fotos de la visita del 07/04/2017). Tipo de obra: ASCENSOR (lo dicen el proyecto y la obra). Distrito 11 - Carabanchel. '
     'CP 28019. NZ 4. Agente: Andres, de ENGWE (en la agenda, como "CUIDADO ESTOS NO"). Representante: Pedro de la Ossa Navarro (670 601 781; possan3@gmail.com). Fachada 20,60. PEM 50.000 '
     '(residuos 300). Superficie 44,44 m2. Junta de Carabanchel (Av. Plaza de Toros 17, 91 588 71 15 y 91 588 71 16; Plaza de Carabanchel 1; negociado de licencias 91 588 71 08, con cita previa, '
     'solo los miercoles); tecnica Sara Paton. Expediente 111/2017/05420. En la carpeta: proyecto visado TL-011917-2017 (jun-2017), requerimiento (oct-2017) y contestacion (ene-feb 2018), licencia '
     '(abr-2018), informe de avance de obra (jul-2019) y un "conflicto" con el contrato firmado del ascensor (dic-2019). La ficha no tiene notas.')]
for carp, fecha, trajo, cif, ref, t in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV)
for carp, fecha, trajo, t in [
        ('mariscalgutierrezotero9', '2017-06-27', 'PEDRO ARANDA (THYSSEN)', 'MARISCAL GUTIERREZ OTERO 9 MADRID (Villaverde). Fecha: 27/06/2017. Ficha vacia; hay croquis y presupuesto (jun-2017).'),
        ('marquesviudodepontejos3', '2017-03-08', 'PEDRO ARANDA (THYSSEN)', 'MARQUES VIUDO DE PONTEJOS 3 MADRID. Fecha: 08/03/2017 (la de la ficha). Ficha vacia; hay ficha urbanistica y '
         'presupuesto (abr-2017).'),
        ('mascaraque32', '2017-03-09', 'PEDRO ARANDA (THYSSEN)', 'C/ MASCARAQUE 32 MADRID. Fecha: 09/03/2017 (la de la ficha; el render de feb-2017 es una copia del de Mascaraque 48). Ficha vacia; '
         'hay croquis, plano y presupuesto (mar-2017).'),
        ('mascaraque36', '2017-05-04', 'PEDRO ARANDA (THYSSEN)', 'C/ MASCARAQUE 36 MADRID. Fecha: 04/05/2017. Ficha vacia; hay croquis y presupuesto (may-2017).'),
        ('mascaraque38', '2017-10-10', 'PEDRO ARANDA (THYSSEN)', 'C/ MASCARAQUE 38 MADRID. Fecha: 10/10/2017. Distrito 11 Carabanchel. Ficha vacia; hay croquis (el de Mascaraque 36) y presupuesto '
         '(oct-2017).'),
        ('mascaraque48', '2017-02-03', 'PEDRO ARANDA (THYSSEN)', 'Carpeta "mascaraque48"; la ficha dice "c/ MASCARAQUE 40" y hay un plano y un croquis de Mascaraque 40 (dic-2016 y feb-2017) junto a '
         'plano, render y presupuesto de Mascaraque 48 (feb-2017). Fecha: 03/02/2017 (la de la ficha). Ficha vacia.'),
        ('mascaraque52', '2017-03-09', 'PEDRO ARANDA (THYSSEN)', 'C/ MASCARAQUE 52 MADRID. Fecha: 09/03/2017. Ficha vacia; hay croquis y presupuesto (mar-2017).'),
        ('mascaraque60', '2017-03-09', 'PEDRO ARANDA (THYSSEN)', 'C/ MASCARAQUE 60 MADRID. Fecha: 09/03/2017. Ficha vacia; hay croquis y presupuesto (mar-2017).'),
        ('mediodiagrande12', '2017-02-03', 'PEDRO ARANDA (THYSSEN)', 'C/ MEDIODIA GRANDE 12 MADRID. Fecha: 03/02/2017. Ficha vacia; hay apuntes y presupuesto (feb-2017).'),
        ('marmenor28-38', '2022-03-18', None, 'Carpeta "marmenor28-38" SIN ficha de datos: solo un pdf "CL MAR MENOR,28-38 - MADRID" (18/03/2022).'),
        ('martinezoviol43', '2016-01-20', None, 'Carpeta "martinezoviol43" SIN ficha de datos: croquis y presupuesto (20/01/2016).'),
        ('martinezvillergas12', '2020-06-24', None, 'Carpeta "martinezvillergas12" SIN ficha de datos: presupuesto de FAIN (24/06/2020), fotos de la visita (15/07/2020) y planos y '
         'documentacion de proyecto de un ascensor (jul-2020).'),
        ('Mazarrado12', '2018-10-05', None, 'Carpeta "Mazarrado12" SIN ficha de datos: croquis, fotos, video de WhatsApp y planos "Mazarrado 12" (05/10/2018).'),
        ('mejorana7', '2016-11-08', None, 'Carpeta "mejorana7" SIN ficha de datos: oferta de ascensor 21M.1029 (08/11/2016) y presupuesto "MEJORANA 7-MADRID" (nov-dic 2016).'),
        ('mesejo9', '2020-03-22', None, 'Carpeta "mesejo9" SIN ficha de datos: captura de pantalla del 22/03/2020, planos del PGOU, "MEMORIA VALORADA Mesejo 90" y comunicacion previa con su '
         'justificante (30/03/2020; en los ficheros pone Mesejo 90, no 9), y una hoja de presupuesto para licencia de obra (feb-2021).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)
# "MEMORIA VALORADA X": SIN fila. No es un edificio: es una PLANTILLA de memoria valorada (campos de combinacion MERGEFIELD, ene-mar 2022) que quedo rellena con
# los datos de otra obra (Calle Pelayos 11, FUENLABRADA).

# ================================================================= 3. MANIAS
mania('Si la licencia del ascensor esta parada por obras sin legalizar (trasteros en cubierta) y el reconocimiento de prescripcion esta en tramite, se puede volver a pedir la licencia '
      'aportando, ademas del proyecto, la documentacion de la solicitud de prescripcion.', 'Junta Municipal de Distrito de Carabanchel (licencias)', '2023-10-23', 'mercedesarteaga45-47', clave='ma45',
      trozo='Dado que el reconocimiento de prescripción está en proceso')
resumen()
