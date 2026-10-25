-- PROFORMAS EMITIDAS Y EL PUENTE A FACTUSOL (Monica, 25-oct-2026; maqueta docs/figma/proformas-emitidas.html).
-- 1) Cuatro campos en la proforma, con su ok: el correo del ok (pegado), cuando y quien la envio a Factusol como pedido,
--    la carpeta de los ficheros (copia guardada en la app) y el codigo de cliente de Factusol que se uso (para no repetir
--    un codigo nuevo si se emiten dos a clientes nuevos antes de que Factusol los importe).
-- 2) Dos tablas de CONSULTA, como factusol_clientes: los pedidos y las facturas (y abonos) de Factusol, copiados cada
--    noche (y con «Revisar ahora») de su fichero. Factusol manda; la app solo copia y compara: que el numero del pedido
--    este libre, que proformas tienen ya su pedido, y que todas las facturas de Factusol esten en la app con su
--    numero, referencia e importe. Nunca se escribe en la base de Factusol.

alter table public.proformas
  add column ok_correo text,
  add column factusol_en timestamptz,
  add column factusol_por uuid references public.equipo(id),
  add column factusol_carpeta text,
  add column factusol_cliente integer;

create table public.factusol_pedidos (
  id uuid primary key default gen_random_uuid(),
  empresa text not null references public.empresas_emisoras(clave),
  anio integer not null,
  serie integer not null,
  numero integer not null,
  fecha date,
  referencia text,
  cliente integer,
  nombre text,
  nif text,
  base numeric(12,2),
  iva numeric(12,2),
  retencion numeric(12,2),
  total numeric(12,2),
  forma_pago text,
  estado integer, -- el de Factusol: 0 pendiente, 1 pendiente parcial, 2 enviado, 3 en almacen
  leido_en timestamptz not null default now(),
  constraint factusol_pedidos_unico unique (empresa, anio, serie, numero)
);
alter table public.factusol_pedidos enable row level security;
create policy sali_lector_lee on public.factusol_pedidos for select to sali_lector using (true);

create table public.factusol_facturas (
  id uuid primary key default gen_random_uuid(),
  empresa text not null references public.empresas_emisoras(clave),
  anio integer not null,
  tipo text not null constraint factusol_facturas_tipo_check check (tipo in ('factura', 'abono')),
  serie integer not null,
  numero integer not null,
  fecha date,
  referencia text,
  cliente integer,
  nombre text,
  nif text,
  base numeric(12,2),
  iva numeric(12,2),
  retencion numeric(12,2),
  total numeric(12,2),
  forma_pago text,
  estado integer, -- el de Factusol: 0 pendiente, 1 cobrada en parte, 2 cobrada, 4 anulada
  leido_en timestamptz not null default now(),
  constraint factusol_facturas_unico unique (empresa, anio, tipo, serie, numero)
);
alter table public.factusol_facturas enable row level security;
create policy sali_lector_lee on public.factusol_facturas for select to sali_lector using (true);
