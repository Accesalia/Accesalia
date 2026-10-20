# -*- coding: utf-8 -*-
"""Firmadas de 2021 y antes del Drive (Mónica, 20-oct-2026: «vamos a hacer el resto y lo dejamos liquidado»).
Hojas del Drive que no estaban en la app, con su PDF y su factura colgada (manda la factura en el reparto):
  - Nuestra Señora del Villar 7 (DAN-2021-030): hoja firmada 27-oct-2021, adaptación de proyecto y DO 4.700 + subvenciones
    3.000 (Accesalia 2021/1-94, sus dos líneas).
  - Constitución 65 Alcobendas (DAN-2021-107): hoja de Schindler, 14-dic-2021, 4.500, «no firmado pero válido» (Word del
    Drive pasado a PDF) (Daniel 2022/1-38, a Schindler).
  - Miguel de la Roca 18 (DAN-2020-060): presupuesto Daniel 2021/1-39 de FactuSOL (4-jun-2021), subvenciones 1.250, «no
    firmado pero válido» (Accesalia 2021/1-42).
  - Móstoles 3 portal 2 Fuenlabrada (DAN-2022-053): hoja firmada 17-dic-2021, proyecto 5.000 (Accesalia 2022/1-5).
  - San Andrés 1 Fuenlabrada (DAN-2021-132): hoja 10-dic-2021, proyecto 5.000 (Accesalia 2022/1-4).
  - Galicia 2 Leganés (DAN-2020-005): correo de Oswaldo García (FAIN, 27-jul-2020): IEE 700 € «se lo facturas
    directamente» -> pedido (Accesalia 2020/1-37).
  - Cañada 8 Alcorcón (DAN-2017-002): la nota HE-2021-0033 pasa a CONTRATO con su PDF (propuesta TKE 25-abr-2018, contrato
    4-jun-2018 y pedido, 5.000 €).
  python scripts/auditoria/firmadas_2021_y_antes_aplicar.py [--escribir]
"""
import sys, os, uuid, json, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
SCHINDLER = '2ca18bd8-5fe2-4e4e-9093-6601c99bbc05'
D = r'G:\Mi unidad\MONICA ACCESALIA\PRESUPUESTOS\PRESUPUESTOS FIRMADOS'
CONV = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'docs', 'facturacion', 'papeles_comunidades')
b = arrancar()
BLOQUE = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo')}
PRY = 'Proyecto de instalación de ascensor'


def buscar(nombre):
    for r, _, fs in os.walk(D):
        for f in fs:
            if f.lower() == nombre.lower(): return os.path.join(r, f)
    p = os.path.join(CONV, nombre)
    if os.path.exists(p): return p
    raise FileNotFoundError(nombre)


def linea(emisor, a, n, base):
    f = b.leer('facturas?select=id,oportunidad_id,lineas:factura_lineas(id,base,enl:factura_linea_hitos(hito_cobro_id))&tipo=eq.factura&empresa_emisora=eq.%s&anio=eq.%d&numero=eq.%d' % (emisor, a, n))[0]
    ls = [l for l in f['lineas'] if abs(float(l['base']) - base) < 0.01 and not l['enl']]
    assert len(ls) == 1, (emisor, a, n, base)
    return f, ls[0]


