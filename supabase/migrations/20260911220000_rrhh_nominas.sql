-- Nominas de golpe (Monica, 11-sep-2026): se sube el PDF de la gestoria, la
-- app lo lee, se revisa y se publica. Sustituye a iLovePDF, al script de
-- renombrar y a los correos uno a uno.
--
-- Un LOTE es un PDF de la gestoria (un mes). Queda en revision hasta que
-- alguien de RRHH o direccion lo publica. Cada pagina es una NOMINA: de quien
-- es (por DNI, o propuesto por el nombre la primera vez y confirmado a mano),
-- y las cuatro cifras que la app necesita:
--   - liquido: lo que se transfiere (lista de transferencias del mes, y el
--     fichero para el banco). Lo ven RRHH, direccion y el propio empleado;
--   - devengado y coste para la empresa: costes y KPIs. En la app, solo
--     direccion.
-- El resto de la nomina se queda en su PDF: no se copia a la base.

create table if not exists rrhh_nominas_lotes (
  id                 uuid        primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  periodo            date        not null,
  fichero            text        not null,
  paginas            integer     not null,
  estado             text        not null default 'revision',
  subido_por         uuid        references equipo (id),
  publicado_por      uuid        references equipo (id),
  publicado_en       timestamptz,

  constraint rrhh_nominas_lotes_estado_ck check (estado in ('revision', 'publicado', 'descartado'))
);

comment on table rrhh_nominas_lotes is 'Cada PDF de nominas que manda la gestoria (un mes). En revision hasta que RRHH o direccion lo publica.';
comment on column rrhh_nominas_lotes.fichero is 'El PDF original, en el almacen privado rrhh (lotes/...).';

create table if not exists rrhh_nominas (
  id                 uuid          primary key default gen_random_uuid(),
  creado_en          timestamptz   not null default now(),
  actualizado_en     timestamptz   not null default now(),

  lote_id            uuid          not null references rrhh_nominas_lotes (id) on delete cascade,
  pagina             integer       not null,
  persona_id         uuid          references equipo (id),
  casado_por         text,
  dni_leido          text,
  nombre_leido       text,
  periodo            date          not null,
  liquido            numeric(10,2),
  devengado          numeric(10,2),
  coste_empresa      numeric(10,2),
  documento_id       uuid          references rrhh_documentos (id) on delete set null,

  constraint rrhh_nominas_pagina_uq unique (lote_id, pagina),
  constraint rrhh_nominas_casado_ck check (casado_por is null or casado_por in ('dni', 'nombre', 'manual'))
);

comment on table rrhh_nominas is 'Una nomina (una pagina del PDF de la gestoria): de quien es y sus cifras. El PDF de la pagina es un rrhh_documentos de tipo nomina.';
comment on column rrhh_nominas.casado_por is 'Como se supo de quien es: por el DNI de su ficha, propuesto por el nombre (a confirmar) o elegido a mano.';
comment on column rrhh_nominas.liquido is 'Liquido a percibir: lo que se le transfiere ese mes. Lo ven RRHH, direccion y el propio empleado.';
comment on column rrhh_nominas.coste_empresa is 'Coste total para la empresa ese mes, tal como lo calcula la gestoria. Para costes y KPIs: solo direccion.';

create index if not exists idx_rrhh_nominas_persona on rrhh_nominas (persona_id, periodo desc);

do $$
declare t text;
begin
  foreach t in array array['rrhh_nominas_lotes', 'rrhh_nominas'] loop
    execute format('drop trigger if exists trg_set_actualizado_en on %I', t);
    execute format('create trigger trg_set_actualizado_en before update on %I for each row execute function set_actualizado_en()', t);
    execute format('alter table %I enable row level security', t);
    execute format('grant all privileges on table %I to service_role', t);
  end loop;
end $$;
