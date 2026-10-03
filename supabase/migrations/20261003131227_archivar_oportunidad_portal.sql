-- ===========================================================================
-- AL TRASTERO: `oportunidad_portal`   (Monica, 3-oct-2026: "llevala al historico")
--
-- Primer intento de unir la oportunidad con sus escaleras, del 29-sep: iba
-- directa de `oportunidades` a `ficha_catastro_portal`, sin pasar por el acceso
-- y sin `hasta` para las bajas. Al dia siguiente Monica diseño el modelo bueno,
-- `opp <-> opp_accesos <-> accesos`, que hace lo mismo con el acceso en el
-- centro. Esta se quedo atras.
--
-- Comprobado antes de archivar: 0 filas, ningun codigo la usa y ninguna tabla
-- la apunta. Se archiva para que su nombre, tan parecido a `opp_accesos`, no
-- confunda a nadie.
--
-- SE DESHACE con `alter table historico_de_tablas.oportunidad_portal set schema
-- public`. Ver 20261003110000_historico_de_tablas.sql para el porque del
-- trastero.
-- ===========================================================================

begin;

create schema if not exists historico_de_tablas;

alter table public.oportunidad_portal set schema historico_de_tablas;

comment on table historico_de_tablas.oportunidad_portal is
  'Primer intento de unir la oportunidad con sus escaleras de Catastro, '
  '29-sep-2026, directo a ficha_catastro_portal. Nunca se uso (0 filas). '
  'Sustituida por opp_accesos (opp <-> accesos), el modelo validado por Monica. '
  'Archivada por ella el 3-oct-2026.';

do $$
declare quedan int; estan int;
begin
  select count(*) into quedan from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='oportunidad_portal';
  select count(*) into estan from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='historico_de_tablas' and c.relname='oportunidad_portal';
  if quedan <> 0 or estan <> 1 then
    raise exception 'Mal: quedan % en public y hay % en el trastero. Nada hecho.', quedan, estan;
  end if;
end $$;

commit;
