-- =============================================================================
-- ERP Accesalia — contratas: cif + direccion + razon_social (auditoria Monday 00a)
--
-- El board "00a EMPRESAS COLABORADORAS" trae CIF (88/153), DIRECCION (90/153) y
-- RAZON SOCIAL (87/153) que hoy no tienen hueco en `contratas` (solo `nombre`).
-- Mismos 3 campos que ya existen en comunidades/administraciones -> coherente.
-- =============================================================================

alter table contratas add column cif text;
alter table contratas add column direccion text;
alter table contratas add column razon_social text;

comment on column contratas.cif is 'CIF de la contrata (Monday 00a).';
comment on column contratas.direccion is 'Direccion postal de la contrata (Monday 00a).';
comment on column contratas.razon_social is 'Razon social/legal; `nombre` es el nombre comercial de uso.';
