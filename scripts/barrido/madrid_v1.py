# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda V1 (valdecaleras6 .. valmojado283, carpetas [0:29] de la V). 7-oct-2026. Sin --escribir: marcha en seco.
# La V2 [29:58] y la V3 [58:87] las preparan otros agentes a la vez.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de, _lineas

FAIN = 'fa005671-8d23-45a6-8172-0ea7ca8c8950'; GRADCOM = 'e1c10100-e552-46cb-ade9-e94c11c68cbc'; ELITE = 'a8d18493-f4af-4a72-aa61-6c32692091d5'
MONCLOA = 'eeabaa92-d976-4a5c-8f21-a1d4c8e5af90'
PU.update(alba_rojo='61038fa7-f2fa-4dfa-a169-dae52465513c', cesar_rodisa='6b24ade0-b593-4afb-bf9f-628afd1bd77f', raul_rodisa='d01ec2c9-4a66-475f-aaba-38247429e88c',
          magomez_fain='84f6210b-6fc3-48c4-b18c-b8cffb9416c9', galvez_fain='28466e87-4da3-454c-a1d0-8dc9a2873ad4', sara_fain='92d3c6d3-3388-4b69-a65a-ea0e078cb04f',
          ddiaz_schindler='fd214300-b0f8-4abe-bf86-f9e4e4d0e7bb', juana_acayma='58951ea3-d9e8-48fa-ba2b-a58300331760', cerezo='7f4218f5-8b8e-45a0-9cba-b2880ccfc4c3',
          jvelasco='94b4d0ec-edd7-4038-a58f-0823b287fa8f', alejandra_rio='f7f8500c-168c-4f1c-be20-7394c4557efe')
CEREZO = (' Raul Cerezo es un comercial freelance que colabora con Accesalia: trae la oportunidad y el mismo pasa la hoja de encargo al cliente (Monica, 6-oct-2026).')

# Propuesta para Monica: Valdesangil 14-24 es UNA comunidad de produccion (los seis portales, misma parcela 9401118VK3890A) y su opp solo
# esta enlazada al portal 14. Se enlazan los portales 16, 18, 20, 22 y 24 (las subvenciones de accesibilidad son de toda la comunidad).
VALDESANGIL_TODOS_LOS_PORTALES = False   # Monica (7-oct-2026): la subvencion va con el proyecto, que se hizo solo para el 14
ACC_VALDESANGIL = {'16': '4e5c9309-a6b7-4fae-9522-878927cbc986', '18': 'be2075eb-c245-48a5-9dce-a1d047d566d5', '20': '2131d26c-5660-42c6-a447-6d6917955559',
                   '22': '504e5ba7-307b-4e0a-83f1-0fddf3ca35f2', '24': 'bc6ea18c-1a96-4b9d-b46b-76e1e47691c5'}


def cid_de(prefijo):
    cs = b.leer('comunidades?select=id&municipio=eq.MADRID&nombre=like.' + quote(prefijo) + '*'); assert len(cs) == 1, prefijo
    return cs[0]['id']


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto o ya no vigente. Devuelve su id."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1:
        act('personas_comunidad?id=eq.' + d[0]['id'], datos); return d[0]['id']


def pc_unico(cid, nombre, rol, tel=None, doc=None, email=None, notas_=None):
    """pc() para roles que no son presidente, sin repetirla si el script se relanza."""
    ya = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&nombre=eq.%s' % (cid, quote(nombre)))
    return ya[0]['id'] if ya else pc(cid, nombre, rol, tel, doc, email, notas_)


def alta_admin(nombre, notas_, telefono=None, direccion=None, email=None):
    """administracion de fincas nueva que lleva una comunidad de PRODUCCION (criterio de Monica, ADMONPATRIMONIOS, 7-oct-2026). Copiada de madrid_m3.py."""
    ya = b.leer('empresa?select=id&nombre_accesalia=eq.' + quote(nombre))
    if ya: return ya[0]['id']
    i = nuevo_id()
    ins('empresa', [{'id': i, 'nombre_accesalia': nombre, 'tipo': 'administracion_fincas', 'activa': True, 'comercial_id': DANIEL,
                     'telefono': telefono, 'direccion': direccion, 'notas': notas_}])
    if email and not b.leer('correo?select=id&email=ilike.' + quote(email)):
        ins('correo', [{'empresa_id': i, 'email': email, 'etiqueta': 'general', 'principal': True}])
    return i


def enlazar(oid, acc, de_donde):
    if not b.leer('relacion_oportunidad_accesos?select=acceso_id&opp_id=eq.%s&acceso_id=eq.%s' % (oid, acc)):
        ins('relacion_oportunidad_accesos', [{'opp_id': oid, 'acceso_id': acc, 'de_donde': de_donde}])


def bloque(c, i, j):
    """lineas i..j (incluidas) de la ficha, sin las vacias."""
    return '\n'.join(l for l in _lineas(c)[i:j + 1] if l.strip()).strip()


def motivo(n, i, m):
    f, t = n[i]; n[i] = (f, t + '\n\n(' + m + ')'); return n


def fecha_a(n, i, f, m):
    g, t = n[i]; n[i] = (f, t + '\n\n(' + m + ')'); return n


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
cl = lambda c, a, s=None: J(fijar(c, a, s))

# ================================================================= 0. AGENDA
# Administracion nueva de una comunidad de PRODUCCION (Valmojado 235). No esta en la agenda con ningun nombre ni dominio (jcfincas).
JCF = alta_admin('JCFINCAS', 'Alta en el barrido de Madrid: administracion de Valmojado 235 (ficha de feb-2026; carpeta valmojado235).')
YOLANDA = persona_nueva('Yolanda', 'González', None, '917528196', 'ygonzalez@jcfincas.es', empresa=JCF,
                        notas_='JCFINCAS: contacto de Valmojado 235 (ascensor, feb-2026; carpeta valmojado235).')
