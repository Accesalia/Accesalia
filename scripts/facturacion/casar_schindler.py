# -*- coding: utf-8 -*-
"""FACTURAS DE SCHINDLER (las emite Daniel) sueltas, casadas a mano (Monica, 12-oct-2026: "ahora vamos con Schindler").
Las hojas SI estaban; el analisis no las veia por la direccion o la fecha:
  2026/22  Av Europa 20 6.000             -> HE-2026-0084 encargo
  2026/38  Castilla 3 Torre 5 2.000 (unico) -> HE-2026-0652 encargo + entrega
  2025/45, 2025/51 Francisca Delgado 7    -> HE-2025-0464 encargo / entrega
  2026/42  Honduras 20 2.500 + 2.000      -> HE-2026-0653 encargo 2.500 / entrega 2.000 (la hoja: 2.250 + 2.250; manda la factura)
  2026/40  Pizarro 4 1.500 (unico)        -> HE-2026-0654 encargo + entrega
  2026/48  Ramon Gomez de la Serna 45     -> HE-2026-0282 encargo del proyecto
  2026/29  Valdevarnes 24 1.980 subvenc.  -> PD-2026-0030 (pedido de Schindler sin lineas): linea nueva y casada
  python scripts/facturacion/casar_schindler.py [--escribir]
"""
import sys, os, json, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
M = '(Monica, %s: manda la factura)' % HOY
b = arrancar()
cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
SCH = b.leer('contratas?nombre=eq.SCHINDLER&select=id')[0]['id']
BL = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo&order=id')}
ya = {x['hito_cobro_id'] for x in b.leer('factura_linea_hitos?select=hito_cobro_id&order=factura_linea_id,hito_cobro_id')}


def alta(tabla, fila):
    req = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))[0]


def flinea(anio, num, base):
    f = b.leer('facturas?empresa_emisora=eq.daniel&anio=eq.%s&serie=eq.1&numero=eq.%s&select=id,estado' % (anio, num))[0]
    ls = [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base' % f['id']) if l['base'] and abs(float(l['base']) - base) < 0.01]
    assert len(ls) == 1, (anio, num, base, ls)
    assert not b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % ls[0]['id']), ('ya casada', anio, num)
    return f['estado'], ls[0]


def hitos(hoja, palabra=None):
    h = b.leer('hojas_encargo?numero_hoja=eq.%s&select=id' % hoja)[0]['id']
    out = {}
    for l in b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&select=id,descripcion&order=id' % h):
        if palabra and palabra not in (l['descripcion'] or '').upper():
            continue
        for x in b.leer('hitos_cobro?linea_facturacion_id=eq.%s&hito_padre_id=is.null&select=id,hito,importe&order=orden' % l['id']):
            if x['id'] not in ya:
                out.setdefault(x['hito'], x)
    return out


def casar(fac, hs, importes=None):
    est, fl = fac
    total = sum(float(h['importe']) for h in hs)
    nuevos = importes or [float(h['importe']) for h in hs]
    assert importes or abs(total - float(fl['base'])) < 0.01, (fl['base'], total)
    print('   %s -> %s' % (fl['base'], [(h['hito'], h['importe'], v) for h, v in zip(hs, nuevos)]))
    if not ESCRIBIR:
        return
    for h, v in zip(hs, nuevos):
        cambios = {'estado': 'completado'} if est == 'cobrada' else {}
        if abs(float(h['importe']) - v) >= 0.01:
            cambios.update(importe=v, notas='La hoja decia %s %s.' % (h['importe'], M))
        if cambios:
            b.actualizar('hitos_cobro?id=eq.%s' % h['id'], cambios)
        b.insertar('factura_linea_hitos', [{'factura_linea_id': fl['id'], 'hito_cobro_id': h['id'], 'importe': v, 'como': 'a_mano'}])


print('Av Europa 20'); h = hitos('HE-2026-0084'); casar(flinea(2026, 22, 6000.0), [h['encargo']])
print('Castilla 3 Torre 5'); h = hitos('HE-2026-0652'); casar(flinea(2026, 38, 2000.0), [h['encargo'], h['entrega']])
print('Francisca Delgado 7'); h = hitos('HE-2025-0464')
casar(flinea(2025, 45, 7000.0), [h['encargo']]); casar(flinea(2025, 51, 7000.0), [h['entrega']])
print('Honduras 20'); h = hitos('HE-2026-0653')
casar(flinea(2026, 42, 2500.0), [h['encargo']], [2500.0]); casar(flinea(2026, 42, 2000.0), [h['entrega']], [2000.0])
print('Pizarro 4'); h = hitos('HE-2026-0654'); casar(flinea(2026, 40, 1500.0), [h['encargo'], h['entrega']])
print('Ramon Gomez de la Serna 45'); h = hitos('HE-2026-0282', 'PROYECTO'); casar(flinea(2026, 48, 2135.0), [h['encargo']])
print('Valdevarnes 24: PD-2026-0030 sin lineas -> Gestion de subvenciones 1.980')
fac = flinea(2026, 29, 1980.0)
pd = b.leer('hojas_encargo?numero_hoja=eq.PD-2026-0030&select=id')[0]['id']
assert not b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&select=id' % pd)
if ESCRIBIR:
    lf = alta('lineas_facturacion', {'hoja_encargo_id': pd, 'bloque_id': BL['TRAMITACION SUBVENCIONES'], 'descripcion': 'Gestion de subvenciones (orden de compra de Schindler)',
                                     'importe': 1980.0, 'es_porcentaje': False, 'origen': 'factura', 'verificado': True, 'emisor': 'daniel_autonomo',
                                     'pagador_tipo': 'contrata', 'pagador_id': SCH, 'forma_cobro': 'confirming',
                                     'notas': 'El pedido no tenia lineas: la pone la factura Daniel 2026/29 %s.' % M})
    x = alta('hitos_cobro', {'linea_facturacion_id': lf['id'], 'hito': 'encargo', 'orden': 1, 'porcentaje': 100, 'importe': 1980.0, 'estado': 'pendiente',
                             'notas': 'Factura Daniel 2026/29 %s.' % M})
    casar(fac, [x])
else:
    print('   1980.0 -> linea nueva encargo 1980')
print('ESCRITO' if ESCRIBIR else '(en seco)')
