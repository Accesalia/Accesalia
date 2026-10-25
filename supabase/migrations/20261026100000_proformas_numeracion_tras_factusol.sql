-- LA NUMERACION DE LAS PROFORMAS, DESPUES DEL ULTIMO PEDIDO DE FACTUSOL (Monica, 25-oct-2026). La proforma de la app ES
-- el pedido de Factusol con el mismo numero (serie 1). Mientras Alexandra siga haciendo pedidos directamente en
-- Factusol, la app no puede volver a dar un numero que alli ya esta usado (el 25-oct: la proforma 38 de la app chocaba
-- con el pedido 38 de Factusol). Asi que el siguiente numero es el mayor de los dos: el de las proformas de la app y el
-- de los pedidos de Factusol de esa empresa y año (factusol_pedidos, lo que copia la pasada de cada noche), mas uno.
-- Si un pedido se hace en Factusol despues de la ultima lectura, la comprobacion de «Enviar a Factusol» lo para.

create or replace function public.proformas_numerar() returns trigger language plpgsql as $$
declare pre text; en_app int; en_factusol int;
begin
  new.anio := extract(year from new.fecha);
  new.mes := extract(month from new.fecha);
  perform pg_advisory_xact_lock(hashtext('proforma:' || new.empresa || ':' || new.anio));
  select coalesce(max(numero), 0) into en_app from public.proformas where empresa = new.empresa and anio = new.anio;
  select coalesce(max(numero), 0) into en_factusol from public.factusol_pedidos where empresa = new.empresa and anio = new.anio and serie = 1;
  new.numero := greatest(en_app, en_factusol) + 1;
  select prefijo_proforma into pre from public.empresas_emisoras where clave = new.empresa;
  new.codigo := pre || '-PF-' || lpad((new.anio % 100)::text, 2, '0') || '-' || lpad(new.numero::text, 4, '0');
  return new;
end $$;
