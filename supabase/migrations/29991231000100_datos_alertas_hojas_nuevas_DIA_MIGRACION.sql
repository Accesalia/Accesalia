-- SE APLICA EL DIA DE LA MIGRACION (rama comercial-hojas-nuevas), despues de copiar las hojas a he_*.
-- datos_alertas sin lo de las hojas viejas (Monica, 25-oct-2026): el ok de Daniel y los cambios ya son POR HOJA y los lee
-- lib/hojasOpp.ts (hojasCrudasDe); los cobros, por la ficha de facturacion de cada linea nueva (hitosDeVersiones). Fuera
-- 'revs' (revisiones_oferta) y 'cobros' (lineas_facturacion.hoja_encargo_id), y fuera su parametro p_hojas.
drop function if exists public.datos_alertas(uuid[], uuid[], uuid[], uuid[]);
create function public.datos_alertas(p_opps uuid[], p_comunidades uuid[], p_accesos uuid[])
 returns jsonb
 language sql
 stable
 set search_path to 'public'
as $function$
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
    'polyViab', coalesce((select jsonb_agg(jsonb_build_object('fecha', ep.fecha, 'creado_en', ep.creado_en,
        'v', jsonb_build_object('oportunidad_id', v.oportunidad_id)))
      from escaneados_polycam ep join viabilidades v on v.id = ep.viabilidad_id where v.oportunidad_id = any(p_opps)), '[]'),
    'solicitudes', coalesce((select jsonb_agg(jsonb_build_object('oportunidad_id', s.oportunidad_id, 'pedida_en', s.pedida_en))
      from solicitudes_viabilidad s where s.oportunidad_id = any(p_opps) and s.estado <> 'anulada'), '[]')
  );
$function$;
