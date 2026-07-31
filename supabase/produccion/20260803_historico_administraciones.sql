-- =============================================================================
-- Historico de administraciones: las que faltaban y las fechas que se sabian
--
-- Para que sirve esto, con las palabras de Monica: para entender por que unos
-- documentos llevan una firma y otros mas recientes otra, sin volverse loco ni
-- adivinar. No es arqueologia: es poder leer un expediente.
--
-- De los 13 cambios de administracion que ella reviso, 7 quedaron guardados al
-- migrar y 6 no. Aqui se cierran esos 6, y se llevan a su columna las cuatro
-- fechas que estaban escritas dentro del texto de la nota.
--
-- Tres administraciones anteriores no existian en la lista limpia porque
-- cerraron o se jubilaron. Se crean con activa = false: no son clientes, pero
-- sin ellas no hay a quien apuntar el historico.
--
-- Las fechas venian por meses ("Junio 2025"), asi que se guardan como dia 1. La
-- de Zoe Asesores era "hacia mayo-junio 2023": queda anotada como aproximada en
-- las notas, para que nadie la lea como exacta.
-- =============================================================================

begin;

-- ---------------------------------------------------------------------------
-- 1. Las tres casas que ya no existen. Solo sostienen el historico.
-- ---------------------------------------------------------------------------
insert into empresa (nombre_accesalia, activa, notas)
select v.nombre, false, v.nota
from (values
  ('CRS GESTION FIN', 'Administracion anterior de Velez Blanco 46. Ya no opera; se conserva para el historico. El nombre viene asi de la ficha, puede estar cortado.'),
  ('GESTION MAFER',   'Administracion anterior de Paseo San Antonio 3. Se jubilo; se conserva para el historico.'),
  ('ZOE ASESORES',    'Administracion anterior de Rio Guadalquivir 10. Cerro hacia mayo-junio de 2023; se conserva para el historico.')
) as v(nombre, nota)
where not exists (select 1 from empresa e where e.nombre_accesalia = v.nombre);

-- ---------------------------------------------------------------------------
-- 2. Las administraciones anteriores que faltaban
-- ---------------------------------------------------------------------------
-- Las comunidades se identifican por id y NO por nombre: el mismo edificio
-- esta escrito distinto en cada base ("ERAS 9 FUENLABRADA" aqui, "ERAS 9
-- FUENLABRADA - DR" en local). El id si es el mismo en las dos desde que se
-- alinearon. Las empresas si van por nombre, pero buscandolas en la MISMA base.
insert into comunidad_admin_responsable (comunidad_id, empresa_id, vigente, hasta, notas)
select v.comunidad::uuid, e.id, false, v.hasta, v.nota
from (values
  -- comunidad                              empresa anterior           hasta        nota
  ('4f539122-fb8e-415d-96e0-8297421fbf3d', 'CRS GESTION FIN',         null::date,  'Administracion anterior. Ya no opera.'),                                                  -- VELEZ BLANCO 46
  ('24d7ba90-a4bd-49d7-b091-7d9d03d160f6', 'GESTION MAFER',           null::date,  'Administracion anterior. Mafer se jubilo; el encargo paso a Munoz y Pando.'),              -- PASEO SAN ANTONIO 3
  ('19e5257a-224f-4bf9-b5ee-fdcb6a6532cf', 'ZOE ASESORES',            '2023-06-01','Administracion anterior. Fecha APROXIMADA: la ficha dice "cerraba hacia mayo-junio de 2023".'), -- RIO GUADALQUIVIR 10
  ('12cd554d-b2f2-4fa7-9bce-af73f14f5c43', 'ADMINISTRACIONES ALCORA', '2024-05-01','Administracion anterior (Valentin). El cambio estaba escrito en las notas de la ficha, no en el bloque de administrador.') -- ESCRIBANOS 5
) as v(comunidad, empresa, hasta, nota)
join empresa e on e.nombre_accesalia = v.empresa
-- se puede volver a ejecutar sin duplicar
where not exists (
  select 1 from comunidad_admin_responsable x
   where x.comunidad_id = v.comunidad::uuid and x.empresa_id = e.id and not x.vigente);

-- ---------------------------------------------------------------------------
-- 3. Alfonso XII 10: no es que falte el historico, es que la vigente es falsa.
--    Angeles Montes dejo de administrarla en junio de 2024 y NO se sabe quien
--    la lleva ahora: el encargo llego por una contrata que no da el dato.
--    Asi que se cierra y la comunidad se queda sin administracion, que es la
--    verdad. Vacio no es un fallo: es lo que hay.
-- ---------------------------------------------------------------------------
update comunidad_admin_responsable car
   set vigente = false,
       hasta = '2024-06-01',
       notas = 'Angeles Montes dejo de administrarla en junio de 2024. No se sabe quien la lleva: el encargo llego por una contrata que no facilita el dato.'
 where car.comunidad_id = 'b5df378f-5f22-4505-a46a-abed6415c252'   -- ALFONSO XII 10 MOSTOLES
   and car.vigente;

-- ---------------------------------------------------------------------------
-- 4. Las fechas que se sabian, a su columna. Estaban dentro del texto.
--
--    Solo estas dos: son las unicas que la ficha dice con todas las letras
--    ("Junio 2025 cambian de administrador", "Mayo 2024"). A Rio Guadalquivir
--    NO se le pone fecha de inicio: de Zoe sabemos cuando cerro, pero deducir
--    de ahi cuando empezo MAS24 seria inventarselo.
-- ---------------------------------------------------------------------------
update comunidad_admin_responsable car
   set desde = v.desde
  from (values
  ('6dc61222-c376-4c7d-a75c-e72775f920d1', '2025-06-01'::date),   -- ERAS 9 FUENLABRADA
  ('12cd554d-b2f2-4fa7-9bce-af73f14f5c43', '2024-05-01'::date)    -- ESCRIBANOS 5 MADRID
) as v(comunidad, desde)
 where car.comunidad_id = v.comunidad::uuid and car.vigente;

-- ---------------------------------------------------------------------------
-- 5. Comprobacion: ninguna comunidad puede tener dos casas vigentes a la vez
-- ---------------------------------------------------------------------------
do $$
declare v_mal bigint;
begin
  select count(*) into v_mal from (
    select comunidad_id from comunidad_admin_responsable
     where vigente group by comunidad_id having count(distinct empresa_id) > 1) t;
  if v_mal > 0 then
    raise exception 'Hay % comunidades con dos administraciones vigentes', v_mal;
  end if;
end $$;

commit;

select vigente, count(*) as filas, count(desde) as con_fecha_inicio, count(hasta) as con_fecha_fin
  from comunidad_admin_responsable group by 1 order by 1;
