-- LAS FASES DE UNA OPORTUNIDAD SE DEDUCEN, NO SE MARCAN (Monica, 9-oct-2026).
--
--   "No deberia marcarse a mano ninguna fase. NINGUNA. Todas salen de hitos
--    detectables."
--
-- Hasta hoy cada fase era una fila de `hitos_oportunidad` que alguien tenia que
-- acordarse de cambiar, y nadie se acordaba: subir la hoja firmada ponia la hoja
-- en "devuelta_firmada" pero la fase "firma" de la oportunidad no se enteraba;
-- llegaba el Polycam y la barra seguia diciendo "falta el Polycam". En toda la
-- base habia 4 fases marcadas a mano y 1.192 oportunidades con la hoja enviada.
--
-- Aqui no se guarda nada: cada vez que se mira, se mira lo que HAY. Si manana se
-- importan facturas, o se vincula un escaneo, las oportunidades se colocan
-- solas, sin tocar ninguna pantalla.
--
-- QUE HACE CADA FASE "HECHA" (con su fecha):
--   primer_contacto         la primera nota del diario, la que abre la opp
--   visita                  se recibio el Polycam: si hay escaneo, hubo visita
--                           (fecha = la del escaneo). No es obligatoria.
--   polycam                 un escaneo vinculado a un acceso vivo de la opp
--   viabilidad_arquitecto   una viabilidad con su PDF generado
--   preparacion_documentos  una hoja con una version generada en PDF
--   envio_documentos        una hoja enviada a la comunidad (o ya firmada)
--   tresd                   un 3D entregado
--   junta                   una junta celebrada
--   firma                   una hoja devuelta firmada
--   cobro                   PAGADA. Saldra de facturacion; aun no se ha llegado
--                           ahi, asi que hoy nunca esta hecha.
-- Las hojas anuladas no cuentan para nada.
--
-- Y LA REGLA DE LOS SALTOS, suya: "estar en fase avanzada hace saltar las
-- anteriores, no quedan pendientes pero NO SE CIERRAN. Puedo enviar una hoja de
-- encargo y despues tener que hacer un Polycam." Por eso hay tres estados:
--   hecho      el dato existe
--   saltado    no existe, pero ya hay una fase posterior hecha: no es "falta",
--              y si el dato llega despues pasa a hecho con su fecha
--   pendiente  ni existe ni se ha pasado de largo

