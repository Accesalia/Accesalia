-- EL BLOQUE «OTRO» (Monica, 24-oct-2026): «Nada encaja, lo pongo a mano». Para los casos excepcionales del generador
-- (humedades, cobrar la viabilidad de Effic...) y, en la migracion, para lo de antes que no cuadre con ningun bloque
-- (su texto de siempre va en he_lineas_compromisos.texto). Es un cuarto grupo: ni proyecto, ni documento tecnico, ni
-- servicio. Pide LOS MISMOS datos que los demas (que es, si sale en el papel, si se cobra, cuanto y como), escritos a
-- mano y sin nada por defecto, para que a facturacion le llegue todo igual. Sin area: a quien le toca, se vera.

alter table public.bloques drop constraint bloques_naturaleza_check;
alter table public.bloques add constraint bloques_naturaleza_check check (naturaleza = any (array['proyecto', 'servicio', 'documento_tecnico', 'otro']));

insert into public.bloques (codigo, nombre, nombre_corto, activo, naturaleza, desglose, suelto, orden, va_a_tecnico, va_a_faro, texto_plantilla)
values ('OTRO', 'OTRO', 'Otro', true, 'otro', 'se_cobra', true, 999, false, false, null);
