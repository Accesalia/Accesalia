-- LO QUE NECESITAN LAS ALERTAS, DE UNA VEZ (16-oct-2026, Monica: "solo cambiar
-- de pestaña lleva 2-3 segundos"). lib/resumenComercial.ts (cargar) pedia cada
-- tabla por tramos de 150 opps: con todas las carteras, ~1.570 opps = 11 tramos
-- x 14 tablas = ~170 peticiones a la vez, que la base atendia en cola (~1 s cada
-- una, aunque devolvieran 0 filas). Esto devuelve EXACTAMENTE las mismas filas,
-- con la misma forma que daban esas consultas, en una sola llamada:
--   juntas, tres, citas, viab, revs, notas, inter, llam, admins, puestos,
--   conPoly, cobros, polyViab, solicitudes.
-- Lo usan las alertas, faltaDeMuchas y fechaEntradaDeMuchas (tabla y barrido de
-- estado_oportunidad): si algo cambia aqui, cambia en los tres.
create or replace function public.datos_alertas(
  p_opps uuid[], p_comunidades uuid[], p_accesos uuid[], p_hojas uuid[]
) returns jsonb
language sql stable security invoker set search_path = public as $$
  select jsonb_build_object(
    'juntas', coalesce((select jsonb_agg(jsonb_build_object('oportunidad_id', j.oportunidad_id, 'fecha_junta', j.fecha_junta,
        'celebrada', j.celebrada, 'resultado', j.resultado, 'creado_en', j.creado_en))
      from juntas j where j.oportunidad_id = any(p_opps)), '[]'),
    'tres', coalesce((select jsonb_agg(jsonb_build_object('oportunidad_id', m.oportunidad_id, 'tipo_3d', m.tipo_3d,
        'estado', m.estado, 'creado_en', m.creado_en))
      from modelos_3d_venta m where m.oportunidad_id = any(p_opps)), '[]'),
    'citas', coalesce((select jsonb_agg(jsonb_build_object('oportunidad_id', c.oportunidad_id, 'inicio', c.inicio, 'creado_en', c.creado_en))
      from citas c where c.oportunidad_id = any(p_opps) and c.tipo = 'escaneo_polycam' and c.estado <> 'anulada'), '[]'),
    'viab', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'oportunidad_id', v.oportunidad_id,
        'enviada_en', v.enviada_en, 'url_pdf', v.url_pdf))
      from viabilidades v where v.oportunidad_id = any(p_opps)), '[]'),
    'revs', coalesce((select jsonb_agg(jsonb_build_object('oportunidad_id', r.oportunidad_id, 'numero', r.numero, 'estado', r.estado,
        'enviada_en', r.enviada_en, 'resuelta_en', r.resuelta_en, 'comentario', r.comentario,
        'resuelve', case when e.id is null then null else jsonb_build_object('nombre', e.nombre) end))
      from revisiones_oferta r left join equipo e on e.id = r.resuelta_por where r.oportunidad_id = any(p_opps)), '[]'),
    'notas', coalesce((select jsonb_agg(jsonb_build_object('oportunidad_id', n.oportunidad_id, 'fecha', n.fecha, 'creado_en', n.creado_en))
      from notas_oportunidad n where n.oportunidad_id = any(p_opps)), '[]'),
    'inter', coalesce((select jsonb_agg(jsonb_build_object('oportunidad_id', i.oportunidad_id, 'fecha_evento', i.fecha_evento, 'creado_en', i.creado_en))
      from interacciones i where i.oportunidad_id = any(p_opps)), '[]'),
    'llam', coalesce((select jsonb_agg(jsonb_build_object('donde_oportunidad_id', l.donde_oportunidad_id, 'creado_en', l.creado_en))
      from llamadas l where l.donde_oportunidad_id = any(p_opps)), '[]'),
    'admins', coalesce((select jsonb_agg(jsonb_build_object('comunidad_id', a.comunidad_id,
        'empresa', case when em.id is null then null else jsonb_build_object('nombre_accesalia', em.nombre_accesalia) end,
        'puesto', case when pu.id is null then null else jsonb_build_object('telefono_empresa', pu.telefono_empresa,
          'persona', case when pe.id is null then null else jsonb_build_object('nombre', pe.nombre, 'apellidos', pe.apellidos, 'telefono_personal', pe.telefono_personal) end) end))
      from comunidad_admin_responsable a
      left join empresa em on em.id = a.empresa_id
      left join puesto pu on pu.id = a.puesto_id
      left join persona pe on pe.id = pu.persona_id
      where a.vigente and a.comunidad_id = any(p_comunidades)), '[]'),
    'puestos', coalesce((select jsonb_agg(jsonb_build_object('figura_legal_propietaria_id', pu.figura_legal_propietaria_id, 'cargo', pu.cargo,
        'persona', case when pe.id is null then null else jsonb_build_object('nombre', pe.nombre, 'apellidos', pe.apellidos, 'telefono_personal', pe.telefono_personal) end))
      from puesto pu left join persona pe on pe.id = pu.persona_id
      where pu.hasta is null and pu.figura_legal_propietaria_id = any(p_comunidades)), '[]'),
    'conPoly', coalesce((select jsonb_agg(jsonb_build_object('acceso_id', rp.acceso_id,
        'polycam', case when ep.id is null then null else jsonb_build_object('fecha', ep.fecha, 'creado_en', ep.creado_en) end))
      from relacion_polycam_acceso rp left join escaneados_polycam ep on ep.id = rp.polycam_id
      where rp.acceso_id = any(p_accesos)), '[]'),
    'cobros', coalesce((select jsonb_agg(jsonb_build_object('hoja_encargo_id', lf.hoja_encargo_id, 'es_porcentaje', lf.es_porcentaje,
        'hitos', coalesce((select jsonb_agg(jsonb_build_object('estado', h.estado)) from hitos_cobro h where h.linea_facturacion_id = lf.id), '[]')))
      from lineas_facturacion lf where lf.quitada_en is null and lf.hoja_encargo_id = any(p_hojas)), '[]'),
    'polyViab', coalesce((select jsonb_agg(jsonb_build_object('fecha', ep.fecha, 'creado_en', ep.creado_en,
        'v', jsonb_build_object('oportunidad_id', v.oportunidad_id)))
      from escaneados_polycam ep join viabilidades v on v.id = ep.viabilidad_id where v.oportunidad_id = any(p_opps)), '[]'),
    'solicitudes', coalesce((select jsonb_agg(jsonb_build_object('oportunidad_id', s.oportunidad_id, 'pedida_en', s.pedida_en))
      from solicitudes_viabilidad s where s.oportunidad_id = any(p_opps) and s.estado <> 'anulada'), '[]')
  );
$$;

comment on function public.datos_alertas(uuid[], uuid[], uuid[], uuid[]) is
  'Lo que necesitan las alertas y el estado de las opps (lib/resumenComercial.ts, cargar), en una sola llamada y con la misma forma que las consultas sueltas que sustituye (16-oct-2026).';
