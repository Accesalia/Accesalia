# Decidir qué hoja(s) enviada(s) corresponden a una hoja FIRMADA

Contexto: Accesalia (arquitectura, Madrid) manda hojas de encargo a comunidades; vuelven
firmadas. Tenemos la firmada (PDF, a menudo escaneado) y varias enviadas candidatas de la
misma dirección. Hay que decidir cuál(es) firmaron.

Rutas:
- Firmadas: `G:\Mi unidad\MONICA ACCESALIA\PRESUPUESTOS\` + la ruta que da el lote.
- Candidatas: `G:\Mi unidad\MONICA ACCESALIA\PRESUPUESTOS\` + su ruta. Las `.docx` se leen con
  python-docx; las `.pdf` con `pdftotext -layout`; las `.gdoc` NO se leen del disco: búscalas en
  Google Drive (ToolSearch "select:mcp__claude_ai_Google_Drive__search_files,mcp__claude_ai_Google_Drive__read_file_content";
  query `title contains '<calle y número>'`, primero con `parentId = '16F3hl2VlRgXzrmd_wL3IAmzPAawuZZ1I'`;
  en Drive la fecha del título va con barras "26/05/2026").

Cómo leer la firmada:
1. Prueba `pdftotext -layout`. Si trae texto, úsalo.
2. Si no (escaneo), saca la imagen de cada página con Python (pypdf: `page.images`, la más
   grande de cada página; Pillow para reducir a ~900x1270 y guardar PNG en
   `C:\Users\mfavi\ACCESALIA\hojas_encargo_drive\rev2\`) y MÍRALAS con la herramienta Read
   (lee imágenes). Busca: la fecha de emisión ("En Madrid, a ..."), los conceptos e importes
   (bloque "Honorarios"), a quién va, y si hay tachados o cosas escritas a mano.
   Basta con las páginas de honorarios y firma (suelen ser las últimas).

Cómo decidir:
- La buena es la candidata con la MISMA fecha de emisión y los MISMOS importes que la firmada.
- Una firmada puede corresponder a VARIAS enviadas (p. ej. "PRY Y SUBV": la hoja de proyecto y
  la de subvención, firmadas en un mismo PDF). Elige todas las que estén dentro.
- "Renovación" de subvenciones ≠ primera subvención: si la firmada dice RENOV, es la de renovación.
- Ojo con el municipio: misma calle y número en otro municipio NO vale.
- Si ninguna candidata coincide pero la firmada trae los datos legibles, la respuesta es
  "datos de la firmada" y extraes tú los datos (fecha, conceptos con importe base sin IVA,
  % a éxito, a quién va).
- Si la firmada NO es una hoja de encargo (orden de compra, códigos de pedido, contrato,
  factura...), dilo.
- Si es ilegible o de verdad no se puede saber, dilo con el motivo concreto.

Salida: una línea JSON por firmada, en el fichero que te indique el lote:
{"d":"D07","elegidas":["<ruta exacta de la candidata>", ...],
 "decision":"pareja" | "datos de la firmada" | "no es hoja" | "no se puede",
 "fecha_emision_firmada":"AAAA-MM-DD"|null,
 "importes_firmada":"<resumen corto: concepto importe; ...>"|null,
 "a_quien":"comunidad" | "contrata: <nombre>" | null,
 "motivo":"<una frase: por qué>"}
