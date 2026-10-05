-- =====================================================================
-- UNA SOLA AGENDA DE PERSONAS
-- Monica, 4-oct-2026:
--
--   "Los datos de una persona son los mismos en cualquier caso: nombre,
--    apellidos, mail, telefono. Y si me apuras, solo los datos de contacto.
--    Por que no tener una agenda de contactos personales, con la persona_id y
--    sus datos, sea quien sea? Y esa persona_id es la que se vincula a rol
--    presidente, cargo administrador, cargo tecnico de urbanismo en
--    Fuenlabrada."
--
-- Y la regla de que dato va donde: "cuando hay rol, el DNI de la persona iria
-- ahi; cuando hay puesto, el numero de colegiado. No le pido el DNI al comercial
-- de BBVA. La agenda es nombre, apellidos, telefono y mail. Todos los demas
-- datos van a otra parte, vinculados a esa persona_id pero en el area que esa
-- persona toca."
--
-- Casi todo estaba ya asi: el telefono personal en la persona, el del trabajo en
-- el puesto, el correo en su tabla, el numero de colegiado en el puesto. Faltaba
-- poco.
-- =====================================================================

-- 1 · LA AGENDA. Solo le faltaban los apellidos: hoy todo va en 'nombre', y de
--     ahi salen los 131 nombres sucios de los presidentes.
alter table public.persona add column apellidos text;
comment on column public.persona.apellidos is
  'La agenda es nombre, apellidos, telefono y correo. Nada mas: lo demas va al area que lo necesita.';

-- 2 · EL DNI, AL PUESTO. Es del cargo que firma -el presidente firma, y por eso
--     se le pide-, no de la persona. Que se duplique si alguien preside dos
--     comunidades da igual: "es rarisimo y de hecho es correcto: si necesito el
--     DNI del rol presidente lo tengo accesible".
alter table public.puesto add column documento text;
comment on column public.puesto.documento is
  'El DNI, cuando el cargo lo necesita (el presidente firma). No esta en la persona a proposito: no se le pide el DNI al comercial de un banco.';

-- 3 · EL COMERCIAL ES UNA PERSONA. Hoy 'comerciales' es una tabla suelta con su
--     propio nombre y correo, y solo enlaza con 'equipo'. Asi, el dia que uno se
--     va y sigue trayendo trabajo desde fuera -el caso de Carlos, que dejo la
--     empresa en enero y "ha traido o abierto alguna cosa despues, como
--     freelance"- aparece dos veces y nadie sabe que es el mismo.
--
--     'equipo' NO se toca: de ahi cuelgan las nueve tablas de RRHH y ese area se
--     mira aparte. Un comercial puede tener las dos cosas: la persona (siempre) y
--     el equipo (mientras trabaje aqui).
alter table public.comerciales add column persona_id uuid references public.persona(id);
comment on column public.comerciales.persona_id is
  'La persona de la agenda. Permite que alguien deje de ser comercial interno y siga existiendo como quien nos trae trabajo: misma persona, papeles distintos.';

-- 4 · QUIEN LO TRAE. Un solo campo y apunta a la persona. Sustituye a los cuatro
--     'quien_*' (persona, comercial, contacto de contrata y vecino), que estan
--     los cuatro VACIOS: nunca se usaron, asi que no hay nada que migrar.
--
--     Su razonamiento, y es el que lo simplifica: "si yo apunto a persona_id el
--     dia 4 de octubre, me sale en que puesto estaba ese dia, y esa combinacion
--     me dice si hay comisiones que le afecten. No hace falta hacer el calculo a
--     priori". Como 'puesto' tiene 'desde' y 'hasta', sale solo.
alter table public.oportunidades add column quien_lo_trae uuid references public.persona(id);
comment on column public.oportunidades.quien_lo_trae is
  'La persona que nos trajo el encargo: un administrador, alguien de una contrata, un tecnico del ayuntamiento o un vecino. Con la fecha se saca en que puesto estaba y que acuerdos de comision le aplican.';

create index oportunidades_por_quien_lo_trae on public.oportunidades (quien_lo_trae)
  where quien_lo_trae is not null;
