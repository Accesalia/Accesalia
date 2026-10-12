# -*- coding: utf-8 -*-
"""LOS TROZOS QUE NO CABIAN (Monica, 12-oct-2026: "vamos con esos 19 trozos"), con "manda la factura":
  0076 y 0418: los 3 ultimos sextos "a la contratacion" -> la ENTREGA partida en tres (el encargo ya esta cobrado)
  0483: la 2a mitad en tres tercios de 2.500 -> ENTREGA partida en 3 x 2.500 (la hoja decia 4.250)
  0159: 826,45 + 648,55 = la entrega de TODA la hoja: resto del proyecto 605 + licencia 445 + CFO 425
  0332: entrega = 1.000 (50 % final de 2.100)       0333: encargo = 2.250 (Daniel 2026/46)
  0059: el resto (172,90) pasa a ser la 5a parte, 617,50
  0119: 30 % de 4.100 = 1.230 a la entrega: subhito de la entrega + resto
  0080: el descuento -1.500 (2026/89) del informe pericial cobrado en 2026/62: se casa y el hito queda ANULADO (neto 0)
  0781: 2026/232 tiene 1.805 (1/2 entrega SATE) y 1.735 (1/2 entrega ascensor); la de 1.805 estaba casada con el
        ascensor: cada mitad a su linea
A mano: 0114 (la 2a linea de 2026/95 es de otro proyecto) y 0180 (con 2025/16).
  python scripts/facturacion/casar_trozos.py [--escribir]
"""
import sys, os, json, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
M = '(Monica, %s: manda la factura)' % HOY
b = arrancar()
NULO = '00000000-0000-0000-0000-000000000000'


def fls(anio, num, emisor='accesalia'):
    f = b.leer('facturas?empresa_emisora=eq.%s&anio=eq.%s&serie=eq.1&numero=eq.%s&select=id,estado' % (emisor, anio, num))[0]
    ls = b.leer('factura_lineas?factura_id=eq.%s&select=id,base,concepto&order=posicion' % f['id'])
    return f['estado'], [l for l in ls if l['base']]


def fl1(anio, num, emisor='accesalia', importe=None):
    est, ls = fls(anio, num, emisor)
    if importe is not None:
        ls = [l for l in ls if abs(float(l['base']) - importe) < 0.02]
    assert len(ls) == 1, (anio, num, ls)
    return est, ls[0]


def lineas(hoja):
    h = b.leer('hojas_encargo?numero_hoja=eq.%s&select=id' % hoja)[0]['id']
    return b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&select=id,descripcion,importe&order=id' % h)


def hito(hoja, tipo, desc=None):
    out = []
    for l in lineas(hoja):
        if desc and desc not in (l['descripcion'] or '').upper():
            continue
        out += b.leer('hitos_cobro?linea_facturacion_id=eq.%s&hito=eq.%s&hito_padre_id=is.null'
                      '&select=id,linea_facturacion_id,hito,importe,estado,orden&order=orden,id' % (l['id'], tipo))
    assert len(out) == 1, (hoja, tipo, desc, out)
    return out[0]


def crear(fila):
    cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
    req = urllib.request.Request(b.url + '/rest/v1/hitos_cobro', method='POST', headers=cab,
                                 data=json.dumps([fila], ensure_ascii=False).encode('utf-8'))
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))[0]['id']


def enlazar(lin, hid, imp):
    print('      enlace %s -> %s' % (imp, hid[:8]))
    if ESCRIBIR:
        b.insertar('factura_linea_hitos', [{'factura_linea_id': lin, 'hito_cobro_id': hid, 'importe': imp, 'como': 'a_mano'}])


