-- =============================================================================
-- ERP Accesalia — Modulo LICITACION / gestion de 3 presupuestos
--
-- Cubre conseguir contratas que presupuesten una obra ya proyectada, homogeneizar
-- ofertas comparables, llevarlas a junta y acompanar a la comunidad en la
-- eleccion. Linea de negocio propia, hermana de la comercial. Labor COMERCIAL
-- (la hace el comercial). Gestion/facturacion de la comision (~3% del PEM): via
-- Ecobalance (separacion de acceso -> fase de politicas RLS).
--
-- YA EXISTE y NO se duplica:
--   - Marco de comision de contrata: acuerdos_comision (beneficiario='contrata').
--   - Valor real de comision por proyecto: proyecto_contratas.comision_* (anadido
--     en la reconciliacion de comisiones).
--   - contratas.activa (Fase 1): NO se re-anade.
--
-- Este modulo NO construye tablas de balance ni de capacidad: la IA los CALCULA
-- de la historia y CONSULTA al humano (patron detecta->consulta, nunca decide).
-- Solo se garantiza que el cruce licitacion -> contrata -> historial de obra es
-- posible (no se calcula aqui).
--
-- Convenciones: espanol sin tildes/enes; PK uuid; creado_en/actualizado_en;
-- SIN ENUMS (text + CHECK nombrado); indices en FKs y fechas de alerta/espera;
-- RLS sin politicas; trigger actualizado_en reutilizado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. licitaciones — una por proyecto (o por paquete en obra mixta)
-- -----------------------------------------------------------------------------
create table licitaciones (
  id               uuid        primary key default gen_random_uuid(),
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),
  proyecto_id      uuid        not null references proyectos (id),
  paquete          text        not null default 'unico',
  comercial_id     uuid        references comerciales (id),
  junta_id         uuid        references juntas (id),
  estado           text        not null default 'abierta',
  estado_desde     timestamptz not null default now(),
  esperando_de     text,
  esperando_desde  timestamptz,
  notas            text,
  constraint licitaciones_paquete_check
    check (paquete in ('unico','sate','accesibilidad','otro')),
  constraint licitaciones_estado_check
    check (estado in ('abierta','presupuestos_recibidos','homogeneizando','a_junta','adjudicada','desierta','cancelada'))
);

comment on table licitaciones is 'Una licitacion por proyecto (unidad = proyecto completo, no oficios sueltos). En obra mixta (SATE + accesibilidad), dos licitaciones separadas sobre el mismo proyecto, una por paquete global. Correcciones de presupuesto se llevan en el estado del presupuesto, no creando licitaciones nuevas.';
comment on column licitaciones.paquete is 'Normalmente unico. En obra mixta: sate y accesibilidad (el que hace SATE no suele ser el ascensorista).';
comment on column licitaciones.comercial_id is 'Comercial que gestiona la licitacion y acompana a la junta (es labor comercial, no del arquitecto).';
comment on column licitaciones.junta_id is 'Junta (fase comercial) donde se votaron los 3 presupuestos, si aplica. ENCAJE: no se fuerza coherencia entre el proceso_venta de la junta y el proyecto de la licitacion (ramas distintas); enlace blando. Edge no modelado: si piden mas presupuestos y hay 2a junta, aqui solo cabe una (ampliar si hace falta).';
comment on column licitaciones.estado is 'abierta -> presupuestos_recibidos -> homogeneizando -> a_junta -> adjudicada | desierta | cancelada.';
comment on column licitaciones.estado_desde is 'Fecha de entrada al estado (materia prima de alertas).';
comment on column licitaciones.esperando_de is 'A la espera de quien (ej. contrata que no entrega presupuesto, o convocar junta).';
comment on column licitaciones.esperando_desde is 'Desde cuando se espera (indexado para alertas).';

create index idx_licitaciones_proyecto_id     on licitaciones (proyecto_id);
create index idx_licitaciones_comercial_id    on licitaciones (comercial_id);
create index idx_licitaciones_junta_id        on licitaciones (junta_id);
create index idx_licitaciones_estado_desde    on licitaciones (estado_desde);
create index idx_licitaciones_esperando_desde on licitaciones (esperando_desde);


