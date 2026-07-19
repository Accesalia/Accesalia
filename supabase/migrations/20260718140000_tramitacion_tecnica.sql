-- =============================================================================
-- ERP Accesalia — Fase 3: Tramitacion tecnica (redaccion y licencia)
--
-- Amplia la BD con el area de tramitacion tecnica del proyecto, desde el arranque
-- de la redaccion hasta la concesion de licencia. Las Fases 1, 2 y la conversion
-- de enums a check ya existen. Esta migracion NO toca lo anterior salvo el ajuste
-- explicito del check de proyectos.estado (seccion 4).
--
-- Alcance: SOLO esquema de datos (tablas, columnas, FKs, checks, indices),
-- comentarios y RLS sin politicas.
--
-- Fuera de alcance (ver notas al final): fase de obra (apertura centro de trabajo,
-- acta de inicio, visitas, incidencias, precios contradictorios, fin de obra),
-- fase comercial (viabilidad, escaneo, junta), CAES y comisiones. Aqui se llega
-- hasta la concesion de licencia y nada mas.
--
-- Convenciones: nombres en espanol sin tildes/enes; PK id uuid; creado_en/
-- actualizado_en timestamptz default now(); FKs <tabla_singular>_id.
-- SIN ENUMS: conjuntos cerrados como text + check constraint NOMBRADO
-- (<tabla>_<columna>_check), para poder editar la lista de valores facilmente.
-- Indices en FKs y en columnas de fecha para alertas. RLS habilitado sin politicas.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 tecnicos
-- -----------------------------------------------------------------------------
create table tecnicos (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  nombre          text        not null,
  rol             text        not null,
  email           text,
  telefono        text,
  activo          boolean     not null default true,
  constraint tecnicos_rol_check
    check (rol in ('arquitecto','arquitecto_tecnico','delineante','administrativo','otro'))
);

comment on table tecnicos is 'Personal tecnico de Accesalia que interviene en redaccion y tramitacion. Tabla sencilla en esta fase; se enriquecera para el futuro analisis de "mejor tecnico" (carga, requerimientos, tiempos).';
comment on column tecnicos.rol is 'Rol del tecnico. text+check (no enum) para editar la lista con facilidad.';
comment on column tecnicos.activo is 'Baja logica.';


-- -----------------------------------------------------------------------------
-- 3.2 etapas_proyecto
-- Lista flexible de etapas por las que pasa un proyecto en su tramitacion tecnica.
-- Cada proyecto tiene varias filas. Una etapa puede reabrirse (por un
-- requerimiento) sin perder su historia. Los campos de licencia/tasas viven aqui
-- (solo se rellenan en la etapa solicitud_licencia) para no crear otra tabla ahora.
-- -----------------------------------------------------------------------------
create table etapas_proyecto (
  id                       uuid        primary key default gen_random_uuid(),
  creado_en                timestamptz not null default now(),
  actualizado_en           timestamptz not null default now(),
  proyecto_id              uuid        not null references proyectos (id),
  tipo_etapa               text        not null,
  orden                    integer     not null,
  responsable_tecnico_id   uuid        references tecnicos (id),
  estado                   text        not null default 'pendiente',
  fecha_estado             timestamptz,
  fecha_inicio             date,
  fecha_fin                date,
  notas                    text,
  -- Campos especificos de la etapa de licencia (solicitud_licencia). Nullable:
  -- solo se rellenan en esa etapa. Representan el arbol de decision y las tasas
  -- bloqueantes.
  licencia_via             text,
  licencia_modalidad       text,
  tasas_estado             text,
  tasas_fecha_solicitud    date,
  tasas_fecha_pago         date,
  constraint etapas_proyecto_tipo_etapa_check
    check (tipo_etapa in ('estado_actual','redaccion_proyecto','mediciones_presupuesto','certificado_energetico','visado_coam','solicitud_licencia','concesion_licencia')),
  constraint etapas_proyecto_estado_check
    check (estado in ('pendiente','en_curso','terminada','reabierta','no_aplica')),
  constraint etapas_proyecto_licencia_via_check
    check (licencia_via in ('ayuntamiento','ecu')),
  constraint etapas_proyecto_licencia_modalidad_check
    check (licencia_modalidad in ('licencia','declaracion_responsable')),
  constraint etapas_proyecto_tasas_estado_check
    check (tasas_estado in ('no_solicitadas','solicitadas','pendiente_pago_comunidad','pagadas','justificante_reenviado'))
);

