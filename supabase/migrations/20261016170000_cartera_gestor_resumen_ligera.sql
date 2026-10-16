-- CARTERA DE ADMINISTRADORES, MAS LIGERA (16-oct-2026, tanda de velocidad).
-- En caliente tardaba 29 ms, pero en frio 370: leia las notas, el historial de
-- fases y las hojas firmadas de TODAS las opps (2.837) para quedarse con las de
-- los gestores (923). Ahora cada agregado se limita a esas opps, lo firmado sale
-- de un distinct on en vez de una subconsulta por hoja, y la cita ya no mira
-- personas_comunidad (retirada el 15-oct: la gente esta en la agenda).
-- Mismas columnas, mismo resultado.
create or replace view public.cartera_gestor_resumen with (security_invoker = true) as
with opps as materialized (
  select a.puesto_id, o.id, coalesce(o.fecha_apertura, o.creado_en::date) as apertura
  from public.admin_de_oportunidad a join public.oportunidades o on o.id = a.oportunidad_id
  where a.puesto_id is not null
), ids as materialized (
  select distinct id from opps
), version_firmada as (
  select distinct on (h.id) h.oportunidad_id, vv.importe_base
  from public.hojas_encargo h
  join public.versiones_hoja vv on vv.hoja_encargo_id = h.id
  where h.estado = 'devuelta_firmada' and h.oportunidad_id in (select id from ids)
  order by h.id, (vv.id = h.version_firmada_id) desc, vv.numero_version desc
), firmado_opp as (
  select oportunidad_id, sum(importe_base) as importe from version_firmada group by oportunidad_id
), nota_opp as (
  select oportunidad_id, max(coalesce(fecha::timestamptz, creado_en)) as cuando
  from public.notas_oportunidad
  where origen <> 'sali' and oportunidad_id in (select id from ids)
  group by oportunidad_id
), nota_puesto as (
  select quien_puesto_id as puesto_id, max(coalesce(fecha::timestamptz, creado_en)) as cuando
  from public.notas_oportunidad where origen <> 'sali' and quien_puesto_id is not null group by quien_puesto_id
), correo_opp as (
  select oportunidad_id, max(creado_en) as cuando
  from public.correos_enviados where ok and oportunidad_id in (select id from ids) group by oportunidad_id
), correo_puesto as (
  select co.puesto_id, max(ce.creado_en) as cuando
  from public.correos_enviados ce
  cross join lateral unnest(ce.para) as d(email)
  join public.correo co on co.puesto_id is not null and lower(co.email) = lower(d.email)
  where ce.ok group by co.puesto_id
), fases_opp as (
  select oportunidad_id, max(cuando) as cuando
  from public.historial_estado_oportunidad
  where cuando <= now() and oportunidad_id in (select id from ids)
  group by oportunidad_id
), por_gestor as (
  select x.puesto_id,
    coalesce(sum(f.importe), 0) as importe_firmado,
    max(x.apertura) as ultima_opp_nueva,
    max(n.cuando) as diario,
    max(c.cuando) as correo,
    max(fa.cuando) as fases
  from opps x
  left join firmado_opp f on f.oportunidad_id = x.id
  left join nota_opp n on n.oportunidad_id = x.id
  left join correo_opp c on c.oportunidad_id = x.id
  left join fases_opp fa on fa.oportunidad_id = x.id
  group by x.puesto_id
), contacto as (
  select g.puesto_id,
    greatest(g.diario, np.cuando) as diario,
    greatest(g.correo, cp.cuando) as correo,
    g.fases
  from por_gestor g
  left join nota_puesto np on np.puesto_id = g.puesto_id
  left join correo_puesto cp on cp.puesto_id = g.puesto_id
)
select
  g.puesto_id,
  p.consolidado_en,
  g.importe_firmado,
  g.ultima_opp_nueva,
  greatest(k.diario, k.correo, k.fases) as ultimo_contacto,
  case greatest(k.diario, k.correo, k.fases)
    when k.diario then 'diario' when k.correo then 'correo' when k.fases then 'fases' end as ultimo_contacto_fuente,
  ci.id as proxima_cita_id,
  ci.inicio as proxima_cita_inicio,
  ci.asunto as proxima_cita_asunto,
  ci.tipo_nombre as proxima_cita_tipo,
  ci.con_quien as proxima_cita_con
from por_gestor g
join public.puesto p on p.id = g.puesto_id
join contacto k on k.puesto_id = g.puesto_id
left join lateral (
  select ct.id, ct.inicio, ct.asunto, tc.nombre as tipo_nombre,
    array(
      select coalesce(nullif(trim(concat_ws(' ', pe.nombre, pe.apellidos)), ''), q2.nombre)
      from public.citas_con_quien q2
      left join public.persona pe on pe.id = q2.persona_id
      where q2.cita_id = ct.id and q2.puesto_id is distinct from g.puesto_id and (p.persona_id is null or q2.persona_id is distinct from p.persona_id)
    ) as con_quien
  from public.citas ct
  join public.citas_con_quien q on q.cita_id = ct.id and (q.puesto_id = g.puesto_id or (p.persona_id is not null and q.persona_id = p.persona_id))
  left join public.tipos_cita tc on tc.clave = ct.tipo
  where ct.estado = 'pendiente' and ct.inicio > now()
  order by ct.inicio limit 1
) ci on true;
