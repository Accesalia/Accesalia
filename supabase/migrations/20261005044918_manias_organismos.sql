-- =====================================================================
-- MANIAS DE LOS ORGANISMOS
-- Monica, 5-oct-2026.
--
-- PARA QUE: al barrer las fichas de Dropbox salen manias de ayuntamientos,
-- departamentos y tecnicos concretos. Ella: "lo que luego al arquitecto que hace
-- el proyecto le ayude a saber: oye, que en Leganes no les gustan las fachadas
-- en gris, mete algo de color. O chorradas asi, junto a cosas como: en Leganes
-- exigen consulta urbanistica aprobada antes de meter la licencia y el proyecto.
-- Cosas triviales y gordas van al mismo saco, porque el tecnico necesita saber
-- ambas."
--
-- NO SUSTITUYE A LA NOTA. La nota sigue entera en su ficha, como siempre; esto
-- es un punto de referencia para saber DONDE buscar despues. Aun no hay seccion
-- de la app que la pinte: "si la vamos llenando, luego solo es leerla".
--
-- NO SE CATEGORIZA. Ni tipo, ni tema, ni gravedad: "no categorizamos, solo lo
-- reflejamos". El modelo de requerimientos estructurados (sprint propio, ver
-- memoria sistema-requerimientos-conocimiento) vendra despues, leyendo esto.
--
-- DOS TEXTOS, A PROPOSITO:
--   cita  = lo que dice la ficha, literal, intocable.
--   mania = la manía contada en corto para el arquitecto. Es INTERPRETACION de
--           quien la lee; por eso va aparte y la cita queda para contrastar.
--
-- DE DONDE SALE, Y LA CLON. La mania nace enlazada a su oportunidad si ya existe,
-- o a su fila de la tabla-clon si aun no. clon_id es PROVISIONAL: "luego la clon
-- la eliminaremos, no quedara ahi para siempre; al final el id sera el de la opp,
-- cuando exista". Cuando esa fila pase a ser oportunidad, sus manias se
-- reenganchan buscando por clon_id. Por eso la fila de la clon NO se puede borrar
-- mientras tenga manias: se perderia el enlace por el camino.
-- ruta_dropbox va siempre, haya opp o no.
--
-- departamento y tecnico son TEXTO LIBRE, como el cargo en las administraciones:
-- cada ayuntamiento se organiza a su manera ("Licencias y Obras", "Junta de
-- distrito de Latina", "ECU Actecu"). tecnico es el de ELLOS, no el nuestro (la
-- tabla 'tecnicos' es nuestra gente).
-- =====================================================================

create table public.manias_organismos (
  id                   uuid        primary key default gen_random_uuid(),
  municipio_id         uuid        not null references public.municipios_catastro(id),
  departamento         text,
  tecnico              text,
  mania                text        not null,
  cita                 text        not null,
  fecha                date,
  oportunidad_id       uuid        references public.oportunidades(id) on delete set null,
  nota_oportunidad_id  uuid        references public.notas_oportunidad(id) on delete set null,
  clon_id              uuid        references public.comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una(id) on delete restrict,
  ruta_dropbox         text        not null,
  origen               text        not null default 'ficha_dropbox',
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now(),
  constraint manias_org_mania_ck  check (btrim(mania) <> ''),
  constraint manias_org_cita_ck   check (btrim(cita) <> ''),
  constraint manias_org_origen_ck check (origen in ('ficha_dropbox','app','sali','requerimiento'))
);

create index manias_organismos_por_municipio on public.manias_organismos (municipio_id, fecha desc nulls last);
create index manias_organismos_por_opp       on public.manias_organismos (oportunidad_id);
create index manias_organismos_por_clon      on public.manias_organismos (clon_id);

create trigger trg_set_actualizado_en before update on public.manias_organismos
  for each row execute function public.set_actualizado_en();

comment on table public.manias_organismos is
  'Manias de ayuntamientos, departamentos y tecnicos, sin categorizar. Referencia para el arquitecto; la nota entera sigue en su ficha.';
comment on column public.manias_organismos.cita is
  'Texto literal de la ficha, intocable.';
comment on column public.manias_organismos.mania is
  'La mania contada en corto para el arquitecto. Es interpretacion de quien la lee.';
comment on column public.manias_organismos.fecha is
  'La fecha de la nota de donde sale, no la de la fila. Vacia = la nota no traia fecha.';
comment on column public.manias_organismos.clon_id is
  'Si aun no hay oportunidad: su fila de la tabla-clon. Al pasarla a produccion, se reengancha por aqui.';
