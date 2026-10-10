-- NOTA Y PAUSA EN CADA HITO (Monica, 10-oct-2026).
-- "Crear subhitos deberia conllevar dejar una nota de por que: hable con admin, me lo dijo Daniel, dicen que no tiene
-- caja... En general cada hito debe poder llevar una nota (la entrega de proyecto se retrasa porque estan en juicios
-- con el local). Asi la prevision de caja cuadra: el hito facturable entra en pausa." Una casilla de pausar/reactivar.
-- La nota va en notas_facturacion (la tabla de notas de facturacion, una por mundo), ahora con su hito.
alter table public.notas_facturacion
  add column hito_cobro_id uuid references public.hitos_cobro(id) on delete cascade;
create index notas_facturacion_hito_idx on public.notas_facturacion (hito_cobro_id);
comment on column public.notas_facturacion.hito_cobro_id is
  'La nota es de ESTE hito o subhito (Monica, 10-oct-2026): por que se fracciona ("hable con el admin", "me lo dijo Daniel", "no tienen caja"), por que se para ("estan en juicios con el local"). Sin hito = nota de la hoja.';

alter table public.hitos_cobro add column en_pausa_desde date;
comment on column public.hitos_cobro.en_pausa_desde is
  'EN PAUSA desde esa fecha (vacio = sigue su curso). Un hito en pausa no cuenta en la prevision de caja ni en el aviso de facturar; el porque va en su nota (notas_facturacion.hito_cobro_id). Monica, 10-oct-2026.';
