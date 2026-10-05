-- =====================================================================
-- EL PAR CAPTADOR / QUIEN LA LLEVA, EN LA OPORTUNIDAD
-- Monica, 4-oct-2026: "en las etiquetas que hay mas de un comercial: el que
-- sale primero es el captador, el segundo el que la lleva ahora".
--
-- El par ya existia en 'proyectos' (comercial_captador_id + comercial_id, los
-- 609 poblados), pero ahi llega tarde: "nace en cualquier parte del flujo, desde
-- que se crea la opp. Y de hecho aplica al proyecto A TRAVES DE LA OPP, no a
-- traves del proyecto. En proyectos el dato de comercial no pinta absolutamente
-- nada salvo para consulta, no deberia ir ahi".
--
-- Lo que NO se hace aqui, y es a proposito: renombrar 'comercial_id' a
-- 'comercial_gestion', que es el nombre que ella quiere ("si uno es generico y
-- el otro lleva apellido, se van a confundir"). Aparece en 14 sitios del
-- frontend y ademas existe 'empresa.comercial_id' -la cartera de una
-- administracion-, asi que el renombrado toca dos cosas a la vez y va en la
-- sesion del rediseno, no de paso.
-- =====================================================================

alter table public.oportunidades
  add column comercial_captador_id uuid references public.comerciales(id);

comment on column public.oportunidades.comercial_captador_id is
  'Quien la trajo, de los nuestros. El par con comercial_id, que es quien la lleva ahora. En la ficha de Dropbox van en ese orden: primero el captador.';

create index oportunidades_por_captador on public.oportunidades (comercial_captador_id)
  where comercial_captador_id is not null;
