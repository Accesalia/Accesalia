-- =============================================================================
-- ERP Accesalia — comercial interno del proyecto + tabla de tiempos estandar
--
-- comercial_interno: quien capto/vendio (crudo de Monday "0 Comercial interno").
--   Dato comun en los listados por fase (contexto para decidir/gestionar).
--
-- tiempos_estandar: tiempo promedio esperado por tipo, para pre-rellenar la fecha
--   prevista de fin al ASIGNAR un tecnico (editable a mano). Reutilizable para RQ.
--   Alimenta desviaciones por tecnico, IA de rendimiento y coste por horas.
-- =============================================================================

alter table proyectos add column comercial_interno text;
comment on column proyectos.comercial_interno is 'Quien capto/vendio (crudo de Monday "0 Comercial interno").';

create table tiempos_estandar (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  contexto text not null default 'proyecto',   -- 'proyecto' | 'requerimiento' (reutilizable)
  clave text not null,                          -- clave del tipo (ascensor, sate...) o del contexto
  dias integer not null,                        -- dias promedio esperados
  descripcion text,
  activo boolean not null default true,
  constraint tiempos_estandar_uniq unique (contexto, clave)
);
comment on table tiempos_estandar is 'Tiempo promedio esperado (dias) por tipo/contexto, para pre-rellenar la fecha prevista de fin al asignar (editable). Base de desviaciones, IA de rendimiento y coste por horas.';

create trigger trg_set_actualizado_en before update on tiempos_estandar for each row execute function set_actualizado_en();
alter table tiempos_estandar enable row level security;

-- Semilla: lo unico confirmado por la propietaria (3 ascensor / 5 SATE). El resto
-- se anade con su criterio; sin fila -> la app usa un default.
insert into tiempos_estandar (contexto, clave, dias, descripcion) values
  ('proyecto', 'ascensor', 3, 'Estandar ascensor (salvo complejos/grandes)'),
  ('proyecto', 'sate',     5, 'Estandar SATE (salvo complejos/grandes)');
