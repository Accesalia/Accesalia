-- VOLCADO DE LAS HOJAS DE DRIVE, paso 1 (Monica, 7-oct-2026):
--
--   1. A CERO hojas de encargo y lineas de facturacion. Las 1.539 hojas de la carga de julio
--      salen de la misma fuente que el manifiesto, peor cargadas; las 1.090 lineas de
--      facturacion eran texto de Monday sin verificar. "No aportan nada que queramos mantener."
--      Copia temporal en docs/copia_hojas_carga_julio_ANTES_DE_BORRAR.xlsx.
--   2. La hoja CUELGA DE LA OPP, no de la comunidad: "deberia elegir la direccion (la opp) y de
--      ahi salir la hoja". La comunidad sale del CIF y muchas veces no se tiene al enviar la
--      hoja: pasa a opcional; la opp, a obligatoria.
--   3. Contador de codigos HE de 2026: la app sigue tras el ultimo del manifiesto (778). 2025
--      esta cerrado: la app solo numera el año en curso. Las 4 hojas que se quedan fuera (sin
--      opp) dejan su hueco en la numeracion.

-- El BORRADO lo ejecuto Monica en el editor SQL de Supabase el 8-oct (la herramienta lo
-- rechazaba); se deja aqui comentado como constancia. Ademas: hitos_cobro (1.699, todos
-- 'pendiente', sin factura ni cobro, de la misma carga de julio).
-- update public.hojas_encargo set version_firmada_id = null where version_firmada_id is not null;
-- delete from public.lineas_facturacion where id is not null;
-- delete from public.hojas_encargo_estado_historial where hoja_encargo_id is not null;
-- delete from public.conceptos_hoja where id is not null;
-- delete from public.actuaciones_hoja where id is not null;
-- delete from public.versiones_hoja where id is not null;
-- delete from public.hojas_encargo where id is not null;

alter table public.hojas_encargo alter column comunidad_id drop not null;
alter table public.hojas_encargo alter column oportunidad_id set not null;

comment on column public.hojas_encargo.comunidad_id is
  'Opcional: la comunidad sale del CIF y muchas veces no se tiene al enviar la hoja. La hoja cuelga de su oportunidad (direccion).';
comment on column public.hojas_encargo.oportunidad_id is
  'Obligatoria: la hoja cuelga de la opp (la direccion), no de la comunidad (Monica, 7-oct-2026).';

insert into public.series_documento (tipo, anio, ultimo) values ('HE', 2026, 778)
on conflict (tipo, anio) do update set ultimo = greatest(series_documento.ultimo, excluded.ultimo);
