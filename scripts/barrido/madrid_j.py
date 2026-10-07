# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda J (jacintocamarero3 .. juliopalacios2-4-6, 46 carpetas: toda la J). 7-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de, _lineas

FAIN = 'fa005671-8d23-45a6-8172-0ea7ca8c8950'; CIUDADLINEAL = 'c9d678a9-96d2-4cf1-ba5e-5f30bfd71eed'; USERA = '2b9315a6-75d4-4b91-82db-e60b950a7409'
PU.update(ivan_fain='ed4a4c84-e7c9-41a9-82b0-f0c856c3d3ec', ldavila='b6bc8f23-5fd3-41aa-b3c8-b7d2e414ced1', alvaro_dbb='b4ccdbfa-8bce-4800-888c-91ae82028f8f',
          dbrio='e18206ca-c52e-4318-a0b5-906945ba08aa', carmen_dbb='99d79d86-6a38-43ed-949d-711e29fadbb5', aencinas='69dd910c-6468-49e4-90a4-5eeb9133daa7',
          enrique_ju94='48d4eac7-6558-4944-b616-43f49d52a064', francisco_ju94='5619f59d-8ad2-49b8-bd90-8b2662cf8c37', oswaldo='26059992-8e15-423b-bc47-6c476b9b5e5c',
          alfredo_iberlean='97fbfb50-5db7-43e7-a916-aa32441ced0d', pujol='37e7d0f8-8fda-434d-95f1-f739688a0c61', roberto_matedecon='ace22bc1-51c2-493e-a2d2-f1858148b671',
          gjimenez='35f57565-efa6-4434-8c91-cc194fa5e98e')
JB15G = 'c3192033-3e2c-4f31-b7b5-8f070ed3e3e6'       # "JULIAN BESTEIRO 15G MADRID"  -> el ascensor de la escalera G (2025) [de_donde: "Dos opps sobre el mismo portal: pericial y ascensor"]
JB15_G = 'c784e8ed-4138-41f0-8013-5ff3e5a1f112'      # "JULIAN BESTEIRO 15 G MADRID" -> el informe pericial (2019-2023)
JB13_15 = 'f68eb0c7-58ef-4653-8607-5a8556f5f2f0'     # "JULIAN BESTEIRO 13 15 MADRID" -> NO se rellena (duda para Monica: misma opp que la de 15G)
# Propuesta para Monica (como Fatou 24): la carpeta julianbesteiro13-15 es la MISMA oportunidad de 2025 que el ascensor de la escalera G (Fabio pide en el mismo correo
# la G, la L y "las otras 11 escaleras"). Se rellena 15G y se le enlazan los 5 accesos de la opp de 13 15, que queda vacia para borrarla. False = no enlazar.
BESTEIRO_UNA_OPP = True
ACC_13_15 = ('1972abe0-3e80-40c2-8131-81c9260fa7b5', '3d2176bd-526a-48a2-93ff-cb3c1770831e', '464e5876-ae1f-4653-8ba8-982079f5683a',
             '98f4b995-c029-4b7b-a3c4-82dc50eb24f7', 'fdc9d7d8-288b-4ae2-a09d-7774b22e5c0e')
JIB = 'joaquinibarra37/ASCENSOR/FICHA DATOS TECNICOS.docx'
JMP = 'josemariapereda43/FICHA ASCENSOR JOSE MARIA PEREDA 43 MAYO 2021.docx'
JBA = 'julianbesteiro15g/2. ascensor/FICHA DATOS.docx'
JBP = 'julianbesteiro15g/1. informe pericial/FICHA DATOS TECNICOS.docx'


