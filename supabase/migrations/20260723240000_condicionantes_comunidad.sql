-- BRIEF TECNICO de la comunidad: lo que la comunidad DICE QUE QUIERE / los
-- condicionantes de obra (mover contadores, no tocar buzones, suelo porcelanico
-- verde, humedades por condensacion, "ascensor pero 2 escalones que no quieren
-- tocar y sin eso no hay subvencion"...). ORO para el tecnico redactor: lo lee
-- antes de dibujar. Se acumula por comunidad (reutilizable entre proyectos), lo
-- alimenta la captura comercial (item deseo_tecnico) y NUNCA se pierde.
--
-- Distinto de los requerimientos de licencia (manias del ayto): eso es otra cosa.

create table if not exists condicionantes_comunidad (
  id             uuid        primary key default gen_random_uuid(),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  comunidad_id   uuid        not null references comunidades (id) on delete cascade,
  interaccion_id uuid        references interacciones (id) on delete set null,
  texto          text        not null,
  categoria      text,        -- pista libre (deseo | condicionante | consecuencia...), no controlada
  origen         text        not null default 'ia' check (origen in ('ia', 'humano'))
);

comment on table condicionantes_comunidad is
  'Brief tecnico de la comunidad: deseos y condicionantes que la comunidad expresa (via captura comercial). Reutilizable entre proyectos; lo lee el tecnico redactor. Distinto de los requerimientos de licencia.';
comment on column condicionantes_comunidad.categoria is
  'Pista libre no controlada (deseo | condicionante | consecuencia). Descriptiva, no enruta logica.';

drop trigger if exists trg_condicionantes_comunidad_upd on condicionantes_comunidad;
create trigger trg_condicionantes_comunidad_upd before update on condicionantes_comunidad
  for each row execute function set_actualizado_en();

create index if not exists idx_condicionantes_comunidad on condicionantes_comunidad (comunidad_id);
