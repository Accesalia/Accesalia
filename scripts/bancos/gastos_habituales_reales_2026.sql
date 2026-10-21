-- GASTOS HABITUALES CON LO REAL (Monica, 21-oct-2026: «si, ponemos los reales»).
-- La semilla era su Excel de 2025; ahora, la media de enero a septiembre de 2026 de los extractos del banco
-- (movimientos_bancarios), por empresa. Lo que no se ve en el banco (Mantenimiento FARO, Licencia Scene, Revit,
-- Credito de la casa) se deja como estaba, para preguntarlo. Las comisiones pagadas en mano NO van aqui: la caja la
-- ve Alexandra y eso es solo de direccion.

update gastos_habituales g set importe = v.importe, concepto = v.concepto, origen = 'extracto',
       notas = 'Media ene-sep 2026 del banco (21-oct)' || coalesce('. ' || v.nota, ''), cuenta = coalesce(v.cuenta, g.cuenta)
from (values
  ('accesalia', 'Nóminas', 'Nóminas', 32495.00, 'caixa_accesalia', 'Se paga en 12; el mes es el del concepto, no el del cargo'),
  ('accesalia', 'Seguridad Social', 'Seguridad Social', 14615.00, 'caixa_accesalia', null),
  ('accesalia', 'Alquiler del local', 'Alquiler del local', 872.00, 'caixa_accesalia', 'Con la tasa de gestión del casero'),
  ('accesalia', 'COAM', 'COAM', 1367.00, 'caixa_accesalia', null),
  ('accesalia', 'Dropbox', 'Dropbox', 81.00, 'caixa_accesalia', null),
  ('accesalia', 'Jeep', 'Jeep', 444.00, 'caixa_accesalia', 'Eléctrico de empresa: cuota de Stellantis'),
  ('accesalia', 'Agua', 'Agua', 13.00, 'caixa_accesalia', null),
  ('accesalia', 'Luz', 'Luz del local', 269.00, 'caixa_accesalia', 'Iberdrola y Energía Hogar'),
  ('accesalia', 'GMA (gestoría)', 'GMA (gestoría)', 471.90, 'caixa_accesalia', 'Un recibo al mes; en la cuenta de Daniel no hay ninguno (¿incluye la de Daniel?)'),
  ('accesalia', 'Monday', 'Monday', 56.00, 'caixa_accesalia', null),
  ('accesalia', 'Prosegur', 'Prosegur', 73.00, 'caixa_accesalia', null),
  ('accesalia', 'Restaurantes', 'Restaurantes', 236.00, 'caixa_accesalia', null),
  ('accesalia', 'Seguros de vida', 'Seguros (Generali, Allianz, Zurich)', 346.00, 'caixa_accesalia', 'Recibos sueltos: semestrales y trimestrales'),
  ('accesalia', 'SOFISE', 'Sofise (seguro de Daniel como arquitecto)', 1065.00, 'caixa_accesalia', null),
  ('accesalia', 'Symio', 'Simyo (teléfono)', 103.00, 'caixa_accesalia', null),
  ('accesalia', 'Varios (reserva)', 'Pequeños gastos', 569.00, 'caixa_accesalia', 'Su idea: una partida para los gastos pequeños, recurrentes pero diferentes'),
  ('accesalia', 'Crédito BBVA', 'Préstamo BBVA', 750.61, 'bbva_accesalia', null),
  ('accesalia', 'Línea de crédito La Caixa', 'Línea de crédito La Caixa (intereses)', 65.00, 'caixa_accesalia', 'Se liquida cada trimestre (~195): aquí, la media al mes'),
  ('daniel_autonomo', 'Casa', 'Casa', 10344.00, 'caixa_daniel', 'Lo que sale de la cuenta de Daniel a «Daniel de Soto»'),
  ('daniel_autonomo', 'Mutualidad de Daniel (HNA)', 'Mutualidad de Daniel (HNA)', 497.00, 'caixa_daniel', null)
) as v(empresa, viejo, concepto, importe, cuenta, nota)
where g.empresa = v.empresa and g.concepto = v.viejo;

-- La furgoneta esta pagada
update gastos_habituales set activo = false, hasta = '2026-02-26', origen = 'extracto',
       notas = 'Pagada: el resto (16.300,09) por transferencia a Ford Credit el 26-feb-2026'
where empresa = 'accesalia' and concepto = 'Ford';

-- La nomina de Daniel sale de Accesalia (Monica, 21-oct)
update gastos_habituales set empresa = 'accesalia', concepto = 'Nómina de Daniel', importe = 3500, cuenta = 'caixa_accesalia',
       origen = 'extracto', notas = 'Los 3.500 que salen de Accesalia a Daniel de Soto; algunos meses no la cobra y luego las cobra juntas'
where empresa = 'daniel_autonomo' and concepto = 'Sueldo de Daniel';

-- Lo que salia todos los meses y no estaba
insert into gastos_habituales (empresa, concepto, importe, cada, cuenta, origen, notas) values
  ('accesalia', 'Material de oficina', 899.00, 'mensual', 'caixa_accesalia', 'extracto', 'Media ene-sep 2026 del banco (21-oct). Ratones, teclados, pantallas, cables, cargadores'),
  ('accesalia', 'Software y apps', 966.00, 'mensual', 'caixa_accesalia', 'extracto', 'Media ene-sep 2026 del banco (21-oct). Web, esta app, IA, licencias (sin Monday ni Dropbox)'),
  ('accesalia', 'Tickets restaurante (empleados)', 818.00, 'mensual', 'caixa_accesalia', 'extracto', 'Media ene-sep 2026 del banco (21-oct). Pluxee'),
  ('accesalia', 'Asisa', 159.00, 'mensual', 'caixa_accesalia', 'extracto', 'Media ene-sep 2026 del banco (21-oct)'),
  ('accesalia', 'Servicio de prevención (Quirón)', 117.00, 'mensual', 'caixa_accesalia', 'extracto', 'Media ene-sep 2026 del banco (21-oct)'),
  ('accesalia', 'Combustible', 180.00, 'mensual', 'caixa_accesalia', 'extracto', 'Media ene-sep 2026 del banco (21-oct). Solo lo que se ve en el banco: el resto se paga con otra cuenta y ella pasa los tickets'),
  ('accesalia', 'Gastos bancarios', 99.00, 'mensual', 'caixa_accesalia', 'extracto', 'Media ene-sep 2026 del banco (21-oct). Seviam (gestión de la cuenta) y comisiones de remesas'),
  ('accesalia', 'Préstamo La Caixa', 478.99, 'mensual', 'caixa_accesalia', 'extracto', 'Cuota de PRES.32413889744'),
  ('accesalia', 'Préstamo La Caixa (feb-2026, 13.386)', 311.31, 'mensual', 'caixa_accesalia', 'extracto', 'Cuota de PRES.32641734910; entró el 25-feb-2026'),
  ('daniel_autonomo', 'Préstamo La Caixa (abr-2025, 60.000)', 984.00, 'mensual', 'caixa_daniel', 'extracto', 'Media ene-sep 2026 de PRES.32522960763 y su -P'),
  ('daniel_autonomo', 'Seguros de Daniel', 247.00, 'mensual', 'caixa_daniel', 'extracto', 'Media ene-sep 2026 del banco (21-oct). Generali, MyBox, Caser, prima de autónomo');
