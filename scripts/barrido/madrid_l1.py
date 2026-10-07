# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda L1 (laespañola1 .. lopezgrass42, 29 carpetas [0:29]). 7-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de, _lineas

ANTONAYA = '34f0b172-5d39-4dfa-9d7a-46b3120d8624'; VALLEJOLARA = 'ff9a4731-ef8c-4952-abea-db28ced62692'
PU.update(aencinas='69dd910c-6468-49e4-90a4-5eeb9133daa7', cdelbrio='cf9c0d74-d01a-4ed2-a0f0-8fcaadd6e4ae')


def arreglar_pc(cid, filtro, datos):
    """personas_comunidad de esa comunidad con un dato mal puesto o ya no vigente."""
    d = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&%s' % (cid, filtro))
    if len(d) == 1: act('personas_comunidad?id=eq.' + d[0]['id'], datos)


def cerrar_perdida(clave, motivo, fecha, notas_):
    if ESCRIBIR:
        oid = OPP[clave][1]
        if not b.leer('motivo_cierre_oportunidad?select=id&oportunidad_id=eq.' + oid):
            b.insertar('motivo_cierre_oportunidad', [{'oportunidad_id': oid, 'resultado_final': 'perdido', 'motivo_perdido': motivo, 'fecha_cierre': fecha, 'notas': notas_}])
            b.actualizar('oportunidades?id=eq.' + oid, {'estado': 'cerrada'})
    else:
        SECO.append('INSERT motivo_cierre_oportunidad x1: %s perdido (%s) %s + UPDATE oportunidades estado=cerrada' % (clave, motivo, fecha))


def motivo(n, i, m):
    """anade el motivo a la nota i (la fecha ya la puso partir)."""
    f, t = n[i]; n[i] = (f, t + '\n\n(' + m + ')'); return n


def bloque(c, i, j):
    """lineas i..j (incluidas) de la ficha, sin las vacias."""
    return '\n'.join(l for l in _lineas(c)[i:j + 1] if l.strip()).strip()


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
cl = lambda c, a, s=None: J(fijar(c, a, s))

# ================================================================= 0. AGENDA (solo en empresas y contratas que ya existen; ninguna administracion ni junta nueva)
RAQUEL = persona_nueva('Raquel', 'Maestro', None, None, None, empresa=ANTONAYA,
                       notas_='AGA Antonaya: trae La Seo de Urgel 13 y 15 y Lopez de Hoyos 365 (nov-2024; carpetas laseodeurgel13, laseodeurgel15 y lopezdehoyos365). '
                              'En la agenda ya esta el correo raquelmaestro@antonaya.com como correo de la empresa.')
JVALLEJO = persona_nueva('José', 'Vallejo', None, None, 'jose.vallejo@vallejoylara.es', empresa=VALLEJOLARA,
                         notas_='Vallejo y Lara: contacto de Llanos de Escudero 6 (subvenciones del ascensor, abr-2026).')
persona_nueva('Álvaro', 'Martín Cicero', None, None, 'amartincicero@elecnor.com', contrata=ELECNOR,
              notas_='Elecnor: trae Lopez de Hoyos 384 bis (sep-2024); en copia en Lago Constanza 34.')

