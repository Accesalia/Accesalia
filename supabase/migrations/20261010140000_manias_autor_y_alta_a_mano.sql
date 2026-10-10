-- =============================================================================
-- MANIAS: AUTOR, Y ALTA A MANO DESDE LA APP (Monica, 10-oct-2026)
--
-- "Pongamos un boton de 'añadir nueva' para que la proxima vez se pueda incluir
-- aposta, sin pescarla entre cientos de notas. Deberia guardar por debajo quien
-- lo puso y en que fecha. En estas que ya tenemos: autor = volcado de Dropbox,
-- fecha la que le hemos puesto ya, asi que eso no se toca."
--
--   autor / autor_id   quien la puso (como en las notas_*): el nombre queda
--                      escrito aunque la persona se vaya del equipo.
--   fecha              ya tiene por defecto la del dia (20261010120000).
--   origen             'app' para las de a mano (el CHECK ya lo admitia).
--
-- Las de a mano no vienen de ninguna nota: sin cita ni ruta de Dropbox. Y el
-- municipio sale de la entidad: una ECU, el COAM o Patrimonio no tienen uno.
-- =============================================================================

alter table manias_organismos
  add column autor text,
  add column autor_id uuid references equipo(id) on delete set null;
comment on column manias_organismos.autor is 'Quien la puso. Las del barrido de fichas: "Volcado de Dropbox". Las de la app: nombre de quien la escribio.';
comment on column manias_organismos.autor_id is 'La persona del equipo que la puso desde la app. Vacio en las volcadas.';

update manias_organismos set autor = 'Volcado de Dropbox' where origen = 'ficha_dropbox' and autor is null;

alter table manias_organismos alter column municipio_id drop not null;
alter table manias_organismos alter column cita drop not null;
alter table manias_organismos alter column ruta_dropbox drop not null;
comment on column manias_organismos.municipio_id is 'Donde aplica. Sale de la entidad (Ayuntamiento de X -> X; las juntas -> Madrid). Vacio en las de ambito general: ECU, COAM, Patrimonio, Comunidad de Madrid.';
