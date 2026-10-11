# -*- coding: utf-8 -*-
"""LOS PEDIDOS DE LAS CONTRATAS COMO DOCUMENTO FIRMADO DEL ENCARGO (Monica, 11-oct-2026).

Regla (10-oct): sin documento firmado no hay lineas facturables. Las ordenes de compra de Schindler y los correos
con codigos de pedido de FAIN (y algun Elecnor, TKE...) SON ese documento: avalan la factura.

Los 194 ficheros de PRESUPUESTOS FIRMADOS se leyeron como imagen (11-oct, JSONL) y Monica respondio en
docs/pedidos_contratas_revision.xlsx. Cada pedido de 2022 en adelante entra como documento de encargo tipo 'pedido'
(codigo PD-año-numero) en su oportunidad, con su PDF en Storage:
  A · la opp YA tiene la hoja de ese encargo (mismo importe, o la contrata ya paga en ella): el pedido entra SIN
      lineas, al lado de la hoja, y sus codigos de pedido van a las lineas de la hoja que casan por importe.
  B · no hay hoja de ese encargo (casi siempre: la hoja que hay es la subvencion, que paga la comunidad, y el pedido
      es el proyecto + CSS que paga FAIN): el pedido ES el documento, con sus lineas y sus hitos.
Las lineas que el propio pedido dice que paga la comunidad no entran (no son del pedido). El emisor sale de
contratas.emisor_factura (Schindler = Daniel) o del destinatario del papel.

  python scripts/facturacion/pedidos_contratas.py [--escribir]
"""
import sys, os, re, json, glob, time, uuid, unicodedata, collections, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402
import openpyxl  # noqa: E402

SP = os.environ.get('OC_DIR', '')
CARPETA = 'G:/Mi unidad/MONICA ACCESALIA/PRESUPUESTOS/PRESUPUESTOS FIRMADOS/'
ALMACEN = 'documentos-comerciales'

# Respuestas de Monica a las dudas (Excel, 11-oct) que fijan la opp o lo dejan fuera.
OPP_FIJA = {'AV ESPAÑA 27 GETAFE': 'DAN-2022-170', 'SANTA TECLA 46': 'DAN-2022-123', 'TENERIFE 8 MADRID': 'DAN-2022-209',
            'HACIENDA DE PAVONES 117': 'DAN-2023-302', 'ELECNOR VALMOJADO 243': 'DAN-2025-325',
            'SAN ANDRES 1 FUENLABRADA': 'DAN-2021-132', 'SANTA MARIA LA BLANCA 3': 'DAN-2021-137',
            'SANTA MARIA LA BLANCA 5': 'DAN-2021-137', 'COLMENAR VIEJO 8 SSRR': 'ALV-2026-120', 'REPULLES Y VARGAS': 'CAR-2025-004'}
# El papel no dice la empresa: es una hoja nuestra con el pedido de FAIN anotado ("ACEPTADO EUSEBIO")
EMPRESA_FIJA = {'GINZO DE LIMIA 55': 'FAIN'}
FUERA = {'EMIGDIO DE LA RIVA': 'Castilla y León: fuera (Mónica)', 'SAN ROQUE 18 GUADALAJARA': 'vale el contrato de Iberdrola (CT-2025-0001)',
         'MALDONADO 33 MADRID FAIN CODIGO DE PEDIDOS - NO VALE': 'NO VALE: lo sustituye el CORRECTO (pedido 413703)',
         'MENDIGUCHIA CARRICHE 27': 'correo de octubre de 2021: antes del corte de 2022'}
