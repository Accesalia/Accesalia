-- =============================================================================
-- ERP Accesalia — Reconciliacion del modelo de comisiones
--
-- Unifica el modelo de comisiones (administrador y contrata) en un unico marco
-- con dimension beneficiario, y coloca el valor real por proyecto en el vinculo
-- correspondiente. Sustituye el marco simple de la fase comercial.
--
-- Cambios:
--   1. Crea acuerdos_comision (marco unico, una fila por base pactada) con
--      beneficiario (administrador | contrata) y su FK.
--   2. Migra las filas de acuerdos_comision_administrador (porcentaje_habitual ->
--      fila base_calculo='por_proyecto', beneficiario='administrador') y ELIMINA
--      acuerdos_comision_administrador y acuerdos_comision_excepcion.
--   3. Anade a proyecto_contratas los campos economicos de la comision de contrata
--      (valor real por proyecto, analogo a proyectos.comision_administrador).
--   4. Redefine el papel (via comment) de proyectos.comision_administrador:
--      comision REAL aplicada al proyecto (fuente de verdad de lo pagado por
--      proyecto); el marco (acuerdos_comision) es la referencia.
--   5. Anade administradores.notas_comision (compensacion arrastrada, a mano).
--
-- SENTIDO DEL DINERO (importante, no confundir quien debe a quien):
--   - beneficiario='administrador' -> comision que Accesalia PAGA (dinero SALIENTE:
--     se la debemos por traernos la obra).
--   - beneficiario='contrata'      -> comision que Accesalia COBRA (dinero ENTRANTE:
--     el ~3% que nos paga la contrata adjudicataria).
--   Mismo patron estructural, flujo opuesto.
--
-- Convenciones habituales: espanol sin tildes/enes; SIN ENUMS (text + CHECK
-- nombrado); RLS sin politicas; trigger actualizado_en reutilizado.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Nuevo marco unico: acuerdos_comision
-- -----------------------------------------------------------------------------
create table acuerdos_comision (
  id                uuid        primary key default gen_random_uuid(),
  creado_en         timestamptz not null default now(),
  actualizado_en    timestamptz not null default now(),
  beneficiario      text        not null,
  administrador_id  uuid        references administradores (id),
  contrata_id       uuid        references contratas (id),
  base_calculo      text        not null,
  tipo_servicio_id  uuid        references tipos_servicio (id),
  importe           numeric,
  porcentaje        numeric,
  vigente           boolean     not null default true,
  notas             text,
  constraint acuerdos_comision_beneficiario_check
    check (beneficiario in ('administrador','contrata')),
  constraint acuerdos_comision_base_calculo_check
    check (base_calculo in ('por_proyecto','por_tipo_proyecto','por_pem','por_servicio')),
  -- Coherencia beneficiario <-> FK: exactamente la FK que corresponde, y la otra nula.
  constraint acuerdos_comision_beneficiario_fk_check
    check (
      (beneficiario = 'administrador' and administrador_id is not null and contrata_id is null) or
      (beneficiario = 'contrata'      and contrata_id is not null and administrador_id is null)
    )
);

comment on table acuerdos_comision is 'Marco unico de comisiones (referencia, no liquidacion). Una fila por base pactada (tipicamente proyecto y subvencion). Sirve para AMBOS beneficiarios via la dimension beneficiario, evitando dos tablas gemelas. El valor REAL por proyecto vive en el vinculo (proyectos.comision_administrador para administrador; proyecto_contratas para contrata).';
comment on column acuerdos_comision.beneficiario is 'administrador = comision que Accesalia PAGA (saliente, se la debemos por traer la obra). contrata = comision que Accesalia COBRA (entrante, el ~3% que nos paga la adjudicataria). Mismo patron, flujo opuesto.';
comment on column acuerdos_comision.administrador_id is 'FK cuando beneficiario=administrador (excluyente con contrata_id, garantizado por check).';
comment on column acuerdos_comision.contrata_id is 'FK cuando beneficiario=contrata (excluyente con administrador_id, garantizado por check).';
comment on column acuerdos_comision.base_calculo is 'Sobre que se pacta: por_proyecto, por_tipo_proyecto, por_pem (% del presupuesto de ejecucion material), por_servicio.';
comment on column acuerdos_comision.tipo_servicio_id is 'Si la base es por_servicio (o para acotar el acuerdo a un servicio concreto), a que tipo de servicio aplica.';
comment on column acuerdos_comision.importe is 'Importe fijo pactado, si aplica (excluyente/complementario con porcentaje segun el acuerdo).';
comment on column acuerdos_comision.porcentaje is 'Porcentaje pactado, si aplica.';

create index idx_acuerdos_comision_administrador_id on acuerdos_comision (administrador_id);
create index idx_acuerdos_comision_contrata_id      on acuerdos_comision (contrata_id);
create index idx_acuerdos_comision_tipo_servicio_id on acuerdos_comision (tipo_servicio_id);


