# Decisiones leidas una a una (68, 17-oct). Accion:
#  E [hito]            enlazar a ese hito (mismo importe)
#  A [hito]            enlazar y ajustar el importe del hito al de la factura (manda la factura)
#  S [hito, importe]   subhito de ese hito por lo facturado
#  P [(hito, importe)] repartir: su parte a cada hito
#  R [linea, '50/30/20' | ...] rehacer los hitos de la linea y enlazar al que toque
#  SU                  suelta (sin hoja / la hoja no tiene ese encargo): ligada a su opp
#  ?                   pregunta para Monica
D = {}
def d(n, accion, que, porque, **k): D[n] = dict(accion=accion, que=que, porque=porque, **k)
d(1, '?', 'Manresa 56: 400 € «proyecto» sin %', 'No encaja con ningún hito de HE-2023-0012 (modificado 1.900) ni de PD-2022-0043 (proyecto 2.500). ¿Qué es esta factura?')
d(2, 'P', 'Faisanes 25 · entrega 50 % de 4.000 = 2.000', 'Los 4.000 son proyecto 1.500 + licencia 1.500 + bonificación 1.000 (sin la CSS). Licencia y bonificación tienen un hito único 100 %: se rehacen en 50/30/20 (norma FAIN, como ya está PD-2024-0028). Entrega: 750 + 750 + 500', hitos=[('a7b078', 750), ('R:83c51d', 750), ('R:81455b', 500)])
d(3, 'S', 'Reconquista 6 G · anteproyecto 30 % de 4.000 = 1.200', 'FAIN partió la entrega (50 %) en anteproyecto 30 % + paso a proyecto 20 % (la #4). Subhito de cada «entrega»: 450 + 450 + 300', hitos=[('840834', 450), ('34aab6', 450), ('9cb0a2', 300)])
d(4, 'S', 'Reconquista 6 G · paso a proyecto 20 % de 4.000 = 800', 'La otra parte de la entrega: 300 + 300 + 200', hitos=[('840834', 300), ('34aab6', 300), ('9cb0a2', 200)])
d(5, 'S', 'Dos de Mayo 71 · anteproyecto 30 % de 4.000 = 1.200', 'Igual que Reconquista: entrega partida 30 + 20. Subhitos: proyecto 450, licencia 450, bonificación 300', hitos=[('a094be', 450), ('2b2dc5', 450), ('80bfe0', 300)])
d(10, 'S', 'Dos de Mayo 71 · proyecto visado 20 % de 4.000 = 800', 'La otra parte de la entrega: 300 + 300 + 200', hitos=[('a094be', 300), ('2b2dc5', 300), ('80bfe0', 200)])
d(6, 'A', 'Lepanto 9 · licencia 30 % de 1.500 (factura de 500)', 'Hito «licencia» de HE-2022-0047 (450). La factura es de 500: se ajusta el hito a 500 (manda la factura)', hitos=[('e15e04', 500)])
d(7, '?', 'Santo Domingo de Guzmán 5 · 415,90 € «honorarios del proyecto incluyendo dirección…»', 'No encaja con ningún hito (entrega 1.750 ya facturada con la 148-2024; licencia 1.050; CFO 700). Necesito leer la factura entera.')
d(8, 'P', 'Faisanes 25 · licencia 30 % de 4.000 = 1.200', 'Proyecto 450 + licencia 450 + bonificación 300 (tras rehacer en 50/30/20 como la #2)', hitos=[('b35c60', 450), ('R:83c51d', 450), ('R:81455b', 300)])
d(11, 'S', 'Faisanes 15 · entrega de proyecto 20 % de 4.000 = 800', 'Entrega partida 30 + 20 (falta encontrar la del 30 %). Licencia y bonificación se rehacen en 50/30/20. Subhitos de entrega: 300 + 300 + 200', hitos=[('32b611', 300), ('R:27e5f0', 300), ('R:4f4b82', 200)])
d(12, 'P', 'Faisanes 15 · licencia 30 % de 4.000 = 1.200', 'Proyecto 450 + licencia 450 + bonificación 300', hitos=[('efb5f8', 450), ('R:27e5f0', 450), ('R:4f4b82', 300)])
d(9, 'SU', 'Santa Tecla 46 · 605 € gestión documental de licencia', 'Servicio aparte que no está en la hoja PD-2022-0034 (su licencia ya está facturada con 205-2022 y 63-2025). Suelta, con su opp')
d(13, 'SU', 'Corral de Cantos 19 · CFO 20 % de 2.500 del ASCENSOR', 'Las hojas de Corral de Cantos son SATE y subvenciones: el proyecto de ascensor de FAIN no tiene hoja en la app')
d(76, 'SU', 'Corral de Cantos 19 · resto CSS 20 % de 600', 'Igual: la CSS del ascensor no tiene hoja')
for n, ed in ((14, 'Etruria 26'), (15, 'Etruria 28'), (16, 'Lucano 65')):
    d(n, '?', ed + ' · CFO 20 % de 2.500 = 500', 'PD-2024-0005 tiene «CFO visado ' + ed + '» por 620 € (firmada el mismo día que la factura). ¿Los 120 € de más son el visado? Propongo subhito de 500 y que queden 120 pendientes')
