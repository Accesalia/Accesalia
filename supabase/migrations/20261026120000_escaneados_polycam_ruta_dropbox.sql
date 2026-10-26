-- LOS POLYCAM HISTORICOS, TRAIDOS DE SU CARPETA DE DROPBOX  (Monica, 26-oct-2026)
--
-- Las opps de 2026 tienen el escaneo en Dropbox (1.DATOS/6.3D/...) pero no en la
-- app, y por eso la ficha decia "Falta el Polycam". Se suben "como historico":
-- se ven en la ficha y quitan el "falta", pero NO van a la mesa de Alex, porque
-- esas viabilidades ya estan hechas (se subiran despues).
--
-- La marca es la ruta de donde salio, desde "Ascensores y rehabilitaciones" y con
-- barras /, como oportunidades.dropbox_carpeta. Si esta rellena, el escaneo es
-- historico; y ademas queda la trazabilidad del fichero de origen.
--
-- La fecha (fecha y fecha_escaneo) de estos es la del fichero en Dropbox: no es
-- exacta, pero da mes y año, y a ella le sirve para los historicos.

alter table public.escaneados_polycam add column if not exists ruta_dropbox text;

comment on column public.escaneados_polycam.ruta_dropbox is
$$De que fichero de Dropbox se trajo, desde "Ascensores y rehabilitaciones" (Monica, 26-oct-2026).
Si esta rellena, el escaneo es HISTORICO: cuenta como Polycam recibido en la opp, pero no entra en
la mesa de viabilidades. Su fecha es la del fichero en Dropbox, aproximada.$$;

create unique index if not exists escaneados_polycam_ruta_dropbox_unica
  on public.escaneados_polycam (ruta_dropbox) where ruta_dropbox is not null;
