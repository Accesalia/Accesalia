# -*- coding: utf-8 -*-
"""ELECNOR: las hojas que ya están en la app (Mónica, 19-oct-2026, «a) ok»).
  - Marqués de Corbera 36B (HE-2021-0005, 60/20/20): la Accesalia 2021/1-72 (60 %) y la 2023/1-184 (20 % licencia) no
    estaban colgadas de su pago;
  - Sahara 83 y Av. Gibraltar 4-6-8: pagos con su factura colgada que seguían «pendiente» -> facturados;
  - Sandalio López 19 y Natalio Tortuero 6 (proyecto): pago «otro» -> a la entrega;
  - tres papeles de pedido de Elecnor guardados como hojas vacías -> a su hoja; el duplicado se archiva.

  python scripts/facturacion/elecnor_hojas.py [--escribir]
"""
import sys, os, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
b = arrancar()


def hoja(n): return b.leer('hojas_encargo?select=id,oportunidad_id,version_firmada_id,descripcion,codigo_anterior,estado&numero_hoja=eq.' + n)[0]


def hitos_de(n):
    h = hoja(n)
    out = []
    for l in b.leer('lineas_facturacion?select=id,descripcion&quitada_en=is.null&hoja_encargo_id=eq.' + h['id']):
        for x in b.leer('hitos_cobro?select=id,hito,importe,estado,hito_padre_id,enl:factura_linea_hitos(factura_linea_id)&linea_facturacion_id=eq.' + l['id']):
            x['linea'] = l; out.append(x)
    return h, out


def fl(anio, num):
    f = b.leer('facturas?select=id,oportunidad_id,lineas:factura_lineas(id,base)&origen=eq.factusol&empresa_emisora=eq.accesalia&anio=eq.%d&serie=eq.1&numero=eq.%d' % (anio, num))[0]
    ls = [x for x in f['lineas'] if float(x['base'] or 0)]
    assert len(ls) == 1
    return f, ls[0]['id']


ops = []
# Corbera
h, hs = hitos_de('HE-2021-0005')
top = {x['hito']: x for x in hs if not x['hito_padre_id']}
f72, l72 = fl(2021, 72); f184, l184 = fl(2023, 184)
assert not top['entrega']['enl'] and not top['licencia']['enl']
ops += [('enlazar', (l72, top['entrega']['id'], 2400.0)), ('estado', (top['entrega']['id'], 'completado')),
        ('enlazar', (l184, top['licencia']['id'], 800.0)), ('estado', (top['licencia']['id'], 'completado'))]
for f in (f72, f184):
    if not f['oportunidad_id']: ops.append(('opp', (f['id'], h['oportunidad_id'])))
# Sahara 83 y Gibraltar
for n in ('HE-2023-0007', 'HE-2023-0040'):
    for x in hitos_de(n)[1]:
        if x['enl'] and x['estado'] == 'pendiente': ops.append(('estado', (x['id'], 'completado')))
# «otro» -> entrega
for n in ('HE-2023-0008', 'HE-2022-0115'):
    for x in hitos_de(n)[1]:
        if x['hito'] == 'otro': ops.append(('hito', (x['id'], 'entrega')))
# papeles de pedido
PARES = {'HE-2024-0206': 'HE-2024-0119', 'HE-2024-0221': 'HE-2023-0007', 'HE-2026-0821': 'HE-2025-0509'}
for vacio, buena in PARES.items():
    v, g = hoja(vacio), hoja(buena)
    assert v['oportunidad_id'] == g['oportunidad_id'] and v['estado'] != 'archivada'
    assert not b.leer('lineas_facturacion?select=id&hoja_encargo_id=eq.' + v['id'], False)
    ops.append(('papel', (vacio, buena, v, g)))
for t, d in ops: print(t, d[:3] if t != 'papel' else (d[0], '->', d[1]))
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

for t, d in ops:
    if t == 'enlazar': b.insertar('factura_linea_hitos', [dict(factura_linea_id=d[0], hito_cobro_id=d[1], importe=d[2], como='a_mano')])
    elif t == 'estado': b.actualizar('hitos_cobro?id=eq.' + d[0], {'estado': d[1]})
    elif t == 'hito': b.actualizar('hitos_cobro?id=eq.' + d[0], {'hito': d[1]})
    elif t == 'opp': b.actualizar('facturas?id=eq.%s&oportunidad_id=is.null' % d[0], {'oportunidad_id': d[1]})
    elif t == 'papel':
        vacio, buena, v, g = d
        vv = b.leer('versiones_hoja?select=id,notas,pdfs_firmados&hoja_encargo_id=eq.' + v['id'])[0]
        gv = b.leer('versiones_hoja?select=id,notas,pdfs_firmados&id=eq.' + g['version_firmada_id'])[0]
        nuevos = [p for p in (vv['pdfs_firmados'] or []) if p not in (gv['pdfs_firmados'] or [])]
        b.actualizar('versiones_hoja?id=eq.' + gv['id'], {'pdfs_firmados': (gv['pdfs_firmados'] or []) + nuevos, 'notas': '\n'.join(x for x in (gv['notas'],
                     'Pedido de Elecnor: %s. Papel guardado antes aparte como %s%s (Mónica, %s).' % (v['descripcion'].split(' · ')[0], vacio,
                     ' / ' + v['codigo_anterior'] if v['codigo_anterior'] else '', HOY)) if x)})
        b.actualizar('versiones_hoja?id=eq.' + vv['id'], {'notas': '\n'.join(x for x in (vv['notas'],
                     'DUPLICADO de %s: era solo el papel del pedido de Elecnor; está ahora en esa hoja (Mónica, %s).' % (buena, HOY)) if x)})
        b.actualizar('hojas_encargo?id=eq.' + v['id'], {'estado': 'archivada', 'fecha_estado': HOY + 'T00:00:00+00:00'})
print('ESCRITO')
