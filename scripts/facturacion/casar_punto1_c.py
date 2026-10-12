# -*- coding: utf-8 -*-
"""PUNTO 1, grupo C (Monica, 12-oct-2026): la linea facturable NO TIENE HITOS (el papel no traia forma de pago).
"El plazo lo dice la factura": un hito por cada factura (su plazo y su importe, ya enlazado) y, si la linea tiene
importe, el RESTO como hito 'otro' pendiente (la hoja no dice cuando; las facturas anteriores a 2025 aun no estan subidas).
Solo filas del analisis (Descargas/por_que_no_casan.json) con UNA linea candidata.
  python scripts/facturacion/casar_punto1_c.py [--escribir]
"""
import sys, os, json, collections, datetime
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
TIPO = {'encargo': 'encargo', 'entrega': 'entrega', 'licencia': 'licencia', 'cfo': 'cfo', 'inicio_obra': 'inicio_obra',
        'concesion': 'concesion', 'exito': 'concesion'}
b = arrancar()
F = json.load(open(os.path.expanduser(r'~\Downloads\por_que_no_casan.json'), encoding='utf-8'))
filas = [r for r in F if r['causa'].startswith('HITOS MAL') and r['detalle'] == 'la línea no tiene hitos']
por_linea, dudosas = collections.defaultdict(list), []
for r in filas:
    (por_linea[r['lineas_ids'][0]].append(r) if len(r.get('lineas_ids') or []) == 1 else dudosas.append(r))
ya = {x['factura_linea_id'] for x in b.leer('factura_linea_hitos?select=factura_linea_id&order=factura_linea_id,hito_cobro_id')}
for lid, rs in por_linea.items():
    l = b.leer(f'lineas_facturacion?id=eq.{lid}&select=id,descripcion,importe,hoja:hoja_encargo_id(numero_hoja)')[0]
    if b.leer(f'hitos_cobro?linea_facturacion_id=eq.{lid}&select=id'): print('   ya tiene hitos, no se toca', l['hoja']['numero_hoja']); continue
    rs = sorted([r for r in rs if r['linea'] not in ya], key=lambda r: r['fecha'])
    fact = sum(float(r['importe']) for r in rs); resto = round(float(l['importe']) - fact, 2) if l['importe'] is not None else None
    print(f"{l['hoja']['numero_hoja']} | {(l['descripcion'] or '')[:50]} | linea {l['importe']} | facturas: "
          f"{[(r['factura'], r['importe'], TIPO.get(r['plazo'], 'otro')) for r in rs]} | resto {resto}")
    if not ESCRIBIR: continue
    for k, r in enumerate(rs, 1):
        est = b.leer(f"facturas?id=eq.{b.leer('factura_lineas?id=eq.' + r['linea'] + '&select=factura_id')[0]['factura_id']}&select=estado")[0]['estado']
        cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
        import urllib.request
        req = urllib.request.Request(b.url + '/rest/v1/hitos_cobro', method='POST', headers=cab, data=json.dumps([{
            'linea_facturacion_id': lid, 'hito': TIPO.get(r['plazo'], 'otro'), 'orden': k, 'importe': float(r['importe']),
            'estado': 'completado' if est == 'cobrada' else 'pendiente',
            'notas': f"Plazo puesto por la factura {r['factura']} ({r['fecha']}): la hoja no traia forma de pago ({HOY}). {r['texto'][:120]}"}],
            ensure_ascii=False).encode('utf-8'))
        with urllib.request.urlopen(req) as resp: hid = json.loads(resp.read().decode('utf-8'))[0]['id']
        b.insertar('factura_linea_hitos', [{'factura_linea_id': r['linea'], 'hito_cobro_id': hid, 'importe': float(r['importe']), 'como': 'automatico'}])
    if resto and resto > 1:
        b.insertar('hitos_cobro', [{'linea_facturacion_id': lid, 'hito': 'otro', 'orden': len(rs) + 1, 'importe': resto, 'estado': 'pendiente',
                    'notas': f'Resto de la linea: la hoja no dice cuando se cobra; sin facturar en 2025-26 (las facturas anteriores a 2025 aun no estan subidas) ({HOY}).'}])
print('dudosas (varias lineas candidatas):', [(r['factura'], r['hojas'][:40]) for r in dudosas])
print('ESCRITO' if ESCRIBIR else '(en seco)')
