-- PENDIENTES › HOJAS FIRMADAS POR VALIDAR, CON LOS MISMOS DATOS QUE LA ESCALERA (Monica, 26-oct-2026).
-- Un PDF de hoja firmada sin enlazar solo esta «por validar» si alguna hoja de su opp espera su firma (enviada, con el
-- ok de Daniel o devuelta por firma con errores). Los 216 que dejo la migracion del 25-oct (2º, 3º y 4º PDF de hojas ya
-- firmadas; PDF de hojas archivadas o anuladas) no son trabajo de nadie. Lo demas de mis_avisos, igual.
CREATE OR REPLACE FUNCTION public.mis_avisos(p_equipo uuid, p_ve_todas boolean, p_comercial uuid, p_llamadas boolean, p_ausencias boolean, p_ofertas boolean)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
    'recibidos', case when p_ve_todas then (select count(*) from public.portal_recibidos r where r.estado = 'por_revisar' and r.tipo <> 'hoja_firmada')
                      else 0 end,
    'firmadas', case when not p_ve_todas and p_comercial is null then 0
                     else (select count(*) from public.documentos d
                             join public.tipos_documento t on t.id = d.tipo_documento_id and t.nombre = 'Hoja de encargo'
                             join public.oportunidades o on o.id = d.oportunidad_id
                            where d.vigente
                              and not exists (select 1 from public.he_versiones_hoja v where v.firmada_documento_id = d.id)
                              and exists (select 1 from public.he_versiones_hoja e
                                           where e.oportunidad_id = d.oportunidad_id and e.estado in ('ok_daniel', 'enviada', 'firma_con_errores'))
                              and (p_ve_todas or o.comercial_id = p_comercial)) end,
    'ofertas', case when p_ofertas then (select count(*) from public.he_versiones_hoja h where h.estado = 'pendiente_ok_daniel') else 0 end,
    'polycam', (select count(*) from public.escaneados_polycam e
                 where not exists (select 1 from public.relacion_polycam_acceso r where r.polycam_id = e.id)
                   and coalesce(trim(e.remitente), '') !~* '@([a-z0-9-]+\.)*google\.com$'),
    'sin_admin', case when not p_ve_todas and p_comercial is null then 0
                      when exists (select 1 from public.opps_abiertas_sin_gestor s
                                    where s.fecha_apertura >= '2025-01-01'
                                      and (p_ve_todas or s.comercial_id = p_comercial)) then 1
                      else 0 end
  );
$function$;
