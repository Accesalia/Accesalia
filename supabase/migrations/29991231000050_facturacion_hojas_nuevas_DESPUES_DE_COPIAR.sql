-- FACTURACION SOBRE LAS HOJAS NUEVAS — LA MIGRACION DEL DIA, 2 DE 2: DESPUES DE COPIAR (Monica, 25-oct-2026: «cero
-- deuda tecnica»). Se aplica ESE dia, despues de la 1 de 2 (29991231000000_facturacion_hojas_nuevas_ANTES_DE_COPIAR.sql)
-- y de la copia de los datos (cada ficha de facturacion ya mirando a su linea nueva, he_linea_id, o a su version,
-- he_version_id), a la vez que se sube el codigo de la rama facturacion-hojas-nuevas. Detras van las del hilo
-- comercial (29991231000100-000500).
--
-- 1) La casilla de siempre «de que hoja es» (fichas, notas de facturacion y lineas de presupuesto), que la copia ya
--    relleno con la hoja en su casa nueva, se ata a he_versiones_hoja y pasa a llamarse he_version_id (Monica, 25-oct).
-- 2) Dos VISTAS de solo lectura (una forma de mirar lo mismo, no una copia), para que todas las pantallas del dinero
--    lean la hoja nueva con los nombres de siempre:
--      facturacion_hojas:  una fila por version firmada (la «hoja»): numero, fecha de firma, opp, pagador, fase, firmada.
--      facturacion_lineas: la ficha de Alexandra de cada linea + lo que la hoja dice de esa linea (concepto, importe,
--                          %, bloque). Lo de la hoja manda; lo de la ficha solo en las añadidas a mano y en las de
--                          Ecobalance (los 3 presupuestos: incluidos para la comunidad, su comision se cobra aparte).
-- 3) Las dos funciones del dinero (hojas_firmadas, panoramica_cobros), iguales pero leyendo las vistas.

-- la casilla de siempre, atada a la hoja en su casa nueva (la copia ya la relleno)
alter table public.lineas_facturacion rename column hoja_encargo_id to he_version_id;
alter table public.lineas_facturacion add constraint lineas_facturacion_he_version_id_fkey foreign key (he_version_id) references public.he_versiones_hoja(id);
alter table public.notas_facturacion rename column hoja_encargo_id to he_version_id;
alter table public.notas_facturacion add constraint notas_facturacion_he_version_id_fkey foreign key (he_version_id) references public.he_versiones_hoja(id) on delete cascade;
alter table public.presupuesto_lineas rename column hoja_encargo_id to he_version_id;
alter table public.presupuesto_lineas add constraint presupuesto_lineas_he_version_id_fkey foreign key (he_version_id) references public.he_versiones_hoja(id);
comment on column public.lineas_facturacion.he_version_id is 'De que hoja (version) es esta ficha. Siempre. Si salio de una linea de la hoja, ademas he_linea_id.';
comment on column public.notas_facturacion.he_version_id is 'De que hoja (version) es la nota, si es de la hoja entera.';
comment on column public.presupuesto_lineas.he_version_id is 'De que hoja (version) sale esta linea de presupuesto.';

create or replace view public.facturacion_hojas with (security_invoker = true) as
select v.id, v.codigo_he, v.numero_version,
       v.codigo_he || case when v.numero_version > 1 then ' · v' || v.numero_version else '' end as numero_hoja,
       (select max(e.fecha)::date from public.he_estados_hoja e where e.version_id = v.id and e.estado = 'firmada_recibida') as fecha_firma,
       v.oportunidad_id, coalesce(v.pagador_comunidad_id, o.comunidad_id) as comunidad_id,
       v.pagador_tipo, coalesce(v.pagador_comunidad_id, v.pagador_contrata_id, v.pagador_persona_id) as pagador_id,
       v.pagador_contrata_id, v.pagador_persona_id, v.comercial_id, v.estado as fase, v.firmada_documento_id, v.codigos_contrata
from public.he_versiones_hoja v
left join public.oportunidades o on o.id = v.oportunidad_id
where v.estado in ('firmada_recibida','firma_con_errores','ok_comercial','hitos_validados','primer_cobro','a_produccion','ok_administracion');

