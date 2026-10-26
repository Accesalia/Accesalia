-- EL JUSTIFICANTE MANDA (Monica, 26-oct-2026).
--
-- 1. cobros.gasto: lo que nos cuesta cobrar esa factura con ese justificante (el confirming o el factoring que
--    descuenta el pagador, la comision del banco por cada cargo en cuenta: «asi puedo hacer calculos reales de que he
--    ingresado de verdad de este proyecto»). Si un papel paga varias facturas, el gasto del papel se REPARTE entre sus
--    filas en proporcion a lo que se paga de cada una (opcion b). Lo que entro en el banco no se guarda: es la suma de
--    las filas del papel menos su gasto.
--
-- 2. EL ESTADO DE LA FACTURA SE DERIVA DEL DATO («un estado que se deriva del dato»; opcion b: lo calcula la base, venga
--    el justificante de la pantalla, de la proforma o de un script). Al cambiar cualquier fila de cobros:
--      - la factura: cobrada si lo aplicado llega al total (±1 €) o hay un justificante sin importe leido (la regla que
--        ya usaba Facturas emitidas), cobrada en parte si hay algo, pendiente si no hay nada. Las devoluciones son filas
--        negativas y RESTAN. «anulada», «otro» y los abonos no se tocan nunca.
--      - sus hitos (los casados por factura_linea_hitos): cobrado cuando lo cobrado de sus facturas cubre su importe
--        (±1 €), en parte si hay algo (un subhito no admite «parcial»: queda pendiente), pendiente si nada. Los hitos
--        «anulado» y «devuelto» no se tocan. El hito padre, por sus subhitos, como hace la proforma (un hito a exito
--        abierto nunca queda completado).
--    Solo se recalcula lo que cambia de ahora en adelante: nada de lo que ya existe se recalcula al aplicar esto.

alter table public.cobros add column if not exists gasto numeric(12,2);
comment on column public.cobros.gasto is
  'Lo que cuesta cobrar esta factura con este justificante (confirming, factoring, comision del banco por el cargo). Si el papel paga varias facturas, su gasto se reparte en proporcion a lo pagado de cada una. Lo ingresado = importe - gasto.';

create or replace function public.recalcular_estado_factura(p_factura uuid) returns void
language plpgsql set search_path = public as $$
declare
  f record;
  h record;
  p record;
  v_aplicado numeric;
  v_hay boolean;
  v_sin_importe boolean;
  v_estado text;
  v_cubierto numeric;
  v_algo boolean;
  v_fecha date;
  v_nuevo text;
  v_padres uuid[] := '{}';
  v_subs int; v_hechos int; v_empezados int;
begin
  select id, estado, total, tipo into f from facturas where id = p_factura;
  if not found or f.estado in ('anulada', 'otro') or f.tipo = 'abono' then return; end if;

  -- LA FACTURA
  select coalesce(sum(importe), 0), count(*) > 0, coalesce(bool_or(importe is null), false)
    into v_aplicado, v_hay, v_sin_importe
    from cobros where factura_id = p_factura;
  v_estado := case
    when not v_hay then 'pendiente'
    when v_sin_importe or v_aplicado >= coalesce(f.total, 0) - 1 then 'cobrada'
    when v_aplicado > 0.005 then 'cobrada_en_parte'
    else 'pendiente' end;
  update facturas set estado = v_estado where id = p_factura and estado is distinct from v_estado;

  -- SUS HITOS: cada uno con TODAS las facturas que lo cubren (un hito puede ir en varias facturas).
  for h in
    select distinct hc.id, hc.importe, hc.estado, hc.hito_padre_id
      from factura_lineas l
      join factura_linea_hitos x on x.factura_linea_id = l.id
      join hitos_cobro hc on hc.id = x.hito_cobro_id
     where l.factura_id = p_factura
  loop
    if h.hito_padre_id is not null then v_padres := array_append(v_padres, h.hito_padre_id); end if;
    continue when h.estado in ('anulado', 'devuelto');
    select coalesce(sum(case when fa.estado = 'cobrada' then coalesce(x.importe, h.importe, 0) else 0 end), 0),
           coalesce(bool_or(fa.estado in ('cobrada', 'cobrada_en_parte')), false),
           max(case when fa.estado = 'cobrada' then (select max(c.fecha_cobro) from cobros c where c.factura_id = fa.id) end)
      into v_cubierto, v_algo, v_fecha
      from factura_linea_hitos x
      join factura_lineas l on l.id = x.factura_linea_id
      join facturas fa on fa.id = l.factura_id and fa.estado <> 'anulada' and fa.tipo is distinct from 'abono'
     where x.hito_cobro_id = h.id;
    v_nuevo := case
      when v_cubierto > 0 and v_cubierto >= coalesce(h.importe, v_cubierto) - 1 then 'completado'
      when v_algo and h.hito_padre_id is null then 'parcial'
      else 'pendiente' end;
    if v_nuevo is distinct from h.estado then
      update hitos_cobro
         set estado = v_nuevo,
             fecha_cobro = case when v_nuevo = 'completado' then coalesce(fecha_cobro, v_fecha) else null end
       where id = h.id;
    end if;
  end loop;

  -- LOS PADRES, por sus subhitos.
  for p in select id, importe, cerrado_en, estado from hitos_cobro where id = any(v_padres) loop
    continue when p.estado in ('anulado', 'devuelto');
    select count(*), count(*) filter (where estado = 'completado'), count(*) filter (where estado in ('completado', 'parcial'))
      into v_subs, v_hechos, v_empezados
      from hitos_cobro where hito_padre_id = p.id and estado <> 'anulado';
    v_nuevo := case
      when v_subs > 0 and v_hechos = v_subs and not (p.importe is null and p.cerrado_en is null) then 'completado'
      when v_empezados > 0 then 'parcial'
      else 'pendiente' end;
    update hitos_cobro set estado = v_nuevo where id = p.id and estado is distinct from v_nuevo;
  end loop;
