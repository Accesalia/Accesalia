# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda O (oca95 .. orden30, 18 carpetas [0:18]). 7-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de, _lineas

FAIN = 'fa005671-8d23-45a6-8172-0ea7ca8c8950'; GMFINCAS = 'e61606f0-e7ab-4ac1-855d-753535af4b2f'
PU.update(cerezo='7f4218f5-8b8e-45a0-9cba-b2880ccfc4c3', juana='58951ea3-d9e8-48fa-ba2b-a58300331760', godino='71ab2591-1dac-48b0-b094-12b9c2995bf4',
          gmoya='5a588515-9c02-4058-8e31-7e51dec4737f', sacristan='112162d0-2df1-4201-91cd-807a4c50d236')
CEREZO = (' Raul Cerezo es un comercial freelance que colabora con Accesalia: trae la oportunidad y el mismo pasa la hoja de encargo al cliente (Monica, 6-oct-2026).')


def motivo(n, i, m):
    """anade el motivo a la nota i (la fecha ya la puso partir)."""
    f, t = n[i]; n[i] = (f, t + '\n\n(' + m + ')'); return n


def bloque(c, i, j):
    """lineas i..j (incluidas) de la ficha, sin las vacias."""
    return '\n'.join(l for l in _lineas(c)[i:j + 1] if l.strip()).strip()


cl = lambda c, a, s=None: J(fijar(c, a, s))


def fila_muni(muni, carp, fecha, estado, cierre, trajo, cif, ref, texto, comercial='Daniel'):
    """como fila(), pero con el municipio oficial de Catastro (la carpeta conserva su ruta en MADRID)."""
    if b.leer(T + '?select=id&municipio=eq.%s&carpeta=eq.%s' % (quote(muni), quote(carp))):
        print('clon ya escrita, se salta:', carp); return
    i = nuevo_id(); CLON[carp] = i
    ins(T, [{'id': i, 'comunidad_autonoma': 'COMUNIDAD DE MADRID', 'municipio': muni, 'carpeta': carp, 'ruta_dropbox': R(carp), 'tiene_tarjeta_cif': False, 'cif_en_la_ficha': cif,
             'ref_catastral_de_la_ficha': ref, 'comercial_interno': comercial, 'estado': estado, 'cierre_notas': cierre, 'fecha_apertura': fecha, 'trajo_persona': trajo, 'notas_de_la_ficha': texto}])


# ================================================================= 0. AGENDA (solo en empresas y contratas que ya existen; ninguna administracion ni junta nueva)
DIEGO = persona_nueva('Diego', 'Rodrigo', None, '915533044', 'diego@gmfincas.com', empresa=GMFINCAS,
                      notas_='GM Fincas: administracion de Ofelia Nieto 16 (ficha de 2019; carpeta ofelianieto16).')
RUBEN = persona_nueva('Rubén', 'Cabaco Nieto', 'agente comercial', None, None, contrata=FAIN,
                      notas_='FAIN: agente comercial de Ofelia Nieto 16 (con Jose Maria Galvez) y de Quilichao 6 (2019; carpetas ofelianieto16 y quilichao6). Sin correo en las fichas.')

# ================================================================= 1. PRODUCCION (8 carpetas, 8 oportunidades)
for k, pref, carp in (('oc46', 'OCAÑA 46', 'ocaña46'), ('oc48', 'OCAÑA 48', 'ocaña48')):
    rellenar(k, pref, carp, {'fecha_apertura': '2026-01-26',
        'origen_notas': 'Fecha de llegada: 01/2026 (dia: el correo de Acayma, 26/01/2026). Contacta: Raul Cerezo y Juana Gonzalez Martin (ACAYMA ASESORES - ABOGADOS ADMIN FINCAS; '
                        'C/ Camarena 115, local 1 dcha., 28047; 91 509 97 37; comunidades@acayma.com).' + CEREZO + ' Tipo de obra: IEE (el mismo correo pide presupuesto de la IEE de '
                        'Ocaña 46 y de Ocaña 48, una por comunidad). Administracion: ACAYMA (Juana Gonzalez Martin). HE enviada 26-01-2026. Comercial interno: DANIEL.'},
        ('iee',), n=fijar(carp, 2026, ('2026-01-26', 'Correo de Acayma (comunidades@acayma.com) a Raul Cerezo, con copia a Daniel, del 26 de enero de 2026.')),
        adm=PU['juana'], trae_pu=PU['cerezo'])

