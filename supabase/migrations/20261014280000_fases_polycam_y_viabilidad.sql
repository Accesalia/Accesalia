-- FASES: VISITA, POLYCAM Y VIABILIDAD CON SUS DATOS DE VERDAD (Monica y el hilo
-- de la cabecera, 14-oct-2026).
--
--   visita   = hay visita de escaneo agendada (citas, tipo escaneo_polycam, no
--              anulada) o ya llego el Polycam. Fecha: la de la visita; si no, la
--              del fichero; si no, la de llegada ("si se va sin anotar la fecha,
--              se coge la del Polycam").
--   polycam  = ha llegado un Polycam de la opp: por sus accesos (lo coloca el
--              buzon) O por una viabilidad suya (lo coloca la mesa). Antes solo
--              se miraban los accesos. Fecha: el dia que llego.
--   viabilidad_arquitecto = el arquitecto la envio al comercial desde la mesa
--              (viabilidades.enviada_en), o ya esta rematada con PDF. Fecha: la
--              del envio.
-- Lo demas, igual. Mismas columnas de salida: la barra de fases no cambia.

create or replace view public.fases_oportunidad as
 WITH esc AS (
         SELECT roa.opp_id AS oportunidad_id, ep.fecha_escaneo, (COALESCE(ep.fecha, ep.creado_en) AT TIME ZONE 'Europe/Madrid')::date AS llegada
           FROM relacion_oportunidad_accesos roa
             JOIN relacion_polycam_acceso rpa ON rpa.acceso_id = roa.acceso_id
             JOIN escaneados_polycam ep ON ep.id = rpa.polycam_id
          WHERE roa.hasta IS NULL
        UNION
         SELECT v.oportunidad_id, ep.fecha_escaneo, (COALESCE(ep.fecha, ep.creado_en) AT TIME ZONE 'Europe/Madrid')::date AS llegada
           FROM escaneados_polycam ep
             JOIN viabilidades v ON v.id = ep.viabilidad_id
          WHERE v.oportunidad_id IS NOT NULL
        ), datos AS (
         SELECT o.id AS oportunidad_id,
            nt.hay AS nota,
            nt.fecha AS nota_fecha,
            (ci.inicio IS NOT NULL OR pc.hay) AS visita,
            COALESCE((ci.inicio AT TIME ZONE 'Europe/Madrid')::date, pc.fecha_escaneo, pc.llegada) AS visita_fecha,
            pc.hay AS escaneo,
            pc.llegada AS escaneo_fecha,
            vb.hay AS viabilidad,
            vb.fecha AS viabilidad_fecha,
            hj.generada,
            hj.generada_fecha,
            hj.enviada,
            hj.enviada_fecha,
            hj.firmada,
            hj.firmada_fecha,
            td.hay AS tresd,
            td.fecha AS tresd_fecha,
            ju.hay AS junta,
            ju.fecha AS junta_fecha
           FROM oportunidades o
             LEFT JOIN LATERAL ( SELECT count(*) > 0 AS hay,
                    min(COALESCE(n.fecha, n.creado_en::date)) AS fecha
                   FROM notas_oportunidad n
                  WHERE n.oportunidad_id = o.id) nt ON true
             LEFT JOIN LATERAL ( SELECT count(*) > 0 AS hay,
                    min(e.fecha_escaneo) AS fecha_escaneo,
                    min(e.llegada) AS llegada
                   FROM esc e
                  WHERE e.oportunidad_id = o.id) pc ON true
             LEFT JOIN LATERAL ( SELECT c.inicio
                   FROM citas c
                  WHERE c.oportunidad_id = o.id AND c.tipo = 'escaneo_polycam'::text AND c.estado <> 'anulada'::text
                 LIMIT 1) ci ON true
             LEFT JOIN LATERAL ( SELECT count(*) > 0 AS hay,
                    min(COALESCE(v.enviada_en, v.rematada_en, v.creado_en)::date) AS fecha
                   FROM viabilidades v
                  WHERE v.oportunidad_id = o.id AND (v.enviada_en IS NOT NULL OR v.url_pdf IS NOT NULL)) vb ON true
             LEFT JOIN LATERAL ( SELECT bool_or(v.url_pdf_hoja IS NOT NULL) AS generada,
                    min(v.fecha_generada) FILTER (WHERE v.url_pdf_hoja IS NOT NULL) AS generada_fecha,
                    bool_or(h.estado = ANY (ARRAY['enviada_comunidad'::text, 'devuelta_firmada'::text])) AS enviada,
                    min(COALESCE(v.fecha_enviada, h.fecha_creacion)) FILTER (WHERE h.estado = ANY (ARRAY['enviada_comunidad'::text, 'devuelta_firmada'::text])) AS enviada_fecha,
                    bool_or(h.estado = 'devuelta_firmada'::text) AS firmada,
                    min(h.fecha_firma) FILTER (WHERE h.estado = 'devuelta_firmada'::text) AS firmada_fecha
                   FROM hojas_encargo h
                     LEFT JOIN versiones_hoja v ON v.hoja_encargo_id = h.id
                  WHERE h.oportunidad_id = o.id AND h.estado <> 'anulada'::text) hj ON true
             LEFT JOIN LATERAL ( SELECT count(*) > 0 AS hay,
                    min(m.fecha_entrega::date) AS fecha
                   FROM modelos_3d_venta m
                  WHERE m.oportunidad_id = o.id AND m.fecha_entrega IS NOT NULL) td ON true
             LEFT JOIN LATERAL ( SELECT count(*) > 0 AS hay,
                    min(j.fecha_junta) AS fecha
                   FROM juntas j
                  WHERE j.oportunidad_id = o.id AND j.celebrada IS TRUE) ju ON true
        ), filas AS (
         SELECT d.oportunidad_id,
            hc.clave AS hito,
            hc.orden,
            hc.es_ramal,
            COALESCE(x.hecho, false) AS hecho,
            x.fecha
           FROM datos d
             CROSS JOIN LATERAL ( VALUES ('primer_contacto'::text,d.nota,d.nota_fecha), ('visita'::text,d.visita,d.visita_fecha), ('polycam'::text,d.escaneo,d.escaneo_fecha), ('viabilidad_arquitecto'::text,d.viabilidad,d.viabilidad_fecha), ('preparacion_documentos'::text,d.generada,d.generada_fecha), ('envio_documentos'::text,d.enviada,d.enviada_fecha), ('tresd'::text,d.tresd,d.tresd_fecha), ('junta'::text,d.junta,d.junta_fecha), ('firma'::text,d.firmada,d.firmada_fecha), ('cobro'::text,false,NULL::date)) x(hito, hecho, fecha)
             JOIN hitos_comerciales hc ON hc.clave = x.hito
        )
 SELECT oportunidad_id,
    hito,
    orden,
    es_ramal,
        CASE
            WHEN hecho THEN 'hecho'::text
            WHEN orden < max(orden) FILTER (WHERE hecho) OVER (PARTITION BY oportunidad_id) THEN 'saltado'::text
            ELSE 'pendiente'::text
        END AS estado,
        CASE
            WHEN hecho THEN fecha
            ELSE NULL::date
        END AS fecha
   FROM filas f;
