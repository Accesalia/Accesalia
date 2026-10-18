# -*- coding: utf-8 -*-
"""PEDIDOS DE FAIN DE 2019-2021 COMO HOJAS PD, CON TODAS SUS FACTURAS (hilo 68 con Monica, 18-oct-2026).

Por que: quedaban 177 facturas de contratas "sueltas" (sin hoja). El corte de 2022 de pedidos_contratas.py dejo fuera
los pedidos de FAIN de 2019-2021, y FAIN los siguio facturando hasta 2024. Monica: "me preocupa MUCHISIMO, no deberia
haber NINGUNA". Cada pedido entra como en pedidos_antiguos_fain.py (grupo B: el pedido ES el documento): PD-año-n en su
opp, con su PDF de PRESUPUESTOS FIRMADOS, sus lineas (norma FAIN: proyecto 50/30/20, CSS 80/20), sus codigos, y se le
enlazan TODAS sus facturas de 2020-2024 (Monica: si; hasta 2023 la factura garantiza el cobro). Cada factura se ha
leido a mano contra el pedido: lo facturado suma lo del pedido salvo donde se dice.
Etruria 26-28 y Lucano 65: el 20 % final (CFO 500 + CSS 120 = 620 por portal) va en la PD-2024-0005 («CFO visado»),
como decidio Monica con e3: en los pedidos de 2021 esos dos hitos nacen anulados con su nota.
  python scripts/facturacion/pedidos_fain_2019_2021.py [--escribir]
"""
import sys, os, re, json, uuid, datetime, unicodedata, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
M = '(Monica, %s)' % HOY
CARPETA = 'G:/Mi unidad/MONICA ACCESALIA/PRESUPUESTOS/PRESUPUESTOS FIRMADOS/'
ALMACEN = 'documentos-comerciales'
b = arrancar()
cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
FAIN = b.leer('contratas?nombre=eq.FAIN&select=id')[0]['id']
BL = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo&order=id')}
PROY, CSS = [('entrega', 50), ('licencia', 30), ('cfo', 20)], [('pss', 80), ('cfo', 20)]
P, C = 0, 1   # indice de linea: proyecto, CSS

def lin(proy, css):
    ls = [('Proyecto', 'REDACCION PROYECTO', proy, PROY)]
    if css: ls.append(('Coordinacion de Seguridad y Salud', 'CSS', css, CSS))
    return ls

