-- EL PORTAL DE LA COMUNIDAD (Monica, 12-oct-2026). La comunidad nos SUBE la
-- documentacion (primero, la hoja de encargo firmada) desde una pagina nuestra;
-- mas adelante VERA partes muy seleccionadas de su expediente. El acceso es POR
-- CORREO, nunca por enlace: "la cuñada del vecino del 5B" no entra con un enlace
-- reenviado, porque la llave llega al buzon de la persona autorizada.

-- Los correos autorizados A MANO por comunidad (la nuera del presidente, la
-- comision de obras...). El administrador que la lleva, el presidente y el
-- comercial son automaticos y NO se guardan aqui: salen de la agenda vigente.
create table portal_autorizados (
  id             uuid primary key default gen_random_uuid(),
  comunidad_id   uuid not null references comunidades(id) on delete cascade,
  email          text not null,
  nombre         text,
  motivo         text,
  puede_subir    boolean not null default true,
  activo         boolean not null default true,
  anadido_por    uuid references equipo(id),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  constraint portal_autorizados_unico unique (comunidad_id, email)
);
comment on table portal_autorizados is 'Correos con acceso al portal de una comunidad, dados A MANO. El administrador y el presidente vigentes entran siempre (salen de la agenda).';
create trigger trg_set_actualizado_en before update on portal_autorizados for each row execute function set_actualizado_en();

-- Las entradas por ENLACE MAGICO: un uso, caduca. Se guarda la huella, nunca el enlace.
create table portal_entradas (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  huella     text not null unique,
  creado_en  timestamptz not null default now(),
  caduca_en  timestamptz not null,
  usado_en   timestamptz
);
create index portal_entradas_email on portal_entradas (email, creado_en desc);
comment on table portal_entradas is 'Enlaces magicos de entrada al portal: un solo uso y caducan. Solo se guarda la huella (sha256).';

-- Lo que SUBE la comunidad. Nada se da por bueno solo: lo revisa el responsable
-- de ese tipo de documento (la hoja de encargo, el comercial de la oportunidad).
create table portal_recibidos (
  id                 uuid primary key default gen_random_uuid(),
  comunidad_id       uuid not null references comunidades(id) on delete cascade,
  hoja_encargo_id    uuid references hojas_encargo(id) on delete set null,
  tipo               text not null constraint portal_recibidos_tipo_check check (tipo in ('hoja_firmada', 'otro')),
  descripcion        text,
  ruta               text not null,
  nombre_fichero     text,
  tamano             bigint,
  subido_por_email   text not null,
  subido_por_nombre  text,
  estado             text not null default 'por_revisar' constraint portal_recibidos_estado_check check (estado in ('por_revisar', 'aceptado', 'rechazado')),
  revisado_por       uuid references equipo(id),
  revisado_en        timestamptz,
  motivo_rechazo     text,
  creado_en          timestamptz not null default now()
);
create index portal_recibidos_por_revisar on portal_recibidos (estado, creado_en) where estado = 'por_revisar';
comment on table portal_recibidos is 'Documentos subidos por la comunidad desde su portal, hasta que alguien del equipo los revisa.';

alter table portal_autorizados enable row level security;
alter table portal_entradas enable row level security;
alter table portal_recibidos enable row level security;
