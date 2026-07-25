-- =============================================================================
-- ERP Accesalia — hojas_encargo.descripcion (tipo de proyecto / actuacion)
--
-- Texto libre que describe la ACTUACION concreta de la hoja (Monday/Excel
-- "TIPOPROYECTO": "instalacion de ascensor", "reparacion de cornisa", "sustitucion
-- de 2 ascensores"...). Mas rico que los conceptos (bloques, el "que se factura");
-- esto es el "que obra/servicio es". Mina de oro para la IA que lo interpretara.
-- =============================================================================

alter table hojas_encargo add column descripcion text;

comment on column hojas_encargo.descripcion is 'Texto libre de la actuacion de la hoja (Excel/Monday TIPOPROYECTO). Describe la obra/servicio concreto ("instalacion de ascensor", "reparacion de cornisa"...). Materia prima para la IA.';
