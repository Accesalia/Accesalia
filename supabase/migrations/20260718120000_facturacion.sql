-- =============================================================================
-- ERP Accesalia — Fase 2: Facturacion (hojas de encargo, conceptos, hitos, cobros, facturas)
--
-- Amplia la BD con el area de facturacion. La Fase 1 (nucleo + subvenciones) ya
-- existe en este proyecto; esta migracion NO la toca (solo referencia sus tablas
-- comunidades, proyectos, contratas por FK).
--
-- Alcance: SOLO esquema de datos (enums, tablas, columnas, FKs, checks,
-- restricciones e indices), comentarios y RLS habilitado SIN politicas.
--
-- Fuera de alcance (ver notas al final): UI, autenticacion, logica de negocio,
-- triggers. La web NO emite facturas: se emiten en Factusol y aqui solo se
-- REGISTRAN sus datos + enlace al PDF. Sin numeracion fiscal, series,
-- rectificativas, Verifactu ni calculo automatico de impuestos. Sin area CAES
-- (aparte), sin comisiones de administrador (fase posterior). El 3,5% de exito
-- de subvencion queda PREVISTO como tipo de hito, pero se rellena a mano.
--
-- Convenciones (identicas a Fase 1):
--   - Nombres en espanol sin tildes ni enes.
--   - PK id uuid default gen_random_uuid(); creado_en/actualizado_en timestamptz default now().
--   - FKs con nombre <tabla_singular>_id. Enums de Postgres para conjuntos cerrados.
--   - Indices en FKs y en columnas de fecha para alertas. comment en tablas/columnas.
--   - RLS habilitado sin politicas.
--   - Importes monetarios numeric(12,2). Porcentajes numeric(5,2) (50.00 = 50%).
-- =============================================================================

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

create type pagador_tipo as enum ('comunidad', 'contrata');

create type emisor_factura as enum ('accesalia', 'daniel_autonomo');

create type canal_tarifa as enum ('convenio_contratista', 'directo_comunidad', 'condiciones_especiales');

create type estado_hoja as enum ('borrador', 'enviada', 'firmada', 'en_curso', 'cerrada', 'anulada');

create type tipo_concepto as enum (
  'proyecto_tecnico', 'memoria_valorada', 'direccion_facultativa', 'coordinacion_ss',
  'iee', 'lee', 'cee', 'tramitacion_subvenciones', 'documentacion_tecnica_subvencion',
  'caes', 'otro'
);

create type tipo_proyecto_subv as enum ('propio', 'externo');

create type disparador_hito as enum (
  'a_firma', 'a_entrega_proyecto', 'al_cfo', 'fecha_fija', 'a_exito_subvencion', 'otro'
);

create type estado_hito as enum ('pendiente', 'facturado', 'cobrado', 'parcialmente_cobrado', 'incobrable');

create type metodo_cobro as enum ('cargo_cuenta', 'transferencia', 'efectivo', 'otro');


-- =============================================================================
-- 2. TABLAS DE FACTURACION
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 3.1 hojas_encargo
-- -----------------------------------------------------------------------------
create table hojas_encargo (
  id                      uuid           primary key default gen_random_uuid(),
  creado_en               timestamptz    not null default now(),
  actualizado_en          timestamptz    not null default now(),
  comunidad_id            uuid           not null references comunidades (id),
  pagador_tipo            pagador_tipo   not null,
  pagador_contrata_id     uuid           references contratas (id),
  emisor                  emisor_factura not null,
  numero_hoja             text,
  fecha_creacion          date           not null,
  fecha_firma             date,
  vigencia_meses          integer        not null default 3,
  canal_tarifa            canal_tarifa,
  importe_total_pactado   numeric(12,2),
  estado                  estado_hoja    not null default 'borrador',
  fecha_estado            timestamptz,
  url_pdf_firmado         text,
  constraint chk_hojas_encargo_pagador
    check (
      (pagador_tipo = 'contrata'  and pagador_contrata_id is not null) or
      (pagador_tipo = 'comunidad' and pagador_contrata_id is null)
    )
);

