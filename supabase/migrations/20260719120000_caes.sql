-- =============================================================================
-- ERP Accesalia / Ecobalance — Modulo CAES (Certificados de Ahorro Energetico)
--
-- Los CAES son un activo derivado de las obras de eficiencia energetica: la obra
-- genera un ahorro (kWh/ano) que se monetiza vendiendolo a un sujeto obligado/
-- delegado. Linea de negocio propia.
--
-- CAES ES ECOBALANCE DE PRINCIPIO A FIN: Ecobalance Iberia S.L. SIEMPRE compra,
-- vende, firma el convenio, factura y cobra. Accesalia NUNCA participa a efectos
-- legales. La venta comercial la hace la division comercial de Accesalia. La
-- separacion de acceso Accesalia/Ecobalance se resuelve en la fase de politicas RLS.
--
-- Admite operaciones EXTERNAS (~10%): CAES de proyectos que NO son de Accesalia,
-- por eso el enlace a proyecto interno es OPCIONAL.
--
-- Convenciones: espanol sin tildes/enes; PK uuid; creado_en/actualizado_en;
-- SIN ENUMS (text + CHECK nombrado); indices en FKs y fechas de alerta;
-- RLS sin politicas; trigger actualizado_en reutilizado.
--
-- Importes monetarios numeric(12,2); kWh y precio_unitario_kwh numeric (sin
-- precision fija: el precio por kWh puede requerir decimales finos).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Catalogo ligero: empresas compradoras (sujetos obligados/delegados)
-- Recomendado por ser recurrentes en el mercado abierto de compra.
-- -----------------------------------------------------------------------------
create table empresas_compradoras_caes (
  id              uuid        primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  nombre          text        not null unique,
  nif             text,
  notas           text,
  activa          boolean     not null default true
);

comment on table empresas_compradoras_caes is 'Catalogo ligero de empresas (sujetos obligados/delegados) que compran CAES. Mercado abierto: mas de una, con ofertas que varian en el tiempo.';


-- -----------------------------------------------------------------------------
-- 1. operaciones_caes — unidad central (una por comunidad/obra, indivisible)
-- -----------------------------------------------------------------------------
create table operaciones_caes (
  id                            uuid          primary key default gen_random_uuid(),
  creado_en                     timestamptz   not null default now(),
  actualizado_en                timestamptz   not null default now(),
  comunidad_id                  uuid          not null references comunidades (id),
  proyecto_id                   uuid          references proyectos (id),
  proyecto_externo_descripcion  text,
  via_entrada                   text          not null,
  hoja_encargo_id               uuid          references hojas_encargo (id),
  referencia_catastral          text,
  tipo_actuacion                text,
  estado                        text          not null default 'ofrecida',
  estado_desde                  timestamptz   not null default now(),
  esperando_de                  text,
  esperando_desde               timestamptz,
  kwh_inicial                   numeric,
  kwh_estimado                  numeric,
  kwh_final                     numeric,
  notas                         text,
  constraint operaciones_caes_via_entrada_check
    check (via_entrada in ('descuento_al_firmar','compra')),
  constraint operaciones_caes_estado_check
    check (estado in ('ofrecida','cesion_interna_firmada','convenio_oficial_firmado','en_obra','cee_final_registrado','en_oferta','vendida','registrada','facturada','cobrada','repartida','cancelada'))
);

