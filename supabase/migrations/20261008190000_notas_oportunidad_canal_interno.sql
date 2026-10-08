-- =====================================================================
-- CANAL "INTERNO"
-- Monica, 8-oct-2026: "nos va a faltar un canal: interno, para esas senales
-- que llegan de otras partes de la app". Las notas automaticas de Sali cuando
-- Alex acaba una viabilidad o una hoja pasa a tener numero no llegan por
-- visita, llamada, mail ni escrito: llegan de dentro.
-- =====================================================================

alter table public.notas_oportunidad drop constraint notas_opp_canal_ck;
alter table public.notas_oportunidad
  add constraint notas_opp_canal_ck check (canal in ('visita','llamada','mail','escrito','interno'));

comment on column public.notas_oportunidad.canal is
  'Como nos enteramos: visita, llamada, mail, escrito, interno (senal de otra parte de la app). Obligatorio si origen = persona. El movil pone visita por defecto; en el PC lo elige el comercial.';
