-- YA APLICADA el 5-oct-2026 por el MCP (version 20261005075228). NO volver a ejecutar.
--
-- =====================================================================
-- LAS PERSONAS DE LAS CONTRATAS PASAN A LA AGENDA UNICA
-- Monica, 5-oct-2026. Salio leyendo la ficha de Fresnedillas de la Oliva
-- (granjadesanantonio7): la oportunidad la trae Belen Lopez, de DIDEPRO, y
-- 'oportunidades.quien_lo_trae' solo puede apuntar a 'persona'. Belen vivia en
-- 'contrata_personas', otro mundo. Ella: "no dejamos deuda tecnica. El objetivo
-- de estos barridos, ademas de cargar los datos, es detectar estos gaps y
-- aprovechar a corregirlos".
--
-- LO QUE CAMBIA Y LO QUE NO:
--   * Las CONTRATAS siguen siendo un mundo aparte como empresas. No se tocan.
--   * Sus PERSONAS pasan a la agenda unica (persona), como se decidio el 4-oct:
--     "una agenda de contactos personales, sea quien sea".
--   * Sus etapas en cada contrata pasan a 'puesto', que gana 'contrata_id'.
--
-- TELEFONOS Y CORREOS, AL PUESTO. Ella: "los telefonos y correos son del
-- puesto salvo que expresamente se diga lo contrario. Lo normal es que tengamos
-- datos del PUESTO; lo excepcional, datos personales: son relaciones laborales,
-- no amigos". Y: "muchas empresas usan correo de gmail (Accesalia por
-- ejemplo)". Asi que el telefono y el correo que estaban en la persona van a su
-- puesto VIGENTE; si ya no tiene ninguno, al ULTIMO (donde estaba al apuntarlo).
--
-- 'pendiente' -> notas, con la etiqueta PENDIENTE: "'falta saber X' es una
-- nota, no un dato de la persona".
--
-- Dos casos con nombre:
--   * Andres Heras: socio de ENGWE hasta mayo de 2025 (fecha suya). "Lo que se
--     marco como cuidado era la EMPRESA. Andres se ha desvinculado de ella y
--     ahora trabajamos con el. Por eso empresa y persona tienen notas separadas."
--   * Felix Urena, de URVALL: la advertencia viaja con la persona, "o cuando nos
--     vuelva a llamar a pedir algo, nadie sabra que era persona non grata".
--
-- 'contrata_contactos' (la version anterior, 116 filas) NO se renombra todavia:
-- la pantalla de alta de oportunidad aun escribe ahi. Sus personas ya estan
-- todas en contrata_personas; los 5 correos que solo tenia ella pasan al puesto.
--
-- Las tablas viejas no se borran: se renombran a zz_muerta_ como respaldo.
-- =====================================================================

-- 1 · el puesto puede ser en una contrata
alter table public.puesto add column contrata_id uuid references public.contratas(id);
alter table public.puesto add constraint puesto_contrata_en_un_solo_sitio check (
  contrata_id is null or (empresa_id is null and departamento_id is null and figura_legal_propietaria_id is null));
create index puesto_por_contrata on public.puesto (contrata_id) where contrata_id is not null;
comment on column public.puesto.contrata_id is
  'Si el puesto es en una contrata (empresa que hace la obra). Excluyente con empresa/departamento (administraciones) y con figura legal.';

-- 2 · las personas, a la agenda
create temp table _mapa_persona on commit drop as
  select id as viejo, gen_random_uuid() as nuevo from public.contrata_personas;

insert into public.persona (id, nombre, apellidos, activa, notas, creado_en)
select m.nuevo, cp.nombre, cp.apellidos, true,
       case when cp.pendiente is not null then 'PENDIENTE: ' || cp.pendiente end,
       cp.creado_en
from public.contrata_personas cp join _mapa_persona m on m.viejo = cp.id;

-- 3 · sus puestos. 'el_suyo' = el puesto que se queda el telefono/correo que
--     estaba en la persona: el vigente, y si no hay, el ultimo.
create temp table _mapa_puesto on commit drop as
  select x.id as viejo, gen_random_uuid() as nuevo,
         row_number() over (partition by x.persona_id
                            order by (x.hasta is null) desc, x.hasta desc nulls first,
                                     x.desde desc nulls last, x.creado_en desc) = 1 as el_suyo
  from public.contrata_puestos_persona x;

insert into public.puesto (id, persona_id, contrata_id, cargo, telefono_empresa, desde, hasta, notas, creado_en)
select mp.nuevo, mpe.nuevo, x.contrata_id, x.cargo,
       coalesce(x.telefono, case when mp.el_suyo then cp.telefono end),
       x.desde, x.hasta,
       case when x.pendiente is not null then 'PENDIENTE: ' || x.pendiente end,
       x.creado_en
