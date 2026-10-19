# -*- coding: utf-8 -*-
"""LAS 8 PROFORMAS PENDIENTES DE 2026, A SUS HITOS, Y EL ARREGLO DE PADILLA 4 (Monica, 19-oct-2026: "aplicar las 8 y
corregir padilla"). Cada pedido de Factusol dice en su texto la hoja (por su fecha) y el pago exacto:
  0004 Estocolmo 6: "1 de 3 del 2º 50 % de 10.400, a la entrega" -> la entrega (5.200) se parte: 1.734 + resto 3.466
  0010 Castilla la Nueva 37 bis: 50 % de 1.980 a la contratacion · 0019 Padilla 4: 2º 50 % de 1.800
  0024 Doctor Vallejo 39: entrega · 0027 Altamirano 32: entrega envolvente + entrega accesibilidad
  0029 Tubo 5: subhito 4.950 · 0030 General Serrano Orive 1: entrega proyecto + entrega doc. tecnica
  0032 Bravo Murillo 177: subhito 4.888,43
PADILLA 4: la factura 285 dice "1ª parte, 1er 50 %" y estaba casada con la entrega (2º 50 %): pasa al encargo, con su
proforma 0018; la entrega queda para la 0019. Manda la factura.

  python scripts/facturacion/proformas_pendientes_19oct.py [--escribir]
"""
import sys, os, json, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
ENCARGO, ENTREGA = 'f6ae61a9-8d44-4036-baa0-c00bbbb8c80d', '8698dc87-297e-4a5d-9606-5d8c345a538b'   # Padilla 4, HE-2025-0435
PADRE = 'b6684cfc-4d75-4c22-b15d-a08b8dac98af'                                                     # Estocolmo 6, entrega HE-2026-0448


def crear(tabla, fila):
    print('  + %s %s' % (tabla, fila))
    if not ESCRIBIR: return {'id': 'SECO'}
    cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
    r = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps(fila, ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(r) as x: return json.loads(x.read())[0]


def cambiar(consulta, cambios):
    print('  ~ %s %s' % (consulta, cambios))
    if ESCRIBIR: b.actualizar(consulta, cambios)


# --- PADILLA 4
enc, ent = (b.leer('hitos_cobro?select=id,notas,estado&id=eq.' + i)[0] for i in (ENCARGO, ENTREGA))
if not b.leer('factura_linea_hitos?select=factura_linea_id&factura_linea_id=eq.f4bc7517-63cd-4e23-8858-c292eb62e5ad&hito_cobro_id=eq.' + ENTREGA):
    raise SystemExit('Padilla 4: la factura 285 ya no esta en la entrega; no se toca')
cambiar('factura_linea_hitos?factura_linea_id=eq.f4bc7517-63cd-4e23-8858-c292eb62e5ad&hito_cobro_id=eq.' + ENTREGA, {'hito_cobro_id': ENCARGO, 'como': 'a_mano'})
cambiar('hitos_cobro?id=eq.' + ENCARGO, {'estado': 'completado', 'notas': (enc['notas'] or '') +
        ' | 19-oct-2026: casado con la factura 2026/285 («1ª parte, 1er 50 %»); antes estaba por error en la entrega.'})
cambiar('hitos_cobro?id=eq.' + ENTREGA, {'estado': 'pendiente', 'notas': (ent['notas'] or '') +
        ' | 19-oct-2026: la factura 285 era el 1er 50 %; este 2º 50 % es la proforma ACC-PF-26-0019, pendiente.'})
cambiar('proforma_linea_hitos?proforma_linea_id=eq.f992da9b-afc6-41ff-97b0-b767930392bc&hito_cobro_id=eq.' + ENTREGA, {'hito_cobro_id': ENCARGO})

# --- ESTOCOLMO 6: la entrega se parte
linea = b.leer('hitos_cobro?select=linea_facturacion_id&id=eq.' + PADRE)[0]['linea_facturacion_id']
sub1 = crear('hitos_cobro', {'linea_facturacion_id': linea, 'hito': 'entrega', 'orden': 1, 'importe': 1734, 'estado': 'pendiente', 'hito_padre_id': PADRE,
                             'notas': 'Subhito: proforma ACC-PF-26-0004, 1 de 3 del 2º 50 % (pago fraccionado de la entrega).'})
crear('hitos_cobro', {'linea_facturacion_id': linea, 'hito': 'entrega', 'orden': 2, 'importe': 3466, 'estado': 'pendiente', 'hito_padre_id': PADRE,
                      'notas': 'Resto de la entrega, sin proforma todavia (19-oct-2026).'})

# --- las proformas pendientes, a sus hitos
for pl, hito, imp in [
        ('81939d59-e3ce-48b8-a819-f167a09976a1', sub1['id'], 1734),                                # 0004 Estocolmo 6
        ('5ac0c47e-5673-4342-83ac-e39264976788', '645d90bd-e040-4cb4-b7f1-acb2c2092637', 990),    # 0010 Castilla la Nueva 37 bis
        ('fef7f37f-5f3a-47e9-9b71-c7ef23507652', ENTREGA, 900),                                     # 0019 Padilla 4, 2º 50 %
        ('d4d6e6b6-48d7-4592-934c-481fa1dc0233', '383a81bc-f9b8-4d3a-a678-5abd428efc6d', 2950),   # 0024 Doctor Vallejo 39
        ('b1011e36-7d63-4999-83bd-1079be536084', '8aa62b83-6e50-4148-80e2-70823c2b3fe9', 5200),   # 0027 Altamirano 32, envolvente
        ('03c1f7e8-279a-4df3-af26-94e01d197bdd', '62ee14a5-05d3-4f8e-bcd8-c3a4095f5af6', 1750),   # 0027 Altamirano 32, accesibilidad
        ('8a1f2ea1-98c0-4a1c-8771-d35aef8a555d', '11f861dd-4003-43cb-a16f-df182f3fafec', 4950),   # 0029 Tubo 5
        ('f4aa8bce-6536-4e12-aca7-82ce872cb38c', '1e713be6-0f38-4b81-a622-3698d8b52cc5', 2990),   # 0030 General Serrano Orive 1, proyecto
        ('2e1ae6cf-44d8-4471-a9ae-ab95d2b16463', '123c3a51-ad0e-4bed-abc4-0b13f8213f35', 990),    # 0030 doc. tecnica
        ('a8ff5941-4442-4bfd-a542-e884ec53c2b4', 'ebc2c52f-8a95-4ad5-a6c9-2b45729d8f0d', 4888.43)]:  # 0032 Bravo Murillo 177
    crear('proforma_linea_hitos', {'proforma_linea_id': pl, 'hito_cobro_id': hito, 'importe': imp})

# --- su oportunidad, la de sus hitos (una sola)
for p in b.leer('proformas?select=id,codigo,lineas:proforma_lineas(hitos:proforma_linea_hitos(h:hito_cobro_id(l:linea_facturacion_id(he:hoja_encargo_id(oportunidad_id)))))'
                '&anio=eq.2026&empresa=eq.accesalia&oportunidad_id=is.null'):
    opps = {x['h']['l']['he']['oportunidad_id'] for l in p['lineas'] for x in l['hitos'] if x.get('h')}
    if len(opps) == 1:
        cambiar('proformas?id=eq.%s&oportunidad_id=is.null' % p['id'], {'oportunidad_id': opps.pop()})
    else:
        print('  %s: sin oportunidad (%d por sus hitos)%s' % (p['codigo'], len(opps), ' -- en seco aun no tiene hitos' if not ESCRIBIR else ''))
print('hecho' if ESCRIBIR else '(marcha en seco)')
