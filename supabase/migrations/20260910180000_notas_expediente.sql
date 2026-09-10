-- =============================================================================
-- ERP Accesalia — Notas del expediente (mundo comunidad / proyecto)
--
-- Tercera tabla de notas, con la convencion de Monica: notas_ + detalle.
-- Nace VACIA a proposito. Sus palabras (10-sep-2026):
--
--   "yo crearia notas expediente, si, pero no la rellenaria ahora. Eso va a ser
--    trabajo de otra sesion, y una especialmente compleja porque voy a tener
--    que leermelas casi una a una."
--
-- QUE NO ES, Y POR QUE NO SE REUTILIZA `observaciones_expediente`
--
-- Aquella tiene 2.664 filas y parece la tabla de notas del expediente, pero al
-- mirarla de cerca no lo es: es el volcado en bruto de las fichas de Dropbox
-- parseadas en julio. 181 de sus filas son trozos sueltos ("PRESIDENTE", "DNI
-- PRESIDENTE") separados de su valor, y 449 llevan fecha inventada correlativa
-- (03/03, 04/03, 05/03...) puesta solo para conservar el orden de la ficha; de
-- ahi su columna `fecha_estimada`.
--
-- Asi que `observaciones_expediente` se queda con su nombre y su contenido: es
-- el archivo de lo que decian las fichas. Las notas de verdad del expediente,
-- escritas por una persona, viven aqui. Pasar el oro de alla para aca es el
-- trabajo de esa otra sesion, leyendolas una a una.
--
-- FORMA: la misma que `notas_contratas` y `notas_administracion_fincas`. Sin
-- fecha propia (la da `creado_en`) y sin `fase`: si algun dia hace falta
-- distinguir la nota comercial de la de obra, se añade entonces.
--
-- comunidad_id es obligatorio y proyecto_id opcional, siguiendo el principio de
-- que la direccion es la raiz: toda nota es de una comunidad, y ademas puede
-- afinar a uno de sus proyectos.
-- =============================================================================

create table if not exists notas_expediente (
  id                 uuid        primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),

  comunidad_id       uuid        not null references comunidades (id) on delete cascade,
  proyecto_id        uuid        references proyectos (id) on delete set null,

  texto              text        not null,
  autor              text,
  origen             text        not null default 'app',

  constraint notas_expediente_texto_ck  check (btrim(texto) <> ''),
  constraint notas_expediente_origen_ck check (origen in ('app','sali','monday','ficha_dropbox'))
);

comment on table notas_expediente is 'Notas del expediente de una comunidad, apiladas y escritas por una persona (o por Sali). Nace vacia. NO confundir con `observaciones_expediente`, que es el volcado en bruto de las fichas de Dropbox y se conserva como archivo.';
comment on column notas_expediente.proyecto_id is 'Opcional: afina la nota a un proyecto concreto de esa comunidad. Sin el, la nota es de la comunidad en general.';
comment on column notas_expediente.autor is 'Quien la escribio. Lo pondra el inicio de sesion; texto libre mientras no lo haya.';
comment on column notas_expediente.origen is 'De donde salio el texto. Sirve sobre todo para distinguir lo que escribio una persona de lo que escribio Sali, porque una maquina se equivoca y una nota suya no vale lo mismo.';

create index if not exists idx_notas_expediente_comunidad on notas_expediente (comunidad_id, creado_en desc);
create index if not exists idx_notas_expediente_proyecto  on notas_expediente (proyecto_id,  creado_en desc) where proyecto_id is not null;

drop trigger if exists trg_set_actualizado_en on notas_expediente;
create trigger trg_set_actualizado_en before update on notas_expediente
  for each row execute function set_actualizado_en();

alter table notas_expediente enable row level security;
grant all privileges on table notas_expediente to service_role;
