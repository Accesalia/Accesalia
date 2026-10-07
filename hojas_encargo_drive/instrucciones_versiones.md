# ¿Son versiones de la misma hoja, o hojas distintas?

Contexto: Accesalia (estudio de arquitectura, Madrid) manda hojas de encargo (presupuestos) a
comunidades. Cada grupo del lote son 2 o más hojas ENVIADAS de la MISMA dirección y concepto
parecido, con fechas distintas. Hay que decidir si la posterior SUSTITUYE a la anterior (es una
nueva versión del mismo encargo: se reenvió corregida, con otro precio, otras condiciones...) o si
son ENCARGOS DISTINTOS que conviven (p. ej. una hoja de proyecto y otra de subvención; o un IEE y
luego un proyecto; o una renovación de subvenciones de otro año; o portales/obras distintas).

Cómo leerlas: cada hoja trae "id" (Google Doc). Carga ToolSearch
"select:mcp__claude_ai_Google_Drive__read_file_content,mcp__claude_ai_Google_Drive__search_files"
y léelas con read_file_content(fileId=id). Si el id viene vacío, búscala por título
(title contains '<calle y número>'). Compara: objeto del encargo ("Proyecto para ..."), conceptos e
importes, forma de pago, fecha "En Madrid, a ...", y cualquier marca (REV, "modificado", "sustituye").

Criterio:
- MISMO encargo (mismo objeto y mismos servicios, cambia precio/condiciones/redacción) → versiones:
  la de fecha posterior sustituye a la anterior.
- Objeto o servicios DISTINTOS → hojas distintas (las dos cuentan).
- Si dudas de verdad, "no se sabe" y explica por qué en una frase.
- Si una está firmada ("firmada": true), dilo en el motivo si cambia algo (p. ej. se firmó la v1
  y luego se envió otra).

Salida: una línea JSON por grupo:
{"g":"PV03","decision":"versiones" | "distintas" | "mixto" | "no se sabe",
 "orden":["<titulo v1>","<titulo v2>", ...],          // solo si versiones (o las que lo sean si mixto)
 "motivo":"<una frase con lo que cambia o por qué son distintas>"}
En "mixto" (3+ hojas donde unas son versiones y otras no) pon en "orden" solo la cadena de versiones
y en el motivo cuáles quedan aparte.

Solo lees: no escribas en Drive ni en la base.
