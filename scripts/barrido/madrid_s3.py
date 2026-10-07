# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda S3 (santavirgilia8-10-12 .. sormariadeagreda24, carpetas [100:149] de la S). 7-oct-2026. Sin --escribir: marcha en seco.
# La S1 [0:50] y la S2 [50:100] (y la R) las preparan otros agentes a la vez.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa
from madrid_comun import _notas_de

TREBOL = '1dc85bf6-c0ef-4aae-94b9-ad65db1e15cd'; UREKA = '7a7c67ca-1b1e-43fd-a8e1-a99ba1bc5fa9'
PU.update(javier_trebol='00c900df-1c1c-4f09-b45e-a28bc3c6381d', maribel_trebol='fb9b59f3-3721-4e6e-80c8-08203e2da0f4',
          vanesa_dbb='05cda534-6907-43b0-b674-53cbe143a278', pedro_dbb='62b2404c-cf2c-4c66-bfc5-e7412a379559', carlos_dbb='cf9c0d74-d01a-4ed2-a0f0-8fcaadd6e4ae',
          olivares='fe2ea8b4-9be7-42b8-b64f-d644fa8198b1', zapata='2bf37426-2134-448e-97d0-c6c7b81f65e7', ines_ureka='3651c9ea-3ddd-4ad0-ac86-9a948166d4ab',
          vrojo='263e15df-3778-4dcb-901c-5d40bb22f61c')
STV5 = 'santodomingo10/santovenia5/FICHA DATOS TECNICOS.docx'   # carpeta colada dentro de santodomingo10


def cid_de(prefijo):
    cs = b.leer('comunidades?select=id&municipio=eq.MADRID&nombre=like.' + quote(prefijo) + '*'); assert len(cs) == 1, prefijo
    return cs[0]['id']


def pc_unico(cid, nombre, rol, tel=None, doc=None, email=None, notas_=None):
    """pc() para roles que no son presidente, sin repetirla si el script se relanza."""
    ya = b.leer('personas_comunidad?select=id&comunidad_id=eq.%s&nombre=eq.%s' % (cid, quote(nombre)))
    return ya[0]['id'] if ya else pc(cid, nombre, rol, tel, doc, email, notas_)


def trae(pcid):
    return {'quien_persona_comunidad_id': pcid, 'persona_comunidad_id': pcid}


def motivo(n, i, m):
    f, t = n[i]; n[i] = (f, t + '\n\n(' + m + ')'); return n


crudo = lambda c, a: '\n\n'.join(t for f, t in _notas_de(c, a))
cl = lambda c, a, s=None: J(fijar(c, a, s))

# ================================================================= 0. AGENDA (ninguna administracion ni junta nueva)
BEGONA = persona_nueva('Begoña', None, 'administración', None, None, empresa=TREBOL,
                       notas_='Grupo Trebol: contacto de Sepulveda 160 (ene-2026) y Sepulveda 57 (mar-2025); carpetas sepulveda160 y sepulveda57. '
                              'Sin correo propio: escribe desde el de la empresa, trebol.fincas@gmail.com.')
JANET = persona_nueva('Janet', 'Calixto', 'Responsable, Departamento de Producción (Oficina técnica y Obras)', None, None, contrata=UREKA,
                      notas_='Grupo Ureka: sustituye a Ines Sancha (tachada) como contacto de Solsona 7 (carpeta solsona7). Sin telefono ni correo propios en la ficha.')

# ================================================================= 1. PRODUCCION (19 carpetas, 19 oportunidades)
rellenar('st1', 'SANTURCE 1 MADRID', 'santurce1', {'fecha_apertura': '2023-05-31', 'referencia_catastral': '5853306VK4755D',
    'origen_notas': 'Fecha de llegada: 05/2023 (dia: "Rosa lo ordena el 31/05/2023"; en la casilla de la administracion, "pedido presup 16-06-2023"). Contacta: Rosa (ROSERSESE; '
                    '610 93 38 63); en la ficha, EMPRESA/CLIENTE: OLIVARES. Tipo de obra: ASCENSOR. Barrio: Pueblo Nuevo. Tecnico: Susana. Presidenta: Manuela Gonzalez Esquinas '
                    '(02186792K). Tramita la ECU (ACTECU): "Tramitar por ECU!!! Rosa lo ordena el 31/05/2023"; solicitud ECU 1311023020262, certificado de conformidad '
                    '1311523020262. APIRU NZ 3.2. PEM 136.379,06. Visado TL/017370/2023. Superficie 130,43. En la carpeta, la obra en marcha: PSS y apertura del centro de '
                    'trabajo (ene-2025) y actas de obra con fotos hasta el 31/08/2026. La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor',), n=fijar('santurce1', 2023, ('2023-05-31', 'Sin fecha; repite el "Tramitar por ECU" de la ficha, que Rosa ordena el 31/05/2023.')),
    trae_pu=PU['rosa'])

rellenar('sg49', 'SEGOVIA 49 MADRID', 'segovia49', {'fecha_apertura': '2025-11-27', 'referencia_catastral': '9241104VK3794A',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia: la primera nota, 27/11/2025, "NO HACER 3D"; el .skb de oct-2025 y el anejo de dic-2024 son de plantilla). Contacta: la '
                    'administradora, Montserrat Cabrera (ASESIFA SL; 676 71 01 38; asefisasl@gmail.com). Paga: la CP. Tipo de obra: ASCENSOR + SUBV. Barrio: Imperial. Tecnico: '
                    'Carlos Daza. Fecha encargo: 03/12/2025 (en la nota del 27/11/2025 pone "Aceptada HE 3-4-2025": la fecha no cuadra con la ficha). Ano 1969. Tramita la ECU '
                    '(ACTECU), por LICENCIA: proyecto enviado a la ECU 29/01/2026; tasa pagada y hoja de encargo de la ECU firmada 29/07/2026; presupuestos de contratas enviados '
                    '25/08/2026. Presidente: Ismael Garcia Nora (33512434P). Superficie 36,10. En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS},
    ('ascensor', 'subvenciones'),
    n=fijar('segovia49', 2025, otros={0: ('2025-11-27', 'En la misma nota, "Aceptada HE 3-4-2025": la fecha no cuadra (la ficha da llegada 11/2025 y encargo 03/12/2025); se deja tal cual.')}),
    comunidad={'iban': 'ES40 2100 3704 5513 0011 7235'}, captador=CARLOS, lleva=ALVARO)

