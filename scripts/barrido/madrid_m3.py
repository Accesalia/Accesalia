# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda M3 (mesondeparedes90 .. musas21, 37 carpetas [75:112] de la M). 7-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de, _lineas

GJIMENEZ = '1981e21f-de4e-4a9a-9114-7f5b8f3fdb3d'      # Gestoria Jimenez (Andres Jimenez), la de Julian Besteiro
EXPRESS = '2d6be5c5-1fbe-47ca-ab72-5c36bc563928'; HERCO = '5647cad4-e8ff-4181-9993-1aa9a4b395c0'; JONALO = '8a946882-1168-42ad-b659-814baa339189'
PU.update(mjruiz='c768611c-65ef-458f-8b45-c8a2f05e5f9a', pescalona='62b2404c-cf2c-4c66-bfc5-e7412a379559', vanesa='05cda534-6907-43b0-b674-53cbe143a278',
          gmoya='5a588515-9c02-4058-8e31-7e51dec4737f', jparra_coinsa='6e05ab77-ce9d-4e4e-ba5e-ed8e278842f5', jmguerrero='cafbcbd6-88ae-446f-ad31-dae5d4de8c83',
          isabel_mtd='b2f50403-daff-47d1-b421-4fe6515c92b8', olmedo='68e3cca7-8f30-49ef-b7a7-8e75f949cde5', jvelasco='94b4d0ec-edd7-4038-a58f-0823b287fa8f',
          tmorell='f3d7c715-9316-4956-87aa-f1c5b3362b2a', erodriguez='760e6a58-a772-4529-94d9-b16b4d09b54f', amira='45bb632e-e41a-472f-9726-796da09f1889',
          jaalvarez='106ccfee-f51f-4bd8-82c0-719c18c944e7')
MONCADA101 = 'e7dd40e4-1334-4192-89d1-64c69b051b33'   # "MONCADA 101 MADRID": la que se rellena
MONCADA101_SOBRA = 'b56e8f7e-fc3f-4eea-850e-a66ed4756cd0'   # "MONCADA 101": vacia, misma comunidad y mismo acceso -> NO se toca (duda: borrarla)
IGUELDO = 'f14987a0-4d49-46f6-a737-e8a211258400'      # "AVDA MONTE IGUELDO 123 MADRID": ya escrita en la tanda A (carpetas avmonteigueldo123 y avmonteigueldo23)
# Propuesta para Monica: la carpeta montehigueldo123 es la MISMA oportunidad (feb-2026, Del Brio y Blanco, Alvaro). Sin fila en la clon; se anaden a la opp
# ya escrita las dos notas que solo estan en esta carpeta (HE e informe del 17/02/2026 y el correo de Vanesa del 09/03/2026). False = no anadir nada.
IGUELDO_NOTAS = True
MOL25 = 'montejurra25/FICHA DATOS TECNICOS (1).docx'
MLF5 = 'modestolafuente5/FICHA DATOS TECNICOS (Copia en conflicto de D SM 2024-03-08).docx'
MOCH_A = 'mochuelo1/ascensor/FICHA DATOS.docx'; MOCH_S = 'mochuelo1/sate/FICHA DATOS.docx'


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto o ya no vigente."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


def pc_unico(cid, nombre, rol, tel=None, doc=None, email=None, notas_=None):
    """pc() para roles que no son presidente, sin repetirla si el script se relanza."""
    ya = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&nombre=eq.%s' % (cid, quote(nombre)))
    return ya[0]['id'] if ya else pc(cid, nombre, rol, tel, doc, email, notas_)


def admin_empresa(cid, empresa):
    if not b.leer('comunidad_admin_responsable?select=id&vigente=eq.true&comunidad_id=eq.' + cid):
        ins('comunidad_admin_responsable', [{'comunidad_id': cid, 'empresa_id': empresa, 'puesto_id': None, 'vigente': True}])


def correo_a(puesto, email, principal=False):
    """correo nuevo en un puesto que YA existe (si el correo no esta ya en la agenda)."""
    if not b.leer('correo?select=id&email=ilike.' + quote(email)):
        ins('correo', [{'puesto_id': puesto, 'email': email, 'etiqueta': 'general', 'principal': principal}])


def alta_admin(nombre, notas_, telefono=None, direccion=None, email=None):
    """administracion de fincas nueva que lleva una comunidad de PRODUCCION (criterio de Monica, ADMONPATRIMONIOS, 7-oct-2026)."""
    ya = b.leer('empresa?select=id&nombre_accesalia=eq.' + quote(nombre))
    if ya: return ya[0]['id']
    i = nuevo_id()
    ins('empresa', [{'id': i, 'nombre_accesalia': nombre, 'tipo': 'administracion_fincas', 'activa': True, 'comercial_id': DANIEL,
                     'telefono': telefono, 'direccion': direccion, 'notas': notas_}])
    if email and not b.leer('correo?select=id&email=ilike.' + quote(email)):
        ins('correo', [{'empresa_id': i, 'email': email, 'etiqueta': 'general', 'principal': True}])
    EMPRESA_NUEVA[nombre] = i
    return i


EMPRESA_NUEVA = {}


def motivo(n, i, m):
    """anade el motivo a la nota i (la fecha ya la puso partir)."""
    f, t = n[i]; n[i] = (f, t + '\n\n(' + m + ')'); return n


def bloque(c, i, j):
    """lineas i..j (incluidas) de la ficha, sin las vacias."""
    return '\n'.join(l for l in _lineas(c)[i:j + 1] if l.strip()).strip()


def cid_de(prefijo):
    cs = b.leer('comunidades?select=id&municipio=eq.MADRID&nombre=like.' + quote(prefijo) + '*'); assert len(cs) == 1, prefijo
    return cs[0]['id']


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
cl = lambda c, a, s=None: J(fijar(c, a, s))

# ================================================================= 0. AGENDA
# Administraciones nuevas de comunidades de PRODUCCION (Mezquita 1, Mochuelo 1, Monte Perdido 10). Ninguna junta nueva.
MERONA = alta_admin('FINCAS MERONA', 'Alta en el barrido de Madrid: administracion de Mezquita 1 (ficha de feb-2026; carpeta mezquita1). La ficha no trae persona.',
                    telefono='914997361', email='administracion@fincasmerona.com')
