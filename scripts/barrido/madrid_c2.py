# -*- coding: utf-8 -*-
# MADRID CAPITAL - tanda C2 (canciondelolvido33 .. casabermeja4, 40 carpetas). 6-oct-2026. Sin --escribir: marcha en seco.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from madrid_comun import *   # noqa

SCHINDLER = '2ca18bd8-5fe2-4e4e-9093-6601c99bbc05'; EFFIC = '1d2827a3-5a80-4e4e-b4da-6d9902be0122'; GUILLENPLAZA = 'dc49cb61-ce12-4898-a76b-d38e055f2dfe'
ACTECU = '720b9839-8bfb-4b09-b979-3bc4bf178426'
PU.update(proyecton='041f7eb4-fc52-4298-bffc-40c22a4a9dd6', gloria='0bfea696-2780-46d3-b949-73ccb1071885', cecilio='29f04826-a533-4514-be1e-4be43ecdc007',
          alba='61038fa7-f2fa-4dfa-a169-dae52465513c', justo='d3e649fb-351f-4ed1-bff1-2430a532ff57', quevedo='0660b50b-cf62-430d-8b6d-3154b108c582',
          merino='ba44b273-61e4-440b-b7aa-b81d8c33dccf', cdelbrio='cf9c0d74-d01a-4ed2-a0f0-8fcaadd6e4ae', vanesa='05cda534-6907-43b0-b674-53cbe143a278',
          dbrio='e18206ca-c52e-4318-a0b5-906945ba08aa', mjruiz='c768611c-65ef-458f-8b45-c8a2f05e5f9a', trebol='00c900df-1c1c-4f09-b45e-a28bc3c6381d',
          jantonio_dbb='40b27949-a177-4d6f-9e7b-2498a064848f', guillermo='2497dcab-bcec-4572-bcc9-4cd4054c6fc8', jrodriguez='3bb9cbe7-f3d6-4223-be99-e76ad4a67a56',
          angulo=None, gmoya='5a588515-9c02-4058-8e31-7e51dec4737f', lobo='42558577-bcac-4b2c-ba98-ac77b9d38ebf')
PU['angulo'] = b.leer('correo?select=puesto_id&email=eq.andres.angulo@inmape.com')[0]['puesto_id']
PU['alvaro_dbb'] = (b.leer('correo?select=puesto_id&email=eq.alvaro@delbrioyblanco.es') or [{'puesto_id': None}])[0]['puesto_id']

# ================================================================= 1. PRODUCCION (24)
rellenar('co33', 'CANCION DEL OLVIDO 33', 'canciondelolvido33', {'fecha_apertura': '2025-09-04', 'referencia_catastral': '0778410VK4607H',
    'origen_notas': 'Fecha de llegada: 09/2025. Contacta: David (PROYECTON, info@proyecton.es), que va a hacer el SATE y necesita nuestros servicios con la comunidad. Tipo de obra: ASC + SATE + SUBV. Barrio: Angeles. Tecnico: Israel (ISP). '
                    'Fecha encargo: 15/10/2025. Ano 1960. Licencia por el AYUNTAMIENTO (la ECU dijo que, al ir el ascensor en suelo publico, por el Ayto); registrada 08/09/2026. Administracion: ADMISUR HERRIOS (B87227781; Alegria de la Huerta 12 local 2; '
                    'Gloria Ma Gutierrez Herrera; 910 82 48 57 / 640 115 519; admisur@admisurherrios.es). PONER EN COPIA DE TODO AL PRESIDENTE (desde 26/08/2026). PEM 269.791,99. Visado TL/013372/2026. '
                    'La obra solo se hara si llega la subvencion; en sep-2026 aceptan el presupuesto de Proyecton. Comercial interno: DANIEL.'},
    ('ascensor', 'sate', 'subvenciones'), n=fijar('canciondelolvido33', 2025),
    comunidad={'iban': 'ES15 2100 3841 4102 0067 5012'}, presi=('JUAN VICENTE JUANES DELGADO', 'presidente', '609132969', '26738650T', 'vicentejuanesdelgado@hotmail.com'),
    adm=PU['gloria'], trae_pu=PU['proyecton'])
