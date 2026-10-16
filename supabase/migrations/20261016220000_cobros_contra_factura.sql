-- COBROS CONTRA LA FACTURA (Monica, 16-oct-2026).
-- Regla unica (12-oct): cobrado = justificante de ingreso SUBIDO a la app. El cobro va contra la FACTURA (nunca
-- contra la proforma ni la hoja). Un justificante puede cobrar varias facturas (alta de varios recibos): una fila
-- por factura, con el mismo PDF. Una factura puede tener varios cobros.
-- Los avisos de confirming cuentan como cobro, con la fecha de vencimiento ("los emite el propio banco").
--
-- La tabla vieja `cobros` (vacia, colgaba de hitos_facturacion) se elimina: "no queremos codigo sucio que dentro
-- de un mes nos lie".

drop table cobros;

create table cobros (
  id              uuid primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  factura_id      uuid not null references facturas(id),
  fecha_cobro     date not null,
  importe         numeric(12, 2),
  tipo            text not null constraint cobros_tipo_check
                    check (tipo in ('cargo_en_cuenta', 'transferencia', 'confirming', 'aviso_de_pago', 'otro')),
  justificante    text not null,
  fichero_origen  text,
  subido_por      uuid references equipo(id),
  constraint cobros_factura_justificante_unico unique (factura_id, justificante)
);
comment on table cobros is 'Cobros reales, uno por factura y justificante. Cobrado = justificante subido (regla de Monica, 12-oct-2026). Un justificante de varias facturas = una fila por factura con el mismo PDF.';
comment on column cobros.importe is 'Lo que dice el justificante para esta factura (total, con IVA). Vacio si no se pudo leer.';
comment on column cobros.tipo is 'De que papel sale: cargo_en_cuenta (alta de recibos / adeudos), transferencia, confirming (aviso del banco, cuenta como cobro a su vencimiento), aviso_de_pago (de la contrata), otro.';
comment on column cobros.justificante is 'El PDF en el almacen: almacen:facturas/justificantes/<empresa>/<año>/<fichero>.';
comment on column cobros.fichero_origen is 'Nombre del fichero en Drive del que se subio (carga del 16-oct-2026). Vacio si se subio desde la app.';
comment on column cobros.subido_por is 'Quien lo subio desde la app. Vacio = carga desde Drive.';

create index cobros_factura_id_idx on cobros (factura_id);
create index cobros_fecha_cobro_idx on cobros (fecha_cobro);

alter table cobros enable row level security;
