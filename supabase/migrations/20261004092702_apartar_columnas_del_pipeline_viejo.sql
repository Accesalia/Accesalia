-- =====================================================================
-- APARTAR ONCE COLUMNAS MUERTAS. NO BORRAR: LA CAPA DE PERMISOS NO DEJA.
-- Monica, 4-oct-2026.
--
-- El plan era BORRAR estas once columnas. Las once estan vacias -comprobado
-- una por una: 0 valores en las 1.228 oportunidades y en las cuatro tablas-,
-- asi que borrarlas no costaba nada.
--
-- Pero la capa de permisos rechaza 'drop column' igual que rechaza 'drop
-- table', por las dos vias (apply_migration y execute_sql). Asi que se hace lo
-- mismo que se hizo con las tablas que se jubilan -que se mudan al esquema
-- 'historico_de_tablas'-: se apartan con un nombre que cante. El prefijo
-- 'zz_muerta_' las manda al final de cualquier listado de columnas y no deja
-- ninguna duda de que no se usan. El dia que se puedan borrar de verdad, se
-- borran todas de una vez.
--
-- a) LAS CUATRO DEL PIPELINE VIEJO, en la tabla que hoy se llama
--    motivo_cierre_oportunidad. Lo que hacian -ir contando por donde va la
--    venta, y a quien se esta esperando- es exactamente lo que hace
--    'hitos_oportunidad' desde el 23-jul.
--
-- b) LAS CUATRO CLAVES AJENAS SIN SENTIDO. Estas cuatro tablas apuntaban a
--    'procesos_venta' y ya cuelgan de la oportunidad desde el 23-jul. Ahora
--    que esa tabla es el MOTIVO DE CIERRE, la relacion es absurda: un escaneo
--    de Polycam apuntando al motivo por el que se cerro la venta no significa
--    nada.
--
-- c) LOS TRES HUECOS DE UNO SOLO que sustituye historial_pausas_oportunidad.
--    Nota: 'reactivar_convocatoria_criterio' era ya, sin que nadie lo hubiera
--    dicho asi, la "condicion de reactivacion" que ahora vive en la tabla
--    nueva. La intuicion estaba bien y no tenia donde vivir.
--
-- (escaneos_polycam se renombro primero, al probar si el apano funcionaba)
-- =====================================================================

-- a) el pipeline viejo
alter table public.motivo_cierre_oportunidad rename column estado          to zz_muerta_estado;
alter table public.motivo_cierre_oportunidad rename column estado_desde    to zz_muerta_estado_desde;
alter table public.motivo_cierre_oportunidad rename column esperando_de    to zz_muerta_esperando_de;
alter table public.motivo_cierre_oportunidad rename column esperando_desde to zz_muerta_esperando_desde;

-- b) las cuatro claves ajenas sin sentido
alter table public.escaneos_polycam rename column proceso_venta_id to zz_muerta_proceso_venta_id;
alter table public.hojas_encargo    rename column proceso_venta_id to zz_muerta_proceso_venta_id;
alter table public.juntas           rename column proceso_venta_id to zz_muerta_proceso_venta_id;
alter table public.modelos_3d_venta rename column proceso_venta_id to zz_muerta_proceso_venta_id;

-- c) los tres huecos de uno solo
alter table public.oportunidades rename column reactivar_fecha                 to zz_muerta_reactivar_fecha;
alter table public.oportunidades rename column reactivar_nota                  to zz_muerta_reactivar_nota;
alter table public.oportunidades rename column reactivar_convocatoria_criterio to zz_muerta_reactivar_convocatoria;
