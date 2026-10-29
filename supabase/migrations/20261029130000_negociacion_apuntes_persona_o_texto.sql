-- QUIEN ES QUIEN DESDE LA AGENDA (Monica, 29-oct-2026): el apunte es una persona de la agenda (con nota opcional) o,
-- como antes, un texto. Lo que no puede es ir vacio del todo.
alter table negociacion_apuntes drop constraint negociacion_apuntes_texto;
alter table negociacion_apuntes add constraint negociacion_apuntes_texto check (persona_id is not null or btrim(texto) <> '');
