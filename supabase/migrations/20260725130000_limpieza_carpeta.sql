-- =============================================================================
-- ERP Accesalia — Limpieza: eliminar `carpetas_comerciales` (capa redundante)
--
-- Ya reconciliado a oportunidad-centrico (glosario: oportunidad = encargo). El
-- frontend ya no usa la carpeta (viabilidades/hojas cuelgan de oportunidad_id).
-- Se elimina la capa duplicada. Migracion de limpieza posterior a la aditiva
-- 20260725120000.
-- =============================================================================

alter table viabilidades  drop column if exists carpeta_id;
alter table hojas_encargo drop column if exists carpeta_id;
drop table if exists carpetas_comerciales;
