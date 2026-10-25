-- SE APLICA EL DIA DE LA MIGRACION (rama comercial-hojas-nuevas), despues de copiar las hojas a he_*.
-- Pendientes y anular una opp sin las hojas viejas (25-oct-2026):
--   - oportunidades_por_completar: una opp con hoja enviada o firmada (he_estados_hoja) ya no se revisa.
--   - anular_por_duplicada / anular_por_error: lo que tiene hoja (he_versiones_hoja) no se anula; fuera revisiones_oferta
--     (el ok de Daniel ya esta en el historial de cada hoja).
--   - mis_avisos: 'ofertas' = hojas en pendiente_ok_daniel; 'recibidos' del comercial, sin el cruce con hojas_encargo (las
--     firmadas nuevas van al archivo de la opp y cuentan en 'firmadas').

create or replace view public.oportunidades_por_completar as
 SELECT id,
    codigo,
    COALESCE(NULLIF(btrim(nombre), ''::text), codigo) AS direccion,
    comercial_id,
    COALESCE(fecha_apertura, creado_en::date) AS desde,
    NOT (EXISTS ( SELECT 1
           FROM relacion_oportunidad_accesos r
          WHERE r.opp_id = o.id AND r.hasta IS NULL)) AS falta_direccion,
    puesto_id IS NULL AND persona_comunidad_id IS NULL AND contacto_provisional IS NULL AS falta_contacto,
    siguiente_paso IS NULL AS falta_paso
   FROM oportunidades o
  WHERE estado = 'abierta'::text AND COALESCE(fecha_apertura, creado_en::date) >= '2025-01-01'::date AND NOT (EXISTS ( SELECT 1
           FROM he_estados_hoja e JOIN he_versiones_hoja v ON v.id = e.version_id
          WHERE v.oportunidad_id = o.id AND (e.estado = ANY (ARRAY['enviada'::text, 'firmada_recibida'::text])))) AND (NOT (EXISTS ( SELECT 1
           FROM relacion_oportunidad_accesos r
          WHERE r.opp_id = o.id AND r.hasta IS NULL)) OR puesto_id IS NULL AND persona_comunidad_id IS NULL AND contacto_provisional IS NULL OR siguiente_paso IS NULL);

CREATE OR REPLACE FUNCTION public.anular_por_duplicada(p_opp uuid, p_buena uuid, p_quien uuid)
 RETURNS text
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  mala  public.oportunidades;
  buena public.oportunidades;
  n int;
  movido text[] := '{}';
  quien text;
  com text;
