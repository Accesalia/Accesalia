-- EL AREA DE CADA BLOQUE (Monica, 14-oct-2026, su Excel "esquema de bloques y
-- areas", Hoja2). Para dos cosas: el generador enseña los bloques agrupados por
-- area ("ahora es un mar de palabras") y, despues, cada bloque contratado abre
-- su trabajo en su area. CEE va en proyecto (es parte de la redaccion; con
-- subvenciones lo arrastra la documentacion tecnica).

alter table public.bloques add column if not exists area text;
alter table public.bloques add constraint bloques_area_check
  check (area is null or area in ('PRY', 'OBR', 'SUBV', 'IEE', 'CAES', 'FIN', '3PPTOS'));
comment on column public.bloques.area is 'A que area de trabajo pertenece: PRY, OBR, SUBV, IEE, CAES, FIN, 3PPTOS.';

update public.bloques b set area = a.area
from (values
  ('TOMA DE DATOS Y MODELADO 3D', 'PRY'), ('REDACCION PROYECTO', 'PRY'), ('VISADO', 'PRY'), ('TRAMITACION LICENCIAS', 'PRY'),
  ('CEE', 'PRY'), ('MEDICIONES Y CIEGO', 'PRY'), ('MEMORIA TECNICA', 'PRY'), ('INFORME PERICIAL', 'PRY'),
  ('CONSULTA URBANISTICA', 'PRY'), ('MODIFICACION DE PROYECTO', 'PRY'),
  ('CSS', 'OBR'), ('INICIO DE OBRA', 'OBR'), ('DF', 'OBR'), ('CERTIFICADO FIN DE OBRA', 'OBR'),
  ('TRAMITACION SUBVENCIONES', 'SUBV'), ('DOCUMENTACION TECNICA SUBVENCIONES', 'SUBV'),
  ('IEE', 'IEE'), ('LEE', 'IEE'),
  ('GESTION DE CAES', 'CAES'),
  ('SOLICITUD DE FINANCIACION', 'FIN'),
  ('TRAMITACION 3 PRESUPUESTOS', '3PPTOS')
) as a(codigo, area)
where b.codigo = a.codigo;