# O'Donnell 35: lo escrito bajo NOTAS SUBVENCIONES es del proyecto (estado actual, instrucciones, local afectado) -> notas de la opp, cada una con su fecha
s35 = subv('odonnell35'); k1 = s35.index('20/06/2025 KARLA'); k2 = s35.index('15/10/2025 DANIEL'); k3 = s35.index('---------- Forwarded message'); k4 = s35.index('luis@aestimatio')
BAJO = 'En la ficha esta debajo de NOTAS SUBVENCIONES, pero es del proyecto.'
n35 = fijar('odonnell35', 2025) + [
    ('2025-06-11', s35[:k1].strip() + '\n\n(' + BAJO + ' Sin fecha: los documentos del estado actual de 2.PROYECTO/5.BIM empiezan el 11/06/2025; se toma esa.)'),
    ('2025-06-20', s35[k1:k2].strip() + '\n\n(' + BAJO + ')'),
    ('2025-10-14', s35[k3:k4].strip() + '\n\n(' + BAJO + ' Correo de Jon Azpitarte, el presidente, del 14 de octubre de 2025, pegado debajo de la nota de Daniel del 15/10/2025.)'),
    ('2025-10-15', s35[k2:k3].strip() + '\n\n(' + BAJO + ')')]
rellenar('od35', 'ODONNELL 35', 'odonnell35', {'fecha_apertura': '2025-02-06', 'referencia_catastral': '2650711VK4725B',
    'origen_notas': 'Fecha de llegada: 02/2025 (dia: la visita del 06/02/2025, que cuenta la primera nota, del 10/02/2025; el CIMENTACIONN.jpg de 2022 de 5.BIM es una imagen de referencia, no cuenta). '
                    'Contacta: Javier Parra (SCHINDLER; 639 351 942; javier.parra@schindler.com). Paga el proyecto: SCHINDLER ("lo factura Schindler. LEAD"). Tipo de obra: PLATAFORMA Y ASCENSOR '
                    '+ CSS + SUBV (la plataforma invade parte de un local y va por via judicial, aunque en el proyecto vaya todo junto). Tecnicos: EA Santiago (Quintero); Karla. Fecha encargo: '
                    '29/05/2025 (HE firmada). Jefe de obra: Jorge Tirado Sanchez (Schindler). Ano 1930. Edificio con proteccion parcial. DR por ECU (ACTECU), presentada 15-07-2025; el 26/06/2026 '
                    'se registra una nueva DR para terminar la obra en plazo. Junta: JMD Salamanca. Administracion: DESPACHO GUIRAO (Antonio Guirao Sanchez; C/ Sofia 64 F, local, 28022; '
                    '91 306 92 05; info@despachoguirao.com). Presidente: Jon Azpitarte Gallastegui (78867881F; 688 63 77 47; jon.azpitarte@gmail.com). Portero: Miguel, 686 248 919. '
                    'Subvenciones: contratadas el 29/05/2025 ("una presentacion de cada"). Visado TL/011099/2025 (PROYECTO BASICO Y DE EJECUCION PARA INSTALACION DE ASCENSOR EN EDIFICIO '
                    'RESIDENCIAL EXISTENTE). Abogado: luis@aestimatioabogados.com ("contacto de abogado de AESTIMATIO") - no esta en la agenda. Local afectado: Pablo, arquitecto de la '
                    'Mallorquina (626 351 012), y su jefe Raul Garcia (618 971 765); propietario del local: Mariano - no estan en la agenda. La ficha no dice comercial interno; la lleva Daniel.'},
    ('plataforma', 'ascensor', 'css', 'subvenciones'), n=n35, trae_pu=PU['parra'])
