# -*- coding: utf-8 -*-
"""PEDIDOS DE FAIN DE LA CARPETA DE DROPBOX COMO HOJAS PD (hilo 68 con Monica, 19-oct-2026).

Segunda tanda contra las facturas de contratas sueltas. En "D SM/Extraido de ascensores/1 ACCESALIA/FAIN/PEDIDOS FAIN"
estan los correos de FAIN con los codigos de pedido de 2019-2021; 19 no estaban en la app. Cada uno entra como en
pedidos_fain_2019_2021.py: PD-año-n en su opp, con el correo como documento, sus lineas, sus codigos y TODAS sus facturas
(leidas una a una contra el correo). "Manda la factura": donde FAIN pago otro reparto (p. ej. 35 % a la licencia) el
hito se ajusta a lo facturado con nota de lo que decia la norma.
Aqui solo van los que cuadran; los dudosos (Escuelas Pias 4, Mari Blanca 12, San Vicente 10, Dos de Mayo 73, las
subvenciones de Mallorca 12-13 y Rio Duero 32) esperan respuesta de Monica.
  python scripts/facturacion/pedidos_fain_dropbox.py [--escribir]
"""
import sys, os, re, json, uuid, datetime, unicodedata, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
M = '(Monica, %s)' % HOY
AUTOR = 'Revisión a mano con Mónica (%s)' % HOY
RAIZ = 'C:/accesalia Dropbox/D SM/Extraido de ascensores/1 ACCESALIA/FAIN/PEDIDOS FAIN/'
TEXTOS = json.load(open(os.path.join(os.path.dirname(__file__), '../../docs/facturacion/contratas/trabajo/fain_dropbox.json'), encoding='utf-8'))
ALMACEN = 'documentos-comerciales'
b = arrancar()
cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
FAIN = b.leer('contratas?nombre=eq.FAIN&select=id')[0]['id']
BL = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo&order=id')}
P, C = 0, 1   # indice de linea: proyecto, CSS


def proy(imp, entrega=None, licencia=None, cfo=None):
    return ('Proyecto', 'REDACCION PROYECTO', imp, [('entrega', entrega if entrega is not None else imp * .5),
                                                     ('licencia', licencia if licencia is not None else imp * .3),
                                                     ('cfo', cfo if cfo is not None else imp * .2)])


def css(imp=600, pss=None, cfo=None):
    return ('Coordinacion de Seguridad y Salud', 'CSS', imp, [('pss', pss if pss is not None else imp * .8), ('cfo', cfo if cfo is not None else imp * .2)])


