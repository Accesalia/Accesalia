-- CONSOLIDAR AL FIRMAR AUNQUE YA LO LLEVE ALGUIEN (Monica, 28-oct-2026).
--
-- Desde hoy el administrador lo lleva quien lo trae desde el primer dia
-- (comercial_id puesto al crearlo); consolidado es solo «nos ha servido», con
-- su primera hoja firmada. La firma consolidaba SOLO a los que no llevaba nadie
-- (`and comercial_id is null`): con la regla nueva no se consolidaria ninguno.
-- Ahora se consolida siempre; quien lo lleva solo se rellena si estaba vacio.
--
-- Y la tarjeta «Administradores sin consolidar» del comercial cuenta los que
-- LLEVA el (comercial_id), no los que capto: si direccion lo pasa a otro, le
-- sale al nuevo.
--
-- Se cambian solo esas lineas de las dos funciones, sobre su definicion viva.

do $$
declare
  d text;
begin
  d := pg_get_functiondef('public.he_automatismos_estado()'::regprocedure);
  if position('where id = any (admins) and not consolidado and comercial_id is null;' in d) = 0 then
    raise exception 'he_automatismos_estado: no esta la linea esperada; no se toca';
  end if;
  -- (sale una sola vez en la funcion: comprobado el 28-oct)
  d := replace(d, 'comercial_id = o.comercial_id', 'comercial_id = coalesce(comercial_id, o.comercial_id)');
  d := replace(d, 'where id = any (admins) and not consolidado and comercial_id is null;', 'where id = any (admins) and not consolidado;');
  execute d;

  d := pg_get_functiondef('public.mis_avisos(uuid,boolean,uuid,boolean,boolean,boolean)'::regprocedure);
  if position('and pu.comercial_captador_id = p_comercial) end' in d) = 0 then
    raise exception 'mis_avisos: no esta la linea esperada; no se toca';
  end if;
  d := replace(d, 'and pu.comercial_captador_id = p_comercial) end', 'and pu.comercial_id = p_comercial) end');
  execute d;
end $$;
