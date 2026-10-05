-- YA APLICADA el 5-oct-2026 por el MCP. NO volver a ejecutar.
--
-- AEROTERMIA, A LO QUE VENDEMOS. Salio leyendo Villafranca del Castillo
-- (castillodemalpica32): "SATE con AEROTERMIA", y la aerotermia no existia en el
-- catalogo. Monica: "acabamos de detectar un bug, y es importante: van a venir
-- MUCHISIMOS proyectos con esto (y hay muchos tambien que lo tienen ya)".
--
-- Va como obra de Eficiencia energetica, al lado de los tres SATE: la jerarquia
-- es el filtro de subvenciones, y la aerotermia va a las mismas (Next Gen,
-- eficiencia). Elegible y contratable: es algo que un cliente pide.
insert into public.tipos_proyecto (clave, nombre, naturaleza, parent_id, orden, activo, elegible, contratable)
select 'aerotermia', 'Aerotermia', 'proyecto', p.id, 135, true, true, true
from public.tipos_proyecto p
where p.clave = 'eficiencia_energetica'
  and not exists (select 1 from public.tipos_proyecto where clave = 'aerotermia');
