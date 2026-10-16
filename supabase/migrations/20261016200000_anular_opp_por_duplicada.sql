-- ANULAR UNA OPP POR DUPLICADA (Monica, 16-oct-2026).
--
-- Valladolid 13 (Fuenlabrada) se dio de alta dos veces, una de Alvaro y otra de
-- Daniel. "No tengo forma de eliminar una opp una vez creada, y eso del error
-- ocurre." Cerrarla como perdida ensucia ganadas/perdidas, carteras y paneles:
-- un duplicado no es una venta perdida.
--
-- Una anulada NO SE BORRA (queda para ver que paso) pero no existe para nadie:
-- ni listas, ni carteras, ni buscador, ni estadisticas. Solo se abre por su id.
-- Al anularla, lo que colgaba de ella pasa a la buena.

-- 1 · el estado y sus datos ---------------------------------------------------
alter table public.oportunidades drop constraint if exists oportunidades_estado_check;
alter table public.oportunidades add constraint oportunidades_estado_check
  check (estado in ('abierta', 'pausada', 'cerrada', 'anulada'));

alter table public.oportunidades
  add column if not exists duplicada_de uuid references public.oportunidades(id),
  add column if not exists anulada_en timestamptz,
  add column if not exists anulada_por uuid references public.equipo(id);

alter table public.oportunidades drop constraint if exists oportunidad_anulada_coherente;
alter table public.oportunidades add constraint oportunidad_anulada_coherente
  check (((estado = 'anulada') = (anulada_en is not null and duplicada_de is not null)) and duplicada_de is distinct from id);

comment on column public.oportunidades.duplicada_de is 'Si se anulo por duplicada: la opp buena, a la que se paso lo que colgaba de esta.';
comment on column public.oportunidades.anulada_en is 'Cuando se anulo por duplicada.';
comment on column public.oportunidades.anulada_por is 'Quien la anulo (equipo).';

-- 2 · las vistas que no filtraban estado --------------------------------------
-- admin_de_oportunidad alimenta cartera_gestores, oportunidades_de_gestor y
-- cartera_gestor_resumen: fuera de ahi, fuera de las tres.
create or replace view public.admin_de_oportunidad with (security_invoker = true) as
 SELECT o.id AS oportunidad_id,
    COALESCE(o.administrador_puesto_id, ua.puesto_id) AS puesto_id
   FROM (oportunidades o
     LEFT JOIN ( SELECT DISTINCT ON (r.comunidad_id) r.comunidad_id,
            r.puesto_id
           FROM comunidad_admin_responsable r
          WHERE (r.vigente AND (r.puesto_id IS NOT NULL))
          ORDER BY r.comunidad_id, r.desde DESC NULLS LAST, r.creado_en DESC) ua ON ((ua.comunidad_id = o.comunidad_id)))
  WHERE o.estado <> 'anulada';

-- Ganada / perdida / en curso: una anulada no es ninguna de las tres.
create or replace view public.resultado_oportunidad with (security_invoker = true) as
 SELECT o.id AS oportunidad_id,
    o.estado,
    o.fecha_apertura,
    f.primera_firma,
        CASE
            WHEN (o.estado = 'anulada'::text) THEN 'anulada'::text
            WHEN ((f.primera_firma IS NOT NULL) OR f.hay_firmada) THEN 'ganada'::text
            WHEN (o.estado = 'cerrada'::text) THEN 'perdida'::text
            ELSE 'en_curso'::text
        END AS resultado,
        CASE
            WHEN ((f.primera_firma IS NOT NULL) AND (o.fecha_apertura IS NOT NULL)) THEN (f.primera_firma - o.fecha_apertura)
            ELSE NULL::integer
        END AS dias_hasta_firma
   FROM (oportunidades o
     LEFT JOIN LATERAL ( SELECT min(h.fecha_firma) AS primera_firma,
            bool_or((h.estado = 'devuelta_firmada'::text)) AS hay_firmada
           FROM hojas_encargo h
          WHERE ((h.oportunidad_id = o.id) AND (h.estado = 'devuelta_firmada'::text))) f ON (true));

