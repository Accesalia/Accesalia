-- ============================================================================
-- CATASTRO Y URBANISMO (Monica, 29-sep-2026)
--
-- REGISTRO DE LO APLICADO HOY. Los cambios se fueron haciendo a lo largo del dia
-- -unos por el conector de Supabase y el ultimo a mano en el editor SQL, porque
-- el conector dejo de funcionar-, asi que este fichero NO es un historico de
-- cada paso: es el ESTADO FINAL, escrito de una vez y con `if not exists` para
-- que se pueda aplicar sobre una base que ya los tenga.
--
-- Se escribe porque el repositorio tiene que ser la fuente de verdad: sin esto,
-- la base y el repositorio se separan y nadie sabe cual manda. Ya paso una vez.
--
-- QUE HACE POSIBLE TODO ESTO: Catastro y el geoportal del Ayuntamiento de Madrid
-- publican gratis y sin certificado el año, las viviendas, las superficies, los
-- coeficientes, el croquis, si el edificio esta protegido, si hay modelo de
-- ascensor obligatorio y si cae en zona de maxima subvencion. Detalle completo y
-- trampas en docs/catastro-y-urbanismo-madrid.md
--
-- POR QUE IMPORTA (Monica): para subvenciones y visado la direccion del proyecto
-- tiene que cuadrar con la de Catastro; cuando no cuadra hay que justificarlo
-- "con cincuenta papeles". Cuadrandola desde el minuto 1, todo sale oficial.
-- ============================================================================

-- ---------------------------------------------------------------- LA PARCELA
--
-- Cuelga de la REFERENCIA CATASTRAL, no de la comunidad: en los propios datos hay
-- fincas compartidas -Presidente Carmona 3 y 5 tienen la misma referencia, y lo
-- mismo Calderon de la Barca 6 y 8-. Una finca, varias comunidades.
--
-- Tabla APARTE de `comunidades` a proposito: esa lista son 26 dias de trabajo a
-- mano de Monica y no se mezcla con datos de fuera. `direccion` aqui es la
-- OFICIAL de Catastro; `comunidades.nombre` es como se dice. Las dos son verdad.
create table if not exists ficha_catastro (
  id                 uuid primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  referencia         text not null,
  direccion          text,
  municipio          text,
  provincia          text,
  cp                 text,
  anio               integer,
  inmuebles          integer,
  viviendas          integer,
  superficie         integer,
  plantas            text[],
  usos               jsonb,
  tipo_parcela       text,
  tipo_via           text,
  nombre_via         text,
  numero             text,
  numero2            text,
  codigo_via         text,
  distrito_municipal text,
  ine_provincia      text,
  ine_municipio      text,
  superficie_suelo   integer,
  lat                double precision,
  lng                double precision,
  utm_x              double precision,
  utm_y              double precision,
  utm_srs            text default 'EPSG:25830',
  croquis_ruta       text,
  croquis_en         timestamptz,
  -- LO CRUDO ENTERO. De aqui se recompone el informe sin volver a preguntar
  -- nada: el dia que cambie una regla -el año del aislamiento, el umbral del 70%
  -- residencial- las fichas guardadas se rehacen solas.
  bruto              jsonb,
  consultado_en      timestamptz not null default now(),
  -- ¿HAY ASCENSOR? Es LA pregunta del negocio y no la dice ningun dato. Se ve en
  -- la ortofoto, por el caseton de la azotea. Por eso se guarda con quien y
  -- cuando: es una observacion humana, no un dato de un organismo.
  tiene_ascensor     boolean,
  ascensor_visto_por uuid references equipo(id) on delete set null,
  ascensor_visto_en  timestamptz,
  constraint ficha_catastro_referencia_unica unique (referencia)
);

create index if not exists ficha_catastro_referencia_idx on ficha_catastro (referencia);

comment on table ficha_catastro is
  'Lo que dice Catastro de una finca. Tabla aparte: comunidades es la lista curada a mano y no se mezcla con datos de fuera.';
comment on column ficha_catastro.referencia is
  'Los 14 primeros de la referencia catastral: identifica LA PARCELA. Es la clave de union con comunidades.referencia_catastral, y puede servir a varias comunidades (portales distintos de un mismo edificio).';
comment on column ficha_catastro.direccion is
  'La direccion LITERAL Y OFICIAL de la finca, con el rango de portales. NO sustituye a comunidades.nombre.';
comment on column ficha_catastro.utm_x is 'UTM huso 30N ETRS89. Las piden en los CAES, y es el sistema en el que trabaja el geoportal de Madrid.';
comment on column ficha_catastro.tiene_ascensor is
  'true / false / null. NULL es "nadie lo ha mirado todavia", que no es lo mismo que "no tiene".';

-- --------------------------------------------------- EL PORTAL / LA ESCALERA
--
-- La referencia de 14 identifica la PARCELA, no el portal: 0985203VK4708F tiene
-- 89 inmuebles entre el 3 (38) y el 5 (51), con escaleras A, B, C y D. Esta es
-- LA UNIDAD DE TRABAJO de Accesalia: "nunca intervenimos en pisos, como mucho
-- por escaleras; para nosotros una escalera es una unidad, no 22 viviendas". Y
-- es tambien la unidad de proteccion: puede estar protegida UNA escalera.
create table if not exists ficha_catastro_portal (
  id          uuid primary key default gen_random_uuid(),
  creado_en   timestamptz not null default now(),
  ficha_id    uuid not null references ficha_catastro(id) on delete cascade,
  tipo_via    text,
  nombre_via  text,
  numero      text not null,
  escalera    text,
  inmuebles   integer not null default 0,
  viviendas   integer not null default 0,
  superficie  integer,
  plantas     text[],
  usos        jsonb,
  constraint ficha_portal_unico unique (ficha_id, numero, escalera)
);
create index if not exists ficha_portal_ficha_idx on ficha_catastro_portal (ficha_id);