comment on table operaciones_caes is 'Unidad central e INDIVISIBLE: una operacion = UN convenio con UNA comunidad por UNA obra. No hay paquetes. Puede ser interna (proyecto de Accesalia) o externa (~10%, sin proyecto_id).';
comment on column operaciones_caes.proyecto_id is 'Nullable: operaciones externas (proyecto de otro arquitecto/empresa) no tienen proyecto interno.';
comment on column operaciones_caes.proyecto_externo_descripcion is 'Cuando es externa: de quien/que obra.';
comment on column operaciones_caes.via_entrada is 'descuento_al_firmar (la comunidad cede sus CAES como descuento en honorarios al firmar el proyecto) | compra (a una comunidad que ya hizo la obra; puede entrar en cualquier punto del flujo).';
comment on column operaciones_caes.hoja_encargo_id is 'Cuando entro como descuento_al_firmar, la hoja donde se pacto la cesion interna. ENCAJE: enlace opcional; la cesion interna en si es un contratos_caes tipo cesion_interna. Solo aplica a via descuento_al_firmar.';
comment on column operaciones_caes.tipo_actuacion is 'Actuacion estandarizada (ej. RES010). Texto libre.';
comment on column operaciones_caes.estado is 'Flujo: ofrecida -> cesion_interna_firmada -> convenio_oficial_firmado -> en_obra -> cee_final_registrado (CANDADO: sin esto no hay venta) -> en_oferta -> vendida -> registrada -> facturada -> cobrada -> repartida | cancelada.';
comment on column operaciones_caes.esperando_desde is 'Materia prima de alertas (indexado): "convenio firmado hace X sin CEE final", "vendida sin facturar".';
comment on column operaciones_caes.kwh_inicial is 'Preliminar, cesion interna antes de proyecto ("a groso modo").';
comment on column operaciones_caes.kwh_estimado is 'Del CEE durante la elaboracion del proyecto.';
comment on column operaciones_caes.kwh_final is 'Del certificado final al fin de obra, tras resolver requerimientos de CAES (que pueden modificarlo).';

create index idx_operaciones_caes_comunidad_id    on operaciones_caes (comunidad_id);
create index idx_operaciones_caes_proyecto_id     on operaciones_caes (proyecto_id);
create index idx_operaciones_caes_hoja_encargo_id on operaciones_caes (hoja_encargo_id);
create index idx_operaciones_caes_estado_desde    on operaciones_caes (estado_desde);
create index idx_operaciones_caes_esperando_desde on operaciones_caes (esperando_desde);


-- -----------------------------------------------------------------------------
-- 2. contratos_caes — secuencia de contratos de una operacion (con version)
-- -----------------------------------------------------------------------------
create table contratos_caes (
  id                                uuid          primary key default gen_random_uuid(),
  creado_en                         timestamptz   not null default now(),
  actualizado_en                    timestamptz   not null default now(),
  operacion_caes_id                 uuid          not null references operaciones_caes (id),
  tipo_contrato                     text          not null,
  version                           integer       not null default 1,
  vigente                           boolean       not null default true,
  cesionario                        text          not null default 'ecobalance',
  representante_nombre              text,
  representante_rol                 text,
  importe_total                     numeric(12,2),
  precio_unitario_kwh               numeric,
  kwh_referencia                    numeric,
  firma_electronica                 boolean       not null default false,
  fecha_firma                       date,
  votado_en_junta                   boolean       not null default false,
  junta_id                          uuid          references juntas (id),
  declaracion_financiacion_publica  text,
  declaracion_exclusividad          boolean       not null default false,
  documento_url                     text,
  estado                            text          not null default 'borrador',
  notas                             text,
  constraint contratos_caes_tipo_contrato_check
    check (tipo_contrato in ('cesion_interna','convenio_oficial')),
  constraint contratos_caes_cesionario_check
    check (cesionario = 'ecobalance'),
  constraint contratos_caes_estado_check
    check (estado in ('borrador','enviado','firmado','re_firma_pendiente','sustituido'))
);

