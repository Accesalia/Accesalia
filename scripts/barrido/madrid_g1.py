# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda G1 (gabrielusera56 .. gilimon5, 39 carpetas [0:39]). 7-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de, _lineas

DELBRIO = '46b4fe1f-0534-434f-ae7c-cc098fde82cd'; ELEVALIA = 'bc4dcb87-904c-4476-9329-ca3b4a140abe'
CIUDADLINEAL = 'c9d678a9-96d2-4cf1-ba5e-5f30bfd71eed'; CARABANCHEL = '5b552d60-056c-42cf-a170-359fb05c7ff5'
PU.update(tamara='8febb3c0-36bf-427d-81ae-fe4c352aca05', isaac='e5abf29a-a25f-4c87-8705-6dc523285e1f', carmen_dbb='99d79d86-6a38-43ed-949d-711e29fadbb5',
          cecilio='29f04826-a533-4514-be1e-4be43ecdc007', vdelpino='1fc4895c-fded-4722-9805-e322bc1976b0', paranda='0a2fcfe0-3f8e-417d-a49e-1de02e8ecd1a',
          ldavila='b6bc8f23-5fd3-41aa-b3c8-b7d2e414ced1', ofernandez_fain='984ff96b-2f48-414b-a89e-bb207367ae4c', diego='5a253cf3-33c2-433d-ab56-7eb65aaf2abe')
F128 = 'generalricardos128/FICHA DE DATOS ACCESALIA.docx'   # ficha del modelo antiguo: sus notas no llevan cabecera "NOTAS"


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


def admin_empresa(cid, empresa):
    if not b.leer('comunidad_admin_responsable?select=id&vigente=eq.true&comunidad_id=eq.' + cid):
        ins('comunidad_admin_responsable', [{'comunidad_id': cid, 'empresa_id': empresa, 'puesto_id': None, 'vigente': True}])


def correo_a(puesto, email, principal=False):
    """correo nuevo en un puesto que YA existe (si el correo no esta ya en la agenda)."""
    if not b.leer('correo?select=id&email=ilike.' + quote(email)):
        ins('correo', [{'puesto_id': puesto, 'email': email, 'etiqueta': 'general', 'principal': principal}])


def motivo(n, i, m):
    """anade el motivo a la nota i (la fecha ya la puso partir)."""
    f, t = n[i]; n[i] = (f, t + '\n\n(' + m + ')'); return n


def bloque(c, i, j):
    """lineas i..j (incluidas) de la ficha, sin las vacias."""
    return '\n'.join(l for l in _lineas(c)[i:j + 1] if l.strip()).strip()


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
cl = lambda c, a, s=None: J(fijar(c, a, s))

# ================================================================= 0. AGENDA (solo en empresas, contratas y organismos que ya existen; ninguna junta nueva)
persona_nueva('Miguel Ángel', 'Jiménez', 'administrador', '634391846', None, empresa=MANDATARIA,
              notas_='Mandataria: administrador de Gandhi 21 desde feb-2025 (carpeta gandhi21); el asunto lo lleva Tamara.')
persona_nueva('Miguel Ángel', 'Pizarro', 'técnico', None, 'pizarrogma@madrid.es', organismo=CIUDADLINEAL,
              notas_='Junta de Ciudad Lineal: tecnico de la licencia del ascensor de Gandhi 21 (expediente 116/2021/02464).')
persona_nueva('Margarita', 'Mato', None, None, 'matogmm@madrid.es', organismo=CARABANCHEL,
              notas_='Junta de Carabanchel: a ella se manda por correo el proyecto y el justificante de registro para que lo agilice (General Ricardos 92, nov-2021).')
persona_nueva('María Elena', 'Calvo Aguado', 'gestor de cuentas', '686770784', 'maria.calvo@thyssenkrupp.com', contrata=TKE,
              notas_='Thyssenkrupp (hoy TKE), Delegacion Madrid Centro-Sur: gestiona la oferta de General Diaz Porlier 27 (2016).')
persona_nueva('Juan Manuel', 'Caballin', None, '618159167', None, contrata=ELEVALIA,
              notas_='Elevalia: contacto de Galiana 28 (2016; carpeta galiana28).')
correo_a(PU['paranda'], 'pedro.aranda@thyssenkrupp.com')   # Pedro Aranda, su correo de Thyssen (General Ricardos 128)

# ================================================================= 1. PRODUCCION (13)
rellenar('gu56', 'GABRIEL USERA 56', 'gabrielusera56', {'fecha_apertura': '2026-05-21',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: el del escaneo 3D). Contacta: Jose Luis, de la administracion (627 419 141; Jose10861@gmail.com) - no esta en la agenda. '
                    'Tipo de obra: ASCENSOR Y SATE. Hay escaneo 3D. La ficha no tiene notas. Comercial interno: ALVARO.'},
    ('ascensor', 'sate'), captador=ALVARO, lleva=ALVARO)

