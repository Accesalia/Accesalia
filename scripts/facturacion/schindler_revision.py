# -*- coding: utf-8 -*-
"""SCHINDLER: revisión de sus hojas (Mónica, 19-oct-2026: «adelante con 1, 2, 6 y 5»; el 4, «fallo al hacer la factura,
nos deben dinero»). Lo que manda es el PAPEL firmado («como dice el papel») y la factura.

  1. Las 46 órdenes de compra guardadas como hojas vacías: el papel pasa a la hoja de verdad de su opp (con sus códigos
     anotados) y el duplicado se archiva. Si la opp tiene proyecto y subvención, la orden va a la de subvención solo si su
     papel dice SUBV.
  2. Diario la Nación 18 y 20: la Daniel 2025/1-6 (3.960) cobra las dos subvenciones -> 1.980 a cada una.
  4. Hermenegildo Bielsa 27: la Daniel 2026/1-46 dice «50 % de 5.500» pero cobró 2.250 -> la primera mitad es 2.750 y
     quedan 500 por facturar (nos los deben); fuera el enlace de la subvención a la Daniel 2026/1-35, anulada.
  5. Colmenar Viejo 8 y Magdalena 3: la segunda factura dice «primera mitad» por error de copia, pero es la de la entrega
     -> la entrega, facturada.
  6. Lo que dice el papel se queda; las dos sin forma de pago (Valdevarnes 4, Virgen del Val 47): «otro» -> a la entrega.

  python scripts/facturacion/schindler_revision.py [--escribir]
"""
import sys, os, re, uuid, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
b = arrancar()


def junta(*v): return '\n'.join(x for x in v if x)


def hoja(n): return b.leer('hojas_encargo?select=id,oportunidad_id,version_firmada_id,descripcion,codigo_anterior&numero_hoja=eq.' + n)[0]


def lineas(h): return b.leer('lineas_facturacion?select=id,descripcion,importe&quitada_en=is.null&hoja_encargo_id=eq.' + h['id'])


def hitos(l): return b.leer('hitos_cobro?select=id,hito,importe,estado,hito_padre_id,notas,enl:factura_linea_hitos(factura_linea_id,importe,'
                            'fl:factura_linea_id(f:factura_id(anio,numero,estado)))&linea_facturacion_id=eq.' + l['id'])


# ---------------------------------------------------------------- 1. órdenes de compra -> su hoja
sch = [c['id'] for c in b.leer('contratas?select=id&nombre=ilike.*schindler*')]
todas = b.leer('hojas_encargo?select=id,numero_hoja,oportunidad_id,estado,descripcion,codigo_anterior,version_firmada_id'
               '&pagador_contrata_id=in.(%s)&order=numero_hoja' % ','.join(sch))
con = {}
for h in todas:
    ls = lineas(h)
    h['lineas'] = ls
    if ls: con.setdefault(h['oportunidad_id'], []).append(h)
pares = []
for h in todas:
    if h['lineas'] or h['estado'] == 'archivada': continue
    vv = b.leer('versiones_hoja?select=id,notas,pdfs_firmados&hoja_encargo_id=eq.' + h['id'])
    assert len(vv) == 1, h['numero_hoja']
    cands = con.get(h['oportunidad_id'], [])
    es_subv = bool(re.search(r'subv', (vv[0]['notas'] or '') + h['descripcion'], re.I))
    def de_subv(c): return all(re.search(r'subvenc', l['descripcion'], re.I) for l in c['lineas'])
    elegidas = [c for c in cands if de_subv(c) == es_subv and (es_subv or any(re.search(r'proyecto|plataforma|ascensor|cota|informe|transforma|memoria|sustituc', l['descripcion'], re.I) for l in c['lineas']))] or cands
    assert elegidas, h['numero_hoja']
    buena = sorted(elegidas, key=lambda c: c['numero_hoja'])[0]
    pares.append((h, vv[0], buena))
    print('1. %s -> %s%s' % (h['numero_hoja'], buena['numero_hoja'], ' (de %d)' % len(cands) if len(cands) > 1 else ''))

# ---------------------------------------------------------------- 2. Diario la Nación
d18, d20 = hoja('HE-2024-0185'), hoja('HE-2024-0186')
h18 = [x for x in hitos(lineas(d18)[0]) if x['estado'] != 'anulado']
h20 = [x for x in hitos(lineas(d20)[0]) if x['estado'] != 'anulado']
assert len(h18) == 1 and len(h18[0]['enl']) == 1 and float(h18[0]['enl'][0]['importe']) == 3960 and len(h20) == 1 and not h20[0]['enl']
print('2. Diario la Nación: 3.960 -> 1.980 + 1.980')

# ---------------------------------------------------------------- 4. Hermenegildo Bielsa
hb = hoja('HE-2025-0333')
hb_l = lineas(hb)
pry = [l for l in hb_l if 'PROYECTO' in l['descripcion'].upper() and 'SUBVENC' not in l['descripcion'].upper()][0]
sub = [l for l in hb_l if 'SUBVENC' in l['descripcion'].upper()][0]
enc = [x for x in hitos(pry) if x['hito'] == 'encargo' and not x['hito_padre_id']][0]
assert float(enc['importe']) == 2250 and len(enc['enl']) == 1
anul = [(e['factura_linea_id'], x['id']) for x in hitos(sub) for e in x['enl'] if e['fl']['f']['estado'] == 'anulada']
assert len(anul) == 1
print('4. Hermenegildo: encargo 2.250 -> 2.750 (2.250 facturado + 500 por facturar); fuera la 2026/1-35 anulada')

