-- La cartera de Carlos Garcia pasa entera a Alvaro (Monica, 11-sep-2026):
-- "todas las de Carlos pasan a Alvaro. No hay excepciones". Carlos se fue en
-- enero de 2026.
--
-- Solo cambia quien LLEVA cada administracion (empresa.comercial_id). Quien la
-- trajo (comercial_captador_id) no se toca: esta vacio en las 21 y no se sabe.
-- Los 61 proyectos de Carlos tampoco se tocan aqui: el que los trajo sigue
-- siendo el, porque el historial cuenta la verdad.

do $$
declare n int;
begin
  update empresa
     set comercial_id = (select id from comerciales where nombre = 'Alvaro')
   where comercial_id = (select id from comerciales where nombre = 'Carlosg');
  get diagnostics n = row_count;
  if n <> 21 then raise exception 'Esperaba 21 administraciones de Carlos, han salido %', n; end if;
end $$;
