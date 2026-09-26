-- El telefono personal es de la PERSONA, no del puesto (Monica, 26-sep-2026).
-- El puesto es el cargo en UNA empresa: si se va a otra administracion, su
-- movil tiene que seguirla. El de trabajo si se queda en el puesto.
-- Los 412 puestos lo tenian vacio, asi que no hubo nada que migrar.

alter table persona add column if not exists telefono_personal text;
comment on column persona.telefono_personal is 'Su movil, el que no cambia aunque cambie de empresa.';

alter table puesto drop column if exists telefono_personal;
comment on column puesto.telefono_empresa is 'El telefono de ESTE puesto: se queda en la empresa cuando la persona se va.';
