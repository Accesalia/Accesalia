-- EL PARTE DE AYER (Monica, 28-oct-2026: «¿por que no hacerlo real? con la app,
-- la api y conectando con gmail»).
--
-- Sali lee el correo del dia de un comercial (entrada y enviados, los hilos
-- enteros tal como los da Gmail) y prepara su parte. De momento EN PRUEBA: lo
-- lanza direccion a mano desde Gestiones y solo direccion lo ve. Sali no toca
-- nada mas de la app: solo escribe aqui.
--
-- 1) EL PERMISO DE CADA COMERCIAL. Como el del buzon del Polycam: el comercial
--    (o direccion con su cuenta) da permiso una vez, SOLO LECTURA, y la llave que
--    no caduca va CIFRADA al Vault con el nombre correo_comercial_<id>.
-- 2) LOS PARTES. Cada parte guarda el texto que se mando a Sali (los correos tal
--    cual), las instrucciones de ese momento y lo que contesto, para poder
--    compararlos entre modelos y versiones de las instrucciones.

create or replace function public.correo_comercial_guardar(p_comercial uuid, p_llave text)
returns void
language plpgsql security definer set search_path = public, vault
as $$
declare
  v_nombre text := 'correo_comercial_' || p_comercial;
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = v_nombre;
  if v_id is null then
    perform vault.create_secret(p_llave, v_nombre,
      'Permiso de Google (refresh token) del correo de un comercial: solo leer, para el parte de ayer.');
  else
    perform vault.update_secret(v_id, p_llave);
  end if;
end;
$$;

create or replace function public.correo_comercial_llave(p_comercial uuid)
returns text
language sql security definer set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'correo_comercial_' || p_comercial limit 1;
$$;

-- Que comerciales han dado permiso (sin sacar la llave).
create or replace function public.correo_comercial_conectados()
returns setof uuid
language sql security definer set search_path = public, vault
as $$
  select substring(name from 'correo_comercial_(.*)')::uuid from vault.secrets where name like 'correo_comercial_%';
$$;

revoke all on function public.correo_comercial_guardar(uuid, text) from public, anon, authenticated;
revoke all on function public.correo_comercial_llave(uuid) from public, anon, authenticated;
revoke all on function public.correo_comercial_conectados() from public, anon, authenticated;
grant execute on function public.correo_comercial_guardar(uuid, text) to service_role;
grant execute on function public.correo_comercial_llave(uuid) to service_role;
grant execute on function public.correo_comercial_conectados() to service_role;

create table if not exists public.partes_de_ayer (
  id uuid primary key default gen_random_uuid(),
  comercial_id uuid not null references public.comerciales(id),
  dia date not null,
  modelo text not null,
  instrucciones text not null,
  correos text not null,
  hilos integer not null,
  texto text,
  error text,
  input_tokens integer,
  output_tokens integer,
  segundos numeric,
  pedido_por uuid references public.equipo(id),
  creado_en timestamptz not null default now()
);

create index if not exists partes_de_ayer_comercial_dia on public.partes_de_ayer (comercial_id, dia desc);

-- Solo el servidor (lleva correos enteros de clientes).
alter table public.partes_de_ayer enable row level security;
revoke all on public.partes_de_ayer from anon, authenticated;
