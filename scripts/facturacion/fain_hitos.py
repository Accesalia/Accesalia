# -*- coding: utf-8 -*-
"""HITOS DE FAIN (Monica, 12-oct-2026): "FAIN: siempre, pero siempre siempre: 50/30/20 (50 % a la entrega de proyecto,
30 % a la obtencion de licencia, 20 % a la emision del fin de obra). Y en CSS tambien tienen un estandar: 80 % al inicio
de obra, 20 % al fin de obra. Es norma interna suya, llevan asi 11 anos."
Lineas que paga FAIN cuyos hitos NO son esos y que AUN NO TIENEN NINGUNA FACTURA casada: se rehacen.
  proyecto -> entrega 50 / licencia 30 / cfo 20      CSS -> pss 80 (plan de seguridad = inicio de obra) / cfo 20
Fuera: lineas con factura casada (se miran al casar: manda la factura), lineas que no son proyecto ni CSS
(subvenciones, IEE...) y lineas sin importe.
  python scripts/facturacion/fain_hitos.py [--escribir]
"""
import sys, os, re, datetime
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
b = arrancar()
FAIN = b.leer('contratas?nombre=eq.FAIN&select=id')[0]['id']
NORMA = {'proyecto': [('entrega', 50), ('licencia', 30), ('cfo', 20)], 'css': [('pss', 80), ('cfo', 20)]}
def tipo(d):
    d = (d or '').upper()
    if re.search(r'\bCSS\b|SEGURIDAD Y SALUD|CSYS', d) and not re.search(r'PROYECTO', d): return 'css'
    if re.search(r'SUBVENC|IEE|LIBRO DEL EDIFICIO|CERTIFICADO DE EFICIENCIA|BONIFICACI|TASAS|INFORME', d): return None
    if re.search(r'PROYECTO|ASCENSOR|ELEVADOR|PLATAFORMA|SALVAESCALERAS|COTA CERO|RAMPA|ACCESIBILIDAD|HONORARIOS', d): return 'proyecto'
    return None
con_factura = {x['hito_cobro_id'] for x in b.leer('factura_linea_hitos?select=hito_cobro_id&order=factura_linea_id,hito_cobro_id')}
hechas, fuera = 0, []
for l in b.leer(f'lineas_facturacion?pagador_tipo=eq.contrata&pagador_id=eq.{FAIN}&select=id,descripcion,importe,hoja:hoja_encargo_id(numero_hoja)&order=id'):
    t = tipo(l['descripcion'])
    hs = b.leer(f'hitos_cobro?linea_facturacion_id=eq.{l["id"]}&select=id,hito,porcentaje,hito_padre_id,estado&order=orden,id')
    arriba = [(h['hito'], round(float(h['porcentaje'] or 0))) for h in hs if not h['hito_padre_id']]
    if t is None: fuera.append((l['hoja']['numero_hoja'], 'no es proyecto ni CSS', (l['descripcion'] or '')[:50])); continue
    if arriba == NORMA[t]: continue
    if any(h['id'] in con_factura for h in hs): fuera.append((l['hoja']['numero_hoja'], 'tiene factura casada', str(arriba))); continue
    if l['importe'] is None: fuera.append((l['hoja']['numero_hoja'], 'sin importe', '')); continue
    if any(h['estado'] in ('completado', 'anulado') for h in hs): fuera.append((l['hoja']['numero_hoja'], 'hito completado/anulado', str(arriba))); continue
    print(f"{l['hoja']['numero_hoja']} {t:8} {l['importe']:>9} | {arriba} -> {NORMA[t]} | {(l['descripcion'] or '')[:45]}")
    hechas += 1
    if not ESCRIBIR: continue
    for h in sorted(hs, key=lambda h: h['hito_padre_id'] is None):     # primero los subhitos
        b.borrar(f'hitos_cobro?id=eq.{h["id"]}')
    imp = float(l['importe']); filas, acum = [], 0.0
    for k, (hito, pct) in enumerate(NORMA[t], 1):
        v = round(imp * pct / 100, 2) if k < len(NORMA[t]) else round(imp - acum, 2); acum += v
        filas.append({'linea_facturacion_id': l['id'], 'hito': hito, 'orden': k, 'porcentaje': pct, 'importe': v, 'estado': 'pendiente',
                      'notas': f'Norma de FAIN ({"50/30/20" if t == "proyecto" else "80/20"}), Monica {HOY}: sustituye a {arriba or "sin hitos"}.'})
    b.insertar('hitos_cobro', filas)
print('rehechas:', hechas)
import collections
print('fuera:', collections.Counter(f[1] for f in fuera))
for f in fuera:
    if f[1] != 'no es proyecto ni CSS': print('   ', f)
print('ESCRITO' if ESCRIBIR else '(en seco)')
