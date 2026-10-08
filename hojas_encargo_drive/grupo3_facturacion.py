# PASO A PRODUCCION, GRUPO 3: LO QUE SE COBRA de cada hoja firmada (Monica, 8-oct-2026), con el modelo
# de pagador por linea (migracion 20261008114953):
#   lineas_facturacion    una por concepto que se cobra de la version firmada: importe y/o % a exito,
#                         PAGADOR (tipo + id), forma de cobro; cuenta vacia = la vigente del pagador
#   hitos_cobro           sus plazos, leidos del papel, en estado SIN CONCILIAR (aun no cruzados con Factusol)
#   codigos_cliente_linea los codigos que exige el cliente (FAIN, Schindler...), leidos de las notas
# El pagador sale de la hoja (tabla de trabajo); por linea: en las hojas de Schindler la SUBVENCION la paga
# la comunidad. Sin pagador (se dice): particular sin ficha aun, comunidades sin ficha.
# Reanudable: se salta las hojas que ya tienen lineas de facturacion.
#   python grupo3_facturacion.py [--escribir]
import sys, re, json, collections
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base
ESCRIBIR = '--escribir' in sys.argv
n, avisos = collections.Counter(), collections.defaultdict(list)

F = base.leer('revision_firmadas?select=*,opp:oportunidad_id(comunidad_id)&order=numero_hoja')
H = {h['id']: h for h in base.leer('hojas_encargo?estado=eq.devuelta_firmada&select=id,numero_hoja,version_firmada_id,comunidad_id')}
ya = {l['hoja_encargo_id'] for l in base.leer('lineas_facturacion?select=hoja_encargo_id')}
CL = collections.defaultdict(list)                       # concepto_hoja_id -> linea de la tabla de trabajo
for l in base.leer('revision_firmadas_lineas?concepto_hoja_id=not.is.null&select=id,concepto_hoja_id,nota'): CL[l['concepto_hoja_id']] = l
P = collections.defaultdict(list)
for p in base.leer('revision_firmadas_plazos?select=*&order=orden'): P[p['linea_id']].append(p)
bl_sub = {b['id'] for b in base.leer('bloques?select=id,codigo&codigo=like.TRAMITACION%20SUBVENCIONES*')}
CHARLY = '513a7753-0ce9-492e-b0ec-64b16a79593e'           # Hipermercado Charly: ya es "Propietario Empresa"
PROP, PROP_CIF = {}, {}
for e in base.leer('empresas_propietarias?select=id,nombre_accesalia,nombre_legal,cif'):
    for k in (e['nombre_accesalia'], e['nombre_legal']):
        if k: PROP[k.upper()] = e['id']
    if e['cif']: PROP_CIF[e['cif']] = e['id']
MARCOS = 'bd3e788a-4849-40ee-a000-0a553a689cf5'           # Marcos Ramos Lama: persona + cargo 'propietario' con su DNI (8-oct)
COD = json.load(open('codigos_cliente_propuestos.json', encoding='utf-8'))
#   limpieza de los codigos leidos (8-oct): en el formato antiguo de FAIN el "Orden" es el Grafo/Orden repetido;
#   las dos ordenes de Schindler en la 0282 son "Orden de compra"
for c in ('HE-2024-0003', 'HE-2025-0450'):
    COD[c]['codigos'] = [x for x in COD[c]['codigos'] if x[0] != 'Orden']
    COD[c]['codigos'] = [('Pedido FAIN', v) if e == 'Pedido' else (e, v) for e, v in COD[c]['codigos']]
COD['HE-2026-0282']['codigos'] = [('Orden de compra (50%)', v) for _, v in COD['HE-2026-0282']['codigos']]

def forma_cobro(f):
    t = ' '.join([f['forma_pago_texto'] or '', f['pagador_iban'] or '', f['nota'] or '']).upper()
    if 'CONFIRMING' in t: return 'confirming'
    if 'TRANSFEREN' in t: return 'transferencia'
    if 'CARGO' in t or 'DOMICILI' in t or f['pagador_iban']: return 'cargo_cuenta'
    return None