def cid_de(prefijo):
    cs = b.leer('comunidades?select=id&municipio=eq.MADRID&nombre=like.' + quote(prefijo) + '*'); assert len(cs) == 1, prefijo
    return cs[0]['id']


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto (presidente tachado en la ficha...)."""
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


def relevar_puesto(cid, puesto_viejo, puesto_nuevo, nota):
    """misma administracion, otra persona: la vigente esta TACHADA en la ficha (sin fecha: no se sabe) y entra la nueva."""
    for a in b.leer('comunidad_admin_responsable?select=id,empresa_id&vigente=eq.true&puesto_id=eq.%s&comunidad_id=eq.%s' % (puesto_viejo, cid)):
        act('comunidad_admin_responsable?id=eq.' + a['id'], {'vigente': False, 'notas': nota})
        if not b.leer('comunidad_admin_responsable?select=id&vigente=eq.true&puesto_id=eq.%s&comunidad_id=eq.%s' % (puesto_nuevo, cid)):
            ins('comunidad_admin_responsable', [{'comunidad_id': cid, 'empresa_id': a['empresa_id'], 'puesto_id': puesto_nuevo, 'vigente': True}])


def motivo(n, i, m):
    """anade el motivo a la nota i (la fecha ya la puso partir)."""
    f, t = n[i]; n[i] = (f, t + '\n\n(' + m + ')'); return n


def bloque(c, i, j):
    """lineas i..j (incluidas) de la ficha, sin las vacias."""
    return '\n'.join(l for l in _lineas(c)[i:j + 1] if l.strip()).strip()


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
cl = lambda c, a, s=None: J(fijar(c, a, s))
EMP_DBB = b.leer('puesto?select=empresa_id&id=eq.' + PU['dbrio'])[0]['empresa_id']
EMP_GJ = b.leer('puesto?select=empresa_id&id=eq.' + PU['gjimenez'])[0]['empresa_id']

# ================================================================= 0. AGENDA (solo en contratas y organismos que ya existen; la Junta de Barajas se crea)
BARAJAS = junta(21, 'Barajas')
area(BARAJAS, 'Servicios Técnicos', '638 980 264', 'En la ficha, "Dpto tecnico de Barajas": sirnlicenciasbarajas@madrid.es y tecnibarajas@madrid.es (Joaquin Ibarra 37, 2022-2026).')
area(USERA, 'Negociado de licencias', '91 588 72 50', 'Lunes, miercoles y viernes de 9 a 11; C/ Rafael Ibarra 41 (dato de 2017, Juan Espanol 32).')
persona_nueva('Daniel', 'Palacios', 'jefe de obra', '652863532', 'daniel.palacios@fainascensores.com', contrata=FAIN,
              notas_='FAIN: jefe de obra del ascensor de Joaquin Ibarra 37 (2022-2025).')
persona_nueva('José María', 'Monreal', 'técnico', None, None, organismo=CIUDADLINEAL,
              notas_='Junta de Ciudad Lineal: tecnico de la DR del ascensor de Jose Maria Pereda 43 (expediente 116/2021/05459; incidencia por telefono, may-2022).')

# ================================================================= 1. PRODUCCION (13 carpetas, 13 oportunidades; la de JULIAN BESTEIRO 13 15 no se toca)
cj90 = cid_de('JACOBINIA 90')
miguel = pc_unico(cj90, 'MIGUEL', 'vecino', '684011609', None, None, 'Vecino; contacta (quien contacta en la ficha).')
rellenar('jac90', 'JACOBINIA 90', 'jacobinia90', dict({'fecha_apertura': '2026-02-01',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia desconocido; la ficha es del 02/03/2026). Contacta: Miguel, vecino (684 01 16 09). Tipo de obra: ASCENSOR. CP 28047. '
                    'En la ficha: comercial interno CARLOS.' + EXT}, **trae(miguel)),
    ('ascensor',), n=fijar('jacobinia90', 2026, ('2026-03-02', 'Sin fecha; se toma la del fichero de la ficha (02/03/2026): la HE se envio a mas tardar ese dia.')),
    captador=ALVARO, lleva=ALVARO)

n = fijar(JIB, 2022, otros={0: ('2022-05-04', 'Sin fecha; la solicitud de encargo de Fain, con los primeros ficheros (04/05/2022).'),
                            6: ('2024-04-25', 'En la ficha "25/04/2025": errata del ano, es 2024 (va entre el 24/04/2024 y el 20/08/2024, y el plazo de presentacion acababa el 26/04/2024).')})
rellenar('jib37', 'JOAQUIN IBARRA 37', 'joaquinibarra37', {'fecha_apertura': '2022-05-04', 'referencia_catastral': '9987109VK4798F',
    'origen_notas': 'Fecha de llegada: 05/2022 (dia: los primeros ficheros, 04/05/2022: el presupuesto de Fain firmado por la comunidad el 09/12/2021 y el pliego de condiciones). '
                    'Contacta: FAIN (Ivan Vazquez y Vicente Real). Tipo de obra: ASCENSOR EXTERIOR (por fachada posterior) + CSS + SUBVENCION (en may-2022 la subvencion la dejan en standby; '
                    'la HE de mayo de 2022 no se devolvio firmada; despues hay tramitacion de la convocatoria de Mejoras de Accesibilidad CAM 2023). Barrio: Alameda de Osuna. '
                    'Tecnico: Fernan -> Carlos Alberto. Jefe de obra: Daniel Palacios (FAIN; 652 863 532; daniel.palacios@fainascensores.com). Administracion: MENDIFIN (Isabel Mendieta; '
                    'Cl Canoa 21, bajo D; 917 057 466; isabel@mendifin.com): "A fecha 18 de junio se pone en contacto con nosotros la nueva administradora"; antes ~~ADMINISTRACIONES HERRERO '
                    'PELAEZ (Juan y Maria Pelaez; Avda. Cantabria 33; 91 747 23 74; herreroleon@yahoo.es; juan.herreroleon@yahoo.com)~~, tachada, y ~~el abogado de la comunidad, Juan Carlos '
                    'Alcaniz Rubio (alcanizrjc@icam.es; 911 625 868 / 609 126 579)~~, tachado. Presidente: Jose Manuel Comas Platero (650 584 427; josemanuelcomas@hotmail.com). Contacto: '
                    'Jesus Fernandez (1o D; 686 567 417 / 91 742 88 15). Junta de Barajas: dpto. tecnico 638 980 264 (sirnlicenciasbarajas@madrid.es; tecnibarajas@madrid.es). PEM 96.193,80. '
                    'Visados TL/009306/2022 y TL/004315/2026 (CFO). Expediente 350/2022/05288. Licencia. Superficie 77,42. En sep-2025 el ascensor esta montado a falta de cabina y electrica '
                    '(averia de la CGP, en manos de Union Fenosa); CFO a visar 20/03/2026; proyecto visado enviado a todos el 22/04/2026. En ene-2026 se ofrece una HE aparte para un proyecto de '
                    'rampa. En la carpeta hay tambien una subcarpeta "SATE solo estudio" (oct-2024). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'css', 'subvenciones', 'cfo'), n=n, comunidad={'iban': 'ES65 0081 7112 8800 0188 1989'},
    presi=('JOSE MANUEL COMAS PLATERO', 'presidente', '650584427', None, 'josemanuelcomas@hotmail.com'), trae_pu=PU['ivan_fain'])
pc_unico(OPP['jib37'][0]['id'], 'JESUS FERNANDEZ', 'otro', '686567417', None, None, 'Persona de contacto de la comunidad (1o D). Otro telefono: 91 742 88 15.')

rellenar('jmp43', 'JOSE MARIA PEREDA 43', 'josemariapereda43', {'fecha_apertura': '2021-02-24', 'referencia_catastral': '5159606VK4755G',
    'origen_notas': 'Fecha de llegada: la ficha dice xx/2021 (fecha de encargo: MAYO 2021); 02/2021 (dia: el primer fichero, el justificante de presentacion de la tramitacion de INVER, anulada, '
                    '24/02/2021; el 25/02/2021 llega el paquete "55.-" de INVER con emails, presupuesto, proyecto sin visar y solicitud de licencia). Contacta: Lucia Davila (ELECNOR; antes ~~Ibai '
                    'Calonge~~, tachado). Paga la comunidad. Tipo de obra: INSTALACION DE ASCENSOR + SUBVENCIONES (2 anos). Tecnico: Dennis; requerimiento: Fernan. Jefe de obra: Laura Sierra (ELECNOR) '
                    '- no esta en la agenda. Administracion: ADMINISTRACION DE FINCAS MATEOS (Alvaro Mateos Gonzalez; Virgen de los Reyes 18; 91 405 12 86 / 646 42 88 70; '
                    'admonfincas_mateos@hotmail.com). Junta de Ciudad Lineal: tecnico Jose Maria Monreal. PEM 128.583,19; residuos 300. Visado TL/008495/2021. Expediente 116/2021/05459; '
                    'DR aprobada 06-06-2022. En la carpeta: obra con actas (2022-2024), fin de obra y certificado final a origen (2023-2025), RAE y marcado CE (2025), anexo de excepcion del '
                    'armario de contadores (2026) y certificado de instalaciones (jul-2026); subvencion en marcha hasta oct-2026. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'),
    n=fijar(JMP, 2021, ('2025-02-26', 'Sin fecha; se toma la del fichero de la ficha (26/02/2025): se escribio a mas tardar ese dia.')),
    comunidad={'iban': 'ES14 2085 8351 8003 3005 7718'}, trae_pu=PU['ldavila'])

rellenar('jp20', 'JOSE PAULETE 20', 'josepaulete20', {'fecha_apertura': '2026-04-22',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: el escaneo 3D, 22/04/2026). Contacta: Alvaro (DEL BRIO Y BLANCO; alvaro@delbrioyblanco.es). Tipo de obra: la ficha no lo dice. '
                    'Hay escaneo 3D. Comercial interno: ALVARO.'},
    (), n=fijar('josepaulete20', 2026, otros={0: ('2026-04-27', 'La fecha va dentro ("HE enviado 27/04/2026").')}), adm=PU['alvaro_dbb'], trae_pu=PU['alvaro_dbb'],
    captador=ALVARO, lleva=ALVARO)
rellenar('jp5', 'JOSE PAULETE 5', 'josepaulete5', {'fecha_apertura': '2026-04-26',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: el de la ficha, 26/04/2026; en la carpeta solo esta la ficha). Administracion: DEL BRIO Y BLANCO (la ficha no dice la persona). '
                    'La ficha no dice quien contacta ni el tipo de obra. Comercial interno: ALVARO.'},
    (), n=fijar('josepaulete5', 2026, otros={0: ('2026-04-27', 'La fecha va dentro ("HE enviada 27/04/2026").')}), captador=ALVARO, lleva=ALVARO)
admin_empresa(OPP['jp5'][0]['id'], EMP_DBB)

rellenar('jl5', 'JOSUE LILLO 5', 'josuelillo5', {'fecha_apertura': '2024-12-17', 'referencia_catastral': '3310720VK4731A',
    'origen_notas': 'Fecha de llegada: 12/2024 (dia: la primera nota y la fecha de encargo, 17/12/2024; el .pzh de nov-2024 es la plantilla de presupuesto). Contacta: Daniel (DEL BRIO Y BLANCO; '
                    'Calle Pena de la Miel 1, local; 91 477 41 91 / 680 503 243; daniel@delbrioyblanco.es; facturas a facturacion@delbrioyblanco.es; pedidos docs a la CP 08/01/2025, reclamados '
                    '27/01 y 30/01). Paga la CP. Tipo de obra: ASCENSOR (HE "como Venancio Martin 48"). Tecnico: Jhonatan. Ano 1976. Presidente: Juan Gabriel Escribano Asenjo (660 193 714). '
                    'PEM 124.189,91; precio de contrata 147.785,99 (21/01/2025, por orden de Daniel). Licencia por ECU: incidencias de la ECU (la segunda, 21/05/2025); el encargo de la ECU, '
                    'sin firmar ni pagar. El 22/05/2025 la CP no quiere hacer el ascensor de momento; el 04/05/2026 el administrador comunica que la comunidad ha desistido por falta de '
                    'capacidad economica. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor',), n=fijar('josuelillo5', 2024), comunidad={'iban': 'ES43 2100 2579 1113 0075 9333'},
    presi=('JUAN GABRIEL ESCRIBANO ASENJO', 'presidente', '660193714'), trae_pu=PU['dbrio'],
    huecos=['[REVISAR EN FACTURACION] Proyecto hecho (con incidencias de la ECU); la comunidad desiste de hacer el ascensor (may-2025 y may-2026). Cancelar la obra no es cancelar '
            'la oportunidad: revisar que se ha cobrado y que no queda nada pendiente (Monica, 7-oct-2026).'])

n = partir(fijar('juanantoniomaroto1', 2025), 3, '04/07/2025', '2025-07-04')
rellenar('jam1', 'JUAN ANTONIO MAROTO 1', 'juanantoniomaroto1', {'fecha_apertura': '2025-01-15', 'referencia_catastral': '4510601VK4741B',
    'origen_notas': 'Fecha de llegada: 01/2025 (dia: la primera nota, 15/01/2025; los ficheros de 2022 y 2024 de la carpeta son plantillas). Contacta: Carmen Garcia (DEL BRIO Y BLANCO; Calle Carlos '
                    'Martin Alvarez 65 bis, 1o B; 91 477 41 91 / 91 478 69 11 / 680 503 243; carmen@delbrioyblanco.es y administradores@delbrioyblanco.es; de lunes a jueves de 9:30 a 13:30 y de 16:00 '
                    'a 19:00, viernes de 9:30 a 13:30; pedidos docs a la CP 04/04). Paga la CP. Tipo de obra: SATE + ASCENSOR + SUBV (en may-2026 se anaden videoporteros y buzones, y en jul-2026 '
                    'impermeabilizacion de terrazas: contradictorio en obra). Barrio: Palomeras Bajas. Tecnico: Julio -> Jacob (respuesta al administrador). Fecha encargo: 02/04/2025 (HE firmadas; '
                    'cobrado 04/07/2025). Ano 1976. LICENCIA por el AYUNTAMIENTO (no por ECU, para dar tiempo a la subvencion): en la ficha "Presentada 18-07-2025", en la nota 18/08/2025; '
                    'expediente anulado (notificacion 08/06/2026) y nueva licencia registrada 30/09/2026. Presidenta: Concepcion Sanchez Feito (651 838 806; sanchezfeito.conchi@gmail.com); '
                    'antes ~~Juan Carlos Rincon Perez (50950875X; 686 943 580)~~, tachado. Contrata: ELECNOR (Javier rehace el presupuesto). Administracion del edificio de al lado '
                    '(Puerto de Corlite 4): SBS ABOGADOS-ADMINISTRACION DE FINCAS (Sandra, 669 539 758, sandrabaraja@sbsadministraciondefincas.es) - no esta en la agenda. PEM 405.606,29. '
                    'Visado TL/010941/2025. Expediente 350/2025/22665. La ficha no dice comercial interno; la lleva Daniel.'},
    ('sate', 'ascensor', 'subvenciones'), n=n, comunidad={'iban': 'ES78 0081 7115 1700 0157 2065'}, trae_pu=PU['carmen_dbb'])
arreglar_pc(OPP['jam1'][0]['id'], 'rol=eq.presidente&nombre=eq.' + quote('JUAN CARLOS RINCON PEREZ'),
            {'nombre': 'CONCEPCION SANCHEZ FEITO', 'telefono': '651838806', 'email': 'sanchezfeito.conchi@gmail.com',
             'notas': 'Presidenta vigente. En la ficha de Dropbox el anterior, Juan Carlos Rincon Perez (50950875X; 686 943 580), esta tachado.'})

rellenar('jrj2', 'JUAN RAMON JIMENEZ 2 MADRID', 'juanramonjimenez2', {'fecha_apertura': '2023-01-01', 'referencia_catastral': '1989206VK4718H',
    'origen_notas': 'Fecha de llegada: 01/2023 (dia desconocido; la primera nota es del 30/06/2023 y los ficheros de ese mes de 2022-2023 son de trabajo del certificado energetico). Contacta: '
                    'ELECNOR - MP ASCENSORES: Ana Encinas (ELECNOR), Jesus Alberto Remesal (MP ASCENSORES; 677 078 817; JARS@mpascensores.com) e Izan Fernandez (ELECNOR; en la ficha, jvmanes@elecnor.es) '
                    '- no esta en la agenda. Tipo de obra: 12 ASCENSORES, PASARLOS A 6 + SUBV (proyecto y DO de los 6, CSS x2, subvenciones e IEE incluida); en dic-2023 quieren que un ascensor de '
                    'cada escalera baje al sotano. Barrio: Hispanoamerica. Tecnico: Susana -> Carlos (valoracion). Fecha encargo: 11/2023. Jefe de obra: Maria Martinez Arias. Administracion: JU 94 '
                    '(C/ Victor de la Serna 50, bajo; Francisco; 649 95 84 05 / 913 599 656; administracion@ju94.com; antes ~~Enrique~~, tachado). Presidente: Victor Rapun Coronas. Portero: '
                    'Mauricio (914 578 541 / 662 617 340; de 8:00 a 14:00 y de 19:00 a 22:00). Visado TL/001823/2024. Obra: DR (ene-feb 2024), acta de inicio 26/02/2024, actas hasta ago-2026, '
                    'RAE (jun-2026) y fin de obra en preparacion. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'df', 'css', 'subvenciones', 'iee'), n=partir(fijar('juanramonjimenez2', 2023), 0, 'Hablado con Enrique', '2023-12-19'), trae_pu=PU['aencinas'])
pc_unico(OPP['jrj2'][0]['id'], 'MAURICIO', 'otro', '914578541', None, None, 'Portero. Otro telefono: 662 617 340. Horario: de 8:00 a 14:00 y de 19:00 a 22:00.')
relevar_puesto(OPP['jrj2'][0]['id'], PU['enrique_ju94'], PU['francisco_ju94'],
               'En la ficha de Dropbox, Enrique (JU 94) esta tachado; la persona de contacto de la administracion es Francisco (Monica, 7-oct-2026).')

cjr28 = cid_de('JUAN RAMON JIMENEZ 28')
conserje = pc_unico(cjr28, 'JOSE MANUEL', 'otro', '639386989', None, None, 'Conserje; contacto en el edificio.')
rellenar('jrj28', 'JUAN RAMON JIMENEZ 28', 'juanramonjimenez28', {'fecha_apertura': '2026-03-10',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia: el correo de Oswaldo Garcia, 10/03/2026). Contacta: Oswaldo Garcia (SCHINDLER; 689 868 453; oswaldo.garcia@schindler.com). Paga el proyecto '
                    'SCHINDLER; la HE de subvenciones, aparte, la pagan los vecinos. Tipo de obra: MODIFICACION DE ASCENSOR: proyecto y DF del aumento de una parada (llevar el ascensor a la ultima '
                    'planta; obra y ascensor unos 38.000 EUR) + subvenciones por accesibilidad. No hace falta visita. Contacto en el edificio: Jose Manuel, conserje (639 386 989). '
                    'Comercial interno: DANIEL.'},
    ('modificacion_asc', 'anadir_parada', 'df', 'subvenciones'),
    n=fijar('juanramonjimenez28', 2026, ('2026-03-10', 'Correo de Oswaldo Garcia (Schindler) del 10 de marzo de 2026.')), trae_pu=PU['oswaldo'])

n = motivo(partir(fijar('juantornero62', 2025), 0, '---------- Forwarded message', '2025-10-07'), 1, 'Correo de Miguel Alemany (Iberlean) del 7 de octubre de 2025.')
n = motivo(partir(n, 3, 'De:' + chr(160) + '<malemany@iberlean.com>', '2025-10-16'), 4, 'Correo de Miguel Alemany (Iberlean) del 16 de octubre de 2025.')
rellenar('jt62', 'JUAN TORNERO 62', 'juantornero62', {'fecha_apertura': '2025-05-23', 'referencia_catastral': '8238307VK3783G',
    'origen_notas': 'Fecha de llegada: 05/2025 (dia: la primera nota, la HE enviada el 23/05/2025). Contacta: Alfredo Jimenez (IBERLEAN; 696 133 376; alfredo.jimenez@iberlean.com) y Miguel '
                    'Alemany (malemany@iberlean.com). Paga IBERLEAN. Tipo de obra: ASCENSOR (similar al de Avenida de America; la nube de puntos y el anteproyecto los hace Iberlean). Barrio: '
                    'Puerta del Angel. Tecnico: EA Santiago; ER KGS -> Carlos Alberto. Fecha encargo: 15/10/2025 (HE recibida firmada). Ano 1958. LICENCIA por ECU (ACTECU), concedida 25/03/2026. '
                    'Presidente: Jose Luis Domingo Herranz (625 49 45 42). PEM 168.229,64. Visado TL/001593/2026. Superficie 47,84. En la ficha, en el hueco de subvenciones: '
                    'ALFREDO.JIMENEZ@IBERLEAN.COM. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor',), n=n, presi=('Jose Luis Domingo Herranz', 'presidente', '625494542'), trae_pu=PU['alfredo_iberlean'])

# Julian Besteiro 15, escalera G: dos oportunidades en produccion sobre el mismo portal (pericial y ascensor), cada una con lo suyo.
cjb_g = cid_de('JULIAN BESTEIRO 15 G'); cjb_15g = cid_de('JULIAN BESTEIRO 15G')
FABIO_NOTA = 'Vecino de la escalera G; encarga el informe pericial (2022) y pide la HE del proyecto de la escalera G (may-2025).'
fabio_p = pc_unico(cjb_g, 'FABIO ACETO', 'vecino', '622544709', None, 'tuttook@yahoo.it', FABIO_NOTA)
fabio_a = pc_unico(cjb_15g, 'FABIO ACETO', 'vecino', '622544709', None, 'tuttook@yahoo.it', FABIO_NOTA)
rellenar('jb15p', 'JULIAN BESTEIRO 15 G', 'julianbesteiro15g', {'fecha_apertura': '2019-10-28',
    'origen_notas': 'Fecha de llegada: la ficha (subcarpeta "1. informe pericial") dice 09/2022; los primeros ficheros son de la visita del 28/10/2019 (fotos, croquis "Julian Besteiro 15 Medidas" '
                    'y propuesta del portal G); se toma esa. Contacta: Mariano Municio (via Roberto, MATEDECON) - Mariano no esta en la agenda; el encargo lo confirma Fabio Aceto, vecino '
                    '(622 54 47 09; tuttook@yahoo.it), con su abogado Jaime Ortiz Perez de Ayala (BUFETE CASTELLO 66; jaimeortiz@bufetecastello66.es) - no esta en la agenda, que el 07/03/2022 '
                    'manda la estructura del informe (barrera arquitectonica, alternativas y el proyecto de ascensor de ROSERSESE de 02/11/2021). Tipo de obra: INFORME PERICIAL DE VIABILIDAD '
                    'del ascensor (portal de 10 de la mancomunidad). Tecnico: Daniel. CP 28020. Administracion: GESTORIA JIMENEZ (+34 913 86 26 95 / +34 619 29 40 26). En la carpeta, el informe '
                    'pericial (mar-2022 a dic-2023). Las notas de 2025 de esta ficha son las del proyecto del ascensor de la escalera G (la otra oportunidad de este portal). '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('pericial',), n=fijar(JBP, 2022, otros={0: ('2022-01-01', 'Dia desconocido: "Enero 2022".')})[:2], oid_fijo=JB15_G, trae_pu=PU['roberto_matedecon'])
admin_empresa(cjb_g, EMP_GJ)

n = sorted(fijar(JBA, 2025) + [(f, t + '\n\n(Nota de la ficha de la carpeta julianbesteiro13-15.)') for f, t in fijar('julianbesteiro13-15', 2025)])
rellenar('jb15a', 'JULIAN BESTEIRO 15G', 'julianbesteiro15g', dict({'fecha_apertura': '2025-05-27',
    'origen_notas': 'Fecha de llegada: la ficha (subcarpeta "2. ascensor") dice 06/2025; la primera nota es del 27/05/2025 (HE enviada a Fabio con los distintos escenarios); se toma esa. '
                    'Contacta: Fabio Aceto, vecino (622 54 47 09; tuttook@yahoo.it). Tipo de obra: 4 PROPUESTAS DE ACCESIBILIDAD: proyecto de ejecucion del ascensor de la escalera G (la '
                    'propuesta menos invasiva de Rosersese, sin tapar ventanas; por el medio de la escalera o por el exterior con derribo completo), y precio para la escalera gemela L (con '
                    'sotano) y para las otras 11 escaleras de la mancomunidad; si se encarga el proyecto de la G, no se cobra el estudio pericial (la otra oportunidad de este portal). '
                    'Administracion: GESTORIA JIMENEZ (MLJP, SLP; +34 913 86 26 95 / +34 619 29 40 26). Carpeta julianbesteiro13-15 (jun-2025): presupuesto de Rosersese de la escalera G y de '
                    '12 ascensores, vistas 3D y los contactos Mikel (mikelruizc@gmail.com) y Fabio; es el mismo encargo. El encargado de controlar estos temas es Carlos. '
                    'En la ficha: comercial CARLOS GARCIA.' + CAPTO_CARLOS}, **trae(fabio_a)),
    ('ascensor',), n=n, oid_fijo=JB15G, captador=CARLOS, lleva=ALVARO)
if BESTEIRO_UNA_OPP:
    for acc in ACC_13_15:
        if not b.leer('relacion_oportunidad_accesos?select=acceso_id&opp_id=eq.%s&acceso_id=eq.%s' % (JB15G, acc)):
            ins('relacion_oportunidad_accesos', [{'opp_id': JB15G, 'acceso_id': acc,
                'de_donde': 'Julian Besteiro 13-15: la propuesta de 2025 para la mancomunidad es el mismo encargo que el ascensor de la escalera G (carpetas julianbesteiro15g y julianbesteiro13-15).'}])

cjp = cid_de('JULIO PALACIOS 2-4-6')
rellenar('jpal', 'JULIO PALACIOS 2-4-6', 'juliopalacios2-4-6', {'fecha_apertura': '2024-11-26',
    'origen_notas': 'Fecha de llegada: 11/2024 (dia: la primera nota, HE enviada sin CSS el 26/11/2024). Contacta: la CP y Carlos Pujol (SCHINDLER; carlos.pujol@schindler.com); antes ~~Javier '
                    'Rodriguez Martin (SCHINDLER)~~, tachado. Tipo de obra: ~~RENOVACION Y MEJORA DE ASCENSORES~~ (tachado) -> 2026, INFORME PERICIAL sobre las actuaciones por el cambio de los 17 '
                    'ascensores (adaptar las zonas comunes y los desembarcos a normativa; objetivo: llevarnos despues el proyecto y que la obra la haga Schindler). HE de la pericial recibida '
                    'firmada 23/01/2026; informe enviado 10/02/2026. Tecnico: Carlos Alberto. CP 28029. Administracion: AFJLINARES (administracion@afjlinares.com). Contacto: David Pascual, vecino '
                    '(+34 630 17 63 15; dpezama@seeddrillcapital.com). En la ficha, ALVARO en el hueco del comercial.'},
    ('pericial',), n=partir(fijar('juliopalacios2-4-6', 2024), 1, '23/01/2026', '2026-01-23'), comunidad={'iban': 'ES28 0081 4148 1200 0122 4532'},
    trae_pu=PU['pujol'], captador=ALVARO, lleva=ALVARO)
pc_unico(cjp, 'DAVID PASCUAL', 'vecino', '630176315', None, 'dpezama@seeddrillcapital.com', 'Vecino; persona de contacto de la comunidad.')

# ================================================================= 2. CLON
REVS = [
    ('jacintocamarero3', '2022-05-03', 'JOSE MANUEL REINA (FAIN)', None, None,
     'CALLE JACINTO CAMARERO 3 MADRID (en la ficha, "Calle JACINTO CAMARERO 6"). Fecha: 05/2022 (dia: la primera nota, 03/05/2022). Tipo de obra: ASCENSOR (derribo de escalera, escalera de uso '
     'restringido; en sep-2022, ascensor y salvaescaleras con Ignacio Bermejo, de Fain). Distrito 11 - Carabanchel (Opanel). En la carpeta solo esta la ficha.\n\n' + cl('jacintocamarero3', 2022)),
    ('jacobinia86', '2016-03-11', 'PEDRO ARANDA (THYSSEN)', None, None,
     'Calle JACOBINIA 86 MADRID (en la ficha, "JACOBINA 86"). Fecha: 03/2016 (la fecha de inicio de la ficha, 11/03/2016). Tipo de obra: ASCENSOR. CP 28047. Hay croquis, borrador de '
     'escalera, plano y presupuesto (mar-abr 2016). En la ficha: "' + bloque('jacobinia86', 81, 81) + '"'),
    ('jaimehermida20', '2017-03-30', 'JUAN LUIS (INVER)', None, '6368810VK4766G',
     'CALLE JAIME HERMIDA 20 MADRID. Fecha: 03/2017 (la fecha de inicio de la ficha, 30/03/2017; los primeros ficheros son del 03/05/2017). Tipo de obra: ASCENSOR: proyecto visado (jun-2017 a '
     'jun-2018), incidencias (nov-dic 2017 y ene-2019), subvencion (dic-2017); en nov-2022, "venia a Patricia Estevez"; en abr-2024, "solucion iberlean otro arquitecto". Distrito 20 - San Blas. '
     'CP 28037. Propiedad: Jesus Miguel Larriba Lopez-Montenegro (51686317G). NZ4; fachada 14 m; superficie 43,90 m2 (PEM 50.000 y residuos 300, los valores tipo de la ficha). Expediente '
     '117/2017/02178. Junta de San Blas-Canillejas (en la ficha "AV/ ARGENTALES 28"): negociado de licencias 91 588 80 35 / 91 588 80 28 / 91 588 80 30, lunes, miercoles y viernes de 9:00 '
     'a 10:30 sin cita; tecnico Juan Andres Sanchez, 91 588 80 14.'),
    ('jazmin16-18', '2022-12-02', 'RAUL (ELECNOR), con IBERDROLA', None, None,
     'CALLE JAZMIN 16-18 MADRID (en la ficha, "JAZMIN 18-20"; los ficheros de Iberdrola dicen 16-18). Fecha: 12/2022 (dia: la nota del 02/12/2022). Tipo de obra: SATE Y AEROTERMIA (IBERDROLA). '
     'Distrito Ciudad Lineal. CP 28033. Hay plano para mediciones, mediciones y la propuesta personalizada de Iberdrola (ene-feb 2023).\n\n' + cl('jazmin16-18', 2022)),
    ('jazmin30-32', '2022-12-02', 'RAUL (ELECNOR), con IBERDROLA', None, None,
     'CALLE JAZMIN 30-32 MADRID. Fecha: 12/2022 (dia: la nota del 02/12/2022). Tipo de obra: SATE Y AEROTERMIA (IBERDROLA). Distrito Ciudad Lineal. CP 28033. Hay mediciones y la propuesta '
     'personalizada de Iberdrola (ene-feb 2023).\n\n' + cl('jazmin30-32', 2022)),
    ('joseabascal16', '2017-05-16', 'LUIS MIGUEL NUNES (THYSSEN)', None, None,
     'Calle JOSE ABASCAL 16 MADRID. Fecha: 05/2017 (la fecha de inicio de la ficha, 16/05/2017). Tipo de obra: ASCENSOR (estimar el hueco resultante y la viabilidad; acceso por la puerta bajo '
     'la escalera; Nunes le habla de unos 120.000 EUR). Contacto de la comunidad: Alai Zarranz, arquitecta, "un tanto esceptica" (620 190 330). En la ficha, el correo de Luis Miguel Nunes '
     '(luis.nunes@thyssenkrupp.com) con el contacto. Hay croquis (may y sep 2017).'),
    ('josearconesgil100', '2024-12-20', 'CARLOS NAVARRO (FINCAS NAVARRO) + JAVIER PARRA (COINSA)', None, None,
     'JOSE ARCONES GIL 100 MADRID. Fecha: 12/2024 (dia: la primera nota, 20/12/2024). Tipo de obra: PLATAFORMA ELEVADORA (viabilidad de la plataforma vertical y del rebaje del escalon, '
     'partidas con mediciones, proyecto, DR y ayudas: zona APIRU); oferta llave en mano con COINSA (pry, df y css + subv). Paga la CP. Administracion: FINCAS NAVARRO (Carlos Navarro Olmeda; '
     'Avda. Brasilia 3, 6o A, 2a escalera, 28028; 660 513 717; administracion@fincasnavarro.es). Hay modelo 3D (ene-2025).\n\n' + cl('josearconesgil100', 2024)),
    ('josearconesgil106', '2023-10-06', 'ROBERTO (MATEDECON)', None, None,
     'JOSE ARCONES GIL 106 MADRID. Fecha: 10/2023 (dia: la nota del 06/10/2023). Tipo de obra: SATE Y NEXT GENERATION. Distrito Ciudad Lineal. CP 28017. Ano 1960.\n\n' + cl('josearconesgil106', 2023)),
    ('josearconesgil108', '2022-04-06', None, None, None,
     'JOSE ARCONES GIL 108 MADRID. Fecha: 04/2022 (dia: el de la ficha, 06/04/2022). La ficha no tiene mas datos ("Calle municipio"). Hay fotos enviadas por el cliente (19/04/2022) y un dwg.'),
    ('josefaalonso4', '2025-04-03', 'MAMEN (GRUPO TREBOL)', None, None,
     'JOSEFA ALONSO 4 MADRID. Fecha: la ficha dice 03/2025, pero la nota es del 03/04/2025 ("se ponen en contacto") y la referencia 04/2025; se toma esa. Tipo de obra: SATE. Distrito Latina. '
     'CP 28047. Administracion: GRUPO TREBOL (Mamen; trebol.fincas@gmail.com). Contacto: Francisco, 606 371 078.\n\n' + cl('josefaalonso4', 2025)),
    ('josenoriega9', '2018-03-23', 'ANDRES ENGWE', None, None,
     'C/ JOSE NORIEGA 9 MADRID. Fecha: 03/2018 (la fecha de inicio de la ficha, 23/03/2018). Ficha vacia; hay croquis, fotos, borrador de escalera y plano (mar-abr 2018).'),
    ('joseortegaygasset34', '2023-10-04', 'SERGIO GODINO (FAIN)', None, None,
     'JOSE ORTEGA Y GASSET 34 MADRID. Fecha: 10/2023 (dia: la primera nota, 04/10/2023). Tipo de obra: ELEVADOR VERTICAL (se cobra a Fain, sin CSS ni subvenciones; "proyecto complicado"). '
     'Distrito 04 - Salamanca (Castellana). CP 28006. Hay nube de puntos (oct-2023).\n\n' + cl('joseortegaygasset34', 2023)),
    ('joseortegaygasset86', '2024-11-28', 'EFFIC', None, None,
     'JOSE ORTEGA Y GASSET 86 MADRID. Fecha: 11/2024 (dia: la nota del 28/11/2024). Tipo de obra: BAJADA A COTA CERO. Distrito Salamanca. CP 28006. Administrador, segun EFFIC: Francisco Guerra. '
     'Hay una foto de la visita.\n\n' + cl('joseortegaygasset86', 2024)),
    ('joseortegaygasset94', '2016-12-14', 'LUIS MIGUEL NUNES (THYSSEN)', 'H79785440', '3158810VK4735G',
     'CALLE JOSE ORTEGA Y GASSET 94 MADRID. Fecha: 12/2016 (la fecha de inicio de la ficha, 14/12/2016; croquis y plano del 18/12/2016). Tipo de obra: ASCENSOR (5 paradas, embarque simple, '
     'cabina accesible 1200 x 1000, puertas automaticas de 800, hueco libre 1550 x 1550; presupuesto de obra 79.000 EUR; la presidenta pide coordinacion y tramitacion de subvencion). CP 28006. '
     'Comunidad: CDAD PROP CL JOSE ORTEGA Y GASSET 94 MADRID (CIF H79785440). Administracion: ANA CRISTINA SOTO (C/ Julian Camarillo 47 B211, 28037; 673 090 154 / 91 401 28 62; '
     'despachosys@yahoo.es y despachosys@gmail.com; contacto Yolanda, sep-2022) - no esta en la agenda. Presidenta: Cristina, 673 090 154. Subcontrata: SALA 4 (Javier Munoz) - no esta en la '
     'agenda. Fachada 12,50 m; superficie 76 m2. Visados TL/003709/2019, TL/022750/2019 y TL/004579/2024 (justificacion de obra). En la carpeta: licencia (2019-2021), incidencias (2019-2021, '
     'la cuarta, denegacion de la bonificacion del ICIO), obra con certificaciones (2022-2023), actas de obra hasta sep-2026, RAE (abr-2024), acta de entrega al cliente y certificados de '
     'instalaciones (sep-2026); subvenciones hasta sep-2026. Proyecto hecho y obra hecha o casi; no esta en produccion.'),
    ('juanboscan57', '2021-02-24', 'JUAN CARLOS CANDELAS (CANDELAS Y OVIEDO)', 'H79597449', '5956104VK4755F',
     'CALLE JUAN BOSCAN 57 MADRID. Fecha: la ficha no la trae; 02/2021 (dia: el primer fichero, la denegacion de la licencia del ascensor del proyecto de INVER, 24/02/2021); el grueso del trabajo '
     'es de jun-2021 (presupuesto de INVER firmado, proyecto, visado, subvencion y solicitud de licencia) y hay una nueva propuesta exterior (nov-2021). Tipo de obra: ASCENSOR. Distrito 15 - '
     'Ciudad Lineal (Pueblo Nuevo). CP 28017. Comunidad: CP JUAN BOSCAN 57 (CIF H79597449). Administrador: Juan Carlos Candelas (CANDELAS Y OVIEDO; jcandelas@candelasoviedo.es) - no esta en '
     'la agenda. PEM 106.434; residuos 300; superficie 77 m2 (planta baja 25,8; planta tipo 12,80 x 4). NZ 3.2.\n\n' + bloque('juanboscan57', 92, 94)),
    ('juanboscan74', '2023-01-30', 'OLIVARES', None, None,
     'JUAN BOSCAN 74 MADRID. Fecha: 01/2023 (dia: la nota del 30/01/2023). Tipo de obra: ASCENSOR. Distrito Ciudad Lineal. CP 28017. En la carpeta solo esta la ficha.\n\n' + cl('juanboscan74', 2023)),
    ('juandelrosal2', '2023-07-18', 'ISABEL HERRANZ DONOSO (CEJ - MINISTERIO DE JUSTICIA)', None, None,
     'JUAN DEL ROSAL 2 MADRID: Centro de Estudios Juridicos - Ministerio de Justicia (C/ Juan del Rosal 2, 28071). Fecha: 07/2023 (dia: la primera nota, 18/07/2023). Tipo de obra: REMODELACION '
     'DE ASCENSOR (pedir ofertas a Luis de la Iglesia y a Antonio Rodenas). Distrito Moncloa - Aravaca. CP 28040. Contacto: Isabel Herranz Donoso, secretaria general (en la ficha tambien '
     '"Directora general Isabel"; 91 455 16 90; Isabel.herranz@cej-mjusticia.es) - no esta en la agenda. En la carpeta solo esta la ficha.\n\n' + cl('juandelrosal2', 2023)),
    ('juanelo19', '2024-12-05', 'ISAAC PIZARROSO (GESTIN)', None, None,
     'JUANELO 19 MADRID. Fecha: 12/2024 (dia: la primera nota, 05/12/2024). Tipo de obra: 2 ASCENSORES + SUBV (escalera delantera protegida: ascensor en el ojo, unos 120.000 + IVA; escalera '
     'trasera: sustitucion de la escalera y ascensor, unos 190.000 + IVA). Distrito Centro. CP 28012. Administracion: GESTIN SAP (Isaac Pizarroso Arnao; C/ Alberto Aguilera 7, 1o izda., '
     '28015; 91 447 10 09; isaacpizarroso@gestin.es). Vecino arquitecto: Diego Martinez (654 011 005; diego_martinez_hernandez@hotmail.com). Hay fotos (ene-2025) y 3D.\n\n' + cl('juanelo19', 2024)),
    ('juanespañol32', '2016-02-04', 'FELIPE OSADO (ENOR)', 'H82316506', '9611707VK3791B',
     'CALLE JUAN ESPANOL 32 MADRID. Fecha: 02/2016 (la fecha de inicio de la ficha, 04/02/2016; los primeros ficheros son de mar-2016). Tipo de obra: ASCENSOR: croquis, oferta y ascensor de Enor '
     '(2016), proyecto visado (jun-2017), licencia (2017-2018), incidencias (2018), obra (2018-2019: problema de escalera, foso reducido, certificaciones) y DF visado (may-2024); "OBRA: La lleva '
     'MIGUEL VELERDA 629888126". Distrito 12 - Usera. CP 28026. Comunidad: CP JUAN ESPANOL 32 (CIF H82316506); presidente Antonio Garcia Burgos. NZ4; fachada 15,20; superficie 61,40 m2 '
     '(PEM 50.000 y residuos 300, los valores tipo de la ficha). Junta de Usera (C/ Rafael Ibarra 41): negociado de licencias 91 588 72 50, lunes, miercoles y viernes de 9 a 11; tecnico '
     'Nuria Valduque. Expediente 113/2017/02132.'),
    ('juanpradillo15', '2021-05-25', 'VICENTE (FAIN)', None, None,
     'C/ JUAN PRADILLO 15 MADRID. Fecha: 05/2021 (fotos del 25/05/2021; la ficha dice 09/06/2021). Ficha vacia; hay fotos y croquis (may-jun 2021).'),
    ('juantornero64', '2022-04-06', 'JAVIER PARRA (SCHINDLER)', None, None,
     'JUAN TORNERO 64 MADRID. Fecha: la ficha dice 06/2022, pero la nota es del 06/04/2022; se toma esa. Distrito Latina. CP 28011. Javier Parra manda por correo un croquis y fotos que no se '
     'encuentran. En la carpeta solo esta la ficha.\n\n' + cl('juantornero64', 2022))]
for carp, fecha, trajo, cif, ref, t in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV)
for carp, fecha, trajo, t in [
        ('jacintocamarero8', '2022-03-02', None, 'JACINTO CAMARERO 8 MADRID. Carpeta SIN ficha de datos: solo un calculo de apoyo del foso (pdf y dwg, 02/03/2022).'),
        ('jacobinia58', '2017-10-14', 'PEDRO ARANDA (THYSSEN)', 'Calle JACOBINIA 58 MADRID. Fecha: 10/2017. Distrito 11 - Carabanchel (Vista Alegre). Ficha vacia; hay croquis, plano y presupuesto (oct-2017).'),
        ('JERONIMO HISTORIAS rehabilitacion', '2017-09-07', None,
         'Carpeta "JERONIMO HISTORIAS rehabilitacion" SIN ficha de datos y sin direccion de comunidad: trabajos sueltos de 2017-2020 (mallorca: mediciones; piscina: visado voluntario y anexos '
         'de una piscina en Calle Arte 3; chalet: planos, fotos y presupuestos; canillas68: croquis y planos de Canillas 68, ene-mar 2018; "1 MODELO FOSO REDUCIDO", 2017-2020).'),
        ('jilguero6', '2021-02-24', 'INVER', 'JILGUERO 6 MADRID. Carpeta SIN ficha de datos: el paquete "46.-" de INVER (feb-2021: emails, presupuesto de Carver, proyecto visado y solicitud de licencia), '
         'la incidencia del proyecto (24/02/2021) y un escrito de aplazamiento de la DO al Ayto (03/03/2021).'),
        ('josefentanes89', '2016-06-15', 'LUIS MIGUEL NUNES (THYSSEN)', 'Calle JOSE FENTANES 89 MADRID. Fecha: 06/2016 (la fecha de inicio de la ficha, 15/06/2016). Ficha vacia; hay croquis, fotos, planos '
         'y presupuesto (2016-2018).'),
        ('josemaurelo29', '2016-02-09', 'FELIPE OSADO (ENOR)', 'Calle JOSE MAURELO 29 MADRID. Fecha: 02/2016 (la fecha de inicio de la ficha, 09/02/2016). Contacto: Ricardo, 686 720 114, '
         'montero-ricardo@hotmail.es. Ficha vacia; hay croquis, plano, ofertas de ascensor y valoracion (mar-2016).'),
        ('joseortegaygasset96', '2017-07-26', 'LUIS MIGUEL NUNES (THYSSEN)', 'Calle JOSE ORTEGA Y GASSET 96 MADRID. Fecha: 07/2017 (la fecha de inicio de la ficha, 26/07/2017). Ficha sin datos: '
         'solo la descripcion del ascensor, identica a la de Jose Ortega y Gasset 94; hay borrador de escalera, plano y oferta (jul-sep 2017; el croquis es el del 94).'),
        ('juandedios3', '2017-07-27', 'LUIS MIGUEL NUNES (THYSSEN)', 'C/ JUAN DE DIOS 3 MADRID. Fecha: 07/2017 (la fecha de inicio de la ficha, 27/07/2017). Ficha vacia; hay croquis y presupuesto (sep-2017).'),
        ('juanmontoya9', '2015-10-06', 'PEDRO ARANDA (THYSSEN)', 'Calle JUAN MONTOYA 9 MADRID. Fecha: 10/2015 (la fecha de inicio de la ficha, 6/10/15). Tipo de obra: ASCENSOR POR HUECO (baja + 5, '
         'parada simple, hueco 1240 x 1000, 6 paradas). Ficha sin mas datos; hay plano (oct-2015).'),
        ('juansalas28', '2016-01-30', 'PEDRO ARANDA (THYSSEN)', 'Calle JUAN SALAS 28 MADRID. Fecha: 01/2016 (la fecha de inicio de la ficha, 30/01/2016). Distrito 12 - Usera. NZ4. Ficha vacia; '
         'hay croquis, render y planos (2016-2017).'),
        ('juliamediavilla34', '2017-02-17', 'PEDRO ARANDA (THYSSEN)', 'Calle JULIA MEDIAVILLA 34 MADRID (en la ficha, "VALLECAS"). Fecha: 02/2017 (la fecha de inicio de la ficha, 17/02/2017). '
         'CP 28034. Referencia catastral de la ficha: 1820864VK4811H; fachada 13. Ficha sin mas datos; hay plano, presupuesto, croquis y render (feb-abr 2017).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, '1820864VK4811H' if carp == 'juliamediavilla34' else None, t)
# jardinillos15: NO lleva fila. Es una copia anterior de la carpeta de EL MOLAR (1APROVINCIA\ESTREMERA\EL MOLAR\jardinillos15), que ya esta en la clon como EL MOLAR.

# ================================================================= 3. MANIAS
mania('Requerimiento de la licencia que dice que se ha presentado mal (por licencia) sin indicar como hay que presentarlo; remite al informador urbanistico.',
      'Junta Municipal de Distrito de Ciudad Lineal', '2022-07-04', 'juanboscan57', cita=bloque('juanboscan57', 93, 93))

resumen()