n = fijar('gandhi21', 2022, otros={0: ('2022-01-26', 'Sin fecha delante; va con la cita en el Ayuntamiento del 26/01/22.')})
n = motivo(partir(n, 1, 'Sept2022', '2022-09-01'), 2, 'Dia desconocido: "Sept2022".')
n = motivo(partir(n, 3, 'Febrero 2023', '2023-02-01'), 4, 'Dia desconocido: "Febrero 2023".')
rellenar('gan21', 'GANDHI 21', 'gandhi21', {'fecha_apertura': '2021-02-24',
    'origen_notas': 'Fecha de llegada: la ficha dice xx/2021; 02/2021 (dia: el primer fichero, la denegacion de la licencia del proyecto de VELERDA / INVER, 24/02/2021; el 25/02/2021 '
                    'llega el paquete "22.-" de INVER con emails, presupuesto, proyecto y solicitud). Contacta: la comunidad, a traves de la contrata (INVER y despues ELECNOR). Tipo de obra: ASCENSOR '
                    '(el proyecto de Velerda para INVER tuvo la licencia denegada; Accesalia lo rehace: replanteo con instrucciones del tecnico del Ayuntamiento y nuevo registro el 09/02/22; '
                    'la licencia llega en sept-2022). Barrio: Pueblo Nuevo. Tecnico: Dennis. PEM 109.237,82. Expediente y licencia 116/2021/02464. Junta de Ciudad Lineal: tecnico Miguel Angel Pizarro '
                    '(pizarrogma@madrid.es). Administracion: CANDELAS Y OVIEDO (Juan Carlos Candelas Torres; tachada en la ficha) y, desde enero 2023, MANDATARIA (Tamara, 634 355 852; 914 078 700 / '
                    '91 260 21 32; facturas@mandataria.com; javier@mandataria.com tachado); administrador a febrero 2025: Miguel Angel Jimenez (634 39 18 46). En sep-2022 Daniel Navarro dice que '
                    'no tienen contrato con esta comunidad; en may-2025 Elecnor ha renunciado y la obra la ha hecho la empresa RAV (609 38 53 30; ravprosl@gmail.com - no esta en la agenda) con su '
                    'propio arquitecto; para visar el fin de obra necesitan la venia de Daniel. En ago-2026 se pide al administrador el CFO para nuestro archivo. La ficha no dice comercial interno; '
                    'la lleva Daniel.'},
    ('ascensor',), n=n)

n = fijar('garciadeparedes44', 2024, ('2024-12-17', 'Correo de Isaac Pizarroso (Gestin) del martes 17 de diciembre de 2024, el dia de la visita de Daniel.'))
n = motivo(partir(n, 2, 'Daniel: Se instalará', '2025-10-30'), 3, 'Sin fecha; la propuesta de Daniel para la HE e informe de viabilidad del 30/10/2025.')
rellenar('gdp44', 'GARCIA DE PAREDES 44', 'garciadeparedes44', {'fecha_apertura': '2024-12-17', 'referencia_catastral': '0866907VK4706F',
    'origen_notas': 'Fecha de llegada: 12/2024 (dia: el correo del administrador del 17/12/2024, el dia de la visita de Daniel con Maria Jesus Calvo, vecina). Contacta: el administrador, Isaac '
                    'Pizarroso (GESTIN SAP). Tipo de obra: INSTALACION DE ELEVADOR (PLATAFORMA VERTICAL) y modificacion del ascensor actual con foso reducido: proyecto de accesibilidad completa '
                    '(plataforma con doble embarque a 90 en la entrada y pasarela sobre la rampa); tras la junta del 11/12/2025, coste de obra 150.000 + IVA. HE recibida firmada 15/12/2025. '
                    'Barrio: Almagro. Tecnico: Carlos. Ano 1960. DR por ECU (ACTECU): en may-2026 la ECU pide rehacer el proyecto con otra solucion (Full Space busca una plataforma especial); '
                    'en jul-2026 consulta urbanistica sobre soluciones prestacionales; proyecto modificado enviado 23/09/2026. Subvenciones: Adapta (accesibilidad) y Rehabilitacion por separado '
                    '(hacen falta mediciones completa, solo plataforma y solo ascensor). Presidente: Borja de la Rosa Castrillo (618 425 835; borjacastrillo@gmail.com). Conserje: Jose Luis Nova, '
                    '659 965 216. Ascensorista propuesto: Oscar Lopez (FAIN; en la ficha "oscar CEGA" tachado). La ficha no dice comercial interno; la lleva Daniel.'},
    ('plataforma', 'modificacion_asc', 'accesibilidad', 'subvenciones', 'consulta_urbanistica'), n=n,
    comunidad={'iban': 'ES57 0081 0098 7500 0211 5421'}, presi=('BORJA DE LA ROSA CASTRILLO', 'presidente', '618425835', '12424313N', 'borjacastrillo@gmail.com'), trae_pu=PU['isaac'])
# en produccion el presidente se llama "BORJA DE LA ROSA" y su correo lleva el apellido pegado delante ("castrilloborjacastrillo@gmail.com")
arreglar_pc(OPP['gdp44'][0]['id'], 'rol=eq.presidente&email=eq.castrilloborjacastrillo@gmail.com', {'nombre': 'BORJA DE LA ROSA CASTRILLO', 'email': 'borjacastrillo@gmail.com'})
pc(OPP['gdp44'][0]['id'], 'JOSE LUIS NOVA', 'otro', '659965216', None, None, 'Conserje de la comunidad.')

rellenar('gl43', 'GARCIA LLAMAS 43', 'garciallamas43', {'fecha_apertura': '2024-05-08', 'referencia_catastral': '3209911VK4730G',
    'origen_notas': 'Fecha de llegada: 05/2024 (dia: la primera nota, el correo del 08/05/2024: filtraciones importantes por la cubierta; la presidenta pregunta por subvenciones; hay 3 vecinos con '
                    'discapacidad). Contacta: Carmen Garcia (DEL BRIO Y BLANCO). Tipo de obra: MEMORIA VALORADA DE CUBIERTA (humedades); de momento sin subvenciones; DR por AYUNTAMIENTO, no por ECU. '
                    'Posible proyecto completo en septiembre. Tecnico: Jonatan. Constructora: ROSERSESE (sus mediciones); han elegido el presupuesto de Olivares. Presidenta: Maria Jesus Diaz Galan '
                    '(608 207 326); su hermano Jesus (3o 2), 650 40 23 71. La ficha no dice comercial interno; la lleva Daniel.'},
    ('memoria_valorada', 'arreglo_cubierta'), n=fijar('garciallamas43', 2024),
    comunidad={'iban': 'ES58 2100 2579 1613 0024 1808'}, presi=('MARIA JESUS DIAZ GALAN', 'presidente', '608207326', '51892515F'), trae_pu=PU['carmen_dbb'])
pc(OPP['gl43'][0]['id'], 'JESUS', 'vecino', '650402371', None, None, 'Hermano de la presidenta (3o 2).')

