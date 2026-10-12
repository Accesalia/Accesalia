# -*- coding: utf-8 -*-
"""PEDIDOS DE FAIN DE 2020-2021 que se siguen facturando (Monica, 12-oct-2026: "los 6 antiguos, si los tenemos si,
subamoslos"). Quedaron fuera por el corte de 2022 (pedidos_contratas.py: anio < 2022) pero FAIN los factura en 2025-26.
Entran igual que los de 2022 en adelante (grupo B: el pedido ES el documento): PD-año-n en su opp, con su PDF, sus
lineas (norma de FAIN: proyecto 50/30/20, CSS 80/20), sus codigos de pedido, y las facturas 2025-26 casadas.
Lectura de los pedidos: la del 11-oct (oc_cruce.json). Becquer 19: no hay pedido en la carpeta (se queda).
La subvencion de Armenteros 28 no entra: el propio pedido dice que la paga la comunidad.
  python scripts/facturacion/pedidos_antiguos_fain.py [--escribir]
"""
import sys, os, re, json, uuid, datetime, unicodedata, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
M = '(Monica, %s)' % HOY
CARPETA = 'G:/Mi unidad/MONICA ACCESALIA/PRESUPUESTOS/PRESUPUESTOS FIRMADOS/'
ALMACEN = 'documentos-comerciales'
b = arrancar()
cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
FAIN = b.leer('contratas?nombre=eq.FAIN&select=id')[0]['id']
BL = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo&order=id')}
PROY, CSS = [('entrega', 50), ('licencia', 30), ('cfo', 20)], [('pss', 80), ('cfo', 20)]

# (opp, fecha, ficheros, numeros, emisor, lineas [(desc, bloque, importe, reparto)], facturas [(emisor, anio, num, base, linea, hito, importe_hito_nuevo)])
PEDIDOS = [
    ('DAN-2020-053', '2020-11-26', ['RIBADUMIA 4 MADRID CODIGOS PEDIDO ASCENSOR 26-11-2020.pdf'],
     [('Pedido Fain', '95002440'), ('Grafo/Orden', '4008682'), ('Pedido de compra', '205149')], 'accesalia',
     [('Proyecto', 'REDACCION PROYECTO', 3100.0, PROY), ('Coordinacion de Seguridad y Salud', 'CSS', 600.0, CSS)],
     [('accesalia', 2025, 245, 930.0, 0, 'licencia', None), ('accesalia', 2025, 314, 480.0, 1, 'pss', None)]),
    ('DAN-2020-033', '2020-10-08', ['SAN VICENTE 10 LEGANES CODIGOS DE PEDIDO ARQUITECTO 08-10-2020.pdf'],
     [('Pedido Fain', '95002369'), ('Grafo/Orden', '4008502'), ('Pedido de compra', '200988')], 'daniel_autonomo',
     # el pedido solo da el total (3.600); las facturas dicen proyecto 3.000 y CSS 600
     [('Proyecto', 'REDACCION PROYECTO', 3000.0, PROY), ('Coordinacion de Seguridad y Salud', 'CSS', 600.0, CSS)],
     [('daniel', 2025, 16, 1000.0, 0, 'cfo', 1000.0), ('daniel', 2025, 16, 120.0, 1, 'cfo', None)]),
    ('DAN-2021-093', '2021-08-31', ['SAN MAXIMILIANO 23 MADRID CODIGOS DE PEDIDO ARQUITECTO 31-08-2021.pdf',
                                    'SAN MAXIMILIANO 23 MADRID CODIGOS DE PEDIDO ARQUITECTO 31-08-2021 (1).pdf'],
     [('Pedido Fain', '95002619'), ('Grafo/Orden', '4009148'), ('Pedido de compra', '226975')], 'accesalia',
     [('Proyecto', 'REDACCION PROYECTO', 3100.0, PROY), ('Coordinacion de Seguridad y Salud', 'CSS', 600.0, CSS)],
     [('accesalia', 2025, 125, 740.0, 'suma', 'cfo', None)]),     # 20 % de 3.700 = CFO del proyecto + CFO de la CSS
    ('DAN-2021-101', '2021-09-16', ['ARMENTEROS 28 MADRID PEDIDO FAIN 16-09-2021.pdf'], [], 'accesalia',
     [('Proyecto', 'REDACCION PROYECTO', 2500.0, PROY), ('Coordinacion de Seguridad y Salud', 'CSS', 600.0, CSS)],
     [('accesalia', 2025, 52, 480.0, 1, 'pss', None)]),
    ('DAN-2021-109', '2021-11-29', ['GERMAN PEREZ CARRASCO, 54 MADRID CODIGOS DE PEDIDO ARQUITECTO.pdf'],
     [('Pedido Fain', '95002678'), ('Grafo/Orden', '4009304'), ('Pedido de compra', '235558')], 'accesalia',
     [('Proyecto', 'REDACCION PROYECTO', 2500.0, PROY), ('Coordinacion de Seguridad y Salud', 'CSS', 600.0, CSS)],
     [('accesalia', 2025, 347, 500.0, 0, 'cfo', None), ('accesalia', 2025, 347, 120.0, 1, 'cfo', None)]),
]


def n(s):
    s = unicodedata.normalize('NFD', str(s or '').upper())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')


def alta(tabla, fila):
    req = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))[0]


def rpc(nombre, args):
    req = urllib.request.Request(b.url + '/rest/v1/rpc/' + nombre, data=json.dumps(args).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))


