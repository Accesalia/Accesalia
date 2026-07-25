-- =============================================================================
-- ERP Accesalia — Area de FACTURACION (tracker, no emisor)
--
-- Decidido (propietaria 2026-07-21): el ERP SIGUE el estado del cobro y calcula
-- rentabilidad/alertas; los documentos fiscales (factura, abono, IVA) los emite
-- el software de contabilidad (Factusol). El ERP referencia, no emite.
--
-- Modelo:
--   hoja
--    └─ lineas_facturacion  (1 por concepto: importe fijo o % [PRG], contrata pagadora)
--        ├─ hitos_cobro     (hito, importe/%, estado pendiente->facturado->cobrado->[devuelto|anulado])
--        │   └─ gestiones_cobro (mail/llamada/carta -> alertas)
--        └─ (renegociacion: plan_pago_historial, ver abajo)
-- =============================================================================

-- ---- Lineas de facturacion (por concepto de la hoja) ----
create table lineas_facturacion (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  hoja_encargo_id uuid not null references hojas_encargo(id),
  concepto_hoja_id uuid references conceptos_hoja(id),   -- traza al concepto exacto (opcional)
  bloque_id uuid references bloques(id),                 -- tipo de concepto (PRY/CSS/DF/SUBV...)
  descripcion text,                                      -- etiqueta libre ("PRY", "CSS FAIN"...)
  importe numeric,                                        -- importe fijo del concepto
  es_porcentaje boolean not null default false,          -- true si es un % (PRG) en vez de importe fijo
  porcentaje numeric,                                    -- el % si es_porcentaje (ej. 5, 3)
  base_porcentaje text,                                  -- sobre que aplica el % ("concesion subvencion"...)
  pagador_contrata_id uuid references contratas(id),     -- si paga una contrata (FAIN...)
  notas text
);
comment on table lineas_facturacion is 'Una linea por concepto facturable de una hoja: importe fijo o % (PRG). El pagador puede ser una contrata (FAIN).';

-- ---- Hitos de cobro (plan de pago de cada linea) ----
create table hitos_cobro (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  linea_facturacion_id uuid not null references lineas_facturacion(id),
  hito text not null,
  orden integer,
  porcentaje numeric,          -- % de la linea (50/30/20)
  importe numeric,             -- importe del hito
  estado text not null default 'pendiente',
  numero_factura text,         -- ref factura de Factusol
  numero_abono text,           -- ref factura de abono (si anulado)
  fecha_factura date,
  fecha_vencimiento date,      -- para alertas de cobro
  fecha_cobro date,
  gastos_devolucion numeric,   -- coste si el cargo fue devuelto
  notas text,
  constraint hitos_cobro_hito_check
    check (hito in ('firma', 'encargo', 'entrega', 'licencia', 'cfo', 'concesion', 'otro')),
  constraint hitos_cobro_estado_check
    check (estado in ('pendiente', 'facturado', 'cobrado', 'devuelto', 'anulado'))
);
comment on table hitos_cobro is 'Plan de pago de una linea: hitos con % o importe. Estado no monotono: cobrado puede pasar a devuelto (cargo devuelto) o anulado (factura de abono).';
comment on column hitos_cobro.estado is 'pendiente->facturado->cobrado; reversibles: devuelto (cargo devuelto por banco) y anulado (via factura de abono).';

-- ---- Gestiones de cobro (persecucion -> alertas) ----
create table gestiones_cobro (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  hito_cobro_id uuid not null references hitos_cobro(id),
  fecha date not null default current_date,
  tipo text not null default 'otro',
  resultado text,
  notas text,
  constraint gestiones_cobro_tipo_check
    check (tipo in ('email', 'llamada', 'carta', 'visita', 'otro'))
);
comment on table gestiones_cobro is 'Registro de gestiones para cobrar un hito (mail/llamada/carta). Alimenta las alertas de persecucion.';

-- ---- Historial del plan de pago (renegociaciones) ----
create table plan_pago_historial (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  hoja_encargo_id uuid not null references hojas_encargo(id),
  fecha timestamptz not null default now(),
  motivo text,
  snapshot_anterior jsonb,   -- estado del plan antes del cambio (lossless)
  notas text
);
comment on table plan_pago_historial is 'Cada renegociacion del plan de pago (importes/hitos) de una hoja ya firmada: guarda el snapshot anterior. Los hitos ya cobrados no se tocan.';

-- ---- Indices en FKs ----
create index idx_lineas_fact_hoja on lineas_facturacion(hoja_encargo_id);
create index idx_lineas_fact_concepto on lineas_facturacion(concepto_hoja_id);
create index idx_lineas_fact_contrata on lineas_facturacion(pagador_contrata_id);
create index idx_hitos_cobro_linea on hitos_cobro(linea_facturacion_id);
create index idx_hitos_cobro_estado on hitos_cobro(estado);
create index idx_gestiones_cobro_hito on gestiones_cobro(hito_cobro_id);
create index idx_plan_hist_hoja on plan_pago_historial(hoja_encargo_id);

-- ---- Trigger actualizado_en ----
create trigger trg_set_actualizado_en before update on lineas_facturacion for each row execute function set_actualizado_en();
create trigger trg_set_actualizado_en before update on hitos_cobro for each row execute function set_actualizado_en();
create trigger trg_set_actualizado_en before update on gestiones_cobro for each row execute function set_actualizado_en();

-- ---- RLS (activo sin politicas, como el resto: service_role las salta) ----
alter table lineas_facturacion enable row level security;
alter table hitos_cobro enable row level security;
alter table gestiones_cobro enable row level security;
alter table plan_pago_historial enable row level security;
