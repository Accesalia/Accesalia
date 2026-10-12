# -*- coding: utf-8 -*-
""""LA HOJA NO LO INCLUYE": las 8 lineas SI estaban en su hoja; el analisis no reconocia el concepto (Monica, 12-oct-2026:
"vamos con las 8 hojas que no llevan el concepto de la factura, las repasamos?"). Cuadran al centimo:
  Magdalena 3 Getafe       2026/98  1.800 memoria cuarto de maquinas -> HE-2026-0266 (pago unico)
  Camino de los Vinateros 138  2025/151, 2025/158  200 + 200  -> HE-2025-0269 informe final de obra, 50/50
  Polvoranca 26 Leganes    2026/77, 2026/187  525 + 525     -> HE-2026-0051 consulta urbanistica, 50/50
  Paseo de la Habana 80    2026/270  1.980 doc. tecnica anexa -> HE-2026-0550
  Puerto de la Bonaigua 46 2025/36, 2025/91  3.250 + 3.250  -> HE-2025-0014: el 50 % de 6.500 son los tres
     encargos (445 + 2.380 + 425) y luego las tres entregas
  python scripts/facturacion/casar_hoja_no_lo_incluye.py [--escribir]
"""
import sys, os, datetime
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
ya = {x['hito_cobro_id'] for x in b.leer('factura_linea_hitos?select=hito_cobro_id&order=factura_linea_id,hito_cobro_id')}

CASOS = [  # (anio, numero, base), hoja, plazo
    ((2026, 98, 1800.0), 'HE-2026-0266', 'encargo'),
    ((2025, 151, 200.0), 'HE-2025-0269', 'encargo'),
    ((2025, 158, 200.0), 'HE-2025-0269', 'entrega'),
    ((2026, 77, 525.0), 'HE-2026-0051', 'encargo'),
    ((2026, 187, 525.0), 'HE-2026-0051', 'entrega'),
    ((2026, 270, 1980.0), 'HE-2026-0550', 'encargo'),
    ((2025, 36, 3250.0), 'HE-2025-0014', 'encargo'),
    ((2025, 91, 3250.0), 'HE-2025-0014', 'entrega'),
]
for (anio, num, base), hoja, plazo in CASOS:
    f = b.leer('facturas?empresa_emisora=eq.accesalia&anio=eq.%s&serie=eq.1&numero=eq.%s&select=id,estado' % (anio, num))[0]
    ls = [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base&order=posicion' % f['id']) if l['base'] and abs(float(l['base']) - base) < 0.01]
    assert len(ls) == 1, (anio, num, ls)
    fl = ls[0]
    assert not b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % fl['id']), ('ya casada', anio, num)
    h = b.leer('hojas_encargo?numero_hoja=eq.%s&select=id' % hoja)[0]['id']
    hs = [x for l in b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&select=id&order=id' % h)
          for x in b.leer('hitos_cobro?linea_facturacion_id=eq.%s&hito=eq.%s&hito_padre_id=is.null&select=id,importe&order=orden' % (l['id'], plazo))
          if x['id'] not in ya and x['importe'] is not None]
    assert abs(sum(float(x['importe']) for x in hs) - base) < 0.01, (anio, num, hoja, plazo, hs)
    print('%s/%s %s -> %s %s %s' % (anio, num, base, hoja, plazo, [float(x['importe']) for x in hs]))
    if not ESCRIBIR:
        continue
    for x in hs:
        b.insertar('factura_linea_hitos', [{'factura_linea_id': fl['id'], 'hito_cobro_id': x['id'], 'importe': float(x['importe']), 'como': 'a_mano'}])
        if f['estado'] == 'cobrada':
            b.actualizar('hitos_cobro?id=eq.%s' % x['id'], {'estado': 'completado'})
print('ESCRITO' if ESCRIBIR else '(en seco)')
