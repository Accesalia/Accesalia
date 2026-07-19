-- =============================================================================
-- ERP Accesalia — Bocado 1 (capa de datos): extractor y modelador de plantillas
-- de convocatoria. Prompts 1 (convocatoria -> requisitos y docs) y 2 (docs ->
-- casillas). Prompt 3 (revision de doc real por comunidad) es FUTURO.
--
-- Esta migracion NO construye la app ni la edge: solo el ESQUEMA de datos donde
-- aterriza la extraccion de la IA y su validacion humana. Reutiliza el modelo de
-- subvenciones (convocatorias, requisitos_convocatoria, tipos_documento) y lo
-- amplia con lo que faltaba.
--
-- Convenciones: espanol sin tildes/enes; PK uuid; creado_en/actualizado_en;
-- SIN ENUMS (text + CHECK nombrado); RLS sin politicas; trigger actualizado_en.
-- La estructura_completitud (variable: partes, cardinalidad, alternativas) se
-- guarda como discriminador text + CHECK + detalle jsonb (decision deliberada:
-- es una config flexible que produce la IA; una tabla relacional seria
-- sobreingenieria en este punto).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. personal_interno — tabla unificada de personal de Accesalia
--    Necesaria para conocimiento_operativo (aportado_por) y como base para la
--    futura auth/RLS. NOTA: se solapa con tecnicos (Fase 3) y comerciales (fase
--    comercial); reconciliar mas adelante (una persona podria estar en varias).
--    No se fuerza esa unificacion ahora.
-- -----------------------------------------------------------------------------
create table personal_interno (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  nombre          text        not null,
  apellidos       text,
  rol             text        not null,
  area            text,
  email           text,
  telefono        text,
  activo          boolean     not null default true,
  constraint personal_interno_rol_check
    check (rol in ('arquitecto','arquitecto_tecnico','delineante','administrativo','comercial','direccion','otro')),
  constraint personal_interno_area_check
    check (area in ('subvenciones','comercial','obra','tramitacion','requerimientos','administracion','direccion','general','otro'))
);

comment on table personal_interno is 'Personal interno de Accesalia (base para auth/RLS y para atribuir conocimiento_operativo). Se solapa con tecnicos/comerciales; reconciliacion futura.';
comment on column personal_interno.area is 'Area principal de la persona. De ella se INFIERE el area de sus aportes en conocimiento_operativo (no se pide el area al escribir un tip).';

create index idx_personal_interno_activo on personal_interno (activo) where activo = true;


-- -----------------------------------------------------------------------------
-- 2. conocimiento_operativo — recipiente de tips transversales del dia a dia
--    Solo recogerlo ahora; su consumo por la IA es posterior. El area se infiere
--    de personal_interno.area de quien lo aporta (no se guarda columna area).
-- -----------------------------------------------------------------------------
create table conocimiento_operativo (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  aportado_por    uuid        references personal_interno (id),
  conocimiento    text        not null,
  vigente         boolean     not null default true
);

comment on table conocimiento_operativo is 'Tips/excepciones operativas del dia a dia que aplican a cualquier area (ej. "en requerimientos de Leganes de la tecnica Maria Fernanda, no poner Tramex, lo echa para atras"). Texto libre integro; lo primero es RECOGERLO. Consumo por la IA (familia de prompts 3, y otras areas) es futuro. Solo app interna.';
comment on column conocimiento_operativo.aportado_por is 'Quien aporta el tip (personal_interno). Su area determina el area del tip.';
comment on column conocimiento_operativo.conocimiento is 'El tip en texto libre integro, tal cual.';
comment on column conocimiento_operativo.vigente is 'Un tip puede caducar (cambia la tecnica, la normativa); marcar sin borrar historico.';

create index idx_conocimiento_operativo_aportado_por on conocimiento_operativo (aportado_por);
create index idx_conocimiento_operativo_vigente      on conocimiento_operativo (creado_en) where vigente = true;


