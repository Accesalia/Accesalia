-- LOS ESCANEADOS DEL POLYCAM, Y A QUE ACCESOS PERTENECEN
--
-- Diseño de Monica, 2-oct-2026. SIN APLICAR: la ejecuta ella.
--
-- ============================================================================
-- POR QUE UNA TABLA PROPIA Y NO `documentos`
-- ============================================================================
--
-- Sus palabras: "polycam no es un documento, es un escaneado. No va a esa tabla,
-- va a otra. Por que? porque los demas documentos se guardan cuando ya hay
-- firmas, o al menos algo solido. El polycam es fase temprana, y no siempre se
-- hace."
--
-- Y encaja con lo que `documentos` ya exige: esa tabla tiene un CHECK llamado
-- `chk_documentos_de_algo` que obliga a que toda fila cuelgue de una comunidad,
-- un proyecto o una oportunidad. Un escaneado que acaba de entrar por correo no
-- cuelga de nada todavia, asi que ahi no cabe -y no debe caber, porque esa regla
-- es la que impide que `documentos` se vuelva un cajon de sastre-.
--
-- ============================================================================
-- Y POR QUE DOS TABLAS Y NO UNA COLUMNA
-- ============================================================================
--
-- Lo razono ella misma, y es muchos a muchos:
--
--   "varios accesos pueden tener el mismo polycam_id. Pero un acceso puede tener
--    mas de un polycam_id: a menudo se hace otro escaneado si faltaban cosas, no
--    se hizo una parte, salio mal y se repite..."
--
-- Un escaneado cubre VARIOS accesos -el caso "TODAS" de Nectar, que tiene tres
-- escaleras- y un acceso acumula VARIOS escaneados a lo largo del tiempo. Una
-- columna solo guarda un valor, asi que no entra por ninguno de los dos lados.
--
-- La diferencia con la referencia catastral o con la comunidad, que SI son
-- columnas de `accesos`: de esas hay una y solo una, siempre. El escaneado no se
-- parece a la referencia, se parece a una foto: hay una, y luego otra mejor.
--
-- "TODAS" NO SE GUARDA COMO VALOR. No hay casilla "todas" en ninguna parte: es
-- solo lo que Alex pulsa en la pantalla, y lo que produce son N filas, una por
-- acceso marcado. La tabla no tiene caso especial.
--
-- ============================================================================
-- LAS REGLAS DE ENTRADA, que son distintas a las de todo lo demas
-- ============================================================================
--
--   "que se guarde todo, no filtra ni por remitente, ni asunto, ni nada."
--
-- Hoy el buzon RECHAZA: si el remitente no esta de alta, fuera; si el asunto no
-- encaja con una direccion, fuera. Y los dos escaneados que llegaron el 2-oct
-- rebotaron por el remitente, los dos de gente de casa mandando desde el movil
-- con su cuenta personal (un icloud y un gmail). Por eso el filtro sobra.
--
-- El cotejo deja de decidir y pasa a PROPONER: cuando entra una fila, se ofrecen
-- los accesos candidatos, y ALEX decide cuales son. La pantalla se llama
-- "revision polycam" y la ven quienes tienen la funcion `viabilidades`, que hoy
-- son Alex Figueroa y Daniel -por funcion, no por nombre, asi que si manaña entra
-- otro le aparece sola-.

-- ---------------------------------------------------------------------------
-- 1. `escaneados_polycam`
-- ---------------------------------------------------------------------------

