-- EXTRACCION IA de interacciones comerciales.
--
-- La IA (Claude Opus 4.8, JSON garantizado por esquema) PROPONE un desglose
-- estructurado del dictado; un HUMANO valida; y SOLO ENTONCES se materializa en
-- datos limpios (oportunidades, contactos, tareas, brief tecnico). La propuesta se
-- guarda en la propia interaccion como auditoria; el crudo (transcripcion) nunca
-- se pierde.

alter table interacciones
  add column if not exists extraccion jsonb,
  add column if not exists extraccion_estado text not null default 'sin_procesar'
    check (extraccion_estado in ('sin_procesar', 'propuesta', 'validada', 'descartada'));

comment on column interacciones.extraccion is
  'Propuesta estructurada de la IA (JSON por esquema): items del abanico + resumen. Se valida por un humano antes de materializar en las tablas reales.';

-- Tareas de seguimiento con CONDICION DE CIERRE auto-comprobable (la IA las propone;
-- se dan por hechas cuando aparece el dato esperado -> no molestan).
create table if not exists tareas_seguimiento (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  comercial_id uuid references comerciales(id),
  administrador_id uuid references administradores(id),
  oportunidad_id uuid references oportunidades(id),
  interaccion_id uuid references interacciones(id),
  texto text not null,
  condicion_cierre text,            -- descripcion legible de cuando se da por hecha (ej. "2 direcciones nuevas de este admin")
  fecha_limite date,
  estado text not null default 'abierta' check (estado in ('abierta', 'hecha', 'descartada')),
  fecha_cierre date,
  notas text
);
comment on table tareas_seguimiento is
  'Seguimientos comerciales, a menudo propuestos por la IA, con condicion de cierre comprobable contra datos. Mismo espiritu que los avisos de facturacion.';

drop trigger if exists trg_tareas_seguimiento_upd on tareas_seguimiento;
create trigger trg_tareas_seguimiento_upd before update on tareas_seguimiento
  for each row execute function set_actualizado_en();

create index if not exists idx_tareas_seguimiento_comercial on tareas_seguimiento(comercial_id);
create index if not exists idx_tareas_seguimiento_estado on tareas_seguimiento(estado);
