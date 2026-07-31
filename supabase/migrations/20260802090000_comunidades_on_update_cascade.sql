-- =============================================================================
-- ON UPDATE CASCADE en todo lo que apunta a comunidades
--
-- Paso previo para adoptar en local los uuid de comunidades que tiene
-- produccion. Hoy las claves ajenas estan en NO ACTION, asi que Postgres
-- impediria cambiar el id. Con CASCADE, las nueve tablas siguen solas.
--
-- No cambia ningun dato: solo la regla de que pasa si el id cambia.
--
-- Por que adoptar los ids de produccion y no traducir al subir: local y
-- produccion han estado hablando idiomas distintos todo el tiempo, y eso ya ha
-- causado tres confusiones (los acuerdos de comision que "no casaban", los
-- comerciales, las administraciones). Una vez alineados, subir es un insert.
-- =============================================================================

alter table comunidad_admin_responsable drop constraint comunidad_admin_responsable_comunidad_id_fkey,
  add constraint comunidad_admin_responsable_comunidad_id_fkey
  foreign key (comunidad_id) references comunidades(id) on update cascade on delete cascade;

alter table documentos drop constraint documentos_comunidad_id_fkey,
  add constraint documentos_comunidad_id_fkey
  foreign key (comunidad_id) references comunidades(id) on update cascade;

alter table hojas_encargo drop constraint hojas_encargo_comunidad_id_fkey,
  add constraint hojas_encargo_comunidad_id_fkey
  foreign key (comunidad_id) references comunidades(id) on update cascade;

alter table migracion_admin_revision drop constraint migracion_admin_revision_comunidad_id_fkey,
  add constraint migracion_admin_revision_comunidad_id_fkey
  foreign key (comunidad_id) references comunidades(id) on update cascade;

alter table migracion_ficha drop constraint migracion_ficha_comunidad_id_fkey,
  add constraint migracion_ficha_comunidad_id_fkey
  foreign key (comunidad_id) references comunidades(id) on update cascade;

alter table observaciones_expediente drop constraint observaciones_expediente_comunidad_id_fkey,
  add constraint observaciones_expediente_comunidad_id_fkey
  foreign key (comunidad_id) references comunidades(id) on update cascade;

alter table oportunidades drop constraint oportunidades_comunidad_id_fkey,
  add constraint oportunidades_comunidad_id_fkey
  foreign key (comunidad_id) references comunidades(id) on update cascade;

alter table personas_comunidad drop constraint personas_comunidad_comunidad_id_fkey,
  add constraint personas_comunidad_comunidad_id_fkey
  foreign key (comunidad_id) references comunidades(id) on update cascade;

alter table proyectos drop constraint proyectos_comunidad_id_fkey,
  add constraint proyectos_comunidad_id_fkey
  foreign key (comunidad_id) references comunidades(id) on update cascade;
