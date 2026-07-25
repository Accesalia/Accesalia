-- =============================================================================
-- ERP Accesalia — EQUIPO (directorio de personal + funciones)
--
-- Decidido (propietaria 2026-07-22): NO es una tabla "solo tecnicos" sino un
-- directorio general del personal de Accesalia. Dos niveles separados a proposito:
--   · la PERSONA vive en `equipo` (nombre, es_arquitecto = flag que decide quien
--     firma/hace proyecto, titulacion, activo).
--   · las FUNCIONES son un CATALOGO EDITABLE (`funciones`) enlazado por un puente
--     N:M (`equipo_funciones`), porque las funciones evolucionan por mejora
--     continua y una persona cubre varias / cambia con el tiempo.
--
-- "Quien hizo que parte de un proyecto" (estado actual / solucion / revision) NO
-- vive aqui: son asignaciones por rol y por proyecto (se modelaran en la fase
-- proyecto contra estas personas). Esto es solo el directorio.
--
-- Limite: directorio de roles y areas, NO RRHH sensible (nada de nominas/DNI).
-- =============================================================================

-- ---- Personas del equipo ----
create table equipo (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  nombre text not null,
  es_arquitecto boolean,                 -- true/false; null = sin confirmar (decide quien firma/hace proyecto)
  titulacion text,                       -- perfil libre cuando aporta (delineante, administrativa...)
  activo boolean not null default true,
  notas text
);
comment on table equipo is 'Directorio general del personal de Accesalia (perfiles). No RRHH sensible: sin nominas ni DNI.';
comment on column equipo.es_arquitecto is 'Flag que decide quien firma / hace proyecto. null = sin confirmar.';

-- ---- Catalogo de funciones (editable, "vivo" por mejora continua) ----
create table funciones (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  clave text not null unique,            -- clave estable (para join/seed)
  nombre text not null,
  descripcion text,
  orden integer,
  activa boolean not null default true
);
comment on table funciones is 'Catalogo editable de funciones/areas que cubre el personal. Evoluciona por mejora continua (no se hardcodea, no es variable por proyecto).';

-- ---- Puente persona <-> funcion (N:M, cambia con el tiempo) ----
create table equipo_funciones (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  equipo_id uuid not null references equipo(id) on delete cascade,
  funcion_id uuid not null references funciones(id) on delete cascade,
  notas text,
  constraint equipo_funciones_uniq unique (equipo_id, funcion_id)
);
comment on table equipo_funciones is 'Que funciones cubre cada persona (N:M). Una persona cubre varias y cambian con el tiempo.';

-- ---- Indices en FKs ----
create index idx_equipo_funciones_equipo on equipo_funciones(equipo_id);
create index idx_equipo_funciones_funcion on equipo_funciones(funcion_id);

-- ---- Trigger actualizado_en ----
create trigger trg_set_actualizado_en before update on equipo for each row execute function set_actualizado_en();
create trigger trg_set_actualizado_en before update on funciones for each row execute function set_actualizado_en();

-- ---- RLS (activo sin politicas, como el resto: service_role las salta) ----
alter table equipo enable row level security;
alter table funciones enable row level security;
alter table equipo_funciones enable row level security;

-- =============================================================================
-- SEMILLA
-- =============================================================================

-- Catalogo de funciones observadas hoy (2026-07).
insert into funciones (clave, nombre, descripcion, orden) values
  ('direccion',              'Direccion / gerencia',        'Direccion del estudio y decision.', 10),
  ('comercial',              'Comercial / captacion',       'Captacion y relacion comercial.', 20),
  ('responsable_tecnico',    'Responsable tecnico',         'Firma de proyectos y direcciones de obra.', 30),
  ('viabilidades',           'Viabilidades',                'Elaboracion y revision de viabilidades.', 40),
  ('secretaria',             'Secretaria / apoyo',          'Correo, generacion de HE, agenda.', 50),
  ('escaneo',                'Escaneo FARO + nube',         'Escaneo laser FARO y montaje de nube (Scene).', 60),
  ('estado_actual',          'Estado actual (Revit)',       'Levantamiento del estado actual sobre la nube.', 70),
  ('proyecto',               'Proyecto / planos',           'Solucion, planos y documentacion de proyecto.', 80),
  ('sketchup',               'SketchUp / modelado',         'Modelado auxiliar en SketchUp.', 90),
  ('iee',                    'IEE y libros del edificio',   'Informes de evaluacion del edificio y libros del edificio.', 100),
  ('visado_licencias',       'Visado y licencias',          'COAM/COACM, visado y tramitacion de licencias.', 110),
  ('df',                     'Direccion de obra (DF)',      'Visitas de obra y direccion facultativa.', 120),
  ('css',                    'Coordinacion seg. y salud',   'Coordinacion de seguridad y salud en obra (CSS).', 130),
  ('subvenciones',           'Subvenciones',                'Gestion tecnica y administrativa de subvenciones.', 140),
  ('presupuestos_contratas', '3 presupuestos (contratas)',  'Gestion de los 3 presupuestos de contratas (Ecobalance).', 150),
  ('caes',                   'CAES',                        'Coordinacion de actividades empresariales.', 160),
  ('facturacion',            'Facturacion',                 'Seguimiento y emision de facturacion.', 170),
  ('asignacion',             'Asignacion de proyectos',     'Reparto y asignacion de proyectos a tecnicos.', 180);

