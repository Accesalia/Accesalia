-- =============================================================================
-- ERP Accesalia — Area de RRHH: la estructura, SIN DATOS
--
-- Decidido con Monica el 11-sep-2026, repasando la pantalla /equipo de julio y
-- su carpeta de RRHH (G:\Mi unidad\MONICA ACCESALIA\RECURSOS HUMANOS - RR HH).
-- La pantalla de julio era una lista de tarjetas "que no aporta: ya conozco a
-- los empleados". Lo que se hace de verdad es gestion: contratos, nominas,
-- vacaciones, bajas. Eso vive hoy en carpetas y correos.
--
-- LO IMPRESCINDIBLE, en palabras suyas: "solo con no enviar nominas y que las
-- vacaciones se puedan gestionar a traves de la app es suficiente. Si ademas
-- puede archivar la doc tipo dni, numero de cuenta y contrato, cubre las
-- necesidades de verdad del dia a dia actual". El fichaje se queda fuera: ya
-- lo lleva su propia app.
--
-- UNA SOLA LISTA DE PERSONAS. Todo cuelga de `equipo`, la misma persona a la
-- que apuntan los proyectos, el login y los perfiles. Lo sensible va en tablas
-- propias con prefijo `rrhh_`, para que al listar las tablas se vea de un
-- vistazo que mundo es y para poder cerrarlo entero de una vez.
--
-- QUIEN VE QUE (se aplicara con el login, que es el siguiente paso). Por
-- FUNCION, nunca por nombre de persona (Monica, 11-sep): "por si cambiamos de
-- personal, o si se dividen funciones". Si mañana una persona lleva RRHH y
-- otra la asignacion de trabajo, se reparten las funciones y nada mas cambia.
--   - cada empleado: lo suyo, mas los documentos para todos (convenio,
--     calendario);
--   - funcion RRHH: todo; aprueba las vacaciones;
--   - funcion asignacion y control de produccion: que alguien no esta y
--     cuando, sin el motivo;
--   - funcion direccion: todo, siempre ("modo dios"). Fija el marco: cierres
--     obligatorios de cada año y excepciones;
--   - los demas: el directorio y los cierres de oficina. Nunca el motivo de una
--     ausencia: una baja medica es un dato de salud.
-- Hoy RRHH, facturacion y asignacion las lleva Alexandra, y direccion son
-- Daniel y Monica; eso vive en equipo_funciones, no aqui.
--
-- Por ahora, como el resto de tablas: RLS activa y sin politicas, de modo que
-- solo el servidor (clave secreta) las lee. Las politicas llegan con el login.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 0. La persona: lo que falta en `equipo` para ser la identidad de cada uno
-- ---------------------------------------------------------------------------
alter table equipo
  add column if not exists apellidos text,
  add column if not exists email     text;

comment on column equipo.apellidos is 'No siempre se tendra, pero si se tiene, mejor. Distingue a dos personas con el mismo nombre.';
comment on column equipo.email is 'Correo nominativo de Accesalia. Es el que se usara para entrar en la app. Salvo los comerciales, siguen el patron inicialapellido.accesalia@gmail.com.';

create unique index if not exists uq_equipo_email on equipo (lower(email)) where email is not null;

-- ---------------------------------------------------------------------------
-- 1. Datos personales: una fila por persona
-- ---------------------------------------------------------------------------
-- Aparte de `equipo` porque son sensibles y los ve poca gente. Se guardan los
-- tres: el DNI y la direccion para las comunicaciones (burofax en un despido),
-- y la cuenta porque las nominas las transfiere Accesalia, no la gestoria.
create table if not exists rrhh_datos_personales (
  persona_id         uuid        primary key references equipo (id) on delete cascade,
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  dni                text,
  direccion          text,
  iban               text,
  notas              text
);

comment on table rrhh_datos_personales is 'DNI, direccion y cuenta de cada empleado. Solo los ven el propio empleado y quien tenga la funcion RRHH o la de direccion.';
comment on column rrhh_datos_personales.iban is 'Cuenta donde se transfiere la nomina: la transfiere Accesalia, no la gestoria.';

-- ---------------------------------------------------------------------------
-- 2. Contratos: la historia laboral
-- ---------------------------------------------------------------------------
-- Una fila por contrato o novacion, con fechas. Asi quien se va y vuelve, o
-- cambia de jornada, conserva su historia, igual que un puesto de contrata.
create table if not exists rrhh_contratos (
  id                 uuid        primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  persona_id         uuid        not null references equipo (id) on delete cascade,
  tipo               text,
  categoria          text,
  horas_semana       numeric(4,1),
  desde              date        not null,
  hasta              date,
  motivo_fin         text,
  notas              text,

  constraint rrhh_contratos_fechas_ck check (hasta is null or hasta >= desde)
);

