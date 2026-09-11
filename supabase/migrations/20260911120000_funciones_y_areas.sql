-- =============================================================================
-- ERP Accesalia — Acceso por FUNCION: funciones con fechas, areas y que abre
-- cada funcion. Primer paso del login (11-sep-2026).
--
-- LAS REGLAS, todas de Monica:
--   - Los perfiles van por FUNCION, nunca por nombre de persona: "por si
--     cambiamos de personal, o si se dividen funciones".
--   - A una persona se le da una funcion, nunca un acceso suelto. Lo que abre
--     una funcion no se retoca para nadie en concreto.
--   - Cada asignacion lleva desde y hasta. El acceso lo dan solo las vigentes
--     hoy. Asi se retira un acceso sin tocar nada mas, se da uno temporal, y se
--     cubren vacaciones: las funciones de Alexandra pasan a Adriana con las
--     fechas de su ausencia.
--   - El historial cuenta la verdad: lo que alguien hizo sigue a su nombre.
--     Pero con la funcion se va el acceso.
--
-- AREAS Y FUNCIONES SON DOS LISTAS, aunque hoy coincidan (comercial, RRHH,
-- produccion, direccion). Se separan en cuanto se mira un poco mas alla: el
-- expediente sera un area en la que entran muchas funciones; los arquitectos
-- trabajan en produccion sin ser control de produccion; direccion tiene su
-- area pero ademas lo ve todo. Unirlas ahora obligaria a separarlas despues.
--
-- ASIGNAR Y CONTROLAR SON UNA FUNCION. Monica lo describe como un solo ciclo:
-- repartir proyectos, RQ, memorias o fines de obra entre los tecnicos segun
-- carga, tiempos y flujo de caja, con fecha de inicio y de fin prevista, y
-- vigilar que se cumpla y que cuadre con los gastos previstos.
--
-- SE RELLENA SOBRE LA MARCHA. Hoy solo las tres areas detectadas. Cada area
-- nueva añade sus filas el dia que se construya, que es cuando se sabe que
-- necesita: cada pantalla nace sabiendo quien la ve.
--
-- PENDIENTE, apuntado y NO construido: la segunda capa, permisos por TIPO de
-- documento (ver / subir / modificar). Subvenciones necesita ver la IEE, el
-- CEE y el proyecto, pero no entrar al area de IEE. Llegara con el archivo de
-- documentos de las comunidades.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Funciones con fechas
-- ---------------------------------------------------------------------------
-- desde vacio = desde antes de registrarlo. No se inventan fechas para las
-- asignaciones que ya existen.
alter table equipo_funciones
  add column if not exists desde          date,
  add column if not exists hasta          date,
  add column if not exists actualizado_en timestamptz not null default now();

alter table equipo_funciones drop constraint if exists equipo_funciones_fechas_ck;
alter table equipo_funciones
  add constraint equipo_funciones_fechas_ck check (hasta is null or desde is null or hasta >= desde);

-- La misma persona puede tener la misma funcion varias veces en su vida (Adriana
-- cubre a Alexandra cada verano; Ivan podria volver a proyectos). Lo que no puede
-- es tenerla abierta dos veces a la vez sin fin.
alter table equipo_funciones drop constraint if exists equipo_funciones_uniq;
create unique index if not exists uq_equipo_funciones_abierta
  on equipo_funciones (equipo_id, funcion_id) where hasta is null;

comment on column equipo_funciones.desde is 'Desde cuando tiene la funcion. Vacio = desde antes de que se registrara.';
comment on column equipo_funciones.hasta is 'Hasta cuando. Vacio = sigue. El acceso lo dan solo las funciones vigentes hoy.';

drop trigger if exists trg_set_actualizado_en on equipo_funciones;
create trigger trg_set_actualizado_en before update on equipo_funciones
  for each row execute function set_actualizado_en();

-- ---------------------------------------------------------------------------
-- 2. El catalogo de funciones: "ve todo" y las que faltaban
-- ---------------------------------------------------------------------------
alter table funciones add column if not exists ve_todo boolean not null default false;
comment on column funciones.ve_todo is 'Da acceso a todas las areas, tambien a las que se creen despues, sin que nadie tenga que acordarse de darselas. Es la de direccion.';

