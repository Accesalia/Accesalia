-- EL ESTADO DE CADA OPP, UNA SOLA VERDAD (Monica, 15-oct-2026).
--
-- La escalera de copys ("lo que nos bloquea") es la verdad: de su paso salen la
-- fase (de las 10), el bloque (de los 4) y la seccion de alertas. Aqui se GUARDA
-- el resultado, para leer rapido; las REGLAS viven en el codigo de la app
-- (lib/cabeceraOpp.ts y lib/pasosEscalera.ts), en un solo sitio. No hay
-- disparadores: la app recalcula una opp tras cada accion, al abrir su ficha y en
-- un barrido nocturno de seguridad.
--
-- Y el HISTORIAL: cada vez que una opp cambia de paso, con su fecha. "Saber en
-- que fecha ha pasado de fase... eso va a ser una maravilla". Lo anterior a hoy se
-- reconstruye con las fechas que ya hay, marcado como reconstruido.

create table if not exists public.estado_oportunidad (
  oportunidad_id uuid primary key references public.oportunidades(id) on delete cascade,
  clave text not null,
  texto text not null,
  extra text,
  fase text,
  bloque integer,
  seccion text,
  accion text,
  desde timestamptz not null,
  desde_reconstruido boolean not null default false,
  calculado_en timestamptz not null default now()
);
comment on table public.estado_oportunidad is
  'El paso de la escalera de cada opp (clave fija + texto), con su fase, bloque, seccion de alertas y desde cuando esta en el. Lo escribe la app (Monica, 15-oct-2026).';
comment on column public.estado_oportunidad.desde is 'Cuando entro en el paso actual. Si desde_reconstruido, se dedujo de fechas antiguas, no se midio.';

create table if not exists public.historial_estado_oportunidad (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid not null references public.oportunidades(id) on delete cascade,
  clave_antes text,
  clave text not null,
  fase_antes text,
  fase text,
  cuando timestamptz not null,
  origen text not null,
  reconstruido boolean not null default false,
  creado_en timestamptz not null default now(),
  constraint historial_estado_oportunidad_origen check (origen in ('accion', 'ficha', 'barrido', 'carga', 'reconstruido'))
);
comment on table public.historial_estado_oportunidad is
  'Cada cambio de paso de una opp, con su fecha: de aqui salen las fechas de entrada y salida de cada fase. origen = quien lo detecto (una accion, abrir la ficha, el barrido, una carga por script, o reconstruido de fechas antiguas).';

create index if not exists estado_oportunidad_fase on public.estado_oportunidad (fase);
create index if not exists estado_oportunidad_seccion on public.estado_oportunidad (seccion);
create index if not exists historial_estado_oportunidad_opp on public.historial_estado_oportunidad (oportunidad_id, cuando);
create index if not exists historial_estado_oportunidad_fase on public.historial_estado_oportunidad (fase, cuando);
alter table public.estado_oportunidad enable row level security;
alter table public.historial_estado_oportunidad enable row level security;