comment on table hojas_encargo is 'Documento contractual (firmado por el cliente): prueba de que se contrato y garantia de cobro. Pertenece a una comunidad; emisor y pagador se fijan aqui para toda la hoja. La relacion con proyectos se resuelve a nivel de concepto (una hoja puede referirse a varios proyectos).';
comment on column hojas_encargo.pagador_tipo is 'Quien paga esta hoja: normalmente la comunidad, excepcionalmente una contrata.';
comment on column hojas_encargo.pagador_contrata_id is 'Relleno solo si pagador_tipo = contrata (ej. Schindler, Fain). El check exige coherencia con pagador_tipo.';
comment on column hojas_encargo.emisor is 'Quien factura la hoja ENTERA (Accesalia S.L. o Daniel autonomo). Nunca cambia dentro de una hoja. Si es daniel_autonomo, sus facturas llevan IRPF.';
comment on column hojas_encargo.numero_hoja is 'Referencia interna de la hoja de encargo, si se usa.';
comment on column hojas_encargo.fecha_creacion is 'Fecha de la hoja.';
comment on column hojas_encargo.fecha_firma is 'Cuando la devolvio firmada el cliente. Enchufe de IA: alertar de hoja enviada sin firmar hace X.';
comment on column hojas_encargo.vigencia_meses is 'Vigencia teorica de la hoja; informativa, no bloqueante.';
comment on column hojas_encargo.canal_tarifa is 'Via comercial por la que se pacto. Util para analisis de rentabilidad por canal.';
comment on column hojas_encargo.importe_total_pactado is 'Suma pactada de la hoja (a mano). Puede derivarse de los conceptos, pero se guarda por si se pacto un global.';
comment on column hojas_encargo.fecha_estado is 'Enchufe de IA: cuando entro en el estado actual.';
comment on column hojas_encargo.url_pdf_firmado is 'Enlace al PDF de la hoja firmada (documento sagrado). El fichero se guarda fuera; aqui solo el enlace.';
comment on constraint chk_hojas_encargo_pagador on hojas_encargo is 'Coherencia pagador: contrata => pagador_contrata_id no nulo; comunidad => nulo.';

create index idx_hojas_encargo_comunidad_id        on hojas_encargo (comunidad_id);
create index idx_hojas_encargo_pagador_contrata_id on hojas_encargo (pagador_contrata_id);
create index idx_hojas_encargo_fecha_firma         on hojas_encargo (fecha_firma);
create index idx_hojas_encargo_fecha_estado        on hojas_encargo (fecha_estado);


-- -----------------------------------------------------------------------------
-- 3.2 conceptos_hoja
-- -----------------------------------------------------------------------------
create table conceptos_hoja (
  id                        uuid                primary key default gen_random_uuid(),
  creado_en                 timestamptz         not null default now(),
  actualizado_en            timestamptz         not null default now(),
  hoja_encargo_id           uuid                not null references hojas_encargo (id),
  proyecto_id               uuid                references proyectos (id),
  tipo_concepto             tipo_concepto       not null,
  descripcion               text,
  importe                   numeric(12,2)       not null default 0,
  incluido                  boolean             not null default false,
  incluido_en_concepto_id   uuid                references conceptos_hoja (id),
  subvencion_tipo_proyecto  tipo_proyecto_subv,
  constraint chk_conceptos_hoja_incluido
    check (
      (incluido = true) or
      (incluido = false and incluido_en_concepto_id is null)
    )
);

comment on table conceptos_hoja is 'Cada linea/servicio contratado dentro de una hoja. Siempre desglosado (nunca un paquete opaco), para poder contar y filtrar por tipo de servicio.';
comment on column conceptos_hoja.proyecto_id is 'A que proyecto se refiere este concepto, si aplica. Aqui se resuelve la relacion hoja-proyecto (una hoja puede tocar varios proyectos).';
comment on column conceptos_hoja.tipo_concepto is 'Catalogo de servicios. caes se admite por si aparece en una hoja, pero su maquinaria se modela aparte (area CAES).';
comment on column conceptos_hoja.descripcion is 'Detalle libre (lo que en la factura aparece como "incluye...").';
comment on column conceptos_hoja.importe is 'Importe real (base, sin IVA) de este concepto en esta hoja. Puede ser 0 si va incluido en otro. Los precios se ponen a mano, no se calculan.';
comment on column conceptos_hoja.incluido is 'true si este concepto va incluido en el precio de otro (no se cobra aparte, pero consta como contratado). Permite contar servicios y sumar dinero correctamente a la vez.';
comment on column conceptos_hoja.incluido_en_concepto_id is 'Apunta al concepto que lo engloba, si incluido = true (auto-referencia a conceptos_hoja).';
comment on column conceptos_hoja.subvencion_tipo_proyecto is 'Solo para documentacion_tecnica_subvencion / tramitacion_subvenciones: propio (1.980 EUR) o externo (2.225 EUR). Null en el resto.';
comment on constraint chk_conceptos_hoja_incluido on conceptos_hoja is 'Solo un concepto marcado incluido puede apuntar a incluido_en_concepto_id.';

