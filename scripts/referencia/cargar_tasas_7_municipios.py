# -*- coding: utf-8 -*-
"""
PRIMER RELLENO DE reglas_tasas Y tramites (Monica, 10-oct-2026).

Lo que salio del barrido de expedientes 2024-2026 de los 7 municipios grandes
(docs/tasas-y-licencias-7-municipios.md, con las rutas de cada evidencia).
TODO SIN VALIDAR (validada = false): ella lo revisa en la pantalla.

metodo 'no_aplica' = no se calcula solo (falta la tarifa, o la pide otro):
se guarda para consultarlo, con la regla dicha en formula_texto.

Solo produccion (scripts/produccion.py). Se niega a cargar si ya hay datos:
para rehacerlo, borrar antes a mano.
Uso: python scripts/referencia/cargar_tasas_7_municipios.py
"""
import os
import sys
import uuid

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
from produccion import arrancar  # noqa: E402

RESIDUOS = "Sujeta al cálculo del estudio de gestión de residuos del proyecto: la cifra final puede variar."
ICIO_PROV = "Provisional: se calcula sobre el presupuesto estimado y se regulariza con el coste final de la obra."
ASC = ["ascensor", "accesibilidad"]
FACHADA = ["eficiencia_energetica", "intervenciones_exterior"]


def regla(muni, organismo, concepto, metodo, base, tipos=None, **campos):
    return dict(muni=muni, organismo=organismo, concepto=concepto, metodo=metodo, base=base, tipos=tipos or [], **campos)


