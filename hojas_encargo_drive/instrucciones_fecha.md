# Leer la FECHA (y poco más) de una hoja de encargo firmada

Cada entrada del lote es una hoja de encargo de Accesalia, firmada por el cliente, cuyo nombre de
fichero no lleva fecha. Ruta completa: `G:\Mi unidad\MONICA ACCESALIA\PRESUPUESTOS\` + "firmada".

Cómo verla:
- PDF: renderiza las páginas con pypdfium2 (`import pypdfium2 as pdfium; pdf = pdfium.PdfDocument(ruta);
  img = pdf[i].render(scale=1.3).to_pil()`), reduce a ~900x1270, guarda PNG en
  `C:\Users\mfavi\ACCESALIA\hojas_encargo_drive\rev2\` con prefijo `SF_` y MÍRALAS con la herramienta Read.
  Basta con la página donde va "En Madrid, a ..." y la firma (suele ser la última o la penúltima);
  empieza por ahí.
- .docx/.doc: lee el texto con python-docx. .jpg/.jpeg: míralo con Read. .gdoc: búscalo por título en
  Google Drive (ToolSearch "select:mcp__claude_ai_Google_Drive__search_files,mcp__claude_ai_Google_Drive__read_file_content").

Saca, por cada firmada, UNA línea JSON:
{"s":"SF012",
 "fecha_emision":"AAAA-MM-DD"|null,      // "En Madrid, a ..." de la hoja
 "fecha_firma":"AAAA-MM-DD"|null,        // la escrita a mano en la tabla "Fecha firma", si la hay
 "direccion":"calle número municipio"|null,
 "concepto":"<qué se encarga, pocas palabras: proyecto ascensor, subvención, CSS, SATE...>"|null,
 "total":"<importe principal tal cual, p.ej. '5.500 + IVA' o '3,5% a éxito'>"|null,
 "es_hoja": true|false,                  // false si es un correo, pedido, contrato, factura...
 "nota":"<una frase si algo es raro: ilegible, tachado, sin fecha...>"|null}

No inventes: si no se lee, null y dilo en nota. Solo lees: no escribas en Drive ni en la base.
