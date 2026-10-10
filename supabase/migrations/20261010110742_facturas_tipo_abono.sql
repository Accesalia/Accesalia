-- LOS ABONOS (rectificativas) van en la misma tabla de facturas (Monica, 10-oct-2026). En Factusol estan aparte
-- (F_FAB / F_LFB, serie 6, importes en negativo) y en Drive tambien ("Abono 6-000012 ...pdf").
alter table public.facturas add column tipo text not null default 'factura'
  constraint facturas_tipo_check check (tipo in ('factura', 'abono'));
comment on column public.facturas.tipo is 'factura | abono (rectificativa, importes en negativo; en Factusol, F_FAB/F_LFB, serie 6). Monica, 10-oct-2026.';
