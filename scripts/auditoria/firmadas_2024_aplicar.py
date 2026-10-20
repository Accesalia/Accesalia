# -*- coding: utf-8 -*-
"""Firmadas de 2024 del Drive (Mónica, 20-oct-2026: «1 sí, muy importante, y sobre todo no perder esa nota del descuento;
2 ok; 3 errata, debe ser de 2024»).
  1. Marina Lavandeira 2 (DAN-2017-050, Thyssen): la nota de responsabilidad HE-2023-0169 pasa a CONTRATO con sus papeles
     del Drive: contrato M/2859 (4-jun-2018), pedido 0280527118 (60 % proyecto 3.000, 20 % inicio de obra 1.000, 20 % CFO
     1.000), propuesta de honorarios (18-sep-2017) y ANEXO 1 (4-nov-2019): «reducción alcance contrato por daños y
     perjuicios en la obra de la C/ Zaida, 22», -3.000 €, el contrato queda en 2.000 €. El pago de 3.000 (que la nota daba
     por facturado antes de 2019) NO se cobró: se descontó -> anulado, con la nota del descuento.
  2. Nazaret 32 bis (HE-2024-0092, cambio de tramitador Next Generation): firmada el 10-jun-2024 (la app decía 2022).
  3. Doctor Fleming 32 (HE-2024-0073): firmada el 6-may-2024, la del papel (la app decía 12-may-2026: errata).
  python scripts/auditoria/firmadas_2024_aplicar.py [--escribir]
"""
import sys, os, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
DRIVE = r'G:\Mi unidad\MONICA ACCESALIA\PRESUPUESTOS\PRESUPUESTOS FIRMADOS'
b = arrancar()
DESCUENTO = ('ANEXO 1 al contrato M/2859 (Thyssenkrupp Elevadores, 4-nov-2019): «reducción alcance contrato por daños y perjuicios en la '
             'obra de la C/ Zaida, 22», -3.000 €; el contrato queda fijado en 2.000 €. Este pago de 3.000 NO se cobró: se descontó (Mónica, %s).' % HOY)
PAPELES = []
for r, _, fs in os.walk(DRIVE):
    for f in fs:
        if 'MARINA LAVANDEIRA' in f.upper() or 'MARINALAVANDEIRA' in f.upper():
            PAPELES.append(os.path.join(r, f))
PAPELES.sort(key=lambda p: ('ANEXO' in p.upper(), 'PEDIDO' in p.upper(), 'HONORARIOS' in p.upper()))
assert len(PAPELES) == 4, PAPELES

h = b.leer('hojas_encargo?select=id,tipo_documento,motivo_sin_firma,fecha_creacion,versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(id,notas),'
           'lineas_facturacion(id,descripcion,notas,hitos_cobro(id,hito,importe,estado,notas))&numero_hoja=eq.HE-2023-0169')[0]
assert h['tipo_documento'] == 'nota_responsabilidad' and len(h['lineas_facturacion']) == 1
l = h['lineas_facturacion'][0]
ent = [x for x in l['hitos_cobro'] if x['hito'] == 'entrega']
assert len(ent) == 1 and abs(float(ent[0]['importe']) - 3000) < 0.01 and not b.leer('factura_linea_hitos?select=hito_cobro_id&hito_cobro_id=eq.' + ent[0]['id'], False)
print('1. HE-2023-0169 nota -> contrato (firmado 2018-06-04) con:', ' | '.join(os.path.basename(p) for p in PAPELES))
print('   pago de entrega 3.000 -> anulado (anexo 1: -3.000 por daños en Zaida 22; contrato en 2.000)')
naz = b.leer('hojas_encargo?select=id,fecha_firma&numero_hoja=eq.HE-2024-0092')[0]
fle = b.leer('hojas_encargo?select=id,fecha_firma&numero_hoja=eq.HE-2024-0073')[0]
assert naz['fecha_firma'] == '2022-03-16' and fle['fecha_firma'] == '2026-05-12'
print('2. HE-2024-0092 firma 2022-03-16 -> 2024-06-10\n3. HE-2024-0073 firma 2026-05-12 -> 2024-05-06')
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

v = h['versiones_hoja'][0]
rutas = ['almacen:documentos-comerciales/' + b.subir('documentos-comerciales', 'hojas-encargo/%s/firmada-v1-%d-%s.pdf' % (h['id'], i, v['id'][:8]),
                                                    open(p, 'rb').read(), reemplazar=True) for i, p in enumerate(PAPELES, 1)]
nota_v = '\n'.join(x for x in (v['notas'], 'Antes nota de responsabilidad: %s' % h['motivo_sin_firma'],
                               'Papeles del Drive: contrato M/2859 (4-jun-2018), pedido 0280527118, propuesta de honorarios (18-sep-2017) y anexo 1 (4-nov-2019).',
                               DESCUENTO) if x)
b.actualizar('versiones_hoja?id=eq.' + v['id'], {'pdfs_firmados': rutas, 'notas': nota_v, 'importe_base': 2000,
                                                 'forma_pago': 'Pedido Thyssen: 60 % proyecto, 20 % inicio de obra, 20 % CFO; confirming 60 días. Anexo 1: -3.000 €'})
b.actualizar('hojas_encargo?id=eq.' + h['id'], dict(tipo_documento='contrato', responsable_id=None, motivo_sin_firma=None, fecha_firma='2018-06-04',
             fecha_estado='2018-06-04T00:00:00+00:00', descripcion='Contrato Thyssen M/2859 · Marina Lavandeira 2 (con anexo 1: -3.000 €)'))
b.actualizar('lineas_facturacion?id=eq.' + l['id'], {'origen': 'contrato', 'notas': '\n'.join(x for x in (l['notas'], DESCUENTO) if x)})
b.actualizar('hitos_cobro?id=eq.' + ent[0]['id'], {'estado': 'anulado', 'notas': DESCUENTO})
b.actualizar('hojas_encargo?id=eq.' + naz['id'], {'fecha_firma': '2024-06-10', 'fecha_estado': '2024-06-10T00:00:00+00:00'})
b.actualizar('hojas_encargo?id=eq.' + fle['id'], {'fecha_firma': '2024-05-06', 'fecha_estado': '2024-05-06T00:00:00+00:00'})
print('ESCRITO')
