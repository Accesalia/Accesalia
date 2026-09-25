-- Area de ADMINISTRACION (Monica, 25-sep-2026).
--
-- "Como minimo, en la ventana de botones inicial necesitare uno que diga Area
-- Administracion. Y dentro, un boton que sea Administradores de fincas y otro
-- que sea Comunidades de vecinos." Es lo primero que pediria el estudio para
-- poder trabajar de verdad: dar de alta y mantener los maestros.
--
-- NADA DE DATOS DE NEGOCIO AQUI: esto solo abre una puerta. No toca ninguna
-- comunidad ni ninguna administracion.
--
-- El acceso va por FUNCION, nunca por persona. Direccion (ve_todo) entra sola.

-- 1. El area
insert into areas (clave, nombre, descripcion, orden)
values ('administracion', 'Administracion',
        'Los maestros del estudio: administraciones de fincas y comunidades de vecinos. Consultar, abrir ficha, corregir y dar de alta.',
        30)
on conflict (clave) do nothing;

-- 2. Que funciones la abren, y con que nivel.
--    trabajar = consulta y mantiene los maestros.
--    ver      = los consulta, pero no los toca.
--
--    PENDIENTE DE CONFIRMAR CON MONICA la lista exacta: esto es una propuesta.
insert into funcion_areas (funcion_id, area_id, nivel)
select f.id, a.id, v.nivel
  from areas a
  join (values
          ('secretaria',            'trabajar'),  -- las chicas de administracion
          ('facturacion',           'trabajar'),
          ('subvenciones',          'trabajar'),
          ('visado_licencias',      'trabajar'),
          ('control_produccion',    'trabajar'),
          ('comercial',             'trabajar'),  -- dos caminos al mismo punto
          ('supervision_comercial', 'supervisar')
       ) as v(clave, nivel) on true
  join funciones f on f.clave = v.clave
 where a.clave = 'administracion'
on conflict (funcion_id, area_id) do nothing;
