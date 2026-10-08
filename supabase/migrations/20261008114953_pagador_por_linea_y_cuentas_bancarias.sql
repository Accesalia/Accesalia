-- YA APLICADA el 8-oct-2026 por el MCP (version 20261008114953). NO volver a ejecutar.
-- QUIEN PAGA CADA COSA Y CON QUE SE LE FACTURA (Monica, 8-oct-2026).
--
-- "Lo que quiero es poder decir de cada hoja de encargo a quien debo emitir la factura: que datos iran en
-- la factura. Todo lo demas es el camino." Decidido con ella:
--   * POR LINEA, no por hoja: en una misma hoja Schindler paga el proyecto y la comunidad la subvencion;
--     en Principes 17-19 pagan dos comunidades a medias.
--   * El pagador es un COMODIN (tipo + id), su patron de la figura legal: puede contratarnos cualquiera
--     (comunidad, contrata, empresa propietaria, particular, organismo, fundacion, aseguradora...). Los
--     datos fiscales viven en la ficha de cada uno; la linea solo apunta.
--   * CUENTAS: "es la del titular, pero es posible variarla: puede haber mas de una, cancelarse una y
--     abrir otra". Tabla propia con historial; la linea dice con cual se cobra.
--   * Los grandes (FAIN, Schindler, TKE, Iberdrola como Agente Rehabilitador, Elecnor) tienen su sistema:
--     facturarles exige sus CODIGOS (orden, supervisor, pedido, OC, OE...). Van por linea; cada contrata
--     dice cuales exige, para que la app avise. No son requisito: muchas veces no los tendremos.
--   * Razon social y domicilio fiscal: hueco en comunidades y contratas, opcionales.
--   * Particular: persona de la agenda + cargo 'propietario' con su DNI en puesto.documento. Nada nuevo.
--   * hojas_encargo.pagador_* se queda: es A QUIEN VA la hoja (el documento), no quien paga cada linea.

-- 1 · CUENTAS BANCARIAS, con su titular (comodin) y su historia
create table public.cuentas_bancarias (
  id             uuid        primary key default gen_random_uuid(),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  titular_tipo   text        not null,
  titular_id     uuid        not null,
  iban           text        not null,
  vigente        boolean     not null default true,
  desde          date,
  hasta          date,
  origen         text,
  notas          text,
  constraint cuentas_bancarias_titular_tipo_check
    check (titular_tipo in ('comunidad', 'contrata', 'empresa_propietaria', 'persona', 'organismo')),
  constraint cuentas_bancarias_iban_formato_check check (iban ~ '^[A-Z]{2}[0-9]{2}( ?[0-9A-Z]{4}){4,7}( ?[0-9A-Z]{1,4})?$'),
  constraint cuentas_bancarias_fechas_check check (hasta is null or desde is null or hasta >= desde),
  constraint cuentas_bancarias_unica unique (titular_tipo, titular_id, iban)
);
create index cuentas_bancarias_titular_idx on public.cuentas_bancarias (titular_tipo, titular_id);
create trigger trg_set_actualizado_en before update on public.cuentas_bancarias
  for each row execute function public.set_actualizado_en();
alter table public.cuentas_bancarias enable row level security;
comment on table public.cuentas_bancarias is
  'Cuentas para el cargo, de cualquier titular (comodin tipo + id). Un titular puede tener varias a lo largo del tiempo: la vigente es la que se usa por defecto; la linea de facturacion dice con cual se cobra.';
comment on column public.cuentas_bancarias.origen is 'De donde sale: "hoja HE-2025-0058", "tarjeta", "correo de la administracion"...';

-- 2 · LA LINEA QUE SE COBRA: pagador comodin, cuenta, forma de cobro
alter table public.lineas_facturacion
  add column pagador_tipo text,
  add column pagador_id   uuid,
  add column cuenta_id    uuid references public.cuentas_bancarias(id) on delete set null,
  add column forma_cobro  text;
alter table public.lineas_facturacion
  add constraint lineas_facturacion_pagador_tipo_check
    check (pagador_tipo is null or pagador_tipo in ('comunidad', 'contrata', 'empresa_propietaria', 'persona', 'organismo')),
  add constraint lineas_facturacion_pagador_completo_check check ((pagador_tipo is null) = (pagador_id is null)),
  add constraint lineas_facturacion_forma_cobro_check
    check (forma_cobro is null or forma_cobro in ('cargo_cuenta', 'transferencia', 'confirming'));
create index lineas_facturacion_pagador_idx on public.lineas_facturacion (pagador_tipo, pagador_id);
comment on column public.lineas_facturacion.pagador_tipo is
  'Quien paga ESTA linea (comodin con pagador_id): comunidad, contrata, empresa_propietaria, persona (particular), organismo.';
comment on column public.lineas_facturacion.cuenta_id is 'Con que cuenta se cobra (si es cargo en cuenta). Vacia = la vigente del pagador.';
comment on column public.lineas_facturacion.forma_cobro is 'cargo_cuenta | transferencia | confirming (TKE, Schindler a 60 dias).';
--   el pagador viejo (solo contrata) queda OBSOLETO (la tabla esta vacia). La herramienta no deja borrar
--   columnas: lo borra Monica en el editor SQL con:
--     alter table public.lineas_facturacion drop column pagador_contrata_id;
comment on column public.lineas_facturacion.pagador_contrata_id is
  'OBSOLETA (8-oct-2026): sustituida por pagador_tipo + pagador_id. Vacia. La borra Monica en el editor SQL (la herramienta no deja borrar columnas).';

-- 3 · LOS CODIGOS DEL CLIENTE, por linea (etiqueta + valor)
create table public.codigos_cliente_linea (
  id                   uuid        primary key default gen_random_uuid(),
  creado_en            timestamptz not null default now(),
  linea_facturacion_id uuid        not null references public.lineas_facturacion(id) on delete cascade,
  etiqueta             text        not null,
  valor                text        not null,
  orden                integer,
  constraint codigos_cliente_linea_texto_check check (btrim(etiqueta) <> '' and btrim(valor) <> '')
);
create index codigos_cliente_linea_linea_idx on public.codigos_cliente_linea (linea_facturacion_id);
alter table public.codigos_cliente_linea enable row level security;
comment on table public.codigos_cliente_linea is
  'Los codigos que el cliente exige en SU factura (FAIN: orden, supervisor, pedido; Schindler: OC; TKE: OE...). Por linea: Schindler da a veces dos ordenes en una hoja.';

-- 4 · DATOS FISCALES (huecos opcionales) y que codigos exige cada contrata
alter table public.comunidades
  add column razon_social     text,
  add column domicilio_fiscal text;
comment on column public.comunidades.razon_social is 'Nombre fiscal (tarjeta del CIF / casilla de la hoja). El "nombre" es la direccion curada a mano y no se toca.';
comment on column public.comunidades.domicilio_fiscal is 'Domicilio fiscal para la factura. Opcional.';
comment on column public.comunidades.iban is
  'PROVISIONAL: copia de la cuenta vigente de cuentas_bancarias. Se quita en este mismo sprint, cuando las pantallas lean de alli (Monica: "este sprint no deja deuda tecnica").';
alter table public.contratas
  add column domicilio_fiscal  text,
  add column codigos_exigidos  text[];
comment on column public.contratas.domicilio_fiscal is 'Domicilio fiscal para la factura. Opcional. (direccion = la de contacto.)';
comment on column public.contratas.codigos_exigidos is
  'Codigos que exige en su factura (p. ej. {Orden,Supervisor,Pedido} en FAIN). La app avisa si faltan; no es requisito.';
