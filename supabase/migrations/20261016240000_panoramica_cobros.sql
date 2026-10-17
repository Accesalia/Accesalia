-- VISTA PANORAMICA DEL DINERO (Monica, 16-oct-2026): "ver de un vistazo lo que va a entrar y, de paso, cuanto ha
-- entrado ya". La unidad es la LINEA DE FACTURACION (cada linea es un que y un cuanto), agrupada por su opp (que la
-- identifica). Por linea: su importe, lo facturado y lo cobrado, para pintar una barra que se llena en verde.
-- Arriba, simple: firmado · facturado · cobrado · queda por ingresar, de Accesalia y Daniel JUNTOS (quien factura es
-- un artefacto nuestro). Filtros: entre fechas de firma, comercial, y quitar las lineas cobradas enteras. Tipo de
-- trabajo, pagador y empresa NO van aqui: eso es analisis del negocio, otra area.
--
-- Mismas reglas que hojas_firmadas (20261016232000): lo cobrado = justificante (tabla cobros); una factura que cubre
-- varias lineas se reparte por lo que sus factura_linea_hitos ponen en cada una (base, sin IVA); una factura esta
-- cobrada si falta menos del 1 % o de 1 euro. Libro de Accesalia (Accesalia + Daniel); Ecobalance no. Fuera las
-- opps anuladas. Las lineas "a exito" (porcentaje, sin importe) se cuentan aparte: no tienen cuanto todavia.

