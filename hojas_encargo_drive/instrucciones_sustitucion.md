# ¿La hoja antigua quedó SUSTITUIDA por las posteriores?

Accesalia (arquitectura, Madrid) manda hojas de encargo. Cada grupo trae una hoja ANTIGUA, enviada y
NO firmada, y las hojas POSTERIORES de la misma dirección. Hay que decidir si la antigua quedó
SUSTITUIDA (el mismo encargo se volvió a ofertar: corregido, renovado, partido en proyecto +
subvención con el formato actual, reofertado a la mancomunidad entera...) o si es un ENCARGO
DISTINTO que sigue vivo (otra obra, otro servicio: p. ej. un SATE y luego un ascensor; un proyecto y
luego, aparte, su subvención; una CSS de otra obra).

Ejemplo real confirmado por Mónica: en enero se mandó "PRY ASC+SUBV" (todo junto); en septiembre
pidieron las hojas renovadas y se mandaron "PROYECTO ASCENSOR" y "SUBVENCIONES ACCESIBILIDAD" por
separado (formato actual) → la de enero queda SUSTITUIDA por las dos.

Léelas (ToolSearch "select:mcp__claude_ai_Google_Drive__read_file_content,mcp__claude_ai_Google_Drive__search_files";
read_file_content(fileId=id); si no hay id, busca por título). Compara objeto, servicios, importes.
Una antigua puede quedar sustituida solo por ALGUNAS de las posteriores: di cuáles.

Salida, una línea JSON por grupo:
{"g":"SU04","decision":"sustituida" | "distinta" | "no se sabe",
 "por":["<titulo de cada posterior que la sustituye>"],   // solo si sustituida
 "motivo":"<una frase>"}
Solo lees.
