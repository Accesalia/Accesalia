-- TRES PRESUPUESTOS (capa 1: registro de la licitacion).
--
-- El esqueleto de fase 1 (licitaciones + presupuestos_licitacion) ya modelaba lo
-- esencial: origen (invitada_por_nosotros / aportada_por_comunidad) y rol_pretendido
-- (preferida / palanca / na) -> el CASO B (proyecto que ya viene con contrata y se
-- buscan 2 palancas para cubrir el expediente de subvencion) ya encaja.
--
-- Falta lo que exige la subvencion y el dia a dia:
--   - FIRMAS: la contrata firma SIEMPRE su presupuesto; el ganador ademas lo firma
--     la comunidad, junto al acta de votacion.
--   - ENLACE al PDF/BC3 original de cada presupuesto (Presto; lo conservamos).
--   - ACTA DE VOTACION e INFORME DE ADECUACION a nivel de licitacion.

alter table presupuestos_licitacion
  add column if not exists firmado_contrata boolean not null default false,
  add column if not exists firmado_comunidad boolean not null default false,
  add column if not exists enlace_documento text,
  add column if not exists fecha_presupuesto date;

comment on column presupuestos_licitacion.firmado_contrata is
  'La contrata firma su presupuesto. Regla dura de subvencion: SIEMPRE firmados por la contrata.';
comment on column presupuestos_licitacion.firmado_comunidad is
  'Solo el ganador: la comunidad firma la oferta adjudicada (ademas del acta de votacion).';
comment on column presupuestos_licitacion.enlace_documento is
  'Enlace al PDF/BC3 original del presupuesto (Dropbox/Drive/Storage). El desglose por partidas llega en la capa siguiente.';
comment on column presupuestos_licitacion.fecha_presupuesto is
  'Fecha del presupuesto de la contrata.';

alter table licitaciones
  add column if not exists acta_votacion_enlace text,
  add column if not exists fecha_votacion date,
  add column if not exists informe_adecuacion_enlace text;

comment on column licitaciones.acta_votacion_enlace is
  'Acta de la junta donde la comunidad voto/adjudico. Regla dura de subvencion.';
comment on column licitaciones.fecha_votacion is
  'Fecha de la junta de votacion/adjudicacion.';
comment on column licitaciones.informe_adecuacion_enlace is
  'Informe de adecuacion: traduce el analisis comparativo de ofertas a lenguaje para la comunidad. El generador llega despues.';