create or replace function public.panoramica_cobros(
  p_desde date default date '2025-01-01',
  p_hasta date default null,
  p_comercial uuid default null,
  p_pendientes boolean default false,   -- true = quitar las lineas cobradas enteras
  p_pagina int default 1,
  p_por_pagina int default 40
) returns jsonb
language sql stable security invoker set search_path = public as $$
with
hojas as (
  select h.id, h.numero_hoja, h.fecha_firma, o.id as opp_id, o.nombre as opp_nombre, o.comercial_id
  from hojas_encargo h join oportunidades o on o.id = h.oportunidad_id
  where h.estado = 'devuelta_firmada' and o.estado <> 'anulada'
    and (p_desde is null or h.fecha_firma >= p_desde) and (p_hasta is null or h.fecha_firma <= p_hasta)
),
lineas as (
  select lf.id, lf.hoja_encargo_id, lf.descripcion, lf.importe, lf.es_porcentaje, lf.porcentaje, lf.creado_en,
         h.numero_hoja, h.fecha_firma, h.opp_id, h.opp_nombre, h.comercial_id
  from lineas_facturacion lf join hojas h on h.id = lf.hoja_encargo_id
  where lf.quitada_en is null and lf.emisor in ('accesalia', 'daniel_autonomo')
),
enlaces as (
  select l.id as linea_id, f.id as factura_id, sum(flh.importe) as base_linea
  from lineas l
  join hitos_cobro hc on hc.linea_facturacion_id = l.id
  join factura_linea_hitos flh on flh.hito_cobro_id = hc.id
  join factura_lineas fl on fl.id = flh.factura_linea_id
  join facturas f on f.id = fl.factura_id
  where f.tipo = 'factura' and f.estado <> 'anulada' and f.empresa_emisora in ('accesalia', 'daniel')
  group by 1, 2
),
fac as (
  select f.id, f.anio, f.total, coalesce(c.cobrado, 0) as cobrado
  from facturas f left join (select factura_id, sum(importe) as cobrado from cobros group by factura_id) c on c.factura_id = f.id
  where f.id in (select factura_id from enlaces)
),
-- la parte cobrada de cada factura (1 si esta cobrada con el margen del 1 %)
fac_ratio as (
  -- hasta 2023 inclusive la factura garantiza el cobro: no se descargaban justificantes (Monica, 17-oct)
  select id, case when anio <= 2023 then 1
                  when total <= 0 then 0
                  when cobrado >= total - greatest(1, total * 0.01) then 1
                  else greatest(cobrado, 0) / total end as ratio
  from fac
),
por_linea as (
  select e.linea_id, round(sum(e.base_linea), 2) as facturado, round(sum(e.base_linea * r.ratio), 2) as cobrado
  from enlaces e join fac_ratio r on r.id = e.factura_id group by e.linea_id
),
l2 as (
  select l.*, coalesce(p.facturado, 0) as facturado, coalesce(p.cobrado, 0) as cobrado,
         (l.importe is null or (l.es_porcentaje and coalesce(l.importe, 0) = 0)) as a_exito,
         (coalesce(l.importe, 0) > 0 and coalesce(p.cobrado, 0) >= l.importe - greatest(1, l.importe * 0.01)) as cobrada
  from lineas l left join por_linea p on p.linea_id = l.id
  where p_comercial is null or l.comercial_id = p_comercial
),
-- lo que se ensena (con "quitar las cobradas enteras", solo lo que queda)
vistas as (select * from l2 where not p_pendientes or not cobrada),
opps as (
  select opp_id, opp_nombre, comercial_id,
         sum(coalesce(importe, 0)) as firmado, sum(facturado) as facturado, sum(cobrado) as cobrado,
         sum(greatest(coalesce(importe, 0) - cobrado, 0)) as queda, min(fecha_firma) as primera_firma
  from vistas group by opp_id, opp_nombre, comercial_id
),
pagina as (
  select * from opps order by queda desc, firmado desc, opp_nombre
  limit greatest(p_por_pagina, 1) offset greatest(p_pagina - 1, 0) * greatest(p_por_pagina, 1)
)
select jsonb_build_object(
  -- el resumen, de TODAS las lineas de las fechas y el comercial (no cambia al quitar las cobradas)
  'resumen', (select jsonb_build_object(
      'firmado', coalesce(sum(coalesce(importe, 0)), 0), 'facturado', coalesce(sum(facturado), 0),
      'cobrado', coalesce(sum(cobrado), 0), 'queda', coalesce(sum(greatest(coalesce(importe, 0) - cobrado, 0)), 0),
      'lineas', count(*), 'cobradas', count(*) filter (where cobrada), 'a_exito', count(*) filter (where a_exito),
      'opps', count(distinct opp_id))
    from l2),
  'por_comercial', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'nombre', c.nombre, 'firmado', x.firmado,
                                 'cobrado', x.cobrado, 'queda', x.queda) order by x.firmado desc)
    from (select l.comercial_id, sum(coalesce(l.importe, 0)) firmado, sum(coalesce(p.cobrado, 0)) cobrado,
                 sum(greatest(coalesce(l.importe, 0) - coalesce(p.cobrado, 0), 0)) queda
          from lineas l left join por_linea p on p.linea_id = l.id group by l.comercial_id) x
    left join comerciales c on c.id = x.comercial_id), '[]'),
  'total_opps', (select count(*) from opps),
  'filas', coalesce((select jsonb_agg(jsonb_build_object(
      'opp', jsonb_build_object('id', p.opp_id, 'nombre', p.opp_nombre),
      'comercial', (select nombre from comerciales where id = p.comercial_id),
      'firmado', p.firmado, 'facturado', p.facturado, 'cobrado', p.cobrado, 'queda', p.queda,
      'lineas', (select jsonb_agg(jsonb_build_object(
          'id', v.id, 'hoja', v.numero_hoja, 'fecha_firma', v.fecha_firma, 'descripcion', v.descripcion,
          'importe', v.importe, 'es_porcentaje', v.es_porcentaje, 'porcentaje', v.porcentaje, 'a_exito', v.a_exito,
          'facturado', v.facturado, 'cobrado', v.cobrado, 'cobrada', v.cobrada)
          order by v.fecha_firma, v.numero_hoja, v.creado_en, v.id)
        from vistas v where v.opp_id = p.opp_id))
      order by p.queda desc, p.firmado desc, p.opp_nombre)
    from pagina p), '[]')
);
$$;
comment on function public.panoramica_cobros is 'Vista Panoramica: por opp y linea, firmado / facturado / cobrado / queda, entre fechas de firma y por comercial; una llamada, 40 opps por pagina. Reglas en la migracion 20261016240000.';
