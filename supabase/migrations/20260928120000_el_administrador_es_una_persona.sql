-- EL ADMINISTRADOR ES UNA PERSONA, NO UNA EMPRESA (Monica, 28-sep-2026).
--
-- Sus palabras: "lo que me interesa es saber que PERSONA es la administradora
-- de fincas, no que empresa lo lleva. La empresa es un atributo de la persona,
-- no de la comunidad. Esta al reves."
--
-- En la oportunidad no habia NINGUN sitio donde guardar quien la administra: la
-- pantalla pedia la administracion y solo la usaba para colgar de ella un
-- contacto nuevo. Asi que el dato se perdia.
--
-- Apunta a la persona y no a su puesto a proposito: si cambia de casa sigue
-- siendo la misma administradora, y en que administracion esta hoy se lee de su
-- puesto vigente.

alter table oportunidades
  add column if not exists administrador_persona_id uuid references persona(id);

comment on column oportunidades.administrador_persona_id is
  'La PERSONA que administra la finca. Su administracion de fincas se lee de su puesto vigente.';

create index if not exists oportunidades_administrador_idx
  on oportunidades (administrador_persona_id);
