-- EL % DE COMISION DE CADA COMERCIAL DE LA CASA (Monica, 18-oct-2026).
-- Hasta ahora solo existia como texto en notas_comision. La ficha financiera lo
-- necesita como dato para calcular la comision: % x lo facturado de importe fijo
-- (lo de a exito no comisiona, de momento). Se devenga cuando Accesalia cobra.
-- Vacio = no consta (no es «cero»).
alter table public.comerciales
  add column if not exists comision_pct numeric(5,2)
  constraint comerciales_comision_pct_rango check (comision_pct is null or (comision_pct >= 0 and comision_pct <= 100));

comment on column public.comerciales.comision_pct is
  '% de comision del comercial sobre lo facturado de importe fijo. Vacio = no consta.';

-- Lo que dijo Monica el 18-oct: Alvaro 3, Oscar 4 (lo ofrecio Daniel), Beatriz 3 (supuesto: no recuerda lo que se le ofrecio).
update public.comerciales set comision_pct = 3 where id = '4dd3347a-d885-4439-aafb-dc3f7f7acd95';
update public.comerciales set comision_pct = 4 where id = '674b8d18-17dc-4b3e-b3ae-8905cfdbc0bd';
update public.comerciales set comision_pct = 3 where id = '288ca60a-a5f3-434f-84fe-d7ea169084a9';
