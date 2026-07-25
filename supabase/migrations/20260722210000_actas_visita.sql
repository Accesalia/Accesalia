-- =============================================================================
-- ERP Accesalia — OBRA capa 2 (Paso 1): ACTAS DE VISITA generadas en la app
--
-- La propietaria genera el acta DENTRO de la app (como las hojas de encargo):
-- fotos + informe escrito -> plantilla auto-rellena -> (firma tablet y email en
-- pasos siguientes). Se reforma el esqueleto de fase 1 (visitas_obra) y se anaden
-- las fotos, la lista de "a informar" y la cadencia. NO es la puerta documental
-- generica (eso es otro sprint): solo la rebanada de fotos de actas.
-- =============================================================================

-- ---- 1. visitas_obra: autor -> equipo; +envio (para el chivato "acta sin enviar") ----
alter table visitas_obra drop constraint if exists visitas_obra_autor_tecnico_id_fkey;
alter table visitas_obra
  add constraint visitas_obra_autor_equipo_fkey foreign key (autor_tecnico_id) references equipo(id);
alter table visitas_obra alter column texto_acta drop not null;   -- se puede crear en borrador
alter table visitas_obra
  add column enviada boolean not null default false,
  add column fecha_enviada date;
comment on column visitas_obra.autor_tecnico_id is 'Tecnico (equipo) que hace la visita / la DF. Repuntado de tecnicos a equipo.';
comment on column visitas_obra.enviada is 'Si el acta ya se envio a los implicados. El chivato: acta sin enviar pasado el dia siguiente.';

-- ---- 2. Fotos del acta (varias por visita, con pie) ----
create table fotos_acta (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  visita_id uuid not null references visitas_obra(id) on delete cascade,
  storage_path text not null,      -- ruta en el bucket 'actas'
  orden integer not null default 0,
  pie text
);
comment on table fotos_acta is 'Fotos de una visita de obra (bucket actas). Se muestran en la galeria del acta generada.';
create index idx_fotos_acta_visita on fotos_acta(visita_id);
alter table fotos_acta enable row level security;

-- ---- 3. Lista "a informar de las visitas" por comunidad ----
create table destinatarios_informe (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  comunidad_id uuid not null references comunidades(id) on delete cascade,
  tipo text not null default 'otro',   -- contrata | administrador | presidente | otro
  nombre text,
  email text not null,
  activo boolean not null default true,
  constraint destinatarios_informe_tipo_check
    check (tipo in ('contrata', 'administrador', 'presidente', 'otro'))
);
comment on table destinatarios_informe is 'A quien se informa de las visitas de una comunidad (contrata, administrador, presidente, otros). Alimenta el envio del acta.';
create index idx_destinatarios_informe_comunidad on destinatarios_informe(comunidad_id);
create trigger trg_set_actualizado_en before update on destinatarios_informe for each row execute function set_actualizado_en();
alter table destinatarios_informe enable row level security;

-- ---- 4. Cadencia esperada de visitas (para la alerta de "muy espaciadas") ----
alter table obras add column cadencia_dias integer;   -- dias esperados entre visitas
comment on column obras.cadencia_dias is 'Dias esperados entre visitas de obra, para avisar si se espacian demasiado. Nulo = sin cadencia definida.';

-- ---- 5. Bucket de Storage para las fotos de actas (publico para mostrarlas) ----
insert into storage.buckets (id, name, public)
values ('actas', 'actas', true)
on conflict (id) do nothing;
