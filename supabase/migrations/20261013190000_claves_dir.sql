-- =====================================================================
-- CLAVES DIR: el sitio, eje de todo (Monica, 13-oct-2026)
--
-- La PROPUESTA EN PRUEBA de docs/clave-actuacion-areas.md, que Monica da por
-- buena ("vamos con este modelo, creo que funcionara"):
--
--   CLAVE  <── ACCESOS  <── OPP           (la opp apunta a SUS ACCESOS; su clave
--                       <── COMUNIDAD      sale de ellos. La comunidad apunta a
--                       <── EDIFICIO       los accesos, nunca a la clave)
--
--   - La clave NACE CON LA PRIMERA OPP de esos accesos, SIN NUMERO. El buscador
--     del alta la encuentra igual. Los accesos que no estan en ninguna opp (los
--     "hermanos") no tienen clave hasta que una opp los toque.
--   - Recibe su NUMERO en la PRIMERA FIRMA: DIR + 5 cifras, SIN AÑO ("DIR-00412").
--     Un DIR es un sitio, no un documento: un año diria solo cuando se firmo alli
--     la primera vez. El orden da igual mientras sea unico; el historico se
--     numera por fecha de su primera firma.
--   - Misma calle + numero + municipio = misma clave. Los accesos de una opp,
--     todos en la misma clave.
--   - FUSION (dos claves que resultan ser el mismo sitio): sobrevive la de MAS
--     ACCESOS. La absorbida NO se borra ni se renumera: queda con su codigo y
--     apunta a la superviviente (alias); sus accesos pasan a la superviviente.
--   - El NOMBRE sale siempre de sus accesos ("Ganapanes 31, 33 y 35, Madrid").
--
-- Control que pide Monica: TODA OPP CON ACCESOS DEBE TENER CLAVE (la de sus
-- accesos). Si queda una opp sin clave, algo falla.
-- =====================================================================

create table public.claves (
  id                  uuid primary key default gen_random_uuid(),
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  codigo              text,
  numerada_en         timestamptz,
  nombre              text,
  absorbida_por       uuid references public.claves(id),
  absorbida_en        timestamptz,
  absorbida_quien     uuid references public.equipo(id),
  notas               text,
  constraint claves_codigo_formato check (codigo is null or codigo ~ '^DIR-[0-9]{5}$'),
  constraint claves_codigo_con_fecha check ((codigo is null) = (numerada_en is null)),
  constraint claves_no_se_absorbe_a_si_misma check (absorbida_por is null or absorbida_por <> id),
  constraint claves_absorcion_completa check ((absorbida_por is null) = (absorbida_en is null))
);
create unique index claves_codigo_unico on public.claves (codigo) where codigo is not null;
create index claves_absorbida_idx on public.claves (absorbida_por) where absorbida_por is not null;

comment on table public.claves is
  'EL SITIO, eje de todo lo que hacemos (Monica, 13-oct-2026; docs/clave-actuacion-areas.md). Nace con la primera opp de sus accesos, sin numero; recibe su DIR en la primera firma. A ella apuntan los ACCESOS; la opp, la comunidad y el edificio llegan por sus accesos.';
comment on column public.claves.codigo is
  'DIR + 5 cifras, sin año (DIR-00412). Vacio hasta la primera firma. NUNCA se cambia ni se reutiliza: va en la matricula de todo lo que nace despues de la firma.';
comment on column public.claves.nombre is
  'Sale de sus accesos, como el nombre de la opp ("Ganapanes 31, 33 y 35, Madrid"). Se rehace cuando cambian sus accesos.';
comment on column public.claves.absorbida_por is
  'FUSION: esta clave resulto ser el mismo sitio que aquella. Sobrevive la de mas accesos. La absorbida conserva su codigo (alias: buscarlo lleva a la superviviente) y sus accesos pasan a la otra.';

create trigger trg_set_actualizado_en before update on public.claves
  for each row execute function set_actualizado_en();
alter table public.claves enable row level security;

-- Cada acceso, en UNA clave (o en ninguna, si ninguna opp lo ha tocado).
alter table public.accesos add column clave_id uuid references public.claves(id);
create index accesos_clave_idx on public.accesos (clave_id);
comment on column public.accesos.clave_id is
  'La clave (el sitio) de este acceso. Vacia si ninguna opp lo ha tocado todavia (los "hermanos" que trae Catastro).';

-- El contador del DIR: sin año, asi que no cabe en series_documento (que es
-- por año). Una secuencia: si una firma falla a medias puede quedar un hueco,
-- y da igual (el orden no importa, solo que sea unico).
create sequence public.claves_dir_seq;
create or replace function public.siguiente_dir()
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  select 'DIR-' || lpad(nextval('public.claves_dir_seq')::text, 5, '0');
$$;
revoke execute on function public.siguiente_dir() from public, anon, authenticated;
grant execute on function public.siguiente_dir() to service_role;
