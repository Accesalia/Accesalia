-- =============================================================================
-- ERP Accesalia — Tabla de correlacion de migracion (Monday -> Accesalia)
--
-- ANDAMIAJE de migracion, NO dato de negocio. Guarda la correspondencia entre
-- cada item de Monday y el registro nuestro que lo representa, para poder
-- recasar por ID (no por nombre) las areas que se importan de forma incremental
-- (comunidades, obras, subvenciones, comisiones...).
--
-- Se conserva hasta terminar TODA la migracion; luego se puede hacer
-- `drop table migracion_monday;` sin tocar ninguna tabla de negocio.
--
-- OJO: registro_id son uuids ESPECIFICOS de cada base (local y nube tienen uuids
-- distintos), asi que esta tabla se rellena por-base.
--
-- Convenciones: espanol sin tildes/enes; PK uuid; text; RLS sin politicas.
-- =============================================================================

create table migracion_monday (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  board           text        not null,
  monday_item_id  text        not null,
  tabla_destino   text        not null,
  registro_id     uuid        not null,
  notas           text,
  constraint uq_migracion_monday unique (board, monday_item_id, tabla_destino)
);

comment on table migracion_monday is 'Andamiaje de migracion Monday->Accesalia: correlacion item de Monday <-> registro nuestro, para recasar por id en imports incrementales. Borrable al terminar la migracion sin afectar a negocio.';
comment on column migracion_monday.board is 'Nombre del tablero Monday de origen (ej. "0 LISTADO DE DIRECCIONES", "01a ADMINISTRACIONES DE FINCAS").';
comment on column migracion_monday.monday_item_id is 'ID del item en Monday (llave de correlacion).';
comment on column migracion_monday.tabla_destino is 'Tabla nuestra donde vive el registro (ej. "comunidades", "administraciones_fincas").';
comment on column migracion_monday.registro_id is 'uuid de nuestro registro. Especifico de esta base (local/nube).';

create index idx_migracion_monday_registro     on migracion_monday (tabla_destino, registro_id);
create index idx_migracion_monday_monday_item  on migracion_monday (monday_item_id);

alter table migracion_monday enable row level security;
