-- PREVISION DE IMPUESTOS desde el Excel de Monica (17-oct-2026):
-- G:/Mi unidad/MONICA ACCESALIA/IMPUESTOS RESUMEN ACCESALIA + DANIEL.xlsx, hoja 2025.
-- «Podemos coger las cifras del Excel sin problema, estan validadas por mi, lo
-- monte yo, pero no se si estan completas». Cada cifra va al mismo modelo y
-- periodo del ano siguiente como importe_ESTIMADO (el real va en importe, cuando
-- se pague: asi se ve la desviacion). Solo donde no habia nada.
-- Fuera, a proposito: el 115 del 4T (no esta en el Excel) y el «MOD 200 3580» de
-- la columna de Daniel en julio (Daniel autonomo no paga Sociedades: es la cifra
-- de Accesalia copiada). Aplicado en prod el 17-oct-2026: 31 vencimientos.
with prev(empresa, modelo, periodo, imp) as (values
 ('accesalia','303','4T',21313.25),('accesalia','303','1T',20132),('accesalia','303','2T',18056.46),('accesalia','303','3T',18069.65),
 ('accesalia','111','4T',12600),('accesalia','111','1T',10878),('accesalia','111','2T',10847.77),('accesalia','111','3T',10225.25),
 ('accesalia','115','1T',427.5),('accesalia','115','2T',427.5),('accesalia','115','3T',427.5),
 ('accesalia','202','1P',1417.53),('accesalia','202','2P',1417.5),('accesalia','202','3P',2147),
 ('accesalia','200','ANUAL',3580.19),
 ('daniel_autonomo','130','4T',2300),('daniel_autonomo','130','1T',2300),('daniel_autonomo','130','2T',16204.11),('daniel_autonomo','130','3T',10723.99),
 ('daniel_autonomo','303','4T',7000),('daniel_autonomo','303','1T',7000),('daniel_autonomo','303','2T',9796.33),('daniel_autonomo','303','3T',15628.46),
 ('daniel_autonomo','100','ANUAL',12000))
update vencimientos_fiscales v set importe_estimado = p.imp
from obligaciones_fiscales o, prev p
where o.id = v.obligacion_id and o.empresa = p.empresa and o.modelo = p.modelo and v.periodo = p.periodo
  and v.importe is null and v.importe_estimado is null and v.estado in ('previsto','borrador') and v.fecha_limite >= '2026-10-01';
