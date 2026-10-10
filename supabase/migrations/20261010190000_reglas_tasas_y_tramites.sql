-- =============================================================================
-- REGLAS DE TASAS Y FICHAS DE SOLICITUD (Monica, 10-oct-2026)
--
-- Dos cosas que se usan juntas:
--   reglas_tasas  COMO SE CALCULA cada tasa en cada sitio (para que la
--                 viabilidad las proponga y para consultarlas).
--   tramites      COMO SE PIDE una licencia o una DR ante cada organismo
--                 (ayuntamiento, junta, ECU: "sistemas diferentes"), con sus
--                 pasos y documentos.
-- Con las dos se genera la FICHA PARA LOS VECINOS.
--
-- HISTORICO (suyo): "conservar el obsoleto como referencia de lo que ya esta
-- emitido, pero usar solo el vigente para los calculos estimativos o
-- definitivos". Cuando un ayuntamiento cambia: se cierra la fila (vigente_hasta)
-- y se abre otra. Lo vigente = vigente_hasta is null.
--
-- Primer relleno: el barrido de expedientes 2024-2026 de los 7 municipios
-- grandes (docs/tasas-y-licencias-7-municipios.md), SIN VALIDAR.
-- Convencion: CHECK con nombre para lo fijo; tipos de obra, por tipos_proyecto
-- (una regla en una familia vale para sus hijos; sin ninguno = todas).
-- =============================================================================

create table reglas_tasas (
  id                      uuid primary key default gen_random_uuid(),
  creado_en               timestamptz not null default now(),
  actualizado_en          timestamptz not null default now(),
  municipio_id            uuid not null references municipios_catastro(id),
  organismo_id            uuid not null references organismos(id),
  concepto                text not null,
  subtipo                 text,
  via                     text not null default 'ambas',
  canal                   text not null default 'ambos',
  -- el calculo
  metodo                  text not null,
  base                    text not null,
  porcentaje              numeric(7,4),
  importe_fijo            numeric(12,2),
  importe_unidad          numeric(12,4),
  minimo                  numeric(12,2),
  maximo                  numeric(12,2),
  tramos                  jsonb,
  formula_texto           text,
  -- la bonificacion
  bonificacion_pct        numeric(5,2),
  bonificacion_alcance    text,
  bonificacion_forma      text,
  bonificacion_requisitos text,
  bonificacion_plazo      text,
  requiere_descargo       boolean not null default false,
  -- quien y cuando
  liquida                 text,
  momento                 text,
  validez_dias            integer,
  regulariza_al_final     boolean,
  aviso_vecinos           text,
  notas                   text,
  -- de donde sale
  normativa               text,
  evidencia               text,
  vigente_desde           date,
  vigente_hasta           date,
  validada                boolean not null default false,
  validada_por_id         uuid references equipo(id) on delete set null,
  validada_en             timestamptz,
  constraint reglas_tasas_concepto_check check (concepto in (
    'tasa_urbanistica', 'icio', 'precio_ecu', 'fianza_residuos', 'fianza_reposicion',
    'ocupacion_via_publica', 'calas_zanjas', 'garantia_demanial', 'otro')),
  constraint reglas_tasas_via_check check (via in ('licencia', 'declaracion_responsable', 'ambas')),
  constraint reglas_tasas_canal_check check (canal in ('directo', 'ecu', 'ambos')),
  constraint reglas_tasas_metodo_check check (metodo in (
    'porcentaje', 'cuota_fija', 'tramos', 'por_unidad', 'fijo_mas_unidad', 'segun_estudio_residuos', 'no_aplica')),
  constraint reglas_tasas_base_check check (base in (
    'pem', 'm2_afectados', 'm3_residuos', 'coste_gestion_residuos', 'm2_dia', 'ninguna')),
  constraint reglas_tasas_bonificacion_forma_check check (bonificacion_forma is null or bonificacion_forma in (
    'en_autoliquidacion', 'pago_reducido', 'devolucion_posterior', 'en_liquidacion')),
  constraint reglas_tasas_liquida_check check (liquida is null or liquida in (
    'autoliquidacion', 'emite_ayuntamiento', 'liquidacion_posterior', 'ecu')),
  constraint reglas_tasas_momento_check check (momento is null or momento in (
    'antes_de_presentar', 'al_presentar', 'tras_concesion', 'durante_obra', 'fin_de_obra')),
  constraint reglas_tasas_vigencia_check check (vigente_hasta is null or vigente_desde is null or vigente_hasta >= vigente_desde)
);

