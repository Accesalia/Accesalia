-- LA VIABILIDAD, POR LINEAS                        (Monica, 6-oct-2026)
--
-- El dinero de una viabilidad no es un puñado de cifras sueltas: son CUATRO
-- BLOQUES, y cada uno puede tener varias lineas. Lo enseno ella con un ejemplo:
--
--   Proyecto de SATE con aerotermia y ascensor ....  17.000  (+21% IVA = 20.570)
--   Coste de ejecucion de obra ....................  580.000
--       SATE ......................................  320.000
--       aerotermia apoyada por fotovoltaica .......   57.000
--       instalacion de ascensor ...................  203.000
--   Tasas del ayuntamiento: licencia 42.000 · ICIO 5.900
--   COSTE ESTIMADO TOTAL ..........................  751.470
--
-- Y PARA QUE SIRVE EL DOCUMENTO ENTERO, que es lo que manda sobre el diseño:
--
--   "Que haya un apartado final UNICO que sume todo, con IVA incluido, que un
--    vecino pueda decir: son 789.000, somos 20, tocamos a 39.450."
--
-- LO QUE CAMBIA RESPECTO A ANTES:
--
--  · El PEM era UNA cifra y son VARIAS. "Imagina que incluimos aerotermia: eso
--    es un precio como el PEM, que estimamos. Las lineas de Alex pueden ser UNA
--    O VARIAS."
--  · Las tasas eran UNA cifra y son VARIAS: licencia e ICIO van aparte, y
--    luego estaran las de la ECU.
--  · El IVA y el beneficio industrial van POR LINEA, no al total. Da igual para
--    la suma, pero no para lo que sirve despues: "asi pueden comparar
--    presupuesto de contrata con estimado de viabilidad: el arquitecto dijo que
--    la aerotermia, IVA incluido, eran 14.800 — a ver que nos pone Adratek".
--  · Y subvenciones y CSS tambien van desglosadas.
--
-- OJO, QUE ME EQUIVOQUE Y ELLA ME PARO: la estimacion de obra NO la da ninguna
-- contrata. "En esa fase no hay contrata. ES NUESTRA estimacion." La contrata
-- aparece despues, con su presupuesto, y entonces se compara contra esto.

alter table viabilidad_conceptos add column grupo text;
alter table viabilidad_conceptos add column concepto text;
alter table viabilidad_conceptos add column bi_porcentaje numeric;

-- Los cuatro bloques son fijos, asi que CHECK con nombre y no tabla catalogo
-- (su convencion: fijo -> CHECK; vivo -> catalogo).
alter table viabilidad_conceptos
  add constraint viabilidad_conceptos_grupo_check
  check (grupo is null or grupo = any (array['obra', 'honorarios', 'tasas', 'subvencion']));

comment on column viabilidad_conceptos.grupo is
  'A que bloque economico pertenece la linea: obra (lo que estimamos nosotros, +19% y +10%), honorarios (los nuestros, 21%, salen de la hoja de encargo), tasas (ayuntamiento y ECU, SIN IVA) o subvencion. El documento se arma sumando por grupo.';
comment on column viabilidad_conceptos.concepto is
  'El texto de la linea cuando no es un bloque de nuestro catalogo: "aerotermia apoyada por fotovoltaica", "licencia", "ICIO". En las de honorarios se usa `bloque_id` y este queda vacio.';
comment on column viabilidad_conceptos.bi_porcentaje is
  'El beneficio industrial, 19% de serie. Solo en las lineas de obra: PEM + BI = precio de contrata, y sobre eso el IVA. Va por linea para poder comparar cada estimacion con el presupuesto real de esa obra.';
comment on column viabilidad_conceptos.iva_porcentaje is
  'El IVA de ESTA linea, que no es el mismo en todas: obra 10%, honorarios de arquitecto 21%, tasas del ayuntamiento 0 (no llevan). Los precios de la ECU llevan IVA pero sus tasas no.';
