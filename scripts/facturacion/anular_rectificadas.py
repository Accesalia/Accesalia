# -*- coding: utf-8 -*-
"""FACTURAS RECTIFICADAS QUE SEGUÍAN VIVAS (regla de Mónica, 18-oct-2026: la factura rectificada con su abono por el
importe entero pasa a ANULADA; si no, la regla «hasta 2023 la factura vale como cobrada» la da por cobrada).
Se casa cada abono («Rectificativa de la factura nº X/AAAA…», con sus variantes de formato) con su factura original;
si el abono es por el importe ENTERO y la original no está anulada: anulada + nota, fuera de sus pagos, y cada pago
recalcula su estado con lo que le quede. Los abonos parciales no se tocan.
Lista: docs/facturacion/rectificadas_19oct.json (sacada el 19-oct).

  python scripts/facturacion/anular_rectificadas.py [--escribir]
"""
import sys, os, json, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
b = arrancar()
R = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'docs', 'facturacion', 'rectificadas_19oct.json'), encoding='utf-8'))
plan = [r for r in R if r['estado'] != 'anulada' and r['entera']]
for r in plan: print('%-24s %8g %-10s <- %s | %s' % (r['orig'], r['orig_base'], r['estado'], r['rect'], r['pagador'][:30]))
print(len(plan), 'a anular')
if not ESCRIBIR:
    print('EN SECO'); sys.exit()
for r in plan:
    f = b.leer('facturas?select=id,estado,notas,lineas:factura_lineas(id,enl:factura_linea_hitos(hito_cobro_id))&id=eq.' + r['orig_id'])[0]
    assert f['estado'] != 'anulada'
    hitos = set()
    for l in f['lineas']:
        for e in l['enl']:
            hitos.add(e['hito_cobro_id'])
            b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (l['id'], e['hito_cobro_id']))
    b.actualizar('facturas?id=eq.' + f['id'], {'estado': 'anulada', 'notas': '\n'.join(x for x in (f['notas'],
                 'Anulada: rectificada por el abono %s (%s) (regla de Mónica; %s).' % (r['rect'].replace('/1-', '/1-'), r['motivo'][:60], HOY)) if x)})
    for hid in hitos:
        h = b.leer('hitos_cobro?select=id,importe,estado,notas,enl:factura_linea_hitos(importe)&id=eq.' + hid)[0]
        if h['estado'] == 'anulado': continue
        cob = sum(float(e['importe'] or 0) for e in h['enl'])
        est = 'completado' if cob >= float(h['importe']) - .01 else ('parcial' if cob else 'pendiente')
        b.actualizar('hitos_cobro?id=eq.' + hid, {'estado': est, 'notas': '\n'.join(x for x in (h['notas'],
                     'Fuera la %s: rectificada por el abono %s (%s).' % (r['orig'], r['rect'], HOY)) if x)})
    print('anulada', r['orig'])
print('ESCRITO')
