# -*- coding: utf-8 -*-
"""Firmadas de 2025 del Drive que no estaban bien en la app (Mónica, 20-oct-2026: «vamos así, ok»).
Sale de scripts/auditoria/firmadas_drive_contra_app.py 2025 (docs/auditoria/firmadas_2025_contra_app.xlsx).
  1. Ángeles 6 Getafe (DAN-2023-238): contrato de subcontratación del proyecto de ascensor, 21-nov-2025, 4.000 € (50 % al
     inicio, 50 % a la finalización). El fichero dice OTIS, pero el contrato es con INTEGRA ASCENSORES (B83336891), que no
     estaba en contratas: se da de alta con lo que dice el contrato.
  2. Torrecilla del Leal 21: la CSS de FAIN tenía nota de responsabilidad (HE-2025-0784); el papel es el correo de FAIN
     del 14-jul-2025 con los códigos (pedido 95003572, grafo 4010746, compra 380625; 600 €, 80 % acta PSS / 20 % fin de
     obra) -> la nota pasa a PEDIDO con ese correo («¡reemplazamos nota por correo!»).
  3. Armenteros 21: hoja de junio de 2025, firmada el 11-nov-2025 -> esa fecha de firma (HE-2025-0355 y 0356).
  4. Versiones enviadas y vacías que sustituyó la firmada: archivadas (Santa Eduvigis 5, Santa Cruz de Marcenado 1 x2,
     San Basilio 9, Bruno Ayllón 3 x2, Castillo de Simancas 7). Las subvenciones de 2025 de Huerta de Villaverde 9 y
     Gomeznarro 233 siguen vivas: no se tocan.
  python scripts/auditoria/firmadas_2025_aplicar.py [--escribir]
"""
import sys, os, uuid, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
DRIVE = r'G:\Mi unidad\MONICA ACCESALIA\PRESUPUESTOS\PRESUPUESTOS FIRMADOS'
b = arrancar()
BLOQUE = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo')}
F_INTEGRA = os.path.join(DRIVE, 'OTIS ANGELES 6 GETAFE PRY ASC.pdf')
F_TORRE = os.path.join(DRIVE, 'TORRECILLA DEL LEAL 21 MADRID CSS 14-07-2025.pdf')
assert os.path.exists(F_INTEGRA) and os.path.exists(F_TORRE)
hoja = lambda n: b.leer('hojas_encargo?select=id,numero_hoja,tipo_documento,estado,fecha_creacion,fecha_firma,oportunidad_id,'
                        'versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(id,notas,pdfs_firmados)&numero_hoja=eq.' + n)[0]

opp = b.leer('oportunidades?select=id,codigo,nombre,comunidad_id&codigo=eq.DAN-2023-238')[0]
YA = b.leer('contratas?select=id&cif=eq.B83336891', False)  # 1er intento (20-oct): la contrata entró y el resto no (un «%» en el texto)
print('1. contrata nueva INTEGRA ASCENSORES (B83336891) y contrato %s %s: proyecto de ascensor 4.000 (encargo 2.000 + entrega 2.000), firmado 2025-11-21'
      % (opp['codigo'], opp['nombre']))
t = hoja('HE-2025-0784')
assert t['tipo_documento'] == 'nota_responsabilidad'
print('2. HE-2025-0784 nota -> pedido FAIN 95003572, firmado 2025-07-14, con el correo')
arm = [hoja('HE-2025-0355'), hoja('HE-2025-0356')]
for h in arm: assert h['fecha_firma'] == h['fecha_creacion'] == '2025-06-23'
print('3. HE-2025-0355 y 0356: firma 2025-06-23 -> 2025-11-11')
ARCHIVAR = {'HE-2025-0056': 'HE-2025-0751', 'HE-2025-0113': 'HE-2025-0098 y HE-2025-0152', 'HE-2025-0099': 'HE-2025-0119',
            'HE-2025-0065': 'HE-2025-0064 y HE-2025-0067', 'HE-2025-0499': 'HE-2025-0501 (REV2)', 'HE-2025-0500': 'HE-2025-0501 (REV2)',
            'HE-2025-0545': 'HE-2025-0546 y HE-2025-0547'}
arch = []
for n, por in ARCHIVAR.items():
    h = hoja(n)
    assert h['estado'] == 'enviada_comunidad' and not b.leer('lineas_facturacion?select=id&hoja_encargo_id=eq.' + h['id'], False), n
    arch.append((h, por)); print('4. archivar %s (sustituida por %s)' % (n, por))
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

# 1
cid, hid, vid, lid = (str(uuid.uuid4()) for _ in range(4))
if YA: cid = YA[0]['id']
else: b.insertar('contratas', [dict(id=cid, nombre='INTEGRA ASCENSORES', razon_social='INTEGRA ASCENSORES', cif='B83336891', tipo='ascensorista', activa=True,
           direccion='Av. Real de Pinto 91B15, Madrid', notas_comercial='Alta desde su contrato de subcontratación del proyecto de ascensor de Ángeles 6 Getafe '
           '(21-nov-2025; el fichero del Drive dice OTIS) (Mónica, %s).' % HOY)])