pc(OPP['od35'][0]['id'], 'MIGUEL (PORTERO)', 'otro', '686248919', None, None, 'Portero del edificio (ficha, 2025).')

n41 = fijar('odonnell41', 2025, otros={0: ('2025-10-16', None)})
n41 = partir(n41, 0, '---------- Forwarded message', '2025-10-20', vez=2)
n41 = motivo(n41, 0, 'Correo de Miguel Angel Cojo a ACTECU del 16 de octubre de 2025, que ACTECU (rvazquez@actecu.com) reenvia a Daniel ese mismo dia; sin fecha delante en la ficha.')
n41 = motivo(n41, 1, 'Correo de Miguel Angel Cojo a Daniel (dirigido a Alejandra) del 20 de octubre de 2025.')
rellenar('od41', "O'DONNELL 41", 'odonnell41', {'fecha_apertura': '2025-10-16',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: el correo de Miguel Angel Cojo a ACTECU, 16/10/2025, que ACTECU reenvia a Daniel ese dia; el .skb de oct-2025 es de plantilla). '
                    'Contacta: Miguel Angel Cojo Garcia, de la comunidad (659 94 92 65; macojog@gmail.com); pide que pongan en copia a mruizcejudo31@gmail.com y gloria_sys@yahoo.es. '
                    'Tipo de obra: BAJADA DEL ASCENSOR A COTA 0 (ascensor de doble embarque con nueve paradas; el portal y la escalera estan protegidos, el ascensor no; lo ha de aprobar '
                    'Patrimonio). Administracion: la ficha no la sabe ("No tengo mas datos"); en esa casilla, como persona de contacto, Gloria, 673 089 991. Visita de Daniel el 28/10/2025. '
                    'HE y viabilidad enviadas 04/11/2025. Hay modelo 3D (03/11/2025). Comercial interno: DANIEL.'},
    ('cota_cero',), n=n41, trae_pc='presi',
    presi=('MIGUEL ANGEL COJO GARCIA', 'otro', '659949265', None, 'macojog@gmail.com',
           'Persona de contacto de la comunidad; escribe en nombre de la CP (oct-2025). Pide que pongan en copia a mruizcejudo31@gmail.com y gloria_sys@yahoo.es.'))
pc(OPP['od41'][0]['id'], 'GLORIA', 'otro', '673089991', None, None,
   'En la ficha, en la casilla de la administracion ("No tengo mas datos"), como persona de contacto (oct-2025). No consta que sea la administradora.')

