-- ===========================================================================
-- EL ALMACEN DE LAS TARJETAS DEL CIF   (Monica, 2-oct-2026)
--
-- Nombre suyo: `tarjeta-cif`.
--
-- POR QUE UNO PROPIO Y NO `documentos-comerciales`. La tarjeta del CIF no es un
-- documento comercial: no es la viabilidad, ni la hoja de encargo, ni el
-- presupuesto. Es un documento DE LA COMUNIDAD, y se usa en facturacion, en
-- subvenciones y en licencia. Metiendolo en la caja comercial habria que abrir
-- esa caja a gente que no tiene por que ver lo comercial.
--
-- PRIVADO. Un NIF es un dato identificativo de un tercero. No se sirve con una
-- URL publica: se firma un enlace que caduca, como el de Polycam.
--
-- SIN TOPE DE TAMANO NI LISTA DE TIPOS a proposito: las tarjetas llegan como PDF
-- de la AEAT (30 KB), como escaneo de 5 MB, y hay jpg, png y hasta un bmp. Poner
-- una lista de tipos aqui solo serviria para que un dia rebote una tarjeta buena.
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('tarjeta-cif', 'tarjeta-cif', false, null, null)
on conflict (id) do nothing;
