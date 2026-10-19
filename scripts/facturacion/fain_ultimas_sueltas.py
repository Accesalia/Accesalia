# -*- coding: utf-8 -*-
"""FAIN y Paular 5: lo último suelto, cuadrado «sin arqueología» (Mónica, 19-oct-2026: «si se te ocurre una forma de
dejarlo cuadrado sin tener que hacer arqueología, te la compro»). Manda la factura.
  - Paular 5 (HE-2022-0057, comunidad): 2022/1-120 «50 %» -> encargo; 2022/1-210 «50 % restante» (sustituyó a la 130,
    anulada) -> entrega. Sale la 120 de la entrega, donde estaba de más.
  - Dos de Mayo 73 Móstoles: Daniel 2021/1-77 «20 % proyecto + CSS» (580 + 600) ya cobra la CSS entera: la Accesalia
    2021/1-80 (80 % CSS, ocho días antes, pendiente en Factusol) es su duplicado -> anulada. Proyecto 2.900 = 1.450 + 870 + 580.
  - Escuelas Pías 4 Alcalá: CSS 500 (400 + 100) y del proyecto solo el fin de obra, 625 (lo anterior, antes de 2020).
  - Sierra de Albarracín 17 Alcorcón: proyecto 5.500 («30 %» = 1.650); entrega = 1.650 + 1.000 (manda la factura);
    licencia 1.650 y fin de obra 1.100 pendientes.
  - Mendiguchía Carriche 27: la CSS 80 % de la Accesalia 2021/1-68 se volvió a facturar en la 2022/1-228 (la colgada):
    nota en la factura, sin anularla (lleva también el proyecto).
Pedido de FAIN con los códigos de la factura (la regla de las 58).

  python scripts/facturacion/fain_ultimas_sueltas.py [--escribir]
"""
import sys, os, re, json, uuid, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
b = arrancar()
FAIN = [c['id'] for c in b.leer('contratas?select=id,nombre&nombre=ilike.fain*') if c['nombre'].upper().startswith('FAIN')][0]
BLOQUE = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo')}


def junta(*v): return '\n'.join(x for x in v if x)


def fac(e, a, n):
    f = b.leer('facturas?select=id,estado,notas,fecha,oportunidad_id,lineas:factura_lineas(id,concepto,base,enl:factura_linea_hitos(hito_cobro_id))'
               '&origen=eq.factusol&tipo=eq.factura&empresa_emisora=eq.%s&anio=eq.%d&serie=eq.1&numero=eq.%d' % (e, a, n))[0]
    return f


def linea(f, base=None, pal=None):
    ls = [l for l in f['lineas'] if float(l['base'] or 0) > 0]
    if base: ls = [l for l in ls if abs(float(l['base']) - base) < .01]
    if pal: ls = [l for l in ls if pal in l['concepto'].lower()]
    assert len(ls) == 1, [(l['base'], l['concepto'][:30]) for l in f['lineas']]
    return ls[0]


