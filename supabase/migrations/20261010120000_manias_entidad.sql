-- =============================================================================
-- MANIAS: ENTIDAD + DETALLE, Y FECHAS (Monica, 10-oct-2026)
--
-- Para la pantalla "Manias detectadas" (Documentacion de referencia), con filtro
-- por entidad. `departamento` venia en texto libre con 55 formas distintas
-- ("Junta Municipal de Distrito de Carabanchel (negociado de licencias)"...).
-- Se separa en:
--   entidad       el organismo, limpio: "Junta de Distrito de Carabanchel"
--   departamento  lo de dentro, el detalle: "negociado de licencias"
--
-- Decisiones suyas:
--   · Patrimonio, CIPHAN y CPPHAN son lo mismo: "Patrimonio (CIPHAN)".
--   · El Patrimonio de Humanes es competencia autonomica: Comunidad de Madrid.
--   · A+ECU es una ECU (inspeccion de actividad por encargo del ayuntamiento).
--   · La convocatoria de amianto de Madrid: Ayuntamiento, Plan Rehabilita.
--   · Elena Garcia y Helena Garcia son la misma tecnica.
--   · Las 11 sin fecha: apertura de su opp + 4 meses (aproximada).
--   · A partir de ahora, sin fecha dada, la del dia en que se escribe.
-- =============================================================================

alter table manias_organismos add column entidad text;
comment on column manias_organismos.entidad is 'El organismo, limpio, para filtrar: "Ayuntamiento de Fuenlabrada", "Junta de Distrito de Latina", "ECU ACTECU", "Patrimonio (CIPHAN)". Lo de dentro (licencias, negociado...) va en departamento.';
comment on column manias_organismos.departamento is 'El detalle dentro de la entidad (licencias, mesa de ascensores, Plan Rehabilita...). Vacio si la nota no lo dice.';

alter table manias_organismos alter column fecha set default current_date;
comment on column manias_organismos.fecha is 'Cuando se detecto la mania (la fecha de la nota). Sin fecha dada, la del dia. Las 11 que no la tenian llevan la apertura de su opp + 4 meses (10-oct-2026).';

-- ---------------------------------------------------------------- Madrid
with mapa(original, entidad, detalle) as (values
  ('A+ECU / Ayuntamiento de Madrid (actividades)', 'ECU A+ECU', 'inspección de actividad por encargo del Ayuntamiento de Madrid'),
  ('ACTECU (ECU)', 'ECU ACTECU', null),
  ('ECU (ACTECU)', 'ECU ACTECU', null),
  ('ECU (ACTECU) / Patrimonio (CPPHAN)', 'ECU ACTECU', 'también Patrimonio (CIPHAN)'),
  ('ECU (EICI)', 'ECU EICI', null),
  ('Ayuntamiento de Madrid', 'Ayuntamiento de Madrid', null),
  ('Ayuntamiento de Madrid - mesa de ascensores', 'Ayuntamiento de Madrid', 'mesa de ascensores'),
  ('Ayuntamiento de Madrid (mesa de ascensores)', 'Ayuntamiento de Madrid', 'mesa de ascensores'),
  ('Ayuntamiento de Madrid - tributos (ICIO)', 'Ayuntamiento de Madrid', 'tributos (ICIO)'),
  ('Ayuntamiento de Madrid (Agencia de Actividades), via ECU', 'Ayuntamiento de Madrid', 'Agencia de Actividades, vía ECU'),
  ('Ayuntamiento de Madrid (Archivo de la Villa / Negociados)', 'Ayuntamiento de Madrid', 'Archivo de la Villa / negociados'),
  ('Ayuntamiento de Madrid (consulta de la ECU, ACTECU)', 'Ayuntamiento de Madrid', 'consulta de la ECU ACTECU'),
  ('Ayuntamiento de Madrid (consulta urbanistica especial)', 'Ayuntamiento de Madrid', 'consulta urbanística especial'),
  ('Ayuntamiento de Madrid (modelo homogeneo; licencia del ascensor, San Blas-Canillejas)', 'Ayuntamiento de Madrid', 'modelo homogéneo; licencia del ascensor, San Blas-Canillejas'),
  ('Ayuntamiento de Madrid (modelo homogeneo)', 'Ayuntamiento de Madrid', 'modelo homogéneo'),
  ('Ayuntamiento de Madrid (Obras Publicas / Vias)', 'Ayuntamiento de Madrid', 'Obras Públicas / Vías'),
  ('Ayuntamiento de Madrid (Plan Rehabilita)', 'Ayuntamiento de Madrid', 'Plan Rehabilita'),
  ('Ayuntamiento de Madrid (servicios urbanisticos)', 'Ayuntamiento de Madrid', 'servicios urbanísticos'),
  ('Ayuntamiento de Madrid (subvenciones / IEE)', 'Ayuntamiento de Madrid', 'subvenciones / IEE'),
  ('Ayuntamiento de Madrid (via ECU ACTECU)', 'Ayuntamiento de Madrid', 'vía ECU ACTECU'),
  ('Ayuntamiento de Madrid, via ECU', 'Ayuntamiento de Madrid', 'vía ECU'),
  ('Subvenciones (convocatoria de amianto)', 'Ayuntamiento de Madrid', 'Plan Rehabilita, línea amianto'),
  ('Comision de Patrimonio (CPPHAN), segun EICI', 'Patrimonio (CIPHAN)', 'según la ECU EICI'),
  ('Patrimonio (CIPHAN)', 'Patrimonio (CIPHAN)', null),
  ('Comunidad de Madrid (Plan Regional de Ascensores)', 'Comunidad de Madrid', 'Plan Regional de Ascensores')
)
update manias_organismos x
   set entidad = mapa.entidad, departamento = mapa.detalle
  from mapa
 where x.departamento = mapa.original;

