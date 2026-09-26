-- El campo viejo del respeto de cartera: apuntaba a `tipos_servicio`, que
-- nunca se lleno, y lo sustituye `servicio_reservado` (ascensor | sate |
-- ascensor_y_sate). Dejarlo seria tener dos columnas para lo mismo.
-- La tabla esta vacia: no se pierde ningun dato.
--
-- APLICADA EN PRODUCCION el 26-sep-2026.
alter table public.administracion_origen drop column if exists servicio_reservado_id;
