-- =============================================================================
-- ERP Accesalia — Parametros de alerta (umbrales editables, NO hardcodeados)
--
-- Las alertas OBJETIVAS del comercial (documento sin respuesta, sin contacto,
-- junta cerca sin 3D) se calculan de forma DETERMINISTA (resta de fechas sobre
-- los campos que el modelo ya guarda: estado_desde, esperando_desde,
-- fecha_ultimo_contacto, fecha_necesaria...). Aqui viven solo los UMBRALES, en
-- una tabla editable con defaults sensatos: un "7 dias" es un valor de negocio,
-- no se hardcodea en el codigo ni se delega en la IA (seria caro e impredecible
-- para una aritmetica de fechas).
--
-- Las alertas CUALITATIVAS (no consiguen financiacion, no se creen que quepa,
-- miran otros arquitectos) las genera Sali y salen por Puntos Clave / resumen /
-- recordatorios. Eso NO vive aqui.
--
-- Convenciones: espanol sin tildes/enes; catalogo clave/nombre/valor; RLS sin
-- politicas; trigger set_actualizado_en.
-- =============================================================================

create table parametros_alerta (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  clave           text        not null unique,
  nombre          text        not null,
  valor           numeric     not null,
  unidad          text        not null default 'dias',
  descripcion     text,
  orden           integer,
  activo          boolean     not null default true,
  constraint parametros_alerta_unidad_check
    check (unidad in ('dias', 'horas'))
);

comment on table parametros_alerta is 'Umbrales editables de las alertas deterministas del comercial (dias/horas). Defaults sensatos, ajustables desde la app. Las alertas cualitativas las hace Sali (no viven aqui).';
comment on column parametros_alerta.valor is 'El umbral numerico. Se interpreta con unidad (dias|horas).';

insert into parametros_alerta (clave, nombre, valor, unidad, descripcion, orden) values
  ('doc_retraso',   'Documento enviado sin respuesta — retraso',  7,  'dias',  'HE/viabilidad/ppto enviado y sin respuesta: pasa a ⚠️ retraso.',        1),
  ('doc_atascado',  'Documento enviado sin respuesta — atascado', 15, 'dias',  'HE/viabilidad/ppto enviado y sin respuesta: pasa a 🔴 atascado.',       2),
  ('sin_contacto',  'Sin contacto con la comunidad',              30, 'dias',  'Dias desde el ultimo contacto con la comunidad sin novedades.',        3),
  ('junta_3d',      '3D no listo con junta cerca',                48, 'horas', 'Horas antes de la junta con el 3D aun no listo (es mas in extremis).', 4)
on conflict (clave) do nothing;

alter table parametros_alerta enable row level security;

drop trigger if exists trg_set_actualizado_en on public.parametros_alerta;
create trigger trg_set_actualizado_en
  before update on public.parametros_alerta
  for each row execute function set_actualizado_en();
