-- ===========================================================================
-- APLICADA el 3-oct-2026. Este fichero es el registro completo y se puede
-- volver a ejecutar tal cual; en la practica los datos se subieron por la API
-- a una tabla andamio y la migracion leyo de ella, para no teclear 45 KB de
-- SQL a mano. El andamio se conserva en historico_de_tablas.tanda_fuenlabrada,
-- que es la foto exacta de lo que entro.
--
-- FUENLABRADA: NOMBRE OFICIAL Y TARJETAS DEL CIF   (Monica, 3-oct-2026)
--
-- Tercer municipio, mismo metodo de ella: bajar las carpetas del Dropbox,
-- cotejarlas contra su lista de julio, y de las que casan MIRAR LA TARJETA DEL
-- CIF a ojo, una por una. 293 carpetas, 114 comunidades suyas, 111 parejas
-- buenas, 77 con tarjeta. Las 77 vistas.
--
-- LO QUE DICE DEL TRABAJO DE JULIO: de las 68 que ya tenian CIF en la base, 67
-- COINCIDEN exactamente con su tarjeta. La unica que no, no es un error de
-- nadie: a Austria 8 le renovaron el CIF y le cambiaron la letra.
--
-- EL DIGITO DE CONTROL COMO RED. Un CIF lleva un digito calculado a partir de
-- los otros siete, asi que leer mal un numero en una matriz de puntos se
-- detecta solo. Los 77 lo pasan. Dos no se dejaban leer:
--   * ANDALUCIA 6: el sexto digito salia borroso y SOLO un 8 hace valido el
--     numero, asi que es H79882866.
--   * AV PROVINCIAS 10: la matriz esta comida; lo leyo Monica a ojo,
--     H80024334, y el control cuadra.
--
-- LOS SIETE CIF QUE LA BASE NO TENIA: Castillejos 23, Humera 23, La Vega 6,
-- Mostoles 3 portal 8, Plaza Paris 7, Polvoranca 23 y San Francisco Javier 2.
--
-- SIETE NOMBRES QUE DICEN OTRA COSA QUE LA LISTA, y cada uno ensena algo:
--   ALAVA 6            -> OSTALAZAR SL. No es una comunidad: es una empresa.
--   ERAS 9             -> CL LAS HERAS 9. Otra calle: la oficial lleva LAS y H.
--   ZAMORA 1-3-5       -> ED ZAMORA, CL ZAMORA sin numero. Un EDIFICIO con tres
--                         portales: Zamora 1, 3 y 5 comparten la referencia
--                         catastral 1908101VK3610N. No es mancomunidad.
--   CASTILLA LA NUEVA 37 BIS -> el bis es el PORTAL B del 37.
--   NAZARET 32 BIS     -> su libro de actas dice que el edificio estaba en
--                         CALLE ANDALUCIA 8 y hoy es NAZARET 32 BIS.
--   PLAZA DE NICARAGUA 3 -> la tarjeta dice CALLE Nicaragua. Criterio de
--                         Monica: aqui se guarda como calle y la oportunidad
--                         se queda con plaza.
--   MOSTOLES 3 portales 2,4,7,8 -> cuatro CIF distintos en el mismo numero.
--                         "Lo que aqui llamamos portales, Catastro lo llama
--                         escaleras: es una de nuestras subdivisiones dentro
--                         de accesos".
--
-- DOS NO SON TARJETAS y entran marcadas como lo que son: Paseo San Antonio 3 y
-- Pelayos 11 son AUTORIZACIONES firmadas por el presidente. Traen el CIF (los
-- dos validos) y ademas el nombre y el DNI de quien firma.
--
-- AUSTRIA 8, EL UNICO CHOQUE. La base tiene H78759263 y la tarjeta guardada
-- dice E78759263: mismos ocho digitos, distinta letra. Le renovaron el CIF y la
-- tarjeta nueva no la tenemos, pero el vigente lo certifica el Banco Sabadell
-- el 14-05-2026 sobre la cuenta ES62 0081 0295 0400 0129 8234, y lo repite su
-- IEE. Manda la H. La tarjeta E se guarda con vigente = false.
-- Y deja un hilo: su administradora habla de "la administracion de la
-- MANCOMUNIDAD", y el IEE dice que el edificio comparte medianeria con CL
-- AUSTRIA 10 y CL AUSTRIA 6, que NO estan en la lista de Monica.
-- ===========================================================================

begin;

-- 1 --------------------------------------------- lo que dice cada tarjeta
create temporary table _leido (
  comunidad_id uuid,
  carpeta      text,
  nif          text,
  denominacion text,
  ruta_dropbox text,
  nota         text
) on commit drop;

