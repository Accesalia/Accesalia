-- PIPELINE COMERCIAL (modelo propio, distinto del de proyecto).
--
-- La barra "¿en que punto estamos?" es una lista de HITOS por los que hay que
-- pasar, definidos CASO A CASO (aplicabilidad, como en el estado de proyecto). El
-- punto actual se DERIVA (primer hito aplicable no hecho). Viabilidad y 3D implican
-- a otras personas de Accesalia (arquitecto/tecnico) -> posible bloqueo.
--
-- Ademas, "que vendemos y a que precio" NO es un flujo: es la NEGOCIACION, dato
-- dinamico CON HISTORICO (tabla aparte). La oferta vigente = la ultima.

-- =============================================================================
-- 1. Catalogo de hitos (universo de pasos + orden + ramal + responsable-rol)
-- =============================================================================
create table if not exists hitos_comerciales (
  id                    uuid    primary key default gen_random_uuid(),
  clave                 text    not null unique,
  nombre                text    not null,
  orden                 integer not null,
  es_ramal              boolean not null default false,   -- 3D cuelga de junta, no es lineal
  aplicable_por_defecto boolean not null default true,    -- 3D se marca cuando se decide junta
  responsable_rol       text                              -- pista: comercial|arquitecto|tecnico_3d|tecnico_escaneo
);
comment on table hitos_comerciales is 'Catalogo/vocabulario de hitos del pipeline comercial. Ordenado; es_ramal para el 3D (cuelga de junta). Editable.';

insert into hitos_comerciales (clave, nombre, orden, es_ramal, aplicable_por_defecto, responsable_rol) values
  ('primer_contacto',         'Primer contacto',                    10, false, true,  'comercial'),
  ('visita',                  'Visita al inmueble',                 20, false, true,  'comercial'),
  ('polycam',                 'Escaneo Polycam',                    30, false, true,  'tecnico_escaneo'),
  ('viabilidad_arquitecto',   'Viabilidad: revision del arquitecto', 40, false, true, 'arquitecto'),
  ('preparacion_documentos',  'Informe + HE + presupuesto',         50, false, true,  'comercial'),
  ('envio_documentos',        'Envio a la comunidad',               60, false, true,  'comercial'),
  ('tresd',                   '3D para junta',                      65, true,  false, 'tecnico_3d'),
  ('junta',                   'Junta de votacion',                  70, false, true,  'comercial'),
  ('firma',                   'Firma',                              80, false, true,  'comercial'),
  ('cobro',                   'Cobro',                              90, false, true,  'comercial')
on conflict (clave) do nothing;

-- =============================================================================
-- 2. Hitos por oportunidad (instancias con aplicabilidad y estado)
-- =============================================================================
create table if not exists hitos_oportunidad (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  oportunidad_id  uuid        not null references oportunidades (id) on delete cascade,
  hito            text        not null references hitos_comerciales (clave),
  aplicable       boolean     not null default true,
  estado          text        not null default 'pendiente'
                    check (estado in ('pendiente', 'en_curso', 'hecho', 'no_aplica')),
  fecha           date,
  responsable_id  uuid        references equipo (id),
  enlace_url      text,                                    -- Dropbox (polycam, 3D) si no hay previsualizacion
  notas           text,
  unique (oportunidad_id, hito)
);
comment on table hitos_oportunidad is 'Instancia de los hitos para una oportunidad. La barra se deriva de aqui (primer aplicable no hecho). responsable_id (equipo) para ver bloqueos; enlace_url para el Dropbox.';

drop trigger if exists trg_hitos_oportunidad_upd on hitos_oportunidad;
create trigger trg_hitos_oportunidad_upd before update on hitos_oportunidad
  for each row execute function set_actualizado_en();
create index if not exists idx_hitos_oportunidad_op on hitos_oportunidad (oportunidad_id);

-- =============================================================================
-- 3. Negociacion (que vendemos + a que precio + alcance), CON HISTORICO
-- =============================================================================
create table if not exists negociacion_oportunidad (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  oportunidad_id  uuid        not null references oportunidades (id) on delete cascade,
  que_vendemos    text,                                    -- ascensor, SATE, accesibilidad... (dinamico)
  precio          numeric(12,2),
  alcance         text,                                    -- que se contrata / condiciones negociadas
  notas           text,                                    -- por que el cambio (bajamos por competencia...)
  comercial_id    uuid        references comerciales (id)
);
comment on table negociacion_oportunidad is 'Historico de la negociacion: que se vende y a que precio (y alcance), que cambia en el tiempo. La oferta VIGENTE = la fila mas reciente. Al firmar, la vigente pasa a la hoja de encargo.';
create index if not exists idx_negociacion_op on negociacion_oportunidad (oportunidad_id, creado_en desc);

-- =============================================================================
-- 4. Reapuntar 3D y juntas a la oportunidad (reutilizar, no reinventar)
-- =============================================================================
-- 3D: puede colgar ya de una oportunidad. + de_catalogo (listo al instante) vs
-- especifico (ciclo pedido->listo con fechas, lo hace un tecnico).
alter table modelos_3d_venta
  add column if not exists oportunidad_id uuid references oportunidades (id) on delete cascade,
  add column if not exists de_catalogo    boolean not null default false;
alter table modelos_3d_venta drop constraint if exists modelos_3d_venta_ambito_check;
alter table modelos_3d_venta add constraint modelos_3d_venta_ambito_check
  check (proceso_venta_id is not null or junta_id is not null or oportunidad_id is not null);
create index if not exists idx_modelos_3d_venta_op on modelos_3d_venta (oportunidad_id);
comment on column modelos_3d_venta.de_catalogo is 'true = 3D de catalogo (ya existe, listo al instante, sin recursos). false = especifico/a medida (lo hace un tecnico: ciclo pedido->listo, vigilar fecha_necesaria=junta).';

-- Junta: fase viva hasta el voto efectivo (negociacion dentro). Puede colgar de la
-- oportunidad directamente (sin proceso_venta).
alter table juntas
  alter column proceso_venta_id drop not null,
  add column if not exists oportunidad_id uuid references oportunidades (id) on delete cascade;
alter table juntas drop constraint if exists juntas_ambito_check;
alter table juntas add constraint juntas_ambito_check
  check (proceso_venta_id is not null or oportunidad_id is not null);
create index if not exists idx_juntas_oportunidad on juntas (oportunidad_id);
