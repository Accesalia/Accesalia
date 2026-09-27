-- LO QUE SE PUEDE CONTRATAR DIRECTAMENTE (Monica, 27-sep-2026).
--
-- En "que quieren" solo debe salir lo que un cliente pide de verdad. El resto
-- —el visado, el fin de obra, los tres presupuestos— acompaña a un proyecto,
-- no se pide suelto, y llenaba la lista de ruido.
--
-- Los agrupadores quedan fuera por su cuenta (elegible = false).

alter table tipos_proyecto add column if not exists contratable boolean not null default false;
comment on column tipos_proyecto.contratable is 'Se puede contratar directamente: es lo que sale en "que quieren" de una oportunidad.';

update tipos_proyecto set contratable = true where clave in (
  -- obras
  'ascensor','cota_cero','cambio_puertas','cambio_cabina','anadir_parada','rampa','plataforma',
  'sate','sate_fachada','cubierta','arreglo_fachada','arreglo_cubierta',
  'memoria_valorada','otro',
  -- servicios y documentos que si se contratan sueltos
  'subvenciones','caes','iee','lee','pericial','consulta_urbanistica','css','df'
);

-- Acompañan, no se piden: CFO, toma de datos, licencia, 3 presupuestos,
-- financiacion, visado, CEE (nunca suelto) y el paquete de doc tecnica.
update tipos_proyecto set contratable = false where clave in (
  'cfo','toma_datos_3d','licencia','tres_presupuestos','financiacion','visado_colegio','cee','doc_tecnica_subv'
);