-- -----------------------------------------------------------------------------
-- 2. Migrar datos del marco antiguo y eliminar las tablas viejas
--    (acuerdos_comision_excepcion primero: referencia a acuerdos_comision_administrador)
-- -----------------------------------------------------------------------------
-- El porcentaje_habitual del marco simple se absorbe como fila por_proyecto.
-- negociado_por (texto) se conserva dentro de notas para no perderlo.
insert into acuerdos_comision
  (creado_en, actualizado_en, beneficiario, administrador_id, base_calculo, porcentaje, vigente, notas)
select
  creado_en, actualizado_en, 'administrador', administrador_id, 'por_proyecto',
  porcentaje_habitual, vigente,
  nullif(trim(concat_ws(' | ', notas,
    case when negociado_por is not null then 'negociado por: ' || negociado_por end)), '')
from acuerdos_comision_administrador;

drop table acuerdos_comision_excepcion;
drop table acuerdos_comision_administrador;


-- -----------------------------------------------------------------------------
-- 3. Valor real de la comision de contrata en el vinculo proyecto_contratas
-- -----------------------------------------------------------------------------
alter table proyecto_contratas
  add column comision_porcentaje_aplicado  numeric,
  add column comision_importe              numeric,
  add column comision_estado_cobro         text not null default 'no_aplica',
  add column comision_motivo_desviacion    text;

alter table proyecto_contratas
  add constraint proyecto_contratas_comision_estado_cobro_check
    check (comision_estado_cobro in ('no_aplica','pendiente','cobrada','cobrada_parcial','reducida','impagada'));

comment on column proyecto_contratas.comision_porcentaje_aplicado is 'Porcentaje real que aplico esta contrata en este proyecto. Puede diferir del marco (~3%): en obra grande baja. Nullable.';
comment on column proyecto_contratas.comision_importe is 'Importe real de la comision, calculado sobre el PEM de esta adjudicacion. Nullable.';
comment on column proyecto_contratas.comision_estado_cobro is 'Estado del cobro de la comision de contrata. no_aplica = no se cobra nada de esta contrata en este proyecto. Materia prima para que la IA detecte contratas que esquivan el 3%.';
comment on column proyecto_contratas.comision_motivo_desviacion is 'Texto libre: por que se desvio del marco ("puso pegas", "se le olvido incluirlo en el presupuesto", "obra grande, % reducido").';

create index idx_proyecto_contratas_comision_estado_cobro on proyecto_contratas (comision_estado_cobro);


-- -----------------------------------------------------------------------------
-- 4. Redefinir el papel de proyectos.comision_administrador (solo comentario)
-- -----------------------------------------------------------------------------
comment on column proyectos.comision_administrador is 'Comision REAL aplicada a ESTE proyecto (fuente de verdad de lo pagado al administrador por proyecto). Hereda por defecto del marco (acuerdos_comision, beneficiario=administrador), ajustable puntualmente (obra grande -> puede dispararse). El marco es la referencia; este campo es lo realmente aplicado.';


-- -----------------------------------------------------------------------------
-- 5. Compensacion arrastrada del administrador (texto libre, se cuadra a mano)
-- -----------------------------------------------------------------------------
alter table administradores
  add column notas_comision text;

comment on column administradores.notas_comision is 'Compensacion arrastrada de comisiones del administrador (texto libre, se cuadra a mano). Ej. saldos pendientes que se compensan entre obras.';

-- Nota: administradores.comision_por_defecto (Fase 1) queda como TERCER sitio
-- orientativo que se solapa con el marco. Candidato a limpiar mas adelante (no
-- urgente): decidir si se elimina y se deja solo el marco + el valor real.
comment on column administradores.comision_por_defecto is 'ORIENTATIVA (Fase 1). Candidata a limpiar: ahora el marco vive en acuerdos_comision y el valor real en proyectos.comision_administrador; esta columna es un tercer sitio que se solapa.';


-- -----------------------------------------------------------------------------
-- 6. RLS + trigger actualizado_en para la tabla nueva
-- -----------------------------------------------------------------------------
alter table acuerdos_comision enable row level security;

create trigger trg_set_actualizado_en
  before update on acuerdos_comision
  for each row execute function set_actualizado_en();


-- =============================================================================
-- 7. PENDIENTES / FUERA DE ALCANCE (anotados)
--
-- - LIQUIDACION DE PAGOS SALIENTES:
--     esta migracion registra el PACTO (acuerdos_comision) y el ESTADO de cada
--     comision (proyecto_contratas.comision_estado_cobro, y por proyecto el valor
--     real). La LIQUIDACION efectiva de lo que Accesalia PAGA (comision al
--     administrador, comision al comercial) NO existe como tabla para nadie: los
--     "cobros" (entrantes) si estan en facturacion, pero no hay "pagos" salientes.
--     Vive en la fase de facturacion con emisor Ecobalance. PENDIENTE de construir.
--
-- - MODULO DE LICITACION (fase propia, no construida aqui — falta su spec):
--     licitaciones, presupuestos con rol preferida/palanca y origen, contactos de
--     contrata, ficha comercial de contrata. La comision de contrata que aqui se
--     modela (marco + valor real en proyecto_contratas) es la pieza economica que
--     ese modulo usara. Facturado por Ecobalance.
--
-- - LIMPIEZA de administradores.comision_por_defecto: ver nota arriba.
-- =============================================================================