create index idx_conceptos_hoja_hoja_encargo_id         on conceptos_hoja (hoja_encargo_id);
create index idx_conceptos_hoja_proyecto_id             on conceptos_hoja (proyecto_id);
create index idx_conceptos_hoja_incluido_en_concepto_id on conceptos_hoja (incluido_en_concepto_id);


-- -----------------------------------------------------------------------------
-- 3.3 hitos_facturacion
-- -----------------------------------------------------------------------------
create table hitos_facturacion (
  id                 uuid            primary key default gen_random_uuid(),
  creado_en          timestamptz     not null default now(),
  actualizado_en     timestamptz     not null default now(),
  hoja_encargo_id    uuid            not null references hojas_encargo (id),
  descripcion        text            not null,
  disparador         disparador_hito not null,
  porcentaje         numeric(5,2),
  importe_previsto   numeric(12,2),
  fecha_prevista     date,
  estado             estado_hito     not null default 'pendiente',
  fecha_estado       timestamptz
);

comment on table hitos_facturacion is 'Los pagos pactados de una hoja (plan pactado). Libres y variables (tipico 50% firma / 50% entrega, pero muy variable). Los cobros reales van en cobros y pueden fraccionar un hito sin alterarlo.';
comment on column hitos_facturacion.descripcion is 'Ej. "50% a la firma", "3er tercio", "50% al CFO".';
comment on column hitos_facturacion.disparador is 'Que evento activa el cobro. a_exito_subvencion queda PREVISTO para el 3,5%; su automatizacion se conecta en el futuro con el area de subvenciones.';
comment on column hitos_facturacion.porcentaje is 'Si el hito se expresa como % del total (5.00 = 5%).';
comment on column hitos_facturacion.importe_previsto is 'Importe esperado del hito (base, sin IVA).';
comment on column hitos_facturacion.fecha_prevista is 'Para disparador fecha_fija o estimacion.';
comment on column hitos_facturacion.fecha_estado is 'Enchufe de IA: alertar de hitos facturados y no cobrados hace mucho.';

create index idx_hitos_facturacion_hoja_encargo_id on hitos_facturacion (hoja_encargo_id);
create index idx_hitos_facturacion_fecha_estado    on hitos_facturacion (fecha_estado);
create index idx_hitos_facturacion_fecha_prevista  on hitos_facturacion (fecha_prevista);


-- -----------------------------------------------------------------------------
-- 3.4 cobros
-- -----------------------------------------------------------------------------
create table cobros (
  id                    uuid          primary key default gen_random_uuid(),
  creado_en             timestamptz   not null default now(),
  actualizado_en        timestamptz   not null default now(),
  hito_facturacion_id   uuid          not null references hitos_facturacion (id),
  fecha_cobro           date          not null,
  importe               numeric(12,2) not null,
  metodo                metodo_cobro,
  notas                 text
);

comment on table cobros is 'Pagos reales conforme entran. Un hito puede tener varios cobros (derramas fraccionadas). Sumando los cobros de un hito se sabe cuanto se ha cobrado y cuanto queda, sin tocar el hito original.';
comment on column cobros.importe is 'Importe efectivamente cobrado en este pago (base, sin IVA).';

create index idx_cobros_hito_facturacion_id on cobros (hito_facturacion_id);
create index idx_cobros_fecha_cobro         on cobros (fecha_cobro);


