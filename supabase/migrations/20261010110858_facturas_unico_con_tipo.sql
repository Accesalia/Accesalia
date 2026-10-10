-- El numero de un abono puede coincidir con el de una factura de la misma serie (Daniel 2025: abonos 1-1..1-4 y
-- facturas 1-1..1-4). El unico pasa a llevar el tipo.
create unique index facturas_factusol_unico_tipo on public.facturas (empresa_emisora, anio, tipo, serie, numero) where origen = 'factusol';
-- El viejo lo quita Monica a mano (el drop esta bloqueado desde Claude):
--   drop index public.facturas_factusol_unico;