-- "Patrimonio" a secas: en Madrid, la CIPHAN; en Humanes, la Comunidad.
update manias_organismos x
   set entidad = case when m.nombre = 'MADRID' then 'Patrimonio (CIPHAN)' else 'Comunidad de Madrid' end,
       departamento = case when m.nombre = 'MADRID' then null else 'Patrimonio' end
  from municipios_catastro m
 where m.id = x.municipio_id and x.departamento = 'Patrimonio' and x.entidad is null;

-- Las juntas: "Junta Municipal de Distrito de X (detalle) / otra entidad".
update manias_organismos
   set entidad = 'Junta de Distrito de ' || trim(substring(departamento from '^Junta Municipal de Distrito de ([^(/]+)')),
       departamento = coalesce(
         substring(departamento from '\(([^)]*)\)'),
         'también ' || trim(substring(departamento from '/\s*(.+)$')))
 where departamento like 'Junta Municipal de Distrito de %' and entidad is null;

update manias_organismos set entidad = 'Junta de Distrito de Tetuán' where entidad = 'Junta de Distrito de Tetuan';

-- Los organismos que no son de ningun ayuntamiento, esten donde esten.
update manias_organismos
   set entidad = departamento, departamento = null
 where departamento in ('COAM', 'ADIF', 'Catastro') and entidad is null;

-- ---------------------------------------------------------------- el resto
-- Fuera de Madrid, lo demas es el ayuntamiento del municipio; "Urbanismo",
-- "Licencias"... queda como detalle. El nombre, con sus tildes.
with nombre(catastro, bonito) as (values
  ('ALCALA DE HENARES', 'Alcalá de Henares'), ('ALCOBENDAS', 'Alcobendas'),
  ('ALCORCON', 'Alcorcón'), ('ARANJUEZ', 'Aranjuez'), ('COLMENAR VIEJO', 'Colmenar Viejo'),
  ('FUENLABRADA', 'Fuenlabrada'), ('HUMANES DE MADRID', 'Humanes de Madrid'),
  ('LAS ROZAS DE MADRID', 'Las Rozas de Madrid'), ('MEJORADA DEL CAMPO', 'Mejorada del Campo'),
  ('PARLA', 'Parla'), ('PINTO', 'Pinto'), ('POZUELO DE ALARCON', 'Pozuelo de Alarcón'),
  ('SAN LORENZO DE EL ESCORIAL', 'San Lorenzo de El Escorial'),
  ('SAN SEBASTIAN DE LOS REYES', 'San Sebastián de los Reyes'),
  ('TORREJON DE ARDOZ', 'Torrejón de Ardoz'), ('TORRELAGUNA', 'Torrelaguna'),
  ('VILLAVICIOSA DE ODON', 'Villaviciosa de Odón')
)
update manias_organismos x
   set entidad = 'Ayuntamiento de ' || nombre.bonito,
       departamento = case when x.departamento = 'Ayuntamiento' then null else x.departamento end
  from municipios_catastro m, nombre
 where m.id = x.municipio_id and nombre.catastro = m.nombre and x.entidad is null
   and (x.departamento is null or x.departamento in ('Ayuntamiento', 'Urbanismo', 'Licencias', 'Tributario', 'Registro', 'Licencias / Urbanismo'));

-- ---------------------------------------------------------------- tecnicos
update manias_organismos set tecnico = 'Elena Garcia' where tecnico = 'Helena Garcia';

-- ---------------------------------------------------------------- fechas
-- Apertura de su opp + 4 meses. La de Parla solo cuelga de la clon: su opp es
-- la que se creo desde esa fila ("Creada desde la clon: <id>").
update manias_organismos x
   set fecha = (o.fecha_apertura + interval '4 months')::date
  from oportunidades o
 where x.fecha is null and o.id = x.oportunidad_id and o.fecha_apertura is not null;

update manias_organismos x
   set fecha = (o.fecha_apertura + interval '4 months')::date
  from oportunidades o
 where x.fecha is null and x.oportunidad_id is null and x.clon_id is not null
   and o.notas like '%' || x.clon_id::text || '%' and o.fecha_apertura is not null;
