# -*- coding: utf-8 -*-
"""O'Donnell 35 Madrid (HE-2025-0261): las dos facturas a Schindler dicen «50 % de 14.500» (Daniel 2025/1-27 al encargo y
2025/1-34 a la entrega, 7.250 cada una); la línea decía 14.600 y quedaban 100 € «pendientes» que no existen.
Manda la factura (Mónica, 19-oct-2026): 14.500 en dos mitades cobradas, cada factura entera a su pago.

  python scripts/facturacion/schindler_odonnell_35.py [--escribir]
"""
import sys, os, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
AHORA = datetime.datetime.now(datetime.timezone.utc).isoformat()
MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
b = arrancar()
h = b.leer('hojas_encargo?select=id&numero_hoja=eq.HE-2025-0261')[0]
l = b.leer('lineas_facturacion?select=id,importe,notas&quitada_en=is.null&hoja_encargo_id=eq.' + h['id'])
assert len(l) == 1 and float(l[0]['importe']) == 14600
l = l[0]
hs = b.leer('hitos_cobro?select=id,hito,importe,hito_padre_id,enl:factura_linea_hitos(factura_linea_id,fl:factura_linea_id(f:factura_id(anio,numero)))'
            '&linea_facturacion_id=eq.' + l['id'])
top = {x['hito']: x for x in hs if not x['hito_padre_id']}
fl = {e['fl']['f']['numero']: e['factura_linea_id'] for x in hs for e in x['enl']}
assert set(top) == {'encargo', 'entrega'} and set(fl) == {27, 34}
print('línea 14.600 -> 14.500; encargo 7.250 = 2025/1-27; entrega 7.250 = 2025/1-34')
if not ESCRIBIR:
    print('EN SECO'); sys.exit()
for x in hs:
    for e in x['enl']: b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (e['factura_linea_id'], x['id']))
for x in hs:
    if x['hito_padre_id']: b.borrar('hitos_cobro?id=eq.' + x['id'])
b.actualizar('lineas_facturacion?id=eq.' + l['id'], {'importe': 14500.0, 'editada_en': AHORA, 'editada_por': MONICA, 'notas': '\n'.join(v for v in (l['notas'],
             'Manda la factura (Mónica, %s): las dos facturas dicen «50 %% de 14.500»; la línea decía 14.600.' % HOY) if v)})
for p, n in (('encargo', 27), ('entrega', 34)):
    b.actualizar('hitos_cobro?id=eq.' + top[p]['id'], {'importe': 7250.0, 'porcentaje': 50, 'estado': 'completado'})
    b.insertar('factura_linea_hitos', [dict(factura_linea_id=fl[n], hito_cobro_id=top[p]['id'], importe=7250.0, como='a_mano')])
print('ESCRITO')
