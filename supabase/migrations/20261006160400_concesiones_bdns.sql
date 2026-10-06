-- ===========================================================================
-- LAS CONCESIONES DE LA BDNS   (6-oct-2026)
--
-- Monica, probando la Base de Datos Nacional de Subvenciones: "guardalas!! asi
-- esta convocatoria ya la tenemos". La BDNS (infosubvenciones.es, API publica y
-- sin claves) recoge las concesiones de TODAS las administraciones, asi que es
-- la fuente para el "en su entorno, a menos de 800 m" del anexo tambien fuera
-- de Madrid capital.
--
-- Lo que trae cada concesion: codigo, fecha, importe, convocatoria y UN SOLO
-- texto de beneficiario: "H81451486 CDAD PROP CL VILLARINO DE LOS AIRES N 9".
-- El CIF y la direccion van ahi dentro (el nombre de una comunidad ES su
-- direccion); no hay campo de direccion aparte. Se guarda el texto tal cual y,
-- al lado, lo leido de el: CIF, tipo de via, calle, numero y el municipio si
-- viene (a menudo cortado: "MADR"). Despues se casa con Catastro para situarla
-- en el mapa (cotejo); lo que no casa no se inventa.
--
-- Primera carga, en la misma sesion (no en este fichero): las 317 de la
-- accesibilidad de la Comunidad de Madrid 2025 (BDNS 833394), 25,5 M€.
-- ===========================================================================

create table concesiones_bdns (
  id                  uuid primary key default gen_random_uuid(),
  creado_en           timestamptz not null default now(),
  cod_concesion       text not null unique,
  numero_convocatoria text not null,
  convocatoria        text,
  organo              text,
  catalogo_convocatoria_id uuid references catalogo_convocatorias(id),
  fecha_concesion     date,
  beneficiario        text not null,
  cif                 text,
  importe             numeric,
  url_bases           text,
  consultado_en       timestamptz not null default now(),
  tipo_via            text,
  nombre_via          text,
  numero              text,
  municipio_leido     text,
  cotejo              text not null default 'pendiente',
  acceso_id           uuid references accesos(id),
  ref_catastral       text,
  lat                 double precision,
  lng                 double precision,
  constraint concesiones_bdns_cotejo_check check (cotejo in ('pendiente', 'casada', 'dudosa', 'sin_casar'))
);
comment on table concesiones_bdns is
  'Concesiones de ayudas a la rehabilitacion tal como las publica la Base de Datos Nacional de Subvenciones (infosubvenciones.es), de todas las administraciones. Monica, 6-oct-2026: "guardalas, asi esta convocatoria ya la tenemos". La direccion NO viene como dato: se lee del nombre del beneficiario ("H81451486 CDAD PROP CL VILLARINO DE LOS AIRES N 9") y despues se casa con Catastro para situarla (cotejo). Lo que no casa no se inventa.';
comment on column concesiones_bdns.municipio_leido is 'El municipio si viene detras del numero; a menudo cortado ("MADR") o ausente.';
comment on column concesiones_bdns.cotejo is 'pendiente (sin mirar) / casada (situada con Catastro) / dudosa (a revisar) / sin_casar.';
create index concesiones_bdns_convocatoria_idx on concesiones_bdns (numero_convocatoria);
alter table concesiones_bdns enable row level security;
