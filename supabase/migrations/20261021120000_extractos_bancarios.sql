-- LOS EXTRACTOS DEL BANCO (Monica, 21-oct-2026): «poder decir como se mueve el dinero».
-- Tres cosas distintas, cada una en su tabla y guardada UNA vez (sus palabras, cuando lo entendio: «ahhh»):
--   1. cuentas_propias       nuestras cuentas: casi nunca cambian (el limite de la linea se cambia en UN sitio).
--   2. movimientos_bancarios lo que dijo el banco, una linea por apunte; no cambia nunca. ~170 nuevos al mes.
--   3. reglas_movimientos    sus respuestas («Seviam = gestion de la cuenta, se repite»): valen para todos los
--                            apuntes que vengan, y si una cambia se cambia UNA linea.
-- Y cobros.movimiento_bancario_id: que apunte del banco paga cada cobro (FAIN o Schindler pagan varios en uno).
--
-- Lo ven facturacion y direccion (Alexandra incluida). Lo personal de Daniel, la casa, su prestamo, las
-- comisiones en mano y la del administrador, SOLO direccion: solo_direccion = true.

create table cuentas_propias (
  id             uuid primary key default gen_random_uuid(),
  clave          text not null unique,      -- la misma que ya usa gastos_habituales.cuenta
  empresa        text not null,
  banco          text not null,
  iban           text not null unique,
  limite_credito numeric(12,2),             -- la Caixa de Accesalia: linea de credito de 50.000 (por eso va en negativo)
  vigente        boolean not null default true,
  notas          text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint cuentas_propias_clave_check check (clave in ('caixa_accesalia', 'caixa_daniel', 'bbva_accesalia', 'bbva_ecobalance')),
  constraint cuentas_propias_empresa_check check (empresa in ('accesalia', 'daniel_autonomo', 'ecobalance'))
);
comment on table cuentas_propias is 'Nuestras cuentas del banco (no las de comunidades ni contratas: esas estan en cuentas_bancarias).';
create trigger trg_set_actualizado_en before update on cuentas_propias for each row execute function set_actualizado_en();
alter table cuentas_propias enable row level security;

insert into cuentas_propias (clave, empresa, banco, iban, limite_credito, notas) values
  ('caixa_accesalia', 'accesalia', 'La Caixa', 'ES26 2100 1258 8102 0027 8980', 50000, 'Línea de crédito de 50.000 (Mónica, 21-oct): el saldo negativo es lo dispuesto'),
  ('bbva_accesalia', 'accesalia', 'BBVA', 'ES58 0182 6781 8602 0167 2149', null, 'Casi solo el préstamo; se alimenta con «Saldo para bbva» desde la Caixa'),
  ('caixa_daniel', 'daniel_autonomo', 'La Caixa', 'ES90 2100 1258 8102 0019 1207', null, 'La cuenta de autónomo de Daniel');


create table reglas_movimientos (
  id             uuid primary key default gen_random_uuid(),
  orden          integer not null,          -- se prueban en este orden; gana la primera
  sentido        text not null,             -- para gastos o para ingresos
  patron         text not null,             -- expresion regular sobre «concepto + mas datos», en mayusculas
  cuenta         text references cuentas_propias(clave),   -- solo en esa cuenta (vacio = en todas)
  tipo           text not null,             -- lo que es: «GESTORÍA (GMA)», «CASA», «SOFTWARE Y APPS»...
  se_repite      text,
  solo_direccion boolean not null default false,
  origen         text not null,             -- de donde sale: «Mónica, 21-oct», «lo dice el banco», «uno de sus tipos»
  activa         boolean not null default true,
  notas          text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint reglas_movimientos_sentido_check check (sentido in ('gasto', 'ingreso')),
  constraint reglas_movimientos_se_repite_check check (se_repite is null or se_repite in ('si', 'no', 'variable', 'plazos'))
);
comment on table reglas_movimientos is 'Como se clasifica un apunte del banco: las respuestas de Mónica, para que los extractos nuevos se clasifiquen solos y solo se pregunte lo nuevo.';
create trigger trg_set_actualizado_en before update on reglas_movimientos for each row execute function set_actualizado_en();
alter table reglas_movimientos enable row level security;


create table movimientos_bancarios (
  id             uuid primary key default gen_random_uuid(),
  cuenta         text not null references cuentas_propias(clave),
  orden          integer not null,          -- su sitio en la cadena de saldos de la cuenta (saldo = anterior + importe)
  fecha          date not null,
  fecha_valor    date,
  concepto       text not null default '',  -- «Movimiento» en la Caixa, «Concepto» en el BBVA
  mas_datos      text,                      -- «Más datos» / beneficiario-ordenante + observaciones
  importe        numeric(12,2) not null,
  saldo          numeric(12,2),
  referencia     text,                      -- la del BBVA (unica por apunte)
  fichero_origen text,                      -- el Excel del que salio
  clase          text not null,
  tipo           text,                      -- lo que es (el de su regla, o el que ella dijo)
  se_repite      text,
  nota_repite    text,                      -- «quedan 3 plazos, cada ~3 meses»
  como_se_sabe   text,                      -- SIEMPRE: por que es lo que es
  regla_id       uuid references reglas_movimientos(id) on delete set null,
  interno_con    uuid references movimientos_bancarios(id) on delete set null,   -- la pareja en la otra cuenta nuestra
  facturas       text,                      -- las facturas que paga, en texto («Accesalia 2026/1-279 + ...»)
  oportunidad_id uuid references oportunidades(id) on delete set null,
  solo_direccion boolean not null default false,
  su_excel       text,                      -- lo que decia su Excel de gastos: solo referencia, no clasifica
  notas          text,
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint movimientos_bancarios_orden_unico unique (cuenta, orden),
  constraint movimientos_bancarios_clase_check check (clase in ('ingreso', 'gasto', 'interno', 'devolucion')),
  constraint movimientos_bancarios_se_repite_check check (se_repite is null or se_repite in ('si', 'no', 'variable', 'plazos'))
);
comment on table movimientos_bancarios is 'Lo que dijo el banco, apunte a apunte, cosido por la cadena de saldos y clasificado (tipo, se repite, como se sabe).';
create index movimientos_bancarios_fecha_idx on movimientos_bancarios (cuenta, fecha);
create index movimientos_bancarios_tipo_idx on movimientos_bancarios (tipo);
create trigger trg_set_actualizado_en before update on movimientos_bancarios for each row execute function set_actualizado_en();
alter table movimientos_bancarios enable row level security;


alter table cobros add column movimiento_bancario_id uuid references movimientos_bancarios(id) on delete set null;
comment on column cobros.movimiento_bancario_id is 'El apunte del banco en el que entró este cobro (una transferencia de FAIN o Schindler puede pagar varios).';
create index cobros_movimiento_bancario_idx on cobros (movimiento_bancario_id);
