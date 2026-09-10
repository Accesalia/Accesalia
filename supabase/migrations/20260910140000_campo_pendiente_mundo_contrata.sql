-- =============================================================================
-- ERP Accesalia — `pendiente`: el comodin interno
--
-- Pedido por Monica el 10-sep-2026, revisando las personas de contrata:
--   "hay forma de marcarlo como pendiente de que Monica concrete o algo asi?"
--   (sobre Victor Esquinas: se fue de FAIN en sept 2025 y esta en otra contrata
--    cuyo nombre hay que mirar en la oficina)
--
-- TEXTO Y NO UNA CASILLA SI/NO, a proposito: una casilla dice que algo falta
-- pero no QUE falta. Vacio = nada pendiente. Con texto = el dato esta a medias
-- y ahi pone que le falta y quien tiene que resolverlo.
--
-- En pantalla alimenta un filtro "lo que tengo a medias", que junta los cabos
-- sueltos de toda el area en un sitio en vez de dejarlos perdidos por fichas.
--
-- Se pone en las tres tablas del mundo contrata porque el cabo suelto puede
-- estar en cualquiera de los tres niveles. Ejemplos reales de hoy:
--   contratas                 -> SACEFA: "a medias con otros dos socios, uno
--                                Oliver y otro por confirmar"
--   contrata_personas         -> "no consta el apellido"
--   contrata_puestos_persona  -> "se fue en sept 2025, falta a que contrata"
--
-- Es un patron a extender al resto de la app, no un apaño de esta area.
-- =============================================================================

alter table contratas                add column if not exists pendiente text;
alter table contrata_personas        add column if not exists pendiente text;
alter table contrata_puestos_persona add column if not exists pendiente text;

comment on column contratas.pendiente is 'Comodin interno: que falta por confirmar de esta contrata. Vacio = nada pendiente. Texto libre a proposito: una casilla si/no diria que algo falta pero no que.';
comment on column contrata_personas.pendiente is 'Comodin interno: que falta por confirmar de esta persona (un apellido, quien es de verdad). Vacio = nada pendiente.';
comment on column contrata_puestos_persona.pendiente is 'Comodin interno: que falta por confirmar de esta etapa (desde cuando, a que empresa se fue). Vacio = nada pendiente.';

-- Para el filtro "lo que tengo a medias": solo indexa las filas que lo tienen.
create index if not exists idx_contratas_pendiente        on contratas (id)                where pendiente is not null;
create index if not exists idx_contrata_personas_pendiente on contrata_personas (id)        where pendiente is not null;
create index if not exists idx_contrata_puestos_pendiente  on contrata_puestos_persona (id) where pendiente is not null;
