-- ===========================================================================
-- ALCOBENDAS, SEGUNDA TANDA   (Monica, 3-oct-2026)
--
-- Mismo metodo que Alcorcon, esta vez con el script `scripts/tanda_municipio.py`
-- en vez de a mano. De 35 carpetas, casan 14 con su lista; de esas, 8 tenian
-- tarjeta y se han mirado una a una.
--
-- LO QUE HA TRAIDO ESTE MUNICIPIO Y ALCORCON NO TENIA:
--
--   * UN NOMBRE PROPIO. Francisca Delgado 7 se llama "CDAD PROP SOTO VEGA". La
--     denominacion oficial no tiene por que contener la direccion. Decision suya:
--     manda la tarjeta, y a la direccion se llega por la opp y por los accesos.
--   * UNA COMUNIDAD QUE ABARCA SIETE PORTALES. Kerria 30 es en realidad
--     "KERRIA N 28 AL 40". Nos llamo un ascensorista por el portal 30 y ni el ni
--     nosotros sabiamos que la comunidad era el bloque entero. Los ocho accesos
--     ya estaban en la base. De aqui sale una oportunidad comercial nueva, que es
--     para lo que existe `oportunidades.oportunidad_origen_id` (hoy vacio en las
--     1.228).
--   * UN CAMBIO DE LETRA documentado. Marques de Valdavia 76 era E78758497 y es
--     H78758497 desde el 02-10-2024, por un requerimiento de la CAM. Estan las
--     DOS tarjetas en la carpeta, `cif_viejo.pdf` y `Cif actual.pdf`, y se guardan
--     las dos: version 1 no vigente y version 2 vigente.
--   * DOS NIF PROVISIONALES, uno de ellos con la tarjeta CADUCADA EN 1994.
--   * UN TITULAR QUE NO ES UNA COMUNIDAD. Av. Europa 20 es de CBRE GWS ESPAÑA
--     S.L., y el fichero no es una tarjeta: es un correo de Schindler impreso.
--     Tercer caso en dos dias (ROSERSE, OSTALAZAR, CBRE) y los tres entran por un
--     ascensorista. Cuando el encargo viene por ahi, el cliente es una empresa.
--
-- FIGURA. Se rellena con lo que dice la tarjeta y solo donde la hemos leido: si
-- pone "CDAD PROP", Comunidad de Propietarios; si es una sociedad, Propietario
-- Empresa. Donde no hay tarjeta, se queda vacia. No se deduce de nada.
-- ===========================================================================

begin;

-- 1 ------------------------------------------ una figura mas: Organismo
-- "incluiria en figura un termino mas: organismo, por lo del castillo de Avila",
-- cuyo propietario era el ayuntamiento. No existe tabla de organismos todavia y
-- NO se crea hoy: los organismos volveran a aparecer, y con mas fuerza, por el
-- lado de licencias -ayuntamiento, junta de distrito, ECU, COAM-, y conviene
-- modelarlos conociendo los dos usos y no solo este.
alter table comunidades drop constraint if exists comunidades_figura_check;
alter table comunidades add constraint comunidades_figura_check check (
  figura is null or figura in (
    'Comunidad de Propietarios',
    'Mancomunidad',
    'Entidad Urbanística',
    'Propietario Particular',
    'Propietario Empresa',
    'Subcomunidad',
    'Comunidad sin título constitutivo',
    'Organismo'
  )
);

-- 2 --------------------------------------------- lo que dice cada tarjeta
create temporary table _leido (
  comunidad_id uuid,
  carpeta      text,
  nif          text,
  denominacion text,
  figura       text,
  ruta_dropbox text,
  nota         text
) on commit drop;