comment on table contratos_caes is 'Secuencia de contratos de una operacion: cesion_interna (valoracion estimada en la hoja de encargo, antes del proyecto) -> convenio_oficial (con el proyecto hecho, el que se registra al fin de obra). Con version para las re-firmas (convenios antiguos re-emitidos para reflejar el precio unitario por kWh que la ley ahora exige). No se borra el historico.';
comment on column contratos_caes.version is 'Para las re-firmas: nueva version con vigente=true, la anterior a sustituido/vigente=false.';
comment on column contratos_caes.cesionario is 'SIEMPRE ecobalance (dato explicito por claridad legal; el check solo admite ese valor). Accesalia nunca participa legalmente.';
comment on column contratos_caes.representante_rol is 'Rol de quien firma por la cedente (presidente/administrador). Texto libre.';
comment on column contratos_caes.precio_unitario_kwh is 'Precio unitario EUR/kWh-ano (exigencia legal del convenio oficial).';
comment on column contratos_caes.kwh_referencia is 'El ahorro que refleja ESTE contrato (el interno usa el estimado; el oficial, el que corresponda).';
comment on column contratos_caes.junta_id is 'Junta donde se voto (fase comercial), si reutilizable. Enlace blando; no se fuerza coherencia con el proceso_venta de la junta.';
comment on column contratos_caes.declaracion_financiacion_publica is 'Lo declarado (subvenciones SOLICITADAS). Se guarda, NO se vigila el tope del 100% (es del registrador; ademas son solicitadas, no concedidas).';
comment on column contratos_caes.declaracion_exclusividad is 'Declaracion responsable de no ceder los mismos ahorros a otro convenio CAE.';
comment on column contratos_caes.estado is 'borrador -> enviado -> firmado; re_firma_pendiente (convenio antiguo sin precio unitario); sustituido (reemplazado por una version posterior).';

create index idx_contratos_caes_operacion_caes_id on contratos_caes (operacion_caes_id);
create index idx_contratos_caes_junta_id          on contratos_caes (junta_id);


-- -----------------------------------------------------------------------------
-- 3. requerimientos_caes — patron comun de requerimiento (con efecto en kWh)
-- -----------------------------------------------------------------------------
create table requerimientos_caes (
  id                 uuid          primary key default gen_random_uuid(),
  creado_en          timestamptz   not null default now(),
  actualizado_en     timestamptz   not null default now(),
  operacion_caes_id  uuid          not null references operaciones_caes (id),
  origen             text          not null default 'registro',
  descripcion        text          not null,
  fecha_requerimiento date,
  plazo              date,
  estado             text          not null default 'abierto',
  afecta_kwh         boolean       not null default false,
  kwh_resultante     numeric,
  notas              text,
  constraint requerimientos_caes_origen_check
    check (origen in ('registro','verificador','otro')),
  constraint requerimientos_caes_estado_check
    check (estado in ('abierto','en_respuesta','resuelto'))
);

comment on table requerimientos_caes is 'Requerimientos sobre una operacion CAES (patron comun: quien pide, que, plazo, estado). Particularidad: pueden modificar el kWh final (el registro pide eliminar elementos, ajustar, etc.).';
comment on column requerimientos_caes.origen is 'Quien lo pide: registro, verificador, otro.';
comment on column requerimientos_caes.plazo is 'Enchufe de IA: plazo a vigilar (indexado).';
comment on column requerimientos_caes.afecta_kwh is 'Si su resolucion cambio el ahorro.';
comment on column requerimientos_caes.kwh_resultante is 'El ahorro tras resolverlo (alimenta operaciones_caes.kwh_final).';

create index idx_requerimientos_caes_operacion_caes_id on requerimientos_caes (operacion_caes_id);
create index idx_requerimientos_caes_plazo             on requerimientos_caes (plazo);


-- -----------------------------------------------------------------------------
-- 4. ofertas_caes — mercado abierto de compra
-- -----------------------------------------------------------------------------
create table ofertas_caes (
  id                   uuid          primary key default gen_random_uuid(),
  creado_en            timestamptz   not null default now(),
  actualizado_en       timestamptz   not null default now(),
  operacion_caes_id    uuid          not null references operaciones_caes (id),
  empresa_nombre       text          not null,
  empresa_id           uuid          references empresas_compradoras_caes (id),
  precio_unitario_kwh  numeric,
  importe_ofertado     numeric(12,2),
  fecha_oferta         date,
  estado               text          not null default 'recibida',
  notas                text,
  constraint ofertas_caes_estado_check
    check (estado in ('recibida','aceptada','rechazada','caducada'))
);

