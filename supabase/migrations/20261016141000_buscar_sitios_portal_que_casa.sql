-- BUSCAR SITIOS: el portal que se ensena es el que se ha escrito (16-oct-2026).
-- "ferroviarios 11" sacaba el sitio bien, pero con el portal Palomares 75 del
-- mismo edificio. Ahora, de cada sitio, gana el portal con mas palabras que casan.

create or replace function public.buscar_sitios(p_q text, p_limite integer default 20)
returns setof public.directorio_sitios
language sql
stable
security invoker
set search_path = ''
as $$
  with palabras as (
    select array_agg(w) as ws from regexp_split_to_table(public.directorio_texto(p_q), '[\s,;]+') w where w <> ''
  ),
  casan as (
    select d.*,
           public.similarity(d.busqueda, public.directorio_texto(p_q)) as parecido,
           (select count(*) from unnest(palabras.ws) w
             where case when w ~ '^\d+$' then public.directorio_texto(concat_ws(' ', d.portal, d.municipio)) ~ ('(^|[^0-9])' || w || '([^0-9]|$)')
                        else public.directorio_texto(concat_ws(' ', d.portal, d.municipio)) like '%' || w || '%' end) as en_portal
      from public.directorio_sitios d, palabras
     where palabras.ws is not null
       and not exists (
         select 1 from unnest(palabras.ws) w
          where not (case when w ~ '^\d+$' then d.busqueda ~ ('(^|[^0-9])' || w || '([^0-9]|$)')
                          else d.busqueda like '%' || w || '%' end))
  ),
  uno_por_sitio as (
    select distinct on (grupo) * from casan order by grupo, en_portal desc, parecido desc
  )
  select fila, grupo, acceso_id, clave_id, dir_codigo, portal, municipio, sitio, comunidad_id, comunidad, admin, opps, n_abiertas, busqueda, actualizado_en
    from uno_por_sitio
   order by (n_abiertas > 0) desc, en_portal desc, parecido desc, sitio
   limit greatest(1, least(p_limite, 100))
$$;
revoke execute on function public.buscar_sitios(text, integer) from anon, authenticated, public;
grant execute on function public.buscar_sitios(text, integer) to service_role;
