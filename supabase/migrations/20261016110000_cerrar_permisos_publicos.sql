-- CERRAR LO QUE QUEDABA ABIERTO A LOS ROLES PUBLICOS (Monica, 16-oct-2026: "lo
-- de la seguridad es CRITICO").
--
-- Revision del 16-oct: ni la clave publica (anon) ni un pase de usuario
-- (authenticated) pueden leer, escribir ni borrar filas: RLS sin politicas y
-- sin SELECT/INSERT/UPDATE/DELETE. PERO les quedaba TRUNCATE (vaciar una tabla
-- entera, que RLS no frena) en TODAS las tablas. Hoy la API no lo expone; aun
-- asi era una puerta abierta. Se cierra todo: la app lee y escribe solo desde
-- el servidor, con la clave secreta (service_role), y eso no cambia.
--
-- Las funciones NO se tocan: todas las que pueden ejecutar los roles publicos
-- son "security invoker" (corren con los permisos de quien llama, que no ve
-- ninguna tabla), y quitar el permiso a PUBLIC romperia las de pg_trgm y
-- btree_gist, que viven en public y usan el buscador y un indice.
--
-- Y lo que se cree a partir de ahora nace igual de cerrado.
--
-- El almacen: 'actas' era publico (vacio, y su codigo, lib/visita.ts, no lo usa
-- ninguna pantalla): pasa a privado. 'catalogo-venta' sigue publico a proposito:
-- son los modelos 3D genericos del catalogo de venta, sin datos de nadie.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

update storage.buckets set public = false where id = 'actas';
