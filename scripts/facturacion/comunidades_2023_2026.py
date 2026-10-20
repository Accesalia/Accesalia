# -*- coding: utf-8 -*-
"""COMUNIDADES: las facturas de 2023-2026 que no colgaban de ningún hito (Mónica, 20-oct-2026: «las de 2023, 24, 25 y 26,
ver cuáles son; las anteriores, ignorarlas de momento» -> «ok a todo»). Las de 2020-22 de la MISMA obra entran también
cuando el papel las cubre (es la misma hoja).
  A. Baleares 34: la Accesalia 2023/1-67 (3.600) y la 2023/1-134 (2.900) son el adelanto de 6.500 de la HE-2023-0020
     -> dos trozos de su hito de entrega.
  B. El papel del proyecto estaba en el Drive (PRESUPUESTOS) y no en la app: se da de alta la HOJA con su PDF. Firmada
     (Pereda 43, Estados 4; Gandhi 21 aceptada por correo del administrador) o enviada (Moraña 24, Castro Camba 24,
     Virgen de Lluc 140, Andalucía 10: como Elecnor, el papel enviado respalda su factura). San José 9: su hoja ya
     estaba (HE-2022-0058) con la línea del 1 % del PEM sin hito.
  C. Sin papel del proyecto (solo el de la subvención o la CSS): NOTA DE RESPONSABILIDAD con el reparto de sus facturas.
  Fuera (para cuando se modelen): Urvall, Olimpo 16 (pagada por Aislamiento de Rehabilitación), gastos de devolución,
  UCI (financiación) y EFFIC (viabilidades).
  python scripts/facturacion/comunidades_2023_2026.py [--escribir]
"""
import sys, os, json, uuid, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
DRIVE = r'G:\Mi unidad\MONICA ACCESALIA\PRESUPUESTOS'
CONV = os.path.join(RAIZ, 'docs', 'facturacion', 'papeles_comunidades')  # los .docx del Drive, pasados a PDF con Word
b = arrancar()
BLOQUE = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo')}
PRY = 'Proyecto de instalación de ascensor'
PRY_SATE = 'Proyecto para la mejora de la envolvente térmica'
CSS = 'Coordinación de Seguridad y Salud'