# Personas nuevas en contratas / administraciones que YA existen (todas con correo)
persona_nueva('Arturo', 'García', None, None, 'arturo.garcia@fainascensores.com', contrata=FAIN,
              notas_='FAIN: en la ficha de Valderrobres 37, junto a Miguel Angel Gomez (2024-2026; carpeta valderrobres37). Sin cargo ni telefono.')
persona_nueva('Iván', None, None, None, 'ivanp_63@yahoo.es', contrata=GRADCOM,
              notas_='GRADCOM: en la ficha de Valdevarnes 4, \'"GRADCOM (EUGENIO O IVAN)" <ivanp_63@yahoo.es>\' (2025; carpeta valdevarnes4). Sin apellidos ni telefono.')
persona_nueva('Alicia', 'Pérez-Nieto Mercader', None, '690340987', 'alicia.perez@tkelevator.com', contrata=TKE,
              notas_='TKE: contacto de Valle de Tobalina 46 (reforma de edificio, mar-2023; carpeta valledetobalina46).')
persona_nueva('Juan', 'Ramírez', None, '680837234', 'jramirez@elitemadrid.es', empresa=ELITE,
              notas_='ELITE (Elite Gestion): contacto de Valdetorres de Jarama 13-21 (SATE y ascensor, abr-2023; carpeta valdetorresdejarama13-15-17-19-21).')
# RIO GESTION INTEGRAL: Alejandra no tenia telefono en la agenda (ficha de Valderrobres 37, jun-2026)
if not (b.leer('puesto?select=telefono_empresa&id=eq.' + PU['alejandra_rio'])[0]['telefono_empresa']):
    act('puesto?id=eq.' + PU['alejandra_rio'], {'telefono_empresa': '623 757 958 / 910 090 695'})
# Junta de Moncloa-Aravaca (ya existe): direccion y negociados que salen en los correos de Valdeverdeja 31 (jun-sep 2026). Son DATOS, no manias.
if not (b.leer('organismos?select=direccion&id=eq.' + MONCLOA)[0]['direccion']):
    act('organismos?id=eq.' + MONCLOA, {'direccion': 'C/ Francos Rodríguez 77'})
NLIC = area(MONCLOA, 'Negociado de Licencias', None,
            'nlicenciasmoncloa@madrid.es. Los tecnicos del distrito atienden sin cita en la Junta (C/ Francos Rodriguez 77) los lunes y miercoles de 9:30 a 11:00; '
            'servicio tecnico: tecnimoncloa@madrid.es (correo del 16/06/2026 sobre Valdeverdeja 31; carpeta valdeverdeja31).')
NVIAS = area(MONCLOA, 'Negociado de Autorizaciones Vía Pública', None,
             'nviasmoncloa@madrid.es (tramita la concesion demanial de Valdeverdeja 31; correo del 02/09/2026; carpeta valdeverdeja31).')
for ar, em in ((NLIC, 'nlicenciasmoncloa@madrid.es'), (NVIAS, 'nviasmoncloa@madrid.es')):
    if not b.leer('correo?select=id&email=eq.' + em):
        ins('correo', [{'organismo_area_id': ar, 'email': em, 'etiqueta': 'general', 'principal': True}])

# ================================================================= 1. PRODUCCION (14 carpetas, 14 oportunidades)
rellenar('vc5', 'VALDECANILLAS 5 ', 'valdecanillas5', {'fecha_apertura': '2024-10-25', 'referencia_catastral': '6659202VK4765H',
    'origen_notas': 'Fecha de llegada: 10/2024 (dia: la primera nota, 25/10/2024, "nos envia proy basico y de ejecucion de otro arquitecto ya visado"; es tambien la fecha de los '
                    'primeros ficheros). Contacta y paga: la CP, a traves de su administrador, Diego Rojo (ROJO JUSDI; 625 145 522; admirojojusdi@gmail.com). Tipo de obra: SOLO DF '
                    'Y CSS DE ASCENSOR (proyecto externo, del arquitecto Juan Carlos Reus Hungria, COAM 11827, visado TL/013878/2023) + SUBVENCIONES; hay que pedir la venia del '
                    'arquitecto anterior. Barrio: Simancas. Fecha encargo (ficha): 16/01/2025; HE de DF, CSS y subvenciones firmadas 13/02/2025 ("pedidos docs para IEE, licencia y '
                    'presup firmado 13/02"). Comunidad: CDAD PROP CL VALDECANILLAS 5 (CIF H79924841). Presidente: Xuechao Yang (X5946840Y). Visado de DO y CSS TL/003403/2025. '
                    'Expediente 350/2023/28779, LICENCIA. Presupuestos pedidos a CEGA, Schindler y FAIN (oct-2024). En la carpeta, la obra (3.OBRA). El administrador pide '
                    'retrasar el fin de obra a enero de 2026 para concursar a las subvenciones del Ayuntamiento (09/10/2025). La ficha no dice comercial interno; la lleva Daniel.'},
    ('df', 'css', 'subvenciones'), n=fijar('valdecanillas5', 2024), comunidad={'iban': 'ES68 6724 8440 0512 1492 0125'}, trae_pu=PU['diego'])