def partir(padre, trozos, nota, total_nuevo=None):
    """trozos: [(importe, (estado_factura, linea_factura) o None)]; quita los subhitos SIN factura y crea los nuevos"""
    hijos = b.leer('hitos_cobro?hito_padre_id=eq.%s&select=id,importe,estado&order=orden' % padre['id'])
    ids = ','.join([h['id'] for h in hijos] or [NULO])
    con = {x['hito_cobro_id'] for x in b.leer('factura_linea_hitos?select=hito_cobro_id&hito_cobro_id=in.(%s)' % ids)}
    quedan = [h for h in hijos if h['id'] in con]
    print('   partir %s %s -> %s (se quedan %d subhitos con factura)' % (padre['hito'], padre['importe'], [t[0] for t in trozos], len(quedan)))
    if not ESCRIBIR:
        return
    for h in hijos:
        if h['id'] not in con:
            b.borrar('hitos_cobro?id=eq.%s' % h['id'])
    k = len(quedan)
    for imp, fac in trozos:
        k += 1
        hid = crear({'linea_facturacion_id': padre['linea_facturacion_id'], 'hito': padre['hito'], 'orden': k, 'importe': imp,
                     'hito_padre_id': padre['id'], 'estado': 'completado' if fac and fac[0] == 'cobrada' else 'pendiente', 'notas': nota})
        if fac:
            enlazar(fac[1]['id'], hid, imp)
    subs = b.leer('hitos_cobro?hito_padre_id=eq.%s&select=estado' % padre['id'])
    hechos = sum(1 for s in subs if s['estado'] == 'completado')
    cambios = {'estado': 'completado' if hechos == len(subs) else ('parcial' if hechos else 'pendiente')}
    if total_nuevo is not None:
        cambios.update(importe=total_nuevo, notas=nota)
    b.actualizar('hitos_cobro?id=eq.%s' % padre['id'], cambios)


def fijar(h, importe, fac, nota):
    print('   %s %s -> %s' % (h['hito'], h['importe'], importe))
    if not ESCRIBIR:
        return
    b.actualizar('hitos_cobro?id=eq.%s' % h['id'], {'importe': importe, 'notas': nota,
                                                    'estado': 'completado' if fac[0] == 'cobrada' else 'pendiente'})
    enlazar(fac[1]['id'], h['id'], importe)


print('0076')
partir(hito('HE-2025-0076', 'entrega'), [(1000.0, fl1(2025, n)) for n in (204, 259, 293)],
       'Las facturas cobran la 2a mitad en sextos "a la contratacion" %s.' % M)
print('0418')
partir(hito('HE-2025-0418', 'entrega'), [(1667.0, fl1(2026, 51)), (1667.0, fl1(2026, 81)), (1666.0, fl1(2026, 103))],
       'Las facturas cobran la 2a mitad en tres sextos de 10.000 %s.' % M)
print('0483')
partir(hito('HE-2025-0483', 'entrega', 'ENVOLVENTE'), [(2500.0, fl1(2026, n)) for n in (14, 112, 218)],
       '2a mitad en tres tercios de 2.500 (la hoja decia 4.250) %s.' % M, total_nuevo=7500.0)

print('0159')   # 826,45 + 648,55 = resto proyecto 605 + licencia 445 + CFO 425
e93, l93 = fl1(2025, 93)
e121, l121 = fl1(2025, 121)
p159 = hito('HE-2024-0159', 'entrega', 'PROYECTO')
resto = b.leer('hitos_cobro?hito_padre_id=eq.%s&estado=eq.pendiente&select=id,importe' % p159['id'])
lic = hito('HE-2024-0159', 'entrega', 'LICENCIA')
cer = hito('HE-2024-0159', 'entrega', 'CERTIFICADO')
assert len(resto) == 1 and abs(float(resto[0]['importe']) - 605) < 0.02, resto
print('   93 -> resto 605 + licencia 221,45 | 121 -> licencia 223,55 + CFO 425')
enlazar(l93['id'], resto[0]['id'], 605.0)
enlazar(l93['id'], lic['id'], 221.45)
enlazar(l121['id'], lic['id'], 223.55)
enlazar(l121['id'], cer['id'], 425.0)
if ESCRIBIR:
    for hid in (resto[0]['id'], lic['id'], cer['id']):
        b.actualizar('hitos_cobro?id=eq.%s' % hid, {'estado': 'completado',
                     'notas': 'Facturas 2025/93 y 2025/121: la entrega de toda la hoja (14 %% + 11 %% de 5.900) %s.' % M})
    b.actualizar('hitos_cobro?id=eq.%s' % p159['id'], {'estado': 'completado'})