begin
  if p_opp is null or p_buena is null or p_opp = p_buena then
    raise exception 'Hay que decir cuál es la duplicada y cuál la buena, y que no sean la misma.';
  end if;
  select * into mala from oportunidades where id = p_opp for update;
  select * into buena from oportunidades where id = p_buena for update;
  if mala.id is null or buena.id is null then raise exception 'No existe alguna de las dos opps.'; end if;
  if mala.estado = 'anulada' then raise exception 'La opp % ya está anulada.', mala.codigo; end if;
  if buena.estado = 'anulada' then raise exception 'La opp buena (%) está anulada.', buena.codigo; end if;

  -- Lo que ya tiene vida de dinero NO es un simple duplicado: eso se mira a mano.
  if exists (select 1 from he_versiones_hoja where oportunidad_id = p_opp)
     or exists (select 1 from facturas where oportunidad_id = p_opp)
     or exists (select 1 from proformas where oportunidad_id = p_opp)
     or exists (select 1 from presupuestos where oportunidad_id = p_opp)
     or exists (select 1 from presupuestos_proyecto where oportunidad_id = p_opp) then
    raise exception 'La opp % tiene hoja de encargo, presupuesto, proforma o factura: no se anula como duplicada.', mala.codigo;
  end if;

  -- Lo que cuelga de ella pasa a la buena. Lo de una sola fila por opp
  -- (negociacion, financiacion, datos del proyecto) solo si la buena no lo tiene.
  update notas_oportunidad set oportunidad_id = p_buena where oportunidad_id = p_opp; get diagnostics n = row_count;
  if n > 0 then movido := movido || (n || case when n = 1 then ' nota' else ' notas' end); end if;
  update citas set oportunidad_id = p_buena where oportunidad_id = p_opp; get diagnostics n = row_count;
  if n > 0 then movido := movido || (n || case when n = 1 then ' cita' else ' citas' end); end if;
  update interacciones set oportunidad_id = p_buena where oportunidad_id = p_opp; get diagnostics n = row_count;
  if n > 0 then movido := movido || (n || case when n = 1 then ' interacción' else ' interacciones' end); end if;
  update llamadas set donde_oportunidad_id = p_buena where donde_oportunidad_id = p_opp; get diagnostics n = row_count;
  if n > 0 then movido := movido || (n || case when n = 1 then ' llamada' else ' llamadas' end); end if;
  update documentos set oportunidad_id = p_buena where oportunidad_id = p_opp; get diagnostics n = row_count;
  if n > 0 then movido := movido || (n || case when n = 1 then ' documento' else ' documentos' end); end if;
  update viabilidades set oportunidad_id = p_buena where oportunidad_id = p_opp; get diagnostics n = row_count;
  if n > 0 then movido := movido || (n || case when n = 1 then ' viabilidad' else ' viabilidades' end); end if;
  update solicitudes_viabilidad set oportunidad_id = p_buena where oportunidad_id = p_opp; get diagnostics n = row_count;
  if n > 0 then movido := movido || (n || case when n = 1 then ' petición de viabilidad' else ' peticiones de viabilidad' end); end if;
  update tareas_seguimiento set oportunidad_id = p_buena where oportunidad_id = p_opp; get diagnostics n = row_count;
  if n > 0 then movido := movido || (n || case when n = 1 then ' tarea' else ' tareas' end); end if;
  update juntas set oportunidad_id = p_buena where oportunidad_id = p_opp; get diagnostics n = row_count;
  if n > 0 then movido := movido || (n || case when n = 1 then ' junta' else ' juntas' end); end if;
  update correos_enviados set oportunidad_id = p_buena where oportunidad_id = p_opp; get diagnostics n = row_count;
  if n > 0 then movido := movido || (n || case when n = 1 then ' correo' else ' correos' end); end if;
  update informes_generados set oportunidad_id = p_buena where oportunidad_id = p_opp; get diagnostics n = row_count;
  if n > 0 then movido := movido || (n || case when n = 1 then ' informe' else ' informes' end); end if;
  update apuntes_satelite set oportunidad_id = p_buena where oportunidad_id = p_opp;
  update avisos set oportunidad_id = p_buena where oportunidad_id = p_opp;
  update nubes_puntos set oportunidad_id = p_buena where oportunidad_id = p_opp;
  update modelos_3d_venta set oportunidad_id = p_buena where oportunidad_id = p_opp;
  update notas_subvencion set oportunidad_id = p_buena where oportunidad_id = p_opp;
  update iee_registrado set oportunidad_id = p_buena where oportunidad_id = p_opp;
  update manias_organismos set oportunidad_id = p_buena where oportunidad_id = p_opp;
  update licitaciones set oportunidad_id = p_buena where oportunidad_id = p_opp;
  update revision_firmadas set oportunidad_id = p_buena where oportunidad_id = p_opp;
  update negociacion_oportunidad set oportunidad_id = p_buena
   where oportunidad_id = p_opp and not exists (select 1 from negociacion_oportunidad where oportunidad_id = p_buena);
  update financiacion_oportunidad set oportunidad_id = p_buena
   where oportunidad_id = p_opp and not exists (select 1 from financiacion_oportunidad where oportunidad_id = p_buena);
  update datos_proyecto set oportunidad_id = p_buena
   where oportunidad_id = p_opp and not exists (select 1 from datos_proyecto where oportunidad_id = p_buena);

  -- Se suelta del edificio (asi no sale al buscar por direccion) y se anula.
  update relacion_oportunidad_accesos set hasta = (now() at time zone 'Europe/Madrid')::date
   where opp_id = p_opp and hasta is null;
  update oportunidades
     set estado = 'anulada', duplicada_de = p_buena, anulada_en = now(), anulada_por = p_quien
   where id = p_opp;

  select nombre into quien from equipo where id = p_quien;
  select nombre into com from comerciales where id = mala.comercial_id;
  perform nota_sali(p_buena, null, 'opp_duplicada_juntada',
    jsonb_build_object('duplicada', coalesce(mala.codigo, mala.nombre), 'comercial', com, 'quien', quien,
                       'movido', nullif(array_to_string(movido, ', '), '')),
    'interno');
  return coalesce(array_to_string(movido, ', '), '');
