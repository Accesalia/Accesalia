-- =============================================================================
-- ERP Accesalia — Enriquecimiento CRM (previo a importar datos de Monday)
--
-- Cierra los huecos detectados al analizar el export de Monday (ver
-- docs/ANALISIS_MIGRACION_MONDAY_admins.md). Todo es aditivo o sobre tablas de
-- prueba; no hay datos reales todavia.
--
-- Bloques:
--   A. administraciones_fincas: ciclo de vida (estado) + titular + fin de relacion.
--   B. administradores: notas (cajon de sastre a nivel persona).
--   C. Origen: se rehace administrador_origen (vacio) como administracion_origen,
--      a nivel administracion, con canal + quien lo trajo + respeto de cartera.
--   D. acuerdos_comision: se generaliza con pagador (junto a beneficiario),
--      administracion_id, intermedia_accesalia y vigencia temporal.
--   E. comisiones_proyecto (NUEVA): N comisiones PAGABLES por proyecto (simetrica
--      al lado a cobrar, que ya vive en proyecto_contratas).
--   F. contactos (NUEVA): multicontacto por proposito (facturacion/obra/...).
--
-- Convenciones: espanol sin tildes/enes; PK uuid; creado_en/actualizado_en;
-- SIN ENUMS (text + CHECK nombrado); indices en FKs; RLS sin politicas; trigger
-- set_actualizado_en reutilizado (definido en 20260718160000).
--
-- Vocabulario Accesalia del ciclo de vida: un admin es CONTACTO hasta que firma
-- la 1a hoja de encargo; a partir de ahi CLIENTE (activo | olvidado | descontento
-- | baneado). descontento = se aleja por decision SUYA; baneado = cortamos
-- NOSOTROS. Ambos reviven (labor comercial).
--
-- PENDIENTE fase RLS: confidencialidad de comisiones (los empleados no ven la
-- comision del dueno de su administracion).
-- =============================================================================


-- =============================================================================
-- A. administraciones_fincas: ciclo de vida + titular + fin de relacion
-- =============================================================================
alter table administraciones_fincas
  add column estado                text not null default 'contacto',
  add column fecha_paso_a_cliente  date,
  add column motivo_fin            text,
  add column fecha_fin             date,
  add column titular_id            uuid references administradores (id);

alter table administraciones_fincas
  add constraint administraciones_fincas_estado_check
    check (estado in ('contacto','cliente_activo','cliente_olvidado','cliente_descontento','cliente_baneado'));

comment on column administraciones_fincas.estado is 'Ciclo de vida de la relacion. contacto = aun no ha firmado la 1a hoja de encargo. Al firmar pasa a cliente_activo. cliente_olvidado = dormido (ni nos llama ni le llamamos). cliente_descontento = se aleja por decision SUYA. cliente_baneado = cortamos NOSOTROS. descontento y baneado pueden revivir a activo.';
comment on column administraciones_fincas.fecha_paso_a_cliente is 'Cuando firmo la 1a hoja de encargo (paso de contacto a cliente). Idealmente derivable de hojas_encargo; se guarda por comodidad e historico.';
comment on column administraciones_fincas.motivo_fin is 'Motivo del baneo/descontento (ej. "devolvio recibo de subvenciones"). Texto libre.';
comment on column administraciones_fincas.fecha_fin is 'Fecha del baneo/descontento.';
comment on column administraciones_fincas.titular_id is 'Persona duena de la administracion, la que PERCIBE la comision. Todo lo que traiga cualquier persona de esta administracion comisiona al titular. FK a administradores (nullable).';

create index idx_administraciones_fincas_estado     on administraciones_fincas (estado);
create index idx_administraciones_fincas_titular_id on administraciones_fincas (titular_id);


-- =============================================================================
-- B. administradores: notas (cajon de sastre a nivel persona)
-- =============================================================================
alter table administradores
  add column notas text;

comment on column administradores.notas is 'Cajon de sastre revisable a nivel persona: lo que no cabe en otros campos. Materia prima de la que mas adelante se extraen pautas que enriquecen el modelo.';


