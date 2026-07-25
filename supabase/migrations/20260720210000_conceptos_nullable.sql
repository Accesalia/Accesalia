-- =============================================================================
-- ERP Accesalia — conceptos_hoja: tipo_concepto e importe opcionales
--
-- Tras enlazar conceptos_hoja al catalogo (bloque_id), tipo_concepto queda
-- superado por el bloque. Y el importe viene del presupuesto (Factusol), no
-- siempre disponible al crear el concepto (ej. import desde el Excel de seleccion).
-- Se relajan ambos a NULLABLE para no meter valores falsos.
-- =============================================================================

alter table conceptos_hoja alter column tipo_concepto drop not null;
alter table conceptos_hoja alter column importe drop not null;

comment on column conceptos_hoja.tipo_concepto is 'Opcional/legacy: la clasificacion del concepto la da bloque_id (catalogo). Se conserva por compatibilidad.';
comment on column conceptos_hoja.importe is 'Importe del concepto. Nullable: procede del presupuesto (Factusol); no siempre disponible al crear (ej. import Excel de seleccion).';
