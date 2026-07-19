-- =============================================================================
-- ERP Accesalia — Fase 1: Capa nucleo + Area de Subvenciones
-- Migracion inicial. Proyecto Supabase nuevo y vacio.
--
-- Alcance de esta migracion: SOLO el esquema de datos (enums, tablas, columnas,
-- claves foraneas, checks, restricciones unicas e indices), comentarios y
-- row level security habilitado SIN politicas.
--
-- Fuera de alcance (ver notas al final del archivo): UI, autenticacion externa,
-- integracion Dropbox/ficheros, logica de negocio, triggers de aplicacion,
-- Edge Functions y las areas del ERP distintas de subvenciones.
--
-- Convenciones aplicadas:
--   - Nombres de tablas/columnas en espanol, sin tildes ni enes.
--   - PK id uuid default gen_random_uuid() en todas las tablas.
--   - creado_en / actualizado_en timestamptz default now() en todas las tablas.
--   - FKs con nombre <tabla_singular>_id.
--   - Enums de Postgres para conjuntos cerrados.
--   - Indices en todas las FKs y en las columnas de fecha usadas para alertas.
--   - comment en cada tabla y en cada columna no evidente.
--   - RLS habilitado sin politicas (se definiran al montar accesos externos).
-- =============================================================================

-- gen_random_uuid() vive en pgcrypto. En Supabase suele estar disponible, pero
-- lo aseguramos de forma idempotente.
create extension if not exists "pgcrypto";

-- =============================================================================
-- 1. ENUMS (conjuntos cerrados de estados y tipos)
-- =============================================================================

create type tipo_contrata as enum ('obra_civil', 'ascensorista', 'sate', 'mixta', 'otra');

create type tipo_actuacion as enum (
  'ascensor', 'rampa', 'sate_completo', 'sate_fachada', 'sate_cubierta', 'mixto', 'otra'
);

create type estado_proyecto as enum (
  'captacion', 'en_redaccion', 'tramitando_licencia', 'en_obra', 'finalizado', 'parado', 'cancelado'
);

create type papel_contrata as enum ('obra_civil', 'maquinaria_ascensor', 'sate', 'otro');

create type estado_firma as enum (
  'no_aplica', 'generado', 'enviado_a_firma', 'devuelto_firmado', 'validado'
);

create type aportado_por as enum ('comunidad', 'accesalia', 'mixto_firma');

create type nivel_documento as enum ('comunidad', 'proyecto');

create type estado_expediente as enum (
  'preparando', 'presentado', 'requerido', 'concedido', 'denegado', 'cobrado'
);

create type estado_requerimiento as enum ('pendiente', 'en_curso', 'respondido');


-- =============================================================================
-- 2. CAPA NUCLEO
-- Entidades del negocio compartidas por todas las areas futuras del ERP.
-- Subvenciones se cuelga de ellas; nunca al reves.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 administradores
-- -----------------------------------------------------------------------------
create table administradores (
  id                     uuid        primary key default gen_random_uuid(),
  creado_en              timestamptz not null default now(),
  actualizado_en         timestamptz not null default now(),
  nombre                 text        not null,
  empresa                text,
  telefono               text,
  email                  text,
  comision_por_defecto   numeric,
  fecha_ultimo_contacto  timestamptz,
  fecha_ultimo_encargo   timestamptz,
  activo                 boolean     not null default true
);

comment on table administradores is 'Administrador de fincas: el cliente que trae el trabajo (comunidades, proyectos, encargos).';
comment on column administradores.empresa is 'Nullable: a veces el administrador es una empresa con varias personas.';
comment on column administradores.comision_por_defecto is 'Cantidad fija habitual que cobra por proyecto que trae. Orientativa; el valor real se fija en cada proyecto (proyectos.comision_administrador).';
comment on column administradores.fecha_ultimo_contacto is 'Enchufe de IA: alertar de administradores buenos a los que hace mucho que no se llama.';
comment on column administradores.fecha_ultimo_encargo is 'Enchufe de IA: ultimo trabajo que trajo.';
comment on column administradores.activo is 'Baja logica: false = ya no operativo.';