insert into _leido values
('a735d32d-417e-40fe-ac11-3aa5b2e8150b', 'aveuropa20', 'B83402883', 'CBRE GWS ESPAÑA S.L.', 'Propietario Empresa', 'MADRID\1APROVINCIA\ALCOBENDAS\aveuropa20\1.DATOS\2.DOCUMENTACION\CIF - INFORMACION AV EUROPA 20 ALCOBENDAS.pdf', 'NO ES UNA COMUNIDAD y el fichero NO ES UNA TARJETA: es un correo de Schindler impreso, donde pasan el CIF de la empresa cliente. El titular es una sociedad de facility management.'),
('ac6b51bd-3d7b-4155-b8ea-8fbf3bf4267b', 'constitucion65', 'H80737760', 'CDAD PROP CL CONSTITUCION N 65 ALCOBENDAS', 'Comunidad de Propietarios', 'MADRID\1APROVINCIA\ALCOBENDAS\constitucion65\DATOS\documentacion\CIF CDAD PROP..pdf', null),
('499ac11e-319b-470e-9446-342bc0ef65f2', 'franciscadelgado7', 'H81791089', 'CDAD PROP SOTO VEGA', 'Comunidad de Propietarios', 'MADRID\1APROVINCIA\ALCOBENDAS\franciscadelgado7\1.DATOS\2.DOCUMENTACION\CIF.pdf', 'La denominacion es un NOMBRE PROPIO, no una direccion: la comunidad se llama Soto Vega y su domicilio es Francisca Delgado 7. A la direccion se llega por la opp y por los accesos.'),
('2bbc59bb-61ef-419a-a3fb-ce4bf73ad20f', 'jarama24', 'H79155727', 'CDAD PROP CL JARAMA N 24 ALCOBENDAS', 'Comunidad de Propietarios', 'MADRID\1APROVINCIA\ALCOBENDAS\jarama24\1.DATOS\2.DOCUMENTACION\CIF.pdf', null),
('deb4f38e-f0d8-4da4-8ced-f4f1284eca84', 'kerria30', 'H79726097', 'CDAD PROP CL KERRIA N 28 AL 40 LA MORALEJA ALCOBENDAS', 'Comunidad de Propietarios', 'MADRID\1APROVINCIA\ALCOBENDAS\kerria30\1.DATOS\2.DOCUMENTACION\CIF comunidad.pdf', 'La comunidad abarca SIETE portales (28 al 40) y la opp es solo del 30: nos llamo un ascensorista por ese portal. Los ocho accesos ya existen en la base.'),
('8dad408c-a7db-461c-8bff-75145a2898e4', 'marquesdevaldavia76', 'H78758497', 'CDAD PROP CL MARQUES DE VALDAVIA 76 ALCO', 'Comunidad de Propietarios', 'MADRID\1APROVINCIA\ALCOBENDAS\marquesdevaldavia76\1.DATOS\2.DOCUMENTACION\Cif actual.pdf', 'Le CAMBIARON LA LETRA del CIF: era E78758497 y es H78758497 desde el 02-10-2024. Se guardan las dos tarjetas.'),
('5bffc975-555c-4d5d-86f1-72929871c190', 'miraflores12', 'H79173191', 'CDAD PROP CL MIRAFLORES N 12 ALCOBENDAS', 'Comunidad de Propietarios', 'MADRID\1APROVINCIA\ALCOBENDAS\miraflores12\1.DATOS\2.DOCUMENTACION\CIF.pdf', 'NIF PROVISIONAL (1989). La tarjeta avisa de que falta aportar documentacion para el definitivo.'),
('e2a15eea-fafa-49b6-9a02-b372c7da63c5', 'plazaconcordia1', 'H80745524', 'CDAD PROP PZ CONCORDIA N 1 ALCOBENDAS', 'Comunidad de Propietarios', 'MADRID\1APROVINCIA\ALCOBENDAS\plazaconcordia1\1.DATOS\2.DOCUMENTACION\CIF.pdf', 'TARJETA PROVISIONAL Y CADUCADA: pone ''CADUCA: 10-06-94''. Hay que pedir la definitiva.');

-- FRENO. Si algun CIF que YA esta en la base no coincide con el de la tarjeta,
-- aborta. En Alcobendas no pasa: los que ya estaban coinciden los cinco.
do $$
declare chocan int;
begin
  select count(*) into chocan
  from _leido l join comunidades c on c.id = l.comunidad_id
  where c.cif_comunidad is not null and c.cif_comunidad <> l.nif;
  if chocan > 0 then
    raise exception 'Hay % CIF en la base que NO coinciden con la tarjeta. Nada escrito.', chocan;
  end if;
end $$;

-- 3 ------------------------------- nombre oficial, CIF y figura
update comunidades c
set nombre         = l.denominacion,
    cif_comunidad  = coalesce(c.cif_comunidad, l.nif),
    figura         = l.figura,
    actualizado_en = now()
from _leido l
where c.id = l.comunidad_id;

-- 4 -------------------------------------------- las tarjetas, como documento
insert into documentos (comunidad_id, tipo_documento_id, naturaleza, backend,
                        origen_ruta_dropbox, estado_firma, vigente, grupo_id,
                        n_version, justificacion)
select l.comunidad_id,
       (select id from tipos_documento where nombre = 'tarjeta_cif'),
       'migrado', 'dropbox', l.ruta_dropbox, 'no_aplica', true, gen_random_uuid(), 1,
       l.nota
