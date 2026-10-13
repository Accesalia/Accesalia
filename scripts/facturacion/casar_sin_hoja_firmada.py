# -*- coding: utf-8 -*-
""""LA COMUNIDAD NO TIENE NINGUNA HOJA FIRMADA" (Monica, 13-oct-2026: "ok a todo"):
  Plaza del Paular 1 y 2 (una comunidad, una hoja por portal: "cada hoja deberia llevar sus lineas"). Se facturaron en
     paralelo y las del portal 1 se casaron con las hojas del portal 2:
       proyecto 2025/172-223-260-272 (P1) estaban en HE-2025-0059 (P2) -> pasan a HE-2025-0058 (P1); las del P2
         (2025/173-224-261-273) ocupan su sitio en HE-2025-0059.
       subvencion 2025/174-225-262-274 (P1) estaban en HE-2025-0061 (P2) -> pasan a HE-2025-0060 (P1); las del P2
         (2025/175-226-263-275) a HE-2025-0061.
       2025/102 (P2, 50 % al encargo) -> los dos encargos de HE-2025-0059.
     La entrega se reparte entre sus dos lineas: cada 617,50 = 111,25 licencia + 506,25 proyecto (el proyecto queda en
     2.025 por factura: manda la factura). Antes iba todo al proyecto y la licencia quedaba "por cobrar".
     HE-2025-0748 es la MISMA hoja que HE-2025-0058 (Paular 1, mismo encargo y misma firma): "si es seguro que esta
     duplicada, elimina la que sobra" -> anulada (sus hitos anulados) y su PDF firmado pasa a HE-2025-0058.
  Julian Besteiro 15G: HE-2025-0434 (informe pericial 1.200) enviada -> firmada (hay factura 2025/265), paga Fabio Aceto.
  Mercedes Arteaga 45-47 (ANYLOR) y Doctor Esquerdo 55 local (OSTALAZAR, "la empresa del dueno de FAIN, como es
     habitual en FAIN no hay HE"): nota de responsabilidad (Monica) con su factura casada.
  python scripts/facturacion/casar_sin_hoja_firmada.py [--escribir]
"""
import sys, os, json, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
M = '(Monica, %s)' % HOY
b = arrancar()
cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
BL = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo&order=id')}
MONICA = b.leer('equipo?email=eq.gerencia.accesalia@gmail.com&select=id')[0]['id']


def alta(tabla, fila):
    req = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))[0]


def rpc(nombre, args):
    req = urllib.request.Request(b.url + '/rest/v1/rpc/' + nombre, data=json.dumps(args).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))


