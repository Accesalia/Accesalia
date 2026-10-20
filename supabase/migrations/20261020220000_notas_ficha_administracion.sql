-- LAS NOTAS DE LA FICHA DE UNA ADMINISTRACION (Monica, 20-oct-2026).
--
-- No son el diario (notas_administracion_fincas: lo que va pasando, con el
-- canal por el que nos enteramos). Son lo que hay que saber de una persona, o
-- de la casa, antes de llamarla: "no preguntarle por su mujer, se acaba de
-- divorciar", "su socio se ha llevado media cartera, cuidado", "la cagamos en
-- Berardo Martin con la rampa y esta cabreado". Por eso van aparte (una tabla
-- por mundo de notas) y sin canal.
--
-- FECHA SIEMPRE: "se ha divorciado" es relevante en 2019, no en 2026. Y quien
-- la escribe. La fecha la pone la app al escribirla; no se elige.
--
-- SOLO escribe aqui el "anadir nota" de la ficha. Lo que se apunta desde el
-- diario o el satelite va al diario (o a la ficha de persona, cuando exista).
--
-- Cuelga de UNA cosa: la persona en esa casa (puesto) o la administracion
-- (empresa). El texto suelto de antes (puesto.notas, empresa.notas) no se
-- mueve aqui: se sigue viendo en la ficha como nota "sin fecha", que es la
-- verdad.

create table notas_ficha_administracion (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  puesto_id uuid references puesto(id),
  empresa_id uuid references empresa(id),
  fecha date not null default (now() at time zone 'Europe/Madrid')::date,
  texto text not null,
  autor_id uuid not null references equipo(id),
  autor text not null,
  constraint notas_ficha_admin_un_dueno_ck check ((puesto_id is not null)::int + (empresa_id is not null)::int = 1),
  constraint notas_ficha_admin_texto_ck check (btrim(texto) <> '')
);

create index notas_ficha_administracion_puesto_idx on notas_ficha_administracion (puesto_id);
create index notas_ficha_administracion_empresa_idx on notas_ficha_administracion (empresa_id);

alter table notas_ficha_administracion enable row level security;
