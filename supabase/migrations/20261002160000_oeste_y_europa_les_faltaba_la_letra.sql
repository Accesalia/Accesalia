-- AV DEL OESTE Y AV EUROPA: SOLO LES FALTABA LA LETRA
--
-- Los dos ultimos casos del `plp` que quedaban, y se arreglan como Corbera: la
-- fila de portal no llevaba la letra del duplicado, y por eso no casaba con el
-- acceso. Ni hay que bajar fichas ni hay que tocar `accesos`.
--
--   la fila de portal decia        el acceso dice
--   AV OESTE   1   esc T          AV OESTE   1(D)  esc T
--   AV EUROPA  20  esc T          AV EUROPA  20(B) esc T
--
-- ============================================================================
-- DOS COSAS QUE HAY QUE DEJAR ESCRITAS PARA QUE NADIE LAS "ARREGLE" MAÑANA
-- ============================================================================
--
-- 1. LA ESCALERA "T" NO ES UN ERROR NUESTRO: LA ESCRIBE CATASTRO. Las dos fichas
--    son "Parcela construida sin division horizontal", o sea un unico inmueble
--    sin dividir, y para esas Catastro pone `loint.es = "T"` con `pt = "OD"` y
--    `pu = "OS"`. Son valores suyos, no basura de la importacion.
--
-- 2. AV DEL OESTE 1-3 ES EL GARAJE, Y ESTA BIEN ASI. Esto estuve a punto de
--    estropearlo yo: vi que la parcela no tenia viviendas, busque en Catastro y
--    encontre dos torres residenciales de 40 viviendas en el 1 y en el 3, y le
--    propuse a Monica corregir el acceso y crear un segundo siguiendo el patron
--    de AV GIBRALTAR 4-6-8. Me lo paro ensenandome la ficha del encargo, que dice
--    con sus palabras:
--
--        REF CATASTRAL   9463414VK2696S EL GARAJE
--        TIPO DE OBRA    Subida a cota cero en garaje (invasion esp publico)
--        COMUNIDAD       CDAD USUARIOS APARCAMIENTO VALLADOLID DE ALCORCON
--                        CIF H82474545, presidente Luis Baquero
--
--    El cliente es una COMUNIDAD DE USUARIOS DE APARCAMIENTO, con su CIF y su
--    presidente, igual de comunidad que cualquier otra. Las dos torres de
--    viviendas no tienen nada que ver con el encargo. El acceso que hay -uno, el
--    del garaje- es el correcto, y las referencias de las torres
--    (9463413VK2696S y 9463408VK2696S) NO son de esta comunidad.
--
--    Lo mismo vale para AV EUROPA 20(B) de Alcobendas: 20.387 m2 de oficinas con
--    sus sotanos de garaje, cero viviendas, y es lo que es.
--
--    La leccion, apuntada donde se va a volver a leer: cuando una parcela no
--    tiene viviendas, eso NO significa que la referencia este mal. Significa que
--    el encargo puede ser de un garaje o de unas oficinas. Lo dice la ficha del
--    encargo, no Catastro.

-- ---------------------------------------------------------------------------
-- 1. El numero, con su letra
-- ---------------------------------------------------------------------------

update ficha_catastro_portal
   set numero = '1(D)'
 where ficha_id = (select id from ficha_catastro where referencia = '9463414VK2696S')
   and numero = '1'
   and escalera = 'T';

update ficha_catastro_portal
   set numero = '20(B)'
 where ficha_id = (select id from ficha_catastro where referencia = '4357120VK4845S')
   and numero = '20'
   and escalera = 'T';

-- ---------------------------------------------------------------------------
-- 2. Y se enlazan solos
-- ---------------------------------------------------------------------------
--
-- La misma regla general de siempre, sin excepciones ni enlaces a mano: ahora el
-- portal se llama igual que el acceso. Solo toca los que estan vacios.

update accesos a
   set ficha_catastro_portal_id = (
         select p.id
           from ficha_catastro_portal p
          where coalesce(p.tipo_via, '')   = coalesce(a.tipo_via, '')
            and coalesce(p.nombre_via, '') = coalesce(a.nombre_via, '')
            and coalesce(p.numero, '')     = coalesce(a.numero, '')
            and coalesce(p.escalera, '')   = coalesce(a.escalera, '')
       )
 where a.ficha_catastro_portal_id is null
   and (
         select count(*)
           from ficha_catastro_portal p
          where coalesce(p.tipo_via, '')   = coalesce(a.tipo_via, '')
            and coalesce(p.nombre_via, '') = coalesce(a.nombre_via, '')
            and coalesce(p.numero, '')     = coalesce(a.numero, '')
            and coalesce(p.escalera, '')   = coalesce(a.escalera, '')
       ) = 1;

-- ---------------------------------------------------------------------------
-- 3. Que diga lo que ha hecho
-- ---------------------------------------------------------------------------
--
-- Lo que debe salir: 2.530 / 2.528 / 2. Y los DOS que quedan son Siete Ojos 4 y
-- Mercedes Izquierdo 3, que no es cosa del nombre: es que su ficha de Catastro no
-- esta bajada.

select count(*)                        as accesos,
       count(ficha_catastro_portal_id) as enlazados,
       count(*) - count(ficha_catastro_portal_id) as sin_enlazar
  from accesos;