GRUSEPRO = alta_admin('GRUSEPRO', 'Alta en el barrido de Madrid: administracion de Mochuelo 1 en la ficha del SATE (may-2026; carpeta mochuelo1/sate).',
                      telefono='913602333', direccion='C. Camichi 21')
RUBEN = persona_nueva('Rubén', None, 'administrador', '913602333', 'ruben@grusepro.com', empresa=GRUSEPRO,
                      notas_='GRUSEPRO: contacto de Mochuelo 1 (SATE + cubierta, may-2026; carpeta mochuelo1/sate).')
# Redfincas (Monte Perdido 10) sale de la ficha de 2020: demasiado antigua, no se da de alta (Monica, 7-oct-2026).
GISSELA = persona_nueva('Gissela', 'Villegas', None, '91 386 26 95', 'administrador@andresjimenez.net', empresa=GJIMENEZ,
                        notas_='Gestoria Jimenez (Andres Jimenez; Pza. Puerto de la Cruz 7-8 local): contacto de Montesa 27 (jun-2025; carpeta montesa27). En la ficha: "Mismo adm que Julian Besteiro".')
GUSTAVO = persona_nueva('Gustavo', 'Gómez Sáez', 'comercial', '635 17 36 35', 'gustavo.gomez@expresselevadores.com', contrata=EXPRESS,
                        notas_='Express Elevadores: trae Monte Perdido 10 (oct-2020; en la ficha "Boris / Express - Gustavo Gomez Saez"; carpeta monteperdido10).')
persona_nueva('Juan', None, None, '661 51 88 28', 'herco@ascensoresherco.es', contrata=HERCO,
              notas_='Herco Ascensores: "Juan de HERCO", constructora de Miguel de la Roca 18 (2022-2023; carpeta migueldelaroca18). El correo es el general de Herco.')
persona_nueva('José', 'Navarro', None, '639155684', None, contrata=JONALO,
              notas_='Jonalo Estructuras: contacto de obra de Monte Perdido 10 (ficha del ascensor; carpeta monteperdido10).')
correo_a(PU['olmedo'], 'olmefin@gmail.com', True)

# ================================================================= 1. PRODUCCION (18 carpetas, 18 oportunidades)
# --- Mezquita 1
rellenar('mez1', 'MEZQUITA 1', 'mezquita1', {'fecha_apertura': '2026-02-01',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia desconocido: la ficha no tiene notas y los ficheros de trabajo, el modelo 3D, son de mar-2026). Contacta: en la ficha "EFFIC???" '
                    '(sin confirmar). Tipo de obra: ASC. Administracion: FINCAS MERONA (91 499 73 61; administracion@fincasmerona.com; dada de alta en el barrido). Hay modelo 3D. '
                    'Comercial interno: ALVARO.'},
    ('ascensor',), captador=ALVARO, lleva=ALVARO)
admin_empresa(OPP['mez1'][0]['id'], MERONA)

# --- Miguel de la Roca 18: proyecto hecho y licencia concedida (jun-2023); en jul-2024 la comunidad decide no hacer la obra -> NO se cierra
MDR = 'migueldelaroca18'
n_mdr = [('2021-09-09', bloque(MDR, 83, 97) + '\n\n(Correo de Francisco Javier Garcia Blanco, vicepresidente, del 9 de septiembre de 2021, con la cuenta para el cobro de la tramitacion de subvenciones.)'),
         ('2022-03-17', bloque(MDR, 127, 140) + '\n\n(Reunion con la tecnica de la Junta de Puente de Vallecas; la "actualizacion" es posterior, sin fecha. Lo tachado ya no vale.)'),
         ('2022-03-17', bloque(MDR, 145, 146) + '\n\n(Sin fecha en la ficha; va justo despues de la reunion del 17/03/2022 y antes de la nota de abril de 2022.)'),
         ('2022-04-01', bloque(MDR, 148, 148) + '\n\n(Dia desconocido: la ficha dice "Abril 2022".)'),
         ('2022-09-01', bloque(MDR, 150, 150) + '\n\n(Dia desconocido: la ficha dice "Septiembre 2022".)'),
         ('2023-07-05', bloque(MDR, 152, 153)), ('2023-07-06', bloque(MDR, 154, 154)), ('2023-10-05', bloque(MDR, 156, 156)),
         ('2024-05-10', bloque(MDR, 163, 186) + '\n\n(Correo de Andres Mulas Pineda, jefe de obra de Elecnor, del 10-05-2024.)'),
         ('2024-05-10', bloque(MDR, 189, 192) + '\n\n(Sin dia: "A mayo 2024"; va despues del correo del 10-05-2024 y antes de la respuesta del administrador del 14-05-2024.)'),
         ('2024-05-14', bloque(MDR, 195, 201) + '\n\n(Correo del administrador, Antonio Olmedo, del 14 de mayo de 2024.)'),
         ('2024-07-19', bloque(MDR, 203, 203))]