n = partir(fijar('sepulveda101', 2026, ('2026-03-11', 'Correo de Fernando Zapata (Inmape) del 11 de marzo de 2026, con la valoracion de Daniel debajo.')),
           1, '26-03 enviada', '2026-03-26')
rellenar('sp101', 'SEPULVEDA 101 MADRID', 'sepulveda101', {'fecha_apertura': '2026-03-11',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia: el correo de Fernando Zapata, 11/03/2026). Contacta: Fernando Zapata, comercial de INMAPE (contrata; 638 107 523; '
                    'fernando.zapata@inmape.com), tras la reunion de Daniel con Adrian (Inmape); en el mismo correo pide tambien Puerto de Canencia 10 (Majadahonda). Tipo de obra: '
                    'ACCESIBILIDAD: bajar el ascensor a cota 0 (PEM estimado por Daniel 45.000 EUR + IVA sin las modificaciones del ascensor). HE enviada 26/03/2026. '
                    'Comercial interno: DANIEL.'},
    ('cota_cero', 'subvenciones'), n=n, trae_pu=PU['zapata'])

csp160 = cid_de('SEPULVEDA160')
gema = pc_unico(csp160, 'GEMA', 'vecino', '687519293', None, None,
                'Persona de contacto de la comunidad en la ficha (ene-2026). En el correo de Grupo Trebol del 22/01/2026 el contacto es "Teresa 687 51 92 95".')
rellenar('sp160', 'SEPULVEDA160', 'sepulveda160', {'fecha_apertura': '2026-01-22',
    'origen_notas': 'Fecha de llegada: 01/2026 (dia: el correo de Grupo Trebol, 22/01/2026). Contacta: Begona (GRUPO TREBOL; Calle Cayetano Pando 2, local 1, 28047; '
                    'trebol.fincas@gmail.com): la comunidad tiene reunion y quiere tratar la viabilidad del ascensor. En la ficha, "GRUPO TREBOL (PEDIDOS DOCS 17/07)". Contacto de la '
                    'comunidad: Gema, 687 51 92 93 (ficha); en el correo, Teresa, 687 51 92 95. Tipo de obra: ASCENSOR + SUBV (derribo completo de escalera, rampa y ascensor de tres '
                    'personas; PEM estimado 205.000 EUR + IVA). HE enviada con informe 27/01/2026. Comercial interno: DANIEL.'},
    ('ascensor', 'subvenciones'),
    n=fijar('sepulveda160', 2026, ('2026-01-22', 'Correo de Grupo Trebol del 22 de enero de 2026, con la valoracion de Daniel debajo.')),
    adm=BEGONA, trae_pu=BEGONA)

n = partir(_notas_de('sepulveda26', 2025), 0, '---------- Forwarded message ---------', '2025-05-12', vez=2)
n[0] = ('2025-02-24', n[0][1] + '\n\n(Correo de Maribel (Grupo Trebol) del 24 de febrero de 2025.)')
n = motivo(n, 1, 'Correo de Javier (Grupo Trebol) del 12 de mayo de 2025, que reenvia el anterior.')
assert all(f for f, t in n), n
rellenar('sp26', 'SEPULVEDA 26', 'sepulveda26', {'fecha_apertura': '2025-02-24',
    'origen_notas': 'Fecha de llegada: la ficha dice 05/2025; el primer correo de Grupo Trebol es del 24/02/2025 ("Os solicito de nuevo informacion", asi que hubo una peticion '
                    'anterior sin fecha); se toma ese. Contacta: GRUPO TREBOL (Maribel en feb-2025; Javier en may-2025; Cayetano Pando 2, 28047; trebol.fincas@gmail.com; en la '
                    'ficha, Javier 646 973 095). Tipo de obra: ASCENSOR. CP 28011. Presidente: Jose Miguel (616 97 30 95; jovigo92@yahoo.es). HE enviada 02/06/2025. '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor',), n=n, presi=('JOSE MIGUEL', 'presidente', '616973095', None, 'jovigo92@yahoo.es'), adm=PU['javier_trebol'], trae_pu=PU['javier_trebol'])

rellenar('sp33', 'SEPULVEDA 33 MADRID', 'sepulveda33', {'fecha_apertura': '2025-10-21',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: el correo de Javier, de Grupo Trebol, 21/10/2025). Contacta: Javier (GRUPO TREBOL; trebol.fincas@gmail.com), con los '
                    'presupuestos ya aceptados de la contrata (en la carpeta, "facilitado por el adm"). Tipo de obra: MEMORIA VALORADA para la sustitucion de la cubierta de panel '
                    'sandwich (licencias); Daniel: "lo hariamos por DR". HE enviada 24/10/2025. Comercial interno: DANIEL.'},
    ('memoria_valorada', 'arreglo_cubierta'),
    n=fijar('sepulveda33', 2025, ('2025-10-21', 'Correo de Javier (Grupo Trebol) del 21 de octubre de 2025, con la indicacion de Daniel debajo.')),
    adm=PU['javier_trebol'], trae_pu=PU['javier_trebol'])

csp49 = cid_de('SEPULVEDA 49')
pc_unico(csp49, 'GERARDO', 'vecino', '610485744', None, None, 'Persona de contacto de la comunidad (correo de Grupo Trebol, 05/02/2026).')
rellenar('sp49', 'SEPULVEDA 49 MADRID', 'sepulveda49', {'fecha_apertura': '2026-02-05',
    'origen_notas': 'Fecha de llegada: 02/2026 (dia: el correo de Maribel, de Grupo Trebol, 05/02/2026: "aprobaron en la ultima reunion consultar la viabilidad del ascensor"). '
                    'Contacta: Maribel (GRUPO TREBOL; Calle Cayetano Pando 2, local 1, 28047; trebol.fincas@gmail.com). Contacto de la comunidad: Gerardo, 610 485 744. Tipo de '
                    'obra: ASC. HE con informes, en manos de Alvaro (06/02/2026). Comercial interno: ALVARO.'},
    ('ascensor',), n=fijar('sepulveda49', 2026, ('2026-02-05', 'Correo de Maribel (Grupo Trebol) del 5 de febrero de 2026.')),
    adm=PU['maribel_trebol'], trae_pu=PU['maribel_trebol'], captador=ALVARO, lleva=ALVARO)

rellenar('se23', 'SERENA 23 MADRID', 'serena23', {'fecha_apertura': '2026-04-22',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia: el escaneo 3D, 22/04/2026). Contacta: Vanesa (DEL BRIO Y BLANCO; vanesa@delbrioyblanco.es). La ficha no dice tipo de obra. '
                    'HE enviada 27/04/2026. Comercial interno: ALVARO.'},
    (), n=fijar('serena23', 2026, ('2026-04-27', 'Sin fecha delante; la fecha va dentro de la nota.')),
    adm=PU['vanesa_dbb'], trae_pu=PU['vanesa_dbb'], captador=ALVARO, lleva=ALVARO)

