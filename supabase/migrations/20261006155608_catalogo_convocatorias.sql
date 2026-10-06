-- ===========================================================================
-- EL CATALOGO DE CONVOCATORIAS HABITUALES   (6-oct-2026)
--
-- Lo que necesita Daniel en el anexo de la viabilidad: "Rehabilita · Comunidad
-- de Madrid · se convoca en abril y octubre · accesibilidad: ascensor hasta
-- 90.000 euros", a grosso modo, de las convocatorias HABITUALES de la Comunidad
-- de Madrid y de los ayuntamientos grandes. NO es el detalle por comunidad (eso
-- es el Excel SUBVENCIONES.xlsx de Dropbox, y no hace falta aqui).
--
-- Sacado de las bases de las carpetas de Dropbox D SM/SUBVENCIONES y de
-- internet, y VALIDADO por Monica y Daniel el 6-oct-2026:
-- docs/catalogo-convocatorias-habituales.xlsx.
--
-- Una fila por LINEA de convocatoria. Donde las cifras cambian por zona (ZETU /
-- ZIRE) o por tramo de ahorro, va una fila por cada una: asi el anexo puede
-- CALCULAR lo que le tocaria a un edificio -el menor entre el porcentaje del
-- coste de obra y el tope por sus viviendas-. Y el texto tal cual, para leerlo.
--
-- Que obras cubre cada linea se engancha a tipos_proyecto: es lo que permite el
-- "para la rampa que nos han pedido podria acceder a...".
--
-- La tabla `convocatorias` de julio (plantilla para extraer bases con IA) es
-- otra cosa, esta vacia y en stand by: no se toca.
-- ===========================================================================

begin;

create table catalogo_convocatorias (
  id              uuid primary key default gen_random_uuid(),
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now(),
  orden           integer,
  ambito          text not null,
  entidad         text not null,
  programa        text not null,
  linea           text,
  donde           text not null,
  -- Municipio en mayusculas y sin tildes, como accesos.municipio. Vacio = toda
  -- la Comunidad.
  municipio       text,
  -- Solo para Madrid capital, cuando la cifra depende de la zona del Rehabilita.
  zona            text,
  -- Solo en barrios o areas delimitados (Transforma tu Barrio, ERRP, ARRUR):
  -- no se le puede ofrecer a cualquier edificio del municipio.
  solo_barrios    boolean not null default false,
  para_que        text not null,
  cubre           text,
  porcentaje      numeric,
  tope_vivienda   numeric,
  tope_edificio   numeric,
  tope_actuacion  numeric,
  cuanto_da       text not null,
  requisitos      text,
  obra_momento    text not null default 'sin_definir',
  cuando          text,
  estado          text not null,
  estado_nota     text,
  en_una_linea    text not null,
  fuente          text,
  por_confirmar   text,
  validado_por    text,
  validado_en     date,
  activo          boolean not null default true,
  constraint catalogo_convocatorias_ambito_check check (ambito in ('ayto_madrid', 'comunidad', 'municipio', 'privada')),
  constraint catalogo_convocatorias_zona_check check (zona in ('ZETU', 'ZIRE')),
  constraint catalogo_convocatorias_para_que_check check (para_que in ('accesibilidad', 'eficiencia', 'conservacion', 'salud', 'renovables', 'integral')),
  constraint catalogo_convocatorias_obra_check check (obra_momento in ('sin_empezar', 'terminada', 'cualquiera', 'sin_definir')),
  -- abierta / cerrada (se repite: se ofrece) / pendiente (anunciada, sin
  -- convocar) / historica (no se repetira: no se ofrece, queda de referencia).
  constraint catalogo_convocatorias_estado_check check (estado in ('abierta', 'cerrada', 'pendiente', 'historica'))
);
comment on table catalogo_convocatorias is
  'Convocatorias HABITUALES de ayudas a la rehabilitacion (CAM y ayuntamientos grandes), una fila por linea. Validado por Monica y Daniel el 6-oct-2026. De aqui sale el "podria optar a..." del anexo de la viabilidad.';

create table catalogo_convocatoria_tipos (
  convocatoria_id  uuid not null references catalogo_convocatorias(id) on delete cascade,
  tipo_proyecto_id uuid not null references tipos_proyecto(id),
  primary key (convocatoria_id, tipo_proyecto_id)
);
comment on table catalogo_convocatoria_tipos is
  'Que obras (tipos_proyecto) cubre cada linea de convocatoria: el "para la rampa que nos han pedido..." del anexo.';

alter table catalogo_convocatorias enable row level security;
alter table catalogo_convocatoria_tipos enable row level security;

create temporary table _carga (orden int, ambito text, entidad text, programa text, linea text, donde text, municipio text, zona text,
  solo_barrios boolean, para_que text, cubre text, porcentaje numeric, tope_vivienda numeric, tope_edificio numeric, tope_actuacion numeric,
  cuanto_da text, requisitos text, obra_momento text, cuando text, estado text, estado_nota text, en_una_linea text, fuente text, por_confirmar text) on commit drop;