# ================================================================= 1. PRODUCCION (10 carpetas, 10 oportunidades)
n34 = partir(fijar('lagoconstanza34', 2022), 12, 'De: Alex Figueroa', '2025-10-15')
n34 = motivo(n34, 13, 'Correo de Alex Figueroa a Alejandra Perez del 15 de octubre de 2025, pegado en la ficha debajo de la nota de Daniel del 07/10/2025.')
rellenar('lc34', 'LAGO CONSTANZA 34', 'lagoconstanza34', {'fecha_apertura': '2022-04-28', 'referencia_catastral': '5160429VK4756A',
    'origen_notas': 'Fecha de llegada: la ficha dice 05/2022; la primera nota es del 28/04/2022 (visita con el del local, Ibai y el administrador); se toma esa (el escaneo FARO es del 20/05/2022). '
                    'Contacta: ELECNOR: Ana Encinas, Javier Velasco y Lucia Davila (antes Ibai, tachado). Tipo de obra: ASCENSOR, CSS Y SUBVENCIONES (ascensor interior de 3-4 personas sin tocar '
                    'el local ni el muro del patio; el edificio tiene 2 escaleras y la primera ya tiene ascensor). Tecnico: ISP & AFO. Fecha encargo: 25/09/2024 (HE firmadas 26/09/2024; se cobra cuando '
                    'den la licencia). LICENCIA por ECU (ACTECU), presentada 18-03-2025 y aprobada 29-07-2025. Administracion: ADMINISTRACION DE FINCAS MATEOS (Alvaro Mateos Gonzalez; Virgen de los '
                    'Reyes 18; 91 405 12 86 / 646 42 88 70; admonfincas_mateos@hotmail.com). Presidenta: Asuncion Ramos Nunez (51632309T). Visado TL/004322/2025. Expediente 350/2025/08077. '
                    'Las rampas de la entrada, de otro arquitecto, van con la DR 350/2024/16762. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'css', 'subvenciones'), n=n34, trae_pu=PU['aencinas'],
    huecos=['[REVISAR EN FACTURACION] Licencia aprobada el 29-07-2025: "El monto del proyecto se intercambia con Elecnor por el importe de los trabajos adicionales de LLANOS DE ESCUDERO 37. '
            'Asi que se queda sin nada que facturar." Revisar en facturacion ese cruce con Llanos de Escudero 37 (que esta en la clon).'])
rellenar('su13', 'SEO DE URGEL 13', 'laseodeurgel13', {'fecha_apertura': '2024-11-28',
    'origen_notas': 'Fecha de llegada: 11/2024 (dia: la primera nota, 28/11/2024: escanear con iPhone para 3D). Contacta: Raquel Maestro (AGA ANTONAYA). Tipo de obra: ASCENSOR eliminando el existente '
                    '(por el interior, derribando la escalera; cabe silla de ruedas; presupuesto aproximado 190.000; se puede ofrecer un 3D). Administracion: AGA ANTONAYA (Raquel Maestro). '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor',), n=fijar('laseodeurgel13', 2024), adm=RAQUEL, trae_pu=RAQUEL)
rellenar('su15', 'SEO DE URGEL 15', 'laseodeurgel15', {'fecha_apertura': '2024-11-28',
    'origen_notas': 'Fecha de llegada: 11/2024 (dia: la primera nota, 28/11/2024: escanear con iPhone para 3D). Contacta: Raquel Maestro (AGA ANTONAYA). Tipo de obra: ASCENSOR por dentro '
                    '(cabe silla de ruedas; presupuesto de obra 180.000, mas barato que el n. 13 porque no hay ascensor previo que quitar; posible 3D). Administracion: AGA ANTONAYA (Raquel Maestro). '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor',), n=fijar('laseodeurgel15', 2024), adm=RAQUEL, trae_pu=RAQUEL)
n = partir(fijar('licenciadovidriera5', 2025), 8, 'De: Guillermo Pueyo', '2025-09-22')
n = motivo(n, 9, 'Correo de Guillermo Pueyo (Del Brio y Blanco) del 22 de septiembre de 2025, pegado en la ficha debajo de la nota del 16/09.')
rellenar('lv5', 'LICENCIADO VIDRIERA 5', 'licenciadovidriera5', {'fecha_apertura': '2025-03-31', 'referencia_catastral': '3312402VK4731C',
    'origen_notas': 'Fecha de llegada: la ficha dice 04/2025; el correo de Javier Garcia (Del Brio y Blanco) es del 31/03/2025; se toma ese. Contacta: DEL BRIO Y BLANCO: Guillermo Pueyo y Manuel Blanco '
                    '(jefe; 680 50 32 43; 91 477 41 91 / 91 478 69 11); antes Javier Garcia, tachado ("Javier ya no trabaja con ellos", 09/06/2025). Paga: la CP. Tipo de obra: ASCENSOR + CSS + SUBV '
                    '(la HE incluye tambien la DF). Barrio: San Diego. Tecnico: KGS. Fecha encargo: 12/06/2025 (HE firmadas 13-06-2025). Ano 1970. LICENCIA por ECU (ACTECU): registrada en el Ayto '
                    '23/02/2026, concedida 27/05/2026. Contrata elegida: FAIN (David Sanchez, david.sanchez@fainascensores.com). Presidente: Carlos Rubio Garcia (50989462A; 667 297 261; '
                    'carlos.rub87@gmail.com); en el correo de mar-2025 el presidente era Dumitru Birsan (620 885 644). Garaje: Olga, 649 364 523. PEM 124.900,60. Visado TL/011773/2025. '
                    'Superficie 61,31 m2. En la junta de junio de 2025 los propietarios supeditan la instalacion del ascensor a que se conceda la subvencion. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'css', 'df', 'subvenciones'), n=n, comunidad={'iban': 'ES10 0081 7115 1400 0162 4264'},
    presi=('CARLOS RUBIO GARCIA', 'presidente', '667297261', '50989462A', 'carlos.rub87@gmail.com'), trae_pu=PU['guillermo'])
pc(OPP['lv5'][0]['id'], 'OLGA (DUEÑA DEL GARAJE)', 'otro', '649364523', None, None, 'Duena del garaje; "nadie la conoce ni ha ido a reuniones de vecinos" (24/06/2025).')
s6 = subv('llanosdeescudero6/ASCENSOR/FICHA DATOS.docx')
k1 = s6.index('Enviada HE subvenciones'); k2 = s6.index('22/05/2026 ALEX')
rellenar('lle6', 'LLANOS DE ESCUDERO 6', 'llanosdeescudero6', {'fecha_apertura': '2026-04-17',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: el correo del Departamento de Subvenciones de Accesalia, 17/04/2026). Contacta: Jose Vallejo (VALLEJO Y LARA; jose.vallejo@vallejoylara.es), con '
                    'Ma Victoria (912 400 736; victoria.valoria@gmail.com). Tipo de obra: en la carpeta hay dos fichas del mismo mes: ASCENSOR = "Sub ACCES ext": subvenciones de accesibilidad de un '
                    'PROYECTO EXTERNO (la obra del ascensor la hizo Rosersese; fin de obra de 2023); fecha encargo 14/05/2026; y CUBIERTA, por Victor del Pino (ARQUIOBRAS; 699 551 406; '
                    'vdelpino@arquiobras.es), sin notas. En la carpeta, la tarjeta CIF se llama "CIF COMUNIDAD C_ LLANOS DE ESCUDERO Nº 4". Comercial interno: ALVARO.'},
    ('subvenciones', 'arreglo_cubierta'), comunidad={'iban': 'ES98 0081 0134 9100 0164 7469'}, trae_pu=JVALLEJO, captador=ALVARO, lleva=ALVARO,
    subvencion=[('2026-04-17', s6[:k1].strip()), ('2026-04-20', s6[k1:k2].strip() + '\n\n(Sin fecha delante; la fecha va dentro de la nota.)'), ('2026-05-22', s6[k2:].strip())])
rellenar('lle8', 'LLANOS DE ESCUDERO 8', 'llanosdeescudero8', {'fecha_apertura': '2025-06-27', 'referencia_catastral': '5754603VK4755D',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: el correo de Rosa Radal, de Rosersese, 27/06/2025, con el presupuesto aceptado y firmado). Contacta: ROSERSESE (Rosa Radal Sese; 960 230 178; '
                    'rosersese@hotmail.com); la administracion, "a traves de Rosa". Tipo de obra: ASCENSOR (la obra la hace Rosersese y esta supeditada a la concesion de la subvencion, que tramita '
                    'Rosersese: "Se las tramita Rosersese, y la obra esta condicionada a subvencion"). Barrio: Pueblo Nuevo. Tecnico: KGS. Fecha encargo: 30/06/2025 (HE firmada). Jefe de obra: '
                    'Jose Olivares. Ano 1970. LICENCIA por ECU (ACTECU), concedida 04/11/2025. Presidenta: Maria Inmaculada Vidal Blanco (51109932E). PEM 132.408,03. Visados TL/012897/2025 y '
                    'TL/014837/2025 (documentos anadidos tras las modificaciones de la ECU, para la subvencion urgente, 03/10/2025). Superficie 135,86 m2. Comercial interno: DANIEL.'},
    ('ascensor',), n=fijar('llanosdeescudero8', 2025, ('2025-06-27', 'Correo de Rosa Radal (Rosersese) del 27 de junio de 2025.')), trae_pu=PU['rosa'])
rellenar('lon8', 'LONGARES 8B', 'longares8B-garaje', {'fecha_apertura': '2024-10-03', 'referencia_catastral': '8360904VK4786A',
    'origen_notas': 'Fecha de llegada: 10/2024 (dia: la primera nota, 03/10/2024: escribe el administrador). Contacta: el administrador, Diego Rojo (ROJO JUSDI; 625 145 522; admirojojusdi@gmail.com). '
                    'Tipo de obra: ASCENSOR EN CP GARAJES (aparcamiento Santa Florentina, 3 plantas de sotano con solo la rampa de coches; entre la Iglesia y Longares 10); la junta vota el 29-05-2025 '
                    'un proyecto de 2 ASCENSORES. Tecnico: Julio -> requerimiento, Angela. Fecha encargo: 19/09/2025 (HE firmada). DR por ECU (ACTECU). Presupuestos de ROSERSESE (dos soluciones, '
                    'abr-2025); tambien se pidio presupuesto a CEGA y a FAIN. Electricista: Miguel Angel, de Carralon - no esta en la agenda. Presidente: Eduardo Calvillo Monroy (51600610H; cambio de '
                    'presidente avisado el 09/09/2026); antes Florencio Martinez Romero (13039873T; 618 25 65 71), tachado en la ficha. Superficie 125,41. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor',), n=fijar('longares8B-garaje', 2024), trae_pu=PU['diego'])
arreglar_pc(OPP['lon8'][0]['id'], 'rol=eq.presidente&nombre=eq.' + quote('FLORENCIO MARTINEZ ROMERO'),
            {'nombre': 'EDUARDO CALVILLO MONROY', 'documento': '51600610H',
             'notas': 'Antes: Florencio Martinez Romero (13039873T; 618 25 65 71), tachado en la ficha; cambio de presidente avisado por el administrador el 09/09/2026.'})
rellenar('lh163', 'LOPEZ DE HOYOS 163', 'lopezdehoyos163', {'fecha_apertura': '2026-02-11',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: el modelo 3D y la ficha, 11/02/2026). Tipo de obra: ACCESIBILIDAD. La ficha no tiene contacto ni notas; hay modelo 3D. '
                    'En la ficha: comercial interno CARLOS.' + EXT},
    ('accesibilidad',), captador=ALVARO, lleva=ALVARO)
rellenar('lg11', 'LOPEZ GRASS 11', 'lopezgrass11', {'fecha_apertura': '2025-11-14',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia: la primera nota y el escaneo 3D, 14/11/2025). Contacta: Ma Jesus, vecina (625 516 108). Paga: la CP. Tipo de obra: ASCENSOR ("No se puede salir del '
                    'edificio"). El 24-11-2025 no lo aprueban: las vecinas afectadas no dejan ocupar la terraza. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), n=fijar('lopezgrass11', 2025), captador=CARLOS, lleva=ALVARO)
pc(OPP['lg11'][0]['id'], 'Mª JESUS (VECINA)', 'vecino', '625516108', None, None, 'Vecina que pide el ascensor (ficha, nov-2025).')
cerrar_perdida('lg11', 'no lo aprueban: las vecinas afectadas no dejan ocupar la terraza', '2025-11-24',
               'En la ficha: "24-11-2025 no lo aprueban, las vecinas afectadas no dejan ocupar terraza." Cerrada en el barrido de Madrid (Monica, 7-oct-2026).')
rellenar('lg42', 'LOPEZ GRASS 42', 'lopezgrass42', {'fecha_apertura': '2025-07-15',
    'origen_notas': 'Fecha de llegada: 07/2025 (dia: la fecha de encargo, 15/07/2025, que es tambien la de contratacion de la subvencion; el presupuesto firmado de la carpeta es del 16/07/2025). '
                    'Contacta: Carlos del Brio (DEL BRIO Y BLANCO). Paga: la CP. Tipo de obra: SUBVENCION EXTERNA (en la carpeta, la IEE de 2019, desfavorable). Pedidos docs a la CP 16/07/25. '
                    'La ficha no tiene notas. Comercial interno: DANIEL.'},
    ('subvenciones',), comunidad={'iban': 'ES33 0081 7115 1200 0149 7751'}, trae_pu=PU['cdelbrio'])

# ================================================================= 2. CLON
REVS = [
    ('lagoconstanza46', '2017-04-04', 'INVER', 'H79725610', '5259902VK4755G',
     'CALLE LAGO CONSTANZA 46 MADRID. Fecha: 04/2017 (la ficha no la trae; dia: los primeros ficheros, oferta de ascensor y presupuestos de las escaleras dcha. e izda., 04/04/2017; contrato del 17/04/2017). '
     'Tipo de obra: la ficha no lo dice (en la carpeta, oferta de ascensor y presupuestos por escalera). Distrito 15 - Ciudad Lineal. CP 28017. Administracion: "Administrador de Fincas Urbanas" '
     '(Pablo Guerra; 91 326 48 52; info@gesfisem.com) - no esta en la agenda (hay un Pablo Guerra en GESTION DEHESPA). Contacto: Marcelino (616 332 679; mllorente222@gmail.com). '
     'Presidente: Marcelino Llorente Lazaro (34109638V). PEM 89.000; residuos 300+300; superficie 130,30 m2; NZ 4. Junta de Ciudad Lineal (C/ Hermanos Garcia Noblejas 16; negociado de licencias '
     '91 588 75 30, lunes, miercoles y viernes de 9.00 a 10.30 sin cita); tecnico: Carlos. Expediente 116/2017/02606 (ICIO 356; tasa 404,70). Presupuesto final para subvencion 199.747. '
     'La ficha no tiene notas.'),
    ('laguna38 casimiroescudero2', '2025-04-17', 'ANA ENCINAS (ELECNOR)', None, None,
     'CALLE LAGUNA 38 - CASIMIRO ESCUDERO 2 MADRID. Fecha: 04/2025 (dia: la visita con Ana Encinas, 17/04/2025). Tipo de obra: ASCENSOR (para minusvalidos en via publica, 5 paradas de embarque simple, '
     'acceso desde la calle). Distrito Carabanchel. CP 28025. Hay modelo 3D (21/04/2025).\n\n' + crudo('laguna38 casimiroescudero2', 2025)),
    ('lavapies51', '2025-01-15', 'OSCAR LOPEZ (FAIN) -> JAVIER SANCHEZ (ALDA GESTION)', None, None,
     'LAVAPIES 51 MADRID. Fecha: 01/2025 (dia: la primera nota, 15/01/2025). Tipo de obra: SATE Y SUBV (fachada protegida con ladrillo y molduras; estudio de costes de un SATE de STO que imita '
     'el ladrillo). Distrito Centro. CP 28012. Lo pasa Oscar Lopez (FAIN). Administracion: ALDA GESTION INTEGRAL INMOBILIARIA, S.L. (Javier Sanchez; Paseo de las Delicias 20, 2o B, 28045; '
     '91 530 85 25; javier@aldagestion.es) - no esta en la agenda. La carpeta solo tiene la ficha.\n\n' + crudo('lavapies51', 2025)),
    ('lazcano7', '2024-03-06', 'FRAN (FAIN)', None, None,
     'LAZCANO 7 MADRID. Fecha: 03/2024 (dia: la visita, 06/03/2024). Tipo de obra: ASCENSOR EXTERIOR CON DERRIBO de escalera. Distrito Villaverde. CP 28041. La carpeta solo tiene la ficha.\n\n'
     + crudo('lazcano7', 2024)),
    ('leñeros 44 y 46', '2016-02-11', 'JOSE HENAREJO (ADMINISTRADOR)', 'H78392552', '9987428VK3798H',
     'CALLE LEÑEROS 44 y 46 MADRID. Fecha: 02/2016 (la ficha no la trae; dia: los primeros ficheros, croquis, planos y presupuesto, 11/02/2016; hay ficheros hasta feb-2020). Tipo de obra: la ficha no lo '
     'dice (en la carpeta, presupuestos por portal, uno de "inclinada" y una "PROPUESTA sotano"; y una subcarpeta "leñeros48" con "igual leñeros46"). CP 28039. Administrador: Jose Henarejo '
     '(609 84 06 52) - no esta en la agenda. Presidente: Fernando Grao Prieto (1o A). PEM 9.500 + 9.500 = 19.000; residuos 500 + 500. Fachada 32 m. Expediente TL/008394/2016. La ficha no tiene notas.'),
    ('leon8', '2021-12-21', 'ABEL BERNARDOS (FAIN)', None, None,
     'LEON 8 MADRID. Fecha: 12/2021 (dia: la fecha de encargo, 21/12/2021). Tipo de obra: CALCULO DE DEFLEXIONES (encargo de FAIN). CP 28014. En la carpeta, el documento de deflexiones firmado y '
     'sus planos (21/12/2021); la ficha esta en OBRA/DEFLEXIONES. La ficha no tiene notas.'),
    ('llanosdeescudero37', '2021-06-01', 'DANIEL NAVARRO (ELECNOR)', 'H79286894', '5855903VK4755F',
     'LLANOS DE ESCUDERO 37 MADRID. Fecha: 06/2021 (la ficha dice "fecha inicio" 27/09/2021; los primeros ficheros de trabajo, el proyecto anterior recibido, son del 01/06/2021 y el modelo 3D del '
     '08/06/2021; hay un dxf de Catastro de 2019). Tipo de obra: ASCENSOR Y RAMPA PORTAL. CP 28017. Administracion: FINCAS MODA, S.L. (Monica Degano y David Gomez; C/ Tarragona 16, 2o D, 28045; '
     '91 222 54 47 / 665 668 848; mdegano@fincasmoda.es; dgomez@fincasmoda.es) - no esta en la agenda. PEM 202.952; residuos 300. Expediente del Ayto 116/2019/319. Visado COAM TL/006069/2024 '
     '(justificacion de obra). En la ficha de Lago Constanza 34 (29-07-2025): el importe de aquel proyecto se cruza con Elecnor por los trabajos adicionales de este edificio.\n\n'
     'Lo escrito al final de la ficha (sin cabecera de notas):\n' + bloque('llanosdeescudero37', 106, 115)),
    ('lopezdehoyos365', '2024-11-28', 'RAQUEL MAESTRO (AGA ANTONAYA)', None, None,
     'LOPEZ DE HOYOS 365 MADRID. Fecha: 11/2024 (dia: la primera nota, 28/11/2024). Tipo de obra: ACCESIBILIDAD (bajar el ascensor actual a cota cero y modificar las escaleras de planta baja a primera '
     'y a sotano; presupuesto aprox. 75.000). Distrito Hortaleza. CP 28043. Hay modelo 3D (05/12/2024).\n\n' + crudo('lopezdehoyos365', 2024)),
    ('lopezdehoyos384bis', '2024-09-19', 'ALVARO MARTIN CICERO (ELECNOR)', None, None,
     'LOPEZ DE HOYOS 384 BIS MADRID. Fecha: 09/2024 (dia: los correos de David de Lucas, 19/09/2024). Tipo de obra: SATE, ACCESIBILIDAD Y NEXT GEN (rehabilitacion integral; la comunidad ya tiene '
     'proyecto y licencia solicitada con otro arquitecto; coste estimado 600.000 EUR; ITE desfavorable). Distrito Hortaleza. CP 28043. El presidente, David de Lucas (delucas.david@gmail.com), escribe '
     'a Alvaro Martin Cicero (Elecnor) tras una jornada de fondos europeos. En la carpeta, lo recibido de la comunidad (proyecto y materiales, ficheros de ene-2023).\n\n'
     + cl('lopezdehoyos384bis', 2024, ('2024-09-19', 'Correos de David de Lucas del 19 de septiembre de 2024.')))]
for carp, fecha, trajo, cif, ref, t in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV)
fila('lopezdehoyos342c', '2025-10-10', 'cerrada', 'Perdida: "20-11-2025 NO SE FIRMA, se van con M2 arquitectura".', 'PAZ (CIUDADELA)', None, None,
     'LOPEZ DE HOYOS 342C MADRID. Fecha: 10/2025 (dia: el escaneo de Carlos, 10/10/2025). Paga: la CP. Contacta: la administracion, CIUDADELA (Paz; en la agenda, Maria Paz Terradillo). '
     'Distrito: en la ficha "CIUDAD LINEAL" (CP 28043). En produccion hay una oportunidad vacia "LOPEZ DE HOYOS 342B" (acceso de Catastro Lopez de Hoyos 342, 4189008VK4848G) sin carpeta de su numero; '
     'no se casa con esta. Hay modelo 3D (oct-2025). Comercial interno: CARLOS (la capto antes de irse, feb-2026).\n\n' + crudo('lopezdehoyos342c', 2025), comercial='Alvaro (capto Carlos)')
for carp, fecha, trajo, t in [
        ('lapaz9', '2017-11-15', 'LUIS MIGUEL NUNES (THYSSEN)', 'CALLE LA PAZ 9 MADRID. Fecha: 11/2017. Distrito 01 - Centro. Ficha vacia; hay croquis.'),
        ('lasaguas6', '2017-04-10', 'PEDRO ARANDA (THYSSEN)', 'CALLE LAS AGUAS 6 MADRID. Fecha: 04/2017. Ficha vacia; hay croquis (abr-jun 2017).'),
        ('leganitos29', '2016-04-26', 'LUIS MIGUEL NUNES (THYSSEN)', 'LEGANITOS 29 MADRID. Fecha: 04/2016 (las fotos son del 26/04/2016; la ficha dice 02/06/2016). Ficha vacia; hay fotos (abr-jun 2016).'),
        ('leonorgongora40', '2016-12-14', 'PEDRO ARANDA (THYSSEN)', 'LEONOR GONGORA 40 MADRID. Fecha: 12/2016. Ficha vacia salvo: "ascensor, embarque simple, 4 paradas, hueco libre 1270 x 1700 '
         '(o lo que necesites de fondo). Puedes poner hidraulico de cabina ACCESIBLE 1000 x 1250". Hay croquis.'),
        ('laserena7', '2015-11-22', None, 'LA SERENA 7 MADRID. Carpeta SIN ficha de datos: plano y presupuesto (nov-2015).'),
        ('lopedevega24', '2015-01-07', None, 'LOPE DE VEGA 24 MADRID. Carpeta SIN ficha de datos: solo fotos (ene-2015).'),
        ('lopezgrass21', '2016-10-31', None, 'LOPEZ GRASS 21 MADRID. Carpeta SIN ficha de datos: video (26/10/2016), oferta de ascensor 21M.1032 y presupuesto de obra civil "modelo E - derribo de '
         'escalera y desarrollo de la misma por fuera" (3 de noviembre de 2016).'),
        ('laespañola1', '2021-02-25', None, 'LA ESPAÑOLA 1 MADRID. Carpeta SIN ficha de datos: correos, presupuesto de Carver, proyecto visado y licencia concedida, numerados "32.-" (25/02/2021; '
         'la misma tanda que Hermanos de Pablo 45 y Hermanos Gomez 45, proyectos de otro arquitecto que pasaron a Daniel).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)
# lasalle12: SIN fila. Es el mismo encargo (informe de estructura para Elecnor, oct-2023) que ya esta en la clon como "delasalle 12hospitalvithas" (tanda D);
# en lasalle12 estan los ficheros de trabajo y una copia de la ficha.

# ================================================================= 3. MANIAS
mania('Ascensor en edificio residencial en Norma Zonal 3.2: la ECU lo tramita por procedimiento de Licencia (y aparte la DR de Funcionamiento).', 'ECU (ACTECU)', '2025-09-02',
      'llanosdeescudero8', clave='lle8', trozo='Norma Zonal 3.2')

resumen()
