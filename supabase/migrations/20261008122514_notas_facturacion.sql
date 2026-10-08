-- YA APLICADA el 8-oct-2026 por el MCP. NO volver a ejecutar.
--
-- NOTAS DE FACTURACION (Monica, 8-oct-2026): "una seccion de notas de facturacion, para que Sali en el
-- futuro y nosotros ahora podamos dejar un resumen de que se cobra y como. La persona de facturacion puede
-- leer esas notas y tener una idea general compacta de que se ha firmado."
-- Una tabla por mundo (notas_<detalle>): estas las lee facturacion. Cuelgan de la HOJA (el contrato): una
-- opp puede tener varias firmadas y cada una se cobra distinto. La primera de cada hoja firmada se escribe
-- sola desde lo leido en el papel (origen 'lectura_hoja'); despues, las de la gente y las de Sali.
create table public.notas_facturacion (
  id              uuid        primary key default gen_random_uuid(),
  hoja_encargo_id uuid        not null references public.hojas_encargo(id) on delete cascade,
  fecha           date,
  texto           text        not null,
  autor           text,
  origen          text        not null default 'app',
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  constraint notas_fact_texto_ck  check (btrim(texto) <> ''),
  constraint notas_fact_origen_ck check (origen in ('app', 'sali', 'lectura_hoja'))
);
create index notas_facturacion_por_hoja on public.notas_facturacion (hoja_encargo_id, fecha desc nulls last);
create trigger trg_set_actualizado_en before update on public.notas_facturacion
  for each row execute function public.set_actualizado_en();
alter table public.notas_facturacion enable row level security;
comment on table public.notas_facturacion is
  'Notas de FACTURACION de una hoja de encargo: que se cobra, a quien y como, en pocas lineas. Las lee quien factura (y Sali).';
comment on column public.notas_facturacion.origen is
  'app (escrita por alguien) | sali | lectura_hoja (resumen escrito solo al releer la hoja firmada).';
