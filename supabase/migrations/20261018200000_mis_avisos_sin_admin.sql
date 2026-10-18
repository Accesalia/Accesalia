-- MIS AVISOS + OPPS SIN ADMINISTRADOR (Monica, 18-oct-2026: «no, porque atura,
-- pero que cuente como 1 si queda algun admin sin poner; asi, si solo queda eso,
-- hay señal»).
--
-- La tarjeta «Opps sin administrador» de Pendientes (las abiertas de 2025-26
-- cuya comunidad no tiene administrador) NO suma su cifra al numero de la
-- barra: serian cientos. Suma 1 si queda alguna, 0 si no. Mismas reglas que la
-- tarjeta: direccion, todas; un comercial, las suyas; nadie mas.
-- Igual que 20261016120000_mis_avisos.sql, con 'sin_admin' al final.

create or replace function public.mis_avisos(
  p_equipo uuid,
  p_ve_todas boolean,
  p_comercial uuid,
  p_llamadas boolean,
  p_ausencias boolean,
  p_ofertas boolean
)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with autores as (
    select p_equipo as id
    union
    select c.equipo_id from public.relacion_cartera_compartida r
      join public.comerciales c on c.id = r.comercial_id
     where r.equipo_id = p_equipo and c.equipo_id is not null
  )
  select jsonb_build_object(
    'notas', (select count(*) from public.notas_pendientes n
               where n.estado = 'pendiente' and (p_ve_todas or n.autor_id in (select id from autores))),
    'opps', case when p_ve_todas then (select count(*) from public.oportunidades_por_completar)
                 when p_comercial is null then 0
                 else (select count(*) from public.oportunidades_por_completar o where o.comercial_id = p_comercial) end,
    'llamadas', case when p_llamadas then (select count(*) from public.llamadas l where l.estado = 'por_colocar') else 0 end,
    'ausencias', case when p_ausencias then (select count(*) from public.rrhh_ausencias a
                                              where a.estado = 'solicitada' and a.persona_id <> p_equipo) else 0 end,
    'posibles', case when p_ve_todas then (select count(*) from public.puesto pu
                                            where pu.consolidado is false and pu.contrata_id is null and pu.hasta is null
                                              and pu.comercial_captador_id is not null)
                     when p_comercial is null then 0
                     else (select count(*) from public.puesto pu
                            where pu.consolidado is false and pu.contrata_id is null and pu.hasta is null
                              and pu.comercial_captador_id = p_comercial) end,
    'recibidos', case when p_ve_todas then (select count(*) from public.portal_recibidos r where r.estado = 'por_revisar')
                      when p_comercial is null then 0
                      else (select count(*) from public.portal_recibidos r
                              join public.hojas_encargo h on h.id = r.hoja_encargo_id
                              join public.oportunidades o on o.id = h.oportunidad_id
                             where r.estado = 'por_revisar' and r.tipo = 'hoja_firmada' and o.comercial_id = p_comercial) end,
    'ofertas', case when p_ofertas then (select count(*) from public.revisiones_oferta v where v.estado = 'pendiente') else 0 end,
    'polycam', (select count(*) from public.escaneados_polycam e
                 where not exists (select 1 from public.relacion_polycam_acceso r where r.polycam_id = e.id)
                   and coalesce(trim(e.remitente), '') !~* '@([a-z0-9-]+\.)*google\.com$'),
    'sin_admin', case when not p_ve_todas and p_comercial is null then 0
                      when exists (select 1 from public.opps_abiertas_sin_gestor s
                                    where s.fecha_apertura >= '2025-01-01'
                                      and (p_ve_todas or s.comercial_id = p_comercial)) then 1
                      else 0 end
  );
$$;

grant execute on function public.mis_avisos(uuid, boolean, uuid, boolean, boolean, boolean) to service_role;
