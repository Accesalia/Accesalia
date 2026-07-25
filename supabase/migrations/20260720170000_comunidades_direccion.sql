-- =============================================================================
-- ERP Accesalia — Comunidades: identidad por direccion + enlace a administracion
--
-- La comunidad (inmueble) es el EJE de la app: su identidad es la direccion postal
-- (calle-numero-localidad). Ajustes para importar desde Monday (0 LISTADO DE
-- DIRECCIONES) y para el futuro:
--   - cp, provincia (Monday los trae; no los teniamos).
--   - administracion_id -> administraciones_fincas (empresa): en Monday el inmueble
--     enlaza a la EMPRESA. La persona (administrador_id) pasa a OPCIONAL y se
--     completara donde se conozca (diseno para el futuro).
--
-- Convenciones: espanol sin tildes/enes; indices en FKs.
-- =============================================================================

alter table comunidades
  add column cp                text,
  add column provincia         text,
  add column administracion_id uuid references administraciones_fincas (id);

-- La persona gestora deja de ser obligatoria: el enlace principal es la empresa.
alter table comunidades alter column administrador_id drop not null;

create index idx_comunidades_administracion_id on comunidades (administracion_id);

comment on column comunidades.nombre is 'Identidad del inmueble: direccion postal calle-numero-localidad (ej. "Mayor 5 Alcorcon"). Convencion no estandarizada (se omite "calle"; paseo/avenida/plaza/travesia si). En Monday es la columna "Name" (mal etiquetada como nombre).';
comment on column comunidades.direccion is 'Direccion completa geocodificada (Monday "Ubicacion"). Complementa a nombre.';
comment on column comunidades.cp is 'Codigo postal (Monday "CP").';
comment on column comunidades.provincia is 'Provincia (Monday "PROVINCIA").';
comment on column comunidades.administracion_id is 'Administracion de fincas (EMPRESA) que gestiona el inmueble. FK a administraciones_fincas. Enlace principal admin<->inmueble.';
comment on column comunidades.administrador_id is 'Persona gestora concreta (OPCIONAL; antes obligatorio). El enlace principal es administracion_id; la persona se completa donde se conoce.';
