-- Corrige 20261014340000 (Monica, 14-oct-2026): "el ok es al PAQUETE; los cambios,
-- por BLOQUE". No hay ok por hoja: cada fila es un "modificalo" de un bloque, con
-- su nota. El ok se da al paquete entero (revisiones_oferta.estado = 'ok').
-- (Sin drops: produccion no los deja. Las reglas viejas quedan pero no estorban.)
alter table public.revisiones_oferta_decisiones alter column concepto_hoja_id set not null;
alter table public.revisiones_oferta_decisiones add constraint revisiones_oferta_decisiones_solo_modificar check (decision = 'modificar');
comment on table public.revisiones_oferta_decisiones is
  'Los "modificalo" de quien revisa: uno por bloque (concepto) y envio, con su nota. El ok es al paquete entero (revisiones_oferta.estado = ok) (Monica, 14-oct-2026).';
