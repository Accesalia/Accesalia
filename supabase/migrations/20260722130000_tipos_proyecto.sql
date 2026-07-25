-- =============================================================================
-- ERP Accesalia — Catalogo de TIPOS DE PROYECTO (vivo, con naturaleza y jerarquia)
--
-- El campo `proyectos.tipo` venia de Monday con 16 valores que mezclaban tres
-- cosas: tipo(s) base, combos, y modificadores (subv/externo). Se normaliza:
--   · tipos_proyecto: catalogo editable con naturaleza (reusa el vocab de bloques:
--     proyecto/servicio/documento_tecnico) y jerarquia (rampa/elevador cuelgan de
--     accesibilidad).
--   · proyecto_tipos: puente M:N -> los COMBOS se desglosan en tags. Buscar "todos
--     los de ascensor" = un filtro, recoge todos los combos automaticamente.
--   · proyectos.proyecto_externo: el proyecto tecnico lo hace otro arquitecto (sin
--     acceso a docs, se piden al admin; mas gestion y precio).
--   · La subvencion NO es un tipo (es un contrato generico aparte; que subvenciones
--     aplican depende de los tipos del proyecto) -> vive en el area de subvenciones.
--     El crudo `proyectos.tipo` se conserva sin perdida.
-- =============================================================================

create table tipos_proyecto (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  clave text not null unique,
  nombre text not null,
  naturaleza text,                          -- proyecto | servicio | documento_tecnico (como bloques.naturaleza)
  parent_id uuid references tipos_proyecto(id),   -- jerarquia: rampa/elevador -> accesibilidad
  orden integer,
  activo boolean not null default true,
  constraint tipos_proyecto_naturaleza_check
    check (naturaleza is null or naturaleza in ('proyecto', 'servicio', 'documento_tecnico'))
);
comment on table tipos_proyecto is 'Catalogo editable de tipos de proyecto. naturaleza reusa el vocab de bloques; parent_id da jerarquia (subtipos).';

create table proyecto_tipos (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  tipo_id uuid not null references tipos_proyecto(id),
  constraint proyecto_tipos_uniq unique (proyecto_id, tipo_id)
);
comment on table proyecto_tipos is 'Tags de tipo de un proyecto (M:N). Los combos se guardan desglosados: buscar por un tipo recoge todos sus combos.';

alter table proyectos add column proyecto_externo boolean not null default false;
comment on column proyectos.proyecto_externo is 'El proyecto tecnico lo hace otro arquitecto: sin acceso a docs (se piden al admin), mas gestion y precio.';

create index idx_tipos_proyecto_parent on tipos_proyecto(parent_id);
create index idx_proyecto_tipos_proyecto on proyecto_tipos(proyecto_id);
create index idx_proyecto_tipos_tipo on proyecto_tipos(tipo_id);

create trigger trg_set_actualizado_en before update on tipos_proyecto for each row execute function set_actualizado_en();

alter table tipos_proyecto enable row level security;
alter table proyecto_tipos enable row level security;

-- ---- Semilla del catalogo ----
insert into tipos_proyecto (clave, nombre, naturaleza, orden) values
  ('ascensor',      'Ascensor',                            'proyecto',          10),
  ('sate',          'SATE / envolvente termica',           'proyecto',          20),
  ('cubierta',      'Cubierta (termica parcial)',          'proyecto',          30),
  ('accesibilidad', 'Accesibilidad',                       'proyecto',          40),
  ('pericial',      'Informe pericial',                    'servicio',          60),
  ('df',            'Direccion facultativa',               'servicio',          70),
  ('doc_tecnica',   'Documentacion tecnica (IEE/LEE/CEE)', 'documento_tecnico', 80),
  ('otro',          'Otro',                                null,                90);
-- subtipos de accesibilidad (jerarquia)
insert into tipos_proyecto (clave, nombre, naturaleza, parent_id, orden)
select 'rampa', 'Rampa', 'proyecto', id, 50 from tipos_proyecto where clave = 'accesibilidad';
insert into tipos_proyecto (clave, nombre, naturaleza, parent_id, orden)
select 'elevador', 'Elevador', 'proyecto', id, 51 from tipos_proyecto where clave = 'accesibilidad';

-- ---- Backfill: desglosar los 16 crudos en tags (join por el texto crudo) ----
update proyectos set proyecto_externo = true where tipo in ('subv ASC EXTERNO', 'subv SATE EXTERNO');

insert into proyecto_tipos (proyecto_id, tipo_id)
select p.id, t.id
from proyectos p
join tipos_proyecto t on
     (t.clave = 'ascensor'      and p.tipo in ('ASCENSOR', 'SATE + ASC', 'subv ASC EXTERNO', 'ASC + ACCES', 'ASCENSOR + CUBIERTA'))
  or (t.clave = 'sate'          and p.tipo in ('SATE', 'SATE + ASC', 'SATE + ACCESIB', 'subv SATE EXTERNO'))
  or (t.clave = 'accesibilidad' and p.tipo in ('ACCESIB', 'subv ACCESIB', 'SATE + ACCESIB', 'ASC + ACCES'))
  or (t.clave = 'cubierta'      and p.tipo in ('CUBIERTA', 'ASCENSOR + CUBIERTA', 'subv CUBIERTA'))
  or (t.clave = 'pericial'      and p.tipo in ('PERICIAL'))
  or (t.clave = 'df'            and p.tipo in ('SOLO DF'))
  or (t.clave = 'doc_tecnica'   and p.tipo in ('SOLO IEE'))
  or (t.clave = 'otro'          and p.tipo in ('OTRO'));
