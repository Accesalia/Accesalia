# -*- coding: utf-8 -*-
"""ROSERSESE: las obras de 2020-2023 con facturas sueltas (Mónica: «Rosersese antiguos sin papel -> nota de
responsabilidad»; 19-oct: buscado antes el papel — en Drive y Dropbox solo hay los presupuestos/contratos de Rosersese
con la comunidad y las actas, ninguna hoja nuestra). Una NOTA por obra con su proyecto y su CSS; en las que ya tenían
nota u hoja (Santurce 1, Río Llobregat 10, Río Tormes 2, Navas de Tolosa 7) se AÑADE la línea que faltaba.
Proyecto de 2020-22: 3.000 de una vez (o en tercios de 1.000); desde 2023: 3.500 en tercios (⅓ encargo, ⅓ entrega, ⅓
licencia); CSS 500 a la firma del acta. Valsaín 3 y 4: la Daniel 2022/1-3 (pendiente en Factusol) duplica a la Accesalia
2021/1-26 (cobrada) -> anulada, sin arqueología (como San Vicente 10).

  python scripts/facturacion/rosersese_notas.py [--escribir]
"""
import sys, os, json, uuid, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
ROS = 'f6ee2fb9-8e0a-472b-87dd-7af19478da77'
b = arrancar()


def _reintentos(fn):  # cortes de red (502): se reintenta
    import time, re, urllib.error
    def envuelta(*a, **k):
        for i in range(5):
            try: return fn(*a, **k)
            except (urllib.error.URLError, RuntimeError, ConnectionError) as e:
                if i == 4 or (isinstance(e, RuntimeError) and not re.search(r'5[0-9][0-9]', str(e))): raise
                time.sleep(3 * (i + 1))
    return envuelta


for _m in ('leer', 'insertar', 'actualizar', 'borrar'): setattr(b, _m, _reintentos(getattr(b, _m)))
BLOQUE = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo')}
PRY = 'Proyecto de instalación de ascensor'


def uno(refs, hito='entrega', total=3000, texto=PRY, bloque='REDACCION PROYECTO'):
    return (texto, bloque, total, [(hito, total, refs if isinstance(refs, list) else [refs])])


def tercios(total, e, en, l):
    t = round(total / 3, 2)
    return (PRY, 'REDACCION PROYECTO', total, [('encargo', t, e), ('entrega', t, en), ('licencia', round(total - 2 * t, 2), l)])


def css(ref): return ('Coordinación de Seguridad y Salud', 'CSS', 500, [('pss', 500, [ref])])


