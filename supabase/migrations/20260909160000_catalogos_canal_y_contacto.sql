-- =============================================================================
-- CANAL y CONTACTO: dos ejes distintos, dos catálogos editables
--
-- Una comunidad tiene ADMINISTRADOR. Una oportunidad tiene ORIGEN y CONTACTO,
-- que puede ser el administrador o no serlo. Y son dos cosas independientes:
--
--   CANAL    = cómo llegó      (boca a boca, puerta fría, campaña de mailing...)
--   CONTACTO = quién nos habló (un vecino, el presidente, el comercial de una
--                               ascensorista, el administrador...)
--
-- Coinciden solo por casualidad: un vecino que llama es canal `boca_a_boca` y
-- contacto `vecino`; "vecino" NO es un canal.
--
-- CATÁLOGO Y NO CHECK, por decisión expresa: "lo dejamos como catálogo editable
-- y veremos con la realidad del día a día cómo crece". Convención del proyecto:
-- vocabulario fijo -> CHECK con nombre; vocabulario vivo -> tabla catálogo.
--
-- EL TIPO DE CONTACTO VA TAMBIÉN EN LA OPORTUNIDAD, no solo en la ficha de la
-- persona. Motivo: es una cifra que se quiere medir ("un 30% de la actividad
-- entra por un comercial de contrata"). Si hubiera que deducirlo mirando a qué
-- tabla apunta cada oportunidad, no se podría agrupar ni contar.
--
-- EXPANDIR, no sustituir: se añaden las columnas nuevas y se rellenan desde las
-- viejas, que se quedan intactas. Retirar las viejas es un paso posterior, y
-- solo cuando todo apunte bien. Mismo patrón que la migración de empresas de
-- agosto. Aquí NO se borra ni se pisa ningún dato.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Catálogo de canales de captación
-- ---------------------------------------------------------------------------
create table if not exists canal_captacion (
  id             uuid        primary key default gen_random_uuid(),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  codigo         text        not null unique,
  nombre         text        not null,
  descripcion    text,
  orden          integer     not null default 100,
  activo         boolean     not null default true
);

comment on table canal_captacion is 'Cómo llegó una oportunidad. Editable: la lista crece con la realidad del día a día. Sistematizado a propósito para poder agrupar y contar por canal sin depender de leer texto libre.';

insert into canal_captacion (codigo, nombre, orden) values
  ('administrador_conocido', 'Administrador conocido',  10),
  ('boca_a_boca',            'Boca a boca',             20),
  ('contrata',               'Contrata',                30),
  ('puerta_fria',            'Puerta fría',             40),
  ('web',                    'Web',                     50),
  ('campana_mailing',        'Campaña de mailing',      60),
  ('otro',                   'Otro',                   900)
on conflict (codigo) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Catálogo de tipos de contacto
--    Una sola lista para los dos mundos: quien nos habla puede estar dentro de
--    la comunidad (vecino, presidente, comisión de obras) o fuera (el
--    administrador, el comercial de una ascensorista).
-- ---------------------------------------------------------------------------
create table if not exists tipo_contacto (
  id             uuid        primary key default gen_random_uuid(),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  codigo         text        not null unique,
  nombre         text        not null,
  descripcion    text,
  orden          integer     not null default 100,
  activo         boolean     not null default true
);

comment on table tipo_contacto is 'Quién nos habló en una oportunidad, y qué papel tiene una persona en su comunidad. Editable. Una sola lista para dentro y fuera de la comunidad, porque lo que se quiere contar es "por quién entra el trabajo".';

insert into tipo_contacto (codigo, nombre, orden) values
  ('administrador_fincas', 'Administrador de fincas',        10),
  ('comercial_contrata',   'Comercial de contrata',          20),
  ('presidente',           'Presidente',                     30),
  ('vicepresidente',       'Vicepresidente',                 40),
  ('secretario',           'Secretario',                     50),
  ('comision_obras',       'Comisión de obras',              60),
  ('vecino',               'Vecino',                         70),
  ('otro',                 'Otro',                          900)
on conflict (codigo) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Enganchar la oportunidad a los dos catálogos (columnas nuevas, nullables)
-- ---------------------------------------------------------------------------
alter table oportunidades
  add column if not exists canal_id         uuid references canal_captacion (id),
  add column if not exists tipo_contacto_id uuid references tipo_contacto (id);

comment on column oportunidades.canal_id is 'Cómo llegó. Sustituye a tipo_origen, que se conserva hasta que todo apunte aquí.';
comment on column oportunidades.tipo_contacto_id is 'Quién nos habló. Aquí y no solo en la ficha de la persona, para poder contar por dónde entra el trabajo.';

-- Rellenar el canal desde el tipo_origen que ya había.
update oportunidades o
   set canal_id = c.id
  from canal_captacion c
 where o.canal_id is null and c.codigo = o.tipo_origen;

create index if not exists idx_oportunidades_canal    on oportunidades (canal_id);
create index if not exists idx_oportunidades_contacto on oportunidades (tipo_contacto_id);

-- ---------------------------------------------------------------------------
-- 4. Lo mismo para las personas de la comunidad. El texto `rol` NO se toca.
-- ---------------------------------------------------------------------------
alter table personas_comunidad
  add column if not exists tipo_contacto_id uuid references tipo_contacto (id);

comment on column personas_comunidad.tipo_contacto_id is 'Papel de esta persona en su comunidad, del catálogo editable. Sustituye a la columna de texto `rol`, que se conserva hasta que todo apunte aquí.';

update personas_comunidad p
   set tipo_contacto_id = t.id
  from tipo_contacto t
 where p.tipo_contacto_id is null and t.codigo = p.rol;

create index if not exists idx_personas_comunidad_tipo on personas_comunidad (tipo_contacto_id);

-- ---------------------------------------------------------------------------
-- 5. RLS, trigger y permisos de las dos tablas nuevas
-- ---------------------------------------------------------------------------
alter table canal_captacion enable row level security;
alter table tipo_contacto   enable row level security;

drop trigger if exists trg_set_actualizado_en on canal_captacion;
create trigger trg_set_actualizado_en before update on canal_captacion
  for each row execute function set_actualizado_en();
drop trigger if exists trg_set_actualizado_en on tipo_contacto;
create trigger trg_set_actualizado_en before update on tipo_contacto
  for each row execute function set_actualizado_en();

grant all privileges on table canal_captacion to service_role;
grant all privileges on table tipo_contacto   to service_role;