create or replace view public.fases_oportunidad
with (security_invoker = true) as
with datos as (
  select
    o.id as oportunidad_id,
    nt.hay as nota, nt.fecha as nota_fecha,
    pc.hay as escaneo, pc.fecha as escaneo_fecha,
    vb.hay as viabilidad, vb.fecha as viabilidad_fecha,
    hj.generada, hj.generada_fecha,
    hj.enviada, hj.enviada_fecha,
    hj.firmada, hj.firmada_fecha,
    td.hay as tresd, td.fecha as tresd_fecha,
    ju.hay as junta, ju.fecha as junta_fecha
  from public.oportunidades o
  left join lateral (
    select count(*) > 0 as hay, min(coalesce(n.fecha, n.creado_en::date)) as fecha
    from public.notas_oportunidad n where n.oportunidad_id = o.id
  ) nt on true
  left join lateral (
    select count(*) > 0 as hay, min(ep.fecha_escaneo::date) as fecha
    from public.relacion_oportunidad_accesos roa
    join public.relacion_polycam_acceso rpa on rpa.acceso_id = roa.acceso_id
    join public.escaneados_polycam ep on ep.id = rpa.polycam_id
    where roa.opp_id = o.id and roa.hasta is null
  ) pc on true
  left join lateral (
    select count(*) > 0 as hay, min(coalesce(v.rematada_en, v.enviada_en, v.creado_en)::date) as fecha
    from public.viabilidades v where v.oportunidad_id = o.id and v.url_pdf is not null
  ) vb on true
  left join lateral (
    select
      bool_or(v.url_pdf_hoja is not null) as generada,
      min(v.fecha_generada::date) filter (where v.url_pdf_hoja is not null) as generada_fecha,
      bool_or(h.estado in ('enviada_comunidad', 'devuelta_firmada')) as enviada,
      min(coalesce(v.fecha_enviada::date, h.fecha_creacion::date))
        filter (where h.estado in ('enviada_comunidad', 'devuelta_firmada')) as enviada_fecha,
      bool_or(h.estado = 'devuelta_firmada') as firmada,
      min(h.fecha_firma::date) filter (where h.estado = 'devuelta_firmada') as firmada_fecha
    from public.hojas_encargo h
    left join public.versiones_hoja v on v.hoja_encargo_id = h.id
    where h.oportunidad_id = o.id and h.estado <> 'anulada'
  ) hj on true
  left join lateral (
    select count(*) > 0 as hay, min(m.fecha_entrega::date) as fecha
    from public.modelos_3d_venta m where m.oportunidad_id = o.id and m.fecha_entrega is not null
  ) td on true
  left join lateral (
    select count(*) > 0 as hay, min(j.fecha_junta::date) as fecha
    from public.juntas j where j.oportunidad_id = o.id and j.celebrada is true
  ) ju on true
),
filas as (
  select d.oportunidad_id, hc.clave as hito, hc.orden, hc.es_ramal, coalesce(x.hecho, false) as hecho, x.fecha
  from datos d
  cross join lateral (values
    ('primer_contacto',        d.nota,       d.nota_fecha),
    ('visita',                 d.escaneo,    d.escaneo_fecha),
    ('polycam',                d.escaneo,    d.escaneo_fecha),
    ('viabilidad_arquitecto',  d.viabilidad, d.viabilidad_fecha),
    ('preparacion_documentos', d.generada,   d.generada_fecha),
    ('envio_documentos',       d.enviada,    d.enviada_fecha),
    ('tresd',                  d.tresd,      d.tresd_fecha),
    ('junta',                  d.junta,      d.junta_fecha),
    ('firma',                  d.firmada,    d.firmada_fecha),
    ('cobro',                  false,        null::date)
  ) as x(hito, hecho, fecha)
  join public.hitos_comerciales hc on hc.clave = x.hito
)
select
  f.oportunidad_id,
  f.hito,
  f.orden,
  f.es_ramal,
  case
    when f.hecho then 'hecho'
    when f.orden < max(f.orden) filter (where f.hecho) over (partition by f.oportunidad_id) then 'saltado'
    else 'pendiente'
  end as estado,
  case when f.hecho then f.fecha end as fecha
from filas f;

comment on view public.fases_oportunidad is
  'Las diez fases de cada oportunidad, DEDUCIDAS de los datos (hojas, escaneos, viabilidades, juntas, 3D). Nada se marca a mano (Monica, 9-oct-2026). estado: hecho / saltado (hay una posterior hecha; no es falta y no se cierra) / pendiente.';

-- La fase en la que esta cada oportunidad: la primera de la linea principal (no
-- el ramal del 3D) que sigue pendiente. Por la regla de los saltos, todo lo
-- hecho queda detras de ella, asi que "desde cuando esta ahi" es la ultima
-- fecha hecha.
create or replace view public.fase_actual_oportunidad
with (security_invoker = true) as
select
  o.id as oportunidad_id,
  o.comercial_id,
  o.estado,
  o.fecha_apertura,
  o.creado_en,
  (array_agg(f.hito order by f.orden) filter (where not f.es_ramal and f.estado = 'pendiente'))[1] as fase_actual,
  coalesce(bool_or(f.hito = 'cobro' and f.estado = 'hecho'), false) as cobrada,
  max(f.fecha) filter (where f.estado = 'hecho') as desde
from public.oportunidades o
join public.fases_oportunidad f on f.oportunidad_id = o.id
group by o.id;

comment on view public.fase_actual_oportunidad is
  'La fase actual de cada oportunidad (primera pendiente de la linea principal), si esta cobrada, y desde que fecha esta ahi. Sale de fases_oportunidad.';

-- El unico indice que le faltaba a esto: las listas filtran siempre por estado.
create index if not exists idx_oportunidades_estado on public.oportunidades (estado);
