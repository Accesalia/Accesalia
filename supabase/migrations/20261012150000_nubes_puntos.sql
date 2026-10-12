-- NUBES DE PUNTOS (Monica, 12-oct-2026): la pantalla operativa del escaneo. Una
-- hoja se firma y se cobra -> entra en la lista. Aqui se apunta cuando se va a
-- escanear (lo que mas limita: quedar con alguien de la comunidad para que abra
-- puertas, patios, sotanos), si se escaneo y cuando quedo la nube lista. Con la
-- nube lista, el trabajo pasa al cronograma de tecnicos y arranca en el dia 0.
create table nubes_puntos (
  id                     uuid primary key default gen_random_uuid(),
  oportunidad_id         uuid not null unique references oportunidades(id) on delete cascade,
  fecha_prevista_escaneo date,
  escaneado_en           date,
  nube_lista_en          date,
  actualizado_por        uuid references equipo(id),
  creado_en              timestamptz not null default now(),
  actualizado_en         timestamptz not null default now()
);
comment on table nubes_puntos is 'El escaneo de cada trabajo firmado y cobrado: fecha prevista, escaneado y nube lista. Con nube lista pasa al cronograma de tecnicos.';
create trigger trg_set_actualizado_en before update on nubes_puntos for each row execute function set_actualizado_en();
alter table nubes_puntos enable row level security;
