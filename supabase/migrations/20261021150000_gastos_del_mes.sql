-- PREVER › GASTOS DEL MES (Monica, 21-oct-2026; maqueta validada: docs/figma/gastos-del-mes.html).
-- Cada gasto habitual sabe ahora:
--   como_aparece   como sale en el banco (una o varias expresiones: «SIEMENS FINANCIAL», «FARO EUROPE»)
--   tipos          o que tipos de apunte del banco cuentan como suyos («COAM», «SOFTWARE Y APPS»)
--   accion         que hay que hacer antes («pedir la renovacion a FARO»): sale en el cartel
--   avisar         si sale en el cartel el mes anterior (los que no son de todos los meses)
--   solo_direccion si Alexandra no lo ve (las comisiones en mano, la del administrador...)
-- y «cada» admite una_vez (en el mes de «desde») y plazos (en sus meses, entre desde y hasta).
-- Y cada apunte del banco, a que gasto habitual pertenece: con eso sale la columna «Real».

alter table gastos_habituales
  add column como_aparece   text[],
  add column tipos          text[],
  add column accion         text,
  add column avisar         boolean not null default true,
  add column solo_direccion boolean not null default false;

alter table gastos_habituales drop constraint gastos_habituales_cada_check;
alter table gastos_habituales add constraint gastos_habituales_cada_check
  check (cada in ('mensual', 'trimestral', 'semestral', 'anual', 'una_vez', 'plazos'));

comment on column gastos_habituales.dia is 'El día del mes en que suele salir del banco (la mediana de los extractos): «por pasar · día 30».';
comment on column gastos_habituales.como_aparece is 'Cómo sale en el banco: expresiones (mayúsculas) sobre concepto + más datos. Mandan sobre «tipos».';
comment on column gastos_habituales.tipos is 'Los tipos de apunte (movimientos_bancarios.tipo) que cuentan como este gasto.';

alter table movimientos_bancarios add column gasto_habitual_id uuid references gastos_habituales(id) on delete set null;
comment on column movimientos_bancarios.gasto_habitual_id is 'El gasto habitual al que pertenece este apunte: la columna «Real» de Gastos del mes.';
create index movimientos_bancarios_gasto_idx on movimientos_bancarios (gasto_habitual_id);
