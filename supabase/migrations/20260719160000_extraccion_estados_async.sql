-- =============================================================================
-- ERP Accesalia — extracciones_convocatoria: estados para el flujo asincrono
--
-- La extraccion de una convocatoria (prompt 1) tarda ~2 min: no cabe en el ciclo
-- request/response de una edge (tope ~150s). La edge arranca el trabajo y
-- responde al instante con estado='procesando'; el trabajo corre en segundo
-- plano (EdgeRuntime.waitUntil) y al terminar pasa a 'borrador' (o 'error').
-- Anadimos esos dos estados al check.
-- =============================================================================
alter table extracciones_convocatoria drop constraint extracciones_convocatoria_estado_check;
alter table extracciones_convocatoria add constraint extracciones_convocatoria_estado_check
  check (estado in ('procesando', 'borrador', 'en_revision', 'validada', 'descartada', 'error'));