comment on table etapas_proyecto is 'Lista flexible de etapas de la tramitacion tecnica de un proyecto. No es una linea recta: una etapa puede reabrirse por un requerimiento. Lista inicial derivada de la operativa real; pensada para afinarse (p. ej. catalogo por tipo de proyecto) sin rehacer el modelo. El estado-resumen global sigue en proyectos.estado.';
comment on column etapas_proyecto.tipo_etapa is 'Etapa dentro de la secuencia. Bloque redaccion: estado_actual, redaccion_proyecto, mediciones_presupuesto, certificado_energetico. visado_coam = fin fase proyecto. Bloque licencia: solicitud_licencia, concesion_licencia = fin fase licencia. Lista NO definitiva.';
comment on column etapas_proyecto.orden is 'Posicion de la etapa en la secuencia, para ordenar y reordenar.';
comment on column etapas_proyecto.responsable_tecnico_id is 'Tecnico a cargo de esta etapa. Puede variar entre etapas del mismo proyecto.';
comment on column etapas_proyecto.estado is 'Estado de la etapa. reabierta = se reabrio tras un requerimiento. no_aplica = etapa que no corresponde a este proyecto (ej. certificado_energetico).';
comment on column etapas_proyecto.fecha_estado is 'Enchufe de IA: cuando entro en el estado actual (para "lleva X en este estado").';
comment on column etapas_proyecto.licencia_via is 'Solo etapa solicitud_licencia. Via de tramitacion: ayuntamiento o ecu.';
comment on column etapas_proyecto.licencia_modalidad is 'Solo etapa solicitud_licencia. Modalidad: licencia o declaracion_responsable. (via x modalidad = arbol de 4 combinaciones).';
comment on column etapas_proyecto.tasas_estado is 'Solo etapa solicitud_licencia. Ciclo bloqueante de tasas: no_solicitadas -> solicitadas -> pendiente_pago_comunidad -> pagadas -> justificante_reenviado. Sin pagadas/justificante_reenviado no avanza la licencia.';
comment on column etapas_proyecto.tasas_fecha_solicitud is 'Enchufe de IA: avisar si se solicitaron tasas y no hay respuesta.';

create index idx_etapas_proyecto_proyecto_id            on etapas_proyecto (proyecto_id);
create index idx_etapas_proyecto_responsable_tecnico_id on etapas_proyecto (responsable_tecnico_id);
create index idx_etapas_proyecto_fecha_estado           on etapas_proyecto (fecha_estado);
create index idx_etapas_proyecto_tasas_fecha_solicitud  on etapas_proyecto (tasas_fecha_solicitud);


-- -----------------------------------------------------------------------------
-- 3.3 requerimientos_tramitacion
-- Requerimientos del COAM (al visar) o del Ayuntamiento/ECU (al conceder
-- licencia). Patron comun de requerimiento: un externo pide cambiar algo hecho,
-- con plazo, y puede consumir horas de tecnico. Reabren la etapa afectada.
-- -----------------------------------------------------------------------------
create table requerimientos_tramitacion (
  id                       uuid          primary key default gen_random_uuid(),
  creado_en                timestamptz   not null default now(),
  actualizado_en           timestamptz   not null default now(),
  proyecto_id              uuid          not null references proyectos (id),
  etapa_proyecto_id        uuid          references etapas_proyecto (id),
  origen                   text          not null,
  descripcion              text          not null,
  url_documento_original   text,
  tipo_resolucion          text          not null default 'sin_determinar',
  responsable_id           uuid          references tecnicos (id),
  fecha_recepcion          date          not null,
  fecha_limite_respuesta   date,
  estado                   text          not null default 'abierto',
  fecha_respuesta          date,
  horas_tecnico            numeric(6,2),
  constraint requerimientos_tramitacion_origen_check
    check (origen in ('coam','ayuntamiento','ecu','otro')),
  constraint requerimientos_tramitacion_tipo_resolucion_check
    check (tipo_resolucion in ('administrativa','tecnica','sin_determinar')),
  constraint requerimientos_tramitacion_estado_check
    check (estado in ('abierto','en_resolucion','respondido','cerrado'))
);

