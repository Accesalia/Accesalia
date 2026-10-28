-- BLOQUE 3 · SEGUIMIENTO Y NEGOCIACION: los huecos que no tenian casa (Monica, 28-oct-2026, «ok a esos cambios»).
--
-- 1 · LOS APUNTES DE LA NEGOCIACION: lo que el comercial va sabiendo de las personas de la comunidad y que no es un
--     dato de ficha: el presidente y sus notas («es mayor», «trabaja en Schindler»), la comision de obras, los vecinos
--     que empujan (a favor o en contra, y por que), la contrata elegida o el presupuesto previo, y la competencia.
--     Cuelgan de la OPP (la negociacion es de la opp); la persona, si esta en la agenda, se enlaza.
create table if not exists public.negociacion_apuntes (
  id             uuid primary key default gen_random_uuid(),
  creado_en      timestamptz not null default now(),
  oportunidad_id uuid not null references public.oportunidades(id) on delete cascade,
  apartado       text not null constraint negociacion_apuntes_apartado
                   check (apartado in ('presidente', 'comision_obras', 'vecino', 'contrata', 'competencia')),
  persona_id     uuid references public.persona(id),
  texto          text not null constraint negociacion_apuntes_texto check (btrim(texto) <> ''),
  -- Solo para los vecinos: si empujan a favor o en contra.
  postura        text constraint negociacion_apuntes_postura check (postura in ('a_favor', 'en_contra')),
  autor_id       uuid,
  autor          text
);
create index if not exists negociacion_apuntes_opp on public.negociacion_apuntes (oportunidad_id);
comment on table public.negociacion_apuntes is
$$Lo que el comercial apunta de las personas de la negociacion (bloque 3, Monica 28-oct-2026): presidente y sus notas,
comision de obras, vecinos a favor o en contra, contrata y competencia. Cuelga de la opp.$$;
alter table public.negociacion_apuntes enable row level security;
create policy sali_lector_lee on public.negociacion_apuntes for select to sali_lector using (true);

-- 2 · LA JUNTA: lo que se sabe despues (del acta, si votan si) y el «si a una parte», que deja la decision abierta
--     a proposito hasta que cada hoja enviada llegue a su final.
alter table public.juntas
  add column if not exists documentacion text,
  add column if not exists quorum text,
  add column if not exists votos_favor integer,
  add column if not exists votos_contra integer;
alter table public.juntas drop constraint if exists juntas_resultado_check;
alter table public.juntas add constraint juntas_resultado_check check (resultado = any (array[
  'pendiente', 'favorable', 'si_parcial', 'desfavorable', 'aplazada', 'piden_mas_presupuestos', 'complicacion', 'modificar_oferta'
]));
comment on column public.juntas.documentacion is 'Lo que se llevo (o hay que llevar) a la junta (bloque 3, 28-oct-2026).';
comment on column public.juntas.quorum is 'El quorum, del acta (si votan si; si votan no, no se pide el acta).';

-- 3 · LOS CAMBIOS PEDIDOS: donde se pidieron (en junta, por telefono, por correo, en una reunion).
alter table public.he_estados_hoja
  add column if not exists donde text constraint he_estados_hoja_donde check (donde in ('junta', 'telefono', 'correo', 'reunion', 'otro'));
comment on column public.he_estados_hoja.donde is 'Donde se pidio el cambio (cambios de la comunidad o del comercial), bloque 3, 28-oct-2026.';
