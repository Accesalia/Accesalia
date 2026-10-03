-- ===========================================================================
-- EL TRASTERO: `historico_de_tablas`   (Monica, 3-oct-2026)
--
-- Su pregunta, literal: "hay sitios donde se puedan guardar estas tablas para
-- que NO SE VEAN en produccion? que desaparezcan de ahi pero se puedan
-- consultar?".
--
-- Si, y sin bajar nada a local -que es el demonio-. Una tabla que vive en un
-- esquema distinto de `public` DESAPARECE DE LA APLICACION: PostgREST solo
-- expone `public`, asi que el codigo no puede llamarla ni por error. Pero sigue
-- en la misma base: se consulta desde la consola con
--     select ... from historico_de_tablas.accesos_comunidad
-- y entra en las copias de seguridad como todo lo demas.
--
-- El patron ya existia en esta base: hay un esquema `staging` con tres tablas
-- de la migracion de julio. No se reutiliza ese porque "staging" significa
-- datos de paso a medio migrar, y esto es lo contrario: trabajo CERRADO que se
-- guarda. `public` tiene 138 tablas y cuesta encontrar lo que importa.
--
-- QUE SE GUARDA Y POR QUE. Las dos tablas son la MEMORIA de dos herramientas
-- manuales que ya terminaron su trabajo:
--
--   accesos_comunidad  (1.227 filas, 29-30 sep)
--     Era la lista de accesos de cada comunidad, con la razon de por que se
--     asigno cada uno. La sustituyeron `accesos` (2.530 filas, 1-oct) y
--     `opp_accesos`. Comprobado antes de archivar: las 1.227 referencias estan
--     todas en `accesos`, y de las 8 razones "Resuelto con Monica (1-oct)" hay
--     7 recogidas en `opp_accesos.de_donde`. La octava -Martin de los Heros 59
--     esc B, "la B de tu 59B es la escalera"- no casa por el enlace directo y
--     se queda aqui guardada.
--
--   cotejo_catastro  (1.214 filas, 29-30 sep)
--     El acta de preguntarle a Catastro por la direccion de cada comunidad:
--     1.204 con una sola parcela, 6 sin encontrar, 4 raras. Guarda ademas la
--     direccion OFICIAL de Catastro, que se dejo a proposito fuera de
--     `comunidades` para no pisar la de Monica, y los 65 casos con candidatos.
--     Lo util de aquel trabajo ya esta en `comunidades`: la referencia
--     catastral y las coordenadas.
--
-- LO QUE ESTO ROMPE, dicho claro: `lib/fichaCatastro.ts` y
-- `lib/completarCatastro.ts` leen estas tablas y dejan de funcionar. Las dos ya
-- estaban en RETIRADOS de reloj.ts. Se jubilan con sus rutas en el mismo push.
--
-- SE DESHACE con un `set schema public`. Las claves ajenas siguen a la tabla
-- entre esquemas, igual que en un renombrado: no se toca ni un dato.
-- ===========================================================================

begin;

create schema if not exists historico_de_tablas;

comment on schema historico_de_tablas is
  'Tablas que fueron el registro de un trabajo ya terminado. No las ve la '
  'aplicacion -PostgREST solo expone public- pero se consultan desde la '
  'consola y entran en las copias. No se borran porque documentan decisiones '
  'que nadie podria reconstruir despues.';

alter table public.accesos_comunidad set schema historico_de_tablas;
alter table public.cotejo_catastro   set schema historico_de_tablas;

comment on table historico_de_tablas.accesos_comunidad is
  'Primera version de los accesos, 29-30 sep 2026. Sustituida por `accesos` y '
  '`opp_accesos`. Su columna `de_donde` guarda por que se asigno cada acceso, '
  'incluidas ocho decisiones tomadas con Monica el 1-oct.';

comment on table historico_de_tablas.cotejo_catastro is
  'Acta del cotejo de las 1.214 direcciones contra Catastro, 29-30 sep 2026. '
  'Guarda la direccion OFICIAL de Catastro, que se dejo fuera de `comunidades` '
  'a proposito para no pisar la de Monica.';

-- FRENO: que no quede nada de las dos en `public`, y que esten las dos en el
-- trastero. Si no, aborta.
do $$
declare quedan int; estan int;
begin
  select count(*) into quedan from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname in ('accesos_comunidad','cotejo_catastro');
  select count(*) into estan from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='historico_de_tablas' and c.relname in ('accesos_comunidad','cotejo_catastro');
  if quedan <> 0 or estan <> 2 then
    raise exception 'Mal: quedan % en public y hay % en el trastero. Nada hecho.', quedan, estan;
  end if;
end $$;

commit;

-- ===========================================================================
-- COMPROBACION (aparte):
--
--   select count(*) from historico_de_tablas.accesos_comunidad;   -- 1227
--   select count(*) from historico_de_tablas.cotejo_catastro;     -- 1214
--
--   -- y que la aplicacion ya no las ve:
--   select count(*) from information_schema.tables
--   where table_schema='public' and table_name in ('accesos_comunidad','cotejo_catastro');  -- 0
-- ===========================================================================
