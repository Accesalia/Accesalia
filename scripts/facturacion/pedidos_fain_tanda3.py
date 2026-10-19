# -*- coding: utf-8 -*-
"""FACTURAS DE FAIN SUELTAS CON PAPEL ENCONTRADO (hilo 68 con Monica, 19-oct-2026).

Tras pedidos_fain_dropbox.py quedaban 163 lineas de facturas a FAIN sin hoja (Excel facturas_fain_sueltas_por_obra.xlsx).
Monica: «las que has encontrado con que cuadrarlas, hazlo; las otras lo vemos luego». Aqui van:
  A) hojas PD nuevas con su papel: las hojas de encargo de Daniel a FAIN de 2019 (carpeta de Dropbox PEDIDOS FAIN) y
     los correos de pedido de Drive (PRESUPUESTOS FIRMADOS). Las facturas de 2019 no estan en la app: el hito que se
     cobraria en 2019 queda pendiente con su nota.
  B) facturas que faltaban en hojas PD que ya estaban.
  C) la linea de subvencion en los pedidos donde FAIN pago la tramitacion con su codigo de pedido (Monica: «si hay
     codigo de pedido, lo añadimos»).
  python scripts/facturacion/pedidos_fain_tanda3.py [--escribir]
"""
import sys, os, re, json, uuid, datetime, unicodedata, urllib.request
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
M = '(Monica, %s)' % HOY
AUTOR = 'Revisión a mano con Mónica (%s)' % HOY
DROP = 'C:/accesalia Dropbox/D SM/Extraido de ascensores/1 ACCESALIA/FAIN/PEDIDOS FAIN/'
DRIVE = 'G:/Mi unidad/MONICA ACCESALIA/PRESUPUESTOS/PRESUPUESTOS FIRMADOS/'
ALMACEN = 'documentos-comerciales'
b = arrancar()
cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
FAIN = b.leer('contratas?nombre=eq.FAIN&select=id')[0]['id']
BL = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo&order=id')}
P, C = 0, 1
N2019 = 'Se facturaría en 2019: las facturas de 2019 no están en la app %s.' % M


def proy(imp, d='Proyecto'):
    return (d, 'REDACCION PROYECTO', imp, [('entrega', imp * .5), ('licencia', imp * .3), ('cfo', imp * .2)])


def css(imp=600):
    return ('Coordinacion de Seguridad y Salud', 'CSS', imp, [('pss', imp * .8), ('cfo', imp * .2)])


