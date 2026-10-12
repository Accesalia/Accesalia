-- CORREOS ENVIADOS DESDE LA APP (Monica, 12-oct-2026). El registro de lo que se
-- manda a una comunidad desde su oportunidad: cuando, a quien, asunto, cuerpo y
-- ENLACES a los documentos adjuntos (los ficheros no se duplican: estan en el
-- almacen, y Gmail ya guarda el correo en Enviados). Sale del buzon comercial con
-- el nombre del comercial de la oportunidad, y las respuestas van a su correo.
-- Cada envio deja ademas su nota en el diario de la oportunidad.
create table correos_enviados (
  id               uuid primary key default gen_random_uuid(),
  oportunidad_id   uuid references oportunidades(id) on delete set null,
  enviado_por      uuid references equipo(id),
  en_nombre_de     uuid references comerciales(id),
  remitente_nombre text not null,
  responder_a      text,
  para             text[] not null,
  asunto           text not null,
  cuerpo           text not null,
  documentos       jsonb not null default '[]'::jsonb,
  plantilla_id     uuid references plantillas_correo(id),
  ok               boolean not null,
  error            text,
  nota_id          uuid,
  creado_en        timestamptz not null default now()
);
comment on table correos_enviados is 'Correos enviados desde la app a una comunidad: a quien, que y con que documentos (enlaces, no ficheros). Gmail guarda la copia en Enviados.';
comment on column correos_enviados.documentos is 'Los adjuntos: [{tipo, id, nombre, enlace}]. El enlace abre el PDF en la app.';
create index correos_enviados_opp on correos_enviados (oportunidad_id, creado_en desc);
create index correos_enviados_quien on correos_enviados (en_nombre_de, creado_en desc);
alter table correos_enviados enable row level security;