-- -----------------------------------------------------------------------------
-- 3. Ampliar tipos_documento (catalogo maestro) con:
--    - conocimiento_experto: criterios de revision codificados (saber de Accesalia).
--    - estructura_completitud POR DEFECTO (tipo + detalle), que la IA hereda al
--      casar un documento y puede sobreescribir por convocatoria (ver 4).
-- -----------------------------------------------------------------------------
alter table tipos_documento
  add column conocimiento_experto   text,
  add column tipo_completitud       text default 'simple',
  add column completitud_detalle    jsonb;

alter table tipos_documento
  add constraint tipos_documento_tipo_completitud_check
    check (tipo_completitud in ('simple','partes','multiple','alternativa'));

comment on column tipos_documento.conocimiento_experto is 'Conocimiento experto / criterios de revision de Accesalia para este tipo de documento (texto libre rico). Ej. IEE: firma electronica del arquitecto emisor y la comunidad; coherencia SATE/ZETU -> accesibilidad resuelta; mejora estimada no supere 3x la cuota habitual. Lo consultan los prompts (sobre todo la familia 3). Crece con el tiempo; NO se incrusta en el texto de los prompts.';
comment on column tipos_documento.tipo_completitud is 'Como se considera completo por defecto: simple (un fichero) | partes (DNI = anverso+reverso) | multiple (N del mismo tipo, ej. 3 presupuestos) | alternativa (uno u otro). La IA lo hereda al casar; sobreescribible por convocatoria.';
comment on column tipos_documento.completitud_detalle is 'Detalle jsonb de la estructura por defecto: {partes:[...]}, {cardinalidad:N}, {alternativas:[...]}, {agrupado_con:...}. Segun tipo_completitud.';


-- -----------------------------------------------------------------------------
-- 4. Ampliar requisitos_convocatoria (cruce convocatoria <-> tipo_documento) con:
--    - categoria, texto_literal_extraido (trazabilidad), notas_extraccion (auditoria IA).
--    - override de la estructura_completitud (null = hereda del catalogo).
-- -----------------------------------------------------------------------------
alter table requisitos_convocatoria
  add column categoria              text,
  add column texto_literal_extraido text,
  add column tipo_completitud       text,
  add column completitud_detalle    jsonb,
  add column notas_extraccion       text;

alter table requisitos_convocatoria
  add constraint requisitos_convocatoria_categoria_check
    check (categoria in ('generico','especifico_convocatoria','opcional')),
  add constraint requisitos_convocatoria_tipo_completitud_check
    check (tipo_completitud in ('simple','partes','multiple','alternativa'));

comment on column requisitos_convocatoria.categoria is 'generico (siempre se pide) | especifico_convocatoria | opcional.';
comment on column requisitos_convocatoria.texto_literal_extraido is 'Texto literal de la convocatoria de donde se extrajo este documento (trazabilidad, revision humana).';
comment on column requisitos_convocatoria.tipo_completitud is 'Override de la estructura por defecto del catalogo para ESTA convocatoria. Null = hereda tipos_documento.tipo_completitud.';
comment on column requisitos_convocatoria.completitud_detalle is 'Override del detalle jsonb para esta convocatoria. Null = hereda del catalogo.';
comment on column requisitos_convocatoria.notas_extraccion is 'Auditoria: por que la IA extrajo/modelo este requisito asi (decisiones concretas).';


-- -----------------------------------------------------------------------------
-- 5. condiciones_convocatoria — requisitos NO-documento (elegibilidad)
--    La otra naturaleza del prompt 1: condiciones a cumplir (antiguedad minima,
--    % de ahorro exigido, superficie, plazos...). El modelo de Fase 1 no las tenia.
-- -----------------------------------------------------------------------------
create table condiciones_convocatoria (
  id               uuid        primary key default gen_random_uuid(),
  creado_en        timestamptz not null default now(),
  actualizado_en   timestamptz not null default now(),
  convocatoria_id  uuid        not null references convocatorias (id),
  identificador    text,
  descripcion      text        not null,
  texto_literal    text,
  notas_extraccion text
);