# opp, tipo, estado, fecha, papel, por qué, líneas [(texto, bloque, total, [(hito, importe, [(factura, base de su línea, importe que va)])])]
OBRAS = [
    ('DAN-2021-021', 'hoja_encargo', 'firmada', '2021-11-05', DRIVE + r'\PRESUPUESTOS FIRMADOS\jose maria pereda 43 madrid proyecto css y subvenciones.pdf',
     'Presupuesto firmado por la comunidad el 5-nov-2021 (Drive, PRESUPUESTOS FIRMADOS): proyecto 4.100 + subvención 1.500.',
     [(PRY, 'REDACCION PROYECTO', 4100, [('entrega', 2050, [('Daniel 2021/1-94', 2050, 2050)]), ('licencia', 1230, [('Daniel 2023/1-34', 1230, 1230)]),
                                         ('cfo', 820, [('Daniel 2024/1-9', 820, 820)])]),
      ('Tramitación de subvenciones de accesibilidad (2023 a 2025)', 'TRAMITACION SUBVENCIONES ACCESIBILIDAD', 1500, [('encargo', 1500, [('Daniel 2021/1-94', 1500, 1500)])])]),
    ('DAN-2022-013', 'hoja_encargo', 'firmada', '2022-02-23', DRIVE + r'\PRESUPUESTOS FIRMADOS\estados 4 fuenlabrada firmado.pdf',
     'Hoja firmada por la comunidad (23-feb-2022, Drive, PRESUPUESTOS FIRMADOS): 5.500, 70 % a la entrega y 30 % a la concesión.',
     [(PRY_SATE, 'REDACCION PROYECTO', 5500, [('entrega', 3850, [('Accesalia 2022/1-24', 3850, 3850)]), ('concesion', 1650, [('Accesalia 2024/1-220', 1650, 1650)])])]),
    ('DAN-2021-018', 'hoja_encargo', 'firmada', '2023-02-10', DRIVE + r'\PRESUPUESTOS FIRMADOS\Gandhi 21 madrid - Proyecto - mail con administrador 10-02-2023.pdf',
     'Aceptado por correo del administrador (Mandataria, 10-feb-2023): el proyecto es nuestro; DF y CSS las lleva RAV.',
     [(PRY, 'REDACCION PROYECTO', 3500, [('entrega', 3500, [('Daniel 2023/1-20', 3500, 3500)])])]),
    ('DAN-2022-262', 'hoja_encargo', 'enviada', '2022-10-26', os.path.join(CONV, 'HOJA DE ENCARGO MORAÑA 24 LEGANES PRY.pdf'),
     'Hoja enviada el 26-oct-2022 (Drive, PRESUPUESTOS ENVIADOS, en Word): 6.000. El papel dice 50 % entrega y 50 % licencia; '
     'las facturas, «primera parte (50 %)» y «entrega de proyecto visado (50 %)»: manda la factura.',
     [(PRY, 'REDACCION PROYECTO', 6000, [('encargo', 3000, [('Daniel 2022/1-116', 3000, 3000)]), ('entrega', 3000, [('Daniel 2023/1-10', 3000, 3000)])])]),
    ('DAN-2020-025', 'hoja_encargo', 'enviada', '2022-10-06', os.path.join(CONV, 'HOJA DE ENCARGO ALFREDO CASTRO CAMBA 24 MADRID.pdf'),
     'Hoja enviada el 6-oct-2022 (Drive, PRESUPUESTOS ENVIADOS, en Word): 5.000, sin forma de pago. Facturado el proyecto (4.000); '
     'el resto (1.000), sin facturar.',
     [(PRY, 'REDACCION PROYECTO', 5000, [('entrega', 4000, [('Daniel 2023/1-13', 4000, 4000)]), ('cfo', 1000, [])])]),
    ('DAN-2022-142', 'hoja_encargo', 'enviada', '2022-07-04', os.path.join(CONV, 'HOJA DE ENCARGO VIRGEN DE LLUCH 140 MADRID.pdf'),
     'Hoja enviada el 4-jul-2022 (Drive, PRESUPUESTOS ENVIADOS, en Word): proyecto 3.500 + CSS 700. Facturado en dos mitades de '
     '2.100 (proyecto + CSS).',
     [(PRY, 'REDACCION PROYECTO', 3500, [('entrega', 1750, [('Accesalia 2022/1-131', 2100, 1750)]), ('licencia', 1750, [('Accesalia 2023/1-83', 2100, 1750)])]),
      (CSS, 'CSS', 700, [('entrega', 350, [('Accesalia 2022/1-131', 2100, 350)]), ('licencia', 350, [('Accesalia 2023/1-83', 2100, 350)])])]),
    ('DAN-2022-112', 'hoja_encargo', 'enviada', '2022-08-30', os.path.join(CONV, 'HOJA DE ENCARGO ANDALUCIA 10 FUENLABRADA  PROYECTO Y SUBVENCION.pdf'),
     'Hoja remitida el 30-ago-2022 (la cita su factura; Drive, PRESUPUESTOS ENVIADOS, en Word): 5.500, 70 % a la entrega y 30 % a la concesión.',
     [(PRY, 'REDACCION PROYECTO', 5500, [('entrega', 3850, [('Accesalia 2022/1-159', 3850, 3850)]), ('concesion', 1650, [('Accesalia 2024/1-84', 1650, 1650)])])]),
    # sin papel del proyecto: nota
    ('DAN-2026-074', 'nota_responsabilidad', None, None, None, 'Iglesia 22 Alcorcón: en el Drive solo están las hojas de la subvención y de DF y CSS (2026).',
     [(PRY + ' (proyecto, solicitud de licencia y dirección de obra)', 'REDACCION PROYECTO', 6000, [('entrega', 6000, [('Accesalia 2023/1-23', 6000, 6000)])])]),
    ('DAN-2020-032', 'nota_responsabilidad', None, None, None, 'Floras 5 Leganés: en el Drive solo está la hoja de la subvención.',
     [(PRY, 'REDACCION PROYECTO', 3500, [('entrega', 3500, [('Accesalia 2021/1-70', 3500, 3500)])]),
      (CSS, 'CSS', 800, [('pss', 800, [('Accesalia 2023/1-28', 800, 800)])])]),
    ('DAN-2023-107', 'nota_responsabilidad', None, None, None,
     'Comunidad de Madrid 9 Fuenlabrada: las hojas del Drive son las de 2023 (Next Generation y subvención), no las del SATE de 2021.',
     [(PRY_SATE + ' y CSS (70 %)', 'REDACCION PROYECTO', 3570, [('entrega', 3570, [('Accesalia 2021/1-83', 3570, 3570)])]),
      (CSS, 'CSS', 800, [('pss', 800, [('Accesalia 2023/1-30', 800, 800)])])]),
    ('DAN-2021-138', 'nota_responsabilidad', None, None, None, 'Agapito Marazuela 26 Segovia: en el Drive solo hay hojas de Agapito Marazuela 10.',
     [(PRY, 'REDACCION PROYECTO', 2450, [('entrega', 1715, [('Accesalia 2021/1-8', 1715, 1715)]), ('licencia', 735, [('Accesalia 2023/1-131', 735, 735)])])]),
    ('DAN-2022-081', 'nota_responsabilidad', None, None, None, 'Ángeles 12 Fuenlabrada: en el Drive solo están las hojas de la subvención y de la CSS.',
     [(PRY, 'REDACCION PROYECTO', 2500, [('entrega', 1250, [('Accesalia 2022/1-168', 1250, 1250)]), ('licencia', 1250, [('Accesalia 2023/1-227', 1250, 1250)])])]),
    ('DAN-2022-084', 'nota_responsabilidad', None, None, None, 'Ángeles 14 Fuenlabrada: en el Drive solo están las hojas de la subvención y de la CSS.',
     [(PRY, 'REDACCION PROYECTO', 2500, [('entrega', 1250, [('Accesalia 2022/1-169', 1250, 1250)]), ('licencia', 1250, [('Accesalia 2023/1-228', 1250, 1250)])])]),
]

