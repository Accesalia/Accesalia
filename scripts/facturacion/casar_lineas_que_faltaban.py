# -*- coding: utf-8 -*-
"""LAS 'LINEAS MAL GENERADAS' del analisis (Monica, 12-oct-2026): la linea SI esta; el analisis no reconocia el concepto.
  Benimamet 59 (2025/310) -> IEE 850 | Gomeznarro 233 (Daniel 2026/7, "CSS y DF") -> CSS 1.800
  Carlos Sole 46 (2026/211) -> IEE: 1.190 (la hoja decia 983,47 = 1.190 sin IVA; manda la factura)
  Villaviciosa de Odon 2 (2025/89 y 2025/136, partes de 2.000 de 5.800) -> el proyecto: 'otro' 2.000 y entrega 2.000
  python scripts/facturacion/casar_lineas_que_faltaban.py [--escribir]
"""
import sys, os, datetime
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
M = '(Monica, %s: manda la factura)' % datetime.date.today().isoformat()
b = arrancar()
ya = {x['hito_cobro_id'] for x in b.leer('factura_linea_hitos?select=hito_cobro_id&order=factura_linea_id,hito_cobro_id')}


def factura(emisor, anio, num):
    f = b.leer('facturas?empresa_emisora=eq.%s&anio=eq.%s&serie=eq.1&numero=eq.%s&select=id,estado' % (emisor, anio, num))[0]
    ls = [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base&order=posicion' % f['id']) if l['base']]
    assert len(ls) == 1, (anio, num, ls)
    return f['estado'], ls[0]


def hito(hoja, tipo, palabra):
    h = b.leer('hojas_encargo?numero_hoja=eq.%s&select=id' % hoja)[0]['id']
    out = []
    for l in b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&select=id,descripcion&order=id' % h):
        if palabra in (l['descripcion'] or '').upper():
            out += [x for x in b.leer('hitos_cobro?linea_facturacion_id=eq.%s&hito=eq.%s&hito_padre_id=is.null&select=id,importe&order=orden,id' % (l['id'], tipo))
                    if x['id'] not in ya]
    assert len(out) == 1, (hoja, tipo, palabra, out)
    return out[0]


for (em, an, nu), (hoja, tipo, palabra), nuevo in [
        (('accesalia', 2025, 310), ('HE-2025-0444', 'encargo', 'INSPECCI'), None),
        (('daniel', 2026, 7), ('HE-2025-0505', 'encargo', 'SEGURIDAD'), None),
        (('accesalia', 2026, 211), ('HE-2026-0226', 'encargo', 'INSPECCI'), 1190.0),
        (('accesalia', 2025, 89), ('HE-2024-0113', 'otro', 'PROYECTO'), None),
        (('accesalia', 2025, 136), ('HE-2024-0113', 'entrega', 'PROYECTO'), None)]:
    est, l = factura(em, an, nu)
    h = hito(hoja, tipo, palabra)
    ok = nuevo is not None or abs(float(h['importe']) - float(l['base'])) < 1
    print('%s %s/%s %s -> %s %s %s%s' % (em, an, nu, l['base'], hoja, tipo, h['importe'], (' => %s' % nuevo) if nuevo else '') + ('' if ok else '  NO CUADRA'))
    if not (ok and ESCRIBIR):
        continue
    cambios = {'estado': 'completado'} if est == 'cobrada' else {}
    if nuevo:
        cambios.update(importe=nuevo, notas='La hoja decia %s (= %s sin IVA) %s.' % (h['importe'], nuevo, M))
    if cambios:
        b.actualizar('hitos_cobro?id=eq.%s' % h['id'], cambios)
    b.insertar('factura_linea_hitos', [{'factura_linea_id': l['id'], 'hito_cobro_id': h['id'], 'importe': float(l['base']), 'como': 'a_mano'}])
print('ESCRITO' if ESCRIBIR else '(en seco)')