comment on table condiciones_convocatoria is 'Condiciones de elegibilidad (NO documentos) que exige una convocatoria: tipo de edificio, antiguedad minima, % de ahorro energetico, superficie afectada, plazos, etc. Es la mitad "requisitos_a_cumplir" de la salida del prompt 1. Futuro: el barrido de comunidades con subvencion contratada comprobara cuales las cumplen.';
comment on column condiciones_convocatoria.identificador is 'Identificador legible/slug (ej. antiguedad_minima, ahorro_energetico_minimo).';
comment on column condiciones_convocatoria.descripcion is 'Descripcion textual de la condicion.';
comment on column condiciones_convocatoria.texto_literal is 'Texto literal de la convocatoria de donde se extrajo (trazabilidad, revision humana).';
comment on column condiciones_convocatoria.notas_extraccion is 'Auditoria: como entendio/extrajo la IA esta condicion.';

create index idx_condiciones_convocatoria_convocatoria_id on condiciones_convocatoria (convocatoria_id);


-- -----------------------------------------------------------------------------
-- 6. extracciones_convocatoria — artefactos de la IA + validacion humana
--    Una fila por convocatoria. Guarda el PDF original, los 2 JSON crudos, las
--    explicaciones de la IA (auditoria) y el estado del flujo (borrador ->
--    validada). Al VALIDAR, el resultado estructurado vive en
--    requisitos_convocatoria + condiciones_convocatoria; aqui queda el proceso.
-- -----------------------------------------------------------------------------
create table extracciones_convocatoria (
  id                        uuid        primary key default gen_random_uuid(),
  creado_en                 timestamptz not null default now(),
  actualizado_en            timestamptz not null default now(),
  convocatoria_id           uuid        not null references convocatorias (id),
  url_pdf_convocatoria      text,
  convocatoria_ejemplo_id   uuid        references convocatorias (id),
  modelo_ia                 text,
  num_ejemplos_usados       integer,
  borrador_prompt1          jsonb,
  borrador_prompt2          jsonb,
  explicacion_prompt1       text,
  explicacion_prompt2       text,
  estado                    text        not null default 'borrador',
  fecha_extraccion          timestamptz,
  fecha_validacion          timestamptz,
  validado_por              uuid        references personal_interno (id),
  notas                     text,
  constraint extracciones_convocatoria_estado_check
    check (estado in ('borrador','en_revision','validada','descartada')),
  constraint uq_extracciones_convocatoria_convocatoria unique (convocatoria_id)
);

comment on table extracciones_convocatoria is 'Artefactos de la extraccion IA de una convocatoria + su validacion humana. Una fila por convocatoria (borrador que evoluciona a validada, conservando el crudo). El resultado validado se materializa en requisitos_convocatoria + condiciones_convocatoria.';
comment on column extracciones_convocatoria.url_pdf_convocatoria is 'Enlace al PDF original de la convocatoria (BOE/boletin), en Storage. Trazabilidad.';
comment on column extracciones_convocatoria.convocatoria_ejemplo_id is 'Convocatoria anterior (misma linea/entidad) usada como ejemplo few-shot, si se uso.';
comment on column extracciones_convocatoria.num_ejemplos_usados is 'Cuantos ejemplos resueltos se pasaron a la IA (calibracion: 0/1/2). Por defecto 1; mas ejemplos NO es mas fiable.';
comment on column extracciones_convocatoria.borrador_prompt1 is 'Salida cruda del prompt 1 (requisitos_a_cumplir + documentacion_necesaria). Se conserva ademas de la version validada.';
comment on column extracciones_convocatoria.borrador_prompt2 is 'Salida cruda del prompt 2 (estructura_completitud de cada documento).';
comment on column extracciones_convocatoria.explicacion_prompt1 is 'AUDITORIA: que entendio, que extrajo y como decidio el prompt 1.';
comment on column extracciones_convocatoria.explicacion_prompt2 is 'AUDITORIA: que entendio, que extrajo y como decidio el prompt 2 (modelado de casillas).';
comment on column extracciones_convocatoria.estado is 'borrador -> en_revision -> validada | descartada. Al validar, un humano ha revisado y corregido; pasa a ser la plantilla oficial de la convocatoria.';

