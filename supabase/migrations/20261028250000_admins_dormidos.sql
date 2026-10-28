-- ADMINISTRADORES SIN MOVIMIENTO DESDE HACE 4 MESES, y «sin consolidar» solo para
-- direccion (Monica, 28-oct-2026; aplicado en produccion el 28-oct).
--
-- «Administradores sin consolidar» no es algo que el comercial pueda mover: se
-- queda para direccion. Al comercial, en cambio, los que se le enfrian: «gente
-- que ya nos dio algo hace mas de 4 meses y con quien no hemos vuelto a tener
-- contacto, con ellos o con sus opps». Los consolidados sin ningun registro (la
-- carga antigua) no salen: taparian a los que de verdad se enfrian.

create or replace view public.admins_dormidos as
with admins as (
 select p.id puesto_id, p.persona_id, p.empresa_id, p.comercial_id
 from public.puesto p left join public.empresa e on e.id = p.empresa_id
 where p.hasta is null and p.consolidado and p.contrata_id is null and p.figura_legal_propietaria_id is null
   and (e.tipo = 'administracion_fincas' or (p.empresa_id is null and p.cargo ilike 'administrador%'))
), opps as (
 select distinct a.puesto_id, v.oportunidad_id from admins a join public.administradores_de_oportunidad v on v.puesto_id = a.puesto_id
), mov as (
 select a.*, greatest(
   (select max(o.fecha_apertura) from opps x join public.oportunidades o on o.id = x.oportunidad_id where x.puesto_id = a.puesto_id),
   (select max(n.fecha) from opps x join public.notas_oportunidad n on n.oportunidad_id = x.oportunidad_id where x.puesto_id = a.puesto_id),
   (select max(n.fecha) from public.notas_administracion_fincas n
     where n.puesto_id = a.puesto_id or n.persona_id = a.persona_id or (a.empresa_id is not null and n.empresa_id = a.empresa_id))
 ) as ultimo
 from admins a)
select puesto_id, persona_id, empresa_id, comercial_id, ultimo, (current_date - ultimo) as dias
  from mov where ultimo < current_date - 120;
comment on view public.admins_dormidos is 'Administradores CONSOLIDADOS (nos firmaron algo) sin ningun movimiento en 120 dias: ni notas con ellos ni oportunidades nuevas ni notas en sus oportunidades (Monica, 28-oct-2026). Los que no tienen ningun registro no salen.';

-- El numero de «sin consolidar» en la barra: solo para direccion.
do $$
declare d text;
begin
  d := pg_get_functiondef('public.mis_avisos(uuid,boolean,uuid,boolean,boolean,boolean)'::regprocedure);
  d := regexp_replace(d, 'when p_comercial is null then 0\s+else \(select count\(\*\) from public\.puesto pu\s+where pu\.consolidado is false and pu\.contrata_id is null and pu\.hasta is null\s+and pu\.comercial_id = p_comercial\) end', 'else 0 end');
  execute d;
end $$;
