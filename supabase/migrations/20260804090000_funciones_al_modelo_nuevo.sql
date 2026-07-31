-- =============================================================================
-- Dos funciones que se quedaron hablando del modelo viejo
--
-- Al retirar administradores y administraciones_fincas se borraron las tablas,
-- pero no el codigo que las usaba por dentro. PostgreSQL no revisa el cuerpo de
-- una funcion plpgsql hasta que se ejecuta, asi que se quedaron ahi calladas y
-- solo fallaban al usarlas. La primera reventaba al grabar una nota de voz:
--
--     record "new" has no field "administrador_id"
--
-- Es el mismo tipo de resto que las columnas y las tablas, pero invisible: no
-- sale en un listado de tablas ni lo caza el compilador del frontend. Conviene
-- recordarlo para la proxima retirada: buscar tambien en pg_proc.
--
--   actualizar_ultimo_contacto_admin  disparador de interacciones. Marcaba
--       cuando se hablo por ultima vez con una casa. Ahora sube por el puesto
--       hasta la empresa. Rellena empresa.fecha_ultimo_contacto, que es lo que
--       enseña la cartera para ver que administraciones se estan enfriando.
--
--   buscar_administradores_fuzzy      busqueda por parecido de nombre, para que
--       la IA case "Alejandro" con la persona real. Hoy no la llama nadie (la
--       que usa Sali es la de comunidades), pero estaba rota igual.
-- =============================================================================

create or replace function actualizar_ultimo_contacto_admin()
returns trigger
language plpgsql
as $$
declare
  v_puesto  uuid;
  v_empresa uuid;
begin
  -- de quien es la nota: de su sujeto, y si no, del de la oportunidad
  v_puesto := new.puesto_id;
  if v_puesto is null and new.oportunidad_id is not null then
    select puesto_id into v_puesto from oportunidades where id = new.oportunidad_id;
  end if;

  -- sin persona o sin fecha no hay nada que anotar
  if v_puesto is null or new.fecha_evento is null then
    return null;
  end if;

  -- la casa puede no saberse todavia: entonces no hay donde apuntarlo
  select empresa_id into v_empresa from puesto where id = v_puesto;
  if v_empresa is null then
    return null;
  end if;

  update empresa
     set fecha_ultimo_contacto = greatest(
           coalesce(fecha_ultimo_contacto, new.fecha_evento), new.fecha_evento)
   where id = v_empresa;

  return null;
end;
$$;

comment on function actualizar_ultimo_contacto_admin() is 'Al grabar una interaccion, anota en la empresa cuando se hablo por ultima vez con ella. Sube por el puesto: la persona sabe de que casa es.';

create or replace function buscar_administradores_fuzzy(
  q text, tope int default 5, minimo real default 0.3)
returns table (id uuid, nombre text, empresa text, empresa_id uuid, sim real)
language sql
stable
as $$
  -- Devuelve el id del PUESTO, que es lo que guardan interacciones y
  -- oportunidades. La empresa puede venir vacia: hay gente de la que aun no
  -- sabemos en que administracion trabaja.
  --
  -- El umbral va en la condicion y no en un SET de sesion: pg_trgm.word_
  -- similarity_threshold solo lo puede tocar un superusuario, y aqui no lo
  -- somos. Asi ademas queda a la vista y se puede afinar por llamada. Son unos
  -- cientos de filas, no hace falta indice.
  select pu.id,
         pe.nombre,
         em.nombre_accesalia,
         pu.empresa_id,
         word_similarity(q, pe.nombre) as sim
    from puesto pu
    join persona pe on pe.id = pu.persona_id
    left join empresa em on em.id = pu.empresa_id
   where pe.activa
     and word_similarity(q, pe.nombre) >= minimo
   order by sim desc
   limit tope;
$$;

comment on function buscar_administradores_fuzzy(text, int, real) is 'Busca personas por parecido de nombre para que la IA case lo dictado con quien existe. Devuelve el id del puesto.';

-- la de antes tenia otra firma (sin el umbral) y se quedaria conviviendo
drop function if exists buscar_administradores_fuzzy(text, int);
