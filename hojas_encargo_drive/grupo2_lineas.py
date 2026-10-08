# PASO A PRODUCCION, GRUPO 2: LINEAS E IMPORTES de las hojas firmadas (Monica, 8-oct-2026), desde las
# tablas de trabajo revision_firmadas(_lineas) a las de verdad. Manda lo LEIDO en la firmada.
#   hojas_encargo   fecha_firma (la de dentro del PDF), fecha_creacion (emision), pagador (comunidad|contrata)
#   versiones_hoja  la version firmada: importe_base (total), forma_pago (texto literal), fechas de emision
#   conceptos_hoja  de la version firmada: las leidas que casan se ACTUALIZAN (se conserva su id), las que
#                   faltan se CREAN y las que sobran se BORRAN. Forma de pago de la linea = sus plazos, en texto
#                   (los plazos troceados son el grupo 3).
#   estado          las 3 sustituidas -> enviada sin firmar + sustituciones_hoja; las 2 que no son hojas
#                   (estudio de costes, contrato TKE) -> enviada sin firmar
# Fuera de este paso: las 'duda' (se listan), y el pagador 'particular' (la hoja aun no lo admite).
#   python grupo2_lineas.py              (prueba: cuenta y no escribe)
#   python grupo2_lineas.py --escribir
import sys, json, collections
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base
ESCRIBIR = '--escribir' in sys.argv
n = collections.Counter()

F = base.leer('revision_firmadas?select=*&order=numero_hoja')
L = collections.defaultdict(list)
for l in base.leer('revision_firmadas_lineas?select=*&order=orden,id'): L[l['firmada_id']].append(l)
P = collections.defaultdict(list)
for p in base.leer('revision_firmadas_plazos?select=*&order=orden,id'): P[p['linea_id']].append(p)
H = {h['id']: h for h in base.leer('hojas_encargo?select=id,numero_hoja,fecha_creacion,fecha_firma,pagador_tipo,'
                                   'pagador_contrata_id,version_firmada_id,estado&order=id')}
V = {v['id']: v for v in base.leer('versiones_hoja?select=id,importe_base,forma_pago,fecha_generada,fecha_enviada,notas,pdfs_firmados&order=id')}
HITO = {'firma': 'a la firma', 'encargo': 'al encargo', 'entrega': 'a la entrega', 'licencia': 'a la licencia',
        'cfo': 'al fin de obra', 'concesion': 'a la concesion', 'otro': 'otro'}
def fp_linea(l):
    ps = P.get(l['id'], [])
    if not ps: return None
    return '; '.join((p['texto'] or '').strip() or f"{p['porcentaje'] or ''}% {HITO[p['hito']]}" for p in ps)[:1000]

dudas = [f['numero_hoja'] for f in F if f['revision'] == 'duda']
# Solo lo que falta por pasar: al pasar una hoja queda en 'corregido' (asi el script se puede volver a lanzar
# sin duplicar lineas; se lanzo una vez sin este freno el 8-oct y se arreglo enlazando las 111 lineas nuevas).
hacer = [f for f in F if f['revision'] in ('ok', 'pendiente')]
SUST = json.load(open('a_enviada_sin_firmar.json', encoding='utf-8'))
cod_id = {h['numero_hoja']: hid for hid, h in H.items()}

