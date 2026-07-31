-- =============================================================================
-- comunidad_admin_responsable: una comunidad puede estar en manos de VARIAS
-- personas de la misma casa.
--
-- La primera version exigia una sola fila vigente por comunidad, y eso mezclaba
-- dos reglas distintas:
--
--   una comunidad tiene UNA administracion   <- cierto, y hay que garantizarlo
--   una comunidad tiene UNA persona          <- FALSO
--
-- Casos reales: Castellon 1 la llevan Luis Carlos y Ana Rosa entre los dos, y
-- Alfredo Castro Camba 24 los dos socios de Del Brio. En Albufera 250, los tres
-- socios de MC Gestion comparten la mancomunidad.
--
-- Asi que la empresa pasa a estar SIEMPRE, y la persona es opcional:
--   empresa_id  no nulo  -> que casa la administra
--   puesto_id   opcional -> quien de esa casa, si se sabe; puede haber varios
--
-- Y dos reglas que ahora si dicen cada una lo suyo:
--   exclude  -> dos filas vigentes de la misma comunidad no pueden ser de
--               empresas distintas (una sola administracion)
--   unique   -> no repetir la misma persona dos veces en la misma comunidad
-- =============================================================================

create extension if not exists btree_gist;

-- primero se retira la regla vieja: mientras exista, no deja tener los dos
alter table comunidad_admin_responsable
  drop constraint if exists car_uno_u_otro_check;

-- la empresa se rellena tambien donde solo habia puesto: se saca de el
update comunidad_admin_responsable car
   set empresa_id = pu.empresa_id
  from puesto pu
 where car.puesto_id = pu.id and car.empresa_id is null;

alter table comunidad_admin_responsable
  alter column empresa_id set not null;

drop index if exists comunidad_admin_responsable_vigente_idx;

-- una sola administracion vigente por comunidad: varias filas si, pero todas
-- de la misma casa
alter table comunidad_admin_responsable
  add constraint car_una_sola_administracion
  exclude using gist (comunidad_id with =, empresa_id with <>) where (vigente);

-- y sin repetir persona. El coalesce cubre la fila "sabemos la casa, no la
-- persona": solo puede haber una de esas por comunidad.
create unique index comunidad_admin_responsable_persona_idx
  on comunidad_admin_responsable
     (comunidad_id, coalesce(puesto_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where vigente;

comment on column comunidad_admin_responsable.empresa_id is 'Que casa la administra. Siempre presente: es lo que nunca puede ser dos a la vez.';
comment on column comunidad_admin_responsable.puesto_id is 'Quien de esa casa la lleva. Puede haber VARIOS (dos socios que comparten la comunidad) o ninguno, si aun no lo sabemos.';
