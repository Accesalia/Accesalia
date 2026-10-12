# -*- coding: utf-8 -*-
""""LA FACTURA CITA UNA HOJA QUE NO ESTA": la hoja si estaba, con otra fecha (Monica, 12-oct-2026: "ok a todas, Rufino
incluido"):
  Pablo Lafargue 38   2026/282 3.450 -> entrega del proyecto de HE-2025-0737 (la factura dice 12/12, la hoja es del 22/12)
  Rufino Blanco 20    2026/3   3.250 -> los tres encargos de HE-2025-0641 (445 + 2.380 + 425); la 2a mitad (2026/61) ya estaba
  Plaza Luca de Tena 11  2025/387, 2025/397 (3.400 + 3.400): la hoja HE-2025-0372 dice 50/50 de 10.200 y se facturo en
     tercios. Manda la factura sin tocar la hoja: la 2a = los 1.700 que quedaban del encargo + 1.700 de la entrega
     (subhito); la 3a = los 3.400 que quedan de la entrega (subhito).
  Navarra 28-30 (2026/287) se queda: lo mira con administracion. Isturiz 11, pendiente de su respuesta.
  python scripts/facturacion/casar_cita_hoja.py [--escribir]
"""
import sys, os, json, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
M = '(Monica, %s: manda la factura)' % HOY
b = arrancar()
cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
ya = {x['hito_cobro_id'] for x in b.leer('factura_linea_hitos?select=hito_cobro_id&order=factura_linea_id,hito_cobro_id')}


def alta(tabla, fila):
    req = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))[0]


def flinea(anio, num, base):
    f = b.leer('facturas?empresa_emisora=eq.accesalia&anio=eq.%s&serie=eq.1&numero=eq.%s&select=id,estado,fecha' % (anio, num))[0]
    ls = [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base&order=posicion' % f['id']) if l['base'] and abs(float(l['base']) - base) < 0.01]
    ls = [l for l in ls if not b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % l['id'])]
    assert len(ls) == 1, (anio, num, base, ls)
    return f, ls[0]


def hitos(hoja, plazo, palabra=''):
    h = b.leer('hojas_encargo?numero_hoja=eq.%s&select=id' % hoja)[0]['id']
    return [x for l in b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&select=id,descripcion&order=id' % h) if palabra in (l['descripcion'] or '').upper()
            for x in b.leer('hitos_cobro?linea_facturacion_id=eq.%s&hito=eq.%s&hito_padre_id=is.null&select=id,importe,estado,linea_facturacion_id&order=orden' % (l['id'], plazo))
            if x['id'] not in ya and x['importe'] is not None]


def casar(fac, destinos):
    f, fl = fac
    assert abs(sum(i for _, i in destinos) - float(fl['base'])) < 0.01
    print('   %s -> %s' % (fl['base'], [(x['id'][:8], i) for x, i in destinos]))
    if not ESCRIBIR:
        return
    for x, i in destinos:
        b.insertar('factura_linea_hitos', [{'factura_linea_id': fl['id'], 'hito_cobro_id': x['id'], 'importe': i, 'como': 'a_mano'}])
        if f['estado'] == 'cobrada':
            b.actualizar('hitos_cobro?id=eq.%s' % x['id'], {'estado': 'completado'})


def subhito(padre, plazo, orden, importe, factura, fecha):
    print('   subhito de %s (%s): %s' % (plazo, padre['importe'], importe))
    if not ESCRIBIR:
        return {'id': '(nuevo)'}
    return alta('hitos_cobro', {'linea_facturacion_id': padre['linea_facturacion_id'], 'hito_padre_id': padre['id'], 'hito': plazo, 'orden': orden,
                                'importe': importe, 'estado': 'pendiente',
                                'notas': 'Subhito: factura accesalia %s (%s). Se facturo en tercios de 3.400; la hoja decia 50/50 %s.' % (factura, fecha, M)})


print('Pablo Lafargue 38')
h = hitos('HE-2025-0737', 'entrega', 'PROYECTO'); assert len(h) == 1
casar(flinea(2026, 282, 3450.0), [(h[0], 3450.0)])

print('Rufino Blanco 20')
h = hitos('HE-2025-0641', 'encargo'); h = [x for x in h if float(x['importe']) in (445.0, 2380.0, 425.0)]; assert len(h) == 3
casar(flinea(2026, 3, 3250.0), [(x, float(x['importe'])) for x in h])

print('Plaza Luca de Tena 11')
hoja = b.leer('hojas_encargo?numero_hoja=eq.HE-2025-0372&select=id')[0]['id']
lin = [l for l in b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&select=id,importe&order=id' % hoja) if l['importe'] == 10200][0]['id']
todos = b.leer('hitos_cobro?linea_facturacion_id=eq.%s&select=id,hito,importe,estado,hito_padre_id,linea_facturacion_id&order=orden,id' % lin)
enc = [x for x in todos if x['hito'] == 'encargo' and not x['hito_padre_id']][0]
ent = [x for x in todos if x['hito'] == 'entrega' and not x['hito_padre_id']][0]
resto_enc = [x for x in todos if x['hito_padre_id'] == enc['id'] and x['id'] not in ya]
assert len(resto_enc) == 1 and float(resto_enc[0]['importe']) == 1700.0, resto_enc
assert not [x for x in todos if x['hito_padre_id'] == ent['id']]
f2 = flinea(2025, 387, 3400.0); f3 = flinea(2025, 397, 3400.0)
s1 = subhito(ent, 'entrega', 1, 1700.0, '2025/1-387', f2[0]['fecha'])
s2 = subhito(ent, 'entrega', 2, 3400.0, '2025/1-397', f3[0]['fecha'])
casar(f2, [(resto_enc[0], 1700.0), (s1, 1700.0)])
casar(f3, [(s2, 3400.0)])
if ESCRIBIR:
    b.actualizar('hitos_cobro?id=eq.%s' % enc['id'], {'estado': 'completado'})
    b.actualizar('hitos_cobro?id=eq.%s' % ent['id'], {'estado': 'completado' if f3[0]['estado'] == 'cobrada' and f2[0]['estado'] == 'cobrada' else 'parcial'})
print('ESCRITO' if ESCRIBIR else '(en seco)')