insert into _leido values
('12acf0ab-118a-4344-b022-9580a922c9c9', 'alava6', 'B28111516', 'OSTALAZAR SL', 'MADRID\1APROVINCIA\FUENLABRADA\alava6\1.DATOS\2.DOCUMENTACION\CIF OSTALAZAR (2).pdf', 'EMPRESA. Domicilio social CL DOCTOR ESQUERDO 57 MADRID'),
('b6769ff9-794d-4efb-8f75-e07c31347e1f', 'alemania11', 'H79602397', 'CDAD PROP CL ALEMANIA N 11 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\alemania11\1.DATOS\2.DOCUMENTACION\CIF.pdf', null),
('19f23b15-f7fe-435a-b3be-649a64cc6083', 'alemania6', 'H79228748', 'CDAD PROP CL ALEMANIA N 6 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\alemania6\1.DATOS\2.DOCUMENTACION\CIF.pdf', 'tarjeta moderna con CSV; NIF definitivo 18-08-1989'),
('9db87e08-a03d-4410-885d-a868b6b2b630', 'andalucia10', 'H79706339', 'CDAD PROP CL ANDALUCIA N 10 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\andalucia10\ASCENSOR\1.DATOS\2.DOCUMENTACION\cif andalucia 10 fuenlabrada.pdf', null),
('fbe45529-238b-4ea8-9d68-b2b5a54868a8', 'andalucia6', 'H79882866', 'CDAD PROP CL ANDALUCIA N 6 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\andalucia6\1.DATOS\2.DOCUMENTACION\CIF CP ANDALUCIA 6_000829.pdf', 'el 6o digito salia borroso; se deduce por el digito de control, que solo cuadra con un 8. Sello del Registro de la Propiedad 27-JUN-2006'),
('e7baf195-d913-4a98-8677-d9d944e28c6d', 'angeles14', 'H79741518', 'CDAD PROP CL LOS ANGELES N 14 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\angeles14\1.DATOS\2.DOCUMENTACION\CIF COMUNIDAD.pdf', null),
('bbbb08ba-2396-4178-b6b2-10fb50f7225f', 'angeles7', 'H79746053', 'CDAD PROP CL LOS ANGELES N 7 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\angeles7\sate - accesalia\DATOS\documentacion\CIF comunidad.pdf', 'CIF confirmado a mano en el libro de actas de 1983'),
('5b394477-311b-42d6-bd82-981dafdee873', 'argentina20', 'H79833398', 'CDAD PROP CL ARGENTINA N 20 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\argentina20\1.DATOS\2.DOCUMENTACION\CIF,..pdf', null),
('e25df94f-655f-481e-a62a-6f96a34af8be', 'austria8', 'H78759263', 'CDAD PROP CL AUSTRIA 8 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\austria8\1.DATOS\2.DOCUMENTACION\CIF.pdf', 'LA TARJETA ES LA VIEJA, con letra E (E78759263). El CIF vigente es con H, y lo certifica el Banco Sabadell el 14-05-2026 sobre la cuenta ES62 0081 0295 0400 0129 8234, y lo confirma el IEE. AVISO: su administradora habla de una MANCOMUNIDAD, y el IEE dice que el edificio comparte medianeria con CL AUSTRIA 10 y CL AUSTRIA 6, que NO estan en la lista. Presidente segun el IEE: RAFAEL EXPOSITO CABRERA, DNI 51861873R'),
('495f2ec1-80d4-4803-9f8a-7755995cfc81', 'avespana9', 'H78767076', 'CDAD PROP AV ESPAÑA 9 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\avespaña9\1.DATOS\2.DOCUMENTACION\CIF 270.pdf', 'NIF definitivo 08-03-1988'),
('3fc023cd-0494-4f97-8148-edcfba0212d2', 'avestados1', 'H79104279', 'CDAD PROP AV LOS ESTADOS N 1 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\avestados1\ASCENSOR\1.DATOS\2.DOCUMENTACION\cif av. estados 1 fuenlabrada.pdf', 'NIF definitivo 13-04-1989'),
('98414baa-5491-4149-9c14-7793a68ca1a3', 'avestados18', 'H79825618', 'CDAD PROP AV DE LOS ESTADOS N 18 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\avestados18\1.DATOS\2.DOCUMENTACION\CIF.pdf', 'NIF definitivo 01-01-1991'),
('0dde6533-8233-4bf1-8d1d-c2873cc605e1', 'avestados4', 'E78447554', 'CDAD PROP AVDA DE LOS ESTADOS 4 DE FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\avestados4\DATOS\documentacion\cif estados 4.pdf', 'LETRA E. CP 28945'),
('da6b79d3-0da0-47f1-8944-6f581a7f4f12', 'avfranciscojaviersauquillo22', 'H80207020', 'CDAD PROP CL FRANCISCO JAVIER SAUQUILLO N 22 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\avfranciscojaviersauquillo22\ascensor TERMINADO\1.DATOS\2.DOCUMENTACION\cif francisco javier sauquillo 22 fuenlabrada.pdf', null),
('c6830be5-cbe0-497f-9929-f22f20916c08', 'avprovincias10', 'H80024334', 'CDAD PROP AV DE LAS PROVINCIAS N 10 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\avprovincias10\DATOS\datos\CIF Comunidad (3).pdf', 'la matriz de puntos esta comida; lo leyo Monica a ojo el 3-oct y el digito de control cuadra'),
('0d5d29c6-fe46-46e3-8cdf-b5264282b8e3', 'avprovincias14', 'H78576980', 'CDAD PROP CL AV PROVINCIAS 14 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\avprovincias14\1.DATOS\2.DOCUMENTACION\CIF_Comunidad.pdf', 'CP 28941. NIF definitivo 10-11-1987'),
('723cfc0b-bfca-4601-a6cf-4f6c0067a638', 'avprovincias16', 'H80135908', 'CDAD PROP AV DE LAS PROVINCIAS N 16 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\avprovincias16\1.DATOS\2.DOCUMENTACION\PROVINCIAS-16-CIF-NUEVO.PDF', 'NIF definitivo 08-04-1992'),
('4c5e5fc0-0e30-4552-88ac-28843e108a98', 'avprovincias46', 'H79490140', 'CDAD PROP AV DE LAS PROVINCIAS N 46 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\avprovincias46\1.DATOS\2.DOCUMENTACION\CIF PROVINCIAS, 46.pdf', null),
('fb720b3d-53c6-44c3-8380-ac1017f387fd', 'avregiones6', 'H79783130', 'CDAD PROP AV DE LAS REGIONES N 6 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\avregiones6\SATE Y AEROTERMIA\1.DATOS\2.DOCUMENTACION\CIF (1).pdf', 'NIF definitivo 01-12-1990'),
('56f15a13-b4c0-4293-ac5a-69299532c175', 'belen7', 'H79707493', 'CDAD PROP CL BELEN N 7 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\belen7\1.DATOS\2.DOCUMENTACION\cif.pdf', null),
('92536a60-a776-4678-b6c5-9b1cdf1255fe', 'brunete3', 'H79277513', 'CDAD PROP CL BRUNETE N 3 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\brunete3\1 sate + ascensor\1.DATOS\2.DOCUMENTACION\CIF CDAD. PROP. BRUNETE 3.pdf', 'el sobre dice ADMINISTRACIONES ROYMAR SL como apoderado'),
('b358d605-74c3-48fe-91c1-a03fc8fd3203', 'callao31', 'H79634564', 'CDAD PROP CL CALLAO N 31 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\callao31\1.DATOS\2.DOCUMENTACION\cif callao 31.pdf', 'CP 28945 corregido a mano'),
('985f7e68-b4cd-432f-bd61-e412b32a7988', 'callao35', 'H79121620', 'CDAD PROP CL CALLAO 35 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\callao35\1.DATOS\2.DOCUMENTACION\cif callao 35.pdf', null),
('aacf53b6-a8a5-40a1-ad8e-9d1f71357853', 'canarias8', 'H78347028', 'CDAD PROP CANARIAS 8 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\canarias8\3 Mejora accesibilidad\1.DATOS\2.DOCUMENTACION\CIF COMUNIDAD (3).pdf', 'NIF definitivo 01-12-1986'),
('6557b7d3-aa87-4a7b-b629-d5065f1de377', 'castillalanueva33', 'H79387577', 'CDAD PROP CL CASTILLA LA NUEVA N 33 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\castillalanueva33\1.DATOS\2.DOCUMENTACION\CIF .pdf', null),
('1aeefaf3-8d4e-4526-8aa0-0663ea7caeb8', 'castillalanueva37bis', 'H79410346', 'CDAD PROP CL CASTILLA LA NUEVA N 37 BIS FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\castillalanueva37bis\1.DATOS\2.DOCUMENTACION\CIF CASTILLA LA NUEVA 37BIS FUENLABRADA.pdf', 'EL BIS ES EL PORTAL B del 37. CP 28941. NIF 10-04-1990'),
('c26757c1-f4d2-412f-b373-f581ebd1cdba', 'castillalanueva40', 'H79562864', 'CDAD PROP CL CASTILLA LA NUEVA N 40 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\castillalanueva40\1.DATOS\2.DOCUMENTACION\cif CN-40-NUEVO.pdf', 'NIF definitivo 31-10-1990'),
('25ced794-c5ea-4e66-8628-636287914876', 'castillalavieja8', 'H79679098', 'CDAD PROP CL CASTILLA LA VIEJA N 8 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\castillalavieja8\1.DATOS\2.DOCUMENTACION\CIF CASTILLA LA VIEJA 8.pdf', null),
('808adbce-ab8b-4eab-98df-2fb3fc945fa9', 'castillejos23', 'H79442745', 'CDAD PROP CL CASTILLEJOS N 23 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\castillejos23\DATOS\DOCUMENTACION\cif castillejos 23.pdf', null),
('8a202224-66be-4f74-acb8-ca0df94f6e60', 'comunidaddemadrid9', 'H80074024', 'CDAD PROP CL COMUNIDAD DE MADRID FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\comunidaddemadrid9\DATOS\documentacion\cif comunidad de madrid 9 fuenlabrada.pdf', 'la denominacion NO lleva numero; el domicilio si: CL COMUNIDAD DE MADRID 9'),
('88b9544e-c4b2-4050-9a29-5f564b27c3f6', 'delicias1', 'H79760112', 'CDAD PROP CL DELICIAS N 1 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\delicias1\1.DATOS\2.DOCUMENTACION\cif.pdf', null),
('9ec7ddd2-359f-4391-a0ab-f6c473061d84', 'delicias7', 'H81223174', 'CDAD PROP CL DELICIAS N 7 DE FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\delicias7\1.DATOS\2.DOCUMENTACION\CIF COMUNIDAD.pdf', 'CP 28944. NIF definitivo 29-06-1995'),
('6dc61222-c376-4c7d-a75c-e72775f920d1', 'eras9', 'H79934220', 'CDAD PROP CL LAS HERAS N 9 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\eras9\dr\1.DATOS\2.DOCUMENTACION\CIF COMUNIDAD.pdf', 'OJO: la calle oficial es LAS HERAS, no ERAS. CP 28944'),
('8e62b50c-bed0-46bc-b0c9-a25f039ad6f5', 'fatima6', 'H79266052', 'CDAD PROP CL FATIMA 6', 'MADRID\1APROVINCIA\FUENLABRADA\fatima6\1.DATOS\2.DOCUMENTACION\CIF FATIMA 6 (1).pdf', 'la denominacion no lleva FUENLABRADA'),
('f904d0dc-a6c0-45fe-9639-640175c33c5e', 'francia5', 'H79704250', 'CDAD PROP CL FRANCIA N 5 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\francia5\1.DATOS\2.DOCUMENTACION\FRANCIA 5 TARJETA CIF.pdf', 'NIF definitivo 27-11-1990'),
('df00e0a7-b0bc-4c8e-a44c-8fb1ea62b214', 'francia50', 'H79661443', 'CDAD PROP CL FRANCIA N 50 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\francia50\ASCENSOR\1.DATOS\2.DOCUMENTACION\datos de la cp\CIF1.pdf', null),
('e59d8c8f-9796-48b4-8402-2b63cd27e228', 'francia7', 'H79538823', 'CDAD PROP CL FRANCIA N 7 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\francia7\1.DATOS\2.DOCUMENTACION\TARJETA CIF C.P FRANCIA 7.pdf', 'NIF definitivo 16-10-1990'),
('7eeacfa9-347d-476d-acc4-8977f927fe68', 'habana41', 'H79697546', 'CDAD PROP CL HABANA N 41 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\habana41\1.DATOS\2.DOCUMENTACION\CIF.pdf', null),
('3c89acf9-aaaf-44e8-afd4-b64a723dca01', 'humera16', 'H79112322', 'CDAD PROP CL HUMERA 16 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\humera16\1.DATOS\2.DOCUMENTACION\0073 CIF COMUNIDADES.pdf', 'NIF definitivo 20-04-1989'),
('f8278ede-c0bf-43d0-be37-c4f3e0e365d0', 'humera23', 'H79617072', 'CDAD PROP CL HUMERA N 23 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\humera23\DATOS\actas y datos\CIF (1).pdf', 'NIF definitivo 01-11-1990'),
('b90ba8e3-5f1b-47f7-9b7c-4c08f050b002', 'hungria4', 'H79740700', 'CDAD PROP CL HUNGRIA N 4 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\hungria4\1 DATOS COMUNES\2.DOCUMENTACION\cif hungria 4_2.pdf', null),
('ff077c70-7e85-4f34-8118-5f60279f90aa', 'islasbritanicas26', 'H79253514', 'CDAD PROP CL ISLAS BRITANICAS 26 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\islasbritanicas26\1.DATOS\2.DOCUMENTACION\CIF Islas Británicas 26.pdf', null),
('d9a44b01-7259-49c3-95db-0dc247583c02', 'italia11', 'H79803797', 'CDAD PROP CL ITALIA N 11 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\italia11\1.DATOS\2.DOCUMENTACION\CIF COMUNIDAD ITALIA.pdf', null),
('da5c0264-43b7-4910-9a90-a35338107359', 'italia35', 'H79044913', 'CDAD PROP CL ITALIA 35 DE FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\italia35\1.DATOS\2.DOCUMENTACION\CIF.pdf', null),
('bfa1c11a-35d6-4065-9544-fe289edc9f8c', 'lavega6', 'H79858643', 'CDAD PROP CL LA VEGA N 6 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\lavega6\ascensor terminado\DATOS\datos\DE LA VEGA 6 CIF.pdf', 'NIF definitivo 25-02-1991'),
('48088491-7938-4d92-8f55-4e724008eba0', 'leganes14', 'H79801049', 'CDAD PROP CL LEGANES N 14 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\leganes14\1.DATOS\2.DOCUMENTACION\CP LEGANES 14   TARJETA CIF.pdf', 'CP 28945. NIF definitivo 01-12-1990'),
('fbadaf26-24f6-4c79-9c52-5c03c6dc8036', 'lima5', 'H81427155', 'CDAD PROP CL LIMA N 5 DE FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\lima5\SATE\1.DATOS\2.DOCUMENTACION\CIF1.pdf', 'CP 28944'),
('a71ccddc-bd76-43c2-9102-e7f3c1ca8f81', 'malaga22', 'H80459464', 'CDAD PROP CL MALAGA 22 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\malaga22\cambio tuberias\1.DATOS\2.DOCUMENTACION\CIF MALAGA 22 FUENLABRADA.pdf', null),
('9a6ff4c1-469f-496d-b565-96d5157e33f6', 'mostoles3portal2', 'H79267993', 'CDAD PROP CL MOSTOLES N 3 BLOQUE 2 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\mostoles3portal2\Ascensor TERMINADO\DATOS\datos\CIF 2.pdf', 'la tarjeta dice BLOQUE 2, no portal 2'),
('c77b587d-7780-44ae-a16b-ed5f100718ef', 'mostoles3portal4', 'H84265164', 'CDAD PROP C/ MOSTOLES 3 EN FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\mostoles3portal4\1.DATOS\2.DOCUMENTACION\CIF CP MOSTOLES 3 PORTAL 4.pdf', 'la denominacion NO dice el portal; el domicilio si: CL MOSTOLES PORTAL 4, 3. CP 28944. 03-03-2005'),
('1c6a4271-52a1-48b1-b6d3-09d9ee970508', 'mostoles3portal7', 'H79568283', 'CDAD PROP CL MOSTOLES N 3 PORTAL 7 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\mostoles3portal7\SATE\1.DATOS\2.DOCUMENTACION\CIF_Mostoles_3_7.pdf', 'NIF definitivo 02-11-1990'),
('5cca43a3-76f5-4c3d-a9e1-141310f617b6', 'mostoles3portal8', 'H79265153', 'CDAD PROP CL MOSTOLES N 3 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\mostoles3portal8\DATOS\documentacion\CIF COMUINIDAD.pdf', 'la denominacion NO dice el portal. NIF definitivo 23-10-1989'),
('792fe691-1cd8-4c54-8282-b1bb741d47df', 'nazaret14', 'H79549671', 'CDAD PROP CL NAZARET N 14 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\nazaret14\1.DATOS\2.DOCUMENTACION\CIF.pdf', null),
('c02c4bd2-61af-46c1-b725-07a2a5f57ffb', 'nazaret32bis', 'H79706172', 'CDAD PROP CL NAZARET N 32 BIS FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\nazaret32bis\SATE\1.DATOS\2.DOCUMENTACION\CIF.pdf', 'CP 28941. El libro de actas dice: edificio sito en CALLE ANDALUCIA 8, HOY calle Nazaret 32 BIS. La calle cambio de nombre'),
('1c9c3f63-0b35-402e-806d-be3ae7df02f5', 'oriente6', 'H79699617', 'CDAD PROP CL ORIENTE N 6 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\oriente6\1.DATOS\2.DOCUMENTACION\CIF CP ORIENTE 6.pdf', 'NIF definitivo 01-11-1990'),
('2c07f47c-c111-45b3-a049-6e0677dec772', 'paseodegranada2', 'H79943031', 'CDAD PROP PS GRANADA N 2 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\paseodegranada2\sate\1.DATOS\2.DOCUMENTACION\CIF_comunidad.pdf', 'NIF 01-02-1991. Administra ARACASA ASESORES, CL CALLAO 52'),
('ffaf3897-176e-4798-a60b-19a849d26451', 'paseodoctorseveroochoa10', 'H85862803', 'CDAD PROP PS DOCTOR SEVERO OCHOA N 10 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\paseodoctorseveroochoa10\1.DATOS\2.DOCUMENTACION\CIF SEVERO OCHOA 10.pdf', 'CP 28945. NIF definitivo 15-01-2010'),
('ab618319-49c7-4ff1-a49a-41521da8609b', 'paseoolimpo16', 'H79607446', 'CDAD PROP PS DEL OLIMPO N 16 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\paseoolimpo16\sate\1.DATOS\2.DOCUMENTACION\CIF.pdf', 'NIF definitivo 01-11-1990'),
('24d7ba90-a4bd-49d7-b091-7d9d03d160f6', 'paseosanantonio3', 'H79741195', '(sin denominacion oficial)', 'MADRID\1APROVINCIA\FUENLABRADA\paseosanantonio3\DATOS\datos\CIF de Comunidad de Propietarios.pdf', 'NO ES TARJETA: es una autorizacion firmada. CIF valido. PRESIDENTE: FERNANDO OLIVA RELAÑO, DNI 51315138E (17-01-2022)'),
('9fe5264c-18b1-4d3e-b34b-4d2f2c257ea0', 'paseosanantonio4', 'H79574778', 'CDAD PROP PS SAN ANTONIO N 4 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\paseosanantonio4\SATE\1.DATOS\2.DOCUMENTACION\CIF COMUNIDAD DE PROPIETARIOS PASEO SAN ANTONIO 4.pdf', 'NIF definitivo 15-11-2022'),
('cbb6f301-efe2-4cc8-a99a-20d5c3e1f884', 'paular5', 'H80228158', 'CDAD PROP CL PAULAR N 5 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\paular5\1.DATOS\2.DOCUMENTACION\CIF.pdf', 'NIF 01-01-1992. Administra AEA FINCAS, C CONSTITUCION 28 LOCAL'),
('8466c774-dbc6-41df-b6b0-63dd329dd4c7', 'pelayos11', 'H79674370', '(sin denominacion oficial)', 'MADRID\1APROVINCIA\FUENLABRADA\pelayos11\DATOS\datos\CP PELAYOS 11 HOJA ENCARGO ASCENSOR.CIF, DNI PRESIDNETE.pdf', 'NO ES TARJETA: autorizacion firmada. CIF valido. PRESIDENTE: ANTONIO ARTERO HOMBRADO, DNI 51973224D (17-01-2022)'),
('c679477c-bd85-4df3-acc2-204a5980bb64', 'plazadenicaragua3', 'H79775755', 'CDAD PROP CL NICARAGUA N 3 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\plazadenicaragua3\1.DATOS\2.DOCUMENTACION\CIF NICARAGUA, 3.pdf', 'OJO: la tarjeta dice CALLE Nicaragua, tu lista dice PLAZA DE Nicaragua'),
('691b9c2f-666e-410a-a92f-c8bde8369b53', 'plazaparis5', 'H80030885', 'CDAD PROP PZ PARIS 5 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\plazaparis5\1. DATOS\2.DOCUMENTACION\El CIF P 5.pdf', 'coincide con el CIF que ya habia en la base'),
('66440957-d8a2-400f-94ee-42996342df99', 'plazaparis6', 'H79647061', 'CDAD PROP PZ PARIS N 6 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\plazaparis6\1.DATOS\2.DOCUMENTACION\Cif Plaza Paris, 6.pdf', 'coincide con la base. Libro de actas de 1981 sellado: INSCRITA EN EL CENSO DE ENTIDADES JURIDICAS con ese CI, 20-NOV-1990'),
('afb8e294-3f51-4d72-895c-8ad8d9090537', 'plazaparis7', 'H81561797', 'CDAD PROP PZ PARIS N 7 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\plazaparis7\PROYECTO\SUBVENCION 2021\CIF 32.pdf', 'CP 28943'),
('78e40d93-88c1-4aa0-bef0-f67b250d9306', 'polvoranca23', 'H78425139', 'CDAD PROP CL POLVORANCA 23 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\polvoranca23\DATOS\documentacion\CIF Polvoranca 23.pdf', 'NIF definitivo 16-02-1987'),
('b0c5760f-bca4-437a-b01a-43253872a90a', 'sanandres1', 'H79702627', 'CDAD PROP CL SAN ANDRES N 1 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\sanandres1\DATOS\datos\CIF comunidad.pdf', 'CP 28945. NIF 01-11-1990'),
('7f2adbc4-30e3-4517-80d9-8492d733d230', 'sanandres2', 'H80783475', 'CDAD PROP CL SAN ANDRES N 2 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\sanandres2\1.DATOS\2.DOCUMENTACION\CIF CP SAN ANDRES 2 FUENLABRADA.pdf', 'CP 28945'),
('e2136681-7055-4fbb-97c5-4aed2afd32f1', 'sanfranciscojavier2', 'H79655023', 'CDAD PROP CL SAN FRANCISCO JAVIER N 2 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\sanfranciscojavier2\DATOS\DATOS\CIF COMUNIDAD.pdf', null),
('bf6a8ebf-241b-426a-a52c-4a375d4fc48f', 'sanjose9', 'H78548823', 'CDAD PROP CL SAN JOSE 9 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\sanjose9\1.DATOS\2.DOCUMENTACION\CIF.pdf', null),
('a4990a2f-f19b-43b2-b65e-7bcc3430d788', 'turquia22', 'H81284598', 'CDAD PROP CL TURQUIA N 22 DE FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\turquia22\1.DATOS\2.DOCUMENTACION\TURQUIA, 22 - CIF.pdf', 'CP 28943'),
('c6945c3a-199c-46ef-98d8-24d8c76183e6', 'villaviciosadeodon2', 'H79098539', 'CDAD PROP CL VILLAVICIOSA DE ODON N 2 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\villaviciosadeodon2\1.DATOS\2.DOCUMENTACION\CIF CDADvillaviciosa 02.pdf', 'NIF definitivo 11-04-1989'),
('4dc0ab7b-b490-46a0-a08f-535614a70288', 'zamora1-3-5', 'H79663209', 'CDAD PROP ED ZAMORA CL ZAMORA FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\zamora1-3-5\SATE\1.DATOS\2.DOCUMENTACION\CIF.pdf', 'EDIFICIO ZAMORA, calle Zamora S/N: abarca los numeros 1, 3 y 5. Administra VALENTIN ALCOCER, CL SORIA 1'),
('23dce9f1-ef00-4c3f-9a14-0c2f105ef6ed', 'zamora25', 'H78759206', 'CDAD PROP ZAMORA 25 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\zamora25\ASCENSOR\1.DATOS\2.DOCUMENTACION\CIF zamora25.pdf', 'NIF definitivo 04-03-1988'),
('c16cbe40-297a-4fa6-a1c0-6798f2f81e4e', 'zamora6', 'H79997185', 'CDAD PROP CL ZAMORA 6 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\zamora6\1.DATOS\2.DOCUMENTACION\Cif Zamora 6.pdf', null),
('6d7163d0-f036-4f73-92d4-f3c50d8282c1', 'zaragoza7', 'H79490132', 'CDAD PROP CL ZARAGOZA N 7 FUENLABRADA', 'MADRID\1APROVINCIA\FUENLABRADA\zaragoza7\1.DATOS\2.DOCUMENTACION\Tarjeta CIF Comunidad.pdf', null);

