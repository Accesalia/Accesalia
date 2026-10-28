-- OTROS CORREOS DE UNA PERSONA DEL EQUIPO (Monica, 28-oct-2026). Abraham escanea
-- con su movil personal («tiene mejor camara») y el escaneo llega desde su correo
-- personal: la app no sabia que era suyo. Aqui van los correos personales desde
-- los que alguien del equipo manda cosas. SOLO SIRVEN PARA RECONOCER lo que llega
-- (el buzon del Polycam y lo que venga): para entrar en la app vale unicamente
-- `email`, y un movil personal no se convierte en puerta de entrada.
--
-- Los correos de cada uno se ponen en su ficha de RRHH (Datos personales), no
-- aqui: son datos personales y no van al repositorio. Los primeros (Abraham,
-- Daniel, Oscar y Alex) se pusieron directamente en produccion el 28-oct.

alter table public.equipo add column if not exists otros_correos text[] not null default '{}';
comment on column public.equipo.otros_correos is
  'Correos personales desde los que esta persona manda cosas (en minusculas). Solo para reconocer lo que llega (buzon del Polycam); NO sirven para entrar en la app.';

-- Lo que ya llego desde esos correos pasa a ser de quien es.
update public.escaneados_polycam e
   set visito_id = q.id
  from public.equipo q
 where e.visito_id is null
   and lower(e.remitente) = any (q.otros_correos);
