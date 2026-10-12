# -*- coding: utf-8 -*-
"""DOS FACTURAS VIVAS EN EL MISMO HITO (12-oct-2026): del casado del 10-oct, en lineas cobradas en tercios iguales
(1.166,55): la 2a factura se caso con el MISMO tercio. Se pasa la mas reciente al siguiente hito libre de la misma
linea con ese importe. Las anuladas + su sustituta en el mismo hito se dejan (la anulada es rastro).
  python scripts/facturacion/dobles_vivos.py [--escribir]
"""
import sys, os, collections
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
E = b.leer('factura_linea_hitos?select=factura_linea_id,hito_cobro_id,importe,fl:factura_linea_id(factura:factura_id(anio,numero,fecha,estado))&order=factura_linea_id,hito_cobro_id')
por_hito = collections.defaultdict(list)
for e in E: por_hito[e['hito_cobro_id']].append(e)
ocupados = set(por_hito)
for hid, es in por_hito.items():
    vivas = [e for e in es if e['fl']['factura']['estado'] != 'anulada' and float(e['importe']) > 0]
    if len(vivas) < 2: continue
    h = b.leer(f'hitos_cobro?id=eq.{hid}&select=id,linea_facturacion_id,hito,importe,orden,hito_padre_id,linea:linea_facturacion_id(hoja:hoja_encargo_id(numero_hoja))')[0]
    if sum(float(e['importe']) for e in vivas) <= float(h['importe'] or 0) + 1: continue
    hermanos = [x for x in b.leer(f'hitos_cobro?linea_facturacion_id=eq.{h["linea_facturacion_id"]}&hito_padre_id=is.null&select=id,hito,importe,orden,estado&order=orden,id')
                if x['id'] not in ocupados and x['id'] != hid and x['estado'] != 'anulado']
    for e in sorted(vivas, key=lambda e: e['fl']['factura']['fecha'])[1:]:
        dest = next((x for x in hermanos if abs(float(x['importe'] or 0) - float(e['importe'])) <= 1.5), None)
        f = e['fl']['factura']
        print(f"{h['linea']['hoja']['numero_hoja']} {h['hito']} {h['importe']}: {f['anio']}/{f['numero']} ({f['estado']}) -> "
              + (f"{dest['hito']} {dest['importe']} (orden {dest['orden']})" if dest else 'NO HAY HITO LIBRE: a mano'))
        if dest:
            hermanos.remove(dest); ocupados.add(dest['id'])
            if ESCRIBIR:
                b.actualizar(f"factura_linea_hitos?factura_linea_id=eq.{e['factura_linea_id']}&hito_cobro_id=eq.{hid}", {'hito_cobro_id': dest['id']})
                if f['estado'] == 'cobrada': b.actualizar(f"hitos_cobro?id=eq.{dest['id']}", {'estado': 'completado'})
print('ESCRITO' if ESCRIBIR else '(en seco)')
