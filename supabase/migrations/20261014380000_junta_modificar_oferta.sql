-- LA JUNTA PIDE MODIFICAR LA OFERTA (Monica, 14-oct-2026): un resultado mas de
-- la junta. De ahi sale el bucle: nueva version de la hoja -> ok a la oferta ->
-- enviar -> decision sobre la nueva oferta. (La ejecuta Monica en el editor SQL:
-- produccion no deja quitar la regla vieja desde aqui.)
alter table public.juntas drop constraint juntas_resultado_check;
alter table public.juntas add constraint juntas_resultado_check
  check (resultado = any (array['pendiente', 'favorable', 'desfavorable', 'aplazada', 'piden_mas_presupuestos', 'complicacion', 'modificar_oferta']));