comment on table ofertas_caes is 'Ofertas de empresas por los CAES de una operacion. Solo se puede aceptar/vender con la operacion en cee_final_registrado (candado). Registrar las ofertas permite quedarse con la mejor y dejar traza.';
comment on column ofertas_caes.empresa_nombre is 'El sujeto obligado/delegado (texto siempre presente).';
comment on column ofertas_caes.empresa_id is 'FK opcional al catalogo empresas_compradoras_caes si la empresa esta fichada.';

create index idx_ofertas_caes_operacion_caes_id on ofertas_caes (operacion_caes_id);
create index idx_ofertas_caes_empresa_id        on ofertas_caes (empresa_id);


-- -----------------------------------------------------------------------------
-- 5. beneficiarios_reparto_caes — reparto abierto por figura prescriptora
-- -----------------------------------------------------------------------------
create table beneficiarios_reparto_caes (
  id                 uuid          primary key default gen_random_uuid(),
  creado_en          timestamptz   not null default now(),
  actualizado_en     timestamptz   not null default now(),
  operacion_caes_id  uuid          not null references operaciones_caes (id),
  rol                text          not null,
  administrador_id   uuid          references administradores (id),
  contrata_id        uuid          references contratas (id),
  comunidad_id       uuid          references comunidades (id),
  nombre_libre       text,
  importe            numeric(12,2),
  porcentaje         numeric,
  con_iva            boolean,
  estado_pago        text          not null default 'pendiente',
  notas              text,
  constraint beneficiarios_reparto_caes_rol_check
    check (rol in ('comunidad','administrador','contrata','presidente','vecino','otro')),
  constraint beneficiarios_reparto_caes_estado_pago_check
    check (estado_pago in ('pendiente','pagado','pago_parcial','no_aplica'))
);

comment on table beneficiarios_reparto_caes is 'Reparto del dinero a la salida: la comunidad cobra su contraprestacion (sin IVA, compraventa entre particulares) y las figuras que trajeron la oportunidad (prescriptores) cobran comision. Abierto: administrador (casi siempre), contrata (las que ponen SATE y dan el chivatazo), presidente, vecino, o nadie. Mismo concepto que el "origen" de la oportunidad comercial.';
comment on column beneficiarios_reparto_caes.rol is 'Figura que cobra: comunidad (la cedente) o prescriptor (administrador/contrata/presidente/vecino/otro).';
comment on column beneficiarios_reparto_caes.nombre_libre is 'Para presidente/vecino sueltos no fichados.';
comment on column beneficiarios_reparto_caes.con_iva is 'La comunidad cobra SIN IVA; las comisiones a prescriptores, segun corresponda. Nullable: se fija por caso.';
comment on column beneficiarios_reparto_caes.estado_pago is 'Pacto + estado del pago del reparto. El movimiento de dinero saliente vive en facturacion/Ecobalance (aun sin construir).';

create index idx_beneficiarios_reparto_caes_operacion_caes_id on beneficiarios_reparto_caes (operacion_caes_id);
create index idx_beneficiarios_reparto_caes_administrador_id   on beneficiarios_reparto_caes (administrador_id);
create index idx_beneficiarios_reparto_caes_contrata_id        on beneficiarios_reparto_caes (contrata_id);
create index idx_beneficiarios_reparto_caes_comunidad_id       on beneficiarios_reparto_caes (comunidad_id);


-- -----------------------------------------------------------------------------
-- 6. facturas_caes — registro (NO emision) de la factura a la empresa
-- -----------------------------------------------------------------------------
create table facturas_caes (
  id                      uuid          primary key default gen_random_uuid(),
  creado_en               timestamptz   not null default now(),
  actualizado_en          timestamptz   not null default now(),
  operacion_caes_id       uuid          not null references operaciones_caes (id),
  numero_factura          text,
  fecha_emision           date,
  empresa_receptor_nombre text,
  empresa_receptor_nif    text,
  base_imponible          numeric(12,2),
  iva_porcentaje          numeric(5,2)  not null default 21.00,
  iva_importe             numeric(12,2),
  total                   numeric(12,2),
  documento_url           text,
  estado_cobro            text          not null default 'pendiente',
  fecha_cobro             date,
  constraint facturas_caes_estado_cobro_check
    check (estado_cobro in ('pendiente','cobrada','cobrada_parcial','incobrable'))
);