rellenar('can14', 'CANDILEJAS 14 Y 18', 'candilejas14-18', {'fecha_apertura': '2025-10-09',
    'origen_notas': 'Fecha de llegada: 10/2025. Contacta: Cecilio (JICAN ASCENSORES), tras hablar con Daniel: estudiar juntos la SUSTITUCION DE ASCENSORES de Candilejas 12 al 20. Tipo de obra: sustitucion de 2 ascensores subiendo una altura '
                    '(quitar el cuarto de maquinas y poner un ascensor GLS con una parada mas, rompiendo el techo para ganar 30 cm). La carpeta "candilejas14-18" tiene dentro una ficha por portal (14 y 18), iguales. HE en conjunto enviada 09/10/2025. '
                    'Comercial interno: DANIEL.'},
    ('modificacion_asc', 'anadir_parada'),
    n=fijar('candilejas14-18/candilejas14/FICHA DATOS.docx', 2025, ('2025-10-09', 'Sin fecha delante; del dia de la HE.'),
            otros={1: ('2025-10-09', 'En la ficha "09/10" sin ano; es 2025 (la ficha es de 10/2025).')}), trae_pu=PU['cecilio'])
rellenar('cgo40', 'CANGAS DE ONIS 40', 'cangasdeonis40', {'fecha_apertura': '2025-09-29',
    'origen_notas': 'Fecha de llegada: 10/2025 (el correo es del 29/09/2025). Contacta: Justo Rojo Perez, del despacho de Diego Rojo (ROJO JUSDI; Alba Pedraja). Tipo de obra: IEE (20 propiedades), de la lista de 14 comunidades de Rojo Jusdi '
                    'que debian pasar la IEE antes del 31/12/2025. Comercial interno: DANIEL. HE enviada 24/10/2025 al precio que indico Daniel.'},
    ('iee',), n=fijar('cangasdeonis40', 2025, ('2025-09-29', 'Correo de Justo Rojo del 29 de septiembre de 2025.')), adm=PU['alba'], trae_pu=PU['justo'])
rellenar('cb128', 'CARABANCHEL 128', 'carabanchel128', {'fecha_apertura': '2026-03-01',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia desconocido). Contacta: Javier Quevedo (QR GESTION DE FINCAS; el de Camino de las Cruces 28). Tipo de obra: ASCENSORES + SATE: 5 ascensores para las 5 escaleras de la mancomunidad '
                    '(derribo completo de escalera; ascensor de 3 personas; embarque simple), sin CSS. Comercial interno: DANIEL. HE a Monica para ok 08-04-2026, enviada 14-04-2026.'},
    ('ascensor', 'sate'), n=fijar('carabanchel128', 2026, ('2026-04-08', 'Sin fecha delante; la propuesta de Daniel para la HE del 08-04-2026.')), adm=PU['quevedo'], trae_pu=PU['quevedo'])
rellenar('carb9', 'CARBALLINO 9', 'carballino9', {'fecha_apertura': '2026-06-01',
    'origen_notas': 'Fecha de llegada: 06/2026 (dia desconocido; escaneo 3D de jul-2026). Contacta: Julio, de la administracion MERINO. Tipo de obra: ASCENSOR. La ficha no tiene notas. Comercial interno: ALVARO.'},
    ('ascensor',), captador=ALVARO, lleva=ALVARO)
rellenar('cd34', 'CARDEÑOSA 34', 'cardeñosa34', {'fecha_apertura': '2025-05-28', 'referencia_catastral': '3006202VK4730E',
    'origen_notas': 'Fecha de llegada: 05/2025. Contacta: Carlos del Brio (DEL BRIO Y BLANCO; tambien Vanesa). Tipo de obra: ASC + SUBV (se respeta la escalera; bajada a cota cero del escalon de entrada; invasion de 4,5 m2 del local y cesion de 1,8 m2 '
                    'de terraza; el cuarto de contadores al final no se toca; obra estimada 115.000 + IVA). Barrio: Entrevias. Tecnico: Alejandro Bello. Fecha encargo: 10/03/2026 (con anexo: si se deniega la licencia se devuelve el coste del proyecto). '
                    'Licencia por el AYUNTAMIENTO (toca suelo publico), registrada 17/07/2026. PEM 133.947,51. Visado TL/010713/2026. Superficie 100,93. Comercial: DANIEL.'},
    ('ascensor', 'cota_cero', 'subvenciones'), n=fijar('cardeñosa34', 2025),
    comunidad={'iban': 'ES36 0081 7115 1300 0168 7671'}, presi=('CARMEN GONZALEZ RUIZ', 'presidente', '630286535', '51870587K'), trae_pu=PU['cdelbrio'])
