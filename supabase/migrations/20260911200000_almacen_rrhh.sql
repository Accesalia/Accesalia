-- Almacen de ficheros de RRHH (Monica, 11-sep-2026).
--
-- Va APARTE del archivo comun de comunidades, proyectos y obras: sus
-- documentos (DNI de empleados, contratos, nominas, reconocimientos medicos)
-- no circulan a otras areas y son los mas delicados de la casa. Mismo
-- mecanismo, muro propio.
--
-- PRIVADO y SIN politicas: nadie lo lee ni lo escribe salvo el servidor de la
-- app (clave secreta). La app decide quien sube que y, para abrir un fichero,
-- genera un enlace que caduca en un minuto. Los ficheros suben directos del
-- navegador con un permiso de un solo uso que da la app.
--
-- Rutas: personas/<persona_id>/<tipo>/<fichero> para lo de cada uno, y
-- empresa/<tipo>/<fichero> para lo de toda la plantilla (convenio,
-- calendario, normativa). La fila de cada fichero vive en rrhh_documentos.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'rrhh', 'rrhh', false, 26214400,
  array[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/heic',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
on conflict (id) do nothing;