# Paular 5
pa = b.leer('hojas_encargo?select=id&numero_hoja=eq.HE-2022-0057')[0]
pl = b.leer('lineas_facturacion?select=id&quitada_en=is.null&hoja_encargo_id=eq.' + pa['id'])[0]
ph = {x['hito']: x for x in b.leer('hitos_cobro?select=id,hito,importe,estado,enl:factura_linea_hitos(factura_linea_id)&hito_padre_id=is.null&linea_facturacion_id=eq.' + pl['id'])}
f120, f210 = fac('accesalia', 2022, 120), fac('accesalia', 2022, 210)
l120, l210 = linea(f120), linea(f210)
assert {e['factura_linea_id'] for e in ph['entrega']['enl']} == {l120['id'], l210['id']} and not ph['encargo']['enl']
# Dos de Mayo 73, Escuelas Pías 4, Sierra de Albarracín 17
d25, d43, d77, a80 = fac('daniel', 2021, 25), fac('daniel', 2021, 43), fac('daniel', 2021, 77), fac('accesalia', 2021, 80)
d38, d9 = fac('daniel', 2020, 38), fac('daniel', 2022, 9)
a82, a134 = fac('accesalia', 2022, 82), fac('accesalia', 2022, 134)
a68 = fac('accesalia', 2021, 68)
OBRAS = [  # opp, emisor, [(texto, bloque, total, [(hito, importe, [(factura, línea de factura, importe)], estado si vacío)])]
    ('DAN-2020-071', 'daniel_autonomo', [
        ('Proyecto de instalación de ascensor', 'REDACCION PROYECTO', 2900, [('entrega', 1450, [(d25, linea(d25), 1450)], 'pendiente'),
                                                                           ('licencia', 870, [(d43, linea(d43), 870)], 'pendiente'),
                                                                           ('cfo', 580, [(d77, linea(d77), 580)], 'pendiente')]),
        ('Coordinación de Seguridad y Salud', 'CSS', 600, [('pss', 600, [(d77, linea(d77), 600)], 'pendiente')])]),
    ('DAN-2019-042', 'daniel_autonomo', [
        ('Coordinación de Seguridad y Salud', 'CSS', 500, [('pss', 400, [(d38, linea(d38), 400)], 'pendiente'), ('cfo', 100, [(d9, linea(d9, 100), 100)], 'pendiente')]),
        ('Proyecto de instalación de ascensor: fin de obra (lo anterior se facturó antes de 2020)', 'REDACCION PROYECTO', 625,
         [('cfo', 625, [(d9, linea(d9, 625), 625)], 'pendiente')])]),
    ('DAN-2022-090', 'accesalia', [
        ('Proyecto de instalación de ascensor', 'REDACCION PROYECTO', 5400, [('entrega', 2650, [(a82, linea(a82), 1650), (a134, linea(a134), 1000)], 'pendiente'),
                                                                           ('licencia', 1650, [], 'pendiente'), ('cfo', 1100, [], 'pendiente')])]),
]
for f in (d25, d43, d77, d38, d9, a82, a134): assert not any(l['enl'] for l in f['lineas'] if float(l['base'] or 0) > 0), f['id']
assert a80['estado'] != 'anulada' and not any(l['enl'] for l in a80['lineas'])
print('Paular 5: 120 -> encargo, 210 -> entrega | Dos de Mayo 73, Escuelas Pías 4, Sierra de Albarracín 17: pedidos | A2021/1-80 anulada | nota en A2021/1-68')
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

