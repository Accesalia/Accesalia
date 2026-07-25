-- =============================================================================
-- ERP Accesalia — bloques.naturaleza: proyecto / servicio / documento_tecnico
--
-- La propietaria distingue (2026-07-21):
--   · PROYECTO  = requiere arquitecto (planos, mediciones, memorias).
--   · SERVICIO  = no lo requiere (DF, CSS, tramitaciones...), aunque vaya
--                 asociado a un proyecto. Se marca APARTE en la hoja porque a
--                 veces se renuncia a uno (p.ej. la DF) y solo se ejecuta el
--                 proyecto.
--   · DOCUMENTO_TECNICO = activo del edificio, reutilizable (IEE/LEE/CEE/pericial),
--                 ver criterio "documentacion-tecnica-edificio".
-- Los PAQUETES (es_paquete=true) son compuestos (proyecto + servicio + rebaja):
-- se quedan sin naturaleza; se descomponen al generarlos.
-- =============================================================================

alter table bloques
  add column naturaleza text
  check (naturaleza in ('proyecto', 'servicio', 'documento_tecnico'));

comment on column bloques.naturaleza is 'Clasifica el concepto: proyecto (requiere arquitecto), servicio (no), documento_tecnico (activo del edificio, reutilizable). NULL en paquetes (compuestos).';

-- Proyecto: llevan tecnico/arquitecto.
update bloques set naturaleza = 'proyecto'
  where codigo in ('REDACCION PROYECTO', 'MEMORIA TECNICA');

-- Documento tecnico: activos del edificio, reutilizables.
update bloques set naturaleza = 'documento_tecnico'
  where codigo in ('IEE', 'LEE', 'CEE', 'INFORME PERICIAL');

-- Servicio: el resto de conceptos atomicos.
update bloques set naturaleza = 'servicio'
  where codigo in (
    'TOMA DE DATOS Y MODELADO 3D',   -- preventa/fase comercial, normalmente gratis
    'TRAMITACION LICENCIAS',
    'TRAMITACION 3 PRESUPUESTOS',
    'CERTIFICADO FIN DE OBRA',        -- depende de la DF (no aislado)
    'CSS',
    'DF',
    'TRAMITACION SUBVENCIONES ACCESIBILIDAD',
    'TRAMITACION SUBVENCIONES EFICIENCIA ENERGETICA',
    'CONSULTA URBANISTICA',
    'SOLICITUD DE FINANCIACION'
  );

-- Los dos paquetes SATE (con cesion de CAES) quedan con naturaleza NULL: son la
-- mezcla de un proyecto (SATE / SATE+asc) + el servicio de cesion de CAES + rebaja.
