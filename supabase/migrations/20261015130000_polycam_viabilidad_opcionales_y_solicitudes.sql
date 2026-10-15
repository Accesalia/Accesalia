-- FASES QUE NO APLICAN Y VIABILIDAD SIN POLYCAM (Monica, 15-oct-2026).
--
-- 1. NECESITA POLYCAM / NECESITA VIABILIDAD, por opp. Vacio = AUTOMATICO, segun
--    lo que dicen que quieren: accesibilidad -> las dos; eficiencia y arreglos
--    exteriores -> solo viabilidad (el SATE se calcula con Google Earth, pero Alex
--    sigue escribiendo el tipo de obra y los precios); lo demas (memoria valorada,
--    informes, IEE...) -> ninguna; sin intereses -> las dos. Si una persona lo
--    marca, manda lo suyo (y queda quien y cuando). Siempre se puede desmarcar
--    "en todos los casos, claros o por defecto".
-- 2. PEDIR VIABILIDAD Y COSTES AL ARQUITECTO, sin Polycam: "si hay prisas o el
--    comercial nos ha enviado fotos". Hace de Polycam en la escalera: mete la opp
--    en la fase 4. Lo minimo: donde (accesos), que quieren (solo para esta
--    viabilidad: no toca los intereses de la opp) y una descripcion; y sitio para
--    fotos, planos, croquis... "no sabemos que nos va a llegar".

alter table public.oportunidades
  add column if not exists necesita_polycam boolean,
  add column if not exists necesita_viabilidad boolean,
  add column if not exists necesidades_por uuid references public.equipo(id),
  add column if not exists necesidades_en timestamptz;
comment on column public.oportunidades.necesita_polycam is 'Vacio = automatico segun lo que quieren; true/false = lo decidio una persona (necesidades_por/en).';
comment on column public.oportunidades.necesita_viabilidad is 'Vacio = automatico segun lo que quieren; true/false = lo decidio una persona (necesidades_por/en).';

create table if not exists public.solicitudes_viabilidad (
  id uuid primary key default gen_random_uuid(),
  oportunidad_id uuid not null references public.oportunidades(id),
  accesos uuid[] not null check (cardinality(accesos) > 0),
  tipos uuid[] not null check (cardinality(tipos) > 0),
  descripcion text not null check (btrim(descripcion) <> ''),
  para_cuando date,
  pedida_por uuid references public.equipo(id),
  pedida_en timestamptz not null default now(),
  estado text not null default 'pendiente',
  viabilidad_id uuid references public.viabilidades(id),
  empezada_en timestamptz,
  creado_en timestamptz not null default now(),
  constraint solicitudes_viabilidad_estado check (estado in ('pendiente', 'empezada', 'anulada'))
);
comment on table public.solicitudes_viabilidad is
  'Pedir viabilidad y costes al arquitecto SIN Polycam (Monica, 15-oct-2026). accesos y tipos son de ESTA solicitud: no tocan los de la opp.';

create table if not exists public.solicitudes_viabilidad_adjuntos (
  id uuid primary key default gen_random_uuid(),
  solicitud_id uuid not null references public.solicitudes_viabilidad(id) on delete cascade,
  ruta_almacen text not null,
  nombre text,
  creado_en timestamptz not null default now()
);
comment on table public.solicitudes_viabilidad_adjuntos is 'Fotos, planos, croquis... de una solicitud de viabilidad: apunta al fichero del almacen.';

create index if not exists solicitudes_viabilidad_opp on public.solicitudes_viabilidad (oportunidad_id);
create index if not exists solicitudes_viabilidad_pendientes on public.solicitudes_viabilidad (pedida_en) where estado = 'pendiente';
alter table public.solicitudes_viabilidad enable row level security;
alter table public.solicitudes_viabilidad_adjuntos enable row level security;
