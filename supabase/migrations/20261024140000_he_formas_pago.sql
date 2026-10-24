-- LAS FORMAS DE PAGO DE LA HOJA DE ENCARGO, en tablas (Monica, 24-oct-2026). Hasta hoy eran tres textos en el codigo
-- (lib/hojaPapel.ts FORMAS_PAGO) que habia que traducir a hitos cada vez; ahora cada forma lleva sus hitos y su frase
-- para la hoja, y los hitos de cobro se COPIAN en vez de interpretarse. Maqueta validada: docs/figma/formas-de-pago.html.
--   he_formas_pago           una fila por forma: como le sale al comercial, si esta activa, notas
--   he_formas_pago_hitos     sus hitos, en orden: momento, fijo (con su %) o a exito, y la frase para la hoja
--   he_formas_pago_defecto   cuando sale por defecto: un bloque + quien paga (cualquiera, la comunidad, un particular
--                            o una contrata concreta). Cada caso, UNA forma. Sin caso, la linea sale en blanco.
-- Las de Ecobalance (los 3 presupuestos) no van aqui: tendran su propia tabla.

create table public.he_formas_pago (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  nombre text not null,
  activa boolean not null default true,
  orden integer not null default 0,
  notas text,
  creada_por uuid references public.equipo(id),
  desactivada_en timestamptz,
  sustituye_a uuid references public.he_formas_pago(id),
  constraint he_formas_pago_nombre_check check (trim(nombre) <> '')
);
create trigger trg_set_actualizado_en before update on public.he_formas_pago for each row execute function set_actualizado_en();
alter table public.he_formas_pago enable row level security;
create policy sali_lector_lee on public.he_formas_pago for select to sali_lector using (true);
comment on table public.he_formas_pago is 'Las formas de pago que se eligen en cada linea de la hoja de encargo (24-oct-2026). Sus hitos, en he_formas_pago_hitos; cuando sale por defecto, en he_formas_pago_defecto. Una forma ya usada no se cambia por debajo de lo firmado: si cambian sus hitos, se desactiva y nace otra (sustituye_a).';
comment on column public.he_formas_pago.nombre is 'Como le sale al comercial para elegirla («50 % encargo · 50 % entrega»).';
comment on column public.he_formas_pago.activa is 'Las desactivadas no se eligen, pero se conservan: las lineas viejas las llevan.';
comment on column public.he_formas_pago.orden is 'Su sitio en la lista del comercial.';
comment on column public.he_formas_pago.sustituye_a is 'Si nacio al cambiar los hitos de otra ya usada: la forma a la que sustituye (que quedo desactivada).';

create table public.he_formas_pago_hitos (
  id uuid primary key default gen_random_uuid(),
  forma_pago_id uuid not null references public.he_formas_pago(id) on delete cascade,
  orden integer not null,
  momento text not null,
  tipo text not null default 'fijo',
  porcentaje numeric,
  frase text not null,
  constraint he_formas_pago_hitos_momento_check check (momento in ('encargo', 'entrega', 'licencia', 'pss', 'inicio_obra', 'cfo', 'presentacion', 'concesion', 'adjudicacion')),
  constraint he_formas_pago_hitos_tipo_check check (tipo in ('fijo', 'exito')),
  constraint he_formas_pago_hitos_porcentaje_check check ((tipo = 'fijo' and porcentaje > 0 and porcentaje <= 100) or (tipo = 'exito' and porcentaje is null)),
  constraint he_formas_pago_hitos_frase_check check (trim(frase) <> ''),
  constraint he_formas_pago_hitos_orden_unico unique (forma_pago_id, orden)
);
alter table public.he_formas_pago_hitos enable row level security;
create policy sali_lector_lee on public.he_formas_pago_hitos for select to sali_lector using (true);
comment on table public.he_formas_pago_hitos is 'Los hitos de cada forma de pago, en orden. Los fijos suman 100 (lo comprueba la pantalla). El % de un hito a exito lo pone cada linea; sobre que se calcula, el bloque.';
comment on column public.he_formas_pago_hitos.momento is 'Cuando se cobra (los mismos de hitos_cobro, sin firma, que es encargo, ni otro).';
comment on column public.he_formas_pago_hitos.porcentaje is 'Solo en los fijos: el % del importe de la linea.';
comment on column public.he_formas_pago_hitos.frase is 'Como sale este hito en la hoja («50 % a la contratación»). El texto de la hoja es la suma de las frases.';

create table public.he_formas_pago_defecto (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  forma_pago_id uuid not null references public.he_formas_pago(id) on delete cascade,
  bloque_id uuid not null references public.bloques(id),
  pagador_tipo text not null,
  pagador_contrata_id uuid references public.contratas(id),
  constraint he_formas_pago_defecto_pagador_check check (pagador_tipo in ('cualquiera', 'comunidad', 'persona', 'contrata')),
  constraint he_formas_pago_defecto_contrata_check check ((pagador_tipo = 'contrata') = (pagador_contrata_id is not null))
);
create unique index he_formas_pago_defecto_un_caso on public.he_formas_pago_defecto (bloque_id, pagador_tipo) where pagador_contrata_id is null;
create unique index he_formas_pago_defecto_un_caso_contrata on public.he_formas_pago_defecto (bloque_id, pagador_contrata_id) where pagador_contrata_id is not null;
alter table public.he_formas_pago_defecto enable row level security;
create policy sali_lector_lee on public.he_formas_pago_defecto for select to sali_lector using (true);
comment on table public.he_formas_pago_defecto is 'Cuando sale cada forma por defecto: un bloque + quien paga. Cada caso da UNA forma. Al elegir, manda la contrata concreta, luego la comunidad o el particular, luego «cualquiera». Sin caso, la linea sale en blanco y la elige el comercial (Monica, 24-oct-2026).';
comment on column public.he_formas_pago_defecto.pagador_tipo is 'cualquiera, comunidad, persona (un particular) o contrata (entonces pagador_contrata_id dice cual).';
