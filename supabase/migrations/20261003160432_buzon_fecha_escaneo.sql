-- ===========================================================================
-- BUZON POLYCAM: LA FECHA DEL ESCANEO
-- (Monica, 3-oct-2026)
--
-- 1. LA FECHA DEL ESCANEO. Es la "fecha de visita" del informe de viabilidad
--    ("la fecha que se hizo el escaneo"), y "es importante". Polycam la pone en
--    el NOMBRE del fichero, dia_mes_año: 15_9_2026.zip, 2_10_2026.glb. El .glb
--    por dentro no trae ninguna fecha. Y NO vale la del correo: llegan reenvios
--    meses despues (Cristo de la Victoria 129: escaneado el 9-jun, reenviado en
--    octubre). Por eso son DOS columnas:
--       fecha           -> cuando llego el correo (estaba vacia en todas: el
--                          buzon no la guardaba; se arregla en el codigo)
--       fecha_escaneo   -> cuando se hizo el escaneo, del nombre del fichero
--
-- 2. LA LIMPIEZA NO VA AQUI. Monica pidio borrar cuatro filas que no son
--    escaneos (tres correos de Google y un aviso de Polycam sin escaneo, de
--    cuando se abrio el buzon el 2-oct). La proteccion de borrado en produccion
--    lo freno dos veces desde el asistente, asi que lo hace ella desde el editor
--    SQL de Supabase. Ids: 63e883b8-2182-424a-8b1d-678c356dd26a,
--    65ca41bd-128d-4e20-9afc-0f531a9760d3, 16196c4c-c83d-4105-9559-2bda3d3e0f9f,
--    15f5f686-ef6b-4682-909b-bfd368d28b99.
-- ===========================================================================

begin;

alter table escaneados_polycam add column if not exists fecha_escaneo date;

comment on column escaneados_polycam.fecha_escaneo is
  'El dia que se HIZO el escaneo: la fecha de visita de la viabilidad. Sale del '
  'nombre que pone Polycam al fichero (dia_mes_año). Distinta de `fecha`, que es '
  'cuando llego el correo: los reenvios llegan meses despues.';

update escaneados_polycam
   set fecha_escaneo = make_date(m[3]::int, m[2]::int, m[1]::int)
  from (select id, regexp_match(nombre_original_fichero, '^(\d{1,2})[_-](\d{1,2})[_-](\d{4})') m
          from escaneados_polycam) x
 where x.id = escaneados_polycam.id and x.m is not null and fecha_escaneo is null;

commit;
