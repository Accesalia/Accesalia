-- NECTAR Y CORBERA: EL NUMERO CON SU LETRA
--
-- Solo estas dos fincas. Encargo de Monica, 2-oct-2026: "primero arreglamos los
-- dos que tenemos claros, o de nuevo se nos van al fondo de prioridades".
--
-- ============================================================================
-- QUE SE DESCUBRIO
-- ============================================================================
--
-- Catastro SI trae la letra del duplicado, en el campo `dir.plp`, y es
-- exactamente el parentesis de la lista de Monica. Nuestro parser lo tiraba:
-- agrupaba los portales por (ficha, numero, escalera) y el numero lo tomaba de
-- `dir.pnp` a secas, sin `plp`.
--
-- Consecuencia, con las dos fincas de hoy:
--
--   AV MARQUES DE CORBERA: son DOS parcelas, una el 36(B) y otra el 36(C). Las
--   dos filas de portal decian "36", asi que los dos accesos de Monica -36(B) y
--   36(C)- no casaban con ninguna.
--
--   CL NECTAR 31: UNA parcela con el 31(C) y el 31(E). Al ignorar la letra, las
--   dos se fundieron en un portal "31" de 43 inmuebles y 36 viviendas, que no es
--   ninguno de los dos edificios. Ademas la parcela hace esquina y su otro
--   numero es SAN MARIANO 33, no Nectar 33.
--
-- EL DESGLOSE CUADRA EXACTO, y por eso se puede hacer sin miedo:
--
--   31(C)   18 inmuebles   13 viviendas   1.222 m2
--   31(E)   25 inmuebles   23 viviendas   1.335 m2
--   -----   -----------   ------------   ---------
--   suma    43            36             2.557      <- lo que tenia la fila "31"
--
-- LO QUE NO SE ARREGLA AQUI, y queda a la vista: Monica tiene un acceso
-- `NECTAR 31(D)` y en Catastro ese numero NO EXISTE: en el 31 solo hay C y E.
-- Eso no se inventa. Se queda sin enlazar y se mira aparte.
--
-- Y TAMPOCO SE TOCA EL PARSER. El arreglo de fondo -que `plp` entre en el
-- calculo de todos los portales- es otra conversacion y otra decision suya. Esto
-- son dos fincas, a mano, con el dato ya comprobado.
--
-- Nada se calcula a ojo: todas las cifras salen del `bruto`, que es la respuesta
-- literal de Catastro.

-- ---------------------------------------------------------------------------
-- 1. CORBERA: cada parcela, su letra
-- ---------------------------------------------------------------------------
--
-- Aqui no hay nada que repartir: cada parcela es un edificio entero y su fila de
-- portal ya tiene los numeros bien (18/18/1.347 y 20/18/1.237). Lo unico que
-- cambia es el numero, que pasa de "36" a "36(B)" y "36(C)".

update ficha_catastro_portal
   set numero = '36(B)'
 where ficha_id = (select id from ficha_catastro where referencia = '4752319VK4745D')
   and numero = '36'
   and coalesce(escalera, '') = '';

update ficha_catastro_portal
   set numero = '36(C)'
 where ficha_id = (select id from ficha_catastro where referencia = '4752309VK4745D')
   and numero = '36'
   and coalesce(escalera, '') = '';

-- ---------------------------------------------------------------------------
-- 2. NECTAR: partir el portal "31" en 31(C) y 31(E)
-- ---------------------------------------------------------------------------

-- 2a. Nace la fila del 31(E), con sus cifras sacadas del bruto.

insert into ficha_catastro_portal
       (ficha_id, tipo_via, nombre_via, numero, escalera,
        inmuebles, viviendas, superficie, plantas, usos)
select f.id, 'CL', 'NECTAR', '31(E)', '',
       count(*),
       count(*) filter (where e->'debi'->>'luso' = 'Residencial'),
       sum(coalesce((e->'debi'->>'sfc')::int, 0)),
       (select array_agg(distinct pl order by pl)
          from jsonb_array_elements(f.bruto->'consulta_dnprcResult'->'lrcdnp'->'rcdnp') e2,
               lateral (select e2->'dt'->'locs'->'lous'->'lourb'->'loint'->>'pt' as pl) z
         where e2->'dt'->'locs'->'lous'->'lourb'->'dir'->>'pnp' = '31'
           and e2->'dt'->'locs'->'lous'->'lourb'->'dir'->>'plp' = 'E'
           and pl is not null),
       (select jsonb_object_agg(uso, n)
          from (select e3->'debi'->>'luso' as uso, count(*) as n
                  from jsonb_array_elements(f.bruto->'consulta_dnprcResult'->'lrcdnp'->'rcdnp') e3
                 where e3->'dt'->'locs'->'lous'->'lourb'->'dir'->>'pnp' = '31'
                   and e3->'dt'->'locs'->'lous'->'lourb'->'dir'->>'plp' = 'E'
                 group by 1) w)
  from ficha_catastro f,
       jsonb_array_elements(f.bruto->'consulta_dnprcResult'->'lrcdnp'->'rcdnp') e
 where f.referencia = '8273821VK4787C'
   and e->'dt'->'locs'->'lous'->'lourb'->'dir'->>'pnp' = '31'
   and e->'dt'->'locs'->'lous'->'lourb'->'dir'->>'plp' = 'E'
 group by f.id, f.bruto
