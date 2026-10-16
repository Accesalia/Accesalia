-- ASIGNAR › PROYECTOS (Monica, 16-oct-2026). La cadena:
--   nube lista (o «nube no») -> ALEX estima (dificultad y dias; los cambia o da OK)
--   -> ALEXANDRA asigna A MANO a un tecnico (nunca se preasigna) -> el tecnico.
-- Los requerimientos los asigna Alexandra igual: no se cobran, pero consumen
-- dias de tecnico. Ya asignado, Alexandra puede cambiar la dificultad o los dias
-- («para al menos SABER que ese dinero llegara mas tarde»): queda el registro.

-- 1. LOS DIAS POR TIPO: tiempos_estandar (22-jul) admite medios dias, y los de Monica.
--    Mixtos: la obra mas larga + cada una de las otras menos «ahorro_por_obra»
--    (asc 3 + SATE 5 = 6), con un minimo de medio dia por obra. Alex afina.
alter table tiempos_estandar alter column dias type numeric(4,1);
insert into tiempos_estandar (contexto, clave, dias, descripcion) values
  ('proyecto', 'ascensor',             3,   'Ascensor'),
  ('proyecto', 'sate',                 5,   'SATE envolvente completa'),
  ('proyecto', 'sate_fachada',         4,   'SATE fachada'),
  ('proyecto', 'cubierta',             3,   'SATE cubierta'),
  ('proyecto', 'plataforma',           2.5, 'Plataforma'),
  ('proyecto', 'rampa',                2.5, 'Rampa'),
  ('proyecto', 'consulta_urbanistica', 2.5, 'Consulta urbanistica'),
  ('proyecto', 'informe_tecnico',      1.5, 'Informe tecnico'),
  ('proyecto', 'memoria_valorada',     1.5, 'Memoria tecnica valorada'),
  ('mixto',    'ahorro_por_obra',      2,   'Dias que ahorra cada obra que se suma a la mas larga (la parte comun)'),
  ('mixto',    'minimo_por_obra',      0.5, 'Lo minimo que suma una obra anadida')
on conflict (contexto, clave) do update set dias = excluded.dias, descripcion = excluded.descripcion;

-- 2. LOS TRABAJOS DE TECNICO: uno por proyecto (por oportunidad) y los requerimientos.
create table trabajos_tecnico (
  id               uuid primary key default gen_random_uuid(),
  oportunidad_id   uuid not null references oportunidades(id) on delete cascade,
  tipo             text not null default 'proyecto',
  nombre           text,                         -- el del requerimiento («RQ Ayto. Coslada»)
  dificultad       text not null default 'normal',
  dias             numeric(4,1),                 -- dias de redaccion estimados
  dias_calculados  numeric(4,1),                 -- los del estandar, para ver cuanto se afino
  estimado_en      timestamptz,                  -- el OK de Alex
  estimado_por     uuid references equipo(id),
  tecnico_id       uuid references equipo(id),
  orden            integer,                      -- su sitio en la lista del tecnico
  asignado_en      timestamptz,
  asignado_por     uuid references equipo(id),
  creado_por       uuid references equipo(id),
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),
  constraint trabajos_tecnico_tipo_check check (tipo in ('proyecto', 'requerimiento')),
  constraint trabajos_tecnico_dificultad_check check (dificultad in ('baja', 'normal', 'alta')),
  constraint trabajos_tecnico_rq_nombre_check check (tipo = 'proyecto' or nombre is not null)
);
create unique index trabajos_tecnico_un_proyecto on trabajos_tecnico (oportunidad_id) where tipo = 'proyecto';
create index trabajos_tecnico_tecnico on trabajos_tecnico (tecnico_id, orden);
comment on table trabajos_tecnico is 'Lo que consume dias de tecnico: proyectos (uno por oportunidad; Alex estima, Alexandra asigna a mano) y requerimientos (no se cobran).';
create trigger trg_set_actualizado_en before update on trabajos_tecnico for each row execute function set_actualizado_en();
alter table trabajos_tecnico enable row level security;

-- 3. EL REGISTRO DE CAMBIOS de dias, dificultad y tecnico, una vez estimado.
create table trabajos_tecnico_cambios (
  id          uuid primary key default gen_random_uuid(),
  trabajo_id  uuid not null references trabajos_tecnico(id) on delete cascade,
  campo       text not null,
  antes       text,
  despues     text,
  por         uuid references equipo(id),
  en          timestamptz not null default now(),
  constraint trabajos_tecnico_cambios_campo_check check (campo in ('dias', 'dificultad', 'tecnico'))
);
create index trabajos_tecnico_cambios_trabajo on trabajos_tecnico_cambios (trabajo_id, en);
alter table trabajos_tecnico_cambios enable row level security;

-- 4. LA FUNCION DE ALEX: estimar los proyectos (distinta de viabilidades). Y Alex
--    tambien hace proyectos: entra en la lista de tecnicos.
insert into funciones (clave, nombre, descripcion, orden, activa, ve_todo)
values ('estimacion_proyectos', 'Estimacion de proyectos', 'Revisa cada proyecto antes de asignarlo: dificultad (baja, normal, alta) y dias estimados.', 45, true, false)
on conflict (clave) do nothing;
insert into equipo_funciones (equipo_id, funcion_id, desde)
select e.id, f.id, current_date
from equipo e, funciones f
where e.nombre = 'Alex' and e.apellidos = 'Figueroa' and f.clave in ('estimacion_proyectos', 'proyecto')
  and not exists (select 1 from equipo_funciones x where x.equipo_id = e.id and x.funcion_id = f.id);

-- 5. TERMINADO: en un proyecto, la redaccion entregada (el tecnico queda libre y
--    el cobro sigue por visado y OK desde ese dia); en un requerimiento, hecho.
alter table trabajos_tecnico
  add column terminado_en  timestamptz,
  add column terminado_por uuid references equipo(id);
comment on column trabajos_tecnico.terminado_en is 'Proyecto: redaccion entregada (el tecnico queda libre; el cobro sigue por visado y OK). Requerimiento: hecho (sale de la lista).';
