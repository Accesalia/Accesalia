-- =============================================================================
-- ERP Accesalia — Fase 4: Obra (ejecucion, visitas, incidencias, fin de obra)
--
-- Amplia la BD con el area de obra: desde la apertura de centro de trabajo y el
-- acta de inicio, pasando por las visitas de la direccion facultativa, hasta el
-- fin de obra y el CFO. Las Fases 1, 2 y 3 ya existen. Esta migracion NO toca lo
-- anterior (solo referencia proyectos y tecnicos por FK).
--
-- Alcance: SOLO esquema de datos (tablas, columnas, FKs, checks, unica, indices),
-- comentarios y RLS sin politicas.
--
-- Fuera de alcance (ver notas al final): calculo automatico del calendario optimo
-- de visitas (IA), extraccion automatica desde actas (voz/escaneo), CAES y
-- comisiones.
--
-- Convenciones: nombres en espanol sin tildes/enes; PK id uuid; creado_en/
-- actualizado_en timestamptz default now(); FKs <tabla_singular>_id.
-- SIN ENUMS: conjuntos cerrados como text + check NOMBRADO (<tabla>_<columna>_check).
-- Indices en FKs y fechas de alerta. RLS sin politicas. Importes numeric(12,2).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.6 fases_obra_catalogo
-- Se crea primero porque visitas_obra la referencia (fase_obra_id).
-- Catalogo de fases tipicas por tipo de obra. Aqui solo la ESTRUCTURA; las fases
-- concretas y sus cadencias se rellenan mas adelante (no se inventan).
-- -----------------------------------------------------------------------------
create table fases_obra_catalogo (
  id                       uuid        primary key default gen_random_uuid(),
  creado_en                timestamptz not null default now(),
  actualizado_en           timestamptz not null default now(),
  tipo_actuacion           text        not null,
  nombre_fase              text        not null,
  orden                    integer     not null,
  criticidad               text        not null,
  dias_desde_inicio_aprox  integer,
  notas                    text,
  constraint fases_obra_catalogo_tipo_actuacion_check
    check (tipo_actuacion in ('ascensor','rampa','sate_completo','sate_fachada','sate_cubierta','mixto','otra')),
  constraint fases_obra_catalogo_criticidad_check
    check (criticidad in ('alta','media','baja'))
);

comment on table fases_obra_catalogo is 'Catalogo de las fases tipicas de cada tipo de obra, con cadencia y criticidad. Alimenta el futuro calculo del calendario optimo de visitas (IA). En esta fase se crea la estructura; las fases concretas se rellenan despues, con el criterio de quien hace las visitas. No se inventan las cadencias.';
comment on column fases_obra_catalogo.tipo_actuacion is 'Mismos valores que proyectos.tipo_actuacion.';
comment on column fases_obra_catalogo.nombre_fase is 'Ej. "apertura de foso", "montera", "remates SATE".';
comment on column fases_obra_catalogo.orden is 'Posicion en la secuencia tipica.';
comment on column fases_obra_catalogo.criticidad is 'alta = momento critico que exige visita (foso, remates); baja = poca atencion (espera de maquina).';
comment on column fases_obra_catalogo.dias_desde_inicio_aprox is 'Estimacion de cuando llega esta fase desde el inicio, para proyectar visitas.';

create index idx_fases_obra_catalogo_tipo_actuacion on fases_obra_catalogo (tipo_actuacion);


-- -----------------------------------------------------------------------------
-- 3.1 obras
-- La ejecucion fisica de un proyecto. Se crea al concederse la licencia, en
-- estado pendiente_inicio.
-- -----------------------------------------------------------------------------
create table obras (
  id                              uuid        primary key default gen_random_uuid(),
  creado_en                       timestamptz not null default now(),
  actualizado_en                  timestamptz not null default now(),
  proyecto_id                     uuid        not null references proyectos (id),
  estado                          text        not null default 'pendiente_inicio',
  fecha_estado                    timestamptz,
  fecha_apertura_centro_trabajo   date,
  fecha_acta_inicio               date,
  fecha_fin_obra                  date,
  jefe_obra                       text,
  plazo_ejecucion_meses           integer,
  url_acta_inicio                 text,
  url_apertura_centro             text,
  constraint obras_estado_check
    check (estado in ('pendiente_inicio','en_curso','paralizada','finalizada','cancelada'))
);

