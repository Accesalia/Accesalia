-- =====================================================================
-- LLAMADAS HECHAS
-- Monica, 9-oct-2026, a peticion de Alejandra: "poder clasificarlas como
-- hechas, una vez lo que se supone que se derive de ellas este gestionado,
-- para poder eliminarlas de la lista, y tener asi la lista de llamadas
-- pendientes limpia a medida que todo se haga".
--
-- No se borra: queda marcada como hecha, con quien y cuando, para que haya
-- rastro. La lista visible solo enseña las guardadas (por_colocar) que aun no
-- estan hechas: ni borradores ni descartadas (Monica, 9-oct).
-- =====================================================================

alter table public.llamadas drop constraint llamadas_estado_check;
alter table public.llamadas add constraint llamadas_estado_check
  check (estado in ('abierta', 'por_colocar', 'descartada', 'colocada', 'archivada', 'hecha'));

alter table public.llamadas
  add column hecha_en  timestamptz,
  add column hecha_por uuid references public.equipo(id);

alter table public.llamadas add constraint llamadas_hecha_ck
  check (estado <> 'hecha' or (hecha_en is not null and hecha_por is not null));

comment on column public.llamadas.hecha_en is 'Cuando se marco como hecha: lo que se derivaba de ella ya esta gestionado (9-oct-2026).';
comment on column public.llamadas.hecha_por is 'Quien la marco como hecha.';
