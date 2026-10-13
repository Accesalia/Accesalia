-- LA LLAMADA, EN UNA DIRECCION (Monica, 14-oct-2026): "llamadas debe buscar por
-- clave si es direccion, por agenda si es persona o por empresa". El donde de
-- una llamada puede ser una opp (por su nombre) o una direccion que ya tenemos
-- (una clave DIR, con numero o sin el), aunque no tenga opp abierta.

alter table llamadas
  add column donde_clave_id uuid references claves (id);

comment on column llamadas.donde_clave_id is
  'La direccion (clave DIR) de la que va la llamada, si se eligio una direccion que ya tenemos y no una opp.';
