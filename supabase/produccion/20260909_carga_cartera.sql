-- =============================================================================
-- CARGA DE LA CARTERA COMERCIAL  (2026-09-09)
--
-- Fuentes: la propia base (empresa.comercial_id, cargado en julio) y el Excel
-- "HOJAS DE ENCARGO alvaro.xlsx" (filas 1-149), casado por DIRECCION.
--
-- NO crea ninguna administracion ni ninguna comunidad. Solo escribe en
-- cartera_comercial. Si algo no se pudo identificar, se queda fuera y se anota
-- como pendiente; nada se adivina.
--
-- Fechas: Daniel fue el unico comercial hasta 2025 (desde = nulo, "de siempre").
-- Carlos Garcia: mayo 2025 - mayo 2026. Alvaro: desde enero 2026, y hereda TODO
-- lo de Carlos al irse este. Se usa dia 1 del mes porque solo consta el mes.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Carlos Garcia: las 21 administraciones que ya figuran como suyas. Cerradas.
-- ---------------------------------------------------------------------------
insert into cartera_comercial (comercial_id, administracion_fincas_id, desde, hasta, motivo)
select e.comercial_id, e.id, date '2025-05-01', date '2026-05-31', 'cartera de Carlos Garcia'
from empresa e join comerciales c on c.id = e.comercial_id
where c.nombre = 'Carlosg';

-- ---------------------------------------------------------------------------
-- 2. Alvaro hereda esas mismas al irse Carlos. Vigentes.
-- ---------------------------------------------------------------------------
insert into cartera_comercial (comercial_id, administracion_fincas_id, desde, motivo)
select (select id from comerciales where nombre = 'Alvaro'), e.id, date '2026-06-01', 'herencia de Carlos Garcia'
from empresa e join comerciales c on c.id = e.comercial_id
where c.nombre = 'Carlosg';

-- ---------------------------------------------------------------------------
-- 3. Alvaro: las que ya figuran como suyas. Desde que entro.
-- ---------------------------------------------------------------------------
insert into cartera_comercial (comercial_id, administracion_fincas_id, desde, motivo)
select e.comercial_id, e.id, date '2026-01-01', 'cartera propia de Alvaro'
from empresa e join comerciales c on c.id = e.comercial_id
where c.nombre = 'Alvaro';

-- ---------------------------------------------------------------------------
-- 4. Daniel: TODO lo demas, por defecto y desde siempre.
--    (era el unico comercial hasta 2025; lo que no es de otro, es suyo)
-- ---------------------------------------------------------------------------
insert into cartera_comercial (comercial_id, administracion_fincas_id, desde, motivo)
select (select id from comerciales where nombre = 'Daniel'), e.id, null, 'por defecto: unico comercial hasta 2025'
from empresa e
where e.comercial_id is null
   or e.comercial_id = (select id from comerciales where nombre = 'Daniel');