create index idx_administradores_fecha_ultimo_contacto on administradores (fecha_ultimo_contacto);
create index idx_administradores_fecha_ultimo_encargo  on administradores (fecha_ultimo_encargo);


-- -----------------------------------------------------------------------------
-- 3.2 comunidades
-- -----------------------------------------------------------------------------
create table comunidades (
  id                            uuid        primary key default gen_random_uuid(),
  creado_en                     timestamptz not null default now(),
  actualizado_en                timestamptz not null default now(),
  administrador_id              uuid        not null references administradores (id),
  nombre                        text        not null,
  direccion                     text,
  municipio                     text,
  referencia_catastral          text,
  cif_comunidad                 text,
  anio_construccion             integer,
  num_viviendas                 integer,
  num_residentes_mayores_70     integer,
  num_residentes_discapacidad   integer,
  fecha_actualizacion_censo     date,
  fecha_ultimo_contacto         timestamptz,
  activa                        boolean     not null default true
);

comment on table comunidades is 'Edificio / comunidad de propietarios (para Accesalia, comunidad = inmueble). Incluye datos ricos para baremar convocatorias de subvencion.';
comment on column comunidades.municipio is 'Relevante: determina que ayuntamiento tiene jurisdiccion.';
comment on column comunidades.num_residentes_mayores_70 is 'Dato de baremacion de subvenciones.';
comment on column comunidades.num_residentes_discapacidad is 'Dato de baremacion de subvenciones.';
comment on column comunidades.fecha_actualizacion_censo is 'Cuando se actualizaron num_residentes_mayores_70 y num_residentes_discapacidad.';
comment on column comunidades.fecha_ultimo_contacto is 'Enchufe de IA.';
comment on column comunidades.activa is 'Baja logica.';

create index idx_comunidades_administrador_id      on comunidades (administrador_id);
create index idx_comunidades_fecha_ultimo_contacto on comunidades (fecha_ultimo_contacto);


-- -----------------------------------------------------------------------------
-- 3.3 contratas
-- -----------------------------------------------------------------------------
create table contratas (
  id                 uuid          primary key default gen_random_uuid(),
  creado_en          timestamptz   not null default now(),
  actualizado_en     timestamptz   not null default now(),
  nombre             text          not null,
  tipo               tipo_contrata not null,
  telefono           text,
  email              text,
  notas_fiabilidad   text,
  activa             boolean       not null default true
);

comment on table contratas is 'Empresa que ejecuta las obras. Entidad propia por su historial de fiabilidad (alimentara el calculo de visitas de obra en fase futura) y porque a veces es la pagadora de un encargo.';
comment on column contratas.notas_fiabilidad is 'Enchufe de IA: observaciones sobre si es de confianza o hay que vigilarla. Por ahora texto libre; se estructurara en el futuro.';
comment on column contratas.activa is 'Baja logica.';


-- -----------------------------------------------------------------------------
-- 3.4 proyectos
-- -----------------------------------------------------------------------------
create table proyectos (
  id                       uuid            primary key default gen_random_uuid(),
  creado_en                timestamptz     not null default now(),
  actualizado_en           timestamptz     not null default now(),
  comunidad_id             uuid            not null references comunidades (id),
  nombre                   text            not null,
  tipo_actuacion           tipo_actuacion  not null,
  descripcion              text,
  comision_administrador   numeric,
  fecha_inicio_obra        date,
  fecha_fin_obra           date,
  estado                   estado_proyecto not null default 'captacion',
  fecha_estado             timestamptz
);

comment on table proyectos is 'La obra concreta (ese ascensor, ese SATE). Pertenece siempre a una comunidad. Mancomunidad (proyecto que abarca varias comunidades) es raro y NO se construye ahora; comunidad_id es obligatorio de momento (posible ampliacion futura a muchos-a-muchos).';
comment on column proyectos.comision_administrador is 'Comision pactada para ESTE proyecto. Por defecto se hereda de administradores.comision_por_defecto, pero puede sobreescribirse (obras grandes). Se guarda el valor real aqui.';
comment on column proyectos.fecha_inicio_obra is 'Enchufe de IA: base para proyectar fases y visitas.';
comment on column proyectos.fecha_fin_obra is 'Enchufe de IA: dispara plazos de subvencion y gestiones de cierre.';
comment on column proyectos.fecha_estado is 'Enchufe de IA clave: cuando entro en el estado actual, para detectar que lleva demasiado tiempo parado en X.';