comment on table obras is 'Ejecucion fisica de un proyecto. Se crea al concederse la licencia (Fase 3), en estado pendiente_inicio, aunque el arranque real puede tardar semanas o meses (contrata sin cuadrilla, espera de subvencion/financiacion, recurso de un vecino).';
comment on column obras.estado is 'pendiente_inicio (licencia concedida, obra sin arrancar), en_curso, paralizada, finalizada, cancelada.';
comment on column obras.fecha_estado is 'Enchufe de IA: cuando entro en el estado actual (para "licencia concedida hace X y obra sin iniciar", "paralizada hace X").';
comment on column obras.fecha_apertura_centro_trabajo is 'Tramite con la contrata ante la autoridad laboral.';
comment on column obras.fecha_acta_inicio is 'Acta de replanteo/comienzo (Ley 38/1999). Marca el arranque real de la obra.';
comment on column obras.jefe_obra is 'Persona de la contrata al frente (ej. "Jose Olivares").';
comment on column obras.plazo_ejecucion_meses is 'Plazo previsto, para detectar retrasos.';

create index idx_obras_proyecto_id                   on obras (proyecto_id);
create index idx_obras_fecha_estado                  on obras (fecha_estado);
create index idx_obras_fecha_acta_inicio             on obras (fecha_acta_inicio);
create index idx_obras_fecha_apertura_centro_trabajo on obras (fecha_apertura_centro_trabajo);


-- -----------------------------------------------------------------------------
-- 3.2 visitas_obra
-- Cada visita de la direccion facultativa genera un acta. El conjunto de actas es
-- el libro de ordenes legal; por eso se conserva el texto integro.
-- -----------------------------------------------------------------------------
create table visitas_obra (
  id                uuid        primary key default gen_random_uuid(),
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  obra_id           uuid        not null references obras (id),
  numero            integer,
  fecha_visita      date        not null,
  autor_tecnico_id  uuid        references tecnicos (id),
  fase_obra_id      uuid        references fases_obra_catalogo (id),
  texto_acta        text        not null,
  url_pdf_acta      text,
  url_fotos         text
);

comment on table visitas_obra is 'Cada visita de la direccion facultativa. Genera un acta. El conjunto de actas sustituye legalmente al libro de ordenes: registro de todo lo ordenado a la constructora y aceptado por ella. Se conserva el texto integro.';
comment on column visitas_obra.numero is 'Numero de acta (1, 2, 3...).';
comment on column visitas_obra.autor_tecnico_id is 'Quien hizo la visita (tecnicos, Fase 3).';
comment on column visitas_obra.fase_obra_id is 'En que fase estaba la obra en esa visita (fases_obra_catalogo).';
comment on column visitas_obra.texto_acta is 'Relato en prosa completo de la visita, conservado integro (estado de avance + lo observado). Base para la futura extraccion automatica de incidencias/instrucciones.';
comment on column visitas_obra.url_fotos is 'Enlace a la carpeta/album de fotos de la visita.';

create index idx_visitas_obra_obra_id          on visitas_obra (obra_id);
create index idx_visitas_obra_autor_tecnico_id on visitas_obra (autor_tecnico_id);
create index idx_visitas_obra_fase_obra_id     on visitas_obra (fase_obra_id);
create index idx_visitas_obra_fecha_visita     on visitas_obra (fecha_visita);


-- -----------------------------------------------------------------------------
-- 3.3 incidencias_obra
-- Lo que surge mal o imprevisto. Puede obligar a rehacer parte del proyecto. Si
-- conlleva coste no presupuestado, es un precio contradictorio.
-- -----------------------------------------------------------------------------
create table incidencias_obra (
  id                        uuid          primary key default gen_random_uuid(),
  creado_en                 timestamptz   not null default now(),
  actualizado_en            timestamptz   not null default now(),
  obra_id                   uuid          not null references obras (id),
  visita_obra_id            uuid          references visitas_obra (id),
  descripcion               text          not null,
  tipo                      text          not null,
  requiere_rehacer_proyecto boolean       not null default false,
  es_precio_contradictorio  boolean       not null default false,
  importe_contradictorio    numeric(12,2),
  estado                    text          not null default 'abierta',
  fecha_deteccion           date,
  fecha_resolucion          date,
  constraint incidencias_obra_tipo_check
    check (tipo in ('imprevisto_ejecucion','dano_a_vivienda','hallazgo_estructural','paralizacion','derribo','otro')),
  constraint incidencias_obra_estado_check
    check (estado in ('abierta','en_resolucion','resuelta'))
);

comment on table incidencias_obra is 'Lo que surge mal o imprevisto durante la obra (fuga al picar, viga maestra en el foso, trastero afectado). Puede obligar a rehacer parte del proyecto. Si conlleva coste no presupuestado, es un precio contradictorio.';
comment on column incidencias_obra.visita_obra_id is 'La visita en que se detecto (nullable).';
comment on column incidencias_obra.requiere_rehacer_proyecto is 'Si obliga a trabajo de arquitecto (recalculo, replanteo).';
comment on column incidencias_obra.es_precio_contradictorio is 'Si conlleva una partida economica no presupuestada.';
comment on column incidencias_obra.importe_contradictorio is 'Importe de la partida, si aplica; para la consolidacion final de facturacion (cierre_obra).';

