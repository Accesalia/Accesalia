-- La posicion de cada subvencion concedida, tal como la publica el geoportal
-- de Madrid (pedida ya en EPSG:4326). Con ella se calcula sin salir fuera que
-- subvenciones hay a menos de 800 m de un edificio (Monica, 9-oct-2026).
alter table public.subvencion_concedida
  add column lat double precision,
  add column lng double precision;

comment on column public.subvencion_concedida.lat is 'Latitud (WGS84) del punto que publica el geoportal de Madrid. No se calcula: es la del Ayuntamiento.';
comment on column public.subvencion_concedida.lng is 'Longitud (WGS84) del punto que publica el geoportal de Madrid. No se calcula: es la del Ayuntamiento.';
