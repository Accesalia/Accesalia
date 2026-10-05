-- YA APLICADA el 5-oct-2026 por el MCP. NO volver a ejecutar.
--
-- QUIEN LO TRAE, TERCER TIEMPO (ver 20261005081511). Con el codigo nuevo ya
-- desplegado y ninguna referencia a las columnas viejas en la app, se retiran:
--   * el "solo uno" queda en las tres de verdad: quien_lo_trae (persona de la
--     agenda), quien_comercial_id y quien_persona_comunidad_id;
--   * quien_persona_id y quien_contrata_contacto_id, sin sus enlaces y a
--     zz_muerta_ (una columna muerta no debe seguir siendo un camino hacia
--     persona: la oportunidad tendria dos y la API dudaria cual usar);
--   * contrata_contactos, la version anterior de las personas de contrata, a
--     zz_muerta_: todas sus personas estan en la agenda unica.
-- Las cuatro columnas estaban a 0 filas en las dos tablas.
alter table public.oportunidades drop constraint oportunidad_un_solo_quien_check;
alter table public.oportunidades add constraint oportunidad_un_solo_quien_check check (
  (quien_lo_trae is not null)::int + (quien_comercial_id is not null)::int + (quien_persona_comunidad_id is not null)::int <= 1);
alter table public.administracion_origen drop constraint administracion_origen_un_solo_quien_check;
alter table public.administracion_origen add constraint administracion_origen_un_solo_quien_check check (
  (quien_lo_trae is not null)::int + (quien_comercial_id is not null)::int + (quien_persona_comunidad_id is not null)::int <= 1);

alter table public.oportunidades drop constraint oportunidades_quien_persona_id_fkey;
alter table public.oportunidades drop constraint oportunidades_quien_contrata_contacto_id_fkey;
alter table public.administracion_origen drop constraint administracion_origen_quien_persona_id_fkey;
alter table public.administracion_origen drop constraint administracion_origen_quien_contrata_contacto_id_fkey;
alter table public.oportunidades rename column quien_persona_id to zz_muerta_quien_persona_id;
alter table public.oportunidades rename column quien_contrata_contacto_id to zz_muerta_quien_contrata_contacto_id;
alter table public.administracion_origen rename column quien_persona_id to zz_muerta_quien_persona_id;
alter table public.administracion_origen rename column quien_contrata_contacto_id to zz_muerta_quien_contrata_contacto_id;

alter table public.contrata_contactos rename to zz_muerta_contrata_contactos;
alter table public.contrata_contacto_roles rename to zz_muerta_contrata_contacto_roles;
comment on table public.zz_muerta_contrata_contactos is
  'MUERTA el 5-oct-2026: version anterior de las personas de contrata; todas estan en persona (agenda unica). Respaldo, no se escribe.';
