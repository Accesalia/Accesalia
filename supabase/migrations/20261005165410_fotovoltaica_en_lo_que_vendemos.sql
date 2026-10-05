-- YA APLICADA el 5-oct-2026 por el MCP. NO volver a ejecutar.
--
-- FOTOVOLTAICA, A LO QUE VENDEMOS. Salio leyendo Arroyomolinos (Cantabria 16,
-- "SATE + FV") y no existia. Mismo caso que la aerotermia: obra de Eficiencia
-- energetica, mismas subvenciones (Next Gen), y contratable.
insert into public.tipos_proyecto (clave, nombre, naturaleza, parent_id, orden, activo, elegible, contratable)
select 'fotovoltaica', 'Fotovoltaica', 'proyecto', p.id, 137, true, true, true
from public.tipos_proyecto p
where p.clave = 'eficiencia_energetica'
  and not exists (select 1 from public.tipos_proyecto where clave = 'fotovoltaica');
