# -*- coding: utf-8 -*-
"""FAIN: dos pedidos con una factura suelta que dice claro a qué va (Mónica, 19-oct-2026, «de acuerdo, sí»).
  - Santo Domingo de Guzmán 5 Colmenar Viejo (HE-2024-0043): la Accesalia 2024/1-196 dice «honorarios del proyecto
    incluyendo DF: 3.500 €; deducción por liquidación final del proyecto Berardo Martín 12 Móstoles: 3.084,10 €». FAIN
    pagó el proyecto entero: 415,90 en dinero + 3.084,10 compensados. El pago colgaba de la 2024/1-148, ANULADA.
  - Pablo Casals 26 Parla (HE-2023-0161): sus facturas son «30 % / 20 % / 30 % de 4.000» -> proyecto 4.000 en 50/30/20
    (manda la factura, como San Valeriano 1): entrega = 2023/1-4 + 2023/1-27 (estaba suelta); licencia = 2023/1-123.

  python scripts/facturacion/fain_santo_domingo_pablo_casals.py [--escribir]
"""
import sys, os, re, uuid, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
AHORA = datetime.datetime.now(datetime.timezone.utc).isoformat()
MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
b = arrancar()


def proyecto(n):
    h = b.leer('hojas_encargo?select=id,oportunidad_id&numero_hoja=eq.' + n)[0]
    l = [l for l in b.leer('lineas_facturacion?select=id,importe,notas,descripcion&quitada_en=is.null&hoja_encargo_id=eq.' + h['id'])
         if not re.search(r'seguridad|csys', l['descripcion'], re.I)]
    assert len(l) == 1, n
    hs = b.leer('hitos_cobro?select=id,hito,importe,estado,hito_padre_id,notas,enl:factura_linea_hitos(factura_linea_id)&linea_facturacion_id=eq.' + l[0]['id'])
    return h, l[0], hs


def fl(a, n):
    f = b.leer('facturas?select=id,oportunidad_id,lineas:factura_lineas(id,base)&origen=eq.factusol&empresa_emisora=eq.accesalia&anio=eq.%d&serie=eq.1&numero=eq.%d' % (a, n))[0]
    ls = [x for x in f['lineas'] if float(x['base'] or 0)]
    assert len(ls) == 1
    return f, ls[0]['id'], float(ls[0]['base'])


def limpiar(hs):
    for x in hs:
        for e in x['enl']: b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (e['factura_linea_id'], x['id']))
    for x in hs:
        if x['hito_padre_id']: b.borrar('hitos_cobro?id=eq.' + x['id'])


def junta(*v): return '\n'.join(x for x in v if x)


sd_h, sd_l, sd_hs = proyecto('HE-2024-0043')
sd_top = {x['hito']: x for x in sd_hs if not x['hito_padre_id']}
f196 = fl(2024, 196)
assert float(sd_l['importe']) == 3500 and set(sd_top) == {'entrega', 'licencia', 'cfo'} and abs(f196[2] - 415.9) < .01
pc_h, pc_l, pc_hs = proyecto('HE-2023-0161')
pc_top = {x['hito']: x for x in pc_hs if not x['hito_padre_id'] and x['estado'] != 'anulado'}
f4, f27, f123 = fl(2023, 4), fl(2023, 27), fl(2023, 123)
assert float(pc_l['importe']) == 3300 and set(pc_top) == {'entrega', 'licencia', 'cfo'} and (f4[2], f27[2], f123[2]) == (1200, 800, 1200)
print('Santo Domingo de Guzmán 5: proyecto 3.500 pagado con la 2024/1-196 (415,90 + 3.084,10 compensados); fuera la 2024/1-148 anulada')
print('Pablo Casals 26: 3.300 -> 4.000; entrega 2.000 (2023/1-4 + 2023/1-27), licencia 1.200 (2023/1-123), fin de obra 800 pendiente')
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

# Santo Domingo de Guzmán 5
limpiar(sd_hs)
NOTA = ('Pagado con la Accesalia 2024/1-196: proyecto con DF 3.500 € = 415,90 en dinero + 3.084,10 compensados por la liquidación final '
        'del proyecto Berardo Martín 12 Móstoles (Mónica, %s).' % HOY)
for i, h in enumerate(('entrega', 'licencia', 'cfo')):
    b.actualizar('hitos_cobro?id=eq.' + sd_top[h]['id'], {'estado': 'completado', 'notas': junta(sd_top[h]['notas'], NOTA)})
b.insertar('factura_linea_hitos', [dict(factura_linea_id=f196[1], hito_cobro_id=sd_top['entrega']['id'], importe=415.9, como='a_mano')])
if not f196[0]['oportunidad_id']: b.actualizar('facturas?id=eq.%s&oportunidad_id=is.null' % f196[0]['id'], {'oportunidad_id': sd_h['oportunidad_id']})
b.actualizar('lineas_facturacion?id=eq.' + sd_l['id'], {'notas': junta(sd_l['notas'], NOTA)})
# Pablo Casals 26
limpiar(pc_hs)
b.actualizar('lineas_facturacion?id=eq.' + pc_l['id'], {'importe': 4000.0, 'editada_en': AHORA, 'editada_por': MONICA, 'notas': junta(pc_l['notas'],
             'Manda la factura (Mónica, %s): el pedido decía 3.300, las facturas de FAIN son «30 %% / 20 %% / 30 %% de 4.000».' % HOY)})
for h, pct, imp, est in (('entrega', 50, 2000.0, 'completado'), ('licencia', 30, 1200.0, 'completado'), ('cfo', 20, 800.0, 'pendiente')):
    b.actualizar('hitos_cobro?id=eq.' + pc_top[h]['id'], {'importe': imp, 'porcentaje': pct, 'estado': est})
for f, ref in ((f4, 'Accesalia 2023/1-4 (anteproyecto 30 %)'), (f27, 'Accesalia 2023/1-27 (proyecto 20 %)')):
    tid = str(uuid.uuid4())
    b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=pc_l['id'], hito='entrega', orden=1, importe=f[2], estado='completado', hito_padre_id=pc_top['entrega']['id'], notas=ref)])
    b.insertar('factura_linea_hitos', [dict(factura_linea_id=f[1], hito_cobro_id=tid, importe=f[2], como='a_mano')])
b.insertar('factura_linea_hitos', [dict(factura_linea_id=f123[1], hito_cobro_id=pc_top['licencia']['id'], importe=1200.0, como='a_mano')])
for f in (f4, f27, f123):
    if not f[0]['oportunidad_id']: b.actualizar('facturas?id=eq.%s&oportunidad_id=is.null' % f[0]['id'], {'oportunidad_id': pc_h['oportunidad_id']})
print('ESCRITO')
