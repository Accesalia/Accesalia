-- =====================================================================
-- AL MARCAR EL ULTIMO HITO, LA OPORTUNIDAD SE CIERRA SOLA
-- Monica, 4-oct-2026: "cerrada ADEMAS si le llega al ultimo hito".
--
-- El ultimo hito de hitos_comerciales es 'cobro' (orden 90); el anterior es
-- 'firma' (80). Cobrado = ganada y acabada, asi que la oportunidad se cierra
-- sin que nadie tenga que acordarse.
--
-- Perder NO pasa por aqui. Una oportunidad se pierde en cualquier hito y
-- entonces se cierra a mano, desde donde se este. Esto solo cubre el final
-- bueno del camino.
--
-- Lo que el disparador NO hace a proposito: no escribe el motivo de cierre.
-- Eso lo pide la pantalla cuando el estado pasa a 'cerrada'; la base no se
-- inventa el por que.
-- =====================================================================

create or replace function public.cerrar_opp_al_cobrar() returns trigger
language plpgsql as $$
begin
  if new.hito = 'cobro' and new.estado = 'hecho'
     and (old.estado is distinct from 'hecho') then
    update public.oportunidades
       set estado = 'cerrada'
     where id = new.oportunidad_id and estado <> 'cerrada';
  end if;
  return new;
end $$;

create trigger trg_cerrar_opp_al_cobrar
  after update on public.hitos_oportunidad
  for each row execute function public.cerrar_opp_al_cobrar();
