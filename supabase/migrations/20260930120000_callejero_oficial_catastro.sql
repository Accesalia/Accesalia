-- El callejero OFICIAL de Catastro, para poder validar una direccion al darla de alta.
--
-- Pedido por Monica el 30-sep-2026, con su razon: "estamos creando oportunidades
-- con direcciones constantemente, va a ser una herramienta MUY util".
--
-- Por que hace falta: Catastro no escribe las calles como las escribimos nosotras.
-- Invierte el articulo (CL ARBOLEDA LA), abrevia (CL CGDOR ALONSO DE TOBAR,
-- CL RAIMUNDO FDEZ VILLAVERDE, CL NTRA SRA DE LOS ANGELES), junta el apostrofo
-- (CL ODONNELL) y tiene sus propias erratas (CL GUTEMBERG, con M). Buscar por el
-- nombre que usamos nosotras no encuentra nada: de 1.228 direcciones de la
-- cartera, 226 quedaron dudosas por esto.
--
-- Ya aplicada en produccion el 30-sep-2026.

create table if not exists municipios_catastro (
  id                uuid primary key default gen_random_uuid(),
  creado_en         timestamptz not null default now(),
  provincia         text not null,
  nombre            text not null,            -- como lo escribe Catastro: LAS ROZAS DE MADRID
  clave             text not null,            -- palabras significativas ordenadas, para cotejar
  codigo_provincia  text not null,            -- codigo INE de provincia
  codigo_municipio  text not null,            -- codigo INE de municipio
  vias              integer not null default 0,
  descargado_en     timestamptz,
  constraint municipios_catastro_unico unique (provincia, nombre)
);
comment on table municipios_catastro is
  'Municipios como los nombra Catastro. Nosotras decimos LAS ROZAS y el se llama LAS ROZAS DE MADRID: sin esta tabla no se le puede preguntar.';
comment on column municipios_catastro.clave is
  'Palabras significativas, sin tildes ni articulos, ordenadas alfabeticamente. Sirve para encontrar el municipio aunque lo escribamos distinto.';
comment on column municipios_catastro.descargado_en is
  'Cuando se bajo su callejero. Nulo = pendiente. Es lo que hace que la carga se pueda cortar y seguir.';

create table if not exists vias_catastro (
  id            uuid primary key default gen_random_uuid(),
  municipio_id  uuid not null references municipios_catastro(id) on delete cascade,
  tipo_via      text not null,                -- CL, AV, PZ, PS, CM... la "sigla" que Catastro exige
  nombre        text not null,                -- ARBOLEDA LA
  codigo_via    text not null,                -- codigo de via de Catastro
  busqueda      text not null,                -- el nombre sin tildes ni puntuacion
  clave         text not null,                -- palabras significativas ordenadas
  constraint vias_catastro_unico unique (municipio_id, codigo_via, tipo_via)
);
comment on table vias_catastro is
  'Todas las calles oficiales de cada municipio. Es la lista contra la que se valida una direccion nueva.';
comment on column vias_catastro.clave is
  'Palabras significativas ordenadas: ARBOLEDA LA y LA ARBOLEDA dan la misma clave. Es el cotejo que de verdad funciona.';

create index if not exists vias_catastro_municipio_idx   on vias_catastro (municipio_id);
create index if not exists vias_catastro_clave_idx       on vias_catastro (municipio_id, clave);
create index if not exists vias_catastro_busqueda_trgm   on vias_catastro using gin (busqueda gin_trgm_ops);
create index if not exists municipios_catastro_clave_idx on municipios_catastro (clave);

-- Se lee sin restriccion: es dato publico y lo necesita cualquier pantalla de alta.
alter table municipios_catastro enable row level security;
alter table vias_catastro       enable row level security;
drop policy if exists "callejero: lo lee cualquiera que haya entrado" on municipios_catastro;
drop policy if exists "callejero: lo lee cualquiera que haya entrado" on vias_catastro;
create policy "callejero: lo lee cualquiera que haya entrado"
  on municipios_catastro for select to authenticated using (true);
create policy "callejero: lo lee cualquiera que haya entrado"
  on vias_catastro for select to authenticated using (true);

-- ---------------------------------------------------------------------------
-- La regla de cotejo vive AQUI, no en el programa que carga los datos: la
-- busqueda tiene que usar exactamente la misma regla con la que se guardo.
-- El equivalente en TypeScript esta en frontend/lib/callejero.ts; si se cambia
-- una, la otra tambien.
-- ---------------------------------------------------------------------------

create or replace function sin_tildes(t text) returns text
  language sql immutable strict parallel safe as $$
  select translate(upper(t),
                   'ÁÀÄÂÃÅÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÇ',
                   'AAAAAAEEEEIIIIOOOOOUUUUC')
$$;
comment on function sin_tildes is 'Mayusculas sin tildes. La Ñ se respeta: ÑO no es NO, y Cañada sin eñe "no existe" en Catastro.';

create or replace function texto_de_via(nombre text) returns text
  language sql immutable strict parallel safe as $$
  select trim(regexp_replace(regexp_replace(sin_tildes(nombre), '[^A-Z0-9Ñ]+', ' ', 'g'),
                             ' +', ' ', 'g'))
$$;

create or replace function clave_de_via(nombre text) returns text
  language sql immutable strict parallel safe as $$
  select coalesce(string_agg(p, ' ' order by p), '')
  from unnest(string_to_array(texto_de_via(nombre), ' ')) p
  where p <> ''
    and p not in ('DE','DEL','LA','LAS','EL','LOS','Y','DO','DA')
    and p !~ '^[0-9]+$'
$$;
comment on function clave_de_via is
  'Clave de cotejo de un nombre de via: inmune al orden de las palabras y a los articulos. Es la que resolvio las 1.228 direcciones.';
