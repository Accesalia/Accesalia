-- EL DIRECTORIO DE SITIOS (Monica, 16-oct-2026: "poner en un sitio arriba
-- 'solsona 20 Fuenlabrada' lo hace TODO EL MUNDO cada medio minuto"; "ahora
-- llama alguien y lo primero que hacemos es ir a dropbox, buscar su carpeta").
--
-- LA DIR ES LA CARPETA DE DROPBOX: el sitio (el edificio), con todos sus
-- trabajos (opps: Ascensor, SATE...) y lo comun una sola vez (comunidad,
-- administrador). Una tabla YA CALCULADA, que se lee sin cruzar nada:
--   'acceso:<id>'  una fila por PORTAL (calle + numero + escalera), con los datos
--                  de su DIR: el sitio, su comunidad y administrador, y TODOS
--                  los trabajos de la DIR (abiertos y cerrados, con su fase);
--   'opp:<id>'     las opps que no tienen ningun portal vivo (antiguas, o las
--                  del movil sin direccion), para que se encuentren por su nombre.
-- `grupo` es la DIR (o el portal, si aun no tiene DIR; o la opp, si no tiene
-- portales): el resultado de buscar se agrupa por ahi.
--
-- `busqueda` junta todo lo que alguien puede teclear de un sitio: el portal,
-- el municipio, el nombre del sitio, el codigo DIR, la comunidad, los nombres
-- de sus opps y sus tipos de trabajo. Indice por trozos (pg_trgm).
--
-- SE MANTIENE SOLA: cambios en portales, enlaces opp-portal, opps, su estado,
-- sus tipos, comunidades, administradores o claves recalculan SOLO los sitios
-- afectados. Y el repaso nocturno (directorio_sitios_repaso) lo rehace entero
-- y dice cuantas filas estaban mal. Los cambios de nombre de una administracion
-- o de una persona administradora, que son rarisimos, los recoge el repaso.

create table if not exists public.directorio_sitios (
  fila            text primary key,
  grupo           uuid not null,
  acceso_id       uuid references public.accesos(id) on delete cascade,
  clave_id        uuid,
  dir_codigo      text,
  portal          text,
  municipio       text,
  sitio           text not null,
  comunidad_id    uuid,
  comunidad       text,
  admin           text,
  opps            jsonb not null default '[]',
  n_abiertas      integer not null default 0,
  busqueda        text not null default '',
  actualizado_en  timestamptz not null default now()
);

comment on table public.directorio_sitios is
  'Directorio de sitios YA CALCULADO: una fila por portal con su DIR, comunidad, administrador y todos los trabajos de la DIR (y las opps sin portal). Lo mantienen las reglas directorio_sitios_*; no se escribe a mano.';

create index if not exists directorio_sitios_busqueda on public.directorio_sitios using gin (busqueda public.gin_trgm_ops);
create index if not exists directorio_sitios_grupo on public.directorio_sitios (grupo);
create index if not exists directorio_sitios_clave on public.directorio_sitios (clave_id);

alter table public.directorio_sitios enable row level security;
revoke all on public.directorio_sitios from anon, authenticated;
grant select on public.directorio_sitios to service_role;

-- -------------------------------------------------------------- el calculo
create or replace function public.directorio_sitios_calculo(p_grupos uuid[])
returns setof public.directorio_sitios
language sql
stable
security definer
set search_path = ''
as $$
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
     where o.id in (select opp_id from rel)
        or (p_grupos is null or o.id = any (p_grupos))
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
  ),
  todas as (select * from de_portales union all select * from sin_portal)
  select t.fila, t.grupo, t.acceso_id, t.clave_id, t.dir_codigo, t.portal, t.municipio, t.sitio,
         t.comunidad_id, t.comunidad, t.admin, t.opps, t.n_abiertas,
         public.directorio_texto(concat_ws(' ', t.portal, t.municipio, t.sitio, t.dir_codigo, t.comunidad, t.texto_opps)),
         now()
    from todas t
$$;

