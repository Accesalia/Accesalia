-- Las alertas filtran estado_oportunidad por seccion y por desde (lo que ya paso
-- su plazo): indice para esa consulta (15-oct-2026).
create index if not exists estado_oportunidad_seccion_desde on public.estado_oportunidad (seccion, desde);