n47 = fijar('odonnell47', 2023, otros={0: ('2024-04-26', None)})
n47 = partir(n47, 0, '---------- Forwarded message', '2024-07-04', vez=2)
n47 = motivo(n47, 0, 'Correo de Cristina Briceno (Merino) a Sergio Godino (FAIN) del 26 de abril de 2024; sin fecha delante en la ficha.')
n47 = motivo(n47, 1, 'Correo de Sergio Godino (FAIN) a Luis (luis_valeiro@telefonica.net), con copia a Daniel, Cristina Briceno y Ana Santamarta, del 4 de julio de 2024.')
n47 = partir(n47, 2, '---------- Forwarded message', '2025-12-17')
n47 = motivo(n47, 3, 'Correo de Sergio Godino (FAIN) a la oficina de Accesalia del 17 de diciembre de 2025, pegado debajo de la nota del 09/07/2024.')
rellenar('od47', 'ODONNELL 47', 'odonnell47', {'fecha_apertura': '2023-10-19', 'referencia_catastral': '2950708VK4725B',
    'origen_notas': 'Fecha de llegada: 10/2023 (dia: los documentos pedidos a la administracion el 19/10, y el presupuesto de FAIN firmado, guardado ese dia; el "14-07-2023" del nombre de ese '
                    'fichero es la fecha del presupuesto de FAIN a la comunidad, no la de llegada; escaneo FARO 23/10/2023). Contacta: Sergio Godino (FAIN). Tipo de obra: PLATAFORMA VERTICAL + CSS. '
                    'Barrio: Goya. Tecnico: Julio -> requerimiento, Israel. Jefe de obra: Antonio Castillo (FAIN) => Raul Navas (FAIN, supervisor de reparaciones) - no estan en la agenda. Ano 1953. '
                    'Administracion: MERINO (C/ Eraso 18, 28028; 91 726 13 10; Cristina Briceno, c.briceno@merinosyf.com; Fernando Sanchez, f.sanchez@merinosyf.com). Presidente: Pedro Antonio '
                    'Sanchez Hernandez (50879446L). PEM 42.785,87. Visado TL/020276/2023; CFO visado TL/005889/2026 (enviado a los interesados el 18/05/2026). DR por ECU (ACTECU): el cambio que '
                    'pidio la comunidad (salida por la antigua carbonera y la puerta del garaje) la ECU dijo que no; la version presentada a DR es la de 3.OBRA\\declaracion responsable por '
                    'ECU\\DR registrada. La obra se hizo sin que Accesalia lo supiera (nota del 08/01/2026). En jul-2026, planos as built. La ficha no dice comercial interno; la lleva Daniel.'},
    ('plataforma', 'css'), n=n47, comunidad={'iban': 'ES68 0081 7123 1500 0141 6646'}, trae_pu=PU['godino'])

n16 = [('2019-08-14', bloque('ofelianieto16', 84, 98) + '\n\n(Correo de Ruben Cabaco Nieto (FAIN) del 14 de agosto de 2019, pegado en la ficha bajo NOTAS sin fecha delante; '
        'la fecha va en el propio correo.)')]
rellenar('on16', 'OFELIA NIETO 16', 'ofelianieto16', {'fecha_apertura': '2019-07-05', 'referencia_catastral': '9991215VK3799B',
    'origen_notas': 'Fecha: la ficha da la FECHA ENCARGO, 05/07/2019, y la hoja de encargo de la carpeta es de ese dia; no hay fecha de llegada (los ficheros anteriores son plantillas y un dxf '
                    'de Catastro). Agente comercial: Ruben Cabaco (FAIN) / Jose Maria Galvez (FAIN). Mediador: el jefe de obra Juan Luis Ruiz de Mier (FAIN). Tipo de obra: INSTALACION DE '
                    'ASCENSOR (electrico gearless, 450 kg / 6 personas, cabina 1000 x 1250, aprovechando el patio trasero). Administracion: GM FINCAS (Diego Rodrigo; 91 553 30 44; '
                    'diego@gmfincas.com). Presidente: Guillermo Loaiza Bravo (X3126406-Q). CP 28039. PEM 101.604,90. Expediente del Ayuntamiento 2019/0804715. CFO visado TL/010039/2024. '
                    'En la carpeta hay subcarpetas de subvenciones (2020 y Ayto 2021) y de IEE. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor',), n=n16, comunidad={'cif_comunidad': 'H78286929', 'iban': 'ES91 0049 0630 4421 1027 4580'},
    presi=('GUILLERMO LOAIZA BRAVO', 'presidente', None, 'X3126406Q'), adm=DIEGO, trae_pu=RUBEN)