# (opp, fecha, ficheros, numeros, lineas, facturas [(emisor, anio, num, base, [(linea, hito, importe)])], anular [(linea, hito, nota)], nota)
PEDIDOS = [
    ('DAN-2020-046', '2020-10-05', ['AERONAVE 33 MADRID CODIGOS DE PEDIDO 05-10-2020.pdf'], [('Pedido Fain', '95002394'), ('Grafo/Orden', '4008559'), ('Pedido de compra', '200696')],
     lin(2500, 600), [('daniel', 2020, 45, 1250, [(P, 'entrega', 1250)]), ('daniel', 2021, 65, 750, [(P, 'licencia', 750)]), ('daniel', 2024, 36, 500, [(P, 'cfo', 500)])], [], ''),
    ('DAN-2021-044', '2021-07-16', ['BADAJOZ 20 ALCORCÓN CODIGOS DE ARQUITECTO 16-07-2021.pdf'], [('Pedido Fain', '95002560'), ('Grafo/Orden', '4009006'), ('Pedido de compra', '224310')],
     lin(3100, 600), [('daniel', 2021, 61, 1550, [(P, 'entrega', 1550)]), ('accesalia', 2023, 39, 930, [(P, 'licencia', 930)]), ('accesalia', 2023, 39, 480, [(C, 'pss', 480)]),
                      ('accesalia', 2024, 201, 620, [(P, 'cfo', 620)]), ('accesalia', 2024, 201, 120, [(C, 'cfo', 120)])], [], ''),
    ('DAN-2015-049', '2021-07-15', ['BELGRADO 3 TORREJON DE ARDOZ CODIGOS DE ARQUITECTO 15-07-2021.pdf'], [('Pedido Fain', '95002571'), ('Grafo/Orden', '4009055'), ('Pedido de compra', '224257')],
     lin(2750, 600), [('daniel', 2021, 57, 1375, [(P, 'entrega', 1375)]), ('daniel', 2022, 40, 825, [(P, 'licencia', 825)]), ('daniel', 2022, 62, 480, [(C, 'pss', 480)]),
                      ('daniel', 2024, 11, 550, [(P, 'cfo', 550)]), ('daniel', 2024, 11, 120, [(C, 'cfo', 120)])], [], ''),
    ('DAN-2020-009', '2020-03-30', ['Buena madre 9 Pinto.pdf'], [('Pedido Fain', '95002319'), ('Grafo/Orden', '4008345'), ('Pedido de compra', '189087')],
     lin(2500, 0), [('daniel', 2020, 18, 1250, [(P, 'entrega', 1250)]), ('daniel', 2021, 24, 750, [(P, 'licencia', 750)]), ('daniel', 2023, 83, 500, [(P, 'cfo', 500)])], [], ''),
    ('DAN-2021-114', '2021-10-28', ['CORRAL DE CANTOS 19 MADRID CODIGOS DE PEDIDO 28-10-2021.pdf'], [('Pedido Fain', '95002641'), ('Grafo/Orden', '4009242'), ('Pedido de compra', '232742')],
     lin(2500, 600), [('accesalia', 2021, 96, 1250, [(P, 'entrega', 1250)]), ('accesalia', 2022, 213, 750, [(P, 'licencia', 750)]), ('accesalia', 2023, 132, 480, [(C, 'pss', 480)]),
                      ('accesalia', 2024, 248, 500, [(P, 'cfo', 500)]), ('accesalia', 2024, 248, 120, [(C, 'cfo', 120)])], [],
     'La 101-2021 (licencia) se anuló con la rectificativa 7-2022 y se volvió a emitir como 213-2022.'),
    ('DAN-2019-049', '2021-04-14', ['ETRURIA 26-28 Y LUCANO 65 MADRID CODIGOS DE PEDIDO ARQUITECTO 1 14-04-2021.pdf'], [('Pedido Fain', '95002511'), ('Grafo/Orden', '4008858'), ('Pedido de compra', '215919')],
     lin(2500, 600), [('daniel', 2021, 33, 1250, [(P, 'entrega', 1250)]), ('accesalia', 2022, 220, 750, [(P, 'licencia', 750)]), ('accesalia', 2023, 57, 480, [(C, 'pss', 480)])],
     [(P, 'cfo', 'ETRURIA 26'), (C, 'cfo', 'ETRURIA 26')], 'Portal ETRURIA 26.'),
    ('DAN-2019-049', '2021-04-14', ['ETRURIA, 26-28 Y LUCANO, 65 MADRID CODIGOS DE PEDIDO ARQUITECTO 2.pdf'], [('Pedido Fain', '95002511'), ('Grafo/Orden', '4008859'), ('Pedido de compra', '216195')],
     lin(2500, 600), [('daniel', 2021, 34, 1250, [(P, 'entrega', 1250)]), ('accesalia', 2022, 219, 750, [(P, 'licencia', 750)]), ('accesalia', 2023, 58, 480, [(C, 'pss', 480)])],
     [(P, 'cfo', 'ETRURIA 28'), (C, 'cfo', 'ETRURIA 28')], 'Portal ETRURIA 28.'),
    ('DAN-2019-049', '2021-04-14', ['ETRURIA, 26-28 Y LUCANO, 65 MADRID CODIGOS DE PEDIDO 3.pdf'], [('Pedido Fain', '95002511'), ('Grafo/Orden', '4008860'), ('Pedido de compra', '216196')],
     lin(2500, 600), [('daniel', 2021, 35, 1250, [(P, 'entrega', 1250)]), ('accesalia', 2022, 218, 750, [(P, 'licencia', 750)]), ('accesalia', 2023, 59, 480, [(C, 'pss', 480)])],
     [(P, 'cfo', 'LUCANO 65'), (C, 'cfo', 'LUCANO 65')], 'Portal LUCANO 65.'),
    ('DAN-2020-005', '2021-04-13', ['GALICIA 2 LEGANES CODIGOS DE PEDIDO ARQUITECTO 13-04-2021.pdf'], [('Pedido Fain', '95002502'), ('Grafo/Orden', '4008837'), ('Pedido de compra', '215724')],
     lin(2500, 600), [('daniel', 2021, 26, 1250, [(P, 'entrega', 1250)]), ('daniel', 2022, 28, 1230, [(P, 'licencia', 750), (C, 'pss', 480)]),
                      ('daniel', 2024, 86, 500, [(P, 'cfo', 500)]), ('daniel', 2024, 86, 120, [(C, 'cfo', 120)])], [],
     'La 86-2024 dice «20 % CFO + 80 % CSS» por 500: es solo el CFO (el 80 % de la CSS ya iba en la 28-2022). Suma 3.100 = el pedido.'),
    ('DAN-2020-036', '2020-09-03', ['LIBERTAD 3 SAN FERNANDO DE HENARES CODIGOS PEDIDO 03-09-2020.pdf'], [('Pedido Fain', '95002384'), ('Grafo/Orden', '4008539'), ('Pedido de compra', '198296')],
     lin(2500, 600), [('daniel', 2020, 36, 1250, [(P, 'entrega', 1250)]), ('daniel', 2022, 44, 750, [(P, 'licencia', 750)]), ('daniel', 2022, 90, 480, [(C, 'pss', 480)]),
                      ('daniel', 2024, 10, 500, [(P, 'cfo', 500)]), ('daniel', 2024, 10, 120, [(C, 'cfo', 120)])], [],
     'La 107-2022 (licencia, repetida) se anuló con el abono 1-2024. La 10-2024 dice «80 % de 2.500» por el CFO de 500: es el 20 %. Las deflexiones adicionales (acc 63-2023, 300) no son del pedido.'),
    ('DAN-2021-048', '2021-07-23', ['Lago tiberiades 8 parla codigos pedido 23-07-2021.pdf'], [('Pedido Fain', '95002563'), ('Grafo/Orden', '4009019'), ('Pedido de compra', '225102')],
     lin(2500, 600), [('daniel', 2021, 69, 1250, [(P, 'entrega', 1250)]), ('daniel', 2022, 29, 1230, [(P, 'licencia', 750), (C, 'pss', 480)]),
                      ('daniel', 2024, 63, 500, [(P, 'cfo', 500)]), ('daniel', 2024, 63, 120, [(C, 'cfo', 120)])], [],
     'El correo solo trae los códigos: los importes (2.500 + 600) salen de las facturas.'),
    ('DAN-2021-119', '2021-12-03', ['VIRGEN DEL CAMINO 4 LEGANÉS CODIGOS DE PEDIDO 03-12-2021.pdf'], [('Pedido Fain', '95002666'), ('Grafo/Orden', '4009287'), ('Pedido de compra', '236032')],
     lin(3500, 600), [('accesalia', 2022, 9, 1750, [(P, 'entrega', 1750)]), ('accesalia', 2022, 124, 1050, [(P, 'licencia', 1050)]), ('accesalia', 2023, 187, 480, [(C, 'pss', 480)]),
                      ('accesalia', 2024, 209, 700, [(P, 'cfo', 700)]), ('accesalia', 2024, 209, 120, [(C, 'cfo', 120)])], [], ''),
    ('DAN-2021-046', '2021-07-19', ['cuesta de las perdices 33 y 37 aranjuez codigos de pedido.pdf'], [('Pedido Fain', '95002552'), ('Grafo/Orden', '4008989'), ('Pedido de compra', '224562')],
     lin(2500, 600), [('daniel', 2021, 66, 1250, [(P, 'entrega', 1250)]), ('daniel', 2022, 26, 1230, [(P, 'licencia', 750), (C, 'pss', 480)]),
                      ('daniel', 2022, 67, 480, [(C, 'cfo', 120), (P, 'cfo', 360)]), ('daniel', 2024, 47, 140, [(P, 'cfo', 140)])], [],
     'La CSS del 80 % se facturó dos veces (26-2022 y 67-2022); el sobrante de la segunda (360) cubre parte del CFO y la 47-2024 cobra el resto (140). Suma 3.100 = el pedido.'),
    ('DAN-2021-047', '2021-07-19', ['cuesta de las perdices 33 y 37 aranjuez codigos de pedido.pdf'], [('Pedido Fain', '95002544'), ('Grafo/Orden', '4008970'), ('Pedido de compra', '224564')],
     lin(2500, 600), [('daniel', 2021, 67, 1250, [(P, 'entrega', 1250)]), ('daniel', 2022, 27, 1230, [(P, 'licencia', 750), (C, 'pss', 480)]),
                      ('daniel', 2022, 66, 480, [(C, 'cfo', 120), (P, 'cfo', 360)]), ('daniel', 2024, 48, 140, [(P, 'cfo', 140)])], [],
     'La CSS del 80 % se facturó dos veces (27-2022 y 66-2022); el sobrante de la segunda (360) cubre parte del CFO y la 48-2024 cobra el resto (140). Suma 3.100 = el pedido.'),
]
# Los cuatro que no cuadran, a la espera de Monica: Quilichao 6, Gobernador 8, Aeronave 33 (CSS) y Mendiguchia 27.
# Aeronave entra (la CSS queda pendiente: nunca se facturo); los otros tres, cuando ella diga.


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


