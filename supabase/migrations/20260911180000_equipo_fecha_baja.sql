-- Alta y baja de empleados desde RRHH (Monica, 11-sep-2026: "no hay forma de
-- dar de alta a un empleado nuevo o de dar de baja a alguien a quien
-- despedimos").
--
-- La baja lleva FECHA: el ultimo dia que trabaja. Puede ser futura (un fin de
-- contrato el dia 30): hasta ese dia sigue dentro, y al dia siguiente se queda
-- fuera de la app el solo, sin que nadie tenga que acordarse. Por eso "en
-- activo" pasa a ser: activo y sin fecha de baja pasada. Lo miran el guardian
-- de la app, el login y el gancho de alta de usuarios.
--
-- El motivo (despido, baja voluntaria, fin de contrato...) solo lo ven RRHH y
-- direccion.

alter table equipo
  add column if not exists fecha_baja  date,
  add column if not exists motivo_baja text;

comment on column equipo.fecha_baja is 'Ultimo dia que trabaja. Desde el dia siguiente deja de estar en activo y pierde el acceso a la app. Nulo = sigue.';
comment on column equipo.motivo_baja is 'Por que se va (despido, baja voluntaria, fin de contrato, jubilacion...). Solo lo ven RRHH y direccion.';

-- El gancho de alta de usuarios del login mira tambien la fecha de baja.
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
       and (fecha_baja is null or fecha_baja >= (now() at time zone 'Europe/Madrid')::date)
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

grant execute on function public.hook_solo_equipo(jsonb) to supabase_auth_admin;
revoke execute on function public.hook_solo_equipo(jsonb) from authenticated, anon, public;
