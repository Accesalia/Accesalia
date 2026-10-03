-- ===========================================================================
-- LA VIABILIDAD QUE ESCRIBE ALEX   (Monica, 3-oct-2026)
--
-- Estructura aprobada por ella, campo a campo, despues de la maqueta
-- docs/figma/mesa-alex.html ("esta PERFECTA, vamos a llevarla a la app").
--
-- QUIEN PONE QUE (sus palabras):
--   · Alex: la captura del 3D, objeto, descripcion (general + una por
--     escalera), conclusion, el 3D de catalogo o especifico, y el PEM estimado.
--     "Alex llega hasta donde llegue y el comercial lo redacta a gusto de su
--     cliente."
--   · El comercial: sus precios (vienen de la hoja de encargo) y las tasas e
--     ICIO.
--   · Daniel: solo si Alex se atasca.
--
-- LOS TRES PRECIOS DE UNA OBRA: PEM -> + 19% beneficio industrial = obra sin
-- IVA -> + 10% de IVA = lo que pagan. El 19 y el 10 son datos de CADA
-- viabilidad, con ese valor de partida: no se escriben en el codigo.
--
-- EL ESTADO NO SE GUARDA, se deduce: sin `enviada_en` es borrador de Alex; con
-- ella, esta en manos del comercial. Igual que los avisos de direccion de la
-- oportunidad: lo que se calcula no se desincroniza.
--
-- ESCANEOS: normalmente uno por viabilidad, pero "a veces de DOS escaneos sale
-- UNA viabilidad conjunta". Nunca un escaneo en dos. Por eso la flecha va del
-- escaneo a la viabilidad.
--
-- `viabilidades` existia vacia (0 filas, diseño de julio). Se reaprovecha.
--
-- PENDIENTE, frenado por la proteccion de produccion (quita cosas): borrar las
-- columnas que el diseño de hoy deja sin sentido -numero, version, vigente,
-- arquitecto_id (siempre Daniel), viable, coste_obra_base,
-- coste_obra_iva_porcentaje, coste_obra_total, url_pdf- y llevar
-- `viabilidad_conceptos` (los honorarios; salen de la hoja de encargo) a
-- historico_de_tablas. Estan vacias: no estorban mientras tanto. Ademas las
-- leen lib/viabilidad.ts y lib/pdf/viabilidad-datos.ts, del diseño de julio,
-- que ninguna pantalla usa: se retiran a la vez.
-- ===========================================================================

begin;

-- ---------------------------------------------------------- viabilidades
alter table viabilidades
  add column if not exists pem_estimado numeric,
  add column if not exists beneficio_industrial_pct numeric not null default 19,
  add column if not exists iva_obra_pct numeric not null default 10,
  add column if not exists tasas_icio_estimadas numeric,
  add column if not exists captura text,
  add column if not exists modelo_escalera_id uuid references modelos_escalera(id),
  add column if not exists necesita_3d_especifico boolean not null default false,
  add column if not exists redacta_id uuid references equipo(id),
  add column if not exists enviada_en timestamptz,
  add column if not exists daniel_avisado_en timestamptz;

comment on column viabilidades.pem_estimado is
  'Presupuesto de ejecucion material estimado. Lo decide Alex para ese tipo de obra.';
comment on column viabilidades.beneficio_industrial_pct is
  'Lo que se suma al PEM para el precio de la obra sin IVA. Parte de 19; se cambia en cada viabilidad si hace falta.';
comment on column viabilidades.iva_obra_pct is
  'IVA de la obra con la contrata. Parte de 10. (Nuestros honorarios van al 21: somos oficina, no constructora.)';
comment on column viabilidades.tasas_icio_estimadas is
  'Tasas urbanisticas e ICIO, sin IVA. Van SIEMPRE: toda obra lleva licencia o DR. Las pone el comercial.';
comment on column viabilidades.captura is
  'Ruta en el almacen de la imagen del 3D que va en el documento. Una por viabilidad.';
comment on column viabilidades.necesita_3d_especifico is
  'true = ningun 3D del catalogo lo cubre y hace falta uno especifico para la junta.';
comment on column viabilidades.enviada_en is
  'Cuando Alex la mando al comercial. Vacio = borrador de Alex.';
comment on column viabilidades.daniel_avisado_en is
  'Cuando Alex pidio ayuda a Daniel ("si se atasca, avisa a Daniel").';

-- --------------------------------------- una descripcion por escalera
create table if not exists relacion_viabilidad_accesos (
  viabilidad_id uuid not null references viabilidades(id) on delete cascade,
  acceso_id     uuid not null references accesos(id) on delete cascade,
  descripcion   text,
  creado_en     timestamptz not null default now(),
  primary key (viabilidad_id, acceso_id)
);
comment on table relacion_viabilidad_accesos is
  'Las escaleras de una viabilidad, cada una con su texto ("Escalera 1: se modificara el trazado..."). Se parte porque se repite: nueve escaleras, nueve textos.';

-- ----------------------------------------- de que viabilidad es el escaneo
alter table escaneados_polycam
  add column if not exists viabilidad_id uuid references viabilidades(id) on delete set null;
comment on column escaneados_polycam.viabilidad_id is
  'La viabilidad a la que pertenece. Varios escaneos pueden ir a la misma; uno nunca a dos.';
create index if not exists escaneados_polycam_viabilidad_idx on escaneados_polycam (viabilidad_id);

commit;
