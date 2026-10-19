# -*- coding: utf-8 -*-
"""ELECNOR 2021: los encargos que solo tenían facturas sueltas, con su papel de verdad (Mónica, 19-oct-2026: «NO
resolvemos todo con notas; antes buscamos las opciones» -> «1 ok, 2 ok, 3 es 46, errata de factura; la opp del 45 sobra»).

  1. PEDIDO DE ELECNOR POR CORREO: el 14-oct-2021 («Facturación de Octubre») Daniel Navarro, jefe del departamento de
     comunidades de vecinos de Elecnor, contesta «ok» a los honorarios de cada obra (PDF en Drive, PRESUPUESTOS FIRMADOS,
     «LLANOS DE ESCUDERO 37 Y LUIS RUIZ 88 MADRID ELECNOR.pdf»). Como los correos de códigos de FAIN: un pedido por obra
     con ese correo de papel; cobro 60 % + 40 % al fin de obra (lo que dicen las facturas). Marqués de Corbera 36B ya
     tenía su hoja.
  2. ILIADA 39, CSS 800: nuestra hoja de encargo a Elecnor (1-feb-2024, 100 % a la contratación, carpeta «ya firmados»)
     -> hoja con ese papel y la Accesalia 2024/1-44.
  3. VÉLEZ BLANCO 45 = errata de la factura Accesalia 2021/1-74: es Vélez Blanco 46. La factura pasa a la opp del 46 y la
     opp del 45 se anula (sobra).
  Además: la Accesalia 2021/1-97 (Vélez Blanco 46, 20 %) se rectificó con el abono 2022/1-5 «por acuerdo con el
  cliente» -> anulada (si no, la regla «hasta 2023 la factura vale como cobrada» la da por cobrada).

  python scripts/facturacion/elecnor_pedidos_2021.py [--escribir]
"""
import sys, os, json, uuid, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
AHORA = datetime.datetime.now(datetime.timezone.utc).isoformat()
MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
ELECNOR = '9bced278-bff6-4213-bdab-5cbc5d5d84d5'
DRIVE = r'G:\Mi unidad\MONICA ACCESALIA\PRESUPUESTOS'
CORREO = DRIVE + r'\PRESUPUESTOS FIRMADOS\LLANOS DE ESCUDERO 37 Y LUIS RUIZ 88 MADRID ELECNOR.pdf'
ILIADA = DRIVE + r'\PRESUPUESTOS ENVIADOS\ya firmados\HOJA DE ENCARGO ILIADA 39 MADRID elecnor CSS.docx'
b = arrancar()
BLOQUE = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo')}

# obra: (opp, total, qué, bloque, hito del 60 %, [(factura, pago)])
OBRAS = [
    ('DAN-2021-065', 7500, 'Proyectos, dirección facultativa y coordinación de seguridad y salud (2 ascensores)', 'REDACCION PROYECTO', 'entrega',
     [((2021, 60), 'p60'), ((2021, 77), 'p60'), ((2024, 38), 'cfo')]),
    ('DAN-2015-118', 4000, 'Proyecto, dirección facultativa y coordinación de seguridad y salud', 'REDACCION PROYECTO', 'entrega',
     [((2021, 59), 'p60'), ((2021, 76), 'p60'), ((2023, 156), 'cfo')]),
    ('DAN-2021-077', 4000, 'Proyecto, dirección facultativa y coordinación de seguridad y salud', 'REDACCION PROYECTO', 'entrega',
     [((2021, 74), 'p60')]),
    ('DAN-2021-029', 2500, 'Dirección facultativa y coordinación de seguridad y salud (el proyecto ya se había cobrado)', 'DF', 'inicio_obra',
     [((2021, 73), 'p60'), ((2024, 39), 'cfo')]),
    ('DAN-2021-034', 2500, 'Dirección facultativa y coordinación de seguridad y salud', 'DF', 'inicio_obra',
     [((2021, 58), 'p60'), ((2021, 75), 'p60'), ((2023, 138), 'cfo')]),
]


def opp(cod): return b.leer('oportunidades?select=id,codigo,nombre,comunidad_id&codigo=eq.' + cod)[0]


def factura(a, n):
    f = b.leer('facturas?select=id,estado,notas,oportunidad_id,lineas:factura_lineas(id,base,enl:factura_linea_hitos(hito_cobro_id))'
               '&origen=eq.factusol&empresa_emisora=eq.accesalia&anio=eq.%d&serie=eq.1&numero=eq.%d' % (a, n))[0]
    ls = [x for x in f['lineas'] if float(x['base'] or 0)]
    assert len(ls) == 1 and not ls[0]['enl'], (a, n)
    return f, ls[0]['id'], float(ls[0]['base'])


