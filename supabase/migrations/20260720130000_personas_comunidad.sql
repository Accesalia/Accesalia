-- =============================================================================
-- ERP Accesalia — Personas de comunidad (contacto cuando NO es el administrador)
--
-- Caso RARO pero real: a veces el interlocutor comercial no es el administrador
-- de fincas sino un VECINO / PRESIDENTE de la comunidad (tipicamente comunidades
-- autogestionadas sin administrador, o un vecino proactivo que empuja la obra).
--
-- Se modela como entidad ligera colgando de la comunidad (no toca el nucleo
-- admin-centrico ni la cartera). La oportunidad puede apuntar a esta persona como
-- interlocutor cuando no hay administrador (oportunidades.administrador_id ya es
-- nullable para ese caso).
--
-- Convenciones: espanol sin tildes/enes; PK uuid; creado_en/actualizado_en;
-- SIN ENUMS (text + CHECK nombrado); indices en FKs; RLS sin politicas; trigger
-- set_actualizado_en reutilizado.
-- =============================================================================

create table personas_comunidad (
  id                     uuid        primary key default gen_random_uuid(),
  creado_en              timestamptz not null default now(),
  actualizado_en         timestamptz not null default now(),
  comunidad_id           uuid        not null references comunidades (id),
  nombre                 text        not null,
  rol                    text        not null default 'vecino',
  telefono               text,
  email                  text,
  es_contacto_principal  boolean     not null default false,
  notas                  text,
  constraint personas_comunidad_rol_check
    check (rol in ('presidente','vicepresidente','secretario','vecino','otro'))
);

comment on table personas_comunidad is 'Personas de la comunidad como CONTACTO comercial cuando no es el administrador de fincas (presidente, vecino proactivo...). Caso raro; tipico en comunidades autogestionadas. Cuelga de la comunidad; no forma parte de la cartera de administradores.';
comment on column personas_comunidad.rol is 'presidente | vicepresidente | secretario | vecino | otro.';
comment on column personas_comunidad.es_contacto_principal is 'true = interlocutor principal de la comunidad cuando no hay administrador.';
comment on column personas_comunidad.notas is 'Texto libre.';

create index idx_personas_comunidad_comunidad_id on personas_comunidad (comunidad_id);

-- Enlace opcional desde la oportunidad: interlocutor vecino cuando no hay admin.
alter table oportunidades
  add column persona_comunidad_id uuid references personas_comunidad (id);

comment on column oportunidades.persona_comunidad_id is 'Interlocutor de la comunidad (vecino/presidente) cuando el contacto comercial NO es un administrador. Nullable; se usa junto con administrador_id nullable (comunidad autogestionada).';

create index idx_oportunidades_persona_comunidad_id on oportunidades (persona_comunidad_id);

-- RLS + trigger actualizado_en
alter table personas_comunidad enable row level security;

drop trigger if exists trg_set_actualizado_en on public.personas_comunidad;
create trigger trg_set_actualizado_en
  before update on public.personas_comunidad
  for each row execute function set_actualizado_en();