-- -----------------------------------------------------------------------------
-- 3.5 facturas
-- Registro de facturas ya emitidas en Factusol. La web NO las genera: solo
-- guarda sus datos y el PDF, para trazabilidad.
-- -----------------------------------------------------------------------------
create table facturas (
  id                   uuid          primary key default gen_random_uuid(),
  creado_en            timestamptz   not null default now(),
  actualizado_en       timestamptz   not null default now(),
  hoja_encargo_id      uuid          not null references hojas_encargo (id),
  hito_facturacion_id  uuid          references hitos_facturacion (id),
  numero_factura       text          not null,
  fecha_emision        date          not null,
  receptor_nombre      text          not null,
  receptor_nif         text,
  base_imponible       numeric(12,2) not null,
  iva_porcentaje       numeric(5,2)  not null default 21.00,
  iva_importe          numeric(12,2) not null,
  irpf_porcentaje      numeric(5,2),
  irpf_importe         numeric(12,2),
  total                numeric(12,2) not null,
  url_pdf              text
);

comment on table facturas is 'Registro de facturas ya emitidas en Factusol (la web no las genera). Una factura se corresponde normalmente con un hito cobrado (o con varios conceptos de una hoja).';
comment on column facturas.hito_facturacion_id is 'El hito que materializa, si aplica (nullable).';
comment on column facturas.numero_factura is 'Numero correlativo de Factusol (ej. "1-000209").';
comment on column facturas.receptor_nombre is 'A quien se emitio (comunidad o contrata); se copia tal cual figura en la factura.';
comment on column facturas.iva_porcentaje is 'IVA siempre 21% en Accesalia (nunca reducido).';
comment on column facturas.irpf_porcentaje is 'Relleno solo cuando el emisor de la hoja es daniel_autonomo.';
comment on column facturas.irpf_importe is 'Relleno solo cuando el emisor de la hoja es daniel_autonomo.';
comment on column facturas.url_pdf is 'Enlace al PDF de la factura de Factusol.';

create index idx_facturas_hoja_encargo_id     on facturas (hoja_encargo_id);
create index idx_facturas_hito_facturacion_id on facturas (hito_facturacion_id);
create index idx_facturas_fecha_emision       on facturas (fecha_emision);


-- =============================================================================
-- 3. ROW LEVEL SECURITY
-- RLS habilitado en todas las tablas nuevas. NO se definen politicas todavia
-- (se haran al montar los accesos externos). PENDIENTE: definir politicas.
-- =============================================================================

alter table hojas_encargo       enable row level security;
alter table conceptos_hoja      enable row level security;
alter table hitos_facturacion   enable row level security;
alter table cobros              enable row level security;
alter table facturas            enable row level security;


-- =============================================================================
-- 4. ENGANCHES PREVISTOS (NO construir ahora — solo anotados)
--
-- - 3,5% DE EXITO DE SUBVENCION:
--     el hito con disparador a_exito_subvencion se activara automaticamente al
--     integrar con el area de subvenciones (al pasar un expediente a 'cobrado',
--     con base en expedientes.importe_concedido). Hoy se rellena a mano.
--
-- - AREA DE CAES:
--     los certificados de ahorro energetico (solo eficiencia energetica) tendran
--     su propia area, con su documentacion y su contrato de cesion y reparto
--     comunidad/Accesalia. El valor 'caes' en tipo_concepto es solo el enganche;
--     la maquinaria se modela aparte.
--
-- - COMISIONES DE ADMINISTRADOR:
--     cantidad fija por proyecto (valor por defecto por administrador,
--     sobreescribible), para el futuro calculo de rentabilidad neta por
--     administrador. Ya existe administradores.comision_por_defecto y
--     proyectos.comision_administrador (Fase 1) como base.
--
-- - FACTURADOR POR DEFECTO DEL PAGADOR:
--     una contrata podria llevar una marca "factura siempre Daniel" (ej.
--     Schindler) para que el sistema SUGIERA el emisor y evite errores. No se
--     impone; el emisor lo decide una persona. Se anadira a contratas cuando se
--     construya la ayuda a la creacion de hojas.
--
-- - CAPA DE IA:
--     los campos fecha_estado, fecha_firma y el desglose de conceptos/cobros son
--     los enchufes para alertas (hojas sin firmar, hitos facturados sin cobrar,
--     analisis de rentabilidad por canal y por emisor).
--
-- - TRIGGER actualizado_en (heredado de Fase 1):
--     actualizado_en no se autoactualiza en UPDATE (seria logica de aplicacion).
--     PENDIENTE de decidir con la propietaria (trigger BEFORE UPDATE o gestion
--     desde la capa de aplicacion), de forma consistente en todo el esquema.
-- =============================================================================
