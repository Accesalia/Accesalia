-- EL SISTEMA NUEVO DE LA HOJA DE ENCARGO, primeras dos tablas (Monica, 24-oct-2026: «vamos con las dos tablas, con
-- todo lo que es el cambio junto, para historico imperdible»). Nacen vacias: nada las lee todavia.
--
--   he_versiones_hoja  una fila por VERSION de una hoja. La «hoja» es solo el codigo HE que comparten sus versiones.
--                      Existe desde el primer borrador (con su id); el codigo HE, el numero de version definitivo y el
--                      PDF firmado electronicamente por Daniel nacen con el OK DE DANIEL, y desde ahi queda congelada.
--   he_estados_hoja    el HISTORIAL: una fila por cada cambio de estado de una version, con su fecha, quien y una nota.
--                      Nunca se borra nada. Aqui van TODOS los cambios pedidos (Daniel, la comunidad, el comercial),
--                      con su motivo en la nota. En la version solo queda el estado actual.
-- Las lineas (he_lineas_compromisos), sus accesos y las formas de pago vendran despues.

create table public.he_versiones_hoja (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  codigo_he text,
  numero_version integer not null default 1,
  oportunidad_id uuid not null references public.oportunidades(id),
  pagador_tipo text not null,
  pagador_comunidad_id uuid references public.comunidades(id),
  pagador_contrata_id uuid references public.contratas(id),
  pagador_persona_id uuid references public.persona(id),
  comercial_id uuid references public.comerciales(id),
  generada_por uuid references public.equipo(id),
  fecha_emision date,
  estado text not null default 'borrador',
  pdf text,
  notas text,
  constraint he_versiones_hoja_codigo_check check (codigo_he is null or codigo_he ~ '^HE-[0-9]{4}-[0-9]+$'),
  constraint he_versiones_hoja_version_check check (numero_version >= 1),
  constraint he_versiones_hoja_codigo_version_unico unique (codigo_he, numero_version),
  constraint he_versiones_hoja_pagador_tipo_check check (pagador_tipo in ('comunidad', 'contrata', 'persona')),
  constraint he_versiones_hoja_pagador_check check (
    num_nonnulls(pagador_comunidad_id, pagador_contrata_id, pagador_persona_id) <= 1
    and (pagador_comunidad_id is null or pagador_tipo = 'comunidad')
    and (pagador_contrata_id is null or pagador_tipo = 'contrata')
    and (pagador_persona_id is null or pagador_tipo = 'persona')),
  constraint he_versiones_hoja_estado_check check (estado in (
    'borrador', 'pendiente_ok_daniel', 'cambios_daniel', 'ok_daniel', 'enviada', 'firmada_recibida', 'firma_con_errores',
    'ok_comercial', 'hitos_validados', 'primer_cobro', 'ok_administracion',
    'cambios_comunidad', 'cambios_comercial', 'no_firmada', 'anulada', 'pausada', 'sustituida'))
);
create index he_versiones_hoja_oportunidad_idx on public.he_versiones_hoja (oportunidad_id);
create trigger trg_set_actualizado_en before update on public.he_versiones_hoja for each row execute function set_actualizado_en();
alter table public.he_versiones_hoja enable row level security;
create policy sali_lector_lee on public.he_versiones_hoja for select to sali_lector using (true);

comment on table public.he_versiones_hoja is 'Una fila por VERSION de una hoja de encargo (sistema nuevo, 24-oct-2026). La hoja = el codigo HE que comparten sus versiones. Existe desde el primer borrador; el codigo HE, la version y el PDF firmado por Daniel nacen con el ok de Daniel y desde ahi queda congelada. Su historial, en he_estados_hoja.';
comment on column public.he_versiones_hoja.codigo_he is 'HE-año-numero. Vacio hasta el ok de Daniel. Lo comparten todas las versiones de la misma hoja.';
comment on column public.he_versiones_hoja.numero_version is '1, 2, 3... Sube solo cuando, de una version ya emitida, se crea otra. Los cambios de Daniel en revision no crean version.';
comment on column public.he_versiones_hoja.pagador_tipo is 'Quien paga la hoja: comunidad, contrata o persona (particular). Una hoja, un pagador.';
comment on column public.he_versiones_hoja.comercial_id is 'El comercial que lleva la opp, puesto solo por la app y CONGELADO al emitir (la opp puede cambiar de comercial despues).';
comment on column public.he_versiones_hoja.generada_por is 'La persona del equipo que la genero (no siempre el comercial: la secretaria genera para otros).';
comment on column public.he_versiones_hoja.fecha_emision is 'Cuando nace la version: el ok de Daniel. Las demas fechas, en he_estados_hoja.';
comment on column public.he_versiones_hoja.estado is 'El estado ACTUAL (el ultimo de he_estados_hoja).';
comment on column public.he_versiones_hoja.pdf is 'Ruta del PDF de la version, firmado electronicamente por Daniel.';
comment on column public.he_versiones_hoja.notas is 'Observaciones del comercial, si quiere dejarlas.';

create table public.he_estados_hoja (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references public.he_versiones_hoja(id),
  estado text not null,
  fecha timestamptz not null default now(),
  persona_id uuid references public.equipo(id),
  nota text,
  constraint he_estados_hoja_estado_check check (estado in (
    'borrador', 'pendiente_ok_daniel', 'cambios_daniel', 'ok_daniel', 'enviada', 'firmada_recibida', 'firma_con_errores',
    'ok_comercial', 'hitos_validados', 'primer_cobro', 'ok_administracion',
    'cambios_comunidad', 'cambios_comercial', 'no_firmada', 'anulada', 'pausada', 'sustituida')),
  -- Los cambios pedidos y los finales sin firma llevan siempre su porque.
  constraint he_estados_hoja_nota_check check (
    estado not in ('cambios_daniel', 'cambios_comunidad', 'cambios_comercial', 'no_firmada', 'anulada')
    or coalesce(trim(nota), '') <> '')
);
create index he_estados_hoja_version_idx on public.he_estados_hoja (version_id, fecha);
alter table public.he_estados_hoja enable row level security;
create policy sali_lector_lee on public.he_estados_hoja for select to sali_lector using (true);

comment on table public.he_estados_hoja is 'HISTORIAL de cada version de hoja (sistema nuevo, 24-oct-2026): una fila por cada cambio de estado, con fecha, quien y nota. Nunca se borra. Aqui van TODOS los cambios pedidos: cambios_daniel (revision, no crea version), cambios_comunidad y cambios_comercial (en la version que queda atras, con su motivo en la nota; despues sustituida).';
comment on column public.he_estados_hoja.estado is 'El estado al que pasa. cambios_daniel / cambios_comunidad / cambios_comercial = quien pidio el cambio; no_firmada / anulada = finales sin firma; pausada = se reanuda volviendo al estado anterior; sustituida = la pone la app al nacer otra version.';
comment on column public.he_estados_hoja.persona_id is 'Quien lo hizo (del equipo). Vacio = la app, sola.';
comment on column public.he_estados_hoja.nota is 'Lo que se pide o el porque. Obligatoria en los cambios pedidos, no firmada y anulada.';
