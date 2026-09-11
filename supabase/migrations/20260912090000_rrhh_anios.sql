-- Parametros de cada año laboral (Monica, 11-sep-2026): "donde poner las horas
-- laborables anuales. Y calcular cuantas horas se hacen en el año con
-- festivos etc para saber los dias que tocan de vacaciones".
--
-- Un año = una fila: la jornada anual maxima del convenio (en horas) y los
-- dias de vacaciones que da. Con eso, con los festivos y cierres de
-- rrhh_calendario y con el horario de cada persona, la app calcula cuantas
-- horas trabaja de verdad cada uno ese año y si le corresponden dias libres
-- por exceso de jornada (o si le faltan horas).
--
-- Lo fija direccion cada año (a partir del convenio); lo ven RRHH y direccion.

create table if not exists rrhh_anios (
  anio                 integer      primary key,
  creado_en            timestamptz  not null default now(),
  actualizado_en       timestamptz  not null default now(),

  jornada_anual_horas  numeric(6,1),
  dias_vacaciones      numeric(4,1) not null default 22,
  notas                text,

  constraint rrhh_anios_anio_ck check (anio between 2020 and 2100),
  constraint rrhh_anios_jornada_ck check (jornada_anual_horas is null or jornada_anual_horas > 0)
);

comment on table rrhh_anios is 'Cada año laboral: jornada anual maxima del convenio (horas) y dias de vacaciones. Con el calendario y el horario de cada uno, la app calcula las horas reales del año y los dias libres por exceso.';
comment on column rrhh_anios.jornada_anual_horas is 'Jornada maxima anual de trabajo efectivo que fija el convenio, en horas.';

drop trigger if exists trg_set_actualizado_en on rrhh_anios;
create trigger trg_set_actualizado_en before update on rrhh_anios for each row execute function set_actualizado_en();
alter table rrhh_anios enable row level security;
grant all privileges on table rrhh_anios to service_role;
