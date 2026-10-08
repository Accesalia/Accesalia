# REVISION DE LAS FIRMADAS, paso 3: lo LEIDO (tmp_revision/<lote>_leidas.jsonl, instrucciones_revision.md)
# a las tablas de TRABAJO revision_firmadas -> _lineas -> _plazos (la app no las ve). Compara con lo
# que hay hoy en la base y lo deja dicho en cada fila. NO toca las tablas de verdad.
# Reanudable: si la hoja ya estaba en revision, se borra y se vuelve a meter.
#   python cargar_revision.py prueba
# Estado de la revision:
#   ok        = lo leido coincide con la base
#   pendiente = hay diferencias CLARAS (manda lo leido): se corregira la base al pasar los datos
#   duda      = algo no se lee seguro o hay que preguntarlo
import sys, json, re, datetime, collections
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base
LOTE = sys.argv[1]
T = 'tmp_revision'
prep = {h['numero_hoja']: h for h in json.load(open(f'{T}/{LOTE}.json', encoding='utf-8'))}
leidas = [json.loads(l) for l in open(f'{T}/{LOTE}_leidas.jsonl', encoding='utf-8') if l.strip()]
# Resuelto a mano tras leer (Monica, 8-oct): empresa que acepta con sello = firmada
A_MANO = {'HE-2025-0507': {'pagador_tipo': 'empresa', 'razon_social': 'FAIN ASCENSORES S.A', 'firma_presente': True}}

import os, glob as _g
FIRMAS = {}   # firmas digitales por PDF (<hoja>-<k>): los nombres de quien firma
for f in _g.glob(f'{T}/pdf/*.pdf'):
    b_ = open(f, 'rb').read()
    if b'/ByteRange' in b_:
        FIRMAS[os.path.basename(f)[:-4]] = sorted({m.decode('latin-1') for m in re.findall(rb'/Name\s*\(([^)]{3,80})\)', b_)})
bl = {b['codigo']: b['id'] for b in base.leer('bloques?select=id,codigo')}
norm = lambda s: re.sub(r'[^A-Z0-9?]', '', (s or '').upper())
com_cif = collections.defaultdict(list)
for c in base.leer('comunidades?select=id,cif_comunidad&cif_comunidad=not.is.null'): com_cif[norm(c['cif_comunidad'])].append(c['id'])
contratas = base.leer('contratas?select=id,nombre,cif,razon_social')
con_cif = {norm(c['cif']): c['id'] for c in contratas if c['cif']}
hoja_com = {h['id']: h['comunidad_id'] for h in base.leer('hojas_encargo?estado=eq.devuelta_firmada&select=id,comunidad_id')}
HOY = datetime.date.today().isoformat()

def contrata_por_nombre(t):
    t = norm(t)
    m = [c['id'] for c in contratas if norm(c['nombre']) and (norm(c['nombre']) in t)]
    return m[0] if len(m) == 1 else None

