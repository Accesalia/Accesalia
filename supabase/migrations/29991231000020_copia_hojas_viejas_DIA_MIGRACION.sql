-- LA COPIA DE LAS HOJAS VIEJAS A LAS NUEVAS (Monica, 25-oct-2026: «genera tu la migracion»). SE APLICA EL DIA DE LA
-- MIGRACION, en este orden:
--   1. 29991231000000_facturacion_hojas_nuevas_ANTES_DE_COPIAR
--   2. ESTA
--   3. 29991231000050_facturacion_hojas_nuevas_DESPUES_DE_COPIAR
--   4. 29991231000100 … 000500 (rama comercial-hojas-nuevas)
--
-- REGLA: MIGRAR ES COPIAR. Lo que ya estaba extraido, revisado y cuadrado no se vuelve a interpretar:
--   · cada concepto (conceptos_hoja) pasa a UNA linea nueva (he_lineas_compromisos) con su bloque, si se cobra o va
--     incluido, si sale en el papel, su importe, su %, su texto y su tipo, tal cual;
--   · las fichas de facturacion (lineas_facturacion), sus hitos, sus facturas y sus cobros NO se tocan: cada ficha solo
--     pasa a mirar a su linea nueva (he_linea_id) o, si no salio de un concepto, a su version (he_version_id);
--   · al final se COMPRUEBA todo (numero de lineas, importes, % y fichas, hoja a hoja). Si sale UNA diferencia, la
--     copia entera se deshace y no se aplica nada.
--
-- Lo unico que la copia AÑADE es la ESTRUCTURA del arbol (las cabeceras del generador, sin importe: «Proyecto»,
-- «Subvencion», «Direccion facultativa»…), porque lo viejo era una lista. De que cuelga cada linea sale, por este orden:
--   1. EL ORDEN DEL PAPEL, de la revision de las firmadas (revision_firmadas_lineas.orden, 829 hojas releidas del PDF y
--      revisadas por Monica): lo incluido va con la linea con precio que tiene encima en el papel;
--   2. si la hoja solo tiene un proyecto (o una subvencion), todo lo suyo va con el;
--   3. si no hay orden del papel y hay dos o mas, la linea queda arriba (sin padre) y la hoja va a la lista de dudas.
-- Las reglas de cada paquete son las del generador (docs/figma/hoja-encargo-arbol.md):
--   PROYECTO: cabecera (con su tipo) → la redaccion con su precio, toma de datos, visado, licencias, DF (cabecera con
--     inicio, DF y fin de obra), 3 presupuestos, financiacion, CAES y CSS (cada uno con su cabecera).
--   SUBVENCION: cabecera (con su tipo) → la tramitacion (el %), la DOCUMENTACION TECNICA (cabecera con su precio) con
--     IEE, libro del edificio y CEE debajo, y CAES si no hay proyecto.
--     · La subvencion con importe y % en un solo concepto se parte en dos (decision 5 de Monica): documentacion tecnica
--       con el importe, tramitacion con el %. Su ficha tambien: el hito fijo se queda, los de a exito (y sus
--       concesiones) pasan a una ficha nueva de la tramitacion, con sus facturas.
--     · La «Documentacion tecnica anexa» que en lo viejo llevaba el bloque de tramitacion con su importe (junto a otra
--       con el %), es la documentacion tecnica: pasa con ese bloque, como en el generador.
--   CONSULTA URBANISTICA: cabecera → su linea, y toma de datos, visado y licencias si no hay proyecto.
--   LO DEMAS (memoria, informe, pericial, IEE o CSS sueltos…): con su cabecera arriba, como lo suelto del generador.
--   Sin bloque: OTRO con su texto.
-- Los portales de cada linea: los de su tipo en la hoja vieja (actuacion_accesos); sin tipo, todos los de la hoja; si la
-- hoja no tenia, los de la opp.
-- La forma de pago de cada linea que se cobra: la de sus hitos si casan exactos con una de las formas de pago (el
-- trabajo ya hecho, Monica 25-oct); si no, el texto que tenia el concepto, escrito a mano.
--
-- Las versiones, su recorrido, el PDF firmado y las sustituciones, segun las decisiones del repaso campo a campo
-- (docs/hojas-de-encargo/lectores-tablas-viejas.md) y las notas de Monica en el Excel
-- (docs/mapa_datos/migracion_hoja_campo_a_campo_25oct.xlsx):
--   · comercial y quien la genero: antes de mayo de 2025, Daniel; despues, el captador de la opp;
--   · el recorrido: enviada, firmada (con la fecha de firma de la hoja; si no la tiene, la de la revision), ok del
--     comercial («Migrada») y, si estaba metida en produccion, ok de administracion con su fecha, quien y sus areas;
--   · archivada → anulada con «se archivo por falta de datos en la migracion del historico»; anulada sin motivo →
--     «migrada sin motivo»; la version que se envio despues de la firmada y no se firmo → no firmada, con su nota;
--   · a las notas de la version: el tipo de documento (pedido, nota de responsabilidad, contrato), el codigo anterior,
--     la descripcion de Monday, el responsable y el motivo sin firma, el emisor de las no firmadas, la forma de pago y
--     las notas de la version, y los tipos de la hoja vieja.
--
-- Las tablas migr_* son DE VIDA CORTA (decision 3): para comprobar; se borran con las tablas viejas.

create table public.migr_he_versiones (
  version_vieja uuid primary key,
  hoja_vieja uuid not null,
  nueva uuid not null unique default gen_random_uuid(),
  referencia boolean not null            -- la version que vale de la hoja: la firmada, o la ultima
);
create table public.migr_he_lineas (
  concepto uuid not null,
  papel text not null default 'principal', -- principal | exito (la tramitacion con % de una subvencion partida)
  nueva uuid not null unique,
  primary key (concepto, papel)
);
create table public.migr_he_dudas (
  id bigserial primary key,
  hoja_vieja uuid,
  version_vieja uuid,
  concepto uuid,
  que text not null
);
comment on table public.migr_he_versiones is 'VIDA CORTA (migracion 25-oct-2026): version vieja → he_versiones_hoja. Se borra con las tablas viejas.';
comment on table public.migr_he_lineas is 'VIDA CORTA (migracion 25-oct-2026): concepto viejo → he_lineas_compromisos. Se borra con las tablas viejas.';
comment on table public.migr_he_dudas is 'VIDA CORTA (migracion 25-oct-2026): lo que la copia no puede decidir sola, para Monica. Se borra con las tablas viejas.';

