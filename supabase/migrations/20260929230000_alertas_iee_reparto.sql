-- ============================================================================
-- EL REPARTO DE LAS ALERTAS IEE, Y LA VIGILANCIA (Monica, 29-sep-2026)
--
-- Sigue a 20260929210000_alertas_iee.sql, que trajo la captura. Esto es lo que
-- se hace con lo capturado, y lo pidio ella con este detalle:
--
--   "Debe haber una lista de direcciones asignadas, comercial y fecha de
--    asignacion y columna de 'se creo opp si/no' que pueda filtrar para ver
--    cada comercial que ha hecho con lo suyo, con datos agregados: pasadas 16,
--    creadas 11. Por meses agregados, asi tienen tiempo de ir a verlos y no hay
--    excusa."
--
-- Y LO QUE HAY DETRAS, con sus palabras: "regalarle un cliente y que lo ignore
-- es algo que quiero saber". Por eso la vigilancia no es un adorno: si pasan los
-- dias y no hay oportunidad, se pregunta.
-- ============================================================================

-- ------------------------------------------- A QUIEN SE ASIGNA: UN COMERCIAL
--
-- Se asigna a un COMERCIAL, no a una persona del equipo: el comercial es la
-- unidad que tiene cartera y a la que se le miden las oportunidades. `asignada_por`
-- si es una persona -quien hizo el reparto, hoy Alejandra-.
--
-- La tabla estaba vacia, asi que la referencia se corrige en vez de duplicarse.
alter table iee_registrado drop constraint if exists iee_registrado_asignada_a_fkey;
alter table iee_registrado
  add constraint iee_registrado_asignada_a_fkey
  foreign key (asignada_a) references comerciales(id) on delete set null;

comment on column iee_registrado.asignada_a is
  'El COMERCIAL al que se le paso la alerta. Ojo: un comercial puede no tener persona de equipo detras, y entonces no hay correo al que escribirle.';

-- ------------------------------------------------ EL CORREO Y LA VIGILANCIA
--
-- `asignada_email_en` y `asignada_email_fallo` porque un correo que no sale no
-- puede quedar en silencio: si el aviso no llego, la alerta no esta repartida
-- de verdad, y eso hay que verlo en pantalla.
alter table iee_registrado add column if not exists asignada_email_en    timestamptz;
alter table iee_registrado add column if not exists asignada_email_fallo text;
alter table iee_registrado add column if not exists vigilancia_avisada_en timestamptz;

comment on column iee_registrado.asignada_email_fallo is
  'Por que no salio el correo. NULL y asignada_email_en tambien null = todavia no se ha intentado.';
comment on column iee_registrado.vigilancia_avisada_en is
  'Cuando se pregunto al comercial por que no habia abierto la oportunidad. Se pregunta UNA vez, no todos los dias.';

create index if not exists iee_registrado_asignada_idx on iee_registrado (asignada_a, asignada_en desc);

-- --------------------------------------------- EL PLAZO, QUE NO VA EN EL CODIGO
--
-- Diez dias son los que ella dijo, pero es una decision de negocio y las
-- decisiones de negocio se cambian sin tocar codigo: `parametros_alerta` existe
-- justo para esto.
insert into parametros_alerta (clave, nombre, valor, unidad, descripcion, orden)
values (
  'iee_dias_para_opp',
  'Dias para abrir la oportunidad de una alerta IEE',
  10,
  'dias',
  'Desde que se le pasa una IEE desfavorable a un comercial hasta que se le pregunta por que no ha abierto la oportunidad.',
  50)
on conflict (clave) do nothing;