# opp, tipo, estado, fecha, fichero, nota, pagador contrata o None, [(texto, bloque, total, [(hito, importe, (emisor, año, nº, base de la línea))])]
NUEVAS = [
    ('DAN-2021-030', 'hoja_encargo', 'firmada', '2021-10-27', 'NUESTRA SEÑORA DEL VILLAR 7 MADRID pry y subvenciones 27-10-2021.pdf', 'Hoja firmada por la comunidad (Drive, PRESUPUESTOS FIRMADOS).', None,
     [('Adaptación del proyecto y dirección de obra para instalación de ascensor', 'REDACCION PROYECTO', 4700, [('encargo', 4700, ('accesalia', 2021, 94, 4700))]),
      ('Tramitación de subvenciones del Ayuntamiento y la Comunidad de Madrid durante dos años', 'TRAMITACION SUBVENCIONES ACCESIBILIDAD', 3000,
       [('encargo', 3000, ('accesalia', 2021, 94, 3000))])]),
    ('DAN-2021-107', 'hoja_encargo', 'enviada', '2021-12-14', 'HOJA DE ENCARGO CONSTITUCION 65 ALCOBENDAS 14-12-2021.pdf',
     'Hoja de encargo de Schindler Iberia, «no firmado pero válido» (Drive, PRESUPUESTOS FIRMADOS; el Word pasado a PDF).', SCHINDLER,
     [(PRY + ' (proyecto, licencia, DO, CFO, CSS y subvenciones 1 año)', 'REDACCION PROYECTO', 4500, [('entrega', 4500, ('daniel', 2022, 38, 4500))])]),
    ('DAN-2020-060', 'hoja_encargo', 'enviada', '2021-06-04', 'MIGUEL DE LA ROCA 18 MADRID SUBVENCIONES 04-06-2021 NO FIRMADO PERO VALIDO.pdf',
     'Presupuesto Daniel 2021/1-39 de FactuSOL, «no firmado pero válido» (Drive, PRESUPUESTOS FIRMADOS).', None,
     [('Tramitación de subvenciones 2021 (incluye IEE, certificado energético y sus registros)', 'TRAMITACION SUBVENCIONES ACCESIBILIDAD', 1250,
       [('encargo', 1250, ('accesalia', 2021, 42, 1250))])]),
    ('DAN-2022-053', 'hoja_encargo', 'firmada', '2021-12-17', 'MOSTOLES 3 PORTAL 2 FUENLABRADA 17-12-2021.pdf', 'Hoja firmada por la comunidad (Drive, PRESUPUESTOS FIRMADOS).', None,
     [(PRY, 'REDACCION PROYECTO', 5000, [('entrega', 5000, ('accesalia', 2022, 5, 5000))])]),
    ('DAN-2021-132', 'hoja_encargo', 'firmada', '2021-12-10', 'SAN ANDRES 1 FUENLABRADA.pdf', 'Hoja firmada (Drive, PRESUPUESTOS FIRMADOS).', None,
     [(PRY, 'REDACCION PROYECTO', 5000, [('entrega', 5000, ('accesalia', 2022, 4, 5000))])]),
    ('DAN-2020-005', 'pedido', 'firmada', '2020-07-27', 'GALICIA 2 LEGANES IEE 20-07-2020.pdf',
     'Pedido por correo de Oswaldo García (FAIN, 27-jul-2020): «necesita en la comunidad que prepares el IEE del edificio, les he dicho 700 € más IVA, se lo facturas directamente».', None,
     [('Informe de Evaluación del Edificio (IEE)', 'IEE', 700, [('encargo', 700, ('accesalia', 2020, 37, 700))])]),
]
plan = []
for cod, tipo, estado, fecha, fich, nota, contrata, lineas in NUEVAS:
    o = b.leer('oportunidades?select=id,codigo,nombre,comunidad_id&codigo=eq.' + cod)[0]
    ls = [(t, bl, tot, [(h, i, linea(*fa)) for h, i, fa in pg]) for t, bl, tot, pg in lineas]
    plan.append((o, tipo, estado, fecha, buscar(fich), nota, contrata, ls))
    print('%s %-34s %s %s %s | %s' % (cod, o['nombre'][:34], tipo, estado, fecha, ' + '.join('%s %g' % (t[:26], tot) for t, _, tot, _ in lineas)))
CANADA = buscar('cañada 8 alcorcon tke 08-11-2017 (2).pdf')
can = b.leer('hojas_encargo?select=id,tipo_documento,motivo_sin_firma,versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(id,notas),lineas_facturacion(id)&numero_hoja=eq.HE-2021-0033')[0]
assert can['tipo_documento'] == 'nota_responsabilidad'
print('HE-2021-0033 Cañada 8 Alcorcón: nota -> contrato TKE (4-jun-2018) con su PDF')
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

