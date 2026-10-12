# -*- coding: utf-8 -*-
"""IBERLEAN y ROSERSESE (Monica, 12-oct-2026):
  Presidente Carmona 5D (Iberlean): "el B es una errata de la direccion original, corregida la 5D; ambas facturas de la
    misma opp" -> Daniel 2025/18 y 2025/42 (1.666,66) a los tercios 1 y 2 de HE-2025-0141 (el 3o, ajustado a 5.000);
    la CSS (2026/4, 850) a HE-2026-0004, que pasa a pagarla Iberlean (manda la factura).
  La Coruna 2 (Mostoles, confirmado): HE-2026-0361 (proyecto 4.880 + CSS 920) a FIRMADA (hay factura, y su PDF firmado
    esta en PRESUPUESTOS FIRMADOS), paga Rosersese; lineas y plazos de la hoja; 2026/147 (encargo) y 2026/258 (entrega).
  Santurce 1, Rio Llobregat 10, Navas de Tolosa 7, Rio Tormes 2 (Rosersese, encargos antiguos): "puede que no se
    hicieran hojas o no se guardaran; como hay factura, nota interna" -> nota de responsabilidad (Monica) con la
    factura casada.
  python scripts/facturacion/casar_iberlean_rosersese.py [--escribir]
"""
import sys, os, json, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
M = '(Monica, %s)' % HOY
b = arrancar()
cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
CON = {c['nombre']: c['id'] for c in b.leer('contratas?select=id,nombre&order=id')}
IBER, ROS = CON['IBERLEAN ACCESIBILIDAD'], CON['ROSERSESE']
MONICA = b.leer('equipo?email=eq.gerencia.accesalia@gmail.com&select=id')[0]['id']
BL = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo&order=id')}


def alta(tabla, fila):
    req = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))[0]


def rpc(nombre, args):
    req = urllib.request.Request(b.url + '/rest/v1/rpc/' + nombre, data=json.dumps(args).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))


def flinea(emisor, anio, num, base):
    f = b.leer('facturas?empresa_emisora=eq.%s&anio=eq.%s&serie=eq.1&numero=eq.%s&select=id,estado' % (emisor, anio, num))[0]
    ls = [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base' % f['id']) if l['base'] and abs(float(l['base']) - base) < 0.01]
    assert len(ls) == 1, (emisor, anio, num, base, ls)
    assert not b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % ls[0]['id']), ('ya casada', anio, num)
    return f['estado'], ls[0]


def casar(fac, hito, importe=None, nota=None):
    est, fl = fac
    v = float(fl['base'])
    print('      %s -> %s %s%s' % (fl['base'], hito['hito'], hito['importe'], '' if abs(float(hito['importe']) - v) < 0.01 else ' => %s' % v))
    if not ESCRIBIR:
        return
    cambios = {'estado': 'completado'} if est == 'cobrada' else {}
    if abs(float(hito['importe']) - v) >= 0.01:
        cambios.update(importe=v, notas=nota or 'Manda la factura: la hoja decia %s %s.' % (hito['importe'], M))
    if cambios:
        b.actualizar('hitos_cobro?id=eq.%s' % hito['id'], cambios)
    b.insertar('factura_linea_hitos', [{'factura_linea_id': fl['id'], 'hito_cobro_id': hito['id'], 'importe': v, 'como': 'a_mano'}])


