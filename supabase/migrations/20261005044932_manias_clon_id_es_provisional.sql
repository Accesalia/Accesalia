-- Monica, 5-oct-2026: "la clon la eliminaremos, no quedara ahi para siempre. Al
-- final el id sera el de la opp, cuando exista". Se deja dicho en la columna.
comment on column public.manias_organismos.clon_id is
  'PROVISIONAL. Solo mientras la carpeta no tenga oportunidad: su fila de la tabla-clon. La clon se eliminara; el enlace definitivo es oportunidad_id. Al pasar la fila a produccion se rellena oportunidad_id buscando por aqui. on delete restrict: no se puede borrar una fila de la clon que aun tenga manias sin reenganchar.';
