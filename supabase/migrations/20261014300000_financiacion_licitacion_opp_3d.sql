-- =============================================================================
-- TRES HUECOS PARA LO LEIDO EN EL CORREO DE ALVARO (Monica, 14-oct-2026: "si, ok")
--
-- 1. FINANCIACION DE LA OPP. "Anotar financiacion en aquellas que nos consta.
--    Habra que crear una tabla para guardar esto y a que entidad se lo pasamos
--    (puede ser mas de una) y si al final firman credito o no. No hay pantalla
--    para todo esto aun, pero la habra." Una fila por opp y entidad.
--
-- 2. LA LICITACION (los 3 presupuestos de contrata) COLGADA DE LA OPP. El modelo
--    existe desde julio (licitaciones + presupuestos_licitacion, con "adjudicada"),
--    pero solo colgaba del PROYECTO. La contrata elegida en junta se sabe antes de
--    que haya proyecto: ahora puede colgar del proyecto o de la opp.
--
-- 3. EL 3D. "Los 3D se guardan, y la opp apunta a ellos": modelos_3d_venta ya
--    apunta a la opp. Le faltaban dos cosas: poder decir que hace falta 3D sin
--    saber aun si es de catalogo o a medida, y el enlace al fichero.
--
-- Convenciones: CHECK con nombre (nunca enum); RLS sin politicas; trigger
-- set_actualizado_en.
-- =============================================================================

-- 1 ---------------------------------------------------------------------------
create table financiacion_oportunidad (
  id               uuid        primary key default gen_random_uuid(),
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),
  oportunidad_id   uuid        not null references oportunidades (id) on delete cascade,
  entidad_id       uuid        references empresa (id),
  entidad_nombre   text,
  estado           text        not null default 'consultada',
  importe          numeric,
  plazo_meses      integer,
  fecha_consulta   date,
  fecha_resolucion date,
  fecha_firma      date,
  notas            text,
  origen           text,
  constraint financiacion_oportunidad_entidad_ck check (entidad_id is not null or nullif(btrim(entidad_nombre), '') is not null),
  constraint financiacion_oportunidad_estado_ck check (estado in
    ('consultada', 'simulacion', 'solicitada', 'aprobada', 'denegada', 'firmada', 'desistida'))
);
comment on table financiacion_oportunidad is
  'La financiacion de una opp: una fila por entidad a la que se le pasa (UCI, un banco...). Puede haber varias. Termina en firmada, denegada o desistida.';
comment on column financiacion_oportunidad.entidad_id is 'La entidad financiera (empresa). Si aun no esta dada de alta, entidad_nombre.';
comment on column financiacion_oportunidad.estado is 'consultada -> simulacion -> solicitada -> aprobada / denegada -> firmada / desistida.';
comment on column financiacion_oportunidad.origen is 'De donde sale el dato (p. ej. "correo de Alvaro, hilo ...").';
create index financiacion_oportunidad_opp_idx on financiacion_oportunidad (oportunidad_id);
alter table financiacion_oportunidad enable row level security;
create trigger trg_set_actualizado_en before update on financiacion_oportunidad
  for each row execute function set_actualizado_en();

-- 2 ---------------------------------------------------------------------------
alter table licitaciones add column oportunidad_id uuid references oportunidades (id);
alter table licitaciones alter column proyecto_id drop not null;
alter table licitaciones add constraint licitaciones_proyecto_u_opp_ck check (proyecto_id is not null or oportunidad_id is not null);
comment on column licitaciones.oportunidad_id is
  'La opp de la que cuelga, cuando aun no hay proyecto (la contrata se elige en junta). Proyecto u opp: al menos uno.';
create index licitaciones_opp_idx on licitaciones (oportunidad_id);

-- 3 ---------------------------------------------------------------------------
alter table modelos_3d_venta alter column tipo_3d drop not null;
comment on column modelos_3d_venta.tipo_3d is
  'De catalogo (generico_escalera), a medida o diseno de portal. Vacio = hace falta 3D, pero aun no se sabe de que tipo.';
alter table modelos_3d_venta add column enlace_3d text;
comment on column modelos_3d_venta.enlace_3d is 'Donde esta el fichero del 3D (sobre todo los a medida; los de catalogo, por modelo_escalera_id).';
