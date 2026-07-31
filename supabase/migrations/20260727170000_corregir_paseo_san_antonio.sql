-- =============================================================================
-- Corrige la direccion de PASEO SAN ANTONIO 4 FUENLABRADA.
--
-- El item de Monday 1967643683 se llama "PASEO SAN ANTONIO 4 FUENLABRADA" y el
-- campo `nombre` lo recogio bien, pero la `direccion` quedo como "3". Por eso
-- aparecian dos comunidades disputandose la carpeta `paseosanantonio3`, cuando
-- en Dropbox existen por separado paseosanantonio3, 4, 5 y 6.
--
-- Se identifica por el item de Monday, no por el texto, que es justo lo que
-- estaba mal.
-- =============================================================================

update comunidades c
   set direccion = 'PASEO SAN ANTONIO 4 FUENLABRADA'
  from migracion_monday m
 where m.registro_id = c.id
   and m.tabla_destino = 'comunidades'
   and m.monday_item_id = '1967643683'
   and c.direccion = 'PASEO SAN ANTONIO 3 FUENLABRADA';