plan = []
for cod, T, que, bloque, h60, facs in OBRAS:
    o = opp(cod)
    assert not b.leer('hojas_encargo?select=id&pagador_contrata_id=eq.%s&oportunidad_id=eq.%s' % (ELECNOR, o['id']), False), cod
    fs = [(factura(*k), pago, k) for k, pago in facs]
    for p, pct in (('p60', 60), ('cfo', 40)):
        assert sum(x[0][2] for x in fs if x[1] == p) <= T * pct / 100 + .01, (cod, p)
    plan.append((o, T, que, bloque, h60, fs))
    print('%s %s %g | %s' % (cod, o['nombre'], T, ' · '.join('%s/1-%s %g -> %s' % (k[0], k[1], x[2], p) for x, p, k in fs)))
il = opp('DAN-2023-104'); f44 = factura(2024, 44); assert f44[2] == 800
v45, v46 = opp('DAN-2021-151'), opp('DAN-2021-077')
f97 = b.leer('facturas?select=id,estado,notas&origen=eq.factusol&empresa_emisora=eq.accesalia&anio=eq.2021&serie=eq.1&numero=eq.97')[0]
print('Iliada 39 CSS 800 <- 2024/1-44 | Vélez 45 -> 46 y opp 45 anulada | 2021/1-97', f97['estado'], '-> anulada')
assert os.path.exists(CORREO) and os.path.exists(ILIADA)
if not ESCRIBIR:
    print('EN SECO'); sys.exit()


def codigo(anio):
    req = urllib.request.Request(b.url + '/rest/v1/rpc/siguiente_codigo', data=json.dumps({'p_tipo': 'HE', 'p_anio': anio}).encode(),
                                 headers=dict(b.cab, **{'Content-Type': 'application/json'}), method='POST')
    return json.loads(urllib.request.urlopen(req).read())


def subir(hid, vid, ruta, nombre, tipo):
    return 'almacen:documentos-comerciales/' + b.subir('documentos-comerciales', 'hojas-encargo/%s/firmada-%s-%s' % (hid, vid[:8], nombre),
                                                       open(ruta, 'rb').read(), tipo=tipo, reemplazar=True)


def hito(lid, h, orden, pct, imp, fs, nota=None):
    cob = sum(x[2] for x in fs)
    tid = str(uuid.uuid4())
    b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=lid, hito=h, orden=orden, porcentaje=pct, importe=imp, notas=nota,
               estado='completado' if abs(cob - imp) < .01 else ('parcial' if cob else 'pendiente'))])
    if len(fs) == 1 and abs(cob - imp) < .01:
        b.insertar('factura_linea_hitos', [dict(factura_linea_id=fs[0][1], hito_cobro_id=tid, importe=fs[0][2], como='a_mano')])
        return
    for f, flid, base, ref in fs:
        sid = str(uuid.uuid4())
        b.insertar('hitos_cobro', [dict(id=sid, linea_facturacion_id=lid, hito=h, orden=1, importe=base, estado='completado', hito_padre_id=tid, notas=ref)])
        b.insertar('factura_linea_hitos', [dict(factura_linea_id=flid, hito_cobro_id=sid, importe=base, como='a_mano')])
    if fs and cob < imp - .01:
        b.insertar('hitos_cobro', [dict(id=str(uuid.uuid4()), linea_facturacion_id=lid, hito=h, orden=2, importe=round(imp - cob, 2), estado='pendiente',
                   hito_padre_id=tid, notas='Resto, sin facturar.')])


# 3 primero: la 2021/1-74 pasa a la opp del 46
if 'errata' not in (plan[2][5][0][0][0]['notas'] or ''): b.actualizar('facturas?id=eq.' + plan[2][5][0][0][0]['id'], {'oportunidad_id': v46['id'], 'notas': '\n'.join(x for x in (plan[2][5][0][0][0]['notas'],
             'Dice «Vélez Blanco 45»: errata, es Vélez Blanco 46 (correo de Elecnor del 14-oct-2021; Mónica, %s).' % HOY) if x)})
b.actualizar('oportunidades?id=eq.' + v45['id'], {'estado': 'anulada', 'anulada_en': AHORA, 'anulada_por': MONICA, 'duplicada_de': v46['id'],
             'motivo_anulacion': 'Sobra: salió de la errata «Vélez Blanco 45» de la factura Accesalia 2021/1-74, que es de Vélez Blanco 46 (Mónica, %s).' % HOY})
b.actualizar('facturas?id=eq.' + f97['id'], {'estado': 'anulada', 'notas': '\n'.join(x for x in (f97['notas'],
             'Rectificada con el abono Accesalia 2022/1-5 «por acuerdo con el cliente» (Mónica, %s).' % HOY) if x)})