for n, ed in ((78, 'Etruria 26'), (79, 'Etruria 28'), (80, 'Lucano 65')):
    d(n, 'SU', ed + ' · resto CSS 20 % de 600', 'Ninguna hoja de Etruria/Lucano lleva CSS: suelta, con su opp')
d(67, 'E', 'Rafaela Ybarra 33 · encargo 25 % de 5.000', 'Hito «encargo» de HE-2024-0108 (1.250)', hitos=[('2f403a', 1250)])
d(73, 'E', 'Rafaela Ybarra 33 · entrega 50 % de 5.000', 'Hito «entrega» de HE-2024-0108 (2.500)', hitos=[('bb97ba', 2500)])
d(68, 'E', 'Domingo Párraga 62 · encargo 25 % de 5.000', 'Hito «encargo» de HE-2024-0107', hitos=[('9b0f8e', 1250)])
d(75, 'E', 'Domingo Párraga 62 · entrega 50 % de 5.000', 'Hito «entrega» de HE-2024-0107', hitos=[('5adef0', 2500)])
d(69, 'E', 'Quintana 9 · encargo 25 % de 3.000', 'Hito «encargo» de HE-2024-0111', hitos=[('19b329', 750)])
d(77, 'E', 'Quintana 9 · entrega 50 % de 3.000', 'Hito «entrega» de HE-2024-0111', hitos=[('6e16ad', 1500)])
d(70, 'E', 'Marquesa de Silvela 11 · encargo 25 % de 5.000', 'Hito «encargo» de HE-2024-0115', hitos=[('b00e2d', 1250)])
d(74, 'E', 'Marquesa de Silvela 11 · entrega 50 % de 5.000', 'Hito «entrega» de HE-2024-0115', hitos=[('358714', 2500)])
for n in (71, 72):
    d(n, 'SU', 'Virgen del Camino 4 · ' + ('CFO 20 % de 3.500' if n == 71 else 'resto CSS 20 % de 600'), 'Su única hoja (HE-2022-0096) es la subvención: el proyecto de ascensor de FAIN no tiene hoja en la app')
# sin hoja: Envoltermia Vinagrande / Los Castillos (hoja de pedido 15/01/2024 que no esta en la app)
for n in (20, 21, 22, 23, 24, 27, 28, 29, 30):
    d(n, 'SU', 'Envoltermia · anticipo 15 % al encargo (hoja de pedido de 15/01/2024)', 'La factura cita una hoja de pedido de 15-ene-2024 que NO está en la app. Suelta; si tienes ese pedido, se podría subir')
