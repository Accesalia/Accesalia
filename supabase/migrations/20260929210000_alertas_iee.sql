-- ============================================================================
-- CANAL DE CAPTACION: ALERTAS IEE (Monica, 29-sep-2026)
--
-- LA IDEA ES SUYA Y ES LA MEJOR DEL DIA, contada con sus palabras:
--
--   "IEE desfavorables de menos de 6 meses emitidas = gente que NECESITA un
--    arquitecto. Con mas de 6 meses ya se lo habran buscado, porque el
--    ayuntamiento da un plazo de 6 meses para resolver."
--
-- El Registro de Informes de Evaluacion de Edificios de la Comunidad de Madrid
-- (rieecm.es) es publico y no pide certificado. Y lo decisivo: LOS CODIGOS SON
-- CORRELATIVOS. El ultimo emitido el 29-09-2026 era el 00033558. Asi que no hay
-- que barrer calle por calle: se tantea hacia delante desde el ultimo conocido.
--
-- SOLO HACIA DELANTE, y es decision suya: "me da igual las IEE de 2021, me
-- interesan las de mañana, que son las que no tienen arquitecto". El ritmo real
-- son unas 6 a la semana en toda la Comunidad -"6 a la semana no es NADA"-, lo
-- que convierte esto de gigante en perfectamente accesible.
--
-- EL CIRCUITO: el barrido encuentra una desfavorable -> se avisa a la
-- administrativa comercial -> ella la reparte a un comercial -> el comercial
-- abre la oportunidad. Por eso el estado y el reparto viven en la misma fila:
-- la alerta ES el informe, no un objeto aparte.
--
-- LA TRAMPA DEL SERVICIO, para que no se pierda: la nota informativa declara
-- charset UTF-8 en la cabecera y EN REALIDAD VIENE EN ISO-8859-1. Si se lee
-- como dice que es, todos los acentos salen rotos.
-- ============================================================================

-- ------------------------------------------------------- EL INFORME Y SU VIDA
--
-- Una fila por IEE registrado. La parte de arriba es lo que dice el registro
-- -dato ajeno, no se toca-; la de abajo es lo que hacemos nosotros con el.
create table if not exists iee_registrado (
  id                       uuid primary key default gen_random_uuid(),
  creado_en                timestamptz not null default now(),
  actualizado_en           timestamptz not null default now(),

  -- ---- lo que dice el registro ----
  -- `codigo` es el numero de registro, y es CORRELATIVO: de ahi sale el barrido.
  codigo                   text not null,
  -- La nota informativa da la REFERENCIA CATASTRAL, que es lo que resuelve el
  -- cruce: no hay que casar direcciones a mano.
  referencia               text,
  referencia_parcela       text,
  direccion                text,
  municipio                text,
  cp                       text,
  anio_construccion        integer,
  anio_rehabilitacion      integer,
  -- OJO, SON DOS FECHAS DISTINTAS Y NO COINCIDEN: `fecha_emision` es cuando lo
  -- firmo el tecnico -se han visto informes de 2023 registrados este mes- y
  -- `visto_en` es cuando aparecio en el registro, que es lo que nos avisa.
  fecha_emision            date,
  valoracion               text,
  deficiencias_subsanadas  text,
  fecha_subsanacion        date,
  accesibilidad_satisface  boolean,
  accesibilidad_ajustes    boolean,
  calificacion_energetica  text,
  estado_expediente        text,
  validez                  text,
  -- La nota entera. Si mañana leemos un campo mas, no hay que volver a pedirla.
  bruto                    jsonb,
  consultado_en            timestamptz not null default now(),

  -- ---- lo nuestro ----
  visto_en                 timestamptz not null default now(),
  estado                   text not null default 'nueva',
  asignada_a               uuid references equipo(id) on delete set null,
  asignada_en              timestamptz,
  asignada_por             uuid references equipo(id) on delete set null,
  oportunidad_id           uuid references oportunidades(id) on delete set null,
  motivo_descarte          text,
  notas                    text,

  constraint iee_registrado_codigo_unico unique (codigo),
  constraint iee_registrado_estado_check check (estado = any (array[
    'nueva'::text,        -- desfavorable recien aparecida, sin repartir
    'asignada'::text,     -- la administrativa se la dio a un comercial
    'oportunidad'::text,  -- el comercial abrio la oportunidad
    'descartada'::text,   -- se miro y no vale: el porque se guarda
    'sin_interes'::text]) -- favorable: se guarda, pero no es una alerta
  )
);

