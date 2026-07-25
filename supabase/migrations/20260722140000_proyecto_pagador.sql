-- =============================================================================
-- ERP Accesalia — proyectos.pagador (quien paga)
--
-- Del tablero 4 de Monday ("2 QUIEN PAGA"): CDAD (comunidad) / FAIN / SCHINDLER /
-- ROEN / ELECNOR / TKE... Dato clave para prevision de tesoreria y como contexto
-- en el panel por fase. Se guarda el crudo (CDAD se muestra como "Comunidad").
-- La facturacion lo enlazara con contratas mas adelante.
-- =============================================================================
alter table proyectos add column pagador text;
comment on column proyectos.pagador is 'Quien paga (crudo de Monday "2 QUIEN PAGA"): CDAD=comunidad, o el nombre de la contrata (FAIN/SCHINDLER/ROEN/ELECNOR...).';