end $$;

comment on function public.recalcular_estado_factura(uuid) is
  'El estado de la factura y de sus hitos, derivado de sus justificantes (cobros). Lo llama el disparador de cobros (Monica, 26-oct-2026).';

create or replace function public.cobros_recalcular_factura() returns trigger
language plpgsql set search_path = public as $$
begin
  -- Solo cuando cambia lo que cuenta (que factura, cuanto, de que tipo): casar un cobro con su movimiento del banco
  -- (movimiento_bancario_id) o apuntar su gasto no recalcula nada.
  if tg_op = 'INSERT' then
    perform recalcular_estado_factura(new.factura_id);
  elsif tg_op = 'DELETE' then
    perform recalcular_estado_factura(old.factura_id);
  elsif new.factura_id is distinct from old.factura_id or new.importe is distinct from old.importe or new.tipo is distinct from old.tipo then
    perform recalcular_estado_factura(old.factura_id);
    if new.factura_id is distinct from old.factura_id then perform recalcular_estado_factura(new.factura_id); end if;
  end if;
  return null;
end $$;

drop trigger if exists trg_cobros_recalcular_factura on public.cobros;
create trigger trg_cobros_recalcular_factura
  after insert or update or delete on public.cobros
  for each row execute function public.cobros_recalcular_factura();

-- 3. DOS LINEAS DE GASTOS NUEVAS, en Accesalia y en Daniel (Monica, 26-oct-2026: «al final es una pasta»). En la
--    pantalla del mes cada euro se cuenta UNA vez:
--      - «Comisión por cargo en cuenta»: SALE EN EL EXTRACTO (CaixaBank «PR.FA…», 0,24 y desde oct-2025 0,61 por cargo;
--        BBVA «LIQUIDACION REMESA ADEUDOS DIRECTOS»), asi que su real son esos movimientos. Hasta hoy iban dentro de
--        «Gastos bancarios» (los de Daniel, sin linea): pasan a la suya. Por factura, el mismo gasto va en cobros.gasto.
--      - «Gastos de confirming y factoring»: NO sale en el banco (el pagador paga ya descontado), asi que su real es la
--        suma de cobros.gasto del mes (salvo los cargos en cuenta y las devoluciones, que salen en el extracto).
--        Origen nuevo «justificantes»: lo lee lib/gastosMes.ts.
alter table public.gastos_habituales drop constraint if exists gastos_habituales_origen_check;
alter table public.gastos_habituales add constraint gastos_habituales_origen_check
  check (origen = any (array['excel_2025', 'extracto', 'manual', 'justificantes']));

with nuevas as (
  insert into public.gastos_habituales (empresa, concepto, importe, cada, origen, como_aparece, notas, activo, avisar, solo_direccion)
  values
    ('accesalia', 'Comisión por cargo en cuenta', 14.84, 'mensual', 'extracto', array['^PR\.FA', 'LIQUIDACION REMESA ADEUDOS'],
     'Lo que cobra el banco por cada recibo cargado a una comunidad (0,24 €; 0,61 € desde oct-2025). Media ene-sep 2026 del banco. Antes iba dentro de Gastos bancarios (Mónica, 26-oct). Por factura, en el justificante (cobros.gasto).', true, false, false),
    ('daniel_autonomo', 'Comisión por cargo en cuenta', 0.48, 'mensual', 'extracto', array['^PR\.FA'],
     'Lo que cobra el banco por cada recibo cargado (0,54 €). Media ene-sep 2026 del banco (Mónica, 26-oct). Por factura, en el justificante (cobros.gasto).', true, false, false),
    ('accesalia', 'Gastos de confirming y factoring', null, 'mensual', 'justificantes', null,
     'Lo que descuenta el pagador por adelantar el cobro: no sale en el banco. Real = la suma de los gastos apuntados en los justificantes del mes (Mónica, 26-oct).', true, false, false),
    ('daniel_autonomo', 'Gastos de confirming y factoring', null, 'mensual', 'justificantes', null,
     'Lo que descuenta el pagador por adelantar el cobro: no sale en el banco. Real = la suma de los gastos apuntados en los justificantes del mes (Mónica, 26-oct).', true, false, false)
  returning id, empresa, concepto
)
update public.movimientos_bancarios m
   set gasto_habitual_id = n.id
  from nuevas n
 where n.concepto = 'Comisión por cargo en cuenta'
   and m.clase = 'gasto'
   and ((n.empresa = 'accesalia' and ((m.cuenta = 'caixa_accesalia' and m.concepto like 'PR.FA%')
                                      or (m.cuenta = 'bbva_accesalia' and m.concepto ilike 'LIQUIDACION REMESA ADEUDOS%')))
     or (n.empresa = 'daniel_autonomo' and m.cuenta = 'caixa_daniel' and m.concepto like 'PR.FA%'));

update public.gastos_habituales
   set notas = coalesce(notas, '') || ' Sin las comisiones por cargo en cuenta, que tienen su línea desde el 26-oct-2026.'
 where empresa = 'accesalia' and concepto = 'Gastos bancarios';
