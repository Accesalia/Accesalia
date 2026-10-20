# -*- coding: utf-8 -*-
"""ANYLOR: obras de ascensor de 2020-2023 con facturas sueltas (Mónica, 20-oct-2026: «1 si»). Buscado antes el papel:
Factusol 2019-22 no tiene presupuestos a Anylor (solo sus facturas), en Drive nada de nuestros honorarios, y en Dropbox
cada obra tiene el «Presupuesto firmado» de ANYLOR con la comunidad (escaneado), no el nuestro. Una NOTA por obra con
el reparto que dicen sus facturas (manda la factura):
  - Francisco Medina 5: proyecto 3.500 (60/20/20) + CSS 800 al fin de obra.
  - Florencio García 11: proyecto 2.500 en tres pagos; el 1º (60 %, 1.500) facturado antes de 2020, no está en la app.
  - Ángel Ripoll 52, San Maximiliano 31, Iglesia 4 Coslada: solo el fin de obra (lo anterior, antes de 2020).
  - Ceferino Rodríguez 17 y los colegios Melancólicos y Alhambra: proyecto 2.500, 65 % entrega + 35 % al fin de obra
    («al fin de obra», Mónica, también en los colegios).
  - Mercedes Arteaga 45-47: ya tiene su nota (HE-2025-0786); la Accesalia 2021/1-37 (60 %) a su hito de entrega.
  - Daniel 2021/1-86, 2022/1-17 y 2022/1-108, pendientes en Factusol desde 2021-22: cobradas («si, las marcamos
    cobradas»: hasta 2023, factura = cobrada).
  python scripts/facturacion/anylor_notas.py [--escribir]
"""
import sys, os, json, uuid, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
ANY = '06f6c93d-fcb3-449d-ba51-b14175900d45'
ANTES = 'Facturado antes de 2020: no está en la app (Mónica, %s).' % HOY
b = arrancar()
BLOQUE = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo')}
PRY = 'Proyecto de instalación de ascensor'
FIN = PRY + ': fin de obra (lo anterior se facturó antes de 2020)'

# (texto, bloque, total, [(hito, importe, [(factura, base de su línea)] o ANTES)])
NOTAS = [
    ('DAN-2021-140', [(PRY, 'REDACCION PROYECTO', 3500, [('entrega', 2100, [('Daniel 2021/1-2', 2100)]), ('licencia', 700, [('Daniel 2021/1-14', 700)]),
                                                          ('cfo', 700, [('Daniel 2022/1-17', 700)])]),
                      ('Coordinación de Seguridad y Salud', 'CSS', 800, [('cfo', 800, [('Daniel 2022/1-17', 800)])])]),
    ('DAN-2018-009', [(PRY, 'REDACCION PROYECTO', 2500, [('entrega', 1500, ANTES), ('licencia', 500, [('Daniel 2021/1-84', 500)]),
                                                          ('cfo', 500, [('Daniel 2022/1-108', 500)])])]),
    ('DAN-2017-176', [(FIN, 'REDACCION PROYECTO', 600, [('cfo', 600, [('Accesalia 2020/1-16', 600)])])]),
    ('DAN-2018-058', [(FIN, 'REDACCION PROYECTO', 600, [('cfo', 600, [('Accesalia 2020/1-54', 600)])])]),
    ('DAN-2021-144', [(FIN, 'REDACCION PROYECTO', 500, [('cfo', 500, [('Daniel 2021/1-49', 500)])])]),
    ('DAN-2021-094', [(PRY, 'REDACCION PROYECTO', 2500, [('entrega', 1625, [('Daniel 2021/1-86', 1625)]), ('cfo', 875, [('Daniel 2023/1-86', 875)])])]),
    ('DAN-2021-142', [(PRY, 'REDACCION PROYECTO', 2500, [('entrega', 1625, [('Accesalia 2021/1-88', 1625)]), ('cfo', 875, [('Accesalia 2022/1-1', 875)])])]),
    ('DAN-2021-099', [(PRY, 'REDACCION PROYECTO', 2500, [('entrega', 1625, [('Accesalia 2021/1-89', 1625)]), ('cfo', 875, [('Accesalia 2022/1-6', 875)])])]),
]
COBRADAS = ['Daniel 2021/1-86', 'Daniel 2022/1-17', 'Daniel 2022/1-108']

fs = b.leer('facturas?select=id,empresa_emisora,anio,numero,fecha,estado,notas,oportunidad_id,lineas:factura_lineas(id,base,enl:factura_linea_hitos(hito_cobro_id))'
            '&pagador_nombre=ilike.*anylor*&tipo=eq.factura')
REF = {'%s %s/1-%s' % (f['empresa_emisora'].capitalize(), f['anio'], f['numero']): f for f in fs}


def linea(ref, base):
    f = REF[ref]
    assert f['estado'] != 'anulada', ref
    ls = [l for l in f['lineas'] if abs(float(l['base'] or 0) - base) < 0.01 and not l['enl']]
    assert len(ls) == 1, (ref, base)
    return f, ls[0]


plan = []
for cod, lineas in NOTAS:
    o = b.leer('oportunidades?select=id,codigo,nombre,comunidad_id&codigo=eq.' + cod)[0]
    assert not b.leer('hojas_encargo?select=id&oportunidad_id=eq.' + o['id'], False), cod
    ls = [(t, bl, tot, [(h, imp, x if x == ANTES else [linea(r, base) for r, base in x]) for h, imp, x in pg]) for t, bl, tot, pg in lineas]
    for t, bl, tot, pg in ls: assert abs(sum(imp for _, imp, _ in pg) - tot) < 0.01, (cod, t)
    plan.append((o, ls))
    print('nota %-13s %-40s %s' % (cod, o['nombre'][:40], ' + '.join('%s %g [%s]' % (t[:22], tot, ', '.join('%s %g' % (h, i) for h, i, _ in pg)) for t, _, tot, pg in ls)))