insert into _carga values
(1, 'ayto_madrid', 'Ayuntamiento de Madrid', 'Plan Rehabilita', 'Accesible · ZETU', 'Madrid capital, zona ZETU', 'MADRID', 'ZETU', false, 'accesibilidad', 'Ascensor (incluso rehacer el núcleo de escalera), rampas, plataformas, ampliar cabina o paradas, accesibilidad calle-vivienda', 75, 10000, null, null, '75% de la obra, hasta 10.000 € por vivienda', 'Edificio de antes de 1998 · ≥70% residencial · IEE registrado antes de pedirla · licencia · presupuesto >6.000 €. En ZETU la accesibilidad es obligatoria si se pide el Rehabilita', 'cualquiera', 'Anual. Últimas: jun-2025 y jun-2026', 'cerrada', '2026 cerró el 30-sep-2026', 'Rehabilita · Ayto Madrid · anual · accesibilidad ZETU: 75% hasta 10.000 €/viv', 'Dropbox SUBVENCIONES / AYTO MADRID - REHABILITA 2026 (Anexo I)', 'Tope en edificios de menos de 10 viviendas'),
(2, 'ayto_madrid', 'Ayuntamiento de Madrid', 'Plan Rehabilita', 'Accesible · ZIRE', 'Madrid capital, zona ZIRE', 'MADRID', 'ZIRE', false, 'accesibilidad', 'Ascensor, rampas, plataformas, ampliar cabina o paradas, accesibilidad calle-vivienda', 40, 4000, null, null, '40% de la obra, hasta 4.000 € por vivienda', 'Edificio de antes de 1998 · ≥70% residencial · IEE registrado antes de pedirla · licencia · presupuesto >6.000 €', 'cualquiera', 'Anual. Últimas: jun-2025 y jun-2026', 'cerrada', '2026 cerró el 30-sep-2026', 'Rehabilita · Ayto Madrid · anual · accesibilidad ZIRE: 40% hasta 4.000 €/viv', 'Dropbox SUBVENCIONES / AYTO MADRID - REHABILITA 2026 (Anexo I)', 'Tope en edificios de menos de 10 viviendas'),
(3, 'ayto_madrid', 'Ayuntamiento de Madrid', 'Plan Rehabilita', 'Verde · ZETU', 'Madrid capital, zona ZETU', 'MADRID', 'ZETU', false, 'eficiencia', 'Envolvente (SATE, aislamiento, carpinterías), climatización sin fósiles, renovables', 60, 8000, null, null, '60% con demanda −35% (65% si es F/G; 70-75% con −60%; 80% consumo casi nulo), hasta 8.000 € por vivienda', 'Los de la Accesible', 'cualquiera', 'Anual, con la Accesible', 'cerrada', '2026 cerró el 30-sep-2026', 'Rehabilita · Ayto Madrid · eficiencia ZETU: 60-80% según ahorro, hasta 8.000 €/viv', 'Dropbox SUBVENCIONES / AYTO MADRID - REHABILITA 2026 (Anexo I)', 'Tope 2026: ¿8.000 € o 9.000 € para F/G?'),
(4, 'ayto_madrid', 'Ayuntamiento de Madrid', 'Plan Rehabilita', 'Verde · ZIRE', 'Madrid capital, zona ZIRE', 'MADRID', 'ZIRE', false, 'eficiencia', 'Envolvente (SATE, aislamiento, carpinterías), climatización sin fósiles, renovables', 50, 8000, null, null, '50% con demanda −35% (55% si es F/G; 60-65% con −60%; 80% consumo casi nulo), hasta 8.000 € por vivienda', 'Los de la Accesible + −30% de energía primaria no renovable', 'cualquiera', 'Anual, con la Accesible', 'cerrada', '2026 cerró el 30-sep-2026', 'Rehabilita · Ayto Madrid · eficiencia ZIRE: 50-80% según ahorro, hasta 8.000 €/viv', 'Dropbox SUBVENCIONES / AYTO MADRID - REHABILITA 2026 (Anexo I)', 'Tope 2026: ¿8.000 € o 9.000 € para F/G?'),
(5, 'ayto_madrid', 'Ayuntamiento de Madrid', 'Plan Rehabilita', 'Conserva · ZETU', 'Madrid capital, zona ZETU', 'MADRID', 'ZETU', false, 'conservacion', 'Estructura, fachada, cubierta, instalaciones comunes', 50, 5000, null, null, '50% de la obra (55% si está protegido), hasta 5.000 € por vivienda', 'Los de la Accesible', 'cualquiera', 'Anual, con la Accesible', 'cerrada', '2026 cerró el 30-sep-2026', 'Rehabilita · conservación ZETU: 50% hasta 5.000 €/viv', 'Dropbox SUBVENCIONES / AYTO MADRID - REHABILITA 2026 (Anexo I)', null),
(6, 'ayto_madrid', 'Ayuntamiento de Madrid', 'Plan Rehabilita', 'Conserva · ZIRE', 'Madrid capital, zona ZIRE', 'MADRID', 'ZIRE', false, 'conservacion', 'Estructura, fachada, cubierta, instalaciones comunes', 40, 4000, null, null, '40% de la obra (45% si está protegido), hasta 4.000 € por vivienda', 'Los de la Accesible', 'cualquiera', 'Anual, con la Accesible', 'cerrada', '2026 cerró el 30-sep-2026', 'Rehabilita · conservación ZIRE: 40% hasta 4.000 €/viv', 'Dropbox SUBVENCIONES / AYTO MADRID - REHABILITA 2026 (Anexo I)', null),
(7, 'ayto_madrid', 'Ayuntamiento de Madrid', 'Plan Rehabilita', 'Salud (amianto)', 'Madrid capital', 'MADRID', null, false, 'salud', 'Retirada de amianto, radón, cuartos de basuras', 75, 10000, null, null, '75% de la obra, hasta 10.000 € por vivienda', 'Los de la Accesible', 'cualquiera', 'Anual, con la Accesible', 'cerrada', '2026 cerró el 30-sep-2026', 'Rehabilita · amianto: 75% hasta 10.000 €/viv', 'Dropbox SUBVENCIONES / AYTO MADRID - REHABILITA 2026 (Anexo I)', null),
(8, 'ayto_madrid', 'Ayuntamiento de Madrid', 'Plan Adapta Madrid', 'Línea D · zonas comunes', 'Madrid capital', 'MADRID', null, false, 'accesibilidad', 'Rampas, salvaescaleras, plataformas, puertas automáticas, videoportero, botoneras accesibles. NO ascensor nuevo', 75, null, 20000, null, '75% de la obra, hasta 20.000 € por edificio (los primeros 1.000 € al 100%)', 'Vive una persona con discapacidad ≥33% o enfermedad rara, empadronada desde octubre del año anterior · IEE · acuerdo de junta · incompatible con otra ayuda para lo mismo', 'cualquiera', 'Anual, en primavera (abr-jul)', 'cerrada', '2026 cerró el 27-jul-2026', 'Adapta · Ayto Madrid · primavera · rampas y plataformas: 75% hasta 20.000 €/edificio (con vecino con discapacidad)', 'Dropbox SUBVENCIONES / AYTO MADRID - ADAPTA 2026 / ANEXO CONVOCATORIA 7.pdf', null),
(9, 'ayto_madrid', 'Ayuntamiento de Madrid', 'Transforma tu Barrio', 'Accesibilidad', 'Solo barrios concretos de Madrid, distintos cada año', 'MADRID', null, true, 'accesibilidad', 'Ascensor, rampas, plataformas…', 35, 3000, null, null, '35% de la obra, hasta 3.000 € por vivienda · se suma al Rehabilita', 'Antes de 1998 · ≥70% residencial · IEE registrado', 'cualquiera', 'Anual, entre junio y octubre', 'abierta', '2026 abierta hasta el 16-oct-2026 (barrios: Orcasitas, San Cristóbal, Poblado Dirigido de Fuencarral, Puerto Chico)', 'Transforma tu Barrio · barrios concretos · se suma al Rehabilita · accesibilidad 35% hasta 3.000 €/viv', 'Dropbox SUBVENCIONES / AYTO MADRID - TRANSFORMA TU BARRIO 2026', 'Fecha exacta del BOCM 2026'),
(10, 'ayto_madrid', 'Ayuntamiento de Madrid', 'Transforma tu Barrio', 'Conservación', 'Solo barrios concretos de Madrid', 'MADRID', null, true, 'conservacion', 'Estructura, fachada y cubierta con aislamiento, instalaciones', 50, null, 25000, null, '50% de la obra, hasta 25.000 € por edificio · se suma al Rehabilita', 'Antes de 1998 · ≥70% residencial · IEE registrado', 'cualquiera', 'Anual, entre junio y octubre', 'abierta', '2026 abierta hasta el 16-oct-2026', 'Transforma tu Barrio · conservación 50% hasta 25.000 €/edificio', 'Dropbox SUBVENCIONES / AYTO MADRID - TRANSFORMA TU BARRIO 2026', null),
(11, 'ayto_madrid', 'Ayuntamiento de Madrid', 'Transforma tu Barrio', 'Eficiencia', 'Solo barrios concretos de Madrid', 'MADRID', null, true, 'eficiencia', 'Envolvente, climatización sin fósiles, renovables', 35, null, 55000, null, '35% de la obra, hasta 55.000 € por edificio · se suma al Rehabilita', 'Antes de 1998 · ≥70% residencial · IEE registrado · demanda −35%', 'cualquiera', 'Anual, entre junio y octubre', 'abierta', '2026 abierta hasta el 16-oct-2026', 'Transforma tu Barrio · eficiencia 35% hasta 55.000 €/edificio', 'Dropbox SUBVENCIONES / AYTO MADRID - TRANSFORMA TU BARRIO 2026', null),
(12, 'ayto_madrid', 'Ayuntamiento de Madrid (calidad del aire)', 'Cambia 360', 'Calderas', 'Madrid capital', 'MADRID', null, false, 'eficiencia', 'Cambio de calderas contaminantes por sistemas eficientes o renovables', null, 5000, null, null, 'Hasta 5.000 € por vivienda', 'Comunidades de 2 o más viviendas', 'sin_definir', 'Anual, en primavera', 'abierta', '2026 abierta hasta el 13-nov-2026', 'Cambia 360 · Ayto Madrid · calderas hasta 5.000 €/viv', 'madrid.es (nota de prensa 2026)', 'Porcentaje; confirmar con bases'),
(13, 'comunidad', 'Comunidad de Madrid', 'Ayudas de accesibilidad CAM', 'Accesibilidad', 'Toda la Comunidad', null, null, false, 'accesibilidad', 'Ascensor, salvaescaleras, rampas, automatismos, videoportero, alarma en ascensor', 60, 9000, null, null, '9.000 € por vivienda (90 €/m² de local), máximo el 60% de la obra · +3.000 €/viv si está protegido', 'Edificio de antes de 2006 · ≥50% residencial · ≥30% domicilio habitual · IEE registrado · licencia · por puntos (antigüedad, nº de viviendas, discapacidad, mayores de 70)', 'sin_empezar', 'Casi anual (2022, 2023, 2025), en primavera u otoño', 'cerrada', 'La de 2025 se resolvió el 2-ene-2026', 'Accesibilidad CAM · casi anual · hasta 9.000 €/viv con máximo del 60%', 'Dropbox SUBVENCIONES / CAM - ACCESIBILIDAD 2025 / BOCM-20250526-31.pdf', 'Si hubo edición en 2024'),
(14, 'comunidad', 'Comunidad de Madrid', 'Plan Regional de Ascensores', 'Ascensor nuevo', 'Toda la Comunidad', null, null, false, 'accesibilidad', 'Ascensor en edificios sin él, más accesibilidad complementaria', 80, null, null, 90000, '80% de la inversión, hasta 90.000 € por ascensor', 'Planta baja + 2 o más · ≥50% residencial · IEE registrado · obra no empezada', 'sin_empezar', 'Una sola edición (may-ago 2023)', 'cerrada', 'En sep-2026 se anunció ''Rehabilitar Madrid'' con 33 M€ para ascensores, sin fechas', 'Plan de Ascensores CAM · 2023 · 80% hasta 90.000 € por ascensor', 'Dropbox SUBVENCIONES / CAM - ASCENSORES 2023 / BOCM-20230526-14.PDF', 'Si ''Rehabilitar Madrid'' lo repite y con qué cifras'),
(15, 'comunidad', 'Comunidad de Madrid (Plan Estatal de Vivienda)', 'Plan Estatal 2026-2030', 'Accesibilidad', 'Toda la Comunidad', null, null, false, 'accesibilidad', 'Ascensor, rampas, plataformas, accesibilidad universal', 70, 13000, null, null, '70% de la obra, hasta 13.000 € por vivienda (18.000 € con discapacidad ≥33% o mayores de 65; 20.500 € con ≥65%; 22.000 € accesibilidad plena)', 'Edificio de antes de 2006 · Libro del Edificio Existente en el Registro · amianto y residuos · se reparte entre las viviendas que son domicilio habitual', 'sin_definir', 'Pendiente: la CAM aún no lo ha convocado (RD 326/2026)', 'pendiente', 'Lo que viene con ''Rehabilitar Madrid'' (450 M€), sin fechas', 'Plan Estatal 2026-2030 · pendiente · accesibilidad 70% hasta 13.000-22.000 €/viv', 'Dropbox SUBVENCIONES / CAM - PLAN ESTATAL 2026-2030 / BOE-A-2026-8872.pdf', 'Fechas y cifras de la convocatoria de la CAM'),
(16, 'comunidad', 'Comunidad de Madrid (Plan Estatal de Vivienda)', 'Plan Estatal 2026-2030', 'Eficiencia · ahorro 45-60%', 'Toda la Comunidad', null, null, false, 'eficiencia', 'Envolvente según HE1', 65, 13000, null, null, '65% de la obra, hasta 13.000 € por vivienda', 'Los de la línea de accesibilidad', 'sin_definir', 'Pendiente: la CAM aún no lo ha convocado', 'pendiente', 'Sin fechas', 'Plan Estatal 2026-2030 · eficiencia (ahorro 45-60%): 65% hasta 13.000 €/viv', 'Dropbox SUBVENCIONES / CAM - PLAN ESTATAL 2026-2030 / BOE-A-2026-8872.pdf', 'Fechas y cifras de la convocatoria de la CAM'),
(17, 'comunidad', 'Comunidad de Madrid (Plan Estatal de Vivienda)', 'Plan Estatal 2026-2030', 'Eficiencia · ahorro ≥60%', 'Toda la Comunidad', null, null, false, 'eficiencia', 'Envolvente según HE1', 80, 20500, null, null, '80% de la obra, hasta 20.500 € por vivienda', 'Los de la línea de accesibilidad', 'sin_definir', 'Pendiente: la CAM aún no lo ha convocado', 'pendiente', 'Sin fechas', 'Plan Estatal 2026-2030 · eficiencia (ahorro ≥60%): 80% hasta 20.500 €/viv', 'Dropbox SUBVENCIONES / CAM - PLAN ESTATAL 2026-2030 / BOE-A-2026-8872.pdf', 'Fechas y cifras de la convocatoria de la CAM'),
(18, 'comunidad', 'Comunidad de Madrid (Next Generation)', 'Next Generation', 'Programa 3 · edificio', 'Toda la Comunidad', null, null, false, 'eficiencia', 'Rehabilitación energética del edificio', 40, 6300, null, null, 'Por ahorro: 30-45% → 40% hasta 6.300 €/viv · 45-60% → 65% hasta 11.600 € · ≥60% → 80% hasta 18.800 €', '−30% energía primaria · −35% demanda (zona D)', 'sin_definir', '2022-2023', 'historica', 'Cerrado y agotado: no habrá más', 'Next Generation P3 · cerrado · 40-80% hasta 6.300-18.800 €/viv', 'Dropbox SUBVENCIONES / CAM - NEXT GENERATION 2022 / Orden 1429-22.pdf', null),
(19, 'comunidad', 'Comunidad de Madrid (Next Generation)', 'Next Generation', 'Programa 1 · barrios ERRP', 'Solo barrios delimitados', null, null, true, 'eficiencia', 'Rehabilitación energética del edificio', 40, 8100, null, null, 'Por ahorro: 30-45% → 40% hasta 8.100 €/viv · 45-60% → 65% hasta 14.500 € · >60% → 80% hasta 21.400 €', '−30% energía primaria', 'sin_definir', '2023-2025, por barrio', 'historica', 'Cerrado en todos los barrios', 'Next Generation barrios · cerrado · 40-80% hasta 8.100-21.400 €/viv', 'Dropbox SUBVENCIONES / CAM ERRP P1 NG ALCORCON / GETAFE / PINTO', null),
(20, 'comunidad', 'Comunidad de Madrid (Plan Estatal 2018-2021)', 'ARRUR', 'Áreas de regeneración', 'Solo áreas delimitadas', null, null, true, 'integral', 'Conservación, eficiencia y accesibilidad, más urbanización', 40, 12000, null, null, '40%, hasta 12.000 €/viv con −35% de demanda u 8.000 €/viv en el resto', 'IEE · licencia', 'sin_definir', '2019-2022', 'historica', 'Liquidado', 'ARRUR · liquidado · 40% hasta 8.000-12.000 €/viv', 'Dropbox SUBVENCIONES / CAM ARRUR 2022 FUENLABRADA - CERRO Y MOLINO', null),
(21, 'comunidad', 'Comunidad de Madrid', 'PREE 5000', 'Eficiencia', 'Municipios pequeños (sin confirmar)', null, null, false, 'eficiencia', 'Envolvente, instalaciones térmicas, iluminación', 50, null, null, null, '50% envolvente · 40% instalaciones térmicas · 20% iluminación', 'Edificio de antes de 2007 · subir una letra · −30% de consumo', 'sin_definir', '—', 'historica', 'Cerrado el 31-jul-2024', 'PREE 5000 · cerrado · 50% en envolvente', 'comunidad.madrid (web)', 'Casi todo: ámbito, gestor, origen de los fondos'),
(22, 'municipio', 'Ayto. Fuenlabrada (IMVF)', 'Accesibilidad en edificios', 'Accesibilidad', 'Fuenlabrada', 'FUENLABRADA', null, false, 'accesibilidad', 'Ascensor, mejora de ascensor, plataformas, rampas, supresión de peldaños', 20, null, 25000, 20000, '20% de la obra, hasta 20.000 € por actuación y 25.000 € si son varias', 'CP de más de 15 años · ≥70% residencial · IEE registrado antes · licencia o DR · certificado final de obra', 'terminada', 'Anual: aprobación en may-jun, cierre en sep-oct', 'abierta', '2026: cierre 18-sep (bases) u 11-oct (nota municipal), por confirmar', 'Fuenlabrada · anual · accesibilidad: 20% hasta 20.000 € por actuación, con la obra terminada', 'Dropbox SUBVENCIONES / AYTO FUENLABRADA - ACCESILIBIDAD 2026 / V5._Bases_Reguladoras_de_Accesibilidad_2026_V4.pdf', 'Fecha de cierre 2026'),
(23, 'municipio', 'Ayto. Fuenlabrada (IMVF)', 'Energía solar y ventanas', 'Fotovoltaica y solar térmica', 'Fuenlabrada', 'FUENLABRADA', null, false, 'renovables', 'Paneles solares (con retirada de amianto) · ventanas desde 2024 (20% hasta 2.000 €/vivienda)', 20, null, 5000, null, 'Solar: 20% hasta 5.000 € por comunidad · ventanas: 20% hasta 2.000 €/vivienda', 'Como la de accesibilidad + Registro de Autoconsumo', 'terminada', 'Anual, como la de accesibilidad', 'abierta', '2026: cierre 11-oct según la nota municipal, por confirmar', 'Fuenlabrada · anual · fotovoltaica 20% hasta 5.000 € · ventanas 20% hasta 2.000 €/viv', 'Dropbox SUBVENCIONES / AYTO FUENLABRADA - ACC-FOTOV 2025', 'Bases 2026'),
(24, 'municipio', 'Ayto. Getafe (EMSV)', 'Ascensores', 'Ascensor nuevo', 'Getafe', 'GETAFE', null, false, 'accesibilidad', 'Ascensor en edificios de 3 o más alturas sin él', 21, null, null, 31635, '21% hasta 31.635 € por ascensor (2025); 35.000 € en 2026 según la prensa', 'Licencia o DR · acta de junta · certificado final de obra · IEE registrado · facturas pagadas', 'terminada', 'Anual, 20 días hábiles', 'abierta', '2026 abierta (cierre 11-oct o 20-oct)', 'Getafe · anual · ascensor 21% hasta 31.635-35.000 €, con la obra del año anterior', 'Dropbox SUBVENCIONES / AYTO GETAFE - ASCENSORES 2025', 'Fecha de cierre y tope 2026 con bases'),
(25, 'municipio', 'Ayto. Getafe (EMSV)', 'Envolvente y fotovoltaica', 'Eficiencia', 'Getafe', 'GETAFE', null, false, 'eficiencia', 'Fachadas, cubiertas y fotovoltaica en cubierta común (−30% energía primaria)', 21, null, 21000, null, '21% hasta 21.000 € (25% hasta 25.000 € en barrio prioritario) en 2025 · hasta 25% y 40.000 € en 2026', 'Como la de ascensores', 'terminada', 'Anual, con la de ascensores', 'abierta', '2026 abierta', 'Getafe · anual · envolvente 21-25% hasta 21.000-40.000 €', 'Dropbox SUBVENCIONES / AYTO GETAFE - ASCENSORES 2025', 'Cifras 2026 con bases'),
(26, 'municipio', 'Ayto. Leganés', 'Conservación, accesibilidad y eficiencia', 'General', 'Leganés', 'LEGANES', null, false, 'integral', 'Deficiencias del IEE, ascensor, rampas, eficiencia (subir una letra)', 20, null, 12000, null, '20%, hasta 12.000 € por comunidad', 'Edificio de más de 30 años (no en accesibilidad) · ≥70% residencial · IEE', 'sin_empezar', 'Irregular: 2019 y 2021/2022', 'cerrada', 'Sin convocatoria; las de 2022 seguían sin pagar en 2025', 'Leganés · irregular · 20% hasta 12.000 € por comunidad', 'Dropbox SUBVENCIONES / AYTO LEGANES - ACCESIBILIDAD 2022', 'Si vuelve a convocar'),
(27, 'municipio', 'Ayto. Alcobendas (EMVIALSA)', 'Obras del IEE y accesibilidad', 'Accesibilidad', 'Alcobendas', 'ALCOBENDAS', null, false, 'accesibilidad', 'Barandillas, rampas, salvaescaleras, plataformas, ascensor', 30, null, null, 20000, '30%, hasta 6.000 € (rampa), 12.000 € (plataforma), 20.000 € (ascensor) · + ayuda por renta a cada propietario', 'NO empezar la obra antes de pedirla · licencia · IEE · una vez cada 10 años', 'sin_empezar', 'Bases permanentes, todo el año (400.000 €/año)', 'abierta', 'Permanente', 'Alcobendas · todo el año · ascensor 30% hasta 20.000 €, rampa hasta 6.000 €', 'Dropbox SUBVENCIONES / AYTO ALCOBENDAS - ACCESIBILIDAD 2025 / BASES_APROB_CJO_19mar25.pdf', null),
(28, 'municipio', 'Ayto. Alcobendas (EMVIALSA)', 'Obras del IEE y accesibilidad', 'Conservación (obras del IEE)', 'Alcobendas', 'ALCOBENDAS', null, false, 'conservacion', 'Obras obligatorias del IEE, electricidad', 20, null, null, null, '20% del presupuesto', 'NO empezar la obra antes de pedirla · licencia · IEE', 'sin_empezar', 'Bases permanentes', 'abierta', 'Permanente', 'Alcobendas · todo el año · obras del IEE 20%', 'Dropbox SUBVENCIONES / AYTO ALCOBENDAS - ACCESIBILIDAD 2025', null),
(29, 'municipio', 'Ayto. Alcobendas (EMVIALSA)', 'Eficiencia energética', 'Eficiencia', 'Alcobendas', 'ALCOBENDAS', null, false, 'eficiencia', 'Envolvente, instalaciones térmicas, renovables', null, null, 3000, null, '15% por cada letra que sube hasta la D, 10% hasta la B, 7,5% a la A · tope 3.000 € por edificio', '≥70% residencial · no empezar antes · licencia · acuerdo de junta', 'sin_empezar', 'Bases permanentes', 'abierta', 'Permanente', 'Alcobendas · todo el año · eficiencia hasta 3.000 € por edificio', 'Dropbox SUBVENCIONES / AYTO ALCOBENDAS - EFICIENCIA ENERGETICA 2024', null),
(30, 'municipio', 'Ayto. Alcorcón', 'Transición ecológica', 'Fotovoltaica y aerotermia', 'Alcorcón', 'ALCORCON', null, false, 'renovables', 'Fotovoltaica en edificios y comunidades energéticas · aerotermia', null, null, 30000, null, 'Fotovoltaica hasta 30.000 € (porcentaje sin confirmar) · aerotermia 40% hasta 4.000 €', '—', 'sin_definir', '2026 (hasta 31-jul); probablemente también 2025', 'cerrada', '2026 cerró el 31-jul', 'Alcorcón · fotovoltaica hasta 30.000 €', 'ayto-alcorcon.es y prensa', 'Porcentajes y bases'),
(31, 'municipio', 'Ayto. Torrejón de Ardoz (EMVS)', 'Ayuda complementaria a ascensores', 'Ascensor', 'Torrejón de Ardoz', 'TORREJON DE ARDOZ', null, false, 'accesibilidad', 'Completa la ayuda de accesibilidad de la Comunidad', null, null, null, null, 'Sin confirmar', 'Edificio de antes de 2006, sin ascensor · haber pedido la ayuda de la CAM', 'sin_definir', '2022-2023; posible convocatoria especial en 2026', 'cerrada', 'Sin confirmar', 'Torrejón · completa la ayuda de la CAM a ascensores', 'ayto-torrejon.es (notas de prensa)', 'Importes'),
(32, 'privada', 'Fundación Mutua de Propietarios', 'Sin Barreras', 'Accesibilidad de zonas comunes', 'Madrid capital y Comunidad (también Barcelona y Valencia)', null, null, false, 'accesibilidad', 'Ascensor nuevo, cota cero, rampas, puertas, salvaescaleras y plataformas', 50, null, 15000, null, '50%, hasta 15.000 € por comunidad · compatible con otras ayudas', 'Vecino con movilidad reducida o de 75 años o más · obra NO empezada antes de la resolución · por puntos', 'sin_empezar', 'Anual, a principios de año (2026: 3-feb a 17-mar)', 'cerrada', '2026 cerrada', 'Fundación Mutua · feb-mar · accesibilidad 50% hasta 15.000 € por comunidad', 'Dropbox SUBVENCIONES / FUNDACION MUTUA - SIN BARRERAS 2026', null);

