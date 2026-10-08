-- YA APLICADA el 8-oct-2026 por el MCP. NO volver a ejecutar.
--
-- LLAMADAS (Monica, 8-oct-2026). "Apunto primero, pienso despues": quien coge
-- el telefono escribe lo que le cuentan mientras se lo cuentan, y quien llama y
-- de que direccion se trata los teclea como palabras sueltas. La app le propone
-- con quien y con que casan, y se elige DESPUES. Lo escrito se guarda siempre,
-- tal cual, elija o no.
--
-- La llamada nace 'por_colocar'. Colocarla (al diario que toque, una opp nueva,
-- un aviso, una cita...) es la segunda pantalla, que esta sin pensar todavia.
-- La llamada original no se borra nunca: es el rastro de donde salio la nota.

create table public.llamadas (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  -- Quien la apunto y cuando. La hora es la de guardar: se apunta mientras se habla.
  apuntada_por uuid not null references public.equipo(id),
  recibida_en timestamptz not null default now(),

  -- 1. ¿Que me dicen?
  que_dicen text not null,

  -- 2. Quien llama: lo escrito, y lo elegido entre las propuestas (si se eligio).
  quien_texto text,
  quien_puesto_id uuid references public.puesto(id),
  quien_persona_id uuid references public.persona(id),
  quien_persona_comunidad_id uuid references public.personas_comunidad(id),
  quien_nuevo boolean not null default false,

  -- 3. De que direccion: lo escrito, y lo elegido.
  donde_texto text,
  donde_comunidad_id uuid references public.comunidades(id),
  donde_oportunidad_id uuid references public.oportunidades(id),
  donde_nueva boolean not null default false,

  -- 4. Sobre que area del estudio.
  area text constraint llamadas_area_check check (area in (
    'comercial', 'visita_escaneado', 'proyecto', 'requerimientos', 'licencias', 'visados',
    'obra', 'subvenciones', 'iee', 'caes', 'presupuestos', 'facturacion'
  )),

  estado text not null default 'por_colocar'
    constraint llamadas_estado_check check (estado in ('por_colocar', 'colocada', 'archivada'))
);

create index llamadas_estado_idx on public.llamadas (estado, recibida_en desc);

alter table public.llamadas enable row level security;

comment on table public.llamadas is
  'Llamadas recibidas, apuntadas al vuelo (Monica, 8-oct-2026). Lo escrito se conserva siempre; lo elegido (persona, direccion) se enlaza aparte. Nace por_colocar.';
comment on column public.llamadas.quien_nuevo is
  'Marcado como persona nueva, por crear: no se crea durante la llamada; lo da de alta quien coloca.';
comment on column public.llamadas.donde_nueva is
  'Marcada como direccion nueva, por crear.';
comment on column public.llamadas.area is
  'Lista cerrada de Monica (8-oct-2026). presupuestos = los 3 presupuestos de contratas.';
