# -*- coding: utf-8 -*-
"""Camarena 200 (HE-2023-0135): la CSS iba INCLUIDA en los 12.500 de la hoja, pero Daniel la facturo aparte (2025/3,
500, a la firma del acta del plan de seguridad). Monica, 12-oct-2026: "extra cobrado aparte" -> linea nueva de CSS 500
(emisor Daniel, mismo pagador que el proyecto), su hito pss casado con la factura y nota en la hoja.
  python scripts/facturacion/camarena_css_extra.py [--escribir]
"""
import sys, os, json, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
b = arrancar()
h = b.leer('hojas_encargo?numero_hoja=eq.HE-2023-0135&select=id')[0]['id']
pro = b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&descripcion=ilike.Proyecto*&select=*' % h)[0]
f = b.leer('facturas?empresa_emisora=eq.daniel&anio=eq.2025&serie=eq.1&numero=eq.3&select=id,estado')[0]
fl = [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base&order=posicion' % f['id']) if l['base']][0]
css = b.leer('bloques?codigo=eq.CSS&select=id')[0]['id']
ya = b.leer('lineas_facturacion?hoja_encargo_id=eq.%s&bloque_id=eq.%s&select=id' % (h, css))
print('factura Daniel 2025/3:', fl['base'], f['estado'], '| ya hay linea de CSS:', bool(ya))
if ya or not ESCRIBIR:
    sys.exit('(en seco)' if not ya else 'ya estaba')


def crear(tabla, fila):
    cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
    req = urllib.request.Request(b.url + '/rest/v1/' + tabla, method='POST', headers=cab, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'))
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))[0]['id']


nota = 'Extra cobrado aparte: la hoja daba la CSS incluida en los 12.500, pero se facturo aparte (Daniel 2025/3) (Monica, %s).' % HOY
lid = crear('lineas_facturacion', {'hoja_encargo_id': h, 'bloque_id': css, 'descripcion': 'Coordinacion de Seguridad y Salud (extra cobrado aparte)',
                                   'importe': float(fl['base']), 'es_porcentaje': False, 'origen': 'factura', 'verificado': True, 'emisor': 'daniel_autonomo',
                                   'pagador_tipo': pro['pagador_tipo'], 'pagador_id': pro['pagador_id'], 'cuenta_id': pro['cuenta_id'],
                                   'forma_cobro': pro['forma_cobro'], 'notas': nota})
hid = crear('hitos_cobro', {'linea_facturacion_id': lid, 'hito': 'pss', 'orden': 1, 'porcentaje': 100, 'importe': float(fl['base']),
                            'estado': 'completado' if f['estado'] == 'cobrada' else 'pendiente', 'notas': 'A la firma del acta del plan de seguridad (factura Daniel 2025/3).'})
b.insertar('factura_linea_hitos', [{'factura_linea_id': fl['id'], 'hito_cobro_id': hid, 'importe': float(fl['base']), 'como': 'a_mano'}])
b.insertar('notas_facturacion', [{'hoja_encargo_id': h, 'fecha': HOY, 'origen': 'factusol', 'autor': 'Casado con Factusol', 'texto': nota}])
print('ESCRITO: linea CSS 500, hito pss casado, nota en la hoja')
