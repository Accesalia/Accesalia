-- ===========================================================================
-- ALCORCON, PRIMERA TANDA: NOMBRE OFICIAL Y TARJETAS DEL CIF (Monica, 2-oct-2026)
--
-- "coger un municipio, descargarnos sus rutas y matchear contra mi lista de
--  julio. Las que hagan match, entonces si, ir a por su tarjeta del cif."
--
-- COMO SE HA HECHO. Las 82 carpetas de Dropbox de ALCORCON contra sus 42
-- comunidades: casan 38. De esas, 20 tenian tarjeta archivada y SE HAN MIRADO
-- UNA A UNA, porque son escaneos y no hay texto que extraer.
--
-- LO QUE SE DESCUBRIO AL LEER PRODUCCION, Y QUE CAMBIA ESTA MIGRACION:
-- 17 de los 18 CIF YA ESTABAN en la base, del backfill de julio desde las FICHAS
-- DE DATOS. Y los 17 COINCIDEN con lo que pone la tarjeta. Cero discrepancias.
-- O sea: aquel backfill era bueno, y ahora esta verificado documento a documento
-- contra la Agencia Tributaria. Por eso esto NO escribe 18 CIF: escribe UNO
-- (Badajoz 20, que estaba vacio). Lo que aporta de verdad es el NOMBRE OFICIAL y
-- el REGISTRO DE LA TARJETA.
--
-- EL NOMBRE. `comunidades.nombre` pasa a ser la denominacion literal de la AEAT,
-- con sus erratas (si, "CODAD"), porque es lo que tiene que salir en una factura.
-- Los 26 dias de ella NO se pierden: estan en `oportunidades.nombre`, comprobado
-- ANTES de escribir (0 opps sin comunidad_id, 0 comunidades sin opp, y en
-- Alcorcon los 42 nombres identicos).
--
-- DECISIONES SUYAS QUE ESTAN AQUI DENTRO:
--   * AV DEL OESTE 1-3 se queda con el CIF del garaje (H82474545, CDAD USUARIOS
--     APARCAMIENTO VALLADOLID). Preguntado y contestado: "se queda como esta".
--     OJO: eso arrastra que la comunidad pase a llamarse asi.
--   * paseocastilla1 NO entra: no hay tarjeta, solo un sello manuscrito de 1991
--     en la legalizacion del libro de actas. Se lee H79889184 pero a mano, y un
--     CIF que va a facturacion no se da por bueno de una letra manuscrita.
--   * santamarialablanca5 NO entra: su tarjeta no se ha mirado todavia.
-- ===========================================================================

begin;

-- 1 ------------------------------------------------- el tipo de documento
-- El nombre lo puso ella: `tarjeta_cif`. Pertenece a la COMUNIDAD y la aporta la
-- comunidad. No caduca: el NIF definitivo no vence. Que un dia reemitan la
-- tarjeta -como en Felipe Alvarez 28, que le cambiaron la letra- se resuelve con
-- grupo_id/n_version/vigente, no con fecha de caducidad.
insert into tipos_documento (nombre, aportado_por, caduca, pertenece_a, tipo_completitud)
select 'tarjeta_cif', 'comunidad', false, 'comunidad', 'simple'
where not exists (select 1 from tipos_documento where nombre = 'tarjeta_cif');

-- 2 ------------------------------------------------ lo que dice cada tarjeta
create temporary table _leido (
  nombre_en_lista text,   -- como se llama HOY en `comunidades`
  cif             text,   -- lo que pone la tarjeta
  denominacion    text,   -- literal, erratas incluidas
  ruta_dropbox    text
) on commit drop;

