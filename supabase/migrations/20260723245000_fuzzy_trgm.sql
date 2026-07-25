-- FUZZY por TRIGRAMAS para dar ojos a la nota SUELTA (sin admin anclado).
--
-- Cuando la nota no va colgada de un admin, Sali no tiene comunidades de contexto
-- que mirar -> todo quedaba pendiente. Con esto, tras la extraccion, se buscan por
-- parecido las comunidades/administradores que la nota menciona ("Albufera 250" ~
-- "AV DE LA ALBUFERA 250 MADRID"). Match claro -> enlaza; varios -> candidatos que
-- la revision ofrece como botones. word_similarity (<%) tolera que el nombre venga
-- corto o mal escuchado por voz.

create extension if not exists pg_trgm;

create index if not exists idx_comunidades_nombre_trgm    on comunidades using gin (nombre gin_trgm_ops);
create index if not exists idx_comunidades_direccion_trgm on comunidades using gin (direccion gin_trgm_ops);
create index if not exists idx_administradores_nombre_trgm on administradores using gin (nombre gin_trgm_ops);

-- Comunidades que "suenan" a q (por nombre o direccion), ordenadas por parecido.
create or replace function buscar_comunidades_fuzzy(q text, tope int default 5)
returns table (id uuid, nombre text, direccion text, sim real)
language sql stable
set pg_trgm.word_similarity_threshold = 0.3
as $$
  select c.id, c.nombre, c.direccion,
         greatest(word_similarity(q, c.nombre), word_similarity(q, coalesce(c.direccion, ''))) as sim
  from comunidades c
  where c.activa
    and (q <% c.nombre or q <% coalesce(c.direccion, ''))
  order by sim desc
  limit tope;
$$;

-- Administradores (persona) que suenan a q. Para anclar una nota suelta a su admin.
create or replace function buscar_administradores_fuzzy(q text, tope int default 5)
returns table (id uuid, nombre text, empresa text, administracion_id uuid, sim real)
language sql stable
set pg_trgm.word_similarity_threshold = 0.3
as $$
  select a.id, a.nombre, a.empresa, a.administracion_id, word_similarity(q, a.nombre) as sim
  from administradores a
  where a.activo and q <% a.nombre
  order by sim desc
  limit tope;
$$;

comment on function buscar_comunidades_fuzzy is 'Fuzzy trigram (word_similarity) de comunidades por nombre/direccion. Para casar menciones de notas sueltas sin cotejar a ciegas.';