create index if not exists iee_registrado_parcela_idx on iee_registrado (referencia_parcela);
create index if not exists iee_registrado_estado_idx  on iee_registrado (estado, valoracion);
create index if not exists iee_registrado_emision_idx on iee_registrado (fecha_emision desc);

comment on table iee_registrado is
  'Informes de Evaluacion de Edificios del registro de la Comunidad de Madrid, capturados hacia delante. Las desfavorables son el canal de captacion.';
comment on column iee_registrado.codigo is
  'Numero de registro, correlativo. El barrido tantea hacia delante desde el mayor conocido.';
comment on column iee_registrado.referencia_parcela is
  'Los 14 primeros de la referencia catastral: la clave de cruce con ficha_catastro y con comunidades.';
comment on column iee_registrado.fecha_emision is
  'Cuando lo firmo el tecnico. NO es cuando aparecio en el registro: para eso esta visto_en.';
comment on column iee_registrado.estado is
  'sin_interes es una favorable, que se guarda pero no se reparte. El resto es el circuito de la alerta.';

-- --------------------------------------------------------- EL DIARIO DEL BARRIDO
--
-- Una fila por pasada. Sirve de dos cosas a la vez: de registro de lo que hizo
-- y de marca de por donde iba, porque el proximo barrido arranca en el mayor
-- `ultimo_codigo` guardado. Si un dia falla, se ve cuando y donde se quedo.
create table if not exists barrido_iee (
  id             uuid primary key default gen_random_uuid(),
  creado_en      timestamptz not null default now(),
  desde_codigo   integer not null,
  ultimo_codigo  integer not null,
  encontrados    integer not null default 0,
  desfavorables  integer not null default 0,
  huecos         integer not null default 0,
  segundos       numeric(10,2),
  fallo          text,
  nota           text
);
create index if not exists barrido_iee_creado_idx on barrido_iee (creado_en desc);

comment on table barrido_iee is
  'Una fila por pasada del barrido del registro de IEE. El proximo arranca en max(ultimo_codigo).';
comment on column barrido_iee.huecos is
  'Codigos tanteados que no existen. El barrido para cuando encadena varios: es el final de lo publicado.';

-- ------------------------------------------- DE DONDE NOS LLEGO: UN CANAL MAS
--
-- `canal_captacion` ya existia y es el catalogo de "nos llego a traves de". Las
-- familias eran nos_lo_dijeron / lo_vio / se_lo_contamos, y ninguna vale aqui:
-- esto no nos lo dijo nadie ni lo vio nadie, LO FUIMOS A BUSCAR. Familia nueva.
alter table canal_captacion drop constraint if exists canal_familia_check;
alter table canal_captacion add constraint canal_familia_check
  check (familia is null or familia = any (array[
    'nos_lo_dijeron'::text,
    'lo_vio'::text,
    'se_lo_contamos'::text,
    'lo_buscamos'::text]));

insert into canal_captacion (codigo, nombre, descripcion, familia, aplica, orden)
values (
  'alerta_iee',
  'Alerta de IEE desfavorable',
  'Salio en el registro de IEE de la Comunidad de Madrid con valoracion desfavorable y lo vimos nosotros.',
  'lo_buscamos',
  'oportunidad',
  10)
on conflict (codigo) do nothing;