def linea_factura(emisor, anio, num, base):
    # en cualquier serie (Daniel tuvo una serie 2 en 2022): la factura que tiene esa linea
    cand = []
    for x in b.leer('facturas?tipo=eq.factura&empresa_emisora=eq.%s&anio=eq.%s&numero=eq.%s&select=id,estado,anio,serie' % (emisor, anio, num)):
        ls = [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base&order=posicion' % x['id']) if l['base'] and abs(float(l['base']) - base) < 0.01]
        if ls: cand.append((x, ls))
    assert len(cand) == 1, (emisor, anio, num, base, len(cand))
    f, ls = [cand[0][0]], cand[0][1]
    libres = [l for l in ls if not b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % l['id'])]
    assert libres, ('ya casada', emisor, anio, num, base)
    cobrada = f[0]['anio'] <= 2023 and f[0]['estado'] != 'anulada' or f[0]['estado'] == 'cobrada'
    return cobrada, libres[0]


ya = {h['descripcion'] for h in b.leer('hojas_encargo?tipo_documento=eq.pedido&select=descripcion&order=id') if h['descripcion']}
total_enl = 0
for opp, fecha, ficheros, numeros, lineas, facturas, anular, notaped in PEDIDOS:
    o = b.leer('oportunidades?codigo=eq.%s&select=id,nombre,comunidad_id' % opp)[0]
    desc = 'Pedido FAIN %s · %s' % (' / '.join('%s %s' % x for x in numeros), o['nombre'])
    emisores = {e for e, *_ in facturas}
    emisor = 'accesalia' if 'accesalia' in emisores else 'daniel_autonomo'
    print('== %s %s %s | %s' % (opp, o['nombre'], fecha, ficheros[0][:60]))
    for f in ficheros:
        assert os.path.exists(CARPETA + f), f
    usados = []
    for e, an, nu, base, partes in facturas:
        _, fl = linea_factura(e, an, nu, base)
        assert abs(sum(i for _, _, i in partes) - base) < 0.01, (an, nu, base, partes)
        usados.append(fl['id'])
    assert len(set(usados)) == len(usados), 'dos facturas a la misma linea de factura'
    if desc in ya:
        print('   ya estaba'); continue
    fact = sum(base for *_, base, _ in facturas)
    tot = sum(imp for _, _, imp, _ in lineas)
    print('   lineas %s | facturado %s de %s%s' % (' + '.join('%s %s' % (d[:12], imp) for d, _, imp, _ in lineas), fact, tot,
                                                  ' (el 20 % final va en la PD-2024-0005)' if anular else ''))
    for e, an, nu, base, partes in facturas:
        print('     %s %s/%s %s -> %s' % (e[:3], an, nu, base, ', '.join('%s %s %s' % ('proy' if li == P else 'css', t, i) for li, t, i in partes)))
    total_enl += len(facturas)
    if not ESCRIBIR:
        continue
    anio = int(fecha[:4])
    codigo = rpc('siguiente_codigo', {'p_tipo': 'PD', 'p_anio': anio})
    h = alta('hojas_encargo', {'numero_hoja': codigo, 'tipo_documento': 'pedido', 'oportunidad_id': o['id'], 'comunidad_id': o['comunidad_id'],
                               'pagador_tipo': 'contrata', 'pagador_contrata_id': FAIN, 'emisor': emisor, 'fecha_creacion': fecha, 'fecha_firma': fecha,
                               'estado': 'devuelta_firmada', 'fecha_estado': fecha + 'T00:00:00+00:00', 'descripcion': desc})
    rutas = []
    for f in ficheros:
        limpio = re.sub(r'[^A-Za-z0-9._-]+', '-', n(f)).strip('-')[:80]
        ruta = 'hojas-encargo/%s/firmada-%s-%s' % (h['id'], uuid.uuid4().hex[:8], limpio)
        tipo = 'image/jpeg' if f.lower().endswith(('.jpg', '.jpeg')) else 'application/pdf'
        b.subir(ALMACEN, ruta, open(CARPETA + f, 'rb').read(), tipo=tipo)
        rutas.append('almacen:%s/%s' % (ALMACEN, ruta))
    v = alta('versiones_hoja', {'hoja_encargo_id': h['id'], 'numero_version': 1, 'fecha_generada': fecha, 'fecha_enviada': fecha, 'pdfs_firmados': rutas,
                                'importe_base': tot, 'iva_porcentaje': 21, 'forma_pago': 'Norma de FAIN: proyecto 50/30/20, CSS 80/20',
                                'notas': ('Pedido de FAIN de %s dado de alta el %s desde PRESUPUESTOS FIRMADOS (%s): sus facturas de 2020-2024 estaban sueltas %s. %s'
                                          % (anio, HOY, ' + '.join(ficheros), M, notaped)).strip()})
    b.actualizar('hojas_encargo?id=eq.' + h['id'], {'version_firmada_id': v['id']})
    hitos_de = []
    for d, bq, imp, rep in lineas:
        lf = alta('lineas_facturacion', {'hoja_encargo_id': h['id'], 'bloque_id': BL[bq], 'descripcion': d, 'importe': imp, 'es_porcentaje': False,
                                         'origen': 'pedido', 'verificado': True, 'emisor': emisor, 'pagador_tipo': 'contrata', 'pagador_id': FAIN,
                                         'forma_cobro': 'transferencia'})
        hs = {}
        for k, (t, p) in enumerate(rep, 1):
            hs[t] = alta('hitos_cobro', {'linea_facturacion_id': lf['id'], 'hito': t, 'orden': k, 'porcentaje': p, 'importe': round(imp * p / 100, 2),
                                         'estado': 'pendiente', 'notas': 'Norma de FAIN %s.' % M})
        hitos_de.append(hs)
        b.insertar('codigos_cliente_linea', [{'linea_facturacion_id': lf['id'], 'etiqueta': e, 'valor': val, 'orden': k + 1} for k, (e, val) in enumerate(numeros)])
    for li, t, portal in anular:
        b.actualizar('hitos_cobro?id=eq.%s' % hitos_de[li][t]['id'], {'estado': 'anulado', 'notas': 'Va en la PD-2024-0005 («CFO visado %s», 620 = CFO 500 + CSS 120) %s.' % (portal, M)})
    cubierto = {}
    for e, an, nu, base, partes in facturas:
        cob, fl = linea_factura(e, an, nu, base)
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
                                          'autor': 'Revisión a mano con Mónica (%s)' % HOY, 'texto': notaped}])
    print('   ESCRITO', codigo)

