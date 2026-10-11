-- =============================================================================
-- PARAMETROS ECONOMICOS (Monica, 11-oct-2026)
--
-- "Los tres precios de una obra": PEM -> + gastos generales y beneficio
-- industrial (19 %) -> + IVA de obra (10 %) = lo que pagan los vecinos. Ella
-- dejo dicho (3-oct) que el 19 % y el 10 % son datos editables, NUNCA en el
-- codigo. Hasta hoy solo existian como valor por defecto de `viabilidades`.
-- Aqui viven para todo lo que los necesite (estimacion de costes, informe...).
-- =============================================================================

create table parametros_economicos (
  clave          text primary key,
  nombre         text not null,
  valor          numeric(10,4) not null,
  unidad         text,
  descripcion    text,
  actualizado_en timestamptz not null default now()
);
comment on table parametros_economicos is 'Los numeros del negocio que cambian con el tiempo y no pueden ir en el codigo (19 % de gastos generales y beneficio, 10 % de IVA de obra...).';

insert into parametros_economicos (clave, nombre, valor, unidad, descripcion) values
  ('gastos_generales_beneficio_pct', 'Gastos generales y beneficio industrial', 19, '%',
   'Del PEM al precio de la obra sin IVA (habitualmente 13 % de gastos generales + 6 % de beneficio industrial).'),
  ('iva_obra_pct', 'IVA de la obra', 10, '%',
   'IVA de la obra de rehabilitacion de vivienda con contrata. Lo nuestro (honorarios) va al 21 %; tasas e ICIO, sin IVA.');

create trigger trg_set_actualizado_en before update on parametros_economicos for each row execute function set_actualizado_en();
alter table parametros_economicos enable row level security;