cache = {}


def factura(ref):
    if ref not in cache:
        emisor, resto = ref.split(' ')
        anio, num = resto.split('/1-')
        cache[ref] = b.leer('facturas?select=id,empresa_emisora,anio,numero,fecha,estado,oportunidad_id,lineas:factura_lineas(id,base,enl:factura_linea_hitos(hito_cobro_id))'
                            '&tipo=eq.factura&empresa_emisora=eq.%s&anio=eq.%s&numero=eq.%s' % (emisor.lower(), anio, num))[0]
    return cache[ref]


def linea(ref, base):
    f = factura(ref)
    assert f['estado'] != 'anulada', ref
    ls = [l for l in f['lineas'] if abs(float(l['base'] or 0) - base) < 0.01 and not l['enl']]
    assert len(ls) == 1, (ref, base, f['lineas'])
    return f, ls[0]


plan = []
for cod, tipo, estado, fecha, papel, porque, lineas in OBRAS:
    o = b.leer('oportunidades?select=id,codigo,nombre,comunidad_id&codigo=eq.' + cod)[0]
    assert o['comunidad_id'], cod
    if papel: assert os.path.exists(papel), papel
    ls = []
    for t, bl, tot, pg in lineas:
        assert abs(sum(i for _, i, _ in pg) - tot) < 0.01, (cod, t)
        ls.append((t, bl, tot, [(h, imp, [(linea(r, base), va) for r, base, va in fs]) for h, imp, fs in pg]))
    usadas = {}
    for _, _, _, pg in ls:
        for _, _, fs in pg:
            for (f, l), va in fs: usadas[l['id']] = usadas.get(l['id'], 0) + va
    for (f, l) in [linea(r, base) for _, _, _, pg in lineas for _, _, fs in pg for r, base, _ in fs]:
        assert abs(usadas[l['id']] - float(l['base'])) < 0.01, (cod, l)
    fechas = [f['fecha'] for _, _, _, pg in ls for _, _, fs in pg for (f, _), _ in fs]
    emis = {f['empresa_emisora'] for _, _, _, pg in ls for _, _, fs in pg for (f, _), _ in fs}
    plan.append((o, tipo, estado, fecha or min(fechas), papel, porque, ls, 'daniel_autonomo' if emis == {'daniel'} else 'accesalia'))
    print('%-13s %-34s %-9s %s' % (cod, o['nombre'][:34], 'nota' if tipo != 'hoja_encargo' else estado,
                                    ' + '.join('%s %g [%s]' % (t[:18], tot, ', '.join('%s %g%s' % (h, i, '' if fs else ' (sin facturar)') for h, i, fs in pg)) for t, _, tot, pg in ls)))