create index idx_extracciones_convocatoria_convocatoria_ejemplo_id on extracciones_convocatoria (convocatoria_ejemplo_id);
create index idx_extracciones_convocatoria_validado_por            on extracciones_convocatoria (validado_por);
create index idx_extracciones_convocatoria_estado                  on extracciones_convocatoria (estado);


-- =============================================================================
-- 7. ROW LEVEL SECURITY (habilitado sin politicas; pendiente)
-- =============================================================================
alter table personal_interno           enable row level security;
alter table conocimiento_operativo      enable row level security;
alter table condiciones_convocatoria    enable row level security;
alter table extracciones_convocatoria   enable row level security;


-- =============================================================================
-- 8. TRIGGER actualizado_en para las tablas NUEVAS (reutiliza set_actualizado_en()).
--    (tipos_documento y requisitos_convocatoria ya tenian su trigger; el ALTER
--    no lo afecta.)
-- =============================================================================
do $$
declare r record;
begin
  for r in
    select unnest(array['personal_interno','conocimiento_operativo','condiciones_convocatoria','extracciones_convocatoria']) as t
  loop
    execute format('drop trigger if exists trg_set_actualizado_en on public.%I', r.t);
    execute format('create trigger trg_set_actualizado_en before update on public.%I for each row execute function set_actualizado_en()', r.t);
  end loop;
end $$;


-- =============================================================================
-- 9. NOTAS / ENGANCHES (no construir ahora — solo anotados)
--
-- - ESQUEMA MINIMO GARANTIZADO (prompt/app + seed):
--     hay un suelo que SIEMPRE se pide (CIF y nombre de comunidad; DNI y acta de
--     nombramiento del presidente/administrador; proyecto — siempre hay una
--     actuacion). Esos tipos deben existir en el catalogo tipos_documento (seed,
--     fase de app) y la app/prompt los inyecta como base fija; la IA solo anade y
--     ajusta lo variable. No se siembran aqui.
--
-- - FEW-SHOT (dosis justa): por defecto UN ejemplo (convocatoria previa de la
--     misma linea/entidad + su plantilla validada). Configurable (0/1/2) para
--     calibrar contra el banco de pruebas. Se registra en
--     extracciones_convocatoria (convocatoria_ejemplo_id, num_ejemplos_usados).
--
-- - PROMPT 3 (FUTURO, FAMILIA): revisa la doc real de cada comunidad por casilla
--     (presencia, caducidad, ajuste). Sera una familia (3-general + 3a IEE, 3b
--     presupuestos...). NO usa reglas de caducidad duras por tipo: razona caso a
--     caso con dos preguntas (que doc es / es revisable? ; lo doy por bueno?) y
--     SENALA para revision humana (patron requiere_humano), no dictamina. Consume
--     tipos_documento.conocimiento_experto y conocimiento_operativo.
--
-- - PANTALLAS FUTURAS (no construidas): grid tipo hipoteca por comunidad +
--     selector, vision de conjunto agregada (sumatorio por casilla), priorizacion
--     por dificultad, vista por administrador, subida de docs por la comunidad y
--     alertas de revision. Todas son lecturas sobre lo que producen estos prompts.
--
-- - RECONCILIACION personal_interno <-> tecnicos/comerciales: pendiente (una
--     persona podria estar en varias). Se hara al montar auth/RLS.
-- =============================================================================