def fl(num, base, anio=2025, emisor='accesalia'):
    f = b.leer('facturas?empresa_emisora=eq.%s&anio=eq.%s&serie=eq.1&numero=eq.%s&select=id,estado,fecha' % (emisor, anio, num))[0]
    ls = [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base&order=posicion' % f['id']) if l['base'] and abs(float(l['base']) - base) < 0.01]
    assert len(ls) == 1, (num, ls)
    assert f['estado'] == 'cobrada', (num, f['estado'])
    return {'id': ls[0]['id'], 'num': '%s/%s' % (anio, num), 'fecha': f['fecha']}


def enlaces(linea):
    return b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id,importe' % linea['id'])


def lineas(hoja):
    h = b.leer('hojas_encargo?numero_hoja=eq.%s&select=id' % hoja)[0]['id']
    out = {}
    for l in b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&select=id,descripcion&order=id' % h):
        clave = 'licencia' if 'LICENCIA' in l['descripcion'].upper() else 'proyecto' if 'TOMA DE DATOS' in l['descripcion'].upper() else 'subv'
        hs = b.leer('hitos_cobro?linea_facturacion_id=eq.%s&select=id,hito,importe,estado,hito_padre_id,orden&order=orden,id' % l['id'])
        out[clave] = {'id': l['id'], 'padres': {x['hito']: x for x in hs if not x['hito_padre_id']},
                      'subs': [x for x in hs if x['hito_padre_id']]}
    return h, out


def sub(linea_id, padre, orden, importe, fac, texto):
    if not ESCRIBIR:
        return {'id': '(nuevo)'}
    return alta('hitos_cobro', {'linea_facturacion_id': linea_id, 'hito_padre_id': padre['id'], 'hito': padre['hito'], 'orden': orden,
                                'importe': importe, 'estado': 'completado',
                                'notas': 'Subhito: factura accesalia %s (%s). %s %s.' % (fac['num'], fac['fecha'], texto, M)})


def enlazar(fac, hito_id, importe):
    if ESCRIBIR:
        b.insertar('factura_linea_hitos', [{'factura_linea_id': fac['id'], 'hito_cobro_id': hito_id, 'importe': importe, 'como': 'a_mano'}])


def poner(hito_id, **cambios):
    if ESCRIBIR:
        b.actualizar('hitos_cobro?id=eq.%s' % hito_id, cambios)


# ============ PLAZA DEL PAULAR ============
P1_PRY = [fl(n, 617.5) for n in (172, 223, 260, 272)]
P2_PRY = [fl(n, 617.5) for n in (173, 224, 261, 273)]
P1_SUB = [fl(n, 245.0) for n in (174, 225, 262, 274)]
P2_SUB = [fl(n, 245.0) for n in (175, 226, 263, 275)]
P2_ENC = fl(102, 2470.4)
REPARTO = 'Cada 617,50 de la entrega = 111,25 licencia + 506,25 proyecto'
for x in P2_PRY + P2_SUB + [P2_ENC]:
    assert not enlaces(x), ('P2 ya casada', x['num'])

# --- HE-2025-0059 (P2): sus subhitos de entrega del proyecto llevaban las facturas del P1
_, L59 = lineas('HE-2025-0059')
pry59, lic59 = L59['proyecto'], L59['licencia']
assert len(pry59['subs']) == 4 and float(pry59['padres']['entrega']['importe']) == 2470.0
print('HE-2025-0059 (Paular 2) proyecto:')
for s, p1, p2 in zip(sorted(pry59['subs'], key=lambda s: s['orden']), P1_PRY, P2_PRY):
    e = enlaces(p1)
    assert [x['hito_cobro_id'] for x in e] == [s['id']], (p1['num'], e, s['id'])
    print('   subhito %s: %s (P1) -> %s (P2), 617,50 -> 506,25' % (s['id'][:8], p1['num'], p2['num']))
    if ESCRIBIR:
        b.actualizar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (p1['id'], s['id']), {'factura_linea_id': p2['id'], 'importe': 506.25})
        poner(s['id'], importe=506.25, notas='Subhito: factura accesalia %s (%s). %s %s.' % (p2['num'], p2['fecha'], REPARTO, M))
poner(pry59['padres']['entrega']['id'], importe=2025.0, estado='completado',
      notas='Entrega del proyecto: 4 facturas de 506,25 (la hoja decia 2.025,40; manda la factura) %s.' % M)
for k, p2 in enumerate(P2_PRY, 1):
    print('   licencia: subhito 111,25 <- %s' % p2['num'])
    enlazar(p2, sub(lic59['id'], lic59['padres']['entrega'], k, 111.25, p2, REPARTO)['id'], 111.25)
poner(lic59['padres']['entrega']['id'], estado='completado')
print('   encargo: %s -> proyecto 2.025,40 + licencia 445' % P2_ENC['num'])
for l, imp in ((pry59, 2025.4), (lic59, 445.0)):
    assert float(l['padres']['encargo']['importe']) == imp
    enlazar(P2_ENC, l['padres']['encargo']['id'], imp)
    poner(l['padres']['encargo']['id'], estado='completado')

