-- FUZZY "modelo Ordelia": UNA query, el CATALOGO ENTERO de comunidades contra el
-- TEXTO de la nota. Devuelve las que "suenan" en la nota, para SUBIRLAS AL PROMPT
-- (con su resumen) y que Sali decida CON CONTEXTO -> fuzzy-ANTES, no despues.
--
-- strict_word_similarity(nombre, nota): cuanto encaja el nombre con algun tramo de
-- la nota (aunque la nota lo diga corto o mal escuchado por voz). Se descartan
-- nombres degenerados (length < 6, tipo "Com") que dan falsos positivos altos.
-- Umbral 0.4 empirico: la comunidad real destaca; el ruido puro da 0 filas.
-- Filtro explicito (no el operador <<%, cuya GUC de umbral no es fijable aqui):
-- scan completo del catalogo, trivial al ritmo humano de las notas.

create or replace function candidatos_comunidad_para_nota(nota text, tope int default 8, umbral real default 0.4)
returns table (id uuid, nombre text, direccion text, sim real)
language sql stable
as $$
  select c.id, c.nombre, c.direccion, strict_word_similarity(c.nombre, nota) as sim
  from comunidades c
  where c.activa
    and length(c.nombre) >= 6
    and strict_word_similarity(c.nombre, nota) >= umbral
  order by sim desc
  limit tope;
$$;

comment on function candidatos_comunidad_para_nota is
  'Fuzzy Ordelia: comunidades del catalogo que suenan en el texto de la nota, para subir al prompt como contexto (fuzzy-antes). strict_word_similarity + <<% (indice GIN).';
