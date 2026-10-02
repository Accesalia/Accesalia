-- LONGARES ES UN GARAJE, Y NECTAR 31(D) ES LA E DE CATASTRO
--
-- Dos enlaces que NO se pueden deducir del dato: los ha resuelto Monica
-- mirandolos (2-oct-2026). Se escriben a mano y se escribe tambien por que, que
-- es lo unico que impide que dentro de un año alguien los "corrija" al reves.
--
-- ============================================================================
-- LONGARES 8(B): ES UN GARAJE
-- ============================================================================
--
-- La parcela 8360904VK4786A no tiene ni una vivienda. Tiene dos cosas:
--
--   escalera (vacia)    1 inmueble     1.431 m2   planta 00        Religioso
--   escalera 1        249 inmuebles    6.077 m2   plantas -1,-2,-3 Almacen-Estacionamiento
--
-- Una iglesia y un garaje de 249 plazas en tres sotanos. La comunidad de Monica
-- se llama "LONGARES 8B MADRID" y ella lo confirma: ES UN GARAJE. Una comunidad
-- de garaje es una comunidad como otra cualquiera.
--
-- OJO, Y ESTO ES LO IMPORTANTE DE ESTE FICHERO: su acceso no lleva escalera, asi
-- que la regla general -que casa por calle, numero y escalera- lo mandaria a LA
-- IGLESIA, porque es la fila con la escalera vacia. Por eso se enlaza a mano al
-- garaje. Si alguna vez se vacia este enlace y se vuelve a lanzar la regla
-- general, volvera a irse a la iglesia. Esta advertido.

-- 1. El numero, con su letra, en las dos filas de esa parcela: Catastro dice
--    pnp=8 y plp=B, o sea 8(B).

update ficha_catastro_portal
   set numero = '8(B)'
 where ficha_id = (select id from ficha_catastro where referencia = '8360904VK4786A')
   and numero = '8';

-- 2. El acceso, al GARAJE (escalera 1), no a la iglesia.

do $$
declare
  el_acceso uuid;
  el_garaje uuid;
begin
  select a.id
    into strict el_acceso
    from accesos a
   where a.municipio = 'MADRID'
     and a.tipo_via = 'CL'
     and a.nombre_via = 'LONGARES'
     and a.numero = '8(B)'
     and coalesce(a.escalera, '') = '';

  select p.id
    into strict el_garaje
    from ficha_catastro_portal p
    join ficha_catastro f on f.id = p.ficha_id
   where f.referencia = '8360904VK4786A'
     and p.escalera = '1';            -- el garaje; la iglesia tiene la escalera vacia

  update accesos
     set ficha_catastro_portal_id = el_garaje
   where id = el_acceso;
end $$;

-- ============================================================================
-- NECTAR 31(D): ES LA E DE CATASTRO
-- ============================================================================
--
-- La comunidad de Monica se llama "NECTAR 31 PORTAL 1 - 2 - 3": TRES portales.
-- Catastro, en el numero 31, solo ve DOS bloques:
--
--   31(C)   18 inmuebles   13 viviendas   3 puertas por planta (A, B, C)
--   31(E)   25 inmuebles   23 viviendas   4 puertas por planta (A, B, C, D)
--
-- Y los accesos estan escritos (C), (D) y (E). Tres nombres distintos para dos
-- bloques, y ninguno de los tres sistemas de nombres coincide con los otros.
--
-- Monica lo resuelve: el 31(D) ES LA E DE CATASTRO.
--
-- CONSECUENCIA, dicha para que nadie se lleve una sorpresa: los accesos 31(D) y
-- 31(E) van a apuntar los DOS a la misma fila de portal. Esa fila dice 25
-- inmuebles y 23 viviendas, y son los dos juntos. Mirando un acceso suelto se ve
-- el dato del bloque entero, no el del portal. Catastro no da mas: ahi no
-- distingue, y lo que no se tiene no se inventa.

do $$
declare
  el_acceso uuid;
  la_e      uuid;
begin
  select a.id
    into strict el_acceso
    from accesos a
   where a.municipio = 'MADRID'
     and a.tipo_via = 'CL'
     and a.nombre_via = 'NECTAR'
     and a.numero = '31(D)'
     and coalesce(a.escalera, '') = '';

  select p.id
    into strict la_e
    from ficha_catastro_portal p
    join ficha_catastro f on f.id = p.ficha_id
   where f.referencia = '8273821VK4787C'
     and p.numero = '31(E)'
     and coalesce(p.escalera, '') = '';

  update accesos
     set ficha_catastro_portal_id = la_e
   where id = el_acceso;
end $$;

-- ============================================================================
-- Que diga lo que ha hecho
-- ============================================================================
--
-- Lo que debe salir: 2.530 / 2.526 / 4. Y los cuatro que quedan son los de
-- Europa 20(B), Oeste 1(D), Siete Ojos 4 y Mercedes Izquierdo 3.

select count(*)                        as accesos,
       count(ficha_catastro_portal_id) as enlazados,
       count(*) - count(ficha_catastro_portal_id) as sin_enlazar
  from accesos;
