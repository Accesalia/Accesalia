-- PLANTILLAS DE MAIL (Monica, 12-oct-2026): los textos con los que el area
-- comercial escribe a las comunidades desde la app. Se ven, se crean y se
-- retocan desde el menu comercial; una nueva pide solo nombre (para que es),
-- asunto y texto.
create table plantillas_correo (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  asunto          text not null,
  texto           text not null,
  activa          boolean not null default true,
  creado_por      uuid references equipo(id),
  creado_en       timestamptz not null default now(),
  actualizado_por uuid references equipo(id),
  actualizado_en  timestamptz not null default now()
);
comment on table plantillas_correo is 'Plantillas de los correos que se envian desde la app a las comunidades. nombre = para que es.';
create trigger trg_set_actualizado_en before update on plantillas_correo for each row execute function set_actualizado_en();
alter table plantillas_correo enable row level security;

-- Generales y personales (Monica, 12-oct-2026): "cada comercial puede querer
-- tener alguna especifica a su gusto". Sin dueño = general, para todos.
alter table plantillas_correo add column propietario_id uuid references equipo(id);
comment on column plantillas_correo.propietario_id is 'De quien es la plantilla personal. Vacio = general, la ven todos.';
