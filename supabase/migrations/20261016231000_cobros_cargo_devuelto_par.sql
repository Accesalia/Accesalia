-- Un CARGO DEVUELTO deja un solo papel (el alta del cargo, renombrada "devuelto"), pero son dos movimientos: el
-- cargo (+) y su devolucion (-), que se anulan. Se apuntan los dos con el mismo PDF; por eso lo unico es
-- factura + PDF + tipo (16-oct-2026). Las devoluciones que hacemos nosotros (cobro indebido, por error) van solas, en -.
alter table cobros drop constraint cobros_factura_justificante_unico;
alter table cobros add constraint cobros_factura_justificante_tipo_unico unique (factura_id, justificante, tipo);