# --- HE-2025-0058 (P1): sus entregas con las facturas del P1
_, L58 = lineas('HE-2025-0058')
pry58, lic58 = L58['proyecto'], L58['licencia']
assert not pry58['subs'] and not lic58['subs']
print('HE-2025-0058 (Paular 1) entrega: 4 x (506,25 proyecto + 111,25 licencia) <- %s' % [p['num'] for p in P1_PRY])
for k, p1 in enumerate(P1_PRY, 1):
    enlazar(p1, sub(pry58['id'], pry58['padres']['entrega'], k, 506.25, p1, REPARTO)['id'], 506.25)
    enlazar(p1, sub(lic58['id'], lic58['padres']['entrega'], k, 111.25, p1, REPARTO)['id'], 111.25)
poner(pry58['padres']['entrega']['id'], importe=2025.0, estado='completado',
      notas='Entrega del proyecto: 4 facturas de 506,25 (la hoja decia 2.025,40; manda la factura) %s.' % M)
poner(lic58['padres']['entrega']['id'], estado='completado')

# --- subvencion: HE-2025-0061 (P2) llevaba las del P1
_, L61 = lineas('HE-2025-0061')
s61 = L61['subv']
assert len(s61['subs']) == 4
print('HE-2025-0061 (Paular 2) subvencion: %s -> %s' % ([p['num'] for p in P1_SUB], [p['num'] for p in P2_SUB]))
for s, p1, p2 in zip(sorted(s61['subs'], key=lambda s: s['orden']), P1_SUB, P2_SUB):
    e = enlaces(p1)
    assert [x['hito_cobro_id'] for x in e] == [s['id']], (p1['num'], e)
    if ESCRIBIR:
        b.actualizar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (p1['id'], s['id']), {'factura_linea_id': p2['id']})
        poner(s['id'], notas='Subhito: factura accesalia %s (%s). Subvencion en 4 cuartos de 245 %s.' % (p2['num'], p2['fecha'], M))
_, L60 = lineas('HE-2025-0060')
s60 = L60['subv']
assert not s60['subs'] and float(s60['padres']['encargo']['importe']) == 980.0
print('HE-2025-0060 (Paular 1) subvencion: 4 x 245 <- %s' % [p['num'] for p in P1_SUB])
for k, p1 in enumerate(P1_SUB, 1):
    enlazar(p1, sub(s60['id'], s60['padres']['encargo'], k, 245.0, p1, 'Subvencion en 4 cuartos de 245')['id'], 245.0)
poner(s60['padres']['encargo']['id'], estado='completado')

# --- HE-2025-0748: duplicada de HE-2025-0058
h748 = b.leer('hojas_encargo?numero_hoja=eq.HE-2025-0748&select=id,estado,version_firmada_id')[0]
h058 = b.leer('hojas_encargo?numero_hoja=eq.HE-2025-0058&select=id,version_firmada_id')[0]
v748 = b.leer('versiones_hoja?id=eq.%s&select=pdfs_firmados,notas' % h748['version_firmada_id'])[0]
v058 = b.leer('versiones_hoja?id=eq.%s&select=pdfs_firmados,notas' % h058['version_firmada_id'])[0]
h748_hitos = [x for l in b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&select=id' % h748['id'])
              for x in b.leer('hitos_cobro?linea_facturacion_id=eq.%s&select=id' % l['id'])]
assert not [x for x in h748_hitos if b.leer('factura_linea_hitos?hito_cobro_id=eq.%s&select=factura_linea_id' % x['id'])]
print('HE-2025-0748: anulada (duplicada de HE-2025-0058); %s hitos anulados; su PDF firmado pasa a HE-2025-0058' % len(h748_hitos))
if ESCRIBIR:
    nota = 'DUPLICADA de HE-2025-0058 (Paular 1: mismo encargo, misma firma de 26-03-2025); anulada %s.' % M
    b.actualizar('hojas_encargo?id=eq.' + h748['id'], {'estado': 'anulada', 'fecha_estado': HOY + 'T00:00:00+00:00'})
    b.actualizar('versiones_hoja?id=eq.' + h748['version_firmada_id'], {'notas': (v748['notas'] or '') + ' | ' + nota})
    for x in h748_hitos:
        poner(x['id'], estado='anulado')
    b.actualizar('versiones_hoja?id=eq.' + h058['version_firmada_id'],
                 {'pdfs_firmados': (v058['pdfs_firmados'] or []) + (v748['pdfs_firmados'] or []),
                  'notas': (v058['notas'] or '') + ' | Se le une el PDF firmado de HE-2025-0748, que era esta misma hoja duplicada %s.' % M})

