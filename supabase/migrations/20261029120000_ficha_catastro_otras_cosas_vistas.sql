-- LO QUE VIMOS EN LA VISITA, la cuarta pregunta (Monica, 29-oct-2026): «otras cosas que vimos», texto libre,
-- en el mismo sitio y del mismo modo que el ascensor, el portal y los patios: firmado con quien y cuando.
alter table ficha_catastro
  add column if not exists otras_vistas text,
  add column if not exists otras_vistas_en timestamptz,
  add column if not exists otras_vistas_por uuid references equipo(id) on delete set null;
