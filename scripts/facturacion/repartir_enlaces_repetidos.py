# -*- coding: utf-8 -*-
"""Arreglo del casado (Monica, 11-oct-2026): hitos pagados VARIAS VECES.

El casado del 10-oct enlazaba "una linea de factura que paga varios hitos" (la hoja parte el proyecto en lineas)
sin apartar los hitos ya cogidos: en una hoja pagada en 4 mensualidades iguales (HE-2025-0005), las 4 facturas cayeron
en los hitos del primer mes. Aqui: un hito con mas de una factura valida (no anulada) que lo paga entera, y hermanos
en su misma linea con el mismo importe sin factura -> la 2a factura (por fecha) pasa al primer hermano libre (por
orden), la 3a al siguiente... Y el hermano queda completado si la factura esta cobrada.

  python scripts/facturacion/repartir_enlaces_repetidos.py [--escribir]
"""
import sys, os, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402


def main():
    b = arrancar()
    H = {h['id']: h for h in b.leer('hitos_cobro?select=id,linea_facturacion_id,hito,orden,importe,estado,fecha_prevista,hito_padre_id')}
    E = b.leer('factura_linea_hitos?select=factura_linea_id,hito_cobro_id,importe,linea:factura_linea_id(factura:factura_id(fecha,estado,numero))')
    por_hito = collections.defaultdict(list)
    for e in E:
        f = (e['linea'] or {}).get('factura') or {}
        if f.get('estado') != 'anulada': por_hito[e['hito_cobro_id']].append((f.get('fecha') or '', e, f))
    con_enlace = set(por_hito)
    hermanos = collections.defaultdict(list)
    for h in H.values():
        if not h['hito_padre_id']: hermanos[h['linea_facturacion_id']].append(h)
    mover = []
    for hid, es in por_hito.items():
        h = H.get(hid)
        if not h or h['importe'] is None or len(es) < 2: continue
        if not all(abs(float(e['importe'] or 0) - float(h['importe'])) < 0.02 for _, e, _ in es): continue
        libres = sorted([x for x in hermanos[h['linea_facturacion_id']] if x['id'] != hid and x['id'] not in con_enlace and x['importe'] is not None
                         and abs(float(x['importe']) - float(h['importe'])) < 0.02],
                        key=lambda x: (x['orden'] or 0, x['fecha_prevista'] or ''))
        for (_, e, f), destino in zip(sorted(es, key=lambda t: t[0])[1:], libres):
            mover.append((e, hid, destino, f)); con_enlace.add(destino['id'])
    print('enlaces a mover: %d (en %d hitos)' % (len(mover), len({m[1] for m in mover})))
    if '--escribir' not in sys.argv: print('(marcha en seco)'); return
    for e, hid, destino, f in mover:
        b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (e['factura_linea_id'], hid))
        b.insertar('factura_linea_hitos', [{'factura_linea_id': e['factura_linea_id'], 'hito_cobro_id': destino['id'], 'importe': e['importe'], 'como': 'automatico'}])
        if f.get('estado') == 'cobrada': b.actualizar('hitos_cobro?id=eq.%s&estado=eq.pendiente' % destino['id'], {'estado': 'completado'})
    print('movidos')


if __name__ == '__main__':
    main()
