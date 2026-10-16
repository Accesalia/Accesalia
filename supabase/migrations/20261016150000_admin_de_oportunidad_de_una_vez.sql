-- EL ADMINISTRADOR DE CADA OPP, DE UNA VEZ (Monica, 16-oct-2026: "abrir el area
-- me ha llevado 7 segundos"). La vista buscaba el administrador opp por opp
-- (una subconsulta por cada una de las 2.837): 400 ms, y la usan las cuatro
-- vistas de la cartera de administradores (cartera_gestores 850 -> 54 ms,
-- oportunidades_de_gestor 1.100 -> 10 ms, opps_abiertas_sin_gestor 700 -> 18 ms,
-- cartera_gestor_resumen 400 -> 186 ms). Ahora se cruza de una vez: 7 ms. Mismo
-- resultado (comprobado: 2.837 filas, 0 diferencias): el puesto apuntado en la
-- opp o, si no, el administrador vigente mas reciente de su comunidad.
-- (Aplicada en prod el 16-oct desde f6.)
create or replace view public.admin_de_oportunidad as
select o.id as oportunidad_id,
       coalesce(o.administrador_puesto_id, ua.puesto_id) as puesto_id
  from public.oportunidades o
  left join (
    select distinct on (r.comunidad_id) r.comunidad_id, r.puesto_id
      from public.comunidad_admin_responsable r
     where r.vigente and r.puesto_id is not null
     order by r.comunidad_id, r.desde desc nulls last, r.creado_en desc
  ) ua on ua.comunidad_id = o.comunidad_id;