d(46, 'SU', 'Schindler · Latón 1 (Tetrapak) informe estructural', 'Cita una hoja de encargo de 2-jul-2024 que no está en la app. Suelta')
d(81, 'E', 'Arcos de Jalón 68 · encargo 25 % de 3.000', 'Hito «encargo» de HE-2024-0160', hitos=[('ed670b', 750)])
d(84, 'E', 'Arcos de Jalón 68 · entrega 50 % de 3.000', 'Hito «entrega» de HE-2024-0160', hitos=[('77f201', 1500)])
d(82, 'E', 'Godella 237 · encargo 25 % de 3.000', 'Hito «encargo» de HE-2024-0170', hitos=[('5170b0', 750)])
d(83, 'E', 'Encarnación del Pino 2 · encargo 25 % de 5.000', 'Hito «encargo» de HE-2024-0176', hitos=[('5441dd', 1250)])
d(85, 'E', 'Encarnación del Pino 2 · «al encargo (50 % de 5.000)» = 2.500', 'El texto dice «encargo» pero es el 50 %: es la ENTREGA (el encargo de 25 % es la factura anterior, 1-273)', hitos=[('a01f48', 2500)])
d(86, 'SU', 'Llanos de Escudero 37 · Elecnor, CFO 40 % de 7.500', 'Su única hoja es la de subvención: el proyecto de ascensor de Elecnor no tiene hoja en la app')
d(87, '?', 'Iliada 39 · Elecnor, CSS 800 € (feb-2024)', 'Hay una hoja PD-2024-0029 de Iliada 39 SIN líneas (firmada sep-2024, después de la factura). ¿Es esta CSS? Si sí, hay que crearle su línea')
d(88, '?', 'Manresa 56 · «resto de dirección de obra y CSS» 1.100 €', 'Hay una hoja PD-2023-0023 de Manresa 56 SIN líneas (¿la de dirección de obra?) y la CSS de PD-2022-0043 está sin facturar (480 + 120). ¿Cómo se reparte el 1.100?')
for n in (89, 90): d(n, 'SU', 'San Nicolás 7 · ' + ('CSS 20 % de 600' if n == 89 else 'CFO 20 % de 2.500'), 'Su única hoja es la de subvención: el ascensor de FAIN no tiene hoja')
d(91, 'SU', 'Encomienda de Palacios 318 · Rosersese, CSS', 'Su única hoja es la de subvención')
d(92, 'SU', 'Navas de Tolosa 7 · Rosersese, CSS', 'Su hoja (NR-2026-0005) es solo el proyecto, sin CSS')
d(93, 'SU', 'Alfonso XII 18 · Rosersese, CSS', 'Su hoja (HE-2025-0160) es otra cosa (rampa, 2025)')
for n in (94, 95): d(n, 'SU', 'Río Duero 32 · ' + ('CFO 20 % de 2.700' if n == 94 else 'CSS 20 % de 600'), 'Su única hoja (HE-2025-0663) no está firmada: no hay hoja del ascensor')
d(96, 'SU', 'Río Tormes 2 · Rosersese, CSS', 'Su hoja (NR-2026-0006) es solo el proyecto, sin CSS')
d(97, 'SU', 'Plaza Valsaín 3-4 · Rosersese, CSS', 'Su única hoja es la de subvención')
d(98, 'P', 'Españoleto 5 · 100 % del proyecto de plataforma (1.500)', 'Cubre los tres hitos de HE-2023-0014: entrega 750 + licencia 450 + CFO 300', hitos=[('ad87f8', 750), ('336c95', 450), ('2dc062', 300)])
d(99, 'A', 'Pablo Casals 26 · licencia 30 % = 1.200', 'Hito «licencia» de PD-2023-0010 (900 = 30 % de 3.000). La factura cobra 1.200 (30 % de 4.000): se ajusta el hito a 1.200 (manda la factura)', hitos=[('b58753', 1200)])
for n, p in ((100, 'Portal 1'), (101, 'Portal 4')):
    d(n, '?', 'Iglesia 16 ' + p + ' · CSS 100 % (600 €, ago-2023)', 'Su CSS (HE-2023-' + ('0127' if n == 100 else '0128') + ') ya está facturada entera con dos facturas de 2024 (80 % + 20 %). ¿Esta de 2023 se anuló o es otra CSS?')
