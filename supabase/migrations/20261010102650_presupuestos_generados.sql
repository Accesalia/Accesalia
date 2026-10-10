-- PRESUPUESTOS GENERADOS EN LA APP (Monica, 10-oct-2026).
--
-- El motor ya hace lo mismo que Factusol (137 de 213 iguales; el resto, datos historicos o erratas), asi que la
-- app pasa a GENERAR los presupuestos: se eligen las hojas de encargo que entran, se ve el presupuesto que sale,
-- se guarda como borrador y se genera el PDF.
--
--   - SERIE PROPIA: PR-año-numero, como HE y VB. "Solo exigen que exista, no que siga un codigo concreto. Y si el
--     codigo es diferente al de factusol, mejor: nos sirve para diferenciarlos de un vistazo." Empieza hoy; los
--     anteriores llevan el numero de Factusol.
--   - El codigo se da al GENERAR, no al guardar el borrador (como en la hoja): un borrador no gasta numero.
--   - El PDF va al almacen privado documentos-comerciales (presupuestos/<id>/...). Con PDF, el presupuesto queda
--     congelado; si algo cambia, se hace otro.
--   - Los datos son los mismos que lleva hoy el de Factusol: emisor, cliente (nombre, NIF, domicilio, CP,
--     poblacion, provincia), numero, fecha, forma de pago, lineas, base, IVA y total.

alter table public.presupuestos drop constraint presupuestos_estado_check;
alter table public.presupuestos add constraint presupuestos_estado_check
  check (estado in ('borrador', 'pendiente', 'aceptado', 'rechazado', 'anulado', 'otro'));

alter table public.presupuestos
  add column codigo text constraint presupuestos_codigo_unico unique,
  add column url_pdf text,
  add column generado_en timestamptz;

comment on column public.presupuestos.codigo is 'PR-año-numero, la serie propia de la app (desde el 10-oct-2026). Se da al generar el PDF.';
comment on column public.presupuestos.url_pdf is 'almacen:documentos-comerciales/presupuestos/<id>/... Con PDF, el presupuesto esta congelado.';

-- QUE HOJAS ENTRAN, y en que version: lo que se marco al construirlo. Las lineas ya dicen de que hoja salen, pero
-- una hoja marcada puede no dar linea con precio (todo incluido o a exito) y la eleccion tiene que quedar.
create table public.presupuesto_hojas (
  presupuesto_id uuid not null references public.presupuestos(id) on delete cascade,
  hoja_encargo_id uuid not null references public.hojas_encargo(id),
  version_hoja_id uuid references public.versiones_hoja(id),
  primary key (presupuesto_id, hoja_encargo_id)
);
create index presupuesto_hojas_hoja_idx on public.presupuesto_hojas (hoja_encargo_id);
alter table public.presupuesto_hojas enable row level security;

comment on table public.presupuesto_hojas is
  'Las hojas de encargo (y su version) que se marcaron "a incluir" al construir el presupuesto (Monica, 10-oct-2026).';
