-- =============================================================================
-- ERP Accesalia — Carpeta Comercial + Informe de Viabilidad (F1 + esquema)
--
-- Los 3 documentos inexcusables de la fase comercial (Viabilidad, Hoja de
-- Encargo, Presupuesto) se agrupan en una CARPETA COMERCIAL por ENCARGO. Regla
-- rectora: los DATOS viven una vez (compartidos, pescables) y cada DOCUMENTO es
-- una foto versionada. La subvencion va SIEMPRE en hoja aparte, asi que un
-- encargo puede tener 1..n hojas: por eso la carpeta es un PADRE por encima de
-- las hojas, no la hoja misma.
--
-- Esta migracion monta:
--   1. carpetas_comerciales (el encargo; padre de los 3 docs)
--   2. hojas_encargo += carpeta_id (una carpeta agrupa 1..n hojas)
--   3. tecnicos += numero_colegiado (arquitecto firmante flexible)
--   4. viabilidades (documento versionado, por carpeta)
--   5. viabilidad_conceptos (tabla de precios: reutiliza el catalogo bloques)
--
-- FUERA DE ALCANCE (anotado): propagacion viabilidad<->HE (el precio de
-- arquitecto = el de proyecto de la HE) y marcado de OBSOLETO por snapshot -> F4,
-- al tocar la generacion de la HE. Captura Polycam obligatoria -> con el paso
-- polycam. Tabla presupuestos (PDF Factusol) -> cuando se aborde ese doc.
--
-- Convenciones: espanol sin tildes/enes; PK uuid; creado_en/actualizado_en;
-- SIN ENUMS (text + CHECK nombrado); indices en FKs; RLS sin politicas; trigger
-- set_actualizado_en() reutilizado.
-- =============================================================================


-- =============================================================================
-- 1. carpetas_comerciales — el ENCARGO (padre de viabilidad + hojas + ppto)
-- =============================================================================
create table carpetas_comerciales (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  comunidad_id    uuid        not null references comunidades (id),
  oportunidad_id  uuid        references oportunidades (id),
  numero          text,
  descripcion     text,
  activo          boolean     not null default true
);

comment on table carpetas_comerciales is 'Un ENCARGO comercial: el paquete concreto que se vende a una comunidad (p.ej. "el ascensor", que agrupa proyecto + CSS + subvencion). Padre de los 3 documentos comerciales (viabilidad, hojas de encargo, presupuesto). Anclada a la comunidad; enlazada (opcional) a la oportunidad-hilo que la agrupa en el tiempo.';
comment on column carpetas_comerciales.comunidad_id is 'Comunidad del encargo (siempre).';
comment on column carpetas_comerciales.oportunidad_id is 'La oportunidad-hilo (relacion viva y reactivable) que agrupa este y otros encargos en el tiempo. Nullable: puede materializarse antes de tener oportunidad formal.';
comment on column carpetas_comerciales.numero is 'Numeracion propia del encargo/carpeta.';

create index idx_carpetas_comerciales_comunidad_id   on carpetas_comerciales (comunidad_id);
create index idx_carpetas_comerciales_oportunidad_id on carpetas_comerciales (oportunidad_id);


-- =============================================================================
-- 2. hojas_encargo += carpeta_id (una carpeta agrupa 1..n hojas)
-- =============================================================================
alter table hojas_encargo
  add column carpeta_id uuid references carpetas_comerciales (id);

comment on column hojas_encargo.carpeta_id is 'Carpeta/encargo al que pertenece esta hoja. Un encargo puede tener varias hojas (p.ej. una de proyecto+CSS y otra de subvencion, que va siempre separada). Nullable durante la migracion de las hojas existentes.';

create index idx_hojas_encargo_carpeta_id on hojas_encargo (carpeta_id);


-- =============================================================================
-- 3. tecnicos += numero_colegiado (arquitecto firmante flexible)
-- =============================================================================
alter table tecnicos
  add column numero_colegiado text;

comment on column tecnicos.numero_colegiado is 'Nº de colegiado (p.ej. 24103 COAM). Para el arquitecto firmante del informe; hoy casi siempre Daniel, pero modelado como dato para que en el futuro firme otro.';


-- =============================================================================
-- 4. viabilidades — el DOCUMENTO de viabilidad (versionado, por carpeta)
-- =============================================================================
create table viabilidades (
  id                        uuid        primary key default gen_random_uuid(),
  creado_en                 timestamptz not null default now(),
  actualizado_en            timestamptz not null default now(),
  carpeta_id                uuid        not null references carpetas_comerciales (id),
  numero                    text,
  version                   integer     not null default 1,
  vigente                   boolean     not null default true,
  -- Cabecera
  arquitecto_id             uuid        references tecnicos (id),
  fecha_visita              date,
  -- Cuerpo (texto expreso del tecnico; lo que solo esta en su cabeza)
  objeto                    text,
  descripcion_intervenciones text,
  conclusion                text,
  viable                    boolean,
  -- Coste de obra: ESTIMATIVO orientativo para la comunidad. NO es el PEM y NO
  -- alimenta fases posteriores (el PEM real llega con presupuesto de contrata o
  -- tras redactar el proyecto). Numero suelto.
  coste_obra_base           numeric,
  coste_obra_iva_porcentaje numeric,
  coste_obra_total          numeric,
  -- Documento generado
  url_pdf                   text
);

