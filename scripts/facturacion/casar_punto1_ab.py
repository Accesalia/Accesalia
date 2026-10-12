# -*- coding: utf-8 -*-
"""PUNTO 1, grupos A y B (Monica, 12-oct-2026: "las del punto 1 se arreglan"). Solo lo que no admite duda:
  A. la factura cobra la SUMA de varios hitos (las dos mitades a la vez, o proyecto + ascensor de una vez): se enlaza
     a cada hito con su importe.
  B. el % a exito (hito 'concesion' sin importe) ya facturado: el hito toma el importe de la factura y se enlaza.
Estado: completado si la factura esta cobrada (como en casar_facturas_hitos).
  python scripts/facturacion/casar_punto1_ab.py [--escribir]
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
b = arrancar()

def linea_factura(emisor, anio, num):
    f = b.leer(f'facturas?empresa_emisora=eq.{emisor}&anio=eq.{anio}&serie=eq.1&numero=eq.{num}&tipo=eq.factura&select=id,estado,base')[0]
    ls = b.leer(f'factura_lineas?factura_id=eq.{f["id"]}&select=id,base&order=posicion')
    return f, [l for l in ls if l['base']][0]
def hitos(hoja, filtro_linea=None, tipos=None):
    h = b.leer(f'hojas_encargo?numero_hoja=eq.{hoja}&select=id')[0]['id']
    out = []
    for lf in b.leer(f'lineas_facturacion?hoja_encargo_id=eq.{h}&select=id,descripcion&order=id'):
        if filtro_linea and filtro_linea.upper() not in (lf['descripcion'] or '').upper(): continue
        for x in b.leer(f'hitos_cobro?linea_facturacion_id=eq.{lf["id"]}&hito_padre_id=is.null&select=id,hito,importe,estado&order=orden,id'):
            if not tipos or x['hito'] in tipos: out.append(x)
    return out
ya = {x['hito_cobro_id'] for x in b.leer('factura_linea_hitos?select=hito_cobro_id&order=factura_linea_id,hito_cobro_id')}

CASOS = [  # (emisor, anio, numero, hoja, filtro de linea, tipos de hito)  -- A: suma
    ('accesalia', 2025, 198, 'HE-2025-0383', None, {'encargo'}),
    # fuera: 2025/191 (6.000 'encargo y entrega' de Pico de Artilleros 39): HE-2025-0090 ya tiene facturados los dos 3.000 -> a revisar
    ('accesalia', 2026, 91, 'HE-2026-0043', None, {'encargo', 'entrega'}),
    ('daniel', 2026, 3, 'HE-2026-0059', None, {'encargo', 'entrega'}),
]
# B (Manresa 17-19: el 2 % es de la subvencion de eficiencia, HE-2022-0028)
EXITO = [('accesalia', 2025, 364, 'HE-2022-0054'), ('accesalia', 2026, 153, 'HE-2022-0028')]
for em, an, nu, hoja, fl_, tipos in CASOS:
    f, l = linea_factura(em, an, nu); hs = [x for x in hitos(hoja, fl_, tipos) if x['id'] not in ya]
    suma = sum(float(x['importe'] or 0) for x in hs)
    ok = abs(suma - float(l['base'])) <= 2
    print(f'A {em} {an}/{nu} {l["base"]} -> {hoja} {[(x["hito"], x["importe"]) for x in hs]} suma {suma} {"OK" if ok else "NO CUADRA: no se toca"}')
    if not (ok and ESCRIBIR): continue
    b.insertar('factura_linea_hitos', [{'factura_linea_id': l['id'], 'hito_cobro_id': x['id'], 'importe': float(x['importe']), 'como': 'automatico'} for x in hs])
    if f['estado'] == 'cobrada':
        for x in hs: b.actualizar(f'hitos_cobro?id=eq.{x["id"]}&estado=eq.pendiente', {'estado': 'completado'})
for em, an, nu, hoja in EXITO:
    f, l = linea_factura(em, an, nu); hs = [x for x in hitos(hoja, None, {'concesion'}) if x['id'] not in ya and x['importe'] is None]
    print(f'B {em} {an}/{nu} {l["base"]} -> {hoja} hitos a exito libres: {len(hs)}')
    if len(hs) != 1 or not ESCRIBIR: continue
    x = hs[0]
    b.actualizar(f'hitos_cobro?id=eq.{x["id"]}', {'importe': float(l['base']), **({'estado': 'completado'} if f['estado'] == 'cobrada' else {})})
    b.insertar('factura_linea_hitos', [{'factura_linea_id': l['id'], 'hito_cobro_id': x['id'], 'importe': float(l['base']), 'como': 'automatico'}])
print('ESCRITO' if ESCRIBIR else '(en seco)')
