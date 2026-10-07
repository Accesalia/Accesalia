# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda P3 (plazadelosgeologos1y2 .. pzarteijo14, carpetas [110:165] de la P). 7-oct-2026. Sin --escribir: marcha en seco.
# La P1 [0:55] y la P2 [55:110] las preparan otros agentes a la vez.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de, _lineas

PU.update(oton='ebed88df-7977-43e2-81d9-b7e16270a170', collado='0f2b3251-9e84-443d-b81e-32edfd1f7915', vizuete='42402e80-8a25-4119-a6c3-57aac4c72065',
          novillo='106ccfee-f51f-4bd8-82c0-719c18c944e7', olga_jimeco='ef1332fc-cd83-4b25-9efd-ddca69691dd0', paz='46e3614d-97fd-40bf-baac-07d9bd5e601f',
          cifuentes='37b818c1-fa3b-4a1e-a856-eabe5ba35837', olivares='fe2ea8b4-9be7-42b8-b64f-d644fa8198b1', godino='71ab2591-1dac-48b0-b094-12b9c2995bf4',
          joseantonio='40b27949-a177-4d6f-9e7b-2498a064848f', mblanco='67525999-7f12-416d-a311-1f2f02f37d99', vanesa_dbb='05cda534-6907-43b0-b674-53cbe143a278',
          dsanchez_fain='cadc2119-99c7-4a97-a474-75d420deaa81', silvia_arrialsi='6c8e1a7f-999b-4ee9-ac91-cfeb7075dd8c')
MARIANO = 'ce3697fd-0a71-47b5-9138-c0da98f3fd85'   # ADMINISTRACION MARIANO (Mariano Perez Cerreda)

# Propuestas para Monica (como Fatou 24 / BESTEIRO_UNA_OPP). False = no enlazar.
# Plaza del Paular 1 y 2: misma comunidad (CDAD PROP PZ PAULAR 1 Y 2, CIF H79884581), mismo presidente y administracion; HE, visado y licencia por portal.
# Se rellena la opp de PAULAR 1, se le enlaza el acceso de PAULAR 2 y la opp vacia de PAULAR 2 (fcecc28a) queda para borrar.
PAULAR_UNA_OPP = True
ACC_PAULAR2 = 'e3e565e8-b99b-4bc5-9bb5-abd4f0fd61cf'
# Plaza de los Geologos 1 y 2: una carpeta, un presidente "de la comunidad de vecinos de Plaza de los Geologos 1 y 2" y la MISMA parcela (4964601VK4746D).
# Se rellena la opp de GEOLOGOS 1, se le enlaza el acceso de GEOLOGOS 2 y la opp vacia de GEOLOGOS 2 (7ff9d6a0) queda para borrar.
GEOLOGOS_UNA_OPP = True
ACC_GEOLOGOS2 = '26d51cc1-4dc7-48c6-9031-542253434ab8'
# Puerto del Monasterio 20: dos opps vacias en produccion sobre el mismo acceso; se rellena eda3efe3; 94fe59d0 queda SIN tocar (duda: borrarla).
MON20 = 'eda3efe3-6557-4a1d-a646-409f1223636c'

PR18 = 'principe18/subv externa subsanacion iee/FICHA DATOS.docx'
MON = 'puertodelmonasterio20/FICHA DATOS TECNICOS.docx'


def cid_de(prefijo):
    cs = b.leer('comunidades?select=id&municipio=eq.MADRID&nombre=like.' + quote(prefijo) + '*'); assert len(cs) == 1, prefijo
    return cs[0]['id']


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto (telefono pegado al nombre, vicepresidente en la casilla del presidente...)."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


def pc_unico(cid, nombre, rol, tel=None, doc=None, email=None, notas_=None):
    """pc() para roles que no son presidente, sin repetirla si el script se relanza."""
    ya = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&nombre=eq.%s' % (cid, quote(nombre)))
    return ya[0]['id'] if ya else pc(cid, nombre, rol, tel, doc, email, notas_)


def trae(pcid):
    return {'quien_persona_comunidad_id': pcid, 'persona_comunidad_id': pcid}


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


def alta_admin(nombre, notas_, nombre_legal=None):
    """administracion de fincas nueva que lleva una comunidad de PRODUCCION (criterio de Monica, 7-oct-2026)."""
    ya = b.leer('empresa?select=id&nombre_accesalia=eq.' + quote(nombre))
    if ya: return ya[0]['id']
    i = nuevo_id()
    ins('empresa', [{'id': i, 'nombre_accesalia': nombre, 'nombre_legal': nombre_legal, 'tipo': 'administracion_fincas', 'activa': True, 'comercial_id': DANIEL, 'notas': notas_}])
    return i


def enlazar(oid, acc, de_donde):
    if not b.leer('relacion_oportunidad_accesos?select=acceso_id&opp_id=eq.%s&acceso_id=eq.%s' % (oid, acc)):
        ins('relacion_oportunidad_accesos', [{'opp_id': oid, 'acceso_id': acc, 'de_donde': de_donde}])


def bloque(c, i, j):
    """lineas i..j (incluidas) de la ficha, sin las vacias."""
    return '\n'.join(l for l in _lineas(c)[i:j + 1] if l.strip()).strip()


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
cl = lambda c, a, s=None: J(fijar(c, a, s))

# ================================================================= 0. AGENDA
# Junta de Villa de Vallecas (no existia) con sus tecnicos (ficha de Puerto de Alazores 11, 2022).
VVALLECAS = junta(18, 'Villa de Vallecas', direccion='Paseo Federico García Lorca, 12')
MAESU = area(VVALLECAS, 'Servicio de Medio Ambiente y Escena Urbana', '91 588 12 52',
             'En la ficha de Puerto de Alazores 11 (2022): tambien 91 588 89 60 / 91 588 78 75 ("dicen que llamemos aqui"); sttvivallecas@madrid.es "nos rechaza el correo".')
persona_nueva('Raúl', 'del Pozo Gómez', 'arquitecto técnico', '915881252', None, organismo=VVALLECAS, area=MAESU,
              notas_='Junta de Villa de Vallecas: tecnico de la DR del ascensor de Puerto de Alazores 11 (2022; carpeta puertodealazores11).')
persona_nueva('Francisco', 'Rivas', 'técnico', None, None, organismo=VVALLECAS,
              notas_='Junta de Villa de Vallecas: tecnico en la ficha de Puerto de Alazores 11 ("Francisco Rivas - Raul del Pozo Gomez", 2022; carpeta puertodealazores11).')

# Irene Perez Moreno: la ficha de 2020 la pone de "Presidente", pero en su correo de 2026 firma como de la administracion (Mariano Perez Cerreda SL).
IRENE = persona_nueva('Irene', 'Pérez Moreno', 'administración', '913266750', None, empresa=MARIANO,
                      notas_='Administracion Mariano Perez Cerreda: escribe por Plaza de Valsain 3 y 4 (correo de oficina@despachomarianoperez.es, 04/03/2026; carpeta plazadevalsain3y4). '
                             'En la ficha de 2020 aparece como "Presidente" de la comunidad: dato mal puesto.')

# Administraciones nuevas de comunidades de PRODUCCION
VIPAMA = alta_admin('VIPAMA', 'Alta en el barrido de Madrid (Plaza Dos de Mayo 3; carpeta plazadosdemayo3). Lleva tambien Conde Duque 48 (tanda C4).')
FRANCISCO_VIPAMA = persona_nueva('Francisco', None, 'administrador', '601150705', 'fincasvipama@gmail.com', empresa=VIPAMA,
                                 notas_='VIPAMA: administrador de Plaza Dos de Mayo 3 (oct-2025; carpeta plazadosdemayo3). En la ficha de Conde Duque 48: "Francisco Jose Pichon".')
