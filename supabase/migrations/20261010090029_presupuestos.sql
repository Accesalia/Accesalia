-- PRESUPUESTOS (Monica, 10-oct-2026).
--
-- "Hagamos una tabla que nos sirva para hacer los presupuestos en la app: ahora los hacemos en Factusol y es
-- francamente engorroso. La mitad de las hojas de encargo no se llegan a firmar, pero invertimos mucho tiempo en
-- crearles su presupuesto en Factusol: eliminemos esa carga." La app lo rellenara casi sola: quien cobra, quien
-- paga, y los conceptos y precios de lo marcado en las hojas de encargo (un presupuesto recoge los items de varias
-- hojas si hay mas de una). Los presupuestos no tienen las condiciones legales de las facturas.
--
-- Primero se usa como CONTROL DE CALIDAD: dos versiones en la misma tabla, por `origen`:
--   factusol -> los presupuestos de Factusol, volcados en crudo, tal cual;
--   app      -> los que generaria la app con lo que tiene ahora de cada hoja.
-- Comparando una con otra se ve donde no cuadra la app.
--
-- Simplificado por ella: vencimiento y observaciones NO ("nunca variamos el vencimiento, jamas"); lo unico que
-- cambia es la forma de pago: cargo en cuenta o transferencia.
-- El hilo conductor de todo lo que sale de una oportunidad es la OPORTUNIDAD (oportunidad_id).

create table public.presupuestos (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  origen text not null constraint presupuestos_origen_check check (origen in ('factusol', 'app')),
  empresa_emisora text not null
    constraint presupuestos_empresa_emisora_check check (empresa_emisora in ('accesalia', 'daniel', 'ecobalance')),

  -- numeracion: la de Factusol (serie, numero y año de su fichero) o la que de la app
  anio integer,
  serie text,
  numero integer,
  fecha date,

  estado text not null default 'pendiente'
    constraint presupuestos_estado_check check (estado in ('pendiente', 'aceptado', 'rechazado', 'anulado', 'otro')),
  estado_factusol integer,   -- el codigo tal cual (0 pendiente, 1 aceptado; 2 y 3 sin confirmar)

  -- quien paga: enlazado (como en lineas_facturacion) y, aparte, tal como sale en el documento
  pagador_tipo text constraint presupuestos_pagador_tipo_check
    check (pagador_tipo in ('comunidad', 'contrata', 'empresa_propietaria', 'persona', 'organismo')),
  pagador_id uuid,
  pagador_nombre text,
  pagador_nif text,
  pagador_domicilio text,
  pagador_poblacion text,
  pagador_cp text,
  pagador_provincia text,

  forma_pago text constraint presupuestos_forma_pago_check check (forma_pago in ('cargo_en_cuenta', 'transferencia')),

  -- importes: base, IVA por tipo [{tipo, base, cuota}], IRPF y total
  base numeric(12, 2),
  iva_desglose jsonb,
  irpf_porcentaje numeric(5, 2),
  irpf_importe numeric(12, 2),
  total numeric(12, 2),

  oportunidad_id uuid references public.oportunidades(id),
  notas text
);

create unique index presupuestos_factusol_unico on public.presupuestos (empresa_emisora, anio, serie, numero)
  where origen = 'factusol';
create index presupuestos_oportunidad_idx on public.presupuestos (oportunidad_id);

create table public.presupuesto_lineas (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  presupuesto_id uuid not null references public.presupuestos(id) on delete cascade,
  posicion integer,
  concepto text,             -- el texto tal cual; se interpreta despues, despacio
  cantidad numeric(12, 3),
  precio numeric(12, 2),
  base numeric(12, 2),
  iva_porcentaje numeric(5, 2),
  irpf_porcentaje numeric(5, 2),
  total numeric(12, 2),
  -- de donde sale (en los de la app; en los de Factusol, cuando se case)
  hoja_encargo_id uuid references public.hojas_encargo(id),
  linea_facturacion_id uuid references public.lineas_facturacion(id)
);
create index presupuesto_lineas_presupuesto_idx on public.presupuesto_lineas (presupuesto_id);

alter table public.presupuestos enable row level security;
alter table public.presupuesto_lineas enable row level security;

comment on table public.presupuestos is
  'Presupuestos (Monica, 10-oct-2026): la app los generara desde lo marcado en las hojas de encargo, en vez de hacerlos en Factusol. origen = factusol (volcado crudo) | app (generado), para compararlos.';
comment on column public.presupuestos.oportunidad_id is 'El hilo conductor: todo lo que sale de una oportunidad lleva su id.';

-- El almacen de facturas no puede ser publico: cualquiera con el enlace abriria una factura.
update storage.buckets set public = false where id = 'facturas';
