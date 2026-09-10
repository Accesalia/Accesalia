-- =============================================================================
-- ERP Accesalia — Personas de contrata y su historia laboral
--
-- SOLO ESTRUCTURA. Aqui no se mueve ni un dato: `contrata_contactos` se queda
-- intacta con sus 116 filas. La carga se hace despues, aparte y revisada.
--
-- POR QUE TRES TABLAS Y NO UNA (conversacion del 10-sep-2026)
--
-- `contrata_contactos` mezclaba tres cosas distintas en una sola fila: quien es
-- la persona, en que empresa esta, y de que. Se ve en cuanto alguien se mueve:
--
--   "alguien puede ser tecnico hoy, mañana comercial, pasado jefe de obra...
--    la gente se mueve dentro de su empresa. Y tambien se mueve entre empresas."
--
-- Y la frase que ordeno todo lo demas: EL PUESTO LO EJERCE UNA PERSONA. La
-- persona persiste; el puesto no. Por eso el puesto tiene fechas y la persona no.
--
-- Los propios datos ya lo estaban pidiendo: existe oswaldo.garcia@fainascensores
-- y oswaldo.garcia@schindler, la misma persona partida en dos fichas que no se
-- conocen entre si.
--
-- LO QUE NO SE HACE, Y POR QUE
--
-- * NO hay catalogo de funciones (comercial / directivo / jefe de obra...). Se
--   propuso y se descarto: "cada empresa se organiza a su manera, con sus
--   barreras entre puestos. Tipificarlo obliga a crear una excepcion para casi
--   cada persona". Los datos le daban la razon: en el `TIPO` de Monday hay 7
--   personas cuyo tipo es "EX TRABAJADOR", que no es una funcion. El cajon no
--   daba y se uso para otra cosa. Asi que `cargo` es TEXTO LIBRE, tal y como lo
--   llame cada empresa.
--
-- * NO hay campo `activo`. Lo dice `hasta`: vacio = sigue ahi. Un dato menos
--   que mantener a mano y que se pueda contradecir.
--
-- * NO se mezcla con `persona` / `puesto`, que son el mundo de las
--   administraciones de fincas. Decision expresa: nadie salta de administrador
--   de fincas a contratista, no hay migracion de personas entre los dos mundos.
--   Se copia la forma, que es buena, en tablas propias.
--
-- DONDE VIVE CADA DATO DE CONTACTO
--
-- No hace falta un campo que diga de que tipo es un correo: lo dice el sitio
-- donde vive. Los tres casos existen en los datos (8 / 84 / 12):
--
--   contratas                 -> la centralita y el buzon generico (info@,
--                                presupuestos@). Salen repetidos en varias
--                                fichas justamente porque no son de nadie.
--   contrata_personas         -> su movil y su correo propio, los que se lleva.
--   contrata_puestos_persona  -> el fijo directo o la extension, y el correo
--                                corporativo con su nombre, que se apaga el dia
--                                que se va.
--
-- Efecto buscado: al abrir una obra de 2022 y leer "lo llevaba David Camara, de
-- FAIN", ahi sigue el correo de FAIN con el que se hablaba entonces. El
-- historico no se falsea al actualizar la ficha de hoy.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. La persona
--
--    Sin `unique` en el nombre a proposito: hay nombres repetidos de verdad.
--    Tres Jose Luis (Elecnor, MP Ascensores, Roen) y tres Javier solo en
--    Schindler (Gonzalez Moya, Parra, Rodriguez Martin).
--
--    APELLIDOS EN CAMPO PROPIO. Sin el, la gente mete el dato a la fuerza donde
--    puede: hoy hay un contacto guardado como "JAVIER PARRA (SCHINDLER)" y otro
--    como "ANDRES (AGLSYP)", con la empresa escrita dentro del nombre. Ademas
--    permite ordenar y buscar por apellido, y sobre todo avisar en el alta de
--    que "ya existe un Javier Gonzalez Moya en Schindler, ¿es el mismo?", que
--    es la defensa contra los duplicados.
--
--    Nullable: no siempre se sabra, y un apellido inventado es peor que vacio.
--    Los 116 contactos de Monday traen el nombre entero en un solo campo y NO
--    se parten por algoritmo: "MIGUEL ANGEL VENTAJA GOMEZ" no se puede dividir
--    sin adivinar. Esa particion se revisa a mano en la fase de datos.
-- ---------------------------------------------------------------------------
create table if not exists contrata_personas (
  id             uuid        primary key default gen_random_uuid(),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  nombre         text        not null,
  apellidos      text,
  telefono       text,
  email          text,
  notas          text
);

