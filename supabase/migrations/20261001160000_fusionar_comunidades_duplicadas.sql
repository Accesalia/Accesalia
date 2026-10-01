-- Doce fincas que estaban dos veces en la lista de direcciones.
--
-- Salieron de barrer el cotejo del buzon Polycam contra las 1.228 direcciones:
-- si un comercial escribe una de estas, encajan DOS comunidades y el correo se
-- va a la bandeja de excepciones. Pero el problema no era el cotejo, era que la
-- misma finca estaba escrita de dos maneras.
--
-- El criterio NO es el parecido del nombre, es objetivo: en las doce parejas las
-- dos filas tienen la MISMA referencia catastral. Monica lo confirmo una por una
-- el 1-oct-2026: "te confirmo que en todos los casos es la misma comunidad".
--
-- De cada fila que se va cuelga 1 oportunidad, 1 hoja de encargo (2 en Santiago
-- Alio), y en Principes tambien 1 proyecto y 1 administrador responsable. Todo
-- eso se repunta. No hay personas, ni notas, ni interacciones, ni documentos.
--
-- Se van por cascada, a proposito, dos cosas:
--   · su fila de cotejo_catastro, derivada del nombre que desaparece.
--   · sus filas de accesos_comunidad, la tabla que Monica NO ha validado.
--
-- Las dos oportunidades NO se unen. Decision suya, y con razon: una comunidad
-- puede tener un SATE, un ascensor y una tramitacion de subvenciones abiertos a
-- la vez. Que el buzon exija "una sola oportunidad abierta" es un fallo del
-- buzon, no de los datos, y se cae solo cuando el documento cuelgue del ACCESO
-- (documento_accesos) en vez de la oportunidad.
--
-- Que nombre se queda: el que respeta el callejero (tipo de via, tilde,
-- municipio). Ganapanes se queda con CAMINO y no con VEREDA por la regla de
-- Monica: el titulo constitutivo usa el nombre municipal, Vereda es el de
-- Catastro. Y ahi el proyecto del SATE ya colgaba de la fila de Camino.
--
-- Nada queda colgado: el enganche establecido de un proyecto es
-- proyectos.comunidad_id, y es justo la columna que se repunta. Un proyecto no
-- apunta a direccion, ni a oportunidad, ni a acceso. Y varios proyectos por
-- comunidad ya era lo normal (20 comunidades los tienen, y 238 varias hojas).
--
-- Lo que SI cambia: hoy las 1.228 comunidades tienen exactamente una oportunidad
-- cada una, ninguna dos. Eso no es una regla del modelo, es como quedo la
-- importacion. Estas doce son las primeras comunidades con dos, que es como
-- Monica dice que tiene que ser. En los 5 casos con proyecto se pierde el saber
-- por eliminacion de que oportunidad salio el proyecto; la traza queda igual,
-- porque oportunidades.nombre guarda el nombre viejo de la comunidad.
--
-- PENDIENTE que no toco:
--   · Ganapanes tiene mal repartidos los accesos (2 en una fila, 5 en la otra,
--     para un edificio de tres portales). Ella confirma que solo se presupuesto
--     el SATE.
--   · proyecto -> hoja -> oportunidad sigue vacio (0 de 609, 0 de 1.539).

do $$
declare
  p record; id_queda uuid; id_va uuid; movidas int := 0;
begin
  for p in select * from (values
    ('AV ANGELES 6 LEGANES','AV ANGELES 6'),
    ('AV LOS PRINCIPES DE ESPAÑA 17 Y 19 COSLADA .','AV PRINCIPES ESPAÑA 17-19 COSLADA'),
    ('CAMINO DE VALDERRIBAS 110 MADRID','CAMINO VALDERRIBAS 110 MADRID'),
    ('CAMINO GANAPANES 31-33-35 MADRID','VEREDA DE GANAPANES 31-33-35 MADRID'),
    ('PASEO DOCTOR SEVERO OCHOA  2 FUENLABRADA','DOCTOR SEVERO OCHOA 2 FUENLABRADA'),
    ('HACIENDA DE PAVONES 117 MADRID','HACIENDA DE PAVONES NUM 117 MADRID'),
    ('LAS PALMAS 43 MOSTOLES','PALMAS 43 MOSTOLES'),
    ('MONCADA 101 MADRID','MONCADA 101'),
    ('NÉCTAR 31 PORTAL 1 - 2 - 3 MADRID','NECTAR 31 PORTAL 1,2 Y 3'),
    ('PLAZA DE LA ALBUFERA 11 FUENLABRADA','PLAZA ALBUFERA 11 FUENLABRADA'),
    ('PUERTO DEL MONASTERIO 20 MADRID','PUERTO MONASTERIO 20  MADRID'),
    ('TRAVESÍA DE SANTIAGO ALIO 2 MADRID','TRAVESIA SANTIAGO ALIO 2 MADRID')
  ) as t(queda, se_va) loop
    -- into STRICT: si un nombre no esta exacto, revienta en vez de no hacer nada.
    -- Un insert/update que no encuentra la fila no da error, y eso ya nos costo
    -- un acceso silenciosamente perdido (AV RECONQUISTA 6 PORTAL G).
    select id into strict id_queda from comunidades where nombre = p.queda;
    select id into strict id_va   from comunidades where nombre = p.se_va;

    update oportunidades               set comunidad_id = id_queda where comunidad_id = id_va;
    update hojas_encargo               set comunidad_id = id_queda where comunidad_id = id_va;
    update proyectos                   set comunidad_id = id_queda where comunidad_id = id_va;
    update comunidad_admin_responsable set comunidad_id = id_queda where comunidad_id = id_va;

    delete from comunidades where id = id_va;
    movidas := movidas + 1;
  end loop;
  raise notice 'fusionadas %', movidas;
end $$;

-- El punto suelto del final: errata, confirmado por Monica el 1-oct-2026.
-- Es el unico nombre de la lista que se corrige, y se corrige quitando, no
-- reescribiendo: la lista son 26 dias suyos y no se toca de otra manera.
update comunidades
   set nombre = 'AV LOS PRINCIPES DE ESPAÑA 17 Y 19 COSLADA'
 where nombre = 'AV LOS PRINCIPES DE ESPAÑA 17 Y 19 COSLADA .';