AA = 'aceptados/2020/'
AB = 'aceptados/2021/'
# (opp, fecha, fichero, pedido fain, lineas, facturas [(emisor, anio, num, base, [(linea, hito, importe)])], ajustes {(linea, hito): nota}, nota)
PEDIDOS = [
    ('DAN-2019-078', '2019-12-19', 'aceptados/4ºtrimestre 2019/Gmail - OBRA_ SIERRA MADRONA, 34 MADRID.pdf', '95001669',
     [('Nueva dirección facultativa', 'DF', 800, [('presentacion', 640), ('cfo', 160)])],
     [('daniel', 2020, 1, 640, [(0, 'presentacion', 640)]), ('daniel', 2020, 2, 160, [(0, 'cfo', 160)])], {},
     'Nombramiento de Daniel como nueva DF: 800 (80 % a la presentación en el colegio, 20 % al certificado final). '
     'El informe pericial (63-2020, 600) es de otro pedido de compra (203680) que no está en la carpeta.'),
    ('DAN-2020-043', '2020-07-16', AA + 'Gmail - Fwd_ OBRA_ PASAJE DEL LINCE, 8 MADRID CODIGOS PEDIDO ARQUITECTO.pdf', '95001800',
     [('Nueva dirección facultativa y CSS', 'DF', 1350, [('cfo', 1350)])],
     [('daniel', 2021, 9, 1350, [(0, 'cfo', 1350)])], {},
     'El correo da un solo importe (1.350) sin forma de pago. La 8-2021 (400, «solicitud de proyecto») es de otro pedido de compra (197495) que no está en la carpeta.'),
    ('DAN-2019-073', '2020-07-14', AA + 'Gmail - Fwd_ OBRA_ MIGUEL DE MONCADA, 5 CODIGOS DE PEDIDO ARQUITECTO.pdf', '95002315',
     [proy(2500), css(600, pss=400, cfo=200)],
     [('daniel', 2020, 31, 1250, [(P, 'entrega', 1250)]), ('daniel', 2021, 10, 750, [(P, 'licencia', 750)]), ('daniel', 2021, 6, 400, [(C, 'pss', 400)]),
      ('daniel', 2022, 10, 700, [(P, 'cfo', 500), (C, 'cfo', 200)])],
     {(C, 'pss'): 'Manda la factura: el 80 %% de la CSS se facturó por 400 (6-2021) y el resto, 200, con el CFO (10-2022); la norma decía 480 + 120 %s.' % M},
     'El correo solo trae el proyecto (2.500); la CSS (600) sale de las facturas: 400 + 200. Suma 3.100.'),
    ('DAN-2020-029', '2020-05-27', AA + 'Gmail - Fwd_ OBRA_ C_ PEDRO RUBIN DE CELIX, 28 PINTO CODIGOS DE PEDIDO ARQUITECTO.pdf', '95002327',
     [proy(4500, licencia=1575, cfo=675), css(600)],
     [('daniel', 2020, 28, 2250, [(P, 'entrega', 2250)]), ('accesalia', 2021, 51, 1575, [(P, 'licencia', 1575)]), ('accesalia', 2022, 49, 480, [(C, 'pss', 480)]),
      ('accesalia', 2024, 8, 675, [(P, 'cfo', 675)]), ('accesalia', 2024, 8, 120, [(C, 'cfo', 120)])],
     {(P, 'licencia'): 'Manda la factura: la licencia se facturó por 1.575 (35 %%) y el fin de obra por los 675 restantes; la norma decía 1.350 + 900 %s.' % M}, ''),
    ('DAN-2020-031', '2020-05-19', AA + 'Gmail - Fwd_ OBRA_ PARVILLAS ALTAS, 12 MADRID CODIGOS DE PEDIDO ARQUITECTO.pdf', '95002340',
     [proy(3500, licencia=1225, cfo=525), css(600)],
     [('daniel', 2020, 29, 1750, [(P, 'entrega', 1750)]), ('daniel', 2021, 45, 1225, [(P, 'licencia', 1225)]), ('daniel', 2021, 55, 480, [(C, 'pss', 480)]),
      ('daniel', 2022, 43, 645, [(P, 'cfo', 525), (C, 'cfo', 120)])],
     {(P, 'licencia'): 'Manda la factura: la licencia se facturó por 1.225 (35 %%) y el fin de obra por los 525 restantes (43-2022, junto con los 120 de la CSS); la norma decía 1.050 + 700 %s.' % M}, ''),
    ('DAN-2020-038', '2020-10-15', AA + 'Gmail - OBRA_ MALLORCA, 13 LEGANÉS CODIGOS DE PEDIDO ARQUITECTO.pdf', '95002408',
     [proy(2500), css(600)],
     [('daniel', 2020, 47, 1250, [(P, 'entrega', 1250)]), ('daniel', 2021, 44, 750, [(P, 'licencia', 750)]), ('daniel', 2021, 54, 480, [(C, 'pss', 480)]),
      ('daniel', 2022, 33, 620, [(P, 'cfo', 500), (C, 'cfo', 120)])], {}, ''),
    ('DAN-2020-037', '2020-10-15', AB + '2_Gmail - OBRA_ MALLORCA, 12 LEGANÉS CODIGOS DE PEDIDO ARQUITECTO.pdf', '95002409',
     [proy(2500), css(600)],
     [('daniel', 2020, 46, 1250, [(P, 'entrega', 1250)]), ('daniel', 2021, 85, 1230, [(P, 'licencia', 750), (C, 'pss', 480)]),
      ('accesalia', 2023, 124, 620, [(P, 'cfo', 500), (C, 'cfo', 120)])], {}, ''),
    ('DAN-2021-059', '2021-05-19', AB + '9_Gmail - Fwd_ OBRA_ ALTAMIRANO, 10 MADRID CODIGOS DE ARQUITECTO.pdf', '95002412',
     [('Cálculo de deflexiones', 'INFORME TECNICO', 150, [('entrega', 150)])],
     [('daniel', 2021, 47, 150, [(0, 'entrega', 150)])], {}, ''),
    ('DAN-2020-072', '2021-01-05', AB + '8_Gmail - OBRA_ CASTELLON, 17 MÓSTOLES CODIGOS DE PEDIDO ARQUITECTO.pdf', '95002444',
     [proy(2500), css(600)],
     [('daniel', 2021, 5, 1250, [(P, 'entrega', 1250)]), ('daniel', 2021, 46, 750, [(P, 'licencia', 750)]), ('accesalia', 2021, 48, 480, [(C, 'pss', 480)]),
      ('accesalia', 2022, 123, 120, [(C, 'cfo', 120)]), ('daniel', 2024, 45, 500, [(P, 'cfo', 500)])], {},
     'La 78-2022 (fin de obra, 500) se anuló con la rectificativa 3-2022 y se volvió a emitir como 45-2024.'),
    ('DAN-2021-007', '2021-03-09', AB + '1_Gmail - OBRA_ SANTA TERESADE JESUS, 8 ALCALÁ DE HENARES CODIGOS DE PEDIDO ARQUITECTO.pdf', '95002465',
     [proy(2500)],
     [('daniel', 2021, 13, 1250, [(P, 'entrega', 1250)]), ('daniel', 2022, 45, 750, [(P, 'licencia', 750)]), ('daniel', 2023, 93, 500, [(P, 'cfo', 500)])], {},
     'Solo el proyecto; la CSS es otro pedido (PD-2023-0015). La 94-2023 repetía los 100 de la CSS de la 93-2023: se anuló (Mónica, 18-oct).'),
    ('DAN-2020-055', '2021-04-13', AB + '6_Gmail - OBRA_ DE LA VEGA, 6 FUENLABRADA CODIGOS DE PEDIDO ARQUITECTO.pdf', '95002514',
     [proy(2500), css(600)],
     [('daniel', 2021, 36, 1250, [(P, 'entrega', 1250)]), ('daniel', 2022, 18, 750, [(P, 'licencia', 750)]), ('daniel', 2022, 18, 480, [(C, 'pss', 480)]),
      ('daniel', 2022, 54, 500, [(P, 'cfo', 500)]), ('daniel', 2022, 54, 120, [(C, 'cfo', 120)])], {}, ''),
    ('DAN-2021-051', '2021-07-16', AB + '16_Gmail - OBRA_ SAN NICOLAS, 7 LEGANÉS CODIGOS DE ARQUITECTO.pdf', '95002527',
     [proy(2500), css(600)],
     [('daniel', 2021, 62, 1250, [(P, 'entrega', 1250)]), ('daniel', 2022, 32, 750, [(P, 'licencia', 750)]), ('daniel', 2022, 63, 480, [(C, 'pss', 480)]),
      ('daniel', 2024, 1, 500, [(P, 'cfo', 500)]), ('daniel', 2024, 1, 120, [(C, 'cfo', 120)])], {}, ''),
    ('DAN-2021-041', '2021-07-16', AB + '15_Gmail - OBRA_ DOCTOR MARTIN VEGUE, 22 LEGANES CODIGOS DE ARQUITECTO.pdf', '95002535',
     [proy(2500), css(600)],
     [('daniel', 2021, 63, 1250, [(P, 'entrega', 1250)]), ('accesalia', 2021, 47, 750, [(P, 'licencia', 750)]), ('accesalia', 2022, 60, 480, [(C, 'pss', 480)]),
      ('accesalia', 2024, 3, 500, [(P, 'cfo', 500)]), ('accesalia', 2024, 3, 120, [(C, 'cfo', 120)])], {}, ''),
    ('DAN-2021-050', '2021-05-31', AB + 'Gmail - OBRA RIO DUERO, 32 LEGANÉS CODIGOS DE PEDIDO ARQUITECTO.pdf', '95002539',
     [proy(2700), css(600)],
     [('daniel', 2021, 51, 1350, [(P, 'entrega', 1350)]), ('daniel', 2022, 88, 810, [(P, 'licencia', 810)]), ('daniel', 2022, 106, 480, [(C, 'pss', 480)]),
      ('daniel', 2024, 30, 540, [(P, 'cfo', 540)]), ('daniel', 2024, 30, 120, [(C, 'cfo', 120)])], {},
     'El correo da 4.600 en total sin desglose; proyecto (2.700) y CSS (600) salen de las facturas. La subvención (60-2021 y 95-2022) queda aparte.'),
    ('DAN-2021-139', '2021-07-23', AB + '19_Gmail - OBRA_ BERNARDO MARTIN, 12 MÓSTOLES CODIGOS DE PEDIDO ARQUITECTO.pdf', '95002546',
     [proy(3500)],
     [('daniel', 2021, 68, 1750, [(P, 'entrega', 1750)]), ('daniel', 2022, 15, 1050, [(P, 'licencia', 1050)]), ('daniel', 2022, 119, 700, [(P, 'cfo', 700)])], {},
     'Solo el proyecto. La CSS (39-2022, 600) se facturó a la comunidad, no a FAIN.'),
    ('DAN-2021-043', '2021-07-09', AB + '11_Gmail - OBRA_ AV. FUENLABRADA, 92 LEGANÉS CODIGOS DE PEDIDO ARQUITECTO.pdf', '95002556',
     [proy(2500), css(600)],
     [('daniel', 2021, 52, 1250, [(P, 'entrega', 1250)]), ('daniel', 2021, 96, 750, [(P, 'licencia', 750)]), ('daniel', 2021, 96, 480, [(C, 'pss', 480)]),
      ('daniel', 2023, 92, 500, [(P, 'cfo', 500)]), ('daniel', 2023, 92, 120, [(C, 'cfo', 120)])], {}, ''),
    ('DAN-2021-070', '2021-07-15', AB + '12_Gmail - OBRA_ COPENHAGUE, 14 TORREJÓN DE ARDOZ CODIGOS DE ARQUITECTO.pdf', '95002568',
     [proy(2750), css(600)],
     [('daniel', 2021, 58, 1375, [(P, 'entrega', 1375)])], {},
     'Solo se facturó el 50 % del proyecto (58-2021); no hay más facturas.'),
]
# San Maximiliano 23 (PD-2021-0001, ya en la app): FAIN pago los porcentajes sobre el total (3.700 = proyecto 3.100 + CSS 600)
SANMAX = [('accesalia', 2021, 62, 1850, [(P, 'entrega', 1550), (C, 'pss', 300)]), ('accesalia', 2021, 103, 1110, [(P, 'licencia', 930), (C, 'pss', 180)])]


