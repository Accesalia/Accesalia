-- Salario bruto anual y neto mensual (Monica, 11-sep-2026).
--
-- 1. BRUTO ANUAL: "saber cuanto cuestan al año nos ayudara a calcular costes",
--    para las cuentas y los KPIs de direccion. Tabla propia y no una columna
--    del contrato, por dos motivos:
--      - lo ve SOLO direccion. Separado, el acceso es de la tabla entera y no
--        hay que acordarse de esconder una columna en cada pantalla;
--      - cambia con fechas (subidas, cambios de jornada) y hay que conservar
--        la historia para el coste de cada mes. Sin fecha de fin = vigente.
--    Es el bruto del contrato. El coste para la empresa (con la Seguridad
--    Social) se calculara a partir de el cuando se hagan los KPIs.
--
-- 2. NETO MENSUAL: lo que se le transfiere un mes normal. Va con la cuenta, en
--    los datos para pagar, porque las transferencias las hace RRHH (Alexandra):
--    "tener importe + numero de cuenta a mano es muy util (yo lo repaso a mano
--    cada mes, es una paliza)". Lo ven RRHH, direccion y el propio empleado.
--    El de cada mes concreto saldra de su nomina cuando esten en la app.

create table if not exists rrhh_salarios (
  id                 uuid          primary key default gen_random_uuid(),
  creado_en          timestamptz   not null default now(),
  actualizado_en     timestamptz   not null default now(),

  persona_id         uuid          not null references equipo (id) on delete cascade,
  bruto_anual        numeric(10,2) not null,
  desde              date          not null,
  hasta              date,
  notas              text,

  constraint rrhh_salarios_bruto_ck  check (bruto_anual >= 0),
  constraint rrhh_salarios_fechas_ck check (hasta is null or hasta >= desde)
);

comment on table rrhh_salarios is 'Salario bruto anual de cada empleado, con fechas. Lo ve SOLO direccion (para costes y KPIs). Sin fecha de fin = vigente.';

create index if not exists idx_rrhh_salarios_persona on rrhh_salarios (persona_id, desde desc);

drop trigger if exists trg_set_actualizado_en on rrhh_salarios;
create trigger trg_set_actualizado_en before update on rrhh_salarios for each row execute function set_actualizado_en();
alter table rrhh_salarios enable row level security;
grant all privileges on table rrhh_salarios to service_role;

alter table rrhh_datos_personales
  add column if not exists neto_mensual numeric(10,2),
  add constraint rrhh_datos_neto_ck check (neto_mensual is null or neto_mensual >= 0);

comment on column rrhh_datos_personales.neto_mensual is 'Lo que se le transfiere un mes normal. Con el IBAN arma la lista de transferencias de las nominas, que hace RRHH. El de cada mes concreto saldra de su nomina.';