-- -----------------------------------------------------------------------------
-- 2. presupuestos_licitacion — cada invitacion / oferta
-- -----------------------------------------------------------------------------
create table presupuestos_licitacion (
  id                      uuid        primary key default gen_random_uuid(),
  creado_en               timestamptz not null default now(),
  actualizado_en          timestamptz not null default now(),
  licitacion_id           uuid        not null references licitaciones (id),
  contrata_id             uuid        references contratas (id),
  contrata_externa_nombre text,
  origen                  text        not null default 'invitada_por_nosotros',
  rol_pretendido          text        not null default 'na',
  importe_pem             numeric,
  estado                  text        not null default 'invitada',
  estado_desde            timestamptz not null default now(),
  notas                   text,
  constraint presupuestos_licitacion_origen_check
    check (origen in ('invitada_por_nosotros','aportada_por_comunidad')),
  constraint presupuestos_licitacion_rol_pretendido_check
    check (rol_pretendido in ('preferida','palanca','na')),
  constraint presupuestos_licitacion_estado_check
    check (estado in ('invitada','presupuestado','correccion_pedida','homogeneizado','a_junta','adjudicada','no_adjudicada','retirada')),
  -- Las aportadas por la comunidad no llevan rol pretendido (na): no las invitamos nosotros.
  constraint presupuestos_licitacion_rol_solo_invitadas_check
    check (origen = 'invitada_por_nosotros' or rol_pretendido = 'na'),
  -- Debe identificarse la contrata: fichada (contrata_id) o por nombre libre.
  constraint presupuestos_licitacion_identidad_check
    check (contrata_id is not null or contrata_externa_nombre is not null)
);

comment on table presupuestos_licitacion is 'Cada invitacion/oferta de una licitacion. Una fila por contrata invitada o por presupuesto aportado por la comunidad. La comision si sale adjudicada NO se guarda aqui: vive en proyecto_contratas (se materializa/actualiza al adjudicar).';
comment on column presupuestos_licitacion.contrata_id is 'Nullable: un presupuesto aportado por la comunidad puede ser de una contrata no fichada (usar contrata_externa_nombre).';
comment on column presupuestos_licitacion.origen is 'invitada_por_nosotros (cuenta para nuestro balance con esa contrata) | aportada_por_comunidad (no cuenta en el balance, pero puede ser el adjudicatario final).';
comment on column presupuestos_licitacion.rol_pretendido is 'NUESTRA intencion, independiente del resultado: preferida (la que queremos que gane) | palanca (acompanamiento honesto para cubrir el expediente de 3 presupuestos) | na. Distinguir palanca evita que la IA lea una invitacion-palanca como "le paso obra y no gana".';
comment on column presupuestos_licitacion.importe_pem is 'PEM que presupuesto (Presupuesto de Ejecucion Material, sin IVA ni GG+BI), para comparar ofertas y para historico.';
comment on column presupuestos_licitacion.estado is 'invitada -> presupuestado -> correccion_pedida -> homogeneizado -> a_junta -> adjudicada | no_adjudicada | retirada. La decision final es SIEMPRE de la comunidad (independiente de rol_pretendido).';

create index idx_presupuestos_licitacion_licitacion_id on presupuestos_licitacion (licitacion_id);
create index idx_presupuestos_licitacion_contrata_id   on presupuestos_licitacion (contrata_id);


-- -----------------------------------------------------------------------------
-- 4. contrata_contactos — agenda de personas dentro de la contrata
-- -----------------------------------------------------------------------------
create table contrata_contactos (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  contrata_id     uuid        not null references contratas (id),
  nombre          text        not null,
  telefono        text,
  email           text,
  notas           text
);

comment on table contrata_contactos is 'Agenda de personas concretas dentro de una contrata. La contrata no es un bloque: la relacion real es con personas, que pueden tener varios roles (ver contrata_contacto_roles).';

create index idx_contrata_contactos_contrata_id on contrata_contactos (contrata_id);


-- -----------------------------------------------------------------------------
-- 4-bis. contrata_contacto_roles — roles (varios por persona)
-- -----------------------------------------------------------------------------
create table contrata_contacto_roles (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  contacto_id     uuid        not null references contrata_contactos (id),
  rol             text        not null,
  constraint contrata_contacto_roles_rol_check
    check (rol in ('jefe_de_obra','responsable_comercial','responsable_empresa','admin_facturacion','admin_obra','otro')),
  constraint uq_contrata_contacto_roles_contacto_rol unique (contacto_id, rol)
);

comment on table contrata_contacto_roles is 'Roles de un contacto de contrata (varios por persona: el decisor que tambien es comercial). Dos naturalezas: decision/comercial-obra (jefe_de_obra, responsable_comercial, responsable_empresa=decisor final) y administrativo del dia a dia (admin_facturacion=a quien pasamos facturas, admin_obra=a quien pedimos fichas tecnicas/certificaciones).';

