# Extraer los datos de cada línea de factura (Factusol) — instrucciones para el agente

Accesalia es un estudio de arquitectura (ascensores, accesibilidad, SATE, subvenciones, IEE en comunidades de
vecinos de Madrid). Factura con tres empresas: 001 Daniel de Soto (autónomo), 002 Accesalia SL (casi todo), 003
Ecobalance (CAES y comisiones). Mónica quiere: **primero EXTRAER de cada línea lo que dice, luego casar** con las
hojas de encargo y sus plazos (eso lo hará otro paso, tú NO casas).

Tu fichero: `lineas_N.json` (en `scratchpad/factusol/`). Cada elemento es UNA línea de factura con: `id, empresa,
factura, fecha_factura, estado_factura, cliente, nif, domicilio_cliente, total_factura, importe_linea, cantidad,
precio, texto`. El `texto` es el concepto, que suele ser así:

> "Según hoja de encargo de fecha 10/12/2025 y recibida firmada en fecha 29/05/2026, honorarios (50% 2ª mitad de
> 6.900 € + iva) por entrega de proyecto para INSTALACIÓN DE ASCENSOR en edificio residencial existente en:
> CL CONDESA DE TEBA 21 MADRID. Incluye: ..."

## Qué sacar de cada línea (LEE el texto entero; no te quedes en la primera frase)

```
{"id": "...",
 "fecha_hoja": "AAAA-MM-DD" | null,        # "hoja de encargo de fecha ..." / "de 30 de junio 2023"
 "fecha_firma": "AAAA-MM-DD" | null,       # "recibida (firmada) en fecha ..."
 "direccion": "VIA NUMERO(S)" | null,      # la del edificio, en mayúsculas, sin "CL"/"CALLE" delante; números tal cual (19-21-23)
 "municipio": "..." | null,                # si lo dice; si no, null (no supongas Madrid)
 "concepto": uno de: proyecto_ascensor | proyecto_plataforma | proyecto_sate | proyecto_accesibilidad |
             proyecto_otro | declaracion_responsable | licencia | direccion_obra | cfo | css |
             subvencion | doc_tecnica | iee | cee | lee | libro_edificio | tres_presupuestos | financiacion |
             viabilidad | informe | caes | comision | otro,
 "concepto_texto": "como lo dice la factura, corto",   # p.ej. "entrega de proyecto para instalación de ascensor"
 "plazo": uno de: encargo | entrega | licencia | inicio_obra | durante_obra | cfo | concesion | exito |
          pago_unico | otro | null,          # en qué momento del cobro estamos: "a la contratación/encargo",
                                             # "a la entrega", "obtención de licencia", "inicio de obras", "al CFO",
                                             # "a la concesión de la subvención", "a éxito", "100%/total"
 "parte": "1/2" | "2/2" | "1/3" | "2/3" | "3/3" | "1/4" | ... | null,   # "2ª mitad" = 2/2, "último tercio" = 3/3
 "porcentaje": número | null,              # el % que se cobra en esta línea (50, 20, 25, 3.5...)
 "total_del_que_es_parte": número | null,  # "50% de 6.900 €" -> 6900 (sin IVA)
 "importe_linea": número,                  # cópialo del dato importe_linea
 "pagador_no_es_la_comunidad": true|false, # el cliente es una contrata/ascensorista/eléctrica/empresa que paga por
                                           # la comunidad (FAIN, Schindler, Iberdrola, Elecnor, Rosersese, CEGA...)
 "pedido": "..." | null,                   # nº de pedido u orden de compra si lo cita (Iberdrola "Pedido: 4700502433")
 "varios_edificios": true|false,           # si la línea habla de más de una dirección
 "nota": "lo raro, breve" | null}
```

Reglas:
- Si un dato no está, `null`. **No inventes.** No completes la fecha de la hoja con la de la factura.
- La venta de CAES (certificados de ahorro, kWh, "CAE_...") → `concepto: caes`. Comisiones ("comerciales
  correspondientes al año", "comisión") → `comision`.
- Si la línea es la continuación de otra de la misma factura y no repite datos, saca lo que tenga y pon en `nota`
  "continuación de la línea anterior".
- Una línea puede llevar dos conceptos ("CSS - CFO"): elige el principal y explícalo en `nota`.

## Salida

`scratchpad/factusol/extraido_N.jsonl`, una línea JSON por cada línea de tu fichero (TODAS, mismo `id`).
- SOLO LEER: no toques la base de datos, ni el repo, ni los ficheros .accdb. Temporales en `scratchpad/factusol/tmp_N/`.
- Lee los textos de verdad (puedes procesar con Python para cargar/escribir, pero la interpretación es tuya, línea a
  línea o por grupos parecidos, revisando).
- Guarda cada ~50 y sigue si se corta.
- Al acabar, resumen corto: cuántas por `concepto` y por `plazo`, cuántas sin `fecha_hoja`, y hasta 5 dudas.
