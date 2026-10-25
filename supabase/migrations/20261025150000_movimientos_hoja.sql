-- MOVIMIENTOS DE LA HOJA FIRMADA (Monica, 25-oct-2026). Maqueta validada: docs/figma/recorrido-hoja-firmada.html.
-- Una fila por cada cosa que se hace con una hoja firmada despues de validar sus lineas: a donde va (a cobro / a
-- produccion ya), si se devuelve a la lista, la direccion comprobada, cuando se mete en produccion y con que areas, y
-- sus pausas. EL ESTADO DE LA HOJA ES SU ULTIMO MOVIMIENTO: no hay campos de estado aparte (seria otra verdad).
--   - Nuevas hojas firmadas: sin movimiento de destino, o el ultimo es «devuelta».
--   - Primer cobro: el ultimo destino es «a_cobro» y aun no se ha cobrado el primer hito (eso lo dicen los hitos).
--   - Bandeja de la secretaria comercial: «a_produccion», o «a_cobro» con el primer hito cobrado, sin meter aun.
--   - En produccion (Asignar, Facturable ya): «metida_produccion» despues del ultimo destino.
--   - Una pausa NUNCA para el cobro: para el trabajo de las areas de ESA hoja. La pone facturacion (Alexandra, desde
--     el diario) o la secretaria; la de facturacion la levanta facturacion y la reanuda la secretaria.
-- Ademas: las dudas de facturacion se pueden enviar al comercial o a «revisar por direccion» (quien tiene la funcion
-- revision_ofertas), por correo desde el buzon de facturacion.

create table public.movimientos_hoja (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  hoja_encargo_id uuid not null references public.hojas_encargo(id),
  tipo text not null constraint movimientos_hoja_tipo_check check (tipo in (
    'a_cobro', 'a_produccion', 'devuelta', 'direccion_comprobada', 'metida_produccion', 'pausada', 'pausa_levantada', 'reanudada')),
  en timestamptz not null default now(),
  por uuid references public.equipo(id), -- null = la app
  -- Desde donde se hizo: lo que decide facturacion, lo que hace la secretaria comercial, o la app (la carga).
  lado text not null constraint movimientos_hoja_lado_check check (lado in ('facturacion', 'secretaria', 'app')),
  motivo text,
  -- Las areas que abre (metida_produccion, reanudada) o que para (pausada): PRY, OBR, SUBV... las de bloques.area.
  areas text[],
  -- De las pausas: de quien depende (como las pausas de la opp) y cuando se reanuda.
  tejado text constraint movimientos_hoja_tejado_check check (tejado in ('accesalia', 'cliente', 'tercero')),
  condicion text,
  constraint movimientos_hoja_motivo_check check (tipo not in ('a_produccion', 'devuelta', 'pausada') or nullif(trim(motivo), '') is not null),
  constraint movimientos_hoja_pausa_check check (tipo <> 'pausada' or tejado is not null)
);
create index movimientos_hoja_hoja_idx on public.movimientos_hoja (hoja_encargo_id, en);
create index movimientos_hoja_en_idx on public.movimientos_hoja (en desc);
alter table public.movimientos_hoja enable row level security;
create policy sali_lector_lee on public.movimientos_hoja for select to sali_lector using (true);

-- Las dudas: a quien se enviaron, cuando, quien y a que direcciones.
alter table public.notas_facturacion
  add column enviada_a text constraint notas_facturacion_enviada_a_check check (enviada_a in ('comercial', 'direccion')),
  add column enviada_en timestamptz,
  add column enviada_por uuid references public.equipo(id),
  add column enviada_para text[];

-- LO DE ANTES DE LOS BOTONES (Monica, 25-oct: «las antiguas pasan a metido en produccion»). Toda hoja firmada con
-- alguna linea validada que no esta en Nuevas hojas firmadas se apunta como metida en produccion por la app, con la
-- fecha de su ultima validacion y las areas de los bloques de sus lineas validadas. Asi Asignar y Facturable ya siguen
-- viendo exactamente lo que veian. Las que estan en la lista (firmadas desde 2025 con alguna linea sin validar) no
-- llevan nada: pasan por los botones.
insert into public.movimientos_hoja (hoja_encargo_id, tipo, en, por, lado, motivo, areas)
select he.id, 'metida_produccion', max(l.validada_en), null, 'app',
       'Validada antes de existir los botones (carga del 12-oct)',
       nullif(array_remove(array_agg(distinct b.area), null), '{}')
from public.hojas_encargo he
join public.lineas_facturacion l on l.hoja_encargo_id = he.id and l.quitada_en is null and l.emisor in ('accesalia', 'daniel_autonomo')
left join public.bloques b on b.id = l.bloque_id and l.validada_en is not null
where he.estado = 'devuelta_firmada'
group by he.id, he.fecha_firma
having count(l.validada_en) > 0
   and (he.fecha_firma < '2025-01-01' or count(l.validada_en) = count(*));
