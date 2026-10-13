# -*- coding: utf-8 -*-
"""LOS 4 "PLAZOS QUE NO ENCAJAN" (Monica, 13-oct-2026: "ok a las propuestas. Y si, la 86 se anula"):
  Pico de Artilleros 39: HE-2025-0090 (6.000) se facturo desde Daniel (2025/9, 2025/22), se anulo con abonos (3 y 4) y
     se reemitio desde Accesalia en una: 2025/191 -> encargo 3.000 + entrega 3.000.
  Castilla 13 Pinto: 2026/252 (920) dice "IEE... incluye CSS" pero es la CSS de HE-2026-0684 (920, firmada 2 dias antes)
     -> casada al plan de seguridad (se cobro a la contratacion: manda la factura).
  Calderon de la Barca 6 y 8 Leganes: hojas de 9.365 cobradas por el TOTAL (50 % adelanto, parcial por trabajos
     terminados, final a fin de obra), no por lineas. La final se casa "desde el final": CFO de DO+CSS (1.300), la 2a
     parte de la subvencion (600) y lo que falte con las entregas (IEE, luego proyecto), partiendo una si hace falta.
     El adelanto (4.682,50 = los 5 encargos) y el parcial se casaran al subir 2023-2024.
  HE-2024-0086 (Calderon 8, importe 0 y sin lineas): duplicado vacio de HE-2024-0087 -> anulada.
  python scripts/facturacion/casar_plazos_que_no_encajan.py [--escribir]
"""
import sys, os, json, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
M = '(Monica, %s: manda la factura)' % HOY
b = arrancar()
cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'


def alta(tabla, fila):
    req = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))[0]


def fl(anio, num, base):
    f = b.leer('facturas?empresa_emisora=eq.accesalia&anio=eq.%s&serie=eq.1&numero=eq.%s&select=id,estado,fecha' % (anio, num))[0]
    ls = [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base&order=posicion' % f['id']) if l['base'] and abs(float(l['base']) - base) < 0.01]
    assert len(ls) == 1 and not b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % ls[0]['id']), (anio, num, ls)
    return {'id': ls[0]['id'], 'num': '%s/%s' % (anio, num), 'fecha': f['fecha'], 'cobrada': f['estado'] == 'cobrada'}


