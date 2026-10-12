-- LOS EMPLEADOS EN LA AGENDA (Monica, 12-oct-2026): la ficha de persona sirve
-- tambien de ficha de empleado. El enlace va en la agenda y no en `equipo`, del
-- que cuelga RRHH y que no se toca: una persona es, como mucho, un empleado.
-- (Los datos -21 empleados en activo enlazados- se cargaron aparte, con su OK.)
alter table persona add column equipo_id uuid unique references equipo(id);
comment on column persona.equipo_id is 'Si esta persona es (o fue) de Accesalia: su ficha de empleado en equipo.';