create index idx_proyectos_comunidad_id      on proyectos (comunidad_id);
create index idx_proyectos_fecha_inicio_obra on proyectos (fecha_inicio_obra);
create index idx_proyectos_fecha_fin_obra    on proyectos (fecha_fin_obra);
create index idx_proyectos_fecha_estado      on proyectos (fecha_estado);


-- -----------------------------------------------------------------------------
-- 3.5 proyecto_contratas (relacion proyecto <-> contrata, con papel)
-- -----------------------------------------------------------------------------
create table proyecto_contratas (
  id              uuid           primary key default gen_random_uuid(),
  creado_en       timestamptz    not null default now(),
  actualizado_en  timestamptz    not null default now(),
  proyecto_id     uuid           not null references proyectos (id),
  contrata_id     uuid           not null references contratas (id),
  papel           papel_contrata not null,
  constraint uq_proyecto_contratas_proyecto_contrata_papel unique (proyecto_id, contrata_id, papel)
);

comment on table proyecto_contratas is 'Tabla intermedia: un proyecto puede tener varias contratas, cada una con un papel distinto (obra civil, maquinaria del ascensor, SATE...).';
comment on column proyecto_contratas.papel is 'Que parte ejecuta esta contrata en este proyecto.';

create index idx_proyecto_contratas_proyecto_id on proyecto_contratas (proyecto_id);
create index idx_proyecto_contratas_contrata_id on proyecto_contratas (contrata_id);


-- =============================================================================
-- 3. CAPA SUBVENCIONES (parcial: catalogos referenciados por el nucleo)
--
-- NOTA DE ORDEN: tipos_documento pertenece conceptualmente a la seccion 4
-- (Subvenciones), pero documentos (nucleo, 3.6) lo referencia. Por dependencia
-- de FK se define aqui, antes de documentos. Es una decision de ordenacion del
-- archivo, no un cambio de modelo.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 4.1 tipos_documento (catalogo maestro)
-- -----------------------------------------------------------------------------
create table tipos_documento (
  id              uuid            primary key default gen_random_uuid(),
  creado_en       timestamptz     not null default now(),
  actualizado_en  timestamptz     not null default now(),
  nombre          text            not null,
  aportado_por    aportado_por    not null,
  caduca          boolean         not null default false,
  pertenece_a     nivel_documento not null
);

comment on table tipos_documento is 'Catalogo maestro de tipos de documento (DNI presidente, acta de nombramiento, IEE, certificado energetico, proyecto tecnico...). Define de una vez para siempre quien aporta cada tipo y si caduca.';
comment on column tipos_documento.aportado_por is 'Quien lo sube. mixto_firma = lo genera Accesalia y lo firma la comunidad.';
comment on column tipos_documento.caduca is 'Si true, sus documentos controlan fecha_caducidad. Ej.: actas de nombramiento caducan; proyecto/IEE/certificado energetico en la practica no.';
comment on column tipos_documento.pertenece_a is 'A que nivel cuelga por defecto este tipo de documento (comunidad o proyecto).';


-- -----------------------------------------------------------------------------
-- 3.6 documentos
-- Pertenecen al NUCLEO, no a subvenciones. Subvenciones los referencia, nunca
-- los posee.
-- -----------------------------------------------------------------------------
create table documentos (
  id                 uuid          primary key default gen_random_uuid(),
  creado_en          timestamptz   not null default now(),
  actualizado_en     timestamptz   not null default now(),
  comunidad_id       uuid          references comunidades (id),
  proyecto_id        uuid          references proyectos (id),
  tipo_documento_id  uuid          not null references tipos_documento (id),
  fecha_emision      date,
  fecha_caducidad    date,
  estado_firma       estado_firma  not null default 'no_aplica',
  url_fichero        text,
  vigente            boolean       not null default true,
  constraint chk_documentos_comunidad_o_proyecto
    check (comunidad_id is not null or proyecto_id is not null)
);

