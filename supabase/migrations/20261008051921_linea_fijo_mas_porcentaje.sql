-- La linea de subvencion lleva FIJO + % A EXITO a la vez (1.980 EUR + 3,5 %): es el caso normal.
-- La regla "importe o porcentaje, no los dos" (20261007172222) lo impedia. Se quita; se mantiene
-- que el % este entre 0 y 100. El % sigue sin sumar al total de la hoja (Monica, 8-oct-2026).
alter table public.conceptos_hoja drop constraint if exists chk_conceptos_hoja_importe_o_porcentaje;

comment on column public.conceptos_hoja.porcentaje is
  'Cobro a exito: % de lo concedido. Puede ir JUNTO a un importe fijo en la misma linea (subvencion: 1.980 EUR fijos + 3,5 % a exito). El % no suma al total de la hoja; se pasa a euros en facturacion, con la resolucion.';
