-- ===========================================================================
-- FUSIONAR COMUNIDADES QUE COMPARTEN CIF   (Monica, 2-oct-2026)
--
-- "en la tabla de comunidades solo debe quedar 1 que recoge las tres. Si hay dos
--  -santa maria por un lado e iglesia por otro- es como si fuera un duplicado."
--
-- Y el objetivo de fondo, con sus palabras: "el objetivo de crear la tabla
-- comunidades es justo esa: tener una fila por numero de cif".
--
-- EL CASO. SANTA MARIA LA BLANCA 3, SANTA MARIA LA BLANCA 5 e IGLESIA 22, en
-- Alcorcon, son TRES filas y UNA comunidad:
--   * la Agencia Tributaria les da un solo NIF, H80620081, y la denominacion
--     dice literalmente "SANTAMARIA LA BLANCA 3 Y 5 IGLESIA 22";
--   * las tres carpetas de Dropbox guardan FISICAMENTE LA MISMA TARJETA;
--   * y las tres comparten la misma referencia catastral, 9872103VK2697S.
--     Una parcela, un CIF, una junta, tres portales.
-- Despues de esto, esa comunidad tendra 3 opps y 3 accesos (esc 1, esc 2 y
-- esc 3), que es exactamente el modelo: el acceso es el atomo y la comunidad
-- los agrupa.
--
-- PARA REPETIRLO CON OTRO GRUPO: cambiar la linea del CIF y ejecutar otra vez.
-- Hoy hay 6 CIF repetidos sobre 15 filas, y apareceran mas segun se lean
-- tarjetas.
--
-- POR QUE NO VALE "REPUNTAR TODO Y BORRAR". Hay dos clases de tabla:
--   * las que guardan informacion DISTINTA de cada fila (sus opps, sus hojas de
--     encargo, sus proyectos): se repuntan y se quedan las tres;
--   * las que guardan LA MISMA informacion repetida: hay que deduplicar. Y no es
--     opcional: `accesos_comunidad` lleva UNIQUE (comunidad_id, referencia) y las
--     tres filas tienen la misma referencia, asi que un repunte ciego lo rechaza
--     la base. En `comunidad_admin_responsable` no hay restriccion que avise, y
--     te quedarias con filas identicas sin enterarte.
--
-- EL REPUNTE SE HACE SOBRE TODAS LAS CLAVES AJENAS, LEIDAS DEL CATALOGO, no
-- sobre la lista que yo recuerde. Hoy son 20 tablas. Si manana hay una mas,
-- entra sola.
-- ===========================================================================

begin;

-- 0 --------------------------------------------------- rastro de la fusion
-- Trazabilidad: que fila se comio a cual y cuando. Sin esto, dentro de un mes
-- nadie sabe por que "IGLESIA 22" dejo de existir.
create table if not exists fusiones_comunidades (
  id                uuid primary key default gen_random_uuid(),
  creado_en         timestamptz not null default now(),
  cif               text not null,
  superviviente_id  uuid not null references comunidades(id),
  absorbida_id      uuid not null,
  nombre_absorbida  text not null,
  municipio         text,
  motivo            text
);

comment on table fusiones_comunidades is
  'Que comunidad absorbio a cual al unificar por CIF. La absorbida YA NO EXISTE '
  'en `comunidades`: su id se guarda aqui para poder explicar por que una '
  'direccion dejo de aparecer en la lista. Su direccion no se pierde: sigue en '
  'la opp y en el acceso, que es donde viven las direcciones.';

do $$
declare
  -- >>> LA UNICA LINEA QUE SE CAMBIA PARA FUSIONAR OTRO GRUPO <<<
  el_cif        text := 'H80620081';

  superviviente uuid;
  muertos       uuid[];
  todos         uuid[];
  denominacion  text;
  r             record;
  u             record;
  cuantas       int;
  sobran        int;