rellenar('gl45', 'GARCIA LLAMAS 45', 'garciallamas45', {'fecha_apertura': '2026-03-23',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia: la primera foto, de WhatsApp, 23/03/2026; el escaneo 3D es del 24/03/2026). Contacta: AURA (la ficha no dice quien es; no esta en la agenda). '
                    'Administracion: DEL BRIO Y BLANCO. Tipo de obra: la ficha no lo dice. IV/HE enviados 26/03/2026. Comercial interno: ALVARO.'},
    (), n=fijar('garciallamas45', 2026, otros={0: ('2026-03-26', 'Sin fecha delante; la fecha va dentro.')}), captador=ALVARO, lleva=ALVARO)
admin_empresa(OPP['gl45'][0]['id'], DELBRIO)

n = partir(fijar('gaztambide26', 2026, ('2026-06-11', 'Correo de Jican Ascensores del 11 de junio de 2026.')), 1, '-17-06-26', '2026-06-17')
rellenar('gz26', 'GAZTAMBIDE 26', 'gaztambide26', {'fecha_apertura': '2026-06-11',
    'origen_notas': 'Fecha de llegada: 06/2026 (dia: el correo de Jican del 11/06/2026). Contacta: Cecilio (JICAN ASCENSORES; 639 223 819; 914 652 963). Tipo de obra: MODIFICACION DE ASCENSOR: '
                    'apertura de hueco en la planta primera, hoy ciega, para que el ascensor izquierdo de servicio a esa planta (puerta semiautomatica de 700 mm de paso libre, apertura izquierda); '
                    'proyecto y licencia o declaracion responsable. HE enviada 17-06-26. Comercial interno: DANIEL.'},
    ('modificacion_asc', 'anadir_parada'), n=n, trae_pu=PU['cecilio'])

h128 = [bloque(F128, 111, 111), bloque(F128, 118, 145)]
assert bloque(F128, 151, 151) == '23/06/2023' and bloque(F128, 166, 166).startswith('08-04-2025'), 'ficha de General Ricardos 128 movida'
n = [('2020-11-27', bloque(F128, 147, 149) + '\n\n(Sin fecha delante; la fecha va debajo: "Fecha de 27/11/2020".)'),
     ('2022-03-01', bloque(F128, 102, 108) + '\n\n(Dia desconocido: "A MARZO 2022".)'),
     ('2023-06-23', bloque(F128, 152, 163)), ('2025-04-08', bloque(F128, 166, 166))]
