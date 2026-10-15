-- CARTERA DE ADMINISTRADORES: LO DE CADA GESTOR, EN UNA CONSULTA (Monica,
-- 15-oct-2026, pedido del hilo grafico). "Que no se calcule opp a opp en la
-- pantalla, que la app va lenta". Una fila por GESTOR (puesto) que lleva alguna
-- opp (admin_de_oportunidad).
--   importe_firmado   suma del importe_base de cada hoja firmada de sus opps (la
--                     version firmada; si no consta, la ultima)
--   ultima_opp_nueva  la apertura mas reciente de sus opps ("dormido" = ha firmado
--                     y lleva mas de 3 meses sin opp nueva)
--   ultimo_contacto   lo mas reciente de: el diario de sus opps (sin Sali) o una
--                     nota con el; un correo enviado de sus opps o a su correo; un
--                     cambio de paso de sus opps. Y de cual sale (_fuente).
--   proxima_cita_*    la siguiente cita pendiente con el, y con quien mas
--   consolidado_en    para "nuevo" (consolidado hace menos de 3 meses)
-- Se calcula de una pasada (agregados por opp y luego por gestor), no gestor a
-- gestor. Y opps_abiertas_sin_gestor: lo que la pantalla pone a la derecha.

create or replace view public.cartera_gestor_resumen as
with opps as materialized (
  select a.puesto_id, o.id, coalesce(o.fecha_apertura, o.creado_en::date) as apertura
  from public.admin_de_oportunidad a join public.oportunidades o on o.id = a.oportunidad_id
  where a.puesto_id is not null
), firmado_opp as (
  select h.oportunidad_id, sum(v.importe_base) as importe
  from public.hojas_encargo h
  join lateral (
    select vv.importe_base from public.versiones_hoja vv
    where vv.hoja_encargo_id = h.id
    order by (vv.id = h.version_firmada_id) desc, vv.numero_version desc limit 1
  ) v on true
  where h.estado = 'devuelta_firmada'
  group by h.oportunidad_id
), nota_opp as (
  select oportunidad_id, max(coalesce(fecha::timestamptz, creado_en)) as cuando
  from public.notas_oportunidad where origen <> 'sali' group by oportunidad_id
), nota_puesto as (
  select quien_puesto_id as puesto_id, max(coalesce(fecha::timestamptz, creado_en)) as cuando
  from public.notas_oportunidad where origen <> 'sali' and quien_puesto_id is not null group by quien_puesto_id
), correo_opp as (
  select oportunidad_id, max(creado_en) as cuando from public.correos_enviados where ok and oportunidad_id is not null group by oportunidad_id
), correo_puesto as (
  select co.puesto_id, max(ce.creado_en) as cuando
  from public.correos_enviados ce
  cross join lateral unnest(ce.para) as d(email)
  join public.correo co on co.puesto_id is not null and lower(co.email) = lower(d.email)
  where ce.ok group by co.puesto_id
), fases_opp as (
  select oportunidad_id, max(cuando) as cuando from public.historial_estado_oportunidad where cuando <= now() group by oportunidad_id
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
      select coalesce(nullif(trim(concat_ws(' ', pe.nombre, pe.apellidos)), ''), pc.nombre, q2.nombre)
      from public.citas_con_quien q2
      left join public.persona pe on pe.id = q2.persona_id
      left join public.personas_comunidad pc on pc.id = q2.persona_comunidad_id
      where q2.cita_id = ct.id and q2.puesto_id is distinct from g.puesto_id and (p.persona_id is null or q2.persona_id is distinct from p.persona_id)
    ) as con_quien
  from public.citas ct
  join public.citas_con_quien q on q.cita_id = ct.id and (q.puesto_id = g.puesto_id or (p.persona_id is not null and q.persona_id = p.persona_id))
  left join public.tipos_cita tc on tc.clave = ct.tipo
  where ct.estado = 'pendiente' and ct.inicio > now()
  order by ct.inicio limit 1
) ci on true;

comment on view public.cartera_gestor_resumen is 'Cartera de administradores: lo de cada gestor (puesto) en una consulta: importe firmado, ultima opp nueva, ultimo contacto y su fuente, proxima cita, consolidado_en (Monica, 15-oct-2026).';

create or replace view public.opps_abiertas_sin_gestor as
select o.id as oportunidad_id, o.comercial_id, o.codigo, o.nombre, o.fecha_apertura, o.creado_en,
  array(select t.nombre from public.oportunidad_tipos ot join public.tipos_proyecto t on t.id = ot.tipo_id where ot.oportunidad_id = o.id order by t.nombre) as quieren
from public.oportunidades o
join public.admin_de_oportunidad a on a.oportunidad_id = o.id
where a.puesto_id is null and o.estado = 'abierta';

comment on view public.opps_abiertas_sin_gestor is 'Las opps abiertas sin gestor (administrador), con lo que quieren: la columna derecha de la cartera de administradores (15-oct-2026).';