comment on table documentos is 'Documentos de la comunidad o del proyecto. Pertenecen al nucleo; subvenciones los referencia. Si el proyecto tecnico cambia, los expedientes que lo usaban pueden detectar que su documento quedo obsoleto.';
comment on column documentos.comunidad_id is 'Cuelga de la comunidad (ej. DNI del presidente). Nullable, pero el check exige comunidad_id o proyecto_id.';
comment on column documentos.proyecto_id is 'Cuelga del proyecto (ej. proyecto tecnico del ascensor). Nullable, pero el check exige comunidad_id o proyecto_id.';
comment on column documentos.fecha_caducidad is 'Solo aplica a los tipos que caducan (tipos_documento.caduca = true).';
comment on column documentos.estado_firma is 'Flujo de documentos mixtos que Accesalia genera y la comunidad firma. Los que no requieren firma quedan en no_aplica.';
comment on column documentos.url_fichero is 'Enlace al archivo real (Dropbox u otro). Se rellenara en fase futura; por ahora puede ir vacio.';
comment on column documentos.vigente is 'Enchufe de IA: false cuando el documento queda obsoleto (ej. porque cambio el proyecto).';
comment on constraint chk_documentos_comunidad_o_proyecto on documentos is 'Al menos uno de comunidad_id o proyecto_id debe estar relleno.';

create index idx_documentos_comunidad_id      on documentos (comunidad_id);
create index idx_documentos_proyecto_id       on documentos (proyecto_id);
create index idx_documentos_tipo_documento_id on documentos (tipo_documento_id);
create index idx_documentos_fecha_caducidad   on documentos (fecha_caducidad);
create index idx_documentos_vigente           on documentos (vigente);


-- -----------------------------------------------------------------------------
-- 4.2 convocatorias (plantillas)
-- -----------------------------------------------------------------------------
create table convocatorias (
  id                             uuid        primary key default gen_random_uuid(),
  creado_en                      timestamptz not null default now(),
  actualizado_en                 timestamptz not null default now(),
  entidad                        text        not null,
  plan                           text        not null,
  anio                           integer     not null,
  fecha_apertura                 date,
  fecha_cierre                   date,
  antiguedad_maxima_obra_meses   integer,
  notas_condiciones              text
);

comment on table convocatorias is 'Plantilla reutilizable de una convocatoria de subvencion (entidad, plan, anio y sus reglas). Una misma entidad puede tener varias convocatorias el mismo anio; por eso entidad y plan son campos separados.';
comment on column convocatorias.entidad is 'Ej. "Ayuntamiento de Madrid", "Comunidad de Madrid", "Ayuntamiento de Leganes".';
comment on column convocatorias.plan is 'Ej. "Madrid Rehabilita", "Next Generation", "Plan barrio X".';
comment on column convocatorias.fecha_apertura is 'Enchufe de IA: avisar cuando se abre el plazo.';
comment on column convocatorias.fecha_cierre is 'Enchufe de IA: avisar antes de que cierre.';
comment on column convocatorias.antiguedad_maxima_obra_meses is 'Regla cotejable: no admite obras mas antiguas de X meses.';
comment on column convocatorias.notas_condiciones is 'Otras reglas/baremos en texto por ahora (minusvalidos, mayores de 70, accesibilidad junto a eficiencia...). Se estructuraran mas adelante si hace falta.';

create index idx_convocatorias_fecha_apertura on convocatorias (fecha_apertura);
create index idx_convocatorias_fecha_cierre   on convocatorias (fecha_cierre);


-- -----------------------------------------------------------------------------
-- 4.3 requisitos_convocatoria (cruce convocatoria <-> tipo de documento)
-- -----------------------------------------------------------------------------
create table requisitos_convocatoria (
  id                 uuid        primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  convocatoria_id    uuid        not null references convocatorias (id),
  tipo_documento_id  uuid        not null references tipos_documento (id),
  obligatorio        boolean     not null default true,
  constraint uq_requisitos_convocatoria_convocatoria_tipo unique (convocatoria_id, tipo_documento_id)
);