# ============ JULIAN BESTEIRO 15G ============
print('Julian Besteiro 15G: HE-2025-0434 -> firmada, paga Fabio Aceto; 2025/265 casada')
f265 = fl(265, 1200.0)
assert not enlaces(f265)
h434 = b.leer('hojas_encargo?numero_hoja=eq.HE-2025-0434&select=id,estado')[0]
assert h434['estado'] == 'enviada_comunidad'
v434 = b.leer('versiones_hoja?hoja_encargo_id=eq.%s&select=id&order=numero_version.desc' % h434['id'])[0]
c434 = b.leer('conceptos_hoja?version_hoja_id=eq.%s&desglose=eq.se_cobra&select=id,bloque_id,descripcion,importe' % v434['id'])
assert len(c434) == 1 and c434[0]['importe'] == 1200
ACETO = b.leer('persona?nombre=eq.Fabio&apellidos=eq.Aceto&select=id')[0]['id']
if ESCRIBIR:
    b.actualizar('hojas_encargo?id=eq.' + h434['id'], {'estado': 'devuelta_firmada', 'version_firmada_id': v434['id'], 'fecha_firma': f265['fecha'],
                                                       'fecha_estado': f265['fecha'] + 'T00:00:00+00:00'})
    lf = alta('lineas_facturacion', {'hoja_encargo_id': h434['id'], 'concepto_hoja_id': c434[0]['id'], 'bloque_id': c434[0]['bloque_id'] or BL['INFORME PERICIAL'],
                                     'descripcion': c434[0]['descripcion'], 'importe': 1200.0, 'es_porcentaje': False, 'origen': 'pdf', 'verificado': True,
                                     'emisor': 'accesalia', 'pagador_tipo': 'persona', 'pagador_id': ACETO, 'forma_cobro': 'transferencia',
                                     'notas': 'Hoja enviada pasada a firmada: hay factura (2025/265, a Fabio Aceto) %s.' % M})
    x = alta('hitos_cobro', {'linea_facturacion_id': lf['id'], 'hito': 'entrega', 'orden': 1, 'porcentaje': 100, 'importe': 1200.0, 'estado': 'completado'})
    enlazar(f265, x['id'], 1200.0)
    b.insertar('notas_facturacion', [{'hoja_encargo_id': h434['id'], 'fecha': HOY, 'origen': 'factusol', 'autor': 'Casado con Factusol',
                                      'texto': 'Estaba como enviada; hay factura 2025/265 a Fabio Aceto (informe pericial): se firmo %s.' % M}])