comment on table requerimientos_tramitacion is 'Requerimientos emitidos por COAM (al visar) o Ayuntamiento/ECU (al conceder licencia). Patron comun de requerimiento: reabren la etapa afectada y pueden consumir horas de tecnico. Sin limite de numero ni de tiempo. (Subvenciones tiene su propia tabla requerimientos; obra y CAES tendran las suyas.)';
comment on column requerimientos_tramitacion.etapa_proyecto_id is 'La etapa que se reabre por este requerimiento (nullable).';
comment on column requerimientos_tramitacion.origen is 'Quien lo pide: coam, ayuntamiento, ecu, otro.';
comment on column requerimientos_tramitacion.descripcion is 'Que pide (texto extraido del documento). El original se conserva en url_documento_original.';
comment on column requerimientos_tramitacion.tipo_resolucion is 'Si se resuelve con gestion administrativa o requiere trabajo del arquitecto (horas de tecnico). Enchufe de IA/negocio: una persona lo decide. Default sin_determinar.';
comment on column requerimientos_tramitacion.responsable_id is 'Tecnico que debe resolverlo.';
comment on column requerimientos_tramitacion.fecha_recepcion is 'Enchufe de IA.';
comment on column requerimientos_tramitacion.fecha_limite_respuesta is 'Enchufe de IA clave: alertar antes de que venza el plazo.';
comment on column requerimientos_tramitacion.horas_tecnico is 'Horas de tecnico consumidas en resolverlo (para futuro analisis de coste/rentabilidad y de que tecnico acumula mas requerimientos).';

create index idx_requerimientos_tramitacion_proyecto_id            on requerimientos_tramitacion (proyecto_id);
create index idx_requerimientos_tramitacion_etapa_proyecto_id      on requerimientos_tramitacion (etapa_proyecto_id);
create index idx_requerimientos_tramitacion_responsable_id         on requerimientos_tramitacion (responsable_id);
create index idx_requerimientos_tramitacion_fecha_recepcion        on requerimientos_tramitacion (fecha_recepcion);
create index idx_requerimientos_tramitacion_fecha_limite_respuesta on requerimientos_tramitacion (fecha_limite_respuesta);


-- =============================================================================
-- 4. AJUSTE SOBRE FASE 1: ampliar el check de proyectos.estado
-- proyectos.estado ya es text con check (tras la migracion de enums->check).
-- Debe permitir el ciclo completo, incluido el hueco "licencia concedida, obra
-- no iniciada". Recreamos el check anadiendo 'visado' y 'licencia_concedida'
-- (sin quitar los existentes).
-- =============================================================================
alter table proyectos drop constraint proyectos_estado_check;
alter table proyectos add constraint proyectos_estado_check
  check (estado in ('captacion','en_redaccion','visado','tramitando_licencia','licencia_concedida','en_obra','finalizado','parado','cancelado'));
comment on column proyectos.estado is 'Estado-resumen del proyecto (ciclo de vida completo). captacion, en_redaccion, visado (fin fase proyecto), tramitando_licencia, licencia_concedida (fin fase licencia; puede haber espera larga hasta obra), en_obra, finalizado, parado, cancelado. El detalle fino vive en etapas_proyecto.';


-- =============================================================================
-- 5. ROW LEVEL SECURITY (habilitado sin politicas; PENDIENTE definir politicas)
-- =============================================================================
alter table tecnicos                    enable row level security;
alter table etapas_proyecto             enable row level security;
alter table requerimientos_tramitacion  enable row level security;


-- =============================================================================
-- 6. ENGANCHES PREVISTOS (NO construir ahora — solo anotados)
--
-- - ARRANQUE AUTOMATICO:
--     la primera etapa de redaccion deberia crearse/activarse cuando el hito de
--     cobro del 50% pasa a 'cobrado' (enganche con Fase 2: hitos_facturacion /
--     cobros). Hoy se crea a mano.
--
-- - FASE DE OBRA (siguiente):
--     apertura de centro de trabajo, acta de inicio, visitas, incidencias,
--     precios contradictorios, fin de obra y consolidacion. Su tabla de
--     requerimientos seguira el patron comun pero con origen interno (los genera
--     Accesalia, salvo los precios contradictorios).
--
-- - CATALOGO DE ETAPAS POR TIPO DE PROYECTO:
--     ascensor, envolvente termica, memoria justificativa... cada uno con su
--     lista de etapas. Hoy la lista (etapas_proyecto.tipo_etapa) es comun.
--
-- - ENTIDAD tecnicos ENRIQUECIDA:
--     para el analisis de "mejor tecnico" (carga, tiempos, requerimientos
--     acumulados, bajas) y asignaciones mas finas.
--
-- - CAPA DE IA:
--     etapas_proyecto.fecha_estado, requerimientos_tramitacion.fecha_limite_respuesta
--     y etapas_proyecto.tasas_fecha_solicitud son los enchufes de alerta (etapa
--     parada demasiado tiempo, plazo de requerimiento a punto de vencer, tasas
--     solicitadas sin respuesta, licencia concedida y obra sin iniciar).
--
-- - TRIGGER actualizado_en (heredado):
--     no se autoactualiza en UPDATE (seria logica de aplicacion). PENDIENTE de
--     decidir con la propietaria de forma consistente en todo el esquema.
-- =============================================================================
