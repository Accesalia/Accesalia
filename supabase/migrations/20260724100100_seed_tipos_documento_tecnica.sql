-- =============================================================================
-- ERP Accesalia — Semilla de tipos_documento: catalogo TECNICO del proyecto
--
-- Derivado del expediente estandar real (reina5 3.PDF/COLEGIO numerado, validado
-- contra polvoranca18/camarena200/zamora1-3-5). Catalogo VIVO (se amplia).
--   - Planos por TIPO (no un unico "planos"): asi un RQ versiona SOLO el afectado
--     (p.ej. solo el plano de estructura) = "solo lo afectado".
--   - Seguridad y salud = una alternativa EBSS (basico, obra pequena) / EES (grande).
--   - IEE/LEE/CEE = tecnica pero pertenece_a la COMUNIDAD (reutilizables).
-- =============================================================================

insert into tipos_documento (nombre, aportado_por, caduca, pertenece_a, tipo_completitud, completitud_detalle) values
  -- --- Escritos del proyecto ---
  ('Memoria',                                        'accesalia', false, 'proyecto', 'simple',      null),
  ('Anejo a la memoria',                             'accesalia', false, 'proyecto', 'multiple',    null),
  ('Listado de planos',                              'accesalia', false, 'proyecto', 'simple',      null),
  ('Pliego de condiciones',                          'accesalia', false, 'proyecto', 'simple',      null),
  ('Estudio de seguridad y salud',                   'accesalia', false, 'proyecto', 'alternativa', '{"alternativas":["EBSS (basico, obra pequena)","EES (completo, obra grande)"]}'),
  ('Estudio de gestion de residuos',                 'accesalia', false, 'proyecto', 'simple',      null),
  ('Actuacion en caso de emergencia/siniestro',      'accesalia', false, 'proyecto', 'simple',      null),
  ('Instrucciones de uso y mantenimiento',           'accesalia', false, 'proyecto', 'simple',      null),
  ('Certificado de viabilidad geometrica y ordenacion urbanistica', 'accesalia', false, 'proyecto', 'simple', null),
  ('Hoja de datos urbanisticos',                     'accesalia', false, 'proyecto', 'simple',      null),
  ('Hoja de direccion de obra',                      'accesalia', false, 'proyecto', 'simple',      null),
  ('Compromiso de cartel de obra',                   'accesalia', false, 'proyecto', 'simple',      null),
  -- --- Mediciones y presupuesto ---
  ('Mediciones',                                     'accesalia', false, 'proyecto', 'simple',      null),
  ('Presupuesto',                                    'accesalia', false, 'proyecto', 'simple',      null),
  ('Resumen de presupuesto',                         'accesalia', false, 'proyecto', 'simple',      null),
  -- --- Planos (por tipo, para versionar solo el afectado) ---
  ('Plano de situacion/referencia',                  'accesalia', false, 'proyecto', 'simple',      null),
  ('Plano de estado actual',                         'accesalia', false, 'proyecto', 'simple',      null),
  ('Plano de arquitectura',                          'accesalia', false, 'proyecto', 'simple',      null),
  ('Plano de estructura',                            'accesalia', false, 'proyecto', 'simple',      null),
  ('Plano de instalaciones',                         'accesalia', false, 'proyecto', 'simple',      null),
  -- --- Tecnica del EDIFICIO (pertenece a la comunidad, reutilizable) ---
  ('IEE - Informe de Evaluacion del Edificio',       'accesalia', true,  'comunidad', 'simple',     null),
  ('LEE - Libro del Edificio Existente',             'accesalia', false, 'comunidad', 'partes',     null),
  ('CEE - Certificado de Eficiencia Energetica',     'accesalia', true,  'comunidad', 'simple',     null);