d(102, 'P', 'Belgrado 2 · CSS 100 % de 600', 'Cubre los dos hitos de la CSS de PD-2022-0005: 480 + 120', hitos=[('cce9fb', 480), ('c9d350', 120)])
d(103, 'E', 'Badalona 48 · complementaria de 200 € a la 119-2022', 'Es el subhito de 200 € que quedaba pendiente en la entrega de PD-2023-0003', hitos=[('49122d', 200)])
d(104, '?', 'General Ricardos 92 · Elecnor, subvenciones 1.500 € (ene-2023)', 'Su hoja de subvención de 2022 ya está facturada (presentación y concesión). ¿Es una renovación sin hoja?')
d(105, 'SU', 'San Roque 18 · Envoltermia, gestión de licencia 2.200 €', 'La hoja de 2023 (HE-2023-0024) no tiene licencia; la de 2025 (CT-2025-0001) es posterior. Suelta, con su opp')
d(106, 'A', 'San Roque 18 · Envoltermia, entrega de proyecto visado 8.800 €', 'Hito «entrega» de HE-2023-0024 (6.500). Se ajusta a 8.800 y la «concesión» baja de 10.100 a 7.800 (la línea sigue en 16.600) — manda la factura', hitos=[('d556a0', 8800)])
d(107, 'S', 'Faisanes 15 · anteproyecto 30 % de 4.000 = 1.200', 'La otra parte de la entrega (con la #11, 20 %). Subhitos: proyecto 450, licencia 450, bonificación 300', hitos=[('32b611', 450), ('R:27e5f0', 450), ('R:4f4b82', 300)])
d(108, 'A', 'Luis Vives 11 · CSS 80 % = 480', 'La línea CSS de HE-2022-0085 dice 6.000 € (seguro que es 600: el 80 % facturado es 480). Corregir la línea a 600 y enlazar al hito «pss» (480)', hitos=[('f0cd3e', 480)])
d(109, 'A', 'San Clemente 2 · licencia 30 % = 1.050', 'Hito «licencia» de PD-2022-0042 (810 = 30 % de 2.700). La factura cobra 1.050 (30 % de 3.500): se ajusta (manda la factura)', hitos=[('00836c', 1050)])
d(110, 'P', 'Manresa 56 · modificado de proyecto 1.900 (100 %)', 'Cubre los tres hitos de HE-2023-0012: 950 + 570 + 380', hitos=[('5d6aae', 950), ('c84c04', 570), ('7ae231', 380)])
d(31, 'E', 'Juan Sebastián Elcano 4 · licencia 30 % de 3.500', 'Hito «licencia» de PD-2023-0008 (estaba bajo la opp de Alcalá; el casado no la vio)', hitos=[('37e94a', 1050)])
d(125, 'E', 'Juan Sebastián Elcano 4 · entrega 50 % de 3.500', 'Hito «entrega» de PD-2023-0008', hitos=[('391204', 1750)])
for n in (32, 33): d(n, 'SU', 'Dr. Martín Vegué 22 · ' + ('CSS 20 % de 600' if n == 32 else 'CFO 20 % de 2.500'), 'Su única hoja (HE-2022-0098) es la de subvención: el ascensor de FAIN no tiene hoja')
d(121, 'A', 'Cadalso de los Vidrios 2 · licencia (conformidad con DR) 1.230 €', 'Hito «licencia» de PD-2022-0007 (1.050). La factura cobra 1.230: se ajusta (manda la factura)', hitos=[('1ec4f6', 1230)])
d(134, 'E', 'Cadalso de los Vidrios 2 · CSS 80 % de 600', 'Hito «pss» de la CSS de PD-2022-0007', hitos=[('3a560a', 480)])
d(129, 'E', 'Zamora 1-3-5 · Iberdrola, entrega de proyecto 16.966,79', 'Hito «entrega» de CT-2023-0001 (mismo importe)', hitos=[('888232', 16966.79)])
d(130, 'E', 'Zamora 1-3-5 · Iberdrola, análisis y estudios previos 9.840', 'Hito «firma» de la gestión de ayudas de CT-2023-0001 (mismo importe)', hitos=[('8722e4', 9840)])
d(127, 'E', 'Zamora 1-3-5 · Iberdrola, elaboración de documentación 810', 'Uno de los dos hitos de 810 de la gestión de ayudas (el «otro»)', hitos=[('89fa8e', 810)])
d(128, 'E', 'Zamora 1-3-5 · Iberdrola, solicitud pre-concesión 810', 'El otro hito de 810: «presentación» (la solicitud)', hitos=[('d60ae3', 810)])
d(131, 'E', 'Santa María la Blanca 3 · licencia 30 % de 3.500', 'Hito «licencia» de PD-2022-0032. Ojo: las dos hojas (0032 y 0033) dicen «3 y 5»; asigno 0032 al 3 y 0033 al 5', hitos=[('d5ca32', 1050)])
d(132, 'E', 'Santa María la Blanca 5 · licencia 30 % de 3.500', 'Hito «licencia» de PD-2022-0033', hitos=[('7257f7', 1050)])
d(142, 'E', "O'Donnell 47 · entrega 50 % de 2.500 (plataforma)", 'Hito «entrega» de HE-2023-0089', hitos=[('f8e470', 1250)])
d(111, 'SU', 'Madrid 2 (Colmenar Viejo) · 75 % de proyecto y CSS', 'La hoja que proponía el casado es de Piedrahita 2: no tiene nada que ver. Calle Madrid 2 no tiene hoja')
for n, q in ((112, 'CSS 80 % de 800 = 640'), (118, 'licencia 30 % = 900'), (120, 'resto de subvención 20 % = 300')):
    d(n, '?', 'Galicia 8 (Pinto) · ' + q, 'Los hitos de HE-2022-0013 están revueltos (otro 1.500/200/1.300/2.800; CSS 560/240) y ya hay facturas de 2025 colgadas. Propongo rehacer sus hitos con la norma FAIN y recolgar todas sus facturas, pero prefiero que lo veas')
for n in (113, 114): d(n, 'SU', 'Alfonso XII 18 · Rosersese, ' + ('entrega 2/3' if n == 113 else 'encargo 1/3') + ' del ascensor', 'Su hoja (HE-2025-0160) es una rampa de 2025: el ascensor de 2023 no tiene hoja')
for n in (115, 116): d(n, '?', 'Santa Teresa 8 · «restantes (100 de 600)» de CSS', 'Hay DOS facturas iguales de 100 € el mismo día (93 y 94 de Daniel) y el hito pendiente es de 120. ¿Una está repetida?')
d(117, 'S', 'Vargas Machuca 1 · licencia 30 % de 2.500 = 750', 'PD-2023-0020 solo tiene una línea «resto» de 1.850 con hito único: subhito de 750 por la licencia', hitos=[('79061b', 750)])
d(119, 'R', 'Sandalio López 19 · Elecnor, fachada lateral 1.500 (100 %)', 'La línea de HE-2023-0008 no tiene hitos: se le crea uno único de 1.500 (pago único) y se enlaza', hitos=[('R:b56def', 1500)])
for n, q in ((122, 'Mallorca 12 · CFO + resto CSS'), (123, 'Pablo Neruda 54 · Elecnor, 30 % restante de proyecto'), (124, 'San Telesforo 17 · Elecnor, CFO 40 %'),
             (126, 'Maldonado 75 · Elecnor, CFO 40 %'), (133, 'Marqués de Corbera 36B · Elecnor, licencia 20 %'), (135, 'La Salle 12 · Elecnor, certificado Hospital Vithas'),
             (136, 'Maestro Turina 6 · entrega 20 %'), (145, 'Maestro Turina 6 · proyecto visado 30 %'), (137, 'Betanzos 60 · Iberdrola, consultoría previa'),
             (138, 'Betanzos 60 · Iberdrola, Libro del Edificio'), (139, 'Dr. Martín Vegué 33-35-37 · Urvall, licencia + CFO'), (140, 'Perales 11 · CFO restante'),
             (141, 'Perales 11 · CSS 20 %'), (143, 'Siete Ojos 4 · licencia 30 %'), (144, 'Pablo Neruda 54 · Elecnor, CSS'), (146, 'Badajoz 20 · licencia 30 %'),
             (147, 'Badajoz 20 · CSS 80 %'), (148, 'Río Duero 1 · licencia 30 %'), (149, 'Libertad 3 · deflexiones adicionales'), (150, 'Río Duero 1 · CSS 80 %')):
    d(n, 'SU', q, 'No hay hoja de ese encargo en la app (la opp, si existe, no tiene hojas). Suelta, con su opp')