for f in hacer:
    h = H[f['hoja_encargo_id']]; cod = f['numero_hoja']
    if cod in SUST: continue                                  # van aparte, abajo
    vid = h['version_firmada_id']; v = V[vid]
    # --- la hoja
    ch = {}
    if f['fecha_firma'] and f['fecha_firma'] != h['fecha_firma']: ch['fecha_firma'] = f['fecha_firma']; ch['fecha_estado'] = f['fecha_firma']; n['hoja: fecha de firma'] += 1
    if f['fecha_emision'] and f['fecha_emision'] != h['fecha_creacion']: ch['fecha_creacion'] = f['fecha_emision']; n['hoja: fecha de emision'] += 1
    if f['pagador_tipo'] == 'empresa' and f['contrata_id'] and (h['pagador_tipo'] != 'contrata' or h['pagador_contrata_id'] != f['contrata_id']):
        ch['pagador_tipo'] = 'contrata'; ch['pagador_contrata_id'] = f['contrata_id']; n['hoja: paga una contrata'] += 1
    elif f['pagador_tipo'] == 'comunidad' and h['pagador_tipo'] != 'comunidad':
        ch['pagador_tipo'] = 'comunidad'; ch['pagador_contrata_id'] = None; n['hoja: paga la comunidad'] += 1
    # --- la version firmada
    cv = {}
    tot = f['total_base']
    if (v['importe_base'] is None) != (tot is None) or (tot is not None and abs(float(v['importe_base']) - float(tot)) > 0.005):
        cv['importe_base'] = tot; n['version: total'] += 1
    if f['forma_pago_texto'] and f['forma_pago_texto'] != v['forma_pago']: cv['forma_pago'] = f['forma_pago_texto']; n['version: forma de pago'] += 1
    if 'fecha_creacion' in ch: cv['fecha_generada'] = cv['fecha_enviada'] = f['fecha_emision']
    # --- las lineas
    alta, cambio, baja = [], [], []
    for l in L[f['id']]:
        fila = {'bloque_id': l['bloque_id'], 'descripcion': l['texto'], 'importe': l['importe'], 'porcentaje': l['porcentaje'],
                'incluido': True, 'desglose': 'incluido' if l['incluido'] else 'se_cobra', 'forma_pago': None if l['incluido'] else fp_linea(l)}
        if l['comparacion'] == 'sobra_en_base': baja.append(l)
        elif l['comparacion'] == 'falta_en_base' or not l['concepto_hoja_id']: alta.append(fila)
        else: cambio.append((l['concepto_hoja_id'], fila, l['comparacion']))
    n['lineas: nuevas'] += len(alta); n['lineas: borradas'] += len(baja)
    n['lineas: corregidas'] += sum(1 for c in cambio if c[2] == 'distinta'); n['lineas: iguales (se completa su forma de pago)'] += sum(1 for c in cambio if c[2] == 'coincide')
    if not ESCRIBIR: continue
    if ch: base.actualizar(f'hojas_encargo?id=eq.{h["id"]}', ch)
    if cv: base.actualizar(f'versiones_hoja?id=eq.{vid}', cv)
    for chid, fila, _ in cambio: base.actualizar(f'conceptos_hoja?id=eq.{chid}', fila)
    if alta:
        base.insertar('conceptos_hoja', [dict(fila, hoja_encargo_id=h['id'], version_hoja_id=vid) for fila in alta])
        cs = base.leer(f'conceptos_hoja?version_hoja_id=eq.{vid}&select=id,bloque_id,descripcion,importe')
        usados = {l['concepto_hoja_id'] for l in L[f['id']] if l['concepto_hoja_id']}
        for l in [l for l in L[f['id']] if l['comparacion'] == 'falta_en_base' and not l['concepto_hoja_id']]:
            c = next((c for c in cs if c['id'] not in usados and c['bloque_id'] == l['bloque_id']
                      and c['descripcion'] == l['texto'] and c['importe'] == l['importe']), None)
            if c: usados.add(c['id']); base.actualizar(f'revision_firmadas_lineas?id=eq.{l["id"]}', {'concepto_hoja_id': c['id']})
    for l in baja:
        base.actualizar(f'revision_firmadas_lineas?id=eq.{l["id"]}', {'concepto_hoja_id': None, 'nota': (l['nota'] or '') + ' | BORRADA de la base (grupo 2, 8-oct).'})
        if l['concepto_hoja_id']: base.borrar(f'conceptos_hoja?id=eq.{l["concepto_hoja_id"]}')
    base.actualizar(f'revision_firmadas?id=eq.{f["id"]}', {'revision': 'corregido'})

# --- estados: sustituidas y las que no son hojas -> enviada sin firmar
FUERA = json.load(open('fuera_de_firmadas.json', encoding='utf-8'))
for cod, motivo in list(SUST.items()) + list(FUERA.items()):
    hid = cod_id[cod]; h = H[hid]
    if h['estado'] != 'devuelta_firmada': continue
    vid = h['version_firmada_id']; v = V[vid]
    texto = (f"El PDF que tenia como firmada era la firmada de {motivo['sustituida_por']}: esta hoja no se firmo (Monica, 8-oct)."
             if isinstance(motivo, dict) else f'El PDF que tenia como firmada no es una hoja de encargo: {motivo} (Monica, 8-oct).')
    n['estado: pasa a enviada sin firmar'] += 1
    if not ESCRIBIR: continue
    base.actualizar(f'hojas_encargo?id=eq.{hid}', {'estado': 'enviada_comunidad', 'fecha_firma': None, 'version_firmada_id': None,
                                                   'fecha_estado': h['fecha_creacion']})
    base.actualizar(f'versiones_hoja?id=eq.{vid}', {'notas': '\n'.join(x for x in (texto, v['notas']) if x), 'pdfs_firmados': []})
    if isinstance(motivo, dict):
        if not base.leer(f'sustituciones_hoja?hoja_antigua_id=eq.{hid}&hoja_nueva_id=eq.{cod_id[motivo["sustituida_por"]]}&select=creado_en'):
            base.insertar('sustituciones_hoja', [{'hoja_antigua_id': hid, 'hoja_nueva_id': cod_id[motivo['sustituida_por']],
                                                  'nota': 'Revision de firmadas (8-oct): su PDF era la firmada de la nueva.'}])

for k in sorted(n): print(f'{n[k]:5d}  {k}')
print('hojas que se tocan:', len(hacer), '| fuera por duda:', len(dudas), dudas)
print('ESCRITO' if ESCRIBIR else 'PRUEBA: no se ha escrito nada')
