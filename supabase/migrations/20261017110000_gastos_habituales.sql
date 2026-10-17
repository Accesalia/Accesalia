-- LA CAJA DEL MES (Monica, 17-oct-2026): los GASTOS HABITUALES, lo que sale
-- todos los meses (o cada trimestre, semestre o año) y no es un impuesto:
-- nominas, Seguridad Social, alquiler, coches, FARO, GMA, creditos, la casa, el
-- sueldo de Daniel, la reserva de varios... De cada uno: que empresa lo paga,
-- cuanto, cada cuanto (y en que meses), desde y hasta cuando, y de que cuenta.
-- La semilla es la columna «GASTOS EXTRAS MENSUALES» de su Excel de impuestos
-- (2025); se contrastara con los extractos del banco («nada mas fiable para
-- seguir el rastro del dinero»). importe vacio = por saber.
create table gastos_habituales (
  id           uuid primary key default gen_random_uuid(),
  empresa      text not null,
  concepto     text not null,
  importe      numeric(12,2),
  cada         text not null default 'mensual',
  dia          smallint,
  meses        smallint[],          -- trimestral, semestral o anual: en que meses (1-12)
  desde        date,
  hasta        date,                -- FARO hasta mayo de 2027, el Ford hasta julio de 2028...
  cuenta       text,
  origen       text not null default 'manual',
  notas        text,
  activo       boolean not null default true,
  creado_en    timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint gastos_habituales_empresa_check check (empresa in ('accesalia', 'daniel_autonomo', 'ecobalance')),
  constraint gastos_habituales_cada_check check (cada in ('mensual', 'trimestral', 'semestral', 'anual')),
  constraint gastos_habituales_cuenta_check check (cuenta is null or cuenta in ('caixa_accesalia', 'caixa_daniel', 'bbva_accesalia', 'bbva_ecobalance')),
  constraint gastos_habituales_origen_check check (origen in ('excel_2025', 'extracto', 'manual')),
  constraint gastos_habituales_dia_check check (dia is null or dia between 1 and 31)
);
comment on table gastos_habituales is 'Lo que sale cada mes (o trimestre, semestre, ano) y no es un impuesto: para La caja del mes. Semilla: el Excel de impuestos de Monica (2025).';
create trigger trg_set_actualizado_en before update on gastos_habituales for each row execute function set_actualizado_en();
alter table gastos_habituales enable row level security;

-- LA SEMILLA (su Excel, hoja 2025; todo mensual, como lo lleva ella).
insert into gastos_habituales (empresa, concepto, importe, cada, dia, hasta, cuenta, origen, notas) values
  ('accesalia', 'Nóminas', 25800, 'mensual', 28, null, null, 'excel_2025', 'Cifra de su Excel; se enganchará a las nóminas de RRHH'),
  ('accesalia', 'Seguridad Social', 10152.33, 'mensual', 28, null, null, 'excel_2025', null),
  ('daniel_autonomo', 'Mutualidad de Daniel (HNA)', 445, 'mensual', null, null, null, 'excel_2025', null),
  ('daniel_autonomo', 'Casa', 9000, 'mensual', null, null, null, 'excel_2025', 'Transferencia para los gastos de casa'),
  ('daniel_autonomo', 'Sueldo de Daniel', 3500, 'mensual', null, null, null, 'excel_2025', 'Lo que se saca Daniel para él. Mónica cree que últimamente va como nómina desde Accesalia: confirmar con los extractos'),
  ('accesalia', 'Varios (reserva)', 1000, 'mensual', null, null, null, 'excel_2025', 'Reserva para gastos pequeños o imprevistos'),
  ('accesalia', 'Alquiler del local', 815, 'mensual', null, null, null, 'excel_2025', null),
  ('accesalia', 'FARO', 603.12, 'mensual', null, '2027-05-31', null, 'excel_2025', null),
  ('accesalia', 'Mantenimiento FARO', 250, 'mensual', null, null, null, 'excel_2025', null),
  ('accesalia', 'Licencia Scene', 175, 'mensual', null, null, null, 'excel_2025', null),
  ('accesalia', 'Ford', 466.04, 'mensual', null, '2028-07-31', null, 'excel_2025', null),
  ('accesalia', 'Zoe', 244.49, 'mensual', null, null, null, 'excel_2025', null),
  ('accesalia', 'Jeep', 450, 'mensual', null, null, null, 'excel_2025', null),
  ('accesalia', 'Agua', 31.3, 'mensual', null, null, null, 'excel_2025', null),
  ('accesalia', 'Luz', 100, 'mensual', null, null, null, 'excel_2025', null),
  ('accesalia', 'GMA (gestoría)', 400, 'mensual', null, null, null, 'excel_2025', null),
  ('accesalia', 'Línea de crédito La Caixa', 242.82, 'mensual', null, null, 'caixa_accesalia', 'excel_2025', null),
  ('accesalia', 'Seguros de vida', 600, 'mensual', null, null, null, 'excel_2025', null),
  ('accesalia', 'COAM', 2000, 'mensual', null, null, null, 'excel_2025', 'En su Excel va como mensual'),
  ('accesalia', 'Restaurantes', 300, 'mensual', null, null, null, 'excel_2025', null),
  ('accesalia', 'Monday', 70, 'mensual', null, null, null, 'excel_2025', null),
  ('accesalia', 'Dropbox', 70, 'mensual', null, null, null, 'excel_2025', null),
  ('accesalia', 'SOFISE', 500, 'mensual', null, null, null, 'excel_2025', null),
  ('accesalia', 'Symio', 62, 'mensual', null, null, null, 'excel_2025', null),
  ('accesalia', 'Prosegur', 49, 'mensual', null, null, null, 'excel_2025', null),
  ('accesalia', 'Licencias Revit', null, 'anual', null, null, null, 'excel_2025', 'Unos 15.000 al año; en 2025 sin cifra (en 2024, 1.300 al mes)'),
  ('accesalia', 'Crédito BBVA', null, 'mensual', null, null, 'bbva_accesalia', 'manual', 'Mónica, 17-oct: importe por saber, sale de los extractos'),
  ('daniel_autonomo', 'Crédito de la casa', null, 'mensual', null, null, null, 'manual', 'Mónica, 17-oct: importe por saber, sale de los extractos');