_su = {151: 'Maestro Turina 12 · Rosersese, entrega 2/3', 157: 'Maestro Turina 12 · Rosersese, licencia 3/3', 159: 'Maestro Turina 12 · Rosersese, encargo 1/3',
       162: 'Maestro Turina 12 · Rosersese, CSS', 152: 'San Dacio 2 · TKE, 60 % proyecto y licencia', 153: 'San Dacio 2 · TKE, licencia 20 %',
       154: 'Av. España 35-1 · TKE, CFO', 155: 'Santa Brígida 1-2 · TKE, CFO', 156: 'Santa Brígida 1-5 · TKE, CFO', 158: 'N.ª S.ª de Valvanera 112 · TKE, CFO',
       160: 'San Claudio 36 · Rosersese, CSS', 161: 'Gregorio Donás 8 · Rosersese, CSS', 163: 'Marina Lavandeira 2 · TKE, licencia', 164: 'San Venancio 1 · Schindler, memoria valorada',
       165: 'Guillén de Castro 13 · Rosersese, CSS', 166: 'Las Norias 24 · TKE, licencia', 167: 'Av. España 35-4 · TKE, licencia', 168: 'Norias 20 · TKE, CFO',
       169: 'Norias 22 · TKE, CFO', 170: 'Av. España 35-4 · TKE, CFO', 171: 'Av. España 35-7 · TKE, CFO', 172: 'Av. España 35-8 · TKE, CFO',
       173: 'Alfonso XII 10 · Rosersese, modificación de rampa', 174: 'Buena Madre 9 · CFO', 175: 'Fray Juan Gil 3 · CSS 20 %', 176: 'Fray Juan Gil 3 · CFO',
       177: 'Quilichao 6 · CSS 20 %', 178: 'Quilichao 6 · CFO', 179: 'Av. Fuenlabrada 92 · CSS 20 %', 180: 'Av. Fuenlabrada 92 · CFO'}
for n, q in _su.items(): d(n, 'SU', q, 'No hay hoja de ese encargo en la app (la opp, si existe, no tiene hojas). Suelta, con su opp')
_su2 = {181: ('Francia 50 · CSS 80 %', 'HE-2022-0048 tiene proyecto y subvenciones pero no CSS (y sus líneas no tienen hitos)'),
        182: ('Oviedo 9 · bajada a cota 0, 1.500', 'Su única hoja es la de subvención'),
        183: ('Buenos Aires 15 · resto de subvenciones 20 %', 'PD-2022-0012 tiene proyecto y CSS, ya facturados; la subvención no está en ninguna hoja'),
        184: ('Corral de Cantos 19 · CSS 80 %', 'Las hojas de Corral de Cantos son SATE y subvenciones'),
        185: ('Virgen del Camino 4 · CSS 80 %', 'Su única hoja es la de subvención'),
        186: ('General Ricardos 92 · Elecnor, CSS', 'Sus hojas son proyecto (sin CSS) y subvenciones'),
        187: ('Polvoranca 23 · CSS 80 %', 'Su única hoja es la de subvención'),
        188: ('San Roque 18 · Envoltermia, subvenciones (documentación) 375', 'La hoja de 2023 no tiene subvenciones; la gestión de ayudas está en CT-2025-0001, posterior'),
        189: ('San Roque 18 · Envoltermia, subvenciones (pre-concesión) 375', 'Igual que la anterior'),
        190: ('Etruria 26 · CSS 80 %', 'Ninguna hoja de Etruria/Lucano lleva CSS'),
        191: ('Etruria 28 · CSS 80 %', 'Ninguna hoja de Etruria/Lucano lleva CSS'),
        192: ('Lucano 65 · CSS 80 %', 'Ninguna hoja de Etruria/Lucano lleva CSS'),
        193: ('Fuenlabrada 15 · TKE, licencia 20 %', 'Sus hojas son subvención y CSS: el proyecto de TKE no tiene hoja'),
        194: ('Santurce 1 · Rosersese, encargo 1/3', 'Su hoja (NR-2026-0003) es solo la CSS'),
        195: ('Río Llobregat 10 · Rosersese, CSS', 'Su hoja (NR-2026-0004) es solo el proyecto, sin CSS')}
