-- LOS VECINOS SUELTOS, A SU COMUNIDAD (Monica, 28-oct-2026; aplicado a mano en
-- produccion, 7 filas). Los creados en el alta de oportunidad antes del arreglo
-- quedaban sueltos: se cuelgan de la comunidad de su opp (si tiene).
with sueltos as (
  select distinct on (p.id) p.id puesto_id, o.comunidad_id
  from public.puesto p join public.oportunidades o on o.puesto_id = p.id or o.quien_lo_trae = p.persona_id
  where p.hasta is null and p.empresa_id is null and p.contrata_id is null and p.figura_legal_propietaria_id is null and p.organismo_id is null
    and (p.cargo ilike 'vecin%' or p.cargo ilike 'president%' or p.cargo ilike 'secretari%' or p.cargo ilike 'tesorer%')
    and o.comunidad_id is not null
  order by p.id, o.fecha_apertura desc nulls last
), figuras as (
  insert into public.figura_legal_propietaria (id_comodin, figura)
  select distinct s.comunidad_id, 'Comunidad de Propietarios' from sueltos s
  where not exists (select 1 from public.figura_legal_propietaria f where f.id_comodin = s.comunidad_id)
  returning id_comodin
)
update public.puesto p set figura_legal_propietaria_id = s.comunidad_id, comercial_captador_id = null, comercial_id = null
from sueltos s where p.id = s.puesto_id;
