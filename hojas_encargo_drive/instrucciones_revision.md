# Releer una hoja de encargo FIRMADA (revisión 2025-2026)

Contexto: Accesalia (arquitectura, Madrid) envía hojas de encargo; la comunidad (o una empresa,
p. ej. una ascensorista como FAIN o Schindler) la devuelve firmada. La firmada es NUESTRO CONTRATO.
Hay que sacar de ella, con total exactitud: qué nos han contratado, cuánto se cobra y cuándo.

Te dan un lote JSON (una entrada por hoja). Para cada hoja:
- `pdfs[].paginas`: imágenes PNG de cada página. MÍRALAS TODAS con la herramienta Read (lee
  imágenes). Si `pdfs[].texto` trae texto, úsalo para copiar literal, pero comprueba con la imagen
  (lo escrito a mano, tachados, sellos y firmas solo se ven en la imagen).
- Un PDF puede traer DOS hojas (proyecto + subvención): extrae SOLO la que corresponde a esta hoja
  (mira `conceptos_base`, `total_base` y `descripcion`) y dilo en `nota`.

Qué extraer (todo tal cual dice el papel; NO inventes ni completes):
1. `fecha_emision`: la de "En Madrid, a dd/mm/aaaa" (AAAA-MM-DD).
2. `fecha_casilla`: lo escrito en la casilla "Fecha firma", literal ("25-SEPTIEMBRE-2026"), o null.
3. `firma_presente`: true si la casilla "Firma" del cliente tiene firma o sello; false si está en
   blanco (aunque firme Daniel). Esto es CRÍTICO: una hoja sin firma del cliente NO está firmada.
4. Pagador (casilla "Conforme"): `pagador_tipo` "comunidad" (comunidad de propietarios, CP,
   mancomunidad) o "empresa" (S.A., S.L., ascensorista...); `razon_social`, `cif`, `iban`,
   `direccion` literales (null si la casilla está vacía). Copia CIF e IBAN con cuidado, carácter a
   carácter; si un carácter no se lee seguro, pon `?` en su lugar.