comment on table rrhh_contratos is 'Historia laboral: una fila por contrato o novacion. Sin fecha de fin = vigente.';
comment on column rrhh_contratos.tipo is 'Texto libre (indefinido, temporal, practicas...): el vocabulario es de la ley y de la gestoria, no nuestro.';
comment on column rrhh_contratos.categoria is 'Categoria profesional segun el convenio de ingenierias.';

create index if not exists idx_rrhh_contratos_persona on rrhh_contratos (persona_id, desde desc);

-- ---------------------------------------------------------------------------
-- 3. Horarios: lo que cada uno tiene que cumplir
-- ---------------------------------------------------------------------------
-- Como en "HORARIO 2026.xlsx": un tipo de jornada y el horario de cada dia. Va
-- aparte del contrato porque cambia mas a menudo (circular de ajuste horario,
-- acuerdos de conciliacion).
create table if not exists rrhh_horarios (
  id                 uuid        primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  persona_id         uuid        not null references equipo (id) on delete cascade,
  tipo_jornada       text,
  lunes              text,
  martes             text,
  miercoles          text,
  jueves             text,
  viernes            text,
  tiempo_comida      text,
  horas_semana       numeric(4,1),
  desde              date        not null,
  hasta              date,
  motivo             text,
  notas              text,

  constraint rrhh_horarios_fechas_ck check (hasta is null or hasta >= desde)
);

comment on table rrhh_horarios is 'Horario que tiene que cumplir cada empleado, con fechas. Sin fecha de fin = vigente.';
comment on column rrhh_horarios.lunes is 'Tal como se escribe en el Excel de horarios: "8:30 - 18:00". Igual el resto de dias.';
comment on column rrhh_horarios.motivo is 'Por que tiene este horario si no es el normal: acuerdo de conciliacion, jornada reducida...';

create index if not exists idx_rrhh_horarios_persona on rrhh_horarios (persona_id, desde desc);

-- ---------------------------------------------------------------------------
-- 4. Ausencias: todo lo que es "no esta"
-- ---------------------------------------------------------------------------
-- Una sola tabla para vacaciones, permisos y bajas, a proposito: para asignar
-- trabajo da igual por que no esta alguien, lo que importa es que no esta.
-- Aporte de Monica: al asignar trabajo se tendran en cuenta, cosa que hoy se
-- hace de cabeza.
--
-- Sustituye al Excel de colores (solicitadas, disfrutadas, a cuenta del año
-- anterior, permiso retribuido). "Disfrutada" no es un estado: es una
-- aprobada cuya fecha ya paso.
create table if not exists rrhh_ausencias (
  id                 uuid        primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  persona_id         uuid        not null references equipo (id) on delete cascade,
  tipo               text        not null,
  desde              date        not null,
  hasta              date        not null,
  dias               numeric(4,1),
  estado             text        not null default 'solicitada',
  a_cuenta_de        integer,

  resuelta_por       uuid        references equipo (id),
  resuelta_en        timestamptz,
  motivo_rechazo     text,
  notas              text,

  constraint rrhh_ausencias_tipo_ck   check (tipo in ('vacaciones','permiso_retribuido','baja_medica','ausencia_justificada','otra')),
  constraint rrhh_ausencias_estado_ck check (estado in ('solicitada','aprobada','rechazada','anulada')),
  constraint rrhh_ausencias_fechas_ck check (hasta >= desde)
);

comment on table rrhh_ausencias is 'Vacaciones, permisos y bajas de cada empleado. Quien asigna trabajo ve que alguien no esta y cuando, nunca el motivo. Las vacaciones las pide el empleado desde la app; llegan a quien tenga la funcion RRHH y a direccion, y las aprueba RRHH.';
comment on column rrhh_ausencias.dias is 'Dias laborables que consume, calculados al pedirla (sin fines de semana, festivos ni cierres). Se guarda porque es lo que se descuenta del saldo.';
comment on column rrhh_ausencias.estado is 'solicitada -> aprobada o rechazada; anulada si se retira. Una baja o un permiso que registra RRHH entra directamente como aprobada.';
comment on column rrhh_ausencias.a_cuenta_de is 'Año de vacaciones del que se descuenta. Normalmente el de la fecha; el anterior si son dias que se arrastran.';

create index if not exists idx_rrhh_ausencias_persona on rrhh_ausencias (persona_id, desde desc);
create index if not exists idx_rrhh_ausencias_fechas  on rrhh_ausencias (desde, hasta) where estado = 'aprobada';
create index if not exists idx_rrhh_ausencias_pendientes on rrhh_ausencias (creado_en) where estado = 'solicitada';