rellenar('se25', 'SERENA 25 MADRID', 'serena25', {'fecha_apertura': '2026-04-01',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia desconocido; el unico fichero es la ficha, del 06/05/2026). Contacta: Pedro (DEL BRIO Y BLANCO; Pedro Escalona, '
                    'pedro@delbrioyblanco.es). Tipo de obra: IEE (enviada 07/05/2026). Comercial interno: ALVARO.'},
    ('iee',), n=fijar('serena25', 2026, ('2026-05-07', 'Sin fecha delante; la fecha va dentro de la nota.')),
    adm=PU['pedro_dbb'], trae_pu=PU['pedro_dbb'], captador=ALVARO, lleva=ALVARO)

rellenar('sb35', 'SERVANDO BATANERO 35 MADRID', 'servandobatanero35', {'fecha_apertura': '2020-08-13', 'referencia_catastral': '5158304VK4755G',
    'origen_notas': 'Fecha de llegada: AGOSTO 2020 (dia: las fotos de la visita, que llevan el 13/08/2020 en el nombre; el croquis es del 14/08/2020). Agente comercial: Jose Olivares '
                    '(ROSERSESE). Tipo de obra: INSTALACION DE ASCENSOR. Administracion: VICENTE ROJO (913 67 61 40 / 638 64 46 88; vicente@vrojo.com). Comunidad: CDAD PROP '
                    'SERVANDO BATANERO 35 (CIF H78305117). PEM 113.835,05. Expediente del Ayuntamiento 116/2020/03274; tecnico de la Junta de Ciudad Lineal a 10/12/21: Jose Maria '
                    'Monreal ("Pedida cita el 22/12"). Visado del CFO TL/008718/2024. En la carpeta, fin de obra (fotos y acta, may-2024) y certificado final a origen (mar-2025). '
                    'La ficha no tiene notas ni comercial interno; la lleva Daniel.'},
    ('ascensor',), comunidad={'cif_comunidad': 'H78305117'}, adm=PU['vrojo'], trae_pu=PU['olivares'])

