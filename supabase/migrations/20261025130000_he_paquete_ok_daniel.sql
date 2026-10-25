-- EL PAQUETE DEL OK DE DANIEL, ATADO A SU VERSION (Monica, 25-oct-2026). Al «Generar» la hoja va sola al ok de Daniel
-- junto con su presupuesto y la viabilidad vigente (si la hay). Con el ok nacen el codigo HE, el PDF de la hoja y el del
-- presupuesto, y se firman.
alter table public.he_versiones_hoja
  add column papel_html text,
  add column viabilidad_id uuid references public.viabilidades(id),
  add column viabilidad_version integer;
comment on column public.he_versiones_hoja.papel_html is 'El papel de la hoja tal como se genero (el que ve Daniel): con el ok se rehace el PDF con su codigo y se firma.';
comment on column public.he_versiones_hoja.viabilidad_id is 'La viabilidad que fue con esta version al ok de Daniel (la vigente con PDF al generar). Vacio = no habia.';
comment on column public.he_versiones_hoja.viabilidad_version is 'La version de esa viabilidad en ese momento: lo que vio Daniel.';

alter table public.presupuestos
  add column he_version_id uuid references public.he_versiones_hoja(id);
comment on column public.presupuestos.he_version_id is 'La version de la hoja (sistema nuevo) de la que sale este presupuesto: se genera con ella y va con ella al ok de Daniel.';
create index presupuestos_he_version_idx on public.presupuestos (he_version_id);