rellenar('mdr18', 'MIGUEL DE LA ROCA 18', MDR, {'fecha_apertura': '2020-10-19', 'referencia_catastral': '3005501VK4730E',
    'origen_notas': 'Fecha de llegada: la ficha no la trae; 10/2020 (dia: el primer fichero de trabajo, el plano de Catastro del 19/10/2020; el 29/10/2020 hay modelo 3D y video de la visita). '
                    'Agente comercial en la ficha: SAACO BROTHER; antes, tachados, REHABILITACIONES TECNICAS INVER -> Elecnor ("aprobado en junta vecinos pero no firmado contrato con Elecnor") -> Herco. '
                    'Tipo de obra: INSTALACION DE ASCENSOR (+ subvenciones, que la comunidad contrato directamente con nosotros; el proyecto lo pagaba INVER). Barrio: Entrevias. NZ 4. Tecnico: Dennis. '
                    'Administracion: ANTONIO OLMEDO GORDO (C/ Fuente Carrantona 38, 28030; 91 371 34 19 / 660 033 480; olmefin@gmail.com). CIF de la ficha: E78333564. Ano 1970; 20 viviendas. '
                    'PEM 110.657,98. Visado TL/020511/2020. Expediente 114/2021/141 (licencia por procedimiento ordinario en la Junta de Puente de Vallecas, 915 887 312, tecnipvallecas@madrid.es; '
                    'tecnica Helena Garcia, garciahel@madrid.es); licencia concedida en jun-2023. Presidenta: Laura Garcia Encinas (desde el 15/03/2023); antes Rocio Martinez (tachada). '
                    'Vicepresidente: Francisco Javier Garcia Blanco (garziablanco@hotmail.es). Constructora: Juan de HERCO (661 51 88 28; herco@ascensoresherco.es). En la carpeta, el presupuesto '
                    'firmado de SAACO BROTHER (jul-2024) y la renuncia a la subvencion de la CAM 2023 (abr-2025). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=n_mdr, comunidad={'cif_comunidad': 'E78333564', 'iban': 'ES34 0081 7115 1700 0160 7971'},
    presi=('LAURA GARCIA ENCINAS', 'presidente', '603777984', '03456658B', 'jardilaura@hotmail.com',
           'Nueva presidenta desde el 15/03/2023; antes Rocio Martinez (50988877Q; 618 28 26 89; rociomrtnz1984@gmail.com), tachada en la ficha.'),
    huecos=['[REVISAR EN FACTURACION] Proyecto hecho y licencia concedida (jun-2023); el 19/07/2024 la comunidad acuerda en acta no continuar con la obra del ascensor (tenia contrato '
            'firmado con Saaco Brother) y en abr-2025 renuncia a la subvencion de la CAM 2023. Queda abierta para revisar en facturacion: el proyecto lo pagaba INVER/Elecnor ("hay que hablar '
            'con Elecnor cuando consigamos la licencia para que nos pague el proyecto") y en sep-2022 Daniel cerro un acuerdo economico con el administrador.'])
pc_unico(OPP['mdr18'][0]['id'], 'FRANCISCO JAVIER GARCIA BLANCO', 'vicepresidente', None, None, 'garziablanco@hotmail.es', 'Vicepresidente (sept 2021).')

# --- Miguel Servet 13
rellenar('ms13', 'MIGUEL SERVET 13', 'miguelservet13', {'fecha_apertura': '2026-07-03',
    'origen_notas': 'Fecha de llegada: 07/2026 (dia: el correo de Maria Jose Ruiz, de Atiko, del 03/07/2026, con la documentacion de esta comunidad y de Pradillo 26). Contacta: Maria Jose Ruiz (ATIKO; '
                    'C. del Amparo 86, 28012; 912 98 20 05; administracion@atikogestion.es). Tipo de obra: ASCENSOR (torre de cristal, doble embarque a 180 grados, 6 personas, 1 m/s; coste aprox. '
                    'de obra 100.000 + IVA) y SATE con AEROTERMIA, que se estudiara despues junto a Envoltermia. Hay consulta urbanistica aportada. Comercial interno: DANIEL.'},
    ('ascensor', 'sate', 'aerotermia'),
    n=fijar('miguelservet13', 2026, ('2026-07-03', 'Correo de Maria Jose Ruiz (Atiko) del 3 de julio de 2026, reenviado; debajo, la propuesta de Daniel.')),
    adm=PU['mjruiz'], trae_pu=PU['mjruiz'])

# --- Mira el Rio 7 (El Pardo)
rellenar('mer7', 'MIRA EL RIO 7', 'miraelrio7', {'fecha_apertura': '2026-06-23',
    'origen_notas': 'Fecha de llegada: 06/2026 (dia: el modelo 3D y la ficha, 23/06/2026). Contacta: Rafael Ortega (675 723 936; gestor24@gmail.com). Tipo de obra: SILLA SALVAESCALERA. '
                    'CP 28048 (El Pardo). La ficha no tiene notas; hay modelo 3D. Comercial interno: ALVARO.'},
    ('plataforma',), captador=ALVARO, lleva=ALVARO)
pc_unico(OPP['mer7'][0]['id'], 'RAFAEL ORTEGA', 'otro', '675723936', None, 'gestor24@gmail.com', 'Contacto en la ficha (quien contacta; jun-2026).')

# --- Mochuelo 1: dos fichas del mismo edificio y la misma epoca (ascensor abr-2026 y SATE + cubierta may-2026) = UNA oportunidad
rellenar('moch1', 'MOCHUELO 1', 'mochuelo1', {'fecha_apertura': '2026-04-01',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia desconocido; la ficha del ascensor dice 04/2026 y el primer fichero, el modelo 3D, es del 05/05/2026). En la carpeta hay DOS fichas del mismo '
                    'edificio y de la misma epoca, que van en esta oportunidad: (1) ASC + SUBV (04/2026): contacta Araceli (RENOVAMOS MADRID, la EMPRESA CONSTRUCTORA; A.rio@renovamosmadrid.com; en la ficha figura por error '
                    'como administracion) - no esta en la agenda; comercial interno ALVARO. (2) SATE + CUBIERTA (05/2026): contacta Ruben (GRUSEPRO, administracion; C. Camichi 21; 913 602 333; '
                    'ruben@grusepro.com; dada de alta en el barrido); contacto de la comunidad Miguel Angel Lopez (615 847 199); en la ficha comercial "CARLOS S": se ignora. '
                    'UNA oportunidad con dos cosas presupuestadas por separado; la capta y la lleva Alvaro; la administracion es GRUSEPRO (Monica, 7-oct-2026). Ninguna de las dos fichas tiene notas.'},
    ('ascensor', 'subvenciones', 'sate', 'cubierta'), captador=ALVARO, lleva=ALVARO, adm=RUBEN)
pc_unico(OPP['moch1'][0]['id'], 'MIGUEL ANGEL LOPEZ', 'otro', '615847199', None, None, 'Persona de contacto de la comunidad (ficha del SATE + cubierta, may-2026).')

# --- Modesto Alonso 8 (obra en curso)
n_ma8 = fijar('modestoalonso8', 2023, otros={2: ('2025-02-14', 'En la ficha pone 14/02/2026, pero va entre las notas de ene-2025 y sep-2025 y la junta se coordino para el 13 de febrero '
                                                  '(nota del 23/01/2025): errata de ano, es 14/02/2025.')})
