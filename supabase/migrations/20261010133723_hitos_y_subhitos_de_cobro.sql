-- HITOS Y SUBHITOS DE COBRO (Monica, 10-oct-2026).
--
-- "De cada hoja de encargo firmada, extraer las lineas facturables con tres datos: concepto, importe e hitos. Y
-- desglosaria el importe teorico en los hitos teoricos." Cada hito se marca: pendiente / parcial / completado /
-- devuelto / anulado.
-- "Por que parcial? Porque nos pasa mucho: la comunidad llega el momento de pagar el hito 2 y no tiene pasta, y pide
-- fraccionarlo en 2, 3, 6 pagos mensuales/trimestrales/el mes que viene... los hitos originales deben poder
-- subdividirse en plazos. Y esos plazos generar SUBHITOS que se van cumpliendo." Subhito: pendiente / completado /
-- devuelto / anulado. Lo que se cuadra con la factura emitida es el hito o el subhito (factura_linea_hitos).
-- Los estados de julio (sin_conciliar, facturado, cobrado...) se sustituyen: sin_conciliar -> pendiente.

alter table public.hitos_cobro drop constraint hitos_cobro_estado_check;
update public.hitos_cobro set estado = 'pendiente' where estado = 'sin_conciliar';
alter table public.hitos_cobro add constraint hitos_cobro_estado_check
  check (estado in ('pendiente', 'parcial', 'completado', 'devuelto', 'anulado'));
alter table public.hitos_cobro alter column estado set default 'pendiente';

alter table public.hitos_cobro
  add column hito_padre_id uuid references public.hitos_cobro(id) on delete cascade,
  add column fecha_prevista date;
alter table public.hitos_cobro add constraint hitos_cobro_parcial_solo_hito
  check (hito_padre_id is null or estado <> 'parcial');
create index hitos_cobro_padre_idx on public.hitos_cobro (hito_padre_id);

comment on column public.hitos_cobro.hito_padre_id is
  'SUBHITO: el hito del que sale al fraccionarlo ("no tiene pasta, lo partimos en 3 pagos"). Monica, 10-oct-2026.';
comment on column public.hitos_cobro.estado is
  'hito: pendiente | parcial (algun subhito cobrado) | completado | devuelto | anulado. subhito: pendiente | completado | devuelto | anulado.';
comment on column public.hitos_cobro.fecha_prevista is 'Cuando se espera cobrar (sobre todo en los subhitos de un fraccionamiento).';

-- Y el IMPORTE TEORICO de cada hito (se hizo como dato, 10-oct): importe de la linea x porcentaje del hito, donde
-- estaba vacio. 1.574 hitos. Quedan sin importe los A EXITO (solo %, se sabe a la concesion).
--   update hitos_cobro h set importe = round(l.importe * h.porcentaje / 100, 2) from lineas_facturacion l
--   where l.id = h.linea_facturacion_id and h.importe is null and h.porcentaje is not null
--     and l.importe is not null and not coalesce(l.es_porcentaje, false);
