-- =============================================================================
-- ERP Accesalia — Ficha de comunidad: dos huecos que faltaban
--
-- Auditoria de las "FICHA DATOS" reales (secretaria). Todo lo estable de la
-- comunidad ya tenia hueco (nombre, direccion, cp, cif, catastral, anio,
-- administracion, personas) SALVO:
--   1) El numero de cuenta (IBAN) de la comunidad -> para domiciliar/cobrar.
--   2) El DNI/NIE del presidente (y de cualquier persona de la comunidad).
-- El resto de campos de la ficha (tipo de obra, PEM, visado, subvencion,
-- contrata, junta de distrito...) NO son de la comunidad: son del proyecto/obra
-- o de otras areas que cuelgan de ella, y viven en sus propias tablas.
-- =============================================================================

alter table comunidades add column iban text;
comment on column comunidades.iban is 'Numero de cuenta (IBAN) de la comunidad, para domiciliaciones/cobros. Dato estable de la comunidad, no del proyecto.';

alter table personas_comunidad add column documento text;
comment on column personas_comunidad.documento is 'DNI/NIE de la persona (tipico: el del presidente, que firma). Texto libre; no se valida formato.';
