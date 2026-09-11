-- Salario bruto anual de cada empleado (Monica, 11-sep-2026): "saber cuanto
-- cuestan al año nos ayudara a calcular costes", para las cuentas y los KPIs
-- de direccion.
--
-- Tabla propia, y no una columna del contrato, por dos motivos:
--   - lo ve SOLO direccion. Ni RRHH ni el propio empleado lo ven en la app.
--     Separado, el acceso es de la tabla entera y no hay que acordarse de
--     esconder una columna en cada pantalla;
--   - cambia con fechas (subidas, cambios de jornada) y hay que conservar la
--     historia para calcular el coste de cada mes. Sin fecha de fin = vigente.
--
-- Es el bruto, lo que dice el contrato. El coste para la empresa (con la
-- Seguridad Social) se calculara a partir de el cuando se hagan los KPIs.

create table if not exists rrhh_salarios (
  id                 uuid          primary key default gen_random_uuid(),
  creado_en          timestamptz   not null default now(),
  actualizado_en     timestamptz   not null default now(),

  persona_id         uuid          not null references equipo (id) on delete cascade,
  bruto_anual        numeric(10,2) not null,
  neto_mensual       numeric(10,2),
  desde              date          not null,
  hasta              date,
  notas              text,

  constraint rrhh_salarios_bruto_ck  check (bruto_anual >= 0),
  constraint rrhh_salarios_fechas_ck check (hasta is null or hasta >= desde)
);

comment on table rrhh_salarios is 'Salario bruto anual de cada empleado, con fechas. Lo ve SOLO direccion (para costes y KPIs). Sin fecha de fin = vigente.';
comment on column rrhh_salarios.neto_mensual is 'Lo que se le transfiere un mes normal. Con el numero de cuenta, arma la lista de transferencias del mes (Monica, 11-sep-2026: "lo repaso a mano cada mes, es una paliza"). El de cada mes concreto saldra de su nomina.';

create index if not exists idx_rrhh_salarios_persona on rrhh_salarios (persona_id, desde desc);

drop trigger if exists trg_set_actualizado_en on rrhh_salarios;
create trigger trg_set_actualizado_en before update on rrhh_salarios for each row execute function set_actualizado_en();
alter table rrhh_salarios enable row level security;
grant all privileges on table rrhh_salarios to service_role;