REGLAS = [
    # ================================================================ MADRID
    regla("MADRID", "Ayuntamiento de Madrid", "icio", "porcentaje", "pem", ASC, porcentaje=3.75,
          formula_texto="3,75 % del PEM, menos la bonificación.",
          bonificacion_pct=90, bonificacion_forma="en_autoliquidacion",
          bonificacion_requisitos="Obras de acceso y habitabilidad de personas con discapacidad (código 9113).",
          requiere_descargo=True, liquida="autoliquidacion", momento="antes_de_presentar", regulariza_al_final=True,
          aviso_vecinos=ICIO_PROV + " Si la licencia o la DR se deniega, se pierde la bonificación y se paga el resto con intereses.",
          normativa="Ordenanza Fiscal 7/2023 (antes era el 4 %).",
          evidencia="aceuchal18; alcaladeguadaira41; albalatedelarzobispo5; ezequielsolana97"),
    regla("MADRID", "Ayuntamiento de Madrid", "icio", "porcentaje", "pem", FACHADA, porcentaje=3.75,
          formula_texto="3,75 % del PEM, menos la bonificación si la finca está en área preferente.",
          bonificacion_pct=70, bonificacion_forma="en_autoliquidacion",
          bonificacion_alcance="Solo si la finca está en zona APIRU o ARRU (código 9103). Se mira en el visor urbanístico, capa de agencia tributaria / bienestar social.",
          requiere_descargo=True, liquida="autoliquidacion", momento="antes_de_presentar", regulariza_al_final=True,
          aviso_vecinos=ICIO_PROV, normativa="Ordenanza Fiscal 7/2023.", evidencia="algodre2"),
    regla("MADRID", "Ayuntamiento de Madrid", "tasa_urbanistica", "cuota_fija", "ninguna", via="licencia", canal="directo",
          subtipo="1.d reestructuración puntual y parcial", importe_fijo=1525,
          formula_texto="TPSU: 1.525 € fijos, sea cual sea la superficie. Solo si se tramita directo con el Ayuntamiento (por ECU no se paga).",
          liquida="autoliquidacion", momento="antes_de_presentar",
          notas="Provisional, \"a resultas de la liquidación definitiva\".",
          evidencia="alcaladeguadaira41; felipealvarez28; franciscofatou24; haciendadepavones151"),
    regla("MADRID", "Ayuntamiento de Madrid", "tasa_urbanistica", "cuota_fija", "ninguna", via="licencia", canal="directo",
          subtipo="1.c acondicionamiento", importe_fijo=607,
          formula_texto="TPSU: 607 € fijos. Solo si se tramita directo (por ECU no se paga).",
          liquida="autoliquidacion", momento="antes_de_presentar", evidencia="ezequielsolana105"),
    regla("MADRID", "Ayuntamiento de Madrid", "tasa_urbanistica", "cuota_fija", "ninguna", via="declaracion_responsable", canal="directo",
          subtipo="1.c", importe_fijo=271.01,
          formula_texto="TPSU de declaración responsable: 271,01 €. Solo si se tramita directo.",
          liquida="autoliquidacion", momento="antes_de_presentar", evidencia="albalatedelarzobispo5 (escaneado)"),
    regla("MADRID", "ACTECU", "precio_ecu", "cuota_fija", "m2_afectados", ASC, canal="ecu", subtipo="Certificado de conformidad (LC/DR)",
          importe_fijo=350,
          formula_texto="Precio de ACTECU por el certificado de conformidad, según m² afectados: 350 € en ascensores de menos de ~80 m² (663,54 € visto en otro de 76,83 m²). Sin IVA. 10 % menos en distritos de paro alto.",
          liquida="ecu", momento="antes_de_presentar",
          notas="Sustituye a la TPSU. Falta la tarifa publicada de ACTECU para calcularlo bien.",
          evidencia="aceuchal18; franciscoiglesias15; ezequielsolana105"),
    regla("MADRID", "ACTECU", "precio_ecu", "cuota_fija", "m2_afectados", ASC, canal="ecu", subtipo="Visita de la DR de funcionamiento",
          importe_fijo=1000,
          formula_texto="Precio de ACTECU por la visita de la DR de funcionamiento al final de la obra: 1.000 € visto en un ascensor de 77,76 m². Sin IVA.",
          liquida="ecu", momento="fin_de_obra", evidencia="aceuchal18"),
    regla("MADRID", "ACTECU", "precio_ecu", "fijo_mas_unidad", "m2_afectados", FACHADA, canal="ecu", subtipo="Certificado de conformidad (LC/DR)",
          importe_fijo=810, importe_unidad=1,
          formula_texto="Aprox. 810 € + 1 €/m² afectado (deducido de dos SATE: 613,8 m² → 1.423,80; 677 m² → 1.487). Sin IVA.",
          liquida="ecu", momento="antes_de_presentar",
          notas="Fórmula DEDUCIDA de dos casos, sin confirmar con la tarifa de ACTECU.", evidencia="algodre2; alfredoaleix20; guadalete6"),
    regla("MADRID", "ACTECU", "precio_ecu", "fijo_mas_unidad", "m2_afectados", FACHADA, canal="ecu", subtipo="Visita de la DR de funcionamiento",
          importe_fijo=1035, importe_unidad=1.35,
          formula_texto="Aprox. 1.035 € + 1,35 €/m² afectado (deducido de dos SATE). Sin IVA.",
          liquida="ecu", momento="fin_de_obra",
          notas="Fórmula DEDUCIDA de dos casos, sin confirmar con la tarifa de ACTECU.", evidencia="algodre2; alfredoaleix20"),
    regla("MADRID", "Ayuntamiento de Madrid", "fianza_residuos", "por_unidad", "m3_residuos", importe_unidad=15,
          formula_texto="15 € por m³ de residuos del estudio de gestión (ascensor 12,70 m³ → 190,50 €; SATE 200,45 m³ → 3.006,75 €). En metálico o aval.",
          liquida="ecu", momento="antes_de_presentar", aviso_vecinos=RESIDUOS,
          normativa="Instrucción 6/2012.", evidencia="aceuchal18 garantia_residuos1.pdf; algodre2 AVAL"),

    # ================================================================ LEGANÉS
    regla("LEGANES", "Ayuntamiento de Leganés", "tasa_urbanistica", "porcentaje", "pem", porcentaje=1,
          formula_texto="1 % del PEM, en licencia y en DR (25 de 25 cartas de pago).",
          liquida="emite_ayuntamiento", momento="antes_de_presentar", validez_dias=30,
          notas="Se pide por Solicitud General con memoria y presupuesto; el Ayuntamiento la manda. Si caduca, hay que pedir otra.",
          evidencia="avdrmendiguchiacarriche38; alcarria60; galicia7"),
    regla("LEGANES", "Ayuntamiento de Leganés", "icio", "porcentaje", "pem", ASC, porcentaje=4,
          formula_texto="4 % del PEM, menos la bonificación.",
          bonificacion_pct=90, bonificacion_forma="en_liquidacion",
          bonificacion_requisitos="Se pide aparte al registrar la licencia. Suelen pedir la acreditación de la discapacidad.",
          bonificacion_plazo="Resuelven en 2-3 meses; después se pide que manden el ICIO ya bonificado.",
          requiere_descargo=True, liquida="liquidacion_posterior", momento="tras_concesion",
          aviso_vecinos="Lo liquida el Ayuntamiento después de conceder la licencia. " + ICIO_PROV,
          normativa="Ordenanza Fiscal, art. 4.3.", evidencia="rioduero12; jeromin23; sannicolas19; galicia7"),
    regla("LEGANES", "Ayuntamiento de Leganés", "icio", "porcentaje", "pem", FACHADA, porcentaje=4,
          formula_texto="4 % del PEM. Fachadas: sin bonificación.",
          liquida="liquidacion_posterior", momento="tras_concesion", aviso_vecinos=ICIO_PROV,
          notas="En las DR de fachada no se ha visto todavía la liquidación del ICIO.", evidencia="avdrfleming14"),
    regla("LEGANES", "Ayuntamiento de Leganés", "fianza_residuos", "segun_estudio_residuos", "coste_gestion_residuos",
          formula_texto="Igual al \"coste de gestión de residuos\" del estudio de gestión del proyecto (vistos 537 a 3.398 €).",
          liquida="emite_ayuntamiento", momento="antes_de_presentar", aviso_vecinos=RESIDUOS,
          normativa="RD 105/2008 art. 4; Orden 2726/2009 art. 9.2.", evidencia="avdrmendiguchiacarriche38; avdelamancha18; alcarria60"),
    regla("LEGANES", "Ayuntamiento de Leganés", "ocupacion_via_publica", "no_aplica", "m2_dia",
          formula_texto="Ordenanza Fiscal 14: por categoría de calle, m², altura y meses (andamio 20×2 m, 16 m de alto, 4 meses, calle cat. 4 → 2.768 €).",
          liquida="emite_ayuntamiento", momento="durante_obra", notas="La pide la constructora.", evidencia="rioaragon6"),

    # ================================================================ FUENLABRADA
    regla("FUENLABRADA", "Ayuntamiento de Fuenlabrada", "tasa_urbanistica", "porcentaje", "pem", porcentaje=1.11,
          formula_texto="1,11 % del PEM, sin mínimo; igual para ascensor, SATE y rampa (tasa 15.1).",
          liquida="emite_ayuntamiento", momento="antes_de_presentar",
          notas="La emite la Oficina Tributaria (OTAF) cuando se le pide.", evidencia="argentina20; austria8; avespaña9"),
    regla("FUENLABRADA", "Ayuntamiento de Fuenlabrada", "icio", "porcentaje", "pem", porcentaje=4,
          formula_texto="4 % del PEM. Con la bonificación pedida, se paga ya la mitad.",
          bonificacion_pct=50, bonificacion_forma="pago_reducido",
          bonificacion_requisitos="Obra de especial interés o utilidad municipal (la declara el Pleno). Se pide junto con las cartas de pago.",
          bonificacion_plazo="Antes del inicio de la obra (como mucho 3 meses después de empezar). Se concede habitualmente; denegada con la obra ya terminada.",
          requiere_descargo=True, liquida="emite_ayuntamiento", momento="antes_de_presentar", aviso_vecinos=ICIO_PROV,
          normativa="Ordenanza Fiscal nº 4, art. 11.", evidencia="alemania6; avandes11; alava14; angeles7 (denegada)"),
    regla("FUENLABRADA", "Ayuntamiento de Fuenlabrada", "fianza_residuos", "no_aplica", "ninguna",
          formula_texto="No se exige; al final de la obra se aporta el certificado del gestor de residuos.",
          evidencia="andalucia10"),
    regla("FUENLABRADA", "Ayuntamiento de Fuenlabrada", "calas_zanjas", "no_aplica", "ninguna",
          formula_texto="Tasa 19.7 (calas y zanjas): 1,52 × 5 × 4 = 30,40 € en una rampa (unidades sin confirmar).",
          evidencia="andalucia10 rampa"),

    # ================================================================ MÓSTOLES
    regla("MOSTOLES", "Ayuntamiento de Móstoles", "tasa_urbanistica", "porcentaje", "pem", porcentaje=2.68,
          formula_texto="2,68 % del PEM; igual para ascensor, SATE y rampa.",
          liquida="autoliquidacion", momento="antes_de_presentar",
          normativa="Impreso Dal/OGT/006, código 020.",
          notas="¡Ojo! En la plantilla interna 'MOSTOLES formularios tasasnovalido.pdf' los campos de tasa e ICIO están cambiados.",
          evidencia="castellon1; maldonado4"),
    regla("MOSTOLES", "Ayuntamiento de Móstoles", "icio", "porcentaje", "pem", porcentaje=4,
          formula_texto="4 % del PEM. Sin bonificación.",
          liquida="autoliquidacion", momento="antes_de_presentar", regulariza_al_final=True, aviso_vecinos=ICIO_PROV,
          normativa="Impreso Dal/OGT/002, código 005.",
          notas="Si el coste real es menor, se puede pedir la devolución (Carlos V 42, sin resolver en más de un año).",
          evidencia="cuestadelavirgen6; alfonsoxii18; avCarlosV42"),
    regla("MOSTOLES", "Ayuntamiento de Móstoles", "fianza_residuos", "segun_estudio_residuos", "coste_gestion_residuos", minimo=150,
          formula_texto="Según el estudio de gestión de residuos: nivel II mínimo 0,2 % del presupuesto o 150 €. Vistos 150 a 870 € (~0,3 % del PEM). El Ayuntamiento la regulariza después.",
          liquida="autoliquidacion", momento="antes_de_presentar", regulariza_al_final=True, aviso_vecinos=RESIDUOS,
          normativa="Orden 2726/2009.",
          notas="Por transferencia a la Gerencia de Urbanismo, con ficha de tercero.",
          evidencia="alfonsoxii4; cuestadelavirgen6; maldonado4; castellon1; _CALCULO DE FIANZA"),
    regla("MOSTOLES", "Ayuntamiento de Móstoles", "ocupacion_via_publica", "no_aplica", "m2_dia",
          formula_texto="Liquidación posterior por m², días y categoría de calle (6,46 m², 135 días, calle de 2ª → 1.056,33 €).",
          liquida="liquidacion_posterior", momento="durante_obra", evidencia="alfonsoxii4"),
    regla("MOSTOLES", "Ayuntamiento de Móstoles", "garantia_demanial", "no_aplica", "ninguna",
          formula_texto="Si la rampa o el ascensor ocupan suelo público, Patrimonio pide una garantía aparte (778,97 € visto), a OTRA cuenta. No confundir con la fianza de residuos.",
          momento="antes_de_presentar", evidencia="alfonsoxii18 rampa"),

    # ================================================================ ALCORCÓN
    regla("ALCORCON", "Ayuntamiento de Alcorcón", "tasa_urbanistica", "porcentaje", "pem", porcentaje=2.5,
          formula_texto="2,5 % del PEM (modelo 608); igual para ascensor y rampa, sin mínimo visto.",
          liquida="autoliquidacion", momento="antes_de_presentar",
          notas="Provisional, \"a resultas de la liquidación definitiva\". Se genera en el portal ingresosnet.",
          evidencia="cañada22; sanignacio6"),
    regla("ALCORCON", "Ayuntamiento de Alcorcón", "icio", "porcentaje", "pem", ["ascensor"], porcentaje=4,
          formula_texto="4 % del PEM (modelo 905), con la bonificación ya descontada.",
          bonificacion_pct=90, bonificacion_forma="en_autoliquidacion",
          bonificacion_requisitos="Después se registra una instancia que la justifica: DNI de mayores de 65 en planta alta, certificados de minusvalía, certificado bancario.",
          requiere_descargo=True, liquida="autoliquidacion", momento="al_presentar", aviso_vecinos=ICIO_PROV,
          normativa="Ordenanza Fiscal 7/2023 (art. 26 devengo; art. 20.2 pérdida).", evidencia="cañada22; sanignacio6; avila3"),
    regla("ALCORCON", "Ayuntamiento de Alcorcón", "icio", "porcentaje", "pem", ["accesibilidad"] + FACHADA, porcentaje=4,
          formula_texto="4 % del PEM (modelo 905).",
          liquida="autoliquidacion", momento="al_presentar", aviso_vecinos=ICIO_PROV,
          notas="En una rampa se pagó entero y la bonificación se pidió aparte (sin saber si se concedió).",
          evidencia="cañada22 rampa"),
    regla("ALCORCON", "Ayuntamiento de Alcorcón", "fianza_residuos", "no_aplica", "ninguna",
          formula_texto="No se ha visto ninguna; el formulario solo pide el destino de los residuos.", evidencia="—"),
    regla("ALCORCON", "Ayuntamiento de Alcorcón", "fianza_reposicion", "no_aplica", "ninguna",
          formula_texto="Fianza de reposición de pavimento: la fija la licencia si la obra toca la vía pública (1.500 € en Av. del Oeste 1-3). Carta de pago por instancia a Infraestructuras.",
          momento="tras_concesion", evidencia="avdeloeste1-3"),
    regla("ALCORCON", "Ayuntamiento de Alcorcón", "calas_zanjas", "no_aplica", "ninguna",
          formula_texto="Modelo 361, por m² con tramos de largo y ancho (13 m² → 55,25 €). Llega por requerimiento, 10 días.",
          liquida="emite_ayuntamiento", momento="tras_concesion", evidencia="cañada22 rampa"),

    # ================================================================ ALCALÁ
    regla("ALCALA DE HENARES", "Ayuntamiento de Alcalá de Henares", "tasa_urbanistica", "tramos", "pem",
          formula_texto="Importe fijo por tramos del PEM, quizá distinto en DR y licencia. Vistos: 46.165 → 530 €; 81.048 → 845 €; 109.552 → 1.330 € (DR) / 1.390 € (licencia); 279.636 → 3.400 €.",
          liquida="emite_ayuntamiento", momento="antes_de_presentar", validez_dias=10,
          notas="Tabla de tramos NO encontrada. Desde 2025 una sola carta \"OBRAS_P\" con TPSU + ICIO, que se pide a Recaudación; no se puede pagar por transferencia.",
          evidencia="hernancortes13; cartagena4; juansebastianelcano4; barberanycollar48"),
    regla("ALCALA DE HENARES", "Ayuntamiento de Alcalá de Henares", "icio", "porcentaje", "pem", ASC, porcentaje=4,
          formula_texto="4 % del PEM sin el estudio de seguridad y salud (mínimo según los Costes de Referencia de la CAM). Se paga entero y se devuelve el 90 %.",
          bonificacion_pct=90, bonificacion_forma="devolucion_posterior",
          bonificacion_alcance="Solo la parte del presupuesto de acceso, circulación y habitabilidad.",
          bonificacion_requisitos="Modelo 006-1 con certificado de obra no iniciada y certificado bancario. Resuelve Gestión Tributaria.",
          bonificacion_plazo="Antes del inicio de la obra. La devolución llega ~1 año después, sin intereses.",
          liquida="emite_ayuntamiento", momento="antes_de_presentar", validez_dias=10, regulariza_al_final=True,
          aviso_vecinos=ICIO_PROV + " Se adelanta entero: la bonificación se devuelve más o menos un año después.",
          normativa="Ordenanza Fiscal 6, arts. 3.5 y 5.",
          notas="Si la obra no se hace, hay que pedir la anulación por escrito (si no, apremio +10 %).",
          evidencia="santateresa2; cartagena4; hernancortes13; barberanycollar48"),
    regla("ALCALA DE HENARES", "Ayuntamiento de Alcalá de Henares", "icio", "porcentaje", "pem", FACHADA, porcentaje=4,
          formula_texto="4 % del PEM sin el estudio de seguridad y salud.",
          liquida="emite_ayuntamiento", momento="antes_de_presentar", validez_dias=10, regulariza_al_final=True, aviso_vecinos=ICIO_PROV,
          notas="Hay un 90 % aparte para energía solar de autoconsumo.", evidencia="hernancortes13 cubierta; barberanycollar48"),
    regla("ALCALA DE HENARES", "Ayuntamiento de Alcalá de Henares", "fianza_residuos", "por_unidad", "m3_residuos", importe_unidad=15,
          formula_texto="15 € por m³ de residuos del estudio de gestión (57 m³ → 856 €). Hernán Cortés 13 pagó 150 € (¿mínimo?).",
          liquida="autoliquidacion", momento="antes_de_presentar", aviso_vecinos=RESIDUOS,
          notas="Transferencia a la cuenta exclusiva de fianzas (Intervención); se devuelve con el certificado del gestor.",
          evidencia="barberanycollar48; hernancortes13"),

    # ================================================================ GETAFE
    regla("GETAFE", "Ayuntamiento de Getafe", "tasa_urbanistica", "cuota_fija", "ninguna", ["ascensor"], via="licencia",
          importe_fijo=416.50,
          formula_texto="Cuota fija: 416,50 € (ascensor con licencia). Una modificación de licencia paga la mitad.",
          liquida="emite_ayuntamiento", momento="antes_de_presentar",
          notas="Ordenanza no encontrada: deducido de las cartas de pago. Se pide la \"autoliquidación asistida\" a servicios.fiscales@ayto-getafe.org (puede tardar meses).",
          evidencia="brunete10; avaragon14; avangeles6; valdemorillo1; avespaña33"),
    regla("GETAFE", "Ayuntamiento de Getafe", "tasa_urbanistica", "cuota_fija", "ninguna", FACHADA, via="declaracion_responsable",
          importe_fijo=205.55,
          formula_texto="Cuota fija: 205,55 € (SATE con DR).",
          liquida="emite_ayuntamiento", momento="antes_de_presentar", evidencia="avgibraltar4-6-8"),
    regla("GETAFE", "Ayuntamiento de Getafe", "icio", "porcentaje", "pem", ASC, porcentaje=4,
          formula_texto="4 % del PEM. Se paga entero y se devuelve el 90 %.",
          bonificacion_pct=90, bonificacion_forma="devolucion_posterior",
          bonificacion_requisitos="Discapacidad de al menos el 33 % y que la obra no sea obligatoria por norma (certificado de no obligatoriedad, presupuesto, licencia registrada, autorización, certificado de discapacidad).",
          bonificacion_plazo="La devolución tarda más de un año (Perdiz 5: pedida 05-2023, concedida 10-2024).",
          liquida="autoliquidacion", momento="al_presentar", regulariza_al_final=True,
          aviso_vecinos=ICIO_PROV + " Se adelanta entero: la bonificación se devuelve después.",
          normativa="Ordenanza del ICIO, arts. 6, 8 y 9.1.", evidencia="brunete10; perdiz5"),
    regla("GETAFE", "Ayuntamiento de Getafe", "icio", "porcentaje", "pem", FACHADA, porcentaje=4,
          formula_texto="4 % del PEM. Fachadas: sin bonificación.",
          liquida="autoliquidacion", momento="al_presentar", regulariza_al_final=True, aviso_vecinos=ICIO_PROV,
          normativa="Ordenanza del ICIO, arts. 6 y 8.", evidencia="avgibraltar4-6-8"),
    regla("GETAFE", "Ayuntamiento de Getafe", "ocupacion_via_publica", "fijo_mas_unidad", "m2_dia",
          importe_fijo=85.15, importe_unidad=0.135,
          formula_texto="85,15 € fijos + 0,135 € por m² y día (calle de categoría 2). La prórroga solo paga la parte variable.",
          momento="durante_obra", notas="Tarifa vista para calle de categoría 2.", evidencia="avgibraltar4-6-8"),
    regla("GETAFE", "Ayuntamiento de Getafe", "fianza_residuos", "no_aplica", "ninguna",
          formula_texto="No se ha encontrado en ningún expediente.", evidencia="—"),
]


