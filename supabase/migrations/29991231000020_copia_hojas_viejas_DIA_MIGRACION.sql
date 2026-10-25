-- LA COPIA DE LAS HOJAS VIEJAS A LAS NUEVAS (Monica, 25-oct-2026: «esto es una migracion»). SE APLICA EL DIA DE LA
-- MIGRACION, en este orden:
--   1. 29991231000000_facturacion_hojas_nuevas_ANTES_DE_COPIAR (rama de facturacion)
--   2. ESTA
--   3. 29991231000050_facturacion_hojas_nuevas_DESPUES_DE_COPIAR (rama de facturacion)
--   4. 29991231000100 … 000500 (esta rama)
--
-- REGLA: migrar = copiar tal cual. Cada hoja pasa con el estado que tiene hoy; lo que apuntaba a lo viejo apunta a lo
-- nuevo; lo que ya no existe en el modelo nuevo se copia como era (nace jubilado). Decisiones en
-- docs/hojas-de-encargo/lectores-tablas-viejas.md («Decisiones del repaso campo a campo») y docs/hojas-de-encargo/copia.md.
--
--   versiones_hoja + hojas_encargo → he_versiones_hoja (una por version vieja, mismo codigo y numero)
--   la fase:  borrador → borrador; enviada_comunidad → enviada; devuelta_firmada → ok_comercial, u ok_administracion si
--             tiene metida_produccion (regla de facturacion); anulada / archivada → anulada; las versiones anteriores de
--             una hoja → sustituida (sustituida_por = la siguiente); la hoja sustituida por otra (sustituciones_hoja) →
--             sustituida, con sustituida_por = la version de referencia de la nueva (las 2 anuladas siguen anuladas)
--   el recorrido → he_estados_hoja: enviada (fecha_enviada), firmada_recibida (fecha_firma) + ok_comercial («Migrada»),
--             ok_administracion (movimientos_hoja), anulada, sustituida, borrador
--   conceptos_hoja → he_lineas_compromisos, en ARBOL (las reglas del generador, abajo); lo que no se sabe colocar va
--             arriba del todo y a la lista de revision migr_he_revision
--   el PDF firmado (versiones_hoja.pdfs_firmados) → documentos (tipo «Hoja de encargo», en el archivo de la opp) y
--             firmada_documento_id = el primero
--   lineas_facturacion: he_linea_id = la linea copiada de su concepto; sin concepto → he_version_id; la subvencion con
--             importe y % se parte en dos (decision 5) y la ficha tambien (los hitos a exito pasan a una ficha nueva)
--   presupuesto_lineas / revision_firmadas / revision_firmadas_lineas: apuntan a la version o linea nueva (columna nueva)
--
-- Las tablas migr_* son DE VIDA CORTA (decision 3): para comprobar; se borran con las tablas viejas.

-- ------------------------------------------------------------ correspondencia y revision

create table public.migr_he_versiones (
  version_vieja uuid primary key,
  hoja_vieja uuid not null,
  nueva uuid not null unique default gen_random_uuid(),
  referencia boolean not null            -- la version que vale de la hoja: la firmada, o la ultima
);
create table public.migr_he_lineas (
  concepto uuid not null,
  nueva uuid not null,
  papel text not null default 'principal', -- principal | exito (la tramitacion % de una subvencion partida)
  primary key (concepto, papel)
);
create table public.migr_he_revision (
  id bigserial primary key,
  hoja_vieja uuid,
  version_vieja uuid,
  concepto uuid,
  motivo text not null
);
comment on table public.migr_he_versiones is 'VIDA CORTA (migracion 25-oct-2026): version vieja → he_versiones_hoja. Se borra con las tablas viejas.';
comment on table public.migr_he_lineas is 'VIDA CORTA (migracion 25-oct-2026): concepto viejo → he_lineas_compromisos. Se borra con las tablas viejas.';
comment on table public.migr_he_revision is 'VIDA CORTA (migracion 25-oct-2026): lo que la copia no supo colocar, para que lo revise Monica.';

-- Lo que apuntaba a lo viejo, a lo nuevo
alter table public.presupuesto_lineas add column he_version_id uuid references public.he_versiones_hoja(id);
alter table public.revision_firmadas add column he_version_id uuid references public.he_versiones_hoja(id);
alter table public.revision_firmadas_lineas add column he_linea_id uuid references public.he_lineas_compromisos(id);
comment on column public.presupuesto_lineas.he_version_id is 'La version de hoja (sistema nuevo) a la que pertenece esta linea; antes hoja_encargo_id.';
comment on column public.revision_firmadas.he_version_id is 'La version de hoja (sistema nuevo) revisada; antes hoja_encargo_id.';
comment on column public.revision_firmadas_lineas.he_linea_id is 'La linea de hoja (sistema nuevo) revisada; antes concepto_hoja_id.';