insert into _leido values
('ARBOLEDA 1 ALCORCON', 'H78776291', 'CDAD PROP CL ARBOLEDA 1 ALCORCON', 'MADRID\1APROVINCIA\ALCORCON\arboleda1\1.DATOS\2.DOCUMENTACION\CIF COMUNIDAD PROP.pdf'),
('AV DEL OESTE 1-3 ALCORCON', 'H82474545', 'CDAD USUARIOS APARCAMIENTO VALLADOLID DE ALCORCON', 'MADRID\1APROVINCIA\ALCORCON\avdeloeste1-3\1.DATOS\2.DOCUMENTACION\CIF Valladolid.pdf'),
('AVILA 3 ALCORCON', 'H79717740', 'CDAD PROP CL AVILA N 3 ALCORCON', 'MADRID\1APROVINCIA\ALCORCON\avila3\1.DATOS\2.DOCUMENTACION\CIF AVILA 3.pdf'),
('BADAJOZ 20 ALCORCON', 'H79272555', 'CDAD PROP CL BADAJOZ N 20 ALCORCON', 'MADRID\1APROVINCIA\ALCORCON\badajoz20\1.DATOS\2.DOCUMENTACION\cif (7).pdf'),
('BILBAO 1 ALCORCON', 'H80580558', 'CDAD PROP CL BILBAO N 1 DE ALCORCON', 'MADRID\1APROVINCIA\ALCORCON\bilbao1\1.DATOS\2.DOCUMENTACION\CIF BILBAO 1.pdf'),
('CAÑADA 22 ALCORCON', 'H79648440', 'CDAD PROP CL LA CAÑADA N 22 ALCORCON', 'MADRID\1APROVINCIA\ALCORCON\cañada22\1.DATOS\2.DOCUMENTACION\CIF CAÑADA 22.pdf'),
('CAÑADA 8 ALCORCON', 'H79908042', 'CDAD PROP CL CAÑADA N 8 ALCORCON', 'MADRID\1APROVINCIA\ALCORCON\cañada8\1.DATOS\2.DOCUMENTACION\CIF.pdf'),
('FUENLABRADA 15 ALCORCON', 'H79701868', 'CDAD PROP CL FUENLABRADA N 15 ALCORCON', 'MADRID\1APROVINCIA\ALCORCON\fuenlabrada15\1.DATOS\2.DOCUMENTACION\CIF COMUNIDAD.pdf'),
('IGLESIA 22 ALCORCON', 'H80620081', 'CODAD PROP CL SANTAMARIA LA BLANCA 3 Y 5 IGLESIA 22', 'MADRID\1APROVINCIA\ALCORCON\iglesia22\1.DATOS\2.DOCUMENTACION\CIF.pdf'),
('INFANTAS 9 ALCORCON', 'H79265344', 'CDAD PROP CL INFANTAS N 9 ALCORCON', 'MADRID\1APROVINCIA\ALCORCON\infantas9\1.DATOS\2.DOCUMENTACION\CIF INFANTAS 9.pdf'),
('JABONERIA 36 ALCORCON', 'H79915757', 'CDAD PROP CL JABONERIA N 36 DE ALCORCON', 'MADRID\1APROVINCIA\ALCORCON\jaboneria36\1.DATOS\2.DOCUMENTACION\cif.pdf'),
('PRINCESA 12 ALCORCON', 'H79601811', 'CDAD PROP CL PRINCESA N 12 ALCORCON', 'MADRID\1APROVINCIA\ALCORCON\princesa12\1.DATOS\2.DOCUMENTACION\CIF.pdf'),
('PRINCESA 25 ALCORCON', 'H81475170', 'CDAD PROP CL PRINCESA N 25 DE ALCORCON', 'MADRID\1APROVINCIA\ALCORCON\princesa25\1.DATOS\2.DOCUMENTACION\CIF PRINCESA 25.pdf'),
('SAN IGNACIO 6 ALCORCON', 'H80626294', 'CDAD PROP CL SAN IGNACIO N 6 DE ALCORCON', 'MADRID\1APROVINCIA\ALCORCON\sanignacio6\1.DATOS\2.DOCUMENTACION\CIF San Ignacio 6 Alcorcon.pdf'),
('SANTA MARIA LA BLANCA 3 ALCORCON', 'H80620081', 'CODAD PROP CL SANTAMARIA LA BLANCA 3 Y 5 IGLESIA 22', 'MADRID\1APROVINCIA\ALCORCON\santamarialablanca3\1.DATOS\2.DOCUMENTACION\CIF.pdf'),
('SIERRA DE ALBARRACIN 13 ALCORCON', 'H79947008', 'CDAD PROP CL SIERRA ALBARRACIN N 13 DE ALCORCON', 'MADRID\1APROVINCIA\ALCORCON\sierradealbarracin13\1.DATOS\2.DOCUMENTACION\CIF.pdf'),
('VIRGEN DE ICIAR 15 ESCALERA 4 ALCORCON', 'H82954199', 'CDAD PROP VIRGEN DE ICIAR 15, ESCALERA 4', 'MADRID\1APROVINCIA\ALCORCON\virgendeiciar15escalera4\1. DATOS\2.DOCUMENTACION\CIF VIRGEN DE ICIAR 15, ESC4.pdf'),
('VIRGEN DE ICIAR 17 ALCORCON', 'H79575122', 'CDAD PROP CL VIRGEN DE ICIAR N 17 ALCORCON', 'MADRID\1APROVINCIA\ALCORCON\virgendeiciar17\1.DATOS\2.DOCUMENTACION\CIF VIRGEN DE ICIAR 17.pdf'),
('VIRGEN DE ICIAR 22 ALCORCON', 'H79764825', 'CDAD PROP CL VIRGEN DE ICIAR N 22 ALCORCON', 'MADRID\1APROVINCIA\ALCORCON\virgendeiciar22\1.DATOS\2.DOCUMENTACION\CIF.pdf');


