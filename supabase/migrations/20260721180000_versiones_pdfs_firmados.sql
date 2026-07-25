-- =============================================================================
-- ERP Accesalia — versiones_hoja.pdfs_firmados: coleccion de PDFs firmados
--
-- Un encargo firmado puede tener VARIOS PDFs (219/678 tienen 2+; hasta 5): son
-- distintos documentos firmados del mismo edificio (conceptos distintos firmados
-- a la vez). url_pdf_hoja guarda el primero (compatibilidad listado); aqui van
-- TODOS, para mostrarlos como coleccion en el detalle.
-- =============================================================================

alter table versiones_hoja add column pdfs_firmados text[];

comment on column versiones_hoja.pdfs_firmados is 'Coleccion de links a PDFs firmados (Drive/Docs). Un encargo puede firmar varios documentos a la vez. url_pdf_hoja = el primero.';
