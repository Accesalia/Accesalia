-- =============================================================================
-- ERP Accesalia — Empresas administradoras salidas de las fichas, y su cotejo
-- contra las que ya existen en la app
--
-- migracion_admin_revision tiene 491 filas que son COMUNIDADES, no empresas: la
-- misma administracion sale repetida (DEL BRIO Y BLANCO, en 22). Aqui se
-- convierte ese texto repetido en 317 empresas con id propio.
--
-- Por que el id se crea ANTES de cotejar: en cuanto existe, cada comunidad
-- apunta a el (migracion_admin_revision.empresa_id). Asi, cuando el cotejo diga
-- "esta empresa nuestra es aquella vuestra", basta cambiar una fila del puente
-- y las 22 comunidades se mueven solas. Con una lista de nombres sin vinculo
-- guardado, el cotejo no arrastraria nada.
--
-- El PUENTE (migracion_admin_cotejo) no fusiona: solo declara "esta es aquella"
-- y por que. La fusion es un paso posterior y aparte, que se puede revisar
-- antes de ejecutar y rehacer si un cruce estaba mal.
--
-- Dos claves de nombre a proposito:
--   nombre_norm    conservadora (tildes, puntuacion, espacios). Solo une lo que
--                  es la MISMA escritura: "A.F. SERRANO LOBO, S.L" = "AF
--                  SERRANO LOBO SL". Es la que agrupa las 491 en 317.
--   clave_busqueda agresiva (ademas quita S.L./SLU, y el ruido de oficio
--                  "administracion de fincas"). NO agrupa nada: solo sirve para
--                  PROPONER candidatas al cotejo. Fusionar por parecido es una
--                  decision humana.
--
-- Convenciones: espanol sin tildes/enes; CHECK con nombre (nunca enum); RLS sin
-- politicas; trigger set_actualizado_en.
-- =============================================================================

create table migracion_admin_empresa (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),

  nombre          text        not null,
  nombre_norm     text        not null unique,
  clave_busqueda  text        not null default '',
  variantes       text        not null default '',
  n_comunidades   integer     not null default 0,

  email           text        not null default '',
  telefono        text        not null default '',
  direccion       text        not null default ''
);

comment on table migracion_admin_empresa is 'Las administraciones que salen de las fichas, una fila por empresa (no por comunidad). Origen del cotejo contra administraciones_fincas.';
comment on column migracion_admin_empresa.nombre is 'La escritura elegida del grupo: la mas larga, que suele ser la mas completa.';
comment on column migracion_admin_empresa.nombre_norm is 'Clave de agrupacion conservadora. Une solo lo que es la misma escritura.';
comment on column migracion_admin_empresa.clave_busqueda is 'Clave agresiva SOLO para proponer candidatas en el cotejo. Nunca agrupa por si sola.';
comment on column migracion_admin_empresa.variantes is 'Las demas escrituras del grupo, para poder auditar la agrupacion.';

create index migracion_admin_empresa_busqueda_idx on migracion_admin_empresa (clave_busqueda);

-- El vinculo, guardado antes del cotejo: es lo unico que hace util al id
alter table migracion_admin_revision
  add column empresa_id uuid references migracion_admin_empresa(id) on delete set null;

comment on column migracion_admin_revision.empresa_id is 'La empresa a la que se resolvio el texto del NOMBRE. Es el vinculo comunidad -> administracion que aporta la migracion.';

create index migracion_admin_revision_empresa_idx on migracion_admin_revision (empresa_id);

-- ---------------------------------------------------------------------------
-- El puente: nuestra empresa <-> la administracion que ya existe en la app
-- ---------------------------------------------------------------------------
create table migracion_admin_cotejo (
  id                 uuid        primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  empresa_id         uuid        not null references migracion_admin_empresa(id) on delete cascade,
  -- Sin FK: la administracion vive en produccion y aqui solo se anota su id.
  administracion_id  uuid,
  administracion     text        not null default '',

  motivo             text        not null,
  parecido           numeric(4,3),
  -- El nombre con el que quedara la administracion en la app. No es el nombre
  -- legal: es el que el equipo de Accesalia usa para reconocerla, que es lo
  -- util aqui. El legal (con CIF y n de colegiado) sera otro campo, mas
  -- adelante y en la tabla de negocio, no aqui.
  nombre_final       text        not null default '',
  decision           text        not null default 'propuesta',
  nota               text,

  constraint migracion_admin_cotejo_motivo_check
    check (motivo in ('nombre_exacto', 'clave_busqueda', 'contenido', 'parecido',
                      'dominio_correo', 'varias', 'manual', 'sin_candidata')),
  constraint migracion_admin_cotejo_decision_check
    check (decision in ('propuesta', 'es_la_misma', 'es_distinta', 'crear_nueva'))
);

comment on table migracion_admin_cotejo is 'Puente nuestra empresa <-> administracion existente. Declara la correspondencia y por que; NO fusiona. La fusion se hace despues leyendo de aqui.';
comment on column migracion_admin_cotejo.motivo is 'Como se propuso el cruce. varias = hay mas de una posible y NO se elige por nadie (la app tiene la misma casa por oficinas: MARCAL LEGANES / COLMENAR / CLM). sin_candidata = no se parece a ninguna: sera una administracion nueva.';
comment on column migracion_admin_cotejo.parecido is '0 a 1. Solo informativo, nunca decide por si solo.';
comment on column migracion_admin_cotejo.decision is 'propuesta = sin revisar. Lo demas lo pone Monica y es lo que manda al fusionar.';

create index migracion_admin_cotejo_empresa_idx  on migracion_admin_cotejo (empresa_id);
create index migracion_admin_cotejo_decision_idx on migracion_admin_cotejo (decision);

alter table migracion_admin_empresa enable row level security;
alter table migracion_admin_cotejo  enable row level security;

drop trigger if exists trg_set_actualizado_en on public.migracion_admin_empresa;
create trigger trg_set_actualizado_en
  before update on public.migracion_admin_empresa
  for each row execute function set_actualizado_en();

drop trigger if exists trg_set_actualizado_en on public.migracion_admin_cotejo;
create trigger trg_set_actualizado_en
  before update on public.migracion_admin_cotejo
  for each row execute function set_actualizado_en();
