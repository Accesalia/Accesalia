-- QUIEN HIZO QUE EN UNA VIABILIDAD                  (Monica, 6-oct-2026)
--
--   "Trazabilidad de intervinientes: quien hizo la visita y el polycam, quien
--    ve la viabilidad, quien remato la viabilidad con los precios y el texto, y
--    quien la firma."
--
-- De los cuatro papeles habia uno y medio:
--   redacta_id    -> equipo    ya estaba: quien la redacta
--   arquitecto_id -> tecnicos  estaba, pero `tecnicos` vacia: nadie a quien apuntar
--   quien visito y escaneo     solo el CORREO del remitente, como texto
--   quien la remato            no existia
--
-- Y su criterio: NO se eligen a mano, SE PONEN SOLOS. "Que se cree solo, igual
-- que quien hizo la visita o el polycam, que salen de los datos que cuelgan de
-- esas acciones."

-- 1 · QUIEN VISITO Y ESCANEO. Va en el escaneo, no en la viabilidad: es ahi
--     donde paso. Una viabilidad puede juntar varios escaneos -y entonces fueron
--     varias personas-, asi que se lee por los escaneos que cuelgan de ella.
alter table escaneados_polycam add column visito_id uuid references equipo(id) on delete set null;
comment on column escaneados_polycam.visito_id is
  'Quien fue a tomar los datos y subio el escaneo. Sale del correo del remitente cuando cuadra con el de alguien del equipo; si no cuadra, se queda vacio y se asigna a mano: adivinar quien es por el parecido del correo seria inventarlo.';

-- 2 · QUIEN LA REMATO con los precios y el texto. Se pone solo: es quien le da a
--     generar. No es lo mismo que quien la redacta -Alex la escribe, el comercial
--     la remata- ni que quien la firma.
alter table viabilidades add column remata_id uuid references equipo(id) on delete set null;
alter table viabilidades add column rematada_en timestamptz;
comment on column viabilidades.remata_id is
  'Quien la dejo lista: puso los precios y cerro el texto. Se guarda solo, al generar el documento.';
comment on column viabilidades.rematada_en is
  'Cuando se remato. Con remata_id da la ultima mano antes de la firma.';

comment on column viabilidades.redacta_id is
  'Quien la escribe (hoy Alex, en la mesa de viabilidades). Primero de los cuatro papeles que deja una viabilidad.';
comment on column viabilidades.arquitecto_id is
  'Quien la FIRMA. Siempre Daniel de Soto Martin-Caro, colegiado 24.103 del COAM: la firma electronica de Accesalia sale con su nombre porque es el administrador unico.';

-- 3 · Lo que se puede cuadrar de lo que ya hay, SOLO con el correo exacto. Los
--     remitentes que son correos personales o del propio Polycam se quedan
--     vacios a proposito.
update escaneados_polycam e
   set visito_id = q.id
  from equipo q
 where e.visito_id is null
   and q.email is not null
   and lower(trim(e.remitente)) = lower(trim(q.email));
