-- =============================================================================
-- DATOS DEL PROYECTO Y PRESUPUESTO POR CAPITULOS (Monica, 10-oct-2026)
--
-- La hoja "DATOS del Proyecto_<obra>.xlsx" es universal: con ella sacan los
-- tecnicos las memorias (634 obras, 2021-2026). Es el FUTURO PASO 3 del
-- circuito: la app da el Excel prerrellenado al tecnico, el lo completa y lo
-- devuelve, y la app lo guarda como registro. Volcar las ya hechas es ese mismo
-- paso, en lote. Sirve para el HISTORICO DE OBRAS: estimar el PEM y la fianza
-- de residuos, y el indice de precios por semestre.
--
-- UNA SOLA FUENTE DE VERDAD (suya): el Excel no es una segunda fuente. Lo que
-- la base ya sabe (Catastro, IEE, comunidad, equipo, urbanismo) NO se guarda
-- aqui como dato; solo lo que existe en el proyecto (docs/datos-del-proyecto-
-- fuentes.md). La hoja entera se archiva en `hoja` como copia del documento: la
-- app no lee datos de ahi.
--
-- La plantilla cambia con los anos (47 campos en 2021, 266 en 2025, pestañas
-- renombradas en 2026): se lee por NOMBRE de campo.
-- =============================================================================

-- ------------------------------------------------ conocimiento comun
create table planeamiento_municipal (
  municipio_id   uuid primary key references municipios_catastro(id),
  plan           text not null default 'Plan General de Ordenación Urbana',
  fecha_texto    text,
  fecha          date,
  fuente         text,
  actualizado_en timestamptz not null default now()
);
comment on table planeamiento_municipal is 'El planeamiento general de cada municipio (antes, pestaña "Planeamiento Urb." del Excel de los tecnicos). Conocimiento comun, centralizado.';

create table capitulos_presupuesto (
  clave  text primary key,
  nombre text not null,
  orden  integer not null
);
comment on table capitulos_presupuesto is 'Los capitulos del presupuesto de proyecto de Accesalia (Presto). SE RECONOCEN POR EL NOMBRE, no por el numero: el numero cambia si una obra no lleva alguno (sin movimientos de tierras, todos suben un puesto).';
insert into capitulos_presupuesto (clave, nombre, orden) values
  ('medios_auxiliares', 'Medios auxiliares', 1), ('movimientos_tierras', 'Movimientos de tierras', 2),
  ('demoliciones', 'Demoliciones', 3), ('albanileria', 'Albañilería', 4), ('estructura', 'Estructura', 5),
  ('medios_elevacion', 'Medios de elevación', 6), ('sate_fachadas', 'Sistema de aislamiento térmico en fachadas', 7),
  ('sate_cubiertas', 'Sistema de aislamiento térmico en cubiertas', 8), ('cerrajeria', 'Cerrajería', 9),
  ('proteccion_incendio', 'Protección contra incendio', 10), ('electricidad', 'Electricidad', 11),
  ('cubierta_montera', 'Cubierta / montera del núcleo de comunicaciones', 12), ('pinturas', 'Pinturas', 13),
  ('seguridad_salud', 'Seguridad y salud', 14), ('gestion_residuos', 'Gestión de residuos', 15),
  ('control_calidad', 'Control de calidad', 16), ('otro', 'Otro (separatas…)', 99);