end;
$function$;

CREATE OR REPLACE FUNCTION public.anular_por_error(p_opp uuid, p_motivo text, p_quien uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  mala public.oportunidades;
  quien text;
begin
  if nullif(trim(p_motivo), '') is null then raise exception 'Escribe por qué se anula.'; end if;
  select * into mala from oportunidades where id = p_opp for update;
  if mala.id is null then raise exception 'No existe esa opp.'; end if;
  if mala.estado = 'anulada' then raise exception 'La opp % ya está anulada.', mala.codigo; end if;
  if exists (select 1 from he_versiones_hoja where oportunidad_id = p_opp)
     or exists (select 1 from facturas where oportunidad_id = p_opp)
     or exists (select 1 from proformas where oportunidad_id = p_opp)
     or exists (select 1 from presupuestos where oportunidad_id = p_opp)
     or exists (select 1 from presupuestos_proyecto where oportunidad_id = p_opp) then
    raise exception 'La opp % tiene hoja de encargo, presupuesto, proforma o factura: no se anula.', mala.codigo;
  end if;

  -- Si estaba pausada, la pausa se cierra con fecha, como al cerrar.
  update historial_pausas_oportunidad set hasta = (now() at time zone 'Europe/Madrid')::date
   where oportunidad_id = p_opp and hasta is null;
  update relacion_oportunidad_accesos set hasta = (now() at time zone 'Europe/Madrid')::date
   where opp_id = p_opp and hasta is null;
  update oportunidades
     set estado = 'anulada', motivo_anulacion = trim(p_motivo), anulada_en = now(), anulada_por = p_quien
   where id = p_opp;

  select nombre into quien from equipo where id = p_quien;
  perform nota_sali(p_opp, null, 'opp_anulada_error', jsonb_build_object('quien', quien, 'motivo', trim(p_motivo)), 'interno');
end;
$function$;

create or replace function public.mis_avisos(p_equipo uuid, p_ve_todas boolean, p_comercial uuid, p_llamadas boolean, p_ausencias boolean, p_ofertas boolean)
 returns jsonb
 language sql
 stable
 set search_path to ''
as $function$
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
    -- Los papeles de la comunidad que llegan por el portal: los revisa quien lo revisa todo. Las hojas firmadas ya no
    -- pasan por aqui: van al archivo de su opp y cuentan en 'firmadas'.
    'recibidos', case when p_ve_todas then (select count(*) from public.portal_recibidos r where r.estado = 'por_revisar' and r.tipo <> 'hoja_firmada')
                      else 0 end,
    'firmadas', case when not p_ve_todas and p_comercial is null then 0
                     else (select count(*) from public.documentos d
                             join public.tipos_documento t on t.id = d.tipo_documento_id and t.nombre = 'Hoja de encargo'
                             join public.oportunidades o on o.id = d.oportunidad_id
                            where d.vigente
                              and not exists (select 1 from public.he_versiones_hoja v where v.firmada_documento_id = d.id)
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
