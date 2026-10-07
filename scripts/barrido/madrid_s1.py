# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda S1 (sabadell217 .. sanfidel65, carpetas [0:50] de la S). 7-oct-2026. Sin --escribir: marcha en seco.
# La S2 [50:100], la S3 [100:149] y la R las preparan otros agentes a la vez.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de, _lineas
from trocear2 import trocear2

PU.update(velasco='94b4d0ec-edd7-4038-a58f-0823b287fa8f', olga_jimeco='ef1332fc-cd83-4b25-9efd-ddca69691dd0', olivares='fe2ea8b4-9be7-42b8-b64f-d644fa8198b1',
          isaac='e5abf29a-a25f-4c87-8705-6dc523285e1f', carmen_dbb='99d79d86-6a38-43ed-949d-711e29fadbb5', aura_dbb='b65c97b7-94a9-415b-922c-061ed117c187',
          alvaro_dbb='b4ccdbfa-8bce-4800-888c-91ae82028f8f', vanesa_dbb='05cda534-6907-43b0-b674-53cbe143a278', sara_urvall='ebd8d599-0500-4531-8b52-d9d5fac27909',
          nunes='4e57181b-395a-455d-a67e-1bdeadbdb623', lezaun='5afee851-8a4a-4925-a737-fa806ac880de', icalonge='129a505b-a0b0-4b3e-8102-42197b237a98',
          silvia_arrialsi='6c8e1a7f-999b-4ee9-ac91-cfeb7075dd8c', ffernandez_aya='51ad5985-097a-4d5f-9108-f9fd0efe8a01')
MERINO = '4ab397d8-df4d-45c9-956a-10310ec69e47'      # empresa MERINO (administracion_fincas)
QUABIT = '2e8aa057-4376-462e-aabf-24a5b96a425d'      # contrata
PVALLECAS = 'df5e69f1-696b-4ae8-beba-63289e296c49'   # Junta Municipal de Distrito de Puente de Vallecas
FUENCARRAL = '44a6ed64-4f70-4319-9933-d942a0dd10e0'  # Junta Municipal de Distrito de Fuencarral-El Pardo