# ---------------------------------------------------------------- 5. entrega facturada
entregas = []
for n in ('HE-2026-0412', 'HE-2026-0542'):
    for l in lineas(hoja(n)):
        for x in hitos(l):
            if x['hito'] == 'entrega' and x['enl'] and x['estado'] == 'pendiente': entregas.append(x['id']); print('5.', n, 'entrega', x['importe'], '-> completado')

# ---------------------------------------------------------------- 6. «otro» sin forma de pago -> a la entrega
otros = []
for n in ('HE-2025-0125', 'HE-2022-0166', 'HE-2022-0167'):
    for l in lineas(hoja(n)):
        for x in hitos(l):
            if x['hito'] == 'otro' and x['estado'] != 'anulado': otros.append(x['id']); print('6.', n, 'otro -> entrega', x['importe'])
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

for h, vv, buena in pares:
    gid = buena['version_firmada_id'] or b.leer('versiones_hoja?select=id&order=numero_version.desc&limit=1&hoja_encargo_id=eq.' + buena['id'], False)[0]['id']
    gv = b.leer('versiones_hoja?select=id,notas,pdfs_firmados&id=eq.' + gid)[0]
    nuevos = [p for p in (vv['pdfs_firmados'] or []) if p not in (gv['pdfs_firmados'] or [])]
    codigos = h['descripcion'].split(' · ')[0]
    b.actualizar('versiones_hoja?id=eq.' + gv['id'], {'pdfs_firmados': (gv['pdfs_firmados'] or []) + nuevos, 'notas': junta(gv['notas'],
                 'Orden de compra de Schindler: %s. Papel guardado antes aparte como %s%s (Mónica, %s).'
                 % (codigos, h['numero_hoja'], ' / ' + h['codigo_anterior'] if h['codigo_anterior'] else '', HOY))})
    b.actualizar('versiones_hoja?id=eq.' + vv['id'], {'notas': junta(vv['notas'],
                 'DUPLICADO de %s: era solo el papel de la orden de compra de Schindler; está ahora en esa hoja (Mónica, %s).' % (buena['numero_hoja'], HOY))})
    b.actualizar('hojas_encargo?id=eq.' + h['id'], {'estado': 'archivada', 'fecha_estado': HOY + 'T00:00:00+00:00'})
# 2
e = h18[0]['enl'][0]
b.actualizar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (e['factura_linea_id'], h18[0]['id']), {'importe': 1980.0})
b.actualizar('hitos_cobro?id=eq.' + h18[0]['id'], {'importe': 1980.0, 'estado': 'completado',
             'notas': junta(h18[0]['notas'], 'La Daniel 2025/1-6 (3.960) cobra Diario la Nación 18 y 20, 1.980 cada una (Mónica, %s).' % HOY)})
b.insertar('factura_linea_hitos', [dict(factura_linea_id=e['factura_linea_id'], hito_cobro_id=h20[0]['id'], importe=1980.0, como='a_mano')])
b.actualizar('hitos_cobro?id=eq.' + h20[0]['id'], {'estado': 'completado',
             'notas': junta(h20[0]['notas'], 'Cobrado con la Daniel 2025/1-6, que cobra Diario la Nación 18 y 20 (Mónica, %s).' % HOY)})
# 4
fe = enc['enl'][0]['factura_linea_id']
b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (fe, enc['id']))
b.actualizar('hitos_cobro?id=eq.' + enc['id'], {'importe': 2750.0, 'porcentaje': 50, 'estado': 'parcial', 'notas': junta(enc['notas'],
             'Primera mitad = 50 %% de 5.500 = 2.750. La Daniel 2026/1-46 lo dice pero cobró 2.250: fallo al hacer la factura, nos deben 500 (Mónica, %s).' % HOY)})
tid = str(uuid.uuid4())
b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=pry['id'], hito='encargo', orden=1, importe=2250.0, estado='completado', hito_padre_id=enc['id'],
           notas='Daniel 2026/1-46.')])
b.insertar('factura_linea_hitos', [dict(factura_linea_id=fe, hito_cobro_id=tid, importe=2250.0, como='a_mano')])
b.insertar('hitos_cobro', [dict(id=str(uuid.uuid4()), linea_facturacion_id=pry['id'], hito='encargo', orden=2, importe=500.0, estado='pendiente',
           hito_padre_id=enc['id'], notas='Por facturar: la Daniel 2026/1-46 se hizo por 2.250 en vez de 2.750 (Mónica, %s).' % HOY)])
b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % anul[0])
# 5
for i in entregas: b.actualizar('hitos_cobro?id=eq.' + i, {'estado': 'completado'})
# 6
for i in otros: b.actualizar('hitos_cobro?id=eq.' + i, {'hito': 'entrega'})
print('ESCRITO')
