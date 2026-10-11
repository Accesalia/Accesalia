-- HORAS EXTRA QUE SE DEVUELVEN EN DIAS LIBRES (Monica, 11-oct-2026). Subvenciones
-- tiene picos: "a veces se quedan mas horas que luego cambian por dias libres".
-- Se guardan en HORAS, como se llevan, y la app las pasa a dias con la jornada de
-- la persona. Van aparte del derecho para que se vea que no son vacaciones. Mas
-- adelante, el CSV de la app de fichaje puede llenarlo solo.
alter table public.rrhh_saldo_vacaciones
  add column horas_compensacion numeric not null default 0;

comment on column public.rrhh_saldo_vacaciones.horas_compensacion is 'Horas extra de ese año que se devuelven en dias libres. Se suman a los dias disponibles pasandolas a dias con la jornada diaria (8 h si no consta).';
