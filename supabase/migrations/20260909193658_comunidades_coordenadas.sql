-- Aplicada en produccion el 9-sep-2026 desde la sesion de la maqueta del cuadro
-- comercial, pero sin guardar el fichero. Se recupera aqui tal cual (texto
-- literal de supabase_migrations.schema_migrations) para que el repositorio
-- refleje lo que hay en produccion.

alter table comunidades
  add column if not exists lat double precision,
  add column if not exists lng double precision;

comment on column comunidades.lat is 'Latitud del portal. Origen: la columna de ubicacion de Monday (tablero 0), que venia geocodificada por Google. En adelante la pone la app al dar de alta la direccion.';
comment on column comunidades.lng is 'Longitud del portal. Ver comentario de lat.';

create index if not exists idx_comunidades_coordenadas on comunidades (lat, lng) where lat is not null;
