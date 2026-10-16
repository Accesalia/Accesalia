-- ANULAR UNA OPP, ELIGIENDO LA RAZON (Monica, 16-oct-2026): "no duplicada, sino
-- anular, y luego ya eliges la razon". Dos razones:
--   · duplicada de otra: anular_por_duplicada() (20261016200000), lo suyo pasa
--     a la buena;
--   · creada por error (prueba, direccion equivocada, no era nuestra): sin
--     buena, con su porque. Lo que tenga se queda con ella.
-- En los dos casos NO se borra: el codigo queda ocupado, se ve quien y por que,
-- y se puede reabrir. Para todo lo demas, una anulada no existe.

alter table public.oportunidades
  add column if not exists motivo_anulacion text;

comment on column public.oportunidades.motivo_anulacion is
  'Por que se anulo, si fue por error de alta (sin duplicada_de). Null en las duplicadas.';

-- Anulada <=> tiene fecha; y si no es duplicada de otra, dice por que.
alter table public.oportunidades drop constraint if exists oportunidad_anulada_coherente;
alter table public.oportunidades add constraint oportunidad_anulada_coherente
  check (
    ((estado = 'anulada') = (anulada_en is not null))
    and (estado <> 'anulada' or duplicada_de is not null or nullif(trim(motivo_anulacion), '') is not null)
    and duplicada_de is distinct from id
  );

insert into public.plantillas_sali (clave, plantilla, cuando, activo)
values ('opp_anulada_error', 'Anulada por error de alta[ por {quien}]: {motivo}', 'Se anula una opp creada por error', true),
       ('opp_reabierta_anulada', 'Reabierta: estaba anulada[ ({antes})][, la reabre {quien}].', 'Se reabre una opp anulada', true)
on conflict (clave) do nothing;

-- ------------------------------------------------------------ por error
create or replace function public.anular_por_error(p_opp uuid, p_motivo text, p_quien uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  mala public.oportunidades;
  quien text;
begin
  if nullif(trim(p_motivo), '') is null then raise exception 'Escribe por qué se anula.'; end if;
  select * into mala from oportunidades where id = p_opp for update;
  if mala.id is null then raise exception 'No existe esa opp.'; end if;
  if mala.estado = 'anulada' then raise exception 'La opp % ya está anulada.', mala.codigo; end if;
  if exists (select 1 from hojas_encargo where oportunidad_id = p_opp)
     or exists (select 1 from facturas where oportunidad_id = p_opp)
     or exists (select 1 from proformas where oportunidad_id = p_opp)
     or exists (select 1 from presupuestos where oportunidad_id = p_opp)
     or exists (select 1 from presupuestos_proyecto where oportunidad_id = p_opp)
     or exists (select 1 from revisiones_oferta where oportunidad_id = p_opp) then
    raise exception 'La opp % tiene hoja de encargo, presupuesto, proforma o factura: no se anula.', mala.codigo;
  end if;

  -- Si estaba pausada, la pausa se cierra con fecha, como al cerrar.
  update historial_pausas_oportunidad set hasta = (now() at time zone 'Europe/Madrid')::date
   where oportunidad_id = p_opp and hasta is null;
  update relacion_oportunidad_accesos set hasta = (now() at time zone 'Europe/Madrid')::date
   where opp_id = p_opp and hasta is null;
  update oportunidades
     set estado = 'anulada', motivo_anulacion = trim(p_motivo), anulada_en = now(), anulada_por = p_quien
   where id = p_opp;

  select nombre into quien from equipo where id = p_quien;
  perform nota_sali(p_opp, null, 'opp_anulada_error', jsonb_build_object('quien', quien, 'motivo', trim(p_motivo)), 'interno');
end;
$$;

-- ------------------------------------------------------------ reabrir
-- Vuelve a abierta y recupera los portales que se le soltaron al anularla (los
-- que tienen de fin el dia de la anulacion). Lo que se paso a la buena en una
-- duplicada se queda en la buena: eso no se deshace solo.
create or replace function public.reabrir_anulada(p_opp uuid, p_quien uuid)
returns void
language plpgsql
set search_path = public
as $$
declare
  op public.oportunidades;
  quien text;
  antes text;
begin
  select * into op from oportunidades where id = p_opp for update;
  if op.id is null then raise exception 'No existe esa opp.'; end if;
  if op.estado <> 'anulada' then raise exception 'La opp % no está anulada.', op.codigo; end if;

  update relacion_oportunidad_accesos set hasta = null
   where opp_id = p_opp and hasta = (op.anulada_en at time zone 'Europe/Madrid')::date;

  select coalesce('duplicada de ' || b.codigo, op.motivo_anulacion) into antes
    from (select 1) x left join oportunidades b on b.id = op.duplicada_de;

  update oportunidades
     set estado = 'abierta', duplicada_de = null, motivo_anulacion = null, anulada_en = null, anulada_por = null
   where id = p_opp;

  select nombre into quien from equipo where id = p_quien;
  perform nota_sali(p_opp, null, 'opp_reabierta_anulada', jsonb_build_object('quien', quien, 'antes', antes), 'interno');
end;
$$;

revoke all on function public.anular_por_error(uuid, text, uuid) from public, anon, authenticated;
revoke all on function public.reabrir_anulada(uuid, uuid) from public, anon, authenticated;
grant execute on function public.anular_por_error(uuid, text, uuid) to service_role;
grant execute on function public.reabrir_anulada(uuid, uuid) to service_role;
