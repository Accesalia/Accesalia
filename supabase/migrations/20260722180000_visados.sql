-- =============================================================================
-- ERP Accesalia — Fase VISADO (colegio COAM)
--
-- Su propia habitacion (no un sub-paso de licencia). Un proyecto "listo para
-- visar" abre un visado. Realidad del dominio (propietaria 2026-07-22):
--   · Se visa el PROYECTO y el FIN DE OBRA (RQ rarisimo en fin de obra) -> `momento`.
--   · Un mismo proyecto se puede visar MAS DE UNA VEZ (re-visados encarecen) -> 1:N.
--   · Visado NORMAL (~5 dias) o URGENTE (48h laborables, tasa mayor) -> `tipo`.
--   · Conlleva TASA; lo critico aqui es economico (coste, re-visar encarece).
--   · Codigo TL (nuestro id del visado) y PDF de proyecto visado (doc maestro que
--     se sigue hasta que, por ayuntamiento, pidan cambios al pedir licencia).
--   · Tras descargar el PDF, se envia a quien pago.
-- Se guardan HECHOS; las metricas (coste total, nº re-visados) se calculan al vuelo.
-- Los requerimientos del COAM reutilizan requerimientos_tramitacion (origen='coam').
-- =============================================================================

create table visados (
  id uuid primary key default gen_random_uuid(),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  proyecto_id uuid not null references proyectos(id) on delete cascade,
  momento text not null default 'proyecto',              -- proyecto | fin_obra
  tipo text,                                              -- normal | urgente
  estado text not null default 'pendiente_enviar',       -- ciclo lineal (ver check)
  organismo text not null default 'COAM',                -- normalmente COAM, a veces otro colegio
  referencia text,                                        -- codigo TL/XXXXXX/AAAA
  tasa numeric(10, 2),                                    -- coste del visado (€). Re-visar acumula.
  pagado boolean not null default false,                  -- tasa del colegio pagada
  fecha_envio date,                                       -- presentado al COAM
  fecha_visado date,                                      -- concedido
  fecha_descarga date,                                    -- descarga del PDF de proyecto visado
  entregado_al_pagador boolean not null default false,    -- el PDF visado enviado a quien pago
  pdf_documento_id uuid,                                  -- ref al PDF en Storage (sprint documental)
  tramita_equipo_id uuid references equipo(id),           -- normalmente Adriana
  pausado boolean not null default false,                 -- overlay (p.ej. parado hasta ECU)
  notas text,
  constraint visados_momento_check check (momento in ('proyecto', 'fin_obra')),
  constraint visados_tipo_check check (tipo is null or tipo in ('normal', 'urgente')),
  constraint visados_estado_check check (estado in ('pendiente_enviar', 'enviado', 'requerido', 'visado'))
);
comment on table visados is 'Visados del colegio (COAM). 1 proyecto -> N visados (re-visados + fin de obra). Guarda hechos: codigo TL, tasa, fechas, PDF maestro. Metricas (coste total, nº re-visados) al vuelo.';
comment on column visados.momento is 'Que se visa: proyecto | fin_obra. El RQ en fin_obra es rarisimo.';
comment on column visados.tipo is 'normal (~5 dias) | urgente (48h laborables, tasa mayor). Plazos estandar en tiempos_estandar (contexto=visado).';
comment on column visados.estado is 'Ciclo: pendiente_enviar -> enviado -> (requerido <-> subsanar) -> visado. La pausa (p.ej. parado hasta ECU) es overlay (pausado).';
comment on column visados.referencia is 'Codigo TL del colegio (TL/XXXXXX/AAAA): nuestro identificador de ESE proyecto visado.';
comment on column visados.tasa is 'Coste del visado en €. Dato manual (no se hardcodea); re-visar acumula coste.';

create index idx_visados_proyecto on visados(proyecto_id);
create index idx_visados_tramita on visados(tramita_equipo_id);

create trigger trg_set_actualizado_en before update on visados for each row execute function set_actualizado_en();
alter table visados enable row level security;

-- Plazos estandar del visado (dias laborables) -> pre-rellenar fecha prevista.
insert into tiempos_estandar (contexto, clave, dias, descripcion) values
  ('visado', 'normal',  5, 'Visado normal COAM (~5 dias)'),
  ('visado', 'urgente', 2, 'Visado urgente COAM (48h laborables, tasa mayor)')
on conflict (contexto, clave) do nothing;
