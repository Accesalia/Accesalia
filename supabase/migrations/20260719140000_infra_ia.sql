-- =============================================================================
-- ERP Accesalia — Infraestructura transversal de IA (capa 2)
--
-- Dos tablas que usan TODAS las edges de IA (las escribe el modulo _shared,
-- best-effort, igual que uso_llm en las apps moviles):
--   - uso_llm: contabilidad de tokens por llamada (coste por edge/actor/modelo).
--   - bitacora_ia: registro de cada accion con efectos, sustrato del "deshacer
--     sin dramas". Codigo + params (no prosa); la frase la compone el front.
--
-- No son de subvenciones: son transversales al ERP. Se crean ahora porque la
-- edge de convocatorias (prompts 1 y 2) ya las necesita.
--
-- Convenciones: espanol sin tildes/enes; PK uuid; SIN ENUMS (text + CHECK);
-- RLS sin politicas. NOTA: estas tablas se escriben SOLO desde el backend
-- (service role); no llevan trigger de actualizado_en porque son append-only
-- (bitacora) o inmutables (uso_llm) -> no tienen columna actualizado_en.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- uso_llm — contabilidad de tokens por llamada al LLM
-- Inmutable (una fila por llamada); solo creado_en.
-- -----------------------------------------------------------------------------
create table uso_llm (
  id                      uuid        primary key default gen_random_uuid(),
  creado_en               timestamptz not null default now(),
  origen                  text,
  proveedor               text,
  modelo                  text,
  nivel                   text,
  actor_id                uuid        references personal_interno (id),
  input_tokens            integer     not null default 0,
  output_tokens           integer     not null default 0,
  cache_creacion_tokens   integer     not null default 0,
  cache_lectura_tokens    integer     not null default 0,
  constraint uso_llm_proveedor_check
    check (proveedor in ('anthropic','mistral')),
  constraint uso_llm_nivel_check
    check (nivel in ('alto','base'))
);

comment on table uso_llm is 'Contabilidad de tokens por llamada al LLM (coste por edge/actor/modelo). La escribe _shared best-effort: un fallo aqui NUNCA tumba la llamada. Inmutable.';
comment on column uso_llm.origen is 'Edge que origino la llamada (ej. extraer-convocatoria).';
comment on column uso_llm.proveedor is 'anthropic (nivel alto, Claude) | mistral (nivel base).';
comment on column uso_llm.nivel is 'alto (fiabilidad, Claude Opus) | base (economico, Mistral).';
comment on column uso_llm.actor_id is 'Quien disparo la llamada (personal_interno hoy; auth el dia de manana). Nullable.';
comment on column uso_llm.input_tokens is 'Tokens de entrada NO cacheados (Anthropic: input_tokens; Mistral: prompt - cacheados).';
comment on column uso_llm.cache_creacion_tokens is 'Tokens escritos a cache (Anthropic cache write; Mistral 0).';
comment on column uso_llm.cache_lectura_tokens is 'Tokens servidos de cache (baratos).';

create index idx_uso_llm_origen    on uso_llm (origen);
create index idx_uso_llm_creado_en on uso_llm (creado_en);
create index idx_uso_llm_actor_id  on uso_llm (actor_id);


-- -----------------------------------------------------------------------------
-- bitacora_ia — registro de acciones con efectos (sustrato del undo)
-- Append-only. Codigo + params, no prosa. datos jsonb DEBE llevar el texto
-- exacto para poder deshacer despues (analogo al array_remove del movil).
-- -----------------------------------------------------------------------------
create table bitacora_ia (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actor_tipo      text        not null default 'ia',
  actor_id        uuid,
  operacion       text,
  tipo            text        not null,
  target_tabla    text,
  target_id       uuid,
  datos           jsonb       not null default '{}'::jsonb,
  deshecho        boolean     not null default false,
  fecha_deshecho  timestamptz,
  constraint bitacora_ia_actor_tipo_check
    check (actor_tipo in ('ia','humano','sistema'))
);

comment on table bitacora_ia is 'Registro de cada accion con efectos (IA o humano), sustrato del "deshacer sin dramas". Codigo+params, no prosa: la frase para la usuaria la compone el front desde tipo+datos. La escribe _shared best-effort. Append-only.';
comment on column bitacora_ia.actor_tipo is 'Quien ejecuto: ia | humano | sistema.';
comment on column bitacora_ia.actor_id is 'Id del actor (personal_interno hoy; auth.users el dia de manana). Sin FK dura para no acoplar a auth.';
comment on column bitacora_ia.operacion is 'Contexto para agrupar/deshacer un lote (ej. "extraccion_convocatoria:<uuid>").';
comment on column bitacora_ia.tipo is 'Codigo del evento (ej. extraccion_generada, requisito_editado, casilla_add). El front lo traduce a frase.';
comment on column bitacora_ia.datos is 'Params + el TEXTO EXACTO afectado (clave para deshacer despues).';
comment on column bitacora_ia.deshecho is 'true si esta accion fue revertida.';

create index idx_bitacora_ia_operacion  on bitacora_ia (operacion);
create index idx_bitacora_ia_target     on bitacora_ia (target_tabla, target_id);
create index idx_bitacora_ia_creado_en  on bitacora_ia (creado_en);
create index idx_bitacora_ia_pendientes on bitacora_ia (creado_en) where deshecho = false;


-- -----------------------------------------------------------------------------
-- RLS (habilitado sin politicas; se escriben solo con service role)
-- -----------------------------------------------------------------------------
alter table uso_llm     enable row level security;
alter table bitacora_ia enable row level security;
