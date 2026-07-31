-- =============================================================================
-- Retirada del andamiaje de migracion en PRODUCCION
--
-- Cinco tablas que se crearon para la migracion y en produccion nunca llegaron
-- a llenarse: el trabajo se hizo en local. Aqui solo ocupan sitio y confunden.
--
-- NO se toca migracion_monday (5.287 filas): es el puente con Monday, lo que
-- permite volver a leer el tablero y lo que hara falta para la fase 2.
--
-- Antes de borrar comprueba que estan vacias. Si alguna tiene datos, aborta
-- entera y no se pierde nada.
-- =============================================================================

begin;

do $$
declare
  v_cotejo   bigint;
  v_empresa  bigint;
  v_revision bigint;
  v_ficha    bigint;
  v_campo    bigint;
begin
  select count(*) into v_cotejo   from migracion_admin_cotejo;
  select count(*) into v_empresa  from migracion_admin_empresa;
  select count(*) into v_revision from migracion_admin_revision;
  select count(*) into v_ficha    from migracion_ficha;
  select count(*) into v_campo    from migracion_ficha_campo;

  if v_cotejo + v_empresa + v_revision + v_ficha + v_campo > 0 then
    raise exception 'No estan vacias: cotejo=% empresa=% revision=% ficha=% campo=%. No se borra nada.',
      v_cotejo, v_empresa, v_revision, v_ficha, v_campo;
  end if;

  raise notice 'Las cinco estan vacias. Se borran.';
end $$;

-- El orden importa: primero las que apuntan, luego las apuntadas.
drop table migracion_ficha_campo;
drop table migracion_ficha;

drop table migracion_admin_cotejo;
drop table migracion_admin_revision;
drop table migracion_admin_empresa;

comment on table migracion_monday is 'Puente con Monday: que fila de la app viene de que item de que tablero. NO borrar: es lo que permite volver a leer Monday y lo que hara falta en la fase 2.';

commit;

-- Que queda de andamiaje despues de esto
select table_name
from information_schema.tables
where table_schema = 'public' and table_name like 'migracion%'
order by 1;