# A. Baleares 34
bal = b.leer('hojas_encargo?select=id&numero_hoja=eq.HE-2023-0020')[0]
bal_h = [x for l in b.leer('lineas_facturacion?select=id&quitada_en=is.null&hoja_encargo_id=eq.' + bal['id'])
         for x in b.leer('hitos_cobro?select=id,linea_facturacion_id,importe,estado,hito_padre_id&hito=eq.entrega&linea_facturacion_id=eq.' + l['id'])]
assert len(bal_h) == 1 and bal_h[0]['estado'] == 'pendiente' and abs(float(bal_h[0]['importe']) - 6500) < 0.01
bal_f = [linea('Accesalia 2023/1-67', 3600), linea('Accesalia 2023/1-134', 2900)]
print('HE-2023-0020 entrega 6500 <- trozos Accesalia 2023/1-67 (3600) + 2023/1-134 (2900)')
# San José 9: la línea del 1 % del PEM de la HE-2022-0058
sj_l = b.leer('lineas_facturacion?select=id,importe&id=eq.9633d6c6-b523-40f4-bf25-367d2bc8032b')[0]
sj_h = b.leer('hitos_cobro?select=id,importe,estado&linea_facturacion_id=eq.' + sj_l['id'])  # ya tenía uno: «otro», sin importe
assert len(sj_h) == 1 and sj_h[0]['importe'] is None and sj_h[0]['estado'] == 'pendiente'
sj_f = linea('Accesalia 2024/1-129', 1141.30)
sj_o = b.leer('oportunidades?select=id&codigo=eq.DAN-2022-267')[0]
print('HE-2022-0058 1 % del PEM: su hito (otro, sin importe) -> adjudicacion 1141.30 <- Accesalia 2024/1-129; la factura a DAN-2022-267')
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