# A) (opp, fecha, [ficheros], numeros, lineas, facturas [(emisor, anio, num, base, [(linea, hito, importe)])], notas de hito {(linea, hito): nota}, nota)
PEDIDOS = [
    ('DAN-2019-040', '2019-07-05', [DROP + '2FAINquilichao6firmado.pdf', DROP + '2FAINquilichaocssfirmado.pdf'],
     [('Pedido Fain', '95002172'), ('Grafo/Orden', '4007889'), ('Pedido de compra', '171336')], [proy(2500), css()],
     [('daniel', 2021, 21, 750, [(P, 'licencia', 750)]), ('daniel', 2022, 16, 480, [(C, 'pss', 480)]),
      ('daniel', 2023, 90, 120, [(C, 'cfo', 120)]), ('daniel', 2023, 91, 500, [(P, 'cfo', 500)])],
     {(P, 'entrega'): N2019 + ' Mónica la busca.'}, 'Hojas de encargo de Daniel a FAIN (proyecto y CSS) firmadas, con sus códigos.'),
    ('DAN-2019-038', '2019-07-05', [DROP + '1FAINofelianieto16proyecto.pdf', DROP + '1FAINofelianieto16css.pdf'],
     [('Pedido Fain', '95002171'), ('Grafo/Orden', '4007888'), ('Pedido de compra', '171340')], [proy(2500), css()],
     [('daniel', 2022, 79, 750, [(P, 'licencia', 750)]), ('daniel', 2024, 77, 500, [(P, 'cfo', 500)]), ('daniel', 2024, 77, 120, [(C, 'cfo', 120)])],
     {(P, 'entrega'): N2019, (C, 'pss'): 'No aparece la factura del 80 %% de la CSS %s.' % M},
     'Hojas de encargo de Daniel a FAIN (proyecto y CSS). La CSS lleva el pedido de compra 171342.'),
    ('DAN-2019-064', '2019-11-18', [DROP + '8FAINmariblanca12proyecto.pdf', DROP + '8FAINmariblanca12css.pdf',
                                    DROP + 'aceptados/2020/Gmail - Fwd_ OBRA_ MARIBLANCA, 12 MÓSTOLES CODIGOS DE PEDIDO ARQUITECTO.pdf'],
     [('Pedido Fain', '95002263'), ('Grafo/Orden', '4008097'), ('Pedido de compra', '181625')], [proy(2500), css()],
     [('daniel', 2020, 22, 750, [(P, 'licencia', 750)]), ('daniel', 2020, 39, 480, [(C, 'pss', 480)]),
      ('daniel', 2021, 70, 500, [(P, 'cfo', 500)]), ('daniel', 2021, 71, 120, [(C, 'cfo', 120)])],
     {(P, 'entrega'): N2019},
     'Hojas de encargo de Daniel a FAIN (proyecto 2.500 y CSS 600). El correo de FAIN de jun-2020 (pedido de compra 194083) habla de «proyecto 600 + CSYS 144»: no cuadra con lo facturado, que sigue las hojas.'),
    ('DAN-2019-069', '2019-12-13', [DROP + '11FAINgeneralramirez22proyecto.pdf', DROP + '11FAINgeneralramirez22css.pdf'],
     [('Pedido Fain', '95002268'), ('Grafo/Orden', '4008111'), ('Pedido de compra', '181200'), ('Proveedor', '102154')], [proy(2500), css()],
     [('daniel', 2021, 3, 1250, [(P, 'entrega', 1250)])], {}, 'Hojas de encargo de Daniel a FAIN (proyecto y CSS). Solo se ha facturado el 50 % del proyecto.'),
    ('DAN-2019-065', '2019-11-12', [DROP + '9FAINcarlosv39proyecto.pdf'],
     [('Pedido Fain', '800109891'), ('Grafo/Orden', '7136677')], [proy(1300, 'Proyecto de bajada a cota cero')],
     [('daniel', 2020, 16, 650, [(P, 'entrega', 650)])], {}, 'Hoja de encargo de Daniel a FAIN: bajada a cota cero, 1.300. Solo se ha facturado el 50 %.'),
    ('DAN-2021-062', '2021-10-06', [DRIVE + 'Trujillo 3 Alcorcon poceria octubre 2021 SIMP_FUE_0121101512530.pdf'],
     [('Pedido Fain', '95002625'), ('Grafo/Orden', '4009167'), ('Pedido de compra', '265390')],
     [('Proyecto de pocería', 'REDACCION PROYECTO', 1000, [('entrega', 1000)])],
     [('accesalia', 2022, 11, 1000, [(0, 'entrega', 1000)])], {}, 'Hoja de encargo de Daniel: proyecto de pocería, 1.000, facturado a FAIN.'),
    ('DAN-2022-051', '2022-01-10', [DRIVE + 'FRAY JUAN GIL 3 ALCALA DE HENARES SOLICITUD 10-01-2022.pdf'],
     [('Pedido Fain', '95002716'), ('Grafo/Orden', '4009372'), ('Pedido de compra', '244360'), ('Oferta', '9029221')], [proy(2500), css()],
     [('daniel', 2022, 21, 1250, [(P, 'entrega', 1250)]), ('daniel', 2022, 50, 750, [(P, 'licencia', 750)]), ('daniel', 2022, 50, 480, [(C, 'pss', 480)]),
      ('daniel', 2023, 89, 500, [(P, 'cfo', 500)]), ('daniel', 2023, 89, 120, [(C, 'cfo', 120)])], {},
     'Correo de FAIN pidiendo el proyecto y la CSS («2500 + 600»); los códigos salen de las facturas.'),
    ('DAN-2023-317', '2023-09-06', [DRIVE + 'EMIGDIO DE LA RIVA 29 SALAMANCA CODIGOS DE PEDIDO ARQUITECTO deflexiones.pdf'],
     [('Pedido Fain', '95002426'), ('Grafo/Orden', '4008635'), ('Pedido de compra', '296374')],
     [('Cálculo de deflexiones', 'INFORME TECNICO', 300, [('entrega', 300)])],
     [('accesalia', 2023, 164, 300, [(0, 'entrega', 300)])], {}, ''),
]
# B) facturas a hitos de PD que ya estaban: (hoja, [(emisor, anio, num, base, [(descripcion de linea, hito, importe)])], nota)
EXISTENTES = [
    ('PD-2020-0001', [('daniel', 2020, 65, 1550, [('Proyecto', 'entrega', 1550)])], ''),
    ('PD-2021-0003', [('accesalia', 2021, 102, 1250, [('Proyecto', 'entrega', 1250)])], ''),
    ('PD-2022-0007', [('accesalia', 2022, 127, 1050, [('Proyecto', 'entrega', 1050)]), ('accesalia', 2022, 128, 700, [('Proyecto', 'entrega', 700)])],
     'El 50 % de la entrega se facturó en dos: anteproyecto 30 % (127-2022) y proyecto 20 % (128-2022).'),
    ('PD-2022-0032', [('accesalia', 2022, 17, 1750, [('Proyecto', 'entrega', 1750)])], ''),
    ('PD-2022-0033', [('accesalia', 2022, 19, 1750, [('Proyecto', 'entrega', 1750)])], ''),
    ('PD-2022-0036', [('accesalia', 2024, 154, 1100, [('Proyecto', 'cfo', 500), ('Coordinación de Seguridad y Salud', 'pss', 480), ('Coordinación de Seguridad y Salud', 'cfo', 120)])],
     'La 154-2024 («honorarios restantes», 1.100) cobra el CFO del proyecto (500) y la CSS entera (480 + 120).'),
    ('PD-2021-0002', [('accesalia', 2021, 69, 1250, [('Proyecto', 'entrega', 1250)])], ''),
]
# C) linea de subvencion en pedidos ya dados de alta: (hoja, importe, [(hito, importe)], facturas [(emisor, anio, num, base, hito)], nota)
SUBV = [
    ('PD-2020-0012', 1200, [('presentacion', 960), ('concesion', 240)], [('daniel', 2020, 44, 960, 'presentacion'), ('daniel', 2022, 31, 240, 'concesion')], ''),
    ('PD-2020-0011', 1200, [('presentacion', 960), ('concesion', 240)], [('daniel', 2020, 43, 960, 'presentacion')], 'El 20 % (240) no se llegó a facturar.'),
    ('PD-2021-0022', 1120, [('presentacion', 880), ('concesion', 240)], [('daniel', 2021, 60, 880, 'presentacion'), ('daniel', 2022, 95, 240, 'concesion')],
     'Manda la factura: 880 (el 80 % de 1.100) + 240 = 1.120. El correo de FAIN da 4.600 en total sin desglose.'),
    ('PD-2022-0012', 1500, [('presentacion', 1200), ('concesion', 300)], [('accesalia', 2022, 195, 1200, 'presentacion'), ('accesalia', 2023, 110, 300, 'concesion')],
     'Los códigos de FAIN no incluían la subvención aunque la pagaba FAIN (correo de la oficina a FAIN, jun-2023).'),
]


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
    usadas.add(libres[0]['id'])
    return f['anio'] <= 2023 or f['estado'] == 'cobrada', libres[0]


