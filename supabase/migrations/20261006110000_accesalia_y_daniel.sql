-- ACCESALIA, Y DANIEL COMO QUIEN FIRMA           (Monica, 6-oct-2026)
--
-- Montando la trazabilidad de la viabilidad -"quien hizo la visita y el polycam,
-- quien la redacta, quien la remata con los precios y el texto, y quien la
-- firma"- salio que el firmante no se podia poner: `viabilidades.arquitecto_id`
-- apunta a `tecnicos`, y esa tabla estaba VACIA.
--
-- Y al ir a colgar su puesto salio otra: ACCESALIA NO EXISTIA COMO EMPRESA. En
-- `empresa` solo habia administraciones de fincas. Ella: "creamos Accesalia como
-- empresa, si, ademas luego la necesitaremos para mas cosas".
--
-- El tipo de empresa es "con quien tratamos" -administracion, ayuntamiento, ECU,
-- COAM, banco- y nosotros no somos un tercero, asi que se anade un valor.

alter table empresa drop constraint if exists empresa_tipo_check;
alter table empresa add constraint empresa_tipo_check check (tipo = any (array[
  'administracion_fincas', 'ayuntamiento', 'ecu', 'coam', 'banco', 'otra',
  'nosotros'  -- Accesalia. No es un tercero: es la casa.
]));

insert into empresa (nombre_accesalia, nombre_legal, tipo, activa, notas)
values ('ACCESALIA', 'ACCESALIA', 'nosotros', true,
        'La casa. De aqui cuelgan los puestos del equipo: quien redacta, quien remata y quien firma.')
on conflict do nothing;

-- DANIEL DE SOTO MARTIN-CARO. Propietario y administrador unico; la firma
-- electronica de la empresa sale con su nombre. Colegiado 24.103 del COAM; en
-- los demas colegios tiene numero de HABILITADO, que es otra cosa y por eso aqui
-- solo se guarda el del COAM.
update persona
   set apellidos = 'de Soto Martín-Caro',
       telefono_personal = '629264043'
 where id = 'eb3f5782-ba9c-4544-a7f2-b02228d69137';

insert into puesto (persona_id, empresa_id, cargo, numero_colegiado, desde)
select 'eb3f5782-ba9c-4544-a7f2-b02228d69137',
       (select id from empresa where tipo = 'nosotros' limit 1),
       'Arquitecto · administrador único',
       '24.103 (COAM)',
       null
where not exists (
  select 1 from puesto
   where persona_id = 'eb3f5782-ba9c-4544-a7f2-b02228d69137'
     and empresa_id = (select id from empresa where tipo = 'nosotros' limit 1));

-- Sus correos. El personal va aparte de los de empresa a proposito: "la agenda
-- es nombre, apellidos, telefono y mail", y el personal es suyo.
insert into correo (persona_id, email, etiqueta, principal)
select 'eb3f5782-ba9c-4544-a7f2-b02228d69137', c.email, c.etiqueta, c.principal
from (values
  ('dachomc@gmail.com', 'personal', false),
  ('daniel@accesalia.com', 'general', true),
  ('danieldesotoarquitecto@gmail.com', 'general', false),
  ('daniel.crm.accesalia@gmail.com', 'general', false)
) as c(email, etiqueta, principal)
where not exists (select 1 from correo x
                   where x.persona_id = 'eb3f5782-ba9c-4544-a7f2-b02228d69137'
                     and x.email = c.email);

-- Y su fila en `tecnicos`, que NO se jubila: le apuntan cuatro tablas
-- -requerimientos de obra, viabilidades, escaneos Polycam y modelos 3D- y es la
-- que llevara a los tecnicos de Accesalia cuando se modele esa parte. De momento
-- Daniel queda en tres sitios (equipo, persona y tecnicos); el dia que se modele,
-- lo limpio es que `tecnicos` lleve un persona_id y el nombre salga de la agenda.
insert into tecnicos (nombre, rol, email, telefono, numero_colegiado, activo)
select 'Daniel de Soto Martín-Caro', 'arquitecto', 'daniel@accesalia.com',
       '629264043', '24.103 (COAM)', true
where not exists (select 1 from tecnicos where email = 'daniel@accesalia.com');