rellenar('sie55', 'SIENA 55 MADRID', 'siena55', {'fecha_apertura': '2025-06-03', 'referencia_catastral': '4862406VK4746D',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: el correo de Rosa, 03/06/2025: "necesito proyecto urgente"). Contacta y paga: ROSERSESE (Rosa Radal Sese; 960 230 178; '
                    'rosersese@hotmail.com), HE estandar de Rosersese a precio especial. Tipo de obra: ASCENSOR + CSS. Barrio: Quintana. Tecnico: KGS. Fecha encargo: 04/06/2025 '
                    '(HE firmada 05/06/2025). Ano 1955. Ref. catastral compartida con los portales 51 y 53: la comunidad es CDAD PROP CL SIENA N 51, 53 Y 55 (CIF H81408965), y '
                    'en jun-2025 iba a cambiar de CIF y razon social para independizarse de la mancomunidad ("no visar ni solicitar licencia hasta que nos den el CIF nuevo"). '
                    'Presidenta: Maria Soledad Sevilla Lopez (07485725F; Marisol, 657 842 599). Tramita la ECU (ACTECU): DR registrada en el Ayto 17/12/2025. PEM 75.744,76. '
                    'Visado TL/013562/2025. Superficie 49,55. Rosersese: por ahora no hacen la obra, "esta condicionada a las ayudas" (28/05/2026). Subvenciones: "SE LA HACEN '
                    'ELLOS". La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'css'),
    n=fijar('siena55', 2025, ('2025-06-03', 'Correo de Rosa Radal Sese (Rosersese) del 3 de junio de 2025; encima, la indicacion para la HE.')),
    presi=('MARIA SOLEDAD SEVILLA LOPEZ', 'presidente', '657842599', '07485725F'), trae_pu=PU['rosa'])

n = fijar('sierradecontraviesa38-40', 2023)
n = partir(n, 1, '28-11-2023:DANIEL', '2023-11-28')
n = partir(n, 4, 'De:\xa0Subvenciones Accesalia', '2023-12-28')
n = partir(n, 5, 'Carmen (Bufete del Brio y Blanco)\xa0<carmen@delbrioyblanco.es>\n7 de noviembre', '2024-11-07')
n = partir(n, 6, 'El mié, 31 ene 2024', '2024-01-31')
rellenar('sc38', 'SIERRA DE CONTRAVIESA 38-40', 'sierradecontraviesa38-40', {'fecha_apertura': '2023-10-18', 'referencia_catastral': '3006803VK4730E',
    'origen_notas': 'Fecha de llegada: 10/2023 (dia: el correo de Juan Manuel Munoz, de Del Brio y Blanco, 18/10/2023). Contacta: Juanma y Carlos del Brio (DEL BRIO Y BLANCO, '
                    'entonces la administracion; en la ficha, tachados). Paga: "SE COBRA A LA COMUNIDAD". Tipo de obra: SATE + ARREGLOS CUBIERTA + NEXT (subvencion Next '
                    'Generation, Programa 3, registrada el 28/12/2023). Barrio: Entrevias. Tecnico: Jonatan. Dos portales de 19 viviendas, 5 locales y garaje. Administracion actual: '
                    'HERRAIZ ABOGADOS (Enrique; Hernandez Mas 16, local, 28053; 917 850 911 / 682 409 048; fincas@herraizabogados.com, info@herraizabogados.com). Presidente: '
                    'Angel del Hierro Sanchez (n.40 3o C; 50985914C; 667 515 548); antes, tachado, Angel Palomo Castro (n.38 3o D; 50980473F; 615 314 216; angelpalomo35@gmail.com). '
                    'CIF E28932325 (letra E: comunidad de bienes). Visado TL/020393/2023. IEE favorable (ene-2024). El 30/01/2024 la junta acuerda por unanimidad no aprobar los '
                    'presupuestos ni hacer la obra de la envolvente, y en nov-2024 no pedir ninguna subvencion; en la carpeta, Programa 3 desistido (aceptado el desistimiento en '
                    'jun-2026), un informe de grietas (fotos 25/04/2025) y correos de licencia por ECU (abr-2025). La ficha no dice comercial interno; la lleva Daniel.'},
    ('sate', 'arreglo_cubierta', 'subvenciones'), n=n, comunidad={'iban': 'ES90 0081 7115 1400 0156 9765'},
    huecos=['[REVISAR EN FACTURACION] Proyecto y subvencion hechos (visado TL/020393/2023; Next Generation registrada 28/12/2023) y la comunidad decide no hacer la obra '
            '(junta del 30/01/2024) ni pedir subvenciones (07/11/2024). No se cierra: revisar en facturacion.'],
    presi=('ANGEL DEL HIERRO SANCHEZ', 'presidente', '667515548', '50985914C', None,
           'N.o 40, 3o C. Antes, tachado en la ficha: Angel Palomo Castro (n.o 38, 3o D; 50980473F; 615314216; angelpalomo35@gmail.com).'),
    trae_pu=PU['carlos_dbb'])

rellenar('sv44', 'SIERRA DEL VALLE 44', 'sierradelvalle44', {'fecha_apertura': '2025-10-28',
    'origen_notas': 'Fecha de llegada: la ficha dice 11/2025; el correo de Vanesa es del 28/10/2025; se toma ese. Contacta: Vanesa (DEL BRIO Y BLANCO; vanesa@delbrioyblanco.es). '
                    'Tipo de obra: SUBV PRY EXT (honorarios de tramitacion de subvenciones para un aislamiento de fachada con MICROSATE de otro tecnico; junta el 06/11/2025). '
                    'HE de subvencion externa enviada 03/11/2025. Comercial interno: DANIEL.'},
    ('subvenciones',), n=fijar('sierradelvalle44', 2025, ('2025-10-28', 'Correo de Vanesa (Del Brio y Blanco) del 28 de octubre de 2025.')),
    adm=PU['vanesa_dbb'], trae_pu=PU['vanesa_dbb'])

rellenar('sv52', 'SIERRA DEL VALLE 52', 'sierradelvalle52', {'fecha_apertura': '2025-06-27', 'referencia_catastral': '4214735VK4741C',
    'origen_notas': 'Fecha de llegada: la ficha dice 07/2025; la fecha de encargo y los primeros documentos de la comunidad (certificado de titularidad y acta) son del 27/06/2025; '
                    'se toma esa. Contacta: Carlos del Brio (DEL BRIO Y BLANCO). Paga: la CP. Tipo de obra: SUBV PRY EXTERNO (tecnico EXTERNO; subvencion CAM 2025). Fecha '
                    'encargo: 27/06/2025; subvenciones contratadas el mismo dia ("INFINITAS"). Barrio: la ficha solo dice Puente de Vallecas. Presidenta: Mari Carmen Higueras '
                    'Gallardo. La ficha no tiene notas. Comercial interno: DANIEL.'},
    ('subvenciones',), comunidad={'iban': 'ES70 2100 2544 5813 0050 0274'}, trae_pu=PU['carlos_dbb'])

rellenar('sm11', 'SIERRA DE MOLINA 11', 'sierrademolina11', {'fecha_apertura': '2025-06-03',
    'origen_notas': 'Fecha de llegada: 06/2025 (dia: la HE de subvencion enviada, 03/06/2025; el "muestra.pzh" de ago-2023 es una muestra de Rosersese). Contacta: Carlos del Brio '
                    '(DEL BRIO Y BLANCO; Calle Carlos Martin Alvarez 65 bis, 1o B, 28018; 616 427 064; 91 477 41 91 / 91 478 69 11 / 91 477 88 32; carlos@delbrioyblanco.es). '
                    'Paga: la CP. Tipo de obra: SUBV PROY EXTERNO (subvencion CAM 2025). HE de subvencion recibida 07/07/2025. Presidente: Alejandro Rodriguez Belinchon (09806213W). '
                    'Comercial interno: DANIEL.'},
    ('subvenciones',), subvencion=[('2025-06-03', '03-06-2025 ENVIADA HE SUBV PRY EXTERNO'), ('2025-07-07', '07/07/2025 HE SUBV RECIBIDA')],
    trae_pu=PU['carlos_dbb'])
assert subv('sierrademolina11').split('\n') == ['03-06-2025 ENVIADA HE SUBV PRY EXTERNO', '07/07/2025 HE SUBV RECIBIDA'], subv('sierrademolina11')

csm17 = cid_de('SIERRA DE MOLINA 17')
pc_unico(csm17, 'DAVID', 'vecino', '633152680', None, None, 'Persona de contacto de la comunidad (correo de Pedro Escalona, Del Brio y Blanco, 15/10/2025).')
rellenar('sm17', 'SIERRA DE MOLINA 17', 'sierrademolina17', {'fecha_apertura': '2025-10-15',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: el correo de Pedro Escalona, de Del Brio y Blanco, a Alejandra, 15/10/2025). Contacta: Pedro Escalona (DEL BRIO Y BLANCO; '
                    '680 503 243; pedro@delbrioyblanco.es). Contacto de la comunidad: David, 633 152 680. Tipo de obra: ASCENSOR por el hueco de escalera (cuatro personas, cuatro '
                    'paradas, una a semisotano) y PLATAFORMA elevadora inclinada a la entrada; PEM estimado 120.000 EUR + IVA. HE e informe enviados 23/10/2025. '
                    'Comercial interno: DANIEL.'},
    ('ascensor', 'plataforma'),
    n=fijar('sierrademolina17', 2025, ('2025-10-15', 'Correo de Pedro Escalona (Del Brio y Blanco) del 15 de octubre de 2025, con la valoracion de Daniel debajo.')),
    adm=PU['pedro_dbb'], trae_pu=PU['pedro_dbb'])

rellenar('sg50', 'SIERRA GADOR 50', 'sierragador50', {'fecha_apertura': '2025-09-22', 'referencia_catastral': '7103403VK4770C',
    'origen_notas': 'Fecha de llegada: 09/2025 (dia: la primera nota, 22/09/2025; el escaneo 3D es del 23/09/2025 y la declaracion de IEE de 2024 de la carpeta es de plantilla). '
                    'Contacta: Valentin (ADMINISTRACIONES ALCORA; 617 35 47 03 / 916 978 551; administracion@administracionesalcora.es). Tipo de obra: ASCENSOR por el hueco de '
                    'escalera y PLATAFORMA elevadora inclinada. Tecnico: Alejandro Bello. Fecha encargo: 12/03/2026 (HE firmada; "la que se ha firmado es la inicial, no la '
                    'modificada"). Tramita la ECU (ACTECU), por DR; la licencia no se pide hasta que la junta apruebe uno de los tres presupuestos (sep-2026). Comunidad, en la '
                    'ficha: CDAD PROP AV ALBUFERA N 480 DE MADRID (Avda Albufera 480, 28031; CIF H80604887). Presidenta: Maria del Pilar Barrio Dominguez (51922355Q; 609 02 60 77). '
                    'Presupuesto pedido a Raul Diaz (FAIN) el 26/11/2025. Comercial interno: DANIEL.'},
    ('ascensor', 'plataforma'), n=fijar('sierragador50', 2025), comunidad={'iban': 'ES92 0081 0337 1800 0150 9957'},
    presi=('MARIA DEL PILAR BARRIO DOMINGUEZ', 'presidente', '609026077', '51922355Q'), trae_pu=PU['valentin'])

rellenar('so7', 'SOLSONA 7 MADRID', 'solsona7', {'fecha_apertura': '2024-11-14', 'referencia_catastral': '4805702VK4840F',
    'origen_notas': 'Fecha de llegada: 11/2024 (dia: el correo de Ines Sancha, de Grupo Ureka, 14/11/2024; el presupuesto .pzh del 13/11 es de plantilla). Contacta y es cliente: '
                    'GRUPO UREKA (constructora; "Cliente de Ureka, hacerlo todo a traves suyo"): Ines Sancha (682 62 94 95; i.sancha@grupoureka.com), tachada; ahora Janet Calixto. '
                    'Tipo de obra: ASCENSOR CON DERRIBO de escalera + CSS + IEE (piden proyecto visado, EBSS, DO, CSS, licencia e IEE; presupuesto de Ureka 171.714,55 EUR + IVA). '
                    'Tecnico: Jhonatan. Jefe de obra (en la ficha): RONAFE. Fecha encargo: 21/11/2024 (pedidos docs de la CP a Ureka). Ano 1960. Presidente: Javier Jimenez Murillo '
                    '(46870071G). Visado TL/019611/2024. Expediente 350/2025/01506: contestacion al requerimiento 08/10/2025; licencia aprobada 25/02/2026. '
                    'La ficha no dice comercial interno; la lleva Daniel.'},
    ('ascensor', 'df', 'css', 'iee'), n=fijar('solsona7', 2024), trae_pu=PU['ines_ureka'])

cso = cid_de('SOMONTIN 96')
estela = pc_unico(cso, 'ESTELA', 'vecino', '605791432', None, None, 'Vecina; es quien contacta (ficha, oct-2025).')
rellenar('sm96', 'SOMONTIN 96 MADRID', 'somontin96', dict({'fecha_apertura': '2025-10-20',
    'origen_notas': 'Fecha de llegada: 10/2025 (dia: los primeros ficheros, 20/10/2025: memoria, pliego, presupuesto y planos del proyecto existente, en la subcarpeta "6.CARLOS"). '
                    'Contacta: Estela, vecina (605 791 432). Tipo de obra: ASCENSOR; Accesalia, "DF + SUB": "hay proyecto, se ha parado hace muchisimo. Guerra interna." '
                    'En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS}, **trae(estela)),
    ('df', 'subvenciones'),
    n=fijar('somontin96', 2025, ('2025-10-20', 'Sin fecha; se pone la de los primeros ficheros de la carpeta (20/10/2025).')), captador=CARLOS, lleva=ALVARO)

# ================================================================= 2. CLON
REVS = [
    ('santavirgilia8-10-12', '2024-10-30', 'RAQUEL MAESTRO (AGA ANTONAYA)', None, None,
     'SANTA VIRGILIA 8-10-12 MADRID. Fecha: 10/2024 (dia: el correo de la administracion, 30/10/2024). Paga: la CP. Tipo de obra: ACCESIBILIDAD 3 PORTALES (eliminar las escaleras '
     'de acceso de cada portal; proyecto y gestion de la obra: presupuestos, subvenciones, direccion de obra). Distrito Hortaleza. CP 28033. Administracion: AGA ANTONAYA S.A.U. (Raquel '
     'Maestro; Calle de Pegaso 32, local, 28043; 91 759 39 09; raquelmaestro@antonaya.com). Presidente: Enrique Rodriguez (630 58 80 04). Monica envia presupuesto para los 3 portales '
     '+ subvenciones. En produccion estan Santa Virgilia 20 y 24, no estos portales.\n\n' + crudo('santavirgilia8-10-12', 2024)),
    ('santelesforo15', '2018-02-02', 'INVER', 'H79255212', '6253404VK4765C',
     'SAN TELESFORO 15 MADRID. Fecha: 02/02/2018 (la de la ficha; los primeros ficheros, contrato y presupuesto, son de mar-2018). Agente comercial: INVER. Tipo de obra: la ficha no '
     'lo dice (en la carpeta, proyecto de ascensor visado, licencia, inicio de obra nov-2019, certificaciones 2020 y fin de obra dic-2021). Distrito 15 - Ciudad Lineal. CP 28017. '
     'Administracion: GESYVEN, SERVICIOS INTEGRALES S.L. (David Espinosa; Cl Alcala 401, portal 2, 1o A, 28027; 91 403 41 40 / 91 545 77 97 / 91 827 64 29; d.espinosa@gesyven.com) - '
     'dato antiguo, no esta en la agenda. Propiedad: CP SAN TELESFORO 15. Fachada 15 m. PEM 98.212 (residuos 300). Superficie 58,90. Negociado de licencias de la Junta de Ciudad Lineal: '
     '91 588 75 96 (lunes, miercoles y viernes de 9.00 a 10.30, sin cita). Expediente 116/2018/2212; tecnico Noemi Gonzalez. Visado TL/008150/2018. La ficha no tiene notas.'),
    ('santelesforo17', '2021-02-25', 'ELECNOR (ANTIGUO DE INVER): DANIEL NAVARRO > LUCIA DAVILA', 'H79711800', '6253403VK4765C',
     'CALLE SAN TELESFORO 17 MADRID. Fecha: la ficha no la trae; 02/2021 (dia: los documentos numerados "13 -" de INVER, 25/02/2021: presupuesto, correos, licencia concedida y '
     'proyecto). Cliente: ELECNOR (antiguo de INVER); contacto Daniel Navarro, ahora Lucia Davila. Tipo de obra: ASCENSOR + DO. Distrito Ciudad Lineal. CP 28017. Administracion '
     'anterior, tachada: MANDATARIA (J. Javier Garcia Nunez-Garcia; c/ Portugalete 30; 914 078 700; juanjo@mandataria.com, javier@mandataria.com). Nuevos administradores a junio 2025: '
     'CASTRO ABOGADOS (Sonia Sanchez Castro; Modesto Lafuente 19, 1o dcha.; 91 108 75 05 / 689 652 887; sonia.sanchez@castroabogados.es) - no esta en la agenda. Comunidad: CDAD PROP '
     'SAN TELESFORO 17. Expediente 116/2018/03385, LICENCIA. Superficie 100 m2. Jefa de obra: Raquel Gonzalez. En la carpeta, direccion de obra (2021-2022), fin de obra de Elecnor '
     'firmado el 12/09/2022, certificaciones de Elecnor (2023) y certificado final a origen (jun-2025).'),
    ('santelesforo19', '2020-11-04', 'INVER (ANTIGUO DE INVER); ADMINISTRACION JEGUEYMA', 'H79664843', '6253402VK4765C',
     'SAN TELESFORO 19 MADRID. Fecha: la ficha dice xx/2021; el compromiso de direccion de obra de la carpeta es del 04/11/2020 (antes, el presupuesto de Inver-Express y el proyecto '
     'sin visar, de oct-2020); se toma ese. Cliente: antiguo de INVER. Tipo de obra: ASCENSOR (CFO). Distrito Ciudad Lineal. CP 28017. Fecha encargo: 10/12/2021. Administracion: '
     'Jegueyma Oficina Administrativa (Miguel Angel; Jegueyma@gmail.com). Comunidad: C.P. San Telesforo 19 (CIF H79664843). Cuenta: ES96 2038 1086 4760 0008 5164 (en otra linea, '
     '"ES86"). PEM 105.094,64 (segun presupuesto Velerda). Visado TL/021361/2021 (DO). Superficie 100 m2. Contrato con INVER por 119.569 + IVA.\n\n'
     + cl('santelesforo19', 2021, ('2021-12-10', 'Sin fecha; correo de Miguel Angel (Jegueyma) pidiendo el CFO, que va con la fecha de encargo de la ficha (10/12/2021).'))),
    ('santiagodecompostela24-26', '2024-12-09', 'ELECNOR', None, None,
     'SANTIAGO DE COMPOSTELA 24-26 MADRID. Fecha: 12/2024 (dia: la nota, 09/12/2024). Cliente: ELECNOR (sin persona en la ficha). Tipo de obra: SATE CON DF, CSS Y SUBV. Distrito '
     'Fuencarral - El Pardo. CP 28034. La carpeta solo tiene la ficha.\n\n' + crudo('santiagodecompostela24-26', 2024)),
    ('santovenia5', '2023-01-02', 'JOSE GORDILLO', None, None,
     'SANTOVENIA 5 MADRID. Carpeta colada dentro de "santodomingo10". Fecha: 01/2023 (dia: la nota, 02/01/2023). Contacto: Jose Gordillo (no esta en la agenda; sin telefono ni correo). '
     'Tipo de obra: SATE + FV. Distrito Moncloa - Aravaca. CP 28008. La subcarpeta solo tiene la ficha.\n\n' + crudo(STV5, 2023), R('santodomingo10' + B + 'santovenia5')),
    ('santurce63', '2023-01-03', 'ANTONIO GARCIA (VECINO)', None, None,
     'SANTURCE 63 MADRID. Fecha: 01/2023 (dia: la nota, 03/01/2023). Contacto: Antonio Garcia, vecino (630 761 555), que pide presupuesto de ascensor y quiere denunciar a la comunidad. '
     'Tipo de obra: ASCENSOR. Distrito Ciudad Lineal. CP 28017. La carpeta solo tiene la ficha.\n\n' + crudo('santurce63', 2023)),
    ('sanvenancio1', '2022-12-20', 'CARLOS PUJOL (SCHINDLER)', 'H80543622', '8377711VK4787E',
     'SAN VENANCIO 1 MADRID. Fecha: 12/2022 (dia: la primera nota, 20/12/2022; el compromiso de cartel de feb-2022 es de plantilla). Cliente: SCHINDLER (Carlos Pujol; '
     'carlos.pujol@schindler.com). Tipo de obra: CAMBIO DE ASCENSOR Y SUBIR UNA PLANTA (a la de trasteros). Distrito 20 - San Blas - Canillejas (Canillejas). CP 28022. Tecnico: Karla. '
     'Ano 1982. Comunidad: CDAD PROP CL SAN VENANCIO 1. Presidenta: Inmaculada Flores Vergara (50724640A; inmaculadafloresvergara@gmail.com). PEM 36.414,39. Superficie 13,80. '
     'Declaracion responsable por la ECU (ACTECU), ene-2023. La obra termino en abril de 2023 sin fin de obra; la ECU hizo visita de comprobacion el 31/10/2024 (acta de inspeccion, '
     'nov-2024).\n\n' + crudo('sanvenancio1', 2022)),
    ('sanvenancio21', '2023-01-23', 'LUCIA FERNANDEZ (CONTACTO DE MIGUEL ANGEL, GEIMPRO)', None, None,
     'SAN VENANCIO 21 MADRID. Fecha: 01/2023 (dia: la nota, 23/01/2023). Contacto: Lucia Fernandez (630 010 735), que viene de Miguel Angel (GEIMPRO). Tipo de obra: SATE (20 vecinos). '
     'Distrito San Blas - Canillejas. CP 28022. La carpeta solo tiene la ficha.\n\n' + crudo('sanvenancio21', 2023)),
    ('secoya24', '2025-01-02', 'MONICA', 'B81665168', '6792136VK3669B',
     'SECOYA 24 MADRID (un LOCAL). Fecha: la ficha no la trae; 01/2025 (dia: el modelo 3D, 02/01/2025; la hoja de direccion de obra de 2023 de la carpeta es de plantilla). '
     'Empresa/cliente y contacto: "MONICA" (la ficha no dice mas). Tipo de obra: CEE (en la carpeta, tambien proyecto con planos, mediciones y un presupuesto de Elecnor, mar-jun 2025). '
     'Distrito Carabanchel. CP 28044. Tecnicos: Alex (estado actual y CEE) y Julio. Ref. catastral del local 6792136VK3669B0009TZ; del edificio 6792136VK3669B. Ano 2001. Promotor: '
     'MERLETTI SL (CL Secoya 24, 28044; CIF B81665168).\n\n' + crudo('secoya24', 2025)),
    ('sepulveda23', '2025-02-06', 'MARIBEL (GRUPO TREBOL)', None, None,
     'SEPULVEDA 23 MADRID. Fecha: 02/2025 (dia: la visita, 06/02/2025). Paga: la CDAD PROP. Tipo de obra: ASCENSOR CON DERRIBO (derribo de escalera con invasion de espacio publico; '
     'ascensor de doble embarque a 180 grados, 6 personas; coste estimado 220.000 EUR). Distrito Latina. CP 28011. Administracion: GRUPO TREBOL (Maribel, 629 370 656; Cayetano '
     'Pando 2; 91 526 54 90 / 699 086 641; trebol.fincas@gmail.com). Informe del 07/02/2025 en la carpeta; se adjunta la HE.\n\n' + crudo('sepulveda23', 2025)),
    ('sepulveda57', '2025-03-03', 'BEGONA (GRUPO TREBOL)', None, None,
     'SEPULVEDA 57 MADRID. Fecha: 03/2025 (dia: las fotos y el video de la visita, 03/03/2025). Tipo de obra: ASCENSOR. Distrito Latina. CP 28011. Administracion: GRUPO TREBOL (Begona; '
     'Cayetano Pando 2, 28047; 91 526 54 90 / 699 086 641; trebol.fincas@gmail.com). Contacto de la comunidad: Ramoni, 634 576 075. La ficha no tiene notas.'),
    ('severinoaznarembid3', '2024-11-19', 'JAVIER (VECINO)', None, None,
     'SEVERINO AZNAR EMBID 3 MADRID. Fecha: 11/2024 (dia: la nota, 19/11/2024). Contacto: Javier, vecino (722 61 10 00); les dio nuestro telefono Jose Maria Prieto ("(?)" en la ficha). '
     'Tipo de obra: SUBV PARA CUBIERTA (presupuesto de contrata de 177.000 EUR de cubierta y reparacion de fachada, no SATE; quieren ir al plan "Conserva", sin proyecto). Distrito '
     'Latina. CP 28011. La carpeta solo tiene la ficha.\n\n' + crudo('severinoaznarembid3', 2024)),
    ('sierradecontraviesa54', '2016-01-27', 'FELIPE OSADO (ENOR)', 'H79733499', '3006810VK4730E',
     'SIERRA DE CONTRAVIESA 54 MADRID. Fecha: 27/01/2016 (la de la ficha). Agente comercial: Felipe Osado (ENOR). Tipo de obra: la ficha no lo dice (en la carpeta, ascensor de Enor; '
     'licencia y tasas, mar-abr 2017; fin de obra visado y registrado, 2018-2019; subvencion 2018-2019). Presidenta: Conchi (tiene una ferreteria en c/ Cardenosa 34; 915 071 061 / '
     '635 44 75 22). Propiedad: CP SIERRA CONTRAVIESA 54. CP 28053. Fachada 19. PEM 83.613,44 (residuos 300). Ordenanza NZ4. Superficie intervenida 75 m2. Distrito 13 - Puente de '
     'Vallecas (Av. Albufera 42; negociado de licencias 91 588 73 33). Expediente 114/2016/06432; subvenciones 135/2017/1690 ("c/ Rivera del Sena 21, 3a planta, Tania"). '
     'La ficha no tiene notas.'),
    ('sierramadrona34', '2019-12-19', 'JOSE IGNACIO SAN FELIPE MANZANO (FAIN)', 'E78887767', '4023902VK4742C',
     'CALLE SIERRA MADRONA 34 MADRID. Fecha: DICIEMBRE 2019 (dia: los primeros ficheros, 19/12/2019). Agente comercial: Jose Ignacio San Felipe Manzano (en la agenda, Nacho San Felipe, '
     'de FAIN). Tipo de obra: DIRECCION FACULTATIVA DE OBRA DE LA INSTALACION DE ASCENSOR (Daniel, nueva DF de una obra de otro tecnico; final de obra el 26/12/2019). Comunidad: CDAD '
     'DE PROP SIERRA MADRONA 34 (CIF E78887767; letra E: comunidad de bienes). Presidente: Francisco Redondo de la Torre (51931375C). CP 28038. Factura: nueva direccion facultativa, '
     '800 EUR + IVA (pedido FAIN 95001669; pedido de compra 181621; grafo 4006182); 80% al presentar la nueva DF en el colegio y 20% con el certificado final de obra. En la carpeta, '
     'fin de obra (dic-2019 a mar-2020) y ficheros de 2021-2022.'),
    ('sirio36', '2020-03-02', 'JOSE MANUEL ROCAMORA (DE PARTE DE THYSSEN)', None, None,
     'SIRIO 36 MADRID. Fecha: 02/03/2020 (la de la ficha). Agente comercial: "VIENE DE THYSSEN". Contacto: Jose Manuel Rocamora (696 116 399; josemanuel.rocamora@ferrovial.com): '
     '"Mi nombre es Jose Manuel Rocamora y te llamo por parte de Thyssen". Tipo de obra: la ficha no lo dice. En la carpeta, honorarios (mar-2020) y fotos (ago-sep 2020).'),
    ('sirio60', '2025-11-24', None, None, None,
     'SIRIO 60 MADRID. Fecha: 11/2025 (dia: el modelo 3D, 24/11/2025). Tipo de obra: BAJADA A COTA CERO. Ficha casi vacia: sin contacto ni notas. '
     'En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS),
    ('soldadojosemariarey41', '2025-07-03', 'PAULA OSUNA (PRESIDENTA), VIA MATEDECON', None, None,
     'SOLDADO JOSE MARIA REY 41 MADRID. Fecha: 07/2025 (dia: la visita, 03/07/2025). Paga: la comunidad. Contacto: Paula Osuna, presidenta (644 676 285); "viene a traves de Matedecon". '
     'Tipo de obra: SATE (envolvente termica; la cubierta es la mas afectada; posibilidad de ascensor). CP 28019. En la ficha: comercial interno CARLOS.' + CAPTO_CARLOS
     + '\n\n' + crudo('soldadojosemariarey41', 2025)),
    ('soria1', '2022-11-30', 'VALENTIN (ALCORA) E IBERDROLA', None, None,
     'CALLE SORIA 1 MADRID. Fecha: 11/2022 (dia: la nota, 30/11/2022). Cliente: Valentin (ADMINISTRACIONES ALCORA) e IBERDROLA. Tipo de obra: SATE Y AEROTERMIA. Distrito Arganzuela. '
     'CP 28005. La carpeta solo tiene la ficha.\n\n' + crudo('soria1', 2022)),
    ('sormariadeagreda24', '2018-03-23', 'ANDRES (ENGWE)', None, None,
     'C/ SOR MARIA DE AGREDA 24 MADRID. Fecha: 23/03/2018 (la fecha de inicio de la ficha). Agente: Andres, de ENGWE. Ficha vacia; hay croquis, fotos y borrador de escalera '
     '(mar-2018).'),
]
for x in ('seodeurgel13', 'seodeurgel15'):
    REVS.append((x, '2026-05-14', 'RAQUEL MAESTRO / ALEJANDRO (AGA ANTONAYA)', None, None,
                 'SEO DE URGEL %s MADRID (encargo de 2026). Fecha: 05/2026 (dia: el escaneo 3D conjunto de los numeros 13 y 15, 14/05/2026). Contacta: Raquel (AGA ANTONAYA; '
                 'Alejandro / Raquel; 917 593 909; raquelmaestro@antonaya.com). Tipo de obra: MODIFICACION ASCENSOR. Informe de viabilidad y HE enviados 18/05/2026. Las carpetas '
                 'seodeurgel13 y seodeurgel15 son copia una de otra (misma ficha y mismo 3D). El encargo de nov-2024 de este portal (carpeta laseodeurgel%s, ascensor) ya esta '
                 'en la oportunidad de produccion. Comercial interno: ALVARO.\n\n' % (x[-2:], x[-2:])
                 + cl(x, 2026, ('2026-05-18', 'Sin fecha delante; la fecha va dentro de la nota.'))))
ALV = ('sirio60', 'soldadojosemariarey41', 'seodeurgel13', 'seodeurgel15')
for carp, fecha, trajo, cif, ref, t, *ruta in REVS:
    fila(carp, fecha, 'abierta', None, trajo, cif, ref, t + REV, comercial='Alvaro' if carp in ALV else 'Daniel', ruta=ruta[0] if ruta else None)

for carp, fecha, trajo, t in [
        ('santelesforo11', '2021-02-25', None,
         'SAN TELESFORO 11 MADRID. Carpeta SIN ficha de datos: documentos numerados "8 -" de INVER del 25/02/2021 (presupuesto, correos, licencia concedida y proyecto visado), escrito '
         'de aplazamiento al Ayuntamiento, requerimiento y solicitud de visado de la direccion de obra (mar-2021).'),
        ('santelesforo21', '2016-11-08', None,
         'SAN TELESFORO 21 MADRID. Carpeta SIN ficha de datos: oferta del ascensor y presupuesto (nov-2016); planos definitivos (oct-2020), compromiso de direccion de obra (nov-2020) y '
         'replanteo de escalera (feb-2021).'),
        ('sierracarbonera77', '2015-11-16', None,
         'SIERRA CARBONERA 77 MADRID. Carpeta SIN ficha de datos: borrador de escalera y plano (nov-2015).'),
        ('santodomingo10', '2016-02-08', 'PEDRO ARANDA (THYSSEN)',
         'SANTO DOMINGO 10 MADRID. Fecha: 08/02/2016 (la de la ficha). Ficha vacia; hay croquis y plano (feb-mar 2016). Dentro esta colada la carpeta de SANTOVENIA 5 (2023, otra fila).'),
        ('santoña56', '2017-03-14', 'PEDRO ARANDA (THYSSEN)',
         'SANTONA 56 MADRID. Fecha: 14/03/2017 (la de la ficha). Ficha vacia; hay croquis y presupuesto (mar-2017).'),
        ('santovenia11', '2016-07-19', 'LUIS MIGUEL NUNES (THYSSEN)',
         'CALLE SANTOVENIA 11 MADRID. Fecha: 19/07/2016 (la de la ficha). Ficha vacia; hay croquis y fotos (jul-2016).'),
        ('sargentobarriga18', '2018-03-14', 'PEDRO ARANDA (THYSSEN)',
         'C/ SARGENTO BARRIGA 18 MADRID. Fecha: 14/03/2018 (la de la ficha). Distrito Villaverde. Ficha vacia; hay croquis y fotos (mar-2018).'),
        ('sierracarbonera79', '2017-10-16', 'PEDRO ARANDA (THYSSEN)',
         'SIERRA CARBONERA 79 MADRID. Fecha: 16/10/2017 (la de la ficha). Ficha vacia salvo un contacto: David, 629 662 170. Junta de distrito de Vallecas. Hay borrador de escalera '
         '(nov-2015, el mismo que el de Sierra Carbonera 77) y presupuesto del interior (ene-2018).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)
# Sin fila: "sierradeagadir59 (carpeta vacia solo 3D)" no tiene ningun fichero.

# ================================================================= 3. MANIAS
mania('ECU (ACTECU): si no hay datos de lo construido en planta baja ni de si tiene licencia (locales, cerramientos del portal), se obvia esa informacion en los planos de '
      'emplazamiento.', 'ECU (ACTECU)', '2025-11-21', 'siena55', clave='sie55', trozo='obviar esa información')

resumen()