insert into catalogo_convocatorias (orden, ambito, entidad, programa, linea, donde, municipio, zona, solo_barrios, para_que, cubre,
  porcentaje, tope_vivienda, tope_edificio, tope_actuacion, cuanto_da, requisitos, obra_momento, cuando, estado, estado_nota,
  en_una_linea, fuente, por_confirmar, validado_por, validado_en)
select orden, ambito, entidad, programa, linea, donde, municipio, zona, solo_barrios, para_que, cubre,
  porcentaje, tope_vivienda, tope_edificio, tope_actuacion, cuanto_da, requisitos, obra_momento, cuando, estado, estado_nota,
  en_una_linea, fuente, por_confirmar, 'Mónica y Daniel', date '2026-10-06'
from _carga;

create temporary table _tipos (orden int, clave text) on commit drop;
insert into _tipos values
(1, 'ascensor'),
(1, 'rampa'),
(1, 'plataforma'),
(1, 'cota_cero'),
(1, 'cambio_puertas'),
(1, 'cambio_cabina'),
(1, 'anadir_parada'),
(2, 'ascensor'),
(2, 'rampa'),
(2, 'plataforma'),
(2, 'cota_cero'),
(2, 'cambio_puertas'),
(2, 'cambio_cabina'),
(2, 'anadir_parada'),
(3, 'sate'),
(3, 'sate_fachada'),
(3, 'cubierta'),
(3, 'aerotermia'),
(3, 'fotovoltaica'),
(4, 'sate'),
(4, 'sate_fachada'),
(4, 'cubierta'),
(4, 'aerotermia'),
(4, 'fotovoltaica'),
(5, 'arreglo_fachada'),
(5, 'arreglo_cubierta'),
(6, 'arreglo_fachada'),
(6, 'arreglo_cubierta'),
(8, 'rampa'),
(8, 'plataforma'),
(8, 'cambio_puertas'),
(9, 'ascensor'),
(9, 'rampa'),
(9, 'plataforma'),
(9, 'cota_cero'),
(9, 'cambio_puertas'),
(9, 'cambio_cabina'),
(9, 'anadir_parada'),
(10, 'arreglo_fachada'),
(10, 'arreglo_cubierta'),
(11, 'sate'),
(11, 'sate_fachada'),
(11, 'cubierta'),
(11, 'aerotermia'),
(11, 'fotovoltaica'),
(12, 'aerotermia'),
(13, 'ascensor'),
(13, 'rampa'),
(13, 'plataforma'),
(13, 'cota_cero'),
(13, 'cambio_puertas'),
(13, 'cambio_cabina'),
(13, 'anadir_parada'),
(14, 'ascensor'),
(15, 'ascensor'),
(15, 'rampa'),
(15, 'plataforma'),
(15, 'cota_cero'),
(15, 'cambio_puertas'),
(15, 'cambio_cabina'),
(15, 'anadir_parada'),
(16, 'sate'),
(16, 'sate_fachada'),
(16, 'cubierta'),
(16, 'aerotermia'),
(16, 'fotovoltaica'),
(17, 'sate'),
(17, 'sate_fachada'),
(17, 'cubierta'),
(17, 'aerotermia'),
(17, 'fotovoltaica'),
(18, 'sate'),
(18, 'sate_fachada'),
(18, 'cubierta'),
(18, 'aerotermia'),
(18, 'fotovoltaica'),
(19, 'sate'),
(19, 'sate_fachada'),
(19, 'cubierta'),
(19, 'aerotermia'),
(19, 'fotovoltaica'),
(21, 'sate'),
(21, 'sate_fachada'),
(21, 'cubierta'),
(21, 'aerotermia'),
(21, 'fotovoltaica'),
(22, 'ascensor'),
(22, 'rampa'),
(22, 'plataforma'),
(22, 'cota_cero'),
(22, 'cambio_puertas'),
(22, 'cambio_cabina'),
(22, 'anadir_parada'),
(23, 'fotovoltaica'),
(24, 'ascensor'),
(25, 'sate'),
(25, 'sate_fachada'),
(25, 'cubierta'),
(25, 'fotovoltaica'),
(26, 'ascensor'),
(26, 'rampa'),
(26, 'plataforma'),
(26, 'cota_cero'),
(26, 'cambio_puertas'),
(26, 'cambio_cabina'),
(26, 'anadir_parada'),
(26, 'arreglo_fachada'),
(26, 'arreglo_cubierta'),
(26, 'sate'),
(26, 'sate_fachada'),
(26, 'cubierta'),
(26, 'aerotermia'),
(26, 'fotovoltaica'),
(27, 'ascensor'),
(27, 'rampa'),
(27, 'plataforma'),
(27, 'cota_cero'),
(27, 'cambio_puertas'),
(27, 'cambio_cabina'),
(27, 'anadir_parada'),
(28, 'arreglo_fachada'),
(28, 'arreglo_cubierta'),
(29, 'sate'),
(29, 'sate_fachada'),
(29, 'cubierta'),
(29, 'aerotermia'),
(29, 'fotovoltaica'),
(30, 'fotovoltaica'),
(30, 'aerotermia'),
(31, 'ascensor'),
(32, 'ascensor'),
(32, 'cota_cero'),
(32, 'rampa'),
(32, 'cambio_puertas'),
(32, 'plataforma');

insert into catalogo_convocatoria_tipos (convocatoria_id, tipo_proyecto_id)
select c.id, t.id from _tipos x
join catalogo_convocatorias c on c.orden = x.orden
join tipos_proyecto t on t.clave = x.clave;

-- FRENO: todas las lineas, y todos sus tipos encontrados (una clave mal escrita
-- se perderia callada).
do $$
declare n int; nt int; esperadas int := 32; tipos_esperados int := 135;
begin
  select count(*) into n from catalogo_convocatorias;
  select count(*) into nt from catalogo_convocatoria_tipos;
  if n <> esperadas or nt <> tipos_esperados then
    raise exception 'Esperaba % lineas y % tipos; salen % y %. Nada escrito.', esperadas, tipos_esperados, n, nt;
  end if;
end $$;

commit;
