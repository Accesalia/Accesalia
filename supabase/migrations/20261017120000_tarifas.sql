-- LAS TARIFAS (Monica, 17-oct-2026). Los precios habituales por tipo de
-- cliente, que se actualizan con el IPC cada cierto tiempo a mano, en su
-- pantalla. El generador de hojas tomara de aqui el precio prerrelleno (siempre
-- modificable), como ya toma la forma de pago por defecto.
--
-- Tres modelos de partida, de sus Word de tarifas 2026:
--   * Comunidades y pequeñas contratas: la general (comunidades, particulares y
--     toda contrata sin otra asignada).
--   * Ascensoristas: Schindler.
--   * Rehabilitadores completos: Elecnor, FAIN, Envoltermia.
-- Mañana puede haber uno negociado con alguien en concreto: es un modelo mas.

create table tarifas (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  nombre          text        not null unique,
  descripcion     text,
  general         boolean     not null default false,
  orden           integer,
  activa          boolean     not null default true
);
comment on table tarifas is 'Modelo de precios por tipo de cliente. La general vale para comunidades, particulares y contratas sin tarifa asignada.';
create unique index tarifas_una_sola_general on tarifas (general) where general;
create trigger trg_set_actualizado_en before update on tarifas for each row execute function set_actualizado_en();
alter table tarifas enable row level security;

alter table contratas add column tarifa_id uuid references tarifas(id);
comment on column contratas.tarifa_id is 'Su tarifa (convenio). Vacia = la general.';

-- UN PRECIO es la tarifa + el concepto (bloque) + que se hace (si importa) + el
-- tramo de viviendas del edificio (si importa). Cada cambio es una fila nueva
-- con su "vigente desde": la vigente es la ultima que ya ha empezado, y las
-- anteriores quedan como historial. Las hojas copian el importe: un cambio aqui
-- no toca nada firmado.
create table precios_tarifa (
  id                uuid          primary key default gen_random_uuid(),
  creado_en         timestamptz   not null default now(),
  actualizado_en    timestamptz   not null default now(),
  creado_por        uuid          references equipo(id),
  tarifa_id         uuid          not null references tarifas(id) on delete cascade,
  bloque_id         uuid          not null references bloques(id),
  tipo_proyecto_id  uuid          references tipos_proyecto(id),
  viviendas_desde   integer,
  viviendas_hasta   integer,
  forma             text          not null default 'fijo',
  importe           numeric(12,2),
  porcentaje        numeric(6,3),
  incluye           uuid[]        not null default '{}',
  nota              text,
  vigente_desde     date          not null default current_date,
  baja              boolean       not null default false,
  constraint precios_tarifa_forma_check check (forma in ('fijo', 'pct_pem', 'pct_exito')),
  constraint precios_tarifa_valor_check check (baja or (forma = 'fijo' and importe is not null) or (forma <> 'fijo' and porcentaje is not null)),
  constraint precios_tarifa_tramo_check check (viviendas_desde is null or viviendas_hasta is null or viviendas_desde <= viviendas_hasta)
);
comment on table precios_tarifa is 'Precio habitual de un concepto en una tarifa, por que se hace y tramo de viviendas. Historial por vigente_desde; baja = deja de aplicarse desde esa fecha.';
comment on column precios_tarifa.forma is 'fijo (importe en euros), pct_pem (% del PEM estimado de la viabilidad) o pct_exito (% de lo concedido).';
comment on column precios_tarifa.incluye is 'Bloques que, con este precio, van Incluidos (el proyecto de ascensor incluye la DF...).';
create index precios_tarifa_clave on precios_tarifa (tarifa_id, bloque_id, tipo_proyecto_id, viviendas_desde, vigente_desde);
create trigger trg_set_actualizado_en before update on precios_tarifa for each row execute function set_actualizado_en();
alter table precios_tarifa enable row level security;

