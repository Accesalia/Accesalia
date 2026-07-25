-- REVERTIR el seed de tipos_servicio (20260723255000): el pipeline COMERCIAL no
-- va por servicio (eso es procesos_venta, otro concepto). Ademas los valores de
-- negocio (empresa_gestora/es_arquitectura) estaban puestos a ojo. Se retiran.
-- El "que vendemos" sera un DATO de la oportunidad, no un flujo.

delete from tipos_servicio where codigo in (
  'proyecto_ascensor','proyecto_sate','proyecto_sate_cubierta','proyecto_accesibilidad',
  'bajada_cota_cero','rampa','plataforma','css','direccion_obra','memoria_valorada',
  'ite','subvencion','caes','tres_presupuestos'
);