-- FRENO. Si alguna no encuentra su comunidad por el nombre, aborta TODO. Mejor
-- no escribir nada que escribir 18 y no saber cual falto.
do $$
declare faltan int;
begin
  select count(*) into faltan from _leido l
  where not exists (select 1 from comunidades c
                    where c.nombre = l.nombre_en_lista and upper(c.municipio) = 'ALCORCON');
  if faltan > 0 then
    raise exception 'No casan % comunidades por nombre. Nada escrito.', faltan;
  end if;
end $$;

-- SEGUNDO FRENO. Si un CIF que YA esta en la base no coincide con el de la
-- tarjeta, aborta. Hoy no pasa en ninguna, pero en las 24 tandas que quedan
-- pasara, y ese es justo el caso que hay que mirar a mano, no pisar.
do $$
declare chocan int;
begin
  select count(*) into chocan
  from _leido l join comunidades c
    on c.nombre = l.nombre_en_lista and upper(c.municipio) = 'ALCORCON'
  where c.cif_comunidad is not null and c.cif_comunidad <> l.cif;
  if chocan > 0 then
    raise exception 'Hay % CIF en la base que NO coinciden con la tarjeta. Mirar a mano.', chocan;
  end if;
end $$;

-- 3 ----------------------------------------------- fijar a QUIEN es cada una
-- Se resuelve el id ANTES de tocar el nombre, y es importante: SANTA MARIA LA
-- BLANCA 3 e IGLESIA 22 son la MISMA comunidad para Hacienda (H80620081), asi
-- que despues del update las dos filas se llamaran igual y compartiran CIF.
-- Si mas tarde se buscara por nombre o por CIF saldrian cruces y se duplicarian
-- los documentos. Con el id fijado aqui, eso no puede pasar.
alter table _leido add column comunidad_id uuid;

update _leido l
set comunidad_id = c.id
from comunidades c
where c.nombre = l.nombre_en_lista and upper(c.municipio) = 'ALCORCON';

do $$
declare sueltas int;
begin
  select count(*) into sueltas from _leido where comunidad_id is null;
  if sueltas > 0 then
    raise exception 'Quedan % sin comunidad_id. Nada escrito.', sueltas;
  end if;
end $$;

-- 4 ------------------------------------- nombre oficial (y el CIF que falta)
update comunidades c
set nombre         = l.denominacion,
    cif_comunidad  = coalesce(c.cif_comunidad, l.cif),
    actualizado_en = now()
from _leido l
where c.id = l.comunidad_id;

-- 5 --------------------------------------------- la tarjeta como documento
-- backend='dropbox' con la ruta real y storage_ref vacio: el documento existe y
-- sabemos exactamente donde, y todavia no esta copiado a nuestro almacen. Esa es
-- la verdad de hoy, y ademas es el chivato que ella pidio: "alla donde el archivo
-- de la tarjeta del cif este vacio, aparecera el chivato para que se complete".
-- `grupo_id` es obligatorio y no tiene valor por defecto: es el identificador
-- del GRUPO DE VERSIONES. Todas las versiones del mismo documento lo comparten,
-- y por eso aqui cada tarjeta estrena el suyo. El dia que a una comunidad le
-- reemitan la tarjeta -como a Felipe Alvarez 28, que le cambiaron la letra del
-- CIF-, la nueva entra con ESTE MISMO grupo_id, n_version=2 y vigente=true, y la
-- vieja pasa a vigente=false sin borrarse.
insert into documentos (comunidad_id, tipo_documento_id, naturaleza, backend,
                        origen_ruta_dropbox, estado_firma, vigente, grupo_id, n_version)