rellenar('ol34', 'OLESA DE MONTSERRAT 34', 'olesademonserrat34', {'fecha_apertura': '2026-04-16', 'referencia_catastral': '1427902VK4812G',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: las actas, el CIF y el contrato de Schindler firmado, guardados el 16/04/2026; escaneo FARO 20/04/2026). Contacta: Javier Gonzalez Moya '
                    '(SCHINDLER; 616 99 10 79; javier.gonzalez.moya@schindler.com). Paga el proyecto: SCHINDLER. Tipo de obra: ASCENSOR (PROYECTO BASICO Y DE EJECUCION PARA INSTALACION DE '
                    'ASCENSOR EN EDIFICIO RESIDENCIAL EXISTENTE). Barrio: Valverde. Tecnico: Alejandro Bello. LICENCIA por el AYUNTAMIENTO (la ECU dijo el 19/06/2026 que toca suelo publico); '
                    'registrada el 30/09/2026. La comunidad es "CDAD PROP C/OLESA DE MONTSERRAT N34 Y 36" (domicilio C/ Manresa 41, 28034; en la carpeta hay acta de "Olesa de Monserrat, 34-36"); '
                    'en produccion solo esta el acceso del 34. Presidenta: Maria del Pilar Hernandez Martin (02059090S). Contacto: Tatiana (699 924 458; toki80@hotmail.com). PEM 154.637,35. '
                    'Visado TL/014363/2026. Superficie 104,22. Subvenciones: "La SUBV esta contratada con otra empresa". En la ficha: comercial interno CARLOS.' + EXT},
    ('ascensor',), n=fijar('olesademonserrat34', 2026), presi=('MARIA DEL PILAR HERNANDEZ MARTIN', 'presidente', None, '02059090S'),
    trae_pu=PU['gmoya'], captador=ALVARO, lleva=ALVARO)
pc(OPP['ol34'][0]['id'], 'TATIANA', 'otro', '699924458', None, 'toki80@hotmail.com', 'Persona de contacto de la comunidad (ficha, 2026).')

rellenar('on79', 'OÑA 79', 'oña79', {'fecha_apertura': '2026-02-06', 'referencia_catastral': '3924147VK4832C',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: las fotos, el modelo 3D y la primera nota, 06/02/2026; el .skb de ene-2026 es de plantilla y los textos de 7.RENDER\\Trabajo de ene-2026 '
                    'son indicaciones genericas de estilo para la decoracion con IA). Contacta: Miguel Angel Sacristan, administrador (masacristan@telefonica.net). Tipo de obra: RENOVACION '
                    'PORTAL (Alvaro solicito decoracion IA el 06/02/2026). Administracion: MIGUEL ANGEL SACRISTAN (en la ficha, en la casilla del nombre de la administracion pone "TELEFONICA", '
                    'que es el dominio de su correo; se corrige). Comercial interno: ALVARO.'},
    ('accesibilidad_portal',), n=fijar('oña79', 2026), adm=PU['sacristan'], trae_pu=PU['sacristan'], captador=ALVARO, lleva=ALVARO)

# ================================================================= 2. CLON
REVS = [
    ('olivar2', '2022-09-24', 'SERGIO (PRESIDENTE DE LA COMUNIDAD)', None, None,
     'OLIVAR 2 MADRID. Fecha: 09/2022 (dia: la nota, 24/09/2022). Cliente: la comunidad. Contacta: Sergio, presidente de la comunidad. Tipo de obra: ASCENSOR ("como Luchana 37", que esta '
     'en la clon). Distrito Centro. CP 28012. En la carpeta solo hay un presupuesto de salvaescaleras firmado de OTRA direccion ("LUIS VIVES 11 - SALVAESCALERAS SEPT22_signed", 06/10/2022).\n\n'
     + cl('olivar2', 2022)),
    ('orden30', '2024-05-01', 'ENRIQUE GARCIA GUERRA (COMUNIDAD)', None, None,
     'CALLE DE LA ORDEN 30 MADRID. Fecha: 05/2024 (dia desconocido; la nota y el croquis son del 21/06/2024). Cliente: la comunidad de propietarios. Contacta: Enrique Garcia Guerra '
     '(696 017 859). Tipo de obra: ASCENSOR + SUBV. Distrito Tetuan. CP 28020. En la carpeta, el croquis del ascensor con el patio trasero (21/06/2024).\n\n' + cl('orden30', 2024))]