do $copia$
declare
  v record; k record; m record; rz record;
  fase text; nota text; t timestamptz; doc uuid; idd uuid; tipo_doc uuid;
  daniel uuid; daniel_eq uuid;
  cab uuid; sub uuid; dfcab uuid; dtcab uuid; linea uuid; padre uuid;
  hay int;
begin
  select id into tipo_doc from public.tipos_documento where nombre = 'Hoja de encargo';
  if tipo_doc is null then raise exception 'Falta el tipo de documento «Hoja de encargo»'; end if;
  select id, equipo_id into daniel, daniel_eq from public.comerciales where nombre = 'Daniel' and apellidos = 'de Soto';
  if daniel is null then raise exception 'Falta Daniel de Soto en comerciales'; end if;

  -- ============================================================ 1 · LAS VERSIONES

  -- la correspondencia (la de referencia: la firmada, o la de numero mas alto)
  insert into public.migr_he_versiones (version_vieja, hoja_vieja, referencia)
  select vv.id, vv.hoja_encargo_id,
         vv.id = coalesce(hh.version_firmada_id,
                          (select x.id from public.versiones_hoja x where x.hoja_encargo_id = hh.id order by x.numero_version desc limit 1))
    from public.versiones_hoja vv join public.hojas_encargo hh on hh.id = vv.hoja_encargo_id;

  for v in
    select vv.*, mv.nueva, mv.referencia, hh.estado as h_estado, hh.numero_hoja, hh.oportunidad_id, hh.pagador_tipo, hh.comunidad_id,
           hh.pagador_contrata_id, hh.pagador_persona_id, hh.emisor, hh.fecha_firma, hh.fecha_estado, hh.fecha_creacion, hh.descripcion as h_desc,
           hh.tipo_documento, hh.responsable_id, hh.motivo_sin_firma, hh.codigo_anterior, hh.codigos_contrata, hh.version_firmada_id, hh.generada_por as h_generada,
           (select max(x.numero_version) from public.versiones_hoja x where x.hoja_encargo_id = hh.id) as ultima,
           (select x.numero_version from public.versiones_hoja x where x.id = hh.version_firmada_id) as n_firmada,
           (select rf.fecha_firma from public.revision_firmadas rf where rf.hoja_encargo_id = hh.id and rf.fecha_firma is not null limit 1) as fecha_firma_rev,
           o.comercial_captador_id
      from public.versiones_hoja vv
      join public.hojas_encargo hh on hh.id = vv.hoja_encargo_id
      join public.migr_he_versiones mv on mv.version_vieja = vv.id
      left join public.oportunidades o on o.id = hh.oportunidad_id
  loop
    -- la fase
    if not v.referencia then
      fase := case when v.n_firmada is not null and v.numero_version > v.n_firmada then 'no_firmada' else 'sustituida' end;
    elsif exists (select 1 from public.sustituciones_hoja s where s.hoja_antigua_id = v.hoja_encargo_id) and v.h_estado <> 'anulada' then
      fase := 'sustituida';
    else
      fase := case v.h_estado
        when 'borrador' then 'borrador'
        when 'enviada_comunidad' then 'enviada'
        when 'devuelta_firmada' then
          case when exists (select 1 from public.movimientos_hoja mm where mm.hoja_encargo_id = v.hoja_encargo_id and mm.tipo = 'metida_produccion')
               then 'ok_administracion' else 'ok_comercial' end
        when 'anulada' then 'anulada'
        when 'archivada' then 'anulada'
      end;
      if fase is null then raise exception 'Estado viejo sin traduccion: % (%)', v.h_estado, v.numero_hoja; end if;
    end if;

    -- las notas: lo de la hoja vieja que no tiene campo (decision 2 y notas del Excel)
    nota := concat_ws(E'\n',
      'Migrada de la hoja vieja' || case when v.ultima > 1 then ' (versión ' || v.numero_version || ' de ' || v.ultima || ')' else '' end || '.',
      case v.tipo_documento when 'pedido' then 'En origen era un pedido.' when 'nota_responsabilidad' then 'En origen era una nota de responsabilidad.'
                            when 'contrato' then 'En origen era un contrato.' end,
      case when nullif(btrim(v.codigo_anterior), '') is not null then 'Código anterior: ' || btrim(v.codigo_anterior) || '.' end,
      case when nullif(btrim(v.h_desc), '') is not null then 'Descripción: ' || btrim(v.h_desc) end,
      case when v.responsable_id is not null then 'Responsable: ' || coalesce((select nombre from public.equipo where id = v.responsable_id), '?') || '.' end,
      case when nullif(btrim(v.motivo_sin_firma), '') is not null then 'Motivo: ' || btrim(v.motivo_sin_firma) end,
      case when v.h_estado <> 'devuelta_firmada' then 'Emisor: ' || case v.emisor when 'daniel_autonomo' then 'Daniel (autónomo)' else 'Accesalia' end || '.' end,
      case when v.h_generada is not null then 'Generada por: ' || replace(v.h_generada, '_', ' ') || '.' end,
      case when nullif(btrim(v.motivo_cambio), '') is not null then 'Motivo del cambio de versión: ' || btrim(v.motivo_cambio) end,
      case when nullif(btrim(v.forma_pago), '') is not null then 'Forma de pago de la hoja: ' || btrim(v.forma_pago) end,
      case when nullif(btrim(v.importes_forma_pago_texto), '') is not null then 'Importes de la forma de pago: ' || btrim(v.importes_forma_pago_texto) end,
      case when nullif(btrim(v.notas), '') is not null then 'Notas: ' || btrim(v.notas) end,
      (select 'Tipos de la hoja vieja: ' || string_agg(tp.nombre, ', ' order by a.orden) || '.'
         from public.actuaciones_hoja a join public.tipos_proyecto tp on tp.id = a.tipo_proyecto_id
        where a.hoja_encargo_id = v.hoja_encargo_id)
    );

    insert into public.he_versiones_hoja (id, creado_en, codigo_he, numero_version, oportunidad_id, pagador_tipo, pagador_comunidad_id,
      pagador_contrata_id, pagador_persona_id, comercial_id, generada_por, fecha_emision, estado, pdf, notas, papel_html, codigos_contrata)
    values (v.nueva, v.creado_en, v.numero_hoja, v.numero_version, v.oportunidad_id, v.pagador_tipo,
      case when v.pagador_tipo = 'comunidad' then v.comunidad_id end,
      case when v.pagador_tipo = 'contrata' then v.pagador_contrata_id end,
      case when v.pagador_tipo = 'persona' then v.pagador_persona_id end,
      -- antes de mayo de 2025 solo habia un comercial, Daniel; despues, el captador de la opp (Monica, Excel 25-oct)
      case when v.fecha_creacion < date '2025-05-01' then daniel else v.comercial_captador_id end,
      case when v.fecha_creacion < date '2025-05-01' then daniel_eq else (select c.equipo_id from public.comerciales c where c.id = v.comercial_captador_id) end,
      coalesce(v.fecha_generada, v.fecha_creacion), fase, v.url_pdf_hoja, nota, v.contenido_html,
      case when v.referencia then coalesce(v.codigos_contrata, '{}'::jsonb) else '{}'::jsonb end);

    -- el recorrido
    if fase = 'borrador' then
      insert into public.he_estados_hoja (version_id, estado, fecha, nota) values (v.nueva, 'borrador', v.creado_en, 'Migrada');
    end if;
    if v.fecha_enviada is not null then
      insert into public.he_estados_hoja (version_id, estado, fecha, nota)
      values (v.nueva, 'enviada', (v.fecha_enviada + time '12:00') at time zone 'Europe/Madrid', 'Migrada');
    end if;
    if v.referencia and v.h_estado = 'devuelta_firmada' then
      if v.fecha_firma is null and v.fecha_firma_rev is null then
        insert into public.migr_he_dudas (hoja_vieja, version_vieja, que)
        values (v.hoja_encargo_id, v.id, 'Firmada sin fecha de firma (ni en la hoja ni en la revisión): se pone la del último cambio de estado, ' ||
                coalesce(to_char(v.fecha_estado, 'DD/MM/YYYY'), '?') || '.');
      end if;
      t := (coalesce(v.fecha_firma, v.fecha_firma_rev, v.fecha_estado::date, v.fecha_generada, v.creado_en::date) + time '12:00') at time zone 'Europe/Madrid';
      insert into public.he_estados_hoja (version_id, estado, fecha, nota) values (v.nueva, 'firmada_recibida', t, 'Migrada');
      insert into public.he_estados_hoja (version_id, estado, fecha, nota) values (v.nueva, 'ok_comercial', t, 'Migrada');
      for m in select * from public.movimientos_hoja mm where mm.hoja_encargo_id = v.hoja_encargo_id and mm.tipo = 'metida_produccion' order by mm.en loop
        insert into public.he_estados_hoja (version_id, estado, fecha, persona_id, nota, lado, areas)
        values (v.nueva, 'ok_administracion', m.en, m.por, m.motivo, m.lado, m.areas);
      end loop;
    end if;
    if fase = 'anulada' then
      insert into public.he_estados_hoja (version_id, estado, fecha, nota)
      values (v.nueva, 'anulada', v.fecha_estado,
        case when v.h_estado = 'archivada' then 'Se archivó por falta de datos en la migración del histórico.'
             else coalesce(nullif(btrim(v.motivo_sin_firma), ''), 'Migrada sin motivo.') end);
    end if;
    if fase = 'no_firmada' then
      insert into public.he_estados_hoja (version_id, estado, fecha, nota)
      values (v.nueva, 'no_firmada', coalesce((v.fecha_enviada + time '12:00') at time zone 'Europe/Madrid', v.creado_en),
              'Versión posterior a la firmada que no se firmó: la firmada es la versión ' || v.n_firmada || '.');
    end if;

    -- el PDF firmado (o los PDF): al archivo de la opp
    doc := null;
    for k in select u, ord from unnest(v.pdfs_firmados) with ordinality as x(u, ord) loop
      insert into public.documentos (oportunidad_id, comunidad_id, tipo_documento_id, backend, storage_ref, url_fichero, naturaleza, estado_firma,
        nombre, archivado_en, justificacion, grupo_id)
      values (v.oportunidad_id, v.comunidad_id, tipo_doc,
        case when k.u ~ '^almacen:documentos-comerciales/' then 'supabase' else 'enlace' end,
        case when k.u ~ '^almacen:documentos-comerciales/' then regexp_replace(k.u, '^almacen:documentos-comerciales/', '') end,
        case when k.u ~ '^almacen:documentos-comerciales/' then null else k.u end,
        'migrado', 'devuelto_firmado',
        'Hoja de encargo firmada ' || coalesce(v.numero_hoja, '') || case when v.ultima > 1 then ' v' || v.numero_version else '' end
          || case when k.ord > 1 then ' (' || k.ord || ')' else '' end || '.pdf',
        now(), 'Migrada de la hoja vieja (su PDF firmado).', gen_random_uuid())
      returning id into idd;
      if doc is null then doc := idd; end if;
    end loop;
    if doc is not null and v.referencia and v.h_estado = 'devuelta_firmada' then
      update public.he_versiones_hoja set firmada_documento_id = doc where id = v.nueva;
    end if;
  end loop;

  -- las sustituciones: cada version anterior → la siguiente; la hoja sustituida → la de referencia de la nueva
  for v in select mv.nueva, vv.hoja_encargo_id, vv.numero_version from public.migr_he_versiones mv join public.versiones_hoja vv on vv.id = mv.version_vieja
            join public.he_versiones_hoja n on n.id = mv.nueva where n.estado = 'sustituida' and not mv.referencia loop
    select mv2.nueva, vv2.numero_version, vv2.creado_en into m
      from public.versiones_hoja vv2 join public.migr_he_versiones mv2 on mv2.version_vieja = vv2.id
     where vv2.hoja_encargo_id = v.hoja_encargo_id and vv2.numero_version > v.numero_version
     order by vv2.numero_version limit 1;
    update public.he_versiones_hoja set sustituida_por = m.nueva where id = v.nueva;
    insert into public.he_estados_hoja (version_id, estado, fecha, nota)
    values (v.nueva, 'sustituida', m.creado_en, 'Sustituida por la versión ' || m.numero_version || '.');
  end loop;
  for v in select s.*, mv.nueva as vieja_nueva, n.estado,
                  (select mv2.nueva from public.migr_he_versiones mv2 where mv2.hoja_vieja = s.hoja_nueva_id and mv2.referencia) as nueva_ref,
                  (select numero_hoja from public.hojas_encargo where id = s.hoja_nueva_id) as numero_nueva
             from public.sustituciones_hoja s
             join public.migr_he_versiones mv on mv.hoja_vieja = s.hoja_antigua_id and mv.referencia
             join public.he_versiones_hoja n on n.id = mv.nueva loop
    update public.he_versiones_hoja set sustituida_por = v.nueva_ref where id = v.vieja_nueva;
    if v.estado = 'sustituida' then
      insert into public.he_estados_hoja (version_id, estado, fecha, nota)
      values (v.vieja_nueva, 'sustituida', v.creado_en, concat_ws(' ', 'Sustituida por la ' || coalesce(v.numero_nueva, 'otra hoja') || '.', nullif(btrim(v.nota), '')));
    end if;
  end loop;

  -- ============================================================ 2 · LAS LINEAS, EN ARBOL

  -- cada concepto con su clase y su sitio en el papel
  create temp table _c on commit drop as
  select c.id, c.version_hoja_id as vv, mv.nueva as vn, mv.hoja_vieja as hv, mv.referencia as ref,
         coalesce(b.codigo, 'OTRO') as cod, coalesce(c.bloque_id, (select id from public.bloques where codigo = 'OTRO')) as bloque_id,
         c.desglose, c.importe, c.porcentaje, c.descripcion, c.forma_pago, c.tipo_proyecto_id, c.comision_importe, c.comision_acuerdo_id, c.creado_en,
         (select l.orden from public.revision_firmadas_lineas l join public.revision_firmadas rf on rf.id = l.firmada_id
           where l.concepto_hoja_id = c.id and rf.hoja_encargo_id = mv.hoja_vieja and mv.referencia order by l.orden limit 1) as ord,
         null::text as grupo, null::uuid as raiz
    from public.conceptos_hoja c
    join public.migr_he_versiones mv on mv.version_vieja = c.version_hoja_id
    left join public.bloques b on b.id = c.bloque_id;
  -- el orden del papel solo vale si lo tienen todas las lineas de la version
  create temp table _vo on commit drop as select vv, bool_and(ord is not null) as ordenada from _c group by vv;

  -- LAS RAICES (de que cuelga lo demas): proyecto, subvencion, consulta y lo suelto
  create temp table _r (id uuid primary key default gen_random_uuid(), vv uuid not null, vn uuid not null, hv uuid not null, grupo text not null,
                        concepto uuid, ord int, creado_en timestamptz) on commit drop;
  -- proyecto: la redaccion con importe fijo; si no hay, la que se cobra con %; si no, una cabecera para lo incluido
  insert into _r (vv, vn, hv, grupo, concepto, ord, creado_en)
  select vv, vn, hv, 'P', id, ord, creado_en from _c
   where cod in ('REDACCION PROYECTO', 'SATE CON CESION DE CAES', 'SATE + ASCENSOR CON CESION DE CAES') and desglose = 'se_cobra' and importe is not null;
  insert into _r (vv, vn, hv, grupo, concepto, ord, creado_en)
  select distinct on (vv) vv, vn, hv, 'P', id, ord, creado_en from _c c
   where cod in ('REDACCION PROYECTO', 'SATE CON CESION DE CAES', 'SATE + ASCENSOR CON CESION DE CAES') and desglose = 'se_cobra'
     and not exists (select 1 from _r r where r.vv = c.vv and r.grupo = 'P') order by vv, ord nulls last, creado_en, id;
  insert into _r (vv, vn, hv, grupo)
  select distinct vv, vn, hv, 'P' from _c c
   where cod in ('REDACCION PROYECTO', 'SATE CON CESION DE CAES', 'SATE + ASCENSOR CON CESION DE CAES')
     and not exists (select 1 from _r r where r.vv = c.vv and r.grupo = 'P');
  -- subvencion: la tramitacion que se cobra con %; si no hay, la que se cobra; si no, una cabecera para lo incluido
  insert into _r (vv, vn, hv, grupo, concepto, ord, creado_en)
  select vv, vn, hv, 'S', id, ord, creado_en from _c where cod = 'TRAMITACION SUBVENCIONES' and desglose = 'se_cobra' and porcentaje is not null;
  insert into _r (vv, vn, hv, grupo, concepto, ord, creado_en)
  select vv, vn, hv, 'S', id, ord, creado_en from _c c
   where cod = 'TRAMITACION SUBVENCIONES' and desglose = 'se_cobra' and not exists (select 1 from _r r where r.vv = c.vv and r.grupo = 'S');
  insert into _r (vv, vn, hv, grupo)
  select distinct vv, vn, hv, 'S' from _c c
   where cod in ('TRAMITACION SUBVENCIONES', 'DOCUMENTACION TECNICA SUBVENCIONES') and not exists (select 1 from _r r where r.vv = c.vv and r.grupo = 'S');
  -- consulta urbanistica
  insert into _r (vv, vn, hv, grupo, concepto, ord, creado_en)
  select vv, vn, hv, 'C', id, ord, creado_en from _c where cod = 'CONSULTA URBANISTICA';
  update _c c set raiz = r.id, grupo = r.grupo from _r r where r.concepto = c.id;

  -- LO DEMAS: a que grupo va cada concepto
  update _c c set grupo = case
      when c.cod in ('REDACCION PROYECTO', 'SATE CON CESION DE CAES', 'SATE + ASCENSOR CON CESION DE CAES') then 'P'
      when c.cod in ('TOMA DE DATOS Y MODELADO 3D', 'VISADO', 'TRAMITACION LICENCIAS')
        then case when exists (select 1 from _r r where r.vv = c.vv and r.grupo = 'P') then 'P'
                  when exists (select 1 from _r r where r.vv = c.vv and r.grupo = 'C') then 'C' else 'suelto' end
      when c.cod in ('DF', 'INICIO DE OBRA', 'CERTIFICADO FIN DE OBRA', 'TRAMITACION 3 PRESUPUESTOS', 'SOLICITUD DE FINANCIACION', 'CSS')
        then case when exists (select 1 from _r r where r.vv = c.vv and r.grupo = 'P') then 'P' else 'suelto' end
      when c.cod = 'GESTION DE CAES'
        then case when exists (select 1 from _r r where r.vv = c.vv and r.grupo = 'P') then 'P'
                  when exists (select 1 from _r r where r.vv = c.vv and r.grupo = 'S') then 'S' else 'suelto' end
      when c.cod in ('TRAMITACION SUBVENCIONES', 'DOCUMENTACION TECNICA SUBVENCIONES') then 'S'
      when c.cod in ('IEE', 'LEE', 'CEE')
        then case when exists (select 1 from _r r where r.vv = c.vv and r.grupo = 'S') then 'S' else 'suelto' end
      else 'suelto' end
   where c.raiz is null;

  -- de que raiz de su grupo: la unica; con varias, la de encima en el papel (o la primera de debajo); sin papel, duda
  update _c c set raiz = (select r.id from _r r where r.vv = c.vv and r.grupo = c.grupo)
   where c.raiz is null and c.grupo in ('P', 'S', 'C') and (select count(*) from _r r where r.vv = c.vv and r.grupo = c.grupo) = 1;
  update _c c set raiz = coalesce(
      (select r.id from _r r where r.vv = c.vv and r.grupo = c.grupo and r.ord < c.ord order by r.ord desc limit 1),
      (select r.id from _r r where r.vv = c.vv and r.grupo = c.grupo and r.ord > c.ord order by r.ord limit 1))
   where c.raiz is null and c.grupo in ('P', 'S', 'C') and (select ordenada from _vo o where o.vv = c.vv);
  insert into public.migr_he_dudas (hoja_vieja, version_vieja, concepto, que)
  select c.hv, c.vv, c.id, 'Hay ' || (select count(*) from _r r where r.vv = c.vv and r.grupo = c.grupo) || ' ' ||
         case c.grupo when 'P' then 'proyectos' when 'S' then 'subvenciones' else 'consultas' end ||
         ' con precio y el papel no dice de cuál es «' || coalesce(nullif(btrim(c.descripcion), ''), c.cod) || '»: queda arriba, sin padre.'
    from _c c where c.raiz is null and c.grupo in ('P', 'S', 'C');
  update _c set grupo = 'suelto' where raiz is null and grupo in ('P', 'S', 'C');

  -- LAS FILAS, raiz a raiz (las del papel en su orden)
  create temp table _cab (raiz uuid, cod text, id uuid, primary key (raiz, cod)) on commit drop;
  for rz in
    select r.*, (select c.tipo_proyecto_id from _c c join public.tipos_proyecto tp on tp.id = c.tipo_proyecto_id
                  where c.id = r.concepto and tp.naturaleza = 'proyecto') as tipo_p,
           (select c.tipo_proyecto_id from _c c join public.tipos_proyecto tp on tp.id = c.tipo_proyecto_id
                  where c.id = r.concepto and tp.clave in ('accesibilidad', 'eficiencia_energetica')) as tipo_s,
           (select count(*) from _r r2 where r2.vv = r.vv and r2.grupo = 'P') as n_p
      from _r r order by r.vv, r.ord nulls last, case r.grupo when 'P' then 1 when 'S' then 2 else 3 end, r.creado_en nulls last
  loop
    if rz.grupo = 'P' then
      -- su tipo: el del concepto; si no, con un solo proyecto, el unico tipo de proyecto de la hoja vieja
      insert into public.he_lineas_compromisos (version_id, bloque_id, desglose_id, en_papel, se_cobra)
      values (rz.vn, (select id from public.bloques where codigo = 'REDACCION PROYECTO'),
        coalesce(rz.tipo_p,
          case when rz.n_p = 1 then (select min(a.tipo_proyecto_id::text)::uuid from public.actuaciones_hoja a join public.tipos_proyecto tp on tp.id = a.tipo_proyecto_id
                                      where a.hoja_encargo_id = rz.hv and tp.naturaleza = 'proyecto'
                                        and not exists (select 1 from public.tipos_proyecto hijo join public.actuaciones_hoja a2 on a2.tipo_proyecto_id = hijo.id
                                                         where a2.hoja_encargo_id = rz.hv and hijo.parent_id = tp.id)
                                     having count(*) = 1) end),
        true, false)
      returning id into cab;
    elsif rz.grupo = 'S' then
      insert into public.he_lineas_compromisos (version_id, bloque_id, desglose_id, en_papel, se_cobra)
      values (rz.vn, (select id from public.bloques where codigo = 'TRAMITACION SUBVENCIONES'), rz.tipo_s, true, false)
      returning id into cab;
    else
      insert into public.he_lineas_compromisos (version_id, bloque_id, en_papel, se_cobra)
      values (rz.vn, (select id from public.bloques where codigo = 'CONSULTA URBANISTICA'), true, false)
      returning id into cab;
    end if;
    insert into _cab values (rz.id, '#', cab);
    dfcab := null; dtcab := null;

    -- la documentacion tecnica con precio va primero, para colgar de ella IEE, libro y CEE
    for k in
      select c.* from _c c where c.raiz = rz.id
       order by (c.grupo = 'S' and (c.cod = 'DOCUMENTACION TECNICA SUBVENCIONES'
                 or (c.cod = 'TRAMITACION SUBVENCIONES' and c.desglose = 'se_cobra' and c.importe is not null))) desc,
                c.id = rz.concepto desc, c.ord nulls last, c.creado_en, c.id
    loop
      -- la subvencion con importe y %: dos lineas (decision 5)
      if k.cod = 'TRAMITACION SUBVENCIONES' and k.desglose = 'se_cobra' and k.importe is not null and k.porcentaje is not null then
        if dtcab is null then
          insert into public.he_lineas_compromisos (version_id, padre_id, bloque_id, en_papel, se_cobra, importe, forma_pago_propia, texto, desglose_id)
          values (k.vn, cab, (select id from public.bloques where codigo = 'DOCUMENTACION TECNICA SUBVENCIONES'), true, true, k.importe,
                  nullif(btrim(k.forma_pago), ''), nullif(btrim(k.descripcion), ''), k.tipo_proyecto_id)
          returning id into dtcab;
          insert into public.migr_he_lineas (concepto, papel, nueva) values (k.id, 'principal', dtcab);
        else
          insert into public.he_lineas_compromisos (version_id, padre_id, bloque_id, en_papel, se_cobra, importe, forma_pago_propia, texto, desglose_id)
          values (k.vn, cab, (select id from public.bloques where codigo = 'DOCUMENTACION TECNICA SUBVENCIONES'), true, true, k.importe,
                  nullif(btrim(k.forma_pago), ''), nullif(btrim(k.descripcion), ''), k.tipo_proyecto_id)
          returning id into linea;
          insert into public.migr_he_lineas (concepto, papel, nueva) values (k.id, 'principal', linea);
        end if;
        insert into public.he_lineas_compromisos (version_id, padre_id, bloque_id, en_papel, se_cobra, porcentaje, forma_pago_propia, desglose_id)
        values (k.vn, cab, k.bloque_id, true, true, k.porcentaje, nullif(btrim(k.forma_pago), ''), k.tipo_proyecto_id)
        returning id into linea;
        insert into public.migr_he_lineas (concepto, papel, nueva) values (k.id, 'exito', linea);
        continue;
      end if;

      -- donde cuelga
      if k.grupo = 'S' and (k.cod = 'DOCUMENTACION TECNICA SUBVENCIONES'
           or (k.cod = 'TRAMITACION SUBVENCIONES' and k.desglose = 'se_cobra' and k.importe is not null and k.porcentaje is null
               and k.id <> coalesce(rz.concepto, '00000000-0000-0000-0000-000000000000'::uuid)
               and exists (select 1 from _c c2 where c2.raiz = rz.id and c2.cod = 'TRAMITACION SUBVENCIONES' and c2.porcentaje is not null)
               and k.descripcion ~* 'documentaci')) then
        -- la documentacion tecnica (con su precio): es la cabecera de IEE, libro y CEE
        insert into public.he_lineas_compromisos (version_id, padre_id, bloque_id, desglose_id, en_papel, se_cobra, importe, porcentaje,
          forma_pago_propia, texto, comision_importe, comision_acuerdo_id)
        values (k.vn, cab, (select id from public.bloques where codigo = 'DOCUMENTACION TECNICA SUBVENCIONES'), k.tipo_proyecto_id,
          k.desglose <> 'no_aparece', k.desglose = 'se_cobra',
          case when k.desglose = 'se_cobra' then k.importe end, case when k.desglose = 'se_cobra' then k.porcentaje end,
          case when k.desglose = 'se_cobra' then nullif(btrim(k.forma_pago), '') end,
          nullif(btrim(k.descripcion), ''), k.comision_importe, k.comision_acuerdo_id)
        returning id into linea;
        insert into public.migr_he_lineas (concepto, papel, nueva) values (k.id, 'principal', linea);
        if dtcab is null then dtcab := linea; end if;
        continue;
      end if;

      if k.cod in ('DF', 'INICIO DE OBRA', 'CERTIFICADO FIN DE OBRA') then
        if dfcab is null then
          insert into public.he_lineas_compromisos (version_id, padre_id, bloque_id, en_papel, se_cobra)
          values (k.vn, cab, (select id from public.bloques where codigo = 'DF'), true, false) returning id into dfcab;
        end if;
        padre := dfcab;
      elsif k.cod in ('IEE', 'LEE', 'CEE') and k.grupo = 'S' then
        if dtcab is null then
          insert into public.he_lineas_compromisos (version_id, padre_id, bloque_id, en_papel, se_cobra)
          values (k.vn, cab, (select id from public.bloques where codigo = 'DOCUMENTACION TECNICA SUBVENCIONES'), true, false) returning id into dtcab;
        end if;
        padre := dtcab;
      elsif k.cod in ('TRAMITACION 3 PRESUPUESTOS', 'SOLICITUD DE FINANCIACION', 'CSS', 'GESTION DE CAES') then
        -- con su cabecera, dentro del proyecto o de la subvencion
        select id into padre from _cab where raiz = rz.id and cod = k.cod;
        if padre is null then
          insert into public.he_lineas_compromisos (version_id, padre_id, bloque_id, en_papel, se_cobra)
          values (k.vn, cab, k.bloque_id, true, false) returning id into padre;
          insert into _cab values (rz.id, k.cod, padre);
        end if;
      else
        padre := cab;
      end if;

      insert into public.he_lineas_compromisos (version_id, padre_id, bloque_id, desglose_id, en_papel, se_cobra, importe, porcentaje,
        forma_pago_propia, texto, comision_importe, comision_acuerdo_id)
      values (k.vn, padre, k.bloque_id, k.tipo_proyecto_id,
        k.desglose <> 'no_aparece', k.desglose = 'se_cobra',
        case when k.desglose = 'se_cobra' then k.importe end, case when k.desglose = 'se_cobra' then k.porcentaje end,
        case when k.desglose = 'se_cobra' then nullif(btrim(k.forma_pago), '') end,
        nullif(btrim(k.descripcion), ''), k.comision_importe, k.comision_acuerdo_id)
      returning id into linea;
      insert into public.migr_he_lineas (concepto, papel, nueva) values (k.id, 'principal', linea);
    end loop;
  end loop;

  -- LO SUELTO: con su cabecera arriba (la DF, una sola por version, con inicio, DF y fin de obra dentro)
  for k in select c.* from _c c where c.grupo = 'suelto' order by c.vv, c.ord nulls last, c.creado_en, c.id loop
    if k.cod in ('DF', 'INICIO DE OBRA', 'CERTIFICADO FIN DE OBRA') then
      select id into padre from _cab where raiz = k.vv and cod = 'DF';
      if padre is null then
        insert into public.he_lineas_compromisos (version_id, bloque_id, en_papel, se_cobra)
        values (k.vn, (select id from public.bloques where codigo = 'DF'), true, false) returning id into padre;
        insert into _cab values (k.vv, 'DF', padre);
      end if;
    else
      insert into public.he_lineas_compromisos (version_id, bloque_id, en_papel, se_cobra)
      values (k.vn, k.bloque_id, true, false) returning id into padre;
    end if;
    insert into public.he_lineas_compromisos (version_id, padre_id, bloque_id, desglose_id, en_papel, se_cobra, importe, porcentaje,
      forma_pago_propia, texto, comision_importe, comision_acuerdo_id)
    values (k.vn, padre, k.bloque_id, k.tipo_proyecto_id,
      k.desglose <> 'no_aparece', k.desglose = 'se_cobra',
      case when k.desglose = 'se_cobra' then k.importe end, case when k.desglose = 'se_cobra' then k.porcentaje end,
      case when k.desglose = 'se_cobra' then nullif(btrim(k.forma_pago), '') end,
      nullif(btrim(k.descripcion), ''), k.comision_importe, k.comision_acuerdo_id)
    returning id into linea;
    insert into public.migr_he_lineas (concepto, papel, nueva) values (k.id, 'principal', linea);
  end loop;

  -- LOS PORTALES de cada fila: los de su tipo (el suyo o el de la fila de la que cuelga) en la hoja vieja; sin tipo,
  -- todos los de la hoja; si la hoja no tenia, los de la opp
  insert into public.he_lineas_compromisos_accesos (linea_id, acceso_id)
  with recursive arbol as (
    select l.id, l.version_id, l.desglose_id as tipo from public.he_lineas_compromisos l
      join public.migr_he_versiones mv on mv.nueva = l.version_id where l.padre_id is null
    union all
    select l.id, l.version_id, coalesce(l.desglose_id, a.tipo) from public.he_lineas_compromisos l join arbol a on a.id = l.padre_id
  ),
  de_la_hoja as (
    select mv.nueva as version_id, a.tipo_proyecto_id as tipo, aa.acceso_id
      from public.migr_he_versiones mv
      join public.actuaciones_hoja a on a.hoja_encargo_id = mv.hoja_vieja
      join public.actuacion_accesos aa on aa.actuacion_id = a.id
  )
  select distinct x.id, x.acceso_id from (
    select a.id, d.acceso_id from arbol a join de_la_hoja d on d.version_id = a.version_id and d.tipo = a.tipo
    union all
    select a.id, d.acceso_id from arbol a join de_la_hoja d on d.version_id = a.version_id
     where not exists (select 1 from de_la_hoja d2 where d2.version_id = a.version_id and d2.tipo = a.tipo)
    union all
    select a.id, oa.acceso_id from arbol a join public.he_versiones_hoja n on n.id = a.version_id
      join public.relacion_oportunidad_accesos oa on oa.opp_id = n.oportunidad_id and oa.hasta is null
     where not exists (select 1 from de_la_hoja d2 where d2.version_id = a.version_id)
  ) x;

  -- ============================================================ 3 · LAS FICHAS DE FACTURACION

  update public.lineas_facturacion lf set he_linea_id = ml.nueva
    from public.migr_he_lineas ml where ml.concepto = lf.concepto_hoja_id and ml.papel = 'principal';
  update public.lineas_facturacion lf set he_version_id = mv.nueva
    from public.migr_he_versiones mv where lf.concepto_hoja_id is null and mv.hoja_vieja = lf.hoja_encargo_id and mv.referencia;
  -- la subvencion partida: los hitos a exito (y sus concesiones) pasan a una ficha nueva de la tramitacion
  for m in select lf.*, ml.nueva as tram from public.lineas_facturacion lf
             join public.migr_he_lineas ml on ml.concepto = lf.concepto_hoja_id and ml.papel = 'exito' loop
    if not exists (select 1 from public.hitos_cobro hc where hc.linea_facturacion_id = m.id and hc.importe is null and hc.hito_padre_id is null) then
      insert into public.migr_he_dudas (hoja_vieja, concepto, que)
      values (m.hoja_encargo_id, m.concepto_hoja_id, 'Subvención con importe y % sin hito a éxito en su ficha: la tramitación (el %) queda en la hoja sin ficha de facturación.');
      continue;
    end if;
    insert into public.lineas_facturacion (hoja_encargo_id, concepto_hoja_id, bloque_id, descripcion, importe, es_porcentaje, porcentaje,
      base_porcentaje, notas, origen, verificado, emisor, pagador_tipo, pagador_id, cuenta_id, forma_cobro, validada_en, validada_por,
      editada_en, editada_por, creada_por, quitada_en, quitada_por, extraido, desglose, he_linea_id)
    values (m.hoja_encargo_id, null, m.bloque_id, m.descripcion, null, true, m.porcentaje,
      m.base_porcentaje, 'Partida de la ficha de la subvención al migrar (decisión 5): aquí la tramitación a éxito.', m.origen, m.verificado,
      m.emisor, m.pagador_tipo, m.pagador_id, m.cuenta_id, m.forma_cobro, m.validada_en, m.validada_por,
      m.editada_en, m.editada_por, m.creada_por, m.quitada_en, m.quitada_por, m.extraido, m.desglose, m.tram)
    returning id into linea;
    update public.hitos_cobro set linea_facturacion_id = linea
     where linea_facturacion_id = m.id and (
       (importe is null and hito_padre_id is null)
       or hito_padre_id in (select id from public.hitos_cobro where linea_facturacion_id = m.id and importe is null and hito_padre_id is null));
    update public.notas_facturacion set linea_facturacion_id = linea
     where linea_facturacion_id = m.id and hito_cobro_id in (select id from public.hitos_cobro where linea_facturacion_id = linea);
  end loop;

  -- LA FORMA DE PAGO de cada linea que se cobra: la de los hitos de su ficha, si casan exactos con una forma
  with firma_forma as (
    select f.id, string_agg(h.momento || ':' || case when h.tipo = 'exito' then 'exito' else coalesce(h.porcentaje::numeric(7,2)::text, '') end, '|' order by h.orden) as firma
      from public.he_formas_pago f join public.he_formas_pago_hitos h on h.forma_pago_id = f.id where f.activa group by f.id
  ),
  firma_ficha as (
    select lf.he_linea_id, string_agg(hc.hito || ':' || case when hc.importe is null then 'exito' else coalesce(hc.porcentaje::numeric(7,2)::text, '') end, '|' order by hc.orden) as firma
      from public.lineas_facturacion lf join public.hitos_cobro hc on hc.linea_facturacion_id = lf.id and hc.hito_padre_id is null and hc.estado <> 'anulado'
     where lf.he_linea_id is not null and lf.emisor <> 'ecobalance' group by lf.he_linea_id
  ),
  casa as (
    select fi.he_linea_id, min(fo.id::text)::uuid as forma from firma_ficha fi join firma_forma fo on fo.firma = fi.firma
     group by fi.he_linea_id having count(*) = 1
  )
  update public.he_lineas_compromisos l set forma_pago_id = casa.forma, forma_pago_propia = null
    from casa where casa.he_linea_id = l.id and l.se_cobra;

  -- ============================================================ 4 · LA COMPROBACION: si algo no cuadra, no se aplica nada

  -- cada version vieja, una nueva
  select count(*) into hay from public.versiones_hoja vv where not exists (select 1 from public.migr_he_versiones mv join public.he_versiones_hoja n on n.id = mv.nueva where mv.version_vieja = vv.id);
  if hay > 0 then raise exception 'NO CUADRA: % versiones sin copiar', hay; end if;
  -- cada concepto, su linea (y la partida, sus dos)
  select count(*) into hay from public.conceptos_hoja c where not exists (select 1 from public.migr_he_lineas ml where ml.concepto = c.id and ml.papel = 'principal');
  if hay > 0 then raise exception 'NO CUADRA: % conceptos sin linea', hay; end if;
  -- version a version: mismas lineas que se cobran, mismos importes y mismos % (la partida suma lo mismo)
  select count(*) into hay from (
    select mv.version_vieja,
           (select count(*) from public.conceptos_hoja c where c.version_hoja_id = mv.version_vieja and c.desglose = 'se_cobra')
             + (select count(*) from public.conceptos_hoja c where c.version_hoja_id = mv.version_vieja and c.desglose = 'se_cobra' and c.importe is not null and c.porcentaje is not null
                 and exists (select 1 from public.bloques b where b.id = c.bloque_id and b.codigo = 'TRAMITACION SUBVENCIONES')) as n_viejo,
           (select count(*) from public.he_lineas_compromisos l where l.version_id = mv.nueva and l.se_cobra) as n_nuevo,
           (select coalesce(sum(c.importe), 0) from public.conceptos_hoja c where c.version_hoja_id = mv.version_vieja and c.desglose = 'se_cobra') as imp_viejo,
           (select coalesce(sum(l.importe), 0) from public.he_lineas_compromisos l where l.version_id = mv.nueva and l.se_cobra) as imp_nuevo,
           (select coalesce(sum(c.porcentaje), 0) from public.conceptos_hoja c where c.version_hoja_id = mv.version_vieja and c.desglose = 'se_cobra') as pct_viejo,
           (select coalesce(sum(l.porcentaje), 0) from public.he_lineas_compromisos l where l.version_id = mv.nueva and l.se_cobra) as pct_nuevo,
           (select count(*) from public.conceptos_hoja c where c.version_hoja_id = mv.version_vieja and c.desglose <> 'se_cobra') as incl_viejo,
           (select count(*) from public.migr_he_lineas ml join public.conceptos_hoja c on c.id = ml.concepto join public.he_lineas_compromisos l on l.id = ml.nueva
             where c.version_hoja_id = mv.version_vieja and c.desglose <> 'se_cobra' and not l.se_cobra and l.version_id = mv.nueva) as incl_nuevo
      from public.migr_he_versiones mv) x
   where n_viejo <> n_nuevo or imp_viejo <> imp_nuevo or pct_viejo <> pct_nuevo or incl_viejo <> incl_nuevo;
  if hay > 0 then raise exception 'NO CUADRA: % versiones con distintas lineas, importes o %% que lo viejo', hay; end if;
  -- cada linea, en su version
  select count(*) into hay from public.migr_he_lineas ml join public.conceptos_hoja c on c.id = ml.concepto
    join public.migr_he_versiones mv on mv.version_vieja = c.version_hoja_id join public.he_lineas_compromisos l on l.id = ml.nueva
   where l.version_id <> mv.nueva;
  if hay > 0 then raise exception 'NO CUADRA: % lineas en otra version', hay; end if;
  -- cada ficha, mirando a su linea o a su version (las de antes de la copia, y las partidas)
  select count(*) into hay from public.lineas_facturacion where he_linea_id is null and he_version_id is null;
  if hay > 0 then raise exception 'NO CUADRA: % fichas de facturacion sin linea ni version', hay; end if;
  -- ningun hito perdido: cada hito sigue en una ficha de su misma hoja vieja
  select count(*) into hay from public.hitos_cobro hc left join public.lineas_facturacion lf on lf.id = hc.linea_facturacion_id where lf.id is null;
  if hay > 0 then raise exception 'NO CUADRA: % hitos sin ficha', hay; end if;
  -- cada ficha que salio de un concepto, en la linea de ese concepto y en la version de su hoja
  select count(*) into hay from public.lineas_facturacion lf join public.he_lineas_compromisos l on l.id = lf.he_linea_id
   where not exists (select 1 from public.migr_he_versiones mv where mv.hoja_vieja = lf.hoja_encargo_id and mv.nueva = l.version_id);
  if hay > 0 then raise exception 'NO CUADRA: % fichas en la linea de otra hoja', hay; end if;
  -- la ficha cobra lo que dice su linea (salvo las de Ecobalance, que cobran su comision aparte, y las que ya
  -- discrepaban del concepto antes de la copia: van a la lista de dudas, para que lo decida Monica)
  insert into public.migr_he_dudas (hoja_vieja, concepto, que)
  select lf.hoja_encargo_id, lf.concepto_hoja_id,
         'La ficha de facturación cobra ' || coalesce(lf.importe::text || ' €', lf.porcentaje::text || ' %') || ' y el concepto de la hoja dice ' ||
         coalesce(l.importe::text || ' €', l.porcentaje::text || ' %', 'incluido') || ' («' || left(coalesce(l.texto, ''), 80) || '»): ¿cuál vale?'
    from public.lineas_facturacion lf join public.he_lineas_compromisos l on l.id = lf.he_linea_id
   where lf.emisor <> 'ecobalance' and lf.concepto_hoja_id is not null
     and not exists (select 1 from public.migr_he_lineas ml where ml.concepto = lf.concepto_hoja_id and ml.papel = 'exito')
     and (coalesce(lf.importe, -1) <> coalesce(l.importe, -1) or coalesce(lf.porcentaje, -1) <> coalesce(l.porcentaje, -1));
  -- la subvencion partida: la ficha de siempre cobra el importe de la documentacion tecnica; la nueva, el % de la tramitacion
  insert into public.migr_he_dudas (hoja_vieja, concepto, que)
  select lf.hoja_encargo_id, lf.concepto_hoja_id,
         'Subvención partida: la ficha cobra ' || coalesce(lf.importe::text, '—') || ' € y la documentación técnica de la hoja dice ' || coalesce(l.importe::text, '—') || ' €: ¿cuál vale?'
    from public.lineas_facturacion lf join public.he_lineas_compromisos l on l.id = lf.he_linea_id
   where lf.concepto_hoja_id is not null and exists (select 1 from public.migr_he_lineas ml where ml.concepto = lf.concepto_hoja_id and ml.papel = 'exito')
     and coalesce(lf.importe, -1) <> coalesce(l.importe, -1);
  select count(*) into hay from public.lineas_facturacion lf join public.he_lineas_compromisos l on l.id = lf.he_linea_id
   where lf.emisor <> 'ecobalance' and lf.concepto_hoja_id is null and coalesce(lf.porcentaje, -1) <> coalesce(l.porcentaje, -1);
  if hay > 0 then raise exception 'NO CUADRA: % fichas de tramitacion partidas con otro %% que su linea', hay; end if;
end
$copia$;
