# -*- coding: utf-8 -*-
"""ELECNOR: lo que quedaba suelto (Mónica, 19-oct-2026).
  - Málaga 40, Hermanos Machado 5 y Pablo Neruda 54: su PRESUPUESTO de FactuSOL a ELECNOR SA (Drive, FACTURAS ACC Y DAN/
    ACCESALIA/<año>/presupuestos) es el papel: enviado y sin firmar, vale como respaldo de su factura (regla de Mónica,
    como Paseo Olimpo 16) -> hoja «enviada» con sus líneas y cada factura en su pago.
  - General Ricardos 92 (lo de Elecnor de 2023) y La Salle 12 (Hospital Vithas): sin papel en ningún sitio -> NOTA DE
    RESPONSABILIDAD («vamos con la nota a esas dos»).
  - Vélez Blanco 46: el 40 % del fin de obra (1.600) «se da por perdido» (la obra la acabó haciendo FAIN en 2024).
  Álava 14 NO se toca: el presupuesto es a la comunidad y la factura a «Coordinación de Instalaciones» (¿contrata?).

  python scripts/facturacion/elecnor_ultimas.py [--escribir]
"""
import sys, os, json, uuid, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
ELECNOR = '9bced278-bff6-4213-bdab-5cbc5d5d84d5'
FAC = r'G:\Mi unidad\MONICA ACCESALIA\FACTURAS Y GASTOS ACC Y DAN\FACTURAS ACC Y DAN\ACCESALIA'
b = arrancar()
BLOQUE = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo')}

# opp, tipo, fecha, papel, nota/motivo, líneas [(texto, bloque, importe, [(hito, pct, [facturas (año, nº)])])]
OBRAS = [
    ('DAN-2021-150', 'hoja_encargo', '2021-07-16', FAC + r'\2021\Presupuestos\000015.PPTO cl malaga 40 fuenlabrada.pdf',
     'Presupuesto Accesalia 2021/1-15 a ELECNOR SA (16-jul-2021), enviado y sin firmar: respaldo de su factura Accesalia 2021/1-41.',
     [('Memoria Valorada para obra menor de mejora de accesibilidad', 'REDACCION PROYECTO', 500, [('entrega', 100, [(2021, 41)])])]),
    ('DAN-2021-016', 'hoja_encargo', '2021-07-16', FAC + r'\2021\Presupuestos\000016.PPTO cl hermanos machado 5.pdf',
     'Presupuesto Accesalia 2021/1-16 a ELECNOR SA (16-jul-2021), enviado y sin firmar: respaldo de su factura Accesalia 2021/1-40.',
     [('Proyecto básico y de ejecución de instalación de ascensor', 'REDACCION PROYECTO', 3500, [('entrega', 100, [(2021, 40)])])]),
    ('DAN-2019-076', 'hoja_encargo', '2022-03-28', FAC + r'\2022\presupuestos\Presupuesto 1-000001 PABLO NERUDA 54 MADRID.PDF',
     'Presupuesto Accesalia 2022/1-1 a ELECNOR SA (28-mar-2022, «primera parte 70 %» de 5.500), enviado y sin firmar: respaldo de sus '
     'facturas (2022/1-50 el 70 %, 2023/1-129 el 30 % restante, CFO); la CSS (800) consta solo por su factura Accesalia 2023/1-35.',
     [('Proyecto básico y de ejecución de instalación de ascensor', 'REDACCION PROYECTO', 5500, [('entrega', 70, [(2022, 50)]), ('cfo', 30, [(2023, 129)])]),
      ('Coordinación de Seguridad y Salud', 'CSS', 800, [('pss', 100, [(2023, 35)])])]),
    ('DAN-2021-019', 'nota_responsabilidad', '2023-01-19', None,
     'Elecnor encargó en 2023 el proyecto (3.500), la CSS (600) y la tramitación de la subvención (1.500) de General Ricardos 92, aparte de las '
     'hojas de la comunidad (HE-2022-0002, HE-2022-0054, HE-2024-0155). No hay papel en Drive, Dropbox ni correo; consta por sus facturas '
     'Accesalia 2023/1-18, 2023/1-19 y 2023/1-20, cobradas.',
     [('Proyecto de instalación de ascensor (Elecnor)', 'REDACCION PROYECTO', 3500, [('entrega', 100, [(2023, 18)])]),
      ('Coordinación de Seguridad y Salud', 'CSS', 600, [('pss', 100, [(2023, 19)])]),
      ('Tramitación de subvenciones de accesibilidad', 'TRAMITACION SUBVENCIONES', 1500, [('presentacion', 100, [(2023, 20)])])]),
    ('DAN-2023-280', 'nota_responsabilidad', '2023-10-26', None,
     'Certificado de la estructura de los muros de los vestuarios del Hospital Vithas (La Salle 12) encargado por Elecnor. No hay papel; '
     'consta por su factura Accesalia 2023/1-199, cobrada con cheque (justificante en Drive).',
     [('Certificado estructura muros vestuarios Hospital Vithas', 'INFORME TECNICO', 300, [('entrega', 100, [(2023, 199)])])]),
]


def factura(a, n):
    f = b.leer('facturas?select=id,oportunidad_id,lineas:factura_lineas(id,base,enl:factura_linea_hitos(hito_cobro_id))'
               '&origen=eq.factusol&empresa_emisora=eq.accesalia&anio=eq.%d&serie=eq.1&numero=eq.%d' % (a, n))[0]
    ls = [x for x in f['lineas'] if float(x['base'] or 0)]
    assert len(ls) == 1 and not ls[0]['enl'], (a, n)
    return f, ls[0]['id'], float(ls[0]['base'])