for carp, fecha, trajo, cif, ref, t in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV)
for carp, fecha, trajo, t in [
        ('oca95', '2016-02-09', 'FELIPE OSADO (ENOR)', 'CALLE DE LA OCA 95 MADRID. Fecha: 02/2016 (ficha 09/02/2016; ficheros de marzo de 2016: croquis, oferta de ascensor 21M.0924 y presupuesto). '
         'Administrador: Luis Marigil (91 462 30 67; lmarigilp@yahoo.es) - dato antiguo, no esta en la agenda. En la ficha: "C.P. de la Oca, 95. Administrador. Luis Marigil 91 462 30 67. '
         '(Te deja las llaves. La idea es aportar solucion sin invadir el local de los chinos)."'),
        ('ocaña129', '2016-07-09', 'FELIPE OSADO (ENOR)', 'OCAÑA 129 MADRID. Fecha: 07/2016 (la de la ficha, 09/07/2016; presupuesto de sep-2016). Ficha vacia. Los ficheros de jul-2015 '
         '(JUANLUIS.doc y la oferta de ascensor 21M.0838) son copias identicas de los de la carpeta ocaña139.'),
        ('ofelianieto7', '2016-06-28', 'LUIS MIGUEL NUNES (THYSSEN)', 'OFELIA NIETO 7 MADRID. Fecha: 06/2016 (las fotos son del 28/06/2016; la ficha dice 07/10/2016). Ficha vacia; hay croquis, '
         'oferta, render y borrador de escalera (hasta jun-2017).'),
        ('olmo27', '2017-10-10', 'PEDRO ARANDA (THYSSEN)', 'C/ OLMO 27 MADRID. Fecha: 10/2017. Distrito Centro. Ficha vacia salvo: "OJO ESCALERA PROTEGIDA". Hay croquis y presupuesto.'),
        ('oporto13', '2017-02-03', 'PEDRO ARANDA (THYSSEN)', 'C/ OPORTO 13 MADRID. Fecha: 02/2017. Ficha vacia; hay apuntes y presupuesto (mar-2017).'),
        ('ocaña139', '2015-07-08', None, 'OCAÑA 139 MADRID. Carpeta SIN ficha de datos: presupuesto, propuesta y oferta de ascensor 21M.0838 (jul-2015). La misma oferta esta copiada en la carpeta ocaña129.'),
        ('oporto8', '2015-06-07', None, 'OPORTO 8 MADRID. Carpeta SIN ficha de datos: plano y documento (jun-2015).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)
# oneca4: la calle Oneca solo existe en COSLADA (callejero de Catastro, vias_catastro); la ficha dice "C/ ONECA 4. COSLADA. MADRID". Municipio oficial, ruta tal cual.
fila_muni('COSLADA', 'oneca4', '2018-05-30', 'cerrada', MIG, 'ANTONIO (ANYLOR)', None, None,
          'C/ ONECA 4, COSLADA. La carpeta esta en MADRID, pero la calle Oneca solo existe en Coslada (callejero de Catastro) y la ficha dice "C/ ONECA 4. COSLADA. MADRID". '
          'Fecha: 05/2018 (ficha 30/05/2018). Ficha vacia salvo "EMPRESA: SERGIO"; hay croquis y planos (jun-2018).')

# ================================================================= 3. MANIAS
mania('El Ayuntamiento deniega la plataforma elevadora en el portal si es posible bajar el ascensor existente a cota 0 (lo cuenta la comunidad: se lo negaron hace unos 5 anos).',
      'Ayuntamiento de Madrid', '2025-10-20', 'odonnell41', clave='od41', trozo='Hace 5 años pedimos autorización')
mania('Si el ascensor toca suelo publico, la ECU no lo tramita: va por licencia en el Ayuntamiento.', 'ECU (ACTECU)', '2026-06-19',
      'olesademonserrat34', clave='ol34', trozo='toca suelo público')

resumen()
