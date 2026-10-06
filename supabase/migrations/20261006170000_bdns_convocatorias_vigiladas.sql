-- ===========================================================================
-- LAS CONVOCATORIAS DE LA BDNS QUE SE VIGILAN   (6-oct-2026)
--
-- Monica: "para que esto no quede obsoleto en 4 semanas, montar algo que lo
-- actualice cada 15 dias, que busque las convocatorias nuevas y las baje".
-- El reloj bdns_vigilar (frontend/app/api/bdns/vigilar, lib/bdns.ts) busca
-- convocatorias nuevas cada 15 dias y repasa todas las vigiladas: la BDNS
-- publica las concesiones meses despues de abrir la convocatoria.
--
-- Aplicada por MCP el 6-oct (version registrada en schema_migrations con el
-- nombre bdns_convocatorias_vigiladas), con las 83 de la carga inicial: las 34
-- con concesiones y las que se miraron sin ninguna todavia. Fuera de la
-- vigilancia, sin borrarlas, las cuatro que son casi todo particulares
-- (630071 programa 4 de NG, 838279 Getafe, 837565 Alcorcon, 829309 Fuenlabrada).
-- ===========================================================================

create table bdns_convocatorias (
  numero               text primary key,
  creado_en            timestamptz not null default now(),
  descripcion          text,
  organo               text,
  fecha_recepcion      date,
  catalogo_convocatoria_id uuid references catalogo_convocatorias(id),
  origen               text not null default 'reloj',
  vigilada             boolean not null default true,
  ultima_revision      timestamptz,
  total_concesiones    integer,
  de_comunidades       integer,
  constraint bdns_convocatorias_origen_check check (origen in ('carga_inicial', 'reloj', 'a_mano'))
);
comment on table bdns_convocatorias is
  'Las convocatorias de la BDNS que se vigilan (Monica, 6-oct-2026: "que no quede obsoleto en 4 semanas"). El reloj bdns_vigilar las busca nuevas cada 15 dias y repasa todas: la BDNS publica las concesiones meses despues de abrir la convocatoria. vigilada=false la deja fuera sin borrarla.';
comment on column bdns_convocatorias.total_concesiones is 'Las que tenia en la BDNS la ultima vez: si no ha cambiado, no se vuelve a bajar.';
alter table bdns_convocatorias enable row level security;
