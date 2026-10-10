-- Las notas que deja el casado de facturas de Factusol con los hitos (10-oct-2026): origen 'factusol'.
alter table public.notas_facturacion drop constraint notas_fact_origen_ck;
alter table public.notas_facturacion add constraint notas_fact_origen_ck
  check (origen in ('persona', 'sali', 'migracion', 'ficha_dropbox', 'monday', 'lectura_hoja', 'factusol'));
comment on column public.notas_facturacion.origen is 'De donde sale la nota. factusol = al casar las facturas de Factusol con los hitos (10-oct-2026).';