PALACIO = alta_admin('ADM. FINCAS EL PALACIO', 'Alta en el barrido de Madrid (Principe 18; carpeta principe18).')
JLVILLALBA = persona_nueva('José Luis', 'Villalba', 'administrador', '916327942', 'elpalacio@adfi.es', empresa=PALACIO,
                           notas_='Adm. Fincas El Palacio: administrador de Principe 18 (2026; carpeta principe18).')
AFACTUA = alta_admin('AFACTUA', 'Alta en el barrido de Madrid (Principe de Vergara 254; carpeta principedevergara254). En la ficha, contacto "CARLOS", sin telefono ni correo.')

# ================================================================= 1. PRODUCCION (24 carpetas, 24 oportunidades)
# --- Plaza de los Geologos 1 y 2
cg1 = cid_de('PLAZA GEOLOGOS 1')
rellenar('geo', 'PLAZA GEOLOGOS 1', 'plazadelosgeologos1y2', {'fecha_apertura': '2025-09-08', 'referencia_catastral': '4964601VK4746D',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia: el correo del presidente, 08/09/2025). Contacta: Pablo Garcia Martin, presidente de la comunidad de vecinos de Plaza de los Geologos 1 y 2 '
                    '(686 770 457; pablogm1986@yahoo.es), tras hablar por telefono: pide el estudio de viabilidad para 2 ascensores "como habeis hecho en Elfo 76", por la fachada de la calle '
                    'Virgen del Lluc. Tipo de obra: ASCENSOR (dos). Una sola carpeta para los portales 1 y 2 (misma parcela 4964601VK4746D): esta oportunidad recoge los dos. Hay escaneo 3D (sep-2025). '
                    'En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), n=fijar('plazadelosgeologos1y2', 2025, ('2025-09-08', 'Correo de Pablo Garcia Martin, presidente, del 8 de septiembre de 2025.')),
    presi=('PABLO GARCIA MARTIN', 'presidente', '686770457', None, 'pablogm1986@yahoo.es'), trae_pc='presi', captador=CARLOS, lleva=ALVARO)
if GEOLOGOS_UNA_OPP:
    enlazar(OPP['geo'][1], ACC_GEOLOGOS2, 'Plaza de los Geologos 1 y 2: una carpeta, un presidente y la misma parcela (4964601VK4746D); UNA opp para los dos portales.')

