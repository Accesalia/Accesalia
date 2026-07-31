-- =============================================================================
-- El comercial de cada administracion
--
-- Unico dato de produccion que no se puede regenerar desde Monday: quien de
-- Accesalia lleva la relacion con cada casa. Son 65 asignaciones hechas a mano.
--
-- Va en la empresa y no en la comunidad, porque asi es como funciona: el
-- comercial cultiva la relacion con la ADMINISTRACION, y las comunidades de esa
-- casa vienen detras. Preguntar "que cartera tiene Daniel" es recorrer sus
-- empresas y de ahi sus comunidades.
-- =============================================================================

alter table empresa add column if not exists comercial_id uuid references comerciales(id);

comment on column empresa.comercial_id is 'Quien de Accesalia lleva la relacion con esta casa. Rescatado de produccion: es el unico dato que no sale de Monday, se asigno a mano.';

create index if not exists empresa_comercial_idx on empresa (comercial_id) where comercial_id is not null;
