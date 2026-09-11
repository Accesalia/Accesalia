-- Marcal es de Daniel (Monica, 11-sep-2026): "Marcal es prestada, si o si. Si
-- esta como suya, se cambia: es de Dani". Alvaro lleva algunas direcciones
-- sueltas de Marcal (las "prestadas" del Excel de su cartera), pero la
-- administracion es de Daniel. Las tres Marcal pasan a Daniel: Leganes y
-- Colmenar Viejo estaban a nombre de Alvaro, y Castilla-La Mancha sin comercial.
--
-- Lo "prestado" (direccion concreta que lleva otro comercial) aun no esta
-- modelado a nivel de comunidad; los proyectos si dicen quien los lleva.

do $$
declare n int;
begin
  update empresa
     set comercial_id = (select id from comerciales where nombre = 'Daniel')
   where nombre_accesalia ilike 'MARCAL ASESORES%';
  get diagnostics n = row_count;
  if n <> 3 then raise exception 'Esperaba 3 Marcal, han salido %', n; end if;
end $$;
