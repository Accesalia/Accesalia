-- LA REVISION, POR HOJA Y POR BLOQUE (Monica, 14-oct-2026). Quien revisa ve, de
-- cada hoja del paquete, una TABLA con sus conceptos (bloque, importe, forma de
-- pago) y puede:
--   - dar un OK GLOBAL a la hoja entera (uno por hoja), para ir agil;
--   - o marcar "MODIFICALO" en un bloque concreto, con su nota.
-- Cada decision es una fila. El envio (revisiones_oferta) se resuelve solo:
--   - todas las hojas con ok y ningun "modificalo" -> ok;
--   - algun "modificalo" -> cambios (el comentario junta las notas).
-- Sigue sin editar nada: la hoja la toca solo el comercial.

create table if not exists public.revisiones_oferta_decisiones (
  id uuid primary key default gen_random_uuid(),
  revision_id uuid not null references public.revisiones_oferta(id) on delete cascade,
  version_hoja_id uuid not null references public.versiones_hoja(id),
  concepto_hoja_id uuid references public.conceptos_hoja(id),
  decision text not null,
  nota text,
  quien uuid references public.equipo(id),
  cuando timestamptz not null default now(),
  constraint revisiones_oferta_decisiones_decision check (decision in ('ok', 'modificar')),
  constraint revisiones_oferta_decisiones_ok_es_de_la_hoja check (decision <> 'ok' or concepto_hoja_id is null),
  constraint revisiones_oferta_decisiones_modificar_con_nota check (decision <> 'modificar' or btrim(coalesce(nota, '')) <> '')
);
comment on table public.revisiones_oferta_decisiones is
  'Lo que decide quien revisa: OK a una hoja entera (concepto vacio) o MODIFICALO en un bloque concreto, con su nota (Monica, 14-oct-2026).';

-- Un ok por hoja y envio; un "modificalo" por bloque y envio (se puede cambiar: se sobrescribe).
create unique index if not exists revisiones_oferta_decisiones_ok_hoja
  on public.revisiones_oferta_decisiones (revision_id, version_hoja_id) where concepto_hoja_id is null;
create unique index if not exists revisiones_oferta_decisiones_bloque
  on public.revisiones_oferta_decisiones (revision_id, concepto_hoja_id) where concepto_hoja_id is not null;
create index if not exists revisiones_oferta_decisiones_revision on public.revisiones_oferta_decisiones (revision_id);
alter table public.revisiones_oferta_decisiones enable row level security;
