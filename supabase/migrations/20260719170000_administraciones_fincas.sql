-- =============================================================================
-- ERP Accesalia — CRM: Administraciones de fincas (agrupacion de administradores)
--
-- El administrador (persona-contacto que trae el trabajo) puede ser:
--   a) un tio unico (autonomo o con nombre comercial): 1 fila en administradores,
--      administracion_id vacio. Su nombre comercial, si lo tiene, sigue en .empresa.
--   b) uno de varios que trabajan en/con una misma administracion de fincas:
--      1 fila en administraciones_fincas (la empresa) + N filas en administradores
--      con administracion_id.
--
-- Alcance: SOLO esquema. Aditivo y NO rompe nada: todo lo que ya apunta a
-- administradores (comunidades, oportunidades, cartera comercial...) sigue igual;
-- la administracion de fincas es solo el paraguas que agrupa a las personas.
--
-- Convenciones (heredadas): espanol sin tildes/enes; PK uuid; creado_en/
-- actualizado_en; SIN ENUMS (text + CHECK nombrado si hiciera falta); indices en
-- FKs; RLS habilitado sin politicas; trigger set_actualizado_en reutilizado.
-- =============================================================================


-- =============================================================================
-- 1. administraciones_fincas (la empresa administradora de fincas)
-- =============================================================================
create table administraciones_fincas (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  nombre          text        not null,
  cif             text,
  telefono        text,
  email           text,
  direccion       text,
  municipio       text,
  notas           text,
  activo          boolean     not null default true
);

comment on table administraciones_fincas is 'Empresa de administracion de fincas que agrupa a varios administradores (personas). OPCIONAL: un administrador autonomo (tio unico) no necesita administracion (administradores.administracion_id queda vacio). Es el paraguas; la persona-contacto sigue siendo administradores, que es quien trae el trabajo.';
comment on column administraciones_fincas.cif is 'CIF de la administracion de fincas (nullable).';
comment on column administraciones_fincas.municipio is 'Municipio de la sede (informativo; la jurisdiccion relevante es la de cada comunidad).';
comment on column administraciones_fincas.notas is 'Texto libre sobre la administracion (importancia comercial, como trabajar con ellos, etc.).';
comment on column administraciones_fincas.activo is 'Baja logica: false = ya no operativa.';


-- =============================================================================
-- 2. administradores.administracion_id (a que administracion pertenece la persona)
-- =============================================================================
alter table administradores
  add column administracion_id  uuid references administraciones_fincas (id),
  add column cargo              text;

comment on column administradores.administracion_id is 'Administracion de fincas a la que pertenece esta persona (FK a administraciones_fincas). Nullable: vacio cuando es un administrador autonomo sin empresa con mas gente. No cambia nada de lo existente: comunidades/oportunidades/cartera siguen colgando de la persona (administradores.id).';
comment on column administradores.cargo is 'Rol de la persona dentro de la administracion (ej. titular, gestor, secretaria). Texto libre; util cuando hay varias personas.';
comment on column administradores.empresa is 'Nombre comercial cuando NO hay administracion de fincas como entidad propia (tio unico con marca). Si administracion_id esta relleno, el nombre vive en administraciones_fincas.nombre y esta columna puede quedar vacia. (Comentario actualizado por la fase CRM).';

create index idx_administradores_administracion_id on administradores (administracion_id);


-- =============================================================================
-- 3. ROW LEVEL SECURITY (habilitado sin politicas, como el resto)
-- =============================================================================
alter table administraciones_fincas enable row level security;


-- =============================================================================
-- 4. TRIGGER actualizado_en (reutiliza set_actualizado_en de 20260718160000)
-- =============================================================================
drop trigger if exists trg_set_actualizado_en on public.administraciones_fincas;
create trigger trg_set_actualizado_en
  before update on public.administraciones_fincas
  for each row execute function set_actualizado_en();
