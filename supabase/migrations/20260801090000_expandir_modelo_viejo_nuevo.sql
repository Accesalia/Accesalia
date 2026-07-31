-- =============================================================================
-- EXPANDIR: el modelo nuevo al lado del viejo, sin borrar nada
--
-- Primera de las tres fases (expandir -> migrar -> contraer). Aqui NO se pierde
-- una sola fila: se anaden columnas nuevas junto a las viejas y se rellenan.
-- Asi los dos vinculos conviven y se pueden comparar antes de retirar el viejo.
--
-- El puente queda escrito en una tabla, no dentro de un join: hay que poder
-- auditarlo, y decir de cada correspondencia COMO se hizo.
--
-- Mapeos:
--   administraciones_fincas -> empresa   por nombre normalizado
--   administradores         -> puesto    por correo (exacto), si no por nombre
--                                        dentro de su administracion
-- =============================================================================

create table if not exists migracion_puente_modelo (
  id            uuid        primary key default gen_random_uuid(),
  creado_en     timestamptz not null default now(),
  tabla_vieja   text        not null,
  id_viejo      uuid        not null,
  nombre_viejo  text,
  tabla_nueva   text,
  id_nuevo      uuid,
  nombre_nuevo  text,
  como_caso     text,
  constraint puente_modelo_unico unique (tabla_vieja, id_viejo)
);
comment on table migracion_puente_modelo is 'Que fila vieja se corresponde con cual nueva, y por que regla. Se guarda para poder auditar la retirada del modelo viejo; se borra cuando ya no haga falta.';

alter table migracion_puente_modelo enable row level security;

-- ---------------------------------------------------------------------------
-- administraciones_fincas -> empresa
-- ---------------------------------------------------------------------------
insert into migracion_puente_modelo (tabla_vieja, id_viejo, nombre_viejo, tabla_nueva, id_nuevo, nombre_nuevo, como_caso)
select 'administraciones_fincas', a.id, a.nombre, 'empresa', em.id, em.nombre_accesalia, 'nombre normalizado'
  from administraciones_fincas a
  join empresa em on regexp_replace(upper(translate(em.nombre_accesalia,'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNAEIOUUN')),'[^A-Z0-9]','','g')
                   = regexp_replace(upper(translate(a.nombre,'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNAEIOUUN')),'[^A-Z0-9]','','g')
on conflict (tabla_vieja, id_viejo) do nothing;

-- las que no casan tambien se anotan: sin fila no se sabria que quedaron fuera
insert into migracion_puente_modelo (tabla_vieja, id_viejo, nombre_viejo, como_caso)
select 'administraciones_fincas', a.id, a.nombre, 'sin correspondencia'
  from administraciones_fincas a
on conflict (tabla_vieja, id_viejo) do nothing;

-- ---------------------------------------------------------------------------
-- administradores -> puesto. El correo manda: identifica mejor que el nombre.
-- ---------------------------------------------------------------------------
insert into migracion_puente_modelo (tabla_vieja, id_viejo, nombre_viejo, tabla_nueva, id_nuevo, nombre_nuevo, como_caso)
select distinct on (ad.id) 'administradores', ad.id, ad.nombre, 'puesto', c.puesto_id,
       (select pe.nombre from puesto pu join persona pe on pe.id=pu.persona_id where pu.id=c.puesto_id),
       'correo exacto'
  from administradores ad
  join correo c on lower(btrim(c.direccion)) = lower(btrim(ad.email)) and c.puesto_id is not null
 where coalesce(ad.email,'') <> ''
on conflict (tabla_vieja, id_viejo) do nothing;

insert into migracion_puente_modelo (tabla_vieja, id_viejo, nombre_viejo, tabla_nueva, id_nuevo, nombre_nuevo, como_caso)
select distinct on (ad.id) 'administradores', ad.id, ad.nombre, 'puesto', pu.id, pe.nombre,
       'nombre dentro de su administracion'
  from administradores ad
  join migracion_puente_modelo p on p.tabla_vieja='administraciones_fincas'
                                and p.id_viejo = ad.administracion_id and p.id_nuevo is not null
  join puesto pu on pu.empresa_id = p.id_nuevo
  join persona pe on pe.id = pu.persona_id
 where regexp_replace(upper(translate(pe.nombre,'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNAEIOUUN')),'[^A-Z0-9]','','g')
     = regexp_replace(upper(translate(ad.nombre,'ÁÉÍÓÚÜÑáéíóúüñ','AEIOUUNAEIOUUN')),'[^A-Z0-9]','','g')
on conflict (tabla_vieja, id_viejo) do nothing;