select c.id,
       (select id from tipos_documento where nombre = 'tarjeta_cif'),
       'migrado', 'dropbox', l.ruta_dropbox, 'no_aplica', true, gen_random_uuid(), 1
from _leido l
join comunidades c on c.id = l.comunidad_id;

-- 6 -------------------------------- las carpetas que NO estan en su lista
-- "vamos a generar una lista aparte, provisional: merece la pena, si hacemos
--  este barrido, tener extraida la info de las direcciones por municipio, no lo
--  perdemos. Pero no lo incluimos ahora."
--
-- Nombre todo en minuscula a proposito: Postgres pasa a minuscula lo que no va
-- entrecomillado, y con mayusculas habria que escribirlo entre comillas SIEMPRE.
-- Y 'lista', no 'lisa'.
create table if not exists comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una (
  id                 uuid primary key default gen_random_uuid(),
  creado_en          timestamptz not null default now(),
  comunidad_autonoma text,
  municipio          text not null,
  carpeta            text not null,
  ruta_dropbox       text,
  tiene_tarjeta_cif  boolean not null default false,
  cif_en_la_ficha    text,
  nombre_en_la_ficha text,
  notas              text,
  constraint una_carpeta_por_municipio unique (municipio, carpeta)
);

comment on table comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una is
  'Carpetas de Dropbox que NO casan con la lista de comunidades. Conviven dos '
  'cosas muy distintas y por eso esta aparte: viabilidades que no cuajaron (se '
  'abria carpeta para guardar la documentacion y si no firmaban se quedaba de '
  'historico) y obra CONTRATADA ANTES DE 2023, cuando no habia Monday y nadie la '
  'dio de alta. El chivato para distinguirlas es tiene_tarjeta_cif o '
  'cif_en_la_ficha: si hay CIF, contrato, porque el CIF se pide para facturar. Se '
  'revisa una a una y entonces se decide. NO se construye nada encima.';

insert into comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una
  (comunidad_autonoma, municipio, carpeta, ruta_dropbox, tiene_tarjeta_cif,
   cif_en_la_ficha, nombre_en_la_ficha)
