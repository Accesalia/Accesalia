-- ===========================================================================
-- EL NOMBRE CORTO DE CADA BLOQUE   (2-oct-2026)
--
-- Monica, al ver la maqueta del catalogo: si. Es la etiqueta que marca el
-- comercial al generar una hoja ("CSS", "Licencias"); el titulo largo que sale
-- en la hoja sigue siendo la primera linea del texto. Se rellenan los 19 (los
-- retirados tambien, para que se lean en su lista) con los nombres de la
-- maqueta; ella los cambia desde la pantalla de gestion.
-- ===========================================================================

alter table bloques add column nombre_corto text;
comment on column bloques.nombre_corto is
  'La etiqueta que marca el comercial al generar una hoja ("CSS", "Licencias"). El titulo largo que sale en la hoja es la primera linea de texto_plantilla.';

update bloques b set nombre_corto = v.corto, actualizado_en = now()
from (values
  ('TOMA DE DATOS Y MODELADO 3D','Toma de datos y 3D'),
  ('REDACCION PROYECTO','Redacción proyecto'),
  ('TRAMITACION LICENCIAS','Licencias'),
  ('TRAMITACION 3 PRESUPUESTOS','3 presupuestos'),
  ('CERTIFICADO FIN DE OBRA','Fin de obra (CFO)'),
  ('CSS','CSS'),
  ('TRAMITACION SUBVENCIONES','Subvenciones'),
  ('IEE','IEE'),
  ('LEE','Libro del edificio'),
  ('CEE','CEE'),
  ('DF','Dirección facultativa'),
  ('MEMORIA TECNICA','Memoria técnica'),
  ('INFORME PERICIAL','Informe pericial'),
  ('CONSULTA URBANISTICA','Consulta urbanística'),
  ('TRAMITACION SUBVENCIONES ACCESIBILIDAD','Subvenciones accesibilidad'),
  ('TRAMITACION SUBVENCIONES EFICIENCIA ENERGETICA','Subvenciones eficiencia'),
  ('SOLICITUD DE FINANCIACION','Solicitud de financiación'),
  ('SATE CON CESION DE CAES','SATE con cesión de CAES'),
  ('SATE + ASCENSOR CON CESION DE CAES','SATE + ascensor con CAES')
) as v(codigo, corto)
where b.codigo = v.codigo;

-- FRENO: los 19 con su nombre corto, ni uno menos.
do $$
declare n int; t int;
begin
  select count(*) filter (where nombre_corto is not null), count(*) into n, t from bloques;
  if n <> t or t <> 19 then
    raise exception 'Esperaba los 19 bloques con nombre corto y salen % de %. Nada escrito.', n, t;
  end if;
end $$;