def hitos_de(hoja, palabra):
    h = b.leer('hojas_encargo?numero_hoja=eq.%s&select=id' % hoja)[0]['id']
    l = [l for l in b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&select=id,descripcion&order=id' % h) if palabra in (l['descripcion'] or '').upper()]
    assert len(l) == 1, (hoja, palabra, l)
    return l[0]['id'], b.leer('hitos_cobro?linea_facturacion_id=eq.%s&hito_padre_id=is.null&select=id,hito,importe,orden&order=orden' % l[0]['id'])


# 1 · Presidente Carmona 5D (Iberlean)
print('Presidente Carmona 5D')
_, hs = hitos_de('HE-2025-0141', 'PROYECTO')
casar(flinea('daniel', 2025, 18, 1666.66), hs[0])
casar(flinea('daniel', 2025, 42, 1666.66), hs[1])
print('      3er tercio %s -> 1666.68 (para que sumen 5.000)' % hs[2]['importe'])
if ESCRIBIR:
    b.actualizar('hitos_cobro?id=eq.%s' % hs[2]['id'], {'importe': 1666.68, 'notas': 'Ajustado para que los tercios sumen 5.000 (facturas de 1.666,66) %s.' % M})
lid, hs = hitos_de('HE-2026-0004', 'SEGURIDAD')
print('   CSS: paga IBERLEAN (la hoja decia la comunidad)')
if ESCRIBIR:
    b.actualizar('lineas_facturacion?id=eq.%s' % lid, {'pagador_tipo': 'contrata', 'pagador_id': IBER, 'cuenta_id': None,
                 'notas': 'Paga IBERLEAN: la factura 2026/4 es a Iberlean (la hoja decia la comunidad) %s.' % M})
casar(flinea('accesalia', 2026, 4, 850.0), hs[0])

# 2 · La Coruna 2 Mostoles: HE-2026-0361 a firmada
print('La Coruna 2 (HE-2026-0361)')
h = b.leer('hojas_encargo?numero_hoja=eq.HE-2026-0361&select=id,estado,version_firmada_id')[0]
v = b.leer('versiones_hoja?hoja_encargo_id=eq.%s&select=id,numero_version&order=numero_version.desc&limit=1' % h['id'], por_tramos=False)[0]
f147, f258 = flinea('accesalia', 2026, 147, 1627.0), flinea('accesalia', 2026, 258, 1627.0)
print('   %s -> devuelta_firmada (version %s), paga ROSERSESE; proyecto 4.880 (1/3 encargo, entrega, licencia) + CSS 920 (pss)' % (h['estado'], v['numero_version']))
if ESCRIBIR and h['estado'] != 'devuelta_firmada':
    b.actualizar('hojas_encargo?id=eq.%s' % h['id'], {'estado': 'devuelta_firmada', 'version_firmada_id': v['id'], 'fecha_firma': '2026-05-14',
                 'fecha_estado': '2026-05-14T00:00:00+00:00', 'pagador_tipo': 'contrata', 'pagador_contrata_id': ROS})
    conc = {c['bloque_id']: c for c in b.leer('conceptos_hoja?version_hoja_id=eq.%s&desglose=eq.se_cobra&select=id,bloque_id,descripcion,importe' % v['id'])}
    lp = alta('lineas_facturacion', {'hoja_encargo_id': h['id'], 'concepto_hoja_id': conc[BL['REDACCION PROYECTO']]['id'], 'bloque_id': BL['REDACCION PROYECTO'],
                                     'descripcion': conc[BL['REDACCION PROYECTO']]['descripcion'], 'importe': 4880.0, 'es_porcentaje': False, 'origen': 'pdf',
                                     'verificado': True, 'emisor': 'accesalia', 'pagador_tipo': 'contrata', 'pagador_id': ROS, 'forma_cobro': 'transferencia',
                                     'notas': 'Hoja enviada pasada a firmada: hay factura (2026/147, 2026/258) %s.' % M})
    tercios = {}
    for k, (t, imp) in enumerate([('encargo', 1627.0), ('entrega', 1627.0), ('licencia', 1626.0)], 1):
        tercios[t] = alta('hitos_cobro', {'linea_facturacion_id': lp['id'], 'hito': t, 'orden': k, 'importe': imp, 'estado': 'pendiente',
                                          'notas': '1/3 de 4.880 (la factura redondea a 1.627) %s.' % M})
    lc = alta('lineas_facturacion', {'hoja_encargo_id': h['id'], 'concepto_hoja_id': conc[BL['CSS']]['id'], 'bloque_id': BL['CSS'],
                                     'descripcion': conc[BL['CSS']]['descripcion'], 'importe': 920.0, 'es_porcentaje': False, 'origen': 'pdf',
                                     'verificado': True, 'emisor': 'accesalia', 'pagador_tipo': 'contrata', 'pagador_id': ROS, 'forma_cobro': 'transferencia'})
    alta('hitos_cobro', {'linea_facturacion_id': lc['id'], 'hito': 'pss', 'orden': 1, 'porcentaje': 100, 'importe': 920.0, 'estado': 'pendiente'})
    casar(f147, tercios['encargo']); casar(f258, tercios['entrega'])
    b.insertar('notas_facturacion', [{'hoja_encargo_id': h['id'], 'fecha': HOY, 'origen': 'factusol', 'autor': 'Casado con Factusol',
                                      'texto': 'Estaba como enviada; hay facturas (2026/147 encargo, 2026/258 entrega, a Rosersese): se firmo. Su PDF firmado esta en PRESUPUESTOS FIRMADOS (LA CORUNA 2 MADRID ASC 14-05-2026). Paga ROSERSESE %s.' % M}])

# 3 · notas de responsabilidad de Rosersese
NOTAS = [  # opp, nombre, emisor, factura, lineas [(desc, bloque, importe, [(hito, importe)])], casar (linea, hito)
    ('DAN-2023-194', 'Santurce 1', 'daniel_autonomo', ('daniel', 2025, 2, 500.0), [('Coordinacion de Seguridad y Salud', 'CSS', 500.0, [('pss', 500.0)])], (0, 'pss')),
    ('DAN-2022-088', 'Rio Llobregat 10', 'daniel_autonomo', ('daniel', 2025, 21, 1333.0),
     [('Proyecto de instalacion de ascensor', 'REDACCION PROYECTO', 3999.0, [('encargo', 1333.0), ('entrega', 1333.0), ('licencia', 1333.0)])], (0, 'licencia')),
    ('DAN-2022-231', 'Navas de Tolosa 7', 'daniel_autonomo', ('daniel', 2026, 31, 1000.0),
     [('Proyecto de instalacion de ascensor', 'REDACCION PROYECTO', 3000.0, [('encargo', 1000.0), ('entrega', 1000.0), ('cfo', 1000.0)])], (0, 'cfo')),
    ('DAN-2022-089', 'Rio Tormes 2', 'accesalia', ('accesalia', 2026, 278, 1000.0),
     [('Proyecto de instalacion de ascensor', 'REDACCION PROYECTO', 3000.0, [('encargo', 1000.0), ('entrega', 1000.0), ('licencia', 1000.0)])], (0, 'licencia')),  # "3/3 de 3.000" = el tercer tercio
]
for opp, nombre, emisor, fac, lineas, (li, hito) in NOTAS:
    o = b.leer('oportunidades?codigo=eq.%s&select=id,comunidad_id' % opp)[0]
    fx = flinea(*fac)
    motivo = ('Encargo antiguo de ROSERSESE sin hoja de encargo guardada (en su dia no se hizo o no se guardo). Consta por la factura %s %s/%s (%s): '
              'se contrato. Lineas por el patron de Rosersese (tercios) %s.' % (fac[0], fac[1], fac[2], fac[3], M))
    print('== %s (%s): nota de responsabilidad | %s | factura %s/%s %s -> %s' % (nombre, opp, [(d, i) for d, _, i, _ in lineas], fac[1], fac[2], fac[3], hito))
    if not ESCRIBIR:
        continue
    codigo = rpc('siguiente_codigo', {'p_tipo': 'NR', 'p_anio': int(HOY[:4])})
    hh = alta('hojas_encargo', {'numero_hoja': codigo, 'tipo_documento': 'nota_responsabilidad', 'responsable_id': MONICA, 'motivo_sin_firma': motivo,
                                'oportunidad_id': o['id'], 'comunidad_id': o['comunidad_id'], 'pagador_tipo': 'contrata', 'pagador_contrata_id': ROS,
                                'emisor': emisor, 'fecha_creacion': HOY, 'fecha_firma': HOY, 'estado': 'devuelta_firmada',
                                'fecha_estado': HOY + 'T00:00:00+00:00', 'descripcion': 'Nota de responsabilidad · ROSERSESE · %s' % nombre})
    vv = alta('versiones_hoja', {'hoja_encargo_id': hh['id'], 'numero_version': 1, 'fecha_generada': HOY, 'iva_porcentaje': 21,
                                 'importe_base': sum(i for _, _, i, _ in lineas), 'notas': motivo})
    b.actualizar('hojas_encargo?id=eq.' + hh['id'], {'version_firmada_id': vv['id']})
    creados = []
    for d, bq, imp, reparto in lineas:
        lf = alta('lineas_facturacion', {'hoja_encargo_id': hh['id'], 'bloque_id': BL[bq], 'descripcion': d, 'importe': imp, 'es_porcentaje': False,
                                         'origen': 'nota_responsabilidad', 'verificado': True, 'emisor': emisor, 'pagador_tipo': 'contrata',
                                         'pagador_id': ROS, 'forma_cobro': 'transferencia'})
        hs = {}
        for k, (t, i) in enumerate(reparto, 1):
            hs[t] = alta('hitos_cobro', {'linea_facturacion_id': lf['id'], 'hito': t, 'orden': k, 'importe': i, 'estado': 'pendiente', 'notas': 'Patron de Rosersese %s.' % M})
        creados.append(hs)
    casar(fx, creados[li][hito])
    b.insertar('notas_facturacion', [{'hoja_encargo_id': hh['id'], 'fecha': HOY, 'origen': 'factusol', 'autor': 'Monica (nota de responsabilidad)', 'texto': motivo}])
    print('   ESCRITO', codigo)
print('ESCRITO' if ESCRIBIR else '(en seco)')
