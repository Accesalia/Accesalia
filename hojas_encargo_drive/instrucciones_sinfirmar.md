# Hojas enviadas SIN firmar: leer y extraer

Tu lote es una lista de {"n","titulo","fecha","id","ruta"}: hojas de encargo de Accesalia (Google
Docs) que se enviaron y no se firmaron.

1. Carga ToolSearch "select:mcp__claude_ai_Google_Drive__read_file_content,mcp__claude_ai_Google_Drive__search_files".
2. Para cada una: si trae "id", léela con read_file_content(fileId=id). Si "id" es null, búscala por
   título (title contains '<calle y número>'; en Drive la fecha va con barras) y elige la de título exacto.
3. Guarda el texto devuelto, tal cual, en `textos2026u\<n>.txt` con la primera línea
   `#DRIVE_ID=<id>\t#TITULO=<título en Drive>` (escríbelo con Python: json.loads de una cadena JSON).
4. Lee entero `instrucciones_extraccion.md` (una vez) y saca de cada texto su objeto JSON con
   "n" = <n>. Mismo formato, mismas reglas (importe = base sin IVA; % a éxito; incluido; catálogo).
5. Escribe todos los objetos (JSON Lines, UTF-8) en el fichero de salida que te diga tu lote, y
   comprueba con json.loads que hay tantas líneas como hojas.
Si alguna no se encuentra, saca el objeto con todo null y rarezas "no encontrada". Solo lees.