comment on table contrata_personas is 'Una persona que trabaja o ha trabajado en alguna empresa contratista. Solo lo que NO cambia al mudarse de empresa. Nada que ver con `persona`, que es el mundo de las administraciones de fincas: son dos mundos separados a proposito.';
comment on column contrata_personas.nombre is 'Solo el nombre de pila cuando se sepa separar. Los que vienen de Monday traen el nombre completo aqui hasta que se revise a mano.';
comment on column contrata_personas.apellidos is 'En campo propio para poder ordenar y buscar por apellido, y para avisar de posibles duplicados en el alta. Vacio antes que inventado.';
comment on column contrata_personas.telefono is 'Su movil, el que se lleva consigo. El fijo de la empresa va en el puesto; la centralita, en la contrata.';
comment on column contrata_personas.email is 'Su correo propio (gmail, hotmail...), el que sobrevive al cambio de empresa. El corporativo va en el puesto.';

-- ---------------------------------------------------------------------------
-- 2. El puesto que esa persona ejerce en esa contrata, y cuando
-- ---------------------------------------------------------------------------
create table if not exists contrata_puestos_persona (
  id             uuid        primary key default gen_random_uuid(),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  persona_id     uuid        not null references contrata_personas (id) on delete cascade,
  contrata_id    uuid        not null references contratas (id),

  cargo          text,
  telefono       text,
  email          text,

  desde          date,
  hasta          date,
  notas          text,

  constraint contrata_puesto_fechas_ck check (hasta is null or desde is null or hasta >= desde)
);

comment on table contrata_puestos_persona is 'La historia laboral de una persona de contrata TAL COMO LA VEMOS NOSOTROS: las etapas que nos constan a traves del trabajo, no su CV. Si estuvo tres años en una empresa con la que nunca trabajamos, ese hueco no esta y no es un error. Una fila por etapa: comercial en FAIN de junio a septiembre, jefe de obra en Orona de octubre a diciembre.';
comment on column contrata_puestos_persona.cargo is 'El titulo literal que le da su empresa ("Responsable de Oficina Tecnica Delegacion Mantenimiento I"). Texto libre y sin catalogo por decision expresa: cada contrata se organiza a su manera y tipificarlo obligaria a una excepcion por persona.';
comment on column contrata_puestos_persona.telefono is 'El fijo directo o la extension. El movil personal va en la persona.';
comment on column contrata_puestos_persona.email is 'El corporativo con su nombre, que se apaga cuando se va. El personal va en la persona; el generico de la empresa, en la contrata.';
comment on column contrata_puestos_persona.hasta is 'Vacio = sigue ahi. Sustituye a un campo `activo`, que habria que mantener a mano y podria contradecir a las fechas.';
comment on column contrata_puestos_persona.desde is 'Puede estar vacio: de los contactos que vienen de Monday no consta ninguna fecha. El hueco se rellena con el uso.';

create index if not exists idx_contrata_puestos_persona  on contrata_puestos_persona (persona_id);
create index if not exists idx_contrata_puestos_contrata on contrata_puestos_persona (contrata_id);
create index if not exists idx_contrata_puestos_vigentes on contrata_puestos_persona (contrata_id) where hasta is null;

-- ---------------------------------------------------------------------------
-- 3. Trigger, RLS y permisos, segun convencion del proyecto
-- ---------------------------------------------------------------------------
drop trigger if exists trg_set_actualizado_en on contrata_personas;
create trigger trg_set_actualizado_en before update on contrata_personas
  for each row execute function set_actualizado_en();

drop trigger if exists trg_set_actualizado_en on contrata_puestos_persona;
create trigger trg_set_actualizado_en before update on contrata_puestos_persona
  for each row execute function set_actualizado_en();

alter table contrata_personas        enable row level security;
alter table contrata_puestos_persona enable row level security;

grant all privileges on table contrata_personas        to service_role;
grant all privileges on table contrata_puestos_persona to service_role;
