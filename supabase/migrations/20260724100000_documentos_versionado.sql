-- =============================================================================
-- ERP Accesalia — Documentos: VERSIONADO + puntero enchufable + naturaleza
--
-- Amplia `documentos` (no la recrea) para el modelo validado contra las carpetas
-- reales de Dropbox (reina5, polvoranca18, camarena200, zamora1-3-5):
--   - Versionado a nivel de DOCUMENTO (no de paquete): cada version es una fila;
--     todas las versiones de un mismo documento logico comparten `grupo_id`.
--   - El MOTOR de las versiones es el REQUERIMIENTO (ayto/ecu): `requerimiento_id`
--     + `justificacion`. Ver [[sistema-requerimientos-conocimiento]].
--   - La version VIGENTE de cada grupo = el REFUNDIDO (vista al final).
--   - Puntero ENCHUFABLE: backend (dropbox|supabase|r2) + storage_ref. El historico
--     se ENLAZA a Dropbox (no se sube); lo born-in-app ira a Storage.
--   - `naturaleza`: migrado | subido | generado_app.
--
-- Convenciones: espanol sin tildes/enes; PK uuid; text; RLS sin politicas.
-- =============================================================================

alter table documentos
  add column grupo_id          uuid,
  add column n_version         integer not null default 1,
  add column requerimiento_id  uuid references requerimientos_tramitacion(id),
  add column justificacion     text,
  add column naturaleza        text not null default 'migrado',
  add column backend           text,
  add column storage_ref       text,
  add column origen_ruta_dropbox text,
  add constraint documentos_naturaleza_check
    check (naturaleza in ('migrado','subido','generado_app')),
  add constraint documentos_backend_check
    check (backend is null or backend in ('dropbox','supabase','r2'));

-- Cada documento existente/nuevo sin grupo = su propio grupo (v1).
update documentos set grupo_id = id where grupo_id is null;
alter table documentos alter column grupo_id set not null;

comment on column documentos.grupo_id is 'Documento LOGICO: todas las versiones de un mismo doc (p.ej. la memoria del proyecto X) comparten grupo_id. La v1 usa su propio id como grupo.';
comment on column documentos.n_version is 'Numero de version dentro del grupo (1,2,3...).';
comment on column documentos.vigente is 'Esta version es la VIGENTE de su grupo = la que entra en el REFUNDIDO. Una sola vigente por grupo.';
comment on column documentos.requerimiento_id is 'El requerimiento de tramitacion (ayto/ecu) que provoco esta version. Null = version original.';
comment on column documentos.justificacion is 'Por que cambio (obligatorio si la version nace de un requerimiento).';
comment on column documentos.naturaleza is 'migrado (backfill Dropbox) | subido (a mano) | generado_app (nace en la app).';
comment on column documentos.backend is 'Donde vive el fichero: dropbox (enlace, historico) | supabase | r2.';
comment on column documentos.storage_ref is 'Ruta/clave/url en el backend (ns_path de Dropbox, key de Storage, etc.).';
comment on column documentos.origen_ruta_dropbox is 'Ruta original en Dropbox (auditoria de migracion).';

-- una sola version vigente por grupo
create unique index uq_documentos_vigente_por_grupo on documentos(grupo_id) where vigente;
create index idx_documentos_grupo on documentos(grupo_id, n_version);
create index idx_documentos_proyecto_vigente on documentos(proyecto_id) where vigente;
create index idx_documentos_requerimiento on documentos(requerimiento_id);

-- -----------------------------------------------------------------------------
-- Re-visado: UN expediente de visado (COAM) estable con N re-visados.
-- El numero de visado NO cambia entre re-visados (confirmado por Dani).
-- -----------------------------------------------------------------------------
create table revisiones_visado (
  id               uuid        primary key default gen_random_uuid(),
  creado_en        timestamptz not null default now(),
  visado_id        uuid        not null references visados(id),
  n_revision       integer     not null default 1,
  fecha            date,
  requerimiento_id uuid        references requerimientos_tramitacion(id),
  justificacion    text,
  constraint uq_revision_visado unique (visado_id, n_revision)
);
comment on table revisiones_visado is 'Cada re-visado del MISMO expediente COAM (numero de visado estable). Normalmente lo motiva un RQ del ayto que obliga a modificar partes; siempre justificado.';
create index idx_revisiones_visado_visado on revisiones_visado(visado_id);
alter table revisiones_visado enable row level security;

-- -----------------------------------------------------------------------------
-- REFUNDIDO: juego consolidado = la version VIGENTE de cada documento del proyecto.
-- El objetivo de producto ("que la app lo genere sola") = esta vista.
-- -----------------------------------------------------------------------------
create view refundido as
select
  d.proyecto_id,
  d.comunidad_id,
  d.tipo_documento_id,
  td.nombre        as tipo_documento,
  td.pertenece_a,
  d.id             as documento_id,
  d.grupo_id,
  d.n_version,
  d.backend,
  d.storage_ref,
  d.origen_ruta_dropbox
from documentos d
join tipos_documento td on td.id = d.tipo_documento_id
where d.vigente;
comment on view refundido is 'Juego de documentos consolidado: la ultima version vigente de cada documento (por grupo). El REFUNDIDO auto-generado.';