for o, tipo, estado, fecha, papel, porque, ls, emisor in plan:
    refs = sorted({'%s %s/1-%s' % (f['empresa_emisora'].capitalize(), f['anio'], f['numero']) for _, _, _, pg in ls for _, _, fs in pg for (f, _), _ in fs})
    nota = '%s Facturas: %s (Mónica, %s).' % (porque, ', '.join(refs), HOY)
    req = urllib.request.Request(b.url + '/rest/v1/rpc/siguiente_codigo', data=json.dumps({'p_tipo': 'HE', 'p_anio': int(fecha[:4])}).encode(),
                                 headers=dict(b.cab, **{'Content-Type': 'application/json'}), method='POST')
    num = json.loads(urllib.request.urlopen(req).read())
    hid, vid = str(uuid.uuid4()), str(uuid.uuid4())
    h = dict(id=hid, numero_hoja=num, oportunidad_id=o['id'], comunidad_id=o['comunidad_id'], pagador_tipo='comunidad', emisor=emisor,
             fecha_creacion=fecha, tipo_documento=tipo, fecha_estado=fecha + 'T00:00:00+00:00')
    if tipo == 'hoja_encargo':
        h.update(estado='devuelta_firmada' if estado == 'firmada' else 'enviada_comunidad', descripcion='Hoja del Drive · ' + o['nombre'])
        if estado == 'firmada': h['fecha_firma'] = fecha
    else:
        h.update(estado='devuelta_firmada', fecha_firma=fecha, responsable_id=MONICA, motivo_sin_firma=nota, descripcion='Nota de responsabilidad · ' + o['nombre'])
    b.insertar('hojas_encargo', [h])
    v = dict(id=vid, hoja_encargo_id=hid, numero_version=1, fecha_generada=fecha, fecha_enviada=fecha, importe_base=sum(l[2] for l in ls), iva_porcentaje=21, notas=nota)
    if papel:
        ruta = 'almacen:documentos-comerciales/' + b.subir('documentos-comerciales', 'hojas-encargo/%s/%s-v1-%s.pdf' % (hid, 'firmada' if estado == 'firmada' else 'hoja', vid[:8]),
                                                           open(papel, 'rb').read(), reemplazar=True)
        if estado == 'firmada': v['pdfs_firmados'] = [ruta]
        else: v['url_pdf_hoja'] = ruta
    b.insertar('versiones_hoja', [v])
    if h['estado'] == 'devuelta_firmada': b.actualizar('hojas_encargo?id=eq.' + hid, {'version_firmada_id': vid})
    for texto, bloque, total, pg in ls:
        lid = str(uuid.uuid4())
        b.insertar('lineas_facturacion', [dict(id=lid, hoja_encargo_id=hid, bloque_id=BLOQUE[bloque], descripcion=texto, importe=total, es_porcentaje=False, notas=nota,
                   origen='pdf' if papel else 'nota_responsabilidad', verificado=True, emisor=emisor, pagador_tipo='comunidad', pagador_id=o['comunidad_id'],
                   forma_cobro='cargo_cuenta', creada_por=MONICA)])
        for orden, (hh, imp, fs) in enumerate(pg, 1):
            tid = str(uuid.uuid4())
            b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=lid, hito=hh, orden=orden, porcentaje=round(100 * imp / total, 2), importe=imp,
                       estado='completado' if fs else 'pendiente')])
            for (f, l), va in fs:
                b.insertar('factura_linea_hitos', [dict(factura_linea_id=l['id'], hito_cobro_id=tid, importe=va, como='a_mano')])
                if f['oportunidad_id'] != o['id']: b.actualizar('facturas?id=eq.' + f['id'], {'oportunidad_id': o['id']})
    print(num, o['nombre'])

x = bal_h[0]
for orden, (f, l) in enumerate(bal_f, 1):
    tid = str(uuid.uuid4())
    b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=x['linea_facturacion_id'], hito='entrega', orden=orden, importe=float(l['base']), estado='completado',
               hito_padre_id=x['id'], notas='Accesalia %s/1-%s: trozo del adelanto de 6.500 (Mónica, %s).' % (f['anio'], f['numero'], HOY))])
    b.insertar('factura_linea_hitos', [dict(factura_linea_id=l['id'], hito_cobro_id=tid, importe=float(l['base']), como='a_mano')])
b.actualizar('hitos_cobro?id=eq.' + x['id'], {'estado': 'completado'})
tid = sj_h[0]['id']
b.actualizar('hitos_cobro?id=eq.' + tid, dict(hito='adjudicacion', importe=1141.30, estado='completado',
             notas='1 %% del PEM del presupuesto firmado con la contrata elegida (Accesalia 2024/1-129; Mónica, %s).' % HOY))
b.insertar('factura_linea_hitos', [dict(factura_linea_id=sj_f[1]['id'], hito_cobro_id=tid, importe=1141.30, como='a_mano')])
if sj_f[0]['oportunidad_id'] != sj_o['id']: b.actualizar('facturas?id=eq.' + sj_f[0]['id'], {'oportunidad_id': sj_o['id']})
print('ESCRITO')
