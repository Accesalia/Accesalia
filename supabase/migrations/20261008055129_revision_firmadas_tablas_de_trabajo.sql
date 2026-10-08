-- REVISION DE LAS HOJAS FIRMADAS 2025-2026 (Monica, 8-oct-2026): "las firmadas son nuestro unico
-- contrato de trabajo". Se relee cada firmada y lo leido se guarda AQUI, en tablas de trabajo que la
-- app no ve (RLS sin politicas), con las mismas piezas que la app: hoja -> lineas -> plazos de cobro.
-- Cuando este todo claro se pasa a las tablas de verdad POR GRUPOS (primero comunidades y empresas
-- que falten, luego lineas, luego plazos): "si mezclamos todos los trabajos, nada se hara bien".
--
-- FECHAS (ella): la de FIRMA es la de creacion DENTRO del PDF ("no se pudo crear ese pdf si no
-- tenia la firma ya"); si el PDF no la trae, la del archivo en Drive. La de EMISION es la de la hoja.
-- Las dos se guardan: tiempos de firma por administrador/comunidad. La de la casilla, tal cual.

create table public.revision_firmadas (
  id                    uuid primary key default gen_random_uuid(),
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
  hoja_encargo_id       uuid not null unique references public.hojas_encargo(id) on delete cascade,
  numero_hoja           text,
  oportunidad_id        uuid references public.oportunidades(id),
  pdf_firmado           text,
  fecha_emision         date,
  fecha_firma_pdf       date,
  fecha_archivo_drive   date,
  fecha_firma           date,
  fecha_casilla         text,
  firma_presente        boolean,
  pagador_tipo          text,
  pagador_razon_social  text,
  pagador_cif           text,
  pagador_iban          text,
  pagador_direccion     text,
  comunidad_id          uuid references public.comunidades(id),
  contrata_id           uuid references public.contratas(id),
  pagador_hay_que_crear boolean,
  total_base            numeric,
  forma_pago_texto      text,
  revision              text not null default 'pendiente',
  nota                  text,
  constraint revision_firmadas_pagador_tipo_check check (pagador_tipo in ('comunidad', 'empresa')),
  constraint revision_firmadas_revision_check check (revision in ('pendiente', 'ok', 'duda', 'corregido'))
);
comment on table public.revision_firmadas is
  'TRABAJO (no la ve la app). Una fila por hoja firmada releida. Clon: lo que vaya a produccion, por grupos, cuando este revisado.';
comment on column public.revision_firmadas.fecha_firma is
  'La buena: creacion DENTRO del PDF firmado; si no la trae, la del archivo en Drive (Monica, 8-oct-2026).';
comment on column public.revision_firmadas.fecha_emision is
  'La de la hoja ("En Madrid, a..."). Con fecha_firma da el tiempo de firma (estadisticas por admin/comunidad).';
comment on column public.revision_firmadas.fecha_casilla is 'Lo escrito en la casilla "Fecha firma", tal cual. Informativa.';
comment on column public.revision_firmadas.firma_presente is 'La casilla de firma del cliente tiene firma. false = NO esta firmada (La Coruna 2).';
comment on column public.revision_firmadas.pagador_hay_que_crear is 'La comunidad o empresa de la casilla no existe aun en la app.';

create table public.revision_firmadas_lineas (
  id               uuid primary key default gen_random_uuid(),
  firmada_id       uuid not null references public.revision_firmadas(id) on delete cascade,
  orden            integer,
  texto            text,
  bloque_id        uuid references public.bloques(id),
  importe          numeric,
  porcentaje       numeric,
  incluido         boolean not null default false,
  concepto_hoja_id uuid references public.conceptos_hoja(id),
  comparacion      text,
  nota             text,
  constraint revision_firmadas_lineas_comparacion_check
    check (comparacion in ('coincide', 'distinta', 'falta_en_base', 'sobra_en_base'))
);
comment on table public.revision_firmadas_lineas is
  'TRABAJO. Lo contratado, linea a linea, leido de la firmada: importe fijo y/o % a exito; comparado con conceptos_hoja.';

create table public.revision_firmadas_plazos (
  id         uuid primary key default gen_random_uuid(),
  linea_id   uuid not null references public.revision_firmadas_lineas(id) on delete cascade,
  orden      integer,
  hito       text not null,
  porcentaje numeric,
  importe    numeric,
  texto      text,
  constraint revision_firmadas_plazos_hito_check
    check (hito in ('firma', 'encargo', 'entrega', 'licencia', 'cfo', 'concesion', 'otro'))
);
comment on table public.revision_firmadas_plazos is
  'TRABAJO. Plazos de cobro de cada linea (mismos hitos que hitos_cobro): cuando se cobra y cuanto.';

create index revision_firmadas_lineas_firmada_idx on public.revision_firmadas_lineas (firmada_id);
create index revision_firmadas_plazos_linea_idx on public.revision_firmadas_plazos (linea_id);

alter table public.revision_firmadas enable row level security;
alter table public.revision_firmadas_lineas enable row level security;
alter table public.revision_firmadas_plazos enable row level security;