def tramite(muni, organismo, via, nombre, tipos=None, canal="directo", pasos=(), documentos=(), **campos):
    return dict(muni=muni, organismo=organismo, via=via, nombre=nombre, tipos=tipos or [], canal=canal,
                pasos=list(pasos), documentos=list(documentos), **campos)


DANIEL = "Interesada la comunidad (CIF); representa Daniel con su certificado digital; el presidente firma la solicitud y la autorización."

TRAMITES = [
    tramite("MADRID", "ACTECU", "licencia", "Madrid · licencia por ECU (ACTECU)", canal="ecu",
            donde_se_presenta="Por la plataforma de ACTECU, que la registra en el Ayuntamiento.",
            quien_firma="La comunidad firma la hoja de encargo de ACTECU y autoriza a ACTECU a presentar por vía telemática.",
            plazo_tipico="~7 semanas de alta a resolución (Algodre 2: 26-01 → 11-03-2026); Aceuchal 18: 23-04 → 18-07-2024.",
            habilita_inicio="La notificación de la resolución que concede la licencia.",
            avisos="El ICIO y la garantía de residuos caducan: en Hermanos Machado 41 hubo que rehacerlos.",
            evidencia="algodre2; aceuchal18; hermanosmachado41",
            pasos=["Pedir presupuesto a ACTECU y que la comunidad firme su hoja de encargo.",
                   "Pagar y dar de alta el expediente en ACTECU.",
                   "ACTECU manda el ICIO y la garantía de residuos ya rellenos: la comunidad los paga y firma la solicitud.",
                   "ACTECU registra en el Ayuntamiento con el certificado de conformidad.",
                   "Resuelve la Agencia de Actividades.",
                   "Al terminar la obra: DR de funcionamiento (certificado final de obra visado, constructora, director de obra y, si cambió el coste, ICIO complementario)."],
            documentos=["Hoja de encargo de ACTECU firmada", "Memoria", "Planos", "Presupuesto", "Estudio de gestión de residuos",
                        "Estudio básico de seguridad y salud", "Certificado de conformidad (lo emite la ECU)"]),
    tramite("MADRID", "Ayuntamiento de Madrid", "licencia", "Madrid · licencia directa al Ayuntamiento (Junta de distrito)",
            donde_se_presenta="Registro electrónico de la sede del Ayuntamiento de Madrid.",
            quien_firma=DANIEL,
            plazo_tipico="Muy largo: Alcalá de Guadaira 41 registrada 03-2025 y en 01-2026 \"a la espera de informes sectoriales\"; Guancha 1 registrada 03-2026 y en 09-2026 en Servicios Técnicos.",
            habilita_inicio="La notificación de la resolución que concede la licencia.",
            evidencia="guancha1; alcaladeguadaira41",
            pasos=["Autoliquidar y pagar el ICIO y la TPSU.",
                   "Registrar la solicitud en la sede con el certificado de Daniel.",
                   "Seguir el expediente con la Junta de distrito."],
            documentos=["Proyecto visado", "Cuestionario de estadística", "ICIO pagado", "TPSU pagada",
                        "Declaración de colocación del cartel", "Declaración de adecuación urbanística y viabilidad geométrica",
                        "Hoja de dirección de obra"]),
    tramite("MADRID", "Ayuntamiento de Madrid", "declaracion_responsable", "Madrid · declaración responsable",
            donde_se_presenta="Registro del Ayuntamiento, con certificado de conformidad de una ECU o pagando la TPSU.",
            quien_firma=DANIEL,
            habilita_inicio="Registrada con el certificado de conformidad favorable.",
            evidencia="albalatedelarzobispo5; ezequielsolana97; hermanosmachado41",
            pasos=["Elegir: por ECU (pagando su precio) o directa (pagando la TPSU).",
                   "Autoliquidar el ICIO (y la TPSU si va directa); firmar el descargo de la bonificación.",
                   "Registrar la DR con el justificante del precio de la ECU o de la TPSU."],
            documentos=["DR firmada", "Justificante del precio de la ECU o de la TPSU", "ICIO pagado", "Proyecto o memoria", "Estudio de gestión de residuos"]),

    tramite("LEGANES", "Ayuntamiento de Leganés", "licencia", "Leganés · licencia (ascensor)", ["ascensor"],
            donde_se_presenta="Sede electrónica sede.leganes.org, modelo 110URB101.",
            quien_firma=DANIEL + " La autorización va con el acta de la junta.",
            plazo_tipico="Largo: Rioduero 12, 01-2023 → concedida 12-2025. Bonificación del ICIO: 2-3 meses.",
            habilita_inicio="La concesión de la licencia (Junta de Gobierno).",
            evidencia="rioduero12; galicia7; sannicolas19",
            pasos=["Pedir las tasas por Solicitud General, adjuntando memoria y presupuesto.",
                   "El Ayuntamiento manda la autoliquidación de la tasa y de la fianza de residuos: pagarlas (un mes).",
                   "Registrar la licencia y, a la vez, la solicitud de bonificación del ICIO.",
                   "El ICIO llega después de la concesión, como liquidación; una vez concedida la bonificación, pedir que lo manden bonificado."],
            documentos=["Solicitud", "Proyecto visado", "Tasa pagada", "Fianza de residuos pagada", "Estadística CE1",
                        "Estudio de gestión de residuos", "Estudio de seguridad y salud", "Hoja de dirección de obra",
                        "Compromiso de cartel", "Datos del promotor y autorización (con el acta)"]),
    tramite("LEGANES", "Ayuntamiento de Leganés", "declaracion_responsable", "Leganés · declaración responsable (fachada / SATE)", FACHADA,
            donde_se_presenta="Sede electrónica sede.leganes.org, modelo URB_DRU 04/2022 (casilla Ley 2/2012, obras que afectan a fachada).",
            quien_firma=DANIEL,
            plazo_tipico="La comunicación favorable tarda: Covadonga 18, 09-2024 → 10-2026.",
            habilita_inicio="En principio el registro (Ley 1/2020).",
            evidencia="alcarria60; avdelamancha18; covadonga18",
            pasos=["Pedir las tasas por Solicitud General con memoria y presupuesto.",
                   "Pagar la tasa y la fianza de residuos.",
                   "Registrar la DR."],
            documentos=["DR firmada", "Tasa pagada", "Fianza de residuos pagada", "Hoja de dirección de obra",
                        "Compromiso de cartel", "Proyecto", "Autorización"]),

    tramite("FUENLABRADA", "Ayuntamiento de Fuenlabrada", "declaracion_responsable", "Fuenlabrada · declaración responsable (ascensor, SATE, accesibilidad)",
            ["ascensor", "accesibilidad"] + FACHADA,
            donde_se_presenta="Tasas: sede de la OTAF (otaf.ayto-fuenlabrada.es). DR: Registro Electrónico Común del Ayuntamiento.",
            quien_firma=DANIEL,
            plazo_tipico="Tasas en 5-13 días. La comunicación de recepción, 2-9 meses; el decreto de DR favorable, 3-4 años (Andalucía 10: 10-2022 → 05-2026).",
            habilita_inicio="La DR registrada con las tasas pagadas.",
            avisos="La web de la OTAF falla y caduca a los pocos minutos; nombres de fichero de 8 caracteres como mucho; texto de la solicitud de 280 caracteres como mucho. Para no perder la bonificación: certificado de NO inicio, y al empezar, certificado de inicio a la OTAF.",
            evidencia="avespaña9; alemania6; andalucia10 (+instrucciones OTAF para pedir las tasas.docx)",
            pasos=["Pedir en la OTAF, con el certificado de Daniel, las cartas de pago de \"licencia urbanística\" y de \"ICIO con bonificación del 50 %\".",
                   "Adjuntar: datos del promotor y autorización, la DR sin presentar, memoria, presupuesto, instancia de bonificación firmada por Daniel y el descargo firmado por la comunidad.",
                   "En 5-13 días llegan la tasa y el ICIO al 50 %: los paga el administrador.",
                   "Registrar la DR en el Registro Electrónico Común.",
                   "Al empezar la obra, aportar el certificado de inicio a la OTAF."],
            documentos=["Proyecto visado", "Estudio de seguridad y salud", "Justificante de pago de tasa e ICIO", "Conformidad urbanística",
                        "Viabilidad geométrica", "Compromiso de cartel", "Hoja de dirección de obra", "Datos del promotor y autorización",
                        "Instancia de bonificación del ICIO", "Descargo de responsabilidad firmado por la comunidad"]),
    tramite("FUENLABRADA", "Ayuntamiento de Fuenlabrada", "licencia", "Fuenlabrada · licencia de obra menor en suelo público (rampa)", ["rampa"],
            donde_se_presenta="Registro Electrónico del Ayuntamiento.",
            quien_firma=DANIEL,
            plazo_tipico="Andalucía 10: pedida 12-02-2024, cesión del suelo 17-12-2024, conformidad 03-02-2025.",
            habilita_inicio="La conformidad, tras la cesión de uso del suelo por la Junta de Gobierno.",
            evidencia="andalucia10 rampa",
            pasos=["Solicitar la licencia de obra menor en suelo público.", "Esperar la cesión de uso del suelo (Junta de Gobierno).",
                   "Pagar la tasa de calas y zanjas si la piden."]),

    tramite("MOSTOLES", "Ayuntamiento de Móstoles", "licencia", "Móstoles · licencia (ascensor)", ["ascensor"],
            donde_se_presenta="Sede electrónica: \"Instancia General Urbanismo\" (autorización previa U033).",
            quien_firma=DANIEL,
            plazo_tipico="8 a 14 meses (Cuesta de la Virgen 6: 04-2024 → 11-2024; Alfonso XII 18: 02-2023 → 04-2024). Con concesión demanial pendiente, parada más de 10 meses.",
            habilita_inicio="La notificación del acuerdo del Comité Ejecutivo de la Gerencia de Urbanismo.",
            requerimientos_tipicos="Proyecto refundido; completar la fianza de residuos; concesión demanial.",
            avisos="Si se ocupa vía pública hace falta además la concesión demanial de Patrimonio, y su garantía va a OTRA cuenta que la de residuos.",
            evidencia="alfonsoxii16; cuestadelavirgen6; alfonsoxii18",
            pasos=["La comunidad autoliquida tasa e ICIO con los impresos que prepara Accesalia y transfiere la fianza de residuos.",
                   "Presentar la Instancia General Urbanismo en representación de Daniel.",
                   "Si ocupa suelo público, tramitar la concesión demanial con Patrimonio."],
            documentos=["Solicitud de licencia firmada", "Estadística CE-1", "Compromiso de cartel", "Ficha de tercero",
                        "Fianza de residuos pagada", "Proyecto visado", "Estudio de gestión de residuos", "Estudio de seguridad y salud",
                        "Tasa e ICIO pagados", "Datos del promotor y autorización"]),
    tramite("MOSTOLES", "Ayuntamiento de Móstoles", "declaracion_responsable", "Móstoles · declaración responsable (fachada / SATE)", FACHADA,
            donde_se_presenta="Sede electrónica, Instancia General Urbanismo (DR de actuaciones con proyecto técnico, art. 155 Ley 9/2001).",
            quien_firma=DANIEL,
            habilita_inicio="Su presentación (\"habilita desde el día de su presentación\").",
            evidencia="castellon1; avCarlosV32; avCarlosV42; maldonado4",
            pasos=["Autoliquidar tasa e ICIO y transferir la fianza de residuos.", "Presentar la DR."]),

    tramite("ALCORCON", "Ayuntamiento de Alcorcón", "licencia", "Alcorcón · licencia urbanística (todo tipo de obra)",
            donde_se_presenta="Registro telemático (portalciudadano.ayto-alcorcon.es), URBANISMO / Licencia urbanística, impreso DYC-102.",
            quien_firma=DANIEL,
            plazo_tipico="4 a 16 meses de registro a licencia (Sierra de Albarracín 13: ~4; Infantas 9: ~16).",
            habilita_inicio="El decreto de concesión notificado (y, para ocupar la vía pública, su autorización aparte).",
            requerimientos_tipicos="Tasa de calas y zanjas (modelo 361, 10 días); aportar documentación o memoria.",
            contacto_estado="urbarquitectoio@ / info@ayto-alcorcon.es",
            avisos="Andamios y contenedores se piden aparte. Nota interna: las tasas caducan al año.",
            evidencia="cañada22; sanignacio6; avdeloeste1-3; avila3; sierradealbarracin13; infantas9",
            pasos=["Generar y pagar en ingresosnet el modelo 608 (tasa) y el 905 (ICIO, con la bonificación si es ascensor); firmar el descargo.",
                   "Registrar la solicitud DYC-102 con todo adjunto.",
                   "Si es ascensor con bonificación: registrar la instancia que la justifica.",
                   "Pagar lo que llegue por requerimiento (calas, fianza de pavimento)."],
            documentos=["Solicitud DYC-102 firmada", "Modelos 608 y 905 pagados", "Memoria, planos, presupuesto y pliego",
                        "Viabilidad y conformidad urbanística", "Estudio de gestión de residuos", "Estudio de seguridad y salud",
                        "Hoja de dirección de obra", "Compromiso de cartel", "Estadística CE1", "Datos del promotor y autorización",
                        "Fotos en color de la zona y la fachada"]),

    tramite("ALCALA DE HENARES", "Ayuntamiento de Alcalá de Henares", "licencia", "Alcalá de Henares · licencia con proyecto (ascensor)", ["ascensor"],
            donde_se_presenta="Sede electrónica sede.ayto-alcaladehenares.es (las comunidades deben relacionarse electrónicamente).",
            quien_firma=DANIEL,
            plazo_tipico="~14-15 meses (Santa Teresa 2; Juan Sebastián Elcano 4).",
            habilita_inicio="El acuerdo de concesión de la Junta de Gobierno Local.",
            contacto_estado="oficinadeatencionurbanistica@; tasas: serviciorecaudacion@ / gestiontributaria@",
            avisos="La carta OBRAS_P caduca a los ~10 días; no se puede pagar por transferencia. Pedir la bonificación (006-1) ANTES de empezar. Si no se hace la obra, pedir la anulación del ICIO por escrito. Hernán Cortés 13 empezó por DR y tuvo que ir por licencia.",
            normativa="Ordenanza de Tramitación de Licencias, BOCM 22/09/2018.",
            evidencia="hernancortes13; santateresa2; juansebastianelcano4; cartagena4",
            pasos=["Pedir a Recaudación la autoliquidación OBRAS_P (TPSU + ICIO) y pagarla en ~10 días.",
                   "Ingresar la fianza de residuos en la cuenta exclusiva de fianzas.",
                   "Registrar la licencia.",
                   "Antes de empezar: solicitud de bonificación del ICIO (modelo 006-1) con certificado de no inicio."],
            documentos=["Acreditación de la representación", "Tasa pagada", "Estadística", "Declaración responsable del autor del proyecto",
                        "Viabilidad geométrica", "Plan de residuos y justificante de la fianza", "Proyecto visado",
                        "Hojas de dirección facultativa visadas", "Estudio de seguridad y salud",
                        "Solicitud de ocupación de vía pública (si hace falta)"]),
    tramite("ALCALA DE HENARES", "Ayuntamiento de Alcalá de Henares", "declaracion_responsable", "Alcalá de Henares · declaración responsable (fachada, SATE, cubierta)", FACHADA,
            donde_se_presenta="Sede electrónica sede.ayto-alcaladehenares.es.",
            quien_firma=DANIEL,
            plazo_tipico="9 meses a 2 años hasta la resolución de conformidad.",
            habilita_inicio="En teoría la presentación; en la práctica se espera la resolución de conformidad. Obliga a empezar en 6 meses y acabar en 1 año.",
            normativa="Ordenanza BOCM nº 127, 30/05/2022.",
            evidencia="hernancortes13 cubierta; barberanycollar48",
            pasos=["Pedir y pagar la OBRAS_P (el ICIO es obligatorio al presentar).", "Ingresar la fianza de residuos.", "Registrar la DR."],
            documentos=["DR firmada", "Justificante de tasa e ICIO", "Viabilidad y conformidad normativa", "Proyecto con cartel",
                        "Datos del promotor y autorización", "Fianza de residuos pagada", "Planos de estado actual y reformado",
                        "Presupuesto por partidas", "Impreso de gestión de residuos"]),

    tramite("GETAFE", "Ayuntamiento de Getafe", "licencia", "Getafe · licencia (ascensor)", ["ascensor"],
            donde_se_presenta="Sede electrónica, Solicitudes electrónicas, ámbito Urbanismo.",
            quien_firma=DANIEL,
            avisos="Las tasas se piden aparte a servicios.fiscales@ayto-getafe.org (\"autoliquidación asistida\"); en Brunete 10 tardaron más de 3 meses y hubo que reclamar. Si el ICIO llega sin bonificar: anulación + solicitud de bonificación.",
            habilita_inicio="La concesión de la licencia.",
            evidencia="brunete10; perdiz5",
            pasos=["Registrar la solicitud de licencia.", "Pedir la autoliquidación asistida de tasa e ICIO a servicios.fiscales@.",
                   "Pagar y solicitar la bonificación del ICIO (se devuelve después)."],
            documentos=["Solicitud", "Planos y memoria visados", "Estudio de seguridad y salud", "Estudio de gestión de residuos",
                        "Estadística", "Compromiso de cartel", "Autorización con acta"]),
    tramite("GETAFE", "Ayuntamiento de Getafe", "declaracion_responsable", "Getafe · declaración responsable (SATE)", FACHADA,
            donde_se_presenta="Sede electrónica: \"Declaración responsable para obras y demoliciones\".",
            quien_firma=DANIEL,
            habilita_inicio="Desde el día de su presentación en el registro.",
            requerimientos_tipicos="Impreso en modelo oficial; declaración responsable del técnico redactor si el proyecto no va visado (15 días).",
            evidencia="avgibraltar4-6-8",
            pasos=["Pedir la autoliquidación de tasa e ICIO.", "Presentar la DR."]),
]