def n(s):
    s = unicodedata.normalize('NFD', str(s or '').upper())
    return ''.join(c for c in s if unicodedata.category(c) != 'Mn')


def alta(tabla, fila):
    req = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))[0]


def rpc(nombre, args):
    req = urllib.request.Request(b.url + '/rest/v1/rpc/' + nombre, data=json.dumps(args).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))


def linea_factura(emisor, anio, num, base, usadas):
    cand = []
    for x in b.leer('facturas?tipo=eq.factura&empresa_emisora=eq.%s&anio=eq.%s&numero=eq.%s&select=id,estado,anio,serie' % (emisor, anio, num)):
        ls = [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base&order=posicion' % x['id']) if l['base'] and abs(float(l['base']) - base) < 0.01]
        if ls: cand.append((x, ls))
    assert len(cand) == 1, (emisor, anio, num, base, len(cand))
    f, ls = cand[0]
    assert f['estado'] != 'anulada', ('anulada', emisor, anio, num)
    libres = [l for l in ls if l['id'] not in usadas and not b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % l['id'])]
    assert libres, ('ya casada', emisor, anio, num, base)
    cobrada = f['anio'] <= 2023 or f['estado'] == 'cobrada'
    usadas.add(libres[0]['id'])
    return cobrada, libres[0]


