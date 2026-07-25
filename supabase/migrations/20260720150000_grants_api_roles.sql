-- =============================================================================
-- ERP Accesalia — Grants para los roles de la API (service_role)
--
-- En el stack LOCAL de Supabase los roles de la API reciben los privilegios por
-- defecto; en la NUBE, las tablas creadas por migracion no quedan accesibles para
-- service_role sin concederselo explicitamente (da 42501 "permission denied").
--
-- La app usa la clave service_role desde el servidor (RLS activo sin politicas,
-- que service_role puentea). Aqui garantizamos el acceso a nivel de tabla.
-- Idempotente.
-- =============================================================================

grant usage on schema public to service_role;

grant all privileges on all tables    in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- Que las tablas/sequences futuras tambien queden accesibles.
alter default privileges in schema public grant all on tables    to service_role;
alter default privileges in schema public grant all on sequences to service_role;
alter default privileges in schema public grant all on functions to service_role;
