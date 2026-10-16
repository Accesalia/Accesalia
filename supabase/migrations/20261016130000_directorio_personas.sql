-- EL DIRECTORIO DE PERSONAS (Monica, 16-oct-2026: "el presidente cambia una vez
-- al año, el admin de una opp casi nunca, el comercial de una empresa casi
-- nunca, el jefe de obra de una contrata casi nunca... tener esa tabla de
-- consulta de datos es bastante util"; "sobre la misma tabla buscas jose
-- luis / roen / comercial / sate... y te sale su fila").
--
-- Una tabla YA CALCULADA, que se lee sin cruzar nada. Una fila por:
--   'puesto:<id>'   cada papel de cada persona (vigente o pasado, marcado);
--   'persona:<id>'  cada persona que no tiene ningun puesto.
-- El valor de `fila` es el mismo que usan los selectores ("puesto:..." /
-- "persona:..."), asi que una fila del directorio ES una opcion del selector.
--
-- La `pista` es la ficha corta de siempre (lib/fichaCorta.ts, 15-oct-2026),
-- calculada igual:
--   comunidad       Cargo · la comunidad (sin "CP ", con municipio) · telefono
--   administracion  la administracion · N opps abiertas que lleva · telefono
--   contrata        contrata X · cargo · telefono
--   organismo       el organismo · cargo · telefono
--   sin puesto      su telefono personal
-- El telefono es el del PUESTO; si no tiene, el personal.
--
-- `busqueda` junta todo lo que alguien puede teclear (nombre, apellidos, cargo,
-- donde, telefonos, correos), en minusculas y sin tildes; con su indice por
-- trozos (pg_trgm) "roen", "jose luis comercial" o "682963" salen en el acto.
--
-- SE MANTIENE SOLA: cada cambio en persona, puesto, correo, comunidad,
-- administracion, contrata, organismo, opp o administrador de comunidad
-- recalcula SOLO las personas afectadas. Y cada noche, el repaso
-- (directorio_personas_repaso) lo rehace entero y dice cuantas filas estaban
-- mal: si alguna lo estaba, un cambio se escapo a las reglas.

-- -------------------------------------------------------------- texto
create or replace function public.directorio_texto(t text)
returns text
language sql
immutable
parallel safe
set search_path = ''
as $$
  select lower(translate(coalesce(t, ''),
    'ÁÀÄÂÃÅáàäâãåÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔÕóòöôõÚÙÜÛúùüûÇçÑñ',
    'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'))
$$;

-- -------------------------------------------------------------- la tabla
create table if not exists public.directorio_personas (
  fila            text primary key,
  persona_id      uuid not null references public.persona(id) on delete cascade,
  puesto_id       uuid references public.puesto(id) on delete cascade,
  nombre          text not null,
  donde_tipo      text not null,
  donde_id        uuid,
  donde           text,
  cargo           text,
  telefono        text,
  correos         text[] not null default '{}',
  opps_abiertas   integer not null default 0,
  vigente         boolean not null,
  desde           date,
  hasta           date,
  de_accesalia    boolean not null default false,
  pista           text not null default '',
  busqueda        text not null default '',
  actualizado_en  timestamptz not null default now(),
  constraint directorio_personas_donde_tipo check (donde_tipo in ('comunidad','administracion','contrata','organismo','otro','sin_puesto'))
);

comment on table public.directorio_personas is
  'Directorio de personas YA CALCULADO (una fila por papel, o por persona sin puesto), para leer y buscar sin cruzar nada. Lo mantienen las reglas directorio_personas_*; no se escribe a mano.';

create index if not exists directorio_personas_busqueda on public.directorio_personas using gin (busqueda public.gin_trgm_ops);
create index if not exists directorio_personas_persona on public.directorio_personas (persona_id);
create index if not exists directorio_personas_donde on public.directorio_personas (donde_id);

alter table public.directorio_personas enable row level security;
revoke all on public.directorio_personas from anon, authenticated;
grant select on public.directorio_personas to service_role;

-- -------------------------------------------------------------- el calculo
-- Las filas de unas personas (o de todas, con null). Una sola definicion: la
-- usan las reglas y el repaso, asi nunca pueden calcular distinto.
create or replace function public.directorio_personas_calculo(p_personas uuid[])
returns setof public.directorio_personas
language sql
stable
security definer
set search_path = ''
as $$
  with hoy as (select (now() at time zone 'Europe/Madrid')::date as d),
  -- El administrador de cada opp abierta (el de admin_de_oportunidad, sin la
  -- vista): el puesto apuntado en la opp o el vigente mas reciente de su comunidad.
  ultimo_admin as (
    select distinct on (r.comunidad_id) r.comunidad_id, r.puesto_id
      from public.comunidad_admin_responsable r
     where r.vigente and r.puesto_id is not null
     order by r.comunidad_id, r.desde desc nulls last, r.creado_en desc
  ),
  abiertas as (
    select coalesce(o.administrador_puesto_id, ua.puesto_id) as puesto_id, count(*)::int as n
      from public.oportunidades o
      left join ultimo_admin ua on ua.comunidad_id = o.comunidad_id
     where o.estado = 'abierta' and coalesce(o.administrador_puesto_id, ua.puesto_id) is not null
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

-- -------------------------------------------------------------- recalcular unas personas
create or replace function public.directorio_personas_de(p_personas uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_personas is null or cardinality(p_personas) = 0 then return; end if;
  delete from public.directorio_personas where persona_id = any (p_personas);
  insert into public.directorio_personas select * from public.directorio_personas_calculo(p_personas);
end;
$$;

-- -------------------------------------------------------------- las reglas
-- Que personas toca cada cambio, segun la tabla.
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
  elsif tg_table_name in ('oportunidades', 'comunidad_admin_responsable') then
    -- Cambia cuantas opps abiertas lleva un administrador: los de esas comunidades
    -- y los apuntados a mano en la opp.
    comunidades := array_remove(array[(n->>'comunidad_id')::uuid, (o->>'comunidad_id')::uuid], null);
    select array_agg(distinct p.persona_id) into ids
      from public.puesto p
     where p.id in (
             select r.puesto_id from public.comunidad_admin_responsable r where r.comunidad_id = any (comunidades)
             union select (n->>'administrador_puesto_id')::uuid union select (o->>'administrador_puesto_id')::uuid
             union select (n->>'puesto_id')::uuid union select (o->>'puesto_id')::uuid);
  end if;
  perform public.directorio_personas_de(ids);
  return null;
end;
$$;

drop trigger if exists directorio_personas_avisar on public.persona;
create trigger directorio_personas_avisar after insert or update on public.persona
  for each row execute function public.directorio_personas_avisar();
drop trigger if exists directorio_personas_avisar on public.puesto;
create trigger directorio_personas_avisar after insert or update or delete on public.puesto
  for each row execute function public.directorio_personas_avisar();
drop trigger if exists directorio_personas_avisar on public.correo;
create trigger directorio_personas_avisar after insert or update or delete on public.correo
  for each row execute function public.directorio_personas_avisar();
drop trigger if exists directorio_personas_avisar on public.comunidades;
create trigger directorio_personas_avisar after update of nombre, municipio on public.comunidades
  for each row execute function public.directorio_personas_avisar();
drop trigger if exists directorio_personas_avisar on public.empresa;
create trigger directorio_personas_avisar after update of nombre_accesalia on public.empresa
  for each row execute function public.directorio_personas_avisar();
drop trigger if exists directorio_personas_avisar on public.contratas;
create trigger directorio_personas_avisar after update of nombre on public.contratas
  for each row execute function public.directorio_personas_avisar();
drop trigger if exists directorio_personas_avisar on public.organismos;
create trigger directorio_personas_avisar after update of nombre on public.organismos
  for each row execute function public.directorio_personas_avisar();
drop trigger if exists directorio_personas_avisar on public.oportunidades;
create trigger directorio_personas_avisar after insert or delete or update of estado, comunidad_id, administrador_puesto_id on public.oportunidades
  for each row execute function public.directorio_personas_avisar();
drop trigger if exists directorio_personas_avisar on public.comunidad_admin_responsable;
create trigger directorio_personas_avisar after insert or update or delete on public.comunidad_admin_responsable
  for each row execute function public.directorio_personas_avisar();

-- -------------------------------------------------------------- el repaso nocturno
-- Lo rehace entero y dice cuantas filas estaban mal (o faltaban, o sobraban).
create or replace function public.directorio_personas_repaso()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  mal integer;
  total integer;
begin
  create temp table _dp on commit drop as select * from public.directorio_personas_calculo(null);
  select count(*) into total from _dp;
  select count(*) into mal from (
    (select fila, persona_id, puesto_id, nombre, donde_tipo, donde_id, donde, cargo, telefono, correos, opps_abiertas, vigente, desde, hasta, de_accesalia, pista, busqueda from _dp
     except
     select fila, persona_id, puesto_id, nombre, donde_tipo, donde_id, donde, cargo, telefono, correos, opps_abiertas, vigente, desde, hasta, de_accesalia, pista, busqueda from public.directorio_personas)
    union all
    (select fila, persona_id, puesto_id, nombre, donde_tipo, donde_id, donde, cargo, telefono, correos, opps_abiertas, vigente, desde, hasta, de_accesalia, pista, busqueda from public.directorio_personas
     except
     select fila, persona_id, puesto_id, nombre, donde_tipo, donde_id, donde, cargo, telefono, correos, opps_abiertas, vigente, desde, hasta, de_accesalia, pista, busqueda from _dp)
  ) d;
  if mal > 0 then
    delete from public.directorio_personas;
    insert into public.directorio_personas select * from _dp;
  end if;
  return jsonb_build_object('filas', total, 'corregidas', mal);
end;
$$;

-- -------------------------------------------------------------- la busqueda
-- Todas las palabras escritas, en cualquier orden y por trozos ("jose luis
-- roen", "roen comer", "682963"). Las vigentes primero; luego por parecido.
create or replace function public.buscar_personas(p_q text, p_limite integer default 20, p_tipos text[] default null)
returns setof public.directorio_personas
language sql
stable
security invoker
set search_path = ''
as $$
  with palabras as (
    select array_agg(w) as ws from regexp_split_to_table(public.directorio_texto(p_q), '[\s,.;]+') w where w <> ''
  )
  select d.*
    from public.directorio_personas d, palabras
   where palabras.ws is not null
     and d.busqueda like all (select '%' || w || '%' from unnest(palabras.ws) w)
     and (p_tipos is null or d.donde_tipo = any (p_tipos))
   order by d.vigente desc, public.similarity(d.busqueda, public.directorio_texto(p_q)) desc, d.nombre
   limit greatest(1, least(p_limite, 200))
$$;

revoke execute on function public.directorio_texto(text) from anon, authenticated;
revoke execute on function public.directorio_personas_calculo(uuid[]) from anon, authenticated, public;
revoke execute on function public.directorio_personas_de(uuid[]) from anon, authenticated, public;
revoke execute on function public.directorio_personas_avisar() from anon, authenticated, public;
revoke execute on function public.directorio_personas_repaso() from anon, authenticated, public;
revoke execute on function public.buscar_personas(text, integer, text[]) from anon, authenticated, public;
grant execute on function public.directorio_personas_repaso() to service_role;
grant execute on function public.buscar_personas(text, integer, text[]) to service_role;
grant execute on function public.directorio_personas_de(uuid[]) to service_role;

-- -------------------------------------------------------------- la primera carga
insert into public.directorio_personas select * from public.directorio_personas_calculo(null)
  on conflict (fila) do nothing;
