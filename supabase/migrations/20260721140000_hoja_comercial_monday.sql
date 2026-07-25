-- =============================================================================
-- ERP Accesalia — hojas_encargo: comercial interno + quien lo trae (capa Monday)
--
-- La etapa 3 vuelca el board "0 LISTADO DE DIRECCIONES" sobre las hojas. Monday
-- trae dos datos que aun no tienen hueco (lossless, criterio migracion-auditoria):
--   · comercial_interno: quien de Accesalia lo gestiona (Daniel / Carlos / Alvaro).
--   · quien_lo_trae: referente externo que trae el encargo (comisiona).
-- Se guardan a nivel HOJA (la granularidad que da Monday, por fila/encargo). La
-- comision FINA por concepto se modelara en su ventanita; esto solo conserva el dato.
-- =============================================================================

alter table hojas_encargo add column comercial_interno text;
alter table hojas_encargo add column quien_lo_trae text;

comment on column hojas_encargo.comercial_interno is 'Quien de Accesalia gestiona el encargo (Monday "Comercial interno"). Nivel hoja; la comision por concepto se modela aparte.';
comment on column hojas_encargo.quien_lo_trae is 'Referente externo que trae el encargo y comisiona (Monday "0Quien lo trae"). Nivel hoja hasta modelar comision por concepto.';
