-- FACTURACION · bocado 1 (libro Accesalia).
--
-- AUDITORIA del esqueleto de fase 1: habia DOS sistemas de hitos en paralelo.
--   - POBLADO: lineas_facturacion (1090) -> hitos_cobro (1698, con nº factura,
--     fechas, estado y gastos_devolucion inline) -> gestiones_cobro (dunning).
--   - VACIO (redundante): hitos_facturacion / facturas / cobros (0 filas).
-- Espina elegida = la POBLADA (lineas_facturacion -> hitos_cobro). Las vacias se
-- quedan sin usar (no se borran; inofensivas). hitos_cobro.hito (firma/encargo/
-- entrega/licencia/cfo/concesion) YA es el disparador para los avisos (bocado 2).
--
-- Solo faltan dos piezas del modelo acordado:
--   1) EMISOR por linea = eje FISCAL y de SEGREGACION de acceso (Accesalia/Ecobalance).
--   2) PDF de la factura: la app es TORRE DE CONTROL (Factusol emite; aqui se
--      registra el nº y se guarda una copia del PDF).

alter table lineas_facturacion
  add column if not exists emisor text not null default 'accesalia'
    check (emisor in ('accesalia', 'ecobalance', 'daniel_autonomo'));

comment on column lineas_facturacion.emisor is
  'Empresa emisora = eje FISCAL y de SEGREGACION de acceso. accesalia/daniel_autonomo -> ambito Alexandra; ecobalance -> ambito Ana (CAES/comisiones). Derivable por tipo. Todo emisor=ecobalance es invisible al ambito Accesalia.';

-- Las 1090 lineas migradas son hojas de encargo a comunidades -> emisor Accesalia (default aplicado).

alter table hitos_cobro
  add column if not exists url_factura_pdf text;

comment on column hitos_cobro.url_factura_pdf is
  'Copia del PDF de la factura emitida en Factusol (Storage). La app NO emite la factura fiscal: la registra y guarda el PDF.';

insert into storage.buckets (id, name, public) values ('facturas', 'facturas', true) on conflict do nothing;
