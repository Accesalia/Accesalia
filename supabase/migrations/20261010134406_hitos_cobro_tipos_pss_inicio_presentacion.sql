-- Tipos de hito nuevos (Monica, 10-oct-2026): estaban como 'otro' pero el texto de la hoja dice el momento.
--   pss          a la firma del acta del Plan de Seguridad y Salud (61)
--   inicio_obra  al inicio de la obra (43)
--   presentacion a la presentacion de la solicitud de subvencion (21)
-- Los pactados por fecha siguen 'otro' con su fecha en fecha_prevista (94 rellenadas leyendolas una a una:
-- scripts/facturacion/hitos_tipo_y_fecha.py).
alter table public.hitos_cobro drop constraint hitos_cobro_hito_check;
alter table public.hitos_cobro add constraint hitos_cobro_hito_check
  check (hito in ('firma', 'encargo', 'entrega', 'licencia', 'pss', 'inicio_obra', 'cfo', 'presentacion', 'concesion', 'otro'));
comment on column public.hitos_cobro.hito is
  'El momento del cobro: firma | encargo | entrega (del proyecto) | licencia | pss (firma del acta del Plan de Seguridad y Salud) | inicio_obra | cfo | presentacion (de la solicitud de subvencion) | concesion | otro (los pactados por fecha: su fecha va en fecha_prevista).';