NOTAS = [  # opp, líneas
    ('DAN-2014-006', [uno('Accesalia 2020/1-25')]),
    ('DAN-2020-007', [uno('Accesalia 2020/1-30')]),
    ('DAN-2020-084', [uno('Accesalia 2020/1-29')]),
    ('DAN-2019-045', [uno('Accesalia 2020/1-47'), css('Daniel 2023/1-30')]),
    ('DAN-2020-085', [uno('Accesalia 2020/1-48')]),
    ('DAN-2020-048', [uno('Accesalia 2020/1-58'), css('Daniel 2023/1-60')]),
    ('DAN-2020-049', [uno('Accesalia 2020/1-59')]),
    ('DAN-2019-047', [uno('Daniel 2021/1-29'), css('Daniel 2024/1-118')]),
    ('DAN-2020-039', [uno('Daniel 2021/1-48'), css('Daniel 2022/1-58')]),
    ('DAN-2020-050', [uno('Accesalia 2021/1-26'), css('Daniel 2024/1-91')]),
    ('DAN-2022-302', [uno('Daniel 2022/1-19'), css('Daniel 2022/1-59')]),
    ('DAN-2021-001', [uno('Daniel 2022/1-20'), uno('Daniel 2023/1-81', total=1000, texto='Ampliación de proyecto (modificación de la rampa exterior)')]),
    ('DAN-2022-087', [tercios(3000, ['Daniel 2022/1-23'], ['Daniel 2024/1-75'], []), css('Daniel 2024/1-125')]),
    ('DAN-2021-076', [uno('Daniel 2022/1-49'), css('Daniel 2022/1-102')]),
    ('DAN-2020-047', [uno('Daniel 2022/1-48'), css('Daniel 2023/1-31')]),
    ('DAN-2023-094', [tercios(3500, ['Daniel 2023/1-3'], ['Daniel 2023/1-15'], ['Daniel 2023/1-27']), css('Daniel 2023/1-32')]),
    ('DAN-2023-316', [tercios(3500, ['Daniel 2023/1-9'], ['Daniel 2023/1-14'], []), css('Daniel 2024/1-142')]),
    ('DAN-2020-045', [uno('Daniel 2024/1-67', hito='licencia')]),
]
ANADIR = [  # hoja que ya existe, líneas
    ('HE-2025-0785', [tercios(3500, ['Daniel 2023/1-36'], ['Daniel 2023/1-49'], ['Daniel 2023/1-62'])]),
    ('HE-2022-0180', [css('Daniel 2023/1-40')]),
    ('HE-2022-0182', [css('Daniel 2024/1-50')]),
    ('HE-2022-0181', [css('Daniel 2024/1-141')]),
]
fs = b.leer('facturas?select=id,empresa_emisora,anio,numero,fecha,estado,notas,oportunidad_id,lineas:factura_lineas(id,base,enl:factura_linea_hitos(hito_cobro_id))'
            '&pagador_nombre=ilike.*roser*&tipo=eq.factura')
REF = {'%s %s/1-%s' % (f['empresa_emisora'].capitalize(), f['anio'], f['numero']): f for f in fs}


def linea(ref):
    f = REF[ref]
    assert f['estado'] != 'anulada', ref
    ls = [l for l in f['lineas'] if float(l['base'] or 0) > 0]
    assert len(ls) == 1 and not ls[0]['enl'], ref
    return f, ls[0]


def montar(lineas):
    out = []
    for texto, bloque, total, pagos in lineas:
        pg = []
        for h, imp, refs in pagos:
            tz = [linea(r) for r in refs]
            assert sum(float(l['base']) for _, l in tz) <= imp + 1.01, (texto, h)
            pg.append((h, imp, tz))
        out.append((texto, bloque, total, pg))
    return out


plan = [(b.leer('oportunidades?select=id,codigo,nombre,comunidad_id&codigo=eq.' + c)[0], montar(ls)) for c, ls in NOTAS]
anadir = [(b.leer('hojas_encargo?select=id,oportunidad_id,emisor&numero_hoja=eq.' + n)[0], n, montar(ls)) for n, ls in ANADIR]
d3 = REF['Daniel 2022/1-3']
assert d3['estado'] != 'anulada' and not any(l['enl'] for l in d3['lineas'])
for o, ls in plan: print('nota  %-40s %s' % (o['nombre'][:40], ' + '.join('%s %g' % (l[0][:20], l[2]) for l in ls)))
for h, n, ls in anadir: print('añadir %s %s' % (n, ' + '.join('%s %g' % (l[0][:20], l[2]) for l in ls)))
print('anular Daniel 2022/1-3 (duplicada de Accesalia 2021/1-26)')
if not ESCRIBIR:
    print('EN SECO'); sys.exit()