do $copia$
declare
  -- dia viejo → instante (mediodia en Madrid: la misma fecha en cualquier huso)
  h record; v record; k record; m record;
  ref uuid; nv uuid; fase text; nota text; t timestamptz;
  n_p int; n_s int; n_c int;
  cab_p uuid; cab_s uuid; cab_c uuid; cab_doc uuid; cab_df uuid; contexto uuid;
  linea uuid; doc uuid; tipo_doc uuid; padre uuid;
  bl text;
  prox record;
begin
  select id into tipo_doc from public.tipos_documento where nombre = 'Hoja de encargo';
  if tipo_doc is null then raise exception 'Falta el tipo de documento «Hoja de encargo»'; end if;

  -- 1 · la correspondencia de versiones (la de referencia: la firmada, o la de numero mas alto)
  insert into public.migr_he_versiones (version_vieja, hoja_vieja, referencia)
  select vv.id, vv.hoja_encargo_id,
         vv.id = coalesce(hh.version_firmada_id,
                          (select x.id from public.versiones_hoja x where x.hoja_encargo_id = hh.id order by x.numero_version desc limit 1))
    from public.versiones_hoja vv join public.hojas_encargo hh on hh.id = vv.hoja_encargo_id;

  -- 2 · las versiones
  for v in
    select vv.*, mv.nueva, mv.referencia, hh.estado as h_estado, hh.numero_hoja, hh.oportunidad_id, hh.pagador_tipo, hh.comunidad_id,
           hh.pagador_contrata_id, hh.pagador_persona_id, hh.emisor, hh.fecha_firma, hh.fecha_estado, hh.descripcion as h_desc,
           hh.tipo_documento, hh.responsable_id, hh.motivo_sin_firma, hh.codigo_anterior, hh.codigos_contrata, hh.version_firmada_id,
           (select max(x.numero_version) from public.versiones_hoja x where x.hoja_encargo_id = hh.id) as ultima
      from public.versiones_hoja vv
      join public.hojas_encargo hh on hh.id = vv.hoja_encargo_id
      join public.migr_he_versiones mv on mv.version_vieja = vv.id
  loop
    -- la fase
    if not v.referencia then
      if v.version_firmada_id is not null and v.numero_version > (select numero_version from public.versiones_hoja where id = v.version_firmada_id) then
        -- una version posterior a la firmada: pasa con lo que fue (enviada o borrador) y a revision
        fase := case when v.fecha_enviada is not null then 'enviada' else 'borrador' end;
        insert into public.migr_he_revision (hoja_vieja, version_vieja, motivo)
        values (v.hoja_encargo_id, v.id, 'Versión ' || v.numero_version || ' posterior a la firmada: pasa como «' || fase || '».');
      else
        fase := 'sustituida';
      end if;
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
      if fase is null then raise exception 'Estado viejo sin traduccion: %', v.h_estado; end if;
    end if;

    -- las notas: lo de la hoja vieja que no tiene campo (decision 2)
    nota := concat_ws(E'\n',
      'Migrada de la hoja vieja' || case when v.ultima > 1 then ' (versión ' || v.numero_version || ' de ' || v.ultima || ')' else '' end || '.',
      case v.tipo_documento when 'pedido' then 'En origen era un pedido.' when 'nota_responsabilidad' then 'En origen era una nota de responsabilidad.'
                            when 'contrato' then 'En origen era un contrato.' end,
      case when nullif(btrim(v.codigo_anterior), '') is not null then 'Código anterior: ' || btrim(v.codigo_anterior) || '.' end,
      case when nullif(btrim(v.h_desc), '') is not null then 'Descripción: ' || btrim(v.h_desc) end,
      case when v.responsable_id is not null then 'Responsable: ' || coalesce((select nombre from public.equipo where id = v.responsable_id), '?') || '.' end,
      case when nullif(btrim(v.motivo_sin_firma), '') is not null then 'Motivo: ' || btrim(v.motivo_sin_firma) end,
      case when v.h_estado <> 'devuelta_firmada' then 'Emisor: ' || case v.emisor when 'daniel_autonomo' then 'Daniel (autónomo)' else coalesce(v.emisor, '?') end || '.' end,
      case when nullif(btrim(v.motivo_cambio), '') is not null then 'Motivo del cambio de versión: ' || btrim(v.motivo_cambio) end,
      case when nullif(btrim(v.forma_pago), '') is not null then 'Forma de pago de la hoja: ' || btrim(v.forma_pago) end,
      case when nullif(btrim(v.importes_forma_pago_texto), '') is not null then 'Importes de la forma de pago: ' || btrim(v.importes_forma_pago_texto) end,
      case when nullif(btrim(v.notas), '') is not null then 'Notas: ' || btrim(v.notas) end,
      -- los tipos de la hoja vieja (actuaciones_hoja) que no estan en ninguna linea: lo que se hacia, sin perderlo
      (select 'Tipos de la hoja vieja: ' || string_agg(tp.nombre, ', ' order by a.orden) || '.'
         from public.actuaciones_hoja a join public.tipos_proyecto tp on tp.id = a.tipo_proyecto_id
        where a.hoja_encargo_id = v.hoja_encargo_id)
    );

    insert into public.he_versiones_hoja (id, creado_en, codigo_he, numero_version, oportunidad_id, pagador_tipo, pagador_comunidad_id,
      pagador_contrata_id, pagador_persona_id, fecha_emision, estado, pdf, notas, papel_html, codigos_contrata)
    values (v.nueva, v.creado_en, v.numero_hoja, v.numero_version, v.oportunidad_id, v.pagador_tipo,
      case when v.pagador_tipo = 'comunidad' then v.comunidad_id end,
      case when v.pagador_tipo = 'contrata' then v.pagador_contrata_id end,
      case when v.pagador_tipo = 'persona' then v.pagador_persona_id end,
      v.fecha_generada, fase, v.url_pdf_hoja, nota, v.contenido_html,
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
      t := (coalesce(v.fecha_firma, v.fecha_estado::date) + time '12:00') at time zone 'Europe/Madrid';
      if v.fecha_firma is null then
        insert into public.migr_he_revision (hoja_vieja, version_vieja, motivo)
        values (v.hoja_encargo_id, v.id, 'Firmada sin fecha de firma: se pone la del último cambio de estado (' || v.fecha_estado::date || ').');
      end if;
      insert into public.he_estados_hoja (version_id, estado, fecha, nota) values (v.nueva, 'firmada_recibida', t, 'Migrada');
      insert into public.he_estados_hoja (version_id, estado, fecha, nota) values (v.nueva, 'ok_comercial', t, 'Migrada');
      for m in select * from public.movimientos_hoja mm where mm.hoja_encargo_id = v.hoja_encargo_id and mm.tipo = 'metida_produccion' order by mm.en loop
        insert into public.he_estados_hoja (version_id, estado, fecha, persona_id, nota, lado, areas)
        values (v.nueva, 'ok_administracion', m.en, m.por, m.motivo, 'app', m.areas);
      end loop;
    end if;
    if fase = 'anulada' then
      insert into public.he_estados_hoja (version_id, estado, fecha, nota)
      values (v.nueva, 'anulada', v.fecha_estado,
        case when v.h_estado = 'archivada' then 'Se archivó por falta de datos en la migración del histórico.'
             else coalesce(nullif(btrim(v.motivo_sin_firma), ''), 'Migrada sin motivo.') end);
    end if;

    -- el PDF firmado (o los PDF): al archivo de la opp
    doc := null;
    for k in select u, ord from unnest(v.pdfs_firmados) with ordinality as x(u, ord) loop
      -- en el almacen (como lo que sube el cajon) o, si era un enlace, como enlace
      insert into public.documentos (oportunidad_id, comunidad_id, tipo_documento_id, backend, storage_ref, url_fichero, naturaleza, estado_firma,
        nombre, archivado_en, justificacion)
      values (v.oportunidad_id, v.comunidad_id, tipo_doc,
        case when k.u ~ '^almacen:documentos-comerciales/' then 'supabase' else 'enlace' end,
        case when k.u ~ '^almacen:documentos-comerciales/' then regexp_replace(k.u, '^almacen:documentos-comerciales/', '') end,
        case when k.u ~ '^almacen:documentos-comerciales/' then null else k.u end,
        'migrado', 'devuelto_firmado',
        'Hoja de encargo firmada ' || coalesce(v.numero_hoja, '') || case when v.ultima > 1 then ' v' || v.numero_version else '' end
          || case when k.ord > 1 then ' (' || k.ord || ')' else '' end || '.pdf',
        now(), 'Migrada de la hoja vieja (su PDF firmado).')
      returning id into linea;
      if doc is null then doc := linea; end if;
    end loop;
    if doc is not null and v.referencia and v.h_estado = 'devuelta_firmada' then
      update public.he_versiones_hoja set firmada_documento_id = doc where id = v.nueva;
    end if;
  end loop;

  -- 3 · sustituciones: las versiones anteriores de una hoja → la siguiente; la hoja sustituida → la referencia de la nueva
  for v in select mv.nueva, vv.hoja_encargo_id, vv.numero_version from public.migr_he_versiones mv join public.versiones_hoja vv on vv.id = mv.version_vieja
            join public.he_versiones_hoja n on n.id = mv.nueva where n.estado = 'sustituida' and not mv.referencia loop
    select mv2.nueva, vv2.numero_version, vv2.creado_en into prox
      from public.versiones_hoja vv2 join public.migr_he_versiones mv2 on mv2.version_vieja = vv2.id
     where vv2.hoja_encargo_id = v.hoja_encargo_id and vv2.numero_version > v.numero_version
     order by vv2.numero_version limit 1;
    update public.he_versiones_hoja set sustituida_por = prox.nueva where id = v.nueva;
    insert into public.he_estados_hoja (version_id, estado, fecha, nota)
    values (v.nueva, 'sustituida', prox.creado_en, 'Sustituida por la versión ' || prox.numero_version || '.');
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

  -- 4 · las lineas, en arbol, version a version (las reglas del generador, lib motorArbol.js):
  --   PROYECTO: cabecera «Redaccion proyecto» con su tipo + la linea de redaccion; debajo, lo del proyecto (toma de
  --     datos, visado, licencias; DF con inicio y CFO; 3 presupuestos, financiacion, CAES y CSS con su cabecera)
  --   SUBVENCION: cabecera «Tramitacion subvenciones»; dentro la tramitacion (y, si llevaba importe y %, la
  --     documentacion tecnica con el importe y la tramitacion con el %) y la documentacion tecnica con IEE, LEE y CEE
  --   CONSULTA URBANISTICA: cabecera con su linea; toma de datos, visado y licencias debajo si no hay proyecto
  --   LO DEMAS: arriba, con su cabecera (como lo suelto del generador); sin bloque → OTRO con su texto
  --   Con dos o mas proyectos (o subvenciones), lo que podria ir debajo de cualquiera va arriba y a revision.
  for v in select mv.version_vieja, mv.hoja_vieja, mv.nueva from public.migr_he_versiones mv loop
    cab_p := null; cab_s := null; cab_c := null; cab_doc := null; cab_df := null;
    select count(*) filter (where b.codigo = 'REDACCION PROYECTO'), count(*) filter (where b.codigo = 'TRAMITACION SUBVENCIONES'),
           count(*) filter (where b.codigo = 'CONSULTA URBANISTICA')
      into n_p, n_s, n_c
      from public.conceptos_hoja c left join public.bloques b on b.id = c.bloque_id where c.version_hoja_id = v.version_vieja;

    for k in
      select c.*, b.codigo,
             case b.codigo when 'REDACCION PROYECTO' then 1 when 'TRAMITACION SUBVENCIONES' then 2 when 'CONSULTA URBANISTICA' then 3 else 4 end as tanda
        from public.conceptos_hoja c left join public.bloques b on b.id = c.bloque_id
       where c.version_hoja_id = v.version_vieja
       order by tanda, c.creado_en, c.id
    loop
      bl := coalesce(k.codigo, 'OTRO');
      padre := null;

      if bl = 'REDACCION PROYECTO' then
        -- su tipo: el del concepto si es de proyecto; si no, el unico tipo de proyecto de la hoja (con un solo proyecto)
        insert into public.he_lineas_compromisos (version_id, bloque_id, desglose_id, en_papel, se_cobra)
        values (v.nueva, k.bloque_id,
          coalesce((select tp.id from public.tipos_proyecto tp where tp.id = k.tipo_proyecto_id and tp.naturaleza = 'proyecto'),
                   case when n_p = 1 then (select min(a.tipo_proyecto_id::text)::uuid from public.actuaciones_hoja a join public.tipos_proyecto tp on tp.id = a.tipo_proyecto_id
                                            where a.hoja_encargo_id = v.hoja_vieja and tp.naturaleza = 'proyecto'
                                              and not exists (select 1 from public.tipos_proyecto hijo join public.actuaciones_hoja a2 on a2.tipo_proyecto_id = hijo.id
                                                               where a2.hoja_encargo_id = v.hoja_vieja and hijo.parent_id = tp.id)
                                           having count(*) = 1) end),
          true, false)
        returning id into cab_p;
        padre := cab_p;
      elsif bl = 'TRAMITACION SUBVENCIONES' then
        insert into public.he_lineas_compromisos (version_id, bloque_id, desglose_id, en_papel, se_cobra)
        values (v.nueva, k.bloque_id, (select tp.id from public.tipos_proyecto tp where tp.id = k.tipo_proyecto_id and tp.clave in ('accesibilidad', 'eficiencia_energetica')), true, false)
        returning id into cab_s;
        cab_doc := null;
        if k.desglose = 'se_cobra' and k.importe is not null and k.porcentaje is not null then
          -- decision 5: se parte en dos, como el generador
          insert into public.he_lineas_compromisos (version_id, padre_id, bloque_id, en_papel, se_cobra, importe, forma_pago_propia, texto)
          values (v.nueva, cab_s, (select id from public.bloques where codigo = 'DOCUMENTACION TECNICA SUBVENCIONES'), true, true, k.importe,
                  nullif(btrim(k.forma_pago), ''), nullif(btrim(k.descripcion), ''))
          returning id into cab_doc;
          insert into public.migr_he_lineas (concepto, nueva, papel) values (k.id, cab_doc, 'principal');
          insert into public.he_lineas_compromisos (version_id, padre_id, bloque_id, en_papel, se_cobra, porcentaje, forma_pago_propia)
          values (v.nueva, cab_s, k.bloque_id, true, true, k.porcentaje, nullif(btrim(k.forma_pago), ''))
          returning id into linea;
          insert into public.migr_he_lineas (concepto, nueva, papel) values (k.id, linea, 'exito');
          continue;
        end if;
        padre := cab_s;
      elsif bl = 'CONSULTA URBANISTICA' then
        insert into public.he_lineas_compromisos (version_id, bloque_id, en_papel, se_cobra) values (v.nueva, k.bloque_id, true, false) returning id into cab_c;
        padre := cab_c;
      elsif bl in ('IEE', 'LEE', 'CEE') and n_s = 1 then
        if cab_doc is null then
          insert into public.he_lineas_compromisos (version_id, padre_id, bloque_id, en_papel, se_cobra)
          values (v.nueva, cab_s, (select id from public.bloques where codigo = 'DOCUMENTACION TECNICA SUBVENCIONES'), true, false)
          returning id into cab_doc;
        end if;
        padre := cab_doc;
      elsif bl in ('TOMA DE DATOS Y MODELADO 3D', 'VISADO', 'TRAMITACION LICENCIAS', 'DF', 'CERTIFICADO FIN DE OBRA', 'INICIO DE OBRA',
                   'TRAMITACION 3 PRESUPUESTOS', 'SOLICITUD DE FINANCIACION', 'CSS', 'GESTION DE CAES') then
        contexto := case when n_p = 1 then cab_p
                         when n_p = 0 and bl in ('TOMA DE DATOS Y MODELADO 3D', 'VISADO', 'TRAMITACION LICENCIAS') and n_c = 1 then cab_c
                         when n_p = 0 and bl = 'GESTION DE CAES' and n_s = 1 then cab_s end;
        if n_p > 1 then
          insert into public.migr_he_revision (hoja_vieja, version_vieja, concepto, motivo)
          values (v.hoja_vieja, v.version_vieja, k.id, 'Hay ' || n_p || ' proyectos: «' || bl || '» va arriba del todo, sin saber de cuál es.');
        end if;
        if bl in ('DF', 'CERTIFICADO FIN DE OBRA', 'INICIO DE OBRA') then
          if cab_df is null then
            insert into public.he_lineas_compromisos (version_id, padre_id, bloque_id, en_papel, se_cobra)
            values (v.nueva, contexto, (select id from public.bloques where codigo = 'DF'), true, false) returning id into cab_df;
          end if;
          padre := cab_df;
        elsif bl in ('TOMA DE DATOS Y MODELADO 3D', 'VISADO', 'TRAMITACION LICENCIAS') and contexto is not null then
          padre := contexto;
        else
          insert into public.he_lineas_compromisos (version_id, padre_id, bloque_id, en_papel, se_cobra)
          values (v.nueva, contexto, k.bloque_id, true, false) returning id into padre;
        end if;
      elsif bl = 'OTRO' then
        padre := null;   -- sin bloque: una sola linea OTRO con su texto, como el «nada encaja» del generador
      else
        insert into public.he_lineas_compromisos (version_id, bloque_id, en_papel, se_cobra) values (v.nueva, k.bloque_id, true, false) returning id into padre;
      end if;

      insert into public.he_lineas_compromisos (version_id, padre_id, bloque_id, desglose_id, en_papel, se_cobra, importe, porcentaje,
        forma_pago_propia, texto, comision_importe, comision_acuerdo_id)
      values (v.nueva, padre, coalesce(k.bloque_id, (select id from public.bloques where codigo = 'OTRO')), k.tipo_proyecto_id,
        k.desglose <> 'no_aparece', k.desglose = 'se_cobra',
        case when k.desglose = 'se_cobra' then k.importe end,
        case when k.desglose = 'se_cobra' then k.porcentaje end,
        case when k.desglose = 'se_cobra' then nullif(btrim(k.forma_pago), '') end,
        nullif(btrim(k.descripcion), ''), k.comision_importe, k.comision_acuerdo_id)
      returning id into linea;
      insert into public.migr_he_lineas (concepto, nueva, papel) values (k.id, linea, 'principal');
      if k.codigo is null then
        insert into public.migr_he_revision (hoja_vieja, version_vieja, concepto, motivo)
        values (v.hoja_vieja, v.version_vieja, k.id, 'Concepto sin bloque: pasa como OTRO con su texto.');
      end if;
    end loop;
    if n_s > 1 then
      insert into public.migr_he_revision (hoja_vieja, version_vieja, motivo)
      values (v.hoja_vieja, v.version_vieja, 'Hay ' || n_s || ' subvenciones: IEE, LEE, CEE y CAES van arriba del todo.');
    end if;
  end loop;

  -- 5 · las fichas de facturacion
  update public.lineas_facturacion lf set he_linea_id = ml.nueva
    from public.migr_he_lineas ml where ml.concepto = lf.concepto_hoja_id and ml.papel = 'principal';
  update public.lineas_facturacion lf set he_version_id = mv.nueva
    from public.migr_he_versiones mv where lf.concepto_hoja_id is null and mv.hoja_vieja = lf.hoja_encargo_id and mv.referencia;
  -- la subvencion partida: lo a exito pasa a una ficha nueva de la tramitacion (mismos hitos y facturas)
  for m in select lf.*, ml.nueva as tram, c.porcentaje as pct
             from public.lineas_facturacion lf
             join public.migr_he_lineas ml on ml.concepto = lf.concepto_hoja_id and ml.papel = 'exito'
             join public.conceptos_hoja c on c.id = lf.concepto_hoja_id
            where exists (select 1 from public.hitos_cobro hc where hc.linea_facturacion_id = lf.id and hc.importe is null) loop
    insert into public.lineas_facturacion (hoja_encargo_id, concepto_hoja_id, bloque_id, descripcion, importe, es_porcentaje, porcentaje,
      base_porcentaje, notas, origen, verificado, emisor, pagador_tipo, pagador_id, cuenta_id, forma_cobro, validada_en, validada_por,
      editada_en, editada_por, creada_por, quitada_en, quitada_por, extraido, desglose, he_linea_id)
    values (m.hoja_encargo_id, m.concepto_hoja_id, m.bloque_id, m.descripcion, null, true, m.pct,
      m.base_porcentaje, m.notas, m.origen, m.verificado, m.emisor, m.pagador_tipo, m.pagador_id, m.cuenta_id, m.forma_cobro, m.validada_en, m.validada_por,
      m.editada_en, m.editada_por, m.creada_por, m.quitada_en, m.quitada_por, m.extraido, m.desglose, m.tram)
    returning id into linea;
    update public.hitos_cobro set linea_facturacion_id = linea where linea_facturacion_id = m.id and importe is null;
  end loop;

  -- 6 · lo demas que apuntaba a lo viejo
  update public.presupuesto_lineas pl set he_version_id = mv.nueva
    from public.migr_he_versiones mv where mv.hoja_vieja = pl.hoja_encargo_id and mv.referencia;
  update public.revision_firmadas r set he_version_id = mv.nueva
    from public.migr_he_versiones mv where mv.hoja_vieja = r.hoja_encargo_id and mv.referencia;
  update public.revision_firmadas_lineas r set he_linea_id = ml.nueva
    from public.migr_he_lineas ml where ml.concepto = r.concepto_hoja_id and ml.papel = 'principal';
end
$copia$;
