-- EL PORTAL, UNA VENTANITA POR DOCUMENTO (Monica, 21-oct-2026): «que vuelvan
-- cosas, pero no al tuntún». Lo que sube la comunidad llega ya sabiendo qué es:
-- ademas de la hoja de encargo firmada y «otro», los papeles de la comunidad que
-- ya tienen hueco (tarjeta del CIF, DNI y acta de nombramiento del presidente,
-- certificado de titularidad) y el acta de votacion de cada opp, que por eso
-- lleva su oportunidad. La pantalla crece: cuando haga falta otro papel, se
-- añade aqui y en el catalogo.

alter table public.portal_recibidos drop constraint portal_recibidos_tipo_check;
alter table public.portal_recibidos add constraint portal_recibidos_tipo_check
  check (tipo = any (array['hoja_firmada', 'otro', 'tarjeta', 'dni', 'acta', 'certificado', 'votacion']));

alter table public.portal_recibidos
  add column oportunidad_id uuid references public.oportunidades(id) on delete set null;