values
('COMUNIDAD DE MADRID', 'ALCORCON', 'alameda11', 'MADRID\1APROVINCIA\ALCORCON\alameda11', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'alpes8', 'MADRID\1APROVINCIA\ALCORCON\alpes8', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'aranjuez4', 'MADRID\1APROVINCIA\ALCORCON\aranjuez4', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'badajoz7', 'MADRID\1APROVINCIA\ALCORCON\badajoz7', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'caceres25', 'MADRID\1APROVINCIA\ALCORCON\caceres25', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'cisneros24', 'MADRID\1APROVINCIA\ALCORCON\cisneros24', true, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'cisneros31', 'MADRID\1APROVINCIA\ALCORCON\cisneros31', true, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'colon22', 'MADRID\1APROVINCIA\ALCORCON\colon22', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'colon35', 'MADRID\1APROVINCIA\ALCORCON\colon35', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'espada21', 'MADRID\1APROVINCIA\ALCORCON\espada21', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'espada29', 'MADRID\1APROVINCIA\ALCORCON\espada29', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'europa22', 'MADRID\1APROVINCIA\ALCORCON\europa22', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'fuenlabrada13', 'MADRID\1APROVINCIA\ALCORCON\fuenlabrada13', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'gardenias21-23-25-27-29-31-33-35-37-39', 'MADRID\1APROVINCIA\ALCORCON\gardenias21-23-25-27-29-31-33-35-37-39', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'guindales25', 'MADRID\1APROVINCIA\ALCORCON\guindales25', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'infantas1', 'MADRID\1APROVINCIA\ALCORCON\infantas1', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'infantas5', 'MADRID\1APROVINCIA\ALCORCON\infantas5', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'jaboneria4', 'MADRID\1APROVINCIA\ALCORCON\jaboneria4', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'jaboneria61', 'MADRID\1APROVINCIA\ALCORCON\jaboneria61', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'lasvegas17', 'MADRID\1APROVINCIA\ALCORCON\lasvegas17', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'loscantos7-9', 'MADRID\1APROVINCIA\ALCORCON\loscantos7-9', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'malaga6', 'MADRID\1APROVINCIA\ALCORCON\malaga6', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'matadero18', 'MADRID\1APROVINCIA\ALCORCON\matadero18', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'montoro8', 'MADRID\1APROVINCIA\ALCORCON\montoro8', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'nardos6', 'MADRID\1APROVINCIA\ALCORCON\nardos6', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'navalcarnero9', 'MADRID\1APROVINCIA\ALCORCON\navalcarnero9', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'navarra2', 'MADRID\1APROVINCIA\ALCORCON\navarra2', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'olimpicoaureliogarcia', 'MADRID\1APROVINCIA\ALCORCON\olimpicoaureliogarcia', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'parquecomercialalcoraplaza', 'MADRID\1APROVINCIA\ALCORCON\parquecomercialalcoraplaza', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'plazadelahispanidad9', 'MADRID\1APROVINCIA\ALCORCON\plazadelahispanidad9', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'plazadelasescuelas6', 'MADRID\1APROVINCIA\ALCORCON\plazadelasescuelas6', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'polvoranca25', 'MADRID\1APROVINCIA\ALCORCON\polvoranca25', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'polvoranca40', 'MADRID\1APROVINCIA\ALCORCON\polvoranca40', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'portocolon10', 'MADRID\1APROVINCIA\ALCORCON\portocolon10', true, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'principedonjuancarlos2', 'MADRID\1APROVINCIA\ALCORCON\principedonjuancarlos2', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'sanblas6', 'MADRID\1APROVINCIA\ALCORCON\sanblas6', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'sanjose7', 'MADRID\1APROVINCIA\ALCORCON\sanjose7', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'sanpedro6', 'MADRID\1APROVINCIA\ALCORCON\sanpedro6', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'sierradealbarracin17', 'MADRID\1APROVINCIA\ALCORCON\sierradealbarracin17', true, 'H79201265', 'CDAD PROP CL SIERRA ALBARRACIN 17 ALCORCON'),
('COMUNIDAD DE MADRID', 'ALCORCON', 'sierrapeñalara6', 'MADRID\1APROVINCIA\ALCORCON\sierrapeñalara6', false, null, null),
('COMUNIDAD DE MADRID', 'ALCORCON', 'sieteojos4', 'MADRID\1APROVINCIA\ALCORCON\sieteojos4', true, 'H79700076', 'CDAD PROP CL SIETEOJOS N 4 ALCORCON'),
('COMUNIDAD DE MADRID', 'ALCORCON', 'trujillo3', 'MADRID\1APROVINCIA\ALCORCON\trujillo3', true, 'H84629849', 'CDAD PROP CL TRUJILLO N 3 DE ALCORCON'),
('COMUNIDAD DE MADRID', 'ALCORCON', 'virgendeiciar15', 'MADRID\1APROVINCIA\ALCORCON\virgendeiciar15', true, 'H82954199', 'CDAD PROP VIRGEN DE ICIAR 15 ESCALERA 4'),
('COMUNIDAD DE MADRID', 'ALCORCON', 'vizcaya26', 'MADRID\1APROVINCIA\ALCORCON\vizcaya26', false, null, null)
on conflict (municipio, carpeta) do nothing;

commit;

-- ===========================================================================
-- COMPROBACION (aparte, despues del commit):
--
--   select count(*) filter (where cif_comunidad is not null) as con_cif, count(*)
--   from comunidades where upper(municipio)='ALCORCON';            -- 19 de 42
--
--   select count(*) from documentos d
--   join tipos_documento t on t.id = d.tipo_documento_id
--   where t.nombre = 'tarjeta_cif';                                 -- 19
--
--   select count(*) filter (where tiene_tarjeta_cif or cif_en_la_ficha is not null)
--          as contrataron, count(*)
--   from comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una;  -- 7 de 44
-- ===========================================================================
