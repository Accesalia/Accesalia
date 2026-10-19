-- PROFORMA: NUMERACION ANUAL, COMO LAS FACTURAS (Monica, 19-oct-2026). "Si las facturas tienen numeracion
-- anual, las proformas tambien": ACC-PF-26-0001 (empresa, año, numero correlativo del año), sin el mes del
-- 12-oct. Corta la referencia de Factusol (50 caracteres) en 3. Para cortar por meses o trimestres sirve la
-- fecha: la columna mes se sigue rellenando para los filtros. No habia ninguna proforma: nada que renumerar.

alter table public.proformas drop constraint proformas_numero_unico;
alter table public.proformas add constraint proformas_numero_unico unique (empresa, anio, numero);

create or replace function public.proformas_numerar() returns trigger language plpgsql as $$
declare pre text;
begin
  new.anio := extract(year from new.fecha);
  new.mes := extract(month from new.fecha);
  perform pg_advisory_xact_lock(hashtext('proforma:' || new.empresa || ':' || new.anio));
  select coalesce(max(numero), 0) + 1 into new.numero from public.proformas where empresa = new.empresa and anio = new.anio;
  select prefijo_proforma into pre from public.empresas_emisoras where clave = new.empresa;
  new.codigo := pre || '-PF-' || lpad((new.anio % 100)::text, 2, '0') || '-' || lpad(new.numero::text, 4, '0');
  return new;
end $$;
