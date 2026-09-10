-- =============================================================================
-- CARTERA COMERCIAL — de quién es cada cosa, y desde cuándo
--
-- Hasta ahora el comercial vivía como una columna suelta en `empresa`
-- (comercial_id) y en `proyectos`. Eso responde "de quién es hoy" pero no
-- "de quién era", y la comisión se decide mirando el pasado: a veces cobra el
-- captador, a veces el responsable, a veces se reparte. Sin histórico no se
-- puede decidir.
--
-- DOS NIVELES, porque la realidad tiene dos:
--   - La REGLA vive en la administración de fincas: "Marcal es de Daniel".
--   - La EXCEPCIÓN vive en la dirección concreta: "pero Alhelí 2 la lleva
--     Álvaro, que Daniel se la prestó por saturación".
-- La excepción gana sobre la regla. Por eso una fila lleva una cosa o la otra,
-- nunca las dos (constraint cartera_ambito_ck).
--
-- FECHAS: `desde`/`hasta` con hasta NULL = vigente. Permite preguntar "¿de quién
-- era esto el día que se firmó el encargo?", que es lo que hace falta para las
-- comisiones. Daniel fue el único comercial hasta 2025; Carlos García estuvo de
-- mayo 2025 a mayo 2026 y al irse TODO pasó a Álvaro, que entró en enero 2026.
--
-- Nombre de la columna: `administracion_fincas_id` aunque hoy apunte a la tabla
-- `empresa`. El glosario acordado (docs/glosario-modelo.md) renombra `empresa`
-- a `administracion_fincas`; se le pone ya el nombre bueno para no tener que
-- tocar esta tabla después. Ver el aviso de ese documento: el renombrado está
-- decidido pero NO aplicado.
-- =============================================================================

create table if not exists cartera_comercial (
  id                        uuid        primary key default gen_random_uuid(),
  creado_en                 timestamptz not null default now(),
  actualizado_en            timestamptz not null default now(),

  comercial_id              uuid        not null references comerciales (id),

  -- exactamente uno de los dos: la regla o la excepción
  administracion_fincas_id  uuid        references empresa (id)      on delete cascade,
  comunidad_id              uuid        references comunidades (id)  on delete cascade,

  desde                     date,        -- nulo = desde siempre
  hasta                     date,        -- nulo = vigente hoy
  motivo                    text,
  notas                     text,

  constraint cartera_ambito_ck check (
    (administracion_fincas_id is not null and comunidad_id is null) or
    (comunidad_id is not null and administracion_fincas_id is null)
  ),
  constraint cartera_fechas_ck check (hasta is null or desde is null or hasta >= desde)
);

comment on table cartera_comercial is
  'De quién es cada administración de fincas (la regla) o cada dirección concreta (la excepción), y entre qué fechas. La excepción gana sobre la regla. Con histórico, porque la comisión se decide mirando quién captó y quién llevaba en su momento.';
comment on column cartera_comercial.administracion_fincas_id is
  'La regla: la administración entera es de este comercial. Apunta a `empresa` mientras esa tabla no se renombre a administracion_fincas.';
comment on column cartera_comercial.comunidad_id is
  'La excepción: esta dirección concreta la lleva este comercial aunque su administración sea de otro (el caso de las direcciones que Daniel prestó a Álvaro), o bien no hay administración conocida y la comunidad cuelga directamente del comercial.';
comment on column cartera_comercial.hasta is
  'Nulo = vigente. Se cierra en vez de borrarse: el histórico es lo que permite decidir una comisión.';
comment on column cartera_comercial.motivo is
  'Por qué es suya: alta | por defecto | herencia | cesion_por_saturacion | ...';

create index if not exists idx_cartera_comercial            on cartera_comercial (comercial_id);
create index if not exists idx_cartera_administracion       on cartera_comercial (administracion_fincas_id);
create index if not exists idx_cartera_comunidad            on cartera_comercial (comunidad_id);

-- Una administración (o una dirección) no puede estar viva dos veces a la vez
-- para dos comerciales distintos. Solo se vigila lo VIGENTE; el pasado puede
-- solaparse cuanto haga falta.
create unique index if not exists uq_cartera_admin_vigente
  on cartera_comercial (administracion_fincas_id)
  where administracion_fincas_id is not null and hasta is null;
create unique index if not exists uq_cartera_comunidad_vigente
  on cartera_comercial (comunidad_id)
  where comunidad_id is not null and hasta is null;

alter table cartera_comercial enable row level security;

drop trigger if exists trg_set_actualizado_en on cartera_comercial;
create trigger trg_set_actualizado_en before update on cartera_comercial
  for each row execute function set_actualizado_en();

grant all privileges on table cartera_comercial to service_role;
