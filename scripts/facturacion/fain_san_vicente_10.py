# -*- coding: utf-8 -*-
"""San Vicente 10 Leganés (HE-2020-0009, FAIN, proyecto 3.000 + CSS 600). Mónica, 19-oct-2026: «suena a errores de
facturación; tan antiguo que no merece la pena desenredarlo: si se te ocurre una forma de dejarlo cuadrado sin
arqueología, te la compro». Con las facturas tal cual cuadra exacto:
  entrega 1.250 = Daniel 2020/1-53 · licencia 750 + CSS 80 % 480 = Daniel 2021/1-78 (1.230) · fin de obra 1.000 + CSS
  20 % 120 = Daniel 2025/1-16 (ya colgada) -> proyecto 3.000, CSS 600.
La Accesalia 2021/1-78 (14-oct-2021, mismo texto e importe que la Daniel 2021/1-78 del 25-oct) es su duplicado: ANULADA.
Manda la factura: los pagos del proyecto quedan 1.250 / 750 / 1.000 (FAIN repartió así).

  python scripts/facturacion/fain_san_vicente_10.py [--escribir]
"""
import sys, os, uuid, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
b = arrancar()
h = b.leer('hojas_encargo?select=id&numero_hoja=eq.HE-2020-0009')[0]
ls = {('css' if 'seguridad' in l['descripcion'].lower() else 'pry'): l for l in b.leer('lineas_facturacion?select=id,descripcion,importe&quitada_en=is.null&hoja_encargo_id=eq.' + h['id'])}
hit = {(k, x['hito']): x for k, l in ls.items() for x in b.leer('hitos_cobro?select=id,hito,importe,estado,notas,enl:factura_linea_hitos(factura_linea_id)&hito_padre_id=is.null&linea_facturacion_id=eq.' + l['id'])}


def fac(e, a, n):
    f = b.leer('facturas?select=id,estado,notas,oportunidad_id,lineas:factura_lineas(id,base,enl:factura_linea_hitos(hito_cobro_id))&origen=eq.factusol&tipo=eq.factura'
               '&empresa_emisora=eq.%s&anio=eq.%d&serie=eq.1&numero=eq.%d' % (e, a, n))[0]
    l = [x for x in f['lineas'] if float(x['base'] or 0)]
    assert len(l) == 1
    return f, l[0]


d53, d78, a78 = fac('daniel', 2020, 53), fac('daniel', 2021, 78), fac('accesalia', 2021, 78)
assert not d53[1]['enl'] and not d78[1]['enl'] and not a78[1]['enl'] and a78[0]['estado'] != 'anulada'
assert hit[('pry', 'cfo')]['enl'] and hit[('css', 'cfo')]['enl'] and not hit[('pry', 'entrega')]['enl'] and not hit[('pry', 'licencia')]['enl'] and not hit[('css', 'pss')]['enl']
print('entrega 1250 <- D2020/1-53 · licencia 750 + pss 480 <- D2021/1-78 · A2021/1-78 anulada (duplicado)')
if not ESCRIBIR:
    print('EN SECO'); sys.exit()
nota = 'Manda la factura (Mónica, %s): FAIN pagó el proyecto 1.250 / 750 / 1.000.' % HOY
for k, imp, fl in (('entrega', 1250.0, d53[1]['id']), ('licencia', 750.0, d78[1]['id'])):
    x = hit[('pry', k)]
    b.actualizar('hitos_cobro?id=eq.' + x['id'], {'importe': imp, 'porcentaje': round(imp / 30, 2), 'estado': 'completado', 'notas': '\n'.join(v for v in (x['notas'], nota) if v)})
    b.insertar('factura_linea_hitos', [dict(factura_linea_id=fl, hito_cobro_id=x['id'], importe=imp, como='a_mano')])
x = hit[('css', 'pss')]
b.actualizar('hitos_cobro?id=eq.' + x['id'], {'estado': 'completado'})
b.insertar('factura_linea_hitos', [dict(factura_linea_id=d78[1]['id'], hito_cobro_id=x['id'], importe=480.0, como='a_mano')])
b.actualizar('hitos_cobro?id=eq.' + hit[('pry', 'cfo')]['id'], {'porcentaje': 33.33})
b.actualizar('facturas?id=eq.' + a78[0]['id'], {'estado': 'anulada', 'notas': '\n'.join(v for v in (a78[0]['notas'],
             'Anulada: duplicado de la Daniel 2021/1-78 (mismo texto e importe, 11 días después); con ella San Vicente 10 cuadra exacto (Mónica, %s).' % HOY) if v)})
for f in (d53[0], d78[0]):
    if not f['oportunidad_id']:
        b.actualizar('facturas?id=eq.%s&oportunidad_id=is.null' % f['id'], {'oportunidad_id': b.leer('hojas_encargo?select=oportunidad_id&id=eq.' + h['id'])[0]['oportunidad_id']})
print('ESCRITO')