-- 2 --------------------------------------------------------------- FRENOS
-- a) las comunidades existen y son de Fuenlabrada
do $$
declare faltan int;
begin
  select count(*) into faltan from _leido l
  where not exists (select 1 from comunidades c
                    where c.id = l.comunidad_id and upper(c.municipio) = 'FUENLABRADA');
  if faltan > 0 then
    raise exception 'Hay % comunidades que no existen o no son de Fuenlabrada. Nada escrito.', faltan;
  end if;
end $$;

-- b) ningun CIF de la base choca con su tarjeta. La UNICA excepcion permitida
--    es Austria 8, y va con nombre y apellidos: si manana aparece otro choque,
--    la migracion se cae en vez de pisarlo en silencio.
do $$
declare chocan int;
begin
  select count(*) into chocan
  from _leido l join comunidades c on c.id = l.comunidad_id
  where c.cif_comunidad is not null
    and c.cif_comunidad <> l.nif
    and l.carpeta <> 'austria8';
  if chocan > 0 then
    raise exception 'Hay % CIF en la base que NO coinciden con su tarjeta. Nada escrito.', chocan;
  end if;
end $$;

-- 3 ------------------------------------- nombre oficial y el CIF que falte
-- El CIF de la base MANDA sobre el de la tarjeta (coalesce), y eso resuelve
-- Austria 8 solo: la base tiene el vigente con H y la tarjeta es la anterior.
update comunidades c
set nombre         = l.denominacion,
    cif_comunidad  = coalesce(c.cif_comunidad, l.nif),
    actualizado_en = now()
