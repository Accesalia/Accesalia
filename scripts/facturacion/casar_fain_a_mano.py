# -*- coding: utf-8 -*-
"""FACTURAS DE FAIN SUELTAS, casadas a mano (Monica, 12-oct-2026: "vamos con las de FAIN, seguro que podemos casarlas
a mano"), con la norma de FAIN (proyecto 50/30/20, CSS 80/20) y "manda la factura":
  Cadalso de los Vidrios 2 (2025/61): PD-2022-0007 -> 520 "importe restante" al CFO del proyecto (era 700) y 120 al
     CFO de la CSS (el pedido estaba; el analisis no lo veia por la comunidad fusionada)
  Paular 5 (2026/213, 120 = 20 % de 600): CFO de la CSS de PD-2025-0023
  Padilla 4 (2025/124, 480 = 80 % de 600): PD-2023-0011 no tenia lineas -> CSS 600 (80/20)
  Santa Virgilia 20 (2026/163, 1.200 = 30 % de 4.000): PD-2023-0016 no tenia lineas -> proyecto 4.000 (50/30/20)
  Isla Cristina 1 (2025/379, 1.000): el estudio tecnico de HE-2025-0507
  Severo Ochoa 10 (2025/111, 1.550 = 50 % de 3.100): la entrega de HE-2024-0175 (la factura dice "Severo Ocha")
  python scripts/facturacion/casar_fain_a_mano.py [--escribir]
"""
import sys, os, json, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
M = '(Monica, %s)' % HOY
b = arrancar()
FAIN = b.leer('contratas?nombre=eq.FAIN&select=id')[0]['id']
BL = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo&order=id')}
ya = {x['hito_cobro_id'] for x in b.leer('factura_linea_hitos?select=hito_cobro_id&order=factura_linea_id,hito_cobro_id')}


def crear(tabla, fila):
    cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
    req = urllib.request.Request(b.url + '/rest/v1/' + tabla, method='POST', headers=cab, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'))
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))[0]['id']


def lfac(anio, num, importe):
    f = b.leer('facturas?empresa_emisora=eq.accesalia&anio=eq.%s&serie=eq.1&numero=eq.%s&select=id,estado' % (anio, num))[0]
    ls = [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base&order=posicion' % f['id']) if l['base'] and abs(float(l['base']) - importe) < 0.01]
    assert len(ls) == 1, (anio, num, importe, ls)
    return f['estado'], ls[0]


def hito(hoja, palabra, tipo):
    h = b.leer('hojas_encargo?numero_hoja=eq.%s&select=id' % hoja)[0]['id']
    out = [x for l in b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&select=id,descripcion&order=id' % h) if palabra in (l['descripcion'] or '').upper()
           for x in b.leer('hitos_cobro?linea_facturacion_id=eq.%s&hito=eq.%s&hito_padre_id=is.null&select=id,importe&order=orden' % (l['id'], tipo)) if x['id'] not in ya]
    assert len(out) == 1, (hoja, palabra, tipo, out)
    return out[0]


def casar(fac, h, nota=None):
    est, l = fac
    nuevo = float(l['base'])
    print('   %s -> hito %s%s' % (l['base'], h['importe'], '' if abs(float(h['importe']) - nuevo) < 0.01 else ' => %s' % nuevo))
    if not ESCRIBIR:
        return
    cambios = {'estado': 'completado'} if est == 'cobrada' else {}
    if abs(float(h['importe']) - nuevo) >= 0.01:
        cambios.update(importe=nuevo, notas=nota or 'Manda la factura: la hoja decia %s %s.' % (h['importe'], M))
    if cambios:
        b.actualizar('hitos_cobro?id=eq.%s' % h['id'], cambios)
    b.insertar('factura_linea_hitos', [{'factura_linea_id': l['id'], 'hito_cobro_id': h['id'], 'importe': nuevo, 'como': 'a_mano'}])


def linea_nueva(pedido, desc, bloque, importe, reparto):
    h = b.leer('hojas_encargo?numero_hoja=eq.%s&select=id' % pedido)[0]['id']
    print('   %s: linea nueva "%s" %s %s' % (pedido, desc, importe, reparto))
    if not ESCRIBIR:
        return {t: {'id': '?', 'importe': round(importe * p / 100, 2)} for t, p in reparto}
    lid = crear('lineas_facturacion', {'hoja_encargo_id': h, 'bloque_id': BL[bloque], 'descripcion': desc, 'importe': importe, 'es_porcentaje': False,
                                       'origen': 'factura', 'verificado': True, 'emisor': 'accesalia', 'pagador_tipo': 'contrata', 'pagador_id': FAIN,
                                       'notas': 'El pedido no tenia lineas: la pone la factura de FAIN, con su norma %s.' % M})
    out = {}
    for k, (t, p) in enumerate(reparto, 1):
        hid = crear('hitos_cobro', {'linea_facturacion_id': lid, 'hito': t, 'orden': k, 'porcentaje': p, 'importe': round(importe * p / 100, 2),
                                    'estado': 'pendiente', 'notas': 'Norma de FAIN %s.' % M})
        out[t] = {'id': hid, 'importe': round(importe * p / 100, 2)}
    return out


print('Cadalso de los Vidrios 2')
casar(lfac(2025, 61, 520.0), hito('PD-2022-0007', 'PROYECTO', 'cfo'), '"Importe restante de lo ya cobrado" al fin de obra: 520 (la hoja decia 700) %s.' % M)
casar(lfac(2025, 61, 120.0), hito('PD-2022-0007', 'SEGURIDAD', 'cfo'))
print('Paular 5')
casar(lfac(2026, 213, 120.0), hito('PD-2025-0023', 'SEGURIDAD', 'cfo'))
print('Padilla 4')
hs = linea_nueva('PD-2023-0011', 'Coordinacion de Seguridad y Salud', 'CSS', 600.0, [('pss', 80), ('cfo', 20)])
casar(lfac(2025, 124, 480.0), hs['pss'])
print('Santa Virgilia 20')
hs = linea_nueva('PD-2023-0016', 'Proyecto (pedido FAIN)', 'REDACCION PROYECTO', 4000.0, [('entrega', 50), ('licencia', 30), ('cfo', 20)])
casar(lfac(2026, 163, 1200.0), hs['licencia'], 'La factura dice "a la entrega del proyecto visado (30 %% de 4.000)" %s.' % M)
print('Isla Cristina 1')
casar(lfac(2025, 379, 1000.0), hito('HE-2025-0507', 'ESTUDIO', 'encargo'))
print('Severo Ochoa 10')
casar(lfac(2025, 111, 1550.0), hito('HE-2024-0175', 'REDACCI', 'entrega'))
print('ESCRITO' if ESCRIBIR else '(en seco)')
