-- Los datos de Accesalia como ORDENANTE de las transferencias de las nominas
-- (Monica, 11-sep-2026): con ellos la app arma el fichero de transferencias
-- SEPA (XML, pain.001) que se sube a CaixaBankNow, una transferencia por
-- persona con el liquido de su nomina.
--
-- Una sola fila (id = 1). Los datos NO van en el codigo ni en la migracion: se
-- ponen desde la app (o a mano en la base), y los ven y cambian RRHH y
-- direccion.

create table if not exists rrhh_empresa (
  id              integer     primary key default 1,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),

  razon_social    text,
  nif             text,
  sufijo          text        not null default '000',
  iban_nominas    text,
  bic             text,

  constraint rrhh_empresa_una_fila_ck check (id = 1),
  constraint rrhh_empresa_sufijo_ck check (sufijo ~ '^[0-9A-Z]{3}$')
);

comment on table rrhh_empresa is 'Accesalia como ordenante de las transferencias de nominas (fichero SEPA para el banco). Una sola fila. Lo ven y cambian RRHH y direccion.';
comment on column rrhh_empresa.sufijo is 'Sufijo del ordenante que da el banco junto al NIF (identificador NIF + sufijo). Casi siempre 000.';
comment on column rrhh_empresa.iban_nominas is 'Cuenta de Accesalia desde la que se pagan las nominas.';

drop trigger if exists trg_set_actualizado_en on rrhh_empresa;
create trigger trg_set_actualizado_en before update on rrhh_empresa for each row execute function set_actualizado_en();
alter table rrhh_empresa enable row level security;
grant all privileges on table rrhh_empresa to service_role;
