# -*- coding: utf-8 -*-
"""MONTEJURRA 25 y NAZARET 32 BIS (Monica, 18-oct-2026), tras la revision a mano de las 168.

MONTEJURRA 25 (HE-2022-0010): la hoja firmada tiene los 8 conceptos de la app (suman 7.440), pero dice total 8.090 y
forma de pago 4.095 + 4.095. Se cobraron 2.000 (2022/1-37) + 2.095 (2022/1-43) = 4.095, la primera mitad. Manda la
factura: los 8 pagos de la entrega, y los 375 que la hoja no reparte van al pago del proyecto (1.550 -> 1.925), con nota.

NAZARET 32 BIS: la hoja firmada de febrero de 2022 (Drive: PRESUPUESTOS FIRMADOS/nazaret 32bis fuenlabrada firmado.pdf,
firma digital de Daniel 23-02-2022) no estaba en la app: proyecto de envolvente 5.500, 70% a la entrega (3.850) y 30% a
la concesion (1.650). Son las facturas 2022/1-23 y 2024/1-138. Se da de alta con su PDF y se casan.

  python scripts/facturacion/montejurra_y_nazaret.py <pdf_nazaret_firmado> [--escribir]
"""
import sys, os, uuid, json, urllib.request, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
PDF = sys.argv[1]
HOY = datetime.date.today().isoformat()
b = arrancar()


def fl(emp, anio, n):
    f = b.leer('facturas?select=id,lineas:factura_lineas(id,base)&origen=eq.factusol&empresa_emisora=eq.%s&anio=eq.%d&serie=eq.1&numero=eq.%d' % (emp, anio, n))
    assert len(f) == 1 and len(f[0]['lineas']) == 1, (emp, anio, n)
    return f[0]['lineas'][0]['id']


# ---------------- Montejurra
M = {'proyecto': '5b0c7ac4-21ad-4ed4-8c58-7e3764e7c7d3', 'cee_ini': '3dea576f-7021-4b4d-8bb0-b7c77334ba7f',
     'iee': '21d991f7-9736-433d-8c26-3a6e1f58ea33', 'df': '910cb2b4-7a38-46d6-95a5-a0dd6fc37f56',
     'lic': 'f0324063-7ea7-49ee-8c14-762936654818', 'css': '2a2e51c4-ad2a-4964-9247-6d5b9608b3d3',
     'cee_fin': '840194dd-e84f-4a86-a6fa-2743e0231731', 'demol': '026d3e8a-c953-4a2d-9853-230552c057be'}
f37, f43 = fl('accesalia', 2022, 37), fl('accesalia', 2022, 43)
enlaces = [(f37, M['proyecto'], 1925), (f37, M['cee_ini'], 75),
           (f43, M['cee_ini'], 125), (f43, M['iee'], 300), (f43, M['df'], 600), (f43, M['lic'], 750),
           (f43, M['css'], 100), (f43, M['cee_fin'], 100), (f43, M['demol'], 120)]
assert sum(i for f, h, i in enlaces if f == f37) == 2000 and sum(i for f, h, i in enlaces if f == f43) == 2095
print('Montejurra: proyecto 1.550 -> 1.925; enlaces', len(enlaces))

# ---------------- Nazaret
h92 = b.leer('hojas_encargo?numero_hoja=eq.HE-2024-0092&select=oportunidad_id,comunidad_id')[0]
f23, f138 = fl('accesalia', 2022, 23), fl('accesalia', 2024, 138)
print('Nazaret: hoja nueva 2022 con 5.500 (3.850 + 1.650), PDF', os.path.getsize(PDF), 'bytes')
if not ESCRIBIR:
    print('PRUEBA: no se ha escrito nada'); sys.exit()

nota_m = ('Manda la factura (Monica, %s): la hoja firmada suma 7.440 en sus conceptos pero dice total 8.090 y pagos de '
          '4.095 + 4.095; se cobraron 2.000 + 2.095 = 4.095. Los 375 que la hoja no reparte van a este pago (1.550 -> 1.925).' % HOY)
b.actualizar('hitos_cobro?id=eq.' + M['proyecto'], {'importe': 1925, 'notas': nota_m})
b.insertar('factura_linea_hitos', [dict(factura_linea_id=f, hito_cobro_id=h, importe=i, como='a_mano') for f, h, i in enlaces])
for h in M.values():
    b.actualizar('hitos_cobro?id=eq.%s&estado=eq.pendiente' % h, {'estado': 'completado'})
