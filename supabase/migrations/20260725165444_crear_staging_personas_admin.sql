-- =============================================================================
-- Staging de personas de administracion (semilla desde Monday).
--
-- NOTA: esta migracion se aplico DIRECTAMENTE en el proyecto remoto y no tenia
-- fichero en el repo, lo que impedia hacer `supabase db push` (el CLI veia una
-- version en remoto que no existia en local). El SQL se ha recuperado del
-- historial del propio remoto (supabase_migrations.schema_migrations.statements)
-- y se guarda aqui tal cual para dejar el historial consistente en los dos lados.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS staging;

CREATE TABLE staging.personas_admin (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  monday_item_id         text UNIQUE NOT NULL,
  nombre                 text NOT NULL,
  empresa_monday_item_id text,
  empresa_nombre         text,
  telefono               text,
  email                  text,
  cargo                  text,
  revisar                boolean NOT NULL DEFAULT false,
  nota_revision          text,
  creado_en              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE staging.personas_admin IS
  'Semilla temporal desde board Monday 01b Admin - PERSONAS (1800920243). Persona = clave. empresa_monday_item_id apunta a board 01a (1379105405). Tabla de trabajo: se normalizara despues en personas + empresas con relacion.';
