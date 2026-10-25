-- COSAS A FACTURAR (Monica, 25-oct-2026; maqueta docs/figma/cosas-a-facturar.html). Tres campos nuevos, con su ok:
--   - Los CODIGOS QUE EXIGE LA CONTRATA (contratas.codigos_exigidos: «Orden», «Supervisor», «Pedido»...), con su valor,
--     en la HOJA: valen para todas sus facturas. En la factura van en una LINEA A 0 €, como hasta ahora (Monica).
--     Cuando la hoja pase a las tablas nuevas, el campo va con ella (migracion).
--   - La FORMA DE PAGO de la proforma (por defecto, la de las condiciones de cobro del pagador; se cambia a mano).
--   - La CUENTA que sale en la proforma: el IBAN de la comunidad para el cargo, o la nuestra para la transferencia.

alter table public.hojas_encargo add column codigos_contrata jsonb not null default '{}'::jsonb;
comment on column public.hojas_encargo.codigos_contrata is
  'Los codigos que exige la contrata que paga (sus nombres en contratas.codigos_exigidos) con su valor: {"Orden": "...", "Pedido": "..."}. Van en una linea a 0 € de cada factura de la hoja.';

alter table public.proformas
  add column forma_cobro text constraint proformas_forma_cobro_check check (forma_cobro in ('cargo_cuenta', 'transferencia', 'confirming')),
  add column cuenta text;
comment on column public.proformas.cuenta is 'La cuenta que sale en la proforma: el IBAN de la comunidad (cargo) o la nuestra (transferencia).';