def codigos(pf, fichero):
    t = re.sub(r'\s+', ' ', TEXTOS[fichero.replace('/', '\\')])
    g = re.search(r'(?i)grafo(?:/orden)?\s*:?\s*(\d{7})', t)
    c = re.search(r'(?i)pedido de compra\s*:?\s*(\d{6})', t)
    assert g and c, (pf, fichero)
    return [('Pedido Fain', pf), ('Grafo/Orden', g.group(1)), ('Pedido de compra', c.group(1))]


ya = {h['descripcion'] for h in b.leer('hojas_encargo?tipo_documento=eq.pedido&select=descripcion&order=id') if h['descripcion']}
total_enl = 0
for opp, fecha, fichero, pf, lineas, facturas, ajustes, notaped in PEDIDOS:
    o = b.leer('oportunidades?codigo=eq.%s&select=id,nombre,comunidad_id' % opp)[0]
    numeros = codigos(pf, fichero)
    desc = 'Pedido FAIN %s · %s' % (' / '.join('%s %s' % x for x in numeros), o['nombre'])
    print('== %s %s %s | %s' % (opp, o['nombre'], fecha, ' / '.join(v for _, v in numeros)))
    assert os.path.exists(RAIZ + fichero), fichero
    if desc in ya:
        print('   ya estaba'); continue
    for d, bq, imp, rep in lineas:
        assert abs(sum(i for _, i in rep) - imp) < 0.01, (opp, d)
        assert bq in BL, bq
    usadas = set()
    casadas = []
    for e, an, nu, base, partes in facturas:
        assert abs(sum(i for _, _, i in partes) - base) < 0.01, (an, nu, base, partes)
        casadas.append(linea_factura(e, an, nu, base, usadas))
    fact = sum(base for *_, base, _ in facturas)
    tot = sum(imp for _, _, imp, _ in lineas)
    print('   lineas %s | facturado %s de %s' % (' + '.join('%s %s (%s)' % (d[:14], imp, '/'.join('%s %g' % (t, i) for t, i in rep)) for d, _, imp, rep in lineas), fact, tot))
    for e, an, nu, base, partes in facturas:
        print('     %s %s/%s %s -> %s' % (e[:3], an, nu, base, ', '.join('%s %s %s' % (lineas[li][0][:5].lower(), t, i) for li, t, i in partes)))
    total_enl += len(facturas)
    if not ESCRIBIR:
        continue
    emisores = {e for e, *_ in facturas}
    emisor = 'accesalia' if 'accesalia' in emisores else 'daniel_autonomo'
    anio = int(fecha[:4])
    codigo = rpc('siguiente_codigo', {'p_tipo': 'PD', 'p_anio': anio})
    h = alta('hojas_encargo', {'numero_hoja': codigo, 'tipo_documento': 'pedido', 'oportunidad_id': o['id'], 'comunidad_id': o['comunidad_id'],
                               'pagador_tipo': 'contrata', 'pagador_contrata_id': FAIN, 'emisor': emisor, 'fecha_creacion': fecha, 'fecha_firma': fecha,
                               'estado': 'devuelta_firmada', 'fecha_estado': fecha + 'T00:00:00+00:00', 'descripcion': desc})
    limpio = re.sub(r'[^A-Za-z0-9._-]+', '-', n(os.path.basename(fichero))).strip('-')[:80]
    ruta = 'hojas-encargo/%s/firmada-%s-%s' % (h['id'], uuid.uuid4().hex[:8], limpio)
    b.subir(ALMACEN, ruta, open(RAIZ + fichero, 'rb').read(), tipo='application/pdf')
    v = alta('versiones_hoja', {'hoja_encargo_id': h['id'], 'numero_version': 1, 'fecha_generada': fecha, 'fecha_enviada': fecha,
                                'pdfs_firmados': ['almacen:%s/%s' % (ALMACEN, ruta)], 'importe_base': tot, 'iva_porcentaje': 21,
                                'forma_pago': 'Norma de FAIN: proyecto 50/30/20, CSS 80/20' if any(bq in ('REDACCION PROYECTO', 'CSS') for _, bq, _, _ in lineas) else None,
                                'notas': ('Pedido de FAIN de %s dado de alta el %s desde la carpeta de Dropbox PEDIDOS FAIN (%s): sus facturas estaban sueltas %s. %s'
                                          % (anio, HOY, fichero, M, notaped)).strip()})
    b.actualizar('hojas_encargo?id=eq.' + h['id'], {'version_firmada_id': v['id']})
    hitos_de = []
    for li, (d, bq, imp, rep) in enumerate(lineas):
        lf = alta('lineas_facturacion', {'hoja_encargo_id': h['id'], 'bloque_id': BL[bq], 'descripcion': d, 'importe': imp, 'es_porcentaje': False,
                                         'origen': 'pedido', 'verificado': True, 'emisor': emisor, 'pagador_tipo': 'contrata', 'pagador_id': FAIN,
                                         'forma_cobro': 'transferencia'})
        hs = {}
        for k, (t, i) in enumerate(rep, 1):
            nota = ajustes.get((li, t)) or ('Norma de FAIN %s.' % M if bq in ('REDACCION PROYECTO', 'CSS') else 'Según el correo de FAIN %s.' % M)
            hs[t] = alta('hitos_cobro', {'linea_facturacion_id': lf['id'], 'hito': t, 'orden': k, 'porcentaje': round(i * 100 / imp, 2), 'importe': round(i, 2),
                                         'estado': 'pendiente', 'notas': nota})
            if (li, t) in ajustes:
                b.insertar('notas_facturacion', [{'hoja_encargo_id': h['id'], 'hito_cobro_id': hs[t]['id'], 'fecha': HOY, 'origen': 'factusol', 'tipo': 'nota',
                                                  'autor': AUTOR, 'texto': nota}])
        hitos_de.append(hs)
        b.insertar('codigos_cliente_linea', [{'linea_facturacion_id': lf['id'], 'etiqueta': e, 'valor': val, 'orden': k + 1} for k, (e, val) in enumerate(numeros)])
    cubierto = {}
    for (cob, fl), (e, an, nu, base, partes) in zip(casadas, facturas):
        for li, t, i in partes:
            x = hitos_de[li][t]
            b.insertar('factura_linea_hitos', [{'factura_linea_id': fl['id'], 'hito_cobro_id': x['id'], 'importe': i, 'como': 'a_mano'}])
            cubierto[x['id']] = cubierto.get(x['id'], 0) + (i if cob else 0)
    for hs in hitos_de:
        for t, x in hs.items():
            c = cubierto.get(x['id'], 0)
            if c >= float(x['importe']) - 0.01:
                b.actualizar('hitos_cobro?id=eq.%s&estado=eq.pendiente' % x['id'], {'estado': 'completado'})
            elif c > 0:
                b.actualizar('hitos_cobro?id=eq.%s&estado=eq.pendiente' % x['id'], {'estado': 'parcial'})
    if notaped:
        b.insertar('notas_facturacion', [{'hoja_encargo_id': h['id'], 'hito_cobro_id': None, 'fecha': HOY, 'origen': 'factusol', 'tipo': 'nota',
                                          'autor': AUTOR, 'texto': notaped}])
    print('   ESCRITO', codigo)