n = collections.Counter()
for L in leidas:
    cod = L['numero_hoja']; P = prep[cod]; L.update(A_MANO.get(cod, {}))
    notas, duda = [], not L.get('seguro', True)
    # --- fechas: la de firma es la de DENTRO del PDF, si tiene sentido; si no, la de Drive
    pdf = P['pdfs'][0]
    emi = L.get('fecha_emision') or P['fecha_emision_base']
    ff = pdf['fecha_firma_pdf']
    if ff and emi <= ff <= HOY: fecha_firma = ff
    else:
        fecha_firma = pdf['fecha_archivo_drive']
        if ff: notas.append(f'La fecha de dentro del PDF ({ff}) no tiene sentido: se usa la del archivo en Drive.')
    if fecha_firma and emi and fecha_firma < emi: notas.append('OJO: firma anterior a la emision.'); duda = True
    if fecha_firma != P['fecha_firma_base']: notas.append(f"Fecha de firma: base {P['fecha_firma_base']} -> {fecha_firma}.")
    if emi != P['fecha_emision_base']: notas.append(f"Fecha de emision: base {P['fecha_emision_base']} -> {emi}.")
    # --- firma
    firma = L.get('firma_presente')
    if L.get('pagador_tipo') == 'empresa' and firma is False:
        firma = True; notas.append('Empresa: acepta sin firma manuscrita (sello/codigos/casilla), vale como firmada.')
    # FIRMA DIGITAL (8-oct): no sale en las imagenes; se detecta en el propio PDF. La de Daniel no cuenta.
    dig = [s for k in range(1, len(P['pdfs']) + 1) for s in FIRMAS.get(f'{cod}-{k}', []) if 'DE SOTO' not in s.upper()]
    if dig:
        notas.append('Firma digital del cliente: ' + '; '.join(dig).replace('\\', '') + '.')
        if firma is False: firma = True
    if firma is False: notas.append('SIN FIRMA DEL CLIENTE: no esta firmada.'); duda = True
    # --- pagador
    tipo = L.get('pagador_tipo'); cif = norm(L.get('cif')); com_id = con_id = None; crear = None
    if tipo == 'comunidad':
        ids = com_cif.get(cif, []) if cif and '?' not in cif else []
        com_id = ids[0] if len(ids) == 1 else None
        crear = bool(cif) and not ids
        if com_id and hoja_com.get(P['hoja_id']) and com_id != hoja_com[P['hoja_id']]:
            notas.append('La comunidad del CIF NO es la que tiene la hoja en la base.'); duda = True
    elif tipo == 'empresa':
        con_id = con_cif.get(cif) or contrata_por_nombre(L.get('razon_social'))
        crear = not con_id
    pb = P['pagador_base']
    if tipo and not pb.startswith('comunidad' if tipo == 'comunidad' else 'contrata'): notas.append(f'Pagador: base "{pb}" -> {tipo}.')
    # --- total: lo que dice la hoja; si no trae, la suma de los fijos
    fijos = sum(x['importe'] or 0 for x in L['lineas'] if not x.get('incluido'))
    total = L.get('total_base')
    if total is None: total = fijos; notas.append('Total sumado (la hoja no trae total general).')
    elif abs(total - fijos) > 0.5: notas.append(f'El total ({total}) no cuadra con la suma de lineas ({fijos}).'); duda = True
    if P['total_base'] is None or abs(float(P['total_base']) - total) > 0.5: notas.append(f"Total: base {P['total_base']} -> {total}.")
    # --- lineas: cada leida contra los conceptos de la base (por bloque, mejor si coincide el importe)
    libres = list(P['conceptos_base']); filas_l = []
    for i, x in enumerate(L['lineas'], 1):
        c_ = [c for c in libres if c['bloque'] == x.get('bloque')]
        c = next((c for c in c_ if c['importe'] == x.get('importe')), c_[0] if c_ else None)
        if c:
            libres.remove(c)
            igual = (c['importe'] == x.get('importe') and (c['porcentaje'] or None) == (x.get('porcentaje') or None)
                     and c['incluido'] == bool(x.get('incluido')))
            comp, nota_l = ('coincide', None) if igual else ('distinta', f"base: importe {c['importe']}, % {c['porcentaje']}, incluido {c['incluido']}")
        else: comp, nota_l = 'falta_en_base', None
        if x.get('bloque') and x['bloque'] not in bl: duda = True; nota_l = f"bloque desconocido {x['bloque']}"
        filas_l.append((x, comp, c['concepto_hoja_id'] if c else None, nota_l, i))
    for c in libres:
        filas_l.append(({'texto': c['texto'], 'bloque': c['bloque'], 'importe': c['importe'], 'porcentaje': c['porcentaje'],
                         'incluido': c['incluido'], 'plazos': []}, 'sobra_en_base', c['concepto_hoja_id'], 'esta en la base y NO en la hoja', None))
    distintas = [f for f in filas_l if f[1] != 'coincide']
    if L.get('nota'): notas.append('Lectura: ' + L['nota'])
    if L.get('abonado'): notas.append('Abonado: ' + L['abonado'])
    revision = 'duda' if duda else ('ok' if not distintas and not any(s.startswith(('Fecha', 'Total:', 'Pagador')) for s in notas) else 'pendiente')
    n[revision] += 1
    # --- escribir (reanudable)
    base.borrar(f'revision_firmadas?hoja_encargo_id=eq.{P["hoja_id"]}')
    fid = base.insertar('revision_firmadas', [{
        'hoja_encargo_id': P['hoja_id'], 'numero_hoja': cod, 'oportunidad_id': P['oportunidad_id'],
        'pdf_firmado': pdf['archivo_drive'], 'fecha_emision': emi, 'fecha_firma_pdf': ff,
        'fecha_archivo_drive': pdf['fecha_archivo_drive'], 'fecha_firma': fecha_firma, 'fecha_casilla': L.get('fecha_casilla'),
        'firma_presente': firma, 'pagador_tipo': tipo, 'pagador_razon_social': L.get('razon_social'), 'pagador_cif': L.get('cif'),
        'pagador_iban': L.get('iban'), 'pagador_direccion': L.get('direccion'), 'comunidad_id': com_id, 'contrata_id': con_id,
        'pagador_hay_que_crear': crear, 'total_base': total, 'forma_pago_texto': L.get('forma_pago_texto'),
        'revision': revision, 'nota': '\n'.join(notas) or None}])
    fid = base.leer(f'revision_firmadas?hoja_encargo_id=eq.{P["hoja_id"]}&select=id')[0]['id']
    for x, comp, chid, nota_l, orden in filas_l:
        base.insertar('revision_firmadas_lineas', [{'firmada_id': fid, 'orden': orden, 'texto': x.get('texto'),
            'bloque_id': bl.get(x.get('bloque')), 'importe': x.get('importe'), 'porcentaje': x.get('porcentaje'),
            'incluido': bool(x.get('incluido')), 'concepto_hoja_id': chid, 'comparacion': comp, 'nota': nota_l}])
        if x.get('plazos'):
            lid = base.leer(f'revision_firmadas_lineas?firmada_id=eq.{fid}&orden=eq.{orden}&select=id')[0]['id']
            base.insertar('revision_firmadas_plazos', [{'linea_id': lid, 'orden': k, 'hito': p['hito'], 'porcentaje': p.get('porcentaje'),
                                                        'importe': p.get('importe'), 'texto': p.get('texto')} for k, p in enumerate(x['plazos'], 1)])
    print(cod, revision, '| lineas', collections.Counter(f[1] for f in filas_l).most_common(), '|', ' / '.join(notas)[:160])
print(dict(n))