on conflict (ficha_id, numero, escalera) do nothing;

-- 2b. La fila que hoy junta los dos pasa a ser el 31(C), y se le recalculan sus
--     cifras: deja de tener 43 inmuebles y pasa a tener sus 18.

update ficha_catastro_portal p
   set numero     = '31(C)',
       inmuebles  = g.inmuebles,
       viviendas  = g.viviendas,
       superficie = g.superficie,
       plantas    = g.plantas,
       usos       = g.usos
  from (
    select f.id as ficha_id,
           count(*) as inmuebles,
           count(*) filter (where e->'debi'->>'luso' = 'Residencial') as viviendas,
           sum(coalesce((e->'debi'->>'sfc')::int, 0)) as superficie,
           (select array_agg(distinct pl order by pl)
              from jsonb_array_elements(f.bruto->'consulta_dnprcResult'->'lrcdnp'->'rcdnp') e2,
                   lateral (select e2->'dt'->'locs'->'lous'->'lourb'->'loint'->>'pt' as pl) z
             where e2->'dt'->'locs'->'lous'->'lourb'->'dir'->>'pnp' = '31'
               and e2->'dt'->'locs'->'lous'->'lourb'->'dir'->>'plp' = 'C'
               and pl is not null) as plantas,
           (select jsonb_object_agg(uso, n)
              from (select e3->'debi'->>'luso' as uso, count(*) as n
                      from jsonb_array_elements(f.bruto->'consulta_dnprcResult'->'lrcdnp'->'rcdnp') e3
                     where e3->'dt'->'locs'->'lous'->'lourb'->'dir'->>'pnp' = '31'
                       and e3->'dt'->'locs'->'lous'->'lourb'->'dir'->>'plp' = 'C'
                     group by 1) w) as usos
      from ficha_catastro f,
           jsonb_array_elements(f.bruto->'consulta_dnprcResult'->'lrcdnp'->'rcdnp') e
     where f.referencia = '8273821VK4787C'
       and e->'dt'->'locs'->'lous'->'lourb'->'dir'->>'pnp' = '31'
       and e->'dt'->'locs'->'lous'->'lourb'->'dir'->>'plp' = 'C'
     group by f.id, f.bruto
  ) g
 where p.ficha_id = g.ficha_id
   and p.numero = '31'
   and coalesce(p.escalera, '') = '';

-- 2c. Los 25 pisos del 31(E) dejan de apuntar al portal viejo y apuntan al suyo.
--     Se identifican por su referencia de 20 caracteres, que es lo que guarda
--     ficha_catastro_inmueble.

update ficha_catastro_inmueble i
   set portal_id = (
         select p.id from ficha_catastro_portal p
          where p.ficha_id = i.ficha_id and p.numero = '31(E)' and coalesce(p.escalera,'') = ''
       )
 where i.ficha_id = (select id from ficha_catastro where referencia = '8273821VK4787C')
   and i.referencia in (
         select (e->'rc'->>'pc1') || (e->'rc'->>'pc2') || (e->'rc'->>'car')
                || (e->'rc'->>'cc1') || (e->'rc'->>'cc2')
           from ficha_catastro f,
                jsonb_array_elements(f.bruto->'consulta_dnprcResult'->'lrcdnp'->'rcdnp') e
          where f.referencia = '8273821VK4787C'
            and e->'dt'->'locs'->'lous'->'lourb'->'dir'->>'pnp' = '31'
            and e->'dt'->'locs'->'lous'->'lourb'->'dir'->>'plp' = 'E'
       );

-- ---------------------------------------------------------------------------
-- 3. Los accesos se enlazan solos
-- ---------------------------------------------------------------------------
--
-- No hace falta ningun enlace a mano: arregladas las filas de portal, la REGLA
-- GENERAL de la migracion 20261002100000 ya encuentra a estos cuatro, porque
-- ahora el portal se llama "36(B)", "36(C)", "31(C)" y "31(E)" igual que ellos.
-- Una sola regla, no una excepcion por finca.
--
-- Solo toca accesos vacios, asi que no pisa nada de lo ya enlazado.

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
-- 4. Que diga lo que ha hecho
-- ---------------------------------------------------------------------------
--
-- Lo que debe salir, cinco filas de portal:
--
--   AV MARQUES DE CORBERA  36(B)   18 inmuebles   18 viviendas   1.347 m2   enlazado
--   AV MARQUES DE CORBERA  36(C)   20             18             1.237      enlazado
--   CL NECTAR              31(C)   18             13             1.222      enlazado
--   CL NECTAR              31(E)   25             23             1.335      enlazado
--   CL SAN MARIANO         33      35             29             2.309      sin acceso nuestro
--
-- Y el total de accesos debe pasar de 2.520 a 2.524 enlazados, 6 sin enlazar.

select f.referencia,
       p.tipo_via || ' ' || p.nombre_via as calle,
       p.numero,
       p.inmuebles,
       p.viviendas,
       p.superficie,
       (select count(*) from ficha_catastro_inmueble i where i.portal_id = p.id) as pisos_apuntando,
       (select count(*) from accesos a where a.ficha_catastro_portal_id = p.id)  as accesos_enlazados
  from ficha_catastro_portal p
  join ficha_catastro f on f.id = p.ficha_id
 where f.referencia in ('8273821VK4787C', '4752319VK4745D', '4752309VK4745D')
 order by p.nombre_via, p.numero;
