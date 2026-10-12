# -*- coding: utf-8 -*-
"""CASAR LAS SUELTAS que el analisis da por seguras (Monica, 12-oct-2026: "ok a eso!!!"): las que CASAN AHORA (un hito
de ese plazo y ese importe, o varios iguales de la misma linea) y los TROZOS (subhito). Lee lo que dejo
por_que_no_casan.py (Descargas/por_que_no_casan.json, de HOY) y escribe con casar_facturas_hitos.escribir (la misma que
caso las 580 del 10-oct: enlaces, subhitos con el resto pendiente, estados y hojas con factura a firmadas).
Fuera: VARIAS OPCIONES (se miran a mano), anuladas para los subhitos (como siempre).
  python scripts/facturacion/casar_sueltas.py [--escribir]
"""
import sys, os, json, collections
sys.path.insert(0, os.path.dirname(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
import casar_facturas_hitos as C  # noqa: E402

filas = json.load(open(os.path.expanduser(r'~\Downloads\por_que_no_casan.json'), encoding='utf-8'))
res = [r for r in filas if r.get('veredicto') in ('exacto', 'exacto_varios', 'subhito') and r['causa'] in ('CASA AHORA', 'SUBHITO')]
print(collections.Counter(r['veredicto'] for r in res), '| fuera:', collections.Counter(r['causa'] for r in filas if r not in res))
for r in res: r.setdefault('texto', '')
b = arrancar()
# (12-oct) cuidado con los hitos que YA tienen factura o subhitos (el analisis solo mira los hitos de arriba):
#  - exacto: si su hito ya tiene factura, otro hermano libre; si no hay, a mano
#  - subhito de un hito YA partido: se casa con el subhito existente de ese importe que este libre; si no, a mano
#  - subhito de un hito que ya tiene una factura entera: a mano (no se parte lo ya facturado)
ya = collections.defaultdict(list)
for x in b.leer('factura_linea_hitos?select=hito_cobro_id,factura_linea_id&order=factura_linea_id,hito_cobro_id'): ya[x['hito_cobro_id']].append(x)
hijos = collections.defaultdict(list)
for h in b.leer('hitos_cobro?hito_padre_id=not.is.null&select=id,hito_padre_id,importe,orden&order=hito_padre_id,orden,id'): hijos[h['hito_padre_id']].append(h)
final, a_mano, cogidos = [], [], set()
for r in res:
    if r['veredicto'] in ('exacto', 'exacto_varios'):
        libres = [h for h in (r.get('otros') or [r['hito']]) if h not in ya and h not in cogidos]
        if not libres: a_mano.append((r, 'su hito ya tiene factura')); continue
        r['veredicto'] = 'exacto'; r['hito'] = libres[0]; cogidos.add(libres[0]); final.append(r); continue
    if hijos.get(r['hito']):
        h = next((h for h in hijos[r['hito']] if h['id'] not in ya and h['id'] not in cogidos and C.cerca(h['importe'], r['importe'])), None)
        if not h: a_mano.append((r, 'el hito ya esta partido y ningun subhito libre es de ese importe')); continue
        r['veredicto'] = 'exacto'; r['hito'] = h['id']; cogidos.add(h['id']); final.append(r); continue
    if ya.get(r['hito']): a_mano.append((r, 'el hito ya tiene una factura entera')); continue
    final.append(r)
print('se escriben:', collections.Counter(r['veredicto'] for r in final), '| a mano:', len(a_mano))
for r, por in a_mano: print('   A MANO', r['factura'], r['importe'], r.get('hoja'), '-', por)
if '--escribir' not in sys.argv: sys.exit('(en seco)')
C.escribir(b, final)
