-- =============================================================================
-- ERP Accesalia — versiones_hoja: texto crudo de importes/forma de pago (Monday)
--
-- Monday columna "0 IMPORTES Y FORMA DE PAGO" (619/678 con dato real, formato
-- libre tipo "5500 pry + css + 1980 subv + 3% éxito"). Es materia prima de
-- FACTURACION/rentabilidad, pero desglosarla a numeros limpios (importe por
-- concepto, IVA, % exito) merece disenarse como area de facturacion. Aqui solo
-- CAPTURAMOS el texto crudo (lossless) para no perderlo ni re-extraer; el parseo
-- estructurado vendra con esa area. El link al PDF firmado va a url_pdf_hoja
-- (campo ya existente).
-- =============================================================================

alter table versiones_hoja add column importes_forma_pago_texto text;

comment on column versiones_hoja.importes_forma_pago_texto is 'Texto crudo de importes+forma de pago desde Monday (lossless). Pendiente de desglosar a la tabla de facturacion (importe/concepto, IVA, % exito). No usar como importe limpio.';