-- -------------------------------------------------------------- recalcular unos sitios
create or replace function public.directorio_sitios_de(p_grupos uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_grupos is null or cardinality(p_grupos) = 0 then return; end if;
  delete from public.directorio_sitios where grupo = any (p_grupos);
  insert into public.directorio_sitios select * from public.directorio_sitios_calculo(p_grupos)
    on conflict (fila) do nothing;
end;
$$;

-- Los sitios de una opp: los de sus portales (vivos o no: al cerrar un enlace
-- tambien cambia el sitio que lo tenia) y su propia fila de opp sin portal.
create or replace function public.directorio_sitios_de_opp(p_opp uuid)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $$
  select array_agg(distinct g) from (
    select coalesce(a.clave_id, a.id) as g
      from public.relacion_oportunidad_accesos r join public.accesos a on a.id = r.acceso_id
     where r.opp_id = p_opp
    union select p_opp
  ) s where g is not null
$$;

-- -------------------------------------------------------------- las reglas
create or replace function public.directorio_sitios_avisar()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  n jsonb := case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end;
  o jsonb := case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end;
  g uuid[] := '{}';
begin
  if tg_table_name = 'accesos' then
    g := array_remove(array[coalesce((n->>'clave_id')::uuid, (n->>'id')::uuid), coalesce((o->>'clave_id')::uuid, (o->>'id')::uuid)], null);
  elsif tg_table_name = 'relacion_oportunidad_accesos' then
    select array_agg(distinct x) into g from (
      select coalesce(a.clave_id, a.id) as x from public.accesos a where a.id in ((n->>'acceso_id')::uuid, (o->>'acceso_id')::uuid)
      union select (n->>'opp_id')::uuid union select (o->>'opp_id')::uuid
    ) s where x is not null;
  elsif tg_table_name = 'oportunidades' then
    g := public.directorio_sitios_de_opp(coalesce((n->>'id')::uuid, (o->>'id')::uuid));
  elsif tg_table_name in ('estado_oportunidad', 'oportunidad_tipos') then
    g := public.directorio_sitios_de_opp(coalesce((n->>'oportunidad_id')::uuid, (o->>'oportunidad_id')::uuid));
  elsif tg_table_name = 'comunidades' then
    select array_agg(distinct x) into g from (
      select coalesce(a.clave_id, a.id) as x from public.accesos a where a.figura_legal_propietaria_id = (coalesce(n, o)->>'id')::uuid
      union select op.id from public.oportunidades op where op.comunidad_id = (coalesce(n, o)->>'id')::uuid
    ) s where x is not null;
  elsif tg_table_name = 'comunidad_admin_responsable' then
    select array_agg(distinct x) into g from (
      select coalesce(a.clave_id, a.id) as x from public.accesos a
       where a.figura_legal_propietaria_id in ((n->>'comunidad_id')::uuid, (o->>'comunidad_id')::uuid)
      union select op.id from public.oportunidades op where op.comunidad_id in ((n->>'comunidad_id')::uuid, (o->>'comunidad_id')::uuid)
    ) s where x is not null;
  elsif tg_table_name = 'claves' then
    g := array_remove(array[(n->>'id')::uuid, (o->>'id')::uuid], null);
  end if;
  perform public.directorio_sitios_de(g);
  return null;
end;
$$;

drop trigger if exists directorio_sitios_avisar on public.accesos;
create trigger directorio_sitios_avisar after insert or update or delete on public.accesos
  for each row execute function public.directorio_sitios_avisar();
drop trigger if exists directorio_sitios_avisar on public.relacion_oportunidad_accesos;
create trigger directorio_sitios_avisar after insert or update or delete on public.relacion_oportunidad_accesos
  for each row execute function public.directorio_sitios_avisar();
drop trigger if exists directorio_sitios_avisar on public.oportunidades;
create trigger directorio_sitios_avisar after insert or delete or update of nombre, codigo, estado, comercial_id, comunidad_id, comunidad_provisional, fecha_apertura on public.oportunidades
  for each row execute function public.directorio_sitios_avisar();
-- La fase, solo cuando CAMBIA: el barrido nocturno del estado reescribe todas.
drop trigger if exists directorio_sitios_avisar on public.estado_oportunidad;
create trigger directorio_sitios_avisar after insert or delete on public.estado_oportunidad
  for each row execute function public.directorio_sitios_avisar();
drop trigger if exists directorio_sitios_avisar_fase on public.estado_oportunidad;
create trigger directorio_sitios_avisar_fase after update of fase on public.estado_oportunidad
  for each row when (old.fase is distinct from new.fase) execute function public.directorio_sitios_avisar();
drop trigger if exists directorio_sitios_avisar on public.oportunidad_tipos;
create trigger directorio_sitios_avisar after insert or update or delete on public.oportunidad_tipos
  for each row execute function public.directorio_sitios_avisar();
drop trigger if exists directorio_sitios_avisar on public.comunidades;
create trigger directorio_sitios_avisar after update of nombre on public.comunidades
  for each row execute function public.directorio_sitios_avisar();
drop trigger if exists directorio_sitios_avisar on public.comunidad_admin_responsable;
create trigger directorio_sitios_avisar after insert or update or delete on public.comunidad_admin_responsable
  for each row execute function public.directorio_sitios_avisar();
drop trigger if exists directorio_sitios_avisar on public.claves;
create trigger directorio_sitios_avisar after insert or update of codigo, nombre or delete on public.claves
  for each row execute function public.directorio_sitios_avisar();

-- -------------------------------------------------------------- el repaso nocturno
create or replace function public.directorio_sitios_repaso()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  mal integer;
  total integer;
begin
  create temp table _ds on commit drop as select * from public.directorio_sitios_calculo(null);
  select count(*) into total from _ds;
  select count(*) into mal from (
    (select fila, grupo, acceso_id, clave_id, dir_codigo, portal, municipio, sitio, comunidad_id, comunidad, admin, opps, n_abiertas, busqueda from _ds
     except
     select fila, grupo, acceso_id, clave_id, dir_codigo, portal, municipio, sitio, comunidad_id, comunidad, admin, opps, n_abiertas, busqueda from public.directorio_sitios)
    union all
    (select fila, grupo, acceso_id, clave_id, dir_codigo, portal, municipio, sitio, comunidad_id, comunidad, admin, opps, n_abiertas, busqueda from public.directorio_sitios
     except
     select fila, grupo, acceso_id, clave_id, dir_codigo, portal, municipio, sitio, comunidad_id, comunidad, admin, opps, n_abiertas, busqueda from _ds)
  ) d;
  if mal > 0 then
    delete from public.directorio_sitios;
    insert into public.directorio_sitios select * from _ds on conflict (fila) do nothing;
  end if;
  return jsonb_build_object('filas', total, 'corregidas', mal);
end;
$$;

-- -------------------------------------------------------------- la busqueda
-- Todas las palabras, por trozos y en cualquier orden. Un NUMERO tiene que casar
-- entero: "solsona 20" no es "solsona 205". Un resultado por sitio (grupo): el
-- portal que mejor casa. Primero los que tienen trabajos abiertos.
create or replace function public.buscar_sitios(p_q text, p_limite integer default 20)
returns setof public.directorio_sitios
language sql
stable
security invoker
set search_path = ''
as $$
  with palabras as (
    select array_agg(w) as ws from regexp_split_to_table(public.directorio_texto(p_q), '[\s,;]+') w where w <> ''
  ),
  casan as (
    select d.*, public.similarity(d.busqueda, public.directorio_texto(p_q)) as parecido
      from public.directorio_sitios d, palabras
     where palabras.ws is not null
       and not exists (
         select 1 from unnest(palabras.ws) w
          where not (case when w ~ '^\d+$' then d.busqueda ~ ('(^|[^0-9])' || w || '([^0-9]|$)')
                          else d.busqueda like '%' || w || '%' end))
  ),
  uno_por_sitio as (
    select distinct on (grupo) * from casan order by grupo, parecido desc
  )
  select fila, grupo, acceso_id, clave_id, dir_codigo, portal, municipio, sitio, comunidad_id, comunidad, admin, opps, n_abiertas, busqueda, actualizado_en
    from uno_por_sitio
   order by (n_abiertas > 0) desc, parecido desc, sitio
   limit greatest(1, least(p_limite, 100))
$$;

revoke execute on function public.directorio_sitios_calculo(uuid[]) from anon, authenticated, public;
revoke execute on function public.directorio_sitios_de(uuid[]) from anon, authenticated, public;
revoke execute on function public.directorio_sitios_de_opp(uuid) from anon, authenticated, public;
revoke execute on function public.directorio_sitios_avisar() from anon, authenticated, public;
revoke execute on function public.directorio_sitios_repaso() from anon, authenticated, public;
revoke execute on function public.buscar_sitios(text, integer) from anon, authenticated, public;
grant execute on function public.directorio_sitios_repaso() to service_role;
grant execute on function public.buscar_sitios(text, integer) to service_role;

-- -------------------------------------------------------------- la primera carga
insert into public.directorio_sitios select * from public.directorio_sitios_calculo(null)
  on conflict (fila) do nothing;
