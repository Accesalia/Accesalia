-- MIS AVISOS, TODOS DE UNA VEZ (Monica, 16-oct-2026: "se trata de corregir la
-- raiz, que se haga la carga bien").
--
-- La barra de arriba (PENDIENTES y la pildora de ofertas) y las tarjetas del
-- menu hacian 8-10 peticiones en 3 tandas seguidas en CADA pantalla, una de
-- ellas bajandose los documentos del portal enteros y otra las tablas de
-- escaneados y vinculos de Polycam para contar 12. Aqui se cuenta todo dentro
-- de la base, en una sola llamada.
--
-- Las reglas de quien ve que son las de siempre (lib/misPendientes.ts); lo que
-- depende de los permisos lo decide la app y llega como parametro:
--   p_ve_todas   direccion o supervision comercial: todas las notas, opps,
--                posibles y documentos;
--   p_comercial  la cartera que abre (la suya o la que comparte), o null;
--   p_llamadas   coloca llamadas (secretaria o direccion);
--   p_ausencias  resuelve vacaciones (RRHH en trabajar o mas);
--   p_ofertas    revisa ofertas (funcion revision_ofertas).

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
    -- Las notas suyas y las del comercial cuya cartera comparte.
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
    -- Los escaneados de Polycam sin portal (sin los avisos de Google).
    'polycam', (select count(*) from public.escaneados_polycam e
                 where not exists (select 1 from public.relacion_polycam_acceso r where r.polycam_id = e.id)
                   and coalesce(trim(e.remitente), '') !~* '@([a-z0-9-]+\.)*google\.com$')
  );
$$;

comment on function public.mis_avisos(uuid, boolean, uuid, boolean, boolean, boolean) is
  'Todos los contadores de la barra y del menu de una persona, en una llamada (lib/misPendientes.ts).';

revoke execute on function public.mis_avisos(uuid, boolean, uuid, boolean, boolean, boolean) from anon, authenticated, public;
grant execute on function public.mis_avisos(uuid, boolean, uuid, boolean, boolean, boolean) to service_role;
