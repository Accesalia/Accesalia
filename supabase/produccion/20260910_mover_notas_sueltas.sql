-- =============================================================================
-- ERP Accesalia — Los textos sueltos de `notas` pasan a las tablas de notas
--
-- Aplicado en produccion el 10-sep-2026. Resultado: 20 + 30 = 50 movidas,
-- 21 rastros de migracion conservados donde estaban.
--
-- QUE SE MUEVE Y QUE NO
--
-- Habia 71 textos repartidos en campos `notas` sueltos, y no eran lo mismo:
--
--   20 del mundo contrata (escritas hoy con Monica revisando el excel):
--      "Le echaron", "Se jubilo", "Primo de Monica", "Estafo a la empresa y les
--      robo dinero. Fue un escandalo."
--
--   51 del mundo administracion, de julio, de dos clases muy distintas:
--      * 30 son NOTAS DE NEGOCIO, y buenas: "GESMADRID: administracion anterior
--        de Paz Terradillo, que monto Ciudadela al irse y se llevo comunidades",
--        "Gestion Mafer: se jubilo; se conserva para el historico", "Maribel es
--        la propia M. Isabel Garoz Carbonell, no otra persona".
--      * 21 son RASTRO DE LA MIGRACION, no notas: "alta de Monica", "no sale en
--        ninguna ficha: viene del tablero de Monday", "Dato recuperado por
--        Monica de la ficha". Dicen de donde salio el registro, no nada del
--        negocio, asi que se quedan en su campo. Monica: "fontaneria no, las
--        otras 50 si".
--
-- El campo viejo se vacia SOLO para las movidas, para que no queden dos sitios
-- donde mirar lo mismo. Las 21 de fontaneria siguen intactas.
--
-- autor = 'Monica' y origen = 'app' en las 50: todas salen de su conocimiento,
-- no de una importacion ni de la IA.
-- =============================================================================
begin;

-- ---------------------------------------------------------------------------
-- 1. Mundo contrata: las 20 de hoy
-- ---------------------------------------------------------------------------
insert into notas_contratas (persona_id, texto, autor, origen)
select id, notas, 'Monica', 'app' from contrata_personas where notas is not null;

insert into notas_contratas (puesto_id, texto, autor, origen)
select id, notas, 'Monica', 'app' from contrata_puestos_persona where notas is not null;

-- ---------------------------------------------------------------------------
-- 2. Mundo administracion: solo las 30 de negocio
-- ---------------------------------------------------------------------------
insert into notas_administracion_fincas (empresa_id, texto, autor, origen)
select id, notas, 'Monica', 'app' from empresa
 where notas is not null
   and notas !~* '^(alta de monica|no sale en ninguna ficha|del tablero de monday|dato recuperado por monica)';

insert into notas_administracion_fincas (puesto_id, texto, autor, origen)
select id, notas, 'Monica', 'app' from puesto
 where notas is not null
   and notas !~* '^(alta de monica|no sale en ninguna ficha|del tablero de monday|dato recuperado por monica)';

insert into notas_administracion_fincas (persona_id, texto, autor, origen)
select id, notas, 'Monica', 'app' from persona
 where notas is not null
   and notas !~* '^(alta de monica|no sale en ninguna ficha|del tablero de monday|dato recuperado por monica)';

-- ---------------------------------------------------------------------------
-- 3. Vaciar el campo viejo solo donde ya esta movido
-- ---------------------------------------------------------------------------
update contrata_personas        set notas = null where notas is not null;
update contrata_puestos_persona set notas = null where notas is not null;
update empresa set notas = null where notas is not null
   and notas !~* '^(alta de monica|no sale en ninguna ficha|del tablero de monday|dato recuperado por monica)';
update puesto  set notas = null where notas is not null
   and notas !~* '^(alta de monica|no sale en ninguna ficha|del tablero de monday|dato recuperado por monica)';
update persona set notas = null where notas is not null
   and notas !~* '^(alta de monica|no sale en ninguna ficha|del tablero de monday|dato recuperado por monica)';

-- ---------------------------------------------------------------------------
-- 4. Comprobacion: aborta si los numeros no cuadran
-- ---------------------------------------------------------------------------
do $$
declare nc int; na int; resto int;
begin
  select count(*) into nc from notas_contratas;
  select count(*) into na from notas_administracion_fincas;
  select (select count(notas) from empresa) + (select count(notas) from puesto)
       + (select count(notas) from persona) + (select count(notas) from contrata_personas)
       + (select count(notas) from contrata_puestos_persona) into resto;
  raise notice 'notas_contratas: %, notas_administracion_fincas: %, campos sueltos que quedan: %', nc, na, resto;
  if nc + na <> 50 then
    raise exception 'esperaba 50 notas movidas y hay %', nc + na;
  end if;
  if resto <> 21 then
    raise exception 'esperaba que quedaran 21 rastros de migracion y quedan %', resto;
  end if;
end $$;

commit;
