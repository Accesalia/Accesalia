-- =====================================================================
-- LA CLON RECIBE LO QUE FALTABA DE LA FICHA
-- Monica, 4-oct-2026. Su pregunta: "la tabla clon contiene ya todos los datos
-- que tambien contiene la oportunidad en produccion? Nos falta alguna columna,
-- algun dato que hayamos visto que es importante? Y viceversa".
-- Faltaban siete, y una sobraba.
--
-- 1) ref_catastral_de_la_ficha. NO es la referencia catastral buena, y el
--    nombre lo dice a proposito. Lo vio ella: "referencia catastral no sale de
--    la busqueda de direccion en Catastro? (...) Cuando se crea una oportunidad
--    se busca su direccion en Catastro, se crean los accesos, se baja la ficha
--    bruta, y todo eso queda reflejado de forma indirecta: no hay un sitio en la
--    oportunidad donde guardarlo, sino que viven sus accesos".
--
--    Comprobado y tiene razon: 'accesos.ref_catastral' tiene 2.530 filas,
--    'ficha_catastro' 1.186, y 'oportunidades.referencia_catastral' esta a CERO
--    en las 1.228 -ese campo solo sirve para pintar el aviso de "pendiente de
--    confirmar la direccion" en el alta, no es el dato-.
--
--    Entonces, por que guardarla igual: "ya que la tenemos, es un dato facil de
--    pillar. Si luego, cuando hagamos la importacion de Catastro, tenemos dudas,
--    ya tenemos un punto de partida con el que cotejar. Lo guardamos como
--    BIBLIOGRAFIA, pero no lo vamos a guardar luego en las tablas de
--    produccion". De ahi el nombre largo: que nadie la tome por la buena.
--
-- 2) El contacto del administrador, EN TEXTO (nombre, telefono, correo). Su
--    sitio de verdad es persona + puesto, y la oportunidad apunta a 'puesto_id'.
--    Pero resolverlo ahora seria crear 163 personas sin que ella las repase, y
--    su regla es la contraria: "si son nuevos, los reviso yo, porque si no
--    nuestra lista limpia de administradores se va a perder". Se guarda como lo
--    escribe la ficha y se resuelve al crear las oportunidades. Igual que el
--    presidente.
--
-- 3) comercial_interno: el NUESTRO, no el de la contrata que trae el encargo.
--    Sale en 380 de 410 fichas, y destapa un agujero: el codigo legible de la
--    oportunidad es 'SIGLAS-ANO-NNN' y se genera de las iniciales del comercial,
--    pero las 1.228 oportunidades no tienen comercial, asi que NINGUNA tiene
--    codigo. El alta ya lo dice: "sin siglas no se inventa un codigo".
--
--    TRES REGLAS SUYAS QUE SE VALIDAN ENTRE ELLAS:
--      - Sin etiqueta en la ficha = Daniel, siempre ("es de la epoca de cuando
--        no habia mas comercial que el").
--      - Carlos Garcia entro en abril de 2025.
--      - Alvaro entro el 1 de enero de 2026.
--
--    Comprobado contra las fechas de las 410 carpetas: ni un solo Alvaro antes
--    de 2026, y los 6 "Carlos" anteriores a abril-2025 tienen TODOS fecha
--    1-ene-2025, que es una fecha MIA: la ficha solo decia "2025" y el dia lo
--    puse yo por convencion. Es decir, la regla no se incumple ni una vez; lo
--    que hace es corregir mis fechas aproximadas.
--
-- 4) trajo_empresa / trajo_persona: quien nos trajo el encargo, que NO es
--    nuestro comercial. "Nacho Fain es el comercial de FAIN que nos llamo para
--    encargarnos ese proyecto". Hasta 2023 el 80% del trabajo venia de contratas
--    asi; hoy ronda el 20%.
--
-- Lo que NO se anade: 'referencia_catastral' como dato bueno (vive en los
-- accesos) y 'canal_id' (se deduce de quien nos lo trajo).
-- =====================================================================

alter table public.comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una
  add column ref_catastral_de_la_ficha text,
  add column admin_contacto            text,
  add column admin_telefono            text,
  add column admin_correo              text,
  add column comercial_interno         text,
  add column trajo_empresa             text,
  add column trajo_persona             text;

comment on column public.comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una.ref_catastral_de_la_ficha is
  'BIBLIOGRAFIA, no el dato bueno: la referencia tal como la escribe la ficha, para cotejar cuando se baje Catastro. NO pasa a produccion.';
comment on column public.comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una.admin_contacto is
  'La persona de contacto en la administracion, en texto. Su sitio de verdad es persona + puesto; se resuelve al crear la oportunidad, con repaso de los nuevos.';
comment on column public.comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una.comercial_interno is
  'NUESTRO comercial: Carlos, Alvaro o Daniel. Sin etiqueta en la ficha = Daniel. Carlos entro en abril-2025 y Alvaro el 1-ene-2026: sirve de red para validar fechas.';
comment on column public.comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una.trajo_empresa is
  'Quien nos trajo el encargo (una contrata, normalmente). NO es nuestro comercial.';
