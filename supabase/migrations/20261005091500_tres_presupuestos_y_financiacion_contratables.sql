-- LOS 3 PRESUPUESTOS Y LA FINANCIACION, TAMBIEN AL CREAR (Monica, 5-oct-2026).
--
-- El 27-sep los dejo fuera de "que quieren" con una razon buena: "el visado, el
-- fin de obra, los tres presupuestos acompanan a un proyecto, no se piden
-- sueltos, y llenaba la lista de ruido".
--
-- Hoy, montando la casilla del bloque 1, se ve que la razon no les aplica a
-- estos dos. Los 3 presupuestos y la financiacion SI los pide la comunidad:
--
--   "Que una comunidad nos pida 3 presupuestos significa que nos delega la
--    busqueda de contratas, que podemos seleccionar las que nos parecen mas
--    adecuadas, y que cobramos comision a la contrata si la junta la vota a
--    traves de nuestra presentacion de su presupuesto."
--
-- Se marcan de dos maneras y las dos escriben lo MISMO -una fila en
-- oportunidad_tipos-: al crear la oportunidad, o mas adelante con la casilla del
-- bloque 1, "cuando hablas con la comunidad y le vendes la idea".
--
-- Ella: "no hay razon real para dejarlos fuera".
--
-- Los demas que acompanan siguen fuera, porque a esos la razon del 27-sep sigue
-- valiendo: el CFO, la toma de datos, la licencia, el visado, el CEE y el
-- paquete de documentacion tecnica no los pide nadie sueltos.

update tipos_proyecto set contratable = true
where clave in ('tres_presupuestos', 'financiacion');
