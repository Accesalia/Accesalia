-- CONTROL DE LOS RELOJES, y el coste que le faltaba a uso_llm.
-- Pedido por Monica el 30-sep-2026.
--
-- PASADA_RELOJ es nueva. Nace de haber tenido los tres relojes rotos un dia
-- entero sin que nada lo dijera: se lanzaban puntuales, el middleware los
-- mandaba al login con un 307, y se descubrio mirando los logs de Vercel a mano.
-- Con esto, una pantalla contesta "corrio el barrido de esta mañana?" sin salir
-- de la app.
--
-- USO_LLM **YA EXISTIA** de la fase 1, con 29 filas de julio y la columna
-- `origen` -que es justo el eje que Monica queria: la FUNCION, no el cliente
-- ("lo que me interesa es saber si Sali hablando con los de obras es un gasto
-- inmenso que compensa o no")-. Asi que no se crea nada: solo se le añade el
-- coste, que era lo unico que le faltaba para contestar esa pregunta.
--
-- PENDIENTE, sin tocar porque es del modelo de la fase 1 y lo decide ella:
-- `uso_llm.actor_id` apunta a `personal_interno`, que esta VACIA (0 filas)
-- mientras `equipo` tiene 35. Ninguna de las 29 filas lo rellena. Habria que
-- repuntarlo a `equipo`.

create table if not exists pasada_reloj (
  id           bigserial primary key,
  -- La clave corta del trabajo: iee_barrido, buzon_polycam, comunidades_catastro.
  -- Sin CHECK a proposito: la lista de relojes esta viva y no quiero una
  -- migracion cada vez que se añade uno.
  tarea        text not null,
  empezada_en  timestamptz not null default now(),
  acabada_en   timestamptz,
  ms           integer,
  ok           boolean,
  -- Lo que conto: el resumen si fue bien, el error si fue mal. Una linea legible.
  dice         text,
  -- Y la respuesta entera, para cuando el resumen no basta.
  detalle      jsonb,
  -- Quien lo lanzo: el reloj solo, o una persona desde la app.
  quien        text not null default 'reloj',
  constraint pasada_reloj_quien check (quien in ('reloj', 'persona'))
);

comment on table pasada_reloj is
  'Una linea por cada pasada de un reloj (cron). Nace de tener los tres relojes rotos un dia entero sin que nada lo dijera. Para saber si corrio sin entrar en Vercel.';
comment on column pasada_reloj.tarea is
  'Clave corta del trabajo: iee_barrido, buzon_polycam, comunidades_catastro. Sin CHECK: la lista de relojes esta viva.';
comment on column pasada_reloj.dice is 'El resumen si fue bien, el error si fue mal. Una linea legible.';
comment on column pasada_reloj.detalle is 'La respuesta entera, para cuando el resumen no basta.';

create index if not exists pasada_reloj_tarea_idx on pasada_reloj (tarea, empezada_en desc);
create index if not exists pasada_reloj_cuando_idx on pasada_reloj (empezada_en desc);

-- Lo unico que le faltaba a uso_llm. Se calcula AL APUNTARLO y se guarda hecho,
-- no se recalcula despues: los precios cambian y un gasto de julio tiene que
-- seguir diciendo lo que costo en julio. Misma idea que la foto del precio en
-- las hojas de encargo.
alter table uso_llm add column if not exists coste_eur numeric(12,6);
comment on column uso_llm.coste_eur is
  'Lo que costo esa llamada, calculado AL APUNTARLA y guardado hecho. No se recalcula despues: los precios cambian y un gasto de julio tiene que seguir diciendo lo que costo en julio.';
