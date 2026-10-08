-- =====================================================================
-- EL ADMINISTRADOR Y EL SIGUIENTE PASO, EN LA OPORTUNIDAD
-- Monica, 8-oct-2026.
--
-- ADMINISTRADOR: "el admin deberia pertenecer a la opp, la verdad". Hasta hoy
-- el administrador era de la COMUNIDAD (comunidad_admin_responsable), y una
-- oportunidad que nace con la direccion aun provisional -sin comunidad- no
-- tenia donde guardarlo. Es un dato de la opp pero NO cuenta para "completa":
-- "a menudo la HE se envia porque el comercial de Schindler nos pide precio de
-- una direccion, y no sabemos mas". Al confirmar la direccion, si la comunidad
-- no tiene administracion responsable, se propone esta.
--
-- SIGUIENTE PASO: el del alta ("Llamar para que me cuenten", "Ir a verlo",
-- "Enviar Hoja de Encargo"). El alta lo usaba para marcar los hitos de antes
-- como "no aplica" y no quedaba apuntado. Ahora se guarda: sin el, la
-- oportunidad no esta completa ("si no sabes donde, ni que hacer, ni a quien
-- llamar, no puedes hacer nada").
-- =====================================================================

alter table public.oportunidades
  add column administrador_puesto_id uuid references public.puesto(id),
  add column siguiente_paso text;

alter table public.oportunidades
  add constraint oportunidades_siguiente_paso_ck check (siguiente_paso in ('primer_contacto','visita','envio_documentos'));

comment on column public.oportunidades.administrador_puesto_id is
  'El administrador de esta oportunidad (persona con su puesto en la administracion). Dato de la opp, no bloquea (Monica, 8-oct-2026).';
comment on column public.oportunidades.siguiente_paso is
  'Lo siguiente que hay que hacer, de los tres del alta: primer_contacto (llamar para que me cuenten), visita (ir a verlo), envio_documentos (enviar hoja de encargo). Cuenta para "completa".';

create index oportunidades_administrador_idx on public.oportunidades (administrador_puesto_id) where administrador_puesto_id is not null;