comment on table facturas_caes is 'Registro (no emision) de la factura CAES a la empresa compradora. Factusol emite; aqui solo se registra y controla (espejo del registro de facturas de Accesalia). Ecobalance factura con IVA a la empresa.';
comment on column facturas_caes.estado_cobro is 'pendiente | cobrada | cobrada_parcial | incobrable. Los pagos salientes del reparto se llevan en beneficiarios_reparto_caes.estado_pago.';

create index idx_facturas_caes_operacion_caes_id on facturas_caes (operacion_caes_id);


-- =============================================================================
-- ROW LEVEL SECURITY (habilitado sin politicas; separacion Accesalia/Ecobalance
-- se resuelve en la fase de politicas RLS)
-- =============================================================================
alter table empresas_compradoras_caes   enable row level security;
alter table operaciones_caes            enable row level security;
alter table contratos_caes              enable row level security;
alter table requerimientos_caes         enable row level security;
alter table ofertas_caes                enable row level security;
alter table beneficiarios_reparto_caes  enable row level security;
alter table facturas_caes               enable row level security;


-- =============================================================================
-- TRIGGER actualizado_en para las tablas nuevas (reutiliza set_actualizado_en()).
-- =============================================================================
do $$
declare r record;
begin
  for r in
    select unnest(array[
      'empresas_compradoras_caes','operaciones_caes','contratos_caes','requerimientos_caes',
      'ofertas_caes','beneficiarios_reparto_caes','facturas_caes'
    ]) as t
  loop
    execute format('drop trigger if exists trg_set_actualizado_en on public.%I', r.t);
    execute format('create trigger trg_set_actualizado_en before update on public.%I for each row execute function set_actualizado_en()', r.t);
  end loop;
end $$;


-- =============================================================================
-- NOTAS / FUERA DE ALCANCE (no construir — solo anotados)
--
-- - VIGILANCIA DEL TOPE DEL 100% (subvenciones + CAES): NO se construye. Es del
--   registrador; las subvenciones declaradas son solicitadas (no concedidas) y sus
--   importes futuros son incalculables. Solo se guarda lo declarado
--   (contratos_caes.declaracion_financiacion_publica), sin cuadrarlo.
--
-- - ENLACE FINO CON SUBVENCIONES: una operacion CAES podria referenciar el
--   expediente de subvencion (expedientes, Fase 1) de esa comunidad/proyecto para
--   LECTURA, sin duplicar cifras. NO se construye ese FK ahora (una operacion CAES
--   puede existir sin subvencion nuestra). Se anota como posible ampliacion.
--
-- - MOTOR DE FACTURACION / PAGOS SALIENTES: Factusol emite; facturacion/Ecobalance
--   gestiona el dinero saliente (reparto a comunidad y prescriptores). Aqui solo
--   registro y control (estado_cobro / estado_pago como pacto + estado).
--
-- - SEPARACION DE ACCESO ACCESALIA / ECOBALANCE: fase final de politicas RLS.
--
-- - MATERIA PRIMA DE ALERTAS (la IA lee, no se construyen tablas de alerta):
--   cuello del CEE final (estado convenio_oficial_firmado/en_obra esperando
--   cee_final_registrado), vendida sin cobrar / cobrada sin repartir (estado +
--   estado_desde), tiempos CAES independientes (~3 meses, no confundir con
--   subvenciones 1-2+ anos), re-firmas pendientes (contratos_caes.estado =
--   re_firma_pendiente), requerimientos con plazo (requerimientos_caes.plazo).
-- =============================================================================