-- --------------------------------------------------------------- los modelos
insert into tarifas (nombre, descripcion, general, orden) values
  ('Comunidades y pequeñas contratas', 'La general: comunidades, particulares y contratas sin otra tarifa. Uso interno.', true, 1),
  ('Ascensoristas', 'Convenio con contratas de ascensores (Schindler).', false, 2),
  ('Rehabilitadores completos', 'Convenio con rehabilitadores (Elecnor, FAIN, Envoltermia): accesibilidad y SATE.', false, 3);

update contratas set tarifa_id = (select id from tarifas where nombre = 'Ascensoristas')
 where nombre = 'SCHINDLER';
update contratas set tarifa_id = (select id from tarifas where nombre = 'Rehabilitadores completos')
 where nombre in ('ELECNOR', 'FAIN', 'ENVOLTERMIA');

-- ------------------------------------------------- los precios de 2026
-- (tarifa, bloque, que se hace, desde, hasta, forma, importe, %, incluye, nota)
insert into precios_tarifa (tarifa_id, bloque_id, tipo_proyecto_id, viviendas_desde, viviendas_hasta, forma, importe, porcentaje, incluye, nota, vigente_desde)
select t.id, b.id, tp.id, v.desde, v.hasta, v.forma, v.importe, v.pct,
       coalesce((select array_agg(x.id) from bloques x where x.codigo = any (v.incluye)), '{}'),
       v.nota, date '2026-01-01'