def main():
    base = arrancar()
    if base.leer("reglas_tasas?select=id&limit=1") or base.leer("tramites?select=id&limit=1"):
        sys.exit("Ya hay reglas o trámites cargados: no se carga dos veces.")

    munis = {m["nombre"]: m["id"] for m in base.leer("municipios_catastro?select=id,nombre")}
    orgs = {o["nombre"]: o["id"] for o in base.leer("organismos?select=id,nombre")}
    tipos = {t["clave"]: t["id"] for t in base.leer("tipos_proyecto?select=id,clave")}

    filas, rel = [], []
    for r in REGLAS:
        r = dict(r)
        rid = str(uuid.uuid4())
        for t in r.pop("tipos"):
            rel.append({"regla_id": rid, "tipo_proyecto_id": tipos[t]})
        fila = {"id": rid, "municipio_id": munis[r.pop("muni")], "organismo_id": orgs[r.pop("organismo")]}
        fila.update(r)
        filas.append(fila)
    # PostgREST quiere las mismas columnas en todas las filas de una tanda.
    columnas = sorted({k for f in filas for k in f})
    filas = [{k: f.get(k) for k in columnas} for f in filas]
    for f in filas:
        f.setdefault("via", "ambas")
        f["via"] = f["via"] or "ambas"
        f["canal"] = f["canal"] or "ambos"
        f["requiere_descargo"] = bool(f["requiere_descargo"])
    base.insertar("reglas_tasas", filas)
    base.insertar("reglas_tasas_tipos", rel)

    tfilas, trel, pasos, docs = [], [], [], []
    for t in TRAMITES:
        t = dict(t)
        tid = str(uuid.uuid4())
        for k in t.pop("tipos"):
            trel.append({"tramite_id": tid, "tipo_proyecto_id": tipos[k]})
        for i, p in enumerate(t.pop("pasos"), 1):
            pasos.append({"tramite_id": tid, "orden": i, "texto": p})
        for i, d in enumerate(t.pop("documentos"), 1):
            docs.append({"tramite_id": tid, "orden": i, "nombre": d, "obligatorio": True})
        fila = {"id": tid, "municipio_id": munis[t.pop("muni")], "organismo_id": orgs[t.pop("organismo")]}
        fila.update(t)
        tfilas.append(fila)
    columnas = sorted({k for f in tfilas for k in f})
    tfilas = [{k: f.get(k) for k in columnas} for f in tfilas]
    base.insertar("tramites", tfilas)
    base.insertar("tramites_tipos", trel)
    base.insertar("tramite_pasos", pasos)
    base.insertar("tramite_documentos", docs)
    print("reglas: %d (+%d tipos) · trámites: %d (+%d tipos, %d pasos, %d documentos)"
          % (len(filas), len(rel), len(tfilas), len(trel), len(pasos), len(docs)))


if __name__ == "__main__":
    main()
