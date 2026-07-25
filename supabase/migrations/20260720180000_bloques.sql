-- =============================================================================
-- ERP Accesalia — Catalogo de BLOQUES (conceptos facturables / plantillas)
--
-- Cada bloque = un concepto facturable ("encargo") con su plantilla de texto para
-- generar los documentos (hoja de encargo, presupuesto, viabilidad). El comercial
-- selecciona bloques -> se ensamblan las plantillas -> PDF, y los conceptos quedan
-- guardados estructurados (conceptos_hoja). Catalogo hecho por la propietaria
-- (Excel docs/seleccion_encargos, pestana "Bloques"), 18 bloques.
--
-- Convenciones: espanol sin tildes/enes; PK uuid; text; RLS sin politicas; trigger
-- set_actualizado_en reutilizado.
-- =============================================================================

create table bloques (
  id                  uuid        primary key default gen_random_uuid(),
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  codigo              text        not null unique,
  nombre              text        not null,
  texto_plantilla     text,
  honorarios_defecto  numeric,
  es_paquete          boolean     not null default false,
  orden               integer,
  activo              boolean     not null default true
);

comment on table bloques is 'Catalogo de conceptos facturables ("encargos") con su plantilla de texto para generar documentos comerciales (hoja de encargo, presupuesto, viabilidad). La hoja selecciona bloques -> conceptos_hoja.';
comment on column bloques.codigo is 'Codigo estable del bloque; coincide con la cabecera del check en el Excel de seleccion (ej. DF, IEE, REDACCION PROYECTO). Llave para casar selecciones.';
comment on column bloques.nombre is 'Titulo legible (ej. DIRECCION FACULTATIVA).';
comment on column bloques.texto_plantilla is 'Bloque de texto (descripcion con vinetas) que se ensambla en el PDF del documento.';
comment on column bloques.honorarios_defecto is 'Honorario orientativo por defecto (nullable; el valor real se fija por concepto en cada hoja: estandar + excepcion).';
comment on column bloques.es_paquete is 'true = paquete combinado con precios embebidos y oferta de cesion de CAES (SATE / SATE+ascensor). Naturaleza distinta a un bloque simple.';
comment on column bloques.orden is 'Orden de aparicion en el documento generado.';

alter table bloques enable row level security;

drop trigger if exists trg_set_actualizado_en on public.bloques;
create trigger trg_set_actualizado_en
  before update on public.bloques
  for each row execute function set_actualizado_en();
