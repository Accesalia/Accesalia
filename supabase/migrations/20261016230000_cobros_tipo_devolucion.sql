-- Las devoluciones van en la misma tabla, como un tipo mas y con el importe en negativo (Monica, 16-oct-2026,
-- opcion a): asi lo que entro y lo que se devolvio se ve en un sitio y la alerta sale sola.
alter table cobros drop constraint cobros_tipo_check;
alter table cobros add constraint cobros_tipo_check
  check (tipo in ('cargo_en_cuenta', 'transferencia', 'confirming', 'aviso_de_pago', 'devolucion', 'otro'));
comment on column cobros.tipo is 'De que papel sale: cargo_en_cuenta (alta de recibos / adeudos), transferencia, confirming (aviso del banco, cuenta como cobro a su vencimiento), aviso_de_pago (de la contrata), devolucion (cargo devuelto o devolucion al cliente: importe en NEGATIVO, es la alerta), otro.';
comment on column cobros.importe is 'Lo que dice el justificante para esta factura (total, con IVA). Negativo en las devoluciones. Vacio si no se pudo leer.';
