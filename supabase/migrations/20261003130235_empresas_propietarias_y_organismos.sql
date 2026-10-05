-- YA APLICADA el 3-oct-2026 por el MCP. NO volver a ejecutar.
--
-- Las dos tablas destino del comodin que faltaban. `organismos` nace con el
-- minimo a proposito: sus campos propios -ambito de competencia, condicionantes
-- por ayuntamiento, plazos de convocatoria- no se han hablado todavia.

create table public.empresas_propietarias (
  id               uuid        primary key default gen_random_uuid(),
  nombre_accesalia text        not null,
  nombre_legal     text,
  cif              text,
  activa           boolean     not null default true,
  notas            text,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

comment on table public.empresas_propietarias is
  'Empresas que son PROPIETARIAS de un acceso. Nada que ver con `empresa` (administraciones de fincas) ni con `contratas`. Su figura es `Propietario Empresa`.';

create trigger trg_set_actualizado_en before update on public.empresas_propietarias
  for each row execute function public.set_actualizado_en();

create table public.organismos (
  id               uuid        primary key default gen_random_uuid(),
  nombre           text        not null,
  activa           boolean     not null default true,
  notas            text,
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now()
);

comment on table public.organismos is
  'Ayuntamiento, junta de distrito, comunidad autonoma, ECU, colegio profesional. Nace con el minimo: sus campos propios (ambito de competencia, condicionantes, plazos) no se han hablado todavia. Su figura es `Organismo`.';

create trigger trg_set_actualizado_en before update on public.organismos
  for each row execute function public.set_actualizado_en();
