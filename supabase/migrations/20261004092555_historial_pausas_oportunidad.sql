-- =====================================================================
-- LAS PAUSAS SON UN HISTORIAL, NO UN CAMPO
-- Monica, 4-oct-2026, con un caso real:
--
--   "pausarla debe llevar el desde/hasta y conservar el historico. Para
--    saber: lleva abierta desde hace dos anos, pero es que estaban esperando
--    una subvencion que les llego el mes pasado y ahora por eso se reabre."
--
-- 'oportunidades' tenia tres huecos de uno solo para esto -reactivar_fecha,
-- reactivar_nota y reactivar_convocatoria_criterio, vacios los tres-. Con un
-- hueco de uno solo, la segunda pausa pisa la primera y se pierde justo lo que
-- se queria saber. Una fila por pausa: desde / hasta / motivo. 'hasta' vacio =
-- pausada ahora mismo, y de ahi sale el estado 'pausada' de la oportunidad.
--
-- LOS TRES TEJADOS. La razon es de ella y es de uso diario -"se usara
-- muchisimo"-: no es papeleo, es a quien se llama y como se le llama.
--
--   accesalia -> "llamame en tres meses". La alerta es MIA: hay que llamar si
--                o si, porque nadie lo va a hacer por nosotros.
--   cliente   -> es su decision y la pueden cambiar. Aqui SI se puede meter
--                presion, o mover alternativas para que decidan.
--   tercero   -> falta que salga una subvencion, que el banco les de la
--                financiacion, que acabe el juicio contra el del local... Aqui
--                NO se puede meter presion: no es que no quieran, es que NO
--                PUEDEN. Y al llamar para preguntar que tal, conviene tenerlo
--                delante.
--
-- El motivo va en TEXTO LIBRE a proposito: "de momento la hacemos sencilla".
-- Si al usarlo se ve que se repiten cuatro o cinco motivos, entonces se pasa a
-- catalogo y se podra filtrar -"dame todas las paradas esperando subvencion"
-- es, literalmente, una lista de llamadas para el comercial-.
--
-- Lo que se ve venir y aun no esta: la alerta. "Avisar en 3 meses", "avisar
-- cuando salgan las resoluciones de Rehabilita 2027". De momento la condicion
-- queda escrita; quien avisa, se monta despues.
-- =====================================================================

create table public.historial_pausas_oportunidad (
  id                     uuid        primary key default gen_random_uuid(),
  oportunidad_id         uuid        not null references public.oportunidades(id) on delete cascade,
  desde                  date        not null default current_date,
  hasta                  date,                 -- vacio = pausada ahora mismo
  motivo                 text,                 -- libre: por que se para
  condicion_reactivacion text,                 -- "cuando salgan las resoluciones de
                                               --  Rehabilita 2027", "dejar asi hasta
                                               --  que nos llamen ellos"
  pelota_en_tejado       text,                 -- de quien depende: ver arriba
  creado_en              timestamptz not null default now(),
  actualizado_en         timestamptz not null default now(),
  constraint pausa_tejado_valido check (
    pelota_en_tejado is null
    or pelota_en_tejado in ('accesalia', 'cliente', 'tercero')),
  constraint pausa_fechas_coherentes check (hasta is null or hasta >= desde)
);

-- Una oportunidad no puede estar pausada dos veces a la vez. Este indice es lo
-- que sostiene el estado: 'pausada' = tiene una pausa sin 'hasta'.
create unique index historial_pausas_una_abierta_por_opp
  on public.historial_pausas_oportunidad (oportunidad_id)
  where hasta is null;

create index historial_pausas_por_opp
  on public.historial_pausas_oportunidad (oportunidad_id, desde desc);

-- las que esperan algo mio: son las que hay que llamar si o si
create index historial_pausas_tejado_abierto
  on public.historial_pausas_oportunidad (pelota_en_tejado)
  where hasta is null;

create trigger trg_set_actualizado_en
  before update on public.historial_pausas_oportunidad
  for each row execute function public.set_actualizado_en();

comment on table public.historial_pausas_oportunidad is
  'Una fila por cada vez que la oportunidad se para. Conserva el historico: hace falta para saber que llevaba dos anos parada esperando una subvencion.';
