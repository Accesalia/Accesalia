-- RESUMEN IA por FASE del expediente (modelo Ordelia).
--
-- Un texto compacto escrito POR la IA (para la IA y para humanos) que dice en que
-- punto esta cada fase del encargo. DOBLE USO:
--   1) CONTEXTO: en el fuzzy previo se sube al prompt para que la IA decida bien
--      (desambiguar, enlazar vs crear, detectar contradicciones) SIN cotejar a ciegas.
--   2) PONERSE AL DIA: el humano lo lee de un vistazo ("¿por donde iba esto?"),
--      cosa que hace falta muy a menudo.
--
-- PRINCIPIO: el RESUMEN guarda lo que EVOLUCIONA (precio negociado, tipo, estado de
-- la negociacion); los DATOS_ESTABLES guardan lo historico/que no varia (admin,
-- contrata, direccion, idas y venidas) en crudo. Se REESCRIBE en cada iteracion.

create table if not exists resumenes_ia (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  comunidad_id uuid not null references comunidades(id) on delete cascade,
  fase text not null check (fase in (
    'comercial', 'proyecto', 'visado', 'licencia', 'obra', 'facturacion', 'subvenciones', 'global'
  )),
  texto text not null default '',
  datos_estables jsonb,            -- crudo estable/historico (admin, contrata, direccion...) que la IA conserva
  generado_por text not null default 'ia',
  unique (comunidad_id, fase)
);

comment on table resumenes_ia is
  'Resumen IA por fase del expediente (modelo Ordelia). Contexto para la IA + "ponerse al dia" para el humano. resumen=lo que evoluciona; datos_estables=lo historico/estable.';

drop trigger if exists trg_resumenes_ia_upd on resumenes_ia;
create trigger trg_resumenes_ia_upd before update on resumenes_ia
  for each row execute function set_actualizado_en();

create index if not exists idx_resumenes_ia_comunidad on resumenes_ia(comunidad_id);
