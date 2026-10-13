-- =====================================================================
-- LA CARTERA DE ADMINISTRADORES, CONECTADA
-- Monica, 13-oct-2026: "conectar BIEN esa fontaneria; luego completare el dato
-- y se deberia actualizar automaticamente". Por eso son VISTAS: no guardan
-- nada, lo calculan cada vez desde lo que hay.
--
-- 1. EL ADMINISTRADOR DE CADA OPORTUNIDAD: "que persona-administrador lleva el
--    papeleo de la comunidad en esta opp". Cada opp, UN admin vigente: el de
--    la propia oportunidad (administrador_puesto_id) y, si no lo tiene, el
--    responsable vigente de su comunidad. Si la comunidad tuviera varios, el
--    mas reciente.
--
-- 2. EL RESULTADO DE CADA OPORTUNIDAD:
--      ganada   = tiene hoja firmada;
--      perdida  = cerrada sin hoja firmada;
--      en curso = abierta (o pausada) sin hoja firmada.
--    Y los dias desde la apertura hasta su primera firma.
--
-- 3. LA CARTERA POR GESTOR: cuantas en curso, ganadas y perdidas tiene cada
--    administrador, su porcentaje (ganadas / (ganadas + perdidas)) y sus dias
--    medios hasta la firma.
-- =====================================================================

create view public.admin_de_oportunidad as
select o.id as oportunidad_id,
       coalesce(
         o.administrador_puesto_id,
         (select r.puesto_id
            from public.comunidad_admin_responsable r
           where r.comunidad_id = o.comunidad_id and r.vigente and r.puesto_id is not null
           order by r.desde desc nulls last, r.creado_en desc
           limit 1)
       ) as puesto_id
from public.oportunidades o;

comment on view public.admin_de_oportunidad is
  'El administrador (gestor) de cada oportunidad: el suyo, o si no el responsable vigente de su comunidad. Uno por opp (Monica, 13-oct-2026).';

create view public.resultado_oportunidad as
select o.id as oportunidad_id,
       o.estado,
       o.fecha_apertura,
       f.primera_firma,
       case
         when f.primera_firma is not null or f.hay_firmada then 'ganada'
         when o.estado = 'cerrada' then 'perdida'
         else 'en_curso'
       end as resultado,
       case when f.primera_firma is not null and o.fecha_apertura is not null
            then f.primera_firma - o.fecha_apertura end as dias_hasta_firma
from public.oportunidades o
left join lateral (
  select min(h.fecha_firma) as primera_firma, bool_or(h.estado = 'devuelta_firmada') as hay_firmada
    from public.hojas_encargo h
   where h.oportunidad_id = o.id and h.estado = 'devuelta_firmada'
) f on true;

comment on view public.resultado_oportunidad is
  'Ganada = hoja firmada; perdida = cerrada sin hoja firmada; en curso = abierta sin hoja firmada. Y los dias de la apertura a la primera firma (Monica, 13-oct-2026).';

create view public.cartera_gestores as
select p.id as puesto_id,
       p.persona_id,
       p.comercial_id,
       p.comercial_captador_id,
       p.consolidado,
       p.consolidado_en,
       p.desde,
       p.creado_en,
       trim(coalesce(pe.nombre, '') || ' ' || coalesce(pe.apellidos, '')) as nombre,
       e.nombre_accesalia as administracion,
       p.telefono_empresa as telefono,
       count(r.oportunidad_id) filter (where r.resultado = 'en_curso') as en_curso,
       count(r.oportunidad_id) filter (where r.resultado = 'ganada') as ganadas,
       count(r.oportunidad_id) filter (where r.resultado = 'perdida') as perdidas,
       count(r.oportunidad_id) as total,
       round(avg(r.dias_hasta_firma) filter (where r.dias_hasta_firma >= 0)) as dias_medios
from public.puesto p
left join public.persona pe on pe.id = p.persona_id
left join public.empresa e on e.id = p.empresa_id
left join public.admin_de_oportunidad a on a.puesto_id = p.id
left join public.resultado_oportunidad r on r.oportunidad_id = a.oportunidad_id
where p.contrata_id is null and p.hasta is null
group by p.id, pe.nombre, pe.apellidos, e.nombre_accesalia;

comment on view public.cartera_gestores is
  'Cada gestor de administracion con sus oportunidades en curso, ganadas y perdidas y sus dias medios hasta la firma. Para la pestaña de cartera del area comercial (Monica, 13-oct-2026).';

-- Las oportunidades de cada gestor, para desplegarlas en la lista.
create view public.oportunidades_de_gestor as
select a.puesto_id,
       o.id as oportunidad_id,
       o.codigo,
       coalesce(c.nombre, o.nombre, o.comunidad_provisional) as direccion,
       r.resultado,
       r.fecha_apertura,
       r.primera_firma
from public.admin_de_oportunidad a
join public.oportunidades o on o.id = a.oportunidad_id
join public.resultado_oportunidad r on r.oportunidad_id = o.id
left join public.comunidades c on c.id = o.comunidad_id
where a.puesto_id is not null;