# Paular 5
b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (l120['id'], ph['entrega']['id']))
b.insertar('factura_linea_hitos', [dict(factura_linea_id=l120['id'], hito_cobro_id=ph['encargo']['id'], importe=2500.0, como='a_mano')])
b.actualizar('hitos_cobro?id=eq.' + ph['encargo']['id'], {'estado': 'completado'})
# pedidos
NOTA = ('Pedido de FAIN: los códigos salen de sus facturas; cuadrado sin arqueología, manda la factura (Mónica, %s).' % HOY)
for cod, emisor, lineas in OBRAS:
    o = b.leer('oportunidades?select=id,nombre,comunidad_id&codigo=eq.' + cod)[0]
    fechas = [f['fecha'] for _, _, _, PG in lineas for _, _, tz, _ in PG for f, _, _ in tz]
    textos = ' '.join(l['concepto'] for _, _, _, PG in lineas for _, _, tz, _ in PG for _, l, _ in tz)
    cods = ' / '.join('%s %s' % (k, m.group(1)) for k, pat in (('Pedido Fain', r'pedido\s*fain\s*:?\s*(\d{6,})'), ('Grafo/Orden', r'grafo(?:/orden)?\s*:?\s*(\d{6,})'),
                       ('Pedido de compra', r'pedido\s*(?:de\s*)?compras?\s*:?\s*(\d{5,})')) for m in [re.search(pat, textos, re.I)] if m)
    fecha = min(fechas)
    req = urllib.request.Request(b.url + '/rest/v1/rpc/siguiente_codigo', data=json.dumps({'p_tipo': 'HE', 'p_anio': int(fecha[:4])}).encode(),
                                 headers=dict(b.cab, **{'Content-Type': 'application/json'}), method='POST')
    num = json.loads(urllib.request.urlopen(req).read())
    hid, vid = str(uuid.uuid4()), str(uuid.uuid4())
    b.insertar('hojas_encargo', [dict(id=hid, numero_hoja=num, oportunidad_id=o['id'], comunidad_id=o['comunidad_id'], pagador_tipo='contrata', pagador_contrata_id=FAIN,
               emisor=emisor, fecha_creacion=fecha, fecha_firma=fecha, estado='devuelta_firmada', fecha_estado=fecha + 'T00:00:00+00:00', tipo_documento='pedido',
               descripcion='Pedido FAIN (códigos de la factura) %s · %s' % (cods, o['nombre']))])
    b.insertar('versiones_hoja', [dict(id=vid, hoja_encargo_id=hid, numero_version=1, fecha_generada=fecha, fecha_enviada=fecha, importe_base=sum(x[2] for x in lineas),
               iva_porcentaje=21, notas=NOTA, forma_pago='Norma de FAIN (manda la factura)')])
    b.actualizar('hojas_encargo?id=eq.' + hid, {'version_firmada_id': vid})
    for texto, bloque, total, PG in lineas:
        lid = str(uuid.uuid4())
        b.insertar('lineas_facturacion', [dict(id=lid, hoja_encargo_id=hid, bloque_id=BLOQUE[bloque], descripcion=texto, importe=total, es_porcentaje=False, notas=NOTA,
                   origen='pedido', verificado=True, emisor=emisor, pagador_tipo='contrata', pagador_id=FAIN, forma_cobro='transferencia')])
        for orden, (hh, imp, tz, si) in enumerate(PG, 1):
            cob = sum(t[2] for t in tz)
            tid = str(uuid.uuid4())
            b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=lid, hito=hh, orden=orden, porcentaje=round(100 * imp / total, 2), importe=imp,
                       estado='completado' if tz and abs(cob - imp) < .01 else ('parcial' if tz else si))])
            if len(tz) == 1:
                b.insertar('factura_linea_hitos', [dict(factura_linea_id=tz[0][1]['id'], hito_cobro_id=tid, importe=tz[0][2], como='a_mano')])
            else:
                for f, l, imp_t in tz:
                    sid = str(uuid.uuid4())
                    b.insertar('hitos_cobro', [dict(id=sid, linea_facturacion_id=lid, hito=hh, orden=1, importe=imp_t, estado='completado', hito_padre_id=tid)])
                    b.insertar('factura_linea_hitos', [dict(factura_linea_id=l['id'], hito_cobro_id=sid, importe=imp_t, como='a_mano')])
            for f, l, _ in tz:
                if f['oportunidad_id'] != o['id']: b.actualizar('facturas?id=eq.' + f['id'], {'oportunidad_id': o['id']})
    print(num, o['nombre'])
b.actualizar('facturas?id=eq.' + a80['id'], {'estado': 'anulada', 'notas': junta(a80['notas'],
             'Anulada: duplicado de la CSS que ya cobra entera la Daniel 2021/1-77; con ella Dos de Mayo 73 cuadra exacto (Mónica, %s).' % HOY)})
b.actualizar('facturas?id=eq.' + a68['id'], {'notas': junta(a68['notas'],
             'La línea de CSS (80 %%, 480) no se cobró: se volvió a facturar en la Accesalia 2022/1-228, que es la colgada de su pago (Mónica, %s).' % HOY)})
print('ESCRITO')
