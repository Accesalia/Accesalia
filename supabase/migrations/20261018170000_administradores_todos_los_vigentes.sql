-- Monica, 18-oct-2026: si una comunidad tiene dos administradores vigentes («como no lo sé, y es la misma administración,
-- ponemos a las dos»), salen los dos: una fila por cada administrador vigente (antes, DISTINCT ON se quedaba con uno).
-- Aplicada en prod con este mismo contenido (migración administradores_de_oportunidad_todos_los_vigentes).
create or replace view public.administradores_de_oportunidad
with (security_invoker = true) as
with admin_vigente as (
  select r.comunidad_id, r.id as admin_responsable_id, r.puesto_id, r.empresa_id
    from public.comunidad_admin_responsable r
   where r.vigente
),
por_accesos as (
  select distinct r.opp_id as oportunidad_id, a.figura_legal_propietaria_id as comunidad_id
    from public.relacion_oportunidad_accesos r
    join public.accesos a on a.id = r.acceso_id
   where r.hasta is null
),
filas as (
  select o.id as oportunidad_id, p.comunidad_id, 'accesos'::text as origen
    from public.oportunidades o
    join por_accesos p on p.oportunidad_id = o.id
   where o.estado <> 'anulada'
  union all
  select o.id, o.comunidad_id, 'opp_sin_accesos'
    from public.oportunidades o
   where o.estado <> 'anulada'
     and not exists (select 1 from por_accesos p where p.oportunidad_id = o.id)
)
select f.oportunidad_id, f.comunidad_id, f.origen, av.admin_responsable_id, av.puesto_id, av.empresa_id
  from filas f
  left join admin_vigente av on av.comunidad_id = f.comunidad_id;

comment on view public.administradores_de_oportunidad is
  'EL administrador de cada opp (Monica, 18-oct-2026): opp -> accesos vigentes -> comunidad -> administradores vigentes (todos: si una comunidad tiene dos, salen los dos). Una fila por opp, comunidad y administrador. origen = opp_sin_accesos: respaldo por oportunidades.comunidad_id, solo para opps sin accesos. Es la unica forma de saber el administrador de una opp: todo lo demas lee de aqui.';

-- Al firmar: TODOS los administradores vigentes de la comunidad de la hoja.
create or replace function public.consolidar_admin_al_firmar()
returns trigger
language plpgsql
as $function$
declare
  o record;
  admins uuid[];
begin
  if new.oportunidad_id is null then
    return new;
  end if;
  select op.comercial_id, op.puesto_id into o
    from public.oportunidades op where op.id = new.oportunidad_id;
  if o.comercial_id is null then
    return new;
  end if;
  if new.comunidad_id is not null then
    select array_agg(distinct r.puesto_id) into admins
      from public.comunidad_admin_responsable r
     where r.vigente and r.comunidad_id = new.comunidad_id and r.puesto_id is not null;
  end if;
  if admins is null then
    select array_agg(distinct a.puesto_id) into admins
      from public.administradores_de_oportunidad a
     where a.oportunidad_id = new.oportunidad_id and a.puesto_id is not null;
  end if;
  if admins is null and o.puesto_id is not null then
    select array_agg(pu.id) into admins from public.puesto pu where pu.id = o.puesto_id and pu.contrata_id is null;
  end if;
  if admins is null then
    return new;
  end if;
  update public.puesto
     set consolidado = true,
         consolidado_en = coalesce(new.fecha_firma, (now() at time zone 'Europe/Madrid')::date),
         comercial_captador_id = o.comercial_id,
         comercial_id = o.comercial_id
   where id = any (admins) and not consolidado;
  return new;
end;
$function$;
