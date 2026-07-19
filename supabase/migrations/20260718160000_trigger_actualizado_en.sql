-- =============================================================================
-- ERP Accesalia — Trigger de actualizado_en (autoactualizacion en UPDATE)
--
-- Hasta ahora actualizado_en tenia default now() en la insercion, pero NO se
-- actualizaba al hacer UPDATE (quedaba anotado como pendiente en cada fase).
-- Esta migracion resuelve esa deuda de forma consistente en TODO el esquema:
-- una funcion de trigger comun + un trigger BEFORE UPDATE en cada tabla que
-- tenga la columna actualizado_en.
--
-- Es infraestructura del esquema (mantener una marca temporal), no logica de
-- negocio; por eso se implementa ahora como trigger.
--
-- Idempotente: se puede reejecutar sin romper nada (create or replace + drop
-- trigger if exists). El bucle cubre automaticamente todas las tablas base de
-- public con columna actualizado_en (las 26 actuales).
-- =============================================================================

-- Funcion comun: fija actualizado_en = now() en cada UPDATE.
-- now() devuelve la hora de inicio de la transaccion (consistente dentro de ella).
create or replace function set_actualizado_en()
returns trigger
language plpgsql
as $$
begin
  new.actualizado_en = now();
  return new;
end;
$$;

comment on function set_actualizado_en() is 'Trigger BEFORE UPDATE: fija actualizado_en = now() en cada modificacion de fila. Aplicada a todas las tablas con columna actualizado_en.';

-- Crear (o recrear) el trigger en cada tabla base de public que tenga la columna.
do $$
declare
  r record;
begin
  for r in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables t
      on t.table_schema = c.table_schema
     and t.table_name  = c.table_name
    where c.table_schema = 'public'
      and c.column_name  = 'actualizado_en'
      and t.table_type   = 'BASE TABLE'
    order by c.table_name
  loop
    execute format('drop trigger if exists trg_set_actualizado_en on public.%I', r.table_name);
    execute format(
      'create trigger trg_set_actualizado_en before update on public.%I for each row execute function set_actualizado_en()',
      r.table_name
    );
  end loop;
end $$;

-- =============================================================================
-- NOTA: si en fases futuras se crean nuevas tablas con actualizado_en, hay que
-- anadirles este trigger (o reejecutar el bloque DO de arriba en su migracion).
-- El trigger NO se anade solo a tablas nuevas.
-- =============================================================================