create or replace view public.facturacion_lineas with (security_invoker = true) as
select lf.id, coalesce(hl.version_id, lf.he_version_id) as hoja_id, lf.he_linea_id,
       case when hl.id is null or lf.emisor = 'ecobalance' then lf.descripcion
            else coalesce(nullif(trim(hl.texto), ''), coalesce(b.nombre_corto, b.nombre, 'Línea') || coalesce(' · ' || tp.nombre, '')) end as descripcion,
       case when hl.id is null or lf.emisor = 'ecobalance' then lf.importe else hl.importe end as importe,
       case when hl.id is null or lf.emisor = 'ecobalance' then lf.es_porcentaje else (hl.importe is null and hl.porcentaje is not null) end as es_porcentaje,
       case when hl.id is null or lf.emisor = 'ecobalance' then lf.porcentaje else hl.porcentaje end as porcentaje,
       coalesce(hl.bloque_id, lf.bloque_id) as bloque_id,
       lf.emisor, lf.validada_en, lf.validada_por, lf.editada_en, lf.editada_por, lf.creada_por, lf.quitada_en, lf.quitada_por,
       lf.origen, lf.creado_en, lf.extraido, lf.forma_cobro, lf.pagador_tipo, lf.pagador_id
from public.lineas_facturacion lf
left join public.he_lineas_compromisos hl on hl.id = lf.he_linea_id
left join public.bloques b on b.id = hl.bloque_id
left join public.tipos_proyecto tp on tp.id = hl.desglose_id
where lf.he_linea_id is not null or lf.he_version_id is not null;

