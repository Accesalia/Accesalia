-- Dos decisiones de Monica (11-sep-2026):
--
-- 1. Los proyectos de Carlos Garcia los lleva Alvaro: "Carlos no va a llevar
--    ninguno". Cambia quien los LLEVA (comercial_id, el responsable) en los 61.
--    Quien los TRAJO (comercial_captador_id) sigue siendo Carlos: el historial
--    cuenta la verdad, y de ahi sale a quien correspondia la comision.
--    Van los 61 y no solo "los abiertos" porque el estado que hay hoy es el de
--    la fase de proyecto tecnico: "listo" no quiere decir cerrado.
--
-- 2. Daniel entra con un Gmail nuevo, abierto para eso: danielcrm.accesalia@gmail.com.
--    danieldesotoarquitecto@gmail.com es casi comunitario y no vale para entrar
--    como el.

do $$
declare n int;
begin
  update proyectos
     set comercial_id = (select id from comerciales where nombre = 'Alvaro')
   where comercial_id = (select id from comerciales where nombre = 'Carlosg');
  get diagnostics n = row_count;
  if n <> 61 then raise exception 'Esperaba 61 proyectos de Carlos, han salido %', n; end if;

  update equipo set email = 'danielcrm.accesalia@gmail.com' where nombre = 'Daniel' and activo;
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'Daniel: esperaba 1, han salido %', n; end if;
end $$;