for n, (q, p) in _su2.items(): d(n, 'SU', q, p + '. Suelta, con su opp')
for n, q in ((196, 'entrega 2/3'), (197, 'licencia 3/3')): d(n, 'SU', 'Santurce 1 · Rosersese, ' + q, 'Su hoja (NR-2026-0003) es solo la CSS: el proyecto no tiene hoja. Suelta, con su opp')
d(198, 'SU', 'Santa Teresa 8 · CFO 20 % de 2.500', 'Su hoja (PD-2023-0015) es solo la CSS. Suelta, con su opp')
d(199, 'A', 'San Clemente 2 · 50 % (anteproyecto + proyecto) = 1.750', 'Hito «entrega» de PD-2022-0042 (1.350 = 50 % de 2.700). Sus facturas son del 50 % y 30 % de 3.500 (1.750 y 1.050, la #109): la línea es de 3.500, no de 2.700. Ajustar línea e hitos', hitos=[('5c2fa9', 1750)])
d(200, 'P', 'Móstoles 3 Portal 2 · CSS 500 (100 %)', 'Cubre los dos hitos de la CSS de PD-2022-0044: 400 + 100', hitos=[('570159', 400), ('7d7415', 100)])
d(201, '?', 'Santa Teresa 8 · CSS 500 € (may-2022)', 'Con las dos de 100 € de dic-2023 (#115 y #116) son 700 para una CSS de 600. Si una de 100 está repetida: rehago la CSS en 500 + 100 y enlazo')
d(202, '?', 'Galicia 8 (Pinto) · subvención 80 % = 1.200', 'Va con las otras de Galicia 8: los hitos de HE-2022-0013 hay que rehacerlos')
for n, q in ((203, 'Corral de Cantos 19 · DR 30 %'), (204, 'Lucano 65 · licencia 30 %'), (205, 'Etruria 28 · licencia 30 %'), (206, 'Etruria 26 · licencia 30 %')):
    d(n, 'SU', q + ' del ascensor', 'Su hoja es de envolvente (SATE), no del ascensor de FAIN. Suelta, con su opp')
d(207, 'R', 'Natalio Tortuero 6 · Elecnor, subvenciones 1.500 (100 %)', 'La línea de HE-2022-0090 no tiene hitos: se le crea uno único de 1.500 y se enlaza', hitos=[('R:c60961', 1500)])
d(210, '?', 'Manresa 56 · dirección de obra 70 % = 2.000 (sep-2022)', 'Va con la #88 («resto de dirección de obra y CSS», 1.100): la hoja PD-2023-0023 de Manresa 56 no tiene líneas. ¿Es la de dirección de obra? Si sí, le creo su línea')
d(214, 'SU', 'San Nicolás 19 · consulta previa de viabilidad 800 (2022)', 'Ya está descontada en la hoja de 2025 (HE-2025-0154 tiene la línea «YA ABONADO COMO CONSULTA URBANÍSTICA PREVIA» −800). Suelta, con su opp')
d(228, 'E', 'Virgen del Val 47 · Schindler, memoria valorada 325', 'Hito único de PD-2022-0040 (325)', hitos=[('84aab4', 325)])
d(229, 'E', 'Virgen del Val 47 · Schindler, memoria valorada (resto) 125', 'Hito único de PD-2022-0039 (125)', hitos=[('d26b71', 125)])
_su3 = {208: 'Virgen del Camino 4 · licencia 30 %', 209: 'Valdevarnes 16 · CSS 80 %', 212: 'Valdevarnes 16 · CFO', 213: 'Valdevarnes 16 · resto CSS',
        211: 'Buenos Aires 15 · subvenciones 80 %', 215: 'Virgen del Camino 4 · entrega 50 %', 216: 'Río Duero 32 · CSS 80 %', 217: 'La Vega 6 · CSS 80 %',
        218: 'La Vega 6 · 30 % del proyecto', 219: 'Valsaín 3 y 4 · Rosersese, proyecto 3.000', 220: 'San Nicolás 7 · entrega 30 %', 221: 'Polvoranca 39 · CFO',
        222: 'Parvillas Altas 12 · CFO + resto CSS', 223: 'Santa Teresa 8 · licencia 30 %', 224: 'La Vega 6 · CSS 20 %', 225: 'La Vega 6 · CFO 20 %',
        226: 'Canillejas a Vicálvaro 63 · Schindler, proyecto 4.500', 227: 'San Nicolás 7 · CSS 80 %', 230: 'Nueva 2 (Boadilla) · Schindler, proyecto 4.500',
        231: 'Esteban Collantes 26 · Schindler, proyecto 4.500', 232: 'Río Duero 32 · licencia 30 %', 233: 'Río Duero 32 · subvención',
        234: 'Canillejas a Vicálvaro 63 · Schindler, subvenciones 1.800', 235: 'Juan Carlos I 10 (Ajalvir) · Schindler, proyecto 2 ascensores'}