rellenar('ma8', 'MODESTO ALONSO 8', 'modestoalonso8', {'fecha_apertura': '2023-10-31', 'referencia_catastral': '3921615VK4732B',
    'origen_notas': 'Fecha de llegada: 10/2023 (dia: la primera nota, 31/10/2023). Contacta: Valentin Alcocer (ADMINISTRACIONES ALCORA; 617 354 703; valentin@administracionesalcora.es) y '
                    'Juan Antonio Alvarez (FAIN); "Poner a fain en copia de todo!" (11/06/2024). Paga: la CP. Tipo de obra: ASCENSOR + PLATAFORMA Y SUBVENCION (tachado: "opcional SATE y cubierta y '
                    'Next Gen"; no lo quisieron). Barrio: Numancia. Tecnico: Susana -> Julio. Ano 1978. Visado TL/001609/2024. Licencia por ECU (ACTECU), registrada el 18-01-2024. Obra en curso '
                    'con FAIN (Gradcom de subcontrata); HE de CSS recibida el 27-04-2026. Garaje (Comunidad del garaje de Modesto Alonso 6-8; laboral@administracioninmaculada.com): plaza 15, '
                    'Jose Luis Berzal (654 08 65 43); secretario, plaza 27, Joaquin Garcia (91 477 67 65); Julia, plaza 26 (659 16 32 68 / 659 16 32 11), "ya no es presidenta a 07/04". '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'plataforma', 'subvenciones', 'css'), n=n_ma8, comunidad={'iban': 'ES36 0081 0337 1300 0150 9561'},
    presi=('JOSE ANES FERNANDEZ (3ºB)', 'presidente', '670615353'), trae_pu=PU['valentin'])

# --- Modesto Lafuente 42 (la ficha y el 3D dicen 24)
rellenar('mlf42', 'MODESTO LAFUENTE 42', 'modestolafuente42', {'fecha_apertura': '2026-06-29',
    'origen_notas': 'Fecha de llegada: 06/2026 (dia: el modelo 3D y la ficha, 29/06/2026). OJO: la direccion es MODESTO LAFUENTE 24 (la ficha; Monica, 7-oct-2026); la carpeta y la comunidad de la app dicen 42. '
                    'El modelo 3D tiene dos partes, A y B. La comunidad de produccion no tiene acceso de Catastro. Contacta: Diego Garcia Cuesta (918 05 03 82 ext. 202; '
                    'dgarcia@hadoq.com; HADOQ - no esta en la agenda). Tipo de obra: ACCESIBILIDAD VARIA. CP 28003. La ficha no tiene notas. Comercial interno: ALVARO.'},
    ('accesibilidad',), captador=ALVARO, lleva=ALVARO)
pc_unico(OPP['mlf42'][0]['id'], 'DIEGO GARCIA CUESTA', 'otro', '918050382', None, 'dgarcia@hadoq.com', 'Contacto en la ficha (jun-2026); ext. 202; de HADOQ.')

# --- Moncada 101 y 102 (Schindler)
rellenar('mon101', 'MONCADA 101', 'moncada101', {'fecha_apertura': '2026-03-09',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia: el modelo 3D del 09/03/2026). Contacta: Javier Gonzalez Moya (SCHINDLER). Tipo de obra: PLATAFORMA INCLINADA. CP 28021. HE enviada '
                    '27/04/2026 (el mismo dia que la de Moncada 102). Comercial interno: ALVARO.'},
    ('plataforma',), n=fijar('moncada101', 2026, ('2026-04-27', 'La fecha va dentro de la nota.')), trae_pu=PU['gmoya'], captador=ALVARO, lleva=ALVARO, oid_fijo=MONCADA101)
rellenar('mon102', 'MONCADA 102', 'moncada102', {'fecha_apertura': '2026-04-23',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: el modelo 3D y la foto de WhatsApp del 23/04/2026). Contacta: Javier Moya (SCHINDLER; en la agenda, Javier Gonzalez Moya). '
                    'Tipo de obra: PLATAFORMA INCLINADA. HE enviada 27/04/2026. Comercial interno: ALVARO.'},
    ('plataforma',), n=fijar('moncada102', 2026, ('2026-04-27', 'La fecha va dentro de la nota.')), trae_pu=PU['gmoya'], captador=ALVARO, lleva=ALVARO)

# --- Monleon 10
rellenar('mle10', 'MONLEON 10', 'monleon10', {'fecha_apertura': '2025-11-05',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia: el correo de Pedro Escalona, 05/11/2025). Contacta: Pedro Escalona (DEL BRIO Y BLANCO; pedro@delbrioyblanco.es). Tipo de obra: SUBV PROY EXT '
                    '(subvencion de un proyecto externo: panel sandwich en un tejado). HE enviada 17/11/2025. Comercial interno: DANIEL.'},
    ('subvenciones',), n=fijar('monleon10', 2025, ('2025-11-05', 'Correo de Pedro Escalona (Del Brio y Blanco) del 5 de noviembre de 2025.')),
    adm=PU['pescalona'], trae_pu=PU['pescalona'])

