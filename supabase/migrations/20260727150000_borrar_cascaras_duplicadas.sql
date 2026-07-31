-- =============================================================================
-- Borra las comunidades DUPLICADAS que son una "cascara vacia".
--
-- La tabla `comunidades` se poblo desde DOS importaciones (Monday y un Excel) y
-- el mismo edificio quedo dos veces. La fila del Excel es una cascara: sin
-- proyecto, sin CP, sin provincia y sin administracion; lo unico que cuelga de
-- ella son hojas de encargo. La fila de Monday tiene el proyecto con su visado,
-- licencia, obra y etapas.
--
-- Por eso se conserva la de MONDAY y se mueven las hojas hacia ella (una tabla,
-- 22 filas) en vez de copiar los datos a la cascara, que obligaria a arrastrar
-- el proyecto entero con toda su cadena. Ademas la de Monday es la que mantiene
-- el vinculo con `migracion_monday`, es decir, con el tablero vivo.
--
-- SEGURIDAD: cada comunidad se localiza por su texto y solo se toca si ese texto
-- resuelve a UNA sola fila y si la cascara SIGUE estando vacia. Si algo no
-- cuadra, esa pareja se descarta y no se toca nada de ella.
-- =============================================================================

create temp table _par (cascara text, sequeda text);
insert into _par values
('CALLE CAÑADA 22 ALCORCÓN', 'Calle la Cañada, 22, Alcorcón, España'),
('PASEO GRANADA 2 FUENLABRADA', 'Paseo de Granada, 2, Fuenlabrada, España'),
('PLAZA DE PARÍS 7 FUENLABRADA', 'Plaza de París, 7, Fuenlabrada, España'),
('AVENIDA DE LA MANCHA 18 LEGANES', 'Av. de la Mancha, 18, Leganés, España'),
('AVDA DOCTOR FLEMING 14 LEGANES', 'Av. del Dr. Fleming, 14, Leganés, España'),
('AVDA PORTUGAL 23 LEGANES', 'Av. de Portugal, 23, Leganés, España'),
('INMACULADA 6 LEGANES', 'Plaza de la Inmaculada, 6, Leganés, España'),
('ALBUFERA 250 MADRID', 'Avenida de la Albufera, 250, Madrid, España'),
('MARQUES DE CORBERA 22C MADRID', 'Av. del Marqués de Corbera, 22C, Madrid, España'),
('MARQUES DE CORBERA 24B MADRID', 'Av. del Marqués de Corbera, 24 B, Madrid, España'),
('MARQUES DE CORBERA 28B MADRID', 'Av. del Marqués de Corbera, 28B, Madrid, España'),
('GONZALO DE CESPEDES 21 MADRID', 'Calle de Gonzalo de Céspedes, 21, Madrid, España'),
('HACIENDA PAVONES 151 MADRID', 'Calle de la Hacienda de Pavones, 151, Madrid, España'),
('HACIENDA PAVONES 222 MADRID', 'Calle de la Hacienda de Pavones, 222, Madrid, España'),
('NTRA SEÑORA DE GRACIA 13', 'Calle Nuestra Señora de Gracia, 13, Madrid, España'),
('PASEO PONTONES 29 MADRID', 'Paseo de los Pontones, 29, Madrid, España'),
('PASEO DE SAN ILLAN 5 MADRID', 'Paseo de San Illán, 5, Madrid, España'),
('SANTA MARIA DE LA CABEZA 27 MADRID', 'Paseo de Santa María de la Cabeza, 27, Madrid, España');

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
