-- YA APLICADA el 8-oct-2026 por el MCP. NO volver a ejecutar.
-- Ademas, ese dia Monica ejecuto en el editor SQL (la herramienta no deja borrar columnas):
--   alter table public.lineas_facturacion drop column pagador_contrata_id;
--
-- Estado SIN CONCILIAR (Monica, 8-oct-2026: "me encanta"). Los plazos de cobro de las hojas firmadas
-- historicas se crean desde lo leido en el papel, pero si estan cobrados lo sabe Factusol, no la hoja.
-- Crearlos 'pendiente' haria creer a la app que se debe todo (avisos falsos: lo que paso con la carga de
-- julio). 'sin_conciliar' = el plazo existe, aun no se ha cruzado con Factusol; al cruzarlo pasa a
-- cobrado / facturado / pendiente.
alter table public.hitos_cobro drop constraint hitos_cobro_estado_check;
alter table public.hitos_cobro add constraint hitos_cobro_estado_check
  check (estado in ('sin_conciliar', 'pendiente', 'facturado', 'cobrado', 'devuelto', 'anulado'));
comment on column public.hitos_cobro.estado is
  'sin_conciliar (creado desde la hoja, sin cruzar con Factusol) -> pendiente -> facturado -> cobrado; reversibles: devuelto (cargo devuelto por banco) y anulado (factura de abono).';