APARTE = {}
# Resueltas con datos y su OK (11-oct, segunda vuelta): (opp, grupo, año si el papel no lo trae)
FIJO = {'IGLESIA 16 PORTAL 1': ('DAN-2022-022', 'B', None), 'IGLESIA 16 PORTAL 4': ('DAN-2022-023', 'B', None),
        'MOSTOLES 3 PORTAL 2': ('DAN-2022-053', 'B', None), 'MALDONADO 33 MADRID - FAIN': ('DAN-2026-025', 'A', '2026'),
        'FAISANES 25 ARANJUEZ': ('DAN-2024-062', 'B', '2024'),
        'MANRESA 56 MADRID CODIGOS DE PEDIDO ARQUITECTO 29-09-2022': ('DAN-2022-057', 'B', None),   # el proyecto original
        'MANRESA 56 MADRID CODIGOS DE PEDIDO ARQUITECTO 18-04-2023': ('DAN-2022-057', 'A', None)}   # el modificado: HE-2023-0012
GRUPO_A_FORZADO = ('VALDEVARNES 24 MADRID - SUBV', 'valvanera 106 madrid 1a m', 'valvanera 106 madrid 2a m',
                   'odonnell 35', 'sahara 83', 'ELECNOR VALMOJADO 243', 'COLMENAR VIEJO 8 SSRR - OC')
PAGA_COMUNIDAD = re.compile(r'abona el cliente|paga la comunidad|a la comunidad directamente|se ocupa la comunidad|no est. en los c.digos', re.I)


def n(s):
    s = unicodedata.normalize('NFKD', (s or '').upper())
    return ''.join(c for c in s if not unicodedata.combining(c))


def que_hito(cuando):
    t = n(cuando)
    if re.search(r'CERTIFICADO FINAL|FINAL DE (LA )?OBRA|\bCFO\b|FINALIZACI', t): return 'cfo'
    if re.search(r'PLAN DE SEGURIDAD|\bPSS\b|APROBACION DEL PLAN', t): return 'pss'
    if re.search(r'(CONSECUCION|OBTENCION|CONCESION|APROBACION) DE (LA )?LICENCIA', t): return 'licencia'
    if re.search(r'ENTREGA|VISADO', t): return 'entrega'
    if re.search(r'INICIO DE (LA )?OBRA', t): return 'inicio_obra'
    if re.search(r'CONCESION|RESOLUCION', t): return 'concesion'
    if re.search(r'PRESENTACION', t): return 'presentacion'
    if re.search(r'FIRMA|CONTRATACION|ENCARGO|ACEPTACION|PEDIDO', t): return 'firma'
    return 'otro'


def respuestas():
    ws = openpyxl.load_workbook('docs/pedidos_contratas_revision.xlsx', read_only=True).active
    return {r[2]: (r[0], r[13]) for r in ws.iter_rows(min_row=2, values_only=True)}


