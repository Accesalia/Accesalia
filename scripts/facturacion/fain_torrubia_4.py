# -*- coding: utf-8 -*-
"""Torrubia 4 Leganés (HE-2022-0142), proyecto 3.500 € de FAIN (Mónica, 19-oct-2026: «no vamos a volvernos locos»).
  - Accesalia 2022/1-36 (anteproyecto 30 %, 1.050) se ANULA: la 2022/1-62 (50 %, 1.750) cubre la entrega entera;
  - Accesalia 2022/1-42 (30 % anteproyecto, 1.050) fue DEVUELTA (otro código de pedido): fuera de los pagos;
  - entrega 1.750 = 2022/1-62; licencia 1.050 = 2023/1-9; fin de obra 700 = 2025/1-355 (250) + 450 pendiente.

  python scripts/facturacion/fain_torrubia_4.py [--escribir]
"""
import sys, os, re, uuid, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
b = arrancar()
h = b.leer('hojas_encargo?select=id,oportunidad_id&numero_hoja=eq.HE-2022-0142')[0]
l = [l for l in b.leer('lineas_facturacion?select=id,descripcion,importe&quitada_en=is.null&hoja_encargo_id=eq.' + h['id'])
     if not re.search(r'seguridad|csys|css', l['descripcion'].lower())]
assert len(l) == 1 and float(l[0]['importe']) == 3500
l = l[0]
hs = b.leer('hitos_cobro?select=id,hito,importe,estado,hito_padre_id,enl:factura_linea_hitos(factura_linea_id)&linea_facturacion_id=eq.' + l['id'])
top = {x['hito']: x for x in hs if not x['hito_padre_id'] and x['estado'] != 'anulado'}
assert {p: float(x['importe']) for p, x in top.items()} == {'entrega': 1750, 'licencia': 1050, 'cfo': 700}


def fac(a, n):
    f = b.leer('facturas?select=id,estado,notas,oportunidad_id,lineas:factura_lineas(id,base)&origen=eq.factusol&empresa_emisora=eq.accesalia'
               '&anio=eq.%d&serie=eq.1&numero=eq.%d' % (a, n))[0]
    ls = [x for x in f['lineas'] if float(x['base'] or 0)]
    assert len(ls) == 1
    return f, ls[0]['id']


f36, l36 = fac(2022, 36); f42, l42 = fac(2022, 42); f62, l62 = fac(2022, 62); f9, l9 = fac(2023, 9); f355, l355 = fac(2025, 355)
print('36', f36['estado'], '| 42', f42['estado'], '| 62', f62['estado'], '| 2023/9', f9['estado'], '| 2025/355', f355['estado'])
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

for x in hs:
    for e in x['enl']: b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (e['factura_linea_id'], x['id']))
for x in hs:
    if x['hito_padre_id']: b.borrar('hitos_cobro?id=eq.' + x['id'])
b.actualizar('hitos_cobro?id=eq.' + top['entrega']['id'], {'estado': 'completado'})
b.insertar('factura_linea_hitos', [dict(factura_linea_id=l62, hito_cobro_id=top['entrega']['id'], importe=1750.0, como='a_mano')])
b.actualizar('hitos_cobro?id=eq.' + top['licencia']['id'], {'estado': 'completado'})
b.insertar('factura_linea_hitos', [dict(factura_linea_id=l9, hito_cobro_id=top['licencia']['id'], importe=1050.0, como='a_mano')])
b.actualizar('hitos_cobro?id=eq.' + top['cfo']['id'], {'estado': 'parcial'})
tid = str(uuid.uuid4())
b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=l['id'], hito='cfo', orden=1, importe=250.0, estado='completado',
           hito_padre_id=top['cfo']['id'], notas='Accesalia 2025/1-355 (CFO).')])
b.insertar('factura_linea_hitos', [dict(factura_linea_id=l355, hito_cobro_id=tid, importe=250.0, como='a_mano')])
b.insertar('hitos_cobro', [dict(id=str(uuid.uuid4()), linea_facturacion_id=l['id'], hito='cfo', orden=1, importe=450.0, estado='pendiente',
           hito_padre_id=top['cfo']['id'], notas='Resto del fin de obra, sin facturar.')])
b.actualizar('facturas?id=eq.' + f36['id'], {'estado': 'anulada', 'notas': '\n'.join(v for v in (f36['notas'],
             'Anulada (Mónica, %s): la 2022/1-62 (50 %%, 1.750) cubre la entrega entera; casi seguro fue así y no se indaga más.' % HOY) if v)})
b.actualizar('facturas?id=eq.' + f42['id'], {'notas': '\n'.join(v for v in (f42['notas'],
             'Devuelta (otro código de pedido de compra: 240919 en vez de 244575); fuera de los pagos de Torrubia 4 (Mónica, %s).' % HOY) if v)})
for f in (f36, f42, f62, f9, f355):
    if not f['oportunidad_id']: b.actualizar('facturas?id=eq.%s&oportunidad_id=is.null' % f['id'], {'oportunidad_id': h['oportunidad_id']})
print('ESCRITO')