comment on table ficha_catastro_portal is
  'El reparto de la parcela por portal y escalera. LA UNIDAD DE TRABAJO: nunca se interviene por plantas ni por puertas.';

-- ------------------------------------------------------------- CADA INMUEBLE
--
-- Solo por el coeficiente de participacion y el uso, que hacen falta en
-- subvenciones -piden que un % del uso sea residencial-. Que este guardado no
-- significa que se vea: en pantalla la unidad sigue siendo la escalera.
create table if not exists ficha_catastro_inmueble (
  id          uuid primary key default gen_random_uuid(),
  creado_en   timestamptz not null default now(),
  ficha_id    uuid not null references ficha_catastro(id) on delete cascade,
  portal_id   uuid references ficha_catastro_portal(id) on delete set null,
  referencia  text not null,
  numero      text,
  escalera    text,
  planta      text,
  puerta      text,
  uso         text,
  superficie  integer,
  coeficiente numeric(10,6),
  constraint ficha_inmueble_unico unique (referencia)
);
create index if not exists ficha_inmueble_ficha_idx on ficha_catastro_inmueble (ficha_id);

-- ------------------------------------------------------------ LO URBANISTICO
--
-- ZETU/ZIRE, edificios protegidos, modelos homogeneos de ascensor, IEE... Son
-- fuentes DISTINTAS, de organismos distintos, y CADUCAN: el planeamiento cambia
-- y las subvenciones se conceden despues. Por eso son filas y no columnas: se
-- añade una fuente el dia que se consigue, sin tocar el esquema.
create table if not exists dato_urbanistico (
  id            uuid primary key default gen_random_uuid(),
  creado_en     timestamptz not null default now(),
  referencia    text not null,
  fuente        text not null,
  hay           boolean,
  codigo        text,
  nombre        text,
  resumen       text,
  pdfs          jsonb,
  detalle       jsonb,
  -- LA REFERENCIA DEL GEOPORTAL: con servicio + capa + objectid se vuelve al
  -- MISMO elemento dentro de meses y se comprueba si ha cambiado. Es lo que
  -- permite vigilar si una subvencion solicitada ya esta concedida.
  servicio      text,
  capa          integer,
  objectid      bigint,
  url           text,
  consultado_en timestamptz not null default now(),
  revisar_desde date,
  constraint dato_urbanistico_fuente_check check (fuente = any (array[
    'edificio_protegido'::text,
    'elementos_protegidos'::text,
    'modelo_ascensor'::text,
    'apiru'::text,
    'arru'::text,
    'zona_subvencion'::text,
    'subvencion_concedida'::text,
    'otro'::text])),
  constraint dato_urbanistico_uno_por_fuente unique (referencia, fuente)
);
create index if not exists dato_urbanistico_ref_idx on dato_urbanistico (referencia);
create index if not exists dato_urbanistico_revisar_idx on dato_urbanistico (revisar_desde) where revisar_desde is not null;

comment on column dato_urbanistico.hay is
  'true / false / null. NULL es "no se ha podido consultar", que NO es lo mismo que "no". Nunca se enseña un null como un no.';

-- --------------------------------------- EL CENSO DE SUBVENCIONES CONCEDIDAS
--
-- No son las nuestras: son TODAS las de Madrid, con direccion, importe y
-- convocatoria. Valen para saber si a una comunidad nuestra ya le concedieron
-- algo, y como argumento de venta: "a un edificio de 40 viviendas a dos calles
-- le dieron 255.000 euros".
create table if not exists subvencion_concedida (
  id             uuid primary key default gen_random_uuid(),
  creado_en      timestamptz not null default now(),
  referencia     text,
  direccion      text not null,
  convocatoria   text,
  ayuda          text,
  fecha          date,
  importe        numeric(12,2),
  viviendas      integer,
  ahorro_energia numeric(12,2),
  ahorro_co2     numeric(12,2),
  distrito       text,
  barrio         text,
  cp             text,
  servicio       text,
  capa           integer,
  objectid       bigint,
  detalle        jsonb,
  consultado_en  timestamptz not null default now(),
  constraint subvencion_concedida_unica unique (servicio, capa, objectid)
);
create index if not exists subvencion_concedida_ref_idx on subvencion_concedida (referencia);
create index if not exists subvencion_concedida_cp_idx on subvencion_concedida (cp);

-- ------------------------------------------------- QUE ESCALERAS ENTRAN
--
-- "Es muy habitual que empecemos haciendo una y luego los vecinos envidiosos se
-- suman y acabamos haciendo todas las del edificio" (Monica). La oportunidad no
-- apunta a una finca: apunta a UNA O VARIAS escaleras, y esa lista crece.
create table if not exists oportunidad_portal (
  oportunidad_id uuid not null references oportunidades(id) on delete cascade,
  portal_id      uuid not null references ficha_catastro_portal(id) on delete cascade,
  creado_en      timestamptz not null default now(),
  primary key (oportunidad_id, portal_id)
);

-- --------------------------------- LA OPORTUNIDAD SE ENGANCHA A LA FINCA
--
-- Desde el minuto uno, aunque la comunidad todavia no exista: el alta admite
-- direccion provisional. "Nuestro eje es la direccion, pero ahora la direccion
-- viene dada por un organismo oficial."
alter table oportunidades add column if not exists referencia_catastral text;
create index if not exists oportunidades_refcat_idx on oportunidades (referencia_catastral);

comment on column oportunidades.referencia_catastral is
  'La finca de esta oportunidad, confirmada por el comercial contra Catastro.';