print('0332')
fijar(hito('HE-2025-0332', 'entrega'), 1000.0, fl1(2025, 331), '"50 %% final de 2.100" = 1.000 (la hoja decia 1.050) %s.' % M)
print('0333')
fijar(hito('HE-2025-0333', 'encargo', 'REDACCI'), 2250.0, fl1(2026, 46, 'daniel', importe=2250.0), 'Encargo cobrado en 2.250 (la hoja decia 2.750) %s.' % M)

print('0059')
p59 = hito('HE-2025-0059', 'entrega', 'TOMA DE DATOS')
r59 = b.leer('hitos_cobro?hito_padre_id=eq.%s&estado=eq.pendiente&select=id,importe,hito,linea_facturacion_id' % p59['id'])
assert len(r59) == 1, r59
fijar(dict(r59[0], hito='entrega (resto)'), 617.5, fl1(2025, 272), '5a parte de la entrega: 617,50 (el resto era 172,90) %s.' % M)
if ESCRIBIR:
    b.actualizar('hitos_cobro?id=eq.%s' % p59['id'], {'importe': 2470.0, 'estado': 'completado',
                 'notas': 'Entrega cobrada en 4 partes de 617,50 (la hoja decia 2.025,40) %s.' % M})

print('0119')
f6 = fl1(2025, 6)   # 30 % de 4.100 = 30 % del proyecto (1.050) + 30 % de la CSS (180)
partir(hito('HE-2022-0119', 'entrega', 'PROYECTO'), [(1050.0, f6), (700.0, None)], '30 %% de 4.100 a la entrega: 1.050 del proyecto %s.' % M)
partir(hito('HE-2022-0119', 'entrega', 'SEGURIDAD'), [(180.0, f6), (120.0, None)], '30 %% de 4.100 a la entrega: 180 de la CSS %s.' % M)

print('0080')
e89, l89 = fl1(2026, 89, importe=-1500.0)
h80 = hito('HE-2026-0080', 'encargo')
enlazar(l89['id'], h80['id'], -1500.0)
if ESCRIBIR:
    b.actualizar('hitos_cobro?id=eq.%s' % h80['id'], {'estado': 'anulado', 'notas': 'Cobrado en 2026/62 y descontado entero en 2026/89 (neto 0) %s.' % M})

print('0781')   # 2026/232: 1.805 (SATE) + 1.735 (ascensor)
e232, _ = fls(2026, 232)
_, l1805 = fl1(2026, 232, importe=1805.0)
_, l1735 = fl1(2026, 232, importe=1735.0)
asc = hito('HE-2026-0781', 'entrega', 'ASCENSOR')
sate = hito('HE-2026-0781', 'entrega', 'SATE')
mal = b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % l1805['id'])
print('   desenlazar 1.805 del ascensor:', [m['hito_cobro_id'][:8] for m in mal])
if ESCRIBIR:
    for m in mal:
        b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (l1805['id'], m['hito_cobro_id']))
partir(asc, [(1735.0, (e232, l1735)), (1735.0, None)], '2a mitad de la entrega del ascensor (2026/232) %s.' % M)
partir(sate, [(1805.0, (e232, l1805)), (1805.0, None)], '2a mitad de la entrega del SATE (2026/232) %s.' % M)
print('ESCRITO' if ESCRIBIR else '(en seco)')
