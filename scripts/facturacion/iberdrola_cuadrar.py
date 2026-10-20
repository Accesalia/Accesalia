# -*- coding: utf-8 -*-
"""Iberdrola (Smart Clima): lo que faltaba para que cada factura cuelgue de su hito (Mónica, 20-oct-2026: «1 ok 2 ok 3 ok 4 ok»).
  1. Betanzos 60 = Torre 1 de la mancomunidad Fermín Caballero 75: el contrato HE-2023-0159 («se firma contrato con Iberdrola
     para la TORRE 1», 18-oct-2023) pasa de DAN-2022-263 (la oferta a la mancomunidad) a DAN-2023-272 (Betanzos 60), y la
     Accesalia 2023/1-218 cuelga de sus dos hitos «a la firma»: libro 8.500 y proyectos 4.037,50.
  2. Zamora, Accesalia 2023/1-181: el hito «otro» de 810 estaba enganchado a la línea de «Elaboración y preparación de
     documentación» (que ya tiene el de presentación); es el de «Solicitud pre-concesión», que no colgaba de nada.
  3. Las facturas de Iberdrola sin opp: la de su contrato (la de los hitos de los que cuelgan).
  4. La ficha de la contrata: las facturas son a IBERDROLA CLIENTES SAU (A95758389), no a Iberdrola S.A. (A48010615).
  python scripts/facturacion/iberdrola_cuadrar.py [--escribir]
"""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
IBERDROLA = '55806ee9-8e81-41e5-9ea1-e69e3b4e7eb9'
opp = lambda c: b.leer('oportunidades?select=id,codigo,comunidad_id&codigo=eq.' + c)[0]
factura = lambda a, n: b.leer('facturas?select=id,oportunidad_id,pagador_nombre,pagador_nif,pagador_domicilio,pagador_poblacion,pagador_cp,pagador_provincia'
                              '&tipo=eq.factura&empresa_emisora=eq.accesalia&anio=eq.%d&numero=eq.%d' % (a, n))[0]
lineas_fac = lambda f: b.leer('factura_lineas?select=id,base,concepto&factura_id=eq.' + f['id'])
cambios = []

# 1. Betanzos 60
bet = opp('DAN-2023-272')
h = b.leer('hojas_encargo?select=id,oportunidad_id,comunidad_id&numero_hoja=eq.HE-2023-0159')[0]
cambios.append(('hojas_encargo?id=eq.' + h['id'], {'oportunidad_id': bet['id'], 'comunidad_id': bet['comunidad_id']}, 'HE-2023-0159 -> DAN-2023-272'))
f218 = factura(2023, 218)
hitos = {}
for l in b.leer('lineas_facturacion?select=id,descripcion&quitada_en=is.null&hoja_encargo_id=eq.' + h['id']):
    for x in b.leer('hitos_cobro?select=id,hito,importe,estado&hito=eq.firma&linea_facturacion_id=eq.' + l['id']):
        hitos[round(float(x['importe']), 2)] = x
enlaces = []
for fl in lineas_fac(f218):
    x = hitos[round(float(fl['base']), 2)]
    assert x['estado'] == 'pendiente', x
    enlaces.append(dict(factura_linea_id=fl['id'], hito_cobro_id=x['id'], importe=float(fl['base']), como='a_mano'))
    cambios.append(('hitos_cobro?id=eq.' + x['id'], {'estado': 'completado'}, 'Accesalia 2023/1-218 %s -> firma %s' % (fl['base'], x['importe'])))

# 2. Zamora, 2023/1-181
f181 = factura(2023, 181)
fls = lineas_fac(f181)
elab = [l for l in fls if 'laboración y preparación' in l['concepto']][0]
soli = [l for l in fls if 'Solicitud pre-concesi' in l['concepto']][0]
otro = [e for e in b.leer('factura_linea_hitos?select=hito_cobro_id,h:hito_cobro_id(hito,importe)&factura_linea_id=eq.' + elab['id']) if e['h']['hito'] == 'otro']
assert len(otro) == 1 and not b.leer('factura_linea_hitos?select=hito_cobro_id&factura_linea_id=eq.' + soli['id'])
mover = ('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (elab['id'], otro[0]['hito_cobro_id']), {'factura_linea_id': soli['id']},
         'Accesalia 2023/1-181: hito otro 810 -> línea «Solicitud pre-concesión»')
cambios.append(mover)

# 3. facturas sin opp: la de su contrato
for f in b.leer('facturas?select=id,anio,numero,oportunidad_id&tipo=eq.factura&pagador_nombre=ilike.*iberdrola*&oportunidad_id=is.null'):
    ops = {e['h']['l']['he']['oportunidad_id'] for fl in lineas_fac(f)
           for e in b.leer('factura_linea_hitos?select=h:hito_cobro_id(l:linea_facturacion_id(he:hoja_encargo_id(oportunidad_id)))&factura_linea_id=eq.' + fl['id'])}
    assert len(ops) == 1, (f, ops)
    cambios.append(('facturas?id=eq.' + f['id'], {'oportunidad_id': ops.pop()}, 'Accesalia %s/1-%s: opp de su contrato' % (f['anio'], f['numero'])))

# 4. la contrata: como dicen sus facturas
dom = ', '.join(x for x in [f181['pagador_domicilio'], ' '.join(y for y in [f181['pagador_cp'], f181['pagador_poblacion']] if y), f181['pagador_provincia']] if x)
cambios.append(('contratas?id=eq.' + IBERDROLA, {'razon_social': f181['pagador_nombre'], 'cif': f181['pagador_nif'], 'direccion': dom or None},
                'contrata: %s %s | %s' % (f181['pagador_nombre'], f181['pagador_nif'], dom)))

for q, c, que in cambios: print(que)
if not ESCRIBIR:
    print('EN SECO'); sys.exit()
b.insertar('factura_linea_hitos', enlaces)
for q, c, que in cambios: b.actualizar(q, c)
print('ESCRITO')
