# -*- coding: utf-8 -*-
"""ISTURIZ 11: el estudio de costes firmado HACE de hoja (Monica, 12-oct-2026: "me equivocaria, y si, la factura manda").
El 8-oct se dejo HE-2025-0244 como enviada porque su PDF firmado ("ISTURIZ 11 MADRID PRY SATE 15-01-2026.pdf", en
PRESUPUESTOS FIRMADOS) parecia un estudio de costes. Pero las facturas 2026/15 y 2026/152 dicen "segun hoja de encargo de
15/01/2026, 50 % de 10.800": ese estudio, firmado, es el encargo (10.800 = 24.600 - 13.800 de descuento por cesion de CAES).
  -> version 2 de HE-2025-0244 (10.800, con el PDF firmado), hoja firmada; linea de 10.800 al 50/50 (lo dicen las
     facturas: el PDF no trae forma de pago) y las dos facturas casadas.
  python scripts/facturacion/isturiz11_estudio_es_hoja.py [--escribir]
"""
import sys, os, json, uuid, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
M = '(Monica, %s: "me equivocaria, y si, la factura manda")' % HOY
PDF = 'G:/Mi unidad/MONICA ACCESALIA/PRESUPUESTOS/PRESUPUESTOS FIRMADOS/ISTURIZ 11 MADRID PRY SATE 15-01-2026.pdf'
ALMACEN = 'documentos-comerciales'
FIRMA = '2026-01-15'
b = arrancar()
cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'


def alta(tabla, fila):
    req = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))[0]


def flinea(anio, num):
    f = b.leer('facturas?empresa_emisora=eq.accesalia&anio=eq.%s&serie=eq.1&numero=eq.%s&select=id,estado' % (anio, num))[0]
    ls = [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base&order=posicion' % f['id']) if l['base'] and abs(float(l['base']) - 5400) < 0.01]
    assert len(ls) == 1 and not b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % ls[0]['id']), (anio, num)
    return f, ls[0]


h = b.leer('hojas_encargo?numero_hoja=eq.HE-2025-0244&select=id,estado,comunidad_id')[0]
assert h['estado'] == 'enviada_comunidad', h
vs = b.leer('versiones_hoja?hoja_encargo_id=eq.%s&select=id,numero_version,notas,forma_pago&order=numero_version' % h['id'])
assert len(vs) == 1
v1 = vs[0]
cs = b.leer('conceptos_hoja?version_hoja_id=eq.%s&order=id' % v1['id'])
assert len([c for c in cs if c['desglose'] == 'se_cobra']) == 1
fa, fb = flinea(2026, 15), flinea(2026, 152)
assert os.path.exists(PDF)
print('HE-2025-0244: enviada -> devuelta_firmada %s; version 2 de 10.800 (%s conceptos, el que se cobra 8.500 -> 10.800) con el PDF firmado' % (FIRMA, len(cs)))
print('   linea 10.800: encargo 5.400 <- 2026/15 (%s); entrega 5.400 <- 2026/152 (%s)' % (fa[0]['estado'], fb[0]['estado']))
if not ESCRIBIR:
    print('(en seco)'); sys.exit()

ruta = 'hojas-encargo/%s/firmada-v2-%s-ISTURIZ-11-MADRID-PRY-SATE-15-01-2026.pdf' % (h['id'], uuid.uuid4().hex[:8])
b.subir(ALMACEN, ruta, open(PDF, 'rb').read(), tipo='application/pdf')
nota = ('Estudio de costes de 10.800 (24.600 - 13.800 por cesion de CAES) firmado: hace de hoja de encargo. Las facturas 2026/15 y 2026/152 '
        'dicen "segun hoja de encargo de 15/01/2026, 50 %% de 10.800". El PDF no trae forma de pago: 50/50 por las facturas %s.' % M)
v2 = alta('versiones_hoja', {'hoja_encargo_id': h['id'], 'numero_version': 2, 'fecha_generada': FIRMA, 'fecha_enviada': FIRMA,
                             'pdfs_firmados': ['almacen:%s/%s' % (ALMACEN, ruta)], 'importe_base': 10800, 'iva_porcentaje': 21,
                             'forma_pago': '50% a la contratacion (provision de fondos), 50% a la entrega del proyecto (por las facturas)', 'notas': nota})
mapa, cobra = {}, None
for c in sorted(cs, key=lambda c: c['incluido_en_concepto_id'] is not None):
    n = {k: c[k] for k in ('hoja_encargo_id', 'proyecto_id', 'tipo_concepto', 'descripcion', 'importe', 'incluido', 'subvencion_tipo_proyecto',
                           'bloque_id', 'desglose', 'forma_pago', 'porcentaje')}
    n['version_hoja_id'] = v2['id']
    n['incluido_en_concepto_id'] = mapa.get(c['incluido_en_concepto_id'])
    if c['desglose'] == 'se_cobra':
        n['importe'] = 10800.0
    nuevo = alta('conceptos_hoja', n)
    mapa[c['id']] = nuevo['id']
    if c['desglose'] == 'se_cobra':
        cobra = nuevo
b.actualizar('versiones_hoja?id=eq.' + v1['id'], {'notas': (v1['notas'] or '') + ' | 12-oct: SI era el encargo (version 2) %s.' % M})
b.actualizar('hojas_encargo?id=eq.' + h['id'], {'estado': 'devuelta_firmada', 'version_firmada_id': v2['id'], 'fecha_firma': FIRMA,
                                                 'fecha_estado': FIRMA + 'T00:00:00+00:00'})
lf = alta('lineas_facturacion', {'hoja_encargo_id': h['id'], 'concepto_hoja_id': cobra['id'], 'bloque_id': cobra['bloque_id'],
                                 'descripcion': 'Proyecto de rehabilitacion de la envolvente termica (honorarios con descuento por cesion de CAES)',
                                 'importe': 10800.0, 'es_porcentaje': False, 'origen': 'pdf', 'verificado': True, 'emisor': 'accesalia',
                                 'pagador_tipo': 'comunidad', 'pagador_id': h['comunidad_id'], 'forma_cobro': 'transferencia',
                                 'notas': 'Desde el estudio de costes firmado (version 2) %s.' % M})
for k, (t, (f, fl)) in enumerate([('encargo', fa), ('entrega', fb)], 1):
    x = alta('hitos_cobro', {'linea_facturacion_id': lf['id'], 'hito': t, 'orden': k, 'porcentaje': 50, 'importe': 5400.0,
                             'estado': 'completado' if f['estado'] == 'cobrada' else 'pendiente'})
    b.insertar('factura_linea_hitos', [{'factura_linea_id': fl['id'], 'hito_cobro_id': x['id'], 'importe': 5400.0, 'como': 'a_mano'}])
b.insertar('notas_facturacion', [{'hoja_encargo_id': h['id'], 'fecha': HOY, 'origen': 'factusol', 'autor': 'Casado con Factusol', 'texto': nota}])
print('ESCRITO')
