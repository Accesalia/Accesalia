-- =============================================================================
-- ERP Accesalia — Area de PROYECTO (produccion tecnica) — MODELO HIBRIDO
--
-- La migracion de Monday es una AUDITORIA del modelo: teniamos el esqueleto de
-- fase 1 (proyectos + etapas_proyecto + requerimientos_tramitacion + tecnicos +
-- personal_interno, todo vacio) y el modelo reciente. Este archivo funde lo mejor
-- de cada uno en un tercer modelo, en vez de elegir "el suyo" o "el nuestro".
--
-- Principio de datos: se guardan HECHOS (fechas, estados, importes, horas); las
-- METRICAS (tiempo, desviacion, vencidos, totales, "proyectos abiertos") se
-- calculan al vuelo. NO se importan los mirrors precalculados de Monday.
--
-- Decisiones hibridas:
--   proyectos: se REFORMA (no se recrea). estado = produccion; +hoja +gate +tipo
--              (crudo, catalogo despues) +cee_estado +revision_estado (OK daniel).
--   etapas_proyecto: se REUSA como los PASOS. Se conserva su orden y su vocabulario
--              de estado (incl. 'reabierta' = re-escaneo, 'no_aplica'); responsable
--              repuntado a `equipo` (+ nombre crudo) y +fecha_prevista (desviacion).
--   requerimientos_tramitacion: se ELEVA a tabla unica de revisiones/requerimientos
--              (interna Daniel + externa COAM/ayto). +origen 'revision_interna' +ronda.
--   personas: `equipo` es la unica tabla -> se retiran `tecnicos` y `personal_interno`.
-- =============================================================================

-- ---- 0. Limpiar el arbol de seeds de prueba de fase 1 (el proyecto "Proy" y todo
--         lo que cuelga: obra+cierre, licitacion+pptos, caes+hijos). Hojas primero. ----
delete from cierre_obra;
delete from presupuestos_licitacion;
delete from contratos_caes;
delete from ofertas_caes;
delete from beneficiarios_reparto_caes;
delete from facturas_caes;
delete from requerimientos_caes;
delete from obras;
delete from licitaciones;
delete from operaciones_caes;
delete from etapas_proyecto;
delete from requerimientos_tramitacion;
delete from proyectos;

-- ---- 1. Reformar `proyectos` (produccion) ----
alter table proyectos drop constraint if exists proyectos_estado_check;
alter table proyectos drop constraint if exists proyectos_tipo_actuacion_check;
alter table proyectos
  drop column if exists nombre,
  drop column if exists tipo_actuacion,
  drop column if exists comision_administrador,
  drop column if exists fecha_inicio_obra,
  drop column if exists fecha_fin_obra;
alter table proyectos
  add column hoja_encargo_id uuid references hojas_encargo(id),
  add column tipo text,                                 -- crudo de Monday (catalogo de tipos: despues)
  add column fecha_contratado date,
  add column condicion_arranque text,                   -- gate describible (cobro/OC/nº pedido/firma...)
  add column arranque_cumplido boolean not null default false,
  add column arranque_referencia text,
  add column arranque_fecha date,
  add column cee_estado text,                           -- CEE inicial/previsto
  add column revision_estado text;                      -- rollup del OK de Daniel (detalle en requerimientos)
alter table proyectos alter column estado set default 'no_asignado';
alter table proyectos
  add constraint proyectos_estado_check
    check (estado in ('no_procede','no_asignado','ea_listo','en_curso','en_pausa','listo')),
  add constraint proyectos_cee_estado_check
    check (cee_estado is null or cee_estado in ('pendiente','listo','no_requerido')),
  add constraint proyectos_revision_estado_check
    check (revision_estado is null or revision_estado in ('pendiente','en_cola','ok','corrigiendo','no_requerido'));
comment on column proyectos.estado is 'Produccion: no_procede | no_asignado | ea_listo | en_curso | en_pausa | listo. El estado transversal ("proyectos abiertos") se calcula al vuelo.';
comment on column proyectos.condicion_arranque is 'Puerta economica que desbloquea el arranque (describible: cobro real / orden de compra / nº pedido / firma HE...).';
comment on column proyectos.revision_estado is 'Rollup de la revision interna de Daniel (OK daniel de Monday). El detalle de rondas/cambios vive en requerimientos_tramitacion (origen=revision_interna).';

-- ---- 2. Reformar `etapas_proyecto` como los PASOS de produccion ----
alter table etapas_proyecto drop constraint if exists etapas_proyecto_responsable_tecnico_id_fkey;
alter table etapas_proyecto
  add constraint etapas_proyecto_responsable_equipo_fkey
    foreign key (responsable_tecnico_id) references equipo(id);
alter table etapas_proyecto
  add column responsable_nombre text,     -- nombre crudo de Monday (el string es el dato; no se fusiona)
  add column fecha_prevista date;         -- para calcular desviacion (real vs prevista) al vuelo
comment on column etapas_proyecto.tipo_etapa is 'Clave del paso (escaneo, montaje_nube, estado_actual, proyecto...). Catalogo vivo en pasos_catalogo.';
comment on column etapas_proyecto.estado is 'pendiente | en_curso | terminada | reabierta (p.ej. re-escaneo) | no_aplica.';
comment on column etapas_proyecto.responsable_nombre is 'Nombre crudo de Monday. responsable_tecnico_id enlaza a equipo solo cuando la identidad es clara (grafia distinta = persona distinta).';