def main():
    escribir = '--escribir' in sys.argv
    b = arrancar()
    cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'

    def alta(tabla, fila):
        req = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
        with urllib.request.urlopen(req) as r: return json.loads(r.read().decode('utf-8'))[0]

    def rpc(nombre, args):
        req = urllib.request.Request(b.url + '/rest/v1/rpc/' + nombre, data=json.dumps(args).encode('utf-8'), headers=cab, method='POST')
        with urllib.request.urlopen(req) as r: return json.loads(r.read().decode('utf-8'))

    resp = respuestas()
    cruce = json.load(open(os.path.join(SP, 'oc_cruce.json'), encoding='utf-8'))
    contratas = {n(c['nombre']): c for c in b.leer('contratas?select=id,nombre,emisor_factura&order=id')}
    opps = {o['codigo']: o for o in b.leer('oportunidades?select=id,codigo,nombre,comunidad_id&order=id')}
    ya_subidos = {(h['descripcion'] or '') for h in b.leer('hojas_encargo?select=descripcion&tipo_documento=eq.pedido&order=id')}

    # Agrupar: el mismo pedido en dos ficheros (mismos numeros) va en UN documento con los dos PDF
    plan = collections.OrderedDict(); fuera = []; aparte = []
    cruce.sort(key=lambda x: (not x['pedido'].get('fecha_documento'), x['pedido']['archivo']))   # los fechados primero
    for x in cruce:
        p = x['pedido']; arch = p['archivo']; A = n(arch)
        grupo, _ = resp.get(arch, ('', ''))
        if grupo.startswith('D') or not p.get('es_pedido'): continue
        if any(k in A for k in map(n, FUERA)): fuera.append((arch, next(v for k, v in FUERA.items() if n(k) in A))); continue
        if any(n(k) in A for k in APARTE): aparte.append((arch, next(v for k, v in APARTE.items() if n(k) in A))); continue
        fijo = next((v for k, v in FIJO.items() if n(k) in A), None)
        if '--solo-fijos' in sys.argv and not fijo: continue
        fija = fijo[0] if fijo else next((v for k, v in OPP_FIJA.items() if n(k) in A), None)
        cod = fija or (x['opps'][0]['opp'] if len(x['opps']) == 1 else None)
        if not cod: aparte.append((arch, 'sin opp clara')); continue
        # El municipio tiene que casar (Av. España 27 Getafe no es Av. España 27 Pinto)
        mun = re.split(r'\d+\S*', n(opps[cod]['nombre'] or ''))[-1].split() if not fija else []
        if mun and not any(w in A or w in n(p.get('direccion_obra')) for w in mun if len(w) > 2):
            aparte.append((arch, 'el municipio de %s (%s) no sale en el pedido' % (cod, opps[cod]['nombre']))); continue
        if fijo: g = fijo[1]
        elif any(n(k) in A for k in GRUPO_A_FORZADO): g = 'A'
        else: g = grupo[0]
        emp = n(next((v for k, v in EMPRESA_FIJA.items() if n(k) in A), None) or p.get('empresa') or ('ELECNOR' if 'ELECNOR' in A else ''))
        c = contratas.get(emp)
        if not c: aparte.append((arch, 'contrata desconocida: %s' % p.get('empresa'))); continue
        fecha = p.get('fecha_documento') or (re.search(r'(\d{2})-(\d{2})-(20\d\d)', arch) and '%s-%s-%s' % tuple(reversed(re.search(r'(\d{2})-(\d{2})-(20\d\d)', arch).groups())))
        anio = fecha[:4] if fecha else ((fijo and fijo[2]) or (re.search(r'(20\d\d)', arch) or [None, None])[1])
        if anio and anio < '2022': continue
        nums = frozenset(re.findall(r'\d{5,}', ' '.join(p.get('numeros_pedido') or [])))
        lineas = [l for l in (p.get('lineas') or []) if l.get('importe') and not PAGA_COMUNIDAD.search(l.get('concepto') or '')]
        # El mismo pedido en otro fichero (mismos numeros, o mismo total y fecha, o sin fecha y misma opp): un documento
        # Dudas ya resueltas por Monica (grupo C): colgar si en la opp ya hay hoja que paga esa contrata; si no, documento
        if g == 'C':
            g = 'A' if b.leer('lineas_facturacion?select=id,hojas_encargo!inner(oportunidad_id)&hojas_encargo.oportunidad_id=eq.%s&pagador_id=eq.%s&limit=1'
                              % (opps[cod]['id'], c['id']), por_tramos=False) else 'B'
            print('   duda resuelta: %s -> %s %s' % (arch[:55], g, cod))
        # Solo es el mismo pedido si comparte numeros (Schindler: los mismos exactamente; dos ordenes de 1.400 son dos)
        clave = None if fijo else next((k for k, d in plan.items() if d['opp'] == cod and (
            (nums and nums == d['nums']) or (emp == 'FAIN' and nums & d['nums']) or (not fecha and not nums & d['nums'] and d['grupo'] == g and emp == 'FAIN'))), None)
        if clave:
            d = plan[clave]; d['ficheros'].append(arch); d['nums'] |= nums
            vistas = {(n(l['concepto'])[:20], round(float(l['importe']), 2)) for l in d['lineas']}
            nuevas = [l for l in lineas if (n(l['concepto'])[:20], round(float(l['importe']), 2)) not in vistas]
            if nuevas and d['lineas'] and not any(round(float(l['importe']), 2) in {v for _, v in vistas} for l in nuevas):
                d['lineas'] += nuevas; d['total'] = round(sum(float(l['importe']) for l in d['lineas']), 2)   # otro pedido (la CSS de Fatima 6)
            elif not d['lineas'] and lineas: d['lineas'], d['total'] = lineas, p.get('total') or d['total']
            continue
        if not anio: aparte.append((arch, 'sin fecha ni año')); continue
        emisor = c['emisor_factura'] or 'accesalia'   # el buzon al que llego el correo no dice quien factura
        plan[arch] = {'grupo': g, 'opp': cod, 'contrata': c, 'emisor': emisor, 'fecha': fecha, 'anio': int(anio), 'nums': nums, 'total': p.get('total'),
                      'numeros': p.get('numeros_pedido') or [], 'lineas': lineas, 'ficheros': [arch], 'empresa': c['nombre'],
                      'direccion': p.get('direccion_obra'), 'notas': p.get('notas') or '', 'condiciones': p.get('condiciones_pago') or ''}

    print('A colgar:', sum(1 for d in plan.values() if d['grupo'] == 'A'), '| B documento:', sum(1 for d in plan.values() if d['grupo'] == 'B'),
          '| fuera:', len(fuera), '| aparte:', len(aparte))
    for a, m in aparte: print('   aparte:', a[:60], '->', m)
    if not escribir:
        for d in plan.values():
            raro = (d['grupo'] == 'B' and not d['lineas']) or len(d['ficheros']) > 1 or not d['fecha'] or d['emisor'] != 'accesalia'
            if raro:
                print('  %s %s %s %s %s %s: %s' % (d['grupo'], d['opp'], d['fecha'], d['empresa'], d['emisor'], ' + '.join(f[:28] for f in d['ficheros']),
                      '; '.join('%s %.0f' % (l['concepto'][:25], l['importe']) for l in d['lineas'])))
        print('*** EN SECO ***'); return

    for arch, d in plan.items():
        o = opps[d['opp']]
        desc = 'Pedido %s %s · %s' % (d['empresa'], ' / '.join(d['numeros'])[:120], (d['direccion'] or '')[:60])
        if desc in ya_subidos: print('   ya estaba:', arch); continue
        codigo = rpc('siguiente_codigo', {'p_tipo': 'PD', 'p_anio': d['anio']})
        h = alta('hojas_encargo', {'numero_hoja': codigo, 'tipo_documento': 'pedido', 'oportunidad_id': o['id'], 'comunidad_id': o['comunidad_id'],
                                   'pagador_tipo': 'contrata', 'pagador_contrata_id': d['contrata']['id'], 'emisor': 'daniel_autonomo' if d['emisor'] == 'daniel_autonomo' else 'accesalia',
                                   # sin fecha en el papel: la de alta es hoy y la de firma queda vacia (no se inventa)
                                   'fecha_creacion': d['fecha'] or time.strftime('%Y-%m-%d'), 'fecha_firma': d['fecha'], 'estado': 'devuelta_firmada',
                                   'fecha_estado': (d['fecha'] + 'T00:00:00+00:00') if d['fecha'] else None, 'descripcion': desc})
        rutas = []
        for f in d['ficheros']:
            datos = open(CARPETA + f, 'rb').read()
            limpio = re.sub(r'[^A-Za-z0-9._-]+', '-', n(f)).strip('-')[:80]
            ruta = 'hojas-encargo/%s/firmada-%s-%s' % (h['id'], uuid.uuid4().hex[:8], limpio)
            b.subir(ALMACEN, ruta, datos, tipo='image/jpeg' if f.lower().endswith(('.jpg', '.jpeg')) else 'application/pdf')
            rutas.append('almacen:%s/%s' % (ALMACEN, ruta))
        total = d['total'] or round(sum(l['importe'] for l in d['lineas']), 2)
        nota = 'Pedido de %s dado de alta el 11-oct-2026 desde PRESUPUESTOS FIRMADOS (%s). %s' % (d['empresa'], ' + '.join(d['ficheros']), d['notas'])
        if d['grupo'] == 'A': nota += ' AVALA la hoja de encargo que ya hay en la oportunidad: sin lineas propias.'
        v = alta('versiones_hoja', {'hoja_encargo_id': h['id'], 'numero_version': 1, 'fecha_generada': d['fecha'], 'fecha_enviada': d['fecha'],
                                    'pdfs_firmados': rutas, 'importe_base': total, 'iva_porcentaje': 21,
                                    'forma_pago': d['condiciones'][:300] or None, 'notas': nota[:2000]})
        b.actualizar('hojas_encargo?id=eq.' + h['id'], {'version_firmada_id': v['id']})
        codigos = [(m.group(1).strip(), m.group(2)) for t in d['numeros'] for m in [re.match(r'(.*?)[:\s]*(\d{5,}\S*)\s*$', t)] if m and m.group(1).strip()]
        if d['grupo'] == 'B':
            for l in d['lineas']:
                lf = alta('lineas_facturacion', {'hoja_encargo_id': h['id'], 'descripcion': l['concepto'], 'importe': l['importe'], 'es_porcentaje': False,
                                                 'origen': 'pedido', 'verificado': False, 'emisor': d['emisor'], 'pagador_tipo': 'contrata',
                                                 'pagador_id': d['contrata']['id'],
                                                 'forma_cobro': 'confirming' if 'CONFIRMING' in n(d['condiciones']) else 'transferencia'})
                hs = [hh for hh in (l.get('hitos') or []) if hh.get('porcentaje') or hh.get('importe')]
                if hs:
                    b.insertar('hitos_cobro', [{'linea_facturacion_id': lf['id'], 'hito': que_hito(hh.get('cuando')), 'orden': k + 1,
                                                'porcentaje': hh.get('porcentaje'), 'importe': hh.get('importe') or round(l['importe'] * float(hh['porcentaje']) / 100, 2),
                                                'estado': 'pendiente', 'notas': (hh.get('cuando') or '')[:300]} for k, hh in enumerate(hs)])
                else:
                    b.insertar('hitos_cobro', [{'linea_facturacion_id': lf['id'], 'hito': 'otro', 'orden': 1, 'porcentaje': 100, 'importe': l['importe'],
                                                'estado': 'pendiente', 'notas': 'El pedido no dice la forma de pago.'}])
                if codigos:
                    b.insertar('codigos_cliente_linea', [{'linea_facturacion_id': lf['id'], 'etiqueta': e[:60], 'valor': val, 'orden': k + 1} for k, (e, val) in enumerate(codigos)])
        else:
            imps = {round(float(l['importe']), 2) for l in d['lineas']} | ({round(float(d['total']), 2)} if d['total'] else set())
            casan = [l for l in b.leer('lineas_facturacion?select=id,importe,hoja_encargo_id,hojas_encargo!inner(oportunidad_id,tipo_documento)'
                                       '&hojas_encargo.oportunidad_id=eq.%s&hojas_encargo.tipo_documento=neq.pedido&pagador_id=eq.%s' % (o['id'], d['contrata']['id']))
                     if round(float(l['importe']), 2) in imps]
            for l in casan:
                ya = {c2['valor'] for c2 in b.leer('codigos_cliente_linea?select=valor&linea_facturacion_id=eq.' + l['id'])}
                nuevos = [(e, val) for e, val in codigos if val not in ya]
                if nuevos:
                    b.insertar('codigos_cliente_linea', [{'linea_facturacion_id': l['id'], 'etiqueta': e[:60], 'valor': val, 'orden': len(ya) + k + 1} for k, (e, val) in enumerate(nuevos)])
        print('   %s %s %s %s (%d pdf)' % (d['grupo'], codigo, d['opp'], d['empresa'], len(rutas)))
    json.dump({'fuera': fuera, 'aparte': aparte}, open(os.path.join(SP, 'oc_resto.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
