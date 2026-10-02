-- SIETE OJOS 6 ES EL PARKING: DESHACER LO QUE HICIMOS HOY
--
-- ============================================================================
-- QUE PASO, PORQUE ESTO ES UN ERROR MIO REPETIDO DOS VECES
-- ============================================================================
--
-- La hoja de encargo dice, literal:
--
--     INFORME PERICIAL en edificio residencial existente en:
--     SIETE OJOS 6 (PARKING) ALCORCON
--
-- El 6 de la lista de Monica era CORRECTO. Y el encargo es el PARKING.
--
-- El 1-oct yo decidi que su 6 era una errata y ate la oportunidad al acceso del
-- numero 4. El motivo que deje escrito en `opp_accesos.de_donde` fue:
--
--     "El numero 6 de tu lista era una errata: es el 4. Tu proyecto esta en la
--      carpeta de Dropbox del n4, y la parcela del n6 que habiamos cotejado
--      tiene 0 VIVIENDAS en sus dos escaleras."
--
-- Ese razonamiento es falso, y lo peor es que esta misma mañana lo escribi yo en
-- la migracion 20261002160000 como advertencia: que una parcela no tenga
-- viviendas NO significa que la referencia este mal; significa que el encargo
-- puede ser de un garaje o de unas oficinas. Avenida del Oeste era un garaje y
-- esto tambien. Lo escribi y a la hora siguiente volvi a tropezar.
--
-- Y encima lo arrastre: con ese argumento le pedi hoy a Monica renombrar la
-- oportunidad Y la comunidad de "SIETE OJOS 6" a "SIETE OJOS 4"
-- (migraciones 20261002140000 y 20261002150000). Las dos cosas se deshacen aqui.
--
-- LO QUE DICE CATASTRO DE LAS DOS PARCELAS, que es lo que lo zanja:
--
--   n4  9366108VK2696N  esc E    53 inmuebles   42 viviendas   3.244 m2   plantas 00-09
--   n6  9267301VK2696N  esc E     1 inmueble     0 viviendas   1.083 m2   planta 00, uso Cultural
--   n6  9267301VK2696N  esc G   490 inmuebles    0 viviendas  11.930 m2   plantas -1 a -4,
--                                                                        Almacen-Estacionamiento
--
-- El "(PARKING)" de la hoja son esas 490 plazas en cuatro sotanos: la escalera G.
--
-- UN CABO SUELTO QUE NO SE ARREGLA AQUI porque no esta en la base: ayer apunte
-- que "tu proyecto esta en la carpeta de Dropbox del n4". La hoja de encargo dice
-- 6. Si la carpeta dice 4, esta mal rotulada, y eso lo mira Monica en Dropbox.

-- ---------------------------------------------------------------------------
-- 1. Los nombres vuelven al 6
-- ---------------------------------------------------------------------------

do $$
declare
  la_opp       uuid;
  la_comunidad uuid;
begin
  select id into strict la_opp from oportunidades where nombre = 'SIETE OJOS 4 ALCORCON';
  update oportunidades set nombre = 'SIETE OJOS 6 ALCORCON' where id = la_opp;

  select id into strict la_comunidad from comunidades where nombre = 'SIETE OJOS 4 ALCORCON';
  update comunidades set nombre = 'SIETE OJOS 6 ALCORCON' where id = la_comunidad;
end $$;

-- ---------------------------------------------------------------------------
-- 2. El enlace: del edificio de viviendas, al parking
-- ---------------------------------------------------------------------------
--
-- << ESTO BORRA UNA FILA DE `opp_accesos`, QUE ES UNA DE SUS TRES TABLAS
--    VALIDADAS. PENDIENTE DE SU OK EXPLICITO. >>
--
--    La fila que se borra es la que ate yo ayer con el razonamiento equivocado:
--    esa oportunidad con el acceso del numero 4. No es dato suyo, es una
--    deduccion mia que resulto falsa.
--
--    Y se anade la buena, con la hoja de encargo como procedencia, que es la
--    prueba mas fuerte que hay: no es una deduccion, es el contrato.
--
-- << Y SE ENLAZA SOLO LA ESCALERA G, EL PARKING. PENDIENTE DE SU OK. >>
--
--    La escalera E de la misma parcela es un local Cultural de 1.083 m2 y no es
--    lo que dice la hoja. Si esa comunidad tambien lo posee, se añade; pero eso
--    lo sabe ella, no Catastro.

do $$
declare
  la_opp     uuid;
  el_parking uuid;
  borradas   int;
begin
  select id into strict la_opp from oportunidades where nombre = 'SIETE OJOS 6 ALCORCON';

  select a.id into strict el_parking
    from accesos a
   where a.municipio = 'ALCORCON'
     and a.tipo_via = 'CL'
     and a.nombre_via = 'SIETE OJOS'
     and a.numero = '6'
     and a.escalera = 'G';

  -- fuera el enlace equivocado, y se comprueba que era UNO y solo uno
  delete from opp_accesos oa
   using accesos a
   where oa.opp_id = la_opp
     and a.id = oa.acceso_id
     and a.numero = '4'
     and a.nombre_via = 'SIETE OJOS';
  get diagnostics borradas = row_count;
  if borradas <> 1 then
    raise exception 'Esperaba borrar 1 enlace al numero 4 y he borrado %. Parar y mirar.', borradas;
  end if;

  insert into opp_accesos (opp_id, acceso_id, de_donde)
  values (la_opp, el_parking,
          'La hoja de encargo dice literalmente "INFORME PERICIAL en edificio residencial '
          || 'existente en: SIETE OJOS 6 (PARKING) ALCORCON". El 6 de la lista de Monica era '
          || 'correcto y el encargo es el parking: escalera G de la parcela 9267301VK2696N, '
          || '490 plazas en cuatro sotanos, 11.930 m2. Corrige el enlace que Claude ato el '
          || '1-oct-2026 al numero 4 dando por errata el 6, con el argumento falso de que la '
          || 'parcela del 6 no tiene viviendas. Un garaje no tiene viviendas y sigue siendo el '
          || 'encargo.')
  on conflict do nothing;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Que diga lo que ha hecho
-- ---------------------------------------------------------------------------
--
-- Lo que debe salir: la opp y la comunidad diciendo "SIETE OJOS 6 ALCORCON", y un
-- solo acceso atado, el del parking, con sus 490 plazas. El acceso del numero 4
-- se queda en la tabla SIN oportunidad, igual que los otros 1.169 que estan asi,
-- y eso se mira aparte.

select o.nombre as la_opp,
       c.nombre as la_comunidad,
       a.tipo_via || ' ' || a.nombre_via || ' ' || a.numero
         || coalesce(' esc ' || nullif(a.escalera, ''), '') as el_acceso,
       p.inmuebles,
       p.viviendas,
       p.superficie,
       p.usos::text
  from oportunidades o
  left join comunidades c on c.id = o.comunidad_id
  left join opp_accesos oa on oa.opp_id = o.id
  left join accesos a on a.id = oa.acceso_id
  left join ficha_catastro_portal p on p.id = a.ficha_catastro_portal_id
 where o.nombre = 'SIETE OJOS 6 ALCORCON';
