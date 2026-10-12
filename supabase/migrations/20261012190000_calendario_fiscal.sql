-- CALENDARIO FISCAL (Monica, 12-oct-2026): "vamos muy perdidos con los
-- impuestos a pagar, no ya importes sino incluso fechas". Primera pieza del
-- area PAGAR.
--
-- Los presenta la gestoria (GMA): cada mes se le pasan los gastos y ellos
-- calculan y presentan. Van domiciliados. A menudo se FRACCIONAN por caja:
-- cada plazo cuenta como gasto en su mes.
--
-- Tres empresas: Accesalia y Ecobalance (sociedades, pagan lo mismo) y Daniel
-- de Soto autonomo (impuestos distintos; los paga la casa igual). Alexandra ve
-- Accesalia y Daniel; Ana, Ecobalance; direccion, todo.
--
--   obligaciones_fiscales   la lista fija: que modelo, de que empresa, cada cuanto
--   vencimientos_fiscales   cada pago concreto (303 · 3T-2026 · Accesalia)
--   vencimiento_plazos      solo si se fracciona: cada plazo con su fecha

create table obligaciones_fiscales (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),

  empresa         text        not null,
  modelo          text        not null,
  nombre          text        not null,
  organismo       text        not null,
  periodicidad    text        not null,
  plazo           text        not null,
  domiciliado     boolean     not null default true,
  presenta        text        not null default 'gestoria',
  activa          boolean     not null default true,
  orden           integer,
  notas           text,

  constraint obligaciones_fiscales_uq unique (empresa, modelo),
  constraint obligaciones_fiscales_empresa_ck check (empresa in ('accesalia', 'daniel_autonomo', 'ecobalance')),
  constraint obligaciones_fiscales_organismo_ck check (organismo in ('aeat', 'tgss', 'ayuntamiento', 'registro')),
  constraint obligaciones_fiscales_periodicidad_ck check (periodicidad in ('mensual', 'trimestral', 'anual', 'cuando_toque')),
  constraint obligaciones_fiscales_presenta_ck check (presenta in ('gestoria', 'nosotros', 'cargo_automatico'))
);

comment on table obligaciones_fiscales is 'Lo que cada empresa tiene que declarar o pagar a Hacienda, la Seguridad Social, el ayuntamiento o el Registro. La lista fija de la que salen los vencimientos.';
comment on column obligaciones_fiscales.empresa is 'accesalia y daniel_autonomo los ve facturacion (Alexandra); ecobalance, facturacion_ecobalance (Ana). Direccion, todo.';
comment on column obligaciones_fiscales.modelo is 'El numero de modelo de Hacienda (303, 111...) o una clave corta para lo que no lo tiene (SS, RETA, IVTM, CUENTAS).';
comment on column obligaciones_fiscales.plazo is 'El plazo dicho en palabras, como lo publica el organismo. Si cae en festivo o fin de semana, pasa al siguiente dia habil.';
comment on column obligaciones_fiscales.periodicidad is 'cuando_toque = solo hay que presentarlo si ha pasado algo (349: operaciones con la UE).';

create table vencimientos_fiscales (
  id                   uuid          primary key default gen_random_uuid(),
  creado_en            timestamptz   not null default now(),
  actualizado_en       timestamptz   not null default now(),

  obligacion_id        uuid          not null references obligaciones_fiscales (id) on delete restrict,
  ejercicio            integer       not null,
  periodo              text          not null,
  fecha_limite         date          not null,
  fecha_domiciliacion  date,
  estado               text          not null default 'previsto',
  importe_estimado     numeric(12,2),
  importe              numeric(12,2),
  resultado            text,
  presentado_en        date,
  pagado_en            date,
  documento            text,
  justificante         text,
  origen               text          not null default 'calendario',
  notas                text,

  constraint vencimientos_fiscales_uq unique (obligacion_id, ejercicio, periodo),
  constraint vencimientos_fiscales_estado_ck check (estado in ('previsto', 'borrador', 'presentado', 'pagado', 'fraccionado', 'no_aplica')),
  constraint vencimientos_fiscales_resultado_ck check (resultado is null or resultado in ('a_pagar', 'a_devolver', 'a_compensar', 'cero')),
  constraint vencimientos_fiscales_origen_ck check (origen in ('calendario', 'excel_control', 'declaracion', 'manual'))
);

comment on table vencimientos_fiscales is 'Cada pago o declaracion concreta: modelo, periodo, empresa (por su obligacion), fecha limite, estado e importe.';
comment on column vencimientos_fiscales.periodo is '1T..4T, 1P..3P (pagos a cuenta del 202), 01..12 (mensual) o ANUAL.';
comment on column vencimientos_fiscales.fecha_limite is 'Ultimo dia para presentar y pagar. Si va domiciliado, es el dia en que sale el dinero: la fecha que cuenta para la caja.';
comment on column vencimientos_fiscales.fecha_domiciliacion is 'Ultimo dia para presentarlo domiciliado (Hacienda lo cierra unos dias antes). Es la fecha que hay que vigilar con la gestoria.';
comment on column vencimientos_fiscales.importe_estimado is 'Lo que se calcula que saldra, para prever la caja. No es lo declarado.';
comment on column vencimientos_fiscales.importe is 'Lo que salio en la declaracion presentada.';
comment on column vencimientos_fiscales.documento is 'La declaracion en PDF, en el almacen privado fiscal.';
comment on column vencimientos_fiscales.justificante is 'El justificante del pago o del cargo, en el almacen privado fiscal.';
comment on column vencimientos_fiscales.origen is 'De donde sale lo que dice: calendario (generado), excel_control (el Excel de control de Hacienda de Monica), declaracion (leido del PDF), manual.';

create table vencimiento_plazos (
  id              uuid          primary key default gen_random_uuid(),
  creado_en       timestamptz   not null default now(),
  actualizado_en  timestamptz   not null default now(),

  vencimiento_id  uuid          not null references vencimientos_fiscales (id) on delete cascade,
  numero          integer       not null,
  fecha           date          not null,
  importe         numeric(12,2) not null,
  estado          text          not null default 'pendiente',
  pagado_en       date,
  notas           text,

  constraint vencimiento_plazos_uq unique (vencimiento_id, numero),
  constraint vencimiento_plazos_estado_ck check (estado in ('pendiente', 'pagado', 'impagado'))
);

comment on table vencimiento_plazos is 'Cuando un pago se fracciona o aplaza: cada plazo con su fecha e importe. Cada uno cuenta como gasto en su mes.';

create index vencimientos_fiscales_fecha_idx on vencimientos_fiscales (fecha_limite);
create index vencimiento_plazos_fecha_idx on vencimiento_plazos (fecha);

alter table obligaciones_fiscales enable row level security;
alter table vencimientos_fiscales enable row level security;
alter table vencimiento_plazos enable row level security;

insert into storage.buckets (id, name, public) values ('fiscal', 'fiscal', false)
on conflict (id) do nothing;