plan = []
for cod, tipo, fecha, papel, nota, lineas in OBRAS:
    o = b.leer('oportunidades?select=id,codigo,nombre,comunidad_id&codigo=eq.' + cod)[0]
    assert papel is None or os.path.exists(papel), papel
    ls = []
    for txt, bl, imp, pagos in lineas:
        ps = []
        for h, pct, facs in pagos:
            fs = [factura(*k) + (k,) for k in facs]
            assert abs(sum(x[2] for x in fs) - imp * pct / 100) < .01, (cod, txt, h)
            ps.append((h, pct, fs))
        ls.append((txt, bl, imp, ps))
    plan.append((o, tipo, fecha, papel, nota, ls))
    print('%s %s [%s] %s' % (cod, o['nombre'], tipo, ' + '.join('%s %g' % (l[0][:25], l[2]) for l in ls)))
vb = b.leer('hojas_encargo?select=id&numero_hoja=eq.HE-2021-0045')[0]
cfo = [x for l in b.leer('lineas_facturacion?select=id&hoja_encargo_id=eq.' + vb['id'])
       for x in b.leer('hitos_cobro?select=id,notas,estado,enl:factura_linea_hitos(factura_linea_id)&hito=eq.cfo&linea_facturacion_id=eq.' + l['id'])]
assert len(cfo) == 1 and not cfo[0]['enl']
print('Vélez Blanco 46: fin de obra 1.600 -> anulado (perdido)')
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

for o, tipo, fecha, papel, nota, ls in plan:
    req = urllib.request.Request(b.url + '/rest/v1/rpc/siguiente_codigo', data=json.dumps({'p_tipo': 'HE', 'p_anio': int(fecha[:4])}).encode(),
                                 headers=dict(b.cab, **{'Content-Type': 'application/json'}), method='POST')
    cod = json.loads(urllib.request.urlopen(req).read())
    hid, vid = str(uuid.uuid4()), str(uuid.uuid4())
    nota = nota + ' (Mónica, %s)' % HOY
    h = dict(id=hid, numero_hoja=cod, oportunidad_id=o['id'], comunidad_id=o['comunidad_id'], pagador_tipo='contrata', pagador_contrata_id=ELECNOR,
             emisor='accesalia', fecha_creacion=fecha, tipo_documento=tipo, descripcion=('Nota de responsabilidad · Elecnor · ' if tipo != 'hoja_encargo' else 'Presupuesto a Elecnor · ') + o['nombre'])
    if tipo == 'hoja_encargo': h.update(estado='enviada_comunidad', fecha_estado=fecha + 'T00:00:00+00:00')
    else: h.update(estado='devuelta_firmada', fecha_firma=fecha, fecha_estado=fecha + 'T00:00:00+00:00', responsable_id=MONICA, motivo_sin_firma=nota)
    b.insertar('hojas_encargo', [h])
    v = dict(id=vid, hoja_encargo_id=hid, numero_version=1, fecha_generada=fecha, fecha_enviada=fecha, importe_base=sum(l[2] for l in ls), iva_porcentaje=21, notas=nota)
    if papel:
        v['url_pdf_hoja'] = 'almacen:documentos-comerciales/' + b.subir('documentos-comerciales', 'hojas-encargo/%s/hoja-v1-%s.pdf' % (hid, vid[:8]),
                                                                         open(papel, 'rb').read(), reemplazar=True)
    b.insertar('versiones_hoja', [v])
    if tipo != 'hoja_encargo': b.actualizar('hojas_encargo?id=eq.' + hid, {'version_firmada_id': vid})
    for orden_l, (txt, bl, imp, ps) in enumerate(ls):
        lid = str(uuid.uuid4())
        b.insertar('lineas_facturacion', [dict(id=lid, hoja_encargo_id=hid, bloque_id=BLOQUE[bl], descripcion=txt, importe=imp, es_porcentaje=False, notas=nota,
                   origen='pdf' if papel else 'nota_responsabilidad', verificado=True, emisor='accesalia', pagador_tipo='contrata', pagador_id=ELECNOR,
                   forma_cobro='transferencia', creada_por=MONICA)])
        for orden, (hh, pct, fs) in enumerate(ps, 1):
            tid = str(uuid.uuid4())
            b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=lid, hito=hh, orden=orden, porcentaje=pct, importe=round(imp * pct / 100, 2), estado='completado')])
            for f, flid, base, k in fs:
                b.insertar('factura_linea_hitos', [dict(factura_linea_id=flid, hito_cobro_id=tid, importe=base, como='a_mano')])
                if not f['oportunidad_id']: b.actualizar('facturas?id=eq.%s&oportunidad_id=is.null' % f['id'], {'oportunidad_id': o['id']})
    print(cod, o['nombre'])
b.actualizar('hitos_cobro?id=eq.' + cfo[0]['id'], {'estado': 'anulado', 'notas': '\n'.join(x for x in (cfo[0]['notas'],
             'Se da por perdido (Mónica, %s): la obra la acabó haciendo FAIN en 2024 y el 20 %% facturado en 2021 se rectificó por acuerdo.' % HOY) if x)})
print('ESCRITO')