rellenar('vc51', 'VALDECANILLAS 51', 'valdecanillas51', {'fecha_apertura': '2025-08-12', 'referencia_catastral': '7162102VK4776A',
    'origen_notas': 'Fecha de llegada: 08/2025 (dia: el correo de Alba Pedraja, 12/08/2025; el presupuesto de Rosersese de feb-2025 de la carpeta es de otra obra, Colmenar '
                    'Viejo 1, copiado). Contacta: Alba Pedraja Sanchez (ROJO JUSDI ADMINISTRACION; C/ Valdecanillas 90, local 1, 28037; 913 750 530 / 625 145 522; '
                    'admirojojusdi@gmail.com). Paga: la CP. Tipo de obra: RAMPA Y MEJORA DE DECORACION DE PORTAL + CSS + SUBV (y IEE: "rectificar encargo con IEE"); la rampa '
                    'inicial no es viable y se resuelve falseando la cota del portal (oct-2025). Tecnica: Carla. Fecha encargo: 19/09/2025 (HE firmada). Ano 1962. Comunidad: CDAD '
                    'PROP CL VALDECANILLAS N 51 (CIF H79710356). Presidente: Juan Rafael Caso Diaz (26194363P; 686 989 513). Contrata: Sacefa Reformas (David Faraco; '
                    'sacefa@outlook.es). Superficie 14,16. Tramita la ECU (ACTECU): tasa de licencia y hoja de encargo de la ECU (jul-sep 2026). En la carpeta, subvencion del '
                    'Ayuntamiento "Adapta" 2026. Comercial interno: DANIEL.'},
    ('rampa', 'accesibilidad_portal', 'css', 'subvenciones', 'iee'),
    n=fijar('valdecanillas51', 2025, otros={0: ('2025-08-12', 'Correo de Alba Pedraja (Rojo Jusdi) del 12 de agosto de 2025.')}),
    presi=('JUAN RAFAEL CASO DIAZ', 'presidente', '686989513'), trae_pu=PU['alba_rojo'])

rellenar('vc74', 'VALDECANILLAS  74', 'valdecanillas74', {'fecha_apertura': '2026-01-19',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: la HE con viabilidad, 19/01/2026; es el unico fichero, la ficha). Contacta: Diego Rojo (ROJO JUSDI ADMINISTRACION; C/ Valdecanillas '
                    '90, local 1, 28037; 913 750 530 / 625 145 522; admirojojusdi@gmail.com). Tipo de obra: DISENO DE TRASTEROS BAJO RASANTE DE EDIFICIO EXISTENTE (un trastero por '
                    'vivienda, cumpliendo ventilaciones y tamanos del PGOUM; PEM estimado 170.000 EUR + IVA). Comercial interno: DANIEL.'},
    ('otros_proyecto_tecnico',), n=fijar('valdecanillas74', 2026, ('2026-01-19', 'Sin fecha; valoracion de Daniel que acompana la HE del 19/01/2026.')),
    adm=PU['diego'], trae_pu=PU['diego'])

rellenar('vc82', 'VALDECANILLAS 82', 'valdecanillas82', {'fecha_apertura': '2026-04-21',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: el escaneo 3D, 21/04/2026). Contacta: Diego Rojo (ROJO JUSDI ADMINISTRACION; 913 750 530 / 625 145 522; admirojojusdi@gmail.com). '
                    'Tipo de obra: LEGALIZAR TRASTEROS (adecuar un sotano sin uso para proyectar y legalizar 19 trasteros; PEM estimado 190.000 EUR). HE enviada 27/04/2026. '
                    'Comercial interno: ALVARO.'},
    ('otros_proyecto_tecnico',), n=fijar('valdecanillas82', 2026, ('2026-04-27', 'Sin fecha delante; la fecha va dentro de la nota.')),
    adm=PU['diego'], trae_pu=PU['diego'], captador=ALVARO, lleva=ALVARO)

cvr = cid_de('VALDERROBRES 37')
arreglar_pc(cvr, 'rol=eq.presidente&nombre=like.*REVISAR*', {'nombre': 'MANUEL PARRA GARCIA', 'telefono': '619316077',
            'notas': 'En la ficha, junto al nombre: "(REVISAR CUANDO LLEGUE)"; "Presidente Manuel 3o E".'})
