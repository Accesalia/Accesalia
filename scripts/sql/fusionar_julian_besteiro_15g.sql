-- FUSIONAR JULIAN BESTEIRO 15G (Madrid) — Monica, 11-oct-2026
-- La misma comunidad dada de alta dos veces, con la misma referencia catastral
-- 1186201VK4718E: "Fusionamos, es claramente un error. Dejamos como buena la
-- primera, tendra fechas mas antiguas".
--   BUENA:     7c6f96cc-de6b-427a-9c8a-65024eba8285  CP JULIAN BESTEIRO 15G MADRID  (la mas antigua)
--   ABSORBIDA: fd1a747c-081b-4a41-b297-a8dd593625d7  CP JULIAN BESTEIRO 15 G MADRID
-- Lo que tenia la absorbida (mirado antes): su opp DAN-2019-053, el mismo
-- administrador sin la persona, el mismo contacto (Fabio Aceto, vecino) y su
-- figura legal. Se ejecuta a mano en el editor SQL de Supabase, de una vez.

begin;

-- 1. El contacto repetido: lo que apuntaba al Fabio de la absorbida pasa al de la buena.
update oportunidades          set persona_comunidad_id       = '5c10fb5e-2c63-4dfb-9e8c-ac7957777707' where persona_comunidad_id       = '066ed7a5-c2ad-4449-849b-9ec7a3b70d7a';
update oportunidades          set quien_persona_comunidad_id = '5c10fb5e-2c63-4dfb-9e8c-ac7957777707' where quien_persona_comunidad_id = '066ed7a5-c2ad-4449-849b-9ec7a3b70d7a';
update administracion_origen  set quien_persona_comunidad_id = '5c10fb5e-2c63-4dfb-9e8c-ac7957777707' where quien_persona_comunidad_id = '066ed7a5-c2ad-4449-849b-9ec7a3b70d7a';
update notas_oportunidad      set quien_persona_comunidad_id = '5c10fb5e-2c63-4dfb-9e8c-ac7957777707' where quien_persona_comunidad_id = '066ed7a5-c2ad-4449-849b-9ec7a3b70d7a';
update llamadas               set quien_persona_comunidad_id = '5c10fb5e-2c63-4dfb-9e8c-ac7957777707' where quien_persona_comunidad_id = '066ed7a5-c2ad-4449-849b-9ec7a3b70d7a';
update notas_pendientes       set quien_persona_comunidad_id = '5c10fb5e-2c63-4dfb-9e8c-ac7957777707' where quien_persona_comunidad_id = '066ed7a5-c2ad-4449-849b-9ec7a3b70d7a';
delete from personas_comunidad where id = '066ed7a5-c2ad-4449-849b-9ec7a3b70d7a';

-- 2. El administrador repetido: la misma empresa, pero sin la persona que si consta en la buena.
delete from comunidad_admin_responsable
 where comunidad_id = 'fd1a747c-081b-4a41-b297-a8dd593625d7'
   and empresa_id   = '1981e21f-de4e-4a9a-9114-7f5b8f3fdb3d'
   and puesto_id is null;

-- 3. Todo lo demas que apunte a la absorbida (su opp y lo que haya), a la buena.
--    Las tablas se leen del catalogo, no de una lista escrita a mano.
do $$
declare r record; sobran int;
begin
  for r in
    select tc.table_name as tabla, kcu.column_name as columna
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
    join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
      and ccu.table_name = 'comunidades' and ccu.column_name = 'id'
  loop
    execute format('update public.%I set %I = %L where %I = %L', r.tabla, r.columna,
                   '7c6f96cc-de6b-427a-9c8a-65024eba8285', r.columna, 'fd1a747c-081b-4a41-b297-a8dd593625d7');
  end loop;

  -- 4. La figura legal de los portales (id comodin, no es clave ajena).
  insert into figura_legal_propietaria (id_comodin, figura)
  values ('7c6f96cc-de6b-427a-9c8a-65024eba8285', 'Comunidad de Propietarios') on conflict (id_comodin) do nothing;
  update accesos set figura_legal_propietaria_id = '7c6f96cc-de6b-427a-9c8a-65024eba8285'
   where figura_legal_propietaria_id = 'fd1a747c-081b-4a41-b297-a8dd593625d7';
  delete from figura_legal_propietaria where id_comodin = 'fd1a747c-081b-4a41-b297-a8dd593625d7';

  -- 5. Comprobar que ya nada apunta a la absorbida. Si queda algo, se para y no se borra nada.
  for r in
    select tc.table_name as tabla, kcu.column_name as columna
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
    join information_schema.constraint_column_usage ccu on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY' and tc.table_schema = 'public'
      and ccu.table_name = 'comunidades' and ccu.column_name = 'id'
  loop
    execute format('select count(*) from public.%I where %I = %L', r.tabla, r.columna, 'fd1a747c-081b-4a41-b297-a8dd593625d7') into sobran;
    if sobran > 0 then raise exception 'Quedan % filas en %.% apuntando a la absorbida. Nada borrado.', sobran, r.tabla, r.columna; end if;
  end loop;
end $$;

-- 6. El rastro de la fusion, y fuera la absorbida.
insert into fusiones_comunidades (cif, superviviente_id, absorbida_id, nombre_absorbida, municipio, motivo)
select 'sin CIF', '7c6f96cc-de6b-427a-9c8a-65024eba8285', c.id, c.nombre, c.municipio,
       'La misma comunidad dada de alta dos veces ("15G" y "15 G"), con la misma referencia catastral. Sobrevive la mas antigua (Monica, 11-oct-2026).'
from comunidades c where c.id = 'fd1a747c-081b-4a41-b297-a8dd593625d7';
delete from comunidades where id = 'fd1a747c-081b-4a41-b297-a8dd593625d7';

commit;

-- Comprobacion (debe salir UNA fila, con DAN-2019-053 y CAR-2025-007):
select c.nombre, string_agg(o.codigo, ', ') as opps
from comunidades c left join oportunidades o on o.comunidad_id = c.id
where c.nombre ilike 'CP JULIAN BESTEIRO 15%' group by c.nombre;
