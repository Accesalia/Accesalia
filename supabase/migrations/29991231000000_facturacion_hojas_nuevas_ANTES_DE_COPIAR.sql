-- FACTURACION SOBRE LAS HOJAS NUEVAS — LA MIGRACION DEL DIA, 1 DE 2: ANTES DE COPIAR (Monica, 25-oct-2026: «cero deuda
-- tecnica»). NO SE APLICA HASTA EL DIA DE LA MIGRACION de las hojas viejas a las tablas nuevas (he_*). Va la PRIMERA,
-- antes de la copia de los datos, porque la copia escribe en lo que esta crea. Despues de la copia va la 2 de 2
-- (29991231000050_facturacion_hojas_nuevas_DESPUES_DE_COPIAR.sql) y luego las del hilo comercial (29991231000100-000500).
--
-- 1) Fichas y notas de facturacion dejan de estar obligadas a apuntar a una hoja vieja: las de las hojas nuevas no
--    la tienen. Las notas cuelgan de la LINEA (Monica, 24-oct).
-- 2) Una linea añadida a mano por facturacion (la app se la salto) no esta en la hoja: necesita saber de que version
--    es: lineas_facturacion.he_version_id, SOLO para esas (ok de Monica, 25-oct-2026). La copia la rellena en las
--    fichas sin concepto; las demas llevan he_linea_id.

alter table public.lineas_facturacion alter column hoja_encargo_id drop not null;
alter table public.notas_facturacion alter column hoja_encargo_id drop not null;

-- (2) Con el ok de Monica (25-oct-2026)
alter table public.lineas_facturacion add column he_version_id uuid references public.he_versiones_hoja(id);
