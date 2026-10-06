# Extraer los datos de una hoja de encargo

Cada fichero `textos/NNN.txt` es el texto de UNA hoja de encargo de Accesalia (estudio de
arquitectura, Madrid), tal como se ENVIÓ al cliente. Puede ser de 2024 (Word, formatos
variados) o de 2025-26 (plantilla automática). Si la primera línea empieza por `#DRIVE_ID=`,
es una cabecera técnica: no es parte de la hoja.

Para cada fichero, saca UN objeto JSON en UNA línea con esta forma exacta:

```
{"n":"NNN",
 "fecha_hoja":"AAAA-MM-DD" | null,
 "direccion":"tal cual aparece en la hoja (calle, número, municipio)" | null,
 "a_quien":"comunidad" | "contrata: <nombre>" | "otro: <texto>",
 "que_se_hace":["<nombre EXACTO de la lista TIPOS>" ...],
 "que_se_hace_sin_casar":["<texto original que no encaja en TIPOS>" ...],
 "conceptos":[
   {"texto":"<título del concepto tal cual en la hoja>",
    "bloque":"<código EXACTO de la lista BLOQUES>" | "SIN CASAR",
    "importe":<número, base SIN IVA, en euros> | null,
    "pct_exito":<número, % a éxito> | null,
    "forma_pago":"<texto>" | null,
    "incluido":true|false}
 ],
 "total_base":<número sin IVA> | null,
 "forma_pago_general":"<texto>" | null,
 "rarezas":"<lo que deba mirar una persona, en pocas palabras>" | null}
```

## Reglas

- **fecha_hoja**: la fecha de emisión que pone la hoja ("En Madrid, a 24 de octubre de 2024",
  "En Madrid, a 31/07/2025"). Nunca la inventes; si no está, null.
- **importe**: SIEMPRE la base sin IVA. "4.980 + 1.045,8 IVA = 6.025,8" → 4980. "1.800€ + IVA"
  → 1800. Formato español: el punto es de miles, la coma decimal.
- **pct_exito**: subvenciones a éxito ("3,5% del importe concedido") → pct_exito 3.5, importe null.
- **incluido**: true si el concepto aparece pero va incluido en otro precio, sin coste o "libre
  de costo" (p. ej. "Incluye: Proyecto, Tramitación de Licencia"; "se incluirá libre de costo:
  IEE, CEE"). false si se cobra.
- Si la hoja da un **precio conjunto** para varias cosas (p. ej. "Toma de datos, modelado 3D,
  Proyecto Básico y de Ejecución ... | (sin precio)" y luego "TOTAL HONORARIOS: 5.900"), pon cada
  cosa como concepto con importe null y el total en total_base. NO repartas importes.
- **a_quien**: "comunidad" si va a una comunidad de propietarios. Si el pagador es una empresa
  (Schindler, Otis, Elecnor, una contrata, "Nº pedido ELECNOR"...), "contrata: <nombre>".
- **rarezas**: tachados, "no vale", "anulado", varias direcciones o portales en una hoja,
  importes que no cuadran, texto que parece de otra comunidad, hoja vacía o ilegible, cosas que
  no son una hoja de encargo (orden de compra, factura, presupuesto de obra...).
- No inventes nada. Ante la duda: null o "SIN CASAR", y explícalo en rarezas.

## BLOQUES (qué se cobra) — usa el código de la izquierda

| código | cómo suele aparecer en la hoja |
|---|---|
| TOMA DE DATOS Y MODELADO 3D | toma de datos, modelado 3D, visita, medición |
| REDACCION PROYECTO | redacción del proyecto básico y de ejecución, proyecto, honorarios de proyecto |
| TRAMITACION LICENCIAS | tramitación de licencias y permisos, licencia, DR, declaración responsable |
| TRAMITACION 3 PRESUPUESTOS | solicitud y análisis de presupuestos, tres presupuestos |
| CERTIFICADO FIN DE OBRA | fin de obra, certificado final de obra, CFO |
| DF | dirección facultativa, dirección de obra |
| CSS | coordinación de seguridad y salud, estudio de seguridad y salud |
| IEE | informe de evaluación del edificio |
| CEE | certificado de eficiencia energética |
| LEE | libro del edificio |
| MEMORIA TECNICA | memoria técnica (simplificada), memoria valorada |
| INFORME PERICIAL | informe pericial, informe técnico, informe estructural, cálculo estructural |
| CONSULTA URBANISTICA | consulta urbanística |
| SOLICITUD DE FINANCIACION | solicitud de financiación, crédito |
| TRAMITACION SUBVENCIONES | tramitación de subvenciones (sin decir de qué tipo) |
| TRAMITACION SUBVENCIONES ACCESIBILIDAD | subvenciones de accesibilidad |
| TRAMITACION SUBVENCIONES EFICIENCIA ENERGETICA | subvenciones de eficiencia energética, rehabilitación energética, Next Generation |
| SATE CON CESION DE CAES | SATE con cesión de CAEs |
| SATE + ASCENSOR CON CESION DE CAES | SATE + ascensor con CAEs |
| MEDICIONES Y CIEGO | mediciones y presupuesto ciego |

"Documentación Técnica Anexa" (IEE+CEE+... para la subvención) → si lleva precio propio y no
encaja en uno solo, "SIN CASAR" con su importe y explícalo en rarezas.

## TIPOS (qué se hace) — usa el nombre EXACTO

3 Presupuestos · Accesibilidad · Aerotermia · Añadir parada · Arreglo cubierta · Arreglo fachada ·
Ascensor · CAES · Cambio de cabina · Cambio de puertas · CEE · CFO · Consulta urbanística ·
Cota cero · CSS · DF · Doc técnica subv (IEE+CEE+LEE) · Eficiencia energética · Financiación ·
Fotovoltaica · IEE · Accesibilidad portal · Informe pericial · Informe técnico · Intervenciones exterior · LEE · Licencia ·
Memoria técnica valorada · Modificación asc. · Otros · Plataforma · Rampa · SATE cubierta ·
SATE envolvente completa · SATE fachada · Subvenciones · Toma de datos y Modelado 3D ·
Visado Colegio

"que_se_hace" es la OBRA o el servicio principal del encargo ("Proyecto para instalación de
ascensor" → Ascensor; "sustitución ascensores" → Modificación asc. si es cambio del existente,
y explícalo en rarezas si dudas; "tramitación de subvenciones" → Subvenciones; "elevador" o
"plataforma elevadora" → Plataforma; remodelación de portal → Accesibilidad portal). Puede haber
varios.

Subvenciones de accesibilidad o de eficiencia energética → TRAMITACION SUBVENCIONES. La
"Documentación Técnica Anexa" (IEE, CEE, LEE, comparativa) es la doc técnica: el importe FIJO de la
línea de subvención. Descuento por cesión de CAES → bloque SATE (+ ASCENSOR) CON CESION DE CAES con
el importe ya descontado.
