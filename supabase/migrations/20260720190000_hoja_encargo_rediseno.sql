-- =============================================================================
-- ERP Accesalia — Rediseno de la HOJA DE ENCARGO (carpeta + versiones + conceptos)
--
-- Desenreda hojas_encargo: le quita el PIPELINE comercial (que vive en
-- procesos_venta) y las DOS maquinas de estado que se pisaban. La hoja pasa a ser
-- una CARPETA con su ciclo de documento y sus VERSIONES (cada revision es una foto
-- con su PDF, conceptos e importes). Se firma UNA version concreta.
--
-- 5 fichas:
--   1. hojas_encargo            (la carpeta: comunidad, emisor, estado, version firmada)
--   2. versiones_hoja           (cada foto: nº, fechas, PDFs hoja+presupuesto, importes)
--   3. conceptos_hoja           (lineas: bloque + importe + gratis/incluido; por version)
--   4. hitos_facturacion        (ya existe; cuelga de la hoja)
--   5. hojas_encargo_estado_historial (cada cambio de estado con fecha -> alertas)
--
-- Tablas vacias (datos de prueba ya limpiados). Convenciones: espanol sin tildes;
-- text + CHECK; RLS sin politicas; trigger set_actualizado_en reutilizado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. hojas_encargo = la CARPETA. Fuera el pipeline y la doble maquina de estado.
-- -----------------------------------------------------------------------------
alter table hojas_encargo drop constraint if exists hojas_encargo_estado_check;
alter table hojas_encargo drop constraint if exists hojas_encargo_estado_comercial_check;
alter table hojas_encargo
  drop column if exists estado_comercial,
  drop column if exists estado_comercial_desde,
  drop column if exists importe_total_pactado,
  drop column if exists url_pdf_firmado;

alter table hojas_encargo
  add constraint hojas_encargo_estado_check
    check (estado in ('borrador','pendiente_firma_daniel','firmada_daniel','enviada_comunidad',
                      'cambios_solicitados','rechazada','devuelta_firmada','archivada','anulada'));

comment on column hojas_encargo.estado is 'Ciclo de vida de la hoja como DOCUMENTO (una sola maquina): borrador -> pendiente_firma_daniel -> firmada_daniel (Daniel valida precios y firma elec) -> enviada_comunidad -> [cambios_solicitados | rechazada | devuelta_firmada] -> archivada; anulada = baja interna. El pipeline comercial vive en procesos_venta; las fechas por transicion en hojas_encargo_estado_historial.';
comment on column hojas_encargo.fecha_firma is 'Fecha de recepcion de la version FIRMADA por la comunidad. Fecha clave: a partir de aqui la comunidad reclama -> alerta de arrancar.';


-- -----------------------------------------------------------------------------
-- 2. versiones_hoja = cada FOTO (revision) de la hoja
-- -----------------------------------------------------------------------------
create table versiones_hoja (
  id                   uuid        primary key default gen_random_uuid(),
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now(),
  hoja_encargo_id      uuid        not null references hojas_encargo (id),
  numero_version       integer     not null default 1,
  fecha_generada       date,
  fecha_enviada        date,
  motivo_cambio        text,
  url_pdf_hoja         text,
  url_pdf_presupuesto  text,
  numero_presupuesto   text,
  forma_pago           text,
  importe_base         numeric,
  iva_porcentaje       numeric,
  importe_total        numeric,
  notas                text,
  constraint uq_versiones_hoja unique (hoja_encargo_id, numero_version)
);

