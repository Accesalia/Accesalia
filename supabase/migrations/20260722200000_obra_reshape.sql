-- =============================================================================
-- ERP Accesalia — Fase OBRA (capa 1: espina de la obra) — MODELO HIBRIDO
--
-- La fase 1 ya dejo el esqueleto (obras + visitas_obra + incidencias_obra +
-- instrucciones_obra + requerimientos_obra + cierre_obra + fases_obra_catalogo).
-- Aqui se REFORMA `obras` (no se recrea) para las 3 fases de la propietaria y se
-- migra el board 7. Las visitas/actas (el punto critico) y el cierre (memoria de
-- ejecucion, justificacion economica) van en sus propias capas.
--
-- 3 fases: INICIO (contratar CSS + aprobar PSS -> acta de inicio + apertura de
-- centro de trabajo), SEGUIMIENTO (visitas/actas + certificaciones), FIN (CFO que
-- se visa -> visado momento=fin_obra; memoria de ejecucion; justificacion).
-- =============================================================================

-- responsable del proyecto repunta a equipo mas adelante; aqui solo ampliamos obras.
alter table obras
  add column constructora_contrata_id uuid references contratas(id),  -- la contrata que ejecuta
  add column constructora text,                                        -- nombre crudo de Monday
  add column css_contratado boolean not null default false,            -- coordinador S+S contratado
  add column pss_aprobado boolean not null default false,              -- plan de seguridad y salud aprobado
  add column coordinador_css_equipo_id uuid references equipo(id),     -- quien coordina S+S (Marta/Daniel/JL)
  add column coordinador_css_nombre text,                              -- crudo (p.ej. "Externo")
  add column cfo_estado text,                                          -- a_visar | visado | no_procede
  add column fecha_cfo_a_visar date,
  add column fecha_cfo_visado date,
  add column cfo_visado_id uuid references visados(id),                -- el visado (momento=fin_obra) del CFO
  add column notas text;

-- El fin de obra "no procede" es un estado mas (servicios sin obra, cancelaciones).
alter table obras drop constraint if exists obras_estado_check;
alter table obras
  add constraint obras_estado_check
    check (estado in ('pendiente_inicio', 'en_curso', 'paralizada', 'finalizada', 'cancelada', 'no_procede')),
  add constraint obras_cfo_estado_check
    check (cfo_estado is null or cfo_estado in ('a_visar', 'visado', 'no_procede'));

comment on column obras.estado is 'pendiente_inicio -> en_curso (seguimiento) -> finalizada (fin de obra). Overlays: paralizada, cancelada, no_procede.';
comment on column obras.constructora_contrata_id is 'La contrata que ejecuta (ficha en contratas). constructora guarda el nombre crudo si no empata.';
comment on column obras.css_contratado is 'Gate de inicio: coordinador de seguridad y salud contratado.';
comment on column obras.pss_aprobado is 'Gate de inicio: plan de seguridad y salud aprobado. Junto al acta de inicio y la apertura de centro de trabajo, arranca la obra.';
comment on column obras.cfo_estado is 'Certificado final de obra: a_visar (metido a visar) | visado (CFO visado descargado) | no_procede. El CFO se visa -> genera un visado momento=fin_obra (cfo_visado_id).';

create index idx_obras_constructora_contrata on obras(constructora_contrata_id);
create index idx_obras_cfo_visado on obras(cfo_visado_id);
create index idx_obras_fecha_fin_obra on obras(fecha_fin_obra);
