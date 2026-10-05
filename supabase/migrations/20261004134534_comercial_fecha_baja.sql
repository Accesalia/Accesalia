-- =====================================================================
-- LA BAJA DE UN COMERCIAL
-- Monica, 4-oct-2026.
--
-- 'comerciales' tenia 'fecha_alta' y 'activo', pero no CUANDO se fue. Y hace
-- falta, porque las fechas de alta y baja no son papeleo: son una RED que valida
-- datos. "Carlos trabajo en Accesalia de abril 2025 a enero 2026, ya termino la
-- relacion con nosotros". Con eso, una ficha que lo nombre tiene que ser de esa
-- ventana, y seis fichas se validaron solas con ella.
--
-- Sin este campo, esa ventana vivia en su cabeza y en una conversacion.
--
-- Queda pendiente, y es decision suya: dar de baja a un comercial EXIGE asignar
-- su cartera a otro -una a una, en bloque, o por grupo con nexo comun, por
-- ejemplo el mismo administrador-. Hoy no hay nada que lo obligue ni que lo
-- facilite, y el selector de cartera filtra por 'activo', asi que al irse
-- alguien su cartera desaparece de la pantalla con todo lo que llevaba dentro.
-- =====================================================================

alter table public.comerciales add column fecha_baja date;

comment on column public.comerciales.fecha_baja is
  'Cuando dejo de trabajar con nosotros. Vacia = sigue. Con fecha_alta forma la ventana en la que sus fichas y oportunidades son posibles: sirve para validar, no solo para informar.';

update public.comerciales
   set fecha_baja = '2026-01-31', fecha_alta = coalesce(fecha_alta, '2025-04-01')
 where nombre = 'Carlosg';

update public.comerciales
   set fecha_alta = coalesce(fecha_alta, '2026-01-01')
 where nombre = 'Alvaro';