# --- Monsenor Oscar Romero 6
rellenar('mor6', 'MONSEÑOR OSCAR ROMERO 6', 'monseñoroscarromero6', {'fecha_apertura': '2024-01-08', 'referencia_catastral': '7005616VK3770E',
    'origen_notas': 'Fecha de llegada: 01/2024 (dia: la primera nota, 08/01/2024: "nos conocen por Camino de las Cruces 28"). Contacta: Ana, la presidenta (4o B; 600 820 857; '
                    'janapr18091972@gmail.com). Paga: la CDAD. Tipo de obra: ASCENSOR SIN DF NI CSS (la HE de may-2024 incluia proyecto + CSS + subvenciones; en jul-2024 se modifico sin DF, CSS ni '
                    'subvenciones); y en jun-2025 HE de un informe PERICIAL para la defensa de la demanda de unos vecinos contra la comunidad por el ascensor. Barrio: Puerta Bonita. Tecnico: '
                    'KGS -> Dario -> Israel (estudio de viabilidad). Ano 1973. Licencia por ECU (ACTECU), con informe de patrimonio (2026). Administracion: MzB Administracion de Fincas (Alejandro '
                    'Manzano, alejandro.manzano@fincasmzb.es; C/ Delfos 6, 28341 Valdemoro), desde el 12/06/2026 por jubilacion de su padre, Leandro Manzano (FINCASA; 690 953 948; fincasa@gmx.es), '
                    'tachado en la ficha. Presidente en la ficha: Luis Alberto Viagel Gallego (4o B). Abogado facilitado por Daniel: Luis Miguel, de AESTIMATIO (914 519 900) - no esta en la agenda. '
                    'La obra esta parada a la espera del juicio (ene-2026). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'pericial'), n=fijar('monseñoroscarromero6', 2024), comunidad={'iban': 'ES47 0081 5142 6900 0125 4535'})
ANA = pc_unico(OPP['mor6'][0]['id'], 'ANA (4º B)', 'otro', '600820857', None, 'janapr18091972@gmail.com',
               'En las notas, "ANA (PRESIDENTA)"; en la ficha el presidente es Luis Alberto Viagel Gallego, del mismo piso (4o B).')
act('oportunidades?id=eq.' + OPP['mor6'][1], {'quien_persona_comunidad_id': ANA, 'persona_comunidad_id': ANA})

# --- Montejurra 25
n25 = fijar(MOL25, 2021)
rellenar('mj25', 'MONTEJURRA 25', 'montejurra25', {'fecha_apertura': '2021-09-20', 'referencia_catastral': '4453504VK4745C',
    'origen_notas': 'Fecha de llegada: la ficha dice 02/2022, pero el correo de Rehabilitaciones Matedecon a Daniel es del 20/09/2021 (y la fecha de encargo, 09/2021); se toma ese. '
                    'Contacta: Isabel (REHABILITACIONES MATEDECON, S.L.; C/ Valle de Guadalix 4, 28703 San Sebastian de los Reyes; 636 958 389 / 699 174 478; rehabilitacionesmatedecon@gmail.com). '
                    'Paga: la CDAD. Tipo de obra: SATE + FV EN CUBIERTA + SUBV (IEE, DO, CFO, CSS): proyecto basico y de ejecucion para rehabilitacion de las fachadas; en jun-2026 el presidente '
                    'dice que la fotovoltaica no se hace de momento (SATE y cubierta, con amianto). Tecnico: Carla. Administracion: MANDATARIA (Esther, 624 972 523, esther@mandataria.com: '
                    '"certificado de haber mandado ayto 2022 y next generation"); antes JEGUEYMA (Miguel Angel Jimenez; 914 07 87 00; jegueyma@gmail.com), tachada. Presidente desde 2024: Juan '
                    'Alberto Iglesias Ferreiro; antes Giampaolo Sponza. Contacto: Elias Kitano (665 343 707; elias.kitano@gmail.com). PEM 146.612,84. Visado TL/005082/2022. Expediente '
                    '350/2024/37629 (DR; prorroga pedida 15-06-2026). Obra no empezada (abr-2026, Progescon: espera el plan de retirada de la uralita). La ficha no dice comercial interno; la lleva Daniel.'},
    ('sate_fachada', 'fotovoltaica', 'arreglo_cubierta', 'subvenciones', 'iee', 'df', 'cfo', 'css'), n=n25,
    presi=('JUAN ALBERTO IGLESIAS FERREIRO', 'presidente', '619129630', '02544669H', 'juaniglesiasochenta@gmail.com',
           'Presidente desde 2024; antes Giampaolo Sponza (X2284747L; 677 528 920; giampaolo.sponza@gmail.com).'), trae_pu=PU['isabel_mtd'])
pc_unico(OPP['mj25'][0]['id'], 'ELIAS KITANO', 'otro', '665343707', None, 'elias.kitano@gmail.com', 'Contacto de la comunidad (ficha).')

# --- Montejurra 31 y 33: misma parcela (4453501VK4745C), dos comunidades con CIF propio y dos encargos de anos distintos -> dos oportunidades
rellenar('mj31', 'MONTEJURRA 31', 'montejurra31', {'fecha_apertura': '2024-04-09', 'referencia_catastral': '4453501VK4745C',
    'origen_notas': 'Fecha de llegada: 04/2024 (dia: la primera nota, 09/04/2024, visto con Javier la solucion). Contacta: Javier Parra (COINSA; 647 437 941), a traves de Diego Pardo (COINSA). '
                    'Paga: COINSA. Tipo de obra: PLATAFORMA. Barrio: Ventas. Tecnico: Carla. Ano 1965. Visado TL/007660/2024. Expediente 350/2024/21800: licencia en el Ayto, cambiada a DR en '
                    'dic-2025. Obra no empezada (jul-2026). En la carpeta hay cartografia del geoportal con fecha de mar-2023 (descargada; no cuenta como huella). '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('plataforma',), n=fijar('montejurra31', 2024), trae_pu=PU['jparra_coinsa'])
n33 = fijar('montejurra33', 2025) + [(f, t + '\n\n(En la ficha, debajo de "NOTAS SUBVENCIONES", pero es del encargo.)') for f, t in trocear2(subv('montejurra33'), 2025)]
assert all(f for f, t in n33), [t[:40] for f, t in n33 if not f]
rellenar('mj33', 'MONTEJURRA 33', 'montejurra33', {'fecha_apertura': '2025-08-29', 'referencia_catastral': '4453501VK4745C',
    'origen_notas': 'Fecha de llegada: 08/2025 (dia: la primera nota, 29/08/2025: "Salvaescaleras igual a Montejurra 31"; el excel de calculo de abr-2025 de la carpeta es una plantilla). '
                    'Contacta: Javier Parra (COINSA; 647 437 941; fjparra@ascensorescoinsa.com). Paga: COINSA. Tipo de obra: SALVAESCALERA. Barrio: Ventas. Tecnico: Karla. Fecha encargo: '
                    '01/09/2025 (HE firmada). Ano 1965. DR en el Ayuntamiento, registrada el 13/01/2026. Docs de la CP pedidos a Coinsa 05/09, 22/09 y 08/10. PEM 26.627,17. Visado TL/000275/2026. '
                    'Superficie 25,46 m2. Presidenta: Luisa Maria Moreno Martin (07232022V); antes Maria Elvira Foces Reglero (71122624T), tachada. Comercial interno: DANIEL.'},
    ('plataforma',), n=n33, trae_pu=PU['jparra_coinsa'])
arreglar_pc(OPP['mj33'][0]['id'], 'rol=eq.presidente&documento=eq.71122624T07232022V',
            {'nombre': 'LUISA MARIA MORENO MARTIN', 'documento': '07232022V',
             'notas': 'Antes: Maria Elvira Foces Reglero (71122624T), tachada en la ficha (los dos nombres y los dos DNI estaban pegados en un solo campo).'})

# --- Monte Perdido 10
n_mp = [('2022-03-17', bloque('monteperdido10', 92, 97) + '\n\n(Sin fecha delante; lo hecho lleva fecha 17/03/2022 dentro de la nota. El informe tecnico favorable de la carpeta es del 21/03/2022.)'),
        ('2025-11-26', bloque('monteperdido10', 113, 113))]
rellenar('mp10', 'MONTE PERDIDO 10', 'monteperdido10', {'fecha_apertura': '2020-10-13', 'referencia_catastral': '3119104VK4731G',
    'origen_notas': 'Fecha de llegada: la ficha no la trae; 10/2020 (dia: el primer fichero, el croquis del 13/10/2020). Trae: "Boris / Express - Gustavo Gomez Saez" (EXPRESS ELEVADORES; '
                    '635 17 36 35; gustavo.gomez@expresselevadores.com). Tipo de obra: INSTALACION DE ASCENSOR EN EDIFICIO RESIDENCIAL EXISTENTE (+ subvenciones del Ayto 2020-2022 y renovacion '
                    'en nov-2025). Barrio: San Diego. Ambito API.13.08 Puente de Vallecas Sur. Administracion en la ficha de 2020: REDFINCAS (Miguel Aguiar; maguiar@redfincas.es) - no esta en la agenda; dato antiguo, no se da de alta (Monica, 7-oct-2026). '
                    'CIF H84081462. Visado TL/017683/2020. Expediente 114/2020/04761 (Junta de Puente de Vallecas; tecnica Helena Garcia): licencia concedida en may-2022. Obra en 2022-2023 '
                    '(actas de obra): Luis Acebes (Grupo Inima; 630 584 897) - no esta en la agenda; Jose Navarro (Jonalo Estructuras; 639 155 684). En la carpeta hay tambien una subcarpeta '
                    'FOTOVOLTAICA (dos PDF, oct-2021 y ene-2022). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=n_mp, comunidad={'cif_comunidad': 'H84081462'},
    presi=('GREGORIO RUIZ DE LA SIERRA', 'presidente', '686913020', None, 'serrusho@yahoo.es'), trae_pu=GUSTAVO)

# --- Montesa 27 (CARLOS, primera huella jun-2025 -> capto Carlos, lleva Alvaro)
rellenar('mts27', 'MONTESA 27', 'montesa27', {'fecha_apertura': '2025-06-19',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: el modelo 3D del 19/06/2025). Contacta: el administrador, GESTORIA JIMENEZ (Andres Jimenez; Pza. Puerto de la Cruz 7-8 local; contacto Gissela '
                    'Villegas, 91 386 26 95, administrador@andresjimenez.net; "mismo adm que Julian Besteiro"). Paga: la comunidad. Tipo de obra: PORTAL RAMPA (presupuesto y viabilidad de una '
                    'rampa en el portal; puerta cortavientos que una vecina cree protegida y no lo esta). Ano 1940. Presupuesto de Matedecon (22k; jul-2025). Vecina: Mercedes Carabante '
                    '(690 838 911). Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('rampa',), n=fijar('montesa27', 2025, ('2025-06-19', 'Sin fecha en la ficha; se toma la del modelo 3D (19/06/2025). El presupuesto de Matedecon de la carpeta es del 02/07/2025.')),
    adm=GISSELA, trae_pu=GISSELA, captador=CARLOS, lleva=ALVARO)
pc_unico(OPP['mts27'][0]['id'], 'MERCEDES CARABANTE (VECINA)', 'vecino', '690838911', None, None, 'Vecina que cree protegida la puerta cortavientos (ficha, 2025).')

# --- Montes de Toledo 3
rellenar('mt3', 'MONTES DE TOLEDO 3', 'montesdetoledo3', {'fecha_apertura': '2024-12-01', 'referencia_catastral': '7402918VK4770A',
    'origen_notas': 'Fecha de llegada: 12/2024 (dia desconocido; la primera nota es del 30/04/2025 y el primer fichero, el modelo 3D, del 28/04/2025). Contacta: Jose Maria, administrador '
                    '(GABINETE GUERRERO DADILLOS; Paseo Federico Garcia Lorca 16, 2o B, 28031; 91 331 90 25 / 667 694 601; jmmlflorida@gmail.com). Paga: la CP. Tipo de obra: ASC + SUBV (ascensor '
                    'de 4 paradas y escalera de planta baja a sotano). Distrito en la ficha: Vallecas. Fecha encargo: 29/07/2026 (HE firmada, proyecto + subvenciones). Ano 1980. '
                    'Comercial: ALVARO.'},
    ('ascensor', 'subvenciones'), n=fijar('montesdetoledo3', 2025), comunidad={'cif_comunidad': 'H79722245', 'iban': 'ES73 2100 8336 0013 0027 0304'},
    presi=('JOSE CARLOS JURADO PULIDO', 'presidente', '627571998', '50969654K'), adm=PU['jmguerrero'], trae_pu=PU['jmguerrero'], captador=ALVARO, lleva=ALVARO)

# --- Musas 17 (CARLOS, primera huella nov-2025 -> capto Carlos, lleva Alvaro)
rellenar('mus17', 'MUSAS 17', 'musas17', {'fecha_apertura': '2025-11-30',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia: la primera nota, 30/11/2025, de Carlos Garcia: "crear carpeta, necesito viabilidad"). Contacta: EFFIC (sin persona en la ficha). Tipo de '
                    'obra: ASCENSOR. CP 28022. HE enviada por Alejandra el 08/01/2026. Hay modelo 3D (ene-2026). Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), n=fijar('musas17', 2025, otros={1: ('2026-01-08', 'En la ficha pone 8/1/2025, pero va despues de la nota del 30/11/2025 y la ficha y el modelo 3D son de ene-2026: errata de ano.')}),
    captador=CARLOS, lleva=ALVARO)

# ================================================================= 2. MONTE IGUELDO 123 (opp ya escrita en la tanda A): solo dos notas nuevas, con interruptor
if IGUELDO_NOTAS:
    ya = [x['fecha'] for x in b.leer('notas_oportunidad?select=fecha&oportunidad_id=eq.' + IGUELDO)]
    t_ig = _notas_de('montehigueldo123', 2026); assert len(t_ig) == 1 and t_ig[0][0] is None, t_ig
    t_ig = t_ig[0][1]; k = t_ig.index('HOJA E. E INFORME')
    DE = '\n\n(De la carpeta "montehigueldo123", tercera carpeta de esta oportunidad; %s)'
    nig = [('2026-02-17', t_ig[k:].strip() + DE % 'la fecha va dentro de la nota.'),
           ('2026-03-09', t_ig[:k].strip() + DE % 'correo de Vanesa (Del Brio y Blanco) del 9 de marzo de 2026, reenviado.')]
    filas = [{'oportunidad_id': IGUELDO, 'fecha': f, 'texto': t, 'origen': 'ficha_dropbox'} for f, t in nig if f not in ya]
    if filas: ins('notas_oportunidad', filas)

# ================================================================= 3. CLON
REVS = [
    ('mesondeparedes90', '2024-07-24', 'MARIA JOSE (ATIKO)', None, None,
     'MESON DE PAREDES 90 MADRID. Fecha: 07/2024 (dia: la unica nota, 24/07/2024). Paga: la CP. Tipo de obra: ASCENSOR CON BAJADA A COTA CERO. Distrito Centro. CP 28012. '
     'En produccion hay "MESON DE PAREDES 80" (con su propia carpeta mesondeparedes80); no se casa con esta. La carpeta solo tiene la ficha.\n\n' + crudo('mesondeparedes90', 2024)),
    ('millanastray21a37', '2022-10-24', 'MADRE DE SOFIA', None, None,
     'CALLE MILLAN ASTRAY 21 a 37 MADRID. Fecha: 10/2022 (dia: la primera nota, 24/10/2022). Tipo de obra: SATE + AEROTERMIA, enviado a Iberdrola (en la carpeta, formulario y presentacion '
     'de Iberdrola de nov-2022 y mar-2023, y la oferta de la competencia, SERYMA, de abr-2023). Distrito Latina. CP 28044. Presidenta (en la nota, vicepresidenta): Pilar Moreno '
     '(629 01 71 20; pilarmorenoteacher@yahoo.es).\n\n' + crudo('millanastray21a37', 2022)),
    ('mirlo12', '2025-02-12', 'ESTHER RODRIGUEZ (MERINO)', None, None,
     'MIRLO 12 MADRID. Fecha: 02/2025 (dia: la primera nota, 12/02/2025). Tipo de obra: SATE PRY, DF Y SUBV. Distrito Latina. CP 28024. Administracion: MERINO (Sedano 30, 28024; Esther '
     'Rodriguez, 91 259 97 96, e.rodriguez@merinosyf.com). En la carpeta, la documentacion recibida (wetransfer, may-2025).\n\n' + crudo('mirlo12', 2025)),
    ('modestolafuente2', '2023-07-21', 'PASCAL Y MANGEL (NATUR HOME)', None, None,
     'MODESTO LAFUENTE 2 MADRID. Fecha: 08/2023 (la unica nota es del 21/07/2023; se toma esa). Empresa/cliente: NATUR HOME - no esta en la agenda. Distrito Chamberi. CP 28010. '
     'La carpeta solo tiene la ficha.\n\n' + crudo('modestolafuente2', 2023)),
    ('modestolafuente21', '2019-11-29', None, None, '1070204VK4717A',
     'MODESTO LAFUENTE 21 MADRID. Fecha: la ficha no la trae; 11/2019 (dia: las fotos, 29/11/2019). Ficha casi vacia: CP 28003; fachada 47,75 m; NZ 1 grado 5o; distrito Chamberi; barrio '
     'Rios Rosas. En la carpeta, planos de proyecto (AL/AP, dic-2019) y un dwg "modestodelafuente22paraLUIS". La ficha no tiene notas.'),
    ('modestolafuente5', '2024-02-08', 'TOMAS MORELL (ELECNOR)', None, None,
     'MODESTO LAFUENTE 5 MADRID. Fecha: 02/2024 (dia: la unica nota, 08/02/2024). Tipo de obra: INFORME PATRIMONIO (encargo de Elecnor). Hay dos fichas: una en blanco y una "copia en '
     'conflicto" con los datos; se usa esta.\n\n' + crudo(MLF5, 2024)),
    ('molina63', '2017-05-16', 'ANTONIO MIRA (ANYLOR)', None, None,
     'MOLINA 63 MADRID. Fecha: 16/05/2017 (la de la ficha). En "agente comercial": "ROLLO DE ANTONIO ANYLOR CON OTRO PROYECTO": Antonio Mira pide a Daniel ayuda para contestar el '
     'requerimiento de un proyecto suyo (planos visados, requerimiento y anexo, may-2017). La ficha no tiene mas datos.\n\nLo escrito en la ficha (sin cabecera de notas):\n' + bloque('molina63', 85, 106)),
    ('monfortedelemos151', '2016-06-21', 'ANTONIO MIRA (ANYLOR)', None, '9511707VK3891B',
     'C/ MONFORTE DE LEMOS 151 MADRID. Fecha: 21/06/2016 (la de la ficha; los primeros ficheros, croquis y planos, son del 05/07/2016). Tipo de obra: ELIMINACION DE BARRERAS '
     'ARQUITECTONICAS ADECUANDO LOS ASCENSORES Y PORTAL EXISTENTES (obras de reestructuracion puntual). Propiedad: ASCENSORES PLAMBER S.A. (A28986453; representante David Berrocal Burgos, '
     '46851467F). CP 28029. Fachada 14,17 m. Junta de Fuencarral-El Pardo: expediente 108/2016/05868 (registro 20160912343, 25/10/2016; procedimiento ordinario comun); licencia '
     'concedida 25/04/2017. PROYECTO HECHO Y OBRA TERMINADA: en la carpeta, modificacion del salvaescaleras (oct-2017), certificado final de obra visado e informe final (jun-2018). '
     'En produccion hay "MONFORTE DE LEMOS 169" (otra parcela, 9511705VK3891A); no se casa con esta. La ficha no tiene notas.'),
    ('montejurra13', '2018-02-09', 'ANDRES (ENGWE)', None, None,
     'C/ MONTEJURRA 13 MADRID. Fecha: 09/02/2018 (la de la ficha). Distrito Ciudad Lineal. Ficha vacia; hay croquis y plano de escalera (mar-2018).'),
    ('montesdebarbanza5', '2024-12-02', 'JOSE MARIA (GUERRERO DADILLOS)', None, None,
     'MONTES DE BARBANZA 5 MADRID. Fecha: 12/2024 (dia: la primera nota con fecha, la visita del 02/12/2024). Tipo de obra: RENOVAR ASCENSORES (el secretario de la comunidad tiene una silla '
     'electrica que no cabe en la cabina; TKE les ha dado presupuesto de ascensor nuevo). Distrito en la ficha: Vallecas. CP 28031. Viene de Jose Maria (administracion Guerrero Dadillos), '
     'por Puerto de Alazores 11. Presidente: Diego (619 336 435). La carpeta solo tiene la ficha.\n\n'
     + cl('montesdebarbanza5', 2024, ('2024-12-02', 'Correo de Jose Maria (Guerrero Dadillos), sin fecha; va antes de la visita del 02/12/2024.'))),
    ('moralzarzal100', '2025-01-09', 'JAVIER RODRIGUEZ MARTIN (SCHINDLER)', None, None,
     'MORALZARZAL 100 MADRID. Fecha: 01/2025 (dia: el correo de Javier Rodriguez, jueves 9 de enero de 2025). Tipo de obra: MODIFICACION DE 4 ASCENSORES Y SUSTITUCION DE 2 MONTACARGAS '
     '(dos HE con DF, 15/01/2025; paga la comunidad, pero se manda a Javier). Distrito Fuencarral-El Pardo. CP 28034. La carpeta solo tiene la ficha.\n\n'
     + cl('moralzarzal100', 2025, ('2025-01-09', 'Correo de Javier Rodriguez Martin (Schindler) del jueves 9 de enero de 2025.'))),
    ('morando2', '2016-04-04', 'ANTONIO MIRA (ANYLOR)', None, None,
     'CALLE MORANDO 2 MADRID. Fecha: 04/04/2016 (la de la ficha; las fotos de Anylor por WhatsApp son de ese dia). Ficha vacia; hay croquis, fotos y borrador de escalera (abr-2016).'),
    ('muller31', '2021-05-11', 'VICENTE (FAIN)', None, None,
     'C/ MULLER 31 MADRID. Fecha: 12/05/2021 en la ficha; la foto de la visita es del 11/05/2021. Ficha vacia; hay fotos, plano, seccion y modelo (may-2021).'),
    ('musas21', '2024-03-11', 'JAVIER VELASCO (ELECNOR)', None, None,
     'MUSAS 21 MADRID. Fecha: la ficha dice 04/2024, pero la visita con Ana Encinas es del 11/03/2024; se toma esa. Tipo de obra: ASCENSOR CON DERRIBO (y una rampa a la entrada). '
     'Distrito San Blas-Canillejas. CP 28028. La carpeta solo tiene la ficha.\n\n' + crudo('musas21', 2024))]
for carp, fecha, trajo, cif, ref, t in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV)
for carp, fecha, trajo, t in [
        ('mezquita18', '2015-10-30', None, 'MEZQUITA 18 MADRID. Carpeta SIN ficha de datos: planos y presupuesto (oct-2015).'),
        ('miraelrioalta13', '2017-08-28', None, 'MIRA EL RIO ALTA 13 MADRID. Carpeta SIN ficha de datos (solo un acceso directo a una ficha): croquis, plano y presupuesto (ago-2017).'),
        ('miralsol8', '2017-04-10', 'PEDRO ARANDA (THYSSEN)', 'C/ MIRA AL SOL 8 MADRID. Fecha: 10/04/2017. Ficha vacia; hay croquis y presupuesto (abr-may 2017).'),
        ('monteleon18', '2016-05-12', 'LUIS MIGUEL NUNES (THYSSEN)', 'CALLE MONTE LEON 18 MADRID. Fecha: 17/06/2016 en la ficha; las fotos de la visita son del 12/05/2016. '
         'Ficha vacia; hay fotos, croquis, planos y oferta (may-jun 2016).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)
# montehigueldo123: SIN fila. Es la misma oportunidad que "AVDA MONTE IGUELDO 123" (produccion, ya escrita en la tanda A con las carpetas avmonteigueldo123 y avmonteigueldo23).

# ================================================================= 4. MANIAS
mania('Escaleras en la licencia del ascensor: tras hablarlo con sus superiores, la tecnica ya no acepta justificar la escalera comprobando cada escalon por separado; '
      'pide modificar la solucion (ojo egipcio) y meterla como aporte voluntario.', 'Junta Municipal de Distrito de Puente de Vallecas', '2022-03-17', MDR,
      clave='mdr18', trozo='ojo egipcio', tecnico='Helena Garcia')
mania('La Junta no guarda antecedentes de los edificios: la solicitud de antecedentes la envia de oficio al Archivo de la Villa.', 'Junta Municipal de Distrito de Carabanchel',
      '2024-11-18', 'monseñoroscarromero6', clave='mor6', trozo='ARCHIVO DE LA VILLA')

resumen()
