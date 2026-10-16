-- OPPS POR FASES, CRUZADA EN LA BASE (Monica, 16-oct-2026: "si la carga y
-- busqueda esta mal planteada, vamos a la raiz").
--
-- La pantalla leia las opps abiertas y despues se bajaba TODAS sus notas,
-- interacciones y llamadas, y los administradores de sus comunidades, en unas
-- 30 peticiones a la vez, para quedarse con una fecha y un nombre por opp. Con
-- la base saturada por esa rafaga, cada peticion pasaba de 10 ms a 300-680 ms.
-- Aqui sale lo mismo en una sola consulta, ya cruzado (32 ms para todas las
-- abiertas de todos los comerciales).
--
-- Una fila por opp abierta con paso en la escalera (estado_oportunidad):
--   ultimo_contacto: la fecha mas reciente, sin pasar de hoy, del diario
--     (notas_oportunidad), de las interacciones y de las llamadas;
--   admin_*: el administrador vigente de su comunidad;
--   municipio, lat, lng: de sus portales (los vivos primero); la posicion de la
--     comunidad manda si la tiene.
--
-- security_invoker: solo la lee el servidor (clave secreta); con la clave
-- publica no se ve nada.

create or replace view public.opps_por_fases
with (security_invoker = true) as
with hoy as (select (now() at time zone 'Europe/Madrid')::date as dia),
contacto as (
  select x.opp, max(x.d) as d
    from (
      select oportunidad_id as opp, coalesce(fecha, (creado_en at time zone 'Europe/Madrid')::date) as d from public.notas_oportunidad
      union all
      select oportunidad_id, coalesce(fecha_evento::date, (creado_en at time zone 'Europe/Madrid')::date) from public.interacciones where oportunidad_id is not null
      union all
      select donde_oportunidad_id, (creado_en at time zone 'Europe/Madrid')::date from public.llamadas where donde_oportunidad_id is not null
    ) x, hoy
   where x.d <= hoy.dia
   group by x.opp
),
adm as (
  select distinct on (car.comunidad_id)
         car.comunidad_id,
         em.nombre_accesalia as empresa,
         nullif(concat_ws(' ', pe.nombre, pe.apellidos), '') as persona,
         coalesce(pu.telefono_empresa, pe.telefono_personal) as telefono
    from public.comunidad_admin_responsable car
    left join public.empresa em on em.id = car.empresa_id
    left join public.puesto pu on pu.id = car.puesto_id
    left join public.persona pe on pe.id = pu.persona_id
   where car.vigente
   order by car.comunidad_id
),
portal as (
  select distinct on (r.opp_id) r.opp_id, a.municipio, f.lat, f.lng
    from public.relacion_oportunidad_accesos r
    join public.accesos a on a.id = r.acceso_id
    left join public.ficha_catastro_portal p on p.id = a.ficha_catastro_portal_id
    left join public.ficha_catastro f on f.id = p.ficha_id
   order by r.opp_id, r.hasta nulls first, (f.lat is null)
)
select o.id,
       o.nombre,
       o.codigo,
       o.comercial_id,
       e.clave,
       e.fase,
       e.desde,
       c.d as ultimo_contacto,
       adm.empresa as admin_empresa,
       adm.persona as admin_persona,
       adm.telefono as admin_telefono,
       po.municipio,
       coalesce(cm.lat, po.lat) as lat,
       coalesce(cm.lng, po.lng) as lng
  from public.oportunidades o
  join public.estado_oportunidad e on e.oportunidad_id = o.id and e.fase is not null
  left join contacto c on c.opp = o.id
  left join public.comunidades cm on cm.id = o.comunidad_id
  left join adm on adm.comunidad_id = o.comunidad_id
  left join portal po on po.opp_id = o.id
 where o.estado = 'abierta';

comment on view public.opps_por_fases is
  'Opps abiertas con su paso, ultimo contacto, administrador y posicion, ya cruzado (pantalla Opps por fases, lib/oppsPorFases.ts).';

revoke all on public.opps_por_fases from anon, authenticated;
grant select on public.opps_por_fases to service_role;