def marcar(hitos):
    # estado de cada hito segun lo enlazado (hasta 2023 la factura es el cobro)
    for x in hitos:
        cub = 0
        for e in b.leer('factura_linea_hitos?hito_cobro_id=eq.%s&select=importe,fl:factura_linea_id(f:factura_id(anio,estado))' % x['id']):
            f = e['fl']['f']
            if f['estado'] != 'anulada' and (f['anio'] <= 2023 or f['estado'] == 'cobrada'):
                cub += float(e['importe'])
        nuevo = 'completado' if cub >= float(x['importe']) - 0.01 else ('parcial' if cub > 0 else None)
        if nuevo:
            b.actualizar('hitos_cobro?id=eq.%s&estado=in.(pendiente,parcial)' % x['id'], {'estado': nuevo})


def nota(hoja_id, texto, hito_id=None):
    b.insertar('notas_facturacion', [{'hoja_encargo_id': hoja_id, 'hito_cobro_id': hito_id, 'fecha': HOY, 'origen': 'factusol', 'tipo': 'nota', 'autor': AUTOR, 'texto': texto}])


total = 0
ya = {h['descripcion'] for h in b.leer('hojas_encargo?tipo_documento=eq.pedido&select=descripcion&order=id') if h['descripcion']}
print('### A) hojas PD nuevas')
for opp, fecha, ficheros, numeros, lineas, facturas, notas_hito, notaped in PEDIDOS:
    o = b.leer('oportunidades?codigo=eq.%s&select=id,nombre,comunidad_id' % opp)[0]
    desc = 'Pedido FAIN %s · %s' % (' / '.join('%s %s' % x for x in numeros), o['nombre'])
    print('== %s %s %s' % (opp, o['nombre'], fecha))
    for f in ficheros:
        assert os.path.exists(f), f
    if desc in ya:
        print('   ya estaba'); continue
    for d, bq, imp, rep in lineas:
        assert abs(sum(i for _, i in rep) - imp) < 0.01 and bq in BL, (opp, d)
    usadas, casadas = set(), []
    for e, an, nu, base, partes in facturas:
        assert abs(sum(i for _, _, i in partes) - base) < 0.01, (an, nu)
        casadas.append(linea_factura(e, an, nu, base, usadas))
    tot = sum(imp for _, _, imp, _ in lineas)
    print('   %s | facturado %s de %s' % (' + '.join('%s %g' % (d[:20], imp) for d, _, imp, _ in lineas), sum(x[3] for x in facturas), tot))
    for e, an, nu, base, partes in facturas:
        print('     %s %s/%s %s -> %s' % (e[:3], an, nu, base, ', '.join('%s %s %g' % (lineas[li][0][:5].lower(), t, i) for li, t, i in partes)))
    for (li, t), tx in notas_hito.items():
        print('     pendiente %s %s: %s' % (lineas[li][0][:5].lower(), t, tx))
    total += len(facturas)
    if not ESCRIBIR:
        continue
    emisor = 'accesalia' if any(e == 'accesalia' for e, *_ in facturas) else 'daniel_autonomo'
    codigo = rpc('siguiente_codigo', {'p_tipo': 'PD', 'p_anio': int(fecha[:4])})
    h = alta('hojas_encargo', {'numero_hoja': codigo, 'tipo_documento': 'pedido', 'oportunidad_id': o['id'], 'comunidad_id': o['comunidad_id'],
                               'pagador_tipo': 'contrata', 'pagador_contrata_id': FAIN, 'emisor': emisor, 'fecha_creacion': fecha, 'fecha_firma': fecha,
                               'estado': 'devuelta_firmada', 'fecha_estado': fecha + 'T00:00:00+00:00', 'descripcion': desc})
    rutas = []
    for f in ficheros:
        limpio = re.sub(r'[^A-Za-z0-9._-]+', '-', n(os.path.basename(f))).strip('-')[:80]
        ruta = 'hojas-encargo/%s/firmada-%s-%s' % (h['id'], uuid.uuid4().hex[:8], limpio)
        b.subir(ALMACEN, ruta, open(f, 'rb').read(), tipo='application/pdf')
        rutas.append('almacen:%s/%s' % (ALMACEN, ruta))
    v = alta('versiones_hoja', {'hoja_encargo_id': h['id'], 'numero_version': 1, 'fecha_generada': fecha, 'fecha_enviada': fecha, 'pdfs_firmados': rutas,
                                'importe_base': tot, 'iva_porcentaje': 21,
                                'forma_pago': 'Norma de FAIN: proyecto 50/30/20, CSS 80/20' if any(bq in ('REDACCION PROYECTO', 'CSS') and len(rep) > 1 for _, bq, _, rep in lineas) else None,
                                'notas': ('Pedido de FAIN dado de alta el %s (%s): sus facturas estaban sueltas %s. %s'
                                          % (HOY, ' + '.join(os.path.basename(f) for f in ficheros), M, notaped)).strip()})
    b.actualizar('hojas_encargo?id=eq.' + h['id'], {'version_firmada_id': v['id']})
    hitos_de = []
    for li, (d, bq, imp, rep) in enumerate(lineas):
        lf = alta('lineas_facturacion', {'hoja_encargo_id': h['id'], 'bloque_id': BL[bq], 'descripcion': d, 'importe': imp, 'es_porcentaje': False,
                                         'origen': 'pedido', 'verificado': True, 'emisor': emisor, 'pagador_tipo': 'contrata', 'pagador_id': FAIN,
                                         'forma_cobro': 'transferencia'})
        hs = {}
        for k, (t, i) in enumerate(rep, 1):
            tx = notas_hito.get((li, t)) or ('Norma de FAIN %s.' % M if len(rep) > 1 else 'Según el papel %s.' % M)
            hs[t] = alta('hitos_cobro', {'linea_facturacion_id': lf['id'], 'hito': t, 'orden': k, 'porcentaje': round(i * 100 / imp, 2), 'importe': round(i, 2),
                                         'estado': 'pendiente', 'notas': tx})
            if (li, t) in notas_hito:
                nota(h['id'], tx, hs[t]['id'])
        hitos_de.append(hs)
        b.insertar('codigos_cliente_linea', [{'linea_facturacion_id': lf['id'], 'etiqueta': e, 'valor': val, 'orden': k + 1} for k, (e, val) in enumerate(numeros)])
    for (cob, fl), (e, an, nu, base, partes) in zip(casadas, facturas):
        for li, t, i in partes:
            b.insertar('factura_linea_hitos', [{'factura_linea_id': fl['id'], 'hito_cobro_id': hitos_de[li][t]['id'], 'importe': i, 'como': 'a_mano'}])
    marcar([x for hs in hitos_de for x in hs.values()])
    if notaped:
        nota(h['id'], notaped)
    print('   ESCRITO', codigo)

