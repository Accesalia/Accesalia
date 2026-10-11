-- =============================================================================
-- CONSULTAS DE EDIFICIOS PROTEGIDOS (Monica, 11-oct-2026)
--
-- En Documentacion de referencia, un acceso nuevo: "por municipios, acceso a
-- los pdf o docs que hemos bajado + los enlaces de los que los bajamos + la
-- fecha de bajada y la fecha probable en que habria que revisar si siguen
-- actualizados (6 meses)". Para consultarlos directamente, ademas de que lo
-- extraido salga en las fichas (tabla catalogo_proteccion).
--
-- La misma tabla documentos_referencia: una seccion mas y cuatro columnas que
-- en marketing quedan vacias.
-- =============================================================================

alter table documentos_referencia
  drop constraint documentos_referencia_seccion_check,
  add constraint documentos_referencia_seccion_check check (seccion in ('marketing', 'proteccion')),
  add column municipio    text,
  add column url_origen   text,
  add column descargado_en date,
  add column revisar_en   date;

comment on column documentos_referencia.seccion is 'A que acceso de Documentacion de referencia pertenece: marketing, proteccion (catalogos de edificios protegidos).';
comment on column documentos_referencia.municipio is 'Proteccion: municipio del documento, como en comunidades.municipio (mayusculas, sin tildes).';
comment on column documentos_referencia.url_origen is 'De donde se bajo (la pagina o el PDF oficial), para ir a mirar si sigue vigente.';
comment on column documentos_referencia.descargado_en is 'Dia en que se bajo de url_origen.';
comment on column documentos_referencia.revisar_en is 'Cuando toca mirar si el oficial ha cambiado (por defecto, 6 meses despues de bajarlo).';
