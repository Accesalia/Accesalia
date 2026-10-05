-- =====================================================================
-- LA FECHA DE APERTURA: EL DATO DE NEGOCIO, SEPARADO DEL DE AUDITORIA
-- Monica, 4-oct-2026.
--
-- Hasta hoy 'oportunidades' solo tenia 'creado_en', que dice cuando entro la
-- FILA en la app, no cuando se abrio el encargo. Las 1.228 de julio dicen
-- todas 1-oct-2026, que es cuando se importaron.
--
-- Al migrar las carpetas antiguas de Dropbox hace falta escribir la fecha de
-- verdad: hay encargos de 2019. El plan de partida era escribirla encima de
-- 'creado_en' -quitando el default, migrando, y volviendo a ponerlo-. Dos
-- razones para no hacerlo asi:
--
--   1. No hace falta tocar el default. Un default solo actua cuando NO mandas
--      el valor; si el INSERT trae la fecha, 'now()' ni se entera. Y quitarlo
--      durante la migracion abre una ventana en la que una oportunidad creada
--      desde la app entraria sin fecha.
--   2. Pisar 'creado_en' tiene un coste concreto: se pierde el poder preguntar
--      "que filas metí hoy", que es justo lo que hace falta mientras se migra
--      por tandas y se va comprobando lo que entro.
--
-- Asi que el dato de negocio tiene su propia columna -que es lo que ella misma
-- habia pedido: "podemos dejarla puesta como fecha de apertura de opp"- y
-- 'creado_en' sigue siendo auditoria.
--
-- OJO AL ORDEN DE LAS DOS SENTENCIAS, no es casual: en Postgres un
-- 'add column' CON default rellena tambien las filas que ya existen. De una
-- sola vez, las 1.228 de julio quedarian con fecha de apertura 4-oct-2026, que
-- es mentira y encima creible. Primero se anade VACIA -las de julio se quedan
-- en null, que es la verdad: no sabemos cuando se abrieron- y despues se le
-- pone el default, que solo afecta a las que vengan.
-- =====================================================================

alter table public.oportunidades add column fecha_apertura date;
alter table public.oportunidades alter column fecha_apertura set default current_date;

comment on column public.oportunidades.fecha_apertura is
  'Cuando se abrio el encargo de verdad (dato de negocio). Vacia = no se sabe todavia. No confundir con creado_en, que es cuando entro la fila en la app.';

-- Y el estorbo para poder cerrar las migradas: 'tipo_servicio_id' era
-- obligatorio en el pipeline viejo (18-jul). Un cierre "migrada de Dropbox" no
-- tiene tipo de servicio, y obligar a poner uno seria inventar un dato.
alter table public.motivo_cierre_oportunidad alter column tipo_servicio_id drop not null;