begin
  select array_agg(id order by creado_en, id) into todos
  from comunidades where cif_comunidad = el_cif;

  cuantas := coalesce(array_length(todos, 1), 0);
  if cuantas < 2 then
    raise exception 'Con el CIF % hay % comunidades. No hay nada que fusionar.', el_cif, cuantas;
  end if;

  -- La mas antigua sobrevive; a igualdad de fecha, la de id menor. Regla fija y
  -- reproducible: ejecutarlo dos veces da el mismo superviviente.
  superviviente := todos[1];
  muertos       := todos[2:cuantas];

  select nombre into denominacion from comunidades where id = superviviente;
  raise notice 'CIF % -> sobrevive % (%), se absorben %', el_cif, superviviente, denominacion, cuantas - 1;

  -- 1 ------------------------------------------------------- deduplicar
  -- LAS RESTRICCIONES SE LEEN DEL CATALOGO, NO DE UNA LISTA ESCRITA A MANO.
  -- En el primer intento puse a mano `accesos_comunidad` y
  -- `comunidad_admin_responsable`, y salto `cotejo_catastro`, que lleva
  -- UNIQUE (comunidad_id) y no estaba en mi lista. La leccion es la de siempre:
  -- lo que sabe la base no se recuerda, se consulta.
  --
  -- QUE HACE. Para cada indice unico que incluya la columna que apunta a
  -- comunidades, se queda UNA fila por cada combinacion del RESTO de columnas de
  -- ese indice, en todo el grupo:
  --   * UNIQUE (comunidad_id, referencia) -> una por referencia catastral;
  --   * UNIQUE (comunidad_id) a secas      -> una en total;
  --   * y DONDE NO HAY INDICE UNICO, NO SE BORRA NADA. Es deliberado:
  --     `comunidad_admin_responsable` no lo tiene, asi que sus tres filas se
  --     repuntan y quedan las tres, dos de ellas diciendo lo mismo (misma
  --     administracion, mismo puesto). Borrar lo que la base no obliga a borrar
  --     es una decision de negocio, y no es mia. Queda anotado para que lo mire.
  --
  -- Lo que encuentra hoy el catalogo en esta base, por si sirve de mapa:
  --   accesos_comunidad  (comunidad_id, referencia)  y tambien (comunidad_id)
  --   cotejo_catastro    (comunidad_id)
  --   expedientes        (comunidad_id, convocatoria_id)
  --   resumenes_ia       (comunidad_id, fase)
  -- Se prefiere conservar la fila del superviviente; si no tiene, la mas antigua.
  -- Lo descartado se cuenta y se avisa: es informacion que se tira, y eso se dice.
  for u in
    select i.indrelid::regclass::text as tabla,
           fkcol.attname as col_comunidad,
           (select array_agg(quote_ident(a.attname) order by k.ord)
            from unnest(string_to_array(i.indkey::text, ' ')::int[]) with ordinality k(attnum, ord)
            join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
            where a.attname <> fkcol.attname) as otras
    from pg_constraint fk
    join pg_attribute fkcol on fkcol.attrelid = fk.conrelid and fkcol.attnum = fk.conkey[1]
    join pg_index i on i.indrelid = fk.conrelid and i.indisunique and not i.indisprimary
    where fk.contype = 'f'
      and fk.confrelid = 'comunidades'::regclass
      and array_length(fk.conkey, 1) = 1
      and fkcol.attnum = any(string_to_array(i.indkey::text, ' ')::int[])
      and 0 <> all(string_to_array(i.indkey::text, ' ')::int[])   -- sin indices por expresion
  loop
    execute format(
      'delete from public.%I t using ('
      '  select ctid, row_number() over ('
      '      partition by %s order by (%I = $1) desc, ctid) as n'
      '  from public.%I where %I = any($2)'
      ') d where t.ctid = d.ctid and d.n > 1',
      u.tabla,
      coalesce(array_to_string(u.otras, ', '), '1'),   -- sin otras columnas: una sola particion
      u.col_comunidad, u.tabla, u.col_comunidad)
      using superviviente, todos;
    get diagnostics sobran = row_count;
    if sobran > 0 then
      raise notice 'deduplicadas % filas en % (indice unico sobre %)',
        sobran, u.tabla, coalesce(array_to_string(u.otras, ', '), u.col_comunidad);
    end if;
  end loop;

  -- 1 bis ------------------------------- una regla de negocio, no de la base
  -- `comunidad_admin_responsable` NO tiene indice unico, asi que la base deja
  -- pasar filas repetidas. Pero repetir la MISMA persona de la MISMA
  -- administracion no dice nada nuevo: solo pasa porque antes habia dos filas de
  -- comunidad. Aqui, en Santa Maria la Blanca, las tres filas son de SERRANO
  -- LOBO y son dos personas: Tamara (dos veces) y Elisa. Lo correcto son dos.
  --
  -- Y NO se le pone indice unico a la tabla, decision de Monica, 2-oct-2026:
  -- "una misma comunidad puede tener varias personas que la llevan, no tiene por
  --  que ser una sola". El indice unico por comunidad lo impediria; esta regla
  --  solo quita el duplicado exacto.
  delete from comunidad_admin_responsable a
  using (select ctid, row_number() over (
             partition by empresa_id, puesto_id
             order by (comunidad_id = superviviente) desc, ctid) as n
         from comunidad_admin_responsable where comunidad_id = any(todos)) d
  where a.ctid = d.ctid and d.n > 1;
  get diagnostics sobran = row_count;
  if sobran > 0 then
    raise notice 'quitadas % filas repetidas de comunidad_admin_responsable (misma persona, misma administracion)', sobran;
  end if;

  -- 2 ------------------------------------------- repuntar TODO lo que apunte
  for r in
    select tc.table_name as tabla, kcu.column_name as columna
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_name = 'comunidades' and ccu.column_name = 'id'
  loop
    execute format('update public.%I set %I = $1 where %I = any($2)',
                   r.tabla, r.columna, r.columna)
      using superviviente, muertos;
  end loop;

  -- Una mancomunidad no puede ser hija de si misma: si la fusion ha creado ese
  -- bucle, se quita.
  delete from relacion_mancomunidad_comunidades
  where mancomunidad_padre = comunidad_hija;

  -- 3 ----------------------------------------- comprobar que no queda nadie
  -- Antes de borrar, recorrer otra vez TODAS las claves ajenas y confirmar que
  -- ninguna sigue apuntando a los que mueren. Si queda una, aborta.
  for r in
    select tc.table_name as tabla, kcu.column_name as columna
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on kcu.constraint_name = tc.constraint_name and kcu.table_schema = tc.table_schema
    join information_schema.constraint_column_usage ccu
      on ccu.constraint_name = tc.constraint_name and ccu.table_schema = tc.table_schema
    where tc.constraint_type = 'FOREIGN KEY'
      and tc.table_schema = 'public'
      and ccu.table_name = 'comunidades' and ccu.column_name = 'id'
  loop
    execute format('select count(*) from public.%I where %I = any($1)', r.tabla, r.columna)
      into sobran using muertos;
    if sobran > 0 then
      raise exception 'Quedan % filas en %.% apuntando a las absorbidas. Nada borrado.',
        sobran, r.tabla, r.columna;
    end if;
  end loop;

  -- 4 ------------------------------------------- dejar rastro y luego borrar
  insert into fusiones_comunidades (cif, superviviente_id, absorbida_id,
                                    nombre_absorbida, municipio, motivo)
  select el_cif, superviviente, c.id, c.nombre, c.municipio,
         'Mismo CIF en la tarjeta de la AEAT, misma referencia catastral y la '
         'misma tarjeta archivada en las tres carpetas de Dropbox.'
  from comunidades c where c.id = any(muertos);

  delete from comunidades where id = any(muertos);

  -- 5 --------------------------- el superviviente se queda el nombre oficial
  -- Por si el superviviente fuera uno al que no se le escribio la denominacion
  -- (SANTA MARIA LA BLANCA 5 se quedo fuera de la migracion anterior porque
  -- cuando se escribio aun no se habia mirado su tarjeta; se miro despues y es
  -- la misma).
  update comunidades
  set nombre = 'CODAD PROP CL SANTAMARIA LA BLANCA 3 Y 5 IGLESIA 22',
      actualizado_en = now()
  where id = superviviente and cif_comunidad = 'H80620081';

  raise notice 'Fusion terminada.';
