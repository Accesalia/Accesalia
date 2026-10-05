-- =====================================================================
-- LA FECHA DE CIERRE PUEDE NO SABERSE (TODAVIA), Y LA TABLA-CLON
-- Monica, 4-oct-2026.
--
-- 1) EL CONFLICTO DE FECHAS, QUE LO VIO ELLA SOLA.
--    Al decidir que las carpetas viejas de Dropbox "nazcan cerradas" -mas
--    limpio que crearlas abiertas para cerrarlas acto seguido-, pregunto:
--    "eso no dara conflicto de fechas? misma fecha cerrada y abierta?".
--
--    Lo daba. Con 'fecha_cierre' obligatoria y por defecto hoy, una carpeta de
--    2016 quedaria "abierta en 2016, cerrada el 4-oct-2026": como si la
--    hubieramos tenido abierta diez anos esperando. Falso, y encima creible.
--
--    Asi que puede quedarse vacia. Pero vacia NO es un agujero, y esto es
--    suyo: "muchas veces lo vamos a saber, pero es un paso posterior: hay CFO,
--    o hay fecha de hoja de encargo, o fecha de visado. Hay muchos hilos del
--    que tirar, pero no me preocupa ahora". Es un hueco con nombre, para
--    rellenar en otra pasada tirando de esos documentos.
--
--    El default se queda puesto para los cierres de verdad, los que se hacen
--    desde la app: ahi la fecha es hoy y es cierta.
--
-- 2) EL FRENO. Que la fecha sea opcional no quita que, cuando este, tenga que
--    tener sentido: una oportunidad no se puede cerrar antes de abrirse. El
--    disparador lo impide, para que el disparate no vuelva por otra puerta.
--
-- 3) LA TABLA-CLON. La tabla temporal con las carpetas que no estaban en
--    Monday recibe las MISMAS columnas que habra que poner en produccion.
--    Ella: "la idea es anadir a la tabla temporal LO MISMO que haya que poner
--    en la de produccion, para que despues, una vez los datos esten limpios,
--    sea copiar y pegar sin problemas. Es una tabla-clon!".
-- =====================================================================

alter table public.motivo_cierre_oportunidad alter column fecha_cierre drop not null;

comment on column public.motivo_cierre_oportunidad.fecha_cierre is
  'Cuando se cerro. Vacia = no se sabe TODAVIA: se podra sacar del CFO, de la fecha de la hoja de encargo o de la del visado. Tipico de lo migrado de Dropbox.';

create or replace function public.cierre_no_antes_de_la_apertura() returns trigger
language plpgsql as $$
declare apertura date;
begin
  if new.fecha_cierre is null then return new; end if;
  select o.fecha_apertura into apertura from public.oportunidades o where o.id = new.oportunidad_id;
  if apertura is not null and new.fecha_cierre < apertura then
    raise exception 'la oportunidad se abrio el % y el cierre dice %: imposible',
      apertura, new.fecha_cierre;
  end if;
  return new;
end $$;

create trigger trg_cierre_no_antes_de_la_apertura
  before insert or update on public.motivo_cierre_oportunidad
  for each row execute function public.cierre_no_antes_de_la_apertura();

alter table public.comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una
  add column fecha_apertura date,
  add column estado         text,
  add column cierre_notas   text;

comment on column public.comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una.fecha_apertura is
  'Clon de oportunidades.fecha_apertura: la fecha que tendra la opp cuando se cree.';
comment on column public.comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una.estado is
  'Clon de oportunidades.estado. Las anteriores a 2023 nacen ya cerradas: mas limpio que crearlas abiertas para cerrarlas acto seguido.';
comment on column public.comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una.cierre_notas is
  'Clon de motivo_cierre_oportunidad.notas.';
