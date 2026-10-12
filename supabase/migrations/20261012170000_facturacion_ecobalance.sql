-- LA FACTURACION DE ECOBALANCE, APARTE (Monica, 12-oct-2026): "Alexandra solo
-- debe ver lo que factura Accesalia o Daniel de Soto; Ana, solo lo que factura
-- Ecobalance. La pantalla de Ecobalance sera OTRA diferente."
insert into funciones (clave, nombre, descripcion, orden, activa, ve_todo)
values ('facturacion_ecobalance', 'Facturacion Ecobalance', 'Lo que factura Ecobalance (3 presupuestos, CAES...). No ve lo de Accesalia ni lo de Daniel.', 61, true, false)
on conflict do nothing;
-- Ana pasa a Ecobalance y deja la de Accesalia (sigue en el historial). Hasta = ayer:
-- la sesion cuenta el "hasta" como dia incluido.
update equipo_funciones set hasta = current_date - 1
where hasta is null
  and funcion_id = (select id from funciones where clave = 'facturacion')
  and equipo_id = (select id from equipo where nombre = 'Ana' and activo);
insert into equipo_funciones (equipo_id, funcion_id, desde, notas)
select e.id, f.id, current_date, 'Facturacion de Ecobalance (12-oct-2026)'
from equipo e, funciones f where e.nombre = 'Ana' and e.activo and f.clave = 'facturacion_ecobalance';

-- 3 PRESUPUESTOS: se cobran A EXITO, si gana nuestra contrata (12-oct-2026).
alter table hitos_cobro drop constraint hitos_cobro_hito_check;
alter table hitos_cobro add constraint hitos_cobro_hito_check check (hito = any (array[
  'firma','encargo','entrega','licencia','pss','inicio_obra','cfo','presentacion','concesion','adjudicacion','otro']));
comment on column hitos_cobro.hito is 'Cuando se cobra. adjudicacion = cuando la obra se adjudica a la contrata que presentamos (3 presupuestos, a exito).';

-- El 3 % del PEM: dato, nunca en el codigo.
insert into parametros_economicos (clave, nombre, valor, unidad, descripcion) values
  ('tres_presupuestos_pct', '3 presupuestos: honorarios a exito', 3, '%',
   'Sobre el PEM del presupuesto firmado con la contrata que presentamos, si gana. Lo factura Ecobalance.')
on conflict (clave) do nothing;
