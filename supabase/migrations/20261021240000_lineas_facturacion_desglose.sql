-- LAS LINEAS SON LO CONTRATADO, SE COBRE O NO (Monica, 21-oct-2026): «el fallo no es que exista la tabla conceptos,
-- sino que la tabla de lineas esta incompleta. Deberia incluir las lineas firmadas, diferenciando entre facturables y
-- no, pero recogiendo todos los conceptos firmados».
-- Hasta hoy, al firmar una hoja solo nacia linea de lo que se cobra; lo incluido (la DF, la licencia, el IEE... que van
-- sin coste) se quedaba solo en el papel y nada decia que habia que hacerlo.
--   desglose = 'se_cobra'  lo que se factura: importe o %, con sus hitos (todas las lineas de hasta hoy)
--   desglose = 'incluido'  contratado sin coste: sin importe ni hitos, pero hay que hacerlo
-- La palabra y los valores son los mismos que usa el papel (conceptos_hoja.desglose). Conceptos sigue siendo el papel
-- de cada version (las ofertas, las revisiones); las lineas, lo firmado.

alter table public.lineas_facturacion
  add column desglose text not null default 'se_cobra',
  add constraint lineas_facturacion_desglose_check check (desglose in ('se_cobra', 'incluido'));

comment on column public.lineas_facturacion.desglose is
  'se_cobra = se factura (importe o %, con hitos); incluido = contratado sin coste: sin importe ni hitos, pero hay que hacerlo. Lo que suma dinero o hitos cuenta solo se_cobra (Monica, 21-oct-2026).';

comment on table public.lineas_facturacion is
  'Lo contratado en una hoja FIRMADA, linea a linea, se cobre o no (desglose): lo que se factura (importe fijo o %, con sus hitos; el pagador puede ser una contrata) y lo incluido sin coste, que hay que hacer. El papel de cada version, firmada o no, esta en conceptos_hoja.';