for n, q in _su3.items(): d(n, 'SU', q, 'Su hoja en la app es de otro encargo (subvención, CSS u otra obra) o no está firmada: este encargo no tiene hoja. Suelta, con su opp')
_su4 = {17: 'Rafael Calvo 5 · modernización de ascensores (2021)', 18: 'Río Duero 1 · resto CSS', 19: 'Río Duero 1 · CFO 20 %', 25: 'Badajoz 20 · CFO 20 %',
        26: 'Badajoz 20 · resto CSS', 34: 'Luis Ruiz 88 · Elecnor, CFO 40 %', 35: 'Siete Ojos 4 · CFO bajada a sótano', 36: 'Doctor Mendiguchía Carriche 27 · restos de proyecto y CSS',
        37: 'Clavijo 3 · CFO 20 %', 38: 'Niza 2 · CFO plataforma 40 %', 39: 'Pedro Rubín de Celis 28 · CFO', 40: 'Pedro Rubín de Celis 28 · CSS 20 %',
        41: 'Maestro Turina 6 · CSS 80 %', 42: 'Libertad 3 · CSS 20 %', 43: 'Libertad 3 · CFO', 44: 'Belgrado 3 · CFO 20 %', 45: 'Belgrado 3 · CSS 20 %',
        47: 'Algaba 5 · TKE, CFO 20 %', 48: 'Río Genil 4 · Rosersese, CSS', 49: 'Presidente Carmona 3 · Iberlean, fin de obra', 50: 'Gobernador 8 · CFO 20 %',
        51: 'Gobernador 8 · CSS 20 %', 52: 'José Ortega y Gasset 94 · TKE, CFO 20 %', 53: 'Aeronave 33 · CFO 20 %', 54: 'Emilio Ferrari 101 · CSS 20 %',
        55: 'Emilio Ferrari 101 · CFO 20 %', 56: 'Castellón 17 · CFO 20 %', 57: 'Cuesta de las Perdices 33 · CFO restante', 58: 'Cuesta de las Perdices 37 · CFO restante',
        59: 'Lago Tiberíades 8 · CSS 20 %', 60: 'Lago Tiberíades 8 · CFO 20 %', 61: 'Braulio Gutiérrez 7 · Rosersese, proyecto 3.000', 62: 'Río Genil 4 · Rosersese, licencia 2/3',
        63: 'Ofelia Nieto 16 · CFO 20 %', 64: 'Ofelia Nieto 16 · CSS 20 %', 65: 'Galicia 2 · CSS 20 %', 66: 'Galicia 2 · CFO + CSS 80 %'}
