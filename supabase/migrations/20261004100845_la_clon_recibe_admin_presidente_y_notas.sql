-- =====================================================================
-- LA TABLA-CLON RECIBE ADMINISTRADOR, PRESIDENTE Y NOTAS
-- Monica, 4-oct-2026.
--
-- La clon guarda las 247 carpetas de Dropbox que NO estaban en Monday y que
-- todavia no tienen oportunidad. Su regla: "anadir a la tabla temporal LO MISMO
-- que haya que poner en la de produccion, para que despues, una vez los datos
-- esten limpios, sea copiar y pegar sin problemas. Es una tabla-clon!".
--
-- Por que estas tres y no otras: es lo que traen las fichas de datos y lo que
-- hace falta para que cada carpeta tenga "direccion + administrador +
-- presidente + notas", que es la condicion que ella puso para poder crear las
-- opps.
--
-- OJO A 'notas_de_la_ficha', QUE VA SEPARADA DE 'notas' A PROPOSITO. La columna
-- 'notas' que ya existia lleva los apuntes NUESTROS: lo que ella fue resolviendo
-- a mano y el "NO ES UNA COMUNIDAD" de las cuatro carpetas de trabajo. Si el
-- diario de la ficha se volcara ahi, no habria forma de distinguir lo que dijo
-- Monica de lo que decia un papel de 2017.
--
-- DEL PRESIDENTE SOLO EL NOMBRE, y es decision suya: "el presidente es una
-- persona, y a veces en la ficha vienen sus datos. No es que me interese, porque
-- son opps cerradas; el admin SI me interesa como fuente de futuro trabajo, es
-- totalmente distinto. (...) No merece la pena, creo yo". Asi que el nombre va a
-- un campo de texto y el DNI que trae la ficha NO se guarda: dato personal de
-- alguien de un expediente cerrado con el que no vamos a trabajar.
-- =====================================================================

alter table public.comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una
  add column empresa_id        uuid references public.empresa(id),
  add column presidente        text,
  add column notas_de_la_ficha text;

comment on column public.comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una.empresa_id is
  'El administrador, ya resuelto contra la lista limpia. Clon de comunidad_admin_responsable.empresa_id. Vacio = no se sabe o esta sin resolver.';
comment on column public.comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una.presidente is
  'El presidente tal como lo escribe la ficha. Texto, porque todavia no hay comunidad de la que colgar la persona.';
comment on column public.comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una.notas_de_la_ficha is
  'El diario de la ficha de datos, copiado tal cual. NO se mezcla con notas, que son los apuntes nuestros.';

create index clon_por_empresa
  on public.comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una (empresa_id)
  where empresa_id is not null;
