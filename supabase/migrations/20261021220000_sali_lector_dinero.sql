-- SALI DEL DINERO (Monica, 21-oct-2026: «necesito que aqui haya una forma de acceder a la IA, para poder hacerle
-- consultas sobre estos datos y que pueda buscar en ellos, como estamos haciendo aqui»).
-- Sali hace consultas SQL de LECTURA sobre las tablas del dinero, con un rol propio que solo puede leer esas tablas:
--   sali_lector         SELECT en movimientos, facturas, cobros, hitos, gastos habituales, cuentas, reglas, impuestos
--   sali_consulta(q)    ejecuta UNA consulta SELECT como sali_lector (10 s como mucho, 500 filas como mucho).
-- Solo la llama el servidor (service_role), desde la edge sali-dinero, que antes comprueba que quien pregunta es direccion.

create role sali_lector nologin;
grant sali_lector to postgres;   -- para poder ponerle la funcion a su nombre
grant usage on schema public to sali_lector;

do $$
declare t text;
begin
  foreach t in array array['movimientos_bancarios', 'facturas', 'cobros', 'hitos_cobro', 'gastos_habituales', 'cuentas_propias',
                           'reglas_movimientos', 'vencimientos_fiscales', 'obligaciones_fiscales', 'vencimiento_plazos'] loop
    execute format('grant select on public.%I to sali_lector', t);
    execute format('create policy sali_lector_lee on public.%I for select to sali_lector using (true)', t);
  end loop;
end $$;

create or replace function sali_consulta(q text) returns jsonb
language plpgsql security definer set search_path = public set statement_timeout = '10s' as $$
declare
  r jsonb;
  limpia text := regexp_replace(q, ';\s*$', '');
begin
  if limpia !~* '^\s*(select|with)\s' then
    raise exception 'Solo consultas de lectura (SELECT o WITH)';
  end if;
  if limpia ~ ';' then
    raise exception 'Una sola consulta, sin punto y coma por medio';
  end if;
  execute format('select coalesce(jsonb_agg(t), ''[]''::jsonb) from (select * from (%s) s limit 500) t', limpia) into r;
  return r;
end $$;

grant create on schema public to sali_lector;   -- el dueño nuevo tiene que poder crear en el esquema, solo para el cambio
alter function sali_consulta(text) owner to sali_lector;
revoke create on schema public from sali_lector;
revoke all on function sali_consulta(text) from public, anon, authenticated;
grant execute on function sali_consulta(text) to service_role;
comment on function sali_consulta(text) is 'Sali del dinero: una consulta SELECT como sali_lector (solo lee las tablas del dinero). Solo service_role.';
