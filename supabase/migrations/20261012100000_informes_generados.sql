-- INFORMES GENERADOS (Monica, 12-oct-2026). Los informes que se emiten desde la
-- app para una comunidad: hoy el de costes de obra (con ayudas y plazos); despues
-- el de proteccion. Cada uno es una FOTO: lo que dijo el dia que se emitio, para
-- poder recuperarlo cuando la comunidad llama ("del papel que me diste...").
--   - Con oportunidad: sale en su bloque 2, solo en ella.
--   - Sin oportunidad: es el RASTRO, la lista de "Direcciones vistas que no
--     llegaron a mayores", con fecha y HORA (cruzada con la agenda dice con quien
--     estaba el comercial, y eso apunta al administrador).
create table informes_generados (
  id                   uuid primary key default gen_random_uuid(),
  tipo                 text not null constraint informes_generados_tipo_check check (tipo in ('estimacion_costes', 'proteccion')),
  oportunidad_id       uuid references oportunidades(id) on delete set null,
  direccion            text not null,
  referencia_catastral text,
  municipio            text,
  datos                jsonb not null,
  url_pdf              text,
  creado_por           uuid references equipo(id),
  creado_en            timestamptz not null default now()
);
comment on table informes_generados is 'Informes emitidos para una comunidad (costes de obra, proteccion): la foto de lo que se le dio. Sin oportunidad = rastro de direcciones vistas.';
comment on column informes_generados.datos is 'La foto del informe tal como salio: cifras, ayudas, plazos y entradas. Se pinta desde aqui, no se recalcula.';
create index informes_generados_opp on informes_generados (oportunidad_id, creado_en desc);
create index informes_generados_sin_opp on informes_generados (creado_en desc) where oportunidad_id is null;
alter table informes_generados enable row level security;
