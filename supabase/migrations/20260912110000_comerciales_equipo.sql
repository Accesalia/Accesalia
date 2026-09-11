-- Cada comercial es una persona del equipo (Monica, 11-sep-2026).
--
-- Con el login, el area comercial tiene que saber QUIEN ha entrado para
-- enseñarle SU cartera: "cada uno entra y ve solo lo suyo". La lista de
-- comerciales (a la que apuntan empresas, proyectos y oportunidades) vivia
-- suelta, con su propio nombre. Aqui se engancha a la persona del equipo, que
-- es la que entra en la app. La lista de comerciales se queda: es el historico
-- de quien llevo cada cartera (Carlos se fue y sus cosas siguen a su nombre).

alter table comerciales
  add column if not exists equipo_id uuid references equipo (id);

create unique index if not exists uq_comerciales_equipo on comerciales (equipo_id) where equipo_id is not null;

comment on column comerciales.equipo_id is 'La persona del equipo que es este comercial: con ella entra en la app y ve su cartera.';

-- Alvaro y Daniel, por su correo del equipo (no por id: los ids no se escriben
-- a mano). Carlos ya no esta y no tiene ficha en el equipo: se queda sin enlace.
update comerciales c set equipo_id = e.id
  from equipo e
 where c.nombre = 'Alvaro' and lower(e.email) = 'alvarods.accesalia@gmail.com' and c.equipo_id is null;

update comerciales c set equipo_id = e.id
  from equipo e
 where c.nombre = 'Daniel' and lower(e.email) = 'danielcrm.accesalia@gmail.com' and c.equipo_id is null;
