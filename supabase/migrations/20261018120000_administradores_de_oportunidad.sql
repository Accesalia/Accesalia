-- EL ADMINISTRADOR ES DE LA COMUNIDAD, NO DE LA OPP (Monica, 18-oct-2026; docs/modelo-admin-comunidad.md, paso 1).
-- «El admin no pertenece a una opp, sino a una comunidad. Ahora funciona, pero de casualidad.»
--
-- UNA sola forma de saber el administrador de una opp: la vista administradores_de_oportunidad.
--   opp -> sus accesos vigentes -> la comunidad de cada acceso -> su administrador vigente.
-- Una fila por opp y comunidad. Una opp con accesos de dos comunidades tiene dos filas («es la vida»).
-- Respaldo, AVISANDO (origen = 'opp_sin_accesos'): las opps sin ningun acceso usan la comunidad apuntada en la opp
-- (oportunidades.comunidad_id) mientras se revisan con Monica (paso 4).
-- oportunidades.administrador_puesto_id YA NO SE LEE en ningun sitio de la base (lo retira el paso 2, hilo 41).
--
-- Todo lo que sacaba el administrador por el atajo lee ahora de aqui:
--   admin_de_oportunidad (y con ella las 4 vistas de la cartera), opps_por_fases, el directorio de personas
--   (sus opps abiertas y sus reglas) y la consolidacion al firmar.

