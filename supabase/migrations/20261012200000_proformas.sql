-- PROFORMAS (Monica, 12-oct-2026). La factura se EMITE desde el hito o subhito:
-- primero una proforma en la app (siempre se manda por correo), que luego se
-- pasa a Factusol, donde se hace la factura oficial. En Factusol la factura
-- lleva el codigo de la proforma delante en su Referencia, y al volcarla se
-- enlaza sola: factura -> proforma -> lineas -> hitos.
--
-- Codigo: <EMPRESA>-PF-<AA>-<MM>-<NNNN> (ACC, AUT para Daniel autonomo, ECO).
-- "Mucho mas ligero que la factura: año, mes, numero correlativo. Es solo una
-- forma de trazarlo" (por meses: facil cortar por meses o trimestres). El
-- correlativo vuelve a 1 cada mes en cada empresa.
-- Una proforma: tantas lineas como haga falta; cada linea, tantos hitos como se quiera.

-- LAS EMPRESAS QUE FACTURAN (de Factusol, F_EMP, 12-oct-2026). Datos, no codigo.
create table empresas_emisoras (
  clave              text primary key constraint empresas_emisoras_clave_check check (clave in ('accesalia', 'daniel', 'ecobalance')),
  nombre             text not null,
  nombre_legal       text not null,
  nif                text not null,
  domicilio          text not null,
  telefono           text,
  iban               text,
  prefijo_proforma   text not null unique,
  irpf_porcentaje    numeric(5,2) not null default 0,
  actualizado_en     timestamptz not null default now()
);
comment on table empresas_emisoras is 'Las empresas que facturan: su membrete en la proforma, su prefijo y su retencion. Daniel = autonomo (empresa 001 de Factusol).';
comment on column empresas_emisoras.iban is 'Cuenta para la transferencia que sale en la proforma. Vacia = no se imprime.';
insert into empresas_emisoras (clave, nombre, nombre_legal, nif, domicilio, telefono, iban, prefijo_proforma, irpf_porcentaje) values
  ('accesalia', 'Accesalia', 'SOLUCIONES DE ACCESIBILIDAD Y ECOEFICIENCIA ACCESALIA S.L.', 'B86374055', 'C/ Alhambra, 24. 28047 Madrid', '644482971', 'ES26 2100 1258 8102 0027 8980', 'ACC', 0),
  ('daniel', 'Daniel de Soto', 'DANIEL IGNACIO DE SOTO MARTIN-CARO', '12764176G', 'C/ Alhambra, 24. 28047 Madrid', '644482971', 'ES90 2100 1258 8102 0019 1207', 'AUT', 15),
  ('ecobalance', 'Ecobalance', 'ECOBALANCE IBERIA, S.L.', 'B19750140', 'C/ Manzanares, 1. 28670 Villaviciosa de Odón (Madrid)', '608083559', null, 'ECO', 0);
alter table empresas_emisoras enable row level security;

-- El IVA de lo nuestro: dato, nunca en el codigo.
insert into parametros_economicos (clave, nombre, valor, unidad, descripcion) values
  ('iva_honorarios_pct', 'IVA de los honorarios', 21, '%', 'El IVA de lo que facturamos nosotros (proformas y facturas de honorarios).')
on conflict (clave) do nothing;

create table proformas (
  id               uuid primary key default gen_random_uuid(),
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),
  empresa          text not null references empresas_emisoras(clave),
  anio             smallint not null,
  mes              smallint not null constraint proformas_mes_check check (mes between 1 and 12),
  numero           integer not null,
  codigo           text not null unique,
  fecha            date not null default (now() at time zone 'Europe/Madrid')::date,
  oportunidad_id   uuid references oportunidades(id) on delete set null,
  pagador_nombre   text not null,
  pagador_nif      text,
  pagador_domicilio text,
  base             numeric(12,2) not null,
  iva_porcentaje   numeric(5,2) not null,
  iva              numeric(12,2) not null,
  irpf_porcentaje  numeric(5,2) not null default 0,
  irpf             numeric(12,2) not null default 0,
  total            numeric(12,2) not null,
  estado           text not null default 'emitida' constraint proformas_estado_check check (estado in ('emitida', 'anulada')),
  motivo_anulacion text,
  -- La factura de Factusol que la recoge (por el codigo en su Referencia).
  factura_id       uuid unique references facturas(id) on delete set null,
  emitida_por      uuid references equipo(id),
  notas            text,
  constraint proformas_numero_unico unique (empresa, anio, mes, numero)
);
comment on table proformas is 'Proforma emitida desde hitos/subhitos. Facturada = tiene factura_id (se enlaza al volcar Factusol por el codigo en la Referencia).';

create table proforma_lineas (
  id           uuid primary key default gen_random_uuid(),
  proforma_id  uuid not null references proformas(id) on delete cascade,
  posicion     smallint not null,
  concepto     text not null,
  base         numeric(12,2) not null
);

create table proforma_linea_hitos (
  proforma_linea_id uuid not null references proforma_lineas(id) on delete cascade,
  hito_cobro_id     uuid not null references hitos_cobro(id),
  importe           numeric(12,2) not null,
  primary key (proforma_linea_id, hito_cobro_id)
);
create index proforma_linea_hitos_hito on proforma_linea_hitos (hito_cobro_id);
create index proformas_oportunidad on proformas (oportunidad_id);

-- LA NUMERACION: al insertar, el siguiente del mes en esa empresa. Con candado
-- por empresa y mes, para que dos a la vez no saquen el mismo numero.
create or replace function proformas_numerar() returns trigger language plpgsql as $$
declare pre text;
begin
  new.anio := extract(year from new.fecha);
  new.mes := extract(month from new.fecha);
  perform pg_advisory_xact_lock(hashtext('proforma:' || new.empresa || ':' || new.anio || ':' || new.mes));
  select coalesce(max(numero), 0) + 1 into new.numero from proformas where empresa = new.empresa and anio = new.anio and mes = new.mes;
  select prefijo_proforma into pre from empresas_emisoras where clave = new.empresa;
  new.codigo := pre || '-PF-' || lpad((new.anio % 100)::text, 2, '0') || '-' || lpad(new.mes::text, 2, '0') || '-' || lpad(new.numero::text, 4, '0');
  return new;
end $$;
create trigger proformas_numerar before insert on proformas for each row execute function proformas_numerar();

alter table proformas enable row level security;
alter table proforma_lineas enable row level security;
alter table proforma_linea_hitos enable row level security;

-- El enlace factura-hito que nace de la proforma (enlazar_proformas.py), distinto del casado del historico.
alter table factura_linea_hitos drop constraint factura_linea_hitos_como_check;
alter table factura_linea_hitos add constraint factura_linea_hitos_como_check check (como = any (array['automatico', 'a_mano', 'proforma']));
comment on column factura_linea_hitos.como is 'Como se enlazo: proforma = la factura cita la proforma en su Referencia de Factusol (lo normal desde 12-oct-2026); automatico = casado del historico; a_mano.';
