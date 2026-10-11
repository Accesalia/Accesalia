-- QUIEN LE FACTURA A CADA CONTRATA (Monica, 11-oct-2026).
-- "Schindler lo factura Daniel: es increiblemente dificil darse de alta como proveedor en Schindler actualmente."
-- Factusol lo confirma: las 63 facturas a Schindler son de Daniel. Las lineas nuevas con esa contrata de pagador
-- nacen con este emisor. Vacio = no hay regla (Rosersese y Elecnor estan mezclados: se revisan aparte).
alter table public.contratas
  add column emisor_factura text
    constraint contratas_emisor_factura_check
    check (emisor_factura in ('accesalia', 'ecobalance', 'daniel_autonomo'));
comment on column public.contratas.emisor_factura is
  'Quien le factura a esta contrata cuando es la que paga (Monica, 11-oct-2026). Schindler = daniel_autonomo: darse de alta como proveedor en Schindler es dificilisimo. Vacio = sin regla, se decide por linea.';

update public.contratas set emisor_factura = 'daniel_autonomo' where nombre = 'SCHINDLER';

-- Sus lineas de cobro decian accesalia (herencia de la carga): pasan a Daniel.
update public.lineas_facturacion l
   set emisor = 'daniel_autonomo'
  from public.contratas c
 where l.pagador_tipo = 'contrata' and l.pagador_id = c.id and c.nombre = 'SCHINDLER'
   and l.emisor is distinct from 'daniel_autonomo';