rellenar('cd47', 'CARDEÑOSA 47', 'cardeñosa47', {'fecha_apertura': '2026-04-01',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia desconocido). Contacta: Pedro (DEL BRIO Y BLANCO). Tipo de obra: IEE (enviada 07/05/2026). Comercial interno: ALVARO.'},
    ('iee',), n=[('2026-05-07', 'IEE ENVIADA 07/05/2026')], captador=ALVARO, lleva=ALVARO)
rellenar('cd57', 'CARDEÑOSA 57', 'cardeñosa57', {'fecha_apertura': '2025-09-24',
    'origen_notas': 'Fecha de llegada: 09/2025. Contacta: Daniel (DEL BRIO Y BLANCO), que puede aprobar el proyecto directamente y quiere junta con los presupuestos de SATE en mes y medio. Tipo de obra: SATE + SUBV (viabilidad de SATE completo, '
                    'proyecto, DF y todas las subvenciones). Contacto en la finca: Yolanda, 661 134 602. Comercial interno: CARLOS (honorarios firmados por Carlos Garcia el 13-10-2025).' + CAPTO_CARLOS},
    ('sate', 'df', 'subvenciones'), n=fijar('cardeñosa57', 2025, ('2025-09-24', 'Correo de Daniel (Del Brio y Blanco) del 24 de septiembre de 2025.')), adm=PU['dbrio'], trae_pu=PU['dbrio'], captador=CARLOS, lleva=ALVARO)
rellenar('arn25', 'CARLOS ARNICHES 25', 'carlosarniches25', {'fecha_apertura': '2023-07-10', 'referencia_catastral': '0034913VK4703C',
    'origen_notas': 'Fecha de llegada: 07/2023 (en la ficha 10/2023). Contacta: ATIKO (Maria Jose Ruiz) + Ivan Camacho (Tres Jotas). Tipo de obra: ASCENSOR + DO (despues, subvenciones y CSS). Barrio: Embajadores. Tecnico: Jonatan -> requerimientos Carla -> Karla. '
                    'Ano 1920. Licencia por ECU (ACTECU), presentada 14/07/2025; la ECU paso el expediente a Patrimonio (nov-2024). Administracion: ATIKO MADRID (912 982 005 / 674 319 134). Presidenta: Maria Luisa (Marisa) del Campo Mayi (617 62 88 32); '
                    'vicepresidente Jose Luis (617 28 69 95). PEM 147.722,27. Visado TL/017299/2025. Superficie 40,09. Comercial: DANIEL.'},
    ('ascensor', 'df', 'subvenciones', 'css'),
    n=fijar('carlosarniches25', 2023, otros={11: ('2026-01-28', 'En la ficha pone 28-01-2025, pero va despues del 30/10/2025 y la firma es de 02/02/2026: errata de 2026.')}),
    comunidad={'iban': 'ES22 2100 3250 5513 0037 6648'}, presi=('MARIA LUISA DEL CAMPO MAYI', 'presidente', '617628832', '07232084X'), trae_pu=PU['mjruiz'])
rellenar('cf61', 'CARLOS FUENTES 61', 'carlosfuentes61', {'fecha_apertura': '2026-02-04',
    'origen_notas': 'Fecha de llegada: 02/2026. Contacta: Javier (GRUPO TREBOL), que pide viabilidad de ascensor; contacto Angela, 665 246 345. Tipo de obra: ASC. Hay escaneo 3D. Comercial interno: ALVARO.'},
    ('ascensor',), n=fijar('carlosfuentes61', 2026, ('2026-02-04', 'Correo de Grupo Trebol del 4 de febrero de 2026.'),
                       otros={1: ('2026-02-06', 'En la ficha pone "06-02-206": errata de 06-02-2026.')}), adm=PU['trebol'], trae_pu=PU['trebol'], captador=ALVARO, lleva=ALVARO)
rellenar('cma102', 'CARLOS MARTIN ALVAREZ 102', 'carlosmartinalvarez102', {'fecha_apertura': '2025-11-18', 'referencia_catastral': '3510914VK4731B',
    'origen_notas': 'Fecha de llegada: 11/2025. Contacta: Jose Antonio (DEL BRIO Y BLANCO), que pide tres presupuestos de ascensor; habria que enajenar parte de un local. Tipo de obra: ASCENSOR CON DERRIBO + SUBV (4 personas, electrico, gearless, '
                    'embarque simple; modificar el armario de contadores; contrata 220.000 + IVA). Distrito Vallecas. Ano 1958. Contacto: Antonio, 4o dcha., 639 717 681. Tenian un presupuesto de TKE con honorarios de arquitecto incluidos; '
                    'se pide a FAIN. Comercial interno: ALVARO (lo mueve el).'},
    ('ascensor', 'subvenciones'), n=fijar('carlosmartinalvarez102', 2025, ('2025-11-18', 'Correo de Jose Antonio (Del Brio) del 18 de noviembre de 2025.')),
    trae_pu=PU['jantonio_dbb'], captador=ALVARO, lleva=ALVARO)
