-- HOJAS FIRMADAS, CON SUS FACTURAS Y SUS COBROS (Monica, 16-oct-2026). La lista de todas las hojas firmadas sin
-- entrar en la opp: codigo, que cubre (sus lineas), estado de cobro y quien factura. Debajo de cada linea, sus
-- facturas y los cobros de cada una con su justificante.
--
-- UNA llamada por gesto (lo aprendido con e3 el 16-oct): filtra, busca, cuenta y pagina AQUI, y devuelve solo las
-- 50 hojas de la pagina con todo cruzado, mas los contadores por estado para los filtros.
--
-- REGLAS (de Monica, 16-oct-2026):
-- * Las facturas cuelgan de las LINEAS, no de la hoja: factura_lineas -> factura_linea_hitos -> hitos_cobro ->
--   lineas_facturacion -> hoja. Una factura que cubre varias hojas (hay 29) se REPARTE por lo que sus
--   factura_linea_hitos.importe (base) ponen en cada hoja: la parte de la hoja = esa base / la base de la factura.
--   Nunca se suma el total de la factura entero a cada hoja.
-- * Cobrado = justificante subido (tabla cobros, contra la factura, total con IVA; Daniel: el total ya va sin el
--   IRPF). Las devoluciones van en negativo. Una factura esta cobrada si lo cobrado llega a su total (1 euro de
--   margen: comisiones y centimos del banco).
-- * Estado de la hoja:
--     alerta  = alguna factura tiene una devolucion despues de la cual no ha entrado nada, y no esta cobrada;
--     total   = no le quedan hitos por facturar, tiene facturas y todas estan cobradas;
--     pendiente = no se ha cobrado nada;  parcial = lo demas;
--     anterior = firmada antes de 2025 y sin facturas en la app (Factusol se volco desde 2025): no se sabe.
-- * Quien factura sale de las FACTURAS; si aun no hay, de las lineas. Nunca de hojas_encargo.emisor (no es fiable).
-- * Libro: Accesalia = lineas de Accesalia y de Daniel; Ecobalance = las suyas (solo Ana y direccion). El libro lo
--   pone el SERVIDOR segun quien es, nunca el navegador.
-- * Solo facturas (no abonos) y no anuladas. Fuera las opps anuladas.

