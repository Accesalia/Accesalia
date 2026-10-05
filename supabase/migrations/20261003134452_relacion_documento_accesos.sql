-- YA APLICADA el 3-oct-2026 por el MCP. NO volver a ejecutar.
--
-- `documento_accesos` -> `relacion_documento_accesos`. Misma convencion que
-- `relacion_oportunidad_accesos`. Comprobado antes: 0 filas, 0 referencias en
-- codigo, y ninguna funcion, vista, politica ni trigger la nombra. El
-- renombrado no toca ni la clave primaria ni las dos claves ajenas.
--
-- Que guarda, con las palabras de Monica que estan en el comentario de la
-- tabla: "el tecnico no quiere Genil 5, quiere Genil 5 A". Y cuando el asunto
-- del correo no dice la escalera, el documento se vincula a TODAS las de esa
-- direccion: "entre por donde entre, encontrare el escaneo".

alter table public.documento_accesos rename to relacion_documento_accesos;
