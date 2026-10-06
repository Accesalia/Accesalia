-- Dos entradas de catalogo que faltaban, salidas de leer las hojas de encargo de
-- Drive (Monica, 6-oct-2026):
--
--   - Bloque "MEDICIONES Y CIEGO": encargo de toma de datos, mediciones y
--     presupuesto ciego (p. ej. FERENC PUSKAS 28, 1.650 + IVA). Texto de la hoja
--     real tal cual.
--   - Tipo de proyecto "Accesibilidad portal", dentro de Accesibilidad: la
--     remodelacion del portal "siempre hay rampa o escalon a salvar".
--
-- Para quitarlas sin borrar: activo = false.

insert into public.bloques (codigo, nombre, nombre_corto, desglose, naturaleza, orden, texto_plantilla)
select 'MEDICIONES Y CIEGO', 'MEDICIONES Y CIEGO', 'Mediciones y ciego', 'se_cobra', 'servicio',
       coalesce(max(orden), 0) + 1,
       E'MEDICIONES Y CIEGO\n• Visita a la Comunidad para toma de datos\n• Medición\n• Realización de fotografías\n• Redacción de informe de patologías\n• Mediciones y presupuesto ciego'
from public.bloques
where not exists (select 1 from public.bloques where codigo = 'MEDICIONES Y CIEGO');

insert into public.tipos_proyecto (clave, nombre, naturaleza, parent_id, orden, activo, elegible, contratable)
select 'accesibilidad_portal', 'Accesibilidad portal', 'proyecto', id, 85, true, true, true
from public.tipos_proyecto
where clave = 'accesibilidad'
  and not exists (select 1 from public.tipos_proyecto where clave = 'accesibilidad_portal');
