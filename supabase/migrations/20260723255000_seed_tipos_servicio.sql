-- SEMILLA del catalogo tipos_servicio (estaba vacio; el pipeline lo necesita para
-- "arrancar proceso"). Codigos y regla empresa_gestora tomados del comment de la
-- propia tabla (accesalia=arquitectura; ecobalance=subvenciones/CAES/comisiones).
-- Es un catalogo EDITABLE de partida: revisar nombres/empresa/es_arquitectura.
-- Idempotente por codigo.

insert into tipos_servicio (codigo, nombre, empresa_gestora, es_arquitectura) values
  ('proyecto_ascensor',       'Proyecto de ascensor',                'accesalia',  true),
  ('proyecto_sate',           'Proyecto SATE',                       'accesalia',  true),
  ('proyecto_sate_cubierta',  'Proyecto SATE + cubierta',            'accesalia',  true),
  ('proyecto_accesibilidad',  'Proyecto de accesibilidad',           'accesalia',  true),
  ('bajada_cota_cero',        'Bajada a cota cero',                  'accesalia',  true),
  ('rampa',                   'Rampa',                               'accesalia',  true),
  ('plataforma',              'Plataforma elevadora',                'accesalia',  true),
  ('css',                     'Coordinacion de Seguridad y Salud',   'accesalia',  true),
  ('direccion_obra',          'Direccion de obra',                   'accesalia',  true),
  ('memoria_valorada',        'Memoria valorada',                    'accesalia',  true),
  ('ite',                     'ITE / IEE',                           'accesalia',  true),
  ('subvencion',              'Tramitacion de subvencion',           'ecobalance', false),
  ('caes',                    'CAES (ahorro energetico)',            'ecobalance', false),
  ('tres_presupuestos',       'Tres presupuestos',                   'ecobalance', false)
on conflict (codigo) do nothing;
