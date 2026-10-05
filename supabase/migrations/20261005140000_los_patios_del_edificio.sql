-- LOS PATIOS, AL LADO DEL ASCENSOR (Monica, 5-oct-2026).
--
-- En su maqueta del bloque 1, al final de la columna del Catastro, hay un bloque
-- "LO QUE HEMOS VISTO NOSOTROS" con dos cosas en paralelo: el ascensor y los
-- patios, cada uno con su Si/No, su "¿cuantos?" y la firma de quien lo vio.
--
-- El ascensor ya estaba. Los patios no, y ella lo pidio asi:
--
--   "Hay que hacerle hueco. Es un dato del edificio como lo es el numero de
--    viviendas, solo que con otro origen: MANUAL en vez de Catastro. Manual
--    incluye con posibilidad de fallo, claro."
--
-- Por eso van aqui, en ficha_catastro, y no en una tabla aparte: es el edificio.
-- Y por eso llevan firma: un dato que pone una persona vale lo que valga quien
-- lo puso y cuando lo miro.
--
-- La diferencia con el ascensor es que el ascensor es un si/no y los patios son
-- un NUMERO: su maqueta pregunta "¿cuantos?" y pone un 2. El cero es un dato
-- -no hay patios- y el nulo es otro: nadie lo ha mirado.

alter table ficha_catastro add column patios            integer;
alter table ficha_catastro add column patios_vistos_por uuid references equipo(id) on delete set null;
alter table ficha_catastro add column patios_vistos_en  timestamptz;

comment on column ficha_catastro.patios is
  'Cuantos patios tiene. Lo cuenta una persona mirando el croquis o yendo: Catastro no lo dice. 0 es "no tiene"; NULL es "nadie lo ha mirado", que no es lo mismo.';
comment on column ficha_catastro.patios_vistos_por is
  'Quien los conto. Un dato manual sin firma no se puede defender delante de nadie.';
comment on column ficha_catastro.patios_vistos_en is
  'Cuando los conto. Un edificio se reforma: un dato de hace cinco anos no es el mismo dato.';
