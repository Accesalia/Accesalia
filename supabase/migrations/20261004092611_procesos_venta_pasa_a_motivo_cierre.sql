-- =====================================================================
-- 'procesos_venta' PASA A LLAMARSE 'motivo_cierre_oportunidad'
-- Monica, 4-oct-2026. "Como siempre, los nombres de las tablas despistan
-- muchisimo; como estamos corrigiendo esto, los modificaria."
--
-- LA HISTORIA, porque hacia falta desenredarla antes de tocar nada:
--   18-jul: nace 'procesos_venta', el primer pipeline comercial. Su columna
--           'estado' llevaba los diez pasos de la venta, de 'registrado' a
--           'cobrado_50_cerrado'.
--   23-jul: nace 'hitos_oportunidad' + 'hitos_comerciales'
--           (20260723260000_pipeline_comercial.sql, cuya cabecera dice
--           "PIPELINE COMERCIAL, modelo propio, distinto del de proyecto").
--           Esa misma migracion recoloca juntas y modelos 3D para que
--           cuelguen de la oportunidad y hace 'proceso_venta_id' opcional.
--
-- Es decir: el modelo del 23 sustituyo al del 18, y nadie lo dijo en voz alta.
-- 'procesos_venta' se quedo con 0 filas y 0 referencias en todo el codigo del
-- frontend -comprobado-, y con ella se quedo huerfano lo UNICO que tenia y que
-- el modelo nuevo no tiene: 'resultado_final' (ganado/perdido) y
-- 'motivo_perdido'. Que es, exactamente, la explicacion de que paso al cerrar.
--
-- Asi que la tabla se queda con eso y se llama por lo que hace. Se le anade la
-- fecha de cierre, que vive AQUI y no en los hitos porque una oportunidad se
-- puede cerrar desde cualquier punto del camino: se pierde en la junta, o al
-- enviar los documentos, o sin pasar de la visita.
--
-- Lo que queda pendiente de mirar algun dia: 'tipo_servicio_id' y
-- 'comercial_id' tambien son del modelo viejo y en una tabla de motivos de
-- cierre pintan raro. No se tocan hoy porque no se ha hablado.
-- =====================================================================

alter table public.procesos_venta rename to motivo_cierre_oportunidad;

alter table public.motivo_cierre_oportunidad
  add column fecha_cierre date not null default current_date;

comment on table public.motivo_cierre_oportunidad is
  'Que paso al cerrar una oportunidad: ganada o perdida, por que, y cuando. Se puede cerrar desde cualquier hito, por eso la fecha de cierre vive aqui y no en los hitos.';