def cid_de(prefijo):
    cs = b.leer('comunidades?select=id&municipio=eq.MADRID&nombre=like.' + quote(prefijo) + '*'); assert len(cs) == 1, prefijo
    return cs[0]['id']


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto (telefono pegado al nombre, tachado dentro...)."""
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


def alta_admin(nombre, notas_, nombre_legal=None, email=None):
    """administracion de fincas nueva que lleva una comunidad de PRODUCCION (criterio de Monica, 7-oct-2026)."""
    ya = b.leer('empresa?select=id&nombre_accesalia=eq.' + quote(nombre))
    if ya: return ya[0]['id']
    i = nuevo_id()
    ins('empresa', [{'id': i, 'nombre_accesalia': nombre, 'nombre_legal': nombre_legal, 'tipo': 'administracion_fincas', 'activa': True, 'comercial_id': DANIEL, 'notas': notas_}])
    if email:
        ins('correo', [{'empresa_id': i, 'email': email, 'etiqueta': 'general', 'principal': True}])
    return i


def fila_muni(muni, carp, fecha, estado, cierre, trajo, cif, ref, texto, comercial='Daniel'):
    """como fila(), pero con el municipio oficial (la carpeta conserva su ruta en MADRID). Copiada de madrid_o.py."""
    if b.leer(T + '?select=id&municipio=eq.%s&carpeta=eq.%s' % (quote(muni), quote(carp))):
        print('clon ya escrita, se salta:', carp); return
    i = nuevo_id(); CLON[carp] = i
    ins(T, [{'id': i, 'comunidad_autonoma': 'COMUNIDAD DE MADRID', 'municipio': muni, 'carpeta': carp, 'ruta_dropbox': R(carp), 'tiene_tarjeta_cif': False, 'cif_en_la_ficha': cif,
             'ref_catastral_de_la_ficha': ref, 'comercial_interno': comercial, 'estado': estado, 'cierre_notas': cierre, 'fecha_apertura': fecha, 'trajo_persona': trajo, 'notas_de_la_ficha': texto}])


def bloque(c, i, j):
    """lineas i..j (incluidas) de la ficha, sin las vacias."""
    return '\n'.join(l for l in _lineas(c)[i:j + 1] if l.strip()).strip()


def tro(c, i, j, anio):
    """las lineas i..j de una ficha antigua (sin cabecera NOTAS), troceadas por fecha."""
    return trocear2(bloque(c, i, j), anio)


def fecha_a(n, i, f, motivo):
    g, t = n[i]; n[i] = (f, t + '\n\n(' + motivo + ')'); return n


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
cl = lambda c, a, s=None: J(fijar(c, a, s))

# ================================================================= 0. AGENDA
# Junta de Puente de Vallecas (ya existe): su Departamento Juridico y la adjunta que contesta por San Claudio 134 (2022).
DJ_PV = area(PVALLECAS, 'Departamento Jurídico', '91 588 73 75',
             'Avenida de la Albufera 42, 28038. En la ficha de San Claudio 134 (2021-2022): recursos de licencia de ascensor.')
if not ESCRIBIR or not b.leer('correo?select=id&email=eq.djuridicopvallecas@madrid.es'):
    ins('correo', [{'organismo_area_id': DJ_PV, 'email': 'djuridicopvallecas@madrid.es', 'etiqueta': 'general', 'principal': True}])
persona_nueva('María del Rosario', 'Teijeiro Trigo', 'adjunta al Departamento Jurídico', None, 'teijeirotmr@madrid.es', organismo=PVALLECAS, area=DJ_PV,
              notas_='Junta de Puente de Vallecas: contesta por el recurso del ascensor de San Claudio 134 (26/01/2022; carpeta sanclaudio134).')
# Junta de Fuencarral-El Pardo (ya existe): tecnico de la consulta urbanistica de San Dacio 2 (2018).
persona_nueva('Jorge', 'López', 'técnico', '915886855', 'lopezhjm@madrid.es', organismo=FUENCARRAL,
              notas_='Junta de Fuencarral-El Pardo: tecnico de la consulta urbanistica 108/2018/00004 de San Dacio 2 (carpeta sandacio2).')
# QUABIT (contrata que ya existe): Alberto Benito Ruiz, en la ficha de San Emilio 21 (jul-2024).
persona_nueva('Alberto', 'Benito Ruiz', None, '621620873', 'a.benito@quabitconstruccion.com', contrata=QUABIT,
              notas_='QUABIT: pasa San Emilio 21 para ver viabilidad de ascensor (11/07/2024; carpeta sanemilio21).')

# Administraciones nuevas de comunidades de PRODUCCION
SDLF = alta_admin('ADMINISTRACION SUSANA DE LA FUENTE', 'Alta en el barrido de Madrid (San Baldomero 9, administracion desde enero de 2024; carpeta sanbaldomero9). '
                  'Travesia de Jose Arcones Gil 3, 28017 Madrid. Horario telefonico de 9h a 16h.')
SUSANA = persona_nueva('Susana', 'de la Fuente', 'administradora', '680838367', 'administracion@sdelafuente.es', empresa=SDLF,
                       notas_='Administracion Susana de la Fuente: San Baldomero 9 (desde ene-2024; carpeta sanbaldomero9). Telefono y WhatsApp.')
GESYVEN = alta_admin('GESYVEN', 'Alta en el barrido de Madrid (Sambara 146; carpeta sambara146). En la ficha, "Gestion y venta"; contacto "DAVID NURIA O VANESA", 674 094 909. '
                     'En la ficha de Portugalete 27 (2021): GESYVEN SERVICIOS INTEGRALES SL, c/ Alcala 401, portal 2, 1o A, 28027.',
                     nombre_legal='GESYVEN SERVICIOS INTEGRALES SL', email='gestionyventa@gesyven.com')

# ================================================================= 1. PRODUCCION (22 carpetas, 22 oportunidades)
csb = cid_de('SABADELL 217')
rellenar('sb217', 'SABADELL 217', 'sabadell217', {'fecha_apertura': '2025-12-01', 'referencia_catastral': '1027102VK4812G',
    'origen_notas': 'Fecha de llegada: 12/2025 (dia: la nota de Carlos Garcia y la ficha, 01/12/2025). Tipo de obra: ASCENSOR. CP 28034. Presidenta: Lara (652 816 337). '
                    'La ficha no dice quien contacta. En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), n=fijar('sabadell217', 2025), presi=('LARA', 'presidente', '652816337'), captador=CARLOS, lleva=ALVARO)

csh = cid_de('SAHARA 83')
arreglar_pc(csh, 'rol=eq.presidente', {'nombre': 'MARIA DEL MAR GOMEZ MARCOS', 'documento': '02217779G',
                                       'notas': 'En la ficha, tachado: Mariano Rojo Rojo (02211618F; 622 758 877), presidente anterior.'})
rellenar('sh83', 'SAHARA 83', 'sahara83', {'fecha_apertura': '2023-01-09', 'referencia_catastral': '1375523VK4617E',
    'origen_notas': 'Fecha de llegada: 01/2023 (dia: el escaneo FARO, 09/01/2023; los ficheros de dic-2022 son plantillas del CEE). Empresa/cliente: ELECNOR; contacto Javier Velasco '
                    '(antes, tachado, Ibai Calonge). Tipo de obra: 2 ASCENSORES + SUBVENCIONES. Barrio: Los Rosales. Tecnico: Javier -> Fernan -> Jhonatan. Jefe de obra: Jose Antonio '
                    'Marti Almansa (ELECNOR; jamarti@elecnor.es; 676 18 16 61). Ano 1970. Inicio de obra: 17-02-2025. Administracion: MARTIN Y LORENTE (pedidos docs 17/04; Marisa, '
                    '622 788 958, marisavalero@martinylorente.es; marcos@martinylorente.es); "Pedido presup a Javier Velasco 23/05/2023". Comunidad: CDAD PROP CL SAHARA 83 MADRID '
                    '(CIF H79596169; CL Sahara 83, 28041, esc. izda. 1o 3). Presidenta: Maria del Mar Gomez Marcos (02217779G); antes, tachado, Mariano Rojo Rojo (02211618F; 622 758 877). '
                    'PEM 222.370,70. NZ 3.1.a. Superficie 121,46. En la carpeta, obra y fin de obra (2025) y subvenciones CAM 2025 (concedida), Ayto 2025 y Rehabilita 2026. '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=fijar('sahara83', 2023), trae_pu=PU['velasco'])

rellenar('sb6', 'SALAS DE BARBADILLO 6', 'salasdebarbadillo6', {'fecha_apertura': '2025-12-29',
    'origen_notas': 'Fecha de llegada: 12/2025 (dia: los ficheros de la carpeta, 29/12/2025: "Wetransfer caducado. Deben enviarlo nuevamente"). Contacta: Olga (JIMECO; 611 383 164; '
                    'administracion@jimeco.es). La ficha no dice tipo de obra ni tiene notas. En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    (), adm=PU['olga_jimeco'], trae_pu=PU['olga_jimeco'], captador=CARLOS, lleva=ALVARO)

csa = cid_de('SAMBARA 146')
arreglar_pc(csa, 'rol=eq.presidente', {'nombre': 'FERNANDO', 'telefono': '635888707',
                                       'notas': 'En la ficha, "Fernando 635 888 707" en la casilla del presidente; y "FERNANDO VECINO 635888707" en quien contacta.'})
ana = pc_unico(csa, 'ANA VALERO', 'vecino', '619480949', None, 'joseluis.vera@gmail.com',
               'Vecina que contacta con Daniel en la reunion de Pablo Serrano 9 (oct-2025). En la ficha: "joseluis.vera@gmail.com (ese es l correo bueno)"; tachado: fsvc@telefonica.net.')
rellenar('sa146', 'SAMBARA 146', 'sambara146', dict({'fecha_apertura': '2025-09-01', 'referencia_catastral': '5767401VK4756H',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia desconocido; la primera nota es del 02/10/2025 y el 3D del 07/10/2025). Contacta: Ana Valero, vecina (619 480 949; '
                    'joseluis.vera@gmail.com, "ese es el correo bueno"), que contacta con Daniel en la reunion de Pablo Serrano 9; tambien Fernando, vecino (635 888 707). Tipo de obra: '
                    '2 ASCENSORES Y PLATAFORMA VERTICAL (escalera a-b y c-d con derribo completo; plataforma en la entrada del portal). Administracion: GESYVEN ("Gestion y venta"; '
                    'David, Nuria o Vanesa; 674 094 909; gestionyventa@gesyven.com; administracion nueva, dada de alta en el barrido). HE enviada 09/10/2025. '
                    'En la ficha: comercial interno ALVARO ("21-05-26 En manos de Alvaro"): la capta y la lleva Alvaro (manda la ficha); la vecina contacto con Daniel en la reunion.'}, **trae(ana)),
    ('ascensor', 'plataforma', 'subvenciones'), n=fijar('sambara146', 2025), captador=ALVARO, lleva=ALVARO)
admin_empresa(csa, GESYVEN)

# --- San Baldomero 9 (ficha antigua, sin cabecera de notas)
SBA = 'sanbaldomero9'
nbal = [('2023-09-10', bloque(SBA, 174, 200) + '\n\n(Correo de Manuel Chercoles Perez del 10/09/2023, reenviado por Daniel el 11/09/2023.)'),
        ('2023-10-06', bloque(SBA, 149, 170) + '\n\n(Correos de Daniel y de Subvenciones Accesalia del 6 de octubre de 2023.)'),
        ('2023-10-09', bloque(SBA, 132, 148) + '\n\n(Reenvio de Daniel del 9 de octubre de 2023.)'),
        ('2024-04-01', bloque(SBA, 212, 212) + '\n\n(dia desconocido)'),
        ('2026-10-02', bloque(SBA, 220, 220))]
rellenar('bal9', 'SAN BALDOMERO 9', SBA, {'fecha_apertura': '2021-05-10', 'referencia_catastral': '6151921VK4765A',
    'origen_notas': 'Fecha de llegada: 10/05/2021 (la fecha de inicio de la ficha; los primeros ficheros son del 11/05/2021). "Este proyecto lo encarga directamente el administrador": '
                    'agente comercial, tachado, Juan Carlos Candelas (CANDELAS & OVIEDO), "ya no es juan Carlos candelas (19/04/22)". Mediador: OLIVARES (ROSERSESE); antes, tachado, '
                    'Jose Manuel Vidal de Torres Ruiz (ELECNOR), "ya no esta julio 2022; pasa a Ibai"; tachado tambien "EL CONTRATISTA ES ELECNOR". Tipo de obra: INSTALACION DE ASCENSOR. '
                    'Administracion: desde enero de 2024, ADMINISTRACION SUSANA DE LA FUENTE (Travesia de Jose Arcones Gil 3, 28017; 680 83 83 67, telefono y WhatsApp, de 9h a 16h; '
                    'administracion@sdelafuente.es; administracion nueva, dada de alta en el barrido); antes, tachadas, CANDELAS & OVIEDO (Juan Carlos Candelas Torres) y, en enero '
                    'de 2023, MANDATARIA (Emili; J. Javier Garcia Nunez-Garcia). Comunidad: CDAD. PROP SAN BALDOMERO 9 (CIF H79846077). Ano 1960. 10 viviendas. Presidente: Pedro '
                    'Martinez Moreno (02651627A). Comision de obras (sep-2023): Manuel Chercoles Perez (636 874 457; manuel.chercoles@gmail.com). Fachada 61 m2. PEM 135.420,89. '
                    'Expediente 116/2021/03149 (Ciudad Lineal). COAM TL/010720/2021 y TL/015064/2026 (CFO). Tecnico: Dennis. Tecnico municipal: Laura Barrionuevo (91 588 75 13). '
                    'La obra se inicia en abril de 2024 con Rosersese. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=nbal,
    subvencion=[('2022-08-19', bloque(SBA, 216, 219) + '\n\n(Sin fecha; se pone la de la solicitud del Rehabilita 2022 en la carpeta, 19/08/2022; la concesion es posterior.)')],
    comunidad={'cif_comunidad': 'H79846077', 'iban': 'ES51 0081 0134 9200 0157 4061'},
    presi=('PEDRO MARTÍNEZ MORENO', 'presidente', None, '02651627A'), adm=SUSANA, trae_pu=PU['olivares'])
pc_unico(OPP['bal9'][0]['id'], 'MANUEL CHÉRCOLES PÉREZ', 'vecino', '636874457', None, 'manuel.chercoles@gmail.com',
         'En la ficha: "presidente o vecino de la comision de obras en septiembre 2023".')

cbs = cid_de('SAN BASILIO 9')
arreglar_pc(cbs, 'rol=eq.presidente', {'nombre': 'MARIA ESTHER CARREGAL OROIS', 'telefono': '666249710',
                                       'notas': 'En la ficha, tachado: Miguel (670 261 650), "Miguel presidente" (anterior).'})
rellenar('bs9', 'SAN BASILIO 9', 'sanbasilio9', {'fecha_apertura': '2024-10-07', 'referencia_catastral': '0004413VK4700C',
    'origen_notas': 'Fecha de llegada: 10/2024 (dia: la primera nota, 07/10/2024, HE enviada). Paga: la CP. Contacta: Javier Rodriguez Martin (SCHINDLER; 685 286 041; '
                    'javier.rodriguez.martin@schindler.com); "Cuidado Schindler no va a hacer la obra" (les interesa vender el ascensor). Tipo de obra: ASCENSOR Y SUBV (por patio, '
                    'invadiendo garaje y modificando el primer tramo de escalera); HE de proyecto con DF, sin CSS, y subvenciones. Tecnico: Jhonatan. '
                    'Fecha encargo: 13/05/2025 (HE firmadas). Ano 1966. Contrata elegida: TOPLEVEL / SAACO BROTHER S.L. Administracion: JAGRA FINCAS (Jose Antonio; 645 77 36 72; '
                    'info@jagra-fincas.es; jgonzalez@jagrafincas.es), actualizado a 28/05/2025; antes, tachada, GRUPO EUROLINOVA (Miguel Megias; C/ Felipe Castro 4, 28026; '
                    '91 500 21 69; miguel@grupoeurolinova.com), despedida por la comunidad el 27/05/2025. Comunidad: CDAD PROP CL SAN BASILIO 9 MADRID (CIF H79549408: "Cuidado nos '
                    'mandaron mal el dato del CIF al principio del proyecto"). Presidenta: Maria Esther Carregal Orois (00687658G; 666 249 710); antes, tachado, Miguel (670 261 650). '
                    'Cuenta: ES80 0081 5274 0700 0156 1264 (la anterior, tachada). PEM 92.677,63. Visado TL/019096/2025. Superficie 38,82 m2. DR registrada por la ECU (ACTECU). '
                    'En la ficha: "COMERCIAL INTERNO: pasa a CARLOS G (17/10/2025)"; Carlos se va en feb-2026: la capto Daniel y la lleva Alvaro.'},
    ('ascensor', 'df', 'subvenciones'),
    n=fijar('sanbasilio9', 2024, ('2024-10-07', 'Sin fecha delante; la descripcion de la solucion que va con la HE enviada el 07/10/2024.')),
    comunidad={'cif_comunidad': 'H79549408', 'iban': 'ES80 0081 5274 0700 0156 1264'}, trae_pu=PU['jrodriguez'], captador=DANIEL, lleva=ALVARO)

rellenar('sbz14', 'SANCHEZ BARCAIZTEGUI 14', 'sanchezbarcaiztegui14', {'fecha_apertura': '2026-04-22', 'referencia_catastral': '2829612VK4722H',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: el escaneo 3D, 22/04/2026). Contacta: Aura (DEL BRIO Y BLANCO; aura@delbrioyblanco.es). La ficha no dice tipo de obra. '
                    'HE enviada 27/04/2026. Comercial interno: ALVARO.'},
    (), n=fijar('sanchezbarcaiztegui14', 2026, ('2026-04-27', 'La fecha va dentro de la nota.')), adm=PU['aura_dbb'], trae_pu=PU['aura_dbb'], captador=ALVARO, lleva=ALVARO)

csp = cid_de('SANCHEZ PRECIADO 40')
diego = pc_unico(csp, 'DIEGO', 'vecino', '628422064', None, None,
                 'Persona de contacto de la comunidad (ficha, 2025). En el correo del administrador (03/11/2025): "el telefono de contacto del presidente, Diego".')
rellenar('sp40', 'SANCHEZ PRECIADO 40', 'sanchezpreciado40', {'fecha_apertura': '2025-11-03', 'referencia_catastral': '9993230VK3799D',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia: el correo de Isaac Pizarroso, 03/11/2025). Contacta: Isaac Pizarroso Arnao (GESTIN SAP; C/ Alberto Aguilera 7, 1o izda., 28015; '
                    '91 447 10 09; isaacpizarroso@gestin.es). Paga: la CDAD. Tipo de obra: SATE + SUBV (aislamiento termico de toda la envolvente; HE con indicaciones de Daniel para CAES). '
                    'Barrio: Valdezarza. Tecnico: Jhonatan. Fecha encargo: 18/12/2025 (HE firmada 19/12/2025). Ano 1950. ECU (ACTECU), DR. Comunidad: CDAD PROP CL SANCHEZ PRECIADO 40 DE '
                    'MADRID (CIF H82570219). Presidenta: Maria Carmen Herrero Alonso (05232007J; bajo 6; 677 386 111). Contacto: Diego (628 422 064). Superficie 532,01. '
                    'Comercial interno: DANIEL.'},
    ('sate', 'subvenciones', 'caes'),
    n=fijar('sanchezpreciado40', 2025, ('2025-11-03', 'Correo de Isaac Pizarroso (Gestin) del 3 de noviembre de 2025.')), comunidad={'iban': 'ES27 2100 3302 1313 0062 6761'},
    presi=('MARIA CARMEN HERRERO ALONSO', 'presidente', '677386111'), trae_pu=PU['isaac'])

csc117 = cid_de('SAN CLAUDIO 117')
arreglar_pc(csc117, 'rol=eq.presidente', {'notas': 'Dos correos en la ficha: antonioyerpessanchez@gmail.com y antonioyerpess@yahoo.es.'})
rellenar('sc117', 'SAN CLAUDIO 117', 'sanclaudio117', {'fecha_apertura': '2025-09-12', 'referencia_catastral': '6013404VK4761C',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia: el correo de Carmen, 12/09/2025; los ficheros de 2022-2024 de la carpeta son plantillas). Contacta: Carmen Garcia (DEL BRIO Y BLANCO; '
                    '91 477 41 91 y 91 478 69 11; carmen@delbrioyblanco.es), que pide que Daniel vaya a la junta del 07/10/2025. Tipo de obra: SATE + SUBV CON CAES ("Proyecto de '
                    'Rehabilitacion de la Envolvente Termica"). Tecnico: Jacob. Fecha encargo: 09/02/2026 (HE firmada). Ano 1970. ECU (ACTECU). Comunidad: CDAD PROP CL SAN CLAUDIO N 117 '
                    'MADRID (CIF H79583050). Presidente: Antonio Yerpes Sanchez (51880213X; 685 916 705; antonioyerpessanchez@gmail.com y antonioyerpess@yahoo.es). Superficie 60,98. '
                    'Comercial interno: DANIEL.'},
    ('sate', 'subvenciones', 'caes'),
    n=fijar('sanclaudio117', 2025, ('2025-09-12', 'Correo de Carmen (Del Brio y Blanco) del 12 de septiembre de 2025.')), comunidad={'iban': 'ES77 2100 3384 9613 0091 0537'},
    presi=('ANTONIO YERPES SANCHEZ', 'presidente', '685916705', None, 'antonioyerpessanchez@gmail.com'), trae_pu=PU['carmen_dbb'])

# --- San Claudio 134 (ficha antigua, sin cabecera de notas)
SC134 = 'sanclaudio134'
n134 = tro(SC134, 84, 136, 2021)
n134 = fecha_a(n134, 0, '2021-11-15', 'Sin fecha delante; lo anterior al 15-11-2021: el proyecto denegado y el recurso presentado en abril de 2021 (expediente 114/2021/4607).')
n134 = partir(n134, 1, '---------- Forwarded', '2022-01-26')
n134 = partir(n134, 4, '19/02/22', '2022-02-19')
f5, t5 = n134[7]; n134[7] = (f5, t5[:t5.index('Felix')].strip())   # lo de despues ("Felix Urena Bolanos / COAM / TL/017180/2024 (CFO)") son datos: van arriba
n134 = partir(n134, 7, 'Noviembre 2022', '2022-11-01')
n134[8] = (n134[8][0], n134[8][1] + '\n\n(dia desconocido)')
rellenar('sc134', 'SAN CLAUDIO 134', SC134, {'fecha_apertura': '2019-07-15', 'referencia_catastral': '5713102VK4751D',
    'origen_notas': 'Fecha de llegada: la ficha no la trae; 07/2019 (dia: los primeros ficheros, 15/07/2019: acta de cargos y aprobacion del ascensor, DNI del presidente y tarjeta '
                    'fiscal). Agente comercial: URVALL (Sara; en la ficha tambien "Felix Urena Bolanos", el jefe de Urvall; en la agenda, "CUIDADO ESTOS NO"). Tipo de obra: INSTALACION '
                    'DE ASCENSOR. Comunidad: CDAD PROP SAN CLAUDIO 134 MADRID (CIF H79841821). CP 28038. Licencia 114/2019/04537 (denegada; recurso 114/2021/4607); Departamento Juridico '
                    'de la Junta de Puente de Vallecas (Av. de la Albufera 42; djuridicopvallecas@madrid.es; 91 588 73 75); tecnica Marta Aragon (91 588 73 80; aragonsm@madrid.es). '
                    'Aprobada en nov-2022; ICIO sobre el presupuesto actualizado de julio de 2022 (138.900 + IVA; PEM 116.722,69). COAM TL/017180/2024 (CFO). '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor',), n=n134, comunidad={'cif_comunidad': 'H79841821'}, trae_pu=PU['sara_urvall'])

rellenar('sc36', 'SAN CLAUDIO 36', 'sanclaudio36', {'fecha_apertura': '2019-09-10', 'referencia_catastral': '5614806VK4751D',
    'origen_notas': 'Fecha de llegada: 10/09/2019 (la fecha de inicio de la ficha; los primeros ficheros son del 18/09/2019: actas de aprobacion del ascensor y CIF). Agente comercial: '
                    'Jose Olivares (ROSERSESE). Tipo de obra: INSTALACION DE ASCENSOR. En la casilla de la administracion solo "685816702" y "PERSONA DE CONTACTO: Pablo Marmol" (asi en la '
                    'ficha). Comunidad: CDAD DE PROP SAN CLAUDIO 36 MADRID (CIF H79874772). CP 28038. PEM 79.180,67. Tecnica municipal: Marta Aragon. Expedientes 114/2021/02195 (tala) y '
                    '114/2020/02905 (ascensor). COAM TL/014147/2024 (CFO). Tecnico: Dennis. La ficha no tiene notas ni comercial interno; la lleva Daniel.'},
    ('ascensor',), comunidad={'cif_comunidad': 'H79874772'}, trae_pu=PU['olivares'])

rellenar('sc51', 'SAN CLAUDIO 51', 'sanclaudio51', {'fecha_apertura': '2026-04-28', 'referencia_catastral': '5715702VK4751F',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: la ficha, 28/04/2026, el unico fichero; HE enviada ese dia). Contacta: Alvaro (DEL BRIO Y BLANCO; alvaro@delbrioyblanco.es). '
                    'Tipo de obra: IEE. Comercial interno: ALVARO.'},
    ('iee',), n=fijar('sanclaudio51', 2026, ('2026-04-28', 'La fecha va dentro de la nota.')), adm=PU['alvaro_dbb'], trae_pu=PU['alvaro_dbb'], captador=ALVARO, lleva=ALVARO)

rellenar('sc55', 'SAN CLAUDIO 55', 'sanclaudio55', {'fecha_apertura': '2024-12-03', 'referencia_catastral': '5814901VK4751D',
    'origen_notas': 'Fecha de llegada: 12/2024 (dia: la primera nota, 03/12/2024). Contacta: Vanesa (DEL BRIO Y BLANCO; vanesa@delbrioyblanco.es). Tipo de obra: ASCENSOR POR TERRAZAS '
                    '(por fachada, ocupando parte de las terrazas de las viviendas de la letra D); HE de proyecto + subvenciones enviada 10/12/2024. CP 28038. Comercial: ALVARO.'},
    ('ascensor', 'subvenciones'), n=fijar('sanclaudio55', 2024), adm=PU['vanesa_dbb'], trae_pu=PU['vanesa_dbb'], captador=ALVARO, lleva=ALVARO)

csc99 = cid_de('SAN CLAUDIO 99')
arreglar_pc(csc99, 'rol=eq.presidente', {'notas': 'En la ficha: "Poner en copia de todos los correos al presidente".'})
rellenar('sc99', 'SAN CLAUDIO 99', 'sanclaudio99', {'fecha_apertura': '2026-04-29', 'referencia_catastral': '5913203VK4751D',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: el correo de Rosa con el presupuesto aceptado y el CIF, 29/04/2026; los editables de subvenciones de abr-2026 y el xlsx de 2025 son '
                    'plantillas). Empresa/cliente: ROSERSESE (Rosa Radal Sese; 960 230 178; rosersese@hotmail.com): la HE del proyecto se la pasamos a Rosersese y la de subvenciones a la '
                    'comunidad. Tipo de obra: ASC + SUBV. Barrio: Palomeras Sureste. Tecnico: Angela. Fecha encargo: 14/05/2026 (HE de proyecto firmada; la de subvenciones el 13/05 y, '
                    'completa, el 03/06/2026). LICENCIA por el AYUNTAMIENTO (ACTECU no actua en suelo publico: modelo de ascensor en suelo publico, NZ 3.2). Administracion: BLAS JAENES '
                    'ASESORES (Albufera 279, local 3, 28038; Esther Nunez; 913 802 366; esther.abogados@bjaenes.es). Comunidad: CDAD PROP CL SAN CLAUDIO N 99 (CIF H79962890). '
                    'Presidente: Jose Miguel Funez Lacon (51923764E; 663 336 199; funez1331@gmail.com): "Poner en copia de todos los correos al presidente". PEM 139.265,28. '
                    'Visado TL/013627/2026. Superficie 81,04. Comercial interno: DANIEL.'},
    ('ascensor', 'subvenciones'),
    n=partir(fijar('sanclaudio99', 2026, ('2026-04-29', 'Correo de Rosa (Rosersese) del 29 de abril de 2026.')), 3, '03-06-26', '2026-06-03'),
    comunidad={'iban': 'ES32 2085 9978 8803 3045 4735'}, presi=('JOSÉ MIGUEL FUNEZ LACÓN', 'presidente', '663336199', None, 'funez1331@gmail.com'), trae_pu=PU['rosa'])

# --- San Dacio 2 (ficha antigua de 2016, sin cabecera de notas; el mismo encargo sigue hasta 2026)
SD2 = 'sandacio2'
nd2 = tro(SD2, 110, 139, 2022)
nd2 = fecha_a(nd2, 0, '2022-02-03', 'Sin fecha delante; empieza por el requerimiento del 03/02/22.')
nd2 = partir(nd2, 2, '18/03/22', '2022-03-18')
nd2 = partir(nd2, 15, 'Visado 20/04/2023', '2023-04-20')
nm = tro(SD2, 140, 203, 2026)
nm = fecha_a(nm, 0, '2026-04-29', 'Correos de Alejandra Perez (Oficina Accesalia) y de Luis Miguel Nunes (TKE) del 29 de abril de 2026.')
nm = partir(nm, 0, '---------- Forwarded message', '2026-05-08', vez=3)
nd2 = sorted(nd2 + nm, key=lambda x: x[0])
rellenar('sd2', 'SAN DACIO 2', SD2, {'fecha_apertura': '2016-12-19', 'referencia_catastral': '1820864VK4811H',
    'origen_notas': 'Fecha de llegada: 19/12/2016 (la fecha de inicio de la ficha; los primeros ficheros son del 20/12/2016). Agente comercial: Luis Miguel Nunes (THYSSEN / TKE; '
                    'luis.nunes@tkelevator.com): el cliente es TKE, que contrata el proyecto. Tipo de obra: la ficha no lo dice (ascensor). Administracion: AYA ADMINISTRACIONES '
                    '(C/ Virgen de Aranzazu 35, local, 28034; 917 292 867; Fernando Fernandez; info@ayaadministraciones.es; cari@ayaadministraciones.es, feb-2022). Comunidad: CP SAN '
                    'DACIO 2 (CIF E78980562; letra E: comunidad de bienes). CP 28034. Fachada 11. PEM 67.647,06 (residuos 300). Junta de Fuencarral-El Pardo: negociado de licencias '
                    '91 588 24 15, con cita previa (Av. Monforte de Lemos 40; lunes y miercoles de 9 a 11); consulta urbanistica 108/2018/00004 (aprobada), tecnico Jorge Lopez '
                    '(91 588 68 55; lopezhjm@madrid.es); licencia 108/2021/4628, tecnica Belen Nunez; Medio Ambiente y Escena Urbana 915 886 854 (Antonio Navas), tecnifuencarral@madrid.es; '
                    'en oct-2022, Socorro Sanz. Licencia por la ECU (ACTECU; expediente EXPACT22017R), 28/11/2022. Visado TL/006642/2023. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor',), n=nd2, comunidad={'cif_comunidad': 'E78980562'}, adm=PU['ffernandez_aya'], trae_pu=PU['nunes'],
    huecos=['[REVISAR EN FACTURACION] Proyecto hecho (visado TL/006642/2023; licencia por la ECU). En abr-2026 la comunidad quiere hacer la obra con otra empresa y pide el proyecto; '
            'TKE (el cliente) pide no entregarlo. Quedan pendientes 1.000 EUR + IVA, previstos a fin de obra. Cancelar la obra no es cancelar la oportunidad (Monica, 7-oct-2026).'])

csd36 = cid_de('SAN DACIO 36')
arreglar_pc(csd36, 'rol=eq.presidente', {'telefono': '616552056', 'notas': 'En la ficha: "616 552 056 / hijo: davidparracabaceira@gmail.com".'})
rellenar('sd36', 'SAN DACIO 36', 'sandacio36', {'fecha_apertura': '2023-03-22', 'referencia_catastral': '1820882VK4812B',
    'origen_notas': 'Fecha de llegada: 03/2023 (dia: la visita de toma de datos, 22/03/2023; los escritos de nov-2022 a feb-2023 de la carpeta son plantillas). Empresa/cliente: ENVOLTERMIA '
                    '(910 054 135; info@envoltermia.com; Carlos Lezaun, 657 596 500, clezaun@envoltermia.com; Marilo Fraile, mfraile@envoltermia.com), que es tambien la constructora '
                    '(ENVOLTERMIA S.L., B02931558; Avda. de la Industria 4, edif. 2, esc. 2, 1o C, 28108 Alcobendas). Tipo de obra: ENVOLVENTE TERMICA + NEXT GENERATION. Barrio: Valverde. '
                    'Tecnico: Susana. Ano 1960. Administracion: AYA (Borja / Fernando Fernandez; 917 292 867; borja@ayaadministraciones.es; info@ayaadministraciones.es). Comunidad: CDAD PROP '
                    'CL SAN DACIO 36 MADRID (CIF H79542312). Presidenta: Maria Jose Cabaceira Feijao (01673554M; 616 552 056; hijo: davidparracabaceira@gmail.com). PEM 60.965,87. Visado '
                    'TL/007039/2023. Expediente 350/2023/14175 - 2024/0050088 (declaracion responsable). NZ 3.1.a. Zona APIRU. Superficie 137,05. En la carpeta, la obra terminada '
                    '(CFO de otro arquitecto, jul-2025) y la subvencion CAM NG 2022 concedida, en justificacion (2025-2026). La ficha no tiene notas ni comercial interno; la lleva Daniel.'},
    ('sate', 'subvenciones'), trae_pu=PU['lezaun'])

csl19 = cid_de('SANDALIO LOPEZ 19')
arreglar_pc(csl19, 'rol=eq.presidente', {'email': 'ESTEFI_SOUTO@hotmail.es', 'notas': 'Dos correos en la ficha: ESTEFI_SOUTO@hotmail.es y estefisouto@gmail.com.'})
rellenar('sl19', 'SANDALIO LOPEZ 19', 'sandaliolopez19', {'fecha_apertura': '2023-01-26', 'referencia_catastral': '1528362VK4812H',
    'origen_notas': 'Fecha de llegada: 01/2023 (dia: los correos con Ibai Calonge, 26/01/2023; los ficheros de 2022 de la carpeta son plantillas). Empresa/cliente: ELECNOR (Ibai Calonge; '
                    'en la ficha "IBAI CALONGE - IZAN"; Daniel Navarro Fernandez en copia). Tipo de obra: SOLO FACHADA LATERAL ("la fachada que tiene unos pajaros pintados"; SATE lateral). '
                    'HE firmada por Elecnor el 02/02/2023. Barrio: Valverde. Tecnico: Jonatan. Jefe de obra: Izan Fernandez. Ano 1970. Administracion: QUEVARU ASOCIADOS S.L. (C/ Anastasia '
                    'Lopez 1, local, 28034; David de Tapia, pedidos docs 01/03/2023; 91 734 82 04; quevaru@gmail.com). Comunidad: CDAD PROP CL SANDALIO LOPEZ 19 MADRID (CIF H80337090). '
                    'Presidenta: Estefania Souto Gonzalez (33548474F; ESTEFI_SOUTO@hotmail.es y estefisouto@gmail.com). PEM 14.061,81. Visados TL/006911/2023 y TL/008038/2024. Expediente '
                    '350/2023/16010 (declaracion responsable). Zona APIRU. Superficie 5,08. La ficha no dice comercial interno; la lleva Daniel.'},
    ('sate_fachada',), n=fijar('sandaliolopez19', 2023, ('2023-01-26', 'Correos de Gerencia Accesalia e Ibai Calonge (Elecnor) del 26 de enero de 2023.')),
    trae_pu=PU['icalonge'])

rellenar('sdm4', 'SAN DAMASO 4', 'sandamaso4', {'fecha_apertura': '2025-06-10', 'referencia_catastral': '8628613VK3782H',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: la primera nota y la foto, 10/06/2025). Paga: la CP. Contacta: Silvia Arribas, la administradora (ARRIALSI; Camino de Ganapanes 35, '
                    'local AF, 28035; 917 307 033 / 665 805 356; info@arrialsi.com). Tipo de obra: ASCENSOR CON DERRIBO SALIDA A EXTERIOR + CSS + SUBV; la HE (18/06/2025) supedita el '
                    'contrato a una consulta previa sobre el ascensor interior. Barrio: San Isidro. Tecnico: Jhonatan (antes, tachado, Julio). Fecha encargo: 30/06/2025 (HE firmada); '
                    'subvenciones contratadas el mismo dia ("infinitas"). Ano 1960. ECU (ACTECU), LICENCIA. Comunidad: CDAD PROP CL SAN DAMASO 4 MADRID (CIF E78572146; letra E: comunidad '
                    'de bienes). Presidenta: Erika Gloria Gonzales Rosario (06610303B; 690 088 819). Superficie 59,84. Contrata: CEGA (presupuesto pendiente de firma, jun-2026). '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'css', 'subvenciones'), n=fijar('sandamaso4', 2025), comunidad={'iban': 'ES65 2100 1349 9213 0026 2889'},
    presi=('ERIKA GLORIA GONZALES ROSARIO', 'presidente', '690088819'), trae_pu=PU['silvia_arrialsi'])

rellenar('sdm6', 'SAN DAMASO 6', 'sandamaso6', {'fecha_apertura': '2025-06-10', 'referencia_catastral': '8628614VK3782H',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: la primera nota y la foto, 10/06/2025). Contacta: Silvia Arribas (ARRIALSI; 917 307 033 / 665 805 356; info@arrialsi.com). Tipo de '
                    'obra: ASCENSOR CON DERRIBO SALIDA A EXTERIOR ("Igual a san Damaso 4"). En la casilla "fecha encargo" de la ficha pone 10-06-2025, pero la HE se envia el 11/06/2025 y '
                    'no consta firmada: el 25/06 se presenta un 3D tipo y la comunidad decidira despues del verano. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor',), n=fijar('sandamaso6', 2025), adm=PU['silvia_arrialsi'], trae_pu=PU['silvia_arrialsi'])

# San Diego 110: NO tiene relacion con "AV. DE LA PESETA 101-105 Y TREMIS 1-3" (otra parcela, 6785302VK3668F, CP 28054, Carabanchel). Es la Avda. de San Diego 110
# (Puente de Vallecas, 3409401VK4730G), un encargo de abr-2026 de Del Brio y Blanco. Casa con la opp de produccion "AVDA SAN DIEGO 110 MADRID".
rellenar('sdi110', 'AVDA SAN DIEGO 110', 'sandiego110', {'fecha_apertura': '2026-04-10', 'referencia_catastral': '3409401VK4730G',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: el correo de Carmen, 10/04/2026). Contacta: Carmen Garcia (DEL BRIO Y BLANCO; carmen@delbrioyblanco.es), que tiene junta el lunes '
                    'siguiente y pide convocatorias de ayudas y presupuesto de honorarios. Tipo de obra: ASC + SATE (ascensor y envolvente termica). Comercial interno: ALVARO.'},
    ('ascensor', 'sate'), n=fijar('sandiego110', 2026, ('2026-04-10', 'Correo de Carmen (Del Brio y Blanco) del 10 de abril de 2026.')),
    adm=PU['carmen_dbb'], trae_pu=PU['carmen_dbb'], captador=ALVARO, lleva=ALVARO)

nsv = partir(fijar('sandoval21', 2025, ('2025-08-01', 'Correo de Isaac Pizarroso (Gestin) del 1 de agosto de 2025.')), 0, 'DANIEL: Opci', '2025-08-20')
nsv[1] = (nsv[1][0], nsv[1][1] + '\n\n(Sin fecha; la propuesta de Daniel que va con la HE y el informe de viabilidad enviados el 20/08/2025.)')
rellenar('sv21', 'SANDOVAL 21', 'sandoval21', {'fecha_apertura': '2025-08-01', 'referencia_catastral': '0359103VK4705G',
    'origen_notas': 'Fecha de llegada: 08/2025 (dia: el correo de Isaac Pizarroso, 01/08/2025). Contacta: Isaac Pizarroso Arnao (GESTIN SAP; C/ Alberto Aguilera 7, 1o izda., 28015; '
                    '91 447 10 09; isaacpizarroso@gestin.es; facturacion: mariamartinez@gestin.es; pagos del ICIO: armandomendoza@gestin.es; de 9 a 2 y de 4 a 6 de lunes a jueves, viernes '
                    'de 9 a 2). Tipo de obra: ACCESIBILIDAD EN PLANTA BAJA (dos opciones: rampa o plataforma elevadora inclinada). Presidenta: Rosa (667 73 76 19). HE + informe de '
                    'viabilidad enviados 20/08/2025. Comercial interno: DANIEL.'},
    ('accesibilidad_portal',), n=nsv, presi=('Rosa', 'presidente', '667737619'), adm=PU['isaac'], trae_pu=PU['isaac'])

rellenar('se6', 'SAN EUSEBIO 6', 'saneusebio6', {'fecha_apertura': '2026-06-01', 'referencia_catastral': '5730850VK3753B',
    'origen_notas': 'Fecha de llegada: 06/2026 (dia desconocido; el escaneo 3D es del 09/07/2026). Contacta: Julio (ADMON MERINO; la ficha no da telefono ni correo, y en la agenda de '
                    'Merino no hay ningun Julio). Tipo de obra: ASCENSOR. La ficha no tiene notas. Comercial interno: ALVARO.'},
    ('ascensor',), captador=ALVARO, lleva=ALVARO)
admin_empresa(OPP['se6'][0]['id'], MERINO)

# ================================================================= 2. CLON
nsab = fijar('sabadell62-64-66-68', 2026, ('2026-07-30', 'Correo de Jose Manuel Sobrino Pena (Elecnor) del 30 de julio de 2026.'))
nsal = partir(fijar('salitre43', 2025), 0, '15/01/25', '2025-01-15')
nsan = partir(fijar('sananselmo11', 2024, ('2024-11-08', 'Correo de Manuel Blanco (Del Brio y Blanco) del 8 de noviembre de 2024.')), 0, 'CITADO 18/11/2024', '2024-11-18')
nsem = partir(fijar('sanemilio19', 2022), 0, 'enviado mail 10 agosto', '2022-08-10')
nsdv = fijar('sandoval11', 2025, ('2025-10-01', 'Sin fecha; se pone la de la llegada del proyecto externo a la carpeta, 01/10/2025.'))
REVS = [
    ('sabadell62-64-66-68', '2026-07-30', 'JOSE MANUEL SOBRINO PEÑA (ELECNOR)', None, None,
     'SABADELL 62-64-66-68 MADRID. Fecha: la ficha dice 07/2026 (dia: el correo de Jose Manuel Sobrino, 30/07/2026). Tipo de obra: REHABILITACION PARA CUBIERTA: "Estas obras ya fueron '
     'realizadas. Lo que requerimos es hacer un aporte de documentacion a las nuevas DR que se realizaron" (documentacion recibida de Elecnor, "quien nos hace el encargo"). Contacto: '
     'Jose Manuel Sobrino Pena (ELECNOR; 696 260 511; jmsobrino@elecnor.es en la ficha y jmsobrino@elecnor.com en el correo). HE enviada a Monica para su ok el 31-07-26. '
     'Comercial interno: DANIEL.\n\n' + J(nsab)),
    ('sagradoscorazones14', '2024-11-18', 'CARLOS (CONDE ASESORES), ADMINISTRADOR', None, None,
     'SAGRADOS CORAZONES 14 MADRID. Fecha: 11/2024 (dia: la primera nota, 18/11/2024). Tipo de obra: SATE (IEE desfavorable; incluir 2 patios y patinejos de instalaciones; HE con '
     'subvenciones a exito). Distrito Latina. CP 28011. Contacto: Carlos, de CONDE ASESORES (administrador); Almudena, 660 212 060.\n\n' + crudo('sagradoscorazones14', 2024)),
    ('sagradoscorazones7', '2024-11-18', 'CARLOS (CONDE ASESORES), ADMINISTRADOR', None, None,
     'SAGRADOS CORAZONES 7 MADRID. Fecha: 11/2024 (dia: la nota, 18/11/2024). Tipo de obra: SATE. Distrito Latina. CP 28011. Contacto: Carlos, de CONDE ASESORES (administrador): '
     '"El administrador indica que esperemos a ver".\n\n' + crudo('sagradoscorazones7', 2024)),
    ('salitre43', '2025-01-10', 'JAVIER (ALDAGESTION), A TRAVES DE OSCAR LOPEZ (FAIN)', None, None,
     'SALITRE 43 MADRID. Fecha: 01/2025 (dia: la nota, 10/01/2025). Paga: la CP. Tipo de obra: SUBVENCIONES EXTERNO ACCESIBILIDAD ("FAIN monto los ascensores, pero obra y DF la '
     'ejecuto otra empresa"; un edificio con dos escaleras y dos ascensores, un solo proyecto). Distrito Centro. CP 28012. Administracion: ALDAGESTION (Javier) - no esta en la agenda. '
     'HE enviada 15/01/2025.\n\n' + J(nsal)),
    ('salvadormartinezlozano40', '2024-05-07', 'ALVARO LOPEZ MEGIA (ENVOLTERMIA)', None, None,
     'SALVADOR MARTINEZ LOZANO 40 MADRID. Fecha: 05/2024 (dia: el correo de Alvaro Lopez Megia, de Envoltermia, 07/05/2024; las fotos de la ITE de la comunidad que adjunta son del '
     '24/04/2024). Tipo de obra: SATE, CUBIERTA Y NG (ITE desfavorable; 4 vecinos; edificio de unos 200 anos, no protegido; tambien saneamiento). Distrito Puente de Vallecas. CP 28053. '
     'En la ficha, "ALVARO" en quien contacta: es Alvaro Lopez Megia (ENVOLTERMIA; alopez@envoltermia.com), no el comercial; Carlos Rosa del Real (crosa@envoltermia.com) en copia. '
     'La ficha no dice comercial interno.\n\n'
     + cl('salvadormartinezlozano40', 2024, ('2024-05-07', 'Correo de Alvaro Lopez Megia (Envoltermia) del 7 de mayo de 2024.'))),
    ('sananastasio2', '2023-02-03', 'IBERDROLA', None, None,
     'SAN ANASTASIO 2 MADRID. Fecha: 02/2023 (dia: la documentacion para Iberdrola, 03/02/2023; un dxf de 2015 es de Catastro). Empresa/cliente: IBERDROLA. Distrito Arganzuela. CP 28005. '
     'Administracion: ATIKO (C/ Amparo 86, local; 912 982 005 / 674 319 134; administracion@atikogestion.es). La ficha no dice tipo de obra.\n\n'
     + cl('sananastasio2', 2023, ('2023-02-03', 'Sin fecha; se pone la de la documentacion de la carpeta (03/02/2023).'))),
    ('sananselmo11', '2024-11-08', 'MANUEL BLANCO (DEL BRIO Y BLANCO)', None, None,
     'SAN ANSELMO 11 MADRID (en la ficha: "SAN ANSELMO 11 MADRID, SAN ANSELMO 13 MADRID, VALENTIN SAN NARCISO 20 Y CAMINO VENTA DEL PAJARO": una comunidad de 4 portales). Fecha: '
     '11/2024 (dia: el correo de Manuel Blanco, 08/11/2024). Tipo de obra: 4 ASCENSORES (modificacion completa de los 4 nucleos de escalera; unos 660.000 EUR). Distrito Puente de '
     'Vallecas. CP 28018. Contactos: presidente Javier Gallego (618 233 117); vocal del portal 11, Jose Antonio (609 016 734); Manuel, el mas interesado en el portal 11 (628 754 768). '
     'HE de proyecto y licencia y de subvenciones enviadas 19/11/2024. En produccion hay VALENTIN SAN NARCISO 1, no el 20.\n\n' + J(nsan)),
    ('sanbasilio24', '2019-01-28', 'ALICIA BERZAL (ADMINISTRADORA); SERGIO', None, None,
     'SAN BASILIO 24 MADRID. Fecha: 01/2019 (dia: el croquis, el video y la ficha, 28/01/2019; un borrador de escalera de oct-2018 es de plantilla). Agente comercial: Alicia Berzal; '
     'en la casilla de la administracion, "EMPRESA: SERGIO". Hay presupuesto de ANYLOR "hueco escalera cortando" (ene-2019). La ficha no tiene tipo de obra ni notas.'),
    ('sanchezpreciado38', '2025-11-06', 'ISAAC PIZARROSO (GESTIN SAP)', 'H81559973', '9993229VK3799D',
     'SANCHEZ PRECIADO 38 MADRID. Fecha: 11/2025 (dia: los primeros ficheros, 06/11/2025: facturas y CEE inicial registrado). Paga: la CP. Tipo de obra: PROY EXTERNO: SUBV + CAES '
     '(tecnico externo). CP 28039. Ano 1950. Administracion: GESTIN S.A.P (C/ Alberto Aguilera 7, 1 izda., 28015; Isaac Pizarroso Arnao; 914 471 009; isaacpizarroso@gestin.es). '
     'Comunidad: CDAD PROP CL SANCHEZ PRECIADO 38 MADRID. Comercial interno: DANIEL. (Sanchez Preciado 40, el de al lado, esta en produccion.)\n\n' + crudo('sanchezpreciado38', 2025)),
    ('sanclaudio32-34', '2023-05-23', 'OLIVARES (ROSERSESE)', None, None,
     'SAN CLAUDIO 32-34 MADRID. Fecha: la ficha dice 10/2023; la nota es del 23/05/2023; se toma esa. Tipo de obra: ASCENSOR ("Tenemos hecho el 36, ver si es mejor hacer 2 ascensores '
     'o 1 con pasarelas para los dos"). Distrito Puente de Vallecas. CP 28038.\n\n' + crudo('sanclaudio32-34', 2023)),
    ('sanclaudio46', '2025-02-05', 'ALBERTO OLVERA (MC GESTION)', None, None,
     'SAN CLAUDIO 46 MADRID. Fecha: 02/2025 (dia: la nota, 05/02/2025). Tipo de obra: PERICIAL. Distrito Puente de Vallecas. CP 28038. Administracion: MC GESTION (Av. Doctor Garcia '
     'Tapia 129, local 2, 28030; Alberto Olvera; 91 502 74 59; moratalaz@mcgestionfincas.com): "es la administracion de fincas de Adolfo" (Collado).\n\n' + crudo('sanclaudio46', 2025)),
    ('sanclaudio59', '2025-02-27', 'VANESA (DEL BRIO Y BLANCO)', None, None,
     'SAN CLAUDIO 59 MADRID. Fecha: 02/2025 (dia: la primera nota, 27/02/2025). Tipo de obra: ASCENSOR Y SUBV. Distrito Puente de Vallecas. CP 28038. Administracion: DEL BRIO Y BLANCO '
     '(Vanesa; vanesa@delbrioyblanco.es). Contacto de la comunidad: Josefa (635 606 868). HE y subvenciones enviadas 26/03/2025.\n\n' + crudo('sanclaudio59', 2025)),
    ('sanconrado5', '2024-02-06', 'PINEDO DENNISON (MATEDECON)', None, None,
     'SAN CONRADO 5 MADRID. Fecha: 02/2024 (dia: la nota, 06/02/2024). Tipo de obra: SATE FACHADA Y CUBIERTA Y NEXT GEN. Distrito Latina. CP 28011. HE enviada 06/02/2024.\n\n'
     + crudo('sanconrado5', 2024)),
    ('sandacio35', '2025-03-07', 'ANDRES HERAS (AGLSYP)', None, None,
     'SAN DACIO 35 MADRID. Fecha: 03/2025 (dia: la primera nota, 07/03/2025). Tipo de obra: ASCENSOR. Distrito Fuencarral - El Pardo. CP 28034. Viabilidad enviada a Andres Heras '
     '17/03/2025.\n\n' + crudo('sandacio35', 2025)),
    ('sandimas15', '2016-05-02', 'MONTSE MARA', None, None,
     'SAN DIMAS 15 MADRID. Fecha: 02/05/2016 (la ficha y el croquis). En la ficha, agente "(montse mara)"; contacto: Cristina. Ficha casi vacia: sin tipo de obra ni notas.'),
    ('sandonato1', '2021-02-01', 'IÑIGO (INVER)', None, None,
     'SAN DONATO 2 MADRID (la carpeta se llama sandonato1, pero la ficha y el croquis dicen San Donato 2). Fecha: la ficha dice 02/02/2021; las fotos por WhatsApp son del 01/02/2021; '
     'se toma esa. Agente comercial: Inigo (INVER). Ficha casi vacia: sin tipo de obra ni notas; hay croquis, fotos y ficheros de sep-2021.'),
    ('sandoval11', '2025-09-01', 'JUAN LEON (GRUPO EMBLA)', None, None,
     'SANDOVAL 11 MADRID. Fecha: 09/2025 (dia desconocido; el proyecto externo llega a la carpeta el 01/10/2025). Tipo de obra: PROYECTO EXTERNO de rampa (presupuesto 04-2025 de otro '
     'tecnico) que nos pasa Juan Leon (en la agenda, GRUPO EMBLA); lo enviamos a MATEDECON para que lo presupueste: "solo hacemos esto nada de HE". Comercial interno: DANIEL.\n\n' + J(nsdv)),
    ('sanemilio19', '2022-07-28', 'LAURA PARDO (NVR)', None, '4257923VK4745E',
     'CALLE SAN EMILIO 19 MADRID. Fecha: la ficha dice 08/2022; la nota es del 28/07/2022; se toma esa. Tipo de obra: SATE + ASCENSOR. Distrito Ciudad Lineal. CP 28017. Presupuesto de '
     'NVR (ago-2022). No se llego a enviar HE.\n\n' + J(nsem)),
    ('sanemilio21', '2024-07-11', 'ALBERTO BENITO RUIZ (QUABIT)', None, None,
     'SAN EMILIO 21 MADRID. Fecha: 07/2024 (dia: la nota, 11/07/2024). Tipo de obra: CAMBIO DE ASCENSOR (a accesible) Y PLATAFORMA ELEVADORA. Distrito Ciudad Lineal. CP 28017. '
     'Contacto: Alberto Benito Ruiz (QUABIT; 621 620 873; a.benito@quabitconstruccion.com). Viene a cambio del proyecto de Av. Rio Boladiez 45 (Toledo).\n\n' + crudo('sanemilio21', 2024)),
    ('sanemilio64', '2025-01-17', 'ANA ENCINAS (ELECNOR)', None, None,
     'SAN EMILIO 64 MADRID. Fecha: 01/2025 (dia: la primera nota, 17/01/2025). Tipo de obra: ASCENSOR (viabilidad: dos soluciones de Elecnor, y la de Daniel). Distrito Ciudad Lineal. '
     'CP 28017.\n\n' + crudo('sanemilio64', 2025)),
    ('saneudaldo8', '2024-11-22', 'J M SAYAGO (ADMINISTRACION ATOCHA)', None, None,
     'SAN EUDALDO 8 MADRID. Fecha: 11/2024 (dia: la nota, 22/11/2024). Tipo de obra: ASCENSOR + SUBV A EXITO (por patio hasta el sotano y plataforma en la entrada; presupuestar igual '
     'que Calahorra 26). Distrito Vicalvaro. CP 28032. Administracion: ADMINISTRACION ATOCHA (C/ Villalmanzo 6, 28032; J M Sayago; 91 776 99 49; incidencias@adminatocha.es; '
     'jm.sayago@adminatocha.es) - no esta en la agenda; "(OJO ADMIN)".\n\n' + crudo('saneudaldo8', 2024)),
    ('sanfidel65', '2026-03-10', 'JOSE OLIVARES (ROSERSESE)', None, None,
     'SAN FIDEL 65 MADRID. Fecha: 03/2026 (dia: el 3D, 10/03/2026; el .skb de ene-2026 es de plantilla). Tipo de obra: ASC (derribo completo de escalera). Cliente: Jose Olivares '
     '(ROSERSESE): solo viabilidad; si lo vende a los vecinos, pasamos la HE a Rosersese con los honorarios pactados. Comercial interno: DANIEL.\n\n'
     + cl('sanfidel65', 2026, ('2026-03-10', 'Sin fecha; se pone la del 3D (10/03/2026).')))]
for carp, fecha, trajo, cif, ref, t in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV)

# Sancha Barca 8 es de PARLA (la ficha dice "SANCHA BARCA 8 PARLA", CP 28981): municipio oficial, ruta tal cual. La rechazamos nosotros.
nsbp = partir(fijar('sanchabarca8', 2025), 0, 'El 10/02', '2025-02-10')
fila_muni('PARLA', 'sanchabarca8', '2025-01-31', 'cerrada', 'Rechazada: "El 10/02 se contesta que no es nuestra especialidad" (informe de grietas en vivienda).',
          'RUBEN PEREZ (OAGALES)', None, None,
          'SANCHA BARCA 8, PARLA. La carpeta esta en MADRID, pero la ficha dice "SANCHA BARCA 8 PARLA" (CP 28981). Fecha: la ficha dice 02/2025; "Escribieron el 31/01"; se toma esa. '
          'Tipo de obra: INFORME DE GRIETAS EN VIVIENDA (problema continuado con bovedillas). Contacto: Ruben Perez (OAGALES) - no esta en la agenda.\n\n' + J(nsbp))

for carp, fecha, trajo, t in [
        ('sagunto6', '2016-04-12', 'LUIS MIGUEL NUNES (THYSSEN)', 'C/ SAGUNTO 6 MADRID. Fecha: la ficha dice 08/05/2016; las fotos de la visita son del 12/04/2016; se toma esa. '
         'Ficha vacia; hay fotos, croquis y borrador de escalera (abr-may 2016).'),
        ('sanchezpreciado59', '2015-12-03', 'FELIPE OSADO (ENOR)', 'CALLE SANCHEZ PRECIADOS 59 MADRID. Fecha: 03/12/2015 (la de la ficha; hay croquis, plano, presupuesto y oferta de '
         'ascensor de mar-2016). Contactos: Maria Jesus (hija del presidente), 651 53 82 75; Raquel (nueva presidenta), 625 447 417; Jose, marido de Raquel (4o D), 652 918 208. '
         'Ficha vacia salvo los contactos.'),
        ('sandoval13', '2017-02-28', 'LUIS MIGUEL NUNES (THYSSEN)', 'SANDOVAL 13 MADRID (en la ficha "SAN DOVAL 13"). Fecha: 28/02/2017 (la de la ficha). Ficha vacia; hay croquis y '
         'plano (mar-2017).'),
        ('sandacio22', '2019-11-08', None, 'SAN DACIO 22 MADRID. Carpeta con la ficha EN BLANCO (plantilla de ene-2019): solo un render para SketchUp (08/11/2019).'),
        ('sandacio62', '2020-03-04', None, 'SAN DACIO 62 MADRID. Carpeta con la ficha EN BLANCO (plantilla de ene-2019): solo fotos (04/03/2020).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 3. MANIAS
mania('Recurso contra la denegacion de la licencia de un ascensor: el expediente queda pendiente de la reunion de la Mesa Tecnica de Ascensores.',
      'Junta Municipal de Distrito de Puente de Vallecas (Departamento Juridico)', '2022-01-26', SC134, clave='sc134', trozo='mesa técnica de ascensores',
      tecnico='María del Rosario Teijeiro Trigo')

if not ESCRIBIR:
    print('San Diego 110: casa con la opp de produccion AVDA SAN DIEGO 110 (5b8b88d1); NO tiene relacion con AV. DE LA PESETA 101-105 Y TREMIS 1-3 (otra parcela y distrito).')
resumen()
