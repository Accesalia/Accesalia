-- =============================================================================
-- ERP Accesalia — Modelo limpio de EMPRESAS y PERSONAS
--
-- Sustituye a administraciones_fincas + administradores + contactos, que
-- mezclaban en una misma fila lo que no cambia (quien es la empresa, quien es
-- la persona) con lo que cambia constantemente (donde trabaja, con que correo
-- se le escribe). Se escribe en limpio, sin arrastrar el modelo anterior.
--
-- La idea que lo ordena todo: lo constante y lo vivo van separados.
--
--   empresa   y  persona    guardan solo lo que no cambia
--   puesto                  guarda lo vivo: donde trabaja esa persona, con que
--                           cargo y con que telefonos, entre dos fechas
--
-- Por que el PUESTO y no la persona: no nos interesa "Ivan Perez", nos interesa
-- "Ivan Perez, contabilidad, en FAIN". Si cambia de empresa, es un puesto NUEVO
-- y no arrastra nada: el correo y el movil eran de la casa anterior. El puesto
-- viejo se cierra con fecha y el historico queda intacto, sin reescribirse.
--
-- Consecuencia buena: un puesto pertenece a UNA empresa para siempre, asi que
-- llegar a la administracion a traves del puesto es exacto y no puede cambiar
-- solo. Y cuando alguien se va, lo que llevaba no cambia de empresa a
-- escondidas: queda sin responsable y hay que reasignarlo a mano.
--
-- Los correos van en tabla aparte porque la app tiene que reconocer a quien
-- escribe a partir de su direccion (gestion del correo). Con una columna y un
-- array haria falta preguntar en dos sitios en cada consulta, y el dia que
-- alguien pregunte solo en uno, la app dejaria de reconocer a esa persona sin
-- dar ningun error. Los telefonos NO: a nadie se le identifica por el telefono.
--
-- Convenciones: espanol sin tildes/enes; CHECK con nombre (nunca enum); RLS sin
-- politicas; trigger set_actualizado_en.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- EMPRESA — lo constante
-- ---------------------------------------------------------------------------
create table empresa (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),

  nombre_accesalia text       not null,
  nombre_legal    text,
  cif             text,
  direccion       text,
  telefono        text,
  activa          boolean     not null default true,
  notas           text
);

comment on table empresa is 'Empresas con las que se trata: administraciones de fincas, contratas, etc. Solo datos constantes; lo de contacto vive en el puesto o en el departamento.';
comment on column empresa.nombre_accesalia is 'El nombre por el que la reconoce el equipo, que NO es el legal: es el util para trabajar. Las franquicias son empresas distintas (MARCAL LEGANES no es MARCAL COLMENAR VIEJO).';
comment on column empresa.nombre_legal is 'Para los papeles. Con el CIF, solo cuando haga falta firmar o facturar.';

create unique index empresa_nombre_accesalia_idx
  on empresa (lower(btrim(nombre_accesalia)));

-- ---------------------------------------------------------------------------
-- EMPRESA_DEPARTAMENTO — facturacion, obras, atencion al cliente...
-- ---------------------------------------------------------------------------
create table empresa_departamento (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),

  empresa_id      uuid        not null references empresa(id) on delete cascade,
  departamento    text        not null,
  telefono        text,
  notas           text
);

comment on table empresa_departamento is 'Un departamento no es una persona: es donde viven los buzones compartidos (facturas@, comunidades@, info@). No tiene cartera de comunidades: eso siempre es de una persona.';
comment on column empresa_departamento.departamento is 'Se llama asi y no "nombre" para que al leerlo no se confunda con el nombre de la empresa.';

create unique index empresa_departamento_unico_idx
  on empresa_departamento (empresa_id, lower(btrim(departamento)));

-- ---------------------------------------------------------------------------
-- PERSONA — lo constante. Deliberadamente delgada.
-- ---------------------------------------------------------------------------
create table persona (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),

  nombre          text        not null,
  activa          boolean     not null default true,
  notas           text
);

comment on table persona is 'La persona, al margen de donde trabaje. Sirve para poder decir que el Adolfo Collado de AEA y el de MC Gestion son el mismo: seguir a la gente cuando se mueve es lo que tiene valor comercial, porque se llevan clientes con ellos.';
comment on column persona.nombre is 'Solo el nombre. Ni DNI (eso solo hace falta de quien firma, y eso es el presidente de la comunidad) ni correo ni telefono: eso depende de donde trabaje.';