print('### B) facturas a PD que ya estaban')
for hoja, facturas, notaped in EXISTENTES:
    h = b.leer('hojas_encargo?numero_hoja=eq.%s&select=id,descripcion,lineas:lineas_facturacion(descripcion,quitada_en,hitos:hitos_cobro(id,hito,importe,estado,hito_padre_id))' % hoja)[0]
    print('== %s %s' % (hoja, h['descripcion'][-45:]))
    usadas, plan = set(), []
    for e, an, nu, base, partes in facturas:
        assert abs(sum(i for _, _, i in partes) - base) < 0.01
        cob, fl = linea_factura(e, an, nu, base, usadas)
        for dl, t, i in partes:
            ls = [l for l in h['lineas'] if l['descripcion'] == dl and not l['quitada_en']]
            assert len(ls) == 1, (hoja, dl)
            hs = [x for x in ls[0]['hitos'] if x['hito'] == t and x['estado'] in ('pendiente', 'parcial') and not x['hito_padre_id']]
            assert len(hs) == 1 and abs(float(hs[0]['importe']) - i) < 0.01 or (len(hs) == 1 and float(hs[0]['importe']) >= i), (hoja, dl, t, hs)
            plan.append((fl['id'], hs[0], i))
            print('     %s %s/%s %s -> %s %s %g (hito de %s)' % (e[:3], an, nu, base, dl[:5].lower(), t, i, hs[0]['importe']))
    total += len(facturas)
    if ESCRIBIR:
        for fid, x, i in plan:
            b.insertar('factura_linea_hitos', [{'factura_linea_id': fid, 'hito_cobro_id': x['id'], 'importe': i, 'como': 'a_mano'}])
        marcar({x['id']: x for _, x, _ in plan}.values())
        if notaped:
            nota(h['id'], notaped)
        print('   ESCRITO')