from _leido l
where c.id = l.comunidad_id;

-- 4 -------------------------------------------- las tarjetas, como documento
insert into documentos (comunidad_id, tipo_documento_id, naturaleza, backend,
                        origen_ruta_dropbox, estado_firma, vigente, grupo_id,
                        n_version, justificacion)
select l.comunidad_id,
       (select id from tipos_documento where nombre = 'tarjeta_cif'),
       'migrado', 'dropbox', l.ruta_dropbox, 'no_aplica',
       (l.carpeta <> 'austria8'),   -- la de Austria 8 es la del CIF viejo
       gen_random_uuid(), 1, l.nota
from _leido l;

-- 5 ------------------------------------------ OSTALAZAR, que no es comunidad
-- ALAVA 6 no es una comunidad de propietarios: su tarjeta dice OSTALAZAR SL,
-- con domicilio social en CL DOCTOR ESQUERDO 57 de Madrid. Es el segundo
-- titular que no es comunidad, despues de CBRE.
--
-- PARA LA MUDANZA: esta empresa tiene DOS locales, y el otro -Doctor Esquerdo
-- 55- sigue en `comunidades` con el mismo CIF porque es de Madrid. Se juntan
-- cuando Madrid pase por la tanda.
with nueva as (
  insert into empresas_propietarias (nombre_accesalia, nombre_legal, cif, direccion)
  values ('OSTALAZAR SL', 'OSTALAZAR SL', 'B28111516', 'CL DOCTOR ESQUERDO 57, MADRID')
  returning id
)
insert into figura_legal_propietaria (id_comodin, figura)
select id, 'Propietario Empresa' from nueva;

