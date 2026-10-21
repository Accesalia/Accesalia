-- SALI LEE TODA LA APP (Monica, 21-oct-2026: «¿por que restringirlo a las del dinero? Tu tuviste que mirar nominas…
-- Sali igual tiene que mirar tiempos de trabajo contra precios, para ver si la hora de tecnico la vendemos barata»).
-- Solo la usa direccion. Sigue sin poder escribir nada. (BYPASSRLS lo rechazo el filtro: politica tabla a tabla.)
-- OJO, NORMA: cada tabla NUEVA necesita su «create policy sali_lector_lee … for select to sali_lector using (true)»
-- (el grant de select ya va solo por los privilegios por defecto).
grant select on all tables in schema public to sali_lector;
alter default privileges in schema public grant select on tables to sali_lector;
do $$
declare t text;
begin
  for t in select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
             and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname and p.policyname = 'sali_lector_lee') loop
    execute format('create policy sali_lector_lee on public.%I for select to sali_lector using (true)', t);
  end loop;
end $$;
comment on function sali_consulta(text) is 'Sali (dirección): una consulta SELECT como sali_lector, que LEE toda la app (política sali_lector_lee en cada tabla) y no puede escribir nada. Solo service_role.';
