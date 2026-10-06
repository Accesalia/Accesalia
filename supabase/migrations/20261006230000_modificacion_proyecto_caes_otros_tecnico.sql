-- Tres entradas de catalogo salidas de leer las hojas de encargo de Drive (Monica,
-- 6-oct-2026):
--
--   - Bloque "MODIFICACION DE PROYECTO": sobre un proyecto que ya existe. El texto
--     de la linea lleva a mano la coletilla de lo que es: division, modificado,
--     nueva DR...
--   - Bloque "GESTION DE CAES". Criterio suyo: "¿la cobramos? linea que se cobra.
--     ¿No la cobramos? linea incluida. ¿No se menciona? no sale." Texto de la hoja
--     real (SONSOLES 4, Leganes).
--   - Tipo "Otros - proyecto tecnico", dentro de Otros: obras puntuales que no
--     merecen tipo propio ("crear todo un tipo para un caso particular no tiene
--     sentido"): rehabilitacion parcial, humedades, estructura...
--
-- Para quitarlas sin borrar: activo = false.

insert into public.bloques (codigo, nombre, nombre_corto, desglose, naturaleza, orden, texto_plantilla)
select v.codigo, v.nombre, v.corto, 'se_cobra', v.naturaleza, (select coalesce(max(orden), 0) from public.bloques) + v.n, v.texto
from (values
  (1, 'MODIFICACION DE PROYECTO', 'MODIFICACIÓN DE PROYECTO', 'Modificación de proyecto', 'proyecto',
   E'MODIFICACIÓN DE PROYECTO\n• Modificación del proyecto existente: '),
  (2, 'GESTION DE CAES', 'GESTIÓN DE CAES', 'Gestión de CAES', 'servicio',
   E'GESTIÓN DE CERTIFICADOS DE AHORRO ENERGÉTICO (CAES)\n• Asesoramiento y gestión administrativa para la obtención de los CAES.\n• Desarrollo de documentación y justificación técnica, incluido certificado de coeficientes por técnico responsable.')
) as v(n, codigo, nombre, corto, naturaleza, texto)
where not exists (select 1 from public.bloques b where b.codigo = v.codigo);

insert into public.tipos_proyecto (clave, nombre, naturaleza, parent_id, orden, activo, elegible, contratable)
select 'otros_proyecto_tecnico', 'Otros - proyecto técnico', 'proyecto', id, 185, true, true, true
from public.tipos_proyecto
where clave = 'otro'
  and not exists (select 1 from public.tipos_proyecto where clave = 'otros_proyecto_tecnico');
