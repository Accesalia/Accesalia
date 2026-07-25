-- PUENTE interaccion <-> comunidad (punteros, NO copias).
--
-- El "diario comercial" (texto crudo dictado) vive UNA sola vez en interacciones.
-- Una misma nota puede tocar VARIAS comunidades (un cafe con el administrador
-- Gomez menciona 3 fincas): copiar el texto a cada una seria triplicar y no
-- sabriamos a cual pertenece. En su lugar, esta tabla guarda solo el par de IDs.
--
-- Asi cada "zona" es una VENTANA, no un almacen:
--   - Diario comercial      = interacciones filtradas por comercial_id (el origen).
--   - Zona administrador     = interacciones por administrador_id.
--   - Expediente de comunidad= interacciones unidas por este puente.
-- El crudo, una vez; lo extraido (oportunidad/tarea/resumen) ya vive en su tabla.

create table if not exists interaccion_comunidad (
  interaccion_id uuid not null references interacciones (id) on delete cascade,
  comunidad_id   uuid not null references comunidades (id)  on delete cascade,
  creado_en      timestamptz not null default now(),
  origen         text not null default 'ia' check (origen in ('ia', 'humano')),
  primary key (interaccion_id, comunidad_id)
);

comment on table interaccion_comunidad is
  'Puente N:M interaccion<->comunidad (solo punteros). Permite que el expediente de una comunidad muestre las interacciones que la mencionan SIN duplicar el texto crudo, que vive una sola vez en interacciones.';

create index if not exists idx_interaccion_comunidad_comunidad on interaccion_comunidad (comunidad_id);