create index idx_incidencias_obra_obra_id        on incidencias_obra (obra_id);
create index idx_incidencias_obra_visita_obra_id on incidencias_obra (visita_obra_id);
create index idx_incidencias_obra_fecha_deteccion on incidencias_obra (fecha_deteccion);


-- -----------------------------------------------------------------------------
-- 3.4 instrucciones_obra
-- Ordenes/subsanaciones de la direccion facultativa a la contrata. Se arrastran
-- entre visitas hasta cerrarse. Bloquean el CFO.
-- -----------------------------------------------------------------------------
create table instrucciones_obra (
  id                  uuid        primary key default gen_random_uuid(),
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  obra_id             uuid        not null references obras (id),
  visita_obra_id      uuid        references visitas_obra (id),
  descripcion         text        not null,
  estado              text        not null default 'pendiente',
  fecha_orden         date,
  fecha_comprobacion  date,
  bloquea_cfo         boolean     not null default true,
  constraint instrucciones_obra_estado_check
    check (estado in ('pendiente','hecho','falta_por_hacer','no_comprobado'))
);

comment on table instrucciones_obra is 'Ordenes/subsanaciones que la direccion facultativa da a la contrata. Se arrastran de una visita a la siguiente hasta cerrarse. Son las que bloquean el CFO (no se emite mientras queden subsanaciones abiertas que bloqueen).';
comment on column instrucciones_obra.visita_obra_id is 'La visita en que se ordeno por primera vez (nullable).';
comment on column instrucciones_obra.descripcion is 'La orden concreta (ej. "modificar el liston de esquina en planta baja").';
comment on column instrucciones_obra.estado is 'Seguimiento visita a visita tal como aparece en las actas: pendiente, hecho, falta_por_hacer, no_comprobado.';
comment on column instrucciones_obra.fecha_comprobacion is 'Ultima vez que se comprobo su estado.';
comment on column instrucciones_obra.bloquea_cfo is 'Si estar abierta impide emitir el CFO.';

create index idx_instrucciones_obra_obra_id        on instrucciones_obra (obra_id);
create index idx_instrucciones_obra_visita_obra_id on instrucciones_obra (visita_obra_id);
create index idx_instrucciones_obra_fecha_orden    on instrucciones_obra (fecha_orden);


-- -----------------------------------------------------------------------------
-- 3.5 requerimientos_obra
-- Patron comun de requerimiento, pero con ORIGEN INTERNO (los genera Accesalia,
-- salvo los precios contradictorios). Separados de los de tramitacion (COAM/
-- licencia) porque su origen y gestion difieren.
-- -----------------------------------------------------------------------------
create table requerimientos_obra (
  id               uuid          primary key default gen_random_uuid(),
  creado_en        timestamptz   not null default now(),
  actualizado_en   timestamptz   not null default now(),
  obra_id          uuid          not null references obras (id),
  descripcion      text          not null,
  origen           text          not null,
  tipo_resolucion  text          not null default 'sin_determinar',
  responsable_id   uuid          references tecnicos (id),
  fecha_apertura   date          not null,
  fecha_limite     date,
  estado           text          not null default 'abierto',
  fecha_cierre     date,
  horas_tecnico    numeric(6,2),
  constraint requerimientos_obra_origen_check
    check (origen in ('direccion_facultativa','contrata','comunidad','otro')),
  constraint requerimientos_obra_tipo_resolucion_check
    check (tipo_resolucion in ('administrativa','tecnica','sin_determinar')),
  constraint requerimientos_obra_estado_check
    check (estado in ('abierto','en_resolucion','respondido','cerrado'))
);

comment on table requerimientos_obra is 'Requerimientos de la fase de obra (patron comun) con origen interno: normalmente los genera Accesalia (paralizacion, orden de derribo, subsanacion), salvo los precios contradictorios que surgen de la ejecucion. Separados de requerimientos_tramitacion por su origen y gestion.';
comment on column requerimientos_obra.origen is 'Quien lo genera: direccion_facultativa, contrata, comunidad, otro.';
comment on column requerimientos_obra.tipo_resolucion is 'administrativa, tecnica o sin_determinar (una persona lo decide). Default sin_determinar.';
comment on column requerimientos_obra.fecha_limite is 'Enchufe de IA: plazo a vigilar.';