-- ---------------------------------------------------------------------------
-- PUESTO — lo vivo: esta persona, en esta empresa, con este cargo
-- ---------------------------------------------------------------------------
create table puesto (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),

  persona_id      uuid        not null references persona(id) on delete cascade,
  empresa_id      uuid        not null references empresa(id) on delete cascade,
  departamento_id uuid        references empresa_departamento(id) on delete set null,

  cargo           text,
  -- Opcional a proposito: el colegiado suele ser el jefe y el resto trabaja bajo
  -- su paraguas. No todos lo estan, y aunque lo esten no siempre lo usan.
  numero_colegiado  text,
  telefono_empresa  text,
  telefono_personal text,

  desde           date,
  hasta           date,
  notas           text,

  constraint puesto_fechas_check check (hasta is null or desde is null or hasta >= desde)
);

comment on table puesto is 'Una persona trabajando en una empresa, entre dos fechas. Es la fila que de verdad se usa: no interesa "Ivan Perez" sino "Ivan Perez, contabilidad, en FAIN".';
comment on column puesto.hasta is 'Con fecha = ya no trabaja ahi. Al cerrarlo, lo que esa persona llevaba queda SIN responsable y hay que reasignarlo: no pasa solo a quien la sustituya, porque la cartera no se hereda (las comunidades buenas se reparten entre los veteranos, no se le dan a un recien llegado).';
comment on column puesto.telefono_empresa is 'Suele ser movil de empresa: NO se arrastra al puesto siguiente.';
comment on column puesto.numero_colegiado is 'Del administrador colegiado. NO es obligatorio: en una administracion suele estar colegiado el jefe y los empleados trabajan bajo su paraguas.';
comment on column puesto.cargo is 'Va aqui y no en la persona: el cargo describe la relacion con esa empresa concreta, y cambia al cambiar de casa.';

create index puesto_persona_idx on puesto (persona_id);
create index puesto_empresa_idx on puesto (empresa_id);
-- el puesto abierto es el que se usa a diario: se busca mucho
create index puesto_abierto_idx on puesto (empresa_id) where hasta is null;

-- ---------------------------------------------------------------------------
-- CORREO — cuelga de un puesto, de un departamento o de la empresa
-- ---------------------------------------------------------------------------
create table correo (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),

  puesto_id       uuid        references puesto(id) on delete cascade,
  departamento_id uuid        references empresa_departamento(id) on delete cascade,
  empresa_id      uuid        references empresa(id) on delete cascade,

  direccion       text        not null,
  etiqueta        text        not null default 'general',
  principal       boolean     not null default false,
  notas           text,

  -- cuelga de uno y solo uno de los tres
  constraint correo_un_solo_dueno_check check (
    (puesto_id is not null)::int + (departamento_id is not null)::int
      + (empresa_id is not null)::int = 1),
  constraint correo_etiqueta_check
    check (etiqueta in ('general', 'facturacion', 'comisiones', 'personal', 'otro'))
);

comment on table correo is 'Todas las direcciones de correo, vengan de quien vengan. En tabla aparte porque la app tiene que reconocer al remitente de un correo entrante: es UNA pregunta con UN indice, y no se puede olvidar mirar en el otro sitio.';
comment on column correo.direccion is 'La direccion de correo (no la postal, que vive en empresa).';
comment on column correo.etiqueta is '"comisiones" es un caso real: el jefe tiene un correo aparte para que la secretaria no vea esos asuntos. Mandar ahi lo que no toca seria un problema.';
comment on column correo.principal is 'El que se usa por defecto al escribir. Uno como mucho por dueno.';

-- el indice que da sentido a la tabla: de una direccion, a quien es
create index correo_direccion_idx on correo (lower(btrim(direccion)));
create index correo_puesto_idx on correo (puesto_id);
create index correo_departamento_idx on correo (departamento_id);

create unique index correo_principal_puesto_idx
  on correo (puesto_id) where principal and puesto_id is not null;
create unique index correo_principal_departamento_idx
  on correo (departamento_id) where principal and departamento_id is not null;
create unique index correo_principal_empresa_idx
  on correo (empresa_id) where principal and empresa_id is not null;

-- ---------------------------------------------------------------------------
alter table empresa              enable row level security;
alter table empresa_departamento enable row level security;
alter table persona              enable row level security;
alter table puesto               enable row level security;
alter table correo               enable row level security;

drop trigger if exists trg_set_actualizado_en on public.empresa;
create trigger trg_set_actualizado_en before update on public.empresa
  for each row execute function set_actualizado_en();

drop trigger if exists trg_set_actualizado_en on public.empresa_departamento;
create trigger trg_set_actualizado_en before update on public.empresa_departamento
  for each row execute function set_actualizado_en();

drop trigger if exists trg_set_actualizado_en on public.persona;
create trigger trg_set_actualizado_en before update on public.persona
  for each row execute function set_actualizado_en();

drop trigger if exists trg_set_actualizado_en on public.puesto;
create trigger trg_set_actualizado_en before update on public.puesto
  for each row execute function set_actualizado_en();

drop trigger if exists trg_set_actualizado_en on public.correo;
create trigger trg_set_actualizado_en before update on public.correo
  for each row execute function set_actualizado_en();