-- 3 · el buscador de sitios (directorio precalculado) -------------------------
-- La definicion es la de PRODUCCION a 16-oct, con las anuladas fuera.
CREATE OR REPLACE FUNCTION public.directorio_sitios_calculo(p_grupos uuid[])
 RETURNS SETOF directorio_sitios
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with acc as (
    select a.*, coalesce(a.clave_id, a.id) as g
      from public.accesos a
     where p_grupos is null or coalesce(a.clave_id, a.id) = any (p_grupos)
  ),
  -- Los trabajos de cada grupo: las opps con algun portal vivo en el.
  rel as (
    select distinct acc.g, r.opp_id
      from acc join public.relacion_oportunidad_accesos r on r.acceso_id = acc.id and r.hasta is null
  ),
  opp_json as (
    select o.id,
           jsonb_build_object(
             'id', o.id,
             'nombre', coalesce(nullif(trim(o.nombre), ''), o.codigo, 'Sin nombre'),
             'codigo', o.codigo,
             'estado', o.estado,
             'fase', e.fase,
             'tipos', (select string_agg(t.nombre, ', ' order by t.orden nulls last, t.nombre)
                         from public.oportunidad_tipos ot join public.tipos_proyecto t on t.id = ot.tipo_id
                        where ot.oportunidad_id = o.id),
             'comercial', c.nombre,
             'apertura', coalesce(o.fecha_apertura, o.creado_en::date)
           ) as j,
           case o.estado when 'abierta' then 0 when 'pausada' then 1 else 2 end as peso,
           coalesce(o.fecha_apertura, o.creado_en::date) as apertura,
           o.estado
      from public.oportunidades o
      left join public.estado_oportunidad e on e.oportunidad_id = o.id
      left join public.comerciales c on c.id = o.comercial_id
     where (o.id in (select opp_id from rel)
        or (p_grupos is null or o.id = any (p_grupos)))
       and o.estado <> 'anulada'
  ),
  por_grupo as (
    select rel.g,
           jsonb_agg(oj.j order by oj.peso, oj.apertura desc) as opps,
           count(*) filter (where oj.estado = 'abierta')::int as n_abiertas,
           string_agg(concat_ws(' ', oj.j->>'nombre', oj.j->>'codigo', oj.j->>'tipos'), ' ') as texto_opps
      from rel join opp_json oj on oj.id = rel.opp_id
     group by rel.g
  ),
  ultimo_admin as (
    select distinct on (r.comunidad_id) r.comunidad_id,
           concat_ws(' · ', nullif(concat_ws(' ', pe.nombre, pe.apellidos), ''), em.nombre_accesalia) as admin
      from public.comunidad_admin_responsable r
      left join public.empresa em on em.id = r.empresa_id
      left join public.puesto pu on pu.id = r.puesto_id
      left join public.persona pe on pe.id = pu.persona_id
     where r.vigente
     order by r.comunidad_id, r.desde desc nulls last, r.creado_en desc
  ),
  de_portales as (
    select 'acceso:' || acc.id as fila,
           acc.g as grupo,
           acc.id as acceso_id,
           acc.clave_id,
           cl.codigo as dir_codigo,
           trim(concat_ws(' ', nullif(acc.nombre_via, ''), nullif(acc.numero, ''),
                          case when coalesce(trim(acc.escalera), '') <> '' then 'esc ' || trim(acc.escalera) end)) as portal,
           nullif(acc.municipio, '') as municipio,
           coalesce(nullif(cl.nombre, ''),
                    trim(concat_ws(', ', trim(concat_ws(' ', nullif(acc.nombre_via, ''), nullif(acc.numero, ''))), nullif(acc.municipio, '')))) as sitio,
           acc.figura_legal_propietaria_id as comunidad_id,
           cm.nombre as comunidad,
           ua.admin,
           coalesce(pg.opps, '[]'::jsonb) as opps,
           coalesce(pg.n_abiertas, 0) as n_abiertas,
           pg.texto_opps
      from acc
      left join public.claves cl on cl.id = acc.clave_id
      left join public.comunidades cm on cm.id = acc.figura_legal_propietaria_id
      left join ultimo_admin ua on ua.comunidad_id = acc.figura_legal_propietaria_id
      left join por_grupo pg on pg.g = acc.g
  ),
  -- Las opps sin ningun portal vivo: su propia fila, su propio grupo.
  sin_portal as (
    select 'opp:' || o.id as fila,
           o.id as grupo,
           null::uuid as acceso_id,
           null::uuid as clave_id,
           null::text as dir_codigo,
           null::text as portal,
           null::text as municipio,
           coalesce(nullif(trim(o.nombre), ''), nullif(trim(o.comunidad_provisional), ''), o.codigo, 'Sin nombre') as sitio,
           o.comunidad_id,
           cm.nombre as comunidad,
           ua.admin,
           jsonb_build_array(oj.j) as opps,
           case when o.estado = 'abierta' then 1 else 0 end as n_abiertas,
           concat_ws(' ', oj.j->>'nombre', oj.j->>'codigo', oj.j->>'tipos', o.comunidad_provisional) as texto_opps
      from public.oportunidades o
      join opp_json oj on oj.id = o.id
      left join public.comunidades cm on cm.id = o.comunidad_id
      left join ultimo_admin ua on ua.comunidad_id = o.comunidad_id
     where (p_grupos is null or o.id = any (p_grupos))
       and not exists (select 1 from public.relacion_oportunidad_accesos r where r.opp_id = o.id and r.hasta is null)
       and o.estado <> 'anulada'
  ),
  todas as (select * from de_portales union all select * from sin_portal)
  select t.fila, t.grupo, t.acceso_id, t.clave_id, t.dir_codigo, t.portal, t.municipio, t.sitio,
         t.comunidad_id, t.comunidad, t.admin, t.opps, t.n_abiertas,
         public.directorio_texto(concat_ws(' ', t.portal, t.municipio, t.sitio, t.dir_codigo, t.comunidad, t.texto_opps)),
         now()
    from todas t
$function$;


-- 4 · la frase de Sali en la buena ----------------------------------------------
insert into public.plantillas_sali (clave, plantilla, cuando, activo)
values ('opp_duplicada_juntada',
        'Se le juntó la opp duplicada {duplicada}[ ({comercial})], anulada[ por {quien}].[ Pasó aquí: {movido}.]',
        'Se anula una opp por duplicada y lo suyo pasa a esta',
        true)
on conflict (clave) do nothing;

-- 5 · anular ------------------------------------------------------------------
create or replace function public.anular_por_duplicada(p_opp uuid, p_buena uuid, p_quien uuid)
returns text
language plpgsql
set search_path = public
as $$
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
  if exists (select 1 from hojas_encargo where oportunidad_id = p_opp)
     or exists (select 1 from facturas where oportunidad_id = p_opp)
     or exists (select 1 from proformas where oportunidad_id = p_opp)
     or exists (select 1 from presupuestos where oportunidad_id = p_opp)
     or exists (select 1 from presupuestos_proyecto where oportunidad_id = p_opp)
     or exists (select 1 from revisiones_oferta where oportunidad_id = p_opp) then
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
$$;

revoke all on function public.anular_por_duplicada(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.anular_por_duplicada(uuid, uuid, uuid) to service_role;
