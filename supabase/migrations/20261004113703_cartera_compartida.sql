-- ===========================================================================
-- LA CARTERA COMPARTIDA   (Monica, 3-oct-2026)
--
-- Daniel, Alvaro y Beatriz son comerciales y su parte comercial es identica.
-- Alejandra es la secretaria comercial: no visita clientes, pero le hace a
-- Daniel toda la gestion (hojas de encargo, envios...). Sus palabras: "Alejandra
-- tiene un acceso comercial compartido con Daniel. Y ya esta." Y rechazo, con
-- razon, una columna para ella: "seria crear una columna para una excepcion".
--
-- Asi que no es un campo de Alejandra: es quitar el limite de "una persona por
-- cartera". Cada comercial sigue teniendo SU persona (comerciales.equipo_id); aqui
-- van las demas que abren esa cartera. Hoy, una fila. Con eso, sin programar
-- nada mas:
--   · Alejandra entra en Comercial y ve y toca las opps de Daniel;
--   · los correos de una opp de Daniel les llegan a los dos ("sobre todo por
--     los correos").
-- ===========================================================================

create table if not exists relacion_cartera_compartida (
  comercial_id uuid not null references comerciales(id) on delete cascade,
  equipo_id    uuid not null references equipo(id) on delete cascade,
  creado_en    timestamptz not null default now(),
  primary key (comercial_id, equipo_id)
);
comment on table relacion_cartera_compartida is
  'Quien MAS abre la cartera de un comercial, ademas del propio comercial (comerciales.equipo_id). Monica, 3-oct-2026: Alejandra tiene "un acceso comercial compartido con Daniel": entra y ve y toca las opps de Daniel como si fuera el, y le llegan los mismos correos. No es un campo para ella: si manana otro comercial tiene quien le lleve el papeleo, es una fila mas.';

-- Alejandra en la cartera de Daniel.
insert into relacion_cartera_compartida (comercial_id, equipo_id)
values ('72495d1c-0090-4346-b167-ed852fd69960', '8772a14e-a371-448e-a13b-6357dfb027bf')
on conflict do nothing;
