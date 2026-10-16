-- QUIEN SOY, DENTRO DEL PASE DEL LOGIN (Monica, 16-oct-2026: "preguntar una vez,
-- en el login, deberia ser mas que suficiente para TODA la app").
--
-- Antes, cada pantalla preguntaba al servicio de login si el pase era bueno y
-- luego a `equipo` quien era, hasta 4 veces por toque (la puerta, el marco, la
-- barra y la pantalla). Ahora la base mete quien eres en el propio pase cuando
-- lo emite (al entrar y cada hora, al renovarlo), y la app solo lo lee y
-- comprueba su firma, sin viajes.
--
-- Lo que lleva el pase, en `yo`: id, nombre, apellidos, correo, funciones
-- vigentes, si ve todo, el nivel en cada area y la cartera comercial que abre.
-- Un cambio de funciones o una baja se notan al renovarse el pase: como mucho
-- en una hora (Monica: ok). Para echar a alguien YA, `cerrar_sesiones` (RRHH).
--
-- Hay que ENCENDER el gancho en el panel: Authentication > Hooks > Customize
-- Access Token (JWT) Claims > Postgres > public.hook_quien_soy.

-- 1) Quien es, en el formato de lib/sesion.ts (tipo Yo). null si no esta en
--    activo: dado de baja, o con la baja ya pasada.
create or replace function public.yo_del_equipo(p_email text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with hoy as (select (now() at time zone 'Europe/Madrid')::date as d),
  e as (
    select e.id, e.nombre, e.apellidos, e.email
      from public.equipo e, hoy
     where e.activo
       and (e.fecha_baja is null or e.fecha_baja >= hoy.d)
       and lower(e.email) = lower(trim(p_email))
     limit 1
  ),
  fn as (
    select f.id, f.clave, f.nombre, f.ve_todo
      from e
      join public.equipo_funciones ef on ef.equipo_id = e.id
      join public.funciones f on f.id = ef.funcion_id, hoy
     where (ef.desde is null or ef.desde <= hoy.d)
       and (ef.hasta is null or ef.hasta >= hoy.d)
  ),
  -- Si dos funciones abren la misma area, gana el nivel mas alto.
  ar as (
    select a.clave,
           (array_agg(fa.nivel order by case fa.nivel when 'supervisar' then 3 when 'trabajar' then 2 else 1 end desc))[1] as nivel
      from fn
      join public.funcion_areas fa on fa.funcion_id = fn.id
      join public.areas a on a.id = fa.area_id
     group by a.clave
  ),
  -- La cartera que abre: la suya si es comercial; si no, la que comparte.
  propia as (
    select c.id, c.nombre from e join public.comerciales c on c.equipo_id = e.id and c.activo limit 1
  ),
  compartida as (
    select c.id, c.nombre
      from e
      join public.relacion_cartera_compartida r on r.equipo_id = e.id
      join public.comerciales c on c.id = r.comercial_id and c.activo
     limit 1
  )
  select jsonb_build_object(
           'id', e.id,
           'nombre', e.nombre,
           'apellidos', e.apellidos,
           'email', e.email,
           'funciones', coalesce((select jsonb_agg(jsonb_build_object('clave', clave, 'nombre', nombre)) from fn), '[]'::jsonb),
           'veTodo', coalesce((select bool_or(ve_todo) from fn), false),
           'areas', coalesce((select jsonb_object_agg(clave, nivel) from ar), '{}'::jsonb),
           'carteraPropia', exists (select 1 from propia),
           'comercial', coalesce(
             (select jsonb_build_object('id', id, 'nombre', nombre) from propia),
             (select jsonb_build_object('id', id, 'nombre', nombre) from compartida)
           )
         )
    from e;
$$;

comment on function public.yo_del_equipo(text) is
  'Quien es (formato Yo de lib/sesion.ts) la persona del equipo en activo con ese correo; null si no tiene acceso.';

revoke execute on function public.yo_del_equipo(text) from authenticated, anon, public;
grant execute on function public.yo_del_equipo(text) to supabase_auth_admin, service_role;

-- 2) El gancho: al emitir el pase, le mete `yo`. Si el correo ya no tiene
--    acceso, no hay pase: ni al entrar ni al renovar.
create or replace function public.hook_quien_soy(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  yo jsonb := public.yo_del_equipo(event->'claims'->>'email');
begin
  if yo is null then
    return jsonb_build_object(
      'error', jsonb_build_object('http_code', 403, 'message', 'Ese correo no tiene acceso a la app de Accesalia.')
    );
  end if;
  return jsonb_set(event, '{claims,yo}', yo);
end;
$$;

comment on function public.hook_quien_soy(jsonb) is
  'Gancho Customize Access Token: mete en el pase quien es (yo_del_equipo); sin acceso, no hay pase.';

revoke execute on function public.hook_quien_soy(jsonb) from authenticated, anon, public;
grant execute on function public.hook_quien_soy(jsonb) to supabase_auth_admin;

-- 3) ECHAR YA (RRHH): cierra todas sus sesiones (no puede renovar el pase) y
--    apunta la hora, para que el pase que aun tenga en la mano (hasta una hora)
--    deje de valer en la puerta de la app.
alter table public.equipo add column if not exists sesion_cerrada_en timestamptz;

comment on column public.equipo.sesion_cerrada_en is
  'Cuando se le echo de la app (RRHH): todo pase emitido antes ya no vale.';

create or replace function public.cerrar_sesiones(p_equipo_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.equipo set sesion_cerrada_en = now() where id = p_equipo_id;
  delete from auth.sessions
   where user_id in (
     select u.id from auth.users u join public.equipo e on lower(e.email) = lower(u.email) where e.id = p_equipo_id
   );
end;
$$;

comment on function public.cerrar_sesiones(uuid) is
  'Echa de la app a esa persona del equipo: borra sus sesiones y apunta sesion_cerrada_en.';

revoke execute on function public.cerrar_sesiones(uuid) from authenticated, anon, public;
grant execute on function public.cerrar_sesiones(uuid) to service_role;
