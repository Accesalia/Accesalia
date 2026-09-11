-- Solo se da de alta en el login quien es del equipo EN ACTIVO (Monica, 11-sep-2026).
--
-- Supabase crea el usuario la primera vez que alguien pide el enlace o entra
-- con Google. La app ya solo manda el enlace a correos del equipo, pero
-- cualquiera podria pedirselo a Supabase directamente, saltandose la app. Este
-- gancho ("Before User Created") lo corta en la raiz: si el correo no esta en
-- `equipo` con activo = true, Supabase no crea el usuario.
--
-- Hay que ENCENDERLO en el panel: Authentication > Hooks > Before User Created >
-- Postgres > public.hook_solo_equipo. Sin encender no hace nada.
--
-- Cuando entren administradores, comunidades y contratas, se ampliara aqui.

create or replace function public.hook_solo_equipo(event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.equipo
     where activo
       and lower(email) = lower(trim(event->'user'->>'email'))
  ) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object(
    'error', jsonb_build_object(
      'message', 'Ese correo no tiene acceso a la app de Accesalia.',
      'http_code', 403
    )
  );
end;
$$;

comment on function public.hook_solo_equipo(jsonb) is
  'Gancho Before User Created: solo crea usuarios de login para correos del equipo en activo.';

grant execute on function public.hook_solo_equipo(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_solo_equipo(jsonb) from authenticated, anon, public;
