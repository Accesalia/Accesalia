-- Sustitucion de ascensor (Monica, 11-oct-2026): encargo habitual sin sitio en el
-- catalogo. Bajo Accesibilidad > Modificacion asc., como cambio de puertas o
-- cota cero: pide las subvenciones de accesibilidad, no las de ascensor nuevo.
insert into tipos_proyecto (clave, nombre, naturaleza, parent_id, orden, activo, elegible, contratable)
select 'sustitucion_ascensor', 'Sustitución de ascensor', 'proyecto', id, 75, true, true, true
from tipos_proyecto where clave = 'modificacion_asc'
on conflict do nothing;
