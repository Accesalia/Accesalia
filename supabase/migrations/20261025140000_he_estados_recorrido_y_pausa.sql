-- UN SOLO HISTORIAL DE LA HOJA (Monica, 25-oct-2026, acordado con el hilo del «Recorrido de la hoja firmada»).
-- Las hojas nuevas usan he_estados_hoja de principio a fin; movimientos_hoja (hojas viejas) se pasara aqui fila a fila
-- el dia de la migracion.
--   - LA PAUSA ES APARTE (opcion B): he_versiones_hoja.estado guarda solo la FASE (donde esta en su camino). La pausa,
--     su levantamiento y la reanudacion son filas del historial y no tapan la fase: una hoja pausada sigue «a cobro» o
--     «en produccion», y el cobro no se para nunca.
--   - Estados nuevos del recorrido: a_produccion (pasa a produccion ya, sin cobrar, con motivo) es fase; devuelta
--     (facturacion deshace el destino: la fase vuelve a hitos_validados), direccion_comprobada (comprobacion de la
--     secretaria), pausa_levantada y reanudada son filas del historial.
--   - Columnas del recorrido: areas (las que abre, para o reabre: codigos de bloques.area), lado (desde donde se hizo:
--     decide quien levanta una pausa), tejado y condicion (de quien depende la pausa y cuando se reanuda).
alter table public.he_versiones_hoja drop constraint he_versiones_hoja_estado_check;
alter table public.he_versiones_hoja add constraint he_versiones_hoja_estado_check check (estado in (
  'borrador', 'pendiente_ok_daniel', 'cambios_daniel', 'ok_daniel', 'enviada', 'firmada_recibida', 'firma_con_errores',
  'ok_comercial', 'hitos_validados', 'primer_cobro', 'a_produccion', 'ok_administracion',
  'cambios_comunidad', 'cambios_comercial', 'no_firmada', 'anulada', 'sustituida'));
comment on column public.he_versiones_hoja.estado is 'La FASE actual (la ultima fase del historial). La pausa no es una fase: se lee del historial (pausada sin reanudada detras).';

alter table public.he_estados_hoja drop constraint he_estados_hoja_estado_check;
alter table public.he_estados_hoja add constraint he_estados_hoja_estado_check check (estado in (
  'borrador', 'pendiente_ok_daniel', 'cambios_daniel', 'ok_daniel', 'enviada', 'firmada_recibida', 'firma_con_errores',
  'ok_comercial', 'hitos_validados', 'primer_cobro', 'a_produccion', 'ok_administracion',
  'cambios_comunidad', 'cambios_comercial', 'no_firmada', 'anulada', 'sustituida',
  'devuelta', 'direccion_comprobada', 'pausada', 'pausa_levantada', 'reanudada'));

alter table public.he_estados_hoja drop constraint he_estados_hoja_nota_check;
alter table public.he_estados_hoja add constraint he_estados_hoja_nota_check check (
  estado not in ('cambios_daniel', 'cambios_comunidad', 'cambios_comercial', 'no_firmada', 'anulada', 'a_produccion', 'devuelta', 'pausada')
  or coalesce(trim(nota), '') <> '');

alter table public.he_estados_hoja
  add column areas text[],
  add column lado text,
  add column tejado text,
  add column condicion text,
  add constraint he_estados_hoja_lado_check check (lado is null or lado in ('facturacion', 'secretaria', 'app')),
  add constraint he_estados_hoja_tejado_check check (tejado is null or tejado in ('accesalia', 'cliente', 'tercero'));
comment on column public.he_estados_hoja.areas is 'Las areas que abre (metida en produccion), para (pausada) o reabre (reanudada): codigos de bloques.area (PRY, OBR, SUBV, IEE, CAES, FIN, 3PPTOS).';
comment on column public.he_estados_hoja.lado is 'Desde donde se hizo: facturacion, secretaria o la app. En una pausa decide quien la levanta.';
comment on column public.he_estados_hoja.tejado is 'En una pausa: de quien depende (accesalia, cliente, tercero), como en las pausas de la opp.';
comment on column public.he_estados_hoja.condicion is 'En una pausa: cuando se reanuda.';
