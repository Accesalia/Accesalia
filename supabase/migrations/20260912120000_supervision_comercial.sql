-- Supervision comercial (Monica, 12-sep-2026): "Alejandra si debe tener acceso a
-- toda la seccion comercial porque es quien supervisa y controla hojas de
-- encargo (se envian firmadas digitalmente, asi que ella las firma en nombre de
-- Accesalia antes de enviarlas a cliente, y eso nos permite revisar todo antes
-- de que salga de la oficina)".
--
-- Por FUNCION, nunca por persona: una funcion nueva que da un tercer nivel en
-- un area, SUPERVISAR = ver todo lo del area (todas las carteras), ademas de
-- trabajar en ella. Si mañana lo hace otra persona, se le pasa la funcion.

-- 1. El nivel nuevo
alter table funcion_areas drop constraint if exists funcion_areas_nivel_ck;
alter table funcion_areas add constraint funcion_areas_nivel_ck check (nivel in ('ver', 'trabajar', 'supervisar'));
comment on column funcion_areas.nivel is 'ver: solo mira; trabajar: trabaja en lo suyo; supervisar: ve todo lo del area (todas las carteras, en comercial) y trabaja.';

-- 2. La funcion
insert into funciones (clave, nombre, descripcion, activa)
values ('supervision_comercial', 'Supervision comercial',
        'Supervisa el area comercial y revisa y firma las hojas de encargo en nombre de Accesalia antes de que salgan al cliente.', true)
on conflict (clave) do nothing;

insert into funcion_areas (funcion_id, area_id, nivel)
select f.id, a.id, 'supervisar'
  from funciones f, areas a
 where f.clave = 'supervision_comercial' and a.clave = 'comercial'
on conflict (funcion_id, area_id) do nothing;

-- 3. Hoy la tiene Alejandra (por su correo del equipo, no por id)
insert into equipo_funciones (equipo_id, funcion_id, desde)
select e.id, f.id, current_date
  from equipo e, funciones f
 where lower(e.email) = 'aperez.accesalia@gmail.com' and f.clave = 'supervision_comercial'
   and not exists (select 1 from equipo_funciones x where x.equipo_id = e.id and x.funcion_id = f.id and x.hasta is null);