from _leido l;

-- 5 ------------------------------- la tarjeta VIEJA de Marques de Valdavia
-- El mecanismo de versiones, estrenado: mismo grupo_id que la vigente,
-- n_version = 0 porque es ANTERIOR, y vigente = false. No se borra: es la prueba
-- de que esa comunidad tuvo el CIF con letra E.
insert into documentos (comunidad_id, tipo_documento_id, naturaleza, backend,
                        origen_ruta_dropbox, estado_firma, vigente, grupo_id,
                        n_version, justificacion)
select d.comunidad_id,
       d.tipo_documento_id,
       'migrado', 'dropbox', 'MADRID\1APROVINCIA\ALCOBENDAS\marquesdevaldavia76\1.DATOS\2.DOCUMENTACION\cif_viejo.pdf', 'no_aplica', false, d.grupo_id, 0,
       'Tarjeta ANTERIOR, con el CIF E78758497 (letra E). Sustituida por la '
       'de 02-10-2024 con letra H. Se conserva porque documenta el cambio.'
from documentos d
join _leido l on l.comunidad_id = d.comunidad_id and l.carpeta = 'marquesdevaldavia76'
where d.n_version = 1;

-- 6 ---------------------------------------- lo que caduca y lo provisional
-- `documentos` ya tiene `fecha_caducidad`: no hace falta campo nuevo para decir
-- "el archivo que hay esta caducado". La pantalla deriva de ahi el chivato.
update documentos d
set fecha_caducidad = date '1994-06-10', actualizado_en = now()
from _leido l
where d.comunidad_id = l.comunidad_id and l.carpeta = 'plazaconcordia1'
  and d.n_version = 1;

commit;

begin;
-- 7 ------------------------- las carpetas de Alcobendas fuera de su lista
insert into comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una
  (comunidad_autonoma, municipio, carpeta, ruta_dropbox, tiene_tarjeta_cif,
   cif_en_la_ficha, nombre_en_la_ficha)
values
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'begonia60', 'MADRID\1APROVINCIA\ALCOBENDAS\begonia60', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'capitanfranciscosanchez34', 'MADRID\1APROVINCIA\ALCOBENDAS\capitanfranciscosanchez34', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'cañon9', 'MADRID\1APROVINCIA\ALCOBENDAS\cañon9', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'constitucion59-61', 'MADRID\1APROVINCIA\ALCOBENDAS\constitucion59-61', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'cuestablanca2', 'MADRID\1APROVINCIA\ALCOBENDAS\cuestablanca2', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'fuego53', 'MADRID\1APROVINCIA\ALCOBENDAS\fuego53', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'granada9', 'MADRID\1APROVINCIA\ALCOBENDAS\granada9', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'isladecorcega3', 'MADRID\1APROVINCIA\ALCOBENDAS\isladecorcega3', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'isladecordega20', 'MADRID\1APROVINCIA\ALCOBENDAS\isladecordega20', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'lerida6', 'MADRID\1APROVINCIA\ALCOBENDAS\lerida6', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'maestrobarbieri2-4-6-8', 'MADRID\1APROVINCIA\ALCOBENDAS\maestrobarbieri2-4-6-8', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'marquesdevaldavia73', 'MADRID\1APROVINCIA\ALCOBENDAS\marquesdevaldavia73', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'mercedesizquierdo3', 'MADRID\1APROVINCIA\ALCOBENDAS\mercedesizquierdo3', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'miraflores6-8', 'MADRID\1APROVINCIA\ALCOBENDAS\miraflores6-8', true, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'paseodelachopera85', 'MADRID\1APROVINCIA\ALCOBENDAS\paseodelachopera85', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'plazasauce4', 'MADRID\1APROVINCIA\ALCOBENDAS\plazasauce4', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'santiagoapostol16', 'MADRID\1APROVINCIA\ALCOBENDAS\santiagoapostol16', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'sanvicente13', 'MADRID\1APROVINCIA\ALCOBENDAS\sanvicente13', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'sanvicente18', 'MADRID\1APROVINCIA\ALCOBENDAS\sanvicente18', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'teruel1', 'MADRID\1APROVINCIA\ALCOBENDAS\teruel1', false, null, null),
('COMUNIDAD DE MADRID', 'ALCOBENDAS', 'valladolid11', 'MADRID\1APROVINCIA\ALCOBENDAS\valladolid11', false, null, null)
on conflict (municipio, carpeta) do nothing;

commit;