-- =============================================================================
-- C. Origen: administrador_origen (persona, vacio) -> administracion_origen
--    A nivel administracion, con canal sistematizado + quien lo trajo (referente
--    polimorfico) + respeto de cartera (condiciona_oferta / servicio_reservado).
-- =============================================================================
drop table if exists administrador_origen;

create table administracion_origen (
  id                     uuid        primary key default gen_random_uuid(),
  creado_en              timestamptz not null default now(),
  actualizado_en         timestamptz not null default now(),
  administracion_id      uuid        not null references administraciones_fincas (id),
  tipo_origen            text        not null,
  comercial_id           uuid        references comerciales (id),
  contrata_id            uuid        references contratas (id),
  admin_referente_id     uuid        references administradores (id),
  referente_externo      text,
  condiciona_oferta      boolean     not null default false,
  servicio_reservado_id  uuid        references tipos_servicio (id),
  notas                  text,
  constraint administracion_origen_tipo_origen_check
    check (tipo_origen in ('puerta_fria','web','boca_a_boca','contrata','comercial_interno','otro_admin','otro'))
);

comment on table administracion_origen is 'Como llego la administracion (canal). DOBLE funcion: (1) analisis de eficiencia de canal (por eso tipo_origen sistematizado, para GROUP BY sin depender del LLM); (2) RESPETO DE CARTERA: quien la trae la considera suya, condicionando precio y que tipo de proyecto se le puede o no ofrecer. Varios registros posibles si conviven origenes.';
comment on column administracion_origen.tipo_origen is 'Canal: puerta_fria | web | boca_a_boca | contrata | comercial_interno | otro_admin | otro.';
comment on column administracion_origen.comercial_id is 'Si la trajo un comercial interno, cual.';
comment on column administracion_origen.contrata_id is 'Si la trajo una contrata (ej. Otis con un ascensor), cual. Condiciona no ofrecer proyectos del mismo tipo de forma independiente.';
comment on column administracion_origen.admin_referente_id is 'Si la trajo otro administrador (boca a boca), cual.';
comment on column administracion_origen.referente_externo is 'Si la trajo alguien externo no fichado (texto libre): "cuniada del presidente", "a traves de Iberlean"...';
comment on column administracion_origen.condiciona_oferta is 'true = el origen restringe que se le puede ofrecer o a que precio (respeto de cartera).';
comment on column administracion_origen.servicio_reservado_id is 'Tipo de servicio reservado al que la trajo (ej. proyecto_ascensor reservado a la contrata). FK a tipos_servicio.';
comment on column administracion_origen.notas is 'Texto libre integro del origen (importantisimo comercialmente).';

create index idx_administracion_origen_administracion_id     on administracion_origen (administracion_id);
create index idx_administracion_origen_comercial_id          on administracion_origen (comercial_id);
create index idx_administracion_origen_contrata_id           on administracion_origen (contrata_id);
create index idx_administracion_origen_admin_referente_id    on administracion_origen (admin_referente_id);
create index idx_administracion_origen_servicio_reservado_id on administracion_origen (servicio_reservado_id);


-- =============================================================================
-- D. acuerdos_comision: generalizar (pagador + beneficiario, administracion,
--    intermediacion, vigencia)
--
-- Los tres flujos reales con una sola tabla:
--   Com Eco       : pagador=accesalia, beneficiario=administrador (Accesalia paga
--                   al admin por traer obra).
--   3% contrata   : pagador=contrata,  beneficiario=accesalia (lo que cobramos a
--                   la contrata adjudicataria).
--   Com Contrata  : pagador=contrata,  beneficiario=administrador (el admin cobra
--                   % del PEM de la contrata; intermedia_accesalia si lo canaliza-
--                   mos nosotros para que la comunidad no lo vea).
-- =============================================================================
alter table acuerdos_comision
  add column pagador               text    not null default 'accesalia',
  add column administracion_id     uuid    references administraciones_fincas (id),
  add column intermedia_accesalia  boolean not null default false,
  add column fecha_desde           date,
  add column fecha_hasta           date;

