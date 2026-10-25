-- SE APLICA EL DIA DE LA MIGRACION (rama comercial-hojas-nuevas), despues de copiar las hojas a he_*.
-- Ganada y firmado sobre las hojas nuevas (25-oct-2026):
--   - he_importe_version: el importe de cada version = lo que se cobra con importe; el conjunto con «solo el total», la
--     suma de sus proyectos (y lo de dentro no suma aparte); lo que va a exito no suma. UN SOLO SITIO en la base para
--     esta regla (la misma que lib/hojasOpp.ts).
--   - resultado_oportunidad: ganada = alguna version firmada (de firmada_recibida en adelante); primera_firma = la fecha
--     de la primera firmada_recibida.
--   - cartera_gestor_resumen: el importe firmado de cada opp = la suma de sus versiones firmadas (he_importe_version).

create view public.he_importe_version with (security_invoker = true) as
  select v.id as version_id, v.oportunidad_id, v.estado,
    coalesce(sum(
      case
        when b.codigo = 'PROYECTO CONJUNTO' and l.desglosar_precios is false
          then (select coalesce(sum(h.importe), 0) from public.he_lineas_compromisos h where h.padre_id = l.id)
        when pb.codigo = 'PROYECTO CONJUNTO' and p.desglosar_precios is false then 0
        else coalesce(l.importe, 0)
      end) filter (where l.se_cobra), 0) as importe
  from public.he_versiones_hoja v
  left join public.he_lineas_compromisos l on l.version_id = v.id
  left join public.bloques b on b.id = l.bloque_id
  left join public.he_lineas_compromisos p on p.id = l.padre_id
  left join public.bloques pb on pb.id = p.bloque_id
  group by v.id, v.oportunidad_id, v.estado;
comment on view public.he_importe_version is 'El importe de cada version de hoja: lo que se cobra con importe (el conjunto con «solo el total», la suma de sus proyectos). No se guarda: se calcula. La misma regla que lib/hojasOpp.ts.';

create or replace view public.resultado_oportunidad with (security_invoker = true) as
 SELECT o.id AS oportunidad_id,
    o.estado,
    o.fecha_apertura,
    f.primera_firma,
        CASE
            WHEN o.estado = 'anulada'::text THEN 'anulada'::text
            WHEN f.primera_firma IS NOT NULL OR f.hay_firmada THEN 'ganada'::text
            WHEN o.estado = 'cerrada'::text THEN 'perdida'::text
            ELSE 'en_curso'::text
        END AS resultado,
        CASE
            WHEN f.primera_firma IS NOT NULL AND o.fecha_apertura IS NOT NULL THEN f.primera_firma - o.fecha_apertura
            ELSE NULL::integer
        END AS dias_hasta_firma
   FROM oportunidades o
     LEFT JOIN LATERAL ( SELECT min(e.fecha)::date AS primera_firma,
            bool_or(true) AS hay_firmada
           FROM he_versiones_hoja v
             JOIN he_estados_hoja e ON e.version_id = v.id AND e.estado = 'firmada_recibida'::text
          WHERE v.oportunidad_id = o.id
            AND v.estado = ANY (ARRAY['firmada_recibida'::text, 'ok_comercial'::text, 'hitos_validados'::text, 'primer_cobro'::text, 'a_produccion'::text, 'ok_administracion'::text])) f ON true;