rellenar('vr37', 'VALDERROBRES 37', 'valderrobres37', {'fecha_apertura': '2024-10-28', 'referencia_catastral': '8472806VK4787A',
    'origen_notas': 'Fecha de llegada: 10/2024 (dia: la toma de datos de la visita, 28/10/2024, y "pedidos docs CP 28/10/2024"; las escaleras BIM de 2023 de la carpeta son de '
                    'plantilla). Contacta: Miguel Angel Gomez (FAIN; miguelangel.gomez@fainascensores.com; en la ficha tambien arturo.garcia@fainascensores.com). Paga: la CP la '
                    'subvencion y FAIN el proyecto. Tipo de obra: ASCENSOR + SUBVENCIONES. Tecnico: Dario. Ano 1965. Tramita la ECU (ACTECU): LICENCIA POR ECU aprobada el '
                    '09/05/2025. Administracion anterior, tachada: Prevenido Contra la Morosidad, S.L. (Luis de Retamar; C/ Boltana 72, local; 913 923 130 / 914 039 191; '
                    'infoprevenidomadrid@gmail.com). Administracion actual: RIO GESTION INTEGRAL (cambio notificado el 11/06/2026; Calle Seis 6; Alejandra; 623 757 958 / '
                    '910 090 695; fincas@riogestionintegral.es); en copia de su correo del 26/06/2026, mar.bustamante.soleto62@hotmail.com y Esther (e.moli.burgos@gmail.com). '
                    'Comunidad: CDAD PROP VALDERROBRES 37 (CIF H78949120). Presidente: Manuel Parra Garcia (51334028Y; 3o E; 619 316 077), "(REVISAR CUANDO LLEGUE)". '
                    'Visado TL/001175/2025. Expediente 350/2025/02269. Sin empezar la obra: la comunidad espera a la subvencion (abr-2026); HE de renovacion de la subvencion '
                    '(may-2026). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=fijar('valderrobres37', 2024), trae_pu=PU['magomez_fain'])

rellenar('vs14', 'VALDESANGIL', 'valdesangil14-24', {'fecha_apertura': '2024-10-28',
    'origen_notas': 'Fecha de llegada: 10/2024 (dia: la HE de "subvenciones a exito pry externo" del 28-10-2024, en el nombre del fichero). Contacta: Cesar Rodriguez, el administrador '
                    '(RODISA; C/ Valdesangil 16, local, 28039; 91 373 51 43; cesar@administracionrodisa.es). Paga: la CP. Tipo de obra: SUBVENCIONES ACCESIBILIDAD (proyecto '
                    'externo). La ficha no tiene notas. En la carpeta: IEE y CEE registrados (dic-2024; nuevo registro de la IEE en oct-2025), presupuestos de Parraga firmados '
                    '(dic-2024 y ene-2025), tasas de licencia (ene-2025), y subvenciones del Ayuntamiento 2024 (con certificado final de obra), CAM 2025, Ayuntamiento 2025 y '
                    'Rehabilita 2026 (presentada 03/06/2026). La ficha no dice comercial interno; la lleva Daniel.'},
    ('subvenciones',), trae_pu=PU['cesar_rodisa'])
if VALDESANGIL_TODOS_LOS_PORTALES:
    for num, acc in ACC_VALDESANGIL.items():
        enlazar(OPP['vs14'][1], acc, 'Barrido de Madrid (7-oct-2026): la comunidad es VALDESANGIL 14-24 (misma parcela 9401118VK3890A); portal %s.' % num)

rellenar('vv16', 'VALDEVARNES 16', 'valdevarnes16', {'fecha_apertura': '2019-12-01', 'referencia_catastral': '9202532VK3890C',
    'origen_notas': 'Fecha de llegada: DICIEMBRE 2019 (dia desconocido; los primeros ficheros, croquis y fotos, son del 20/01/2020). Agente comercial: Jose Maria Galvez (FAIN). '
                    'Contacto: Raul Diaz (RODISA; 91 373 51 43; raul.diaz@administracionrodisa.es). Tipo de obra: PROYECTO DE BAJADA DE ASCENSOR A COTA CERO. Comunidad: CDAD '
                    'PROP VALDEVARNES 16 (CIF H79922423). Presidenta (ficha de 2019): Ma del Carmen Gorris Martin (51317251L). Ano 1976; 10 viviendas. Fachada 13 m. PEM '
                    '44.591,69. Expediente 109/2020/01539 (licencia por procedimiento ordinario). Superficie 13,00 m2. "Pedida cita subv 13/01/22 a las 9.30 tlf". COAM '
                    'TL/020650/2023. Jefe de obra: Eusebio Medina. En la carpeta: licencia (2020-2022), obra (PSS y apertura del centro de trabajo, dic-2021; actas, jul-2022), '
                    'certificado final a origen (dic-2023), CFO visado (ene-2024) y subvenciones 2020, Ayuntamiento 2021 y Plan Rehabilita 2022 (concedida; justificada en '
                    '2024-2025). La ficha no dice comercial interno; la lleva Daniel.'},
    ('cota_cero', 'subvenciones'), n=[('2025-11-26', '26/11/2025 HE RENOV SUBV ACC ENVIADA')],
    comunidad={'cif_comunidad': 'H79922423', 'iban': 'ES69 2038 1116 7960 0080 8641'},
    presi=('Mª DEL CARMEN GORRIS MARTIN', 'presidente', None, '51317251L', None,
           '[DATO CADUCADO] Sale solo en la ficha de 2019-2020; confirmar antes de contactar.'),
    adm=PU['raul_rodisa'], trae_pu=PU['galvez_fain'])
assert not _notas_de('valdevarnes16', 2019) and '26/11/2025 HE RENOV SUBV ACC ENVIADA' in _lineas('valdevarnes16')

cv24 = cid_de('VALDEVARNES 24')
arreglar_pc(cv24, 'rol=eq.presidente', {'nombre': 'CARLOS FRESCO DEGANO', 'documento': '47461309G', 'telefono': '620418864', 'email': 'cfresde@gmail.com',
            'notas': 'En la app estaba pegado al anterior ("SALVADOR SANCHEZ GUERREROCARLOS FRESCO DEGANO", DNI "02815106K 47461309G"); en la ficha el anterior esta tachado.'})
pc_unico(cv24, 'SALVADOR SANCHEZ GUERRERO', 'otro', '649409982', '02815106K', None, 'Presidente ANTERIOR (tachado en la ficha; 5o A).')
n = partir(fijar('valdevarnes24', 2024), 8, '22/05/2026 CONFIRMA', '2026-05-22')
rellenar('vv24', 'VALDEVARNES 24', 'valdevarnes24', {'fecha_apertura': '2024-02-19', 'referencia_catastral': '9202537VK3890C',
    'origen_notas': 'Fecha de llegada: 02/2024 (dia: la visita, 19/02/2024; el .dwg de 2023 de la carpeta es de plantilla). Contacta y paga: SCHINDLER (Javier Rodriguez, desde '
                    '10/2024). Tipo de obra: BAJADA A COTA CERO Y AMPLIACION DE PARADA, CEE E IEE + SUBV (proyecto basico y de ejecucion para mejora de accesibilidad en planta '
                    'baja). Tecnicos: Alex / Carla. Fecha encargo: 28/05/2025 (HE de la IEE firmada solo por la CP). Ano 1979. Administracion: RODISA SL (Victoria Jorba, '
                    'Departamento de Atencion al Cliente; Valdesangil 16, local, 28039; 91 373 51 43; gestion@administracionrodisa.es). Comunidad: CDAD PROP CL VALDEVARNES 24 '
                    '(CIF H79724944). Presidente: Carlos Fresco Degano (47461309G; 620 418 864; cfresde@gmail.com); antes, tachado, Salvador Sanchez Guerrero (5o A; 02815106K; '
                    '649 409 982). PEM 103.277,90. Visado TL/008444/2026. Superficie 13,26 m2. Tramita la ECU (ACTECU): DR registrada en el Ayuntamiento el 01/06/2026; '
                    'Schindler dice que la obra esta empezada. La ficha no dice comercial interno; la lleva Daniel.'},
    ('cota_cero', 'anadir_parada', 'cee', 'iee', 'subvenciones'), n=n, comunidad={'iban': 'ES94 0081 0361 4500 0192 7893'}, trae_pu=PU['jrodriguez'])

rellenar('vv4', 'VALDEVARNES 4 ', 'valdevarnes4', {'fecha_apertura': '2024-02-13', 'referencia_catastral': '9202530VK3890C',
    'origen_notas': 'Fecha de llegada: 02/2024 (dia: el correo de Daniel Diaz, de Schindler, 13/02/2024; el escaneo es del 19/02/2024). Contacta: Daniel Diaz (SCHINDLER; 699 684 406; '
                    'daniel.diaz@schindler.com), tachado en la ficha; ahora Javier Rodriguez Martin (Schindler, desde dic-2024; 685 286 041; '
                    'javier.rodriguez.martin@schindler.com). Tipo de obra: ELEVADOR, BAJADA A COTA CERO + DF + SUBV (no CSS), lo paga Schindler; la IEE aparte, la paga la CP. '
                    'Barrio: Valdezarza. Tecnico: Jhonatan. Fecha encargo: 11/03/2025. En la ficha tambien "Manuel Crespo", sin cargo. Ano 1981. Administracion: RODISA '
                    'ADMINISTRACION DE FINCAS SL, "a traves de Javier de Schindler" (Victoria Jorba, atencion al cliente; Raul Diaz; 91 373 51 43; gestion@administracionrodisa.es, '
                    'raul.diaz@administracionrodisa.es). Comunidad: CDAD PROP CL VALDEVARNES N 4 (CIF H79920500). Presidente: Claudio del Palacio Alonso (00651614R; 618 565 376; '
                    'claudio53pala@gmail.com). Constructora: GRADCOM (Eugenio o Ivan; ivanp_63@yahoo.es). PEM 81.803,53. Visado TL/016546/2025. Superficie 64,46 m2. Tramita la '
                    'ECU (ACTECU): tasas pagadas y documentacion registrada (31/10/2025). La ficha no dice comercial interno; la lleva Daniel.'},
    ('cota_cero', 'df', 'subvenciones', 'iee'),
    n=fijar('valdevarnes4', 2024, otros={0: ('2024-02-13', 'Sin fecha delante; correo de Daniel Diaz (Schindler) del 13/02/2024, la fecha va dentro.')}),
    presi=('CLAUDIO DEL PALACIO ALONSO', 'presidente', '618565376', None, 'claudio53pala@gmail.com'), trae_pu=PU['ddiaz_schindler'])

cvv = cid_de('VALDEVERDEJA 31')
pc_unico(cvv, 'TOMAS GONZALEZ', 'vecino', '696860537', None, 'tomas.gonzalez.martin@gmail.com',
         'Vecino del 2o A; contacto de la comunidad en la ficha; envia un croquis en CAD del ascensor (sep-2025).')
n = fijar('valdeverdeja31', 2024, otros={18: ('2026-07-17', 'Errata corregida: en la ficha pone 17/06/2026, pero el correo de Raul Diaz es del 17 de julio de 2026 y va despues de la '
                                                       'inadmision del 16/07/2026.')})
rellenar('vd31', 'VALDEVERDEJA 31', 'valdeverdeja31', {'fecha_apertura': '2024-05-21', 'referencia_catastral': '9401114VK3890A',
    'origen_notas': 'Fecha de llegada: 05/2024 (dia: los croquis de estado actual y reformado de FAIN, 21/05/2024; los de 2008-2017 son de FAIN, anteriores a nosotros; la primera '
                    'nota es del 06/06/2024). Contacta y paga: FAIN (Sara Bajo Marana; 605 457 818; sara.bajo@fainascensores.com); la subvencion tambien la paga FAIN. Tipo de '
                    'obra: BAJADA A COTA CERO + CSS + SUBV (proyecto basico y de ejecucion para instalacion de ascensor). Tecnico: KGS, despues Israel (requerimiento). Fecha '
                    'encargo: 26/08/2025 (HE de 2024 recibida firmada). FAIN: Cristian Rodriguez (cristian.rodriguez@fainascensores.com). Ano 1985. Administracion: RODISA (Cesar '
                    'Rodriguez Diaz, "a traves de Sara Bajo"; pedidos docs CP 17/09/2025; Valdesangil 16, 28039; 913 735 143; gestion@administracionrodisa.es); escribe tambien '
                    'Raul Diaz. Comunidad: CDAD PROP CL VALDEVERDEJA N 31 (CIF H79068441). Presidente: David Sanchez Fraile (20417001Q; en copia del correo del 17/07/2026, '
                    'davidsfraile@gmail.com). Contacto: Tomas Gonzalez, 2o A (696 860 537; tomas.gonzalez.martin@gmail.com). PEM 46.182,86. Visado TL/018291/2025. Superficie '
                    '40,34 m2. Se empezo por la ECU (ACTECU), que lo devuelve por estar en zona de cesion (01/12/2025); licencia por el Ayuntamiento (expediente 350/2025/40065), '
                    'inadmitida el 16/07/2026: va por DR con concesion demanial previa (registradas en jul-2026). Comercial interno: DANIEL.'},
    ('cota_cero', 'css', 'subvenciones'), n=n,
    presi=('DAVID SANCHEZ FRAILE', 'presidente', None, None, 'davidsfraile@gmail.com'), trae_pu=PU['sara_fain'])

rellenar('vm163', 'VALMOJADO 163', 'valmojado163', {'fecha_apertura': '2026-02-13',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: el correo de Acayma, 13/02/2026). Contacta: Juana Gonzalez Martin (ACAYMA; comunidades@acayma.com), que pide presupuesto para la '
                    'IEE. Tipo de obra: IEE. HE de la IEE enviada 16/02/2026. Comercial interno: DANIEL.'},
    ('iee',), n=fijar('valmojado163', 2026, otros={0: ('2026-02-13', 'Correo de Acayma (comunidades@acayma.com) del 13 de febrero de 2026.')}),
    adm=PU['juana_acayma'], trae_pu=PU['juana_acayma'])

cm169 = cid_de('VALMOJADO 169')
faustino = pc_unico(cm169, 'FAUSTINO GARCIA', 'vecino', '606032183', None, None,
                    'Vecino del bajo C; es quien contacta (sep-2024). No quiere dar los datos del administrador ("no se fia de el"). Su hijo: 649 598 246.')
rellenar('vm169', 'VALMOJADO 169', 'valmojado169', {'fecha_apertura': '2024-09-27', 'persona_comunidad_id': faustino,
    'origen_notas': 'Fecha de llegada: 09/2024 (dia: la primera nota, 27/09/2024). En la ficha: "Viene por acayma, pero no es de esta administracion + RAUL CEREZO"; contacto, Faustino '
                    'Garcia, vecino del bajo C (606 032 183; su hijo, 649 598 246), visita de viabilidad citada el 3-4/10/2024. Paga: la CP. Tipo de obra: ASCENSOR (presupuesto '
                    'de Coinsa-Rosersese como el de Camarena 200; reportaje de Paseo de Extremadura 244bis). Raul Cerezo pide actualizar costes (25/02/2026); HE con precios '
                    'actualizados enviada 26/02/2026.' + CEREZO + ' Administracion: desconocida. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor',), n=fijar('valmojado169', 2024), trae_pu=PU['cerezo'])

rellenar('vm235', 'VALMOJADO 235', 'valmojado235', {'fecha_apertura': '2026-02-23',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: el unico fichero, la ficha, 23/02/2026). Contacta: Yolanda Gonzalez (JCFINCAS; 917 52 81 96; ygonzalez@jcfincas.es). Tipo de obra: '
                    'ASCENSOR. La ficha no tiene notas. En la ficha: comercial interno CARLOS.' + EXT},
    ('ascensor',), adm=YOLANDA, trae_pu=YOLANDA, captador=ALVARO, lleva=ALVARO)