create table if not exists escaneados_polycam (
  id                       uuid primary key default gen_random_uuid(),

  -- Cuando entro la fila en la app. No es la fecha del escaneo ni la del correo.
  -- Monica: "para que tengamos una fecha desde la que crear la alerta para Alex:
  -- 'tienes nuevos escaneados para revisar', 'hace 6 dias que tienes un escaneado
  -- esperando', 'tio, que el escaneado esta cogiendo polvo...'".
  creado_en                timestamptz not null default now(),

  -- Tal como vengan, sin interpretar y sin que decidan nada.
  remitente                text,
  asunto                   text,

  -- LA FECHA DEL ESCANEO, no la del correo. Monica: "asi un reenvio no desvirtua
  -- las fechas". Vacia mientras no se pueda sacar del fichero.
  fecha                    date,

  -- EL MESSAGE-ID DEL CORREO. Con esto se vuelve siempre al original: su fecha,
  -- su cuerpo, sus adjuntos. El correo NO se copia aqui -"el mail y su fecha lo
  -- tenemos en el buzon, podemos consultarlo"-, pero para consultarlo hay que
  -- saber cual es, y eso es esto. Se guarda el Message-ID y no el numero de orden
  -- del buzon porque el numero cambia si el buzon se reconstruye y el Message-ID
  -- no: lo pone quien envia y es unico para siempre.
  identificador_correo     text,

  -- Como lo bautizo Polycam. A veces lleva dentro el nombre de la captura.
  nombre_original_fichero  text,

  -- LAS DOS FORMAS EN QUE LLEGA UN ESCANEADO, Y SE GUARDAN LAS DOS. Monica: "del
  -- polycam guardemos la ruta Y el archivo, ambas. Aunque la ruta caduque, a
  -- veces necesitamos reintentar si falla, mejor tenerlo".
  ruta_polycam             text,   -- la URL de Polycam (el "enviar enlace")
  polycam                  text,   -- el .glb en nuestro almacen (el "exportar")

  -- LA FOTO BONITA, y la hace ALEX despues, no llega por correo. Es una captura
  -- del modelo 3D que se adjunta al informe de viabilidad. Es la segunda cosa
  -- grafica de esta tabla y no se confunde con la primera: el .glb es el modelo
  -- -que se usa muchisimo luego, en presentaciones, en el proyecto, y para sacar
  -- imagenes del ANTES para subvenciones cuando se han olvidado de hacerlas- y
  -- esto es el .png que va en la plantilla.
  captura_polycam          text,

  -- QUE NO ENTRE DOS VECES EL MISMO FICHERO DEL MISMO CORREO. No vale con el
  -- Message-ID solo: un correo puede traer varios adjuntos, y cada uno es un
  -- escaneado. La pareja permite varios por correo y bloquea el duplicado.
  constraint escaneados_polycam_un_fichero_por_correo
    unique (identificador_correo, nombre_original_fichero)
);

comment on table escaneados_polycam is
$$Los escaneados que entran por el buzon del Polycam. NO son documentos y por eso no estan
en `documentos`: esa tabla guarda lo que ya tiene firma o algo solido detras, y exige que
toda fila cuelgue de una comunidad, un proyecto o una oportunidad. Un escaneado es fase
temprana, no siempre se hace, y cuando entra no cuelga de nada todavia.

AQUI NO SE RECHAZA NADA. No se filtra por remitente, ni por asunto, ni por nada: entra todo
y se guarda todo (Monica, 2-oct-2026). El cotejo del asunto ya no decide, PROPONE: ofrece
los accesos candidatos y Alex marca cuales son, en la pantalla "revision polycam".

De quien es el escaneado se dice en relacion_polycam_acceso, porque un escaneado puede
cubrir varios portales y un portal acumula varios escaneados.$$;

-- ---------------------------------------------------------------------------
-- 2. `relacion_polycam_acceso`
-- ---------------------------------------------------------------------------
--
-- NORMA DE NOMBRES DE MONICA (2-oct-2026): las tablas de relacion se llaman
-- `relacion_<cosa1>_<cosa2>`, "por facilidad despues de reconocerlas". Y el
-- singular o el plural de cada parte dice cuantos hay al otro lado: aqui las dos
-- en singular porque "lo HABITUAL es un escaneado por escalera: casi siempre va a
-- ser uno a uno, pero lo dejo sin capar para las otras opciones".

create table if not exists relacion_polycam_acceso (
  polycam_id  uuid not null references escaneados_polycam(id) on delete cascade,
  acceso_id   uuid not null references accesos(id) on delete cascade,

  -- La pareja es la clave: impide vincular dos veces el mismo escaneado al mismo
  -- portal sin querer.
  primary key (polycam_id, acceso_id)
);

-- La clave primaria ya sirve para "a que accesos pertenece este escaneado". Este
-- indice es para la pregunta del reves, que es la que hara la ficha de un portal:
-- "¿que escaneados tiene este acceso?".
create index if not exists relacion_polycam_por_acceso_idx
  on relacion_polycam_acceso (acceso_id);

comment on table relacion_polycam_acceso is
$$A que accesos pertenece cada escaneado del Polycam. Id contra id.

Un escaneado puede cubrir VARIOS accesos: cuando Alex marca "TODAS" en Nectar 31, que tiene
tres escaleras, salen tres filas con el mismo polycam_id. Y un acceso acumula VARIOS
escaneados con el tiempo, porque se repite el escaneo si faltaba algo o salio mal.

"TODAS" no se guarda como valor: es lo que Alex pulsa, y lo que produce son N filas.$$;
