-- QUIEN VINCULO EL ESCANEADO, Y LAS FECHAS CON HORA
--
-- Dos cosas que Monica pidio justo despues de aplicar 20261002190000.
-- SIN APLICAR: la ejecuta ella.
--
-- ============================================================================
-- 1. LA HORA, NO SOLO EL DIA
-- ============================================================================
--
-- `fecha` nacio como `date` y ella lo corrigio, con el motivo:
--
--   "fecha es suficiente con date, pero en general si tenemos hora, lo prefiero.
--    Poder decir 'me llego a las 10:00 y a las 10:30 ya estaba hecho' es mejor. Y
--    ademas si luego queremos evaluar tiempos, recibir y hacer el mismo dia daria
--    0, resultados malos. Mejor con hora."
--
-- Tiene razon y el argumento es el de medir: con `date`, todo lo que entra y se
-- resuelve el mismo dia tarda "cero", y eso no es un tiempo, es un dato perdido.
--
-- La tabla esta vacia, asi que el cambio de tipo no toca ni una fila.

alter table escaneados_polycam
  alter column fecha type timestamptz using fecha::timestamptz;

comment on column escaneados_polycam.fecha is
$$La fecha y hora DEL ESCANEO, no la del correo: asi un reenvio no desvirtua las fechas
(Monica, 2-oct-2026). Vacia mientras no se pueda sacar del fichero.

Lleva hora a proposito. Con solo el dia, lo que entra y se resuelve en la misma jornada
tarda "cero" al medirlo, y eso no es un tiempo: es un dato perdido.$$;

-- ============================================================================
-- 2. QUIEN VINCULO Y CUANDO
-- ============================================================================
--
--   "identificar el creador de la relacion y la fecha es MUY util, añadamos eso a
--    la tabla de relacion. Sabemos quien es porque la app pide login: el logueado
--    deja su rastro. Y la fecha, la del momento."
--
-- Por que importa: esta relacion no la calcula nadie, LA DECIDE ALEX en la
-- pantalla de revision. Cuando un escaneado aparezca vinculado a tres portales,
-- la pregunta "¿quien dijo que cubria los tres?" tiene que tener respuesta, y hoy
-- no la tendria.
--
-- El `quien` apunta a `equipo` porque es a lo que resuelve el login: quienSoy()
-- devuelve la persona de `equipo` que tiene ese correo.
--
-- << LOS DOS NOMBRES SON PROPUESTA MIA, PENDIENTES DE SU OK >>
--    No los invento de cero: siguen la forma que ya usa la casa para "quien lo
--    hizo y cuando" -ficha_catastro.ascensor_visto_por / ascensor_visto_en,
--    iee_registrado.asignada_por / asignada_en-. Si los quiere de otra manera, se
--    cambian antes de ejecutar.

alter table relacion_polycam_acceso
  add column if not exists vinculado_por uuid references equipo(id) on delete set null,
  add column if not exists vinculado_en  timestamptz not null default now();

comment on column relacion_polycam_acceso.vinculado_por is
$$Quien dijo que este escaneado es de este acceso. Lo pone el login: es la persona de
`equipo` que estaba dentro cuando lo marco en la pantalla de revision polycam.

Vacio solo en dos casos: si la fila la creo un proceso y no una persona, o si esa persona
se borro del equipo (on delete set null, para no perder la relacion por eso).

Importa porque esta relacion NO se calcula: se decide. Cuando un escaneado cubra tres
portales, "quien dijo que cubria los tres" tiene que tener respuesta.$$;

comment on column relacion_polycam_acceso.vinculado_en is
$$Cuando se vinculo, con hora. Junto con escaneados_polycam.creado_en da el tiempo que un
escaneado estuvo esperando a que alguien lo revisara, que es la medida que Monica quiere
para las alertas de Alex: "hace 6 dias que tienes un escaneado esperando".$$;

-- Lo que debe salir: las cuatro columnas, con sus tipos.

select table_name, column_name, data_type, is_nullable
  from information_schema.columns
 where table_schema = 'public'
   and ((table_name = 'escaneados_polycam' and column_name in ('fecha', 'creado_en'))
     or (table_name = 'relacion_polycam_acceso' and column_name in ('vinculado_por', 'vinculado_en')))
 order by table_name, column_name;
