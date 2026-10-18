# -*- coding: utf-8 -*-
"""Contratas sueltas, tanda 3 (hilo 68 con Monica, 18-oct-2026).
  San Roque 18 Guadalajara: el pedido n.º 3 de ENVOLTERMIA (18-12-2023) entra como PD solo con lo que se le facturo
  (245-2023): gestiones de licencia 2.200 y subvenciones 375 + 375. El proyecto (8.800) es de la comunidad (HE-2023-0024,
  ya enlazado; Envoltermia solo lo pago) y la direccion de obra se facturo a Iberdrola (CT-2025-0001), por certificaciones.
  Vinagrande y Los Castillos: las 9 facturas de 975 (15 % al encargo del adelanto de 6.500 por portal) al hito "encargo"
  de HE-2023-0132 (8.775 = 9 x 975). Monica: "Envoltermia contrato y pago".
  Marina Lavandeira 2 (TKE, 35-2023): demasiado antiguo para saber como quedo (contrato 2018 de 5.000, rebajado a 2.000
  en 2019): nota en la factura, se queda suelta.
  python scripts/facturacion/contratas_tanda3_68.py [--escribir]
"""
import sys, os, re, json, uuid, unicodedata, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = '2026-10-18'
AUTOR = 'Revisión a mano con Mónica (18-oct-2026)'
CARPETA = 'G:/Mi unidad/MONICA ACCESALIA/PRESUPUESTOS/PRESUPUESTOS FIRMADOS/'
b = arrancar()
cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'


def alta(t, f):
    req = urllib.request.Request(b.url + '/rest/v1/' + t, data=json.dumps([f], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))[0]


def rpc(n, a):
    req = urllib.request.Request(b.url + '/rest/v1/rpc/' + n, data=json.dumps(a).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))


def fl(emp, anio, num, base):
    for f in b.leer('facturas?select=id,anio,estado,notas,lineas:factura_lineas(id,base,concepto,flh:factura_linea_hitos(hito_cobro_id))'
                    '&tipo=eq.factura&empresa_emisora=eq.%s&anio=eq.%s&numero=eq.%s' % (emp, anio, num)):
        ls = [l for l in f['lineas'] if abs(float(l['base']) - base) < 0.01 and not l['flh']]
        if ls:
            return f, ls
    raise SystemExit('no esta (o ya casada): %s %s %s %s' % (emp, anio, num, base))


# San Roque 18
o = b.leer('oportunidades?select=id,comunidad_id&codigo=eq.DAN-2023-154')[0]
ENV = b.leer('contratas?select=id,nombre&nombre=ilike.*ENVOLTERMIA*')
assert len(ENV) == 1, ENV
l2200 = fl('accesalia', 2023, 245, 2200)[1][0]
l375 = sorted(fl('accesalia', 2023, 245, 375)[1], key=lambda l: 0 if 'Elaboraci' in l['concepto'] else 1)
assert len(l375) == 2, l375
print('San Roque 18: PD Envoltermia con licencia 2.200 + documentacion 375 + pre-concesion 375 <- 245-2023')
# Vinagrande
h132 = b.leer('hojas_encargo?select=id,lineas:lineas_facturacion(hitos:hitos_cobro(id,hito,importe,estado))&numero_hoja=eq.HE-2023-0132')[0]
enc = [t for l in h132['lineas'] for t in l['hitos'] if t['hito'] == 'encargo' and t['estado'] == 'pendiente']
assert len(enc) == 1 and abs(float(enc[0]['importe']) - 8775) < 0.01, enc
vina = [fl('accesalia', 2024, n, 975)[1][0] for n in (16, 17, 18, 19, 20, 21, 22, 23, 24)]
print('Vinagrande: 9 x 975 = 8.775 -> encargo de HE-2023-0132')
f35, _ = fl('daniel', 2023, 35, 1000)
print('Marina Lavandeira: nota en daniel 35-2023')
if not ESCRIBIR:
    print('(en seco)')
    sys.exit()