-- Personas (nombre es clave natural dentro de Accesalia). OJO: Alexandra != Alejandra.
insert into equipo (nombre, es_arquitecto, titulacion, notas) values
  ('Daniel',      true,  'arquitecto',    'Dueno, co-CEO. Firma TODOS los proyectos y TODAS las DF. Factura como autonomo o via Accesalia.'),
  ('Monica',      false, null,            'Gerente, co-CEO. Todo lo no tecnico ni comercial.'),
  ('Alex',        true,  'arquitecto',    'IEE, libros del edificio, SketchUp; revisa viabilidades.'),
  ('Abraham',     false, null,            'Escaneo FARO y montaje de nube.'),
  ('Jacob',       true,  'arquitecto',    null),
  ('Carlos Daza', true,  'arquitecto',    null),
  ('Israel',      true,  'arquitecto',    null),
  ('Angela',      true,  'arquitecto',    null),
  ('Alexandra',   false, null,            'Facturacion (Accesalia + Daniel autonomo) y asignacion de proyectos.'),
  ('Adriana',     false, null,            'COAM, visado y licencias.'),
  ('Marta',       true,  'arquitecto',    'DF (aun firma Daniel; previsto que ella firme en unos meses) y CSS.'),
  ('Alejandra',   null,  null,            'Secretaria comercial y de Daniel: correo, genera HE, viabilidades, agenda.'),
  ('Ana',         false, null,            'Ecobalance: 3 presupuestos, CAES, facturacion Ecobalance. Ex-secretaria unica (conoce todas las areas).'),
  ('Carla',       false, 'delineante',    'Subvenciones (parte tecnica). Ha pasado por todos los departamentos.'),
  ('Maria',       false, 'administrativa','Subvenciones (parte administrativa). Equipo con Carla.');

-- Enlace persona <-> funcion por join sobre claves naturales (identico local/nube).
insert into equipo_funciones (equipo_id, funcion_id, notas)
select e.id, f.id, v.notas
from (values
  ('Daniel',      'direccion',              null),
  ('Daniel',      'comercial',              null),
  ('Daniel',      'responsable_tecnico',    'Firma todos los proyectos y todas las DF.'),
  ('Daniel',      'viabilidades',           null),
  ('Monica',      'direccion',              null),
  ('Alex',        'iee',                    null),
  ('Alex',        'sketchup',               null),
  ('Alex',        'viabilidades',           'Revisa viabilidades.'),
  ('Abraham',     'escaneo',                null),
  ('Jacob',       'estado_actual',          null),
  ('Jacob',       'proyecto',               null),
  ('Carlos Daza', 'estado_actual',          null),
  ('Carlos Daza', 'proyecto',               null),
  ('Israel',      'estado_actual',          null),
  ('Israel',      'proyecto',               null),
  ('Angela',      'estado_actual',          null),
  ('Angela',      'proyecto',               null),
  ('Alexandra',   'facturacion',            'Accesalia + Daniel autonomo.'),
  ('Alexandra',   'asignacion',             null),
  ('Adriana',     'visado_licencias',       null),
  ('Marta',       'df',                     'Aun firma Daniel; previsto que ella firme en unos meses.'),
  ('Marta',       'css',                    null),
  ('Alejandra',   'secretaria',             null),
  ('Alejandra',   'comercial',              'Genera HE y viabilidades de Daniel.'),
  ('Ana',         'presupuestos_contratas', 'Ecobalance.'),
  ('Ana',         'caes',                   'Ecobalance.'),
  ('Ana',         'facturacion',            'Ecobalance.'),
  ('Carla',       'subvenciones',           'Parte tecnica.'),
  ('Maria',       'subvenciones',           'Parte administrativa.')
) as v(nombre, clave, notas)
join equipo e on e.nombre = v.nombre
join funciones f on f.clave = v.clave;
