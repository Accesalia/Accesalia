-- =============================================================================
-- ERP Accesalia — vincular el comercial del proyecto a la tabla `comerciales`
--
-- Hasta ahora el comercial del proyecto vivia como TEXTO crudo de Monday
-- (proyectos.comercial_interno: "Daniel de Soto", "Alvaro De Soto",
-- "carlosg.accesalia@gmail.com"). Ese texto no permite "elegir un comercial y ver
-- su cartera": no enlaza con `comerciales` ni con el resto del CRM.
--
-- Se normaliza replicando el MISMO patron que ya usan `administradores` y
-- `administraciones_fincas` (captador vs dueno):
--   · comercial_id           = comercial RESPONSABLE hoy (mutable: se puede reasignar).
--   · comercial_captador_id  = comercial que lo TRAJO (historico, no se machaca).
-- El caso Carlos (ex-comercial): sus proyectos se reasignan cambiando comercial_id,
-- pero comercial_captador_id sigue siendo Carlos -> "quien lo trajo" queda intacto.
--
-- comercial_interno (texto) NO se borra: se conserva como dato crudo de Monday,
-- igual que etapas_proyecto.responsable_nombre ("el string es el dato").
-- =============================================================================

-- ---- 1. Columnas normalizadas (mismas que administradores) ----
alter table proyectos
  add column comercial_id           uuid references comerciales (id),
  add column comercial_captador_id  uuid references comerciales (id);

comment on column proyectos.comercial_id is 'Comercial RESPONSABLE del proyecto hoy (mutable). Por defecto = el captador; se reasigna cuando otro comercial toma el testigo (p. ej. baja de un comercial).';
comment on column proyectos.comercial_captador_id is 'Comercial que TRAJO/vendio el proyecto (historico, no se sobreescribe al reasignar). Deriva de comercial_interno (crudo de Monday) en la migracion inicial.';
comment on column proyectos.comercial_interno is 'Crudo de Monday "0 Comercial interno" (texto original). Se conserva como dato de origen; la verdad normalizada vive en comercial_id / comercial_captador_id.';

create index idx_proyectos_comercial_id          on proyectos (comercial_id);
create index idx_proyectos_comercial_captador_id on proyectos (comercial_captador_id);

-- ---- 2. Backfill: mapear los 3 valores de texto -> comercial (por nombre, no por id) ----
-- Mapeo explicito y cerrado (validado a mano), no heuristica: son 3 valores.
--   "Daniel de Soto"              -> Daniel  / de Soto
--   "Alvaro De Soto"              -> Alvaro  / De Soto
--   "carlosg.accesalia@gmail.com" -> Carlosg
-- Al migrar, captador = responsable (el que lo trajo lo lleva, salvo reasignacion posterior).
update proyectos p
set comercial_id          = c.id,
    comercial_captador_id = c.id
from comerciales c
where p.comercial_id is null
  and (
        (p.comercial_interno = 'Daniel de Soto'              and c.nombre = 'Daniel'  and c.apellidos = 'de Soto') or
        (p.comercial_interno = 'Alvaro De Soto'              and c.nombre = 'Alvaro'  and c.apellidos = 'De Soto') or
        (p.comercial_interno = 'carlosg.accesalia@gmail.com' and c.nombre = 'Carlosg')
      );