rellenar('cma104', 'CARLOS MARTIN ALVAREZ 104', 'carlosmartinalvarez104', {'fecha_apertura': '2025-06-03',
    'origen_notas': 'Fecha de llegada: 06/2025. Contacta: Carlos del Brio (DEL BRIO Y BLANCO). Tipo de obra: SUBVENCION de un PROYECTO EXTERNO. Distrito Puente de Vallecas. HE de subvencion enviada 03-06-2025, recibida 07/07/2025 '
                    '(en la ficha la fecha de encargo pone "07/70/2025"). Comercial interno: DANIEL.'},
    ('subvenciones',), subvencion=[(None, subv('carlosmartinalvarez104'))], trae_pu=PU['cdelbrio'])
rellenar('cma67', 'CARLOS MARTIN ALVAREZ 67', 'carlosmartinalvarez67', {'fecha_apertura': '2026-06-01',
    'origen_notas': 'Fecha de llegada: 06/2026 (dia desconocido; escaneo de jun-2026). Contacta: Alvaro (DEL BRIO Y BLANCO). Tipo de obra: ASCENSOR. La ficha no tiene notas. Comercial interno: ALVARO.'},
    ('ascensor',), adm=PU['alvaro_dbb'], trae_pu=PU['alvaro_dbb'], captador=ALVARO, lleva=ALVARO)
rellenar('sole44', 'CARLOS SOLE 44-52', 'carlossole44-52garaje', {'fecha_apertura': '2026-03-11', 'referencia_catastral': '4717704VK4741F',
    'origen_notas': 'Fecha de llegada: 03/2026. Contacta: Guillermo Pueyo (DEL BRIO Y BLANCO). Tipo de obra: IEE de un GARAJE (mancomunidad Carlos Sole 44 a 52) y recomendaciones para los ventanales de ventilacion de la plaza 15. Distrito Puente de Vallecas. '
                    'Tecnico: Alex (IEE). Fecha encargo: 02/07/2026. Ano 1988. Presidenta: Lioudmila, 687 742 584. Ignacio, vecino que puede abrir el garaje: 659 104 105. Comercial interno: ALVARO.'},
    ('iee', 'informe_tecnico'), n=fijar('carlossole44-52garaje', 2026, ('2026-03-11', 'Correo de Guillermo Pueyo del 11 de marzo de 2026.')),
    comunidad={'iban': 'ES86 2085 9741 7803 3040 9067'}, presi=('LIOUDMILA', 'presidente', '687742584'), trae_pu=PU['guillermo'], captador=ALVARO, lleva=ALVARO)
rellenar('co40', 'CARLOTA O`NEILL 40', 'carlotaoneill40', {'fecha_apertura': '2026-02-23',
    'origen_notas': 'Fecha de llegada: 02/2026. Contacta: Javier Rodriguez (Schindler), que ya les paso presupuesto de plataforma inclinada exterior y silla en la escalera interior; la comunidad pide subvencion. Administrador: Alejandro Herrera Insua '
                    '(colegiado 10.105) - no esta en la agenda. Contactos para visitar: Ana, 649 216 049; Susana, 669 386 910. Tipo de obra: PLATAFORMA + SUBV. Hay escaneo 3D. Comercial interno: ALVARO.'},
    ('plataforma', 'subvenciones'), n=fijar('carlotaoneill40', 2026, ('2026-02-23', 'Correo de Javier Rodriguez (Schindler) del 23 de febrero de 2026.')),
    trae_pu=PU['jrodriguez'], captador=ALVARO, lleva=ALVARO)
