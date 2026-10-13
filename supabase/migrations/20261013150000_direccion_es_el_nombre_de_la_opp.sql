-- LA DIRECCION DE UNA OPORTUNIDAD ES SU NOMBRE (Monica, 13-oct-2026): "son tres
-- entidades y cada una debe tener su nombre": comunidad, acceso y opp. Toda la
-- app lee la direccion como oportunidades.nombre, ni el "CP ..." de la comunidad
-- ni el texto provisional del alta. Sin nombre, su codigo, para reconocerla.
-- Las dos vistas que la sacaban de la comunidad. Mismas columnas: solo cambia
-- de donde sale `direccion`.

create or replace view oportunidades_por_completar as
select o.id,
       o.codigo,
       coalesce(nullif(btrim(o.nombre), ''), o.codigo) as direccion,
       o.comercial_id,
       coalesce(o.fecha_apertura, o.creado_en::date) as desde,
       not exists (select 1 from relacion_oportunidad_accesos r where r.opp_id = o.id and r.hasta is null) as falta_direccion,
       o.puesto_id is null and o.persona_comunidad_id is null and o.contacto_provisional is null as falta_contacto,
       o.siguiente_paso is null as falta_paso
  from oportunidades o
 where o.estado = 'abierta'
   and coalesce(o.fecha_apertura, o.creado_en::date) >= date '2025-01-01'
   and not exists (select 1 from hojas_encargo h
                    where h.oportunidad_id = o.id and h.estado in ('enviada_comunidad', 'devuelta_firmada'))
   and (not exists (select 1 from relacion_oportunidad_accesos r where r.opp_id = o.id and r.hasta is null)
        or o.puesto_id is null and o.persona_comunidad_id is null and o.contacto_provisional is null
        or o.siguiente_paso is null);

create or replace view oportunidades_de_gestor as
select a.puesto_id,
       o.id as oportunidad_id,
       o.codigo,
       coalesce(nullif(btrim(o.nombre), ''), o.codigo) as direccion,
       r.resultado,
       r.fecha_apertura,
       r.primera_firma
  from admin_de_oportunidad a
  join oportunidades o on o.id = a.oportunidad_id
  join resultado_oportunidad r on r.oportunidad_id = o.id
 where a.puesto_id is not null;