for f in F:
    h = H.get(f['hoja_encargo_id'])
    if not h or h['id'] in ya: continue
    cod = f['numero_hoja']
    t = f['pagador_tipo']
    com = f['comunidad_id'] or h['comunidad_id'] or (f['opp'] or {}).get('comunidad_id')
    if t == 'comunidad': pag = ('comunidad', com) if com else None
    elif t == 'empresa': pag = ('contrata', f['contrata_id']) if f['contrata_id'] else None
    elif t == 'particular' and cod == 'HE-2025-0684': pag = ('empresa_propietaria', CHARLY)
    elif t == 'particular' and (f['pagador_razon_social'] or '').upper() in PROP: pag = ('empresa_propietaria', PROP[(f['pagador_razon_social'] or '').upper()])
    elif t == 'particular' and (f['pagador_cif'] or '') in PROP_CIF: pag = ('empresa_propietaria', PROP_CIF[f['pagador_cif']])
    elif t == 'particular' and cod == 'HE-2025-0394': pag = ('persona', MARCOS)
    else: pag = None
    if not pag: avisos['sin pagador'].append(f'{cod} ({t})')
    fc = forma_cobro(f)
    conceptos = base.leer(f'conceptos_hoja?version_hoja_id=eq.{h["version_firmada_id"]}&desglose=eq.se_cobra&select=*')
    for c in conceptos:
        lp = pag
        cl = CL.get(c['id'])
        if pag and pag[0] == 'contrata' and c['bloque_id'] in bl_sub and com and cl and 'COMUNIDAD' in (cl['nota'] or ''):
            lp = ('comunidad', com); n['lineas de subvencion que paga la comunidad (hoja de Schindler)'] += 1
        fila = {'hoja_encargo_id': h['id'], 'concepto_hoja_id': c['id'], 'bloque_id': c['bloque_id'], 'descripcion': c['descripcion'],
                'importe': c['importe'], 'porcentaje': c['porcentaje'], 'es_porcentaje': c['importe'] is None and c['porcentaje'] is not None,
                'base_porcentaje': 'importe concedido' if c['porcentaje'] else None,
                'pagador_tipo': lp[0] if lp else None, 'pagador_id': lp[1] if lp else None, 'forma_cobro': fc,
                'origen': 'pdf', 'verificado': True,
                'notas': f'Desde la hoja firmada {cod} (revision 8-oct-2026).'}
        plazos = P.get(cl['id'], []) if cl else []
        if not plazos: avisos['linea sin plazos'].append(f'{cod}: {(c["descripcion"] or "")[:40]}')
        n['lineas'] += 1; n['plazos'] += len(plazos)
        codigos = COD.get(cod, {}).get('codigos', [])
        n['codigos'] += len(codigos)
        if not ESCRIBIR: continue
        base.insertar('lineas_facturacion', [fila])
        lid = base.leer(f'lineas_facturacion?concepto_hoja_id=eq.{c["id"]}&select=id&order=creado_en.desc&limit=1', por_tramos=False)[0]['id']
        if plazos:
            base.insertar('hitos_cobro', [{'linea_facturacion_id': lid, 'hito': p['hito'], 'orden': p['orden'], 'porcentaje': p['porcentaje'],
                                           'importe': p['importe'], 'estado': 'sin_conciliar', 'notas': p['texto']} for p in plazos])
        if codigos:
            base.insertar('codigos_cliente_linea', [{'linea_facturacion_id': lid, 'etiqueta': e, 'valor': v, 'orden': k}
                                                    for k, (e, v) in enumerate(codigos, 1)])
    n['hojas'] += 1
    n[f'forma de cobro: {fc}'] += 1

for k in sorted(n): print(f'{n[k]:5d}  {k}')
for k, v in avisos.items(): print(f'{k} ({len(v)}):', v[:12], '...' if len(v) > 12 else '')
print('ESCRITO' if ESCRIBIR else 'PRUEBA: no se ha escrito nada')
