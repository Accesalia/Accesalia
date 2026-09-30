-- JUBILAR personal_interno. El directorio de personas es `equipo` y solo `equipo`.
--
-- personal_interno era la version de la fase 1 de lo que hoy es `equipo`: 0 filas
-- frente a 35, la referenciaban 3 tablas frente a 26, y las 12 tablas de RRHH ya
-- colgaban de `equipo`. Su propio comentario lo admitia: "se solapa con
-- tecnicos/comerciales; reconciliacion futura".
--
-- Las tres columnas que le apuntaban estaban COMPLETAMENTE VACIAS, asi que no hay
-- un solo dato que mover. Ninguna politica de seguridad la usaba y en el codigo
-- solo aparecia en comentarios.
--
-- Monica: "donde este personal_interno, apuntaria a equipo, y podremos borrar la
-- tabla para que en el futuro no la llame nadie, asi no seguimos duplicando; es
-- como lo de los tipos de proyecto que vivia en tres sitios, evitemoslo".

alter table conocimiento_operativo drop constraint if exists conocimiento_operativo_aportado_por_fkey;
alter table conocimiento_operativo
  add constraint conocimiento_operativo_aportado_por_fkey
  foreign key (aportado_por) references equipo(id) on delete set null;

alter table extracciones_convocatoria drop constraint if exists extracciones_convocatoria_validado_por_fkey;
alter table extracciones_convocatoria
  add constraint extracciones_convocatoria_validado_por_fkey
  foreign key (validado_por) references equipo(id) on delete set null;

alter table uso_llm drop constraint if exists uso_llm_actor_id_fkey;
alter table uso_llm
  add constraint uso_llm_actor_id_fkey
  foreign key (actor_id) references equipo(id) on delete set null;

drop table if exists personal_interno;

comment on column uso_llm.actor_id is
  'Quien provoco la llamada, de `equipo`. Null cuando la lanza un reloj y no una persona.';
