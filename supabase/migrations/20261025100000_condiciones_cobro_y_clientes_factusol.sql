-- COBRAR: CONDICIONES DE COBRO POR PAGADOR Y CLIENTES DE FACTUSOL (Monica, 25-oct-2026).
--
-- 1. condiciones_cobro: como cobra cada pagador. La comunidad (y el particular, igual) por defecto: cargo en cuenta.
--    Cada contrata, la suya: forma de cobro, cuando paga (para la fecha prevista y la alerta), a que correo van las
--    facturas y una nota de como se envian («correo postal a la estafeta de Bilbao», «se sube a su portal»…).
--    Quien le factura a la contrata y los codigos que exige siguen en contratas (emisor_factura, codigos_exigidos).
-- 2. factusol_formas_cobro: el codigo de Factusol de cada forma de cobro EN CADA EMPRESA (cambian: cargo en cuenta es
--    02 en Accesalia y 04 en Daniel autonomo). Con el, el pedido que se importa sale con la forma correcta.
-- 3. factusol_clientes: los clientes de Factusol de cada empresa (Accesalia y Daniel los tienen dados de alta por
--    separado), con su codigo, para no duplicar clientes al importar pedidos. Es una COPIA PARA CONSULTAR: se relee
--    de Factusol (cada noche y con «Revisar ahora»), nunca se escribe a mano. Casa por NIF con comunidades y contratas.

create table public.condiciones_cobro (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  pagador_tipo text not null check (pagador_tipo in ('comunidad', 'persona', 'contrata')),
  contrata_id uuid references public.contratas(id),
  forma_cobro text check (forma_cobro in ('cargo_cuenta', 'transferencia', 'confirming')),
  regla_pago text check (regla_pago in ('al_cargo', 'dias', 'corte_remesa')),
  dias integer check (dias is null or dias between 0 and 365),
  dia_corte integer check (dia_corte is null or dia_corte between 1 and 31),
  dia_remesa integer check (dia_remesa is null or dia_remesa between 1 and 31),
  correo_facturas text,
  tambien_al_comercial boolean not null default false,
  como_se_envia text,
  pendiente boolean not null default false,
  notas text,
  activa boolean not null default true,
  actualizado_por uuid references public.equipo(id),
  constraint condiciones_cobro_pagador_check check ((pagador_tipo = 'contrata') = (contrata_id is not null)),
  constraint condiciones_cobro_regla_check check (
    regla_pago is null
    or (regla_pago = 'al_cargo')
    or (regla_pago = 'dias' and dias is not null)
    or (regla_pago = 'corte_remesa' and dia_corte is not null and dia_remesa is not null)),
  -- Sin pendiente, tiene que estar completa.
  constraint condiciones_cobro_completa_check check (pendiente or (forma_cobro is not null and regla_pago is not null))
);
create unique index condiciones_cobro_una_por_contrata on public.condiciones_cobro (contrata_id) where pagador_tipo = 'contrata' and activa;
create unique index condiciones_cobro_una_general on public.condiciones_cobro (pagador_tipo) where pagador_tipo <> 'contrata' and activa;
alter table public.condiciones_cobro enable row level security;
create policy sali_lector_lee on public.condiciones_cobro for select to sali_lector using (true);
comment on table public.condiciones_cobro is 'COMO COBRA CADA PAGADOR (Monica, 25-oct-2026): forma de cobro, cuando paga (al cargo / N dias tras la factura / corte y remesa), a donde van las facturas. Una general para comunidad y otra para particular; una por contrata. Sale por defecto al facturar y se cambia a mano. Pantalla: Cobrar > Ajustes > Condiciones de cobro.';
comment on column public.condiciones_cobro.regla_pago is 'Cuando paga, para la fecha prevista de cobro y la alerta: al_cargo (cargo en cuenta: al emitir el cargo) · dias (N dias despues de la factura) · corte_remesa (emitida hasta el dia_corte, se paga en la remesa del dia_remesa del mes siguiente; despues, en la del otro mes).';
comment on column public.condiciones_cobro.correo_facturas is 'El buzon donde la contrata recibe las facturas (collector.esp@schindler.com…).';
comment on column public.condiciones_cobro.tambien_al_comercial is 'Ademas, al comercial de la contrata que lleva esa obra (FAIN, Schindler).';
comment on column public.condiciones_cobro.como_se_envia is 'Lo que no cabe en lo demas, en palabras: «correo postal a la estafeta de Bilbao», «se sube la proforma a su portal y autorizan a facturar».';
comment on column public.condiciones_cobro.pendiente is 'Faltan datos: los completa facturacion. Mientras, al facturar hay que elegirlos a mano.';

create table public.factusol_formas_cobro (
  empresa text not null references public.empresas_emisoras(clave),
  forma_cobro text not null check (forma_cobro in ('cargo_cuenta', 'transferencia', 'confirming')),
  codigo text not null,
  nombre_factusol text not null,
  primary key (empresa, forma_cobro)
);
alter table public.factusol_formas_cobro enable row level security;
create policy sali_lector_lee on public.factusol_formas_cobro for select to sali_lector using (true);
comment on table public.factusol_formas_cobro is 'El codigo de Factusol de cada forma de cobro en cada empresa (cargo en cuenta = 02 en Accesalia, 04 en Daniel). Con el sale el pedido que se importa. Leido de F_FPA el 25-oct-2026; si cambian en Factusol, aqui.';
insert into public.factusol_formas_cobro (empresa, forma_cobro, codigo, nombre_factusol) values
  ('accesalia', 'transferencia', '01', 'TRANSFERENCIA: ES26 2100 1258 8102 0027 8980'),
  ('accesalia', 'cargo_cuenta', '02', 'CARGO EN CUENTA'),
  ('accesalia', 'confirming', '07', 'CONFIRMING BANCARIO'),
  ('daniel', 'transferencia', '01', 'TRANSFERENCIA: ES90 2100 1258 8102 0019 1207'),
  ('daniel', 'cargo_cuenta', '04', 'CARGO EN CUENTA'),
  ('ecobalance', 'transferencia', '01', 'TRANSFERENCIA: ES40 0182 6781 8802 0168 0038'),
  ('ecobalance', 'confirming', '02', 'CONFIRMING 60 DIAS');

create table public.factusol_clientes (
  id uuid primary key default gen_random_uuid(),
  empresa text not null references public.empresas_emisoras(clave),
  codigo integer not null,
  nif text,
  nombre_fiscal text,
  nombre_comercial text,
  domicilio text,
  poblacion text,
  cp text,
  provincia text,
  email text,
  fecha_alta date,
  comunidad_id uuid references public.comunidades(id),
  contrata_id uuid references public.contratas(id),
  persona_id uuid references public.persona(id),
  leido_en timestamptz not null default now(),
  unique (empresa, codigo)
);
create index factusol_clientes_nif on public.factusol_clientes (nif);
alter table public.factusol_clientes enable row level security;
create policy sali_lector_lee on public.factusol_clientes for select to sali_lector using (true);
comment on table public.factusol_clientes is 'LOS CLIENTES DE FACTUSOL, por empresa (Monica, 25-oct-2026): copia para consultar, se relee de F_CLI (cada noche y con «Revisar ahora»). Factusol identifica al cliente por su CODIGO, no por el NIF: con otro codigo lo duplica. Al generar un pedido, si la comunidad o contrata ya tiene codigo en esa empresa, se usa; si no, se da de alta con uno libre.';
comment on column public.factusol_clientes.comunidad_id is 'La comunidad de la app con ese NIF, si casa (igual contrata_id). persona_id: a mano, la agenda no guarda NIF.';
