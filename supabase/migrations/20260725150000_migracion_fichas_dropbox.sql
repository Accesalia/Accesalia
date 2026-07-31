-- =============================================================================
-- ERP Accesalia — Staging de las FICHAS DE DATOS del Dropbox de ascensores
--
-- 2.618 fichas .docx (una por ACTUACION, no por comunidad) descargadas a la
-- boveda local C:\accesalia-fichas. Cada ficha es una TABLA Word de 44-63 filas
-- etiqueta->valor: parseo determinista, sin IA.
--
-- CAPA 1 (esto): una sola pasada vuelca aqui el contenido CRUDO, con su seccion.
-- CAPA 2 (aparte): proyecciones por bloque que leen de aqui y escriben en las
-- tablas de negocio (admins -> comunidades -> vinculo). Dropbox ya no se toca.
--
-- Por que guardar el valor CRUDO: la ficha trae suciedad real ("43789,55 X2 =
-- 87579.10" en PEM, "xxx/2022" en Ref). Se normaliza en la capa 2, y el crudo
-- NUNCA se destruye: sin el no hay forma de auditar una extraccion dudosa.
--
-- Por que la SECCION es obligatoria: las etiquetas se repiten entre bloques
-- (NOMBRE, DIRECCION, TELEFONO, E-MAIL y PERSONA DE CONTACTO estan en el bloque
-- del administrador, en el de la comunidad Y en el del ayuntamiento). Sin
-- seccion se mezcla el telefono del ayto con el del administrador.
--
-- Convenciones: espanol sin tildes/enes; CHECK con nombre (nunca enum); RLS sin
-- politicas; trigger set_actualizado_en.
-- =============================================================================

create table migracion_ficha (
  id                 uuid        primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  ficha_ref          text        not null unique,
  ruta_dropbox       text        not null,
  nombre_fichero     text        not null,
  carpeta            text        not null,
  titulo             text,
  variante           text        not null,
  localidad          text,
  es_provincia       boolean     not null default false,

  sha256             text        not null,
  bytes              integer,
  modificado_en      timestamptz,
  n_campos           integer     not null default 0,
  texto              text        not null default '',

  -- Se rellenan en la CAPA 2. La staging es tambien la tabla de reconciliacion:
  -- aqui queda escrito a que comunidad/administracion se resolvio cada ficha.
  comunidad_id       uuid        references comunidades(id) on delete set null,
  administracion_id  uuid        references administraciones_fincas(id) on delete set null,
  revisado           boolean     not null default false,
  notas_revision     text,

  constraint migracion_ficha_variante_check
    check (variante in ('datos_tecnicos', 'datos', 'accesalia', 'otra'))
);

comment on table migracion_ficha is 'Una fila por FICHA DE DATOS .docx del Dropbox (2.618). Contenido crudo; las tablas de negocio se pueblan desde aqui en la capa 2.';
comment on column migracion_ficha.ficha_ref is 'Id estable de la boveda local (sha1 de la ruta relativa, 10 hex). Casa con C:\accesalia-fichas\json\*__<ficha_ref>.json.';
comment on column migracion_ficha.titulo is 'Primera fila de la ficha: la direccion tal cual la escribieron. Ancla para el matching de comunidad junto a catastro y CIF.';
comment on column migracion_ficha.variante is 'Epoca de la plantilla, derivada del nombre del fichero. Las 3 primeras cubren el 97%.';
comment on column migracion_ficha.texto is 'Texto plano completo. Para NOTAS (texto libre fechado) y para que Sali lea la ficha entera si hace falta.';
comment on column migracion_ficha.comunidad_id is 'NULL hasta que la capa 2 resuelva el matching. Se ancla en referencia catastral y CIF, no en el nombre de carpeta.';

create index migracion_ficha_comunidad_idx      on migracion_ficha (comunidad_id);
create index migracion_ficha_administracion_idx on migracion_ficha (administracion_id);
create index migracion_ficha_sha256_idx         on migracion_ficha (sha256);

create table migracion_ficha_campo (
  id          uuid        primary key default gen_random_uuid(),
  creado_en   timestamptz not null default now(),
  ficha_id    uuid        not null references migracion_ficha(id) on delete cascade,
  orden       integer     not null,
  seccion     text        not null,
  seccion_raw text        not null,
  etiqueta    text        not null,
  valor       text        not null default '',

  constraint migracion_ficha_campo_seccion_check
    check (seccion in ('cabecera', 'administrador', 'comunidad', 'ayuntamiento',
                       'proyecto', 'encargo', 'contrata', 'subvenciones',
                       'notas', 'otros'))
);

comment on table migracion_ficha_campo is 'Un par etiqueta->valor crudo por fila de la ficha, con la seccion en que aparece. ~130k filas.';
comment on column migracion_ficha_campo.seccion_raw is 'Cabecera literal del bloque. Conserva matices que la normalizacion pierde: "DATOS ADMINISTRADOR DE FINCAS (ACTUALIZADO A 12/06/2026)", "... NUEVO", "... DESDE OCTUBRE 2025" son CAMBIOS DE ADMINISTRADOR en el tiempo.';
comment on column migracion_ficha_campo.valor is 'Valor CRUDO, sin normalizar ni limpiar. Cadena vacia = la etiqueta existia pero sin dato.';

create index migracion_ficha_campo_ficha_idx  on migracion_ficha_campo (ficha_id);
create index migracion_ficha_campo_busca_idx  on migracion_ficha_campo (seccion, etiqueta);

alter table migracion_ficha       enable row level security;
alter table migracion_ficha_campo enable row level security;

drop trigger if exists trg_set_actualizado_en on public.migracion_ficha;
create trigger trg_set_actualizado_en
  before update on public.migracion_ficha
  for each row execute function set_actualizado_en();
