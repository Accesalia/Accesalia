# -*- coding: utf-8 -*-
"""LOS DOS TROZOS A MANO (Monica, 12-oct-2026):
  Ayamonte 2: la 2a linea de 2026/95 (3.500, "1a mitad de 7000") es de HE-2026-0137 (arreglo de cubierta, 7.000):
    su encargo de 3.500 esta libre.
  Alcala de Guadaira 41 (HE-2024-0180, 5.500 en tres lineas 50/50): las facturas dicen 2a parte 2.250 y ultima parte
    1.000, las dos "a la entrega del proyecto"; la 1a parte (2.250) sera de 2024 (aun no subida). Manda la factura:
    encargo 2.250 y entrega 3.250, repartidos entre las tres lineas en proporcion, y las dos facturas casadas con las
    tres entregas.
  python scripts/facturacion/casar_trozos_a_mano.py [--escribir]
"""
import sys, os, datetime
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
M = '(Monica, %s: manda la factura)' % datetime.date.today().isoformat()
b = arrancar()


def lineas_factura(anio, num):
    f = b.leer('facturas?empresa_emisora=eq.accesalia&anio=eq.%s&serie=eq.1&numero=eq.%s&select=id,estado' % (anio, num))[0]
    return f['estado'], [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base,concepto&order=posicion' % f['id']) if l['base']]


def hoja_lineas(hoja):
    h = b.leer('hojas_encargo?numero_hoja=eq.%s&select=id' % hoja)[0]['id']
    return b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&importe=not.is.null&select=id,descripcion,importe&order=id' % h)


def hitos(lid):
    return b.leer('hitos_cobro?linea_facturacion_id=eq.%s&hito_padre_id=is.null&select=id,hito,importe&order=orden,id' % lid)


def enlace(fl_id, hid, imp, est):
    print('      %s -> %s' % (imp, hid[:8]))
    if ESCRIBIR:
        b.insertar('factura_linea_hitos', [{'factura_linea_id': fl_id, 'hito_cobro_id': hid, 'importe': imp, 'como': 'a_mano'}])
        if est == 'cobrada':
            b.actualizar('hitos_cobro?id=eq.%s' % hid, {'estado': 'completado'})


print('Ayamonte 2')
est, ls = lineas_factura(2026, 95)
l3500 = [l for l in ls if abs(float(l['base']) - 3500) < 0.01][0]
ya = {x['hito_cobro_id'] for x in b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % l3500['id'])}
if not ya:
    enc = [h for l in hoja_lineas('HE-2026-0137') if 'REDACCI' in (l['descripcion'] or '').upper() for h in hitos(l['id']) if h['hito'] == 'encargo']
    assert len(enc) == 1 and abs(float(enc[0]['importe']) - 3500) < 0.01, enc
    enlace(l3500['id'], enc[0]['id'], 3500.0, est)

print('Alcala de Guadaira 41')
e16, (f16,) = lineas_factura(2025, 16)
e28, (f28,) = lineas_factura(2025, 28)
ls = hoja_lineas('HE-2024-0180')
total = sum(float(l['importe']) for l in ls)
assert abs(total - 5500) < 0.01, total
acum16 = acum28 = 0.0
for k, l in enumerate(ls):
    imp = float(l['importe'])
    ult = k == len(ls) - 1
    p16 = round(2250 - acum16, 2) if ult else round(2250 * imp / total, 2)
    p28 = round(1000 - acum28, 2) if ult else round(1000 * imp / total, 2)
    acum16 += p16; acum28 += p28
    enc_imp = round(imp - p16 - p28, 2)
    hs = {h['hito']: h for h in hitos(l['id'])}
    print('   %s %s: encargo %s -> %s | entrega %s -> %s (%s + %s)' % ((l['descripcion'] or '')[:30], imp, hs['encargo']['importe'],
          enc_imp, hs['entrega']['importe'], round(p16 + p28, 2), p16, p28))
    if ESCRIBIR:
        b.actualizar('hitos_cobro?id=eq.%s' % hs['encargo']['id'], {'importe': enc_imp,
                     'notas': '1a parte (2.250 de 5.500), de 2024: factura aun no subida %s.' % M})
        b.actualizar('hitos_cobro?id=eq.%s' % hs['entrega']['id'], {'importe': round(p16 + p28, 2),
                     'notas': 'A la entrega: 2a parte 2.250 (2025/16) + ultima parte 1.000 (2025/28) %s.' % M})
    enlace(f16['id'], hs['entrega']['id'], p16, e16)
    enlace(f28['id'], hs['entrega']['id'], p28, e28)
print('ESCRITO' if ESCRIBIR else '(en seco)')
