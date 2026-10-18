# -*- coding: utf-8 -*-
"""Contratas sueltas, tanda 2 (hilo 68 con Monica, 18-oct-2026): las que tienen hoja en la app pero sin hitos que
casen. Leidas a mano: el papel y la factura.
  Madrid 2 Colmenar Viejo (HE-2023-0011, FAIN pedido 278381): la factura 78-2023 cobra «el 75 % del proyecto y CSS ...
  resta el 25 % al fin de obra»: los hitos pasan a 75/25 (manda la factura) y se enlaza.
  Entre Arroyos 56 (HE-2022-0046, NVR): sus cuatro lineas no tenian hitos. Ascensor y envolvente 50/50 (la daniel
  77-2022 cobra «50 % proyecto ascensor + 50 % proyecto envolvente + libro»), IEE y libro 100 %, CSS 80/20.
  python scripts/facturacion/contratas_tanda2_68.py [--escribir]
"""
import sys, os, json, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = '2026-10-18'
AUTOR = 'Revisión a mano con Mónica (18-oct-2026)'
b = arrancar()
cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
def alta(t, f):
    req = urllib.request.Request(b.url + '/rest/v1/' + t, data=json.dumps([f], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r: return json.loads(r.read().decode('utf-8'))[0]
def hoja(cod):
    return b.leer('hojas_encargo?select=id,lineas:lineas_facturacion(id,descripcion,importe,quitada_en,hitos:hitos_cobro(id,hito,importe,estado))&numero_hoja=eq.' + cod)[0]
def fl(emp, anio, num, base):
    for f in b.leer('facturas?select=id,anio,estado,lineas:factura_lineas(id,base,flh:factura_linea_hitos(hito_cobro_id))&tipo=eq.factura&empresa_emisora=eq.%s&anio=eq.%s&numero=eq.%s' % (emp, anio, num)):
        ls = [l for l in f['lineas'] if abs(float(l['base']) - base) < 0.01 and not l['flh']]
        if ls: return ls[0], (f['anio'] <= 2023 or f['estado'] == 'cobrada')
    raise SystemExit('no esta (o ya casada): %s %s %s %s' % (emp, anio, num, base))
def nota(hid, texto, hito=None):
    return {'hoja_encargo_id': hid, 'hito_cobro_id': hito, 'fecha': HOY, 'origen': 'factusol', 'tipo': 'nota', 'autor': AUTOR, 'texto': texto}

# Madrid 2
h = hoja('HE-2023-0011'); l = [x for x in h['lineas'] if not x['quitada_en']][0]
f78, cob = fl('accesalia', 2023, 78, 2100)
print('Madrid 2: %s %s, hitos %s -> 75/25 y enlazar 78-2023 (2.100)' % (l['descripcion'][:40], l['importe'], [(t['hito'], t['importe']) for t in l['hitos']]))
# Entre Arroyos 56
h2 = hoja('HE-2022-0046'); L = [x for x in h2['lineas'] if not x['quitada_en']]
print('Entre Arroyos 56: lineas', [(v['descripcion'][:45], v['importe'], len(v['hitos'])) for v in L])
assert len(L) == 4 and not any(v['hitos'] for v in L)
f77 = b.leer('facturas?select=id,lineas:factura_lineas(id,base,concepto,flh:factura_linea_hitos(hito_cobro_id))&tipo=eq.factura&empresa_emisora=eq.daniel&anio=eq.2022&numero=eq.77')[0]
print('   daniel 77-2022:', [(x['base'], x['concepto'][:50], bool(x['flh'])) for x in f77['lineas']])
if not ESCRIBIR: print('(en seco)'); sys.exit()

for t in l['hitos']:
    b.actualizar('hitos_cobro?id=eq.' + t['id'], {'estado': 'anulado'})
e = alta('hitos_cobro', {'linea_facturacion_id': l['id'], 'hito': 'entrega', 'orden': 1, 'porcentaje': 75, 'importe': 2100, 'estado': 'completado' if cob else 'pendiente',
                         'notas': 'Como facturó FAIN: 75 %% del proyecto y CSS (%s)' % AUTOR})
alta('hitos_cobro', {'linea_facturacion_id': l['id'], 'hito': 'cfo', 'orden': 2, 'porcentaje': 25, 'importe': 700, 'estado': 'pendiente', 'notas': 'Resta el 25 %% al fin de obra (%s)' % AUTOR})
b.insertar('factura_linea_hitos', [{'factura_linea_id': f78['id'], 'hito_cobro_id': e['id'], 'importe': 2100, 'como': 'a_mano'}])
b.insertar('notas_facturacion', [nota(h['id'], 'Hitos rehechos en 75/25: la 78-2023 cobra «el 75 % del proyecto y CSS ... resta el 25 % al fin de obra» (pedido FAIN 278381).')])

def hitos(linea, rep):
    return {t: alta('hitos_cobro', {'linea_facturacion_id': linea['id'], 'hito': t, 'orden': k, 'porcentaje': p, 'importe': round(float(linea['importe']) * p / 100, 2),
                                    'estado': 'pendiente', 'notas': 'Revisión a mano (18-oct-2026)'}) for k, (t, p) in enumerate(rep, 1)}
asc = env = lib = css = None
for v in L:
    d = v['descripcion'].lower()
    if 'ascensor' in d: asc = hitos(v, [('entrega', 50), ('cfo', 50)])
    elif 'envolvente' in d: env = hitos(v, [('entrega', 50), ('cfo', 50)])
    elif 'libro' in d: lib = hitos(v, [('entrega', 100)])
    elif 'seguridad' in d: css = hitos(v, [('pss', 80), ('cfo', 20)])
assert asc and env and lib and css
total = sum(float(x['base']) for x in f77['lineas'])
assert abs(total - 4500) < 0.01, total
filas, ids = [], []
if len(f77['lineas']) == 1:
    x = f77['lineas'][0]
    for hh, i in ((asc['entrega'], 2000), (env['entrega'], 2000), (lib['entrega'], 500)):
        filas.append({'factura_linea_id': x['id'], 'hito_cobro_id': hh['id'], 'importe': i, 'como': 'a_mano'}); ids.append(hh['id'])
else:
    raise SystemExit('la 77-2022 tiene varias lineas: casar a mano')
b.insertar('factura_linea_hitos', filas)
for i in ids: b.actualizar('hitos_cobro?id=eq.' + i, {'estado': 'completado'})
b.insertar('notas_facturacion', [nota(h2['id'], 'Hitos creados (no tenía): la daniel 77-2022 cobra el 50 % de cada proyecto (ascensor y envolvente) + el libro (4.500). La CSS no consta facturada.')])
print('ESCRITO')
