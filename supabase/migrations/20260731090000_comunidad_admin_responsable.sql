-- =============================================================================
-- ERP Accesalia — COMUNIDAD_ADMIN_RESPONSABLE
--
-- Quien administra cada comunidad. Se llama asi, con las tres palabras, porque
-- "responsable" a secas no dice de que: aqui la responsabilidad es la de
-- administrador de fincas, no la del tecnico ni la del comercial.
--
-- Por que una tabla y no una columna en comunidades: una columna solo guarda
-- al actual. Y el historico no se puede perder — ya hay 14 comunidades que
-- cambiaron de administracion y saber quien la llevaba antes es informacion
-- comercial de primera.
--
-- Apunta al PUESTO, no a la empresa: asi "quien la lleva" y "a quien escribo"
-- son el mismo dato y no pueden contradecirse. Cuando sabemos la casa pero
-- todavia no la persona, apunta a la empresa. Uno de los dos, nunca los dos.
--
-- Sin fila vigente = comunidad autogestionada. No hace falta ni estado ni
-- tabla aparte: la ausencia ya lo dice.
--
-- Sobre "vigente": lo normal seria deducirlo de hasta is null, pero casi
-- ningun cambio de administracion trae fecha. Sabemos que Zoe Asesores dejo de
-- llevar Rio Guadalquivir; no cuando. Con solo "hasta" habria que inventarse
-- una fecha o dejar dos filas pareciendo vigentes a la vez. Asi que "hasta"
-- dice CUANDO y "vigente" dice SI, y un CHECK impide que se contradigan.
--
-- Convenciones: espanol sin tildes/enes; CHECK con nombre (nunca enum); RLS sin
-- politicas; trigger set_actualizado_en.
-- =============================================================================

create table comunidad_admin_responsable (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),

  comunidad_id    uuid        not null references comunidades(id) on delete cascade,

  -- uno de los dos, nunca los dos
  puesto_id       uuid        references puesto(id)  on delete restrict,
  empresa_id      uuid        references empresa(id) on delete restrict,

  vigente         boolean     not null default true,
  desde           date,
  hasta           date,
  notas           text,

  constraint car_uno_u_otro_check check (
    (puesto_id is not null)::int + (empresa_id is not null)::int = 1),
  constraint car_fechas_check check (hasta is null or desde is null or hasta >= desde),
  -- si tiene fecha de fin, no puede seguir siendo la vigente
  constraint car_vigente_sin_hasta_check check (not (vigente and hasta is not null))
);

comment on table comunidad_admin_responsable is 'Quien administra cada comunidad, ahora y antes. Es el hilo que une comunidad, empresa y persona en los dos sentidos.';
comment on column comunidad_admin_responsable.puesto_id is 'La persona concreta, en su empresa. Es lo normal: la cartera es de una persona, no de un departamento.';
comment on column comunidad_admin_responsable.empresa_id is 'Solo cuando sabemos la casa pero aun no quien la lleva dentro. Al averiguarlo, se cierra esta fila y se abre una de puesto: asi queda registrado cuando lo supimos.';
comment on column comunidad_admin_responsable.vigente is 'La que manda hoy. Falso = ya no, aunque no sepamos la fecha exacta: casi ningun cambio de administracion viene fechado.';
comment on column comunidad_admin_responsable.hasta is 'Cuando dejo de llevarla, si se sabe. Puede estar vacio en una fila no vigente.';

-- una sola administracion vigente por comunidad: es la regla que impide que
-- dos filas se contradigan. Sin fila vigente = comunidad autogestionada.
create unique index comunidad_admin_responsable_vigente_idx
  on comunidad_admin_responsable (comunidad_id) where vigente;

create index comunidad_admin_responsable_comunidad_idx on comunidad_admin_responsable (comunidad_id);
create index comunidad_admin_responsable_puesto_idx    on comunidad_admin_responsable (puesto_id);
create index comunidad_admin_responsable_empresa_idx   on comunidad_admin_responsable (empresa_id);

alter table comunidad_admin_responsable enable row level security;

drop trigger if exists trg_set_actualizado_en on public.comunidad_admin_responsable;
create trigger trg_set_actualizado_en before update on public.comunidad_admin_responsable
  for each row execute function set_actualizado_en();
