-- LOS INFORMES DE VIABILIDAD HISTORICOS, TRAIDOS DEL DRIVE  (Monica, 26-oct-2026)
--
-- Los informes de antes de la app se mandaban por correo y se guardaban en la
-- carpeta compartida "HOJAS ENCARGO AUTOMATICAS" del Drive. Se suben a su opp
-- como viabilidad con su PDF. La marca es el nombre del fichero de origen: si
-- esta rellena, la viabilidad es HISTORICA (solo se ve su PDF, no se regenera,
-- y no entra en la mesa de Alex porque llega ya enviada).

alter table public.viabilidades add column if not exists ruta_drive text;

comment on column public.viabilidades.ruta_drive is
$$De que informe del Drive se trajo, ruta desde "HOJAS ENCARGO AUTOMATICAS" (Monica, 26-oct-2026).
Si esta rellena, la viabilidad es HISTORICA: cuenta como hecha y se ve su PDF, pero no se edita
ni se regenera. rematada_en y enviada_en = la fecha del nombre del informe (o la del fichero).$$;

create unique index if not exists viabilidades_ruta_drive_unica
  on public.viabilidades (ruta_drive) where ruta_drive is not null;