-- ------------------------------------------------------------------ la vista base
create or replace view public.administradores_de_oportunidad
with (security_invoker = true) as
with admin_vigente as (
  -- el administrador vigente de cada comunidad (si hubiera dos vigentes, el mas reciente)
  select distinct on (r.comunidad_id) r.comunidad_id, r.id as admin_responsable_id, r.puesto_id, r.empresa_id
    from public.comunidad_admin_responsable r
   where r.vigente
   order by r.comunidad_id, r.desde desc nulls last, r.creado_en desc
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
  'EL administrador de cada opp (Monica, 18-oct-2026): opp -> accesos vigentes -> comunidad -> administrador vigente. Una fila por opp y comunidad (una opp puede tener varias). origen = opp_sin_accesos: respaldo por oportunidades.comunidad_id, solo para opps sin accesos. Es la unica forma de saber el administrador de una opp: todo lo demas lee de aqui.';

-- ------------------------------------------------------------------ admin_de_oportunidad (la de la cartera)
-- Las mismas columnas que antes (oportunidad_id, puesto_id): una fila por opp y administrador con persona; y una fila
-- con puesto vacio para la opp que no tiene ninguno (asi «opps sin gestor» sigue saliendo igual).
create or replace view public.admin_de_oportunidad
with (security_invoker = true) as
select distinct a.oportunidad_id, a.puesto_id
  from public.administradores_de_oportunidad a
 where a.puesto_id is not null
union all
select o.id, null::uuid
  from public.oportunidades o
 where o.estado <> 'anulada'
   and not exists (select 1 from public.administradores_de_oportunidad a where a.oportunidad_id = o.id and a.puesto_id is not null);

-- Con varias filas por opp, los recuentos por gestor cuentan cada opp UNA vez.
create or replace view public.cartera_gestores as
 SELECT p.id AS puesto_id,
    p.persona_id,
    p.comercial_id,
    p.comercial_captador_id,
    p.consolidado,
    p.consolidado_en,
    p.desde,
    p.creado_en,
    TRIM(BOTH FROM ((COALESCE(pe.nombre, ''::text) || ' '::text) || COALESCE(pe.apellidos, ''::text))) AS nombre,
    e.nombre_accesalia AS administracion,
    p.telefono_empresa AS telefono,
    count(DISTINCT r.oportunidad_id) FILTER (WHERE (r.resultado = 'en_curso'::text)) AS en_curso,
    count(DISTINCT r.oportunidad_id) FILTER (WHERE (r.resultado = 'ganada'::text)) AS ganadas,
    count(DISTINCT r.oportunidad_id) FILTER (WHERE (r.resultado = 'perdida'::text)) AS perdidas,
    count(DISTINCT r.oportunidad_id) AS total,
    round(avg(r.dias_hasta_firma) FILTER (WHERE (r.dias_hasta_firma >= 0))) AS dias_medios
   FROM ((((puesto p
     LEFT JOIN persona pe ON ((pe.id = p.persona_id)))
     LEFT JOIN empresa e ON ((e.id = p.empresa_id)))
     LEFT JOIN admin_de_oportunidad a ON ((a.puesto_id = p.id)))
     LEFT JOIN resultado_oportunidad r ON ((r.oportunidad_id = a.oportunidad_id)))
  WHERE ((p.contrata_id IS NULL) AND (p.hasta IS NULL))
  GROUP BY p.id, pe.nombre, pe.apellidos, e.nombre_accesalia;
-- (oportunidades_de_gestor, cartera_gestor_resumen y opps_abiertas_sin_gestor no cambian: ya filtran por puesto,
--  cuentan con DISTINCT o piden puesto vacio, y una opp sale una vez por gestor.)

-- ------------------------------------------------------------------ opps_por_fases
-- El administrador sale de la vista base (antes: de la comunidad apuntada en la opp). Si son varios, juntos con « / ».
create or replace view public.opps_por_fases
with (security_invoker = true) as
 WITH hoy AS (
         SELECT ((now() AT TIME ZONE 'Europe/Madrid'::text))::date AS dia
        ), contacto AS (
         SELECT x.opp,
            max(x.d) AS d
           FROM ( SELECT notas_oportunidad.oportunidad_id AS opp,
                    COALESCE(notas_oportunidad.fecha, ((notas_oportunidad.creado_en AT TIME ZONE 'Europe/Madrid'::text))::date) AS d
                   FROM notas_oportunidad
                UNION ALL
                 SELECT interacciones.oportunidad_id,
                    COALESCE(interacciones.fecha_evento, ((interacciones.creado_en AT TIME ZONE 'Europe/Madrid'::text))::date) AS "coalesce"
                   FROM interacciones
                  WHERE (interacciones.oportunidad_id IS NOT NULL)
                UNION ALL
                 SELECT llamadas.donde_oportunidad_id,
                    ((llamadas.creado_en AT TIME ZONE 'Europe/Madrid'::text))::date AS timezone
                   FROM llamadas
                  WHERE (llamadas.donde_oportunidad_id IS NOT NULL)) x,
            hoy
          WHERE (x.d <= hoy.dia)
          GROUP BY x.opp
        ), adm AS (
         SELECT a.oportunidad_id,
            string_agg(DISTINCT em.nombre_accesalia, ' / '::text) AS empresa,
            string_agg(DISTINCT NULLIF(concat_ws(' '::text, pe.nombre, pe.apellidos), ''::text), ' / '::text) AS persona,
            string_agg(DISTINCT COALESCE(pu.telefono_empresa, pe.telefono_personal), ' / '::text) AS telefono
           FROM (((administradores_de_oportunidad a
             LEFT JOIN empresa em ON ((em.id = a.empresa_id)))
             LEFT JOIN puesto pu ON ((pu.id = a.puesto_id)))
             LEFT JOIN persona pe ON ((pe.id = pu.persona_id)))
          WHERE (a.admin_responsable_id IS NOT NULL)
          GROUP BY a.oportunidad_id
        ), portal AS (
         SELECT DISTINCT ON (r.opp_id) r.opp_id,
            a.municipio,
            f.lat,
            f.lng
           FROM (((relacion_oportunidad_accesos r
             JOIN accesos a ON ((a.id = r.acceso_id)))
             LEFT JOIN ficha_catastro_portal p ON ((p.id = a.ficha_catastro_portal_id)))
             LEFT JOIN ficha_catastro f ON ((f.id = p.ficha_id)))
          ORDER BY r.opp_id, r.hasta NULLS FIRST, (f.lat IS NULL)
        )
 SELECT o.id,
    o.nombre,
    o.codigo,
    o.comercial_id,
    e.clave,
    e.fase,
    e.desde,
    c.d AS ultimo_contacto,
    adm.empresa AS admin_empresa,
    adm.persona AS admin_persona,
    adm.telefono AS admin_telefono,
    po.municipio,
    COALESCE(cm.lat, po.lat) AS lat,
    COALESCE(cm.lng, po.lng) AS lng
   FROM (((((oportunidades o
     JOIN estado_oportunidad e ON (((e.oportunidad_id = o.id) AND (e.fase IS NOT NULL))))
     LEFT JOIN contacto c ON ((c.opp = o.id)))
     LEFT JOIN comunidades cm ON ((cm.id = o.comunidad_id)))
     LEFT JOIN adm ON ((adm.oportunidad_id = o.id)))
     LEFT JOIN portal po ON ((po.opp_id = o.id)))
  WHERE (o.estado = 'abierta'::text);

-- ------------------------------------------------------------------ directorio de personas
-- «N opps abiertas» de cada administrador: las de la vista base (antes: el campo de la opp o su comunidad apuntada).
-- (Funcion igual que en 20261016130000_directorio_personas.sql salvo el bloque «abiertas».)
create or replace function public.directorio_personas_calculo(p_personas uuid[])
returns setof public.directorio_personas
language sql
stable
security definer
set search_path = ''
as $$
  with hoy as (select (now() at time zone 'Europe/Madrid')::date as d),
  -- Las opps abiertas de cada administrador: las de la vista base (opp -> accesos -> comunidad -> administrador).
  abiertas as (
    select a.puesto_id, count(distinct a.oportunidad_id)::int as n
      from public.administradores_de_oportunidad a
      join public.oportunidades o on o.id = a.oportunidad_id
     where o.estado = 'abierta' and a.puesto_id is not null
     group by 1
  ),
  pu as (
    select p.*,
           (p.hasta is null or p.hasta >= hoy.d) as es_vigente,
           pe.nombre as pe_nombre, pe.apellidos as pe_apellidos, pe.telefono_personal, pe.equipo_id,
           em.nombre_accesalia as em_nombre,
           ct.nombre as ct_nombre,
           og.nombre as og_nombre,
           cm.nombre as cm_nombre, cm.municipio as cm_municipio,
           coalesce(ab.n, 0) as n_abiertas
      from public.puesto p
      join public.persona pe on pe.id = p.persona_id
      cross join hoy
      left join public.empresa em on em.id = p.empresa_id
      left join public.contratas ct on ct.id = p.contrata_id
      left join public.organismos og on og.id = p.organismo_id
      left join public.comunidades cm on cm.id = p.figura_legal_propietaria_id
      left join abiertas ab on ab.puesto_id = p.id
     where p_personas is null or p.persona_id = any (p_personas)
  ),
  pu2 as (
    select pu.*,
           coalesce(pu.telefono_empresa, pu.telefono_personal) as tel,
           -- "CP MONTESA 27 MADRID" -> "MONTESA 27, MADRID" (comunidadConMunicipio).
           case when pu.cm_nombre is null then null else (
             with s as (select trim(regexp_replace(pu.cm_nombre, '^\s*((CP|CDAD\.?\s+PROP|COMUNIDAD\s+DE\s+PROPIETARIOS)\.?\s+)+', '', 'i')) as sin,
                               trim(coalesce(pu.cm_municipio, '')) as m)
             select case when s.m = '' then s.sin
                         when lower(s.sin) like '% ' || lower(s.m) then trim(left(s.sin, length(s.sin) - length(s.m))) || ', ' || right(s.sin, length(s.m))
                         else s.sin || ', ' || s.m end
               from s) end as comunidad_txt,
           (select coalesce(array_agg(distinct c.email order by c.email), '{}')
              from public.correo c
             where c.email is not null and (c.puesto_id = pu.id or (c.persona_id = pu.persona_id and c.puesto_id is null))) as mails
      from pu
  ),
  de_puestos as (
    select 'puesto:' || p.id as fila,
           p.persona_id,
           p.id as puesto_id,
           trim(concat_ws(' ', p.pe_nombre, p.pe_apellidos)) as nombre,
           case when p.em_nombre is not null then 'administracion'
                when p.ct_nombre is not null then 'contrata'
                when p.og_nombre is not null then 'organismo'
                when p.figura_legal_propietaria_id is not null then 'comunidad'
                else 'otro' end as donde_tipo,
           coalesce(p.empresa_id, p.contrata_id, p.organismo_id, p.figura_legal_propietaria_id) as donde_id,
           coalesce(p.em_nombre, p.ct_nombre, p.og_nombre, p.comunidad_txt) as donde,
           p.cargo,
           p.tel as telefono,
           p.mails as correos,
           p.n_abiertas as opps_abiertas,
           p.es_vigente as vigente,
           p.desde,
           p.hasta,
           p.equipo_id is not null as de_accesalia,
           array_to_string(array_remove(
             case when p.em_nombre is not null then array[p.em_nombre,
                       case when p.n_abiertas = 0 then null when p.n_abiertas = 1 then '1 opp abierta' else p.n_abiertas || ' opps abiertas' end]
                  when p.ct_nombre is not null then array['contrata ' || p.ct_nombre, p.cargo]
                  when p.og_nombre is not null then array[p.og_nombre, p.cargo]
                  when p.figura_legal_propietaria_id is not null then array[upper(left(p.cargo, 1)) || substr(p.cargo, 2), p.comunidad_txt]
                  else array[p.cargo] end || array[p.tel], null), ' · ') as pista
      from pu2 p
  ),
  sueltas as (
    select 'persona:' || pe.id as fila,
           pe.id as persona_id,
           null::uuid as puesto_id,
           trim(concat_ws(' ', pe.nombre, pe.apellidos)) as nombre,
           'sin_puesto' as donde_tipo,
           null::uuid as donde_id,
           null::text as donde,
           null::text as cargo,
           pe.telefono_personal as telefono,
           (select coalesce(array_agg(distinct c.email order by c.email), '{}') from public.correo c where c.persona_id = pe.id and c.email is not null) as correos,
           0 as opps_abiertas,
           coalesce(pe.activa, true) as vigente,
           null::date as desde,
           null::date as hasta,
           pe.equipo_id is not null as de_accesalia,
           coalesce(pe.telefono_personal, '') as pista
      from public.persona pe
     where (p_personas is null or pe.id = any (p_personas))
       and not exists (select 1 from public.puesto p where p.persona_id = pe.id)
  ),
  todas as (select * from de_puestos union all select * from sueltas)
  select t.fila, t.persona_id, t.puesto_id, t.nombre, t.donde_tipo, t.donde_id, t.donde, t.cargo, t.telefono, t.correos,
         t.opps_abiertas, t.vigente, t.desde, t.hasta, t.de_accesalia, coalesce(t.pista, ''),
         public.directorio_texto(concat_ws(' ', t.nombre, t.cargo, t.donde, t.telefono, regexp_replace(coalesce(t.telefono, ''), '\D', '', 'g'),
                                           array_to_string(t.correos, ' '), case when t.de_accesalia then 'accesalia' end)),
         now()
    from todas t
$$;

-- Las reglas: el numero de opps abiertas de un administrador cambia si cambia una opp, el administrador de una
-- comunidad, los accesos de una opp o la comunidad de un acceso.
create or replace function public.directorio_personas_avisar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  ids uuid[] := '{}';
  n jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end;
  o jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end;
  comunidades uuid[];
begin
  if tg_table_name = 'persona' then
    ids := array_remove(array[(n->>'id')::uuid], null);
  elsif tg_table_name = 'puesto' then
    ids := array_remove(array[(n->>'persona_id')::uuid, (o->>'persona_id')::uuid], null);
  elsif tg_table_name = 'correo' then
    select array_agg(x) into ids from (
      select (n->>'persona_id')::uuid as x union select (o->>'persona_id')::uuid
      union select p.persona_id from public.puesto p where p.id in ((n->>'puesto_id')::uuid, (o->>'puesto_id')::uuid)
    ) s where x is not null;
  elsif tg_table_name = 'comunidades' then
    select array_agg(distinct p.persona_id) into ids from public.puesto p where p.figura_legal_propietaria_id = (coalesce(n, o)->>'id')::uuid;
  elsif tg_table_name = 'empresa' then
    select array_agg(distinct p.persona_id) into ids from public.puesto p where p.empresa_id = (coalesce(n, o)->>'id')::uuid;
  elsif tg_table_name = 'contratas' then
    select array_agg(distinct p.persona_id) into ids from public.puesto p where p.contrata_id = (coalesce(n, o)->>'id')::uuid;
  elsif tg_table_name = 'organismos' then
    select array_agg(distinct p.persona_id) into ids from public.puesto p where p.organismo_id = (coalesce(n, o)->>'id')::uuid;
  elsif tg_table_name in ('oportunidades', 'comunidad_admin_responsable', 'relacion_oportunidad_accesos', 'accesos') then
    -- Las comunidades afectadas: la apuntada en la opp (respaldo), las de sus accesos, la del acceso que cambia
    -- de comunidad, y la del administrador que cambia.
    select array_agg(distinct c) into comunidades from (
      select (n->>'comunidad_id')::uuid as c union select (o->>'comunidad_id')::uuid
      union select (n->>'figura_legal_propietaria_id')::uuid union select (o->>'figura_legal_propietaria_id')::uuid
      union select a.figura_legal_propietaria_id
              from public.relacion_oportunidad_accesos r join public.accesos a on a.id = r.acceso_id
             where (tg_table_name = 'oportunidades' and r.opp_id in ((n->>'id')::uuid, (o->>'id')::uuid))
                or (tg_table_name = 'relacion_oportunidad_accesos' and a.id in ((n->>'acceso_id')::uuid, (o->>'acceso_id')::uuid))
    ) s where c is not null;
    select array_agg(distinct p.persona_id) into ids
      from public.puesto p
     where p.id in (select r.puesto_id from public.comunidad_admin_responsable r where r.comunidad_id = any (comunidades)
                    union select (n->>'puesto_id')::uuid where tg_table_name = 'comunidad_admin_responsable'
                    union select (o->>'puesto_id')::uuid where tg_table_name = 'comunidad_admin_responsable');
  end if;
  perform public.directorio_personas_de(ids);
  return null;
end;
$$;

create or replace trigger directorio_personas_avisar after insert or delete or update of estado, comunidad_id on public.oportunidades
  for each row execute function public.directorio_personas_avisar();
create or replace trigger directorio_personas_avisar after insert or update or delete on public.relacion_oportunidad_accesos
  for each row execute function public.directorio_personas_avisar();
create or replace trigger directorio_personas_avisar after update of figura_legal_propietaria_id on public.accesos
  for each row execute function public.directorio_personas_avisar();

-- ------------------------------------------------------------------ consolidacion al firmar
-- Al firmar la 1.a hoja, el administrador pasa a ser del comercial. Que administrador: el de la comunidad de la HOJA
-- (una hoja va a un unico pagador); si la hoja no la tiene, los de la opp (vista base). Si no hay ninguno, el contacto
-- de la opp cuando es de una administracion (como antes).
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
    select array_agg(r.puesto_id) into admins from (
      select distinct on (r.comunidad_id) r.puesto_id
        from public.comunidad_admin_responsable r
       where r.vigente and r.comunidad_id = new.comunidad_id
       order by r.comunidad_id, r.desde desc nulls last, r.creado_en desc) r
     where r.puesto_id is not null;
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

-- ------------------------------------------------------------------ al dia
select public.directorio_personas_repaso();
