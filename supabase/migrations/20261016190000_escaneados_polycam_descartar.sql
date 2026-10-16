-- DESCARTAR UN CORREO DEL BUZON DEL POLYCAM (Monica, 16-oct-2026).
--
-- Al buzon llegan correos que no son escaneos de ningun edificio: pruebas en la
-- oficina, un enlace vacio de Polycam, un correo sin adjunto. Hasta hoy no
-- habia forma de quitarlos de "Necesito un humano".
--
-- No se borra nada: la fila y el fichero se quedan, por si alguien se equivoca.
-- Se apunta cuando y quien lo descarto, y deja de salir en la mesa.
alter table public.escaneados_polycam
  add column if not exists descartado_en timestamptz,
  add column if not exists descartado_por uuid references public.equipo(id);

comment on column public.escaneados_polycam.descartado_en is
  'Cuando se descarto desde la mesa de viabilidades por no ser un escaneo de ningun edificio. Null = vivo.';
comment on column public.escaneados_polycam.descartado_por is
  'Quien lo descarto (equipo).';
