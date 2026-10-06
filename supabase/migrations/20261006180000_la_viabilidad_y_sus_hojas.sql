-- DE QUE HOJAS SALIO UNA VIABILIDAD, Y QUIEN LA DEJO ATRAS   (Monica, 6-oct-2026)
--
-- Los honorarios de la viabilidad no se teclean: salen de la hoja de encargo.
-- "¿Para que duplicar si el dato ya esta? Mejor pillar de ahi y, sobre todo, nos
-- aseguramos de que CUADRE siempre."
--
-- Y una viabilidad puede apoyarse en VARIAS hojas a la vez: el caso estandar son
-- tres -ascensor, subvencion y CSS- y "la viabilidad las agrupa todas".
--
-- CUANDO SE CONGELA. Ella lo resolvio en una frase: "para enviarla hay que
-- generar el PDF; si es PDF, ya esta congelado. Si aun es editable, es que no se
-- ha generado y por tanto no se ha enviado". Asi que no hace falta un estado:
-- mientras `url_pdf` este vacio la viabilidad lee los importes al dia, y al
-- generar el PDF se guarda aqui la foto de que versiones miro.
--
-- De ahi sale el disclaimer del documento: "calculado en base a lo ofertado en la
-- hoja de encargo numero tal, version tal, de fecha tal".

create table relacion_viabilidad_hojas (
  viabilidad_id    uuid not null references viabilidades(id) on delete cascade,
  version_hoja_id  uuid not null references versiones_hoja(id) on delete cascade,
  creado_en        timestamptz not null default now(),
  primary key (viabilidad_id, version_hoja_id)
);

comment on table relacion_viabilidad_hojas is
  'De que VERSIONES de hoja saco sus honorarios una viabilidad, congelado al generar su PDF. Es lo que sostiene el disclaimer: "calculado en base a la hoja numero tal, version tal, de fecha tal". Son varias porque un encargo normal lleva tres hojas: ascensor, subvencion y CSS.';

-- QUIEN LA DEJO ATRAS. Si despues se genera una version nueva de una de esas
-- hojas, la viabilidad enviada NO se regenera -el documento que salio se
-- conserva fiel- pero deja de poder leerse como buena:
--
--   "Debe marcarse la viabilidad como 'modificada en hoja de encargo numero
--    tal', para que nadie la vea y piense que es la correcta."
alter table viabilidades add column superada_por_version_id uuid references versiones_hoja(id) on delete set null;
alter table viabilidades add column superada_en timestamptz;

comment on column viabilidades.superada_por_version_id is
  'La version de hoja que dejo atras a esta viabilidad. Se pone SOLA al generar una version nueva de una hoja que esta viabilidad habia usado. Con ella se escribe el aviso de "modificada en hoja de encargo numero tal".';
comment on column viabilidades.superada_en is
  'Cuando quedo superada. El documento enviado no se toca: lo que cambia es que ya no se puede leer como vigente.';