# San Maximiliano 23: a los hitos de la PD-2021-0001
h = b.leer('hojas_encargo?numero_hoja=eq.PD-2021-0001&select=id,lineas:lineas_facturacion(descripcion,hitos:hitos_cobro(id,hito,importe,estado))')[0]
hs = [{t['hito']: t for t in l['hitos']} for l in sorted(h['lineas'], key=lambda l: 0 if l['descripcion'] == 'Proyecto' else 1)]
print('== PD-2021-0001 San Maximiliano 23')
usadas = set()
casadas = []
for e, an, nu, base, partes in SANMAX:
    print('     %s %s/%s %s -> %s' % (e[:3], an, nu, base, ', '.join('%s %s %s' % ('proy' if li == P else 'css', t, i) for li, t, i in partes)))
    casadas.append(linea_factura(e, an, nu, base, usadas))
total_enl += len(SANMAX)
if ESCRIBIR:
    for (cob, fl), (e, an, nu, base, partes) in zip(casadas, SANMAX):
        for li, t, i in partes:
            b.insertar('factura_linea_hitos', [{'factura_linea_id': fl['id'], 'hito_cobro_id': hs[li][t]['id'], 'importe': i, 'como': 'a_mano'}])
    for li, t in ((P, 'entrega'), (P, 'licencia'), (C, 'pss')):
        b.actualizar('hitos_cobro?id=eq.%s&estado=eq.pendiente' % hs[li][t]['id'], {'estado': 'completado'})
    b.insertar('notas_facturacion', [{'hoja_encargo_id': h['id'], 'hito_cobro_id': None, 'fecha': HOY, 'origen': 'factusol', 'tipo': 'nota', 'autor': AUTOR,
                                      'texto': 'FAIN pagó los porcentajes sobre el total de 3.700 (proyecto + CSS): 62-2021 = 50 % (1.550 + 300), '
                                               '103-2021 = 30 % (930 + 180), 125-2025 = 20 % (620 + 120).'}])
    print('   ESCRITO')

# Santa Teresa 8: la 94-2023 repetia los 100 de la CSS de la 93-2023 (Monica, 18-oct: «fue un error, se anulo una»)
f94 = b.leer('facturas?select=id,estado,notas&tipo=eq.factura&empresa_emisora=eq.daniel&anio=eq.2023&numero=eq.94')[0]
print('== daniel 94-2023 (Santa Teresa 8) %s -> anulada' % f94['estado'])
if ESCRIBIR and f94['estado'] != 'anulada':
    b.actualizar('facturas?id=eq.' + f94['id'], {'estado': 'anulada', 'notas': ((f94['notas'] or '') + ' Anulada: repetía los 100 € de la CSS de la 93-2023 (Mónica, 18-oct-2026: «fue un error, se anuló una»). En Factusol sigue como cobrada.').strip()})
print('facturas: %d' % total_enl, 'ESCRITO' if ESCRIBIR else '(en seco)')
