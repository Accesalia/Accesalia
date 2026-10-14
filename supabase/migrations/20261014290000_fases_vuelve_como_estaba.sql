-- DESHACE 20261014280000 (Monica, 14-oct-2026): "hay dos escaleras: la de las
-- FASES COMERCIALES, con sus hitos y cambios de fase ya definidos, NO SE TOCA; y
-- la de 'lo que nos bloquea para avanzar', con sus copys y subfases, que es
-- DISTINTA". La vista fases_oportunidad es la primera: vuelve exactamente a su
-- definicion anterior. Lo de la visita agendada, el Polycam por viabilidad y el
-- envio desde la mesa es de la segunda escalera y se leera aparte.

create or replace view public.fases_oportunidad as
 WITH datos AS (
         SELECT o.id AS oportunidad_id,
            nt.hay AS nota,
            nt.fecha AS nota_fecha,
            pc.hay AS escaneo,
            pc.fecha AS escaneo_fecha,
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
           FROM ((((((oportunidades o
             LEFT JOIN LATERAL ( SELECT (count(*) > 0) AS hay,
                    min(COALESCE(n.fecha, (n.creado_en)::date)) AS fecha
                   FROM notas_oportunidad n
                  WHERE (n.oportunidad_id = o.id)) nt ON (true))
             LEFT JOIN LATERAL ( SELECT (count(*) > 0) AS hay,
                    min(ep.fecha_escaneo) AS fecha
                   FROM ((relacion_oportunidad_accesos roa
                     JOIN relacion_polycam_acceso rpa ON ((rpa.acceso_id = roa.acceso_id)))
                     JOIN escaneados_polycam ep ON ((ep.id = rpa.polycam_id)))
                  WHERE ((roa.opp_id = o.id) AND (roa.hasta IS NULL))) pc ON (true))
             LEFT JOIN LATERAL ( SELECT (count(*) > 0) AS hay,
                    min((COALESCE(v.rematada_en, v.enviada_en, v.creado_en))::date) AS fecha
                   FROM viabilidades v
                  WHERE ((v.oportunidad_id = o.id) AND (v.url_pdf IS NOT NULL))) vb ON (true))
             LEFT JOIN LATERAL ( SELECT bool_or((v.url_pdf_hoja IS NOT NULL)) AS generada,
                    min(v.fecha_generada) FILTER (WHERE (v.url_pdf_hoja IS NOT NULL)) AS generada_fecha,
                    bool_or((h.estado = ANY (ARRAY['enviada_comunidad'::text, 'devuelta_firmada'::text]))) AS enviada,
                    min(COALESCE(v.fecha_enviada, h.fecha_creacion)) FILTER (WHERE (h.estado = ANY (ARRAY['enviada_comunidad'::text, 'devuelta_firmada'::text]))) AS enviada_fecha,
                    bool_or((h.estado = 'devuelta_firmada'::text)) AS firmada,
                    min(h.fecha_firma) FILTER (WHERE (h.estado = 'devuelta_firmada'::text)) AS firmada_fecha
                   FROM (hojas_encargo h
                     LEFT JOIN versiones_hoja v ON ((v.hoja_encargo_id = h.id)))
                  WHERE ((h.oportunidad_id = o.id) AND (h.estado <> 'anulada'::text))) hj ON (true))
             LEFT JOIN LATERAL ( SELECT (count(*) > 0) AS hay,
                    min((m.fecha_entrega)::date) AS fecha
                   FROM modelos_3d_venta m
                  WHERE ((m.oportunidad_id = o.id) AND (m.fecha_entrega IS NOT NULL))) td ON (true))
             LEFT JOIN LATERAL ( SELECT (count(*) > 0) AS hay,
                    min(j.fecha_junta) AS fecha
                   FROM juntas j
                  WHERE ((j.oportunidad_id = o.id) AND (j.celebrada IS TRUE))) ju ON (true))
        ), filas AS (
         SELECT d.oportunidad_id,
            hc.clave AS hito,
            hc.orden,
            hc.es_ramal,
            COALESCE(x.hecho, false) AS hecho,
            x.fecha
           FROM ((datos d
             CROSS JOIN LATERAL ( VALUES ('primer_contacto'::text,d.nota,d.nota_fecha), ('visita'::text,d.escaneo,d.escaneo_fecha), ('polycam'::text,d.escaneo,d.escaneo_fecha), ('viabilidad_arquitecto'::text,d.viabilidad,d.viabilidad_fecha), ('preparacion_documentos'::text,d.generada,d.generada_fecha), ('envio_documentos'::text,d.enviada,d.enviada_fecha), ('tresd'::text,d.tresd,d.tresd_fecha), ('junta'::text,d.junta,d.junta_fecha), ('firma'::text,d.firmada,d.firmada_fecha), ('cobro'::text,false,NULL::date)) x(hito, hecho, fecha))
             JOIN hitos_comerciales hc ON ((hc.clave = x.hito)))
        )
 SELECT oportunidad_id,
    hito,
    orden,
    es_ramal,
        CASE
            WHEN hecho THEN 'hecho'::text
            WHEN (orden < max(orden) FILTER (WHERE hecho) OVER (PARTITION BY oportunidad_id)) THEN 'saltado'::text
            ELSE 'pendiente'::text
        END AS estado,
        CASE
            WHEN hecho THEN fecha
            ELSE NULL::date
        END AS fecha
   FROM filas f;