n = fijar('valmojado243', 2025, ('2025-09-26', 'Sin fecha; se pone la de la primera HE enviada, 26/09/2025.'))
n = motivo(n, 2, 'La fecha no cuadra: va despues de la HE del 26/09/2025 y Javier Velasco dice que la forma de pago original es la del 26/09; se deja tal cual.')
n = fecha_a(n, 3, '2026-02-17', 'Errata corregida: en la ficha pone 17/02/2025, pero habla de la HE enviada el 26/09/2025, asi que es 17/02/2026.')
rellenar('vm243', 'VALMOJADO 243', 'valmojado243', {'fecha_apertura': '2025-09-26', 'referencia_catastral': '5713806VK3751D',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia: la primera HE enviada, 26/09/2025; la nota del 01/09/2025 no cuadra con el orden y las escaleras BIM de jul-2025 son de plantilla). '
                    'Contacta y paga: ELECNOR (Javier Velasco; 680 967 159; fjvelasco@elecnor.com); obra condicionada a subvencion. Tipo de obra: ASCENSOR CON DERRIBO + SUBV, '
                    '"proyectos separados": el elevador por la ECU (ACTECU) y la rampa por el Ayuntamiento, LICENCIA las dos ("es igual a Camarena 200"; dos proyectos, interior y '
                    'exterior, "como Santa Eduvigis 7"). Barrio: Aluche. Tecnica: Angela. Fecha encargo: 08/04/2026 (HE recibida firmada; en la ficha pone 04/2025). '
                    'Administracion: CARDOSO FINCAS (Vicente Cardoso; Camarena 168, 28047; 915 09 96 87; vcardoso@cardosofincas.com). Comunidad: CDAD PROP CL VALMOJADO 243 '
                    '(CIF E78969649; letra E: comunidad de bienes). Presidente: Julian Arcos Gonzalez (51436994R; 696 868 726). Elecnor: Omar Rafael Diaz Martinez (medicion, '
                    'abr-2026). Comercial interno: DANIEL.'},
    ('ascensor', 'rampa', 'subvenciones'), n=n, presi=('JULIAN ARCOS GONZALEZ', 'presidente', '696868726'), trae_pu=PU['jvelasco'])

