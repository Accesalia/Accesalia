-- BEATRIZ, COMERCIAL   (Monica, 4-oct-2026: "si, beatriz debe tener funcion comercial")
--
-- Estaba en la tabla `comerciales` (siglas BEA, con su cartera) pero sin ninguna
-- funcion en el equipo, asi que no podia entrar en el area comercial: la puerta
-- la abre la funcion, no la tabla de comerciales.
insert into equipo_funciones (equipo_id, funcion_id, notas)
select '206e03ae-0ebd-4b1c-9859-8a96ec6a1698', '9731e908-a2ab-486f-858e-4bfada989276',
       'Comercial como Alvaro y Daniel (Monica, 4-oct-2026). Estaba en la tabla comerciales pero sin la funcion, asi que no podia entrar en el area comercial.'
where not exists (
  select 1 from equipo_funciones
   where equipo_id = '206e03ae-0ebd-4b1c-9859-8a96ec6a1698' and funcion_id = '9731e908-a2ab-486f-858e-4bfada989276'
);
