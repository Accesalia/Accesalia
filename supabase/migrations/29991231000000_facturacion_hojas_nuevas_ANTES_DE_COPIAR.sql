-- FACTURACION SOBRE LAS HOJAS NUEVAS — LA MIGRACION DEL DIA, 1 DE 2: ANTES DE COPIAR (Monica, 25-oct-2026: «cero deuda
-- tecnica»). NO SE APLICA HASTA EL DIA DE LA MIGRACION de las hojas viejas a las tablas nuevas (he_*). Va la PRIMERA,
-- antes de la copia de los datos, porque la copia escribe en lo que esta crea. Despues de la copia va la 2 de 2
-- (29991231000050_facturacion_hojas_nuevas_DESPUES_DE_COPIAR.sql) y luego las del hilo comercial (29991231000100-000500).
--
-- UNA SOLA CASILLA «DE QUE HOJA ES» (Monica, 25-oct-2026: «reaprovechar la casilla de siempre»). Las fichas de
-- facturacion, las notas de facturacion y las lineas de presupuesto ya dicen de que hoja son (hoja_encargo_id). La hoja
-- no cambia: cambia su casa. Esa casilla esta atada a la tabla vieja de hojas, asi que antes de copiar se le quita la
-- atadura; la copia escribe en ella la hoja en su casa nueva (he_versiones_hoja), y despues de copiar (la 2 de 2) se
-- ata a la tabla nueva y pasa a llamarse he_version_id. No hay casilla nueva ni dos casillas para lo mismo.
-- Las notas pueden ser solo de una linea o de un hito (sin hoja): esa casilla deja de ser obligatoria en las notas.

alter table public.lineas_facturacion drop constraint lineas_facturacion_hoja_encargo_id_fkey;
alter table public.notas_facturacion drop constraint notas_facturacion_hoja_encargo_id_fkey;
alter table public.presupuesto_lineas drop constraint presupuesto_lineas_hoja_encargo_id_fkey;
alter table public.notas_facturacion alter column hoja_encargo_id drop not null;
