-- EL MODELO QUE DISEÑO MONICA EL 1-OCT-2026.
--
-- Tres tablas y nada mas. Sus palabras: "tengo en realidad dos tablas, opp y
-- accesos, y esas dos se relacionan por la intermedia. Pero APARTE y NO EN LA
-- MISMA LINEA CONCEPTUAL estan las comunidades."
--
--     opp  ──  opp_accesos  ──  accesos
--                                  │
--                             (otra linea: quien lo gobierna)
--
-- El acceso es el centro. La oportunidad le llega por arriba. Quien manda en el
-- portal es OTRO HECHO sobre el mismo acceso, no el siguiente eslabon. Yo los
-- encadene y por eso no le cuadraba.
--
-- Lo que NO esta validado y por tanto no se construye encima: comunidades,
-- mancomunidades y subcomunidades. Se decidira cuando toque facturacion,
-- licencia y subvenciones, que es donde hace falta la figura legal que hace de
-- paraguas de la opp. Y ese paraguas NO es una propiedad del edificio: es del
-- encargo, porque el mismo edificio puede contratar un año como mancomunidad y
-- el siguiente como una sola comunidad.

-- ---------------------------------------------------------------------------
-- 1. ACCESOS: la capa invariable
-- ---------------------------------------------------------------------------
--
-- "existe con o sin mi" (Monica). Es la figura legal y catastral, no nuestra
-- opinion, y por eso no lleva comunidad_id ni opp: un portal existe aunque no
-- sea cliente nuestro.

create table if not exists accesos (
  id             uuid primary key default gen_random_uuid(),
  creado_en      timestamptz not null default now(),
  municipio      text not null,
  tipo_via       text not null,                 -- la sigla: CL, AV, PZ, CM
  nombre_via     text not null,
  numero         text not null,
  escalera       text not null default '',
  ref_catastral  text,
  constraint accesos_clave unique (municipio, tipo_via, nombre_via, numero, escalera)
);

comment on table accesos is
$doc$UN ACCESO ES UN PORTAL: una escalera con su puerta a la calle. Capa
invariable del modelo.

LA CLAVE ES LA DIRECCION, NUNCA LA REFERENCIA CATASTRAL. Motivo: una referencia
nombra SUELO, no puertas, y se comparte. Etruria 26, Etruria 28 y Lucano 65 son
tres portales con la MISMA referencia 8465201VK4786E: un solar en esquina. Si la
clave fuera la referencia, los tres se fundirian en uno (y paso: Etruria tenia
UNA fila en vez de tres).

Al contrario, Ganapanes 31, 33 y 35 son tres referencias distintas para tres
portales de la misma comunidad. Las dos cosas a la vez, y por eso la referencia
es un ATRIBUTO del acceso -donde cae- y no su identidad.

EL MUNICIPIO ES PARTE DE LA CLAVE: LEPANTO 9 existe en Madrid y en San Lorenzo
del Escorial, y son dos portales distintos.

LA ESCALERA VA VACIA, NO NULA, cuando el numero ya identifica el portal: en SQL
dos nulos nunca son iguales y el candado unico se saltaria solo. Coste conocido:
la cadena vacia significa "no tiene escalera" y no distingue "no la sabemos".
Hoy no estorba porque todas vienen de lo que Catastro declara.

EL NUMERO LLEVA EL PARENTESIS DE CATASTRO cuando lo tiene: 36(B), 31(C), 8(B),
20(B), 1(D). Es como el distingue el BIS y el DUPLICADO, y en Marques de Corbera
es lo UNICO que separa dos parcelas que ambas llaman "36". Criterio de Monica:
"yo lo dejaria como en catastro, porque aqui son datos subterraneos".

LAS LETRAS DE ESCALERA DE CATASTRO SIGNIFICAN ALGO, descubierto con la ficha de
Valdemorillo 1 (titulada "escalera derecha", 12 de 30 viviendas, y C=12 D=12 I=6):
  D = derecha    I = izquierda    C = centro
  T = trastero   G = garaje       L = local      S = sotano
Las de 0 viviendas no son portales... SALVO que el encargo sea precisamente eso:
Longares 8(B) es un garaje con humedades y es un acceso legitimo.$doc$;

create index if not exists accesos_ref_idx on accesos (ref_catastral);
create index if not exists accesos_direccion_idx on accesos (municipio, nombre_via, numero);

-- ---------------------------------------------------------------------------
-- 2. OPORTUNIDADES: id y nombre
-- ---------------------------------------------------------------------------
--
-- Fuera comunidad_provisional: sobra. "La opp tiene un id y un nombre comodin.
-- Es sobrecomplicar algo sencillo." (Monica, 1-oct-2026). Se deja la columna por
-- ahora para no romper nada, pero no se usa.

alter table oportunidades add column if not exists nombre text;

comment on column oportunidades.nombre is
$doc$El nombre de la oportunidad. Nace de la lista que curo Monica a mano en
julio de 2026, 26 dias de trabajo.

NO ES DETERMINANTE y cambia con el tiempo: el comercial escribe lo que sea
-"gamapans 31 al 37", "camino gamapanes", "mancomunidad ganapanes"- y da igual,
porque lo que identifica la oportunidad es el ID y los accesos cuelgan de ahi.
Lo de Alfonso XII lo demostro: Javier Parra de Schindler dio mal la direccion por
telefono, se emitieron hojas de encargo con ella, y al corregirla no paso nada
porque todo iba por id.

La precision NO se le pide al comercial en el alta: "no les pido precision, solo
PISTAS, y la precision la damos por debajo". El punto de bloqueo es la HOJA DE
ENCARGO: ahi no se emite nada sin direccion resuelta contra Catastro, porque es
el documento que viaja a firma, a subvencion y a contrato.$doc$;