print('### C) linea de subvencion')
for hoja, imp, rep, facturas, notaped in SUBV:
    h = b.leer('hojas_encargo?numero_hoja=eq.%s&select=id,emisor,descripcion,lineas:lineas_facturacion(id,descripcion)' % hoja)[0]
    print('== %s %s | subvencion %g (%s)' % (hoja, h['descripcion'][-30:], imp, '/'.join('%s %g' % x for x in rep)))
    if any(l['descripcion'] == 'Tramitación de subvenciones' for l in h['lineas']):
        print('   ya estaba'); continue
    assert abs(sum(i for _, i in rep) - imp) < 0.01
    usadas, casadas = set(), []
    for e, an, nu, base, t in facturas:
        casadas.append(linea_factura(e, an, nu, base, usadas))
        print('     %s %s/%s %s -> %s' % (e[:3], an, nu, base, t))
    total += len(facturas)
    if not ESCRIBIR:
        continue
    cods = b.leer('codigos_cliente_linea?select=etiqueta,valor,orden&linea_facturacion_id=eq.%s&order=orden' % h['lineas'][0]['id'])
    lf = alta('lineas_facturacion', {'hoja_encargo_id': h['id'], 'bloque_id': BL['TRAMITACION SUBVENCIONES'], 'descripcion': 'Tramitación de subvenciones', 'importe': imp,
                                     'es_porcentaje': False, 'origen': 'pedido', 'verificado': True, 'emisor': h['emisor'], 'pagador_tipo': 'contrata', 'pagador_id': FAIN,
                                     'forma_cobro': 'transferencia'})
    hs = {}
    for k, (t, i) in enumerate(rep, 1):
        hs[t] = alta('hitos_cobro', {'linea_facturacion_id': lf['id'], 'hito': t, 'orden': k, 'porcentaje': round(i * 100 / imp, 2), 'importe': i, 'estado': 'pendiente',
                                     'notas': 'No está en el correo del pedido: la pagó FAIN con su código de pedido (Mónica: «si hay código de pedido, lo añadimos») %s.' % M})
    if cods:
        b.insertar('codigos_cliente_linea', [{'linea_facturacion_id': lf['id'], 'etiqueta': c['etiqueta'], 'valor': c['valor'], 'orden': c['orden']} for c in cods])
    for (cob, fl), (e, an, nu, base, t) in zip(casadas, facturas):
        b.insertar('factura_linea_hitos', [{'factura_linea_id': fl['id'], 'hito_cobro_id': hs[t]['id'], 'importe': base, 'como': 'a_mano'}])
    marcar(hs.values())
    nota(h['id'], ('Línea de subvención añadida: no estaba en el correo del pedido pero FAIN la pagó con su código de pedido %s. %s' % (M, notaped)).strip())
    print('   ESCRITO')
print('facturas: %d' % total, 'ESCRITO' if ESCRIBIR else '(en seco)')
