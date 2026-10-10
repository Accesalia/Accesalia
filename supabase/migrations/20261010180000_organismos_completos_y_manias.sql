-- =============================================================================
-- ORGANISMOS COMPLETOS Y MANIAS ENGANCHADAS (Monica, 10-oct-2026)
--
-- `organismos` (48) ya era el catalogo de ayuntamientos, juntas, ECU, colegios...
-- (lo usan puesto, correo, distritos_madrid). Faltaban justo los grandes que se
-- han barrido hoy para las tasas, y algunos que salen en las manias. Se añaden.
--
-- Las manias pasan a colgar de su organismo (y de su area si ya existe con el
-- mismo nombre). El texto `entidad` se queda como estaba. Las reglas de tasas
-- y las fichas de solicitud tambien colgaran de `organismos`.
-- Subvenciones: despues (decision suya).
-- =============================================================================

insert into organismos (nombre, tipo, ambito, municipio_id)
select 'Ayuntamiento de ' || v.bonito, 'ayuntamiento', 'municipal', m.id
  from (values
    ('FUENLABRADA', 'Fuenlabrada'), ('LEGANES', 'Leganés'), ('MOSTOLES', 'Móstoles'),
    ('ALCORCON', 'Alcorcón'), ('GETAFE', 'Getafe'), ('ALCOBENDAS', 'Alcobendas'),
    ('COLMENAR VIEJO', 'Colmenar Viejo'), ('LAS ROZAS DE MADRID', 'Las Rozas de Madrid'),
    ('TORRELAGUNA', 'Torrelaguna')
  ) v(catastro, bonito)
  join municipios_catastro m on m.nombre = v.catastro
 where not exists (select 1 from organismos o where o.nombre = 'Ayuntamiento de ' || v.bonito);

insert into organismos (nombre, tipo, ambito)
select 'Dirección General del Catastro', 'organismo_estatal', 'estatal'
 where not exists (select 1 from organismos where nombre = 'Dirección General del Catastro');

-- Patrimonio, CIPHAN y CPPHAN "es todo lo mismo, bajo un mismo paraguas".
insert into organismos (nombre, tipo, ambito, comunidad_autonoma, notas)
select 'Patrimonio (CIPHAN)', 'otro', 'autonomico', 'COMUNIDAD DE MADRID',
       'Comisión de Patrimonio. Patrimonio, CIPHAN y CPPHAN se tratan como uno solo (Mónica, 10-oct-2026).'
 where not exists (select 1 from organismos where nombre = 'Patrimonio (CIPHAN)');

-- ------------------------------------------------------------------ manias
alter table manias_organismos
  add column organismo_id uuid references organismos(id) on delete restrict,
  add column organismo_area_id uuid references organismo_areas(id) on delete set null;
comment on column manias_organismos.organismo_id is 'De quien es la mania. El texto `entidad` es su nombre corto para mostrar.';
comment on column manias_organismos.organismo_area_id is 'El departamento, si existe en organismo_areas. Si no, el detalle queda en `departamento` (texto).';

with equivale(entidad, organismo) as (values
  ('ECU ACTECU', 'ACTECU'),
  ('ECU EICI', 'EICI'),
  ('ECU A+ECU', 'A+ECU · A (más) ECU Control Urbanístico'),
  ('COAM', 'COAM · Colegio Oficial de Arquitectos de Madrid'),
  ('ADIF', 'ADIF · Administrador de Infraestructuras Ferroviarias'),
  ('Catastro', 'Dirección General del Catastro')
)
update manias_organismos x
   set organismo_id = o.id
  from organismos o
 where x.organismo_id is null
   and o.nombre = coalesce(
         (select e.organismo from equivale e where e.entidad = x.entidad),
         regexp_replace(x.entidad, '^Junta de Distrito de ', 'Junta Municipal de Distrito de '));

-- El area, solo si ya existe con ese nombre (sin mayusculas ni tildes).
update manias_organismos x
   set organismo_area_id = a.id
  from organismo_areas a
 where a.organismo_id = x.organismo_id and x.departamento is not null
   and lower(translate(a.nombre, 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou')) = lower(translate(x.departamento, 'ÁÉÍÓÚáéíóú', 'AEIOUaeiou'));
