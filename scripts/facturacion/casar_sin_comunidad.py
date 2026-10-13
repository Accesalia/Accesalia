# -*- coding: utf-8 -*-
""""NO SE ENCUENTRA LA COMUNIDAD": eran errores de escritura o de corte, no faltaban (Monica, 13-oct-2026: "si"):
  Santa Maria la Blanca 3 / 5 / Iglesia 22 (Alcorcon), comunidad "SANTAMARIA" junto: la 2026/168 (Iglesia 22) estaba
     casada con la hoja del 3 (HE-2026-0244) -> pasa a HE-2026-0248; 2026/169 -> HE-2026-0244; 2026/170 -> HE-2026-0245.
  Av del Oeste 1-3 Alcorcon (aparcamiento Valladolid): HE-2025-0149 decia emisor Accesalia, facturo Daniel (2025/19,
     2025/29) -> manda la factura: emisor Daniel, y las dos casadas (encargo / entrega).
  Marques de Corbera 36B: hoja del 14-10-2021 a ELECNOR "no firmado pero valido" (+ correo de honorarios), fuera por el
     corte de 2022 -> alta como hoja de 2021 aceptada, 4.000 en 60/20/20, y la 2026/221 (20 % CFO) casada.
  python scripts/facturacion/casar_sin_comunidad.py [--escribir]
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
ya = {x['hito_cobro_id'] for x in b.leer('factura_linea_hitos?select=hito_cobro_id&order=factura_linea_id,hito_cobro_id')}
BL = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo&order=id')}


def alta(tabla, fila):
    req = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))[0]


def rpc(nombre, args):
    req = urllib.request.Request(b.url + '/rest/v1/rpc/' + nombre, data=json.dumps(args).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))


def flinea(emisor, anio, num, base, libre=True):
    f = b.leer('facturas?empresa_emisora=eq.%s&anio=eq.%s&serie=eq.1&numero=eq.%s&select=id,estado' % (emisor, anio, num))[0]
    ls = [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base&order=posicion' % f['id']) if l['base'] and abs(float(l['base']) - base) < 0.01]
    assert len(ls) == 1, (anio, num, ls)
    if libre:
        assert not b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % ls[0]['id']), ('ya casada', anio, num)
    return f, ls[0]


def hito(hoja, plazo):
    h = b.leer('hojas_encargo?numero_hoja=eq.%s&select=id' % hoja)[0]['id']
    out = [x for l in b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&select=id&order=id' % h)
           for x in b.leer('hitos_cobro?linea_facturacion_id=eq.%s&hito=eq.%s&hito_padre_id=is.null&select=id,importe,linea_facturacion_id&order=orden' % (l['id'], plazo))]
    assert len(out) == 1, (hoja, plazo, out)
    return out[0]


def casar(fac, x):
    f, fl = fac
    assert x['id'] not in ya and abs(float(x['importe']) - float(fl['base'])) < 0.01, (x, fl)
    print('   %s -> %s' % (fl['base'], x['importe']))
    if ESCRIBIR:
        b.insertar('factura_linea_hitos', [{'factura_linea_id': fl['id'], 'hito_cobro_id': x['id'], 'importe': float(fl['base']), 'como': 'a_mano'}])
        if f['estado'] == 'cobrada':
            b.actualizar('hitos_cobro?id=eq.%s' % x['id'], {'estado': 'completado'})


# 1 · Santa Maria la Blanca
print('Santa Maria la Blanca 3 / 5 / Iglesia 22')
h244, h245, h248 = hito('HE-2026-0244', 'encargo'), hito('HE-2026-0245', 'encargo'), hito('HE-2026-0248', 'encargo')
f168 = flinea('accesalia', 2026, 168, 1250.0, libre=False)
enlace = b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % f168[1]['id'])
assert [e['hito_cobro_id'] for e in enlace] == [h244['id']], enlace
print('   2026/168 (Iglesia 22): de HE-2026-0244 a HE-2026-0248')
if ESCRIBIR:
    b.actualizar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (f168[1]['id'], h244['id']), {'hito_cobro_id': h248['id']})
    b.actualizar('hitos_cobro?id=eq.%s' % h248['id'], {'estado': 'completado' if f168[0]['estado'] == 'cobrada' else 'pendiente'})
    b.actualizar('hitos_cobro?id=eq.%s' % h244['id'], {'estado': 'pendiente'})
ya.discard(h244['id'])
casar(flinea('accesalia', 2026, 169, 1250.0), h244)
casar(flinea('accesalia', 2026, 170, 1250.0), h245)

# 2 · Av del Oeste 1-3
print('Av del Oeste 1-3: emisor Daniel')
he = b.leer('hojas_encargo?numero_hoja=eq.HE-2025-0149&select=id')[0]['id']
enc, ent = hito('HE-2025-0149', 'encargo'), hito('HE-2025-0149', 'entrega')
if ESCRIBIR:
    b.actualizar('hojas_encargo?id=eq.' + he, {'emisor': 'daniel_autonomo'})
    b.actualizar('lineas_facturacion?id=eq.' + enc['linea_facturacion_id'],
                 {'emisor': 'daniel_autonomo', 'notas': 'Factura Daniel (2025/19, 2025/29); la hoja decia Accesalia: manda la factura %s.' % M})
casar(flinea('daniel', 2025, 19, 2000.0), enc)
casar(flinea('daniel', 2025, 29, 2000.0), ent)

# 3 · Marques de Corbera 36B
print('Marques de Corbera 36B: hoja de 2021 a ELECNOR, 4.000 (60/20/20); 2026/221 -> CFO')
FICHEROS = ['HOJA DE ENCARGO marques de corbera 36b madrid ANTIGUO PROYECTO DO + CSS no firmado pero valido.docx',
            'marques de corbera 36b madrid 08-10-2021 Gmail - HONORARIOS.pdf']
for f in FICHEROS:
    assert os.path.exists(CARPETA + f), f
o = b.leer('oportunidades?codigo=eq.DAN-2020-051&select=id,comunidad_id')[0]
assert not b.leer('hojas_encargo?oportunidad_id=eq.%s&select=id' % o['id'])
ELECNOR = b.leer('contratas?nombre=eq.ELECNOR&select=id')[0]['id']
f221 = flinea('accesalia', 2026, 221, 800.0)
if ESCRIBIR:
    fecha = '2021-10-14'
    codigo = rpc('siguiente_codigo', {'p_tipo': 'HE', 'p_anio': 2021})
    nota = ('Hoja de 14-10-2021 a ELECNOR "no firmado pero valido" (PRESUPUESTOS FIRMADOS) + correo de HONORARIOS del 08-10-2021. Quedo '
            'fuera por el corte de 2022; ELECNOR la sigue facturando (2026/221, 20 %% CFO) %s.' % M)
    h = alta('hojas_encargo', {'numero_hoja': codigo, 'tipo_documento': 'hoja_encargo', 'oportunidad_id': o['id'], 'comunidad_id': o['comunidad_id'],
                               'pagador_tipo': 'contrata', 'pagador_contrata_id': ELECNOR, 'emisor': 'accesalia', 'fecha_creacion': fecha,
                               'fecha_firma': fecha, 'estado': 'devuelta_firmada', 'fecha_estado': fecha + 'T00:00:00+00:00',
                               'descripcion': 'Ascensor (proyecto, licencia, DO, CFO y CSS) · ELECNOR'})
    rutas = []
    for f in FICHEROS:
        limpio = re.sub(r'[^A-Za-z0-9._-]+', '-', unicodedata.normalize('NFD', f).encode('ascii', 'ignore').decode()).strip('-')[:80]
        ruta = 'hojas-encargo/%s/firmada-%s-%s' % (h['id'], uuid.uuid4().hex[:8], limpio)
        tipo = 'application/pdf' if f.endswith('.pdf') else 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        b.subir(ALMACEN, ruta, open(CARPETA + f, 'rb').read(), tipo=tipo)
        rutas.append('almacen:%s/%s' % (ALMACEN, ruta))
    v = alta('versiones_hoja', {'hoja_encargo_id': h['id'], 'numero_version': 1, 'fecha_generada': fecha, 'fecha_enviada': fecha, 'pdfs_firmados': rutas,
                                'importe_base': 4000, 'iva_porcentaje': 21,
                                'forma_pago': '60% a la entrega de proyecto, 20% a la obtencion de licencia, 20% al fin de obra', 'notas': nota})
    b.actualizar('hojas_encargo?id=eq.' + h['id'], {'version_firmada_id': v['id']})
    lf = alta('lineas_facturacion', {'hoja_encargo_id': h['id'], 'bloque_id': BL['REDACCION PROYECTO'],
                                     'descripcion': 'Proyecto de instalacion de ascensor (proyecto, licencia, direccion de obra, CFO y CSS)',
                                     'importe': 4000.0, 'es_porcentaje': False, 'origen': 'pdf', 'verificado': True, 'emisor': 'accesalia',
                                     'pagador_tipo': 'contrata', 'pagador_id': ELECNOR, 'forma_cobro': 'transferencia'})
    hs = {}
    for k, (t, p) in enumerate([('entrega', 60), ('licencia', 20), ('cfo', 20)], 1):
        hs[t] = alta('hitos_cobro', {'linea_facturacion_id': lf['id'], 'hito': t, 'orden': k, 'porcentaje': p, 'importe': 4000.0 * p / 100, 'estado': 'pendiente'})
    casar(f221, hs['cfo'])
    b.insertar('notas_facturacion', [{'hoja_encargo_id': h['id'], 'fecha': HOY, 'origen': 'factusol', 'autor': 'Casado con Factusol', 'texto': nota}])
    print('   ESCRITO', codigo)
print('ESCRITO' if ESCRIBIR else '(en seco)')