create index idx_contrata_contacto_roles_contacto_id on contrata_contacto_roles (contacto_id);


-- -----------------------------------------------------------------------------
-- 6. Ficha comercial de la contrata — ampliar contratas (nucleo)
--    OJO: contratas.activa YA existe (Fase 1); NO se re-anade.
-- -----------------------------------------------------------------------------
alter table contratas
  add column especialidad     text,
  add column relacion_estado  text,
  add column notas_comercial  text;

alter table contratas
  add constraint contratas_relacion_estado_check
    check (relacion_estado in ('preferente','habitual','esporadica','en_observacion','descartada'));

comment on column contratas.especialidad is 'En que tipo de obra es especialista (ascensor, SATE, plataforma...). Texto libre.';
comment on column contratas.relacion_estado is 'Apreciacion cualitativa actualizable: preferente, habitual, esporadica, en_observacion, descartada. La relacion varia en el tiempo.';
comment on column contratas.notas_comercial is 'Texto libre: en que es buena, de que cojea, por que la relacion mejoro/empeoro. Alimenta las consultas que la IA hace al humano. NO hay campo de capacidad de carga ni balance: son cosas que la IA observa y sugiere, no datos fijos.';


-- =============================================================================
-- ROW LEVEL SECURITY (habilitado sin politicas; separacion Accesalia/Ecobalance
-- se resuelve en la fase de politicas RLS)
-- =============================================================================
alter table licitaciones             enable row level security;
alter table presupuestos_licitacion  enable row level security;
alter table contrata_contactos       enable row level security;
alter table contrata_contacto_roles  enable row level security;


-- =============================================================================
-- TRIGGER actualizado_en para las tablas nuevas (reutiliza set_actualizado_en()).
-- (contratas ya tenia su trigger; el ALTER no lo afecta.)
-- =============================================================================
do $$
declare r record;
begin
  for r in
    select unnest(array['licitaciones','presupuestos_licitacion','contrata_contactos','contrata_contacto_roles']) as t
  loop
    execute format('drop trigger if exists trg_set_actualizado_en on public.%I', r.t);
    execute format('create trigger trg_set_actualizado_en before update on public.%I for each row execute function set_actualizado_en()', r.t);
  end loop;
end $$;


-- =============================================================================
-- NOTAS / ENGANCHES (no construir — solo anotados)
--
-- - ADJUDICACION -> proyecto_contratas (encaje, NO asumido):
--     al pasar un presupuesto_licitacion a 'adjudicada', la logica de aplicacion
--     crea/actualiza la fila de proyecto_contratas (proyecto_id de la licitacion +
--     contrata_id) con la comision real. El PAPEL de proyecto_contratas
--     (obra_civil/maquinaria_ascensor/sate/otro) NO se deriva 1:1 del paquete de la
--     licitacion (unico/sate/accesibilidad): esa correspondencia la decide una
--     persona/app al adjudicar. NO se anade FK dura presupuesto->proyecto_contratas.
--     TRAZABILIDAD garantizada para el balance sin FK extra: el cruce
--     licitacion -> contrata -> historial de obra es posible via el par
--     (proyecto_id, contrata_id), presente en licitaciones/proyecto_contratas.
--
-- - BALANCE Y CAPACIDAD (la IA calcula, no se almacena):
--     balance por contrata = contar presupuestos_licitacion con
--     origen='invitada_por_nosotros', separando rol_pretendido (preferida/palanca)
--     y estado (adjudicada/no) en una ventana; cruzar con el historial de obra.
--     carga = obras vivas via proyecto_contratas + estado de obra. Cobro 3% =
--     proyecto_contratas.comision_estado_cobro. Todo: detecta -> consulta al humano.
--
-- - SUBVENCION (3 presupuestos): el modulo de subvenciones consume estos
--     presupuestos (reunir 3 y votarlos en junta). Aqui solo se garantiza que una
--     licitacion puede exponer sus 3+ presupuestos; no se construye logica de
--     subvencion.
--
-- - FUERA DE ALCANCE: liquidacion de pagos salientes (facturacion/Ecobalance);
--     modulos de subvenciones y CAES; separacion de acceso Accesalia/Ecobalance
--     (politicas RLS); limpieza de administradores.comision_por_defecto.
-- =============================================================================
