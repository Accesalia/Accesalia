-- SALIR A INTERNET, PERO NO CADA VEZ (Monica, 15-oct-2026). Los datos del
-- edificio salen primero de nuestras tablas, luego de la foto guardada y solo si
-- no hay nada se pregunta fuera (Catastro, geoportal). Aqui se apunta la ULTIMA
-- vez que se pregunto por una referencia a una fuente y que paso: si no estaba o
-- fallo hace poco, no se vuelve a preguntar (lib/informeEdificio.ts).
create table if not exists public.consulta_externa (
  id uuid primary key default gen_random_uuid(),
  referencia text not null,
  fuente text not null,
  preguntado_en timestamptz not null default now(),
  resultado text not null,
  detalle text,
  constraint consulta_externa_resultado_check check (resultado in ('ok', 'no_esta', 'fallo')),
  constraint consulta_externa_unica unique (referencia, fuente)
);
alter table public.consulta_externa enable row level security;
comment on table public.consulta_externa is 'Ultima pregunta a un servicio de fuera (catastro...) por una referencia: cuando y que paso (ok / no_esta / fallo). Para no volver a preguntar cada vez (Monica, 15-oct-2026).';