comment on table versiones_hoja is 'Cada revision (foto) de una hoja de encargo. Nueva version cada vez que se reenvia tras cambios. Permite saber que version se firmo vs la ultima enviada (deteccion de "troll") y el historico de cambios. Los conceptos e importes van por version (cambian entre revisiones).';
comment on column versiones_hoja.numero_version is 'v1, v2, v3... dentro de la misma hoja.';
comment on column versiones_hoja.motivo_cambio is 'Por que se genero esta version (que pidio cambiar la comunidad).';
comment on column versiones_hoja.url_pdf_hoja is 'PDF de la hoja de encargo de esta version.';
comment on column versiones_hoja.url_pdf_presupuesto is 'PDF del presupuesto (Factusol) enviado con esta version.';
comment on column versiones_hoja.numero_presupuesto is 'Numero de presupuesto de Factusol (ej. 26/000093). Se conserva (lo piden en subvenciones).';
comment on column versiones_hoja.forma_pago is 'Forma de pago de esta version (ej. cargo en cuenta).';

create index idx_versiones_hoja_hoja on versiones_hoja (hoja_encargo_id);


-- -----------------------------------------------------------------------------
-- 3. hojas_encargo.version_firmada_id -> que version se firmo
-- -----------------------------------------------------------------------------
alter table hojas_encargo
  add column version_firmada_id uuid references versiones_hoja (id);

comment on column hojas_encargo.version_firmada_id is 'Version concreta que la comunidad firmo. Comparar con la ultima version enviada: si no coinciden -> alerta "firmaron una version vieja".';

create index idx_hojas_encargo_version_firmada on hojas_encargo (version_firmada_id);


-- -----------------------------------------------------------------------------
-- 4. conceptos_hoja = las LINEAS. Cuelgan de la VERSION y apuntan al BLOQUE.
-- -----------------------------------------------------------------------------
alter table conceptos_hoja
  add column version_hoja_id uuid references versiones_hoja (id),
  add column bloque_id       uuid references bloques (id);

alter table conceptos_hoja alter column hoja_encargo_id drop not null;

comment on column conceptos_hoja.version_hoja_id is 'Version de la hoja a la que pertenece este concepto (ANCLA: los conceptos van por version porque cambian entre revisiones).';
comment on column conceptos_hoja.bloque_id is 'Bloque del catalogo que representa este concepto (el item facturable / "encargo" seleccionado).';
comment on column conceptos_hoja.incluido is 'true = va incluido/gratis (valor anadido) en el presupuesto, sin coste para la comunidad.';
comment on column conceptos_hoja.hoja_encargo_id is 'DEPRECATED como ancla: el concepto cuelga de version_hoja_id. Nullable.';

create index idx_conceptos_hoja_version on conceptos_hoja (version_hoja_id);
create index idx_conceptos_hoja_bloque  on conceptos_hoja (bloque_id);


-- -----------------------------------------------------------------------------
-- 5. hojas_encargo_estado_historial = cada cambio de estado con su fecha (alertas)
-- -----------------------------------------------------------------------------
create table hojas_encargo_estado_historial (
  id               uuid        primary key default gen_random_uuid(),
  creado_en        timestamptz not null default now(),
  hoja_encargo_id  uuid        not null references hojas_encargo (id),
  estado           text        not null,
  fecha_estado     timestamptz not null default now(),
  notas            text
);

comment on table hojas_encargo_estado_historial is 'Historial de transiciones de estado de una hoja (append-only). Cada fila = "entro en el estado X el dia Y". Motor de las alertas de seguimiento (enviada hace N dias, parada por Daniel, cambios pendientes, firmada hay que arrancar...). Un estado puede repetirse (cambios -> reenvio -> mas cambios).';

create index idx_hojas_encargo_estado_historial_hoja on hojas_encargo_estado_historial (hoja_encargo_id, fecha_estado);


-- -----------------------------------------------------------------------------
-- 6. RLS + trigger actualizado_en para las tablas nuevas
-- -----------------------------------------------------------------------------
alter table versiones_hoja                   enable row level security;
alter table hojas_encargo_estado_historial   enable row level security;

drop trigger if exists trg_set_actualizado_en on public.versiones_hoja;
create trigger trg_set_actualizado_en
  before update on public.versiones_hoja
  for each row execute function set_actualizado_en();
