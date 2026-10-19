-- UN COMPROMISO FIRMADO, UN CODIGO (Monica, 19-oct-2026). La hoja de encargo, el pedido de una contrata
-- (FAIN, Schindler...), el contrato de Iberdrola y la nota de responsabilidad son lo mismo para nosotros:
-- trabajo contratado. Llevaban cuatro series (HE-, PD-, NR-, CT-) y asi no se podia contar cuantos compromisos
-- hay. Desde hoy todos son HE-año-numero; la forma sigue en tipo_documento. Los 220 que no eran HE reciben su
-- HE- a continuacion del ultimo de su año; el codigo viejo queda en codigo_anterior (las notas lo citan).
-- Año del trabajo: PD y CT, el de su codigo; las notas (todas NR-2026, el año en que se escribieron) el de su
-- firma o su primera factura, lo que sea antes.

alter table public.hojas_encargo add column codigo_anterior text;
comment on column public.hojas_encargo.codigo_anterior is
  'Codigo que tuvo antes de que todos los compromisos firmados pasaran a la serie HE (19-oct-2026): PD- pedido de contrata, NR- nota de responsabilidad, CT- contrato. Lo citan notas antiguas.';

with primera_factura as (
  select l.hoja_encargo_id, min(f.fecha) fecha
  from public.factura_linea_hitos x
  join public.factura_lineas fl on fl.id = x.factura_linea_id
  join public.facturas f on f.id = fl.factura_id
  join public.hitos_cobro hc on hc.id = x.hito_cobro_id
  join public.lineas_facturacion l on l.id = hc.linea_facturacion_id
  group by l.hoja_encargo_id
), viejos as (
  select h.id, h.numero_hoja,
         case when h.numero_hoja like 'NR-%'
              then extract(year from least(h.fecha_firma, pf.fecha))::int
              else split_part(h.numero_hoja, '-', 2)::int end as anio,
         h.fecha_firma
  from public.hojas_encargo h
  left join primera_factura pf on pf.hoja_encargo_id = h.id
  where h.numero_hoja ~ '^(PD|NR|CT)-'
), ultimo_he as (
  select split_part(numero_hoja, '-', 2)::int anio, max(split_part(numero_hoja, '-', 3)::int) ultimo
  from public.hojas_encargo where numero_hoja like 'HE-%' group by 1
), nuevos as (
  select v.id, v.numero_hoja viejo,
         'HE-' || v.anio || '-' || lpad((coalesce(u.ultimo, 0)
           + row_number() over (partition by v.anio order by v.fecha_firma nulls last, v.numero_hoja))::text, 4, '0') nuevo
  from viejos v left join ultimo_he u on u.anio = v.anio
)
update public.hojas_encargo h
set codigo_anterior = n.viejo, numero_hoja = n.nuevo
from nuevos n
where h.id = n.id;

-- Los contadores de HE, al dia (al de 2025 le faltaba la fila: iba hasta HE-2025-0751 sin saberlo).
insert into public.series_documento (tipo, anio, ultimo)
select 'HE', split_part(numero_hoja, '-', 2)::int, max(split_part(numero_hoja, '-', 3)::int)
from public.hojas_encargo where numero_hoja like 'HE-%' group by 2
on conflict (tipo, anio) do update set ultimo = greatest(series_documento.ultimo, excluded.ultimo), actualizado_en = now();

-- Que no vuelva a pasar: todo compromiso firmado lleva codigo HE, sea de la forma que sea.
alter table public.hojas_encargo add constraint hojas_encargo_codigo_he
  check (numero_hoja is null or numero_hoja ~ '^HE-[0-9]{4}-[0-9]{4}$');