create or replace function public.hojas_firmadas(
  p_libro text default 'accesalia',     -- 'accesalia' | 'ecobalance'
  p_texto text default null,            -- opp, numero de hoja o numero de factura ("131", "1-131", "131-2026")
  p_anio int default null,              -- año de firma
  p_estado text default null,           -- alerta | total | parcial | pendiente | anterior
  p_emisor text default null,           -- accesalia | daniel | ecobalance
  p_pagina int default 1,
  p_por_pagina int default 50
) returns jsonb
language sql stable security invoker set search_path = public as $$
with
libro as (
  select case when p_libro = 'ecobalance' then array['ecobalance'] else array['accesalia', 'daniel_autonomo'] end as lineas,
         case when p_libro = 'ecobalance' then array['ecobalance'] else array['accesalia', 'daniel'] end as facturas
),
hojas as (
  select h.id, h.numero_hoja, h.fecha_firma, o.id as opp_id, o.nombre as opp_nombre
  from hojas_encargo h join oportunidades o on o.id = h.oportunidad_id
  where h.estado = 'devuelta_firmada' and o.estado <> 'anulada'
),
lineas as (
  select lf.* from lineas_facturacion lf, libro
  where lf.quitada_en is null and lf.emisor = any(libro.lineas) and lf.hoja_encargo_id in (select id from hojas)
),
-- lo que cada factura pone en cada linea (base)
enlaces as (
  select l.hoja_encargo_id as hoja_id, l.id as linea_id, f.id as factura_id, sum(flh.importe) as base_linea
  from lineas l
  join hitos_cobro hc on hc.linea_facturacion_id = l.id
  join factura_linea_hitos flh on flh.hito_cobro_id = hc.id
  join factura_lineas fl on fl.id = flh.factura_linea_id
  join facturas f on f.id = fl.factura_id, libro
  where f.tipo = 'factura' and f.estado <> 'anulada' and f.empresa_emisora = any(libro.facturas)
  group by 1, 2, 3
),
facturas_vivas as (
  select f.id, f.serie, f.numero, f.anio, f.fecha, f.base, f.total, f.empresa_emisora, f.url_pdf is not null as tiene_pdf,
         coalesce(c.cobrado, 0) as cobrado, coalesce(c.n, 0) as n_cobros, coalesce(c.devuelta, false) as devuelta
  from facturas f
  left join (
    -- devuelta = una devolucion despues de la cual no ha vuelto a entrar nada (si se repitio el cargo, ya no)
    select c.factura_id, sum(c.importe) as cobrado, count(*) as n,
           bool_or(c.tipo = 'devolucion' and not exists (
             select 1 from cobros d where d.factura_id = c.factura_id and d.tipo <> 'devolucion' and d.fecha_cobro > c.fecha_cobro)) as devuelta
    from cobros c group by c.factura_id
  ) c on c.factura_id = f.id
  where f.id in (select factura_id from enlaces)
),
-- cada factura, su estado de cobro
fac as (
  select fv.*,
         case when fv.cobrado >= fv.total - 1 then 'cobrada'
              when fv.devuelta then 'devuelta'
              when fv.cobrado > 0 then 'parcial'
              else 'sin_cobro' end as estado_cobro
  from facturas_vivas fv
),
-- la parte de cada factura que es de cada hoja
por_hoja as (
  select e.hoja_id, f.id as factura_id, f.estado_cobro, f.empresa_emisora,
         case when f.base > 0 then sum(e.base_linea) / f.base else 1 end as parte, f.base, f.total, f.cobrado
  from enlaces e join fac f on f.id = e.factura_id
  group by e.hoja_id, f.id, f.estado_cobro, f.empresa_emisora, f.base, f.total, f.cobrado
),
-- LO DE CADA HOJA, AGREGADO UNA VEZ (revision de e3, 16-oct-2026): antes eran subconsultas por hoja sobre las CTE
-- (1.016 hojas x 7 recorridos de por_hoja y lineas): 0,74 s en cada llamada, tambien en caliente. Agrupando una
-- vez y cruzando: 0,04-0,07 s. Mismo resultado, comprobado pagina a pagina, por estado, por emisor, Ecobalance y
-- buscador.
ph as (
  select hoja_id, round(sum(base * parte), 2) as facturado,
    round(sum(base * parte * least(greatest(cobrado, 0), total) / nullif(total, 0)), 2) as cobrado,
    count(*) as n_facturas, bool_or(estado_cobro = 'devuelta') as alerta, bool_and(estado_cobro = 'cobrada') as todas_cobradas,
    array_agg(distinct empresa_emisora order by empresa_emisora) as quien
  from por_hoja group by hoja_id
),
la as (
  select hoja_encargo_id as hoja_id, sum(importe) filter (where not es_porcentaje) as contratado,
    array_agg(distinct case when emisor = 'daniel_autonomo' then 'daniel' else emisor end) as quien
  from lineas group by hoja_encargo_id
),
falta as (
  select distinct l.hoja_encargo_id as hoja_id
  from lineas l join hitos_cobro hc on hc.linea_facturacion_id = l.id
  where hc.estado in ('pendiente', 'parcial') and not exists (select 1 from hitos_cobro hijo where hijo.hito_padre_id = hc.id)
),
resumen as (
  select h.id, coalesce(la.contratado, 0) as contratado, coalesce(ph.facturado, 0) as facturado, coalesce(ph.cobrado, 0) as cobrado,
    coalesce(ph.n_facturas, 0) as n_facturas, coalesce(ph.alerta, false) as alerta, coalesce(ph.todas_cobradas, true) as todas_cobradas,
    (fa.hoja_id is not null) as falta_facturar, coalesce(ph.quien, la.quien) as quien
  from hojas h left join ph on ph.hoja_id = h.id left join la on la.hoja_id = h.id left join falta fa on fa.hoja_id = h.id
  where p_libro <> 'ecobalance' or la.hoja_id is not null
),
con_estado as (
  select h.*, r.contratado, r.facturado, r.cobrado, r.n_facturas, r.falta_facturar, coalesce(r.quien, '{}') as quien,
    case when r.alerta then 'alerta'
         when r.n_facturas = 0 and h.fecha_firma < date '2025-01-01' then 'anterior'
         when r.n_facturas > 0 and r.todas_cobradas and not r.falta_facturar then 'total'
         when r.cobrado <= 0 then 'pendiente'
         else 'parcial' end as estado
  from hojas h join resumen r on r.id = h.id
),
-- el numero de factura que se busca: "131", "131-2026" (numero-año) o "1-131" (serie-numero)
busca as (
  select case when t ~ '^\d+$' then t::int
              when t ~ '^\d+-20\d\d$' then split_part(t, '-', 1)::int
              when t ~ '^\d+-\d+$' then split_part(t, '-', 2)::int end as num,
         case when t ~ '^\d+-20\d\d$' then split_part(t, '-', 2)::int end as anio,
         case when t ~ '^\d+-\d+$' and t !~ '^\d+-20\d\d$' then split_part(t, '-', 1) end as serie
  from (select nullif(trim(p_texto), '') as t) x
),
-- buscador y filtros, salvo el de estado (para contar cada estado)
filtradas as (
  select c.* from con_estado c, busca b
  where (p_anio is null or extract(year from c.fecha_firma) = p_anio)
    and (p_emisor is null or p_emisor = any(c.quien))
    and (coalesce(trim(p_texto), '') = ''
         or sin_tildes(c.opp_nombre) ilike '%' || sin_tildes(trim(p_texto)) || '%'
         or c.numero_hoja ilike '%' || trim(p_texto) || '%'
         or (b.num is not null and exists (
               select 1 from por_hoja p join facturas f on f.id = p.factura_id
               where p.hoja_id = c.id and f.numero = b.num
                 and (b.anio is null or f.anio = b.anio) and (b.serie is null or f.serie = b.serie))))
),
pagina as (
  select * from filtradas where p_estado is null or estado = p_estado
  order by fecha_firma desc nulls last, numero_hoja desc
  limit greatest(p_por_pagina, 1) offset greatest(p_pagina - 1, 0) * greatest(p_por_pagina, 1)
)
select jsonb_build_object(
  'total', (select count(*) from filtradas where p_estado is null or estado = p_estado),
  'sumas', (select jsonb_build_object('contratado', coalesce(sum(contratado), 0), 'facturado', coalesce(sum(facturado), 0),
                                      'cobrado', coalesce(sum(cobrado), 0))
            from filtradas where p_estado is null or estado = p_estado),
  'por_estado', coalesce((select jsonb_object_agg(estado, n) from (select estado, count(*) n from filtradas group by estado) x), '{}'),
  'anios', coalesce((select jsonb_agg(a order by a desc) from (select distinct extract(year from fecha_firma)::int a from con_estado where fecha_firma is not null) x), '[]'),
  'filas', coalesce((select jsonb_agg(jsonb_build_object(
      'id', p.id, 'numero', p.numero_hoja, 'fecha_firma', p.fecha_firma,
      'opp', jsonb_build_object('id', p.opp_id, 'nombre', p.opp_nombre),
      'estado', p.estado, 'quien', to_jsonb(p.quien),
      'contratado', p.contratado, 'facturado', p.facturado, 'cobrado', p.cobrado, 'falta_facturar', p.falta_facturar,
      'pdf', (select jsonb_build_object('version', v.id, 'indice', cardinality(v.pdfs_firmados) - 1)
              from versiones_hoja v where v.hoja_encargo_id = p.id and cardinality(v.pdfs_firmados) > 0
              order by v.numero_version desc limit 1),
      'lineas', coalesce((select jsonb_agg(jsonb_build_object(
          'id', l.id, 'descripcion', l.descripcion, 'importe', l.importe, 'es_porcentaje', l.es_porcentaje,
          'porcentaje', l.porcentaje, 'emisor', l.emisor,
          'facturas', coalesce((select jsonb_agg(jsonb_build_object(
              'id', f.id, 'serie', f.serie, 'numero', f.numero, 'anio', f.anio, 'fecha', f.fecha,
              'total', f.total, 'base_linea', e.base_linea, 'empresa', f.empresa_emisora, 'tiene_pdf', f.tiene_pdf,
              'estado_cobro', f.estado_cobro, 'cobrado', f.cobrado,
              'cobros', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'fecha', c.fecha_cobro, 'importe', c.importe, 'tipo', c.tipo)
                                    order by c.fecha_cobro, c.tipo) from cobros c where c.factura_id = f.id), '[]'))
              order by f.fecha, f.numero)
            from enlaces e join fac f on f.id = e.factura_id where e.linea_id = l.id), '[]'))
          order by l.creado_en, l.id)
        from lineas l where l.hoja_encargo_id = p.id), '[]'))
      order by p.fecha_firma desc nulls last, p.numero_hoja desc)
    from pagina p), '[]')
);
$$;
comment on function public.hojas_firmadas is 'Cobrar › hojas firmadas: filtra, busca, cuenta y pagina en una llamada; devuelve 50 hojas con lineas -> facturas -> cobros. Reglas de estado y reparto en la cabecera de la migracion 20261016232000.';
