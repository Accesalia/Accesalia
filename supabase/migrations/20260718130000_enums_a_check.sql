-- =============================================================================
-- ERP Accesalia — Conversion de ENUMs (Fases 1 y 2) a text + CHECK constraints
--
-- Motivo: los enums de Postgres son costosos de editar (anadir/quitar/renombrar
-- un valor). Pasarlos a columnas text con check nombrado hace trivial editar la
-- lista de valores despues. Esta migracion NO cambia el modelo: solo cambia la
-- FORMA de restringir los valores.
--
-- EJECUTAR ANTES que la migracion de la Fase 3 (tramitacion tecnica).
--
-- Garantias:
--   - Se preservan los valores existentes (cada valor enum queda como el mismo
--     texto), la nulabilidad y los defaults.
--   - Cada columna queda como text con un check nombrado <tabla>_<columna>_check
--     que restringe exactamente a la lista de valores del enum original.
--   - Al final NO queda ninguno de los 18 tipos enum en la base de datos.
--
-- Patron por columna (con default, hay que quitarlo antes de castear y
-- volver a ponerlo como literal text):
--   alter table T alter column C drop default;                 -- solo si tenia default
--   alter table T alter column C type text using C::text;
--   alter table T alter column C set default '<valor>';        -- solo si tenia default
--   alter table T add constraint T_C_check check (C in (...));
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 0: quitar el check dependiente de una columna enum (pagador_tipo).
-- Se recrea al final, ya como comparacion de texto.
-- -----------------------------------------------------------------------------
alter table hojas_encargo drop constraint chk_hojas_encargo_pagador;


-- =============================================================================
-- PASO 1: conversion columna a columna
-- =============================================================================

-- --- Fase 1: nucleo + subvenciones ------------------------------------------

-- contratas.tipo (tipo_contrata)  [not null, sin default]
alter table contratas alter column tipo type text using tipo::text;
alter table contratas add constraint contratas_tipo_check
  check (tipo in ('obra_civil','ascensorista','sate','mixta','otra'));

-- proyectos.tipo_actuacion (tipo_actuacion)  [not null, sin default]
alter table proyectos alter column tipo_actuacion type text using tipo_actuacion::text;
alter table proyectos add constraint proyectos_tipo_actuacion_check
  check (tipo_actuacion in ('ascensor','rampa','sate_completo','sate_fachada','sate_cubierta','mixto','otra'));

-- proyectos.estado (estado_proyecto)  [not null, default 'captacion']
-- NOTA: la Fase 3 ampliara esta lista (visado, licencia_concedida, ...). Aqui se
-- deja con los 7 valores actuales.
alter table proyectos alter column estado drop default;
alter table proyectos alter column estado type text using estado::text;
alter table proyectos alter column estado set default 'captacion';
alter table proyectos add constraint proyectos_estado_check
  check (estado in ('captacion','en_redaccion','tramitando_licencia','en_obra','finalizado','parado','cancelado'));

-- proyecto_contratas.papel (papel_contrata)  [not null, sin default]
alter table proyecto_contratas alter column papel type text using papel::text;
alter table proyecto_contratas add constraint proyecto_contratas_papel_check
  check (papel in ('obra_civil','maquinaria_ascensor','sate','otro'));

-- documentos.estado_firma (estado_firma)  [not null, default 'no_aplica']
alter table documentos alter column estado_firma drop default;
alter table documentos alter column estado_firma type text using estado_firma::text;
alter table documentos alter column estado_firma set default 'no_aplica';
alter table documentos add constraint documentos_estado_firma_check
  check (estado_firma in ('no_aplica','generado','enviado_a_firma','devuelto_firmado','validado'));

-- tipos_documento.aportado_por (aportado_por)  [not null, sin default]
alter table tipos_documento alter column aportado_por type text using aportado_por::text;
alter table tipos_documento add constraint tipos_documento_aportado_por_check
  check (aportado_por in ('comunidad','accesalia','mixto_firma'));

-- tipos_documento.pertenece_a (nivel_documento)  [not null, sin default]
alter table tipos_documento alter column pertenece_a type text using pertenece_a::text;
alter table tipos_documento add constraint tipos_documento_pertenece_a_check
  check (pertenece_a in ('comunidad','proyecto'));

-- expedientes.estado (estado_expediente)  [not null, default 'preparando']
alter table expedientes alter column estado drop default;
alter table expedientes alter column estado type text using estado::text;
alter table expedientes alter column estado set default 'preparando';
alter table expedientes add constraint expedientes_estado_check
  check (estado in ('preparando','presentado','requerido','concedido','denegado','cobrado'));

-- requerimientos.estado (estado_requerimiento)  [not null, default 'pendiente']
alter table requerimientos alter column estado drop default;
alter table requerimientos alter column estado type text using estado::text;
alter table requerimientos alter column estado set default 'pendiente';
alter table requerimientos add constraint requerimientos_estado_check
  check (estado in ('pendiente','en_curso','respondido'));