def escribir_lineas(hid, opp, emisor, lineas, nota):
    for texto, bloque, total, pg in lineas:
        lid = str(uuid.uuid4())
        b.insertar('lineas_facturacion', [dict(id=lid, hoja_encargo_id=hid, bloque_id=BLOQUE[bloque], descripcion=texto, importe=total, es_porcentaje=False, notas=nota,
                   origen='nota_responsabilidad', verificado=True, emisor=emisor, pagador_tipo='contrata', pagador_id=ROS, forma_cobro='transferencia', creada_por=MONICA)])
        for orden, (h, imp, tz) in enumerate(pg, 1):
            cob = sum(float(l['base']) for _, l in tz)
            tid = str(uuid.uuid4())
            b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=lid, hito=h, orden=orden, porcentaje=round(100 * imp / total, 2), importe=imp,
                       estado='completado' if tz and cob >= imp - 1.01 else ('parcial' if tz else 'pendiente'))])
            for f, l in tz:
                b.insertar('factura_linea_hitos', [dict(factura_linea_id=l['id'], hito_cobro_id=tid, importe=float(l['base']), como='a_mano')])
                if f['oportunidad_id'] != opp: b.actualizar('facturas?id=eq.' + f['id'], {'oportunidad_id': opp})


for o, ls in plan:
    refs = sorted({'%s %s/1-%s' % (f['empresa_emisora'].capitalize(), f['anio'], f['numero']) for _, _, _, pg in ls for _, _, tz in pg for f, _ in tz})
    fechas = [f['fecha'] for _, _, _, pg in ls for _, _, tz in pg for f, _ in tz]
    emis = {f['empresa_emisora'] for _, _, _, pg in ls for _, _, tz in pg for f, _ in tz}
    emisor = 'daniel_autonomo' if emis == {'daniel'} else 'accesalia'
    fecha = min(fechas)
    nota = ('Rosersese, encargo anterior a las hojas con contrata: sin papel nuestro (en Drive y Dropbox solo están el presupuesto/contrato de '
            'Rosersese con la comunidad y las actas). Consta por sus facturas: %s (Mónica, %s).' % (', '.join(refs), HOY))
    req = urllib.request.Request(b.url + '/rest/v1/rpc/siguiente_codigo', data=json.dumps({'p_tipo': 'HE', 'p_anio': int(fecha[:4])}).encode(),
                                 headers=dict(b.cab, **{'Content-Type': 'application/json'}), method='POST')
    num = json.loads(urllib.request.urlopen(req).read())
    hid, vid = str(uuid.uuid4()), str(uuid.uuid4())
    b.insertar('hojas_encargo', [dict(id=hid, numero_hoja=num, oportunidad_id=o['id'], comunidad_id=o['comunidad_id'], pagador_tipo='contrata', pagador_contrata_id=ROS,
               emisor=emisor, fecha_creacion=fecha, fecha_firma=fecha, estado='devuelta_firmada', fecha_estado=fecha + 'T00:00:00+00:00',
               tipo_documento='nota_responsabilidad', responsable_id=MONICA, motivo_sin_firma=nota, descripcion='Nota de responsabilidad · Rosersese · ' + o['nombre'])])
    b.insertar('versiones_hoja', [dict(id=vid, hoja_encargo_id=hid, numero_version=1, fecha_generada=fecha, importe_base=sum(l[2] for l in ls), iva_porcentaje=21, notas=nota,
               forma_pago='Rosersese: proyecto de una vez (2020-22) o ⅓ encargo, ⅓ entrega, ⅓ licencia; CSS a la firma del acta')])
    b.actualizar('hojas_encargo?id=eq.' + hid, {'version_firmada_id': vid})
    escribir_lineas(hid, o['id'], emisor, ls, nota)
    print(num, o['nombre'])
for h, n, ls in anadir:
    escribir_lineas(h['id'], h['oportunidad_id'], h['emisor'], ls, 'Añadida: constaba por su factura, sin línea en esta hoja (Mónica, %s).' % HOY)
    print('añadida a', n)
b.actualizar('facturas?id=eq.' + d3['id'], {'estado': 'anulada', 'notas': '\n'.join(x for x in (d3['notas'],
             'Anulada: duplica a la Accesalia 2021/1-26 (mismo proyecto de Valsaín 3 y 4, cobrada); esta seguía pendiente en Factusol. Sin arqueología (Mónica, %s).' % HOY) if x)})
print('ESCRITO')
