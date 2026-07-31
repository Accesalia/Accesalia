-- =============================================================================
-- Ultima cascara del Excel: 'PASEO DE SAN ANTONIO 3 FUENLABRADA' (0 proyectos,
-- sin CP, sin administracion, 1 hoja) es la misma comunidad que la de Monday
-- 'Paseo de San Antonio, 3, Fuenlabrada, España'.
--
-- Se detecto porque las dos acababan apuntando a la MISMA carpeta fisica
-- (`FUENLABRADA\paseosanantonio3`), rompiendo la regla de 1 carpeta = 1
-- comunidad. Ojo: cada una llegaba por una ruta escrita distinta (la corta del
-- censo y la larga de una excepcion), asi que comparar los textos de ruta NO
-- bastaba: hay que resolver a la carpeta real en disco.
-- =============================================================================

create temp table _mv as
select (select c.id from comunidades c
         where coalesce(nullif(c.direccion,''),c.nombre) = 'PASEO DE SAN ANTONIO 3 FUENLABRADA'
         and (select count(*) from comunidades c2
               where coalesce(nullif(c2.direccion,''),c2.nombre) = 'PASEO DE SAN ANTONIO 3 FUENLABRADA') = 1) id_cascara,
       (select c.id from comunidades c
         where coalesce(nullif(c.direccion,''),c.nombre) = 'Paseo de San Antonio, 3, Fuenlabrada, España'
         and (select count(*) from comunidades c2
               where coalesce(nullif(c2.direccion,''),c2.nombre) = 'Paseo de San Antonio, 3, Fuenlabrada, España') = 1) id_sequeda;

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