fich = 'Pedido 3 Accesalia - SAN ROQUE 18 GUADALAJARA AE22120.pdf'
codigo = rpc('siguiente_codigo', {'p_tipo': 'PD', 'p_anio': 2023})
h = alta('hojas_encargo', {'numero_hoja': codigo, 'tipo_documento': 'pedido', 'oportunidad_id': o['id'], 'comunidad_id': o['comunidad_id'],
                           'pagador_tipo': 'contrata', 'pagador_contrata_id': ENV[0]['id'], 'emisor': 'accesalia', 'fecha_creacion': '2023-12-18',
                           'fecha_firma': '2023-12-18', 'estado': 'devuelta_firmada', 'fecha_estado': '2023-12-18T00:00:00+00:00',
                           'descripcion': 'Pedido ENVOLTERMIA n.º 3 (AE22120) · SAN ROQUE 18 GUADALAJARA'})
limpio = re.sub(r'[^A-Za-z0-9._-]+', '-', unicodedata.normalize('NFKD', fich).encode('ascii', 'ignore').decode()).strip('-')[:80]
ruta = 'hojas-encargo/%s/firmada-%s-%s' % (h['id'], uuid.uuid4().hex[:8], limpio)
b.subir('documentos-comerciales', ruta, open(CARPETA + fich, 'rb').read(), tipo='application/pdf')
v = alta('versiones_hoja', {'hoja_encargo_id': h['id'], 'numero_version': 1, 'fecha_generada': '2023-12-18', 'fecha_enviada': '2023-12-18',
                            'pdfs_firmados': ['almacen:documentos-comerciales/' + ruta], 'importe_base': 2950, 'iva_porcentaje': 21,
                            'notas': 'Pedido de Envoltermia (27.500 en total). Entra solo lo que se le facturó (245-2023): el proyecto es de la '
                                     'comunidad (HE-2023-0024) y la dirección de obra pasó al contrato de Iberdrola (CT-2025-0001). ' + AUTOR})
b.actualizar('hojas_encargo?id=eq.' + h['id'], {'version_firmada_id': v['id']})
filas = []
for desc, imp, linea in (('Gestiones de licencia de obra', 2200, l2200), ('Elaboración y preparación de documentación (subvenciones)', 375, l375[0]),
                         ('Solicitud pre-concesión de subvenciones', 375, l375[1])):
    lf = alta('lineas_facturacion', {'hoja_encargo_id': h['id'], 'descripcion': desc, 'importe': imp, 'es_porcentaje': False, 'origen': 'pedido',
                                     'verificado': True, 'emisor': 'accesalia', 'pagador_tipo': 'contrata', 'pagador_id': ENV[0]['id']})
    t = alta('hitos_cobro', {'linea_facturacion_id': lf['id'], 'hito': 'otro', 'orden': 1, 'porcentaje': 100, 'importe': imp, 'estado': 'completado', 'notas': AUTOR})
    filas.append({'factura_linea_id': linea['id'], 'hito_cobro_id': t['id'], 'importe': imp, 'como': 'a_mano'})
b.insertar('factura_linea_hitos', filas)
b.insertar('factura_linea_hitos', [{'factura_linea_id': x['id'], 'hito_cobro_id': enc[0]['id'], 'importe': 975, 'como': 'a_mano'} for x in vina])
b.actualizar('hitos_cobro?id=eq.' + enc[0]['id'], {'estado': 'completado'})
b.insertar('notas_facturacion', [{'hoja_encargo_id': h132['id'], 'hito_cobro_id': enc[0]['id'], 'fecha': HOY, 'origen': 'factusol', 'tipo': 'nota', 'autor': AUTOR,
                                  'texto': 'El 15 % al encargo (975 x 9 portales) lo facturó y pagó Envoltermia (acc 16 a 24-2024, «según hoja de pedido de 15/01/2024»).'}])
b.actualizar('facturas?id=eq.' + f35['id'], {'notas': ((f35['notas'] or '') + ' Marina Lavandeira 2 (TKE): contrato de 2018 por 5.000, rebajado a 2.000 en 2019 '
                                                       '(anexo, daños en Zaida 22). Demasiado antiguo para saber cómo quedó (Mónica, 18-oct-2026): queda suelta.').strip()})
print('ESCRITO', codigo)
