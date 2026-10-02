-- CADA ACCESO, ENLAZADO A SU PORTAL DE CATASTRO
--
-- Encargo de Monica, 2-oct-2026, cerrando un paso solo: "crear la columna
-- ficha_catastro_portal_id en la tabla accesos y completarla con los id de las
-- filas de ficha_catastro_portal".
--
-- POR QUE UN ENLACE Y NO UNA COPIA DE LOS DATOS:
--
-- `ficha_catastro_portal` no guarda datos de la parcela: guarda los del PORTAL,
-- calculados agrupando los pisos por numero y escalera. O sea, ya son los datos
-- propios del acceso. Si el acceso los copiara, habria dos respuestas al mismo
-- numero y la copia se quedaria vieja el dia que Catastro cambie el edificio.
-- Referenciando, el refresco de la ficha recalcula el portal y el acceso ve el
-- dato nuevo sin que nadie se acuerde de nada.
--
-- Y POR QUE EL ID NUESTRO Y NO UNA REFERENCIA CATASTRAL: porque Catastro NO le
-- da referencia al portal. Le da una a la parcela (14 caracteres) y una a cada
-- piso (20), y el portal queda en medio: lo identifica por (parcela, numero,
-- escalera), sin codigo propio. Comprobado contra el registro en vivo: la
-- referencia 4965806VK4846S devuelve 377 pisos repartidos en 34 escaleras, y los
-- 7 pisos de la escalera R tienen 7 referencias distintas. Asi que a ese nivel
-- no hay nada de Catastro que tomar prestado, y el uuid de la fila -que es
-- nuestro, porque la fila es nuestra- es la unica identidad posible.
--
-- EL COTEJO ES POR LA DIRECCION, Y LA PARCELA NO PINTA NADA. Esto es correccion
-- de Monica y es importante: yo lo cruce primero pasando por la parcela y me
-- lie. Son dos tablas con direcciones; se cruzan por la direccion. Comprobado
-- que da lo mismo:
--
--   casan con UN portal (enlace claro) ....... 2.519
--   no casan con ninguno ......................... 10
--   casan con DOS (ambiguo) ....................... 1
--                                             --------
--   accesos .................................. 2.530
--
-- Los 11 que no quedan enlazados se quedan con la columna VACIA, a proposito y a
-- la vista, para repasarlos a mano. No se adivina ninguno.

-- ---------------------------------------------------------------------------
-- 1. La columna
-- ---------------------------------------------------------------------------
--
-- << ON DELETE SET NULL, PROPUESTO POR CLAUDE, PENDIENTE DE SU OK >>
--    Si algun dia desapareciera una fila de portal, el acceso SOBREVIVE y lo
--    que se vacia es el enlace. Lo contrario -cascade- borraria un acceso suyo
--    porque Catastro movio algo, y eso no lo hace nadie.

alter table accesos
  add column if not exists ficha_catastro_portal_id uuid
    references ficha_catastro_portal(id) on delete set null;

create index if not exists accesos_portal_catastro_idx
  on accesos (ficha_catastro_portal_id);

comment on column accesos.ficha_catastro_portal_id is
$$La fila de ficha_catastro_portal que describe ESTE acceso: sus inmuebles, sus viviendas,
su superficie, sus plantas y su reparto de usos, ya calculados por portal y no por parcela.

Se enlaza en vez de copiarse para que el dato no envejezca: cuando se refresca la ficha de
Catastro, el portal se recalcula y el acceso ve el valor nuevo.

Es un uuid nuestro porque Catastro NO da referencia catastral al portal: la da a la parcela
(14 caracteres) y a cada piso (20). El portal lo identifica por (parcela, numero, escalera),
sin codigo propio.

Vacio = no se ha podido enlazar, y hay que mirarlo a mano. Al ponerla eran 11 de 2.530: 10
sin portal que les corresponda y 1 que encajaba con dos.$$;

-- ---------------------------------------------------------------------------
-- 2. El relleno
-- ---------------------------------------------------------------------------
--
-- Solo se escribe donde el cotejo da UN portal y uno solo. Donde da dos, se deja
-- vacio: entre dos candidatos no se elige a cara o cruz.
--
-- Se puede volver a ejecutar sin miedo: solo toca las filas que estan vacias.

update accesos a
   set ficha_catastro_portal_id = (
         select p.id
           from ficha_catastro_portal p
          where coalesce(p.tipo_via, '')   = coalesce(a.tipo_via, '')
            and coalesce(p.nombre_via, '') = coalesce(a.nombre_via, '')
            and coalesce(p.numero, '')     = coalesce(a.numero, '')
            and coalesce(p.escalera, '')   = coalesce(a.escalera, '')
       )
 where a.ficha_catastro_portal_id is null
   and (
         select count(*)
           from ficha_catastro_portal p
          where coalesce(p.tipo_via, '')   = coalesce(a.tipo_via, '')
            and coalesce(p.nombre_via, '') = coalesce(a.nombre_via, '')
            and coalesce(p.numero, '')     = coalesce(a.numero, '')
            and coalesce(p.escalera, '')   = coalesce(a.escalera, '')
       ) = 1;

-- ---------------------------------------------------------------------------
-- 3. Que diga lo que ha hecho
-- ---------------------------------------------------------------------------
--
-- Al pegarla en el editor de SQL, esta ultima consulta es la que se ve. Si no
-- sale 2.530 / 2.519 / 11, algo ha cambiado desde que se escribio y hay que
-- mirarlo antes de seguir.

select count(*)                             as accesos,
       count(ficha_catastro_portal_id)      as enlazados,
       count(*) - count(ficha_catastro_portal_id) as sin_enlazar
  from accesos;