comment on table requisitos_convocatoria is 'Que tipos de documento exige cada convocatoria. Permite que un mismo documento se reutilice en varias convocatorias.';

create index idx_requisitos_convocatoria_convocatoria_id   on requisitos_convocatoria (convocatoria_id);
create index idx_requisitos_convocatoria_tipo_documento_id on requisitos_convocatoria (tipo_documento_id);


-- -----------------------------------------------------------------------------
-- 4.4 expedientes
-- -----------------------------------------------------------------------------
create table expedientes (
  id                     uuid              primary key default gen_random_uuid(),
  creado_en              timestamptz       not null default now(),
  actualizado_en         timestamptz       not null default now(),
  comunidad_id           uuid              not null references comunidades (id),
  proyecto_id            uuid              references proyectos (id),
  convocatoria_id        uuid              not null references convocatorias (id),
  estado                 estado_expediente not null default 'preparando',
  fecha_estado           timestamptz,
  fecha_presentacion     date,
  importe_solicitado     numeric,
  importe_concedido      numeric,
  fecha_cobro_comunidad  date,
  constraint uq_expedientes_comunidad_convocatoria unique (comunidad_id, convocatoria_id)
);

comment on table expedientes is 'Una comunidad presentandose a una convocatoria concreta. Aqui vive el historico multi-anio: la misma comunidad puede tener varios expedientes a lo largo del tiempo.';
comment on column expedientes.proyecto_id is 'La obra a la que se refiere la subvencion (nullable).';
comment on column expedientes.fecha_estado is 'Enchufe de IA: cuando entro en el estado actual.';
comment on column expedientes.importe_concedido is 'Base sobre la que Accesalia factura su 3% de exito.';
comment on column expedientes.fecha_cobro_comunidad is 'Cuando cobro la comunidad; dispara la facturacion del 3%.';
comment on constraint uq_expedientes_comunidad_convocatoria on expedientes is 'Un expediente por comunidad y convocatoria.';

create index idx_expedientes_comunidad_id          on expedientes (comunidad_id);
create index idx_expedientes_proyecto_id           on expedientes (proyecto_id);
create index idx_expedientes_convocatoria_id       on expedientes (convocatoria_id);
create index idx_expedientes_fecha_estado          on expedientes (fecha_estado);
create index idx_expedientes_fecha_cobro_comunidad on expedientes (fecha_cobro_comunidad);


-- -----------------------------------------------------------------------------
-- 4.5 requerimientos
-- -----------------------------------------------------------------------------
create table requerimientos (
  id                       uuid                  primary key default gen_random_uuid(),
  creado_en                timestamptz           not null default now(),
  actualizado_en           timestamptz           not null default now(),
  expediente_id            uuid                  not null references expedientes (id),
  descripcion              text                  not null,
  url_documento_original   text,
  fecha_recepcion          date                  not null,
  fecha_limite_respuesta   date                  not null,
  estado                   estado_requerimiento  not null default 'pendiente',
  fecha_respuesta          date
);

comment on table requerimientos is 'Cuando un organismo pide subsanar algo en un expediente presentado. Tienen plazo de respuesta critico. Llegan como documento externo en papel: se conserva el texto extraido (descripcion) Y el enlace al original (url_documento_original). La extraccion automatica es de fase posterior; por ahora se rellena a mano.';
comment on column requerimientos.descripcion is 'Resumen de lo que pide el organismo (extraido del documento, o tecleado a mano por ahora).';
comment on column requerimientos.url_documento_original is 'Enlace al escaneo del requerimiento original. Se conserva siempre el original, no solo lo extraido.';
comment on column requerimientos.fecha_recepcion is 'Enchufe de IA.';
comment on column requerimientos.fecha_limite_respuesta is 'Enchufe de IA clave: alertar antes de que caduque el plazo.';

create index idx_requerimientos_expediente_id          on requerimientos (expediente_id);
create index idx_requerimientos_fecha_recepcion        on requerimientos (fecha_recepcion);
create index idx_requerimientos_fecha_limite_respuesta on requerimientos (fecha_limite_respuesta);


