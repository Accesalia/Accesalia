-- Que el pipeline NO se rellene a mano: cada oportunidad NACE con sus hitos
-- (trigger), y Sali los avanza desde la voz (logica en la edge). El manual queda
-- solo como ajuste opcional.

-- Trigger: al crear una oportunidad, instanciar los hitos del catalogo.
create or replace function crear_hitos_oportunidad() returns trigger
language plpgsql as $$
begin
  insert into hitos_oportunidad (oportunidad_id, hito, aplicable, estado)
  select new.id, h.clave, h.aplicable_por_defecto,
         case when h.aplicable_por_defecto then 'pendiente' else 'no_aplica' end
  from hitos_comerciales h
  on conflict (oportunidad_id, hito) do nothing;
  return new;
end $$;

drop trigger if exists trg_oportunidad_hitos on oportunidades;
create trigger trg_oportunidad_hitos after insert on oportunidades
  for each row execute function crear_hitos_oportunidad();

-- Backfill: oportunidades que ya existen y no tienen hitos.
insert into hitos_oportunidad (oportunidad_id, hito, aplicable, estado)
select o.id, h.clave, h.aplicable_por_defecto,
       case when h.aplicable_por_defecto then 'pendiente' else 'no_aplica' end
from oportunidades o
cross join hitos_comerciales h
where not exists (select 1 from hitos_oportunidad x where x.oportunidad_id = o.id)
on conflict (oportunidad_id, hito) do nothing;
