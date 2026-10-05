-- YA APLICADA el 5-oct-2026 por el MCP. NO volver a ejecutar.
--
-- QUIEN LO TRAE, PRIMER TIEMPO (de tres). Monica, 5-oct-2026.
--
-- El 4-oct nacio oportunidades.quien_lo_trae (-> persona), pensado para sustituir
-- a los quien_*. Pero "los cuatro quien no son lo mismo": comercial nuestro,
-- persona de la agenda, contacto de contrata y vecino. Queda asi:
--   persona de la agenda -> quien_lo_trae
--   comercial            -> quien_comercial_id        (no esta en la agenda)
--   vecino               -> quien_persona_comunidad_id (cuelga de su comunidad)
--   contacto de contrata -> desaparece: desde hoy son personas de la agenda.
-- Y lo mismo en administracion_origen, que tiene las mismas cuatro columnas y la
-- misma funcion de alta: una sola regla para lo mismo.
--
-- LOS TRES TIEMPOS, para no romper la app desplegada:
--   1. (esto) la columna nueva en administracion_origen, y los dos "solo uno"
--      cuentan las CINCO columnas mientras dure la transicion;
--   2. push del codigo, que ya escribe y lee quien_lo_trae;
--   3. con el despliegue arriba: quien_persona_id y quien_contrata_contacto_id a
--      zz_muerta_, y el "solo uno" queda en tres.
-- Las dos tablas estaban a CERO en las cinco columnas: no hay nada que migrar.
alter table public.administracion_origen add column quien_lo_trae uuid references public.persona(id);
comment on column public.administracion_origen.quien_lo_trae is
  'La persona de la agenda que nos trajo esta administracion. Igual que oportunidades.quien_lo_trae.';
create index administracion_origen_por_quien_lo_trae on public.administracion_origen (quien_lo_trae)
  where quien_lo_trae is not null;

alter table public.oportunidades drop constraint oportunidad_un_solo_quien_check;
alter table public.oportunidades add constraint oportunidad_un_solo_quien_check check (
  (quien_lo_trae is not null)::int + (quien_comercial_id is not null)::int + (quien_persona_comunidad_id is not null)::int
  + (quien_persona_id is not null)::int + (quien_contrata_contacto_id is not null)::int <= 1);

alter table public.administracion_origen drop constraint administracion_origen_un_solo_quien_check;
alter table public.administracion_origen add constraint administracion_origen_un_solo_quien_check check (
  (quien_lo_trae is not null)::int + (quien_comercial_id is not null)::int + (quien_persona_comunidad_id is not null)::int
  + (quien_persona_id is not null)::int + (quien_contrata_contacto_id is not null)::int <= 1);