-- ---------------------------------------------------------------------------
-- 5. Las comunidades de Alvaro, casadas por DIRECCION con su Excel.
--    Van a nivel de comunidad porque su administracion no se ha podido
--    identificar sin riesgo de duplicar. `desde` = fecha del encargo mas
--    antiguo de esa direccion en el Excel (dato real, no estimado).
--    El nombre va de comentario para poder revisarlo a ojo.
-- ---------------------------------------------------------------------------
insert into cartera_comercial (comercial_id, comunidad_id, desde, motivo)
select (select id from comerciales where nombre = 'Alvaro'), v.comunidad_id::uuid, v.desde, v.motivo
from (values
  ('8e61b539-8f1d-4fc9-b85c-4809f16d5fa4', date '2026-02-23', 'excel Alvaro: administracion suya (administracion sin identificar)', 'ADORATRICES 7 GUADALAJARA'),
  ('47451d3b-ad1e-46ef-8e24-b6e8153cfb37', date '2026-06-23', 'excel Alvaro: administracion suya (administracion sin identificar)', 'ALBACETE 3 COSLADA'),
  ('e39d5f60-9da7-4214-bb69-b1b7dc4f875d', date '2026-04-27', 'excel Alvaro: administracion suya (administracion sin identificar)', 'ALCALÁ DE GUADAIRA 38 MADRID'),
  ('8e0269d1-9fa8-4cbe-a6f5-8c591f680f98', date '2026-05-17', 'excel Alvaro: administracion suya (administracion sin identificar)', 'ALFONSO XII MADRID'),
  ('24a38bfc-6fb8-4ae8-8d0f-37d2e02da5e0', date '2026-05-21', 'excel Alvaro: administracion suya (administracion sin identificar)', 'ALFONSO XIII 8 PARLA MADRID'),
  ('c7df158b-3cd6-43fc-a578-ed0d343d1320', date '2026-02-03', 'excel Alvaro: direccion prestada por Daniel', 'ALHELI 2 LEGANES'),
  ('a0f85ec0-a7e3-4e94-befa-a1fb71920bab', date '2026-04-17', 'excel Alvaro: administracion suya (administracion sin identificar)', 'ALORA 25 MADRID'),
  ('4849569d-967c-4901-8227-1365862b1644', date '2026-06-09', 'excel Alvaro: administracion suya (administracion sin identificar)', 'ALPES 4 ALCORCÓN'),
  ('0407921e-8214-44fe-a848-3505f27b23f3', date '2026-06-23', 'excel Alvaro: administracion suya (administracion sin identificar)', 'ANSAR 62 MADRID'),
  ('42a0eb78-5520-4bfc-ad80-08e7632de2ca', date '2026-07-10', 'excel Alvaro: administracion suya (administracion sin identificar)', 'ANTONIO DE LEYVA 13 MADRID'),
  ('6e80af37-0dbf-4203-ab19-51b7c66b5acd', date '2026-03-16', 'excel Alvaro: administracion suya (administracion sin identificar)', 'ANTONIO DURAN TOVAR 2 MADRID'),
  ('699e6f33-769d-4d42-9155-15ac996b96f1', date '2026-05-18', 'excel Alvaro: administracion suya (administracion sin identificar)', 'ARMENTEROS 51 MADRID'),
  ('4f109cc5-eaab-4c03-ab6d-23099ce327f3', date '2026-02-04', 'excel Alvaro: administracion suya (administracion sin identificar)', 'AV BADAJOZ 18 MADRID'),
  ('ab7c070b-06d1-4db6-858b-7ae6b6d70348', date '2026-05-22', 'excel Alvaro: administracion suya (administracion sin identificar)', 'AV PORTUGAL 23 LEGANES'),
  ('9cd1fbfa-1651-4dd1-9481-366308791898', date '2026-06-09', 'excel Alvaro: direccion prestada por Daniel', 'AVDA FUENLABRADA 95 LEGANES'),
  ('0a6f55e2-edf6-47a8-b039-bd3465b4fed9', date '2026-05-17', 'excel Alvaro: administracion suya (administracion sin identificar)', 'AVDA MARQUES DE CORBERA 34 B MADRID'),
  ('7ac971da-2a8a-40d6-8881-08bdc0518f9a', date '2026-02-16', 'excel Alvaro: administracion suya (administracion sin identificar)', 'AVDA MONTE IGUELDO 123 MADRID'),
  ('301d2af1-2d4e-4d09-8d65-6acf8b2f8aad', date '2026-04-11', 'excel Alvaro: administracion suya (administracion sin identificar)', 'AVDA SAN DIEGO 110 MADRID'),
  ('62c41478-d42b-4c16-901c-0aca21814f86', date '2026-05-12', 'excel Alvaro: direccion prestada por Daniel', 'BANDERAS DE CASTILLA 25 TALAVERA DE LA REINA'),
  ('10c03489-7a9d-425b-ba2a-454a4b81f177', date '2026-04-29', 'excel Alvaro: administracion suya (administracion sin identificar)', 'BARBERÁN Y COLLAR 13 ALCALÁ DE HENARES'),
  ('ccd098e5-2bcc-44cb-9df5-dbe0c42a73e1', date '2026-04-29', 'excel Alvaro: administracion suya (administracion sin identificar)', 'BARBERÁN Y COLLAR 15 ALCALÁ DE HENARES'),
  ('87226116-783a-4d64-975b-8d54cfa1b2cc', date '2026-04-29', 'excel Alvaro: administracion suya (administracion sin identificar)', 'BARBERÁN Y COLLAR 17 ALCALÁ DE HENARES'),
  ('03a1fe77-c6e5-4c00-a1ad-113f6a50702b', date '2026-05-21', 'excel Alvaro: administracion suya (administracion sin identificar)', 'BOLSA 3 MADRID'),
  ('e2918e9c-f7a8-411c-a528-f1023ffc6095', date '2026-04-13', 'excel Alvaro: administracion suya (administracion sin identificar)', 'BRAVO MURILLO 177 MADRID'),
  ('fc1082bf-6d98-44d8-aef8-f3e321196cc5', date '2026-02-19', 'excel Alvaro: administracion suya (administracion sin identificar)', 'CAMPO DE LA PALOMA 46 MADRID'),
  ('03b60e4a-2d4b-41aa-aafa-0d94e578dc74', date '2026-01-26', 'excel Alvaro: direccion prestada por Daniel', 'CAPITAN DAOIZ 2 TALAVERA DE LA REINA.TOLEDO'),
  ('5c5f7e19-fd4e-49eb-b07b-15963fd05dd0', date '2026-07-09', 'excel Alvaro: administracion suya (administracion sin identificar)', 'CARBALLINO 9 MADRID'),
  ('8b78d8e7-b56e-49ea-8dd1-ad6fdc34d06f', date '2026-02-06', 'excel Alvaro: administracion suya (administracion sin identificar)', 'CARLOS FUENTES 61 MADRID'),
  ('109e66da-1a86-4112-b36d-c0294d53ca37', date '2026-06-20', 'excel Alvaro: administracion suya (administracion sin identificar)', 'CARLOS MARTIN ALVAREZ 67 MADRID'),
  ('1450f761-5c20-4552-ad7f-c40c704e0a41', date '2026-03-02', 'excel Alvaro: administracion suya (administracion sin identificar)', 'CARLOTA O`NEILL 40 MADRID'),
  ('a5802bb6-8710-4aff-91bb-681c6139d2de', date '2026-06-20', 'excel Alvaro: administracion suya (administracion sin identificar)', 'CARRERO JUAN RAMON 6 MADRID'),
  ('3b2892c6-ef11-45ef-9701-089cc58d8862', date '2026-04-21', 'excel Alvaro: administracion suya (administracion sin identificar)', 'CASABERMEJA 4 MADRID'),
  ('0032fcab-c6d8-42b5-bbdf-69a563bc1d9a', date '2026-06-04', 'excel Alvaro: administracion suya (administracion sin identificar)', 'CAÑADA 16 ALCORCÓN'),
  ('05e923b5-abc5-4b34-a28d-310de39f47b5', date '2026-06-16', 'excel Alvaro: administracion suya (administracion sin identificar)', 'CINE 13 MADRID'),
  ('c28aaf06-409e-4490-aa9a-242ba5257526', date '2026-07-02', 'excel Alvaro: administracion suya (administracion sin identificar)', 'CINE 15 MADRID'),
  ('4066dded-d17b-49a9-9377-4754bbc0186c', date '2026-07-02', 'excel Alvaro: administracion suya (administracion sin identificar)', 'CINE 21 MADRID'),
  ('703873c4-6e2e-4fc5-9825-beb20ac80dac', date '2026-05-17', 'excel Alvaro: el encargo lo trae una contrata', 'COMANDANTE FORTEA 28 MADRID'),
  ('2688a617-60ad-4ff9-b22b-ffe482414e36', date '2026-05-17', 'excel Alvaro: administracion suya (administracion sin identificar)', 'CONRADO DEL CAMPO 4 MADRID'),
  ('2611ae6d-89d1-4c8f-af04-807e15d8b6fd', date '2026-04-11', 'excel Alvaro: administracion suya (administracion sin identificar)', 'CORREGIDOR ALONSO DE TOBAR 16 MADRID'),
  ('a028cb1d-6719-4878-9db0-34d128b31b53', date '2026-05-29', 'excel Alvaro: administracion suya (administracion sin identificar)', 'DOCTOR FLEMING 44 MADRID'),
  ('ecc92ad3-4cfc-4e34-b3d4-559a6dddfd10', date '2026-04-13', 'excel Alvaro: administracion suya (administracion sin identificar)', 'EMILIO GASTESI FERNANDEZ 40 MADRID'),
  ('28ae6104-a1ae-4838-bdf4-b610ef16ca66', date '2026-04-14', 'excel Alvaro: administracion suya (administracion sin identificar)', 'ENRIQUE FUENTES 27 MADRID'),
  ('bb6ee0a0-1afb-4189-b2aa-117c811b4dd4', date '2026-04-25', 'excel Alvaro: administracion suya (administracion sin identificar)', 'ENTREARROYOS 74 MADRID'),
  ('966325c8-90f5-4298-b0f0-aa4baa3137cb', date '2026-06-02', 'excel Alvaro: administracion suya (administracion sin identificar)', 'FEDERICO GARCIA LORCA 42 PINTO'),
  ('216f847f-6743-4a31-be16-50b951639cdf', date '2026-02-23', 'excel Alvaro: administracion suya (administracion sin identificar)', 'FERIAL 25 GUADALAJARA'),
  ('309291e1-fbe9-48f9-b684-241af01d860f', date '2026-02-12', 'excel Alvaro: administracion suya (administracion sin identificar)', 'FERNANDO PESSOA 4 MADRID'),
  ('e7189169-553b-44ec-bff6-313bd735018e', date '2026-07-09', 'excel Alvaro: direccion prestada por Daniel', 'FRANCISCO BAENA VALDEMORO 9 ALCOBENDAS'),
  ('bca73e13-ae47-49b5-8e64-63d9b1b07ee7', date '2026-05-21', 'excel Alvaro: administracion suya (administracion sin identificar)', 'GABRIEL USERA 56 MADRID'),
  ('0775c1d9-76ff-489f-a219-ee60a1cc21f4', date '2026-05-22', 'excel Alvaro: administracion suya (administracion sin identificar)', 'GALLEGOS 12 ALCALA DE HENARES'),
  ('dd9a70d5-2d1e-498b-8a8d-dd059d9f3144', date '2026-03-26', 'excel Alvaro: administracion suya (administracion sin identificar)', 'GARCIA LLAMAS 45 MADRID'),
  ('0c8185d2-396e-4e18-b693-d716210939fe', date '2026-05-16', 'excel Alvaro: administracion suya (administracion sin identificar)', 'GENERAL SERRANO ORIVE 1 MADRID'),
  ('9611a46d-0170-4aa9-9691-ede9c7e5883b', date '2026-04-25', 'excel Alvaro: administracion suya (administracion sin identificar)', 'GOMEZNARRO 10 MADRID'),
  ('ea3bdd2e-c430-49ef-ba9f-72e0625f2651', date '2026-02-23', 'excel Alvaro: administracion suya (administracion sin identificar)', 'GREGORIO IZQUIERDO 53 SSR'),
  ('4dc87ec8-81e5-4ab1-8870-25448d607962', date '2026-03-09', 'excel Alvaro: administracion suya (administracion sin identificar)', 'GUARNICIONEROS 6 MADRID'),
  ('69947dce-ee39-47c9-a041-635bcf687aaa', date '2026-06-04', 'excel Alvaro: administracion suya (administracion sin identificar)', 'GUTENBERG 16 MADRID'),
  ('2fbaf027-0a5c-40c7-bc8c-ba7558b72898', date '2026-06-04', 'excel Alvaro: administracion suya (administracion sin identificar)', 'HERMANDAD DE DONANTES DE SANGRE 27 MADRID'),
  ('6cae7c46-342b-4d26-8a83-cecc1642c0e9', date '2026-06-04', 'excel Alvaro: administracion suya (administracion sin identificar)', 'HERMANOS DE PABLO 45 MADRID'),
  ('61bd2045-3e31-420a-bcb1-699cfdc59439', date '2026-05-26', 'excel Alvaro: administracion suya (administracion sin identificar)', 'HERMENEGILDO BIELSA 27 MADRID'),
  ('da7cc182-190a-4e29-8ee1-e3bf1c7abc0a', date '2026-05-16', 'excel Alvaro: administracion suya (administracion sin identificar)', 'HUERTAS 55 MADRID'),
  ('f8278ede-c0bf-43d0-be37-c4f3e0e365d0', date '2026-05-18', 'excel Alvaro: administracion suya (administracion sin identificar)', 'HUMERA 23 FUENLABRADA'),
  ('841cf4bb-2f3f-48c4-b7dd-2c89c25622e5', date '2026-06-10', 'excel Alvaro: administracion suya (administracion sin identificar)', 'IMAGEN 9 MADRID'),
  ('f9838293-92ec-4958-ba8b-3f0677224604', date '2026-03-11', 'excel Alvaro: administracion suya (administracion sin identificar)', 'ISAAC PERAL 8 GETAFE'),
  ('b52427a7-022b-41d8-a355-807bb9a9fcc8', date '2026-05-05', 'excel Alvaro: administracion suya (administracion sin identificar)', 'ISTURIZ 9 MADRID'),
  ('f5d3d7e6-0b3f-4b90-bdb2-6957f675ef6f', date '2026-07-02', 'excel Alvaro: administracion suya (administracion sin identificar)', 'JESUS 3 ARANJUEZ'),
  ('9ea581ed-d38b-4f5b-b9ce-4b7843ff7142', date '2026-01-26', 'excel Alvaro: direccion prestada por Daniel', 'JOAQUINA SANTANDER 33-35-37 TALAVERA DE LA REINA TOLEDO'),
  ('305bae13-0af1-4d6e-bf13-9b4765c1e3c6', date '2026-05-05', 'excel Alvaro: direccion prestada por Daniel', 'JOAQUINA SANTANDER 37 TALAVERA DE LA REINA'),
  ('cbb8b08b-fc12-4426-929d-466234a73ba5', date '2026-03-12', 'excel Alvaro: administracion suya (administracion sin identificar)', 'JORGE LUIS BORGES 5 GUADALAJARA'),
  ('945583ad-7675-401c-afa1-fd433d080a83', date '2026-04-29', 'excel Alvaro: administracion suya (administracion sin identificar)', 'JOSE PAULETE 5 MADRID'),
  ('243129c6-3255-42d5-88a8-b17244cf9c32', date '2026-05-21', 'excel Alvaro: administracion suya (administracion sin identificar)', 'LA PRENSA 11 SSR'),
  ('e624d011-d701-4f53-8161-ebd485d3a6c2', date '2026-06-17', 'excel Alvaro: administracion suya (administracion sin identificar)', 'LAGARTERA 194 MADRID'),
  ('be3cf8cf-551d-4063-ac4e-a759966c00e8', date '2026-07-15', 'excel Alvaro: administracion suya (administracion sin identificar)', 'LIMA 33 FUENLABRADA'),
  ('41a37692-55f1-4029-bff9-c67808ef7d80', date '2026-04-28', 'excel Alvaro: administracion suya (administracion sin identificar)', 'LLANOS DE ESCUDERO 6 MADRID'),
  ('31923b50-0d35-4fb2-92f3-5c70812e4700', date '2026-04-13', 'excel Alvaro: administracion suya (administracion sin identificar)', 'LOPEZ GRASS 60 MADRID'),
  ('b6f1381f-a250-4dd7-a479-6ef7e25145cc', date '2026-03-11', 'excel Alvaro: administracion suya (administracion sin identificar)', 'LUCERO 10 MADRID'),
  ('db6eff5c-6418-43b3-987c-493868228b72', date '2026-06-10', 'excel Alvaro: administracion suya (administracion sin identificar)', 'MALAGA 4 ALCORCON'),
  ('94c93297-f008-41fa-a125-fd761a67a307', date '2026-06-20', 'excel Alvaro: administracion suya (administracion sin identificar)', 'MAR DE ARAL 11 MADRID'),
  ('27db5c4f-6f57-4b0a-8ccb-1398b0a0d485', date '2026-07-02', 'excel Alvaro: direccion prestada por Daniel', 'MARCOS DE ORUETA 16 MADRID'),
  ('d1d0d4b6-3466-4138-b4fa-951f7119e8db', date '2026-04-07', 'excel Alvaro: administracion suya (administracion sin identificar)', 'MARTELL 40 MADRID'),
  ('7b80fc34-6ebb-42d3-b9f5-4206b62b77ee', date '2026-04-25', 'excel Alvaro: administracion suya (administracion sin identificar)', 'MATARÓ 13 MADRID'),
  ('dcb60fa7-648a-4a7f-ba95-edbc74d3fd01', date '2026-07-09', 'excel Alvaro: administracion suya (administracion sin identificar)', 'MERCEDES IZQUIERDO 3 ALCOBENDAS'),
  ('6abb4016-a2be-466b-a356-45992613dbe2', date '2026-03-05', 'excel Alvaro: administracion suya (administracion sin identificar)', 'MEZQUITA 1 MADRID'),
  ('74039cf3-f660-4822-a7f4-5d1894d47052', date '2026-05-05', 'excel Alvaro: administracion suya (administracion sin identificar)', 'MOCHUELO 1 MADRID'),
  ('28b77c0b-8558-475c-879e-ea02652cda7d', date '2026-07-02', 'excel Alvaro: administracion suya (administracion sin identificar)', 'MODESTO LAFUENTE 42 MADRID'),
  ('694d1df8-8fd0-4ee0-a70e-7bb786a1a7c0', date '2026-04-25', 'excel Alvaro: administracion suya (administracion sin identificar)', 'MONCADA 101 MADRID'),
  ('98c97195-1723-4587-a1cc-484c8504ac70', date '2026-04-25', 'excel Alvaro: administracion suya (administracion sin identificar)', 'MONCADA 102 MADRID'),
  ('cecf4eb5-c3f2-44b4-be9b-494f8f8c9a96', date '2026-07-23', 'excel Alvaro: administracion suya (administracion sin identificar)', 'MONTES DE TOLEDO 3 MADRID'),
  ('78539010-15a6-46f4-92e8-6e20a7bff185', date '2026-03-19', 'excel Alvaro: administracion suya (administracion sin identificar)', 'NUESTRA SEÑORA DE LORETO 1 COSLADA'),
  ('050029c4-7ae5-4039-85f4-1fbb232dabea', date '2026-04-29', 'excel Alvaro: administracion suya (administracion sin identificar)', 'OSIRIS 17 HUMANES DE MADRID'),
  ('b677e699-41e1-41d0-ae87-2032e6c36d6b', date '2026-04-29', 'excel Alvaro: administracion suya (administracion sin identificar)', 'OSIRIS 19 HUMANES DE MADRID'),
  ('7c279917-5e0d-4183-8be1-f918db798c16', date '2026-02-08', 'excel Alvaro: direccion prestada por Daniel', 'PALOMARES 75-77-79 MADRID'),
  ('d7d3a0d0-d941-497b-8bad-8a018719458f', date '2026-02-08', 'excel Alvaro: direccion prestada por Daniel', 'PALOMARES 77 MADRID'),
  ('9606d60a-96ad-4915-b976-bc1efa23c59c', date '2026-03-16', 'excel Alvaro: administracion suya (administracion sin identificar)', 'PASEO DE LA RAMBLA 13 VALDEMORO'),
  ('aa580aa0-0783-4e1e-88c4-f6f21401ecf2', date '2026-02-08', 'excel Alvaro: direccion prestada por Daniel', 'PASEO DE LOS FERROVIARIOS 9 MADRID'),
  ('a62a7377-38a1-4f22-a1c7-838e23068320', date '2026-06-05', 'excel Alvaro: direccion prestada por Daniel', 'PASEO DE SAN ILLAN 3 MADRID'),
  ('9a8d6283-a35d-4783-b96e-1950e04a6081', date '2026-06-05', 'excel Alvaro: direccion prestada por Daniel', 'PASEO DE SAN ILLAN 7 MADRID'),
  ('8aa9cceb-e629-4efb-8dd6-2affccee71ac', date '2026-07-02', 'excel Alvaro: administracion suya (administracion sin identificar)', 'PEÑA DE LA ATALAYA 110 MADRID'),
  ('4d1eb514-398d-4439-8e82-b3a9048ceee4', date '2026-05-05', 'excel Alvaro: administracion suya (administracion sin identificar)', 'PICO CEJO 9 MADRID'),
  ('fdce8fb2-b593-409f-9d1c-23c503a943fd', date '2026-03-20', 'excel Alvaro: administracion suya (administracion sin identificar)', 'PILAR 17 SAN SEBASTIAN DE LOS REYES'),
  ('1c6b42a3-4465-41a0-9a67-af463b119f43', date '2026-03-02', 'excel Alvaro: administracion suya (administracion sin identificar)', 'PINTOR SOROLLA 3 MADRID'),
  ('31edce4e-acfe-4dd8-bdf7-f5855084bccc', date '2026-06-23', 'excel Alvaro: administracion suya (administracion sin identificar)', 'PRINCIPE 18 MADRID'),
  ('4282b7ac-19f6-4c55-93c5-36c72f35c1cf', date '2026-06-20', 'excel Alvaro: direccion prestada por Daniel', 'PUENTE NUEVO 7 TALAVERA DE LA REINA'),
  ('ace4f0ff-5ead-4beb-ba5a-1790cb6fce2a', date '2026-05-16', 'excel Alvaro: administracion suya (administracion sin identificar)', 'PUERTO DE COTOS 11 MADRID'),
  ('e026d0cb-d6a5-4482-ab83-27376daae713', date '2026-05-21', 'excel Alvaro: administracion suya (administracion sin identificar)', 'QUINCE DE AGOSTO 5 MADRID'),
  ('0145b03c-f62e-422d-982b-e121399f8ef4', date '2026-07-02', 'excel Alvaro: administracion suya (administracion sin identificar)', 'QUINCE DE AGOSTO 8 MADRID'),
  ('be59f11c-e96c-4dbf-87a6-587671014754', date '2026-07-15', 'excel Alvaro: administracion suya (administracion sin identificar)', 'RAMON GOMEZ DE LA SERNA 45 MADRID'),
  ('2459b9de-414b-48f5-a17f-6d80ba0d5383', date '2026-06-02', 'excel Alvaro: administracion suya (administracion sin identificar)', 'RAMON GOMEZ DE LA SERNA 91 MADRID'),
  ('64631567-fdfc-45c6-88d0-63484b381119', date '2026-05-26', 'excel Alvaro: el encargo lo trae una contrata', 'RIO MANZANARES 33  LEGANÉS'),
  ('e0b3aaed-edd4-4dd3-9f1f-2a99e3aa588f', date '2026-04-28', 'excel Alvaro: administracion suya (administracion sin identificar)', 'RIO TAJO 18 LEGANES'),
  ('ed4fa650-ae5b-4496-bc7a-d73cd3e15164', date '2026-01-30', 'excel Alvaro: administracion suya (administracion sin identificar)', 'RIOCABADO 10 MADRID'),
  ('54a1631d-f55e-4fd6-9ef8-9e0651fd469c', date '2026-05-22', 'excel Alvaro: administracion suya (administracion sin identificar)', 'SAMBARA 146 MADRID'),
  ('2b3c1298-9b19-484f-8020-4c6c2588da82', date '2026-05-01', 'excel Alvaro: administracion suya (administracion sin identificar)', 'SAN CLAUDIO 55'),
  ('8247f320-9ea7-42e0-81d2-da78546168ea', date '2026-07-09', 'excel Alvaro: administracion suya (administracion sin identificar)', 'SAN EUSEBIO 6 MADRID'),
  ('87a5dcb7-b3ba-4f4a-b2c0-9fb49e610841', date '2026-06-23', 'excel Alvaro: administracion suya (administracion sin identificar)', 'SAN PANCRACIO 1 ELPARDO MADRID'),
  ('b6076fd3-0122-4635-8d52-a5a604d43894', date '2026-04-25', 'excel Alvaro: administracion suya (administracion sin identificar)', 'SANCHEZ BARCAIZTEGUI 14 MADRID'),
  ('a209b8bc-5c43-4cf9-a2e6-aaf136d39327', date '2026-05-17', 'excel Alvaro: el encargo lo trae una contrata', 'SANTA COLOMA 9 MADRID'),
  ('c53d11ae-7635-473e-a909-eee9f43eb49b', date '2026-05-16', 'excel Alvaro: administracion suya (administracion sin identificar)', 'SEO DE URGEL 13 MADRID'),
  ('bc133e7a-fddd-44b7-bf18-61dfee11dd3e', date '2026-05-16', 'excel Alvaro: administracion suya (administracion sin identificar)', 'SEO DE URGEL 15 MADRID'),
  ('9904fc3e-79fd-4b4f-98dd-794e6abe2f14', date '2026-02-06', 'excel Alvaro: administracion suya (administracion sin identificar)', 'SEPULVEDA 49 MADRID'),
  ('7f94020f-8b31-4ce8-9cf9-37114df83fb2', date '2026-01-27', 'excel Alvaro: administracion suya (administracion sin identificar)', 'SEPULVEDA160 MADRID'),
  ('9496325b-90ec-4ca8-850a-558570815d18', date '2026-04-25', 'excel Alvaro: administracion suya (administracion sin identificar)', 'SERENA 23 MADRID'),
  ('fc495635-5397-4e7e-9aa0-065ce777703c', date '2026-03-05', 'excel Alvaro: administracion suya (administracion sin identificar)', 'TENIENTE MUÑOZ DIAZ 27 MADRID'),
  ('4bf9a121-e449-4933-b0ff-68fa0c233623', date '2026-06-10', 'excel Alvaro: administracion suya (administracion sin identificar)', 'TERCIO 1 MADRID'),
  ('79869390-1ef8-4b6a-8a63-8aca46b461fe', date '2026-05-16', 'excel Alvaro: administracion suya (administracion sin identificar)', 'TOMAS APARICIO 3 MADRID'),
  ('2a72663a-00a3-456d-99ee-daf9951aa86c', date '2026-03-26', 'excel Alvaro: administracion suya (administracion sin identificar)', 'TRAVESIA PALOMERAS 7 MADRID'),
  ('51e68743-7bd7-4e1b-bba4-519c747f2b0a', date '2026-05-22', 'excel Alvaro: administracion suya (administracion sin identificar)', 'TRAVESÍA DE SANTIAGO ALIO 2 MADRID'),
  ('b84748d7-0fe7-430c-bdb8-8b430037fe9f', date '2026-04-25', 'excel Alvaro: administracion suya (administracion sin identificar)', 'URB.NUEVO GRIÑON 1 GRIÑON'),
  ('243ee7cf-ac1f-4df0-a18d-e703f3e3ac0e', date '2026-05-19', 'excel Alvaro: administracion suya (administracion sin identificar)', 'VALDEMORO 8 FUENLABRADA'),
  ('3de00897-0399-4921-b19f-ef1be7dd93a2', date '2026-06-03', 'excel Alvaro: administracion suya (administracion sin identificar)', 'VALLADOLID 13 FUENLABRADA'),
  ('b413b57b-f0d0-4060-9e66-fc4dd2bd8559', date '2026-02-12', 'excel Alvaro: administracion suya (administracion sin identificar)', 'VELEZ MALAGA 20 MADRID'),
  ('1f899de6-2764-440b-9b22-302cd5f92561', date '2026-05-17', 'excel Alvaro: administracion suya (administracion sin identificar)', 'VILLAFUERTE 17 MADRID'),
  ('b01d9249-683d-4d29-ad87-9720e2471588', date '2026-07-02', 'excel Alvaro: direccion prestada por Daniel', 'VIRGEN DE ARANZAZU 21 MADRID'),
  ('d31531c1-ba3e-4a75-9b4b-155a4d5bd5ec', date '2026-04-29', 'excel Alvaro: direccion prestada por Daniel', 'WITERICO 20 MADRID')
) as v(comunidad_id, desde, motivo, nombre_para_revisar)
join comunidades cm on cm.id = v.comunidad_id::uuid;

commit;

-- Que ha quedado
select c.nombre as comercial,
       count(*) filter (where k.administracion_fincas_id is not null) as administraciones,
       count(*) filter (where k.comunidad_id is not null)             as direcciones,
       count(*) filter (where k.hasta is null)                        as vigentes
from cartera_comercial k join comerciales c on c.id = k.comercial_id
group by c.nombre order by 2 desc;