for o, tipo, estado, fecha, ruta_pdf, nota, contrata, ls in plan:
    nota = '%s (Mónica, %s).' % (nota, HOY)
    req = urllib.request.Request(b.url + '/rest/v1/rpc/siguiente_codigo', data=json.dumps({'p_tipo': 'HE', 'p_anio': int(fecha[:4])}).encode(),
                                 headers=dict(b.cab, **{'Content-Type': 'application/json'}), method='POST')
    num = json.loads(urllib.request.urlopen(req).read())
    hid, vid = str(uuid.uuid4()), str(uuid.uuid4())
    h = dict(id=hid, numero_hoja=num, oportunidad_id=o['id'], comunidad_id=o['comunidad_id'], pagador_tipo='contrata' if contrata else 'comunidad',
             pagador_contrata_id=contrata, emisor='accesalia', fecha_creacion=fecha, tipo_documento=tipo, fecha_estado=fecha + 'T00:00:00+00:00',
             estado='devuelta_firmada' if estado == 'firmada' else 'enviada_comunidad', descripcion='Del Drive · ' + o['nombre'])
    if estado == 'firmada': h['fecha_firma'] = fecha
    b.insertar('hojas_encargo', [h])
    ruta = 'almacen:documentos-comerciales/' + b.subir('documentos-comerciales', 'hojas-encargo/%s/%s-v1-1-%s.pdf' % (hid, 'firmada' if estado == 'firmada' else 'hoja', vid[:8]),
                                                       open(ruta_pdf, 'rb').read(), reemplazar=True)
    v = dict(id=vid, hoja_encargo_id=hid, numero_version=1, fecha_generada=fecha, fecha_enviada=fecha, importe_base=sum(l[2] for l in ls), iva_porcentaje=21, notas=nota)
    v['pdfs_firmados' if estado == 'firmada' else 'url_pdf_hoja'] = [ruta] if estado == 'firmada' else ruta
    b.insertar('versiones_hoja', [v])
    if estado == 'firmada': b.actualizar('hojas_encargo?id=eq.' + hid, {'version_firmada_id': vid})
    for texto, bloque, total, pg in ls:
        lid = str(uuid.uuid4())
        b.insertar('lineas_facturacion', [dict(id=lid, hoja_encargo_id=hid, bloque_id=BLOQUE[bloque], descripcion=texto, importe=total, es_porcentaje=False, notas=nota,
                   origen='pedido' if tipo == 'pedido' else 'pdf', verificado=True, emisor='accesalia', pagador_tipo='contrata' if contrata else 'comunidad',
                   pagador_id=contrata or o['comunidad_id'], forma_cobro='transferencia' if contrata else 'cargo_cuenta', creada_por=MONICA)])
        for orden, (hh, imp, (f, l)) in enumerate(pg, 1):
            tid = str(uuid.uuid4())
            b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=lid, hito=hh, orden=orden, porcentaje=round(100 * imp / total, 2), importe=imp, estado='completado')])
            b.insertar('factura_linea_hitos', [dict(factura_linea_id=l['id'], hito_cobro_id=tid, importe=imp, como='a_mano')])
            if f['oportunidad_id'] != o['id']: b.actualizar('facturas?id=eq.' + f['id'], {'oportunidad_id': o['id']})
    print(num, o['nombre'])

v = can['versiones_hoja'][0]
ruta = 'almacen:documentos-comerciales/' + b.subir('documentos-comerciales', 'hojas-encargo/%s/firmada-v1-1-%s.pdf' % (can['id'], v['id'][:8]), open(CANADA, 'rb').read(), reemplazar=True)
b.actualizar('versiones_hoja?id=eq.' + v['id'], {'pdfs_firmados': [ruta], 'notas': '\n'.join(x for x in (v['notas'], 'Antes nota de responsabilidad: ' + (can['motivo_sin_firma'] or ''),
             'Papeles del Drive: propuesta TKE (25-abr-2018), contrato (4-jun-2018) y pedido, 5.000 € (Mónica, %s).' % HOY) if x)})
b.actualizar('hojas_encargo?id=eq.' + can['id'], dict(tipo_documento='contrato', responsable_id=None, motivo_sin_firma=None, fecha_firma='2018-06-04',
             fecha_estado='2018-06-04T00:00:00+00:00', descripcion='Contrato TKE · Cañada 8 Alcorcón'))
b.actualizar('lineas_facturacion?hoja_encargo_id=eq.' + can['id'], {'origen': 'contrato'})
print('HE-2021-0033 -> contrato')
print('ESCRITO')
