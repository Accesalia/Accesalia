-- FORMA DE PAGO A MANO (Monica, 14-oct-2026). "Si no se tocan los que hay, salen
-- solos. Si se cambian a mano, la hoja debe quedar marcada como 'hitos
-- modificados, revisar al recibir firmada' y destacarla en la bandeja de entrada
-- de facturacion, donde se validan." Al firmarse, cada linea con la forma de pago
-- escrita a mano entra en la bandeja con una DUDA abierta (notas_facturacion).

alter table public.conceptos_hoja add column if not exists forma_pago_a_mano boolean not null default false;
comment on column public.conceptos_hoja.forma_pago_a_mano is
  'La forma de pago se escribio a mano en la hoja (no es una de las de la lista): sus hitos no salen solos con seguridad; al firmarse, la linea entra en facturacion con una duda para revisarlos (Monica, 14-oct-2026).';