5. `total_base`: el total de honorarios SIN IVA que dice la hoja (número), o null si no hay total.
6. `forma_pago_texto`: el texto de la forma de pago, literal y completo.
7. `lineas`: TODO lo que la hoja dice que vamos a hacer, una línea por concepto, en orden:
   - `texto`: el nombre del concepto tal como sale.
   - `bloque`: el código del catálogo que le corresponda, uno de: CEE, CERTIFICADO FIN DE OBRA,
     CONSULTA URBANISTICA, CSS, DF, GESTION DE CAES, IEE, INFORME PERICIAL, LEE, MEDICIONES Y CIEGO,
     MEMORIA TECNICA, MODIFICACION DE PROYECTO, REDACCION PROYECTO, SATE + ASCENSOR CON CESION DE
     CAES, SATE CON CESION DE CAES, SOLICITUD DE FINANCIACION, TOMA DE DATOS Y MODELADO 3D,
     TRAMITACION 3 PRESUPUESTOS, TRAMITACION LICENCIAS, TRAMITACION SUBVENCIONES. Si no encaja
     ninguno, null y explícalo en `nota`.
     Reglas: subvención de accesibilidad o de eficiencia = TRAMITACION SUBVENCIONES; "Libro del
     Edificio + IEE" con precio = LEE; informe técnico/pericial = INFORME PERICIAL; proyecto de
     ascensor, SATE, rampa... = REDACCION PROYECTO (el qué va en `texto`).
   - `importe`: importe FIJO sin IVA de esa línea, o null.
   - `porcentaje`: % a éxito (p. ej. 3.5 del importe concedido), o null. Una línea puede llevar
     fijo Y porcentaje a la vez (subvención: 1.980 + 3,5 %).
   - `incluido`: true si la hoja la incluye sin precio propio (va dentro de otro importe, o "solo si
     es necesario" sin precio). Estas líneas TAMBIÉN se apuntan: es trabajo comprometido.
     Si un precio conjunto cubre varias cosas ("Proyecto 4.880: incluye proyecto, licencia, DF"),
     la línea con precio es la principal y las demás van `incluido: true`.
   - `plazos`: cuándo se cobra ESA línea (vacío si está incluida). Cada plazo:
     `hito` uno de: firma, encargo, entrega, licencia, cfo, concesion, otro;
     `porcentaje` (% de la línea) y/o `importe`; `texto` literal del trozo de forma de pago.
     Equivalencias: "a la contratación / al encargo / provisión de fondos" = encargo; "a la firma
     de la hoja" = firma; "a la entrega del proyecto" = entrega; "a la concesión de licencia" =
     licencia; "fin de obra / CFO" = cfo; "a la concesión de la subvención / a éxito" = concesion;
     cualquier otro ("a la firma del acta del plan de seguridad", "al comienzo de obra") = otro.
     El % a éxito de la línea va como plazo `concesion` sin porcentaje de línea (el % ya está en la
     línea). Los plazos de una línea deben sumar 100 % de su fijo.
     Si la forma de pago es general ("50 % a la contratación, 50 % a la entrega") aplícala a cada
     línea a la que se refiera (normalmente las de honorarios de arquitectura, no la subvención).
8. `abonado`: si la hoja dice importes ya abonados/pendientes, cópialo literal; si no, null.
9. `nota`: cualquier cosa rara (tachados, manuscritos, dos hojas en un PDF, total que no cuadra con
   la suma, línea dudosa). Si todo es normal, null.
10. `seguro`: true si lo has leído todo sin dudas; false si algo no se lee o no está claro (y
    explica qué en `nota`).

## Reglas de Mónica (8-oct-2026, tras la prueba de 10)
- **Estamos LEYENDO para INTERPRETAR**, no para copiar a ciegas: si algo se entiende de verdad,
  ponlo interpretado (y lo literal en `texto`/`nota`).
- **Empresas (FAIN, Schindler, Thyssen…)**: "nadie firma necesariamente; hay sellos, códigos…":
  si la acepta una EMPRESA con sello, códigos de pedido o casilla Conforme rellena (aunque sea a
  máquina y sin firma manuscrita), cuenta como FIRMADA: `firma_presente: true`,
  `pagador_tipo: "empresa"`, la empresa en `razon_social` (aunque solo se vea en el sello) y en
  `nota` cómo aceptó ("sello FAIN fuera de la casilla", "códigos de pedido 95003878…").
  Copia los códigos de pedido en `nota`. Para una COMUNIDAD sigue valiendo: sin firma, no firmada.
- **FIRMA DIGITAL: NO SE VE EN LAS IMÁGENES.** Antes de dar una hoja por "sin firma", mira
  `C:\Users\mfavi\ACCESALIA\hojas_encargo_drive\tmp_revision\firmas_digitales.json` (clave
  `<numero_hoja>-<k>`): si firma alguien que no es DE SOTO MARTIN CARO DANIEL, está firmada
  (`firma_presente: true`, y en `nota` "firma digital de X"). "(R: H79191615)" es el CIF de quien
  representa el firmante: úsalo como `cif` si la casilla no lo trae (y dilo en `nota`).
- **Sin total general**: `total_base` = la SUMA de los importes fijos de las líneas (no los %), y
  en `nota` "total sumado".
- **Otro documento firmado dentro del PDF** (presupuesto, adenda, condiciones): NO va como líneas
  de esta hoja; descríbelo en `nota` empezando por "OTRO DOCUMENTO FIRMADO:" (qué es, número,
  fecha, importes y qué regala o cambia).

Salida: UNA línea JSON por hoja, añadida al fichero que diga el lote (escribe tras cada hoja):
{"numero_hoja":"HE-2026-0781","fecha_emision":"2026-01-30","fecha_casilla":null,"firma_presente":true,
 "pagador_tipo":"comunidad","razon_social":"CP MARQUES DE CORBERA 24B","cif":"H79235271",
 "iban":"ES89 0182 9038 3502 0157 1619","direccion":"AV MARQUES DE CORBERA 24B MADRID",
 "total_base":16140,"forma_pago_texto":"...","abonado":"Abonados 5.450 + IVA; pendiente 10.690 + IVA",
 "lineas":[{"texto":"Proyecto Ascensor","bloque":"REDACCION PROYECTO","importe":6940,"porcentaje":null,
   "incluido":false,"plazos":[{"hito":"encargo","porcentaje":50,"importe":null,"texto":"A la contratación..."},
   {"hito":"entrega","porcentaje":50,"importe":null,"texto":"A la entrega del Proyecto: 50% restante"}]},
   {"texto":"DIRECCIÓN FACULTATIVA","bloque":"DF","importe":null,"porcentaje":null,"incluido":true,"plazos":[]}],
 "nota":null,"seguro":true}
