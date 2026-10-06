-- YA APLICADA el 6-oct-2026 (version 20261006155612). NO volver a ejecutar.
--
-- =====================================================================
-- LOS 21 DISTRITOS DE MADRID, CON SU JUNTA
-- Monica, 6-oct-2026, barriendo Madrid capital (tanda B). "El distrito queda
-- en las notas? no tenemos un campo expreso para eso?"
--
-- El distrito de cada edificio ya lo da Catastro (ficha_catastro.distrito_municipal,
-- los 1.188 accesos de Madrid lo tienen), pero solo como numero: "8", no
-- "Fuencarral-El Pardo". Esta lista pone nombre al numero y lo une a su Junta
-- Municipal de Distrito (organismos, tipo junta_distrito). Asi cada oportunidad
-- de Madrid sabe sola que junta le toca, sin escribirlo en ninguna nota.
--
-- Lista CONGELADA ("no cambia"): 21 filas, numeracion oficial del Ayuntamiento,
-- la misma que usa Catastro. La junta se rellena segun se den de alta.
-- Por codigo postal NO: un CP cruza la frontera de varios distritos.
-- =====================================================================
create table public.distritos_madrid (
  numero             smallint primary key constraint distritos_madrid_numero_check check (numero between 1 and 21),
  nombre             text not null unique,
  junta_organismo_id uuid references public.organismos(id) on delete set null,
  creado_en          timestamptz not null default now()
);
comment on table public.distritos_madrid is
  'Los 21 distritos de Madrid capital (lista congelada). numero = ficha_catastro.distrito_municipal; junta = su Junta Municipal de Distrito.';

insert into public.distritos_madrid (numero, nombre) values
  (1, 'Centro'), (2, 'Arganzuela'), (3, 'Retiro'), (4, 'Salamanca'), (5, 'Chamartín'),
  (6, 'Tetuán'), (7, 'Chamberí'), (8, 'Fuencarral-El Pardo'), (9, 'Moncloa-Aravaca'),
  (10, 'Latina'), (11, 'Carabanchel'), (12, 'Usera'), (13, 'Puente de Vallecas'),
  (14, 'Moratalaz'), (15, 'Ciudad Lineal'), (16, 'Hortaleza'), (17, 'Villaverde'),
  (18, 'Villa de Vallecas'), (19, 'Vicálvaro'), (20, 'San Blas-Canillejas'), (21, 'Barajas');