-- ---------------------------------------------------------------------------
-- 5. Saldo de vacaciones: lo que le toca a cada uno cada año
-- ---------------------------------------------------------------------------
-- Solo el derecho. Lo consumido y lo pendiente se calculan de las ausencias y
-- de los cierres obligatorios: guardarlo seria tener dos versiones de lo mismo.
create table if not exists rrhh_saldo_vacaciones (
  id                 uuid        primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  persona_id         uuid        not null references equipo (id) on delete cascade,
  anio               integer     not null,
  dias_derecho       numeric(4,1) not null,
  dias_arrastrados   numeric(4,1) not null default 0,
  notas              text,

  constraint rrhh_saldo_uq unique (persona_id, anio)
);

comment on table rrhh_saldo_vacaciones is 'Dias de vacaciones que corresponden a cada empleado cada año (22 laborables segun convenio en 2025, proporcional si entra a mitad de año) y los que arrastra del anterior. Lo consumido NO se guarda: sale de rrhh_ausencias y rrhh_calendario.';

-- ---------------------------------------------------------------------------
-- 6. Calendario de la empresa: el marco que fija direccion cada año
-- ---------------------------------------------------------------------------
-- Festivos, cierres obligatorios (agosto, puentes) y turnos (Semana Santa o
-- mayo, primera o segunda de Navidad). Un cierre obligatorio descuenta
-- vacaciones a todos; un turno es una opcion, y quien la elige la pide como
-- ausencia.
create table if not exists rrhh_calendario (
  id                 uuid        primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  fecha              date        not null,
  tipo               text        not null,
  descripcion        text,

  constraint rrhh_calendario_tipo_ck check (tipo in ('festivo','cierre_obligatorio','turno'))
);

comment on table rrhh_calendario is 'Calendario comun: festivos, cierres obligatorios de la oficina (descuentan vacaciones a todos) y turnos a elegir. Lo fija direccion cada año; lo ven todos.';

create index if not exists idx_rrhh_calendario_fecha on rrhh_calendario (fecha);

-- ---------------------------------------------------------------------------
-- 7. Documentos: el archivo
-- ---------------------------------------------------------------------------
-- Una sola tabla. Los de una persona (nomina, contrato, DNI, titulacion, IRPF,
-- justificante) solo los ven esa persona, RRHH y direccion. Los que no llevan persona
-- (convenio, calendario, normativa horaria) son para toda la plantilla.
--
-- Las nominas llegaran asi: RRHH sube el PDF mensual de la gestoria, la app
-- lo trocea y deja cada una en la ficha de su dueño. Es lo que hoy se hace a
-- mano con iLovePDF y el script renombrar_pdfs.py, y luego un correo a cada
-- uno.
create table if not exists rrhh_documentos (
  id                 uuid        primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  persona_id         uuid        references equipo (id) on delete cascade,
  tipo               text        not null,
  periodo            date,
  titulo             text,
  fichero            text        not null,
  subido_por         uuid        references equipo (id),
  notas              text,

  constraint rrhh_documentos_tipo_ck check (tipo in (
    'nomina','contrato','novacion','dni','titulacion','irpf','justificante',
    'reconocimiento_medico','convenio','calendario','normativa','otro')),
  -- Los de toda la plantilla no llevan persona; los personales, si.
  constraint rrhh_documentos_ambito_ck check (
    (tipo in ('convenio','calendario','normativa') and persona_id is null)
    or (tipo in ('nomina','contrato','novacion','dni','titulacion','irpf','justificante','reconocimiento_medico') and persona_id is not null)
    or tipo = 'otro'
  ),
  constraint rrhh_documentos_nomina_ck check (tipo <> 'nomina' or periodo is not null)
);

comment on table rrhh_documentos is 'Archivo de RRHH. Con persona: solo esa persona y quien tenga la funcion RRHH o la de direccion. Sin persona: toda la plantilla.';
comment on column rrhh_documentos.periodo is 'Mes al que corresponde (dia 1). Obligatorio en las nominas.';
comment on column rrhh_documentos.fichero is 'Ruta del fichero en el almacen (Storage), en un espacio privado.';

create index if not exists idx_rrhh_documentos_persona on rrhh_documentos (persona_id, tipo, periodo desc) where persona_id is not null;
create unique index if not exists uq_rrhh_documentos_nomina on rrhh_documentos (persona_id, periodo) where tipo = 'nomina';

-- ---------------------------------------------------------------------------
-- 8. Trigger, RLS y permisos
-- ---------------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array['rrhh_datos_personales','rrhh_contratos','rrhh_horarios','rrhh_ausencias',
                           'rrhh_saldo_vacaciones','rrhh_calendario','rrhh_documentos'] loop
    execute format('drop trigger if exists trg_set_actualizado_en on %I', t);
    execute format('create trigger trg_set_actualizado_en before update on %I for each row execute function set_actualizado_en()', t);
    execute format('alter table %I enable row level security', t);
    execute format('grant all privileges on table %I to service_role', t);
  end loop;
end $$;
