-- =============================================================================
-- ERP Accesalia — lineas_facturacion: origen + verificado
--
-- La pasada completa se hace parseando el texto de importes de Monday (basto pero
-- cubre las 590). Los PDFs firmados (fuente de verdad) verifican por lotes, poco
-- a poco. Este campo distingue lo estimado de lo confirmado.
--   origen: monday_texto | pdf | manual
--   verificado: true cuando viene/comprobado con el PDF firmado.
-- =============================================================================

alter table lineas_facturacion add column origen text not null default 'manual';
alter table lineas_facturacion add column verificado boolean not null default false;

comment on column lineas_facturacion.origen is 'De donde sale la linea: monday_texto (estimado), pdf (fuente de verdad), manual.';
comment on column lineas_facturacion.verificado is 'True cuando el importe/desglose esta confirmado con el PDF firmado.';

-- El piloto ya insertado viene de los PDFs -> verificado.
update lineas_facturacion set origen = 'pdf', verificado = true;