-- Fuera el check antiguo (solo administrador/contrata) y su coherencia binaria.
alter table acuerdos_comision drop constraint acuerdos_comision_beneficiario_fk_check;
alter table acuerdos_comision drop constraint acuerdos_comision_beneficiario_check;

alter table acuerdos_comision
  add constraint acuerdos_comision_beneficiario_check
    check (beneficiario in ('administrador','contrata','accesalia')),
  add constraint acuerdos_comision_pagador_check
    check (pagador in ('accesalia','contrata','comunidad')),
  add constraint acuerdos_comision_flujo_check
    check (pagador <> beneficiario),
  add constraint acuerdos_comision_vinculo_check
    check (administracion_id is not null or administrador_id is not null or contrata_id is not null);

comment on column acuerdos_comision.pagador is 'Quien PAGA la comision: accesalia | contrata | comunidad. Junto con beneficiario define el flujo (ver cabecera de la migracion). Debe ser distinto de beneficiario.';
comment on column acuerdos_comision.beneficiario is 'Quien RECIBE: administrador | contrata | accesalia. (Ampliado: antes solo administrador/contrata; ahora accesalia para el % que cobramos a la contrata).';
comment on column acuerdos_comision.administracion_id is 'Administracion (dueno) a la que pertenece la comision. La comision es del titular; lo que trae cualquier persona de la administracion comisiona aqui. FK a administraciones_fincas.';
comment on column acuerdos_comision.intermedia_accesalia is 'true = la comision contrata->administrador la canaliza Accesalia (contrata->Accesalia->admin), para que la comunidad no vea que el admin cobro.';
comment on column acuerdos_comision.fecha_desde is 'Vigencia: desde cuando aplica el acuerdo (Monday lo registra: "desde 12/09/2025...").';
comment on column acuerdos_comision.fecha_hasta is 'Vigencia: hasta cuando (nullable = indefinido).';
comment on constraint acuerdos_comision_vinculo_check on acuerdos_comision is 'El acuerdo debe vincular al menos una administracion, administrador o contrata.';

create index idx_acuerdos_comision_administracion_id on acuerdos_comision (administracion_id);


-- =============================================================================
-- E. comisiones_proyecto (NUEVA): lineas de comision PAGABLE por proyecto
--    Simetrica al lado a COBRAR (que vive en proyecto_contratas.comision_*).
--    Permite N beneficiarios por proyecto (dueno + referente + comercial...).
-- =============================================================================
create table comisiones_proyecto (
  id                  uuid        primary key default gen_random_uuid(),
  creado_en           timestamptz not null default now(),
  actualizado_en      timestamptz not null default now(),
  proyecto_id         uuid        not null references proyectos (id),
  beneficiario        text        not null,
  administracion_id   uuid        references administraciones_fincas (id),
  administrador_id    uuid        references administradores (id),
  comercial_id        uuid        references comerciales (id),
  beneficiario_externo text,
  acuerdo_id          uuid        references acuerdos_comision (id),
  porcentaje          numeric,
  importe             numeric,
  estado_pago         text        not null default 'pendiente',
  notas               text,
  constraint comisiones_proyecto_beneficiario_check
    check (beneficiario in ('administrador','comercial','otro')),
  constraint comisiones_proyecto_estado_pago_check
    check (estado_pago in ('pendiente','liquidada','parcial','anulada'))
);