-- y su acceso: ALAVA 6 escalera 1, que ya existia
update accesos
set figura_legal_propietaria_id = (select id from empresas_propietarias where cif = 'B28111516')
where id = '990faf0a-e584-45b4-9f50-086d4a2c9cba';

-- 6 ------------------------------- las que SI son comunidades, a la figura
insert into figura_legal_propietaria (id_comodin, figura)
select l.comunidad_id, 'Comunidad de Propietarios'
from _leido l
where l.carpeta <> 'alava6'
on conflict (id_comodin) do nothing;


-- 7 ------------------------------- las carpetas que NO estan en la lista
-- 182 carpetas del Dropbox de Fuenlabrada sin pareja en la lista de julio. No se
-- tocan: se apuntan para revisarlas una a una. Aqui entran tambien las CINCO
-- que el cotejo automatico emparejo MAL y se descartaron a mano -calles
-- distintas con el mismo numero: La Vega 14 contra Leganes 14, Panticosa 5 y 7
-- contra Paris 5 y 7, La Haya 2 contra Granada 2, y Sauquillo 2 contra San
-- Francisco Javier 2-. Las cinco comunidades afectadas ya tenian su carpeta
-- buena por otro lado, asi que descartarlas no pierde nada.
insert into comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una
  (comunidad_autonoma, municipio, carpeta, ruta_dropbox, tiene_tarjeta_cif,
   cif_en_la_ficha, nombre_en_la_ficha, notas)
