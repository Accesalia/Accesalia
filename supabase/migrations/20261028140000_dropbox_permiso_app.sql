-- EL PERMISO DE LA APP EN EL DROPBOX (Monica, 28-oct-2026).
--
-- Los enlaces de la ficha comercial a las carpetas antiguas apuntaban a la ruta
-- tal como la ve Daniel (dropbox.com/home/D SM/Ascensores y rehabilitaciones/…),
-- y «D SM» es SU carpeta de miembro: nadie mas la tiene y Dropbox lo rechazaba.
-- Ahora la app crea un enlace de esa carpeta SOLO PARA EL EQUIPO y lo abre: vale
-- sea cual sea la cuenta del equipo con la que se mire (Daniel o tecnicos).
--
-- La app «Accesalia CRM» (consola de Dropbox, cuenta de Daniel) solo tiene
-- permiso para ver nombres y crear enlaces: nada de leer, subir ni borrar
-- ficheros. Daniel da el permiso una vez desde Gestiones; la llave que no caduca
-- (refresh token) va CIFRADA en el Vault, como la del buzon del Polycam.

create or replace function public.dropbox_guardar(p_llave text)
returns void
language plpgsql security definer set search_path = public, vault
as $$
declare
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'dropbox_app';
  if v_id is null then
    perform vault.create_secret(p_llave, 'dropbox_app',
      'Permiso de la app Accesalia CRM en el Dropbox (refresh token): ver nombres y crear enlaces para el equipo.');
  else
    perform vault.update_secret(v_id, p_llave);
  end if;
end;
$$;

create or replace function public.dropbox_llave()
returns text
language sql security definer set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'dropbox_app' limit 1;
$$;

revoke all on function public.dropbox_guardar(text) from public, anon, authenticated;
revoke all on function public.dropbox_llave() from public, anon, authenticated;
grant execute on function public.dropbox_guardar(text) to service_role;
grant execute on function public.dropbox_llave() to service_role;
