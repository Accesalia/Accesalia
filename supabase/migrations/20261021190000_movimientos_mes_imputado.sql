-- LAS NOMINAS, EN SU MES (Monica, 21-oct-2026: «las nominas las repercutimos donde toca»). «Nomina Agosto 2025»
-- pagada el 1-sep cuenta en agosto. mes_imputado vacio = el mes de la fecha del cargo.
alter table movimientos_bancarios add column mes_imputado text;
alter table movimientos_bancarios add constraint movimientos_bancarios_mes_imputado_check check (mes_imputado is null or mes_imputado ~ '^\d{4}-\d{2}$');
comment on column movimientos_bancarios.mes_imputado is 'El mes al que corresponde (AAAA-MM) cuando no es el del cargo: «Nomina Agosto 2025» pagada el 1-sep cuenta en agosto (Mónica, 21-oct). Vacío = el mes de la fecha.';
create index movimientos_bancarios_mes_imputado_idx on movimientos_bancarios (mes_imputado);