create or replace view public.cartera_gestor_resumen with (security_invoker = true) as
 WITH opps AS MATERIALIZED (
         SELECT a.puesto_id,
            o.id,
            COALESCE(o.fecha_apertura, o.creado_en::date) AS apertura
           FROM admin_de_oportunidad a
             JOIN oportunidades o ON o.id = a.oportunidad_id
          WHERE a.puesto_id IS NOT NULL
        ), ids AS MATERIALIZED (
         SELECT DISTINCT opps.id
           FROM opps
        ), firmado_opp AS (
         SELECT iv.oportunidad_id,
            sum(iv.importe) AS importe
           FROM he_importe_version iv
          WHERE iv.estado = ANY (ARRAY['firmada_recibida'::text, 'ok_comercial'::text, 'hitos_validados'::text, 'primer_cobro'::text, 'a_produccion'::text, 'ok_administracion'::text])
            AND (iv.oportunidad_id IN ( SELECT ids.id FROM ids))
          GROUP BY iv.oportunidad_id
        ), nota_opp AS (
         SELECT notas_oportunidad.oportunidad_id,
            max(COALESCE(notas_oportunidad.fecha::timestamp with time zone, notas_oportunidad.creado_en)) AS cuando
           FROM notas_oportunidad
          WHERE notas_oportunidad.origen <> 'sali'::text AND (notas_oportunidad.oportunidad_id IN ( SELECT ids.id
                   FROM ids))
          GROUP BY notas_oportunidad.oportunidad_id
        ), nota_puesto AS (
         SELECT notas_oportunidad.quien_puesto_id AS puesto_id,
            max(COALESCE(notas_oportunidad.fecha::timestamp with time zone, notas_oportunidad.creado_en)) AS cuando
           FROM notas_oportunidad
          WHERE notas_oportunidad.origen <> 'sali'::text AND notas_oportunidad.quien_puesto_id IS NOT NULL
          GROUP BY notas_oportunidad.quien_puesto_id
        ), correo_opp AS (
         SELECT correos_enviados.oportunidad_id,
            max(correos_enviados.creado_en) AS cuando
           FROM correos_enviados
          WHERE correos_enviados.ok AND (correos_enviados.oportunidad_id IN ( SELECT ids.id
                   FROM ids))
          GROUP BY correos_enviados.oportunidad_id
        ), correo_puesto AS (
         SELECT co.puesto_id,
            max(ce.creado_en) AS cuando
           FROM correos_enviados ce
             CROSS JOIN LATERAL unnest(ce.para) d(email)
             JOIN correo co ON co.puesto_id IS NOT NULL AND lower(co.email) = lower(d.email)
          WHERE ce.ok
          GROUP BY co.puesto_id
        ), fases_opp AS (
         SELECT historial_estado_oportunidad.oportunidad_id,
            max(historial_estado_oportunidad.cuando) AS cuando
           FROM historial_estado_oportunidad
          WHERE historial_estado_oportunidad.cuando <= now() AND (historial_estado_oportunidad.oportunidad_id IN ( SELECT ids.id
                   FROM ids))
          GROUP BY historial_estado_oportunidad.oportunidad_id
        ), por_gestor AS (
         SELECT x.puesto_id,
            COALESCE(sum(f.importe), 0::numeric) AS importe_firmado,
            max(x.apertura) AS ultima_opp_nueva,
            max(n.cuando) AS diario,
            max(c.cuando) AS correo,
            max(fa.cuando) AS fases
           FROM opps x
             LEFT JOIN firmado_opp f ON f.oportunidad_id = x.id
             LEFT JOIN nota_opp n ON n.oportunidad_id = x.id
             LEFT JOIN correo_opp c ON c.oportunidad_id = x.id
             LEFT JOIN fases_opp fa ON fa.oportunidad_id = x.id
          GROUP BY x.puesto_id
        ), contacto AS (
         SELECT g_1.puesto_id,
            GREATEST(g_1.diario, np.cuando) AS diario,
            GREATEST(g_1.correo, cp.cuando) AS correo,
            g_1.fases
           FROM por_gestor g_1
             LEFT JOIN nota_puesto np ON np.puesto_id = g_1.puesto_id
             LEFT JOIN correo_puesto cp ON cp.puesto_id = g_1.puesto_id
        )
 SELECT g.puesto_id,
    p.consolidado_en,
    g.importe_firmado,
    g.ultima_opp_nueva,
    GREATEST(k.diario, k.correo, k.fases) AS ultimo_contacto,
        CASE GREATEST(k.diario, k.correo, k.fases)
            WHEN k.diario THEN 'diario'::text
            WHEN k.correo THEN 'correo'::text
            WHEN k.fases THEN 'fases'::text
            ELSE NULL::text
        END AS ultimo_contacto_fuente,
    ci.id AS proxima_cita_id,
    ci.inicio AS proxima_cita_inicio,
    ci.asunto AS proxima_cita_asunto,
    ci.tipo_nombre AS proxima_cita_tipo,
    ci.con_quien AS proxima_cita_con
   FROM por_gestor g
     JOIN puesto p ON p.id = g.puesto_id
     JOIN contacto k ON k.puesto_id = g.puesto_id
     LEFT JOIN LATERAL ( SELECT ct.id,
            ct.inicio,
            ct.asunto,
            tc.nombre AS tipo_nombre,
            ARRAY( SELECT COALESCE(NULLIF(TRIM(BOTH FROM concat_ws(' '::text, pe.nombre, pe.apellidos)), ''::text), q2.nombre) AS "coalesce"
                   FROM citas_con_quien q2
                     LEFT JOIN persona pe ON pe.id = q2.persona_id
                  WHERE q2.cita_id = ct.id AND q2.puesto_id IS DISTINCT FROM g.puesto_id AND (p.persona_id IS NULL OR q2.persona_id IS DISTINCT FROM p.persona_id)) AS con_quien
           FROM citas ct
             JOIN citas_con_quien q ON q.cita_id = ct.id AND (q.puesto_id = g.puesto_id OR p.persona_id IS NOT NULL AND q.persona_id = p.persona_id)
             LEFT JOIN tipos_cita tc ON tc.clave = ct.tipo
          WHERE ct.estado = 'pendiente'::text AND ct.inicio > now()
          ORDER BY ct.inicio
         LIMIT 1) ci ON true;
