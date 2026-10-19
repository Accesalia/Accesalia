# -*- coding: utf-8 -*-
"""FAIN: tres pedidos donde la factura dice a qué pagos va y el cruce la puso en otro (Mónica, 19-oct-2026).

  Av. Provincias 10 Fuenlabrada (HE-2022-0136): Accesalia 2023/1-161 «50 % restante del proyecto (hitos de obtención de
      licencia y CFO)» -> licencia 960 + fin de obra 640 (estaba en la entrega, que ya cobra la 2022/1-16).
  Muelle 6 Alcalá (HE-2022-0145): Accesalia 2024/1-65 «inicio de obra y entrega de fin de obra (50 %)», 1.250 ->
      licencia 750 + fin de obra 500 (estaba en la entrega, que ya cobra la 2022/1-31).
  Plaza París 5 Fuenlabrada (HE-2022-0151): Accesalia 2022/1-61 «30 % anteproyecto» + 2022/1-81 «20 % proyecto» ->
      entrega (estaban en licencia y fin de obra, que cobran la 2023/1-55 y la 2024/1-202).
Solo la línea del proyecto; la CSS no se toca.

  python scripts/facturacion/fain_tres_a_mano.py [--escribir]
"""
import sys, os, re, uuid
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
NOTA = '(a su pago por lo que dice la factura, Mónica 19-oct-2026)'
# hoja -> {factura: [(pago, importe)]}  (factura = 'año/número' de Accesalia)
PLAN = {
    'HE-2022-0136': {'2022/16': [('entrega', 1600)], '2023/161': [('licencia', 960), ('cfo', 640)]},
    'HE-2022-0145': {'2022/31': [('entrega', 1250)], '2024/65': [('licencia', 750), ('cfo', 500)]},
    'HE-2022-0151': {'2022/61': [('entrega', 1350)], '2022/81': [('entrega', 900)], '2023/55': [('licencia', 1350)], '2024/202': [('cfo', 900)]},
}
trabajo = []
for num, reparto in PLAN.items():
    h = b.leer('hojas_encargo?select=id&numero_hoja=eq.' + num)[0]
    l = [l for l in b.leer('lineas_facturacion?select=id,descripcion&quitada_en=is.null&hoja_encargo_id=eq.' + h['id'])
         if not re.search(r'seguridad|csys|css', l['descripcion'].lower())]
    assert len(l) == 1, num
    l = l[0]
    hs = b.leer('hitos_cobro?select=id,hito,importe,estado,hito_padre_id,enl:factura_linea_hitos(factura_linea_id,importe,'
                'fl:factura_linea_id(base,f:factura_id(empresa_emisora,anio,numero)))&linea_facturacion_id=eq.' + l['id'])
    top = {x['hito']: x for x in hs if not x['hito_padre_id'] and x['estado'] != 'anulado'}
    flid = {}
    for x in hs:
        for e in x['enl']:
            f = e['fl']['f']
            assert f['empresa_emisora'] == 'accesalia', (num, f)
            flid['%s/%s' % (f['anio'], f['numero'])] = e['factura_linea_id']
    assert set(flid) == set(reparto), (num, sorted(flid), sorted(reparto))
    por_pago = {p: [] for p in top}
    for fac, trozos in reparto.items():
        for p, imp in trozos: por_pago[p].append((flid[fac], float(imp), 'Accesalia ' + fac.replace('/', '/1-')))
    for p, fs in por_pago.items():
        assert sum(z[1] for z in fs) <= float(top[p]['importe']) + 0.01, (num, p)
        print(num, p, top[p]['importe'], '<-', ' + '.join('%s %.0f' % (z[2], z[1]) for z in fs) or '-')
    trabajo.append((l, hs, top, por_pago))
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

for l, hs, top, por_pago in trabajo:
    for x in hs:
        for e in x['enl']: b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (e['factura_linea_id'], x['id']))
    for x in hs:
        if x['hito_padre_id']: b.borrar('hitos_cobro?id=eq.' + x['id'])
    for p, x in top.items():
        imp = float(x['importe']); fs = por_pago[p]; cobrado = sum(z[1] for z in fs)
        b.actualizar('hitos_cobro?id=eq.' + x['id'], {'estado': 'completado' if abs(cobrado - imp) < 0.01 else ('parcial' if cobrado else 'pendiente')})
        if len(fs) == 1 and abs(cobrado - imp) < 0.01:
            b.insertar('factura_linea_hitos', [dict(factura_linea_id=fs[0][0], hito_cobro_id=x['id'], importe=fs[0][1], como='a_mano')])
            continue
        for fl, imp_t, et in fs:
            tid = str(uuid.uuid4())
            b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=l['id'], hito=p, orden=1, importe=imp_t, estado='completado',
                       hito_padre_id=x['id'], notas='%s %s' % (et, NOTA))])
            b.insertar('factura_linea_hitos', [dict(factura_linea_id=fl, hito_cobro_id=tid, importe=imp_t, como='a_mano')])
        if fs and cobrado < imp - 0.01:
            b.insertar('hitos_cobro', [dict(id=str(uuid.uuid4()), linea_facturacion_id=l['id'], hito=p, orden=1, importe=round(imp - cobrado, 2),
                       estado='pendiente', hito_padre_id=x['id'], notas='Resto, sin facturar todavía.')])
print('ESCRITO')
