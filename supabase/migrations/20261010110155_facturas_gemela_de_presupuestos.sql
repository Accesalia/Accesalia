-- FACTURAS, GEMELA DE PRESUPUESTOS (Monica, 10-oct-2026: "si, rehacemos y volcamos").
--
-- La tabla `facturas` de julio era del modelo viejo: una factura colgaba de UNA hoja y de UN hito. Pero una factura
-- cubre varias hojas y una hoja se cobra en varias facturas (N:M, decidido con ella), y nada usaba esa tabla (0
-- filas, sin referencias). Se aparta con el prefijo zz_muerta_ y se hace de nuevo con la forma de `presupuestos`:
--   facturas              la cabecera, tal como sale en el documento (origen factusol | app)
--   factura_lineas        cada linea con su texto tal cual, y de que documento sale (el presupuesto, si
--                         Factusol lo apunta en la linea)
--   factura_linea_hitos   el casado: que plazo de cobro (hitos_cobro) paga cada linea, y cuanto. Se llena DESPUES
--                         de extraer: "extraer los datos de cada factura, y en base a esos datos, casar. No al revés."
-- El PDF de cada factura va al almacen privado `facturas`, emparejado por numero (el nombre del fichero de Drive lo
-- lleva: "Factura 1-000005 CP PAULAR 1 FUENLABRADA 2ª mitad.pdf").
-- Como en presupuestos: sin vencimiento ni observaciones ("nunca variamos el vencimiento, jamas").

alter table public.facturas rename to zz_muerta_facturas;
alter table public.zz_muerta_facturas rename constraint facturas_pkey to zz_muerta_facturas_pkey;
comment on table public.zz_muerta_facturas is
  'MUERTA (10-oct-2026): la factura del modelo de julio (una hoja, un hito). Sustituida por facturas + factura_lineas + factura_linea_hitos. Estaba vacia.';

create table public.facturas (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  origen text not null constraint facturas_origen_check check (origen in ('factusol', 'app')),
  empresa_emisora text not null
    constraint facturas_empresa_emisora_check check (empresa_emisora in ('accesalia', 'daniel', 'ecobalance')),

  anio integer,
  serie text,
  numero integer,
  fecha date,
  referencia text,           -- la referencia corta de Factusol ("AV PRINCIPES DE ESPAÑA 17 COSLADA 1ª mit")

  estado text not null default 'pendiente'
    constraint facturas_estado_check check (estado in ('pendiente', 'cobrada_en_parte', 'cobrada', 'anulada', 'otro')),
  estado_factusol integer,   -- el codigo tal cual (0 pendiente, 1 cobrada en parte, 2 cobrada, 4 anulada/devuelta)

  pagador_tipo text constraint facturas_pagador_tipo_check
    check (pagador_tipo in ('comunidad', 'contrata', 'empresa_propietaria', 'persona', 'organismo')),
  pagador_id uuid,
  pagador_nombre text,
  pagador_nif text,
  pagador_domicilio text,
  pagador_poblacion text,
  pagador_cp text,
  pagador_provincia text,

  forma_pago text constraint facturas_forma_pago_check check (forma_pago in ('cargo_en_cuenta', 'transferencia')),
  forma_pago_factusol text,  -- el codigo tal cual (01 transferencia, 02 cargo en cuenta, 04..07 otras)

  base numeric(12, 2),
  iva_desglose jsonb,        -- [{tipo, base, cuota}]
  irpf_porcentaje numeric(5, 2),
  irpf_importe numeric(12, 2),
  total numeric(12, 2),

  oportunidad_id uuid references public.oportunidades(id),
  url_pdf text,              -- almacen:facturas/<empresa>/<año>/<fichero>.pdf
  notas text
);

create unique index facturas_factusol_unico on public.facturas (empresa_emisora, anio, serie, numero)
  where origen = 'factusol';
create index facturas_oportunidad_idx on public.facturas (oportunidad_id);

create table public.factura_lineas (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  factura_id uuid not null references public.facturas(id) on delete cascade,
  posicion integer,
  concepto text,             -- el texto tal cual; se interpreta despues, despacio
  cantidad numeric(12, 3),
  precio numeric(12, 2),
  base numeric(12, 2),
  -- de que documento sale, tal como lo apunta Factusol (tipo, serie y numero del documento de origen)
  origen_tipo text,
  origen_documento text,
  presupuesto_id uuid references public.presupuestos(id)
);
create index factura_lineas_factura_idx on public.factura_lineas (factura_id);

create table public.factura_linea_hitos (
  factura_linea_id uuid not null references public.factura_lineas(id) on delete cascade,
  hito_cobro_id uuid not null references public.hitos_cobro(id),
  importe numeric(12, 2),
  como text constraint factura_linea_hitos_como_check check (como in ('automatico', 'a_mano')),
  creado_en timestamptz not null default now(),
  primary key (factura_linea_id, hito_cobro_id)
);
create index factura_linea_hitos_hito_idx on public.factura_linea_hitos (hito_cobro_id);

alter table public.facturas enable row level security;
alter table public.factura_lineas enable row level security;
alter table public.factura_linea_hitos enable row level security;

comment on table public.facturas is
  'Facturas (Monica, 10-oct-2026), gemela de presupuestos: origen = factusol (volcado crudo) | app. N:M con las hojas a traves de factura_linea_hitos.';
comment on table public.factura_linea_hitos is
  'Que plazo de cobro (hitos_cobro) paga cada linea de factura, y cuanto. Se llena despues de extraer, al casar.';
