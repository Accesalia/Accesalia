-- =============================================================================
-- ERP Accesalia — Liberar etapas_proyecto.tipo_etapa (catalogo vivo)
--
-- La fuente de verdad de los pasos es `pasos_catalogo` (editable por mejora
-- continua). Un CHECK sobre tipo_etapa obligaria a tocar el esquema cada vez que
-- se anade un paso -> se retira. El vocabulario viejo de fase 1 (estado_actual,
-- redaccion_proyecto, mediciones_presupuesto, certificado_energetico, visado_coam,
-- solicitud_licencia, concesion_licencia) queda como referencia, no como candado.
-- =============================================================================
alter table etapas_proyecto drop constraint if exists etapas_proyecto_tipo_etapa_check;
