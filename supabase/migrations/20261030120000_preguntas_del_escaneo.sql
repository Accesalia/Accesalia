-- PREGUNTAR AL COMERCIAL DESDE LA MESA DE VIABILIDADES (Monica, 30-oct-2026, lo
-- que pidio el arquitecto: «esta direccion no esta creada, no puedo avanzar»,
-- «¿tienes un escaneado del patio o del sotano?»).
--
-- La pregunta va a QUIEN MANDO EL POLYCAM (el remitente del escaneo), no al
-- comercial de la opp: muchas veces la opp aun no existe, y a Daniel el Polycam
-- se lo manda Abraham. Copias, las que se elijan al enviar; ninguna por sistema.
--
-- Sale del buzon de TECNICOS con el nombre de quien pregunta, y las respuestas
-- vuelven a tecnicos@: la app lee ese buzon por la API de Gmail y cuelga cada
-- respuesta de su pregunta (por la referencia del correo, no por el asunto).
--
-- 1 · LAS PREGUNTAS Y SUS RESPUESTAS
create table if not exists public.escaneo_preguntas (
  id             uuid primary key default gen_random_uuid(),
  creado_en      timestamptz not null default now(),
  escaneo_id     uuid not null references public.escaneados_polycam(id) on delete cascade,
  autor_id       uuid references public.equipo(id),
  autor          text,
  para           text not null,
  copias         text[] not null default '{}',
  asunto         text not null,
  texto          text not null constraint escaneo_preguntas_texto check (btrim(texto) <> ''),
  -- El Message-ID del correo enviado: las respuestas lo llevan en In-Reply-To.
  id_correo      text not null unique,
  -- El hilo de Gmail en tecnicos@, apuntado la primera vez que se encuentra.
  hilo_gmail     text,
  -- Alex la da por contestada a mano (p. ej. le contestaron por telefono).
  cerrada_en     timestamptz
);
create index if not exists escaneo_preguntas_escaneo on public.escaneo_preguntas (escaneo_id);
comment on table public.escaneo_preguntas is
$$Lo que el arquitecto pregunta a quien mando el Polycam desde la mesa de viabilidades (Monica, 30-oct-2026). Sale de
tecnicos@ y las respuestas se leen de ese buzon.$$;

create table if not exists public.escaneo_respuestas (
  id           uuid primary key default gen_random_uuid(),
  creado_en    timestamptz not null default now(),
  pregunta_id  uuid not null references public.escaneo_preguntas(id) on delete cascade,
  -- El id del mensaje en Gmail: la misma respuesta no se guarda dos veces.
  id_gmail     text not null unique,
  de           text,
  fecha        timestamptz,
  texto        text,
  -- [{nombre, ruta}] en el almacen del Polycam.
  adjuntos     jsonb not null default '[]'
);
create index if not exists escaneo_respuestas_pregunta on public.escaneo_respuestas (pregunta_id);

alter table public.escaneo_preguntas enable row level security;
alter table public.escaneo_respuestas enable row level security;

-- 2 · EL PERMISO DE GOOGLE DE LOS BUZONES DE AREA. Como el del Polycam y los
-- de los comerciales: la llave (refresh token) cifrada en el Vault, una por
-- buzon. Tecnicos es el primero; los demas, pulsar «Conectar» con esa cuenta.
create or replace function public.buzon_area_guardar(p_area text, p_llave text)
returns void
language plpgsql security definer set search_path = public, vault
as $$
declare
  v_id uuid;
  v_nombre text := 'buzon_area_' || p_area;
begin
  if p_area !~ '^[a-z_]+$' then
    raise exception 'area no valida: %', p_area;
  end if;
  select id into v_id from vault.secrets where name = v_nombre;
  if v_id is null then
    perform vault.create_secret(p_llave, v_nombre, 'Permiso de Google (refresh token) del buzon de area ' || p_area || '.');
  else
    perform vault.update_secret(v_id, p_llave);
  end if;
end;
$$;

create or replace function public.buzon_area_llave(p_area text)
returns text
language sql security definer set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'buzon_area_' || p_area limit 1;
$$;

create or replace function public.buzon_area_conectados()
returns text[]
language sql security definer set search_path = public, vault
as $$
  select coalesce(array_agg(substr(name, length('buzon_area_') + 1)), '{}') from vault.secrets where name like 'buzon\_area\_%';
$$;

revoke all on function public.buzon_area_guardar(text, text) from public, anon, authenticated;
revoke all on function public.buzon_area_llave(text) from public, anon, authenticated;
revoke all on function public.buzon_area_conectados() from public, anon, authenticated;
grant execute on function public.buzon_area_guardar(text, text) to service_role;
grant execute on function public.buzon_area_llave(text) to service_role;
grant execute on function public.buzon_area_conectados() to service_role;