# Mercedes Arteaga: su nota ya existe
ma_f, ma_l = linea('Accesalia 2021/1-37', 1500)
h0786 = b.leer('hojas_encargo?select=id,oportunidad_id&numero_hoja=eq.HE-2025-0786')[0]
ma_h = [x for l in b.leer('lineas_facturacion?select=id&quitada_en=is.null&hoja_encargo_id=eq.' + h0786['id'])
        for x in b.leer('hitos_cobro?select=id,importe,estado&hito=eq.entrega&linea_facturacion_id=eq.' + l['id'])]
assert len(ma_h) == 1 and ma_h[0]['estado'] == 'pendiente' and abs(float(ma_h[0]['importe']) - 1500) < 0.01
print('HE-2025-0786 entrega 1500 <- Accesalia 2021/1-37')
for r in COBRADAS: print('cobrada:', r, REF[r]['estado'])
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

for o, ls in plan:
    refs = sorted({'%s %s/1-%s' % (f['empresa_emisora'].capitalize(), f['anio'], f['numero']) for _, _, _, pg in ls for _, _, tz in pg if tz != ANTES for f, _ in tz})
    fechas = [f['fecha'] for _, _, _, pg in ls for _, _, tz in pg if tz != ANTES for f, _ in tz]
    emis = {f['empresa_emisora'] for _, _, _, pg in ls for _, _, tz in pg if tz != ANTES for f, _ in tz}
    emisor = 'daniel_autonomo' if emis == {'daniel'} else 'accesalia'
    fecha = min(fechas)
    nota = ('Anylor, obra de 2020-23 sin papel nuestro (en Dropbox solo está el presupuesto de obra de Anylor con la comunidad; '
            'en Factusol y Drive, nada). Consta por sus facturas: %s (Mónica, %s).' % (', '.join(refs), HOY))
    req = urllib.request.Request(b.url + '/rest/v1/rpc/siguiente_codigo', data=json.dumps({'p_tipo': 'HE', 'p_anio': int(fecha[:4])}).encode(),
                                 headers=dict(b.cab, **{'Content-Type': 'application/json'}), method='POST')
    num = json.loads(urllib.request.urlopen(req).read())
    hid, vid = str(uuid.uuid4()), str(uuid.uuid4())
    b.insertar('hojas_encargo', [dict(id=hid, numero_hoja=num, oportunidad_id=o['id'], comunidad_id=o['comunidad_id'], pagador_tipo='contrata', pagador_contrata_id=ANY,
               emisor=emisor, fecha_creacion=fecha, fecha_firma=fecha, estado='devuelta_firmada', fecha_estado=fecha + 'T00:00:00+00:00',
               tipo_documento='nota_responsabilidad', responsable_id=MONICA, motivo_sin_firma=nota, descripcion='Nota de responsabilidad · Anylor · ' + o['nombre'])])
    b.insertar('versiones_hoja', [dict(id=vid, hoja_encargo_id=hid, numero_version=1, fecha_generada=fecha, importe_base=sum(l[2] for l in ls), iva_porcentaje=21, notas=nota,
               forma_pago='Anylor: el reparto de sus facturas (60/20/20, o 65 % a la entrega y 35 % al fin de obra)')])
    b.actualizar('hojas_encargo?id=eq.' + hid, {'version_firmada_id': vid})
    for texto, bloque, total, pg in ls:
        lid = str(uuid.uuid4())
        b.insertar('lineas_facturacion', [dict(id=lid, hoja_encargo_id=hid, bloque_id=BLOQUE[bloque], descripcion=texto, importe=total, es_porcentaje=False, notas=nota,
                   origen='nota_responsabilidad', verificado=True, emisor=emisor, pagador_tipo='contrata', pagador_id=ANY, forma_cobro='transferencia', creada_por=MONICA)])
        for orden, (h, imp, tz) in enumerate(pg, 1):
            tid = str(uuid.uuid4())
            b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=lid, hito=h, orden=orden, porcentaje=round(100 * imp / total, 2), importe=imp,
                       estado='completado', notas=ANTES if tz == ANTES else None)])
            if tz == ANTES: continue
            for f, l in tz:
                b.insertar('factura_linea_hitos', [dict(factura_linea_id=l['id'], hito_cobro_id=tid, importe=float(l['base']), como='a_mano')])
                if f['oportunidad_id'] != o['id']: b.actualizar('facturas?id=eq.' + f['id'], {'oportunidad_id': o['id']})
    print(num, o['nombre'])
b.insertar('factura_linea_hitos', [dict(factura_linea_id=ma_l['id'], hito_cobro_id=ma_h[0]['id'], importe=1500.0, como='a_mano')])
b.actualizar('hitos_cobro?id=eq.' + ma_h[0]['id'], {'estado': 'completado'})
if ma_f['oportunidad_id'] != h0786['oportunidad_id']: b.actualizar('facturas?id=eq.' + ma_f['id'], {'oportunidad_id': h0786['oportunidad_id']})
# (a mano el mismo día: la Accesalia 2025/1-84, licencia de Mercedes Arteaga, ya colgaba de la nota pero no tenía opp -> DAN-2021-036)
for r in COBRADAS:
    f = REF[r]
    b.actualizar('facturas?id=eq.' + f['id'], {'estado': 'cobrada', 'notas': '\n'.join(x for x in (f['notas'],
                 'Cobrada: seguía pendiente en Factusol desde %s; hasta 2023, factura = cobrada (Mónica, %s).' % (f['anio'], HOY)) if x)})
print('ESCRITO')
