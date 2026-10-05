-- YA APLICADA el 3-oct-2026 por el MCP. NO volver a ejecutar.
--
-- `opp_accesos` -> `relacion_oportunidad_accesos`
--
-- Dos cosas en el mismo nombre:
--   * la convencion: habia dos en la base (5 tablas sin prefijo y 2 con
--     `relacion_`). Monica elige `relacion_`.
--   * la palabra: esta decia `opp` y su vecina `oportunidad_tipos` dice
--     `oportunidad`. Una palabra por cosa.
--
-- El renombrado no toca ni un dato: los ids, la clave primaria (opp_id +
-- acceso_id), las dos claves ajenas y los indices van pegados a la tabla.
-- Comprobado antes: ninguna funcion, vista, politica ni trigger la nombra, y
-- en codigo habia UNA linea (lib/altaOportunidad.ts), cambiada en el mismo push.

alter table public.opp_accesos rename to relacion_oportunidad_accesos;

comment on table public.relacion_oportunidad_accesos is
  'Que portales entran en que oportunidad. El vinculo no vive en ninguna de las dos tablas: ni `accesos` tiene opp_id ni `oportunidades` tiene acceso_id. Asi un portal puede estar en varias oportunidades a lo largo del tiempo y una oportunidad tener diez portales.';
