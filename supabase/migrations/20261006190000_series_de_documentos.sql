-- SERIES DE DOCUMENTOS: el codigo de cada documento versionable (Monica, 6-oct-2026).
--
--   HE-2026-0142 v2   hoja de encargo numero 142 de 2026, su version 2
--   VB-2026-0031 v1   viabilidad numero 31 de 2026, su version 1
--
-- Sigla + año + correlativo de cuatro cifras, como las facturas. La version va
-- aparte (versiones_hoja.numero_version, viabilidades.version).
--
-- Decidido con ella:
--   - El numero se da al GENERAR el PDF para enviar, NUNCA en borrador: un
--     borrador que no llega a salir no gasta numero.
--   - Una anulada CONSERVA su numero, como una factura anulada: el hueco se
--     explica solo y nadie reutiliza numeros.
--   - Las hojas antiguas (Drive) se numeran igual, por su fecha, sin excepciones
--     por ser antiguas. Van todas juntas: la app no esta en uso todavia.
--   - UNA tabla para todas las series: el dia que haya otro documento
--     versionable, se usa su sigla y ya, sin tabla ni codigo nuevos.
--   - El codigo vive en el documento (hojas_encargo.numero_hoja,
--     viabilidades.numero). Esta tabla solo sabe por donde va cada serie.
--   - El codigo va SUELTO, no colgado del de la opp; el documento apunta a su
--     opp por oportunidad_id, que es fontaneria y no se enseña.

create table public.series_documento (
  tipo           text not null,
  anio           integer not null,
  ultimo         integer not null default 0,
  actualizado_en timestamptz not null default now(),
  primary key (tipo, anio),
  constraint series_documento_tipo_sigla check (tipo ~ '^[A-Z]{2,4}$'),
  constraint series_documento_anio_valido check (anio between 2000 and 2100),
  constraint series_documento_ultimo_positivo check (ultimo >= 0)
);

comment on table public.series_documento is
  'Por donde va cada serie de codigos (HE hoja de encargo, VB viabilidad...) en cada año. El codigo vive en el documento; aqui solo el contador.';

alter table public.series_documento enable row level security;

-- El siguiente codigo de una serie, de un golpe: aunque dos personas generen a
-- la vez, la base nunca da dos iguales. La serie de un año nuevo nace sola.
create or replace function public.siguiente_codigo(p_tipo text, p_anio integer)
returns text
language sql
volatile
security definer
set search_path = ''
as $$
  insert into public.series_documento as s (tipo, anio, ultimo)
  values (p_tipo, p_anio, 1)
  on conflict (tipo, anio) do update set ultimo = s.ultimo + 1, actualizado_en = now()
  returning s.tipo || '-' || s.anio || '-' || lpad(s.ultimo::text, 4, '0');
$$;

revoke execute on function public.siguiente_codigo(text, integer) from public, anon, authenticated;
grant execute on function public.siguiente_codigo(text, integer) to service_role;

-- Un codigo, un documento.
create unique index hojas_encargo_numero_hoja_unico on public.hojas_encargo (numero_hoja) where numero_hoja is not null;
create unique index viabilidades_numero_unico on public.viabilidades (numero) where numero is not null;
