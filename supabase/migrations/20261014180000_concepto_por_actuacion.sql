-- UN PROYECTO POR ACTUACION (Monica, 14-oct-2026). Con rampa, fotovoltaica y
-- aerotermia en la cabecera, la redaccion de proyecto da TRES lineas (o un
-- proyecto conjunto que las agrupa), no una. Cada concepto de un bloque de
-- proyecto dice de que actuacion es: su tipo de proyecto. Es el tipo y no la
-- fila de actuaciones_hoja porque esas se rehacen enteras en cada version, y los
-- conceptos de una version firmada no pueden quedarse apuntando a nada.
-- Visado y licencia van una vez por hoja aunque haya varios proyectos.

alter table public.conceptos_hoja
  add column if not exists tipo_proyecto_id uuid references public.tipos_proyecto(id);
comment on column public.conceptos_hoja.tipo_proyecto_id is
  'De que actuacion es la linea (su tipo de proyecto): un bloque de proyecto da una linea por actuacion.';
