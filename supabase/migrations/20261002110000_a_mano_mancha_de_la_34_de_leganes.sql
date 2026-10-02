-- A MANO: EL PORTAL DE AV MANCHA DE LA 34, LEGANES
--
-- El unico acceso que la migracion anterior dejo sin enlazar por EMPATE, no por
-- falta de portal. Los otros 10 que quedan vacios es porque no hay ningun portal
-- que les corresponda, y esos se miran aparte.
--
-- QUE PASABA: dos parcelas contiguas comparten calle y numero.
--
--   5856803VX3655N   AV MANCHA DE LA 34, sin escalera   2 inmuebles, 0 viviendas, planta 00
--   5856804VK3655N   AV MANCHA DE LA 34, sin escalera   2 inmuebles, 0 viviendas, planta 00
--
-- Fijarse en el septimo caracter: ...803VX y ...804VK. Son dos parcelas distintas
-- en el mismo numero de la calle, y las dos son local de planta baja, no portal
-- de viviendas.
--
-- El cotejo por direccion encontraba las dos y, con razon, no elegia ninguna.
-- Pero el acceso YA LLEVA ESCRITO de cual es: su ref_catastral dice
-- 5856803VX3655N. Asi que el empate lo deshace su propia referencia.
--
-- DECISION DE MONICA (2-oct-2026): "hacemos una unica linea para este unico caso,
-- NO lo creamos como regla". Es un caso y se trata como un caso. Si manana
-- aparecen veinte, entonces se hablara de una regla; hoy no hay regla que
-- justificar con una sola fila.
--
-- NO SE ESCRIBE A CIEGAS: los dos `into strict` hacen que esto se pare con un
-- error si el acceso o el portal no aparecen, o si aparecen varios. Mejor que
-- falle que que escriba en la fila equivocada.

do $$
declare
  el_acceso uuid;
  el_portal uuid;
begin
  select a.id
    into strict el_acceso
    from accesos a
   where a.municipio = 'LEGANES'
     and a.tipo_via = 'AV'
     and a.nombre_via = 'MANCHA DE LA'
     and a.numero = '34'
     and coalesce(a.escalera, '') = ''
     and a.ref_catastral = '5856803VX3655N';

  select p.id
    into strict el_portal
    from ficha_catastro_portal p
    join ficha_catastro f on f.id = p.ficha_id
   where f.referencia = '5856803VX3655N'
     and coalesce(p.tipo_via, '')   = 'AV'
     and coalesce(p.nombre_via, '') = 'MANCHA DE LA'
     and coalesce(p.numero, '')     = '34'
     and coalesce(p.escalera, '')   = '';

  update accesos
     set ficha_catastro_portal_id = el_portal
   where id = el_acceso;
end $$;

-- Lo que debe salir: 2.530 / 2.520 / 10.

select count(*)                        as accesos,
       count(ficha_catastro_portal_id) as enlazados,
       count(*) - count(ficha_catastro_portal_id) as sin_enlazar
  from accesos;
