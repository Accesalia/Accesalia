# -*- coding: utf-8 -*-
"""Gallegos 12 Alcalá (HE-2026-0813, pedido de TKE de 5.000): un solo pago sin nombre -> la norma de Thyssen/TKE,
60 % proyecto y presentación de licencia / 20 % licencia / 20 % fin de obra (Mónica, 19-oct-2026). Sin facturas aún.

  python scripts/facturacion/tke_gallegos_12.py [--escribir]
"""
import sys, os, uuid, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
h = b.leer('hojas_encargo?select=id&numero_hoja=eq.HE-2026-0813')[0]
l = b.leer('lineas_facturacion?select=id,importe&quitada_en=is.null&hoja_encargo_id=eq.' + h['id'])
assert len(l) == 1 and float(l[0]['importe']) == 5000
hs = b.leer('hitos_cobro?select=id,hito,estado,enl:factura_linea_hitos(factura_linea_id)&linea_facturacion_id=eq.' + l[0]['id'])
assert len(hs) == 1 and hs[0]['hito'] == 'otro' and not hs[0]['enl']
print('otro 5.000 -> entrega 3.000 + licencia 1.000 + fin de obra 1.000 (pendientes)')
if not ESCRIBIR:
    print('EN SECO'); sys.exit()
nota = 'Norma de Thyssen/TKE: 60/20/20 (Mónica, %s).' % datetime.date.today().isoformat()
b.actualizar('hitos_cobro?id=eq.' + hs[0]['id'], {'hito': 'entrega', 'importe': 3000.0, 'porcentaje': 60, 'orden': 1, 'notas': nota})
for orden, fa in ((2, 'licencia'), (3, 'cfo')):
    b.insertar('hitos_cobro', [dict(id=str(uuid.uuid4()), linea_facturacion_id=l[0]['id'], hito=fa, orden=orden, porcentaje=20, importe=1000.0,
               estado='pendiente', notas=nota)])
print('ESCRITO')
