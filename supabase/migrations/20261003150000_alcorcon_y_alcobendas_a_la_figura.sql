-- YA APLICADA el 3-oct-2026 a mano (execute_sql, con su transaccion y sus
-- frenos). NO volver a ejecutar: los insert llevan `on conflict do nothing`,
-- pero el update del nombre solo casa una vez.
--
-- LO LIMPIO, Y SOLO LO LIMPIO. De la lista que antes se llamaba comunidades,
-- Monica ha repasado DOS municipios: Alcorcon y Alcobendas. Esos datos estan
-- bien porque se leyo su tarjeta del CIF a ojo, una por una. El resto de la
-- lista esta pendiente de revision y NO entra aqui.
--
-- Son 26 titulares:
--   18 de Alcorcon      (19 tarjetas: la fusionada de Santa Maria la Blanca
--                        3 y 5 + Iglesia 22 tiene dos, un CIF para tres portales)
--    7 de Alcobendas     comunidades de propietarios
--    1 CBRE GWS          ya estaba, y es la unica que NO es comunidad
--
-- COMO SE ELIGEN LAS DE ALCORCON: por tener un documento de tipo `tarjeta_cif`.
-- No por la letra del CIF. La letra H dice "comunidad de propietarios", pero el
-- CIF de los municipios sin repasar esta parseado, no leido, y sacar la figura
-- de ahi seria construir sobre lo que estamos limpiando.
--
-- LAS DOS QUE NO DECIDI YO:
--   * CDAD USUARIOS APARCAMIENTO VALLADOLID (H82474545). La tarjeta dice
--     "usuarios", no "propietarios". Monica: Comunidad de Propietarios.
--   * El nombre oficial ponia "CODAD PROP" en vez de "CDAD PROP", que era una
--     errata mia al escribir la migracion de Alcorcon. Monica: corregido.
--
-- SOLO SE ESCRIBE EN LA TABLA NUEVA, por decision suya. `comunidades.figura`
-- tiene el dato de las 8 de Alcobendas y se queda como esta -ya marcada como
-- provisional-: dos sitios para el mismo dato acaban diciendo cosas distintas,
-- y la verdad vive en `figura_legal_propietaria`.

begin;

-- 1. la errata del nombre oficial
update public.comunidades
set nombre = 'CDAD PROP CL SANTAMARIA LA BLANCA 3 Y 5 IGLESIA 22', actualizado_en = now()
where id = 'd78890b9-52c1-40e6-b2e9-be473a1b97d7'
  and nombre = 'CODAD PROP CL SANTAMARIA LA BLANCA 3 Y 5 IGLESIA 22';

-- 2. ALCORCON: las 18 que tienen tarjeta del CIF leida a ojo
insert into public.figura_legal_propietaria (id_comodin, figura)
select c.id, 'Comunidad de Propietarios'
from public.comunidades c
where upper(c.municipio) = 'ALCORCON'
  and exists (select 1 from public.documentos d
              join public.tipos_documento t on t.id = d.tipo_documento_id
              where d.comunidad_id = c.id and t.nombre = 'tarjeta_cif')
on conflict (id_comodin) do nothing;

-- 3. ALCOBENDAS: las 7 comunidades de propietarios
insert into public.figura_legal_propietaria (id_comodin, figura)
select c.id, c.figura
from public.comunidades c
where upper(c.municipio) = 'ALCOBENDAS'
  and c.figura = 'Comunidad de Propietarios'
on conflict (id_comodin) do nothing;

-- FRENOS
do $$
declare n int; codad int; descolgadas int;
begin
  select count(*) into n from public.figura_legal_propietaria;
  if n <> 26 then raise exception 'Esperaba 26 figuras y hay %. Nada hecho.', n; end if;

  select count(*) into codad from public.comunidades where nombre like 'CODAD%';
  if codad <> 0 then raise exception 'La errata CODAD sigue ahi. Nada hecho.'; end if;

  -- toda figura apunta a una fila que existe de verdad, en la tabla que le toca
  select count(*) into descolgadas from public.figura_legal_propietaria f
  where not exists (select 1 from public.comunidades c where c.id = f.id_comodin)
    and not exists (select 1 from public.empresas_propietarias e where e.id = f.id_comodin);
  if descolgadas <> 0 then raise exception '% figuras no apuntan a ninguna fila. Nada hecho.', descolgadas; end if;
end $$;

commit;
