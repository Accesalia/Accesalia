-- LA FIGURA, LA MANCOMUNIDAD Y LA COMUNIDAD DE CADA ACCESO
--
-- Decidido con Monica el 2-oct-2026, repasando el modelo entero antes de tocar
-- nada. SIN APLICAR: la ejecuta ella.
--
-- De donde viene: el 1-oct se aplico 20261001000000_accesos_comunidad.sql, que
-- dejo `figura` con tres valores y `parte_de_id` apuntando hacia arriba. Esa
-- misma tarde el modelo cambio, y esto es lo que lo pone al dia:
--
--   1. `figura` pasa de 3 valores a los 7 que decidio ella.
--   2. `parte_de_id` se va: era la relacion al reves, y en dos sitios a la vez.
--   3. La mancomunidad se relaciona en tabla aparte, no en columna.
--   4. Cada acceso dice de que comunidad es, como atributo suyo.
--
-- LAS DOS DECISIONES DE FONDO, con sus palabras:
--
--   La mancomunidad VIVE EN `comunidades`, con su propio id, y lo unico que la
--   distingue es `figura`. No es un apano: el art. 24.3 de la LPH dice que la
--   agrupacion de comunidades "gozara, a todos los efectos, de la misma
--   situacion juridica que las comunidades de propietarios". Misma naturaleza
--   juridica, misma tabla.
--
--   Y la comunidad del acceso es una COLUMNA, no una tabla relacional, porque
--   -ella- "es como la ref catastral: algo de ese acceso que no cambia".
--   Jamas en todos estos años ha cambiado de propietario un portal.