-- ---------------------------------------------------------------------------
-- 3. OPP_ACCESOS: que portales toca cada oportunidad
-- ---------------------------------------------------------------------------

create table if not exists opp_accesos (
  opp_id     uuid not null references oportunidades(id) on delete cascade,
  acceso_id  uuid not null references accesos(id) on delete cascade,
  creado_en  timestamptz not null default now(),
  hasta      date,
  de_donde   text,
  primary key (opp_id, acceso_id)
);

comment on table opp_accesos is
$doc$QUE PORTALES toca cada oportunidad. Es la tabla que faltaba.

Por que una tabla y no una columna, con las dos razones de Monica:
  * una opp puede cubrir 1 de los 14 accesos de una direccion sin afirmar nada
    de los otros 13 ("nos contratan para la escalera C pero no para la A y B");
  * y el MISMO acceso puede tener varias opps: "el mismo acceso puede tener dos
    opps distintas en dos cosas diferentes". Un ascensor hoy y una rampa en tres
    años son dos filas. Una columna solo guardaria la ultima.

La opp se engancha al nivel MAS GRANULAR y todo lo de arriba se deduce: las
comunidades de una opp son las comunidades de sus accesos. Asi la agrupacion es
siempre agregativa y NUNCA SE FUERZA.

EL ENLACE NO SE PUEDE DEDUCIR DE LA REFERENCIA, y casi metimos la pata: la
parcela de Santa Cruz de Marcenado tiene 20 portales y la opp es "1 ESC C", uno
solo. Enlazar por referencia le habria colgado los 20.$doc$;

comment on column opp_accesos.hasta is
$doc$Cuando el acceso SALIO de la oportunidad. Nulo = sigue dentro. La fila no se
borra: que un portal se cayera es informacion comercial.

Primer caso real, Viñagrande 21. Ficha: "no se hace". Correo de Aranzazu del
22-dic-2023: "el portal 21 causa baja en la solicitud de las ayudas, con lo cual
quedarian: Viñagrande 1, 3, 5, 7, 9, 13, 17 y 29, Castillos 32. Total 9".$doc$;

comment on column opp_accesos.de_donde is
$doc$Por que se vinculo, con la fuente. Monica pregunto expresamente por la traza.

LA FUENTE PRIMARIA ES LA FICHA DE DATOS DE DROPBOX, un Word por carpeta de
proyecto (unas 300). Dice CUANTOS portales casi siempre, y CUAL casi nunca:
  * cuando el portal esta en el nombre:  "portal G", "59 (D) Es:2", "BLOQUE 3",
    "escalera derecha", "PORTAL 1, 2"
  * cuando la obra es el edificio entero: "9 ASC + 9 SATES", "6 escaleras de 20"

EL TIPO DE OBRA DETERMINA EL GRANO, y es la palanca que de verdad cierra casos:
    SATE · fachada · cubierta · saneamiento  ->  el EDIFICIO, todos los portales
    ASCENSOR                                 ->  por escalera, uno cada uno
    RAMPA · bajada a cota cero               ->  por entrada
No es heuristica sobre el nombre: es lo que fisicamente abarca la obra. Un
aislamiento no se para en el rellano y un ascensor no sirve a dos escaleras.
El tipo ya esta en la base: proyecto_tipos, 636 filas sobre 609 proyectos.

SEGUNDA FUENTE, GRATIS: los nombres de carpeta y de los ficheros 3D nombran el
portal, porque el tecnico tuvo que ir a medirlo.
    avreconquista6portalG   ·   Julian Besteiro 15 D.glb   ·   Genil 5 A.glb
    abrevadero2portal2 / portal4 / portal6 / ...  (una carpeta POR ACCESO)

Y LO QUE NO FUNCIONA, comprobado el 1-oct-2026: barrer la letra final del nombre.
De 8 candidatos, 4 eran falsos positivos. La letra es tres cosas distintas y solo
el documento las separa:
    5D    -> escalera D
    59B   -> el final de "59BIS", y la escalera B tiene 0 viviendas
    1 Y 6 -> la conjuncion "y": son dos numeros
Aplicado a ciegas habria colgado Martin de los Heros del portal de 0 viviendas
en vez del de 33.$doc$;

create index if not exists opp_accesos_acceso_idx on opp_accesos (acceso_id);

-- ---------------------------------------------------------------------------
-- 4. accesos_comunidad: NO VALIDADA
-- ---------------------------------------------------------------------------
--
-- La tabla del 1-oct por la mañana (migracion 20261001000000). Monica la paro:
-- "es una tabla NO VALIDADA: no se queda, no se rellena, no existe hasta que yo
-- diga que si o que no". Sigue en produccion con sus 1.244 filas porque de ahi
-- salio el cotejo (referencia, direccion oficial, coordenadas) y tirarla antes
-- de decidir perderia la traza. No se construye NADA encima de ella.

comment on table accesos_comunidad is
$doc$*** NO VALIDADA POR MONICA (1-oct-2026). NO CONSTRUIR ENCIMA. ***

Se creo esta mañana y se paro la misma tarde. Su candado unique (comunidad_id,
referencia) decia "un acceso por parcela y comunidad", que es falso: por eso
Etruria tenia 1 fila en vez de 3 y Nectar 31 estaba metido como CINCO
comunidades distintas.

El modelo bueno son accesos + opp_accesos. Esta tabla se conserva de momento
solo porque guarda la traza del cotejo de Catastro de las 1.228 direcciones.
Decision pendiente: tirarla o congelarla.$doc$;
