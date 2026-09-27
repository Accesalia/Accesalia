-- EL CATALOGO DE "QUE SE HACE", PULIDO CON MONICA (27-sep-2026).
--
-- Nada se borra. Las 11 filas de hoy siguen aqui con su id intacto, asi que los
-- 609 proyectos y sus 636 enlaces no se tocan: leen el nombre nuevo solos.
--
-- Sus criterios, que son los que dan forma a esto:
--   · Todo lo que es obra va a tecnico SIEMPRE. Que haya hueco o no solo cambia
--     el precio, no la ruta. Por eso "modificacion asc." tambien es obra.
--   · La jerarquia NO es cosmetica: es el filtro de a que subvenciones puede
--     acceder cada cosa. Un cambio de puertas no puede pedir las de ascensor,
--     pero si las de accesibilidad. De ahi que cuelgue de accesibilidad.
--   · Eficiencia / Intervenciones exterior es el mismo truco: mismo sitio del
--     edificio, distinta naturaleza, distintas subvenciones.
--   · En pantalla se lee SOLO el ultimo termino. El prefijo SATE es lo que
--     distingue "SATE cubierta" de "Arreglo cubierta" sin ver el padre.
--
-- Los agrupadores no se eligen: si se pudieran, en seis meses habria proyectos
-- etiquetados "Accesibilidad" a secas sin saber que eran.

alter table tipos_proyecto add column if not exists elegible boolean not null default true;
comment on column tipos_proyecto.elegible is 'false en los agrupadores: existen para agrupar y filtrar subvenciones, no para elegirlos.';

-- ── 1 · los renombres. Mismo id, nombre nuevo: los proyectos los siguen ──────
update tipos_proyecto set clave='plataforma', nombre='Plataforma', orden=90 where clave='elevador';
update tipos_proyecto set nombre='Memoria técnica valorada', orden=170 where clave='memoria_valorada';
update tipos_proyecto set nombre='Otros', orden=180 where clave='otro';
update tipos_proyecto set nombre='DF', orden=210 where clave='df';
update tipos_proyecto set nombre='Informe pericial', orden=270 where clave='pericial';
update tipos_proyecto set nombre='Ascensor', orden=10 where clave='ascensor';
update tipos_proyecto set nombre='Rampa', orden=80 where clave='rampa';

-- Los 14 de "SOLO IEE" de Monday: se quedan en su fila, que pasa a ser IEE.
-- El paquete se crea aparte y se usa de ahora en adelante.
update tipos_proyecto set clave='iee', nombre='IEE', orden=230 where clave='doc_tecnica';

-- ── 2 · los dos agrupadores nuevos ──────────────────────────────────────────
insert into tipos_proyecto (clave, nombre, naturaleza, orden, elegible, activo) values
  ('eficiencia_energetica',   'Eficiencia energética',   'proyecto', 100, false, true),
  ('intervenciones_exterior', 'Intervenciones exterior', 'proyecto', 140, false, true)
on conflict (clave) do update set nombre=excluded.nombre, orden=excluded.orden, elegible=excluded.elegible;

update tipos_proyecto set nombre='Accesibilidad', orden=20, elegible=false where clave='accesibilidad';

-- ── 3 · la eficiencia se lleva el SATE y la cubierta de hoy ─────────────────
update tipos_proyecto set nombre='SATE envolvente completa', orden=110,
       parent_id=(select id from tipos_proyecto where clave='eficiencia_energetica')
 where clave='sate';
update tipos_proyecto set nombre='SATE cubierta', orden=130,
       parent_id=(select id from tipos_proyecto where clave='eficiencia_energetica')
 where clave='cubierta';

-- ── 4 · las obras que faltaban ──────────────────────────────────────────────
insert into tipos_proyecto (clave, nombre, naturaleza, parent_id, orden, elegible, activo) values
  ('modificacion_asc', 'Modificación asc.', 'proyecto',
     (select id from tipos_proyecto where clave='accesibilidad'), 30, true, true),
  ('sate_fachada', 'SATE fachada', 'proyecto',
     (select id from tipos_proyecto where clave='eficiencia_energetica'), 120, true, true),
  ('arreglo_fachada', 'Arreglo fachada', 'proyecto',
     (select id from tipos_proyecto where clave='intervenciones_exterior'), 150, true, true),
  ('arreglo_cubierta', 'Arreglo cubierta', 'proyecto',
     (select id from tipos_proyecto where clave='intervenciones_exterior'), 160, true, true)
on conflict (clave) do update
  set nombre=excluded.nombre, parent_id=excluded.parent_id, orden=excluded.orden;

-- "hay hueco, se cambia lo de dentro": no hay planos ni ladrillos, pero va a
-- tecnico igual. Son los cuatro casos que ella enumero.
insert into tipos_proyecto (clave, nombre, naturaleza, parent_id, orden, elegible, activo) values
  ('cota_cero',      'Cota cero',         'proyecto', (select id from tipos_proyecto where clave='modificacion_asc'), 40, true, true),
  ('cambio_puertas', 'Cambio de puertas', 'proyecto', (select id from tipos_proyecto where clave='modificacion_asc'), 50, true, true),
  ('cambio_cabina',  'Cambio de cabina',  'proyecto', (select id from tipos_proyecto where clave='modificacion_asc'), 60, true, true),
  ('anadir_parada',  'Añadir parada',     'proyecto', (select id from tipos_proyecto where clave='modificacion_asc'), 70, true, true)
on conflict (clave) do update
  set nombre=excluded.nombre, parent_id=excluded.parent_id, orden=excluded.orden;

-- ── 5 · los servicios que faltaban ──────────────────────────────────────────
-- La naturaleza sale de SUS palabras de hoy: la consulta urbanistica "es como
-- un proyecto: planos, visado"; el resto, servicio o documento tecnico. Los
-- atributos finos —quien lo hace, si se visa, como se cobra— son otro sprint.
insert into tipos_proyecto (clave, nombre, naturaleza, orden, elegible, activo) values
  ('consulta_urbanistica', 'Consulta urbanística',              'proyecto',          190, true, true),
  ('cfo',                  'CFO',                               'servicio',          200, true, true),
  ('css',                  'CSS',                               'servicio',          220, true, true),
  ('lee',                  'LEE',                               'documento_tecnico', 240, true, true),
  ('cee',                  'CEE',                               'documento_tecnico', 250, true, true),
  ('doc_tecnica_subv',     'Doc técnica subv (IEE+CEE+LEE)',    'documento_tecnico', 260, true, true),
  ('toma_datos_3d',        'Toma de datos y Modelado 3D',       'servicio',          280, true, true),
  ('subvenciones',         'Subvenciones',                      'servicio',          290, true, true),
  ('licencia',             'Licencia',                          'servicio',          300, true, true),
  ('tres_presupuestos',    '3 Presupuestos',                    'servicio',          310, true, true),
  ('financiacion',         'Financiación',                      'servicio',          320, true, true),
  ('visado_colegio',       'Visado Colegio',                    null,                330, true, true)
on conflict (clave) do update
  set nombre=excluded.nombre, naturaleza=excluded.naturaleza, orden=excluded.orden;