# ================================================================= 2. CLON
REVS = [
    ('valdecaleras6', '2023-08-28', 'ANA ENCINAS (ELECNOR)', None, '5396209VK4759E',
     'VALDECALERAS 6 MADRID. Fecha: 08/2023 (dia: la primera nota, 28/08/2023). Cliente: ELECNOR (Ana Encinas, oficina tecnica); en la nota, el correo de Ana va "a cliente: '
     'mpascensores" (MP ASCENSORES, en la agenda como contrata). Tipo de obra: ASCENSOR (por fuera, simple y sin derribo, o por dentro con derribo de la escalera). Distrito 16 - '
     'Hortaleza (Canillas). CP 28043. Ano 1968. La carpeta solo tiene la ficha.\n\n' + cl('valdecaleras6', 2023)),
    ('valdecanillas59', '2024-12-03', 'DIEGO ROJO (ROJO JUSDI)', None, None,
     'VALDECANILLAS 59 MADRID. Fecha: 12/2024 (dia: la nota, 03/12/2024). Contacto: Diego Rojo, el administrador (ROJO JUSDI). Tipo de obra: SATE CON CUBIERTA Y DF, Y SUBV A EXITO. '
     'Distrito San Blas - Canillejas. CP 28037. La carpeta solo tiene la ficha.\n\n' + cl('valdecanillas59', 2024)),
    ('valdetorresdejarama13-15-17-19-21', '2023-04-24', 'JUAN RAMIREZ (ELITE)', None, None,
     'VALDETORRES DE JARAMA 13-15-17-19-21 MADRID (en la ficha, CL VALDETORRES DE JARAMA 13). Fecha: 04/2023 (dia: las fotos y el modelo 3D, 24/04/2023). Contacto: Juan Ramirez '
     '(ELITE; 680 837 234; jramirez@elitemadrid.es). Tipo de obra: SATE Y ASCENSOR. Distrito 16 - Hortaleza (Pinar del Rey). CP 28033. En la carpeta, fotos y 3D (abr-may 2023).\n\n'
     + cl('valdetorresdejarama13-15-17-19-21', 2023)),
    ('valenciadedonjuan4', '2023-07-18', 'MARIA DEL MAR LOPEZ GONZALEZ (DIRECTORA DEL CEIP LORENZO LUZURIAGA)', 'Q2868644B', '0320208VK4802A0001SZ',
     'VALENCIA DE DON JUAN 4 MADRID (colegio). Fecha: 07/2023 (dia: la primera nota, 18/07/2023; los escritos de may-2023 son de plantilla). Cliente: el CEIP Lorenzo Luzuriaga '
     '(Calle Valencia de Don Juan 19; CIF Q2868644B); firma la directora, Maria del Mar Lopez Gonzalez (02858136H; C/ Cesar Manrique 1, 6o A); conserje Ramiro, de 9.00 a '
     '13.30; cp.lorenzoluzuriaga.madrid@educa.madrid.org; 609 218 332. Tipo de obra: REFORMA BANO COLEGIO (reconversion de un almacen en bano; la obra la hicieron ellos y '
     'Accesalia hace el expediente de legalizacion). Distrito 08 - Fuencarral - El Pardo (La Paz). CP 28034. Tecnico: Israel. Ano 1977. Visado TL/017082/2023 (oct-2023). '
     'Expediente 350/2023/34133; anotacion de entrada 2023/1414861 de declaracion responsable para actividades economicas (registrada 21/11/2023). Superficie 22,93.\n\n'
     + cl('valenciadedonjuan4', 2023)),
    ('vallandes6', '2026-09-14', 'ANGEL CUEVA (ADMON FINCAS CIMARRA)', None, None,
     'VALLANDES 6 MADRID. Fecha: 09/2026 (dia: el escaneo 3D y la ficha, 14/09/2026). Administracion: Admon Fincas Cimarra (Angel Cueva; 915 000 775 / 634 952 054; '
     'A.f.cimarra2@gmil.com, asi en la ficha) - no esta en la agenda. Contacto de la comunidad: Azucena, 637 516 698. Tipo de obra: ACCESIBILIDAD. En la carpeta, la consulta '
     'de Catastro (ref. 0316903VK4701E) y el modelo 3D (sep-2026). La ficha no tiene notas. Comercial interno: ALVARO.'),
    ('valledetobalina46', '2023-03-30', 'ALICIA PEREZ-NIETO MERCADER (TKE)', None, None,
     'VALLE DE TOBALINA 46 MADRID. Fecha: 03/2023 (dia: la nota, 30/03/2023; los planos en CAD de TKE llevan fecha de nov-2020, son suyos). Cliente: TKE (Alicia Perez-Nieto '
     'Mercader; 690 340 987; alicia.perez@tkelevator.com). Tipo de obra: REFORMA EDIFICIO. Distrito Villaverde. CP 28021.\n\n' + cl('valledetobalina46', 2023)),
    ('valleguerra5', '2024-10-25', 'DIEGO ROJO OLALLA (ROJO JUSDI)', None, None,
     'VALLEGUERRA 5 MADRID. Fecha: 10/2024 (dia: la visita, 25/10/2024). Paga: la CP. Contacto: Diego Rojo Olalla, el administrador (ROJO JUSDI; "es el de Longares 8B"; '
     '625 145 522; admirojojusdi@gmail.com). Tipo de obra: ASCENSOR. Distrito Ciudad Lineal. CP 28017. Comunidad: CDAD PROP CL VALLEGUERRA 5. En la carpeta, un listado de '
     'inmuebles de Catastro (oct-2024).\n\n' + cl('valleguerra5', 2024)),
    ('vallehermoso112', '2019-01-22', 'URVALL; CONTACTO FERNANDO BERCIAL MOLINA', 'H79895157', '0171811VK4707A',
     'VALLEHERMOSO 112 MADRID. Fecha: la ficha no la trae; 01/2019 (dia: el primer fichero, el modelo para SketchUp, 22/01/2019). Agente: URVALL (en la agenda como contrata, '
     'marcada "CUIDADO ESTOS NO"). Contacto: Fernando Bercial Molina (676 499 427; Cpvallhermoso112@gmail.com). Tipo de obra: INSTALACION DE ASCENSOR EN EDIFICIO RESIDENCIAL '
     'EXISTENTE (con reconstruccion de escalera; oferta OF7182, mar-2019). Propiedad: CP VALLEHERMOSO 112 (CIF H79895157). CP 28003. Fachada 15 m. Superficie 9,00 m2 (1,50 por '
     'planta). En la carpeta: proyecto visado (jul-2019), licencia 107/2019/03624 (jun-2020), subvencion (nov-2019), fin de obra visado (jul-2022), bonificacion del ICIO '
     'aprobada (nov-2023) e IEE con requerimiento (mar-2024). La ficha no tiene notas.'),
    ('vallehermoso94', '2019-07-12', 'FELIX URVALL', 'A87200598', '0169319VK4706G',
     'C/ VALLEHERMOSO 94 MADRID. Fecha: la ficha no la trae; 07/2019 (dia: las fotos de la visita, 12/07/2019; el plano de ene-2019 de "otros planos" es anterior a nosotros). '
     'Agente: Felix, de URVALL (en la agenda, Felix Urena, jefe de Urvall, contrata marcada "CUIDADO ESTOS NO"). Tipo de obra: INSTALACION DE ASCENSOR EN EDIFICIO RESIDENCIAL '
     'EXISTENTE. Propiedad: VBARE IBERIAN PROPERTIES SOCIMI SA (CIF A87200598). CP 28003. PEM 69.658,23. En la carpeta: contrato firmado con OTIS-EXPRESS (jul-2019), licencia '
     'e informe favorable de la CPPHAN (ago-2019), venia colegial de la DF (visado TL-024287-2019), inicio de obra (feb-2020), paralizacion de obra (mar-abr 2020), apertura '
     'del centro de trabajo (jul-2020) y fin de obra visado TL-021378-2020 (dic-2020 / ene-2021). La ficha no tiene notas.'),
    ('valmojado283', '2016-04-25', 'NACHO (FAIN); POR LOLA, M. DOLORES BURGOS (ADMINISTRACION)', None, None,
     'VALMOJADO 283 MADRID. Fecha: 25/4/2016 (la de la ficha y la del correo). Agente comercial: Nacho (FAIN; Jose Ignacio San Felipe Manzano). La ficha solo trae el correo de '
     'Lola (M. Dolores Burgos Garcia, Asesoria-Admon. Fincas, Ntra. Sra. de la Almudena 16, Leganes; 91 110 93 67; mdoloresburgos@hotmail.com) a Nacho: la comunidad tiene mas '
     'de 6 y 2 m; presidenta Mercedes, 619 324 136. La carpeta solo tiene la ficha (y, colada dentro, la carpeta valverde28, que va en otra fila).\n\n'
     + bloque('valmojado283', 81, 107)),
]
for carp, fecha, trajo, cif, ref, t in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, comercial='Alvaro' if carp == 'vallandes6' else 'Daniel')