-- --- Fase 2: facturacion -----------------------------------------------------

-- hojas_encargo.pagador_tipo (pagador_tipo)  [not null, sin default]
alter table hojas_encargo alter column pagador_tipo type text using pagador_tipo::text;
alter table hojas_encargo add constraint hojas_encargo_pagador_tipo_check
  check (pagador_tipo in ('comunidad','contrata'));

-- hojas_encargo.emisor (emisor_factura)  [not null, sin default]
alter table hojas_encargo alter column emisor type text using emisor::text;
alter table hojas_encargo add constraint hojas_encargo_emisor_check
  check (emisor in ('accesalia','daniel_autonomo'));

-- hojas_encargo.canal_tarifa (canal_tarifa)  [nullable, sin default]
alter table hojas_encargo alter column canal_tarifa type text using canal_tarifa::text;
alter table hojas_encargo add constraint hojas_encargo_canal_tarifa_check
  check (canal_tarifa in ('convenio_contratista','directo_comunidad','condiciones_especiales'));

-- hojas_encargo.estado (estado_hoja)  [not null, default 'borrador']
alter table hojas_encargo alter column estado drop default;
alter table hojas_encargo alter column estado type text using estado::text;
alter table hojas_encargo alter column estado set default 'borrador';
alter table hojas_encargo add constraint hojas_encargo_estado_check
  check (estado in ('borrador','enviada','firmada','en_curso','cerrada','anulada'));

-- conceptos_hoja.tipo_concepto (tipo_concepto)  [not null, sin default]
alter table conceptos_hoja alter column tipo_concepto type text using tipo_concepto::text;
alter table conceptos_hoja add constraint conceptos_hoja_tipo_concepto_check
  check (tipo_concepto in ('proyecto_tecnico','memoria_valorada','direccion_facultativa','coordinacion_ss','iee','lee','cee','tramitacion_subvenciones','documentacion_tecnica_subvencion','caes','otro'));

-- conceptos_hoja.subvencion_tipo_proyecto (tipo_proyecto_subv)  [nullable, sin default]
alter table conceptos_hoja alter column subvencion_tipo_proyecto type text using subvencion_tipo_proyecto::text;
alter table conceptos_hoja add constraint conceptos_hoja_subvencion_tipo_proyecto_check
  check (subvencion_tipo_proyecto in ('propio','externo'));

-- hitos_facturacion.disparador (disparador_hito)  [not null, sin default]
alter table hitos_facturacion alter column disparador type text using disparador::text;
alter table hitos_facturacion add constraint hitos_facturacion_disparador_check
  check (disparador in ('a_firma','a_entrega_proyecto','al_cfo','fecha_fija','a_exito_subvencion','otro'));

-- hitos_facturacion.estado (estado_hito)  [not null, default 'pendiente']
alter table hitos_facturacion alter column estado drop default;
alter table hitos_facturacion alter column estado type text using estado::text;
alter table hitos_facturacion alter column estado set default 'pendiente';
alter table hitos_facturacion add constraint hitos_facturacion_estado_check
  check (estado in ('pendiente','facturado','cobrado','parcialmente_cobrado','incobrable'));

-- cobros.metodo (metodo_cobro)  [nullable, sin default]
alter table cobros alter column metodo type text using metodo::text;
alter table cobros add constraint cobros_metodo_check
  check (metodo in ('cargo_cuenta','transferencia','efectivo','otro'));


-- =============================================================================
-- PASO 2: recrear el check del pagador (ahora comparacion de texto)
-- =============================================================================
alter table hojas_encargo add constraint chk_hojas_encargo_pagador
  check (
    (pagador_tipo = 'contrata'  and pagador_contrata_id is not null) or
    (pagador_tipo = 'comunidad' and pagador_contrata_id is null)
  );
comment on constraint chk_hojas_encargo_pagador on hojas_encargo is 'Coherencia pagador: contrata => pagador_contrata_id no nulo; comunidad => nulo.';


-- =============================================================================
-- PASO 3: eliminar los 18 tipos enum (ya no los usa ninguna columna)
-- =============================================================================
drop type tipo_contrata;
drop type tipo_actuacion;
drop type estado_proyecto;
drop type papel_contrata;
drop type estado_firma;
drop type aportado_por;
drop type nivel_documento;
drop type estado_expediente;
drop type estado_requerimiento;
drop type pagador_tipo;
drop type emisor_factura;
drop type canal_tarifa;
drop type estado_hoja;
drop type tipo_concepto;
drop type tipo_proyecto_subv;
drop type disparador_hito;
drop type estado_hito;
drop type metodo_cobro;

-- =============================================================================
-- FIN. Verificacion sugerida: no debe quedar ningun enum de los anteriores:
--   select typname from pg_type where typtype='e' and typname in (...);  -> 0 filas
-- =============================================================================
