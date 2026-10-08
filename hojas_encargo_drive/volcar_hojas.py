# VOLCADO, paso de ESCRITURA (Monica, 7-oct-2026). Mete volcado_hojas.json (preparar_volcado.py)
# en prod. Va DESPUES de la migracion que deja hojas y lineas de facturacion a cero y cuelga la
# hoja de la opp (comunidad opcional). Ids generados aqui para enlazar todo sin releer.
# Deja volcado_ids.json (codigo HE -> hoja y versiones, con sus ficheros) para subir los
# documentos a Storage en el paso siguiente.
import sys, json, uuid, collections
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base

d = json.load(open('volcado_hojas.json', encoding='utf-8'))
# Reanudable: si un intento anterior metio parte de las hojas (8-oct: se paro en la fila 600 por
# una fecha mala), se aprovechan por su codigo; versiones y demas no pueden existir aun.
existentes = {h['numero_hoja']: h['id'] for h in base.leer('hojas_encargo?select=id,numero_hoja')}
ajenas = set(existentes) - {h['numero_hoja'] for h in d['hojas']}
if ajenas: sys.exit(f'hojas_encargo tiene hojas que no son de este volcado: {sorted(ajenas)[:5]}')
if base.leer('versiones_hoja?select=id&limit=1'): sys.exit('ya hay versiones: este volcado no se puede reanudar')
print('ya estaban', len(existentes))

hojas, versiones, conceptos, actuaciones, act_accesos, firmadas, ids = [], [], [], [], [], {}, {}
for h in d['hojas']:
    hid = existentes.get(h['numero_hoja']) or str(uuid.uuid4())
    if h['numero_hoja'] not in existentes: hojas.append({'id': hid, 'numero_hoja': h['numero_hoja'], 'oportunidad_id': h['oportunidad_id'],
                  'comunidad_id': h['comunidad_id'], 'pagador_tipo': h['pagador_tipo'], 'emisor': h['emisor'],
                  'fecha_creacion': h['fecha_creacion'], 'fecha_firma': h['fecha_firma'], 'estado': h['estado'],
                  'fecha_estado': h['fecha_estado'], 'descripcion': h['descripcion']})
    ids[h['numero_hoja']] = {'hoja_id': hid, 'versiones': []}
    for v in h['versiones']:
        vid = str(uuid.uuid4())
        versiones.append({'id': vid, 'hoja_encargo_id': hid, 'numero_version': v['numero_version'],
                          'fecha_generada': v['fecha_generada'], 'fecha_enviada': v['fecha_enviada'],
                          'url_pdf_hoja': v['url_pdf_hoja'], 'importe_base': v['importe_base'],
                          'forma_pago': v['forma_pago'], 'notas': v['notas'], 'iva_porcentaje': 21})
        ids[h['numero_hoja']]['versiones'].append({'version_id': vid, 'numero': v['numero_version'],
                                                   'enviados': v['ficheros_enviados'], 'firmados': v['ficheros_firmados']})
        if v['datos']:
            for c in h['conceptos']:
                conceptos.append(dict(c, hoja_encargo_id=hid, version_hoja_id=vid))
            if h['estado'] == 'devuelta_firmada': firmadas[hid] = vid
    for a in h['actuaciones']:
        aid = str(uuid.uuid4())
        actuaciones.append({'id': aid, 'hoja_encargo_id': hid, 'tipo_proyecto_id': a['tipo_proyecto_id'], 'orden': a['orden']})
        act_accesos += [{'actuacion_id': aid, 'acceso_id': x} for x in h['accesos']]
sust = [{'hoja_antigua_id': ids[s['antigua']]['hoja_id'], 'hoja_nueva_id': ids[s['nueva']]['hoja_id']}
        for s in d['sustituciones'] if s['antigua'] in ids and s['nueva'] in ids]
sust = list({(s['hoja_antigua_id'], s['hoja_nueva_id']): s for s in sust}.values())

print('hojas', base.insertar('hojas_encargo', hojas))
print('versiones', base.insertar('versiones_hoja', versiones))
print('conceptos', base.insertar('conceptos_hoja', conceptos))
print('actuaciones', base.insertar('actuaciones_hoja', actuaciones))
print('actuacion_accesos', base.insertar('actuacion_accesos', act_accesos))
print('sustituciones', base.insertar('sustituciones_hoja', sust))
for hid, vid in firmadas.items():
    base.actualizar(f'hojas_encargo?id=eq.{hid}', {'version_firmada_id': vid})
print('version firmada marcada en', len(firmadas))
json.dump(ids, open('volcado_ids.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