for n, q in _su4.items(): d(n, 'SU', q, 'No hay hoja de ese encargo en la app (la opp no tiene hojas). Suelta, con su opp')
# correcciones con lo que marco e3 el 18-oct (facturas rectificadas con abono)
d(88, 'NO', 'Manresa 56 · «resto de dirección de obra y CSS» 1.100 € (99-2024)', 'ANULADA con la rectificativa 2-2024 («por acuerdo con el cliente»). No se enlaza')
d(207, 'NO', 'Natalio Tortuero 6 · Elecnor, subvenciones 1.500 (222-2022)', 'ANULADA (abono) y reemitida desde Daniel a Israel Fernández (daniel 2023/1-7): esa es la que va a la línea de HE-2022-0090')
d(236, 'R', 'Fátima 8 · memoria valorada 400', 'La línea de HE-2022-0062 (400) no tiene hitos: hito único de 400 y se enlaza', hitos=[('R:nuevo', 400)])
d(237, 'R', 'Fuentebella 8 · memoria valorada 400', 'La línea de HE-2022-0063 (400) no tiene hitos: hito único de 400 y se enlaza', hitos=[('R:nuevo', 400)])
d(238, 'R', 'Málaga 22 · memoria valorada 400', 'La línea de HE-2022-0052 (400) no tiene hitos: hito único de 400 y se enlaza', hitos=[('R:nuevo', 400)])
d(239, 'R', 'Málaga 28 · memoria valorada 400', 'La línea de HE-2022-0053 (400) no tiene hitos: hito único de 400 y se enlaza', hitos=[('R:nuevo', 400)])
d(240, 'R', 'Natalio Tortuero 6 · subvenciones 1.500', 'La línea de HE-2022-0090 (1.500) no tiene hitos: hito único y se enlaza. Es la reemisión de la 222-2022 de Elecnor, que se anuló', hitos=[('R:nuevo', 1500)])
d(241, 'SU', 'Ceferino Rodríguez 17 · Anylor, CFO 35 %', 'Su única hoja (HE-2022-0116) es un informe visado de 950, ya cobrado: el ascensor de Anylor no tiene hoja')
d(242, 'SU', 'Paseo Olimpo 16 · DF 40 % de 6.500', 'HE-2024-0096 no tiene dirección facultativa. La CSS de esa obra (250-2024) cita «hoja de encargo de 30-nov-2024», que no está en la app: puede que la DF vaya en esa hoja. Si la tienes, se sube y se enlaza')
d(243, 'SU', 'Alejandro Dumas 17 · Anylor, 35 % proyecto', 'No hay hoja de esta dirección')
d(244, 'SU', 'Florencio García 11 · Anylor, CFO 20 %', 'No hay hoja de esta dirección')
d(245, 'SU', 'Francisco Medina 5 · Anylor, CFO', 'No hay hoja de esta dirección')
d(246, 'SU', 'Francisco Medina 5 · Anylor, CSS', 'No hay hoja de esta dirección')
d(247, 'SU', 'Colegio Alhambra · Anylor, 35 % proyecto', 'No hay hoja de esta dirección')
d(248, 'SU', 'Entre Arroyos 56 · NVR, proyectos', 'No hay hoja de esta dirección')
d(249, 'SU', 'Monteperdido 10 · Inima, dirección de obra', 'No hay hoja de esta dirección')
d(242, 'SU', 'Paseo Olimpo 16 · DF 40 % de 6.500', 'Ni HE-2024-0096 (proyecto) ni HE-2024-0190 (la CSS, ya casada con la 250-2024) llevan dirección facultativa: no hay hoja de la DF. Suelta, con su opp')
# respuestas de Monica (18-oct)
d(1, 'SU', 'Manresa 56 · 400 € «proyecto» (103-2024)', 'Lleva un tercer pedido de FAIN (323496) que no está en la app. Suelta, con su opp')
d(210, 'P', 'Manresa 56 · «dirección de obra 70 %» 2.000 (148-2022)', 'Lleva el pedido del proyecto (262143) y 2.000 = entrega 1.250 + licencia 750 de PD-2022-0043. El concepto está mal escrito (Mónica: «pésimamente descrito»)', hitos=[('fcb635', 1250), ('a37ba1', 750)])
d(115, 'A', 'Santa Teresa 8 · resto de CSS 100 (93-2023)', 'CSS del encargo antiguo (PD-2023-0015, mismo pedido FAIN 95002465): se facturó 500 + 100. El «cfo» pasa de 120 a 100', hitos=[('c64e35', 100)])
d(201, 'A', 'Santa Teresa 8 · CSS 500 (45-2022)', 'CSS de PD-2023-0015: el «pss» pasa de 480 a 500 (se facturó 500 + 100)', hitos=[('b86fc4', 500)])
d(116, 'NO', 'Santa Teresa 8 · resto de CSS 100 (94-2023)', 'Repetida: Mónica dice que se anuló (en Factusol sigue como cobrada)')
for n in (112, 118, 120, 202): D[n]['accion'] = 'G'   # Galicia 8: se rehace entera (ver aplicar)
d(241, 'SU', 'Ceferino Rodríguez 17 · Anylor, 35 % restante (daniel 2023/1-86)', 'Resuelto por e3 con Mónica: dice «ascensor» pero es el proyecto de SATE (concepto mal, con nota); va a la opp DAN-2021-094. La hoja del SATE no está en la app: suelta')
# 18-oct, de e3: opps apuntadas (sin casar). PENDIENTE de revisar en la tanda siguiente:
#  - Calle Madrid 2 Colmenar Viejo (#111, acc 2023/1-78): su opp DAN-2023-119 «C. MADRID» SI tiene hoja, HE-2023-0011 -> mirar si enlaza
#  - FAIN pedido 95002426 (Emigdio de la Riva 29, Salamanca) -> opp DAN-2023-317 creada por e3 (acc 2023/1-164, deflexiones 300)
#  - TKE Majadahonda: opps DAN-2017-156/157/158/159/166/167 y DAN-2016-145 -> buscar sus pedidos (TKE manda pedido con nº)
# 18-oct, de e3: sueltas de 2022 con opp (sin casar). Opps NUEVAS: DAN-2021-139 Berardo Martin 12 (FAIN 95002546),
#  DAN-2021-140 Francisco Medina 5, DAN-2021-142 Alejandro Dumas 17, DAN-2022-302 Cisneros 24, DAN-2022-304 Ampostas 34
#  (FAIN 45002633), DAN-2022-305 Entre Arroyos 56 (NVR: hay papel firmado en la carpeta), DAN-2022-306 Monteperdido 10.
#  Rio Duero 1 (FAIN 95002840) -> DAN-2022-036; Cadalso 2 -> DAN-2025-441 (PD-2022-0007).
