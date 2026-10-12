# -*- coding: utf-8 -*-
"""NOTAS DE RESPONSABILIDAD para dos encargos de FAIN sin papel firmado (Monica, 12-oct-2026: "a Becquer, la solucion
extrema: nota interna explicativa, y casamos con ella su factura del CFO; Torrecilla del Leal lo mismo").
La nota (tipo_documento 'nota_responsabilidad', serie NR) es el ULTIMO RECURSO: alguien del equipo (Monica) asume por
escrito que se contrato y explica por que no hay papel. Sus lineas siguen la norma de FAIN y se casa la factura.
  Becquer 19 Mostoles: proyecto de accesibilidad 1.500 (50/30/20); 2026/266 = 20 % CFO (300); codigos de la factura
  Torrecilla del Leal 21: CSS 600 (80/20); 2025/228 = 80 % al plan de seguridad (480); pedido FAIN 95003572
  python scripts/facturacion/notas_responsabilidad_fain.py [--escribir]
"""
import sys, os, json, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
b = arrancar()
cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
FAIN = b.leer('contratas?nombre=eq.FAIN&select=id')[0]['id']
MONICA = b.leer('equipo?email=eq.gerencia.accesalia@gmail.com&select=id')[0]['id']
BL = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo&order=id')}


def alta(tabla, fila):
    req = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))[0]


def rpc(nombre, args):
    req = urllib.request.Request(b.url + '/rest/v1/rpc/' + nombre, data=json.dumps(args).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))


NOTAS = [
    {'hoja_ref': 'HE-2022-0108', 'nombre': 'Becquer 19 Mostoles', 'factura': (2026, 266, 300.0), 'hito': 'cfo',
     'linea': ('Proyecto de solucion de accesibilidad (encargo de FAIN)', 'REDACCION PROYECTO', 1500.0, [('entrega', 50), ('licencia', 30), ('cfo', 20)]),
     'codigos': [('Orden', '80014196'), ('Referencia', '75165115'), ('Pedido proveedor', '250204')],
     'motivo': 'No esta el pedido de FAIN de este encargo (ni en PRESUPUESTOS FIRMADOS ni en ENVIADOS: solo la hoja del proyecto sin firmar). '
               'Consta por la factura 2026/266 a FAIN ("20 % de 1.500 CFO", orden 80014196 / 75165115, pedido proveedor 250204): se contrato.'},
    {'hoja_ref': 'HE-2023-0086', 'nombre': 'Torrecilla del Leal 21', 'factura': (2025, 228, 480.0), 'hito': 'pss',
     'linea': ('Coordinacion de Seguridad y Salud (encargo de FAIN)', 'CSS', 600.0, [('pss', 80), ('cfo', 20)]),
     'codigos': [('Pedido Fain', '95003572')],
     'motivo': 'No esta el pedido de FAIN de la CSS (la hoja HE-2023-0086 es el proyecto y no la lleva). Consta por la factura 2025/228 a FAIN '
               '("80 % de 600 a la firma del acta de aprobacion del plan de seguridad y salud", pedido FAIN 95003572): se contrato.'},
]
for x in NOTAS:
    ref = b.leer('hojas_encargo?numero_hoja=eq.%s&select=oportunidad_id,comunidad_id' % x['hoja_ref'])[0]
    f = b.leer('facturas?empresa_emisora=eq.accesalia&anio=eq.%s&serie=eq.1&numero=eq.%s&select=id,estado' % x['factura'][:2])[0]
    fl = [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base' % f['id']) if l['base'] and abs(float(l['base']) - x['factura'][2]) < 0.01][0]
    assert not b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % fl['id']), 'ya casada'
    d, bq, imp, rep = x['linea']
    print('== %s: nota de responsabilidad (Monica) | %s %s %s | factura %s/%s %s -> %s' % (x['nombre'], d, imp, rep, x['factura'][0], x['factura'][1], x['factura'][2], x['hito']))
    if not ESCRIBIR:
        continue
    codigo = rpc('siguiente_codigo', {'p_tipo': 'NR', 'p_anio': int(HOY[:4])})
    h = alta('hojas_encargo', {'numero_hoja': codigo, 'tipo_documento': 'nota_responsabilidad', 'responsable_id': MONICA, 'motivo_sin_firma': x['motivo'],
                               'oportunidad_id': ref['oportunidad_id'], 'comunidad_id': ref['comunidad_id'], 'pagador_tipo': 'contrata',
                               'pagador_contrata_id': FAIN, 'emisor': 'accesalia', 'fecha_creacion': HOY, 'fecha_firma': HOY, 'estado': 'devuelta_firmada',
                               'fecha_estado': HOY + 'T00:00:00+00:00', 'descripcion': 'Nota de responsabilidad · FAIN · %s' % x['nombre']})
    v = alta('versiones_hoja', {'hoja_encargo_id': h['id'], 'numero_version': 1, 'fecha_generada': HOY, 'importe_base': imp, 'iva_porcentaje': 21,
                                'forma_pago': 'Norma de FAIN', 'notas': x['motivo']})
    b.actualizar('hojas_encargo?id=eq.' + h['id'], {'version_firmada_id': v['id']})
    lf = alta('lineas_facturacion', {'hoja_encargo_id': h['id'], 'bloque_id': BL[bq], 'descripcion': d, 'importe': imp, 'es_porcentaje': False,
                                     'origen': 'nota_responsabilidad', 'verificado': True, 'emisor': 'accesalia', 'pagador_tipo': 'contrata',
                                     'pagador_id': FAIN, 'forma_cobro': 'transferencia'})
    hs = {}
    for k, (t, p) in enumerate(rep, 1):
        hs[t] = alta('hitos_cobro', {'linea_facturacion_id': lf['id'], 'hito': t, 'orden': k, 'porcentaje': p, 'importe': round(imp * p / 100, 2),
                                     'estado': 'pendiente', 'notas': 'Norma de FAIN (Monica, %s).' % HOY})
    b.insertar('codigos_cliente_linea', [{'linea_facturacion_id': lf['id'], 'etiqueta': e, 'valor': val, 'orden': k + 1} for k, (e, val) in enumerate(x['codigos'])])
    b.insertar('factura_linea_hitos', [{'factura_linea_id': fl['id'], 'hito_cobro_id': hs[x['hito']]['id'], 'importe': x['factura'][2], 'como': 'a_mano'}])
    if f['estado'] == 'cobrada':
        b.actualizar('hitos_cobro?id=eq.%s' % hs[x['hito']]['id'], {'estado': 'completado'})
    b.insertar('notas_facturacion', [{'hoja_encargo_id': h['id'], 'fecha': HOY, 'origen': 'factusol', 'autor': 'Monica (nota de responsabilidad)', 'texto': x['motivo']}])
    print('   ESCRITO', codigo)
print('ESCRITO' if ESCRIBIR else '(en seco)')
