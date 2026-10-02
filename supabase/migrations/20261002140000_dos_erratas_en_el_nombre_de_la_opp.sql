-- DOS ERRATAS EN EL NOMBRE DE LA OPORTUNIDAD
--
-- Monica, 2-oct-2026, mirando los accesos que no casaban con Catastro: "siete
-- ojos lo cambiamos al 4, era una errata. Mercedes Izquierdo lo cambiamos, era
-- una errata. Los dos nombres del acceso son los correctos, MODIFICA LA OPP para
-- que cuadre".
--
-- O sea: manda el ACCESO. El nombre de la oportunidad venia mal copiado.
--
--   SIETE OJOS:         el acceso dice numero 4, la opp decia 6
--   MERCEDES IZQUIERDO: el acceso dice SAN SEBASTIAN DE LOS REYES, la opp decia
--                       ALCOBENDAS. El campo `municipio` de la comunidad ya decia
--                       San Sebastian: la errata estaba solo en el texto.
--
-- ESTO NO ENLAZA NADA. Los dos accesos siguen sin su portal de Catastro, y no es
-- por el nombre: es porque su ficha no esta bajada. Son dos cosas distintas y
-- esta solo arregla el nombre.
--
-- LO QUE NO SE TOCA AQUI: `comunidades.nombre` lleva la MISMA errata en las dos
-- -"SIETE OJOS 6 ALCORCON" y "MERCEDES IZQUIERDO 3 ALCOBENDAS"- y no se cambia.
-- Esa lista son 26 dias de trabajo de Monica, no es replicable y no se toca sin
-- que ella lo diga expresamente. Ella dijo "la opp", y es la opp.
--
-- << EL TEXTO EXACTO DE LOS DOS NOMBRES NUEVOS LO PROPONE CLAUDE >>
--    Siguen la forma de los que ya habia -calle, numero, municipio- cambiando
--    solo lo que estaba mal. Si los quiere escritos de otra manera, se cambian
--    antes de ejecutar.
--
-- Los `into strict` paran la migracion si alguna no aparece o aparece mas de una.

do $$
declare
  la_opp uuid;
begin
  -- SIETE OJOS: el 6 pasa a ser el 4
  select id into strict la_opp
    from oportunidades
   where nombre = 'SIETE OJOS 6 ALCORCON';
  update oportunidades
     set nombre = 'SIETE OJOS 4 ALCORCON'
   where id = la_opp;

  -- MERCEDES IZQUIERDO: Alcobendas pasa a ser San Sebastian de los Reyes
  select id into strict la_opp
    from oportunidades
   where nombre = 'MERCEDES IZQUIERDO 3 ALCOBENDAS';
  update oportunidades
     set nombre = 'MERCEDES IZQUIERDO 3 SAN SEBASTIAN DE LOS REYES'
   where id = la_opp;
end $$;

-- Lo que debe salir: las dos oportunidades con su nombre nuevo, al lado del
-- acceso que manda y de la comunidad, que sigue con la errata a proposito.

select o.nombre as la_oportunidad,
       a.municipio || ' · ' || a.tipo_via || ' ' || a.nombre_via || ' ' || a.numero
         || coalesce(' esc ' || nullif(a.escalera, ''), '') as el_acceso_que_manda,
       c.nombre as la_comunidad_sigue_diciendo
  from oportunidades o
  join opp_accesos oa on oa.opp_id = o.id
  join accesos a on a.id = oa.acceso_id
  left join comunidades c on c.id = o.comunidad_id
 where a.nombre_via in ('SIETE OJOS', 'MERCEDES IZQUIERDO');