-- ---- 3. Elevar `requerimientos_tramitacion` a revisiones/requerimientos (interno + externo) ----
alter table requerimientos_tramitacion drop constraint if exists requerimientos_tramitacion_responsable_id_fkey;
alter table requerimientos_tramitacion
  add constraint requerimientos_tramitacion_responsable_equipo_fkey
    foreign key (responsable_id) references equipo(id);
alter table requerimientos_tramitacion drop constraint if exists requerimientos_tramitacion_origen_check;
alter table requerimientos_tramitacion
  add constraint requerimientos_tramitacion_origen_check
    check (origen in ('revision_interna','coam','ayuntamiento','ecu','otro'));
alter table requerimientos_tramitacion
  add column ronda integer not null default 1,
  add column responsable_nombre text;
comment on table requerimientos_tramitacion is 'Revisiones y requerimientos con rondas. origen=revision_interna es la revision de Daniel (descripcion = QUE se cambio, dato para IA de rendimiento); coam/ayuntamiento/ecu son los externos de visado/licencia.';

-- ---- 4. Consolidacion de personas en `equipo`: incremental, no aqui ----
-- `tecnicos` y `personal_interno` estan tejidas en 9 tablas de areas aun no
-- construidas (visitas_obra, requerimientos_obra, escaneos_polycam, modelos_3d_venta,
-- conocimiento_operativo, extracciones_convocatoria, uso_llm...). Para PROYECTO ya
-- hemos repuntado sus 2 enlaces a `equipo` (pasos 2 y 3). El resto se repunta y las
-- tablas viejas se retiran cuando montemos cada area (una cosa a la vez).

-- ---- 5. Catalogo vivo de pasos ----
create table pasos_catalogo (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  clave text not null unique,
  nombre text not null,
  orden integer,
  activo boolean not null default true
);
comment on table pasos_catalogo is 'Catalogo editable de los pasos de produccion (evoluciona por mejora continua). etapas_proyecto.tipo_etapa referencia su clave.';
create trigger trg_set_actualizado_en before update on pasos_catalogo for each row execute function set_actualizado_en();
alter table pasos_catalogo enable row level security;

insert into pasos_catalogo (clave, nombre, orden) values
  ('escaneo',       'Escaneo FARO (campo)',        10),
  ('montaje_nube',  'Montaje y alineado de nube',  20),
  ('estado_actual', 'Estado actual (Revit)',       30),
  ('proyecto',      'Solucion / proyecto',         40);

-- ---- 6. Ex-empleados que hicieron proyectos (tablero 4). Arquitectos, inactivos. ----
--        OJO: "Carlos Alberto" de Monday = Carlos Daza (ya en equipo), NO se anade.
insert into equipo (nombre, es_arquitecto, titulacion, activo, notas) values
  ('Jose Luis', true, 'arquitecto', false, 'Ex-empleado. Mismo puesto que Marta hoy (obra/DF).'),
  ('Indira',    true, 'arquitecto', false, 'Ex-empleado. Estado actual.'),
  ('Santiago',  true, 'arquitecto', false, 'Ex-empleado. Estado actual.'),
  ('Julio',     true, 'arquitecto', false, 'Ex-empleado. Proyecto.'),
  ('Susana',    true, 'arquitecto', false, 'Ex-empleado. Proyecto.'),
  ('Jhonatan',  true, 'arquitecto', false, 'Ex-empleado. Proyecto. (distinto de Jonatan)'),
  ('Jonatan',   true, 'arquitecto', false, 'Ex-empleado. Proyecto. (distinto de Jhonatan)'),
  ('Fernan',    true, 'arquitecto', false, 'Ex-empleado. Proyecto.'),
  ('Enrique',   true, 'arquitecto', false, 'Ex-empleado. Proyecto.'),
  ('Dennis',    true, 'arquitecto', false, 'Ex-empleado. Proyecto.'),
  ('Alejandro', true, 'arquitecto', false, 'Ex-empleado. Proyecto. (distinto de Alejandra/Alexandra)'),
  ('Karla',     true, 'arquitecto', false, 'Ex-empleado. Proyecto. (arquitecta; distinta de Carla, delineante actual)'),
  ('Javier',    true, 'arquitecto', false, 'Ex-empleado. Proyecto.'),
  ('Paloma',    true, 'arquitecto', false, 'Ex-empleado. Proyecto.'),
  ('Dario',     true, 'arquitecto', false, 'Ex-empleado. Proyecto.'),
  ('Leandro',   true, 'arquitecto', false, 'Ex-empleado. Proyecto.');

insert into equipo_funciones (equipo_id, funcion_id)
select e.id, f.id
from (values
  ('Jose Luis','df'), ('Indira','estado_actual'), ('Santiago','estado_actual'),
  ('Julio','proyecto'), ('Susana','proyecto'), ('Jhonatan','proyecto'), ('Jonatan','proyecto'),
  ('Fernan','proyecto'), ('Enrique','proyecto'), ('Dennis','proyecto'), ('Alejandro','proyecto'),
  ('Karla','proyecto'), ('Javier','proyecto'), ('Paloma','proyecto'), ('Dario','proyecto'), ('Leandro','proyecto')
) as v(nombre, clave)
join equipo e on e.nombre = v.nombre
join funciones f on f.clave = v.clave;
