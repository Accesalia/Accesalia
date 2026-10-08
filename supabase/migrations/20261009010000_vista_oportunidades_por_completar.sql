-- =====================================================================
-- LAS OPORTUNIDADES A MEDIAS, DE UN GOLPE
-- Monica, 8-oct-2026.
--
-- Para el boton PENDIENTES de la barra de arriba y su pantalla: cuantas
-- oportunidades le faltan direccion, contacto o siguiente paso, de quien son
-- y que les falta. La misma regla que lib/completa.ts (si se cambia una, se
-- cambia la otra):
--   · abiertas;
--   · abiertas desde 2025 ("consideremos solo 25 y 26");
--   · sin hoja enviada ni firmada ("avanzar de hito exige tener el dato": la
--     que esta por delante no se revisa);
--   · y que les falte algo: DIRECCION (portales confirmados, no la comunidad),
--     CONTACTO o SIGUIENTE PASO. El administrador no cuenta.
-- =====================================================================

create view public.oportunidades_por_completar as
select
  o.id,
  o.codigo,
  coalesce(c.nombre, o.nombre, o.comunidad_provisional) as direccion,
  o.comercial_id,
  coalesce(o.fecha_apertura, o.creado_en::date) as desde,
  not exists (select 1 from public.relacion_oportunidad_accesos r where r.opp_id = o.id and r.hasta is null) as falta_direccion,
  (o.puesto_id is null and o.persona_comunidad_id is null and o.contacto_provisional is null) as falta_contacto,
  (o.siguiente_paso is null) as falta_paso
from public.oportunidades o
left join public.comunidades c on c.id = o.comunidad_id
where o.estado = 'abierta'
  and coalesce(o.fecha_apertura, o.creado_en::date) >= date '2025-01-01'
  and not exists (
    select 1 from public.hojas_encargo h
     where h.oportunidad_id = o.id and h.estado in ('enviada_comunidad', 'devuelta_firmada')
  )
  and (
    not exists (select 1 from public.relacion_oportunidad_accesos r where r.opp_id = o.id and r.hasta is null)
    or (o.puesto_id is null and o.persona_comunidad_id is null and o.contacto_provisional is null)
    or o.siguiente_paso is null
  );

comment on view public.oportunidades_por_completar is
  'Oportunidades a medias: abiertas desde 2025, sin hoja enviada ni firmada, y sin direccion confirmada, contacto o siguiente paso. Misma regla que lib/completa.ts (Monica, 8-oct-2026).';
