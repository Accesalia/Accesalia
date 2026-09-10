-- =============================================================================
-- ERP Accesalia — Notas apiladas, UNA TABLA POR MUNDO
--
-- En produccion esto se aplico en tres pasos el 10-sep-2026: `notas_por_mundo`
-- creo las tablas, `notas_convencion_de_nombre` las renombro y
-- `notas_sin_fecha_propia` quito dos columnas que sobraban. Aqui va ya el
-- estado final, que es lo que hay que recrear.
--
-- DECISION DE MONICA. Propuse UNA sola tabla de notas para toda la app,
-- ampliando `observaciones_expediente`, y lo rechazo en redondo:
--
--   "que se llame notas no quiere decir que sirva para esto! Hay notas de
--    muchos tipos y NO DEBEN mezclarse. Las notas que pones a una contrata, a
--    una persona, a un expediente de un proyecto, a una obra que supervisas...
--    son notas diferentes y no se mezclan"
--
-- Y hay un segundo motivo que lo refuerza: LOS PERFILES. Un tecnico no puede
-- ver datos comerciales. Una nota sobre un comercial ("le echaron", "estafo a
-- la empresa") no la puede leer el arquitecto que hace los planos. Con las
-- notas separadas por mundo esa puerta se cierra de una vez; en un saco comun
-- habria que cerrarla fila a fila.
--
-- POR QUE UNA TABLA Y NO UN CAMPO DE TEXTO: hoy `notas` es un bloque unico.
-- Añadir obliga a pegar texto al final y acabas con un ladrillo sin fechas, sin
-- orden y sin saber quien escribio que. Aqui SI se cumple la regla de partir:
-- una nota se repite muchas veces sobre la misma persona o empresa.
--
-- `observaciones_expediente` (2.664 filas, notas de comunidad y de proyecto) NO
-- SE TOCA: es el mundo del expediente. De ella salio la forma de estas dos,
-- aunque aqui se quedo en lo minimo (ver "SIN FECHA PROPIA" mas abajo).
--
-- CONVENCION DE NOMBRE, tambien suya: "notas_administracion_fincas,
-- notas_contratas, notas_obras, etc... todo notas + detalle". Asi, al listar
-- las tablas, todas las de notas quedan juntas y se ve de un vistazo que mundos
-- tienen notas propias y cuales faltan.
--
-- La del mundo administracion lleva apellido porque, por la regla del glosario,
-- "administracion" a secas no se usa nunca: tambien es el ayuntamiento o la
-- junta de distrito.
--
-- SIN FECHA PROPIA. Propuse `fecha` + `fecha_estimada` y Monica los tumbo:
-- "fecha sera automatica, la de creacion de la nota... pero lo de fecha
-- estimada??? que utilidad tiene en una nota?". Tenia razon en las dos:
-- `fecha_estimada` venia copiado del expediente, donde marca hitos historicos,
-- y en una nota no hay nada que estimar; y `fecha` duplicaba a `creado_en`, que
-- ya es automatica. Escribir una nota es pulsar, escribir y olvidarse.
--
-- EXPANDIR, NO SUSTITUIR: los campos `notas` sueltos de las tablas siguen ahi
-- con su contenido. Pasarlos aqui es un paso posterior y aparte.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Mundo contrata
-- ---------------------------------------------------------------------------
create table if not exists notas_contratas (
  id                 uuid        primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  contrata_id        uuid references contratas (id) on delete cascade,
  persona_id         uuid references contrata_personas (id) on delete cascade,
  puesto_id          uuid references contrata_puestos_persona (id) on delete cascade,

  texto              text        not null,
  autor              text,
  origen             text        not null default 'app',

  constraint notas_contratas_texto_ck  check (btrim(texto) <> ''),
  constraint notas_contratas_origen_ck check (origen in ('app','sali','monday','ficha_dropbox')),
  constraint notas_contratas_ambito_ck check (
    (contrata_id is not null)::int + (persona_id is not null)::int + (puesto_id is not null)::int = 1
  )
);

comment on table notas_contratas is 'Notas del mundo contrata, apiladas: cada una es una fila y ninguna pisa a la anterior. Cuelga de la empresa contratista, de una persona o de un puesto concreto, y solo de una de las tres. Separada a proposito de las notas del expediente y de las del mundo administracion de fincas: son notas de tipos distintos y las lee gente distinta.';
comment on column notas_contratas.autor is 'Quien la escribio. Lo pondra el inicio de sesion; texto libre mientras no lo haya.';

create index if not exists idx_notas_contratas_contrata on notas_contratas (contrata_id, creado_en desc) where contrata_id is not null;
create index if not exists idx_notas_contratas_persona  on notas_contratas (persona_id,  creado_en desc) where persona_id  is not null;
create index if not exists idx_notas_contratas_puesto   on notas_contratas (puesto_id,   creado_en desc) where puesto_id   is not null;

-- ---------------------------------------------------------------------------
-- 2. Mundo administracion de fincas
-- ---------------------------------------------------------------------------
create table if not exists notas_administracion_fincas (
  id                 uuid        primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  empresa_id         uuid references empresa (id) on delete cascade,
  persona_id         uuid references persona (id) on delete cascade,
  puesto_id          uuid references puesto (id) on delete cascade,

  texto              text        not null,
  autor              text,
  origen             text        not null default 'app',

  constraint notas_af_texto_ck  check (btrim(texto) <> ''),
  constraint notas_af_origen_ck check (origen in ('app','sali','monday','ficha_dropbox')),
  constraint notas_af_ambito_ck check (
    (empresa_id is not null)::int + (persona_id is not null)::int + (puesto_id is not null)::int = 1
  )
);

comment on table notas_administracion_fincas is 'Notas del mundo administracion de fincas, apiladas. Cuelga de la administracion, de una persona o de un puesto, y solo de una de las tres. Lleva apellido en el nombre porque "administracion" a secas tambien es el ayuntamiento o la junta de distrito: regla del glosario.';
comment on column notas_administracion_fincas.autor is 'Quien la escribio. Lo pondra el inicio de sesion; texto libre mientras no lo haya.';

create index if not exists idx_notas_af_empresa on notas_administracion_fincas (empresa_id, creado_en desc) where empresa_id is not null;
create index if not exists idx_notas_af_persona on notas_administracion_fincas (persona_id, creado_en desc) where persona_id is not null;
create index if not exists idx_notas_af_puesto  on notas_administracion_fincas (puesto_id,  creado_en desc) where puesto_id  is not null;

-- ---------------------------------------------------------------------------
-- 3. Trigger, RLS y permisos
-- ---------------------------------------------------------------------------
drop trigger if exists trg_set_actualizado_en on notas_contratas;
create trigger trg_set_actualizado_en before update on notas_contratas
  for each row execute function set_actualizado_en();

drop trigger if exists trg_set_actualizado_en on notas_administracion_fincas;
create trigger trg_set_actualizado_en before update on notas_administracion_fincas
  for each row execute function set_actualizado_en();

alter table notas_contratas             enable row level security;
alter table notas_administracion_fincas enable row level security;

grant all privileges on table notas_contratas             to service_role;
grant all privileges on table notas_administracion_fincas to service_role;