# ============ NOTAS DE RESPONSABILIDAD ============
NOTAS = [
    ('DAN-2021-036', 'Mercedes Arteaga 45-47', ('contrata', b.leer('contratas?nombre=eq.ANYLOR&select=id')[0]['id']), fl(84, 500.0),
     'Proyecto de instalacion de ascensor', 'REDACCION PROYECTO', 2500.0, [('entrega', 60), ('licencia', 20), ('cfo', 20)], 'licencia',
     'Encargo antiguo de ANYLOR sin hoja de encargo (ni en la app ni en Drive). Consta por la factura 2025/84 ("20 % de 2.500 por la obtencion '
     'de licencia"): se contrato. Reparto 60/20/20 como el resto de encargos de contrata de esa epoca'),
    ('DAN-2023-117', 'Doctor Esquerdo 55 local', ('empresa_propietaria', b.leer('empresas_propietarias?nombre_legal=eq.OSTALAZAR%20SL&select=id')[0]['id']),
     fl(56, 409.61, anio=2026), 'Reforma de local para oficinas (5,5 % del PEM de 24.824,65)', 'REDACCION PROYECTO', 1365.36,
     [('otro', 70), ('cfo', 30)], 'cfo',
     'OSTALAZAR es la empresa del dueno de FAIN; se le hizo como favor y, como es habitual en FAIN, no hay hoja de encargo. Consta por la '
     'factura 2026/56 ("30 % de 1.365,36 a la entrega del CFO"): se contrato. El 70 % restante, en un plazo'),
]
for opp, nombre, (ptipo, pid), fac, desc, bloque, total, reparto, casa, motivo in NOTAS:
    assert not enlaces(fac)
    motivo = '%s %s.' % (motivo, M)
    o = b.leer('oportunidades?codigo=eq.%s&select=id,comunidad_id' % opp)[0]
    print('%s (%s): nota de responsabilidad, %s %s %s; %s -> %s' % (nombre, opp, desc, total, reparto, fac['num'], casa))
    if not ESCRIBIR:
        continue
    codigo = rpc('siguiente_codigo', {'p_tipo': 'NR', 'p_anio': int(HOY[:4])})
    hoja = {'numero_hoja': codigo, 'tipo_documento': 'nota_responsabilidad', 'responsable_id': MONICA, 'motivo_sin_firma': motivo,
            'oportunidad_id': o['id'], 'comunidad_id': o['comunidad_id'], 'emisor': 'accesalia', 'fecha_creacion': HOY, 'fecha_firma': HOY,
            'estado': 'devuelta_firmada', 'fecha_estado': HOY + 'T00:00:00+00:00', 'descripcion': 'Nota de responsabilidad · %s' % nombre,
            'pagador_tipo': 'contrata' if ptipo == 'contrata' else 'comunidad', 'pagador_contrata_id': pid if ptipo == 'contrata' else None}
    h = alta('hojas_encargo', hoja)
    v = alta('versiones_hoja', {'hoja_encargo_id': h['id'], 'numero_version': 1, 'fecha_generada': HOY, 'importe_base': total, 'iva_porcentaje': 21, 'notas': motivo})
    b.actualizar('hojas_encargo?id=eq.' + h['id'], {'version_firmada_id': v['id']})
    lf = alta('lineas_facturacion', {'hoja_encargo_id': h['id'], 'bloque_id': BL[bloque], 'descripcion': desc, 'importe': total, 'es_porcentaje': False,
                                     'origen': 'nota_responsabilidad', 'verificado': True, 'emisor': 'accesalia', 'pagador_tipo': ptipo,
                                     'pagador_id': pid, 'forma_cobro': 'transferencia'})
    hs = {}
    resto = total
    for k, (t, p) in enumerate(reparto, 1):
        imp = round(total * p / 100, 2) if k < len(reparto) else round(resto, 2)
        resto -= imp
        hs[t] = alta('hitos_cobro', {'linea_facturacion_id': lf['id'], 'hito': t, 'orden': k, 'porcentaje': p, 'importe': imp, 'estado': 'pendiente'})
    assert abs(float(hs[casa]['importe']) - float(b.leer('factura_lineas?id=eq.%s&select=base' % fac['id'])[0]['base'])) < 0.01, hs[casa]
    enlazar(fac, hs[casa]['id'], float(hs[casa]['importe']))
    poner(hs[casa]['id'], estado='completado')
    b.insertar('notas_facturacion', [{'hoja_encargo_id': h['id'], 'fecha': HOY, 'origen': 'factusol', 'autor': 'Monica (nota de responsabilidad)', 'texto': motivo}])
    print('   ESCRITO', codigo)
print('ESCRITO' if ESCRIBIR else '(en seco)')
