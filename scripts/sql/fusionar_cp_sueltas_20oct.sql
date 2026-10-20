-- Comunidades sueltas (sin opp) del Excel de opps de Monica (20-oct-2026): ya tenian opp, con la CP que se queda.
-- Como fusionar_julian_besteiro_15g.sql: TODO lo que apunta a la absorbida pasa a la superviviente (cualquier tabla con
-- clave foranea a comunidades, historico incluido), rastro en fusiones_comunidades y fuera la absorbida.
-- Monte 89 Algete NO va: tiene un proyecto y 8 observaciones, y su opp es de un particular.
begin;
create temp table pares(absorbida uuid, superviviente uuid, motivo text) on commit drop;
insert into pares values
 ('06776548-7567-4f26-a43f-300314730be9', '1aeefaf3-8d4e-4526-8aa0-0663ea7caeb8', 'Castilla la Nueva 37 bis: la misma CP que ya tiene, con CIF, CAR-2025-088'),
 ('8e6bf4a3-a260-4cd1-b4cd-65c8bf2d036c', '15c1f9b4-f581-41f9-b12b-f1e8780a81d2', 'Epoca 23: va en la opp «Epoca 23 y 25» (CAR-2025-056), sin carpeta propia'),
 ('46d3418b-744a-40df-b820-da62a9b2d2db', 'c695991c-c29a-4f3b-8431-43e24a0dfe00', 'Haya 2 Madrid: la carpeta de Madrid es copia de la de Paseo de la Haya 2 Fuenlabrada (DAN-2022-226)'),
 ('4866a790-433f-42a1-9edd-6f4e903cfd3f', '9063357e-cbbc-49c4-b6cd-c3637a830127', 'Iglesia 4 Coslada: dada de alta dos veces (DAN-2021-144)'),
 ('eacb4dcf-a916-4945-a409-9decca50ae51', '9063357e-cbbc-49c4-b6cd-c3637a830127', 'Iglesia 4 Madrid: errata, es la de Coslada, con la carpeta mal creada'),
 ('37c7456f-8516-4d6d-838b-9978711ca6e7', '7c6f96cc-de6b-427a-9c8a-65024eba8285', 'Julian Besteiro 13 15: es la misma de 15 G; lo que haya se incluye en la de 15 G'),
 ('195258a6-62a2-410a-b3c6-661fff67a638', '45f71a4a-d76b-4661-9498-f40d398d9237', 'Lopez de Hoyos 342B: sin carpeta; la opp es 342 y 342 C (CAR-2025-051)'),
 ('2f577c1b-6243-4eab-a015-d79d34aec9af', 'ad5ee872-4da7-45a7-936b-051966db6825', 'Geologos 2: carpeta conjunta «1 y 2» (CAR-2025-032)');

do $$
declare r record; p record; sobran int;
begin
  for p in select * from pares loop
    for r in select n.nspname esquema, cl.relname tabla, a.attname columna
             from pg_constraint c join pg_class cl on cl.oid = c.conrelid join pg_namespace n on n.oid = cl.relnamespace
             join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any(c.conkey)
             where c.contype = 'f' and c.confrelid = 'public.comunidades'::regclass loop
      execute format('update %I.%I set %I = %L where %I = %L', r.esquema, r.tabla, r.columna, p.superviviente, r.columna, p.absorbida);
      execute format('select count(*) from %I.%I where %I = %L', r.esquema, r.tabla, r.columna, p.absorbida) into sobran;
      if sobran > 0 then raise exception 'Quedan % filas en %.% apuntando a %. Nada borrado.', sobran, r.tabla, r.columna, p.absorbida; end if;
    end loop;
    -- lo que la nombra sin clave foranea
    update accesos set figura_legal_propietaria_id = p.superviviente where figura_legal_propietaria_id = p.absorbida;
    update puesto set figura_legal_propietaria_id = p.superviviente where figura_legal_propietaria_id = p.absorbida;
    update lineas_facturacion set pagador_id = p.superviviente where pagador_id = p.absorbida;
    update cuentas_bancarias set titular_id = p.superviviente where titular_id = p.absorbida;
  end loop;
end $$;

insert into fusiones_comunidades (cif, superviviente_id, absorbida_id, nombre_absorbida, municipio, motivo)
select coalesce(s.cif_comunidad, a.cif_comunidad, ''), p.superviviente, p.absorbida, a.nombre, a.municipio,
       p.motivo || ' (Monica, Excel de opps, 20-oct-2026).'
from pares p join comunidades a on a.id = p.absorbida join comunidades s on s.id = p.superviviente;
delete from figura_legal_propietaria where id_comodin in (select absorbida from pares);
delete from comunidades where id in (select absorbida from pares);
commit;