def lineas(hoja):
    h = b.leer('hojas_encargo?numero_hoja=eq.%s&select=id' % hoja)[0]['id']
    return {l['descripcion'].upper(): (l['id'], b.leer('hitos_cobro?linea_facturacion_id=eq.%s&hito_padre_id=is.null&select=id,hito,importe,estado,orden&order=orden,id' % l['id']))
            for l in b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&select=id,descripcion&order=id' % h)}


def busca(ls, palabra, hito, n=0):
    cand = [(lid, x) for d, (lid, hs) in ls.items() if palabra in d for x in hs if x['hito'] == hito and x['importe'] is not None]
    return cand[n]


def enlazar(fac, hito_id, importe, estado='completado'):
    print('      %s %s -> %s' % (fac['num'], importe, hito_id[:8]))
    if ESCRIBIR:
        b.insertar('factura_linea_hitos', [{'factura_linea_id': fac['id'], 'hito_cobro_id': hito_id, 'importe': importe, 'como': 'a_mano'}])
        if fac['cobrada']:
            b.actualizar('hitos_cobro?id=eq.%s' % hito_id, {'estado': estado})


# 1 · Pico de Artilleros 39
print('Pico de Artilleros 39 (HE-2025-0090)')
f191 = fl(2025, 191, 6000.0)
ls = lineas('HE-2025-0090')
for t in ('encargo', 'entrega'):
    _, x = busca(ls, 'ENVOLVENTE', t)
    assert float(x['importe']) == 3000.0
    vivas = [e for e in b.leer('factura_linea_hitos?hito_cobro_id=eq.%s&select=factura_linea_id' % x['id'])
             if b.leer('facturas?id=eq.%s&select=estado' % b.leer('factura_lineas?id=eq.%s&select=factura_id' % e['factura_linea_id'])[0]['factura_id'])[0]['estado'] != 'anulada']
    assert not vivas, ('factura viva', t)
    enlazar(f191, x['id'], 3000.0)
    if ESCRIBIR:
        b.actualizar('hitos_cobro?id=eq.%s' % x['id'], {'notas': 'Facturado por Daniel (2025/9, 2025/22), anulado con abonos 3 y 4 y reemitido por Accesalia en la 2025/191 %s.' % M})

# 2 · Castilla 13 Pinto
print('Castilla 13 Pinto (HE-2026-0684, CSS)')
f252 = fl(2026, 252, 920.0)
_, x = busca(lineas('HE-2026-0684'), 'SEGURIDAD', 'pss')
assert float(x['importe']) == 920.0
enlazar(f252, x['id'], 920.0)
if ESCRIBIR:
    b.actualizar('hitos_cobro?id=eq.%s' % x['id'], {'notas': 'Facturada a la contratacion (2026/252; su texto dice "IEE... incluye CSS", copiado) %s.' % M})

# 3 · Calderon de la Barca 6 y 8: la final, desde el final
ORDEN = [('DIRECCI', 'cfo'), ('SUBVENCIONES', None), ('IEE', 'entrega'), ('PROYECTO VISADO', 'entrega'), ('CERTIFICADO', 'entrega')]
for hoja, (anio, num, base), previas in (('HE-2023-0093', (2026, 119, 2600.0), '2023/204 (4.682,50) y 2024/120 (2.082,50)'),
                                         ('HE-2024-0087', (2026, 87, 3800.0), '2024/150 (4.682,50) y 2024/199 (882,50)')):
    print('Calderon de la Barca %s: %s %s desde el final' % (hoja, num, base))
    fac = fl(anio, num, base)
    ls = lineas(hoja)
    queda = base
    for palabra, hito in ORDEN:
        if queda < 0.005:
            break
        lid, hs = [(lid, hs) for d, (lid, hs) in ls.items() if palabra in d][0]
        if hito is None:      # la 2a parte de la subvencion: el hito con importe que no es el encargo
            x = [h for h in hs if h['hito'] != 'encargo' and h['importe'] is not None][0]
        else:
            x = [h for h in hs if h['hito'] == hito][0]
        imp = float(x['importe'])
        nota = 'Factura final %s "por final de obra" (cobrada por el total de 9.365; antes %s) %s.' % (fac['num'], previas, M)
        if imp <= queda + 0.005:
            enlazar(fac, x['id'], imp)
            if ESCRIBIR:
                b.actualizar('hitos_cobro?id=eq.%s' % x['id'], {'notas': nota})
            queda = round(queda - imp, 2)
        else:
            print('   subhito de %s %s: %s' % (x['hito'], imp, queda))
            if ESCRIBIR:
                s = alta('hitos_cobro', {'linea_facturacion_id': lid, 'hito_padre_id': x['id'], 'hito': x['hito'], 'orden': 1, 'importe': queda,
                                         'estado': 'pendiente', 'notas': 'Subhito: factura accesalia %s (%s). %s' % (fac['num'], fac['fecha'], nota)})
                enlazar(fac, s['id'], queda)
                b.actualizar('hitos_cobro?id=eq.%s' % x['id'], {'estado': 'parcial'})
            else:
                print('      %s %s -> (subhito nuevo)' % (fac['num'], queda))
            queda = 0
    assert queda < 0.005, queda

# 4 · HE-2024-0086: duplicado vacio
h86 = b.leer('hojas_encargo?numero_hoja=eq.HE-2024-0086&select=id,estado,version_firmada_id')[0]
assert not b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&select=id' % h86['id'])
print('HE-2024-0086 (%s): anulada, duplicado vacio de HE-2024-0087' % h86['estado'])
if ESCRIBIR:
    b.actualizar('hojas_encargo?id=eq.' + h86['id'], {'estado': 'anulada', 'fecha_estado': HOY + 'T00:00:00+00:00'})
    if h86['version_firmada_id']:
        v = b.leer('versiones_hoja?id=eq.%s&select=notas' % h86['version_firmada_id'])[0]
        b.actualizar('versiones_hoja?id=eq.' + h86['version_firmada_id'],
                     {'notas': ((v['notas'] or '') + ' | DUPLICADO VACIO de HE-2024-0087 (importe 0, sin lineas): anulada (Monica, %s).' % HOY).strip(' |')})
print('ESCRITO' if ESCRIBIR else '(en seco)')