# --- Plaza del Paular 1 y 2 (una opp)
n1 = fijar('plazadelpaular1', 2024)
n2 = fijar('plazadelpaular2', 2024)
n = sorted(n1 + [(f, t + '\n\n(Nota de la ficha de la carpeta plazadelpaular2.)') for f, t in (n2[11], n2[14])])
rellenar('pau1', 'PLAZA DEL PAULAR 1', 'plazadelpaular1', {'fecha_apertura': '2024-12-10', 'referencia_catastral': '4963712VK4746D',
    'origen_notas': 'Fecha de llegada: 12/2024 (dia: la primera nota, 10/12/2024). Contacta: la CP; antes Olivares / Javier Parra (COINSA), tachados: "la cp no quiere a Coinsa". '
                    'Tipo de obra: ASCENSOR, DF, CSS + SUBV (SIN IEE): un ascensor por portal, por el interior invadiendo la acera (votado en junta). Barrio: Quintana. Tecnico: Jhonatan. '
                    'Fecha encargo: 01/04/2025 (HE firmadas). Ano 1954. LICENCIA AYTO, presentada 17/07/2025. Contrata elegida: FAIN (Miguel Angel Gomez), en la junta de 09/04/2026 '
                    '(no quisieron la de Cega). Administracion: ADMINISTRACIONES OTON (Maria Oton; 91 805 18 14; maria.oton@administracionesoton.com); pedidos docs a la CP 04/04. '
                    'Comunidad: CDAD PROP PZ PAULAR 1 Y 2 (CIF H79884581). Presidente: Hicham Rochdi Almorabit (02718028A; 659 273 363; hichamra@gmail.com); vicepresidente: Jesus. '
                    'Una carpeta y una ficha por portal: Paular 1 (ref. 4963712VK4746D; visado TL/009096/2025; expediente 350/2025/22464) y Paular 2 (ref. 4963713VK4746D; visado '
                    'TL/009101/2025; expediente 350/2025/22449, que por error se derivo a Latina). Esta oportunidad recoge los dos portales. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'df', 'css', 'subvenciones'), n=n, comunidad={'iban': 'ES03 0081 1543 8100 0135 2142'},
    presi=('HICHAM ROCHDI ALMORABIT', 'presidente', '659273363', '02718028A', 'hichamra@gmail.com'))
if PAULAR_UNA_OPP:
    enlazar(OPP['pau1'][1], ACC_PAULAR2, 'Plaza del Paular 1 y 2: misma comunidad (CIF H79884581), una HE por portal; UNA opp con las HE de los dos portales.')

n = partir(fijar('plazadelpaular4', 2025), 0, '25/11/2025', '2025-11-25')
rellenar('pau4', 'PLAZA DEL PAULAR 4', 'plazadelpaular4', {'fecha_apertura': '2025-03-13', 'referencia_catastral': '4963705VK4746D',
    'origen_notas': 'Fecha de llegada: 03/2025 (dia: la primera nota, 13/03/2025: "Votaron ayer"). Contacta: la administradora, Maria Oton (ADMINISTRACIONES OTON; 91 805 18 14; '
                    'maria.oton@administracionesoton.com). Paga: la CP. Tipo de obra: ASCENSORES POR INTERIOR + SUBV (HE enviada 25/11/2025 con la DF incluida, al precio antiguo; '
                    'sin CSS). Distrito en la ficha: Ciudad Lineal. CP en la ficha: 28047. Ano 1954. Daniel pide financiacion de proyecto y tasas a UCI (simulaciones de dic-2025). '
                    'En la carpeta, la IEE de 2024 favorable. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'df', 'subvenciones'), n=n, trae_pu=PU['oton'])

# --- Plaza de Valsain 3 y 4 (ficha antigua, sin cabecera de notas)
V = 'plazadevalsain3y4'
nv = [('2022-03-21', bloque(V, 96, 107) + '\n\n(Las lineas de antes del 21/03/2022 van sin fecha: lo que se pregunto al negociado de licencias sobre el expediente de 2020; se ponen con la del requerimiento.)'),
      ('2026-03-04', bloque(V, 114, 140) + '\n\n(Correo de Irene Perez Moreno, de Mariano Perez Cerreda, del 4 de marzo de 2026, y la HE enviada ese dia.)'),
      ('2026-03-13', bloque(V, 141, 142)),
      ('2026-06-15', bloque(V, 145, 145))]
rellenar('val', 'PLAZA DE VALSAIN 3 Y 4', V, {'fecha_apertura': '2020-08-14', 'referencia_catastral': '4963502VK4746D',
    'origen_notas': 'Fecha de llegada: AGOSTO 2020 (dia: el primer fichero, el croquis del 14/08/2020). Agente comercial: Jose Olivares (ROSERSESE). Tipo de obra: INSTALACION DE 2 ASCENSORES; '
                    'en mar-2026, HE de subvenciones (las dos convocatorias anteriores las tramito Rosa, de Rosersese, y quedaron agotadas). Barrio: Quintana. NZ 3.1.a. Administracion: '
                    'MARIANO PEREZ CERREDA (administracion@despachomarianoperez.es; Irene Perez Moreno, oficina@despachomarianoperez.es, Alcala 323, 1o C, 913 266 750). En la ficha, '
                    '"Presidente: IRENE PEREZ MORENO", pero en 2026 firma como de la administracion: no se pone como presidenta. Ref. catastral: Valsain 3 4963502VK4746D y Valsain 4 '
                    '4963503VK4746D (el n.4 no tiene acceso en la app). PEM 189.950,94 y superficie 126,60 (diciembre 2021). Expediente de 2020 116/2020/02506 (tachado): hubo que empezar de '
                    'cero, por licencia (va con invasion); expediente nuevo 350/2022/01701 (registro 2022/0297385). Arquitecta municipal: Laura Barrionuevo (91 588 75 13, sep-2022). '
                    'Tecnico de requerimientos: Carla. El 15-06-2026 se envia burofax y se paraliza la obra por riesgos para vecinos y trabajadores. '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=nv, comunidad={'cif_comunidad': 'H81432965', 'iban': 'ES89 0081 1543 8600 0134 4335'}, trae_pu=PU['olivares'])

rellenar('dm3', 'PZA DOS DE MAYO 3', 'plazadosdemayo3', {'fecha_apertura': '2025-10-23',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: el escaneo 3D y los honorarios enviados, 23/10/2025). Contacta: la administracion, VIPAMA (Francisco; 601 15 07 05; fincasvipama@gmail.com; '
                    'administracion nueva, dada de alta en el barrido). Paga: la CP. Tipo de obra: ASCENSOR ("muy interesados en poner ascensor"). En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), n=fijar('plazadosdemayo3', 2025, ('2025-10-23', 'Sin fecha delante; la fecha va dentro de la nota (honorarios enviados el 23-10-25, el dia del escaneo 3D).')),
    adm=FRANCISCO_VIPAMA, trae_pu=FRANCISCO_VIPAMA, captador=CARLOS, lleva=ALVARO)

rellenar('lt11', 'PLAZA LUCA DE TENA 11', 'plazalucadetena11', {'fecha_apertura': '2025-06-26', 'referencia_catastral': '1127309VK4712G',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: la HE enviada, 26/06/2025; los ficheros de 2022-2023 de la carpeta son plantillas de subvencion y CEE). Contacta: Adolfo Collado '
                    '(AEA / MC GESTION FINCAS; Av. del Dr. Garcia Tapia 129, local 2, 28030; 915 02 74 59 / 618 63 60 95; acollado@mcgestionfincas.com; alberto@mcgestionfincas.com "poner '
                    'siempre en copia"; moratalaz@mcgestionfincas.com; facturas@mcgestionfincas.com). Paga: la CP. Tipo de obra: SATE (de STO, fachada protegida con molduras; tambien fachada '
                    'trasera, patios y cubierta con losa filtron), ACCESIBILIDAD EN PLANTA BAJA (plataforma elevadora vertical), DECORACION DE PORTAL Y SUBVENCIONES. Costes estimados: '
                    'rehabilitacion de fachada, patios y cubierta con SATE 159.000 EUR + IVA; accesibilidad del portal 21.000 + IVA; rehabilitacion del portal 28.000 EUR + IVA. Tecnico: Israel '
                    '(requerimientos: Carlos). Fecha encargo: 18/09/2025 (HE firmada); subvenciones contratadas el mismo dia ("INFINITAS"). Ano 1935. Tramita la ECU (ACTECU): en feb-2026 '
                    'pide el informe preceptivo de Patrimonio (OLDRUAM). Contrata: PROCAR, a traves de Jose Luis Jimenez (MOLINS, ex ROEN), presupuesto de jul-2026. Presidenta: Marisol '
                    'Casamayon Rodriguez (11786953M; 652 831 649; marisolcasamayon@gmail.com). Superficie 151,89. Comercial interno: DANIEL.'},
    ('sate', 'plataforma', 'accesibilidad_portal', 'subvenciones'),
    n=fijar('plazalucadetena11', 2025, ('2025-06-26', 'Sin fecha; la propuesta de Daniel que va con la HE enviada el 26/06/2025.')), comunidad={'iban': 'ES26 0081 5638 4000 0121 2425'},
    presi=('MARISOL CASAMAYON RODRIGUEZ', 'presidente', '652831649', '11786953M', 'marisolcasamayon@gmail.com'), trae_pu=PU['collado'])

rellenar('mon7', 'PLAZA MONDARIZ 7', 'plazamondariz7', {'fecha_apertura': '2025-06-13',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: el correo de la administracion, 13/06/2025). Contacta: Ma Dolores Vizuete (ADMINISTRACION DE FINCAS VIZUETE; C/ Fuenlabrada 17, 2a planta, '
                    'Alcorcon 28921; 91 644 21 22 / 691 26 81 38; adfvizuete@gmail.com), que pide dos proyectos de rampas: este y Calle Canada 22 de Alcorcon. Tipo de obra: RAMPA. CP 28029. '
                    'HE enviada 16/06/2025. Comercial interno: DANIEL.'},
    ('rampa',), n=fijar('plazamondariz7', 2025, ('2025-06-13', 'Correo de la Administracion de Fincas Vizuete del 13 de junio de 2025.')), adm=PU['vizuete'], trae_pu=PU['vizuete'])

cpv1 = cid_de('PLAZA PARVILLAS 1')
arreglar_pc(cpv1, 'rol=eq.presidente', {'nombre': 'JOSÉ GARCÍA DÍAZ', 'notas': '2o A. En la ficha: "presidente: 2ºA - José García Díaz".'})
rellenar('pv1', 'PLAZA PARVILLAS 1', 'plazaparvillas1', {'fecha_apertura': '2022-04-27', 'referencia_catastral': '9965107VK3696F',
    'origen_notas': 'Fecha de llegada: la ficha dice 05/2022; la primera nota es del 27/04/2022 ("ha ido a defender Pedro Couto"); se toma esa (el escaneo FARO es del 17/05/2022). Contacta: '
                    'Juan Antonio Alvarez Novillo (FAIN). Paga: la CP. Tipo de obra: ASCENSOR + CSS + SUBV; en may-2025, HE de renovacion de la subvencion. Barrio: Casco Historico de '
                    'Villaverde (APE.17.12). Tecnico: Enrique. Jefe de obra: Victor Esquinas (FAIN; victor.esquinas@fainascensores.com). Administracion: VIANA (Victor Manuel Diaz / Marta '
                    'Diaz-Maroto; Calle Parvillas Bajas 12; 917 109 307; administraciondefincas@vianasl.es). Presidente: Jose Garcia Diaz (2o A; 13856246B). Contacto: Alberto (4o B; '
                    '653 457 222); en la ficha tambien "628740548 / pablo.garcia@ayto-getafe.org (mandarle copia de todo!!)" y la comision de obras: garciasjosep@madrid.es, '
                    'afernandezignacio@hotmail.com. PEM 143.563 / 1,19 = 120.641,18. Junta de Villaverde: la DR no vale (112/2022/02295); "EN VILLAVERDE VA POR LICENCIA": licencia '
                    '(30/09/22) 350/2022/08261. Visado del CFO TL/014012/2024. Superficie 87,05. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'css', 'subvenciones'), n=fijar('plazaparvillas1', 2022), trae_pu=PU['novillo'])
pc_unico(cpv1, 'ALBERTO (4º B)', 'vecino', '653457222', None, None, 'Persona de contacto de la comunidad (ficha del ascensor, 2022).')

rellenar('pb4', 'PEÑABLANCA 4', 'plazapeñablanca4', {'fecha_apertura': '2025-12-29',
    'origen_notas': 'Fecha de llegada: 12/2025 (dia: los ficheros de la carpeta, 29/12/2025: "Wetransfer caducado. Deben enviarlo nuevamente"). Contacta: Olga (JIMECO; 611 383 164; '
                    'administracion@jimeco.es). La ficha no dice tipo de obra ni tiene notas. En la carpeta, "plazapeñablanca4". En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    (), adm=PU['olga_jimeco'], trae_pu=PU['olga_jimeco'], captador=CARLOS, lleva=ALVARO)

rellenar('pol35', 'POLVORANCA 35', 'polvoranca35', {'fecha_apertura': '2026-01-19',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: la ficha, 19/01/2026, el unico fichero). Contacta: Paz (CIUDADELA). Tipo de obra: SATE + ASCENSOR. La ficha no tiene notas. '
                    'En la ficha: comercial interno CARLOS (enero de 2026, antes de irse).' + CAPTO_CARLOS},
    ('sate', 'ascensor'), adm=PU['paz'], trae_pu=PU['paz'], captador=CARLOS, lleva=ALVARO)

rellenar('pol6', 'POLVORANCA 6', 'polvoranca6', {'fecha_apertura': '2026-05-17',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: la ficha, 17/05/2026, el unico fichero). Tipo de obra: IEE. La ficha no dice quien la trae y no tiene notas. Comercial interno: ALVARO.'},
    ('iee',), captador=ALVARO, lleva=ALVARO)

rellenar('pa24', 'PORTALEGRE 24', 'portalegre24', {'fecha_apertura': '2026-02-16',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: la ficha, 16/02/2026, el unico fichero). Contacta: Monica Cifuentes Matito (SMFINCAS; Av. Rey Juan Carlos I 84, planta 1, oficina 1, '
                    '28916 Leganes; 625 886 456; www.smfincas.es). Tipo de obra: ITE + SATE + SUBV. CP 28019. Presidente: Gonzalo Millan Lopez (617 270 329). La ficha no tiene notas. '
                    'En la ficha: comercial interno CARLOS.' + EXT},
    ('iee', 'sate', 'subvenciones'), adm=PU['cifuentes'], trae_pu=PU['cifuentes'], captador=ALVARO, lleva=ALVARO)

rellenar('pa58', 'PORTALEGRE 58', 'portalegre58', {'fecha_apertura': '2025-09-29',
    'origen_notas': 'Fecha de llegada: la ficha dice 10/2025; la nota del escaneo de Carlos es del 29/09/2025; se toma esa. Empresa/cliente: EFFIC (agente rehabilitador; la ficha no dice '
                    'la persona). La ficha no dice tipo de obra. En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    (), n=fijar('portalegre58', 2025), captador=CARLOS, lleva=ALVARO)

rellenar('pg21', 'PORTUGALETE 21', 'portugalete21', {'fecha_apertura': '2020-07-07', 'referencia_catastral': '6256709VK4765E',
    'origen_notas': 'Fecha de llegada: la ficha no la trae; 07/2020 (dia: el croquis y las fotos de la visita, 07/07/2020). Agente comercial: Jose Olivares (ROSERSESE). Tipo de obra: '
                    'INSTALACION DE ASCENSOR EN EDIFICIO RESIDENCIAL EXISTENTE. Administracion: VICENTE ROJO. Tecnico: Dennis. PEM 93.403,75. Visados TL/020819/2023 (fin de obra) y '
                    'TL/015141/2024. En la carpeta: certificado de inicio de obra (ene-2024) y certificado final a origen (ene-2025). La ficha no tiene notas ni comercial interno; la lleva Daniel.'},
    ('ascensor',), comunidad={'cif_comunidad': 'H79903837'}, trae_pu=PU['olivares'])

rellenar('pr18', 'PRINCIPE 18', 'principe18', {'fecha_apertura': '2026-06-23', 'referencia_catastral': '0643809VK4704D',
    'origen_notas': 'Fecha de llegada: 06/2026 (dia: el escaneo 3D, 23/06/2026; los editables de subvenciones anteriores de la carpeta son de plantilla). Contacta: Jose Luis Villalba '
                    '(ADM. FINCAS EL PALACIO; 91 632 79 42; elpalacio@adfi.es; administracion nueva, dada de alta en el barrido). Paga: la CP, por transferencia. Tipo de obra: SUBVENCION '
                    'EXTERNA para la subsanacion de las deficiencias de la IEE (proyecto de otro tecnico; quieren entrar en la convocatoria Rehabilita 2026, hasta el 30 de septiembre). '
                    'Aparte, un escaneo para ver la accesibilidad, todavia NO contratado (subcarpeta "accesibilidad - no contratado"; en su ficha "SUBV EXTERNA ~~INSTALACION ASCENSOR~~"). '
                    'Fecha encargo: 17/08/2026. Ano 1950. CP 28012. Presidente: Rafael Garcia Palencia (607 700 960). Comercial interno: ALVARO.'},
    ('subvenciones',), n=fijar(PR18, 2026), subvencion=[('2026-08-19', subv(PR18))], comunidad={'cif_comunidad': 'H86780913'},
    presi=('RAFAEL GARCIA PALENCIA', 'presidente', '607700960'), adm=JLVILLALBA, trae_pu=JLVILLALBA, captador=ALVARO, lleva=ALVARO)

rellenar('pv254', 'PRINCIPE DE VERGARA 254', 'principedevergara254', {'fecha_apertura': '2025-11-30',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia: la nota de Carlos Garcia, 30/11/2025: "No hacer 3D"). Contacta: la administracion, AFACTUA (Carlos; sin telefono ni correo en la ficha; '
                    'administracion nueva, dada de alta en el barrido). Tipo de obra: ACCESIBILIDAD PORTAL + SUBV. Fecha encargo en la ficha: 01/12/2025. CP 28016. Hay modelo 3D (dic-2025). '
                    'En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('accesibilidad_portal', 'subvenciones'), n=fijar('principedevergara254', 2025), captador=CARLOS, lleva=ALVARO)
admin_empresa(OPP['pv254'][0]['id'], AFACTUA)

cpa = cid_de('PRUDENCIO ÁLVARO 1')
leticia = pc_unico(cpa, 'LETICIA BRAVO', 'vecino', '686014924', None, 'martinica_81@yahoo.es', 'Contacta por la comunidad; viene de parte de Silvia (Arrialsi) (ficha, oct-2025).')
rellenar('pa1', 'PRUDENCIO ÁLVARO 1', 'prudencioalvaro1', {'fecha_apertura': '2025-10-01',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia desconocido; el .skb del 22/10/2025 es de plantilla y el 3D es del 06/11/2025). Contacta: Leticia Bravo (686 014 924; martinica_81@yahoo.es), '
                    'de parte de Silvia (ARRIALSI). Tipo de obra: ASCENSOR CON DERRIBO + SUBV (derribo completo de escaleras; ascensor de seis paradas con doble embarque a 180, cinco personas; '
                    'contadores a armario homologado; unos 240.000 EUR + IVA). HE e informe de viabilidad enviados 07/11/2025. Comercial interno: DANIEL.'},
    ('ascensor', 'subvenciones'), n=fijar('prudencioalvaro1', 2025), trae_pu=PU['silvia_arrialsi'])

cal = cid_de('PUERTO DE ALAZORES 11')
rellenar('al11', 'PUERTO DE ALAZORES 11', 'puertodealazores11', {'fecha_apertura': '2022-08-05', 'referencia_catastral': '7001301VK4770A',
    'origen_notas': 'Fecha de llegada: 08/2022 (dia: los primeros ficheros, 05/08/2022: el presupuesto de Fain aceptado y el CIF). Contacta: Sergio Godino (FAIN). Tipo de obra: ASCENSOR POR '
                    'INTERIOR + SUBV (HE con subvencion a precio superior al habitual, para compensar el bajo precio del proyecto). Barrio: Casco Historico de Vallecas. Tecnico: Susana. '
                    'Jefes de obra: Abel Bernardos y Victor Esquinas (FAIN). Administracion: GUERRERO DADILLOS (Jose Maria; Paseo Federico Garcia Lorca 16, 2o B, 28031; 91 331 90 25 / '
                    '667 694 601; jmmlflorida@gmail.com); pedidos docs 22/08/22. Presidente actual: Julian Diaz Nunez (50956556X); antes, tachadas en la ficha, Carmen Martin Domingo '
                    '(606 184 456; cmartindo3@gmail.com) y Raquel Martinez Clavero (660 43 69 96; martinezclaveroraquel@gmail.com), y el DNI 51850708Z. Junta de Villa de Vallecas (Paseo '
                    'Federico Garcia Lorca 12): Francisco Rivas y Raul del Pozo Gomez (arquitecto tecnico, Servicio de Medio Ambiente y Escena Urbana, 91 588 12 52); 05/10/22: "consideran '
                    'que hay una solucion mejor para los vecinos que la presentada". Declaracion responsable, NZ 4; expediente 350/2022/08519. PEM 89.829,06. Visados TL/017282/2022, '
                    'TL/004148/2024 (fin de obra), TL/005548/2024 (justificacion de obra) y TL/009036/2024 (nuevo CFO). Superficie 66,84. En la carpeta, subvenciones CAM 2023, Ayto 2024 '
                    'y 2025 y Rehabilita 2026 (hasta jul-2026). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=fijar('puertodealazores11', 2022),
    presi=('JULIAN DIAZ NUÑEZ', 'presidente', None, '50956556X', None,
           'Presidente actual (ficha; acta de renovacion de cargos de 05-03-2026 en la carpeta). Antes, tachadas: Carmen Martin Domingo y Raquel Martinez Clavero.'),
    trae_pu=PU['godino'])

cco = cid_de('PUERTO DE COTOS 11')
arreglar_pc(cco, 'rol=eq.presidente', {'nombre': 'ESTEBAN SANCHEZ', 'notas': 'En la ficha "ESTEBAN SANCHEZ / 605 01 30 35". Como vecino que contacta: Esteban, estebansr@live.com.'})
elvira = pc_unico(cco, 'ELVIRA', 'vecino', '669132390', None, 'elvirarabadan.psic@gmail.com', 'Vecina; contacta con Esteban (ficha, may-2026).')
rellenar('co11', 'PUERTO DE COTOS 11', 'puertodecotos11', dict({'fecha_apertura': '2026-05-14', 'referencia_catastral': '4226901VK4742E',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: el escaneo 3D, 14/05/2026). Contacta: los vecinos Elvira (669 132 390; elvirarabadan.psic@gmail.com) y Esteban (estebansr@live.com). '
                    'Paga: la CP. Tipo de obra: BAJADA A COTA 0 + ASCENSOR (MODIFICACION) + SUBV. Tecnico: Claribel Salazar. Fecha encargo: 01/07/2026. Ano 1985. Administracion: LAURA '
                    'AVILES LAGUNA (aviles.laura@hotmail.com). Presidente: Esteban Sanchez (605 01 30 35). CIF E78590643 (letra E: comunidad de bienes). Comercial interno: ALVARO.'},
    **trae(elvira)), ('cota_cero', 'modificacion_asc', 'subvenciones'),
    n=fijar('puertodecotos11', 2026, ('2026-05-18', 'Sin fecha delante; la fecha va dentro de la nota.')), comunidad={'iban': 'ES86 2085 8299 1603 3017 7006'},
    captador=ALVARO, lleva=ALVARO)

rellenar('bo46', 'PUERTO DE LA BONAIGUA 46', 'puertodelabonaigua46', {'fecha_apertura': '2024-12-20', 'referencia_catastral': '3510704VK4731B',
    'origen_notas': 'Fecha de llegada: 12/2024 (dia: la primera nota, 20/12/2024; los ficheros de 2023 de la carpeta son de plantilla del CEE). Contacta: Jose Antonio (DEL BRIO Y BLANCO; '
                    '91 477 41 91 / 91 478 69 11 / 91 477 88 32; joseantonio@delbrioyblanco.es); tambien Manuel (Blanco). Paga: la CP. Tipo de obra: ASCENSOR + SUBV. Barrio: San Diego. '
                    'Tecnico: KGS. Fecha encargo: 06/02/2025. Ano 1958. Presidente: Angel Delgado Rodriguez (51996540A). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'),
    n=fijar('puertodelabonaigua46', 2024, otros={3: ('2025-01-17', 'En la ficha "17/01" sin ano: es 2025 (va entre el 15/01/2025 y el 20/01/2025).')}),
    comunidad={'iban': 'ES11 2085 9741 7703 3034 2469'}, trae_pu=PU['joseantonio'])

rellenar('mo11', 'PUERTO DE LA MORCUERA 11', 'puertodelamorcuera11', {'fecha_apertura': '2024-11-07',
    'origen_notas': 'Fecha de llegada: 11/2024 (dia: el correo de Manuel Blanco, 07/11/2024). Contacta: Manuel Blanco Blanco (DEL BRIO Y BLANCO; Carlos Martin Alvarez 65 bis, 1o B, 28018; '
                    '616 42 70 62; 91 477 41 91 y 91 478 69 11; manuel@delbrioyblanco.es; atencion de lunes a jueves de 9:30 a 13:30 y de 16:00 a 19:00, viernes de 9:30 a 13:30); '
                    'pedidos docs 27/11/24. Paga: la CP. Tipo de obra: 6 ASCENSORES (uno por portal) + SUBV A EXITO; HE con descuento por 6 portales. Votan que si (27/11/2024) y devuelven '
                    'la HE firmada, pero el 29/11/2024 el administrador pide dejarlo en standby: los de los bajos se proponen impugnar la decision. "PROYECTO CANCELADO". '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=fijar('puertodelamorcuera11', 2024), trae_pu=PU['mblanco'])
cerrar_perdida('mo11', 'los de los bajos se proponen impugnar la instalacion del ascensor; proyecto cancelado', '2024-11-29',
               'En la ficha (29/11/2024): "indica el administrador que dejemos todo en standby ya que los de los bajos se estan proponiendo impugnar la decision de la instalacion del '
               'ascensor. Esperar. PROYECTO CANCELADO." Cerrada en el barrido de Madrid.')

rellenar('mo22', 'PUERTO DE LA MORCUERA 22', 'puertodelamorcuera22', {'fecha_apertura': '2026-03-20',
    'origen_notas': 'Fecha de llegada: la ficha dice 04/2026; el correo de Vanesa pidiendo presupuesto de la IEE es del 20/03/2026; se toma ese. Contacta: Vanesa (DEL BRIO Y BLANCO; Calle Pena '
                    'de la Miel 1, bajo; vanesa@delbrioyblanco.es). Tipo de obra: IEE. Comercial interno: ALVARO.'},
    ('iee',), n=fijar('puertodelamorcuera22', 2026, ('2026-03-20', 'Correo de Vanesa (Del Brio y Blanco) del 20 de marzo de 2026.')),
    adm=PU['vanesa_dbb'], trae_pu=PU['vanesa_dbb'], captador=ALVARO, lleva=ALVARO)

cmo = cid_de('PUERTO DEL MONASTERIO 20')
arreglar_pc(cmo, 'rol=eq.presidente&nombre=eq.' + quote('Vicente Agudo Vidal (4 B) cuidado es el vicepresidente'),
            {'nombre': 'VICENTE AGUDO VIDAL', 'rol': 'vicepresidente', 'notas': '4o B. Estaba en la casilla del presidente de la ficha: "cuidado es el vicepresidente".'})
rellenar('pm20', 'PUERTO DEL MONASTERIO 20', 'puertodelmonasterio20', {'fecha_apertura': '2023-03-23', 'referencia_catastral': '3619912VK4731H',
    'origen_notas': 'Fecha de llegada: 03/2023 (dia: el presupuesto de la carpeta, 23/03/2023). Contacta: David Sanchez (FAIN). Tipo de obra: ASCENSOR (la subvencion se la tramitan ellos; en '
                    'jun-2025, HE de subvencion pedida por Del Brio, con el precio modificado tras el correo de Mavi Sanchez, vecina, arquimad.mavi@gmail.com). Barrio: San Diego. Tecnico: '
                    'Julio -> Carlos. Jefes de obra: Victor Esquinas y Abel Bernardos (FAIN). Ano 1965. Administracion: DEL BRIO Y BLANCO (Manuel Blanco, 616 427 064, manuel@delbrioyblanco.es; '
                    'carlos@delbrioyblanco.es; David Flores, david@delbrioyblanco.es, 680 503 243). Vicepresidente: Vicente Agudo Vidal (4o B; 02828643B; 635 78 14 76) ("cuidado es el '
                    'vicepresidente"). "Lo quieren por licencia, que se tarde lo maximo posible, pero corresponde DR": procedimiento ordinario, por el dinero y las subvenciones (el '
                    'administrador, el mismo que el de Alfredo Castro Camba 24). Expediente 350/2023/23083. NZ 3.1.a. ARRU. PEM 172.188,24. Visados TL/009425/2023 y TL/013914/2026 (CFO, '
                    'visado y registrado en el Ayto en sep-2026). Superficie 79,08. En la carpeta hay tambien una ficha antigua de 2016 (Pedro Aranda, Thyssen), otro encargo: va a la clon. '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=fijar(MON, 2023, ('2023-03-29', 'Correos de David Sanchez (Fain) y Manuel Blanco (Del Brio y Blanco) del 28 y 29 de marzo de 2023.')),
    trae_pu=PU['dsanchez_fain'], oid_fijo=MON20)

# ================================================================= 2. CLON
REVS = [
    ('plazafonsagrada9', '2022-02-14', 'JUAN PARAMIO (FAIN)', None, '0212932VK4801A',
     'PLAZA FONSAGRADA 9 MADRID. Fecha: 02/2022 (dia: el correo de Juan Paramio, 14/02/2022). Tipo de obra: SUSTITUCION DE 2 ASCENSORES - SOLO CSS (sustitucion de 2 ascensores de 14 '
     'paradas, puertas semiautomaticas por automaticas y abrir huecos en las plantas sin puerta). Distrito Fuencarral. CP 28029. Jefe de obra: Eusebio Medina. Fecha encargo: 15/02/2022. '
     'En la carpeta, el acta y el plan de seguridad y salud (feb-2022) y ficheros de ene-2023.\n\n'
     + cl('plazafonsagrada9', 2022, ('2022-02-14', 'Correo de Juan Paramio (Fain) del 14 de febrero de 2022.'))),
    ('plazagabrielmiro3', '2026-07-01', None, None, None,
     'PLAZA GABRIEL MIRO 3 MADRID. Carpeta SIN ficha de datos: solo el escaneo 3D (01/07/2026).'),
    ('plazamaliciosa4-5', '2026-09-28', 'SERAPIO (PRESIDENTE; RECOMENDADO POR ENVOLTERMIA)', None, None,
     'PLAZA MALICIOSA 4-5 MADRID. Fecha: 09/2026 (dia: la primera nota y el croquis, 28/09/2026). Tipo de obra: SATE + SUBV ("un Sate normal"; viene recomendado por ENVOLTERMIA, '
     'presupuesto de Envoltermia del 29/09/2026 en la carpeta). Contacto: Serapio, presidente (serapiopaez@gmail.com; 639 12 55 48). Comercial interno: DANIEL.\n\n' + crudo('plazamaliciosa4-5', 2026)),
    ('pobladesegur11', '2017-06-05', 'ANDRES (ENGWE); AHORA JERONIMO', 'H-79827713', '4500608VK4840B',
     'POBLA DE SEGUR 11 MADRID. Fecha: 05/06/2017 (la de la ficha; las fotos de la visita son del 10/06/2017; un presupuesto de "cabrera27" de mar-2017 es de otra direccion). '
     'Tipo de obra: la ficha no lo dice (en la carpeta, croquis y presupuesto de ascensor). Distrito 16 - Hortaleza. CP 28033. Agente: Andres, de ENGWE (en la agenda, como "CUIDADO ESTOS NO"); '
     'ahora Jeronimo. Presidenta: Beatriz (655 14 77 07; batirches@hotmail.com). PEM 50.000 (residuos 300). Superficie 83,65 m2. NZ 3.1.a. Junta de Hortaleza (Carretera de Canillas 2): '
     'negociado de licencias 91 588 76 34 y 91 588 76 44, con cita previa; tecnico Lourdes Santa Maria. La ficha no tiene notas.'),
    ('portugalete25', '2019-11-29', None, 'H-80169436', '6256707VK4765E',
     'PORTUGALETE 25 MADRID. Fecha: la ficha no la trae; 11/2019 (dia: los primeros ficheros, 29/11/2019: acta de aprobacion, apertura y solicitud registradas y plan de seguridad, en '
     'la subcarpeta "SUBVENCIONES 2021"; hay ficheros hasta jul-2021). Tipo de obra: INSTALACION DE ASCENSOR. CP 28017. Presidente: David Herradon Garcia (52872120-L). 24 viviendas y '
     'locales. Ano 1970. La ficha no tiene contacto ni notas.'),
    ('portugalete27', '2021-02-25', 'INVER DE VELERDA', 'H79714382', '6256706VK4765E',
     'PORTUGALETE 27 MADRID. Fecha: la ficha dice 2018 (el expediente de licencia es de otro arquitecto: 116/2018/03932); el primer trabajo de Accesalia son los documentos numerados '
     '"16 -" del 25/02/2021 (correos, contrato, licencia concedida y proyecto); se toma esa (el "certificado de obra de ponzano51" de ene-2021 es copia de otra carpeta). Tipo de obra: '
     'INSTALACION DE ASCENSOR (direccion de obra). Distrito Ciudad Lineal. CP 28017. Viene de Inver, de Velerda: "(lo han hecho por su cuenta al final)". Tecnico: Dennis. Administracion: '
     'GESYVEN SERVICIOS INTEGRALES SL (David Espinosa; c/ Alcala 401, portal 2, 1o A, 28027; 91 403 41 40; d.espinosa@gesyven.com; gestionyventa@gesyven.com) - dato antiguo, no esta en '
     'la agenda. Presidente: Jose Ignacio Colodras Serrano ("6098504501 (ESTE NUMERO ESTA MAL)"). PEM 109.772,27. Visado TL-020820-2021. 07/03/2019 (licencia). Superficie 100 m2. '
     'En la carpeta, la direccion de obra y el CFO (dic-2021).\n\n' + cl('portugalete27', 2021, ('2021-12-21', 'Sin fecha; se pone la de los ultimos ficheros del CFO (dic-2021).'))),
    ('porvenir9-19', '2026-09-28', 'JUAN MANUEL CEBALLOS', None, None,
     'PORVENIR 9-19 MADRID. Fecha: 09/2026 (dia: los planos ofrecidos por el vecino y el escaneo 3D, 28/09/2026). Tipo de obra: VARIAS ACCESIBILIDADES. Contacto: Juan Manuel Ceballos '
     '(jmceballos1@hotmail.com; 629 643 045). La ficha no tiene notas. Comercial interno: ALVARO.'),
    ('pradillo26', '2023-07-12', 'MARIA JOSE (ATIKO)', None, None,
     'PRADILLO 26 MADRID. Fecha: la ficha dice 10/2023; la primera nota es del 12/07/2023 ("Para mirar con Elite"); se toma esa. Tipo de obra: SATE Y CALDERAS. Distrito 05 - Chamartin '
     '(Ciudad Jardin). CP 28002. Administracion: ATIKO (Maria Jose Ruiz; C. del Amparo 86, 28012; 912 98 20 05; administracion@atikogestion.es). El 3 de julio de 2026 Atiko vuelve a pedir '
     'propuesta para C.P. Miguel Servet 13 y Pradillo 26 (presupuestos de jun-2026 en la carpeta); el 14-07-26 "de momento la cp no lo hara".\n\n' + crudo('pradillo26', 2023)),
    ('pradolonguillo6', '2023-01-31', 'ANGEL FARELO (ADMINISTRACIONES FARO / AEA FINCAS)', None, '9890903VK3699B',
     'CL PRADOLONGUILLO 6 MADRID. Fecha: 01/2023 (dia: la primera nota, 31/01/2023). Paga: la CDAD. Tipo de obra: SUBVENCIONES PARA PLATAFORMA (viene de una IEE desfavorable; '
     'presupuesto de salvaescaleras de FAIN); proyecto externo, "NO ES NUESTRO": tecnico Ines de la Vega (633 124 079; contacto@estudio551.com). Distrito Usera. CP 28041. '
     'Administracion: Administraciones Faro S.L. / AEA FINCAS (Angel Farelo; C/ Serena 3, local 2, 28915 Leganes; 910 134 517; incidencias@administracionesfaro.com). '
     'Cuenta: ES07 2100 2526 1013 0013 8873. HE firmada 21/03/2024 (subvencion Transforma tu Barrio); HE de subvenciones externa enviada 24/04/2025 (subvencion CAM 2025). '
     'Tecnico: EXTERNO.\n\n' + crudo('pradolonguillo6', 2023)),
    ('prietoureña10', '2025-03-26', 'MARTA MARTIN LOZOYA (ELECNOR)', None, None,
     'PRIETO UREÑA 10 MADRID. Fecha: 03/2025 (dia: el correo de Elecnor y la HE enviada, 26/03/2025). Tipo de obra: SATE + CUBIERTA (obra de 232.649,90 EUR). ' + ELEC + ' '
     'Contacto: Marta Martin Lozoya (ELECNOR; 638 543 742; martamartin@elecnor.com), con Andrea Diaz Serrano en copia. La ficha no dice comercial interno.\n\n' + crudo('prietoureña10', 2025)),
    ('princesa27', '2017-10-25', 'ANDREA LOPEZ (TEOSO)', 'E78810967', '9556101VK3795F',
     'C/ PRINCESA 27 MADRID. Fecha: 25/10/2017 (la de la ficha; el croquis del acceso es del 06/11/2017 y la propuesta de honorarios del 16/11/2017). Tipo de obra: ASCENSOR (dos; '
     '"nuestro maximo interes es que los dos ascensores tengan la mayor capacidad posible"). Distrito 09 - Moncloa-Aravaca. CP 28008. NZ3. En la ficha, agente "SANTIAGO 27". '
     'Administracion: S & S ABOGADAS, ADMINISTRADORAS DE FINCAS (673 090 111; 914 012 862; Estrella Sacristan, estrella_sys@yahoo.es) - dato antiguo, no esta en la agenda. Contacto: '
     'Andrea Lopez (629 571 110; andrea@teoso.net), con Pedro Saez, presidente (psaezji@gmail.com); para visitarlo, Carlos, de mantenimiento (610 825 243 y 661 593 200), por el '
     'maletero del hotel. CIF E78810967 (letra E: comunidad de bienes). Cuenta ES75 0182 7594 3002 0801 5858 (abril 2022). PEM 50.000 (residuos 300). Superficie 79. Expediente '
     '109/2018/03570. OTIS: Julio Gomez Partida (tecnico comercial Boadilla - Majadahonda; 683 667 212 / 639 950 352 / 629 87 42 37; julio.gomez@otis.com). En la carpeta, '
     'informe, proyecto y obra de 2018 a 2022.'),
    ('principedevergara25', '2021-08-05', 'MARIO LUCIO GARCIA FERNANDEZ (GARCIA DEL BURGO)', 'H-79286761', None,
     'PRINCIPE DE VERGARA 25 MADRID. Fecha: la ficha dice 01/2022; los primeros ficheros ("SOLO SE CONTRATA PARA SUBVENCION", Rehabilita 2021) son del 05/08/2021; se toma esa. Paga: la '
     'CDAD. Tipo de obra: SUBVENCION AYTO MADRID 2021 (solo subvenciones). Administracion: Garcia del Burgo S.L. (Mario Lucio Garcia Fernandez; mariogdb@gmail.com) - no esta en la agenda; '
     'antiguo administrador: ARCOS OLEA (Raquel / Jose Antonio Tercero; 609 536 365; raquel@arcosolea.es; j.tercero@arcosolea.es).\n\n' + crudo('principedevergara25', 2022)),
    ('puertodebalbaran27', '2025-06-23', 'SILVIA ARRIBAS (ARRIALSI)', None, None,
     'PUERTO DE BALBARAN 27 MADRID. Fecha: 06/2025 (dia: la fecha de encargo de la ficha, 23-06-2025). Tipo de obra: CUBIERTA SANDWICH (nueva cobertura de panel sandwich; Daniel '
     'propone tambien SATE por las humedades de condensacion). Administracion: ARRIALSI (Silvia Arribas; Camino de Ganapanes 35, local AF, 28035; 917 307 033 / 665 805 356; '
     'info@arrialsi.com). Comercial interno: DANIEL.\n\n' + cl('puertodebalbaran27', 2025, ('2025-06-23', 'Sin fecha; la visita de Daniel, con la fecha de encargo de la ficha.'))),
    ('puertodesomiedo14', '2024-10-23', 'ANDRES BLAZQUEZ (PRESIDENTE)', None, None,
     'PUERTO DE SOMIEDO 14 MADRID. Fecha: 10/2024 (dia: la primera nota, escaneo con iPhone, 23/10/2024). Paga: la CP. Tipo de obra: ASCENSOR CON DERRIBO. Contacto: Andres Blazquez, '
     'presidente (3o B; 649 75 99 45; ablaizq@gmail.com). Presupuesto de proyecto + subvenciones enviado para la reunion de vecinos (22/01/2025).\n\n' + crudo('puertodesomiedo14', 2024)),
    ('puertolapice4', '2026-02-09', None, None, None,
     'PUERTO LAPICE 4 MADRID. Fecha: 02/2026 (dia: el escaneo 3D, 09/02/2026; el .skb de ene-2026 es de plantilla). Tipo de obra: ASC. Contacto y administracion: "NO LO SE". '
     'La ficha no tiene notas. Comercial interno: ALVARO.'),
    ('puertolapice6', '2026-02-09', None, None, None,
     'PUERTO LAPICE 6 MADRID. Fecha: 02/2026 (dia: el escaneo 3D, 09/02/2026; el .skb de ene-2026 es de plantilla). Tipo de obra: ASC. Contacto y administracion: "NO LO SE". '
     'La ficha no tiene notas. Comercial interno: ALVARO.'),
    ('pzalmuñecar7', '2023-07-06', 'VICENTE REAL (FAIN)', None, None,
     'PZ ALMUÑECAR 7 MADRID. Fecha: 07/2023 (dia: la nota del 06/07/2023: correo con croquis y fotos). Tipo de obra: ASCENSOR. Distrito 20 - San Blas - Canillejas (Canillejas). '
     'CP en la ficha: 28008. La carpeta solo tiene la ficha.\n\n' + crudo('pzalmuñecar7', 2023)),
    ('pzalmuñecar9', '2023-07-06', 'VICENTE REAL (FAIN)', None, None,
     'PZ ALMUÑECAR 9 MADRID. Fecha: 07/2023 (dia: la nota del 06/07/2023: correo con croquis y fotos). Tipo de obra: ASCENSOR. Distrito 20 - San Blas - Canillejas (Canillejas). '
     'CP en la ficha: 28008. La carpeta solo tiene la ficha.\n\n' + crudo('pzalmuñecar9', 2023))]
for carp, fecha, trajo, cif, ref, t in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, comercial='Alvaro' if carp in ('porvenir9-19', 'puertolapice4', 'puertolapice6') else 'Daniel')

fila('plazasierradeayllon2', '2024-05-30', 'cerrada', 'Perdida: "29/10/2024 REUNION DE VECINOS PARA VOTAR. NO HA SALIDO".', 'FERNANDO MOZOS (ITACA FINCAS)', None, None,
     'PLAZA SIERRA DE AYLLON 2 MADRID. Fecha: 05/2024 (dia: la primera nota, 30/05/2024). Paga: la CDAD PROP. Tipo de obra: 3 ASCENSORES CON DERRIBO. Distrito Vallecas. CP 28031. '
     'Administracion: ITACA FINCAS (Fernando Mozos; 91 290 28 38 / 639 181 314; fmozos@itacafincas.net). Hay fotos y nube de puntos (jun-oct 2024).\n\n' + crudo('plazasierradeayllon2', 2024))
fila('pzarteijo14', '2023-06-05', 'cerrada', 'Perdida: "05/06/2023 Hacemos propuesta y dice que no puede, buscara otro arquitecto".', 'JUAN PARAMIO (FAIN)', None, None,
     'PZ ARTEIJO 14 MADRID. Fecha: la ficha dice 12/2023; la nota es del 05/06/2023; se toma esa. Tipo de obra: SUSTITUCION PUERTAS. Distrito 08 - Fuencarral - El Pardo (Pilar). '
     'La carpeta solo tiene la ficha.\n\n' + crudo('pzarteijo14', 2023))
for carp, fecha, trajo, t, *ruta in [
        ('plazanuestraseñoradelpilar9', '2017-08-23', 'PEDRO ARANDA (THYSSEN)', 'PLAZA NUESTRA SEÑORA DEL PILAR 9 MADRID. Fecha: 23/08/2017 (la de la ficha). Distrito 05 - Chamartin. '
         'Ficha vacia; hay croquis (ago-2017).'),
        ('plazasolidaridad10', '2016-08-25', 'PEDRO ARANDA (THYSSEN)', 'PZ SOLIDARIDAD 10 MADRID. Fecha: 25/08/2016 (la de la ficha). Ficha vacia salvo el correo de Pedro Aranda: '
         '"He visitado esta obra y tiene las siguientes medidas la escalera. 2,21 ancho de escalera, 4,97 fondo de escalera. Puedes decirme hueco libre para la instalacion del ascensor?". '
         'Hay planos de la escalera (sep-oct 2016).'),
        ('princesa31', '2017-01-02', 'LUIS MIGUEL NUNES (THYSSEN)', 'C/ PRINCESA 31 MADRID. Fecha: 02/01/2017 (la foto del croquis y la ficha; la ficha dice "02/12/2017"). Ficha vacia; '
         'hay presupuesto (feb-2017).'),
        ('provencio33', '2017-03-15', 'JUAN CARLOS (THYSSEN)', 'CALLE PROVENCIO 33 MADRID. Fecha: 15/03/2017 (la de la ficha). Ficha vacia; hay propuesta de informe tecnico y presupuesto '
         '(mar-2017). En produccion esta EL PROVENCIO 31, no el 33.'),
        ('puertodelmonasterio20 (2016)', '2016-06-02', 'PEDRO ARANDA (THYSSEN)', 'PUERTO DEL MONASTERIO 20 MADRID (ficha antigua de 2016: "antiguo - FICHA DE DATOS ACCESALIA.docx"). '
         'Fecha: 02/06/2016 (la de la ficha). Mediador: Luis Sanchez, 91 478 39 30. Ficha vacia; hay croquis, presupuesto y borrador de escalera (jul-2016). El ascensor de 2023 de este '
         'edificio esta en produccion.', R('puertodelmonasterio20')),
        ('plazavalencia8', '2020-03-24', None, 'PLAZA VALENCIA 8 MADRID. Carpeta SIN ficha de datos: solo el calculo de deflexiones y su plano (24/03/2020).'),
        ('ponzano51', '2020-11-12', None, 'PONZANO 51 MADRID. Carpeta SIN ficha de datos: direccion de obra y CSS de un proyecto de otro arquitecto (visado anterior, "Recision de DO y CSS", '
         'solicitud de visado; nov-2020 a jul-2021). La carpeta "Ponzano 51" (memoria tecnica de diseno y fotos, abr-2021) es del mismo encargo: sin fila propia.'),
        ('pub irlandes', '2014-01-31', None, 'PUB IRLANDES (sin direccion). Carpeta SIN ficha de datos: fotos, croquis, propuesta y un pdf de servicios (ene-feb 2014).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t, ruta=ruta[0] if ruta else None)
# Sin fila: plazasanjaime2, princesa25 y principedevergara223 son carpetas VACIAS (0 ficheros, sin fecha). "Ponzano 51": mismo encargo que ponzano51.

# ================================================================= 3. MANIAS
mania('En Villaverde el ascensor va por LICENCIA: la declaracion responsable no vale.', 'Junta Municipal de Distrito de Villaverde', '2022-09-30', 'plazaparvillas1', clave='pv1',
      cita='DECLARACION NO VALE 112/2022/02295 . EN VILLAVERDE VA POR LICENCIA. LICENCIA (30/09/22) 350/2022/08261')
mania('Patrimonio (CPPHAN): aunque la ECU no exija el proyecto conjunto de fachada, la propia Comision puede pedirlo al informar el expediente.', 'ECU (ACTECU) / Patrimonio (CPPHAN)',
      '2025-12-19', 'plazalucadetena11', clave='lt11', trozo='CPPHAN')

if not ESCRIBIR:
    print('Propuestas: PAULAR_UNA_OPP=%s (opp vacia de PAULAR 2 fcecc28a para borrar), GEOLOGOS_UNA_OPP=%s (opp vacia de GEOLOGOS 2 7ff9d6a0 para borrar), '
          'PUERTO DEL MONASTERIO 20: opp vacia 94fe59d0 para borrar.' % (PAULAR_UNA_OPP, GEOLOGOS_UNA_OPP))
resumen()
