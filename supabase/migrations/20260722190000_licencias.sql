-- =============================================================================
-- ERP Accesalia — Fase LICENCIA (capa 1: ficha de tramitacion)
--
-- Migra del board Monday "6 LICENCIAS / DR" (516 items). Hermana de visado pero
-- mas rica. La via (entidad ayto/ecu + modalidad DR/licencia) YA vive en el
-- proyecto; board 6 la COMPLETA (los 87 ECU reales, no los 11 que trajo visado).
--
-- Dominio (propietaria 2026-07-22):
--   · Matriz 2x2: ayuntamiento/ecu x licencia/DR.
--   · LICENCIA: el ayto autoriza y se responsabiliza (largo, 15-18 meses, muchos RQ).
--     DR: el arquitecto se responsabiliza (plazo 0, arranque inmediato) pero el ayto
--     puede revisarla hasta despues de la obra -> riesgo. Por eso el GATE DR: no se
--     inicia obra por DR sin OK del tecnico (verbal/escrito) o exencion firmada.
--   · Compromiso: no se pide licencia hasta que concedan la subvencion.
--   · "La tramitan ellos": la gestiona la comunidad/administrador (proyecto SI es
--     nuestro; solo la gestion la hacen ellos).
--   · 3 tasas SIEMPRE: tasa licencia, ICIO (a menudo bonificado, hay que pedirlo),
--     residuos. Importe = %sobre PEM por ayuntamiento (motor = capa 3). En Monday
--     son banderas SI/NO -> aqui aplica + importe (a rellenar).
--   · Requerimientos = el punto critico (sistema aparte, sprint propio).
-- =============================================================================

-- PEM del proyecto (raiz de las 3 tasas). Origen dual: ~80% de nuestro proyecto,
-- ~20% viene en un presupuesto de contrata al que hay que ajustarse.
alter table proyectos
  add column requiere_licencia boolean not null default true,   -- no se pide / cancelada: false
  add column pem numeric(12, 2),                                 -- presupuesto de ejecucion material
  add column pem_origen text;                                    -- nuestro | contrata
alter table proyectos
  add constraint proyectos_pem_origen_check
    check (pem_origen is null or pem_origen in ('nuestro', 'contrata'));
comment on column proyectos.requiere_licencia is 'Si la obra necesita licencia/DR. No se pide licencia o cancelada: false.';
comment on column proyectos.pem is 'Presupuesto de ejecucion material (€). Raiz de las 3 tasas de licencia.';
comment on column proyectos.pem_origen is 'De donde sale el PEM: nuestro (proyecto/memoria, ~80%) | contrata (presupuesto de contrata aprobado al que ajustarse, ~20%). La viabilidad comercial NO usa PEM (estimacion con disclaimer).';

create table licencias (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  estado text not null default 'pendiente_definir',   -- ver check
  tipo_tramite text,                                    -- licencia|dr|consulta_urbanistica|orden_ejecucion_ite
  tramitada_por text not null default 'nosotros',       -- nosotros | ellos (la comunidad/administrador)
  organismo text,                                       -- ayto/junta de distrito, o ECU concreta (Actecu/EICi)
  tecnico_ayto text,                                    -- tecnico asignado del ayto/junta (si se sabe)
  fecha_registro_ayto date,                             -- fecha de registro de la solicitud
  fecha_aprobacion date,                                -- fecha de aprobacion/OK
  enlace_doc text,                                      -- enlace al OK/licencia (doc maestro)
  -- las 3 tasas: aplica (SI/NO) + importe (calculo PEM% en capa 3)
  tasa_licencia_aplica boolean,
  tasa_licencia_importe numeric(10, 2),
  icio_aplica boolean,
  icio_bonificacion boolean not null default false,     -- se solicito la bonificacion del ICIO
  icio_importe numeric(10, 2),
  residuos_aplica boolean,
  residuos_importe numeric(10, 2),
  -- gate DR (protege al arquitecto): permite arrancar obra por DR
  inicio_dr_autorizado text,                            -- null | ok_verbal | ok_escrito | exencion_firmada
  espera_subvencion boolean not null default false,     -- 'compromiso': espera a que concedan la subvencion
  tramita_equipo_id uuid references equipo(id),         -- normalmente Adriana
  pausado boolean not null default false,               -- overlay
  notas text,
  constraint licencias_estado_check
    check (estado in ('pendiente_definir', 'compromiso', 'solicitada', 'requerido', 'aprobada')),
  constraint licencias_tipo_tramite_check
    check (tipo_tramite is null or tipo_tramite in ('licencia', 'dr', 'consulta_urbanistica', 'orden_ejecucion_ite')),
  constraint licencias_tramitada_por_check
    check (tramitada_por in ('nosotros', 'ellos')),
  constraint licencias_inicio_dr_check
    check (inicio_dr_autorizado is null or inicio_dr_autorizado in ('ok_verbal', 'ok_escrito', 'exencion_firmada'))
);
comment on table licencias is 'Licencias/DR de obra (ayto o ECU). 1 proyecto -> N (por si se re-tramita). Guarda hechos: tipo, fechas, tasas, doc. El calculo de tasas (PEM%) y el sistema de requerimientos van aparte.';
comment on column licencias.estado is 'pendiente_definir (licencia o DR sin decidir) -> compromiso (espera subvencion) -> solicitada -> (requerido) -> aprobada.';
comment on column licencias.tipo_tramite is 'Que se presenta: licencia | dr | consulta_urbanistica | orden_ejecucion_ite. La modalidad planeada vive en proyectos.modalidad_licencia.';
comment on column licencias.inicio_dr_autorizado is 'Gate DR: que permite arrancar obra por DR -> ok_verbal | ok_escrito (del tecnico del ayto) | exencion_firmada (comunidad/contrata asumen el riesgo).';

create index idx_licencias_proyecto on licencias(proyecto_id);
create index idx_licencias_tramita on licencias(tramita_equipo_id);

create trigger trg_set_actualizado_en before update on licencias for each row execute function set_actualizado_en();
alter table licencias enable row level security;