values
('MADRID', 'FUENLABRADA', '0-FAIN', null, false, null, null, null),
('MADRID', 'FUENLABRADA', '0-MODELOS', null, false, null, null, null),
('MADRID', 'FUENLABRADA', '0-plano urbano fuenlabrada dwg', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'Valencia 3 Esc.Dcha 6-B', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'alava10', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'alava14', 'MADRID\1APROVINCIA\FUENLABRADA\alava14\DATOS\datos\cif de la comunida .pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'alemania2', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'angeles11 18', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'angeles12', 'MADRID\1APROVINCIA\FUENLABRADA\angeles12\1.DATOS\2.DOCUMENTACION\CIF COMUNIDAD.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'angeles4', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'angeles5', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'austria7', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'austria9', 'MADRID\1APROVINCIA\FUENLABRADA\austria9\DATOS\CIF\CIF.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'avandes11', 'MADRID\1APROVINCIA\FUENLABRADA\avandes11\1.DATOS\2.DOCUMENTACION\CIF.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'avandes13', 'MADRID\1APROVINCIA\FUENLABRADA\avandes13\DATOS\documentación\CIF Andes nº 13.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'avandes22', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'avespaña10', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'avespaña18', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'avespaña20', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'avestados10', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'avestados28', 'MADRID\1APROVINCIA\FUENLABRADA\avestados28\ASCENSOR\DATOS\ACTAS\CIF.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'avestados5', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'avfranciscojaviersauquillo10', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'avfranciscojaviersauquillo2', null, false, null, null, 'cotejo erroneo, descartado a mano'),
('MADRID', 'FUENLABRADA', 'avfranciscojaviersauquillo30', 'MADRID\1APROVINCIA\FUENLABRADA\avfranciscojaviersauquillo30\DATOS\ACTAS\207- CIF FCO JAVIER SAUQUILLO 30.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'avfranciscojaviersauquillo34', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'avila8', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'avnaciones22', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'avregiones4', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'berlin5', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'callao21', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'callao29', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'callao33', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'callao37', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'callao4', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'callao41', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'callao44', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'callao68', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'calledelaestacion', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'castillalanueva16', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'castillalanueva18', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'castillalavieja12', 'MADRID\1APROVINCIA\FUENLABRADA\castillalavieja12\solado portal\1.DATOS\2.DOCUMENTACION\CIF_Castilla la Vieja 12.pdf', true, 'H79597324', 'Anagrama Comercial:', null),
('MADRID', 'FUENLABRADA', 'castillejos22', 'MADRID\1APROVINCIA\FUENLABRADA\castillejos22\DATOS\ACTAS\C.I.F (1).pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'chipre1', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'constitucion11', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'constitucion49', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'constitucion50', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'constitucion51', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'cuartel 1', 'MADRID\1APROVINCIA\FUENLABRADA\cuartel 1\Datos\datos\CIF (1).pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'cuzco1', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'dinamarca 8,10,12,14', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'eras 3 5 7 9 11 13', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'eras5', 'MADRID\1APROVINCIA\FUENLABRADA\eras5\DATOS\ACTAS Y DATOS COMUNIDAD\CIF.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'escandinavia1,2,3,4,5,6', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'estacion1', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'estacion9', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'fatima18', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'fatima3', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'fatima8', 'MADRID\1APROVINCIA\FUENLABRADA\fatima8\1.DATOS\2.DOCUMENTACION\CIF FATIMA 8.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'ferial7', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'ferrocarril 1-B', 'MADRID\1APROVINCIA\FUENLABRADA\ferrocarril 1-B\PROYECTO\subvenciones 2021\papeles\C.I.F.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'francia12', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'francia14', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'francia15', 'MADRID\1APROVINCIA\FUENLABRADA\francia15\datos\datos\CIF COMUNIDAD.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'francia25', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'francia34', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'getafe17', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'glorietamiraflores2', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'grecia18', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'habana27', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'higueral12', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'hispanidad12', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'hispanidad3', 'MADRID\1APROVINCIA\FUENLABRADA\hispanidad3\ascensor\DATOS\datos\Cif de la comunidad .pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'holanda10', 'MADRID\1APROVINCIA\FUENLABRADA\holanda10\1.DATOS\2.DOCUMENTACION\Tarjeta CIF de la Comunidad.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'holanda11', 'MADRID\1APROVINCIA\FUENLABRADA\holanda11\DATOS\DATOS\CIF.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'holanda3', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'holanda5', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'honda18', 'MADRID\1APROVINCIA\FUENLABRADA\honda18\DATOS\administracion\053 CIF.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'honduras4', 'MADRID\1APROVINCIA\FUENLABRADA\honduras4\PROYECTO\SUBVENCION\SUBV CAM NG 2022\Doc de trabajo\CIF comunidad.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'humera14', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'humera2', 'MADRID\1APROVINCIA\FUENLABRADA\humera2\DATOS\documentacion\0279 CIF.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'humera27', 'MADRID\1APROVINCIA\FUENLABRADA\humera27\1.0 DATOS\datos\CIF tarjeta fiscal .pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'humilladero5', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'islandia2', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'islandia4', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'islandia6', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'italia1', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'italia15', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'laarena45', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'lafontana-mancomunidad', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'lapaz66', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'lasnieves5', 'MADRID\1APROVINCIA\FUENLABRADA\lasnieves5\DATOS\ACTAS\CIF COMUNIDAD PROPIETARIOS LAS NIEVES 5.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'lavega14', null, false, null, null, 'cotejo erroneo, descartado a mano'),
('MADRID', 'FUENLABRADA', 'leganes12', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'leganes18', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'leganes27', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'lima53', 'MADRID\1APROVINCIA\FUENLABRADA\lima53\DATOS\ACTAS\CIF.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'lima73', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'lourdes5', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'luissauquillo59', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'madrid18', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'malaga16', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'malaga1618 20', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'malaga2', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'malaga26', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'malaga28', 'MADRID\1APROVINCIA\FUENLABRADA\malaga28\ascendentes y bajantes\1.DATOS\2.DOCUMENTACION\CIF MALAGA 28.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'malaga4', 'MADRID\1APROVINCIA\FUENLABRADA\malaga4\DATOS\DATOS\CIF COMUNIDADmala4.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'malaga40', 'MADRID\1APROVINCIA\FUENLABRADA\malaga40\mejora accesibilidad\DATOS\datos\CIF de Calle Malaga 40 Fuenlabrada.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'migueldeunamuno17', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'migueldeunamuno24', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'migueldeunamuno25', 'MADRID\1APROVINCIA\FUENLABRADA\migueldeunamuno25\DATOS\datos\cif de la cdad de prop.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'mostoles3portal3', 'MADRID\1APROVINCIA\FUENLABRADA\mostoles3portal3\DATOS\datos\Cif.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'mostoles3portal5', 'MADRID\1APROVINCIA\FUENLABRADA\mostoles3portal5\DATOS\ACTAS\CIF COMUNIDAD.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'naciones37', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'nardos2', 'MADRID\1APROVINCIA\FUENLABRADA\nardos2\DATOS\actas y permisos\CIF COMUNIDAD.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'nardos4', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'nazaret1', 'MADRID\1APROVINCIA\FUENLABRADA\nazaret1\DATOS\DATOS\CIF CDADnazaret 1.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'nazaret10', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'nazaret8', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'nazaret9-11', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'oriente8', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'oriente8 - LOCAL 3', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'oriente9', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'palencia12', 'MADRID\1APROVINCIA\FUENLABRADA\palencia12\1.DATOS\2.DOCUMENTACION\acta cif y dni.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'paseochile10', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'paseocolonia5', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'paseodegranada3', 'MADRID\1APROVINCIA\FUENLABRADA\paseodegranada3\accesibilidad\DATOS\datos\CIF CDAD..pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'paseodelahaya2', null, false, null, null, 'cotejo erroneo, descartado a mano'),
('MADRID', 'FUENLABRADA', 'paseoolimpo7', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'paseosanantonio5', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'paseosanantonio6', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'pelayo7', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'pelayos9', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'planos chalet codi', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'plazadepanticosa5', null, false, null, null, 'cotejo erroneo, descartado a mano'),
('MADRID', 'FUENLABRADA', 'plazadepanticosa7', null, false, null, null, 'cotejo erroneo, descartado a mano'),
('MADRID', 'FUENLABRADA', 'plazaparis2', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'plazaparis3', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'plazaparis8', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'plazavaldehondillo2', 'MADRID\1APROVINCIA\FUENLABRADA\plazavaldehondillo2\DATOS\datos\cif.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'plazavaldehondillo3', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'portugal4', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'portugal44', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'pozuelo17', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'pozuelo19', 'MADRID\1APROVINCIA\FUENLABRADA\pozuelo19\DATOS\ACTAS\CIF POZUELO,19 (FUENLABRADA)pdf.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'pozuelo21', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'pozuelo23', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'pozuelo27', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'rioja57', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'sanandres12', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'sanandres5', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'sanfranciscojavier3', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'sanjoaquin14', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'sanjoaquin19', 'MADRID\1APROVINCIA\FUENLABRADA\sanjoaquin19\DATOS\DOCUMENTACION\cif san joaquin 19 (2).pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'sanjoaquin24', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'sanjoaquin26', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'sanjose26', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'santaana8', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'sevilla19', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'sevilla7', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'soria1', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'suecia3', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'suiza19', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'telefonica2', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'torrejon1', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'torrejon7', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'torrejon9', 'MADRID\1APROVINCIA\FUENLABRADA\torrejon9\1.DATOS\2.DOCUMENTACION\cif torrejón 9_2.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'torrente51', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'urbnuevoversalles2', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'uruguay2', 'MADRID\1APROVINCIA\FUENLABRADA\uruguay2\DATOS\actas\CIF URUGUAY, 2 (1).pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'valdeserrano3', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'valencia 17 19 21 23', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'valladolid2', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'valladolid7', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'venezuela2', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'viena5', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'villalba3', 'MADRID\1APROVINCIA\FUENLABRADA\villalba3\DATOS\datos\178 CIF.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'villalba5', 'MADRID\1APROVINCIA\FUENLABRADA\villalba5\DATOS\ACTAS\CIF.pdf', true, null, null, null),
('MADRID', 'FUENLABRADA', 'villalba7', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'villalba9', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'villaviciosadeodon8', null, false, null, null, null),
('MADRID', 'FUENLABRADA', 'zamora28', null, false, null, null, null);

-- 8 ------------------------------------------------------- FRENOS FINALES
do $$
declare docs int; figs int; sin_cif int; emp int;
begin
  select count(*) into docs from documentos d
  join tipos_documento t on t.id = d.tipo_documento_id and t.nombre = 'tarjeta_cif'
  join _leido l on l.comunidad_id = d.comunidad_id;
  if docs <> 77 then
    raise exception 'Esperaba % tarjetas de Fuenlabrada y hay %. Nada hecho.', 77, docs;
  end if;

  select count(*) into sin_cif from _leido l
  join comunidades c on c.id = l.comunidad_id
  where c.cif_comunidad is null;
  if sin_cif <> 0 then
    raise exception 'Han quedado % comunidades sin CIF. Nada hecho.', sin_cif;
  end if;

  select count(*) into figs from figura_legal_propietaria f
  join _leido l on l.comunidad_id = f.id_comodin;
  if figs <> 76 then
    raise exception 'Esperaba % figuras de comunidad y hay %. Nada hecho.', 76, figs;
  end if;

  select count(*) into emp from empresas_propietarias where cif = 'B28111516';
  if emp <> 1 then
    raise exception 'Ostalazar deberia estar una vez y esta %. Nada hecho.', emp;
  end if;
end $$;

commit;

-- ===========================================================================
-- COMPROBACION (aparte):
--
--   select count(*) from documentos d
--     join tipos_documento t on t.id = d.tipo_documento_id and t.nombre='tarjeta_cif'
--     join comunidades c on c.id = d.comunidad_id
--    where upper(c.municipio) = 'FUENLABRADA';                         -- 77
--
--   select figura, count(*) from figura_legal_propietaria group by 1;
--     -- Comunidad de Propietarios 101, Propietario Empresa 2
--
--   select nombre from comunidades
--    where upper(municipio)='FUENLABRADA' and cif_comunidad is null;   -- las que no tienen tarjeta
-- ===========================================================================
