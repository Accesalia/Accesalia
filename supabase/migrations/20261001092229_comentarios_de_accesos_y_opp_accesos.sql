-- YA APLICADA el 1-oct-2026 por el MCP, con el nombre
-- `opps_accesos_y_su_enlace` -el mismo que el fichero 20261001120000, que es
-- el que CREA las tablas-. Recuperada del registro el 3-oct y renombrada para
-- que se distingan: esta solo pone los comentarios. NO volver a ejecutar.
--
-- OJO AL LEERLA HOY: nombra `opp_accesos` (renombrada el 3-oct a
-- `relacion_oportunidad_accesos`) y `accesos_comunidad` (que el 3-oct se
-- movio al esquema `historico_de_tablas`).

comment on table accesos is
$doc$UN ACCESO ES UN PORTAL: una escalera con su puerta a la calle. Capa invariable del modelo. "Existe con o sin mi" (Monica): es la figura legal y catastral, no nuestra opinion, y por eso no lleva comunidad_id ni opp.

LA CLAVE ES LA DIRECCION, NUNCA LA REFERENCIA CATASTRAL. Una referencia nombra SUELO, no puertas, y se comparte: Etruria 26, Etruria 28 y Lucano 65 son tres portales con la MISMA referencia 8465201VK4786E (un solar en esquina). Con la referencia como clave, los tres se fundian en uno, y paso. Al contrario, Ganapanes 31, 33 y 35 son tres referencias para tres portales de la misma comunidad. Las dos cosas a la vez: la referencia es un ATRIBUTO del acceso, no su identidad.

EL MUNICIPIO ES PARTE DE LA CLAVE: LEPANTO 9 existe en Madrid y en San Lorenzo del Escorial.

LA ESCALERA VA VACIA, NO NULA: en SQL dos nulos nunca son iguales y el candado unico se saltaria solo.

EL NUMERO LLEVA EL PARENTESIS DE CATASTRO: 36(B), 31(C), 8(B), 20(B), 1(D). Asi distingue el BIS y el DUPLICADO, y en Marques de Corbera es lo UNICO que separa dos parcelas que ambas llaman 36.

LAS LETRAS DE ESCALERA SIGNIFICAN ALGO (ficha de Valdemorillo 1, "escalera derecha", 12 de 30 viviendas, C=12 D=12 I=6):
  D = derecha   I = izquierda   C = centro
  T = trastero  G = garaje      L = local      S = sotano
Las de 0 viviendas no son portales, SALVO que el encargo sea eso: Longares 8(B) es un garaje con humedades y es un acceso legitimo.$doc$;

comment on table opp_accesos is
$doc$QUE PORTALES toca cada oportunidad. La tabla que faltaba.

Por que tabla y no columna: una opp puede cubrir 1 de los 14 accesos de una direccion sin afirmar nada de los otros 13; y el MISMO acceso puede tener varias opps (un ascensor hoy, una rampa en tres años). Una columna solo guardaria la ultima.

La opp se engancha al nivel MAS GRANULAR y todo lo de arriba se deduce. La agrupacion es siempre agregativa y nunca se fuerza.

EL ENLACE NO SE DEDUCE DE LA REFERENCIA: la parcela de Santa Cruz de Marcenado tiene 20 portales y la opp es "1 ESC C", uno solo.$doc$;

comment on column opp_accesos.de_donde is
$doc$Por que se vinculo, con la fuente.

FUENTE PRIMARIA: la FICHA DE DATOS de Dropbox, un Word por carpeta de proyecto (unas 300). Dice CUANTOS portales casi siempre y CUAL casi nunca: solo cuando el portal esta en el nombre ("portal G", "59 (D) Es:2", "BLOQUE 3", "escalera derecha") o la obra es el edificio entero ("9 ASC + 9 SATES", "6 escaleras de 20").

EL TIPO DE OBRA DETERMINA EL GRANO:
  SATE / fachada / cubierta / saneamiento -> el EDIFICIO, todos los portales
  ASCENSOR                                -> por escalera
  RAMPA / bajada a cota cero              -> por entrada
No es heuristica: es lo que fisicamente abarca la obra. Ya esta en la base, en proyecto_tipos (636 filas sobre 609 proyectos).

SEGUNDA FUENTE, GRATIS: los nombres de carpeta y de los 3D nombran el portal, porque el tecnico fue a medirlo: avreconquista6portalG, "Julian Besteiro 15 D.glb", abrevadero2portal2/portal4/portal6.

LO QUE NO FUNCIONA (comprobado 1-oct-2026): barrer la letra final del nombre. 4 falsos positivos de 8. La letra es escalera (5D), final de BIS (59B) o la conjuncion "y" (1 Y 6).$doc$;

comment on column opp_accesos.hasta is
$doc$Cuando el acceso SALIO de la oportunidad. Nulo = sigue dentro. La fila no se borra: que un portal se cayera es informacion comercial. Primer caso real, Viñagrande 21: correo de Aranzazu del 22-dic-2023, "el portal 21 causa baja en la solicitud de las ayudas, con lo cual quedarian 9 portales".$doc$;

comment on column oportunidades.nombre is
$doc$El nombre de la oportunidad. Nace de la lista que curo Monica a mano en julio de 2026, 26 dias de trabajo.

NO ES DETERMINANTE: lo que identifica la opp es el ID y los accesos cuelgan de ahi. Alfonso XII lo demostro: Javier Parra de Schindler dio mal la direccion por telefono, se emitieron hojas de encargo con ella, y al corregirla no paso nada.

Al comercial no se le pide precision en el alta, solo PISTAS. El punto de bloqueo es la HOJA DE ENCARGO: sin direccion resuelta contra Catastro no se emite, porque es el documento que viaja a firma, subvencion y contrato.$doc$;

comment on table accesos_comunidad is
$doc$*** NO VALIDADA POR MONICA (1-oct-2026). NO CONSTRUIR ENCIMA. ***

Su candado unique (comunidad_id, referencia) decia "un acceso por parcela y comunidad", que es falso: por eso Etruria tenia 1 fila en vez de 3 y Nectar 31 estaba metido como CINCO comunidades. El modelo bueno son accesos + opp_accesos. Se conserva solo porque guarda la traza del cotejo de Catastro de las 1.228 direcciones. Decision pendiente: tirarla o congelarla.$doc$;
