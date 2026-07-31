-- =============================================================================
-- Fusiona 4 comunidades duplicadas mas, del mismo tipo que las 18 anteriores:
-- la fila del Excel es una cascara (0 proyectos, sin CP, sin administracion) y
-- lo unico que cuelga de ella son hojas de encargo; la de Monday tiene el
-- proyecto. Se mueven las hojas a la de Monday y se borra la cascara.
--
-- El municipio de las cascaras viene corrupto del importador del Excel
-- ("ESC D MADRID", "Q ESC 17 MADRID", "35 MADRID", "Y 4 MADRID"): son trozos de
-- la direccion metidos en el campo municipio. Otra confirmacion de que son la
-- misma comunidad mal partida en dos.
--
-- Ganapanes: el Excel dice "32-35" y Monday "31", pero en Dropbox solo existe
-- UNA carpeta, `caminodeganapanes31-33-35`, asi que es el mismo edificio.
--
-- SEGURIDAD: cada comunidad se localiza por su texto y solo se toca si resuelve
-- a UNA sola fila y si la cascara sigue sin proyectos, sin CP y sin
-- administracion. Si algo no cuadra, esa pareja se descarta sola.
-- =============================================================================

create temp table _par (cascara text, sequeda text);
insert into _par values
('AV PRESIDENTE CARMONA 5 ESC D MADRID', 'Avenida del Presidente Carmona, 5, Tetuán, Madrid, España'),
('BRAVO MURILLO 41 Q ESC 17 MADRID',     'Calle de Bravo Murillo, 41, esc 17, Madrid, España'),
('GANAPANES 32-35 MADRID',               'Calle del Camino de Ganapanes, 31, Madrid, España'),
('PLAZA VALSAIN 3 Y 4  MADRID',          'Plaza de Valsaín, 3y4, Madrid, España');

create temp table _mv as
select p.cascara, p.sequeda,
       (select c.id from comunidades c
         where coalesce(nullif(c.direccion,''),c.nombre) = p.cascara
         and (select count(*) from comunidades c2
               where coalesce(nullif(c2.direccion,''),c2.nombre) = p.cascara) = 1) id_cascara,
       (select c.id from comunidades c
         where coalesce(nullif(c.direccion,''),c.nombre) = p.sequeda
         and (select count(*) from comunidades c2
               where coalesce(nullif(c2.direccion,''),c2.nombre) = p.sequeda) = 1) id_sequeda
  from _par p;

delete from _mv where id_cascara is null or id_sequeda is null
   or exists (select 1 from proyectos p where p.comunidad_id = _mv.id_cascara)
   or exists (select 1 from comunidades c where c.id = _mv.id_cascara
               and (coalesce(c.cp,'') <> '' or c.administracion_id is not null));

update beneficiarios_reparto_caes x set comunidad_id = m.id_sequeda from _mv m where x.comunidad_id = m.id_cascara;
update condicionantes_comunidad   x set comunidad_id = m.id_sequeda from _mv m where x.comunidad_id = m.id_cascara;
update destinatarios_informe      x set comunidad_id = m.id_sequeda from _mv m where x.comunidad_id = m.id_cascara;
update documentos                 x set comunidad_id = m.id_sequeda from _mv m where x.comunidad_id = m.id_cascara;
update expedientes                x set comunidad_id = m.id_sequeda from _mv m where x.comunidad_id = m.id_cascara;
update hojas_encargo              x set comunidad_id = m.id_sequeda from _mv m where x.comunidad_id = m.id_cascara;
update interaccion_comunidad      x set comunidad_id = m.id_sequeda from _mv m where x.comunidad_id = m.id_cascara;
update observaciones_expediente   x set comunidad_id = m.id_sequeda from _mv m where x.comunidad_id = m.id_cascara;
update operaciones_caes           x set comunidad_id = m.id_sequeda from _mv m where x.comunidad_id = m.id_cascara;
update oportunidades              x set comunidad_id = m.id_sequeda from _mv m where x.comunidad_id = m.id_cascara;
update personas_comunidad         x set comunidad_id = m.id_sequeda from _mv m where x.comunidad_id = m.id_cascara;
update proyectos                  x set comunidad_id = m.id_sequeda from _mv m where x.comunidad_id = m.id_cascara;
update resumenes_ia               x set comunidad_id = m.id_sequeda from _mv m where x.comunidad_id = m.id_cascara;
update migracion_monday x set registro_id = m.id_sequeda
  from _mv m where x.tabla_destino = 'comunidades' and x.registro_id = m.id_cascara;

delete from comunidades c using _mv m where c.id = m.id_cascara;