-- ---------------------------------------------------------------------------
-- 1. `figura`: los siete terminos
-- ---------------------------------------------------------------------------
--
-- La lista es de Monica (2-oct-2026) y esta ordenada POR FRECUENCIA DE USO, no
-- por la ley. El orden importa en el selector y vive en
-- frontend/lib/comunidadVocabulario.ts: aqui solo se dice QUE VALE.
-- SI SE TOCA UNA LISTA HAY QUE TOCAR LA OTRA.
--
-- Las siete salen de la Ley 49/1960 (LPH) mas dos que no son figuras de la ley
-- sino quien posee:
--
--   Comunidad de Propietarios          art. 2.a -> art. 5 (con titulo constitutivo)
--   Mancomunidad                       art. 24.2.b, "agrupacion de comunidades de
--                                      propietarios": su junta la forman los
--                                      PRESIDENTES de las comunidades agrupadas
--   Entidad Urbanistica                art. 2.e (de conservacion, "cuando asi lo
--                                      dispongan sus estatutos")
--   Propietario Particular             no es LPH: es quien posee
--   Propietario Empresa                idem
--   Subcomunidad                       art. 2.d. Se guarda la ETIQUETA y nada mas:
--                                      Monica no ha encontrado ninguna en años, asi
--                                      que NO se modela de que comunidad cuelga
--   Comunidad sin titulo constitutivo  art. 2.b: el edificio ya ES propiedad
--                                      horizontal de hecho (art. 396 CC) pero nunca
--                                      se otorgo la escritura, asi que NO HAY CUOTAS
--                                      DE PARTICIPACION
--
-- QUE NO ESTA, y a proposito: "complejo inmobiliario privado". El art. 24.2 dice
-- que un complejo nunca existe suelto, siempre esta constituido de una de dos
-- maneras: como una sola comunidad (-> Comunidad de Propietarios) o como
-- agrupacion (-> Mancomunidad). Las dos formas tienen sitio; sobra la palabra.
--
-- VACIO SE ADMITE, PERO ES TRANSITORIO. Yo supuse que muchas se quedarian sin
-- figura y Monica me corrigio el 2-oct: "figura lo asignaremos a todas". Hoy lo
-- estan las 1.216 y la columna no puede nacer obligatoria por eso; cuando esten
-- todas, se podra poner `not null` si ella quiere.

alter table comunidades drop constraint if exists comunidades_figura_check;
alter table comunidades add constraint comunidades_figura_check
  check (figura is null or figura in (
    'Comunidad de Propietarios',
    'Mancomunidad',
    'Entidad Urbanística',
    'Propietario Particular',
    'Propietario Empresa',
    'Subcomunidad',
    'Comunidad sin título constitutivo'
  ));

comment on column comunidades.figura is
$$Que figura juridica es, segun la Ley 49/1960 de Propiedad Horizontal, mas dos valores
para cuando el propietario no es una comunidad. Dato de CAMPO: lo sabe el administrador y
lo dice el titulo constitutivo. Vacio = no consta, y es un estado legitimo.

La lista y su ORDEN (por frecuencia de uso, decision de Monica) viven en
frontend/lib/comunidadVocabulario.ts. Si se toca una, se toca la otra.

MANCOMUNIDAD: las mancomunidades son filas de ESTA tabla, con su propio id, y esto es lo
unico que las distingue. Lo respalda el art. 24.3 de la LPH: la agrupacion de comunidades
"gozara, a todos los efectos, de la misma situacion juridica que las comunidades de
propietarios". Que comunidades la componen se dice en relacion_mancomunidad_comunidades.

OJO AL CONTAR: cualquier pantalla que cuente o liste comunidades incluira tambien las
mancomunidades. Donde eso importe, hay que filtrar por figura.$$;


-- ---------------------------------------------------------------------------
-- 2. Fuera `parte_de_id`
-- ---------------------------------------------------------------------------
--
-- Apuntaba de la comunidad hacia su "madre" en generico, sin decir a que: valia
-- para la mancomunidad y para la subcomunidad a la vez. El modelo del 1-oct por
-- la tarde puso la mancomunidad de arriba abajo y en tabla aparte, y la
-- subcomunidad se quedo sin modelar por decision suya. Asi que esta columna no
-- tiene trabajo: era la misma relacion al reves.
--
-- NO SE BORRA A CIEGAS. Hoy esta vacia -0 de 1.216-, pero si alguien ha escrito
-- algo entre que esto se escribe y se ejecuta, la migracion se para en seco en
-- vez de tirar el dato.

do $$
declare cuantas int;
begin
  select count(*) into cuantas from comunidades where parte_de_id is not null;
  if cuantas > 0 then
    raise exception
      'parte_de_id tiene % filas con dato. No se borra a ciegas: miralo primero.', cuantas;
  end if;
end $$;

alter table comunidades drop constraint if exists comunidades_no_es_su_propio_padre;
drop index if exists comunidades_parte_de_idx;
alter table comunidades drop column if exists parte_de_id;


-- ---------------------------------------------------------------------------
-- 3. `relacion_mancomunidad_comunidades`
-- ---------------------------------------------------------------------------
--
-- El nombre de la tabla es de Monica. Sus palabras: "id contra id, simplemente".
--
-- Por que tabla y no columna, con su argumento: "que mancomunidad sea una
-- columna es un gigantesco ERROR porque tiene mas de una comunidad siempre por
-- definicion. O metes un array de ids o empiezas a duplicar filas". Y ademas,
-- de ayer: una columna de mancomunidad en `comunidades` estaria vacia en casi
-- todas las filas.
--
-- Y por que el nombre no va aqui: el nombre de la mancomunidad ya esta en su
-- propia fila de `comunidades`. Repetirlo en cada fila de la relacion seria
-- guardar la misma verdad en dos sitios.
--
-- NACE VACIA, y es correcto que nazca vacia: saber que fincas forman
-- mancomunidad es dato de campo que hoy no esta en la app. El hueco se conserva.
--
-- Los nombres de las dos columnas son de Monica: `mancomunidad_padre` y
-- `comunidad_hija`. En minusculas porque Postgres pasa a minusculas todo
-- identificador que no vaya entre comillas, y en toda la casa se escribe asi.

create table if not exists relacion_mancomunidad_comunidades (
  mancomunidad_padre uuid not null references comunidades(id) on delete cascade,
  comunidad_hija     uuid not null references comunidades(id) on delete cascade,

  -- NO es contabilidad: es informacion. Monica, 2-oct: "nos dice si una
  -- mancomunidad se ha AMPLIADO en cierta fecha respecto a lo que sabiamos antes
  -- de ella". Como la relacion es aditiva -una fila por comunidad que entra-,
  -- la fecha de cada fila es la fecha en que esa comunidad se sumo, y las filas
  -- ordenadas cuentan el crecimiento de la mancomunidad.
  creado_en          timestamptz not null default now(),

  primary key (mancomunidad_padre, comunidad_hija),

  -- Una mancomunidad no se compone de si misma.
  constraint relacion_mancomunidad_no_es_ella_misma check (mancomunidad_padre <> comunidad_hija)
);

-- La clave primaria ya sirve para "dame las comunidades de esta mancomunidad".
-- Este indice es para la pregunta del reves, que es la que hara la ficha de una
-- comunidad: "¿de que mancomunidad formo parte?".
create index if not exists relacion_mancomunidad_por_comunidad_idx
  on relacion_mancomunidad_comunidades (comunidad_hija);

comment on table relacion_mancomunidad_comunidades is
$$Que comunidades componen cada mancomunidad. Id contra id y nada mas: el nombre de la
mancomunidad esta en su fila de `comunidades` (figura = 'Mancomunidad').

Es la agrupacion de comunidades de propietarios del art. 24.2.b de la LPH, la que se
constituye con el titulo otorgado por los presidentes de todas las comunidades agrupadas,
y cuya junta la forman esos mismos presidentes (art. 24.3). En la calle se llama
mancomunidad, y ese es el nombre que usa la app.

Aditiva: una fila por cada comunidad que pertenece a la mancomunidad. Y `creado_en` no esta
de adorno: como la relacion se va sumando, la fecha de cada fila dice cuando entro esa
comunidad, asi que las filas ordenadas cuentan si la mancomunidad se AMPLIO y cuando
(Monica, 2-oct-2026).$$;


-- ---------------------------------------------------------------------------
-- 4. `accesos.comunidad_id`
-- ---------------------------------------------------------------------------
--
-- ESTO TOCA UNA DE LAS TRES TABLAS VALIDADAS, y se hace porque lo pidio ella:
-- "accesos tenga una columna como atributo que es la comunidad_id a la que
-- pertenece, porque es como la ref catastral: algo de ese acceso que no cambia".
--
-- Por que es verdad que no cambia: solo el propietario de un acceso puede
-- autorizar que se intervenga en el -norma legal-, y en todos estos años no ha
-- cambiado nunca el propietario de un portal. El cambio en el tiempo NO se
-- modela, por decision suya.
--
-- ADMITE VACIO, porque hasta rellenarla no puede ser obligatoria. El relleno es
-- el paso 5 y lo hace la app, arrastrando el trabajo de `accesos_comunidad`
-- -donde `de_donde` guarda el porque de cada casado- y cruzando POR DIRECCION,
-- no por referencia catastral: la referencia es la parcela, y una parcela puede
-- tener varias comunidades. Nada se escribe hasta que ella vea el recuento.
--
-- ON DELETE SET NULL, decidido por Monica el 2-oct-2026. Yo habia propuesto
-- RESTRICT -que no deja borrar una comunidad mientras le queden accesos- y ella
-- lo corrigio con el caso real, que yo no habia pensado:
--
--     "No creo que nunca borre una comunidad, no le veo la necesidad salvo que
--      sea un error: se crea una que tiene datos incorrectos y se decide
--      borrarla y crearla desde cero. Para ese caso, tener los accesos en null
--      es mejor: quedan ahi a la espera de la nueva comunidad. Tener accesos
--      mudos que no aparecen no es problema."
--
-- Con RESTRICT, ese borrado -el unico que va a pasar de verdad- seria imposible
-- sin desenganchar los accesos a mano primero. Con SET NULL los accesos
-- sobreviven, se quedan esperando, y se vuelven a enganchar a la comunidad
-- buena. El acceso nunca se pierde: existe con o sin comunidad.

alter table accesos
  add column if not exists comunidad_id uuid references comunidades(id) on delete set null;

create index if not exists accesos_comunidad_id_idx on accesos (comunidad_id);

comment on column accesos.comunidad_id is
$$La comunidad de propietarios a la que pertenece este acceso. ATRIBUTO del acceso, igual
que su referencia catastral: algo suyo que no cambia (Monica, 2-oct-2026).

Importa porque solo el propietario del acceso puede autorizar que se intervenga en el, y
eso es norma legal: sin esto no se sabe quien firma. Las comunidades de una oportunidad se
DERIVAN de sus accesos; no se guardan aparte.

Si se borra la comunidad, el acceso SOBREVIVE y esta columna se queda vacia (on delete set
null). Decision de Monica: el unico borrado real es corregir un alta mala, y entonces los
accesos esperan a que se cree la comunidad buena.

Vacio = todavia no se ha podido determinar. Se rellena desde `accesos_comunidad`, cruzando
por direccion (municipio + via + numero + escalera) y NO por referencia catastral, porque
la referencia es la parcela y una parcela puede tener varias comunidades: la manzana de
SANTA CRUZ DE MARCENADO tiene una sola referencia, tres comunidades nuestras y portales de
otras cuatro calles.$$;
