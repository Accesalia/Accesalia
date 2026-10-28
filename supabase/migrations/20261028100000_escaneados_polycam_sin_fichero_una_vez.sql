-- UN CORREO SIN FICHERO CUENTA UNA SOLA VEZ (Monica, 28-oct-2026: «parar los
-- correos ya, sin falta»).
--
-- La pareja (identificador_correo, nombre_original_fichero) es unica para que
-- una segunda pasada del buzon no guarde dos veces lo mismo. Pero un correo sin
-- adjunto lleva el nombre VACIO, y en Postgres dos vacios no chocan: cada pasada
-- (cada 10 minutos) lo volvia a guardar como nuevo y le volvia a escribir al
-- comercial «falta el escaneo». Desde el 27-oct a las 17:30 Oscar Fernandez
-- recibio unos 140 correos asi («Prueba», «VILLALMANZO 18, MADRID»,
-- «EBANISTERIA 7 MADRID»).
--
-- 1. Fuera las filas repetidas. De cada correo se queda la que ya tiene
--    viabilidad (Alex enlazo una de Villalmanzo) y si no, la primera. Sus
--    vinculos con el portal (relacion_polycam_acceso) se van en cascada; la que
--    se queda tiene el suyo o lo recupera sola en la siguiente pasada.
-- 2. La regla de la tabla NO se toca: endurecerla (NULLS NOT DISTINCT) choca con
--    los historicos de Dropbox, que no tienen correo y repiten nombre de fichero
--    («Cuarto maquinas.glb»). En su lugar, un filtro antes de guardar: si ya hay
--    fila de ese correo sin fichero, la segunda se ignora en silencio. La app
--    recibe "nada guardado" = repetido, marca el correo leido y no reclama.

with orden as (
  select id,
         row_number() over (
           partition by identificador_correo
           order by (viabilidad_id is null), creado_en, id
         ) as n
  from escaneados_polycam
  where nombre_original_fichero is null
    and identificador_correo is not null
)
delete from escaneados_polycam e
using orden o
where e.id = o.id and o.n > 1;

create or replace function escaneados_polycam_sin_fichero_una_vez()
returns trigger
language plpgsql
as $$
begin
  if new.nombre_original_fichero is null
     and new.identificador_correo is not null
     and exists (
       select 1 from escaneados_polycam
       where identificador_correo = new.identificador_correo
         and nombre_original_fichero is null
     ) then
    return null; -- ya estaba: no se guarda otra vez
  end if;
  return new;
end;
$$;

drop trigger if exists escaneados_polycam_sin_fichero_una_vez on escaneados_polycam;
create trigger escaneados_polycam_sin_fichero_una_vez
  before insert on escaneados_polycam
  for each row execute function escaneados_polycam_sin_fichero_una_vez();