import json, urllib.request
req = urllib.request.Request(b.url + '/rest/v1/rpc/siguiente_codigo', data=json.dumps({'p_tipo': 'HE', 'p_anio': 2025}).encode(),
                             headers=dict(b.cab, **{'Content-Type': 'application/json'}), method='POST')
num = json.loads(urllib.request.urlopen(req).read())
nota = 'Contrato de subcontratación de INTEGRA ASCENSORES (21-nov-2025, Drive: «OTIS ANGELES 6 GETAFE PRY ASC.pdf»): 4.000 €, 50 %% inicio y 50 %% finalización (Mónica, %s).' % HOY
b.insertar('hojas_encargo', [dict(id=hid, numero_hoja=num, oportunidad_id=opp['id'], comunidad_id=opp['comunidad_id'], pagador_tipo='contrata', pagador_contrata_id=cid,
           emisor='accesalia', fecha_creacion='2025-11-21', fecha_firma='2025-11-21', estado='devuelta_firmada', fecha_estado='2025-11-21T00:00:00+00:00',
           tipo_documento='contrato', descripcion='Contrato INTEGRA ASCENSORES · proyecto de ascensor · ' + opp['nombre'])])
ruta = 'almacen:documentos-comerciales/' + b.subir('documentos-comerciales', 'hojas-encargo/%s/firmada-v1-1-%s.pdf' % (hid, vid[:8]), open(F_INTEGRA, 'rb').read(), reemplazar=True)
b.insertar('versiones_hoja', [dict(id=vid, hoja_encargo_id=hid, numero_version=1, fecha_generada='2025-11-21', fecha_enviada='2025-11-21', importe_base=4000, iva_porcentaje=21,
           notas=nota, pdfs_firmados=[ruta], forma_pago='50 % al inicio, 50 % a la finalización')])
b.actualizar('hojas_encargo?id=eq.' + hid, {'version_firmada_id': vid})
b.insertar('lineas_facturacion', [dict(id=lid, hoja_encargo_id=hid, bloque_id=BLOQUE['REDACCION PROYECTO'], descripcion='Proyecto de instalación de ascensor (subcontrato de INTEGRA ASCENSORES)',
           importe=4000, es_porcentaje=False, notas=nota, origen='contrato', verificado=True, emisor='accesalia', pagador_tipo='contrata', pagador_id=cid,
           forma_cobro='transferencia', creada_por=MONICA)])
for orden, h in enumerate(('encargo', 'entrega'), 1):
    b.insertar('hitos_cobro', [dict(id=str(uuid.uuid4()), linea_facturacion_id=lid, hito=h, orden=orden, porcentaje=50, importe=2000, estado='pendiente')])
print('1.', num)
# 2
v = t['versiones_hoja'][0]
ruta = 'almacen:documentos-comerciales/' + b.subir('documentos-comerciales', 'hojas-encargo/%s/firmada-v1-1-%s.pdf' % (t['id'], v['id'][:8]), open(F_TORRE, 'rb').read(), reemplazar=True)
nota2 = 'Pedido de FAIN por correo (14-jul-2025): pedido 95003572, grafo/orden 4010746, pedido de compra 380625; CSS 600 €, 80 %% acta del PSS y 20 %% fin de obra. Sustituye a la nota de responsabilidad (Mónica, %s).' % HOY
b.actualizar('hojas_encargo?id=eq.' + t['id'], dict(tipo_documento='pedido', responsable_id=None, motivo_sin_firma=None, fecha_firma='2025-07-14',
             fecha_estado='2025-07-14T00:00:00+00:00', descripcion='Pedido FAIN 95003572 · CSS · Torrecilla del Leal 21'))
b.actualizar('versiones_hoja?id=eq.' + v['id'], {'pdfs_firmados': [ruta], 'notas': '\n'.join(x for x in (v['notas'], nota2) if x)})
b.actualizar('lineas_facturacion?hoja_encargo_id=eq.' + t['id'], {'origen': 'pedido'})
print('2. HE-2025-0784 -> pedido')
# 3
for h in arm: b.actualizar('hojas_encargo?id=eq.' + h['id'], {'fecha_firma': '2025-11-11', 'fecha_estado': '2025-11-11T00:00:00+00:00'})
# 4
for h, por in arch:
    b.actualizar('hojas_encargo?id=eq.' + h['id'], {'estado': 'archivada', 'fecha_estado': HOY + 'T00:00:00+00:00'})
    for v in h['versiones_hoja']:
        b.actualizar('versiones_hoja?id=eq.' + v['id'], {'notas': '\n'.join(x for x in (v['notas'], 'Archivada: versión enviada sustituida por la firmada %s (Mónica, %s).' % (por, HOY)) if x)})
print('ESCRITO')