insert into migracion_puente_modelo (tabla_vieja, id_viejo, nombre_viejo, como_caso)
select 'administradores', ad.id, ad.nombre, 'sin correspondencia' from administradores ad
on conflict (tabla_vieja, id_viejo) do nothing;

-- ---------------------------------------------------------------------------
-- las columnas nuevas, AL LADO de las viejas. Nada se borra todavia.
-- ---------------------------------------------------------------------------
alter table acuerdos_comision      add column if not exists empresa_id uuid references empresa(id);
alter table acuerdos_comision      add column if not exists puesto_id  uuid references puesto(id);
alter table comisiones_proyecto    add column if not exists empresa_id uuid references empresa(id);
alter table comisiones_proyecto    add column if not exists puesto_id  uuid references puesto(id);
alter table administracion_origen  add column if not exists empresa_id uuid references empresa(id);
alter table administracion_origen  add column if not exists puesto_id  uuid references puesto(id);
alter table interacciones          add column if not exists puesto_id  uuid references puesto(id);
alter table tareas_seguimiento     add column if not exists puesto_id  uuid references puesto(id);
alter table oportunidades          add column if not exists puesto_id  uuid references puesto(id);
alter table resumenes_ia           add column if not exists puesto_id  uuid references puesto(id);
alter table beneficiarios_reparto_caes add column if not exists puesto_id uuid references puesto(id);
alter table migracion_ficha        add column if not exists empresa_id uuid references empresa(id);

-- ---------------------------------------------------------------------------
-- rellenar desde el puente
-- ---------------------------------------------------------------------------
update acuerdos_comision t set empresa_id = p.id_nuevo from migracion_puente_modelo p
 where p.tabla_vieja='administraciones_fincas' and p.id_viejo=t.administracion_id and p.id_nuevo is not null;
update acuerdos_comision t set puesto_id = p.id_nuevo from migracion_puente_modelo p
 where p.tabla_vieja='administradores' and p.id_viejo=t.administrador_id and p.id_nuevo is not null;
update comisiones_proyecto t set empresa_id = p.id_nuevo from migracion_puente_modelo p
 where p.tabla_vieja='administraciones_fincas' and p.id_viejo=t.administracion_id and p.id_nuevo is not null;
update comisiones_proyecto t set puesto_id = p.id_nuevo from migracion_puente_modelo p
 where p.tabla_vieja='administradores' and p.id_viejo=t.administrador_id and p.id_nuevo is not null;
update administracion_origen t set empresa_id = p.id_nuevo from migracion_puente_modelo p
 where p.tabla_vieja='administraciones_fincas' and p.id_viejo=t.administracion_id and p.id_nuevo is not null;
update administracion_origen t set puesto_id = p.id_nuevo from migracion_puente_modelo p
 where p.tabla_vieja='administradores' and p.id_viejo=t.admin_referente_id and p.id_nuevo is not null;
update interacciones t set puesto_id = p.id_nuevo from migracion_puente_modelo p
 where p.tabla_vieja='administradores' and p.id_viejo=t.administrador_id and p.id_nuevo is not null;
update tareas_seguimiento t set puesto_id = p.id_nuevo from migracion_puente_modelo p
 where p.tabla_vieja='administradores' and p.id_viejo=t.administrador_id and p.id_nuevo is not null;
update oportunidades t set puesto_id = p.id_nuevo from migracion_puente_modelo p
 where p.tabla_vieja='administradores' and p.id_viejo=t.administrador_id and p.id_nuevo is not null;
update resumenes_ia t set puesto_id = p.id_nuevo from migracion_puente_modelo p
 where p.tabla_vieja='administradores' and p.id_viejo=t.administrador_id and p.id_nuevo is not null;
update beneficiarios_reparto_caes t set puesto_id = p.id_nuevo from migracion_puente_modelo p
 where p.tabla_vieja='administradores' and p.id_viejo=t.administrador_id and p.id_nuevo is not null;
update migracion_ficha t set empresa_id = p.id_nuevo from migracion_puente_modelo p
 where p.tabla_vieja='administraciones_fincas' and p.id_viejo=t.administracion_id and p.id_nuevo is not null;

-- ---------------------------------------------------------------------------
-- el titular: en el modelo viejo era una columna de la administracion; aqui es
-- el cargo de su puesto, que es donde tiene sentido.
-- ---------------------------------------------------------------------------
update puesto pu set cargo = 'titular'
  from administraciones_fincas a
  join migracion_puente_modelo p on p.tabla_vieja='administradores' and p.id_viejo = a.titular_id
 where pu.id = p.id_nuevo and pu.cargo is null;