update funciones set ve_todo = true where clave = 'direccion';

-- "Asignacion de proyectos" pasa a ser lo que Monica describe: asignar Y
-- controlar el trabajo. Se renombra la fila, no se crea otra, para que quien la
-- tiene la conserve.
update funciones
   set clave = 'control_produccion',
       nombre = 'Asignacion y control de produccion',
       descripcion = 'Reparte el trabajo entre los tecnicos y controla como va.'
 where clave = 'asignacion';

insert into funciones (clave, nombre, descripcion, orden) values
  ('rrhh', 'RRHH', 'Recursos humanos: contratos, nominas, vacaciones y ausencias. Aprueba las vacaciones.', 190)
on conflict (clave) do nothing;

-- Hoy RRHH la lleva Alexandra (Monica, 11-sep-2026).
insert into equipo_funciones (equipo_id, funcion_id)
select e.id, f.id from equipo e, funciones f
 where e.nombre = 'Alexandra' and e.activo and f.clave = 'rrhh'
   and not exists (select 1 from equipo_funciones x where x.equipo_id = e.id and x.funcion_id = f.id and x.hasta is null);

-- ---------------------------------------------------------------------------
-- 3. Areas: los espacios de trabajo
-- ---------------------------------------------------------------------------
create table if not exists areas (
  id                 uuid        primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  clave              text        not null unique,
  nombre             text        not null,
  descripcion        text,
  orden              integer,
  activa             boolean     not null default true
);

comment on table areas is 'Espacios de trabajo de la app (lo pendiente, las notas, el dia a dia). Una funcion entra o no. Los documentos que circulan entre areas iran aparte, por tipo.';

insert into areas (clave, nombre, descripcion, orden) values
  ('comercial',  'Area comercial', 'Oportunidades, diario, cartera de administraciones.', 10),
  ('rrhh',       'RRHH',           'Empleados, contratos, nominas, vacaciones y ausencias.', 20),
  ('produccion', 'Produccion',     'El trabajo tecnico: quien hace que proyecto y como va.', 30),
  -- La casa de Sali como copiloto: "Sali, ¿como voy este mes?". Cifras,
  -- atascos, alertas y recordatorios cruzando todas las areas.
  ('direccion',  'Direccion',      'Estadisticas, calculos, KPIs y Sali resolviendo cosas.', 5)
on conflict (clave) do nothing;

-- ---------------------------------------------------------------------------
-- 4. Que abre cada funcion
-- ---------------------------------------------------------------------------
create table if not exists funcion_areas (
  id                 uuid        primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  funcion_id         uuid        not null references funciones (id) on delete cascade,
  area_id            uuid        not null references areas (id) on delete cascade,
  nivel              text        not null,
  constraint funcion_areas_nivel_ck check (nivel in ('ver','trabajar')),
  constraint funcion_areas_uq unique (funcion_id, area_id)
);

comment on table funcion_areas is 'Que areas abre cada funcion y si solo ve o tambien trabaja. Se añaden filas al construir cada area. Direccion ve todas por ve_todo; su fila aqui es la de su area propia, que es suya y de nadie mas.';

insert into funcion_areas (funcion_id, area_id, nivel)
select f.id, a.id, 'trabajar'
  from (values ('comercial','comercial'), ('rrhh','rrhh'), ('control_produccion','produccion'),
               ('direccion','direccion')) v(funcion, area)
  join funciones f on f.clave = v.funcion
  join areas a on a.clave = v.area
on conflict (funcion_id, area_id) do nothing;

-- ---------------------------------------------------------------------------
-- 5. Trigger, RLS y permisos
-- ---------------------------------------------------------------------------
drop trigger if exists trg_set_actualizado_en on areas;
create trigger trg_set_actualizado_en before update on areas
  for each row execute function set_actualizado_en();

alter table areas         enable row level security;
alter table funcion_areas enable row level security;

grant all privileges on table areas         to service_role;
grant all privileges on table funcion_areas to service_role;
