-- =============================================================================
-- BDNS: LAS FECHAS DE CADA CONVOCATORIA (Monica, 11-oct-2026)
--
-- Para el informe de la estimacion de costes: "se convoca previsiblemente en X
-- dias y se resuelve en unos X meses; en ese tiempo la obra habra pasado de X a
-- Y euros". Lo que se tarda en conceder sale de las concesiones (BDNS y, en
-- Madrid capital, el geoportal, con coordenadas); lo que faltaba era CUANDO se
-- convoco cada edicion. La BDNS lo da (fechaRecepcion y, a veces, el plazo de
-- solicitud), pero la descarga solo lo guardaba en 14 de 97.
--
-- Las del Ayuntamiento de Madrid se apuntan SOLO POR SUS FECHAS (origen
-- 'solo_fechas', sin vigilar): sus concesiones siguen saliendo del geoportal.
-- =============================================================================

alter table bdns_convocatorias
  add column inicio_solicitud date,
  add column fin_solicitud date;
comment on column bdns_convocatorias.fecha_recepcion is 'Fecha de registro de la convocatoria en la BDNS (fechaRecepcion): cuando se convoco.';
comment on column bdns_convocatorias.fin_solicitud is 'Fin del plazo de solicitud, si la BDNS lo da.';

alter table bdns_convocatorias drop constraint if exists bdns_convocatorias_origen_check;
alter table bdns_convocatorias add constraint bdns_convocatorias_origen_check
  check (origen in ('carga_inicial', 'reloj', 'a_mano', 'solo_fechas'));
comment on column bdns_convocatorias.origen is 'carga_inicial / reloj / a_mano; solo_fechas = del Ayuntamiento de Madrid, solo para saber cuando salio cada edicion (sus concesiones vienen del geoportal).';
