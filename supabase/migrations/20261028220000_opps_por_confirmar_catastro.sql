-- «OPPS QUE NECESITAN CONFIRMAR LA DIRECCION DEL CATASTRO» (Monica, 28-oct-2026).
-- Antes «Opps a medio montar»: contaba tambien las que no tenian contacto o
-- siguiente paso (148 de 149). «Dejarla como "a medias" es psicologicamente muy
-- negativo.» Lo unico que no se hace solo es confirmar la direccion en el
-- Catastro (sus portales): solo eso la deja en la lista. Sin administrador o sin
-- comunidad no cuenta. Las columnas se quedan igual (las leen la app y mis_avisos).

create or replace view public.oportunidades_por_completar as
select o.id,
       o.codigo,
       coalesce(nullif(btrim(o.nombre), ''), o.codigo) as direccion,
       o.comercial_id,
       coalesce(o.fecha_apertura, o.creado_en::date) as desde,
       true as falta_direccion,
       o.puesto_id is null and o.persona_comunidad_id is null and o.contacto_provisional is null as falta_contacto,
       o.siguiente_paso is null as falta_paso
  from public.oportunidades o
 where o.estado = 'abierta'
   and coalesce(o.fecha_apertura, o.creado_en::date) >= '2025-01-01'
   and not exists (select 1 from public.he_estados_hoja e join public.he_versiones_hoja v on v.id = e.version_id
                    where v.oportunidad_id = o.id and e.estado in ('enviada', 'firmada_recibida'))
   and not exists (select 1 from public.relacion_oportunidad_accesos r where r.opp_id = o.id and r.hasta is null);
