-- EL CATALOGO DE PROTECCION DE CADA MUNICIPIO (Monica, 11-oct-2026): "las areas
-- de proteccion son criticas: zonas que no podemos tocar impunemente y no lo
-- sabiamos". Fuera de Madrid capital no hay servicio que lo diga: sale del
-- catalogo del plan general de cada ayuntamiento, un PDF, y se pasa una vez a
-- esta tabla. Una fila por elemento catalogado (un edificio) o por zona
-- protegida (un casco antiguo). Lo que se lee del PDF NO se da por bueno hasta
-- que alguien lo revisa: revisado_por / revisado_en.
create table public.catalogo_proteccion (
  id                   uuid primary key default gen_random_uuid(),
  creado_en            timestamptz not null default now(),
  actualizado_en       timestamptz not null default now(),
  municipio            text not null,
  tipo                 text not null,
  numero_ficha         text,
  denominacion         text,
  direccion            text,
  referencia_catastral text,
  grado                text,
  alcance              text,
  fuente               text not null,
  pagina               integer,
  documento_ruta       text,
  revisado_por         uuid references public.equipo(id) on delete set null,
  revisado_en          timestamptz,
  notas                text,
  constraint catalogo_proteccion_tipo_check check (tipo = any (array['edificio'::text, 'zona'::text]))
);
create index catalogo_proteccion_municipio_idx on public.catalogo_proteccion (municipio);
create index catalogo_proteccion_referencia_idx on public.catalogo_proteccion (referencia_catastral) where referencia_catastral is not null;

comment on table public.catalogo_proteccion is 'Catalogo de bienes protegidos del plan general de cada municipio (fuera de Madrid capital), pasado a mano desde su PDF. Sin revisar hasta que revisado_en tenga fecha.';
comment on column public.catalogo_proteccion.tipo is 'edificio (una ficha del catalogo) o zona (un ambito protegido: casco antiguo, zona urbana protegida).';
comment on column public.catalogo_proteccion.grado is 'Tal como lo dice el catalogo: integral, estructural, ambiental, parcial...';
comment on column public.catalogo_proteccion.alcance is 'Que se protege: el edificio entero, la fachada, elementos concretos...';
comment on column public.catalogo_proteccion.referencia_catastral is 'Solo si el catalogo la da o se encuentra sin dudas. Si no, vacia.';
comment on column public.catalogo_proteccion.fuente is 'De que documento sale (y pagina en "pagina"), para poder comprobarlo.';