end $$;

commit;

-- ===========================================================================
-- COMPROBACION (aparte, despues del commit):
--
--   select count(*) from comunidades where cif_comunidad = 'H80620081';   -- 1
--
--   select c.nombre, c.cif_comunidad,
--          (select count(*) from oportunidades o where o.comunidad_id = c.id) as opps,
--          (select count(*) from hojas_encargo h where h.comunidad_id = c.id) as hojas,
--          (select count(*) from proyectos p where p.comunidad_id = c.id) as proyectos,
--          (select count(*) from documentos d where d.comunidad_id = c.id) as docs
--   from comunidades c where c.cif_comunidad = 'H80620081';
--   -- esperado: 3 opps, 3 hojas, 3 proyectos, 2 documentos
--
--   -- quien lleva la comunidad: deben quedar DOS, Tamara y Elisa, las dos de
--   -- SERRANO LOBO. Si sale una sola o salen tres, algo ha ido mal.
--   select pe.nombre as persona, e.nombre_accesalia as administracion
--   from comunidad_admin_responsable car
--   join comunidades c on c.id = car.comunidad_id
--   left join empresa e on e.id = car.empresa_id
--   left join puesto p on p.id = car.puesto_id
--   left join persona pe on pe.id = p.persona_id
--   where c.cif_comunidad = 'H80620081';
--
--   select nombre_absorbida from fusiones_comunidades;   -- las dos que se fueron
--
--   -- y lo que de verdad importa: las tres direcciones SIGUEN estando
--   select o.nombre from oportunidades o
--   join comunidades c on c.id = o.comunidad_id
--   where c.cif_comunidad = 'H80620081' order by o.nombre;
-- ===========================================================================
