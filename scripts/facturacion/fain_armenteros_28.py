# -*- coding: utf-8 -*-
"""Armenteros 28 Madrid (HE-2021-0027): «se hicieron dos obras, dos CSS cobradas, es ok» (Mónica, 19-oct-2026). El 80 % de
la CSS del pedido de 2021 es la Accesalia 2021/1-69 (línea de CSS, estaba suelta); la Accesalia 2025/1-52 es la CSS de la
SEGUNDA obra y sale de este pedido (queda apuntada a la opp, a falta de su papel).

  python scripts/facturacion/fain_armenteros_28.py [--escribir]
"""
import sys, os, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
h = b.leer('hojas_encargo?select=id&numero_hoja=eq.HE-2021-0027')[0]
css = [l for l in b.leer('lineas_facturacion?select=id,descripcion&quitada_en=is.null&hoja_encargo_id=eq.' + h['id']) if 'seguridad' in l['descripcion'].lower()][0]
pss = b.leer('hitos_cobro?select=id,notas,enl:factura_linea_hitos(factura_linea_id,importe)&hito=eq.pss&linea_facturacion_id=eq.' + css['id'])[0]
f52 = b.leer('facturas?select=id,lineas:factura_lineas(id)&origen=eq.factusol&empresa_emisora=eq.accesalia&anio=eq.2025&serie=eq.1&numero=eq.52')[0]
f69 = b.leer('facturas?select=id,lineas:factura_lineas(id,concepto,base,enl:factura_linea_hitos(hito_cobro_id))&origen=eq.factusol&empresa_emisora=eq.accesalia&anio=eq.2021&serie=eq.1&numero=eq.69')[0]
l69 = [l for l in f69['lineas'] if 'SEGURIDAD' in l['concepto'].upper()][0]
assert [e['factura_linea_id'] for e in pss['enl']] == [f52['lineas'][0]['id']] and not l69['enl'] and float(l69['base']) == 480
print('pss 480: 2025/1-52 -> 2021/1-69 (línea de CSS)')
if not ESCRIBIR:
    print('EN SECO'); sys.exit()
b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (f52['lineas'][0]['id'], pss['id']))
b.insertar('factura_linea_hitos', [dict(factura_linea_id=l69['id'], hito_cobro_id=pss['id'], importe=480.0, como='a_mano')])
b.actualizar('hitos_cobro?id=eq.' + pss['id'], {'notas': '\n'.join(x for x in (pss['notas'], 'La CSS de esta obra (2021) es la Accesalia 2021/1-69; la '
             'Accesalia 2025/1-52 es la CSS de una segunda obra (Mónica, %s).' % datetime.date.today().isoformat()) if x)})
print('ESCRITO')
