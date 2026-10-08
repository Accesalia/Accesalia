-- =====================================================================
-- LAS FOTOS DE LAS NOTAS
-- Monica, 8-oct-2026.
--
-- "Muy a menudo la visita se aprovecha para hacer fotos de algo concreto: unas
-- humedades, un escalon, una grieta... Que en el mismo mensaje se puedan hacer
-- fotos y suban a Supabase con la nota."
--
-- LA NOTA ES PRIVADA; LAS FOTOS, NO: "los tecnicos que hacen el proyecto deben
-- poder acceder a ellas, las administrativas... las imagenes no son
-- confidenciales, son utiles. La nota puede apuntar a la imagen". Por eso cada
-- foto es un DOCUMENTO del repositorio comun, y la nota solo apunta a ella.
--
-- DE QUE CUELGA CADA FOTO:
--   · nota con oportunidad  → documento de la oportunidad ("vinculadas a la
--                             opp, para que puedan encontrarse");
--   · nota solo de un admin → documento de esa persona ("igual es una foto de
--                             un presupuesto, de un contrato de la competencia");
--   · nota pendiente        → todavia sin documento: espera como fichero hasta
--                             que su comercial coloque la nota.
--
-- Se ven: en miniatura debajo de su nota, en la Documentacion de la
-- oportunidad y en la ficha del administrador.
-- =====================================================================

-- 1. El tipo de documento
insert into public.tipos_documento (nombre, aportado_por, pertenece_a, caduca, tipo_completitud)
values ('Fotografía', 'accesalia', 'oportunidad', false, 'multiple');

-- 2. Un documento puede ser de una persona del administrador
alter table public.documentos
  add column puesto_id  uuid references public.puesto(id),
  add column persona_id uuid references public.persona(id);

comment on column public.documentos.puesto_id is 'De que persona (con su puesto) es este documento, cuando no es de una oportunidad: la foto de un presupuesto que enseño un administrador (Monica, 8-oct-2026).';
comment on column public.documentos.persona_id is 'Como puesto_id, para una persona de la agenda sin puesto.';

alter table public.documentos drop constraint chk_documentos_de_algo;
alter table public.documentos add constraint chk_documentos_de_algo check (
  comunidad_id is not null or proyecto_id is not null or oportunidad_id is not null
  or puesto_id is not null or persona_id is not null
);

create index if not exists documentos_oportunidad_idx on public.documentos (oportunidad_id) where oportunidad_id is not null;
create index documentos_puesto_idx on public.documentos (puesto_id) where puesto_id is not null;

-- 3. Que fotos lleva cada nota
create table public.fotos_nota (
  id                     uuid        primary key default gen_random_uuid(),
  creado_en              timestamptz not null default now(),
  -- donde vive el fichero (en el almacen de fotos); la miniatura, al lado: <ruta sin .jpg>-mini.jpg
  storage_ref            text        not null,
  documento_id           uuid references public.documentos(id),
  nota_oportunidad_id    uuid references public.notas_oportunidad(id) on delete cascade,
  nota_administracion_id uuid references public.notas_administracion_fincas(id) on delete cascade,
  nota_pendiente_id      uuid references public.notas_pendientes(id) on delete cascade,
  orden                  int         not null default 0,
  constraint fotos_nota_una_nota_ck check (
    (nota_oportunidad_id is not null)::int + (nota_administracion_id is not null)::int + (nota_pendiente_id is not null)::int = 1
  ),
  constraint fotos_nota_documento_ck check (nota_pendiente_id is not null or documento_id is not null)
);

create index fotos_nota_opp_idx   on public.fotos_nota (nota_oportunidad_id)    where nota_oportunidad_id is not null;
create index fotos_nota_admin_idx on public.fotos_nota (nota_administracion_id) where nota_administracion_id is not null;
create index fotos_nota_pend_idx  on public.fotos_nota (nota_pendiente_id)      where nota_pendiente_id is not null;

comment on table public.fotos_nota is
  'Las fotos que lleva una nota (una o varias). La nota es privada; la foto es un documento del repositorio comun y la nota solo apunta a el. En una nota pendiente la foto aun no es documento: espera como fichero hasta que se coloque (Monica, 8-oct-2026).';
