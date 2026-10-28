-- EL PERMISO DE GOOGLE DEL BUZON DEL POLYCAM (Monica, 28-oct-2026: «correcto,
-- hagamoslo asi»).
--
-- La app bajaba los correos por IMAP con la contraseña de aplicacion, y Gmail
-- entrega por ahi los adjuntos grandes tan despacio que un .glb de 30 MB no baja
-- en un minuto: los Polycam de Oscar del 26-oct se quedaron atascados. Ahora
-- entra por la API de Gmail, que los da de golpe, y de paso baja los enlaces de
-- Drive en que Gmail convierte lo que pasa de 25 MB.
--
-- Para eso el buzon da permiso UNA VEZ desde la app (direccion, boton «Conectar
-- el buzon con Google»), y Google devuelve una llave que no caduca (refresh
-- token). Esa llave va CIFRADA en el Vault, como los certificados de firma: sin
-- tabla nueva, y solo el servidor la puede leer.

create or replace function public.buzon_google_guardar(p_llave text)
returns void
language plpgsql security definer set search_path = public, vault
as $$
declare
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'buzon_polycam_google';
  if v_id is null then
    perform vault.create_secret(p_llave, 'buzon_polycam_google',
      'Permiso de Google (refresh token) del buzon del Polycam: leer y marcar sus correos y bajar sus enlaces de Drive.');
  else
    perform vault.update_secret(v_id, p_llave);
  end if;
end;
$$;

create or replace function public.buzon_google_llave()
returns text
language sql security definer set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'buzon_polycam_google' limit 1;
$$;

revoke all on function public.buzon_google_guardar(text) from public, anon, authenticated;
revoke all on function public.buzon_google_llave() from public, anon, authenticated;
grant execute on function public.buzon_google_guardar(text) to service_role;
grant execute on function public.buzon_google_llave() to service_role;
