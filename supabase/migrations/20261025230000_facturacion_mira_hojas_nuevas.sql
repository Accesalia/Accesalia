-- FACTURACION, PREPARADA PARA LAS HOJAS NUEVAS (Monica, 25-oct-2026). Dos campos, con su ok:
--   1) lineas_facturacion.he_linea_id: a que linea de la hoja NUEVA (he_lineas_compromisos) mira cada ficha de
--      facturacion. La ficha es lo de Alexandra (validada, quien factura, sus hitos y sus dudas) y NO copia nada de la
--      hoja. Las de las hojas antiguas lo reciben el dia de la migracion (cuando la hoja se copie a las tablas nuevas,
--      cada ficha pasa a mirar a su misma linea copiada); las de las hojas del generador nacen ya mirando ahi. Una sola
--      ficha por linea. Una linea añadida a mano por facturacion (la app se la salto) no tiene linea en la hoja: queda
--      vacio, y por eso avisa a direccion.
--   2) he_versiones_hoja.codigos_contrata: los codigos que exige la contrata que paga («Orden», «Pedido»...), con su
--      valor, como un dato fijo mas de la hoja, igual que el pagador. Hoy viven en hojas_encargo.codigos_contrata; pasan
--      con la migracion.
-- Mientras no llegue la migracion, los dos quedan vacios y nada los lee.

alter table public.lineas_facturacion add column he_linea_id uuid references public.he_lineas_compromisos(id);
create unique index lineas_facturacion_he_linea_unica on public.lineas_facturacion (he_linea_id) where he_linea_id is not null and quitada_en is null;
comment on column public.lineas_facturacion.he_linea_id is 'La linea de la hoja nueva (he_lineas_compromisos) a la que mira esta ficha de facturacion. Vacio: linea añadida a mano por facturacion, o de una hoja aun sin migrar.';

alter table public.he_versiones_hoja add column codigos_contrata jsonb not null default '{}'::jsonb;
comment on column public.he_versiones_hoja.codigos_contrata is 'Los codigos que exige la contrata que paga (nombres en contratas.codigos_exigidos) con su valor. Van en una linea a 0 € de cada factura de la hoja.';
