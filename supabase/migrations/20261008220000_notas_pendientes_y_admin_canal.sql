-- =====================================================================
-- LA BANDEJA DE NOTAS PENDIENTES, Y FECHA Y CANAL EN LAS DEL ADMINISTRADOR
-- Monica, 8-oct-2026.
--
-- Una nota del comercial es TEXTO + SITIO donde engancharla, siempre: "si no,
-- acabamos con notas huerfanas que nadie recupera jamas". El sitio es la
-- oportunidad o, si no hay oportunidad, la persona del administrador.
--
-- 1. NOTAS PENDIENTES. Cuando la direccion escrita no esta en la lista, la app
--    pregunta: "No la encuentro. ¿Es nueva o la marco para revisar despues?".
--    "Revisar" la deja AQUI, con lo que se escribio tal cual, hasta que su
--    propio comercial la coloque al llegar a la oficina ("ellos se lo guisan,
--    ellos se lo comen"). Nunca se crea nada por sistema: pudo escribirse mal,
--    y se duplicarian direcciones y apodos.
--    Son notas comerciales: confidenciales, como las de la oportunidad.
--
-- 2. Las notas del administrador (notas_administracion_fincas) reciben lo mismo
--    que las de la oportunidad: cuando paso y como nos enteramos.
-- =====================================================================

create table public.notas_pendientes (
  id                         uuid        primary key default gen_random_uuid(),
  creado_en                  timestamptz not null default now(),
  actualizado_en             timestamptz not null default now(),

  autor_id                   uuid        not null references public.equipo(id),
  texto                      text        not null,
  fecha                      date,
  canal                      text,

  -- lo que se escribio y no se encontro
  donde_texto                text,
  quien_texto                text,
  -- la persona, si se pudo elegir de la lista (una como mucho)
  quien_puesto_id            uuid references public.puesto(id),
  quien_persona_id           uuid references public.persona(id),
  quien_persona_comunidad_id uuid references public.personas_comunidad(id),

  estado                     text        not null default 'pendiente',
  colocada_en                timestamptz,
  nota_oportunidad_id        uuid references public.notas_oportunidad(id),
  nota_administracion_id     uuid references public.notas_administracion_fincas(id),

  constraint notas_pend_texto_ck  check (btrim(texto) <> ''),
  constraint notas_pend_canal_ck  check (canal in ('visita','llamada','mail','escrito','interno')),
  constraint notas_pend_estado_ck check (estado in ('pendiente','colocada')),
  constraint notas_pend_algo_ck   check (coalesce(btrim(donde_texto), '') <> '' or coalesce(btrim(quien_texto), '') <> ''),
  constraint notas_pend_un_quien_ck check (
    (quien_puesto_id is not null)::int + (quien_persona_id is not null)::int + (quien_persona_comunidad_id is not null)::int <= 1
  ),
  constraint notas_pend_colocada_ck check (
    estado = 'pendiente' or (colocada_en is not null and (nota_oportunidad_id is not null or nota_administracion_id is not null))
  )
);

create index notas_pendientes_autor_idx on public.notas_pendientes (autor_id, creado_en desc) where estado = 'pendiente';

create trigger trg_set_actualizado_en before update on public.notas_pendientes
  for each row execute function public.set_actualizado_en();

comment on table public.notas_pendientes is
  'Notas del comercial que no encontraron su sitio: la direccion (o la persona) escrita no estaba en la lista y se marco "revisar despues". Las coloca su propio comercial; nunca se crea nada por sistema (Monica, 8-oct-2026). Confidenciales, como las de la oportunidad.';
comment on column public.notas_pendientes.donde_texto is 'La direccion tal cual se escribio, sin encontrarla en la lista.';
comment on column public.notas_pendientes.quien_texto is 'La persona tal cual se escribio, si no se encontro en la lista.';
comment on column public.notas_pendientes.estado is 'pendiente -> colocada (al pasar a la nota de la oportunidad o del administrador). No se borra: queda el rastro.';

alter table public.notas_administracion_fincas
  add column fecha date,
  add column canal text;

alter table public.notas_administracion_fincas
  add constraint notas_af_canal_ck check (canal in ('visita','llamada','mail','escrito','interno')),
  -- Las 30 de antes de hoy no tienen canal y no se les inventa uno.
  add constraint notas_af_persona_canal_ck check (origen <> 'persona' or canal is not null or creado_en < '2026-10-09');

comment on column public.notas_administracion_fincas.fecha is 'Cuando paso, no cuando se grabo. Vacia en lo antiguo.';
comment on column public.notas_administracion_fincas.canal is
  'Como nos enteramos: visita, llamada, mail, escrito, interno. Obligatorio en las nuevas escritas por una persona; las 30 de antes de hoy no lo tienen.';