comment on table comisiones_proyecto is 'Lineas de comision PAGABLE en un proyecto concreto (dinero saliente: lo que Accesalia paga por ese proyecto). Varias por proyecto (al dueno de la administracion, a un referente, al comercial...), simetrico a como el lado a COBRAR admite varias contratas via proyecto_contratas. El valor aqui es el REAL aplicado a ESTE proyecto (estandar + excepcion): se hereda del marco (acuerdo_id) y se puede ajustar a mano sin afectar a otros proyectos.';
comment on column comisiones_proyecto.beneficiario is 'A quien se le paga esta linea: administrador (el titular/dueno) | comercial (comercial interno) | otro (externo, ver beneficiario_externo).';
comment on column comisiones_proyecto.administracion_id is 'Si beneficiario=administrador: la administracion cuya comision se paga (al titular).';
comment on column comisiones_proyecto.administrador_id is 'Persona concreta beneficiaria, si aplica (normalmente el titular de la administracion).';
comment on column comisiones_proyecto.comercial_id is 'Si beneficiario=comercial: que comercial.';
comment on column comisiones_proyecto.beneficiario_externo is 'Si beneficiario=otro: nombre libre del externo.';
comment on column comisiones_proyecto.acuerdo_id is 'Marco del que deriva esta linea (acuerdos_comision). El marco es la referencia; esta fila es lo realmente aplicado al proyecto.';
comment on column comisiones_proyecto.estado_pago is 'pendiente | liquidada | parcial | anulada.';

create index idx_comisiones_proyecto_proyecto_id       on comisiones_proyecto (proyecto_id);
create index idx_comisiones_proyecto_administracion_id  on comisiones_proyecto (administracion_id);
create index idx_comisiones_proyecto_administrador_id   on comisiones_proyecto (administrador_id);
create index idx_comisiones_proyecto_comercial_id       on comisiones_proyecto (comercial_id);
create index idx_comisiones_proyecto_acuerdo_id         on comisiones_proyecto (acuerdo_id);
create index idx_comisiones_proyecto_estado_pago        on comisiones_proyecto (estado_pago);

-- proyectos.comision_administrador queda DEPRECATED en favor de comisiones_proyecto.
comment on column proyectos.comision_administrador is 'DEPRECATED (fase CRM): la fuente de verdad de las comisiones pagables por proyecto pasa a comisiones_proyecto (permite N beneficiarios). Se conserva por compatibilidad; migrar y limpiar mas adelante.';


-- =============================================================================
-- F. contactos (NUEVA): multicontacto por proposito
--    "A quien llamar para X" (facturacion/obra/documentacion...). Base para
--    automatizar envio de mails por asunto.
-- =============================================================================
create table contactos (
  id                 uuid        primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  actualizado_en     timestamptz not null default now(),
  administracion_id  uuid        not null references administraciones_fincas (id),
  persona_id         uuid        references administradores (id),
  proposito          text        not null,
  nombre             text,
  telefono           text,
  email              text,
  notas              text,
  constraint contactos_proposito_check
    check (proposito in ('facturacion','obra','documentacion','general','comercial'))
);

comment on table contactos is 'Multicontacto de una administracion: a quien llamar para cada asunto (las grandes tienen contacto distinto para facturas, obra, papeles...). Base para automatizar el envio de mails por proposito. persona_id enlaza con la ficha de persona si esa persona ya existe como administrador.';
comment on column contactos.persona_id is 'Enlace opcional a administradores si el contacto ya es una persona fichada.';
comment on column contactos.proposito is 'facturacion | obra | documentacion | general | comercial.';

create index idx_contactos_administracion_id on contactos (administracion_id);
create index idx_contactos_persona_id        on contactos (persona_id);
create index idx_contactos_proposito         on contactos (proposito);


-- =============================================================================
-- G. RLS (habilitado sin politicas) + trigger actualizado_en en tablas nuevas
-- =============================================================================
alter table administracion_origen enable row level security;
alter table comisiones_proyecto   enable row level security;
alter table contactos             enable row level security;

do $$
declare r record;
begin
  for r in
    select unnest(array['administracion_origen','comisiones_proyecto','contactos']) as t
  loop
    execute format('drop trigger if exists trg_set_actualizado_en on public.%I', r.t);
    execute format('create trigger trg_set_actualizado_en before update on public.%I for each row execute function set_actualizado_en()', r.t);
  end loop;
end $$;
