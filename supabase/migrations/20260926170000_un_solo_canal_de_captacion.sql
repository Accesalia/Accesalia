-- COMO NOS HA LLEGADO: UNA SOLA LISTA (Monica, 26-sep-2026).
--
-- La misma pregunta estaba escrita en cinco sitios: el catalogo de la base, dos
-- listas cerradas (una por tabla, con valores distintos) y dos listas a mano en
-- el codigo de las dos pantallas. Asi "web" en una ficha y "web" en la otra no
-- eran la misma palabra y nunca se podrian sumar.
--
-- Manda `canal_captacion`, que se creo para esto. Sus valores y su orden son los
-- de Monica, y el orden es el del negocio real: cartera 60%, boca a boca 30%,
-- otra obra 10%, web 3-4%, el resto excepciones.
--
-- La FAMILIA es suya y dice para que sirve cada canal:
--   nos_lo_dijeron -> condiciones, restricciones, comisiones (operativa)
--   lo_vio         -> que hay que potenciar (marketing)
--   se_lo_contamos -> que acciones funcionan (comercial)

alter table canal_captacion add column if not exists familia text;
alter table canal_captacion drop constraint if exists canal_familia_check;
alter table canal_captacion add constraint canal_familia_check
  check (familia is null or familia in ('nos_lo_dijeron','lo_vio','se_lo_contamos'));
comment on column canal_captacion.familia is 'Para que sirve el dato: se lo dijeron / lo vio / se lo contamos.';

-- No todo canal vale para las dos fichas: nadie llega a nosotros a traves de su
-- propia cartera, asi que "cartera de admin nuestro" es solo de oportunidad.
alter table canal_captacion add column if not exists aplica text not null default 'ambas';
alter table canal_captacion drop constraint if exists canal_aplica_check;
alter table canal_captacion add constraint canal_aplica_check
  check (aplica in ('administracion','oportunidad','ambas'));
comment on column canal_captacion.aplica is 'En que alta se ofrece: administracion, oportunidad o ambas.';

insert into canal_captacion (codigo, nombre, familia, aplica, orden, activo) values
  ('cartera_admin_nuestro', 'Cartera de admin nuestro', 'nos_lo_dijeron', 'oportunidad', 1, true),
  ('boca_a_boca',           'Boca a boca',              'nos_lo_dijeron', 'ambas',       2, true),
  ('otra_obra',             'Otra obra',                'lo_vio',         'ambas',       3, true),
  ('web',                   'Web',                      'lo_vio',         'ambas',       4, true),
  ('feria',                 'Feria',                    'se_lo_contamos', 'ambas',       5, true),
  ('puerta_fria',           'Puerta fria',              'se_lo_contamos', 'ambas',       6, true),
  ('campana_mailing',       'Campana de mailing',       'se_lo_contamos', 'ambas',       7, true),
  ('otro',                  'Otro',                     null,             'ambas',       8, true)
on conflict (codigo) do update
  set nombre = excluded.nombre,
      familia = excluded.familia,
      aplica = excluded.aplica,
      orden = excluded.orden,
      activo = true;

-- Estos dos eran QUIENES disfrazados de comos: se desactivan, no se borran.
update canal_captacion set activo = false, orden = 90
 where codigo in ('administrador_conocido','contrata');