n61 = partir(fijar('valdecanillas61', 2023), 0, 'Ana: 08/03/2023', '2023-03-08')
fila('valdecanillas61', '2023-02-28', 'cerrada', 'La rechaza Accesalia: "no quieren sate, solo arreglar las fisuras y la rampa, le hemos dicho que no" (08/03/2023).',
     'JUAN CARLOS FERNANDEZ (ADMINISTRADOR)', None, None,
     'VALDECANILLAS 61 MADRID. Fecha: 03/2023 en la ficha; la primera nota es del 28/02/2023 ("Daniel le llama"). Contacto: Juan Carlos Fernandez, el administrador (no esta en la '
     'agenda). Tipo de obra: SUBSANACION DESPERFECTOS (la ITE pide arreglar fachada, cubierta, una rampa que no cumple y tuberias; la comunidad quiere gastar lo minimo). Distrito '
     'San Blas - Canillejas. CP 28037. La carpeta solo tiene la ficha.\n\n' + J(n61))

for carp, fecha, trajo, t, *ruta in [
        ('valdecanillas17', '2017-04-07', 'JUAN CARLOS (THYSSEN)',
         'CALLE VALDECANILLAS 17 MADRID. Fecha: marzo 2017 en la ficha; los primeros ficheros, croquis y ficha, son del 07/04/2017. Ficha vacia; hay croquis, borrador de escalera '
         'y planos (abr-2017).'),
        ('vallehermoso32', '2016-02-18', 'SANTIAGO (THYSSEN)',
         'VALLEHERMOSO 32 MADRID. Fecha: 18/02/2016 (la de la ficha). Tipo de obra: SALVAESCALERAS. Ficha vacia; hay croquis, plano y presupuesto de plataforma salvaescaleras '
         '(feb-2016).'),
        ('valleinclan33', '2016-09-09', 'PEDRO ARANDA (THYSSEN)',
         'VALLE INCLAN 33 MADRID. Fecha: 09/09/2016 (la de la ficha). Ficha vacia; hay croquis, plano, presupuesto, foto y video (jul-sep 2016).'),
        ('valledeoro20', '2015-10-12', None,
         'VALLE DE ORO 20 MADRID. Carpeta SIN ficha de datos: solo un .doc, un .dwg y un .pdf con el nombre de la carpeta (oct-2015).'),
        ('valverde28', '2021-02-08', None,
         'VALVERDE 28 MADRID. Carpeta colada dentro de "valmojado283". SIN ficha de datos: solo el pliego de la comunidad para pedir ofertas de arquitecto para un proyecto de '
         'accesibilidad integral y ascensores (fechado 12/01/2021; ficheros de feb-2021).', R('valmojado283' + B + 'valverde28'))]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t, ruta=ruta[0] if ruta else None)

# ================================================================= 3. MANIAS
mania('ECU (ACTECU): si la alineacion oficial muestra que la zona de intervencion coincide con una zona de cesion, no se considera zona privada y la ECU no lo tramita: '
      'el proyecto va directamente al Ayuntamiento.', 'ECU (ACTECU)', '2025-12-01', 'valdeverdeja31', clave='vd31', trozo='zona de cesión')
mania('Ascensor que afecta a suelo publico: inadmiten la solicitud de licencia; hay que tramitarlo por Declaracion Responsable y pedir la concesion demanial, que tiene que '
      'estar concedida antes.', 'Junta Municipal de Distrito de Moncloa-Aravaca', '2026-07-16', 'valdeverdeja31', clave='vd31', trozo='inadmisión de la solicitud')

resumen()