hm = b.leer('hojas_encargo?numero_hoja=eq.HE-2022-0010&select=id')[0]['id']
b.insertar('notas_facturacion', [dict(hoja_encargo_id=hm, hito_cobro_id=None, fecha=HOY, origen='factusol', autor='Revision a mano 168 (%s)' % HOY,
           texto='La hoja firmada (8-feb-2022) no cuadra consigo misma: conceptos 7.440, total 8.090, pagos 4.095 + 4.095 = 8.190. '
                 'Se cobraron 2.000 (2022/1-37) + 2.095 (2022/1-43) = 4.095 (la 1.a mitad). Casadas con los 8 pagos de la entrega; '
                 'los 375 de mas, al pago del proyecto (Monica, %s).' % HOY)])

req = urllib.request.Request(b.url + '/rest/v1/rpc/siguiente_codigo', data=json.dumps({'p_tipo': 'HE', 'p_anio': 2022}).encode(),
                             headers=dict(b.cab, **{'Content-Type': 'application/json'}), method='POST')
cod = json.loads(urllib.request.urlopen(req).read())
hid, vid, cid, lid, t1, t2, aid = (str(uuid.uuid4()) for _ in range(7))
pdf = 'almacen:documentos-comerciales/' + b.subir('documentos-comerciales', 'hojas-encargo/%s/firmada-v1-1-%s.pdf' % (hid, vid[:8]),
                                                  open(PDF, 'rb').read(), reemplazar=True)
texto = ('Proyecto para la mejora de envolvente térmica en edificio residencial existente en Calle Nazareth 32 Bis de Fuenlabrada '
         '(Proyecto Básico y de Ejecución; visado y tramitación de la solicitud de Licencia; Certificación Fin de Obra)')
fp = '70% a la entrega de Proyecto visado mediante cargo en cuenta: 3.850 + iva. 30% a la concesión de la Subvención, mediante cargo en cuenta: 1.650 + iva'
BLOQUE = '8b6d9e03-7d62-4ad7-9680-b94fd87a0ace'
b.insertar('hojas_encargo', [dict(id=hid, numero_hoja=cod, oportunidad_id=h92['oportunidad_id'], comunidad_id=h92['comunidad_id'],
           pagador_tipo='comunidad', emisor='accesalia', fecha_creacion='2022-02-02', fecha_firma='2022-02-23', estado='devuelta_firmada',
           fecha_estado='2022-02-23T00:00:00+00:00', descripcion='Eficiencia energética', tipo_documento='hoja_encargo')])
b.insertar('versiones_hoja', [dict(id=vid, hoja_encargo_id=hid, numero_version=1, fecha_generada='2022-02-02', fecha_enviada='2022-02-02',
           importe_base=5500, iva_porcentaje=21, forma_pago=fp, pdfs_firmados=[pdf],
           notas='Hoja firmada de feb-2022 que faltaba en la app (Monica, %s). Fichero: PRESUPUESTOS FIRMADOS/nazaret 32bis fuenlabrada '
                 'firmado.pdf (firma digital de Daniel 23-02-2022; la facturas citan «hoja de 2 de febrero de 2022»). La cobran la 2022/1-23 '
                 '(3.850) y la 2024/1-138 (1.650). La HE-2024-0092 es el cambio de tramitador de 2024, sin importes.' % HOY)])
b.insertar('conceptos_hoja', [dict(id=cid, hoja_encargo_id=hid, version_hoja_id=vid, bloque_id=BLOQUE, descripcion=texto, importe=5500,
           incluido=True, desglose='se_cobra', forma_pago=fp)])
b.insertar('actuaciones_hoja', [dict(id=aid, hoja_encargo_id=hid, tipo_proyecto_id='0e0dca2f-a220-4cdb-8f6b-cae728c5cfc9', orden=1)])
b.insertar('lineas_facturacion', [dict(id=lid, hoja_encargo_id=hid, concepto_hoja_id=cid, bloque_id=BLOQUE, descripcion=texto, importe=5500,
           es_porcentaje=False, notas='Desde la hoja firmada %s (revision 168, %s).' % (cod, HOY), origen='pdf', verificado=True,
           emisor='accesalia', pagador_tipo='comunidad', pagador_id=h92['comunidad_id'], forma_cobro='cargo_cuenta')])
b.insertar('hitos_cobro', [dict(id=t1, linea_facturacion_id=lid, hito='entrega', orden=1, porcentaje=70, importe=3850, estado='completado'),
                           dict(id=t2, linea_facturacion_id=lid, hito='concesion', orden=2, porcentaje=30, importe=1650, estado='completado')])
b.insertar('factura_linea_hitos', [dict(factura_linea_id=f23, hito_cobro_id=t1, importe=3850, como='a_mano'),
                                   dict(factura_linea_id=f138, hito_cobro_id=t2, importe=1650, como='a_mano')])
b.actualizar('hojas_encargo?id=eq.' + hid, {'version_firmada_id': vid})
print('ESCRITO. Nazaret:', cod)