CASTRO = persona_nueva('Francisco Javier', 'Castro', 'comercial', None, 'francisco-javier.castro@effic.es', contrata=EFFIC)
rellenar('cbz15', 'CAROLINA BAEZA 15', 'carolinabaeza15', {'fecha_apertura': '2025-09-15',
    'origen_notas': 'Fecha de llegada: 09/2025. Contacta: EFFIC (agente rehabilitador): asigna el expediente AEFE-00014360 (comercial Francisco Javier Castro; tecnico de presupuesto Juan Fran Martinez). Visita el 18/09/2025 con Patricia Gomez (+34 655 695 429). '
                    'Tipo de obra: "no sabemos aun" (EFFIC adjunta el predimensionado elegido por el cliente). Referencia catastral 5490701VK3659A. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    (), n=fijar('carolinabaeza15', 2025, ('2025-09-15', 'Correo de EFFIC del 15 de septiembre de 2025.')), trae_pu=CASTRO, captador=CARLOS, lleva=ALVARO)
rellenar('carond16', 'CARONDELET 16', 'carondelet 16 –chalet 23', {'fecha_apertura': '2026-03-13',
    'origen_notas': 'Fecha de llegada: 03/2026. Contacta: Andres Angulo (INMAPE). Tipo de obra: INFORME TECNICO DE IMPOSIBILIDAD de modificar el foso (foso reducido; RAE 77122). Lo pide Industria. Va en el mismo correo que Amor de Dios 4 y Santa Maria 8. '
                    'El correo completo, en 1.DATOS/2.DOCUMENTACION. Comercial interno: DANIEL. HE enviada a Monica para ok 19-03-2026.'},
    ('informe_tecnico',), n=fijar('carondelet 16 –chalet 23', 2026, ('2026-03-13', 'Correo de Andres Angulo (Inmape) del 13 de marzo de 2026.')), trae_pu=PU['angulo'])
rellenar('cjr17', 'CARRERO JUAN RAMON 17', 'carrerojuanramon17', {'fecha_apertura': '2025-10-13',
    'origen_notas': 'Fecha de llegada: 10/2025. Contacta: Javier Gonzalez Moya (Schindler). Tipo de obra: ASCENSOR. Distrito Carabanchel. (La cabecera de la ficha dice "Carrero Juan Ramon 7".) La ficha no tiene notas. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), trae_pu=PU['gmoya'], captador=CARLOS, lleva=ALVARO)
BAUTISTA = persona_nueva('David', 'Bautista', None, None, None, contrata=SCHINDLER, notas_='Schindler (Carrero Juan Ramon 6, 2026).')
rellenar('cjr6', 'CARRERO JUAN RAMON 6', 'carrerojuanramon6', {'fecha_apertura': '2026-03-01',
    'origen_notas': 'Fecha de llegada: 03/2026 (dia desconocido). Cliente: Schindler (David Bautista). Tipo de obra: ASCENSOR CON DERRIBO DE ESCALERA + proyecto y gestion de subvenciones. Hay escaneo 3D. '
                    'Lo pasa Carlos Garcia el 3 de junio de 2026 ("se me quedo en el tintero"). En la ficha: comercial interno ALVARO.' + EXT},
    ('ascensor', 'subvenciones'), n=fijar('carrerojuanramon6', 2026, ('2026-06-03', 'Correo de Carlos Garcia del 3 de junio de 2026.')), trae_pu=BAUTISTA, captador=ALVARO, lleva=ALVARO)
persona_nueva('Almudena', 'Martín Bartolomé', None, '910 802 385', None, organismo=ACTECU, notas_='ACTECU (info@actecu.com; CL Blasco de Garay 13, 3o dcha.). Carretas 15, 2024.')
rellenar('carr15', 'CARRETAS 15', 'carretas15', {'fecha_apertura': '2023-03-14', 'referencia_catastral': '0443513VK4704C',
    'origen_notas': 'Fecha de llegada: 03/2023. Contacta: Maria Jose (ATIKO). Tipo de obra: primero la DIRECCION DE OBRA del ascensor de otro arquitecto (por hueco de escalera; revisar mediciones; otra ECU, Licmad, no llego a hacer nada); '
                    'como la solucion del otro arquitecto era inviable, proyecto nuevo + DO + CSS + subvenciones. Barrio: Sol. Tecnico: Julio. Contrata: GRADCOM. Ano 1900. Edificio en NZ 1.1 con catalogacion estructural, centro historico '
                    '(APE 00.01, Cerca y Arrabal de Felipe II) y zona arqueologica: LICENCIA por ECU (ACTECU) con informe de Patrimonio (CLPH) y luego DR de funcionamiento; presentada 10-06-2025, aprobada 29/08/2025 (350/2025/17546). '
                    'Visado TL/009157/2025. Administracion: ATIKO (C. del Amparo 86; 912 98 20 05; Maria Jose 674 31 91 17). Presidenta: Harriet (Christine Harriet Adams, 5o izq., 653 234 060); vicepresidenta Rosa Maria, 619 242 611. '
                    'Una vecina puso pegas; la obra empieza en julio-2026 (la licencia vale un año + 4 meses de ejecucion). Comercial: DANIEL.'},
    ('df', 'ascensor', 'css', 'subvenciones'), n=fijar('carretas15', 2023),
    presi=('Christine Harriet ADAMS (5º IZ)', 'presidente', '653234060', 'Y4552296N'), trae_pu=PU['mjruiz'])
NAGORE = persona_nueva('Nagore', None, 'administradora', None, None, empresa=GUILLENPLAZA, notas_='Guillen y Plaza (Carretera de Canillas 108, 2025).')
rellenar('cc108', 'CRTRA CANILLAS 108', 'carreteradecanillas108', {'fecha_apertura': '2025-11-01',
    'origen_notas': 'Fecha de llegada: 11/2025 (dia desconocido; escaneo 3D de oct-2025). Contacta: la administradora, Nagore (Guillen y Plaza). Tipo de obra: ASCENSOR. La ficha no tiene notas. Comercial interno: CARLOS.' + CAPTO_CARLOS},
    ('ascensor',), adm=NAGORE, trae_pu=NAGORE, captador=CARLOS, lleva=ALVARO)
rellenar('cdc112', 'CARRIL DEL CONDE 112', 'carrildelconde112', {'fecha_apertura': '2026-05-25',
    'origen_notas': 'Fecha de llegada: 05/2026. Contacta: Enrique Guil (administrador; Carril del Conde 106; 607 872 972; jlgarciaalonso@telefonica.net) - no esta en la agenda. Tipo de obra: SATE. Presidenta: Ma Angeles Gomez, 617 089 286. '
                    'Comercial interno en la ficha: "CARLOS S" (el otro Carlos, Sepulveda: no trajo nada); la lleva Daniel. HE enviada 25-05-26.'},
    ('sate',), n=fijar('carrildelconde112', 2026))
rellenar('cb2', 'CASABERMEJA 2', 'casabermeja2', {'fecha_apertura': '2025-06-30',
    'origen_notas': 'Fecha de llegada: 06/2025. Contacta: Carlos del Brio (DEL BRIO Y BLANCO). Tipo de obra: SUBVENCION EXTERNA ("INFINITAS"), de un proyecto externo. Distrito Puente de Vallecas. Fecha encargo: 30/06/2025. La ficha no tiene notas. Comercial interno: DANIEL.'},
    ('subvenciones',), comunidad={'iban': 'ES73 2085 9741 7203 3035 9640'}, presi=('CONSTANCIO RAIZ CUCHARERO', 'presidente', None, '00785933T'), trae_pu=PU['cdelbrio'])
rellenar('cb4', 'CASABERMEJA 4', 'casabermeja4', {'fecha_apertura': '2026-04-01', 'referencia_catastral': '5909504VK4750H',
    'origen_notas': 'Fecha de llegada: 04/2026 (dia desconocido). Contacta: Vanesa (DEL BRIO Y BLANCO); administrador Javier Cesar Lobo. Tipo de obra: SATE + SUBV (proyecto de rehabilitacion de envolvente termica). Tecnico: Carlos Daza. Fecha encargo: 18/05/2026. '
                    'Ano 1958. Por ECU (ACTECU). PEM 293.241,45. Superficie 248,04. Presidenta: Maria del Mar Paton Gonzalez (4o 1; 666 203 113). Comercial interno: ALVARO.'},
    ('sate', 'subvenciones'), n=fijar('casabermeja4', 2026, ('2026-04-21', 'La fecha va dentro: "HE ENVIADA 21/04/2026".')),
    comunidad={'iban': 'ES73 2085 9741 7103 3034 4169'}, presi=('MARIA DEL MAR PATON GONZALEZ', 'presidente', '666203113', '70979714N'), adm=PU['lobo'], trae_pu=PU['vanesa'], captador=ALVARO, lleva=ALVARO)
d = b.leer('personas_comunidad?select=id&nombre=eq.' + quote('M@ ANGELES GOMEZ'))
if d: act('personas_comunidad?id=eq.' + d[0]['id'], {'nombre': 'Mª ANGELES GOMEZ', 'telefono': '617089286'})

# ================================================================= 2. ORGANISMOS
US = junta(12, 'Usera', direccion='Avda. de Rafaela Ybarra 41, 1a planta')
for nom, mail in (('Servicios Técnicos (Medio Ambiente y Escena Urbana)', 'dtecnicosusera@madrid.es'), ('Sección de Licencias y Autorizaciones', 'slautusera@madrid.es')):
    ar = area(US, nom, None, 'Carabelos 41, 2021.')
    if not b.leer('correo?select=id&email=eq.' + mail):
        ins('correo', [{'organismo_area_id': ar, 'email': mail, 'etiqueta': 'general', 'principal': True}])
CL = junta(15, 'Ciudad Lineal')
persona_nueva('Carlos', 'Martínez', None, '91 588 75 96', None, organismo=CL, notas_='Junta de Ciudad Lineal (Carolina Coronado 37, 2017).')

# ================================================================= 3. CLON
cl = lambda c, a, s=None: J(fijar(c, a, s))
fila('canillas11', '2026-06-09', 'abierta', None, 'FERNANDO MOZOS (ITACA FINCAS)', None, None,
     'CANILLAS 11 MADRID. Fecha: 06/2026. Tipo de obra: SATE EN FACHADA (la cubierta es nueva; calefaccion centralizada con Remica). Administracion: Itaca Fincas (Fernando Mozos Langa; 91 290 28 38 / 639 181 314; fmozos@itacafincas.net; '
     'Jorge Miranda). Daniel va primero a ver la cubierta y las calderas con Remica. Comercial interno: DANIEL. Viva.\n\n' + cl('canillas11', 2026, ('2026-06-09', 'Correos de Fernando Mozos del 9 y 15 de junio de 2026.')))
REVS = [
    ('cantalejo6', '2022-04-28', 'JOSE VICENTE (LORMAN)', 'CANTALEJO 6 MADRID. Fecha: 05/2022. Tipo de obra: SOLO FOTOVOLTAICA. Distrito 08 - Fuencarral-El Pardo (Fuentelarreina). Visitado con Enrique; conserje Juan Carlos, 682 200 062.'),
    ('carabelos41', '2019-01-17', 'FELIX URVALL', 'Calle CARABELOS 41 MADRID. Fecha: 2019 (ficha de 10/2023). Tipo de obra: INSTALACION DE ASCENSOR EN EDIFICIO RESIDENCIAL EXISTENTE. Distrito 12 - Usera (San Fermin). Constructor: Urvall. '
     'Contacto: sarbanviktor@gmail.com. Junta de Usera (Avda Rafaela Ybarra 41, 1a): servicios tecnicos dtecnicosusera@madrid.es; licencias slautusera@madrid.es. PEM 88.938. Expediente 113/2019/02253: informe favorable enviado al negociado '
     'de licencias el 29/10/21. Fachada 21,21; superficie 65 m2. Proyecto hecho.\n\n' + cl('carabelos41', 2021, ('2021-11-16', 'Correo de la JMD de Usera del 16 de noviembre de 2021.'))),
    ('carlosfuentes21', '2023-05-05', None, 'CARLOS FUENTES 21 MADRID. Fecha: 05/2023. La ficha esta en blanco ("Calle municipio"), pero la carpeta tiene ficheros hasta sep-2026: revisar que es.'),
    ('carlosmartinalvarez65bis', '2025-03-17', 'CARLOS DEL BRIO (DEL BRIO Y BLANCO)', 'CARLOS MARTIN ALVAREZ 65 BIS MADRID (es la sede de Del Brio y Blanco). Fecha: 03/2025. Tipo de obra: ELEVADOR. Distrito Puente de Vallecas. '
     'Presentacion a los vecinos el 10/07/2025: la mayoria no quiere el ascensor por la cantidad de morosos.\n\n' + cl('carlosmartinalvarez65bis', 2025)),
    ('carolinacoronado37', '2017-02-17', 'JUAN CARLOS (THYSSEN)', 'Calle CAROLINA CORONADO 37 MADRID. Fecha: 2017. Distrito 15 - Ciudad Lineal (Pueblo Nuevo). Administracion: Maria Jesus Martin (91 377 23 26). Carlos y Ana (3oB; 91 377 51 21 / 620 962 726). '
     'Junta de Ciudad Lineal (Hermanos Garcia Noblejas 16): Carlos Martinez 91 588 75 96; 91 588 75 30 / 91 588 84 14; L-X-V 9:00-10:30 sin cita. PEM 50.000; residuos 300. Expediente 116/2017/02060. NZ4. Fachada 20; superficie 60,10. '
     'Obra paralizada en 2018 por los propietarios de las plazas del sotano: pleito CIV/32/17 (abogada Beatriz Morales Puerro, garciapiabogados). Proyecto hecho.\n\n' + cl('carolinacoronado37', 2018, ('2018-04-24', 'Correo de la abogada del 24 de abril de 2018.'))),
    ('carreteradeboadilladelmonte55', '2016-07-25', 'PEDRO ARANDA (THYSSEN)', 'CARRETERA DE BOADILLA DEL MONTE 55 MADRID. Fecha: 09/2016. Distrito 10 - Latina (Campamento). Administracion: Luisa Gordo (606 879 095). Presidente: Victoriano Zurdo Pulido. '
     'Constructora: Urvall (Oliver Garcia Hernandez, 658 509 276). APIRU 10.4 Barrio Campamento (Victor Boveda Aragon, Adetecnia). PEM 87.899; residuos 300; obra 104.600 + IVA. Ascensor electrico doble embarque a 180, 6 paradas. '
     'NZ 3.1.a. Fachada 11,3; superficie 48,20. Proyecto hecho.')]
for carp, fecha, trajo, t in REVS:
    fila(carp, fecha, 'abierta', None, trajo, None, None, t + REV)
for carp, fecha, trajo, t in [
        ('capellanes20', '2016-06-01', 'FELIPE OSADO (ENOR)', 'CALLE CAPELLANES 20 MADRID. Fecha: 06/2016. Manuel Sanchez, vecino, 695 897 402. Ficha vacia.'),
        ('carlina4', '2017-08-28', 'PEDRO ARANDA (THYSSEN)', 'Calle CARLINA 4 MADRID. Fecha: 08/2017. Distrito 10 - Latina (Lucero). NZ 3.1a. Ficha vacia; hay croquis.'),
        ('carmenportones13', '2016-12-30', 'LUIS MIGUEL NUNES (THYSSEN)', 'Calle CARMEN PORTONES 13 MADRID. Fecha: 12/2016. Distrito 06 - Tetuan (Berruguete). Ficha vacia; hay croquis.'),
        ('caroli7', '2017-07-20', 'LUIS MIGUEL NUNES (THYSSEN)', 'Calle CAROLI 7 MADRID. Fecha: 07/2017. Distrito 09 - Moncloa-Aravaca (Aravaca). Ficha vacia; hay croquis. (No es Carolina Baeza 7.)'),
        ('carracedo21', '2017-05-01', 'PEDRO ARANDA (THYSSEN)', 'Calle CARRACEDO 21 MADRID. Fecha: 04/2017. Distrito 10 - Latina (Campamento). Ficha vacia; hay croquis.'),
        ('cangas de onis 32', '2020-02-05', None, 'CANGAS DE ONIS 32 MADRID. Carpeta SIN ficha de datos: licencia de obras y documentos de obra (2020).'),
        ('canillas97', '2024-04-11', None, 'CANILLAS 97 MADRID. Carpeta SIN ficha de datos: un certificado energetico (abr-2024).'),
        ('cardenalcisneros9', '2014-01-07', None, 'CARDENAL CISNEROS 9 MADRID. Carpeta SIN ficha de datos: PDFs viejos (2014).'),
        ('cardeñosa63', '2019-06-20', None, 'CARDEÑOSA 63 MADRID. Carpeta SIN ficha de datos: planos (jun-2019).')]:
    fila(carp, fecha, 'cerrada', MIG, trajo, None, None, t)

# ================================================================= 4. MANIAS
mania('Si el ascensor se instala en suelo publico, la ECU no lo tramita: hay que ir por el Ayuntamiento.', 'ECU (ACTECU)', '2026-02-20', 'canciondelolvido33', clave='co33', trozo='suelo público')
mania('Edificio catalogado (NZ 1.1, estructural, centro historico): LICENCIA con informe de la Comision de Patrimonio (CLPH) y despues DR de funcionamiento; separata de Patrimonio justificando los criterios CLPH con reportaje fotografico; '
      'si nucleo de escalera y portal estan protegidos, la solucion se basa en antecedentes y fotos historicas (Archivo de la Villa); en zona arqueologica puede hacer falta autorizacion de la CAM.', 'ECU (ACTECU)', '2024-06-10', 'carretas15',
      clave='carr15', trozo='Norma Zonal 1.1')
mania('Si el Archivo de la Villa no tiene antecedentes, se va a Patrimonio con el comunicado de "no existencia" y hay que justificar muy bien los criterios de la CLPH y el reportaje fotografico.', 'ECU (ACTECU)', '2024-09-12', 'carretas15',
      clave='carr15', trozo='archivo de la villa')
mania('La licencia por ECU vale un año para empezar y luego 4 meses de ejecucion.', 'ECU (ACTECU)', '2026-06-17', 'carretas15', clave='carr15', trozo='un año de licencia')

resumen()