# Etruria 28 y Lucano 65: su 20 % final (CFO 500 + CSS 120) a la PD-2024-0005, como hizo e3 con la 262-2024
for num, portal in ((263, 'Etruria 28'), (264, 'Lucano 65')):
    hit = [x for x in b.leer('hitos_cobro?select=id,importe,estado,l:linea_facturacion_id(descripcion,h:hoja_encargo_id(numero_hoja))&hito=eq.otro&importe=eq.620')
           if x['l'] and x['l']['h'] and x['l']['h']['numero_hoja'] == 'PD-2024-0005' and x['l']['descripcion'] == 'CFO visado %s' % portal]
    assert len(hit) == 1, portal
    partes = [linea_factura('accesalia', 2024, num, 500), linea_factura('accesalia', 2024, num, 120)]
    print('== PD-2024-0005 «CFO visado %s» <- acc 2024/%s (500 + 120)' % (portal, num))
    if ESCRIBIR:
        for (cob, fl), i in zip(partes, (500, 120)):
            b.insertar('factura_linea_hitos', [{'factura_linea_id': fl['id'], 'hito_cobro_id': hit[0]['id'], 'importe': i, 'como': 'a_mano'}])
        b.actualizar('hitos_cobro?id=eq.' + hit[0]['id'], {'estado': 'completado'})
print('facturas: %d' % total_enl, 'ESCRITO' if ESCRIBIR else '(en seco)')