-- =============================================================================
-- 4. ROW LEVEL SECURITY
-- Se habilita RLS en TODAS las tablas. NO se definen politicas todavia: sin
-- politicas y con RLS activo, el acceso queda bloqueado salvo para la service
-- role key. Las politicas se definiran al montar los accesos externos
-- (administradores y comunidades). ANOTADO: pendiente definir politicas.
-- =============================================================================

alter table administradores          enable row level security;
alter table comunidades              enable row level security;
alter table contratas                enable row level security;
alter table proyectos                enable row level security;
alter table proyecto_contratas       enable row level security;
alter table tipos_documento          enable row level security;
alter table documentos               enable row level security;
alter table convocatorias            enable row level security;
alter table requisitos_convocatoria  enable row level security;
alter table expedientes              enable row level security;
alter table requerimientos           enable row level security;


-- =============================================================================
-- 5. ENGANCHES PREVISTOS (NO construir ahora — solo anotados)
-- El modelo contempla estos puntos; sus tablas se crearan en fases futuras.
--
-- - ENCARGOS Y HOJAS DE ENCARGO:
--     hoja_encargo (documento contractual, con pagador que apunta a comunidad o
--     a una contrata) que agrupa uno o varios encargos (conceptos: proyecto
--     tecnico, direccion de obra, coordinacion SS, subvencion...). El pagador
--     vive a nivel de hoja, no de proyecto (un proyecto puede tener varias hojas
--     con pagadores distintos). El expediente de subvencion de esta fase sera,
--     en el futuro, un encargo de tipo subvencion.
--
-- - FACTURACION:
--     hitos_facturacion colgando de la hoja de encargo, con plan pactado
--     original y plan real/vigente que puede fraccionarse (derramas) sin borrar
--     el original. Incluye el 3% de exito de subvencion como hito condicionado a
--     expedientes.fecha_cobro_comunidad.
--
-- - OBRA Y VISITAS:
--     catalogo de tipos de obra con fases y cadencias tipicas (ascensor: foso y
--     montera como fases criticas; SATE: remates y restriccion del andamio),
--     registro de visitas con fecha, y calculo de calendario optimo de visitas
--     cruzando tipo de obra, fase actual, fecha de inicio y fiabilidad de la
--     contrata (contratas.notas_fiabilidad).
--
-- - NOTAS:
--     distinguir notas_valorativas (cualitativas, sobre administrador o
--     comunidad — como trabajar mejor con cada uno) de notas_incidencia
--     (accionables, con responsable, estado y fecha — quejas, restricciones
--     tecnicas de ejecucion).
--
-- - CAPA DE IA:
--     los campos fecha_estado, fecha_ultimo_contacto, fechas de plazos y notas_*
--     son los enchufes para que la capa de IA razone y genere alertas proactivas.
--
-- - ENTRADA DE DATOS POR TEXTO LIBRE (principio general):
--     donde un dato entre como narracion o documento externo (actas de obra,
--     requerimientos escaneados, notas de voz), conservar el texto original
--     integro ademas de los campos estructurados que la IA extraiga, y prever un
--     marcador semantico (a que entidad y fase pertenece, tipo, signo). Ya
--     aplicado en requerimientos. Se replicara en actas de obra y notas cuando se
--     construyan esas fases; no se generaliza antes de que haga falta.
--
-- - MANCOMUNIDAD:
--     proyectos.comunidad_id es obligatorio de momento. Ampliacion futura a
--     muchos-a-muchos (un proyecto que abarca varias comunidades) si aparece el
--     caso.
--
-- - TRIGGER actualizado_en:
--     actualizado_en tiene default now() en la insercion, pero NO se
--     autoactualiza en UPDATE (un trigger seria logica de aplicacion, fuera del
--     alcance de esta fase). PENDIENTE de revisar con la propietaria: anadir un
--     trigger BEFORE UPDATE que ponga actualizado_en = now(), o gestionarlo desde
--     la capa de aplicacion.
-- =============================================================================
