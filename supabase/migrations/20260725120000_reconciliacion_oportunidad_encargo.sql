-- =============================================================================
-- ERP Accesalia — Reconciliacion: OPORTUNIDAD = ENCARGO (modelo definitivo)
--
-- Glosario cerrado: comunidad -> OPORTUNIDAD (proceso comercial, reactivable) ->
-- HOJA(S) DE ENCARGO -> ITEMS. Los 3 documentos (viabilidad, hojas, presupuesto)
-- cuelgan de la OPORTUNIDAD. Sobra `carpetas_comerciales` (duplicaba la
-- oportunidad) y no hace falta `proceso_venta`.
--
-- ADITIVA y NO ROMPE nada: aqui solo se AÑADE oportunidad_id a viabilidades/hojas
-- y los campos de "aplazado/latente con condicion". `carpetas_comerciales` y
-- `carpeta_id` se ELIMINAN en una migracion de limpieza posterior, cuando el
-- frontend ya no los use (asi el cockpit sigue vivo durante la transicion).
--
-- Convenciones: espanol sin tildes/enes; indices en FKs.
-- =============================================================================

-- ---- 1. Viabilidad cuelga de la OPORTUNIDAD (1 por oportunidad) ----
alter table viabilidades
  add column if not exists oportunidad_id uuid references oportunidades (id);
create index if not exists idx_viabilidades_oportunidad on viabilidades (oportunidad_id);
comment on column viabilidades.oportunidad_id is 'La oportunidad (proceso comercial) a la que pertenece la viabilidad. Sustituye a carpeta_id (que se elimina en la limpieza).';

-- ---- 2. Hoja de encargo cuelga de la OPORTUNIDAD (1..n por oportunidad) ----
alter table hojas_encargo
  add column if not exists oportunidad_id uuid references oportunidades (id);
create index if not exists idx_hojas_encargo_oportunidad on hojas_encargo (oportunidad_id);
comment on column hojas_encargo.oportunidad_id is 'La oportunidad (proceso comercial) que agrupa esta hoja. Una oportunidad tiene 1..n hojas (subvencion siempre en la suya). Sustituye a carpeta_id.';

-- ---- 3. Cierre APLAZADO: oportunidad latente con condicion de reactivacion ----
-- (estado activa/latente ya existe en oportunidades). Aqui el "cuando volver".
alter table oportunidades
  add column if not exists reactivar_nota             text,
  add column if not exists reactivar_fecha            date,
  add column if not exists reactivar_convocatoria_criterio text;
comment on column oportunidades.reactivar_nota is 'Cierre aplazado: por que/cuando retomar ("cuando hagan hucha", "cuando resuelvan el juicio del local"). Sali lo extrae de la nota de voz.';
comment on column oportunidades.reactivar_fecha is 'Cierre aplazado con fecha: dispara alerta determinista (motor parametros_alerta) al llegar.';
comment on column oportunidades.reactivar_convocatoria_criterio is 'Cierre aplazado ligado a subvencion: criterio de convocatoria que se espera (ej. "accesibilidad Comunidad de Madrid"). Al abrirse una convocatoria que encaje (modulo subvenciones), salta la alerta de reactivacion.';

create index if not exists idx_oportunidades_reactivar_fecha on oportunidades (reactivar_fecha) where reactivar_fecha is not null;