# 1
for o, T, que, bloque, h60, fs in plan:
    hid, vid, lid = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
    cod = codigo(2021)
    nota = ('Pedido de Elecnor por correo: el 14-oct-2021 («Facturación de Octubre») Daniel Navarro (jefe del departamento de comunidades de '
            'vecinos de Elecnor) contesta «ok» a %s € por %s; 60 %% y 40 %% al fin de obra (Mónica, %s).' % ('{:,.0f}'.format(T).replace(',', '.'), que.lower(), HOY))
    b.insertar('hojas_encargo', [dict(id=hid, numero_hoja=cod, oportunidad_id=o['id'], comunidad_id=o['comunidad_id'], pagador_tipo='contrata',
               pagador_contrata_id=ELECNOR, emisor='accesalia', fecha_creacion='2021-10-14', fecha_firma='2021-10-14', estado='devuelta_firmada',
               fecha_estado='2021-10-14T00:00:00+00:00', descripcion='Pedido ELECNOR por correo (14-oct-2021) · ' + o['nombre'], tipo_documento='pedido')])
    url = subir(hid, vid, CORREO, 'CORREO-ELECNOR-14-10-2021.pdf', 'application/pdf')
    b.insertar('versiones_hoja', [dict(id=vid, hoja_encargo_id=hid, numero_version=1, fecha_generada='2021-10-14', fecha_enviada='2021-10-14', importe_base=T,
               iva_porcentaje=21, forma_pago='60 % y 40 % restante al fin de obra', notas=nota, pdfs_firmados=[url])])
    b.actualizar('hojas_encargo?id=eq.' + hid, {'version_firmada_id': vid})
    b.insertar('lineas_facturacion', [dict(id=lid, hoja_encargo_id=hid, bloque_id=BLOQUE[bloque], descripcion=que, importe=T, es_porcentaje=False,
               notas=nota, origen='pedido', verificado=True, emisor='accesalia', pagador_tipo='contrata', pagador_id=ELECNOR, forma_cobro='transferencia',
               creada_por=MONICA)])
    p60 = [(x[0], x[1], x[2], 'Accesalia %s/1-%s' % k) for x, p, k in fs if p == 'p60']
    pcf = [(x[0], x[1], x[2], 'Accesalia %s/1-%s' % k) for x, p, k in fs if p == 'cfo']
    hito(lid, h60, 1, 60, round(T * .6, 2), p60)
    hito(lid, 'cfo', 2, 40, round(T * .4, 2), pcf)
    for x, p, k in fs:
        if not x[0]['oportunidad_id']: b.actualizar('facturas?id=eq.%s&oportunidad_id=is.null' % x[0]['id'], {'oportunidad_id': o['id']})
    print(cod, o['nombre'])
# 2
hid, vid, lid = str(uuid.uuid4()), str(uuid.uuid4()), str(uuid.uuid4())
cod = codigo(2024)
b.insertar('hojas_encargo', [dict(id=hid, numero_hoja=cod, oportunidad_id=il['id'], comunidad_id=il['comunidad_id'], pagador_tipo='contrata',
           pagador_contrata_id=ELECNOR, emisor='accesalia', fecha_creacion='2024-02-01', fecha_firma='2024-02-01', estado='devuelta_firmada',
           fecha_estado='2024-02-01T00:00:00+00:00', descripcion='CSS', tipo_documento='hoja_encargo')])
url = subir(hid, vid, ILIADA, 'HOJA-DE-ENCARGO-ILIADA-39-MADRID-elecnor-CSS.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')
nota = ('Hoja de encargo a Elecnor de 1-feb-2024 (Drive, PRESUPUESTOS ENVIADOS/ya firmados; no está el PDF firmado), cobrada con la '
        'Accesalia 2024/1-44 (Mónica, %s).' % HOY)
b.insertar('versiones_hoja', [dict(id=vid, hoja_encargo_id=hid, numero_version=1, fecha_generada='2024-02-01', fecha_enviada='2024-02-01', importe_base=800,
           iva_porcentaje=21, forma_pago='100% a la contratación, mediante transferencia.', notas=nota, pdfs_firmados=[url])])
b.actualizar('hojas_encargo?id=eq.' + hid, {'version_firmada_id': vid})
b.insertar('lineas_facturacion', [dict(id=lid, hoja_encargo_id=hid, bloque_id=BLOQUE['CSS'], descripcion='Honorarios por la Coordinación de Seguridad y Salud en la obra de INSTALACION DE ASCENSOR',
           importe=800, es_porcentaje=False, notas=nota, origen='pdf', verificado=True, emisor='accesalia', pagador_tipo='contrata', pagador_id=ELECNOR,
           forma_cobro='transferencia', creada_por=MONICA)])
hito(lid, 'encargo', 1, 100, 800.0, [(f44[0], f44[1], 800.0, 'Accesalia 2024/1-44')])
if not f44[0]['oportunidad_id']: b.actualizar('facturas?id=eq.%s&oportunidad_id=is.null' % f44[0]['id'], {'oportunidad_id': il['id']})
print(cod, 'Iliada 39 CSS')
print('ESCRITO')
