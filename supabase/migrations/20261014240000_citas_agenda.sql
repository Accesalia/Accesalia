-- LA AGENDA: SUS CITAS (Monica, 14-oct-2026). El primer hueco de la agenda de la
-- app, que hoy aun no existe: "lo que no tiene donde vivir, hay que crearle hueco;
-- si se tiene que leer, se tiene que poder escribir antes".
--
-- La primera cita es la VISITA DE ESCANEO con Polycam: la cierra el comercial
-- (llamar, quedar con alguien que abra...), con fecha Y HORA, porque va a la
-- agenda. Una por opp: si se cambia, se sobrescribe, sin historial. Por defecto
-- 90 minutos: 30 ir, 30 hacer, 30 volver.
--
-- La agenda de la app MANDA (decidido el 9-oct): las citas viven aqui con todo lo
-- suyo; a Google se copia solo la cita y un enlace, en un sentido
-- (google_evento_id, vacio hasta montar la copia). Lo de Google se lee, no se
-- guarda.
--
-- Los tipos de cita son una lista viva (Daniel tiene un calendario por tipo:
-- oficina, comercial calle, junta de vecinos, ayuntamiento...): tabla catalogo.

create table if not exists public.tipos_cita (
  clave text primary key,
  nombre text not null,
  minutos_defecto integer not null check (minutos_defecto > 0),
  activo boolean not null default true,
  creado_en timestamptz not null default now()
);
comment on table public.tipos_cita is 'Los tipos de cita de la agenda, con su duracion por defecto (Monica, 14-oct-2026).';

insert into public.tipos_cita (clave, nombre, minutos_defecto)
values ('escaneo_polycam', 'Escaneo Polycam', 90)
on conflict (clave) do nothing;

create table if not exists public.citas (
  id uuid primary key default gen_random_uuid(),
  tipo text not null references public.tipos_cita(clave),
  oportunidad_id uuid references public.oportunidades(id),
  inicio timestamptz not null,
  minutos integer not null check (minutos > 0),
  asunto text not null check (btrim(asunto) <> ''),
  de_quien uuid references public.equipo(id),
  apuntada_por uuid references public.equipo(id),
  google_evento_id text,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
comment on table public.citas is 'La agenda de la app: cada cita con su hora y su duracion. Manda sobre Google (Monica, 9 y 14-oct-2026).';
comment on column public.citas.de_quien is 'En la agenda de quien sale: quien va.';
comment on column public.citas.google_evento_id is 'El evento copiado a Google (app -> Google, un sentido). Vacio hasta montar la copia.';

-- Una sola visita de escaneo por opp: se sobrescribe.
create unique index if not exists citas_un_escaneo_por_opp on public.citas (oportunidad_id) where tipo = 'escaneo_polycam';
create index if not exists citas_inicio on public.citas (inicio);
create index if not exists citas_de_quien_inicio on public.citas (de_quien, inicio);

alter table public.tipos_cita enable row level security;
alter table public.citas enable row level security;