def linea_factura(emisor, anio, num, base):
    f = b.leer('facturas?empresa_emisora=eq.%s&anio=eq.%s&serie=eq.1&numero=eq.%s&select=id,estado' % (emisor, anio, num))[0]
    ls = [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base&order=posicion' % f['id']) if l['base'] and abs(float(l['base']) - base) < 0.01]
    assert len(ls) == 1, (emisor, anio, num, base, ls)
    assert not b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % ls[0]['id']), ('ya casada', anio, num, base)
    return f['estado'], ls[0]


ya = {h['descripcion'] for h in b.leer('hojas_encargo?tipo_documento=eq.pedido&select=descripcion&order=id') if h['descripcion']}
for opp, fecha, ficheros, numeros, emisor, lineas, facturas in PEDIDOS:
    o = b.leer('oportunidades?codigo=eq.%s&select=id,nombre,comunidad_id' % opp)[0]
    desc = 'Pedido FAIN %s · %s' % (' / '.join('%s %s' % x for x in numeros) or 'sin numeros (correo de encargo)', o['nombre'])
    print('== %s %s %s | %s' % (opp, o['nombre'], fecha, ' + '.join(f[:45] for f in ficheros)))
    for f in ficheros:
        assert os.path.exists(CARPETA + f), f
    for e, an, nu, base, _, _, _ in facturas:
        linea_factura(e, an, nu, base)          # comprueba que existen y no estan casadas
    if desc in ya:
        print('   ya estaba'); continue
    for d, bq, imp, rep in lineas:
        print('   linea %s %s %s' % (d, imp, [(t, round(imp * p / 100, 2)) for t, p in rep]))
    for e, an, nu, base, li, t, nuevo in facturas:
        print('   factura %s %s/%s %s -> %s %s%s' % (e, an, nu, base, 'las dos lineas' if li == 'suma' else lineas[li][0], t, (' => %s' % nuevo) if nuevo else ''))
    if not ESCRIBIR:
        continue
    anio = int(fecha[:4])
    codigo = rpc('siguiente_codigo', {'p_tipo': 'PD', 'p_anio': anio})
    total = sum(imp for _, _, imp, _ in lineas)
    h = alta('hojas_encargo', {'numero_hoja': codigo, 'tipo_documento': 'pedido', 'oportunidad_id': o['id'], 'comunidad_id': o['comunidad_id'],
                               'pagador_tipo': 'contrata', 'pagador_contrata_id': FAIN, 'emisor': emisor, 'fecha_creacion': fecha, 'fecha_firma': fecha,
                               'estado': 'devuelta_firmada', 'fecha_estado': fecha + 'T00:00:00+00:00', 'descripcion': desc})
    rutas = []
    for f in ficheros:
        limpio = re.sub(r'[^A-Za-z0-9._-]+', '-', n(f)).strip('-')[:80]
        ruta = 'hojas-encargo/%s/firmada-%s-%s' % (h['id'], uuid.uuid4().hex[:8], limpio)
        b.subir(ALMACEN, ruta, open(CARPETA + f, 'rb').read(), tipo='application/pdf')
        rutas.append('almacen:%s/%s' % (ALMACEN, ruta))
    v = alta('versiones_hoja', {'hoja_encargo_id': h['id'], 'numero_version': 1, 'fecha_generada': fecha, 'fecha_enviada': fecha, 'pdfs_firmados': rutas,
                                'importe_base': total, 'iva_porcentaje': 21, 'forma_pago': 'Norma de FAIN: proyecto 50/30/20, CSS 80/20',
                                'notas': 'Pedido de FAIN de %s dado de alta el %s desde PRESUPUESTOS FIRMADOS (%s): se sigue facturando en 2025-26 %s.'
                                         % (anio, HOY, ' + '.join(ficheros), M)})
    b.actualizar('hojas_encargo?id=eq.' + h['id'], {'version_firmada_id': v['id']})
    hitos_de = []
    for d, bq, imp, rep in lineas:
        lf = alta('lineas_facturacion', {'hoja_encargo_id': h['id'], 'bloque_id': BL[bq], 'descripcion': d, 'importe': imp, 'es_porcentaje': False,
                                         'origen': 'pedido', 'verificado': True, 'emisor': emisor, 'pagador_tipo': 'contrata', 'pagador_id': FAIN,
                                         'forma_cobro': 'transferencia'})
        hs = {}
        for k, (t, p) in enumerate(rep, 1):
            hs[t] = alta('hitos_cobro', {'linea_facturacion_id': lf['id'], 'hito': t, 'orden': k, 'porcentaje': p, 'importe': round(imp * p / 100, 2),
                                         'estado': 'pendiente', 'notas': 'Norma de FAIN %s.' % M})
        hitos_de.append(hs)
        if numeros:
            b.insertar('codigos_cliente_linea', [{'linea_facturacion_id': lf['id'], 'etiqueta': e, 'valor': val, 'orden': k + 1} for k, (e, val) in enumerate(numeros)])
    for e, an, nu, base, li, t, nuevo in facturas:
        est, fl = linea_factura(e, an, nu, base)
        destinos = [hs[t] for hs in hitos_de] if li == 'suma' else [hitos_de[li][t]]
        for x in destinos:
            imp = nuevo or float(x['importe'])
            if nuevo:
                b.actualizar('hitos_cobro?id=eq.%s' % x['id'], {'importe': nuevo, 'notas': 'Manda la factura: "%s restantes" (la norma daba %s) %s.' % (nuevo, x['importe'], M)})
            b.insertar('factura_linea_hitos', [{'factura_linea_id': fl['id'], 'hito_cobro_id': x['id'], 'importe': imp, 'como': 'a_mano'}])
            if est == 'cobrada':
                b.actualizar('hitos_cobro?id=eq.%s' % x['id'], {'estado': 'completado'})
    print('   ESCRITO', codigo)
print('ESCRITO' if ESCRIBIR else '(en seco)')