create index idx_requerimientos_obra_obra_id        on requerimientos_obra (obra_id);
create index idx_requerimientos_obra_responsable_id on requerimientos_obra (responsable_id);
create index idx_requerimientos_obra_fecha_apertura on requerimientos_obra (fecha_apertura);
create index idx_requerimientos_obra_fecha_limite   on requerimientos_obra (fecha_limite);


-- -----------------------------------------------------------------------------
-- 3.7 cierre_obra
-- Cierre formal: memoria de fin de obra, consolidacion de facturacion y CFO.
-- Una fila por obra (obra_id unico).
-- -----------------------------------------------------------------------------
create table cierre_obra (
  id                       uuid          primary key default gen_random_uuid(),
  creado_en                timestamptz   not null default now(),
  actualizado_en           timestamptz   not null default now(),
  obra_id                  uuid          not null references obras (id),
  fecha_memoria_fin_obra   date,
  url_memoria_fin_obra     text,
  presupuesto_aceptado     numeric(12,2),
  total_final_pagado       numeric(12,2),
  facturacion_consolidada  boolean       not null default false,
  cfo_emitido              boolean       not null default false,
  fecha_cfo                date,
  url_cfo                  text,
  constraint uq_cierre_obra_obra unique (obra_id)
);

comment on table cierre_obra is 'Cierre formal de la obra: memoria de fin de obra, consolidacion de facturacion y CFO. Una fila por obra.';
comment on column cierre_obra.presupuesto_aceptado is 'El presupuesto pactado originalmente.';
comment on column cierre_obra.total_final_pagado is 'Lo finalmente pagado, incluidos precios contradictorios (incidencias_obra.importe_contradictorio).';
comment on column cierre_obra.facturacion_consolidada is 'Si ya cuadro la consolidacion de facturacion.';
comment on column cierre_obra.cfo_emitido is 'Certificado Final de Obra emitido. REGLA DE NEGOCIO (no implementada como trigger ahora): no deberia poder marcarse true mientras existan instrucciones_obra con bloquea_cfo=true y estado distinto de hecho.';
comment on constraint uq_cierre_obra_obra on cierre_obra is 'Una fila de cierre por obra.';

create index idx_cierre_obra_obra_id on cierre_obra (obra_id);


-- =============================================================================
-- 4. ROW LEVEL SECURITY (habilitado sin politicas; PENDIENTE definir politicas)
-- =============================================================================
alter table fases_obra_catalogo  enable row level security;
alter table obras                enable row level security;
alter table visitas_obra         enable row level security;
alter table incidencias_obra     enable row level security;
alter table instrucciones_obra   enable row level security;
alter table requerimientos_obra  enable row level security;
alter table cierre_obra          enable row level security;


-- =============================================================================
-- 5. ENGANCHES PREVISTOS (NO construir ahora — solo anotados)
--
-- - ARRANQUE DE LA OBRA:
--     obras deberia crearse automaticamente en pendiente_inicio cuando la etapa
--     concesion_licencia (Fase 3, etapas_proyecto) se completa. Hoy se crea a mano.
--
-- - CALENDARIO OPTIMO DE VISITAS:
--     la IA cruzara fases_obra_catalogo + obras.fecha_acta_inicio + fase actual +
--     fiabilidad de la contrata (contratas.notas_fiabilidad) para proponer cuando
--     visitar. Principio: lo importante no puede quedar sepultado por lo urgente
--     (una obra facil que lleva meses sin visita debe alertar igual).
--
-- - EXTRACCION AUTOMATICA DESDE ACTAS:
--     voz/escaneo -> estructurar incidencias e instrucciones a partir de
--     visitas_obra.texto_acta, conservando el original integro.
--
-- - CONSOLIDACION DE FACTURACION:
--     enganche con Fase 2 — los incidencias_obra.importe_contradictorio alimentan
--     el cuadre entre cierre_obra.presupuesto_aceptado y total_final_pagado.
--
-- - BLOQUEO DEL CFO:
--     validar que no queden instrucciones_obra abiertas que bloqueen (bloquea_cfo
--     = true y estado <> hecho) antes de permitir cierre_obra.cfo_emitido = true.
--     No implementado como trigger en esta fase.
--
-- - CAPA DE IA:
--     obras.fecha_estado, visitas_obra.fecha_visita, requerimientos_obra.fecha_limite
--     e instrucciones_obra abiertas son los enchufes de alerta (obra sin iniciar,
--     sin visitar hace demasiado, paralizada, subsanaciones estancadas, CFO bloqueado).
--
-- - TRIGGER actualizado_en (heredado):
--     no se autoactualiza en UPDATE (seria logica de aplicacion). PENDIENTE de
--     decidir con la propietaria de forma consistente en todo el esquema.
-- =============================================================================
