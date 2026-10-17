-- PAGAR › IMPUESTOS, una tarjeta por impuesto (Monica, 17-oct-2026): cada una
-- dice QUE ES en cristiano, «Sociedades: es una prevision sobre el total del
-- ano, se paga por adelantado...», «IVA: lo que cobras en tus facturas lo
-- recaudas para Hacienda...». El texto vive aqui (se corrige sin tocar codigo).
alter table obligaciones_fiscales add column explicacion text;
comment on column obligaciones_fiscales.explicacion is 'Que es este impuesto, en lenguaje de persona: sale en su tarjeta de Pagar › Impuestos.';

update obligaciones_fiscales set explicacion = case modelo
  when '303' then 'IVA. Se paga cada trimestre. El IVA que cobras en tus facturas no es tuyo: lo recaudas para Hacienda. Al de lo recaudado se le resta el IVA que tú has pagado en tus gastos, y la diferencia es lo que se paga el trimestre.'
  when '111' then 'Retenciones. Lo que se descuenta de las nóminas y de las facturas de los profesionales (IRPF) se ingresa a Hacienda cada trimestre en su nombre.'
  when '115' then 'Retención del alquiler del local. Una parte de cada recibo del alquiler se ingresa a Hacienda cada trimestre en nombre del dueño.'
  when '202' then 'Pagos a cuenta del Impuesto de Sociedades. Es un adelanto sobre lo que se pagará del año: se paga en tres plazos (abril, octubre y diciembre) y, al cerrar el año, se hacen cuentas en el 200.'
  when '200' then 'Impuesto de Sociedades. La cuenta del año: lo que toca por el beneficio, menos lo adelantado en los 202. Se paga en julio del año siguiente.'
  when '130' then 'Pago a cuenta del IRPF de Daniel como autónomo. Cada trimestre adelanta una parte del IRPF por lo que factura; al año se hacen cuentas en la renta.'
  when '100' then 'Renta (IRPF anual) de Daniel. La cuenta del año: lo que toca menos lo adelantado en los 130. Se paga en junio.'
  when 'IVTM' then 'Impuesto de circulación de los coches de la empresa. Se paga una vez al año.'
  when '390' then 'Resumen anual del IVA. Solo se presenta: no se paga.'
  when '190' then 'Resumen anual de las retenciones (111). Solo se presenta: no se paga.'
  when '180' then 'Resumen anual de la retención del alquiler (115). Solo se presenta: no se paga.'
  when '347' then 'Operaciones con terceros de más de 3.005 € al año. Solo se presenta: no se paga.'
  when '349' then 'Operaciones intracomunitarias. Solo se presenta: no se paga.'
  when 'CUENTAS' then 'Depósito de las cuentas anuales en el Registro Mercantil. Se presenta una vez al año.'
  else explicacion end
where empresa in ('accesalia', 'daniel_autonomo', 'ecobalance');
