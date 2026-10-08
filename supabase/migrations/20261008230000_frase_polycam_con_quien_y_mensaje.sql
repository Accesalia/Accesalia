-- =====================================================================
-- LA FRASE DEL POLYCAM: QUIEN LO MANDO Y LO QUE DIJO
-- Monica, 8-oct-2026.
--
-- El buzon de Polycam deja de escribir en interacciones (congelada) y pasa a
-- dejar la nota de Sali en el diario de la oportunidad, canal mail. Antes se
-- guardaba el cuerpo del correo con la nota; se sigue guardando, porque a veces
-- trae avisos ("el portal B no se pudo escanear").
-- =====================================================================

update public.plantillas_sali
   set plantilla = 'Recibido el escaneo Polycam[ de {donde}][ ({ficheros})][, enviado por {quien}].[ Dice: "{mensaje}"]'
 where clave = 'polycam_recibido';
