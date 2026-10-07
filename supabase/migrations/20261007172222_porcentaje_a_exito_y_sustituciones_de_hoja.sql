-- Dos cosas salidas de preparar el volcado de las hojas de Drive (Monica, 7-oct-2026):
--
--   1. PORCENTAJE A EXITO en la linea de la hoja. Hay lineas que no cobran euros sino
--      "el 8% de lo concedido" (478 en 2025-2026). No se suma nunca al total: lo
--      concedido no se sabe hasta la resolucion, y pasarlo a euros es cosa de
--      facturacion. Una linea lleva importe o porcentaje, no los dos.
--
--   2. SUSTITUCIONES ENTRE HOJAS. Varias hojas de una oportunidad conviven (proyecto
--      + ascensor + SATE enviadas a la vez); que firmen una no mata a las otras. Una
--      hoja deja de estar viva si se firma, si la rechazan o si OTRA la sustituye: al
--      generar la nueva, el comercial marca "esta reemplaza a...". "Sustituida" no es
--      un estado: se deduce de este enlace. Puede ser una a una, una a varias (la
--      conjunta pasa a proyecto + subvencion) o varias a una. Las versiones de una
--      misma hoja (v1, v2) NO van aqui: siguen en versiones_hoja.
--      Hoja por perseguir = viva, sin firmar y sin nadie que la sustituya.

alter table public.conceptos_hoja
  add column if not exists porcentaje numeric;

alter table public.conceptos_hoja
  add constraint chk_conceptos_hoja_importe_o_porcentaje
  check (importe is null or porcentaje is null);

alter table public.conceptos_hoja
  add constraint chk_conceptos_hoja_porcentaje_rango
  check (porcentaje is null or (porcentaje > 0 and porcentaje <= 100));

comment on column public.conceptos_hoja.porcentaje is
  'Cobro a exito: % de lo concedido. No suma al total de la hoja; se pasa a euros en facturacion, con la resolucion.';

create table if not exists public.sustituciones_hoja (
  hoja_antigua_id uuid not null references public.hojas_encargo(id) on delete cascade,
  hoja_nueva_id   uuid not null references public.hojas_encargo(id) on delete cascade,
  creado_en       timestamptz not null default now(),
  nota            text,
  primary key (hoja_antigua_id, hoja_nueva_id),
  constraint chk_sustituciones_hoja_distintas check (hoja_antigua_id <> hoja_nueva_id)
);

create index if not exists sustituciones_hoja_nueva_idx on public.sustituciones_hoja (hoja_nueva_id);

comment on table public.sustituciones_hoja is
  'Que hoja reemplaza a cual (una a una, una a varias, varias a una). Sustituida no es un estado: se deduce de aqui. Las versiones de una misma hoja van en versiones_hoja.';

alter table public.sustituciones_hoja enable row level security;
