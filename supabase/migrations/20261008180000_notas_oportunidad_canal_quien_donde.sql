-- =====================================================================
-- NOTAS DE OPORTUNIDAD: CANAL Y CON QUIEN
-- Monica, 8-oct-2026.
--
-- notas_oportunidad pasa a ser EL diario de la oportunidad. interacciones se
-- solapaba con ella y se congela (solo tenia pruebas de julio).
--
-- CANAL: como nos enteramos. "Me lo dijo en la comida" no es lo mismo que "me
-- lo envio por email": la trazabilidad es distinta. Obligatorio cuando la
-- escribe una persona; vacio en lo migrado.
--
-- CON QUIEN: la persona con la que se hablo, elegida de la lista. Es un DATO de
-- la nota, no de donde cuelga: la nota cuelga de la oportunidad. Una sola de
-- las tres columnas, segun la lista de la que salga.
--
-- SIN campos de "lo que tecleo" (Monica): el buscador de la pantalla no se
-- guarda. Aqui solo llega lo ya elegido. Lo que no se encuentra y se marca
-- para revisar espera en la bandeja de pendientes, no aqui.
--
-- Fuera, a proposito: tipo de evento, estado en que deja la opp, lo que extrae
-- Sali, requiere humano. Las fases avanzan con DATOS objetivos, no con notas.
-- El comercial es el autor (autor_id, del login); no hay comercial_id aparte.
-- =====================================================================

alter table public.notas_oportunidad
  add column canal                      text,
  add column quien_puesto_id            uuid references public.puesto(id),
  add column quien_persona_id           uuid references public.persona(id),
  add column quien_persona_comunidad_id uuid references public.personas_comunidad(id);

alter table public.notas_oportunidad
  add constraint notas_opp_canal_ck check (canal in ('visita','llamada','mail','escrito')),
  add constraint notas_opp_persona_canal_ck check (origen <> 'persona' or canal is not null),
  add constraint notas_opp_un_quien_ck check (
    (quien_puesto_id is not null)::int + (quien_persona_id is not null)::int + (quien_persona_comunidad_id is not null)::int <= 1
  );

comment on column public.notas_oportunidad.canal is
  'Como nos enteramos: visita, llamada, mail, escrito. Obligatorio si origen = persona. El movil pone visita por defecto; en el PC lo elige el comercial.';
comment on column public.notas_oportunidad.quien_puesto_id is
  'Con quien se hablo, si es de la agenda de administradores (puesto).';
comment on column public.notas_oportunidad.quien_persona_id is
  'Con quien se hablo, si es una persona de la agenda sin puesto concreto.';
comment on column public.notas_oportunidad.quien_persona_comunidad_id is
  'Con quien se hablo, si es de la comunidad: presidente, vecino...';