rellenar('gr128', 'GENERAL RICARDOS 128', 'generalricardos128', {'fecha_apertura': '2016-03-11', 'referencia_catastral': '8216601VK3781E',
    'origen_notas': 'Fecha de llegada: 03/2016 (dia: la fecha de inicio de la ficha, 11/03/2016; los primeros croquis y la oferta son del 30/03/2016). Contacta: Pedro Aranda (THYSSEN, hoy TKE). '
                    'Tipo de obra: ASCENSOR (hidraulico de piston lateral, 450 kg / 5 personas; consulta urbanistica presentada en nov-2016). Contrato 117.400 + IVA. PEM 98.655. Fachada 17,8 m. '
                    'Junta de Carabanchel: expediente 111/2019/36 (tecnica Sara Paton) y 111/2020/02208 (Ana Ferrero; licencia del 18/04/2022). Servicio de Medio Ambiente y Escena Urbana del distrito: '
                    'miercoles de 9 a 11 con cita previa (citatecnicarabanchel@madrid.es / 915 132 110); licencias del distrito: 91 588 71 08, licyautocarabanchel@madrid.es. '
                    'Administracion: ADMONPATRIMONIOS SL (Marco Rodriguez, info@admonpatrimonios.es; dada de alta en el barrido, Monica 7-oct-2026); antes LSD ASESORES (Antonio Anton Roman, anton@lsd-asesores.es) y, '
                    'desde junio 2023, ESTUDIO GESTION (Mila), ambas tachadas en la ficha. Presidente 2025: Jose Carlos Sobrino Perez (695 412 814; sobrinopjc@madrid.es); antes, el de '
                    'Jtcubero@hotmail.com (desde junio 2023, tachado) y Marta Martin-Preciado Ortega (4o Centro; martamp564@gmail.com; DNI 50206845F), cuyo marido, Raul Pascual Alonso '
                    '(r.pascual@live.com; 649 92 84 16), era la persona de contacto. Inquilino del local de las cocinas: Raul Gimeno, 914 727 109. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'consulta_urbanistica'), n=n, huecos=h128, comunidad={'cif_comunidad': 'H79846564'},
    presi=('JOSE CARLOS SOBRINO PEREZ', 'presidente', '695412814', '00678943Y', 'sobrinopjc@madrid.es'), trae_pu=PU['paranda'])
EGESTION = b.leer('puesto?select=empresa_id&id=eq.' + PU['mila'])[0]['empresa_id']
for a in b.leer('comunidad_admin_responsable?select=id&vigente=eq.true&empresa_id=eq.%s&comunidad_id=eq.%s' % (EGESTION, OPP['gr128'][0]['id'])):
    act('comunidad_admin_responsable?id=eq.' + a['id'], {'vigente': False,
        'notas': 'En la ficha de Dropbox, Estudio Gestion (Mila) esta tachada; el nuevo administrador es ADMONPATRIMONIOS SL; el 08-04-2025 se pide el acta de cambio '
                 'de administrador (Monica, 7-oct-2026).'})
# ADMONPATRIMONIOS: administracion nueva, alta con el OK de Monica (7-oct-2026): 'no es una opp, sino una admin; la damos de alta y lo dejamos hecho correctamente'.
ADMONP = (b.leer('empresa?select=id&nombre_accesalia=eq.ADMONPATRIMONIOS') or [{'id': None}])[0]['id']
if not ADMONP:
    ADMONP = nuevo_id()
    ins('empresa', [{'id': ADMONP, 'nombre_accesalia': 'ADMONPATRIMONIOS', 'nombre_legal': 'ADMONPATRIMONIOS, SL', 'tipo': 'administracion_fincas', 'activa': True, 'comercial_id': DANIEL,
                     'notas': 'Alta en el barrido de Madrid (General Ricardos 128; Monica, 7-oct-2026).'}])
MARCO = persona_nueva('Marco', 'Rodríguez', 'administrador', None, 'info@admonpatrimonios.es', empresa=ADMONP, notas_='ADMONPATRIMONIOS: administrador de General Ricardos 128 (2025).')
admin(OPP['gr128'][0]['id'], MARCO)

n = partir(fijar('generalricardos238', 2025, otros={0: ('2025-12-09', '')}), 0, 'DANIEL:', '2025-12-26')
n = motivo(motivo(n, 0, 'Correo de Victor del Pino (Arquiobras) del 9 de diciembre de 2025.'), 1, 'Sin fecha; la propuesta de Daniel para la HE con viabilidad del 26/12/2025.')
n = partir(n, 5, 'Emilio Moreno <emiliomoreno@gestin.es>', '2026-04-24')
rellenar('gr238', 'GENERAL RICARDOS 238', 'generalricardos238', {'fecha_apertura': '2025-12-09', 'referencia_catastral': '7209812VK3770G',
    'origen_notas': 'Fecha de llegada: 12/2025 (dia: el correo de Victor del Pino del 09/12/2025). Contacta: Victor del Pino (ARQUIOBRAS), que lo vio hace dos anos y quiere ofertar la obra '
                    '(es muy amigo de uno de sus electricos); contacto en la comunidad: Francisco, 685 646 688, franciscobravobravojaen777@gmail.com (el correo hablaba del 234; el vecino dice que es el 238). '
                    'Tipo de obra: ASC + SUBV: A) derribo completo de escalera con torre para ascensor de 4 paradas y 6 personas, plataforma en el patio y pasarela (PEM 230.000 + IVA); B) elevador '
                    'por hueco de escalera (170.000 + IVA). Barrio: Vista Alegre. Tecnico: Alejo. Fecha encargo: 26/03/2026 (HE firmada; pago en 5 plazos). DR por ECU (ACTECU). PEM 122.512,14. '
                    'Superficie 132,04. Administracion: GESTIN SAP (Emilio Moreno). Comision de seguimiento: Carmen Juarez (637 57 43 58) y Francisco Jose Perez Martin (637 59 84 41). En ago-2026 la '
                    'comunidad pide pausar la tramitacion: aun no ha decidido que opcion ejecutar. Comercial interno: DANIEL.'},
    ('ascensor', 'subvenciones'), n=n, comunidad={'iban': 'ES76 0081 0216 7800 0183 5492'},
    presi=('MARIA RAQUEL FIGUEROA GARCIA', 'presidente', None, '50035944L'), trae_pu=PU['vdelpino'])
pc(OPP['gr238'][0]['id'], 'FRANCISCO', 'otro', '685646688', None, 'franciscobravobravojaen777@gmail.com', 'Persona de contacto de la comunidad (vecino, mayor y jubilado; correo de Arquiobras del 09/12/2025).')
pc(OPP['gr238'][0]['id'], 'CARMEN JUAREZ', 'otro', '637574358', None, None, 'Comision de seguimiento del ascensor (correo de Gestin del 24/04/2026).')
pc(OPP['gr238'][0]['id'], 'FRANCISCO JOSE PEREZ MARTIN', 'otro', '637598441', None, None, 'Comision de seguimiento del ascensor (correo de Gestin del 24/04/2026).')

n = fijar('generalricardos92', 2021, otros={0: ('2021-11-10', '')})
n = partir(partir(partir(n, 0, 'Ojo Daniel se comprometió', '2021-12-16'), 1, 'En enero 2022', '2022-01-01'), 2, 'Ana hablado con Mónica', '2022-02-24')
for i, m in enumerate(['Sin fecha delante; la fecha va dentro: "10-11-21".', 'La fecha va dentro: "(ana 16/12/21)".', 'Dia desconocido: "En enero 2022".',
                       'La fecha va dentro: en la ficha "24/02/222" (errata: 2022).']):
    n = motivo(n, i, m)
rellenar('gr92', 'GENERAL RICARDOS 92', 'generalricardos92', {'fecha_apertura': '2021-02-24', 'referencia_catastral': '8518117VK3781H',
    'origen_notas': 'Fecha de llegada: la ficha dice 11/2021 (cuando entra Elecnor); 02/2021 (dia: el primer fichero propio, la incidencia del proyecto de VELERDA, 24/02/2021; el 25/02/2021 llega el '
                    'paquete "42.-" de INVER con emails, presupuesto, proyecto visado y solicitud, y el 03/03/2021 hay un justificante de aplazamiento; los ficheros de 2020 son de INVER). '
                    'Contacta: ELECNOR (Ibai Calonge -> Lucia Davila). Tipo de obra: ASCENSOR: el proyecto de Velerda hay que hacerlo entero de nuevo, mediciones incluidas; la comunidad acepta que lo '
                    'hagamos por el mismo importe menos los 3.000 EUR que ya pagaron (proyecto original unos 171.000 EUR; en el archivo, 131.000 EUR). En jun-2022 se les ofrece la subvencion. '
                    'Barrio: San Isidro. Tecnico: Enrique. Fecha encargo: 17/11/2021 (reunion con la comunidad para cerrar el proyecto de Elecnor). Jefe de obra: Maria Martinez. PEM 118.242,06. '
                    'Expediente 111/2019/04549 (el antiguo: se usa el mismo para aprovechar las tasas pagadas; procedimiento ordinario comun). CFO visado TL/019306/2024. Junta de Carabanchel: el proyecto '
                    'y el justificante de registro se mandan por correo a Margarita Mato (matogmm@madrid.es) para que lo agilice. Administracion: FINCAS ESTEBAN (Antonio Esteban). Presidente: '
                    'Julian Pena Torrijos (jupeto5@hotmail.com). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'cfo'), n=n, presi=('Julián Peña Torrijos', 'presidente', None, '03893052A', 'jupeto5@hotmail.com'), trae_pu=PU['ldavila'])

rellenar('gso1', 'GENERAL SERRANO ORIVE 1', 'generalserranoorive1', {'fecha_apertura': '2026-05-14', 'referencia_catastral': '9919706VK3791H',
    'origen_notas': 'Fecha de llegada: 05/2026 (dia: el del escaneo 3D, 14/05/2026; las actas de nombramiento del presidente y de aprobacion del ascensor tienen fecha de fichero 14/02/2026). '
                    'Contacta: Maria, vecina (mariamarialinan@gmail.com); el que lleva todo el tema es Jesus, vecino (658 830 736): se encargo de la visita y de los datos; el presidente no se involucra mucho. '
                    'Paga la comunidad. Tipo de obra: ASCENSOR + SUBV. Fecha encargo: 17/08/2026. Ano 1973. Administracion: solo un correo, aima_sl@yahoo.es - no esta en la agenda. Presidente: Miguel '
                    'Martinez Marcelino (miguemmb@hotmail.com). Contacto: Calixto Rodriguez (calixtorodriguezalvarez@gmail.com). IV y HE enviados 18/05/2026. Comercial interno: ALVARO.'},
    ('ascensor', 'subvenciones'), n=fijar('generalserranoorive1', 2026, otros={0: ('2026-05-18', 'Sin fecha delante; la fecha va dentro.')}),
    comunidad={'iban': 'ES78 0081 7122 5600 0131 3433', 'cif_comunidad': 'H80639099'},
    presi=('MIGUEL MARTINEZ MARCELINO', 'presidente', None, None, 'miguemmb@hotmail.com'), captador=ALVARO, lleva=ALVARO)
pc(OPP['gso1'][0]['id'], 'MARIA', 'vecino', None, None, 'mariamarialinan@gmail.com', 'Vecina; contacta (quien contacta en la ficha).')
pc(OPP['gso1'][0]['id'], 'JESUS', 'vecino', '658830736', None, None, 'Vecino; lleva todo el tema (se encargo de la visita y de los datos).')
pc(OPP['gso1'][0]['id'], 'CALIXTO RODRIGUEZ', 'otro', None, None, 'calixtorodriguezalvarez@gmail.com', 'Persona de contacto de la comunidad en la ficha.')

rellenar('gc49', 'GERARDO CORDON 49', 'gerardocordon49', {'fecha_apertura': '2019-12-16', 'referencia_catastral': '4756235VK4745F',
    'origen_notas': 'Fecha de llegada: 12/2019 (dia: el primer fichero, el render del 16/12/2019). Contacta: REHABILITACIONES INVER (la contrata, que quebro) y despues ELECNOR. Tipo de obra: '
                    'INSTALACION DE ASCENSOR (el proyecto se contrato via INVER, que no llego a pagar nada; en mar-2022 la junta de gobierno estudia otras soluciones que no sean por escalera; en 2026 '
                    'se retoma con Elecnor: refundido 06/03/2026 por indicacion del Ayuntamiento, proyecto completo rehecho en Revit y enviado 30/06/2026; HE de DF y CSS enviada 09-07-26). '
                    'Barrio: Ventas. Tecnico: Jhonatan (refundido). Fecha encargo: 26/02/2024. Ano 1960. PEM 120.678,99. Expediente 116/2020/03178. Junta de Ciudad Lineal: tecnico Eduardo Seco. '
                    'Administracion: MARTINEZ LIRIA (Eva; 91 726 52 34 / 917 269 992 / 607 869 079). Presidente: Vicente Ortega Luis. Comision de obras: Azucena Monje (686 712 946; '
                    'azucena22es@yahoo.es). Vecino: Eusebio Gonzalez Dominguez (2o C; 913 262 249; Rosamariagp@hotmail.com, "Hablado con Rosa Maria (esposa?)"). La ficha no dice comercial interno; '
                    'la lleva Daniel.'},
    ('ascensor', 'df', 'css'), n=fijar('gerardocordon49', 2021, otros={0: ('2021-10-15', 'Sin fecha delante; la fecha va dentro: "justificante 15102021".')}))
pc(OPP['gc49'][0]['id'], 'AZUCENA MONJE', 'otro', '686712946', None, 'azucena22es@yahoo.es', 'Comision de obras de la comunidad.')
pc(OPP['gc49'][0]['id'], 'EUSEBIO GONZALEZ DOMINGUEZ', 'vecino', '913262249', None, None, '2o C. En la ficha, junto a el: Rosamariagp@hotmail.com, "Hablado con Rosa Maria (esposa?)".')

n = partir(fijar('germanperezcarrasco54', 2022, otros={0: ('2022-03-22', '')}), 0, '---------- Forwarded message', '2025-10-21')
n = motivo(motivo(n, 0, 'Sin fecha delante; la fecha va dentro.'), 1, 'Correo de Cecilio Rubio, el presidente, del 21 de octubre de 2025.')
rellenar('gpc54', 'GERMAN PEREZ CARRASCO 54', 'germanperezcarrasco54', {'fecha_apertura': '2021-10-08', 'referencia_catastral': '5565101VK4756F',
    'origen_notas': 'Fecha de llegada: la ficha dice 11/2021; 10/2021 (dia: los croquis y fotos de la visita, 08/10/2021). Contacta: Oscar Fernandez (FAIN). Tipo de obra: ASCENSOR + SUBV '
                    '(HE de subvenciones firmada 10/01/25). Barrio: Quintana. Tecnico: Dennis. Fecha encargo: 18-11-21. Jefe de obra: Victor Esquinas (FAIN). PEM 79.988,20. Visados TL/020835/2021 y '
                    'TL/014669/2025 (fin de obra). Expediente 116/2021/05620 (declaracion). Junta de Ciudad Lineal: tecnico Eduardo Seco (nuevo en mar-2022; lo tenia en el no 58 de una lista de 130). '
                    'Superficie 35,50 m2. Administracion: MACENA (Mar Cordon; 914 078 700 / 912 602 123). Presidente: Cecilio Rubio Sanchez (609 531 428; gestioncr@gmail.com), que en oct-2025 dice que la '
                    'obra no esta terminada (agua en la cubierta junto a la torre del ascensor). La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones', 'cfo'), n=n, presi=('Cecilio Rubio Sanchez', 'presidente', '609531428', '01374141Y', 'gestioncr@gmail.com'), trae_pu=PU['ofernandez_fain'])

rellenar('gpc73', 'GERMAN PEREZ CARRASCO 73 Y 73 BIS', 'germanperezcarrasco73y73bis', {'fecha_apertura': '2024-10-25',
    'origen_notas': 'Fecha de llegada: 10/2024 (dia: la primera nota, la visita del 25/10/2024). Contacta: Diego Rojo Olalla, el administrador (ROJO JUSDI; "es el de Longares 8B"; 625 145 522). '
                    'Tipo de obra: DOS ASCENSORES CON DOS DERRIBOS DE ESCALERA (comunidad con dos portales simetricos; torre para ascensor de 5 personas con doble embarque a 180; sin tocar contadores, '
                    'zonas privadas ni garajes; unos 350.000 + IVA los dos) + SUBVENCIONES. En nov-2025 el administrador pide el estudio de viabilidad. HE con informe de viabilidad enviados 02/12/2025. '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'subvenciones'), n=partir(fijar('germanperezcarrasco73y73bis', 2024), 0, '---------- Forwarded message', '2025-11-19'),
    adm=PU['diego'], trae_pu=PU['diego'])

# ================================================================= 2. CLON
REVS = [
    ('galeriadelosrobles5', '2023-03-23', 'JAVIER VELASCO Y ANA ENCINAS (ELECNOR)', None, None,
     'CALLE DE LA GALERIA DE LOS ROBLES 5 MADRID. Fecha: 03/2023 (dia: la visita del 23/03/2023). Tipo de obra: ASCENSOR POR PATIO CON CIPHAN. Distrito 01 - Centro (Universidad). '
     'Hay fotos de Elecnor y plano en dwg.\n\n' + cl('galeriadelosrobles5', 2023)),
    ('galiana28', '2016-10-25', 'ANYLOR', 'E78778743', '7936205VK3773F',
     'CALLE GALIANA 28 MADRID. Fecha: 10/2016 (dia: la visita, fotos del 25/10/2016; la ficha dice xx/20xx). Tipo de obra: ASCENSOR (proyecto hecho en nov-2016). Distrito 10 - Latina '
     '(Puerta del Angel). CP 28011. Comunidad: CP GALIANA 28 (CIF E78778743, con E de comunidad de bienes); presidente Rafael Garcia Santamaria (51333619B). Contrata: Elevalia (Juan Manuel '
     'Caballin, 618 159 167). Tecnico del Ayuntamiento: Carlos Borrallo. PEM 50.000; residuos 300; expediente 110/2016/04904 (el mismo que en la ficha de genserico7); NZ 4; fachada 19; '
     'superficie 57,40.'),
    ('gallo22', '2025-06-17', 'TANIA (ADMIN ATOCHA)', None, None,
     'GALLO 22 MADRID. Fecha: 06/2025 (dia: la primera nota). Tipo de obra: SATE, sin DF ni CSS, con CAES y subvencion: presupuesto ciego y busqueda de 3 presupuestos. Distrito 19 - Vicalvaro. '
     'Administracion: ADMIN ATOCHA (Villalmanzo 6, 28032 Madrid; Tania, 91 776 99 49; incidencias@adminatocha.es) - no esta en la agenda. Vecino: Antonio (2o dcha), 628 205 254. '
     'Comercial interno: CARLOS.' + CAPTO_CARLOS + '\n\n' + cl('gallo22', 2025)),
    ('gandhi5', '2016-04-01', 'FELIPE (ENOR)', None, None,
     'Calle GANDHI 5 MADRID. Fecha: 04/2016 (dia desconocido). Tipo de obra: ASCENSOR: la comunidad tiene licencia para un proyecto de otra constructora (les piden un ascensor de 1400 x 1400 por '
     'el doble embarque a 90 y la constructora sube el precio); el administrador pide asesoramiento y oferta. Distrito 15 - Ciudad Lineal (Pueblo Nuevo). Hay licencia y planos de la competencia, '
     'croquis, borrador de escalera y presupuesto (mayo 2016).\n\n' + crudo('gandhi5', 2016)),
    ('garellano17', '2022-05-19', 'JUAN MANUEL RODRIGO (GM FINCAS)', None, None,
     'Calle GARELLANO 17 MADRID. Fecha: 05/2022 (dia: el correo del administrador del 19/05/2022; el contacto se lo dio su companero Diego). Tipo de obra: ACCESIBILIDAD Y REFORMA DEL PORTAL '
     '(rampa de todo el ancho, solado, buzones, telefonillos...): proyecto, licencia y subvenciones. Distrito 06 - Tetuan (Bellas Vistas). Hay croquis del portal actual y reformado.\n\n'
     + crudo('garellano17', 2022)),
    ('generalaranaz42', '2026-07-01', 'RAFAEL (vecino, 619 522 046)', None, None,
     'GENERAL ARANAZ 42 MADRID. Fecha: 07/2026 (dia desconocido; el escaneo 3D es del 18/08/2026). Tipo de obra: ACCESIBILIDAD Y SATE. Contacta: Rafael, vecino, 619 522 046. '
     'La ficha no tiene notas. Comercial interno: ALVARO.'),
    ('generalcabrera25', '2025-01-07', 'ISAAC PIZARROSO (GESTIN)', None, None,
     'GENERAL CABRERA 25 MADRID. Fecha: 01/2025 (dia: el primer fichero, la IEE desfavorable recibida de la comunidad, 07/01/2025). Tipo de obra: DEFICIENCIAS DE FACHADA. Distrito 06 - Tetuan. '
     'CP 28020. Administracion: GESTIN SAP (Isaac Pizarroso). Hay HE (11/01/2025) y estudio de costes (16/01/2025). La ficha no tiene notas.'),
    ('generalcabrera27', '2017-02-01', 'LUIS MIGUEL NUNES (THYSSEN)', None, None,
     'Calle GENERAL CABRERA 27 MADRID. Fecha: 02/2017 (dia desconocido). Tipo de obra: ASCENSOR por caja de escalera. Distrito 06 - Tetuan (Cuatro Caminos). Hay croquis, planos y presupuesto '
     '(mar-2017).\n\n' + crudo('generalcabrera27', 2017)),
    ('generaldiazporlier27', '2016-09-28', 'AMPARO, MADRE DE MARIO (visita con LUIS MIGUEL NUNES, THYSSEN)', None, None,
     'Calle GENERAL DIAZ PORLIER 27 MADRID. Fecha: 09/2016 (dia: el video de la visita, 28/09/2016). Tipo de obra: BAJADA A COTA CERO del ascensor existente (de Antonino, lo mantiene Cyman; '
     '7 paradas, B + 6): doble embarque a 90 para desembarcar a nivel de portal. Oferta de Thyssen: CORE-E sin cuarto de maquinas, 375 kg (4 personas), 1 m/s, 8 paradas. Distrito 04 - Salamanca '
     '(Goya). NZ 1 grado 3. Contacto: Maripaz Ortega, 646 70 31 96. De Thyssen gestiona la oferta Maria Elena Calvo Aguado (686 770 784; maria.calvo@thyssenkrupp.com).\n\n'
     + crudo('generaldiazporlier27', 2016)),
    ('generalramirez22', '2019-11-28', 'JOSE MARIA GALVEZ (FAIN)', 'E78221041', '1087308VK4718G',
     'Calle GENERAL RAMIREZ 22 MADRID. Fecha: 11/2019 (dia: las fotos y videos de la visita, 28/11/2019). Tipo de obra: ACONDICIONAR LA TORRE DEL ASCENSOR Y CAMBIAR EL ASCENSOR (presupuesto de '
     'sustitucion; proyecto y tasas de licencia en dic-2019). Distrito 06 - Tetuan (Cuatro Caminos). CP 28020. Comunidad: CDAD DE PROP GENERAL RAMIREZ 22 (CIF E78221041, con E); presidente '
     'Alberto Pineda Garcia. PEM 49.498,03. Superficie a derribar: 3 m2 por planta, 18 m2.'),
    ('generalricardos232 (ascensor)', '2015-03-08', None, 'H78171220', '7209809VK3770G',
     'CALLE GENERAL RICARDOS 232 MADRID: el ASCENSOR (2015-2020). Fecha: 03/2015 (dia: el primer fichero, la valoracion del 08/03/2015). Tipo de obra: ASCENSOR: proyecto visado en nov-2016, '
     'abogado (ene-2017), incidencias y juicio (2017), licencia (may-2018), acta de inicio de obra (nov-2018), presupuestos de subvencion con FAIN (2019), derribo de escalera (ene-2020) y fin de '
     'obra visado TL/010072/2020 (jul-2020). Distrito 11 - Carabanchel (Vista Alegre). CP 28025. La ficha de la carpeta es del encargo de SATE de 2022 (otra fila). El acceso de Catastro de esta '
     'parcela lo comparte con Batalla de Torrijos 23.'),
    ('generalricardos232', '2022-08-03', 'NACHO (FAIN)', 'H78171220', '7209809VK3770G',
     'CALLE GENERAL RICARDOS 232 MADRID: SATE + AEROTERMIA (2022). Fecha: la ficha dice xx/20xx; 08/2022 (dia: el primer fichero de este encargo, las subvenciones presentadas por la administracion, '
     '03/08/2022). Distrito 11 - Carabanchel (Vista Alegre). CP 28025. Administracion: ALCORA (Valentin Alcocer Garrido; 618 688 055 / 91 615 09 75; alcora@telefonica.net). Comunidad: '
     'CP GENERAL RICARDOS 232 (CIF H78171220); presidenta Esperanza Ibias Simarro (1161663W). NZ4; fachada 12,80 m (en la ficha tambien PEM 50000 y residuos 300, los mismos que en galiana28). '
     'El ascensor de 2015-2020 es otra fila.\n\n' + crudo('generalricardos232', 2022)),
    ('generalricardos62', '2024-07-24', 'AGUSTIN RUIZ (vecino; nos vio en LinkedIn)', None, None,
     'GENERAL RICARDOS 62 MADRID. Fecha: 07/2024 (dia: la primera nota). Tipo de obra: ASCENSOR (tenian la subvencion concedida, pero el Ayuntamiento no dio el ok al proyecto de otro arquitecto '
     'por no ser accesible; tramitar por ECU; se cobrara un importe inicial y el resto con la licencia). Distrito 11 - Carabanchel. CP 28019. Contacto: Agustin Ruiz (agustin.v.ruiz@gmail.com; '
     '649 803 078).\n\n' + cl('generalricardos62', 2024)),
    ('generalvarela3', '2018-03-01', 'DIEGO (diego@josilva.com)', None, None,
     'Calle GENERAL VARELA 3 MADRID. Fecha: 03/2018 (dia: los ficheros; la ficha dice xx/20xx). Distrito 05 - Chamartin (El Viso). Contacto: Diego, diego@josilva.com. Ficha casi vacia; '
     'hay un presupuesto de INVER-EXPRESS para la escalera A y un modelo 3D (mar-2018).'),
    ('genil5', '2026-07-01', 'GONZALO (vecino; "PRY GONZALO")', 'H80016207', None,
     'GENIL 5 MADRID. Fecha: 07/2026 (dia desconocido; el escaneo 3D es del 06/09/2026). Tipo de obra: SUSTITUCION DE LOS ASCENSORES Y NUEVA PARADA: eliminar escalones de calle y portal, '
     'quitar los 2 ascensores y el muro entre sus huecos para poner uno solo de 6 personas con nueva parada en la ultima planta. Fecha encargo: 24/09/2026. CP 28002. No tienen administrador. '
     'Contacto: Gonzalo (630 354 072; glopezoleaga@gmail.com). Comercial interno: ALVARO.\n\n' + crudo('genil5', 2026)),
    ('genserico3', '2024-11-07', 'ANA ENCINAS (ELECNOR)', None, None,
     'GENSERICO 3 MADRID. Fecha: 11/2024 (dia: la primera nota). Tipo de obra: ASCENSOR. Distrito 10 - Latina. CP 28011. Hay croquis y fotos de la visita de Elecnor (31/10/2024).\n\n'
     + cl('genserico3', 2024)),
    ('genserico7', '2016-02-23', None, 'H79671137', None,
     'Calle GENSERICO 7 MADRID. Fecha: la ficha dice 10/2023 (copiada); 02/2016 (dia: la visita, fotos del 23/02/2016). Tipo de obra: ASCENSOR (presupuesto de marzo 2016; proyecto en ago-2016). '
     'Distrito 10 - Latina (Puerta del Angel). CP 28011. Comunidad: CP GENSERICO 7 (CIF H79671137); presidente Roberto Reguilon Cano (50428701M; 91 840 01 06 / 679 816 329). Contacto: '
     '639 990 269, manupiro@hotmail.com. Tecnico del Ayuntamiento: Carlos Borrallo. PEM 63.318; residuos 1000; expediente 110/2016/04904; NZ 4; fachada 20,51; superficie 58.\n\n'
     + crudo('genserico7', 2023)),
    ('germanperezcarrasco58', '2025-03-21', 'CRISTINA (AFASONER)', None, None,
     'GERMAN PEREZ CARRASCO 58 MADRID. Fecha: 03/2025 (dia: el correo de Afasoner del 21/03/2025, que pide tambien Vicalvaro 68). Tipo de obra: PROYECTO Y REALIZACION DE RAMPA. '
     'Distrito 15 - Ciudad Lineal. Presidente: Javier, 610 449 227. HE de proyecto enviada 24/03/2025.\n\n' + cl('germanperezcarrasco58', 2025)),
    ('gilimon5', '2023-10-02', 'IVAN CAMACHO (TRES JOTAS)', None, None,
     'GIL IMON 5 MADRID. Fecha: 10/2023 (dia: la primera nota). Tipo de obra: SATE Y CUBIERTA Y NEXT GENERATION (81 vecinos; no vale para subvencion por ser un edificio muy nuevo). '
     'Distrito 02 - Arganzuela (Imperial). CP 28005.\n\n' + cl('gilimon5', 2023))]
ALV = {'generalaranaz42': 'Alvaro', 'genil5': 'Alvaro', 'gallo22': 'Alvaro (capto Carlos)'}
for carp, fecha, trajo, cif, ref, t, *ruta in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, comercial=ALV.get(carp, 'Daniel'), ruta=ruta[0] if ruta else R(carp.split(' (')[0]))
for carp, fecha, trajo, t in [
        ('galvez1', '2017-08-28', 'PEDRO ARANDA (THYSSEN)', 'Calle GALVEZ 1 MADRID. Fecha: 08/2017. Distrito 11 - Carabanchel (Buenavista). NZ4. Ficha vacia; hay croquis, plano y presupuesto.'),
        ('gandhi11', '2022-06-12', None, 'GANDHI 11 MADRID. Carpeta SIN ficha de datos: un dibujo "Gandhi 11(2007)" (.bak de jun-2022 y .dwg de jun-2023).'),
        ('garcilaso13', '2015-05-04', 'LUIS NUNES (THYSSEN)', 'Calle GARCILASO 13 MADRID. Fecha: 05/2015 (la ficha dice xx/20xx). Distrito 07 - Chamberi (Trafalgar). Ficha vacia; hay croquis, propuesta y valoracion.'),
        ('gaztambide 29', '2020-03-09', None, 'GAZTAMBIDE 29 MADRID. Carpeta SIN ficha de datos: solo una incidencia del proyecto, "VADO GAZTAMBIDE, 29" (mar-2020).'),
        ('generalfanjul24', '2017-08-01', 'PEDRO ARANDA (THYSSEN)', 'Calle GENERAL FANJUL 24 MADRID. Fecha: 08/2017 (dia desconocido). Distrito 10 - Latina (Aguilas). Ficha vacia; hay croquis, planos y presupuesto (sep-2017).'),
        ('generalprim19', '2016-03-07', 'LUIS NUNES (THYSSEN)', 'C/ GENERAL PRIM 19 MADRID. Fecha: 03/2016 (la fecha de inicio de la ficha, 7/3/2016, y las fotos). Ficha (del modelo antiguo) vacia; hay croquis, fotos, '
         'borrador de escalera y presupuestos de derribo de escalera y exterior (abr-2016). El paquete de INVER de 2021 es otra fila.'),
        ('generalricardo210', '2015-12-01', 'PEDRO (THYSSEN)', 'Calle GENERAL RICARDOS 210 MADRID. Fecha: 12/2015 (dia desconocido). Distrito 11 - Carabanchel (Vista Alegre). Ficha vacia y nada mas en la carpeta.'),
        ('generalvarela 13 15', '2017-06-01', 'LUIS MIGUEL NUNES (THYSSEN)', 'Calle GENERAL VARELA 13 y 15 MADRID. Fecha: 06/2017 (dia desconocido). Distrito 05 - Chamartin (El Viso). Ficha vacia; '
         'hay croquis, planos y presupuestos por portal (13 H, I, J, L; 15 A, B, G), de jul-2017 a ene-2018.')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)
fila('generalprim19 (INVER 2021)', '2021-02-23', 'cerrada', MIG, 'INVER', None, None,
     'C/ GENERAL PRIM 19 MADRID: el paquete "51.-" de INVER (feb-2021): emails, presupuesto, proyecto y licencia concedida de un proyecto anterior de otros, y un escrito de aplazamiento al '
     'Ayuntamiento (23/02/2021). Sin ficha propia (la de la carpeta es la de Thyssen de 2016, otra fila).', ruta=R('generalprim19'))

# ================================================================= 3. MANIAS

resumen()
