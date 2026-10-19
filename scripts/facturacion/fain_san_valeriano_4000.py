# -*- coding: utf-8 -*-
"""San Valeriano 1 Leganés (HE-2022-0137): el pedido decía 3.500 €, las facturas de FAIN hablan de 4.000 €
(«30 % anteproyecto» 1.200, «20 % proyecto» 800, «30 % de 4.000 € licencia» 1.200). Manda la factura (Mónica, 19-oct-2026):
proyecto 4.000 en 50/30/20; la entrega = anteproyecto + proyecto; la licencia, la 2026/1-96; el fin de obra (800) pendiente.

  python scripts/facturacion/fain_san_valeriano_4000.py [--escribir]
"""
import sys, os, re, uuid, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
AHORA = datetime.datetime.now(datetime.timezone.utc).isoformat()
MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
NOTA = ('Manda la factura (Mónica, %s): el pedido decía 3.500 €, las facturas de FAIN hablan de 4.000 € '
        '(30 %% anteproyecto 1.200 + 20 %% proyecto 800 + 30 %% licencia 1.200).' % HOY)
REPARTO = {'2022/20': ('entrega', 1200.0), '2022/51': ('entrega', 800.0), '2026/96': ('licencia', 1200.0)}
PAGOS = {'entrega': (50, 2000.0), 'licencia': (30, 1200.0), 'cfo': (20, 800.0)}
b = arrancar()
h = b.leer('hojas_encargo?select=id,oportunidad_id&numero_hoja=eq.HE-2022-0137')[0]
l = [l for l in b.leer('lineas_facturacion?select=id,descripcion,importe,notas&quitada_en=is.null&hoja_encargo_id=eq.' + h['id'])
     if not re.search(r'seguridad|csys|css', l['descripcion'].lower())]
assert len(l) == 1
l = l[0]
hs = b.leer('hitos_cobro?select=id,hito,importe,estado,hito_padre_id,enl:factura_linea_hitos(factura_linea_id,'
            'fl:factura_linea_id(f:factura_id(id,anio,numero,oportunidad_id)))&linea_facturacion_id=eq.' + l['id'])
top = {x['hito']: x for x in hs if not x['hito_padre_id'] and x['estado'] != 'anulado'}
fl, fact = {}, {}
for x in hs:
    for e in x['enl']:
        k = '%s/%s' % (e['fl']['f']['anio'], e['fl']['f']['numero'])
        fl[k] = e['factura_linea_id']; fact[k] = e['fl']['f']
assert set(fl) == set(REPARTO), sorted(fl)
print('línea', l['importe'], '-> 4000;', {p: v[1] for p, v in PAGOS.items()}, REPARTO)
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

for x in hs:
    for e in x['enl']: b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (e['factura_linea_id'], x['id']))
for x in hs:
    if x['hito_padre_id']: b.borrar('hitos_cobro?id=eq.' + x['id'])
b.actualizar('lineas_facturacion?id=eq.' + l['id'], {'importe': 4000.0, 'editada_en': AHORA, 'editada_por': MONICA,
             'notas': '\n'.join(v for v in (l['notas'], NOTA) if v)})
for p, (pct, imp) in PAGOS.items():
    fs = [(fl[k], v[1], k) for k, v in REPARTO.items() if v[0] == p]
    cobrado = sum(z[1] for z in fs)
    b.actualizar('hitos_cobro?id=eq.' + top[p]['id'], {'importe': imp, 'porcentaje': pct,
                 'estado': 'completado' if abs(cobrado - imp) < 0.01 else ('parcial' if cobrado else 'pendiente')})
    if len(fs) == 1 and abs(cobrado - imp) < 0.01:
        b.insertar('factura_linea_hitos', [dict(factura_linea_id=fs[0][0], hito_cobro_id=top[p]['id'], importe=fs[0][1], como='a_mano')])
        continue
    for flid, imp_t, k in fs:
        tid = str(uuid.uuid4())
        b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=l['id'], hito=p, orden=1, importe=imp_t, estado='completado',
                   hito_padre_id=top[p]['id'], notas='Accesalia %s (Mónica, %s)' % (k.replace('/', '/1-'), HOY))])
        b.insertar('factura_linea_hitos', [dict(factura_linea_id=flid, hito_cobro_id=tid, importe=imp_t, como='a_mano')])
for f in fact.values():
    if not f['oportunidad_id']: b.actualizar('facturas?id=eq.%s&oportunidad_id=is.null' % f['id'], {'oportunidad_id': h['oportunidad_id']})
print('ESCRITO')
