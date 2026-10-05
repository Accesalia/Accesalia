-- =====================================================================
-- NOTAS DE OPORTUNIDAD Y NOTAS DE SUBVENCION
-- Monica, 4-oct-2026.
--
-- COMO ESTABAN LAS NOTAS: una tabla por mundo, no una tabla con apellido.
-- Tres tablas con el mismo esqueleto (texto, autor, origen) cambiando solo a
-- quien apuntan: notas_administracion_fincas (39 filas), notas_contratas (23) y
-- notas_expediente (0, nunca usada). Faltaba sitio para las de la oportunidad y
-- para las de la subvencion.
--
-- POR QUE LAS DOS CUELGAN DE LA OPORTUNIDAD, y es la distincion importante:
--   "Una cosa es lo que sale de la oportunidad y otra la oportunidad comercial.
--    De una misma oportunidad puede salir un proyecto, una subvencion, una
--    coordinacion, un IEE. No confundamos el TIPO DE COSA que nos contratan con
--    el momento comercial, el hecho comercial del que se deriva. (...) Todo lo
--    que nos contratan viene de alguna gestion comercial de algun tipo, y eso es
--    la oportunidad."
--
-- Una subvencion llega de dos maneras -"o porque la oportunidad ya existe y
-- junto al proyecto nos contratan la subvencion, o porque nos contratan
-- directamente una subvencion como oportunidad propia"-, y en las dos cuelga de
-- la oportunidad. Y no siempre van juntas: "a veces solo el proyecto, a veces
-- solo la subvencion; el 90% las dos, pero no es como la DF y el fin de obra,
-- que siempre van juntos. Esto es opcional".
--
-- Y por que no cuelga de la subvencion: el area de subvenciones esta parada a
-- proposito -"empezamos a modelarla y nos dimos cuenta de que hacia falta tener
-- desarrollada la parte comercial, de oportunidad, de comunidades"-. Hoy
-- 'subvencion_concedida' y 'convocatorias' estan a CERO, y la primera ni
-- siquiera tiene a que comunidad apunta. "Si hay que migrarlo, lo haremos
-- despues, pero de momento asi".
--
-- SE CUELGAN DEL UUID, NO DEL CODIGO LEGIBLE. La oportunidad tiene los dos: el
-- 'id' de Supabase y un 'codigo' SIGLAS-ANO-NNN. Ella: "el codigo del comercial
-- es algo que nos va a servir visualmente para identificarlo, pero lo que de
-- verdad por debajo en fontaneria va a funcionar es el que asigna la base".
-- Ademas el codigo esta VACIO en las 1.228 -se genera de las iniciales del
-- comercial y ninguna tiene comercial-, y puede cambiar; el uuid no.
--
-- LA FECHA DE LA NOTA ES SUYA, NO LA DE LA FILA. Las notas de las fichas traen
-- su propia fecha: "muy a menudo, sobre todo las recientes, empiezan con la
-- fecha dd-mm-aa. Cada fecha, una nota". Una nota de 2019 metida hoy no es una
-- nota de hoy: es la misma distincion que fecha_apertura frente a creado_en.
-- Vacia = la nota no traia fecha.
-- =====================================================================

create table public.notas_oportunidad (
  id             uuid        primary key default gen_random_uuid(),
  oportunidad_id uuid        not null references public.oportunidades(id) on delete cascade,
  fecha          date,
  texto          text        not null,
  autor          text,
  origen         text        not null default 'app',
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint notas_opp_texto_ck  check (btrim(texto) <> ''),
  constraint notas_opp_origen_ck check (origen in ('app','sali','monday','ficha_dropbox'))
);

create table public.notas_subvencion (
  id             uuid        primary key default gen_random_uuid(),
  oportunidad_id uuid        not null references public.oportunidades(id) on delete cascade,
  fecha          date,
  texto          text        not null,
  autor          text,
  origen         text        not null default 'app',
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint notas_subv_texto_ck  check (btrim(texto) <> ''),
  constraint notas_subv_origen_ck check (origen in ('app','sali','monday','ficha_dropbox'))
);

create index notas_oportunidad_por_opp on public.notas_oportunidad (oportunidad_id, fecha desc nulls last);
create index notas_subvencion_por_opp  on public.notas_subvencion  (oportunidad_id, fecha desc nulls last);

create trigger trg_set_actualizado_en before update on public.notas_oportunidad
  for each row execute function public.set_actualizado_en();
create trigger trg_set_actualizado_en before update on public.notas_subvencion
  for each row execute function public.set_actualizado_en();

comment on table public.notas_oportunidad is
  'Notas del hecho comercial: la oportunidad. Lo que se contrata (proyecto, coordinacion, IEE) se deriva de ella.';
comment on table public.notas_subvencion is
  'Notas de la tramitacion de subvenciones. Cuelgan de la OPORTUNIDAD, no de la subvencion: todo lo contratado viene de una gestion comercial.';
comment on column public.notas_oportunidad.fecha is
  'La fecha de la nota, no la de la fila. Vacia = la nota no traia fecha.';
comment on column public.notas_subvencion.fecha is
  'La fecha de la nota, no la de la fila. Vacia = la nota no traia fecha.';
