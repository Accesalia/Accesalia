-- El correo personal tambien viaja con la PERSONA (Monica, 26-sep-2026).
-- `correo` solo admitia tres dueños: empresa, departamento o puesto. Se anade
-- el cuarto, persona, y la regla de dueno UNICO se mantiene: uno y solo uno.
-- Ningun correo tenia etiqueta 'personal', asi que no hubo nada que mover.

alter table correo add column if not exists persona_id uuid references persona(id) on delete cascade;
comment on column correo.persona_id is 'Correo personal: sobrevive al cambio de empresa, a diferencia del del puesto.';

alter table correo drop constraint if exists correo_un_solo_dueno_check;
alter table correo add constraint correo_un_solo_dueno_check check (
  (puesto_id is not null)::int
  + (departamento_id is not null)::int
  + (empresa_id is not null)::int
  + (persona_id is not null)::int = 1
);

create index if not exists correo_persona_idx on correo (persona_id) where persona_id is not null;
