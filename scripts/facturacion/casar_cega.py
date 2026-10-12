# -*- coding: utf-8 -*-
"""CEGA (Monica, 12-oct-2026): las 3 facturas 2025/214-216 traen proyecto (ya casado) + 'tramitacion de subvenciones
para dicha comunidad' 1.980, sin direccion en la linea: es la gestion de subvenciones de la hoja de cada direccion
(Vidrieria 3 HE-2025-0397, Nuno Gomez 16 HE-2025-0393, Fray Jose Cerdeirina 66 HE-2025-0390).
  python scripts/facturacion/casar_cega.py [--escribir]
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
for num, hoja in [(214, 'HE-2025-0397'), (215, 'HE-2025-0393'), (216, 'HE-2025-0390')]:
    f = b.leer('facturas?empresa_emisora=eq.accesalia&anio=eq.2025&serie=eq.1&numero=eq.%s&select=id,estado' % num)[0]
    fl = [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base' % f['id']) if l['base'] and abs(float(l['base']) - 1980) < 0.01][0]
    assert not b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % fl['id'])
    h = b.leer('hojas_encargo?numero_hoja=eq.%s&select=id' % hoja)[0]['id']
    l = [l for l in b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&select=id,descripcion' % h) if 'SUBVENCION' in (l['descripcion'] or '').upper()][0]
    x = b.leer('hitos_cobro?linea_facturacion_id=eq.%s&hito=eq.encargo&select=id,importe' % l['id'])[0]
    assert abs(float(x['importe']) - 1980) < 0.01
    print('2025/%s 1980 -> %s gestion de subvenciones encargo' % (num, hoja))
    if ESCRIBIR:
        b.insertar('factura_linea_hitos', [{'factura_linea_id': fl['id'], 'hito_cobro_id': x['id'], 'importe': 1980.0, 'como': 'a_mano'}])
        if f['estado'] == 'cobrada':
            b.actualizar('hitos_cobro?id=eq.%s' % x['id'], {'estado': 'completado'})
print('ESCRITO' if ESCRIBIR else '(en seco)')