from (values
  -- COMUNIDADES Y PEQUEÑAS CONTRATAS
  ('Comunidades y pequeñas contratas', 'REDACCION PROYECTO', 'Ascensor', 0, 9, 'fijo', 6900, null, array['DF','CSS'], 'Ascensor nuevo, con derribo: incluye dirección de obra, licencias y CSS'),
  ('Comunidades y pequeñas contratas', 'REDACCION PROYECTO', 'Ascensor', 10, 15, 'fijo', 7500, null, array['DF','CSS'], 'Ascensor nuevo, con derribo: incluye dirección de obra, licencias y CSS'),
  ('Comunidades y pequeñas contratas', 'REDACCION PROYECTO', 'Ascensor', 16, null, 'fijo', 8200, null, array['DF','CSS'], 'Ascensor nuevo, con derribo: incluye dirección de obra, licencias y CSS'),
  ('Comunidades y pequeñas contratas', 'REDACCION PROYECTO', 'Cota cero', null, null, 'fijo', 3500, null, array[]::text[], 'Sin incluir la CSS'),
  ('Comunidades y pequeñas contratas', 'REDACCION PROYECTO', 'Plataforma', null, null, 'fijo', 3500, null, array[]::text[], 'Elevadores, plataformas inclinadas o verticales. Sin incluir la CSS'),
  ('Comunidades y pequeñas contratas', 'REDACCION PROYECTO', 'Sustitución de ascensor', null, null, 'fijo', 2900, null, array[]::text[], null),
  ('Comunidades y pequeñas contratas', 'REDACCION PROYECTO', 'SATE envolvente completa', 0, 10, 'fijo', 8900, null, array['DF','CSS','TRAMITACION SUBVENCIONES','DOCUMENTACION TECNICA SUBVENCIONES'], 'Incluye subvención, DF y CSS hasta 30 viviendas'),
  ('Comunidades y pequeñas contratas', 'REDACCION PROYECTO', 'SATE envolvente completa', 11, 19, 'fijo', 9400, null, array['DF','CSS','TRAMITACION SUBVENCIONES','DOCUMENTACION TECNICA SUBVENCIONES'], 'Incluye subvención, DF y CSS hasta 30 viviendas'),
  ('Comunidades y pequeñas contratas', 'REDACCION PROYECTO', 'SATE envolvente completa', 20, 29, 'fijo', 9900, null, array['DF','CSS','TRAMITACION SUBVENCIONES','DOCUMENTACION TECNICA SUBVENCIONES'], 'Incluye subvención, DF y CSS hasta 30 viviendas'),
  ('Comunidades y pequeñas contratas', 'REDACCION PROYECTO', 'SATE envolvente completa', 30, null, 'pct_pem', null, 3, array[]::text[], 'Sobre el PEM estimado de la viabilidad'),
  ('Comunidades y pequeñas contratas', 'REDACCION PROYECTO', 'SATE fachada', 0, 10, 'fijo', 8900, null, array['DF','CSS','TRAMITACION SUBVENCIONES','DOCUMENTACION TECNICA SUBVENCIONES'], 'Como el SATE completo'),
  ('Comunidades y pequeñas contratas', 'REDACCION PROYECTO', 'SATE fachada', 11, 19, 'fijo', 9400, null, array['DF','CSS','TRAMITACION SUBVENCIONES','DOCUMENTACION TECNICA SUBVENCIONES'], 'Como el SATE completo'),
  ('Comunidades y pequeñas contratas', 'REDACCION PROYECTO', 'SATE fachada', 20, 29, 'fijo', 9900, null, array['DF','CSS','TRAMITACION SUBVENCIONES','DOCUMENTACION TECNICA SUBVENCIONES'], 'Como el SATE completo'),
  ('Comunidades y pequeñas contratas', 'REDACCION PROYECTO', 'SATE fachada', 30, null, 'pct_pem', null, 3, array[]::text[], 'Como el SATE completo. Sobre el PEM estimado'),
  ('Comunidades y pequeñas contratas', 'REDACCION PROYECTO', 'SATE cubierta', null, null, 'fijo', 6900, null, array[]::text[], 'SATE solo de cubierta'),
  ('Comunidades y pequeñas contratas', 'DF', 'SATE envolvente completa', 30, null, 'pct_pem', null, 1.5, array[]::text[], 'Aparte del proyecto, a partir de 30 viviendas'),
  ('Comunidades y pequeñas contratas', 'DF', 'SATE fachada', 30, null, 'pct_pem', null, 1.5, array[]::text[], 'Aparte del proyecto, a partir de 30 viviendas'),
  ('Comunidades y pequeñas contratas', 'CSS', null, null, null, 'fijo', 920, null, array[]::text[], null),
  ('Comunidades y pequeñas contratas', 'IEE', null, null, null, 'fijo', 980, null, array[]::text[], 'Podrá variar al alza a partir de 30 viviendas'),
  ('Comunidades y pequeñas contratas', 'LEE', null, null, null, 'fijo', 1350, null, array[]::text[], null),
  ('Comunidades y pequeñas contratas', 'DOCUMENTACION TECNICA SUBVENCIONES', null, null, null, 'fijo', 1980, null, array[]::text[], 'Si la comunidad no tiene uno válido, incluye CEE e IEE (y LEE en eficiencia energética)'),
  ('Comunidades y pequeñas contratas', 'TRAMITACION SUBVENCIONES', null, null, null, 'pct_exito', null, 3.5, array[]::text[], 'Hasta 2 años después de terminar la obra, sin renovaciones ni coste añadido'),
  -- ASCENSORISTAS (Schindler)
  ('Ascensoristas', 'REDACCION PROYECTO', 'Ascensor', null, null, 'fijo', 5800, null, array['DF'], 'Ascensor nuevo, con derribo: incluye dirección de obra y licencias'),
  ('Ascensoristas', 'REDACCION PROYECTO', 'Cota cero', null, null, 'fijo', 2850, null, array[]::text[], null),
  ('Ascensoristas', 'REDACCION PROYECTO', 'Plataforma', null, null, 'fijo', 2850, null, array[]::text[], 'Elevadores, plataformas inclinadas o verticales'),
  ('Ascensoristas', 'CSS', null, null, null, 'fijo', 920, null, array[]::text[], null),
  ('Ascensoristas', 'IEE', null, null, null, 'fijo', 980, null, array[]::text[], 'Podrá variar al alza a partir de 30 viviendas'),
  ('Ascensoristas', 'LEE', null, null, null, 'fijo', 1350, null, array[]::text[], null),
  ('Ascensoristas', 'DOCUMENTACION TECNICA SUBVENCIONES', null, null, null, 'fijo', 1980, null, array[]::text[], 'Si la comunidad no tiene uno válido, incluye CEE e IEE'),
  ('Ascensoristas', 'TRAMITACION SUBVENCIONES', null, null, null, 'pct_exito', null, 3.5, array[]::text[], 'Hasta 2 años después de terminar la obra, sin renovaciones ni coste añadido'),
  -- REHABILITADORES COMPLETOS (Elecnor, FAIN, Envoltermia)
  ('Rehabilitadores completos', 'REDACCION PROYECTO', 'Ascensor', null, null, 'fijo', 5950, null, array['DF'], 'Ascensor nuevo, con derribo: incluye dirección de obra y licencias'),
  ('Rehabilitadores completos', 'REDACCION PROYECTO', 'Cota cero', null, null, 'fijo', 2850, null, array[]::text[], null),
  ('Rehabilitadores completos', 'REDACCION PROYECTO', 'Plataforma', null, null, 'fijo', 2850, null, array[]::text[], 'Elevadores, plataformas inclinadas o verticales'),
  ('Rehabilitadores completos', 'REDACCION PROYECTO', 'SATE envolvente completa', 0, 29, 'fijo', 9200, null, array['DF','CSS','TRAMITACION SUBVENCIONES','DOCUMENTACION TECNICA SUBVENCIONES'], 'Incluye subvención, DF y CSS hasta 30 viviendas'),
  ('Rehabilitadores completos', 'REDACCION PROYECTO', 'SATE envolvente completa', 30, null, 'fijo', 9200, null, array['CSS','TRAMITACION SUBVENCIONES','DOCUMENTACION TECNICA SUBVENCIONES'], 'A partir de 30 viviendas la DF va aparte'),
  ('Rehabilitadores completos', 'REDACCION PROYECTO', 'SATE fachada', 0, 29, 'fijo', 9200, null, array['DF','CSS','TRAMITACION SUBVENCIONES','DOCUMENTACION TECNICA SUBVENCIONES'], 'Como el SATE completo'),
  ('Rehabilitadores completos', 'REDACCION PROYECTO', 'SATE fachada', 30, null, 'fijo', 9200, null, array['CSS','TRAMITACION SUBVENCIONES','DOCUMENTACION TECNICA SUBVENCIONES'], 'Como el SATE completo. A partir de 30 viviendas la DF va aparte'),
  ('Rehabilitadores completos', 'DF', 'SATE envolvente completa', 30, null, 'pct_pem', null, 1.5, array[]::text[], 'Aparte del proyecto, a partir de 30 viviendas'),
  ('Rehabilitadores completos', 'DF', 'SATE fachada', 30, null, 'pct_pem', null, 1.5, array[]::text[], 'Aparte del proyecto, a partir de 30 viviendas'),
  ('Rehabilitadores completos', 'CSS', null, null, null, 'fijo', 990, null, array[]::text[], null),
  ('Rehabilitadores completos', 'IEE', null, null, null, 'fijo', 980, null, array[]::text[], 'Podrá variar al alza a partir de 30 viviendas'),
  ('Rehabilitadores completos', 'LEE', null, null, null, 'fijo', 1350, null, array[]::text[], null),
  ('Rehabilitadores completos', 'DOCUMENTACION TECNICA SUBVENCIONES', null, null, null, 'fijo', 1980, null, array[]::text[], 'Si la comunidad no tiene uno válido, incluye CEE e IEE (y LEE en eficiencia energética)'),
  ('Rehabilitadores completos', 'TRAMITACION SUBVENCIONES', null, null, null, 'pct_exito', null, 3.5, array[]::text[], 'Hasta 2 años después de terminar la obra, sin renovaciones ni coste añadido')
) as v(tarifa, bloque, tipo, desde, hasta, forma, importe, pct, incluye, nota)
join tarifas t on t.nombre = v.tarifa
join bloques b on b.codigo = v.bloque
left join tipos_proyecto tp on tp.nombre = v.tipo;

-- Subvenciones: el 3,5 % pasa a ser el de por defecto (Monica, 17-oct-2026).
-- Cada hoja guarda el suyo: lo firmado al 3 % se queda al 3 %.
update bloques set porcentaje_exito = 3.5 where codigo = 'TRAMITACION SUBVENCIONES';