comment on table viabilidades is 'Informe/estudio de viabilidad y costes. Documento versionado que cuelga de la carpeta (encargo). Cabecera pescable de otras tablas; cuerpo de texto y coste de obra los rellena el tecnico. La tabla de precios va en viabilidad_conceptos (reutiliza bloques).';
comment on column viabilidades.version is 'Version del documento (v1, v2...). Nueva version al regenerar. La vigente=true es la actual.';
comment on column viabilidades.arquitecto_id is 'Arquitecto firmante (flexible; FK a tecnicos, con su numero_colegiado).';
comment on column viabilidades.viable is 'Conclusion: viable | inviable (null mientras se redacta).';
comment on column viabilidades.coste_obra_base is 'Coste de obra ESTIMATIVO (orientacion para la comunidad). NO es el PEM y NO propaga a otras fases.';
comment on column viabilidades.coste_obra_iva_porcentaje is 'IVA del coste de obra (tipicamente 10%).';

create index idx_viabilidades_carpeta_id   on viabilidades (carpeta_id);
create index idx_viabilidades_arquitecto_id on viabilidades (arquitecto_id);


-- =============================================================================
-- 5. viabilidad_conceptos — tabla de precios (reutiliza el catalogo bloques)
--
-- Los 4 grupos de la viabilidad se apoyan en tus bloques:
--   Arquitecto = REDACCION PROYECTO + DF (DF normalmente gratis, incluida en
--                proyecto -> gratis=true + incluido_en_id; importe 0 salvo excep.)
--   CSS        = CSS
--   Subvencion = TRAMITACION SUBVENCIONES (importe doc. tecnica + porcentaje a exito)
-- (Obra NO va aqui: es el coste_obra estimativo suelto de la cabecera.)
-- El formulario pre-marca los 4, permite desmarcar, y es CRECEDERO (cualquier
-- bloque). Las lineas de una viabilidad concreta las crea la app al generarla.
-- =============================================================================
create table viabilidad_conceptos (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  viabilidad_id   uuid        not null references viabilidades (id) on delete cascade,
  bloque_id       uuid        references bloques (id),
  seleccionado    boolean     not null default true,
  importe         numeric,
  iva_porcentaje  numeric,
  porcentaje      numeric,
  gratis          boolean     not null default false,
  incluido_en_id  uuid        references viabilidad_conceptos (id),
  orden           integer
);

comment on table viabilidad_conceptos is 'Lineas de la tabla de precios de una viabilidad. Reutiliza el catalogo bloques (mismo concepto que conceptos_hoja de la HE). Seleccionable/deseleccionable (como los conceptos de la hoja) y crecedero.';
comment on column viabilidad_conceptos.bloque_id is 'Concepto del catalogo bloques (REDACCION PROYECTO, DF, CSS, TRAMITACION SUBVENCIONES...). Reutiliza el mismo catalogo que la hoja de encargo.';
comment on column viabilidad_conceptos.seleccionado is 'Si la linea esta marcada en el formulario (aparece en la tabla). Los 4 grupos van pre-marcados.';
comment on column viabilidad_conceptos.importe is 'Importe base de la linea (honorario). Por defecto el orientativo del bloque, ajustable por caso.';
comment on column viabilidad_conceptos.iva_porcentaje is 'IVA de la linea (honorarios tipicamente 21%).';
comment on column viabilidad_conceptos.porcentaje is 'Para subvencion: % a exito (ademas del importe de documentacion tecnica).';
comment on column viabilidad_conceptos.gratis is 'true = incluido gratis dentro de otro concepto (p.ej. DF incluida en proyecto). Importe tipicamente 0.';
comment on column viabilidad_conceptos.incluido_en_id is 'Cuando gratis: en que concepto va incluido (self-ref). Mismo mecanismo que conceptos_hoja.incluido_en_concepto_id de la HE.';

create index idx_viabilidad_conceptos_viabilidad_id on viabilidad_conceptos (viabilidad_id);
create index idx_viabilidad_conceptos_bloque_id     on viabilidad_conceptos (bloque_id);


-- =============================================================================
-- 6. RLS (habilitado sin politicas; acceso via service role, como el resto)
-- =============================================================================
alter table carpetas_comerciales enable row level security;
alter table viabilidades         enable row level security;
alter table viabilidad_conceptos enable row level security;


-- =============================================================================
-- 7. Trigger actualizado_en para las tablas nuevas
-- =============================================================================
do $$
declare r record;
begin
  for r in
    select unnest(array['carpetas_comerciales','viabilidades','viabilidad_conceptos']) as t
  loop
    execute format('drop trigger if exists trg_set_actualizado_en on public.%I', r.t);
    execute format('create trigger trg_set_actualizado_en before update on public.%I for each row execute function set_actualizado_en()', r.t);
  end loop;
end $$;