from public.contrata_puestos_persona x
join _mapa_puesto mp on mp.viejo = x.id
join _mapa_persona mpe on mpe.viejo = x.persona_id
join public.contrata_personas cp on cp.id = x.persona_id;

-- 4 · los correos, al puesto. El del puesto es el principal; el que estaba en
--     la persona va al suyo, principal si el puesto no tenia otro.
insert into public.correo (puesto_id, email, etiqueta, principal)
select mp.nuevo, x.email, 'general', true
from public.contrata_puestos_persona x join _mapa_puesto mp on mp.viejo = x.id
where x.email is not null;

insert into public.correo (puesto_id, email, etiqueta, principal)
select mp.nuevo, cp.email, 'general', x.email is null
from public.contrata_puestos_persona x
join _mapa_puesto mp on mp.viejo = x.id and mp.el_suyo
join public.contrata_personas cp on cp.id = x.persona_id
where cp.email is not null and lower(cp.email) is distinct from lower(x.email);

-- 5 · los correos que solo tenia la tabla vieja de contactos
insert into public.correo (puesto_id, email, etiqueta, principal)
select mp.nuevo, v.email, 'general', false
from (values
    ('d74a820c-987f-49c8-8dfa-2c0d54e67070'::uuid, 'madrid@ascensorestresa.com'),
    ('5bc821d5-2202-416f-a0fc-a016c521793e'::uuid, 'info@urvall.es'),
    ('ce47bf88-2e09-40be-8196-6f339dc884d4'::uuid, 'administracion@didepro.es'),
    ('8a6c292b-3bd6-4a8f-8796-d3b01d2a6f37'::uuid, 'administracion@nvr-edificios.com'),
    ('ed182b05-5f9d-489e-a378-62c3f09d32e1'::uuid, 'presupuestos@grupodago.es')
  ) as v(puesto_viejo, email)
join _mapa_puesto mp on mp.viejo = v.puesto_viejo;

-- 6 · los dos casos con nombre
update public.puesto pu set hasta = '2025-05-31',
       notas = concat_ws(E'\n', pu.notas, 'Salida de ENGWE: mayo de 2025 (fecha de Monica, 5-oct-2026; el dia es aproximado). Lo marcado como "cuidado" es la EMPRESA: Andres se desvinculo y ahora trabajamos con el.')
from public.contrata_puestos_persona x
join _mapa_puesto mp on mp.viejo = x.id
join public.contrata_personas cp on cp.id = x.persona_id
join public.contratas c on c.id = x.contrata_id
where pu.id = mp.nuevo and cp.nombre = 'ANDRES' and cp.apellidos = 'HERAS' and c.nombre ilike '%ENGWE%';

update public.persona pe set notas = concat_ws(E'\n', pe.notas, '⛔ CUIDADO: persona non grata (Monica, 5-oct-2026). Viene de URVALL, contrata marcada "CUIDADO ESTOS NO".')
from public.contrata_personas cp join _mapa_persona m on m.viejo = cp.id
where pe.id = m.nuevo and cp.nombre = 'FELIX' and cp.apellidos = 'UREÑA';

-- 7 · las notas de contratas se reenganchan a la persona y al puesto nuevos
alter table public.notas_contratas drop constraint contrata_notas_persona_id_fkey;
alter table public.notas_contratas drop constraint contrata_notas_puesto_id_fkey;
update public.notas_contratas n set persona_id = m.nuevo from _mapa_persona m where n.persona_id = m.viejo;
update public.notas_contratas n set puesto_id  = m.nuevo from _mapa_puesto  m where n.puesto_id  = m.viejo;
alter table public.notas_contratas add constraint notas_contratas_persona_id_fkey
  foreign key (persona_id) references public.persona(id);
alter table public.notas_contratas add constraint notas_contratas_puesto_id_fkey
  foreign key (puesto_id) references public.puesto(id);

-- 8 · las tablas viejas, de respaldo
alter table public.contrata_puestos_persona rename to zz_muerta_contrata_puestos_persona;
alter table public.contrata_personas        rename to zz_muerta_contrata_personas;
comment on table public.zz_muerta_contrata_personas is
  'MUERTA el 5-oct-2026: sus personas pasaron a persona (agenda unica). Respaldo, no se escribe.';
comment on table public.zz_muerta_contrata_puestos_persona is
  'MUERTA el 5-oct-2026: sus puestos pasaron a puesto (con contrata_id). Respaldo, no se escribe.';
