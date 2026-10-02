-- LAS MISMAS DOS ERRATAS, AHORA EN EL NOMBRE DE LA COMUNIDAD
--
-- ============================================================================
-- ESTO TOCA `comunidades.nombre`, QUE NO SE TOCA. LEER ESTO ANTES DE NADA.
-- ============================================================================
--
-- Esa columna NO es una importacion: son 26 dias de Monica curando a mano una
-- lista de 1.228 direcciones, no es replicable y la norma es que no se toca por
-- nada del mundo.
--
-- Se toca aqui porque ella lo pidio expresamente, hoy 2-oct-2026, despues de
-- haber visto las dos filas y de haber corregido ya las oportunidades:
--
--     "si, tambien la opp. Sql anterior ejecutado, solo queda la comunidad,
--      entonces"
--
-- Y son DOS FILAS, nombradas una por una. Ningun `like`, ningun barrido, ninguna
-- regla: dos nombres exactos dentro y dos nombres exactos fuera. Si alguno de los
-- dos no esta tal cual, la migracion se para con un error y no escribe nada.
--
-- ============================================================================
-- QUE ESTABA MAL
-- ============================================================================
--
-- Las dos erratas estaban repetidas en la oportunidad y en la comunidad, y las
-- descubrio el cotejo contra Catastro: el acceso decia una cosa y el nombre otra.
-- Manda el acceso, que es lo que ella decidio.
--
--   SIETE OJOS          el acceso dice numero 4, el nombre decia 6
--   MERCEDES IZQUIERDO  el acceso dice SAN SEBASTIAN DE LOS REYES, el nombre
--                       decia ALCOBENDAS. Y el campo `municipio` de la propia
--                       comunidad ya decia San Sebastian, asi que la fila se
--                       contradecia a si misma: la errata era solo del texto.
--
-- Los dos nombres nuevos son los mismos que ya se escribieron en las dos
-- oportunidades en la migracion 20261002140000, para que no vuelvan a discrepar.

do $$
declare
  la_comunidad uuid;
begin
  -- SIETE OJOS: el 6 pasa a ser el 4
  select id into strict la_comunidad
    from comunidades
   where nombre = 'SIETE OJOS 6 ALCORCON';
  update comunidades
     set nombre = 'SIETE OJOS 4 ALCORCON'
   where id = la_comunidad;

  -- MERCEDES IZQUIERDO: Alcobendas pasa a ser San Sebastian de los Reyes
  select id into strict la_comunidad
    from comunidades
   where nombre = 'MERCEDES IZQUIERDO 3 ALCOBENDAS';
  update comunidades
     set nombre = 'MERCEDES IZQUIERDO 3 SAN SEBASTIAN DE LOS REYES'
   where id = la_comunidad;
end $$;

-- Lo que debe salir: las dos filas diciendo lo mismo en los tres sitios -el
-- acceso, la oportunidad y la comunidad- y el municipio cuadrando.

select c.nombre as la_comunidad,
       o.nombre as la_oportunidad,
       c.municipio,
       a.municipio || ' · ' || a.tipo_via || ' ' || a.nombre_via || ' ' || a.numero
         || coalesce(' esc ' || nullif(a.escalera, ''), '') as el_acceso
  from comunidades c
  join oportunidades o on o.comunidad_id = c.id
  join opp_accesos oa on oa.opp_id = o.id
  join accesos a on a.id = oa.acceso_id
 where a.nombre_via in ('SIETE OJOS', 'MERCEDES IZQUIERDO');
