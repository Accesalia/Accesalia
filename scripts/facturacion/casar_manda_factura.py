# -*- coding: utf-8 -*-
"""MANDA LA FACTURA (Monica, 12-oct-2026: "en caso de duda, siempre manda la factura; puede haber discusiones y
negociaciones no reflejadas, el dinero real manda sobre el teorico"). Para las sueltas con HITOS MAL GENERADOS y UNA
sola linea candidata: cada factura (por fecha) coge el primer hito LIBRE de la linea, mejor si es de su plazo; el hito
toma el importe (y el plazo, si la factura lo dice) de la factura, con nota de lo que decia la hoja. Si no queda
ningun hito libre, se crea uno nuevo con lo de la factura.
  python scripts/facturacion/casar_manda_factura.py [--escribir]
"""
import sys, os, json, collections, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
TIPO = {'encargo': 'encargo', 'entrega': 'entrega', 'licencia': 'licencia', 'cfo': 'cfo', 'inicio_obra': 'pss',
        'concesion': 'concesion', 'exito': 'concesion'}
b = arrancar()
F = json.load(open(os.path.expanduser(r'~\Downloads\por_que_no_casan.json'), encoding='utf-8'))
# fuera (12-oct): el analisis las cuelga de una linea de OTRO concepto (CFO de 600 en el proyecto de 5.000; IEE en el
# proyecto de envolvente; CSS en la direccion facultativa): a mano
EXCLUIR = {'accesalia 2026/213', 'accesalia 2026/252', 'accesalia 2025/124'}
filas = [r for r in F if r['causa'].startswith('HITOS MAL') and len(r.get('lineas_ids') or []) == 1 and r['factura'] not in EXCLUIR]
otras = [r for r in F if r['causa'].startswith('HITOS MAL') and len(r.get('lineas_ids') or []) != 1]
ya = {x['hito_cobro_id'] for x in b.leer('factura_linea_hitos?select=hito_cobro_id&order=factura_linea_id,hito_cobro_id')}
estado_f = {}
def estado_factura(lin):
    if lin not in estado_f:
        fid = b.leer(f'factura_lineas?id=eq.{lin}&select=factura_id')[0]['factura_id']
        estado_f[lin] = b.leer(f'facturas?id=eq.{fid}&select=estado')[0]['estado']
    return estado_f[lin]
def crear(fila):
    cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
    req = urllib.request.Request(b.url + '/rest/v1/hitos_cobro', method='POST', headers=cab, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'))
    with urllib.request.urlopen(req) as r: return json.loads(r.read().decode('utf-8'))[0]['id']
por_linea = collections.defaultdict(list)
for r in filas: por_linea[r['lineas_ids'][0]].append(r)
for lid, rs in por_linea.items():
    l = b.leer(f'lineas_facturacion?id=eq.{lid}&select=descripcion,importe,hoja:hoja_encargo_id(numero_hoja)')[0]
    hs = [h for h in b.leer(f'hitos_cobro?linea_facturacion_id=eq.{lid}&hito_padre_id=is.null&select=id,hito,orden,importe,estado&order=orden,id')
          if h['id'] not in ya and h['estado'] not in ('anulado', 'completado')]
    print(f"== {l['hoja']['numero_hoja']} | {(l['descripcion'] or '')[:45]} | linea {l['importe']} | libres {[(h['hito'], h['importe']) for h in hs]}")
    for r in sorted(rs, key=lambda r: r['fecha']):
        t = TIPO.get(r['plazo'])
        if r['plazo'] == 'pago_unico' and len(hs) > 1:
            # PAGO UNICO: la factura cubre todos los hitos libres de la linea; se reparte en proporcion a lo que decia la hoja
            tot = sum(float(h['importe'] or 0) for h in hs) or len(hs)
            partes = [round(float(r['importe']) * float(h['importe'] or 1) / tot, 2) for h in hs]
            partes[-1] = round(float(r['importe']) - sum(partes[:-1]), 2)
            est = 'completado' if estado_factura(r['linea']) == 'cobrada' else 'pendiente'
            print(f"   {r['factura']} {r['importe']} PAGO UNICO -> {[(h['hito'], h['importe'], v) for h, v in zip(hs, partes)]}")
            if ESCRIBIR:
                for h, v in zip(hs, partes):
                    b.actualizar(f'hitos_cobro?id=eq.{h["id"]}', {'importe': v, 'estado': est, 'notas': f"Manda la factura {r['factura']} (pago unico de {r['importe']}): la hoja decia {h['hito']} {h['importe']} ({HOY})."})
                    b.insertar('factura_linea_hitos', [{'factura_linea_id': r['linea'], 'hito_cobro_id': h['id'], 'importe': v, 'como': 'automatico'}])
            hs = []; continue
        h = next((h for h in hs if t and h['hito'] == t), None) or (hs[0] if hs else None)
        est = 'completado' if estado_factura(r['linea']) == 'cobrada' else 'pendiente'
        if h:
            hs.remove(h)
            nuevo = {'importe': float(r['importe']), 'estado': est, **({'hito': t} if t and t != h['hito'] else {}),
                     'notas': f"Manda la factura {r['factura']} ({r['fecha']}): la hoja decia {h['hito']} {h['importe']} ({HOY})."}
            print(f"   {r['factura']} {r['importe']} {r['plazo']} -> hito {h['hito']} {h['importe']} => {nuevo.get('hito', h['hito'])} {r['importe']}")
            if ESCRIBIR:
                b.actualizar(f'hitos_cobro?id=eq.{h["id"]}', nuevo); hid = h['id']
        else:
            print(f"   {r['factura']} {r['importe']} {r['plazo']} -> NUEVO hito {t or 'otro'} {r['importe']}")
            if ESCRIBIR:
                n = len(b.leer(f'hitos_cobro?linea_facturacion_id=eq.{lid}&hito_padre_id=is.null&select=id'))
                hid = crear({'linea_facturacion_id': lid, 'hito': t or 'otro', 'orden': n + 1, 'importe': float(r['importe']), 'estado': est,
                             'notas': f"Manda la factura {r['factura']} ({r['fecha']}): no habia hito libre en la linea ({HOY}). {r['texto'][:100]}"})
        if ESCRIBIR:
            b.insertar('factura_linea_hitos', [{'factura_linea_id': r['linea'], 'hito_cobro_id': hid, 'importe': float(r['importe']), 'como': 'automatico'}])
print('quedan (varias lineas candidatas):', [(r['factura'], r['importe'], (r['hojas'] or '')[:30]) for r in otras])
print('a mano (linea de otro concepto):', sorted(EXCLUIR))
print('ESCRITO' if ESCRIBIR else '(en seco)')