grant select on public.facturacion_hojas, public.facturacion_lineas to sali_lector, authenticated, service_role;

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
  select h.id, h.numero_hoja, h.fecha_firma, h.firmada_documento_id, o.id as opp_id, o.nombre as opp_nombre
  from facturacion_hojas h join oportunidades o on o.id = h.oportunidad_id
  where o.estado <> 'anulada'
),
lineas as (
  select lf.* from facturacion_lineas lf, libro
  where lf.quitada_en is null and lf.emisor = any(libro.lineas) and lf.hoja_id in (select id from hojas)
),
-- lo que cada factura pone en cada linea (base)
enlaces as (
  select l.hoja_id as hoja_id, l.id as linea_id, f.id as factura_id, sum(flh.importe) as base_linea
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
         -- cobrada si falta menos del 1 % o de 1 euro: comisiones del confirming y centimos del banco (Monica, 16-oct)
         -- hasta 2023 inclusive la factura garantiza el cobro: no se descargaban justificantes (Monica, 17-oct)
         case when fv.anio <= 2023 then 'cobrada'
              when fv.cobrado >= fv.total - greatest(1, fv.total * 0.01) then 'cobrada'
              when fv.devuelta then 'devuelta'
              when fv.cobrado > 0 then 'parcial'
              else 'sin_cobro' end as estado_cobro
  from facturas_vivas fv
),
-- la parte de cada factura que es de cada hoja
por_hoja as (
  select e.hoja_id, f.id as factura_id, f.estado_cobro, f.empresa_emisora,
         case when f.base > 0 then sum(e.base_linea) / f.base else 1 end as parte, f.base, f.total,
         -- una factura cobrada (con el margen, o de 2023 o antes) cuenta entera
         case when f.estado_cobro = 'cobrada' then f.total else f.cobrado end as cobrado
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
  select hoja_id as hoja_id, sum(importe) filter (where not es_porcentaje) as contratado,
    array_agg(distinct case when emisor = 'daniel_autonomo' then 'daniel' else emisor end) as quien
  from lineas group by hoja_id
),
falta as (
  select distinct l.hoja_id as hoja_id
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
      'pdf', case when p.firmada_documento_id is not null then jsonb_build_object('version', p.id) end,
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
        from lineas l where l.hoja_id = p.id), '[]'))
      order by p.fecha_firma desc nulls last, p.numero_hoja desc)
    from pagina p), '[]')
);
$$;
comment on function public.hojas_firmadas is 'Cobrar › hojas firmadas: filtra, busca, cuenta y pagina en una llamada; devuelve 50 hojas con lineas -> facturas -> cobros. Reglas de estado y reparto en la cabecera de la migracion 20261016232000.';


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
  from facturacion_hojas h join oportunidades o on o.id = h.oportunidad_id
  where o.estado <> 'anulada'
    and (p_desde is null or h.fecha_firma >= p_desde) and (p_hasta is null or h.fecha_firma <= p_hasta)
),
lineas as (
  select lf.id, lf.hoja_id, lf.descripcion, lf.importe, lf.es_porcentaje, lf.porcentaje, lf.creado_en,
         h.numero_hoja, h.fecha_firma, h.opp_id, h.opp_nombre, h.comercial_id
  from facturacion_lineas lf join hojas h on h.id = lf.hoja_id
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


-- LA COMPROBACION DEL DINERO (Monica, 25-oct-2026: «si algo no cuadra, no se aplica»). Con todo ya leyendo las hojas
-- nuevas, hoja a hoja: las mismas fichas (mas las de la tramitacion de las subvenciones partidas), los mismos hitos y lo
-- que suman, las mismas facturas y lo facturado; y los mismos totales en Hojas firmadas y Panoramica que antes de copiar.
do $comprobacion$
declare hay int; antes jsonb; ahora jsonb;
begin
  select count(*) into hay
    from public.migr_he_foto f
    join public.migr_he_versiones mv on mv.hoja_vieja = f.hoja_vieja and mv.referencia
   where f.hoja_vieja is not null and (
         f.fichas <> (select count(*) from public.lineas_facturacion l where l.he_version_id = mv.nueva and l.notas is distinct from 'Partida de la ficha de la subvención al migrar (decisión 5): aquí la tramitación a éxito.')
      or f.hitos <> (select count(*) from public.hitos_cobro hc join public.lineas_facturacion l on l.id = hc.linea_facturacion_id where l.he_version_id = mv.nueva)
      or f.hitos_importe <> (select coalesce(sum(hc.importe), 0) from public.hitos_cobro hc join public.lineas_facturacion l on l.id = hc.linea_facturacion_id
                              where l.he_version_id = mv.nueva and hc.estado <> 'anulado')
      or f.facturas <> (select count(distinct fl.factura_id) from public.factura_linea_hitos flh join public.factura_lineas fl on fl.id = flh.factura_linea_id
                          join public.hitos_cobro hc on hc.id = flh.hito_cobro_id join public.lineas_facturacion l on l.id = hc.linea_facturacion_id where l.he_version_id = mv.nueva)
      or f.facturado <> (select coalesce(sum(flh.importe), 0) from public.factura_linea_hitos flh
                          join public.hitos_cobro hc on hc.id = flh.hito_cobro_id join public.lineas_facturacion l on l.id = hc.linea_facturacion_id where l.he_version_id = mv.nueva));
  if hay > 0 then raise exception 'NO CUADRA EL DINERO: % hojas con distintas fichas, hitos o facturas que antes de copiar', hay; end if;

  select pantalla into antes from public.migr_he_foto where hoja_vieja is null;
  ahora := jsonb_build_object('accesalia', public.hojas_firmadas('accesalia', null, null, null, null, 1, 1)->'sumas',
                              'ecobalance', public.hojas_firmadas('ecobalance', null, null, null, null, 1, 1)->'sumas',
                              'panoramica', public.panoramica_cobros(null, null, null, false, 1, 1)->'resumen');
  if antes->'accesalia' <> ahora->'accesalia' or antes->'ecobalance' <> ahora->'ecobalance'
     or (antes->'panoramica'->>'firmado')::numeric <> (ahora->'panoramica'->>'firmado')::numeric
     or (antes->'panoramica'->>'facturado')::numeric <> (ahora->'panoramica'->>'facturado')::numeric
     or (antes->'panoramica'->>'cobrado')::numeric <> (ahora->'panoramica'->>'cobrado')::numeric then
    raise exception 'NO CUADRAN LAS PANTALLAS: antes % / ahora %', antes, ahora;
  end if;
end
$comprobacion$;