comment on table reglas_tasas is 'Como se calcula cada tasa/impuesto/fianza de una obra en cada municipio. Historico: la vigente es la de vigente_hasta nulo; las cerradas se conservan como referencia de lo ya emitido.';
comment on column reglas_tasas.organismo_id is 'Quien la cobra: el ayuntamiento, o la ECU (precio_ecu).';
comment on column reglas_tasas.subtipo is 'Cuando la tarifa depende de la clase de actuacion (Madrid: "1.d reestructuracion puntual").';
comment on column reglas_tasas.canal is 'Madrid: la TPSU solo si se tramita directo; por ECU se paga el precio de la ECU.';
comment on column reglas_tasas.tramos is 'Para metodo tramos: [{"desde": 0, "hasta": 50000, "importe": 530}, ...].';
comment on column reglas_tasas.formula_texto is 'La regla dicha con palabras, para la consulta y la ficha de vecinos.';
comment on column reglas_tasas.bonificacion_alcance is 'Sobre que se aplica: toda la cuota, o solo la parte de accesibilidad (Alcala).';
comment on column reglas_tasas.aviso_vecinos is 'El aviso que lleva en la ficha para los vecinos: "sujeta al calculo de residuos", "provisional, se regulariza con el coste final"...';
comment on column reglas_tasas.evidencia is 'Expediente(s) de Dropbox de donde sale.';

create table reglas_tasas_tipos (
  regla_id         uuid not null references reglas_tasas(id) on delete cascade,
  tipo_proyecto_id uuid not null references tipos_proyecto(id),
  primary key (regla_id, tipo_proyecto_id)
);
comment on table reglas_tasas_tipos is 'A que obras se aplica una regla. Una familia (Accesibilidad, Eficiencia energetica) vale para sus hijos. Sin filas = a todas.';

create table tramites (
  id                     uuid primary key default gen_random_uuid(),
  creado_en              timestamptz not null default now(),
  actualizado_en         timestamptz not null default now(),
  municipio_id           uuid not null references municipios_catastro(id),
  organismo_id           uuid not null references organismos(id),
  via                    text not null,
  canal                  text not null default 'directo',
  nombre                 text not null,
  donde_se_presenta      text,
  sede_url               text,
  quien_firma            text,
  plazo_tipico           text,
  habilita_inicio        text,
  requerimientos_tipicos text,
  avisos                 text,
  contacto_estado        text,
  normativa              text,
  evidencia              text,
  vigente_desde          date,
  vigente_hasta          date,
  validada               boolean not null default false,
  validada_por_id        uuid references equipo(id) on delete set null,
  validada_en            timestamptz,
  constraint tramites_via_check check (via in ('licencia', 'declaracion_responsable')),
  constraint tramites_canal_check check (canal in ('directo', 'ecu'))
);
comment on table tramites is 'Como se pide una licencia o DR ante un organismo (ayuntamiento, junta, ECU). Lo que se paga NO se repite aqui: sale de reglas_tasas segun su momento.';
comment on column tramites.organismo_id is 'Ante quien se tramita: el ayuntamiento, o la ECU si va por ECU.';
comment on column tramites.avisos is 'Los trucos: "caducan a los 10 dias", "ficheros de 8 caracteres como mucho"...';

create table tramites_tipos (
  tramite_id       uuid not null references tramites(id) on delete cascade,
  tipo_proyecto_id uuid not null references tipos_proyecto(id),
  primary key (tramite_id, tipo_proyecto_id)
);

create table tramite_pasos (
  id          uuid primary key default gen_random_uuid(),
  tramite_id  uuid not null references tramites(id) on delete cascade,
  orden       integer not null,
  texto       text not null,
  notas       text
);

create table tramite_documentos (
  id                uuid primary key default gen_random_uuid(),
  tramite_id        uuid not null references tramites(id) on delete cascade,
  orden             integer not null,
  nombre            text not null,
  tipo_documento_id uuid references tipos_documento(id),
  obligatorio       boolean not null default true,
  notas             text
);

create trigger trg_set_actualizado_en before update on reglas_tasas for each row execute function set_actualizado_en();
create trigger trg_set_actualizado_en before update on tramites for each row execute function set_actualizado_en();

alter table reglas_tasas enable row level security;
alter table reglas_tasas_tipos enable row level security;
alter table tramites enable row level security;
alter table tramites_tipos enable row level security;
alter table tramite_pasos enable row level security;
alter table tramite_documentos enable row level security;