-- ------------------------------------------------ la hoja de datos
create table datos_proyecto (
  id                    uuid primary key default gen_random_uuid(),
  creado_en             timestamptz not null default now(),
  actualizado_en        timestamptz not null default now(),
  oportunidad_id        uuid references oportunidades(id) on delete set null,
  enlace                text,
  ruta                  text not null unique,
  fichero_modificado_en timestamptz,
  version_plantilla     text,
  origen                text not null default 'volcado_dropbox',
  -- que obra es
  fecha_texto           text,
  fecha_documento       date,
  fase                  text,
  tipo_obra             text,
  tipo_obra_sate        text,
  unidades              text,
  caso_actuacion        text,
  -- dinero y plazo
  pem                   numeric(12,2),
  plazo_texto           text,
  plazo_dias            integer,
  operarios             integer,
  jornadas              integer,
  -- residuos (estudio de gestion)
  residuos_asc_superficie numeric(10,2),
  residuos_asc_m3         numeric(10,2),
  residuos_asc_t          numeric(10,2),
  residuos_asc_coste      numeric(10,2),
  residuos_sate_superficie numeric(10,2),
  residuos_sate_m3        numeric(10,2),
  residuos_sate_t         numeric(10,2),
  residuos_sate_coste     numeric(10,2),
  -- superficies afectadas
  m2_asc                numeric(10,2),
  m2_sate               numeric(10,2),
  m2_total              numeric(10,2),
  superficies_planta    jsonb,
  sate_m2_normal        numeric(10,2),
  sate_m2_antivandalico numeric(10,2),
  sate_m2_cubierta      numeric(10,2),
  sate_m2_andamio       numeric(10,2),
  -- el edificio medido por el proyecto (Catastro no lo da)
  primer_nivel          text,
  ultimo_nivel          text,
  peldanos_planta       text,
  altura_cornisa        numeric(8,2),
  altura_libre          numeric(8,2),
  superficie_por_planta numeric(10,2),
  patios                integer,
  acceso                text,
  nucleos_escalera      text,
  -- el ascensor
  asc_tipo              text,
  asc_carga_kg          integer,
  asc_pasajeros         integer,
  asc_paradas           integer,
  asc_paradas_texto     text,
  asc_recorrido_m       numeric(8,2),
  asc_foso              text,
  asc_huida             text,
  asc_hueco             text,
  asc_cuarto_maquinas   text,
  asc_cabina            text,
  asc_puertas           text,
  -- certificado energetico y subvencion (los da el arquitecto)
  cee_ahorro_global     numeric(6,2),
  cee_ahorro_demanda    numeric(6,2),
  cee_registro          text,
  subvencion_pct        numeric(6,2),
  subvencion_cuantia_vivienda numeric(12,2),
  hospital              text,
  -- la copia del documento
  hoja                  jsonb not null,
  constraint datos_proyecto_origen_check check (origen in ('volcado_dropbox', 'app')),
  constraint datos_proyecto_caso_check check (caso_actuacion is null or caso_actuacion in ('A', 'B', 'C', 'D', 'E', 'F'))
);
comment on table datos_proyecto is 'La hoja DATOS del Proyecto de cada obra: solo lo que existe en el proyecto (lo que la base ya sabe sale de su fuente). `hoja` = copia del documento, no se lee como dato.';
comment on column datos_proyecto.enlace is 'Como se enlazo con la oportunidad: refcat (referencia catastral -> portales -> opp) o el motivo de no enlazarla.';
comment on column datos_proyecto.caso_actuacion is 'Pestaña Duraciones: A demoler escalera; B demoler y reconstruir; C cajear; D solo ascensor; E planta baja; F bajar ascensor existente. El criterio de "obras parecidas".';
comment on column datos_proyecto.fecha_documento is 'La FECHA de la hoja ("JUNIO 2024") como dia 1 de ese mes: la que cuenta para el indice de precios.';

-- ------------------------------------------------ el presupuesto con importes
create table presupuestos_proyecto (
  id                uuid primary key default gen_random_uuid(),
  creado_en         timestamptz not null default now(),
  oportunidad_id    uuid references oportunidades(id) on delete set null,
  datos_proyecto_id uuid references datos_proyecto(id) on delete set null,
  ruta              text not null unique,
  formato           text not null,
  fecha             date,
  pem               numeric(12,2),
  cuadra            boolean,
  constraint presupuestos_proyecto_formato_check check (formato in ('pdf', 'bc3', 'xlsx'))
);
comment on table presupuestos_proyecto is 'El presupuesto de proyecto (Presto) con importes. No confundir con `presupuestos` (los de facturacion).';
comment on column presupuestos_proyecto.cuadra is 'Si la suma de los capitulos da el total del documento.';

create table presupuesto_proyecto_capitulos (
  presupuesto_id   uuid not null references presupuestos_proyecto(id) on delete cascade,
  numero_documento text not null,
  capitulo         text not null references capitulos_presupuesto(clave),
  parte            text,
  nombre_documento text not null,
  importe          numeric(12,2) not null,
  primary key (presupuesto_id, numero_documento),
  constraint presupuesto_proyecto_capitulos_parte_check check (parte is null or parte in ('asc', 'et'))
);
comment on column presupuesto_proyecto_capitulos.parte is 'En obras mixtas, de que parte es: asc (ascensor) o et (envolvente termica). Sale del sufijo del nombre ("DEMOLICIONES ET").';

create trigger trg_set_actualizado_en before update on datos_proyecto for each row execute function set_actualizado_en();
alter table planeamiento_municipal enable row level security;
alter table capitulos_presupuesto enable row level security;
alter table datos_proyecto enable row level security;
alter table presupuestos_proyecto enable row level security;
alter table presupuesto_proyecto_capitulos enable row level security;

-- (aplicado aparte, 10-oct) Lo que el volcado no da por bueno, para revisarlo:
-- PEM de la hoja distinto del presupuesto, valores de plantilla, presupuesto
-- no localizado, capitulos que no suman el total.
alter table datos_proyecto add column avisos text[];
