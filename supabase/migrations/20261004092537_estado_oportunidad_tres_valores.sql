-- =====================================================================
-- EL ESTADO DE LA OPORTUNIDAD, A TRES VALORES
-- Monica, 4-oct-2026.
--
-- Eran dos ('activa' / 'latente') y pasan a ser tres:
--   abierta  - por defecto, todas nacen asi
--   pausada  - a mano, en cualquier momento (ver historial_pausas_oportunidad)
--   cerrada  - a mano en cualquier momento, y ADEMAS sola al marcar el ultimo
--              hito ('cobro', el 90 de hitos_comerciales)
--
-- POR QUE NO SE DEDUCE SOLO DEL ULTIMO HITO, que era la idea de partida:
-- llegar a 'cobro' es GANAR. Pero PERDER pasa en cualquier hito -en la junta,
-- al enviar los documentos, o sin pasar de la primera visita-. Esa
-- oportunidad no llega nunca al ultimo hito, y con la regla "cerrada = ultimo
-- hito hecho" se quedaria 'abierta' para siempre. Por eso el cierre tiene que
-- poder saltar desde cualquier punto, y por eso la fecha y el motivo del
-- cierre viven en su propia tabla y no en los hitos
-- (ver 20261004092611_procesos_venta_pasa_a_motivo_cierre.sql).
--
-- Las 1.228 oportunidades estaban todas en 'activa' y pasan a 'abierta'.
-- Ninguna estaba en 'latente', pero la linea se deja por si acaso.
-- =====================================================================

alter table public.oportunidades drop constraint oportunidades_estado_check;

update public.oportunidades set estado = 'abierta' where estado = 'activa';
update public.oportunidades set estado = 'pausada' where estado = 'latente';

alter table public.oportunidades
  alter column estado set default 'abierta',
  add constraint oportunidades_estado_check
    check (estado in ('abierta', 'pausada', 'cerrada'));
