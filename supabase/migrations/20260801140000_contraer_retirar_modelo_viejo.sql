-- =============================================================================
-- CONTRAER: se retira el modelo viejo
--
-- Tercera y ultima fase. Antes de esto:
--   - el modelo nuevo esta cargado y comprobado (274 empresas, 409 personas,
--     584 comunidades con administracion)
--   - las columnas nuevas conviven con las viejas y se han comparado una a una
--   - migracion_puente_modelo explica fila a fila que paso con cada registro
--     viejo, incluidas las que se quedan fuera y por que
--   - hay copia en C:\accesalia-fichas\_respaldo_modelo_2026-07-30
--
-- Que desaparece y por que:
--   contactos                mezclaba persona, empresa y comunidad en una fila.
--                            Sustituida por persona + puesto + correo.
--   administradores          la persona y su trabajo iban juntos, asi que al
--                            cambiar de casa se perdia el rastro. Ahora son
--                            persona (constante) y puesto (vivo).
--   administraciones_fincas  sustituida por empresa. Su titular_id se convirtio
--                            en el cargo del puesto, que es su sitio.
--
-- Las columnas viejas de las tablas que apuntaban a ellas se van tambien: su
-- equivalente ya esta relleno al lado.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. las columnas viejas. La nueva ya lleva el dato.
-- ---------------------------------------------------------------------------
alter table comunidades           drop column if exists administracion_id,
                                  drop column if exists administrador_id;
alter table acuerdos_comision     drop column if exists administracion_id,
                                  drop column if exists administrador_id;
alter table comisiones_proyecto   drop column if exists administracion_id,
                                  drop column if exists administrador_id;
alter table administracion_origen drop column if exists administracion_id,
                                  drop column if exists admin_referente_id;
alter table interacciones             drop column if exists administrador_id;
alter table tareas_seguimiento        drop column if exists administrador_id;
alter table oportunidades             drop column if exists administrador_id;
alter table resumenes_ia              drop column if exists administrador_id;
alter table beneficiarios_reparto_caes drop column if exists administrador_id;
alter table migracion_ficha           drop column if exists administracion_id;

-- ---------------------------------------------------------------------------
-- 2. las tablas viejas
-- ---------------------------------------------------------------------------
drop table if exists contactos;
drop table if exists administradores cascade;
drop table if exists administraciones_fincas cascade;

-- ---------------------------------------------------------------------------
-- 3. el puente se queda, pero sin claves ajenas a tablas que ya no existen.
--    Sirve para auditar la retirada; se borrara cuando nadie pregunte por ella.
-- ---------------------------------------------------------------------------
comment on table migracion_puente_modelo is 'Auditoria de la retirada del modelo viejo: que fila vieja fue a cual nueva y por que regla, incluidas las que quedaron fuera a proposito. Las tablas viejas ya no existen: esto es lo unico que queda de ellas.';
