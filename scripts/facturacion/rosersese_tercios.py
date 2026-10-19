# -*- coding: utf-8 -*-
"""ROSERSESE: cada factura a su tercio, por LO QUE DICE (Mónica, 19-oct-2026: «Rosersese va a ser muy fácil»).
Sus hojas: ⅓ al encargo, ⅓ a la entrega del proyecto, ⅓ a la concesión de licencia; CSS a la firma del acta.
Las facturas lo dicen: «(1/3)», «(2/3)», «(3/3)», «segundo tercio», «último tercio», «tercera parte (CFO)»...
  - las que estaban en el tercio que no es, a su tercio (Mariblanca 10, Etna 14, Av. Sierra 5, El Greco 12, Río Tormes 2,
    Navas de Tolosa 7);
  - fuera el enlace a una factura anulada (Pedro Fernández Labrada 3, Daniel 2023/1-87);
  - pagos con su factura colgada que seguían «pendiente» -> facturados.

  python scripts/facturacion/rosersese_tercios.py [--escribir]
"""
import sys, os, re, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
ROS = 'f6ee2fb9-8e0a-472b-87dd-7af19478da77'


def tercio(t):
    t = ' '.join(t.lower().split())
    if re.search(r'\(?\b1\s*/\s*3\b|primera parte|primer tercio', t): return 1
    if re.search(r'\b2\s*/\s*3\b|parte 2 de 3|2 de 3|segunda parte|segundo tercio', t): return 2
    if re.search(r'\b3\s*/\s*3\b|parte 3 de 3|3 de 3|tercera parte|último tercio|ultimo tercio', t): return 3
    return None


ops = []
for h in b.leer('hojas_encargo?select=id,numero_hoja&pagador_contrata_id=eq.%s&order=numero_hoja' % ROS):
    for l in b.leer('lineas_facturacion?select=id,descripcion&quitada_en=is.null&hoja_encargo_id=eq.' + h['id']):
        hs = b.leer('hitos_cobro?select=id,hito,importe,estado,orden,hito_padre_id,enl:factura_linea_hitos(factura_linea_id,importe,'
                    'fl:factura_linea_id(concepto,f:factura_id(empresa_emisora,anio,numero,estado)))&linea_facturacion_id=eq.' + l['id'] + '&order=orden')
        top = [x for x in hs if not x['hito_padre_id'] and x['estado'] != 'anulado']
        es_css = 'seguridad' in l['descripcion'].lower() or 'css' in l['descripcion'].lower()
        por_orden = sorted(top, key=lambda x: x['orden'] or 0)
        for x in hs:
            for e in x['enl']:
                f = e['fl']['f']; ref = '%s %s/1-%s' % (f['empresa_emisora'].capitalize(), f['anio'], f['numero'])
                if f['estado'] == 'anulada':
                    ops.append(('desenlazar', (e['factura_linea_id'], x['id']), '%s: fuera %s (anulada)' % (h['numero_hoja'], ref))); continue
                if es_css or x['hito_padre_id'] or len(por_orden) != 3: continue
                t = tercio(e['fl']['concepto'])
                destino = por_orden[t - 1] if t else None
                # «(1/3 de 4.880)» puede ser «un tercio» y no «el primero»: nunca a un pago que ya tiene su factura
                if destino and destino['id'] != x['id'] and not destino['enl']:
                    ops.append(('mover', (e['factura_linea_id'], x['id'], por_orden[t - 1]['id'], float(e['importe'])),
                                '%s: %s («%d/3») de %s a %s' % (h['numero_hoja'], ref, t, x['hito'], por_orden[t - 1]['hito'])))
        for x in top:
            if x['enl'] and x['estado'] == 'pendiente' and all(e['fl']['f']['estado'] != 'anulada' for e in x['enl']):
                ops.append(('estado', x['id'], '%s: %s con factura -> completado' % (h['numero_hoja'], x['hito'])))
for t, d, p in ops: print(p)
if not ESCRIBIR:
    print('EN SECO'); sys.exit()
tocados = set()
for t, d, p in ops:
    if t == 'desenlazar':
        b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % d); tocados.add(d[1])
    elif t == 'mover':
        b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (d[0], d[1]))
        b.insertar('factura_linea_hitos', [dict(factura_linea_id=d[0], hito_cobro_id=d[2], importe=d[3], como='a_mano')])
        tocados.update((d[1], d[2]))
    elif t == 'estado': tocados.add(d)
for hid in tocados:  # cada pago tocado, con su estado según lo que le cuelga
    x = b.leer('hitos_cobro?select=id,importe,estado,enl:factura_linea_hitos(importe)&id=eq.' + hid)[0]
    if x['estado'] == 'anulado': continue
    cob = sum(float(e['importe'] or 0) for e in x['enl'])
    b.actualizar('hitos_cobro?id=eq.' + hid, {'estado': 'completado' if cob >= float(x['importe']) - 1.01 else ('parcial' if cob else 'pendiente')})
print('ESCRITO')
