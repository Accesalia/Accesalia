# -*- coding: utf-8 -*-
"""FAIN: subvenciones que paga la comunidad y una obra a la que se renunció (Mónica, 19-oct-2026, «adelante»).

  1. Juan Sebastián Elcano 4 Alcalá (HE-2023-0149): el correo de FAIN dice «la gestión de la subvención se la abona el
     cliente al arquitecto; firmar contrato con el cliente». La subvención (1.800) sale del pedido de FAIN a una nota de
     responsabilidad propia, pagada por la comunidad, cobrada con la Accesalia 2023/1-121 (no está el contrato firmado).
  2. Huerta del Bayo 13 (HE-2024-0015): hoja nuestra firmada por la comunidad -> pagador la comunidad (no FAIN).
  3. Plaza París 7 Fuenlabrada (HE-2026-0059): hoja nuestra, facturada a la comunidad (Daniel 2026/1-3) -> pagador la comunidad.
  4. Carabanchel Alto 16 (HE-2022-0168): fuera los 500 € de ayudas del pedido de FAIN (la subvención es la hoja de la
     comunidad HE-2022-0059, cobrada); y el 20 % de la CSS, facturado con la 2026/1-276, pasa a cobrado.
  5. Cardenal Herrera Oria 283 (HE-2023-0152): nota a mano en el PDF, «hemos renunciado a seguir con esta obra... ya no
     cobraremos nada más que la primera mitad de FAIN ya cobrada» -> anulado todo lo pendiente.

  python scripts/facturacion/fain_subvenciones_y_renuncias.py [--escribir]
"""
import sys, os, json, uuid, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
AHORA = datetime.datetime.now(datetime.timezone.utc).isoformat()
MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
b = arrancar()


def hoja(n): return b.leer('hojas_encargo?select=id,comunidad_id,oportunidad_id,pagador_tipo&numero_hoja=eq.' + n)[0]


def lineas(h): return b.leer('lineas_facturacion?select=id,descripcion,importe,notas&quitada_en=is.null&hoja_encargo_id=eq.' + h['id'])


def hitos(l): return b.leer('hitos_cobro?select=id,hito,importe,estado,notas,hito_padre_id,enl:factura_linea_hitos(factura_linea_id)&linea_facturacion_id=eq.' + l['id'])


def junta(*v): return '\n'.join(x for x in v if x)


# 1 ------------------------------------------------------------------ Juan Sebastián Elcano 4
jse = hoja('HE-2023-0149')
subv = [l for l in lineas(jse) if 'subvenc' in l['descripcion'].lower()]
assert len(subv) == 1 and float(subv[0]['importe']) == 1800
subv = subv[0]
hs_subv = hitos(subv)
assert len(hs_subv) == 1 and hs_subv[0]['enl'], hs_subv
MOTIVO = ('El correo de FAIN con los códigos (17-jul-2023, pedido de tramitación de subvenciones 292286) dice: «la gestión de la '
          'subvención se la abona el cliente al arquitecto; firmar contrato con el cliente». No está ese contrato firmado con la '
          'comunidad; consta por la factura Accesalia 2023/1-121 (1.800) a la C P Juan Sebastián Elcano 4. Sacada del pedido de '
          'FAIN HE-2023-0149 (Mónica, %s).' % HOY)
print('1. JSE 4: subvención 1.800 a una nota de responsabilidad nueva, pagador la comunidad')

# 2 y 3 -------------------------------------------------------------- pagador la comunidad
a_comunidad = [hoja('HE-2024-0015'), hoja('HE-2026-0059')]
for h in a_comunidad: print('2/3.', h['pagador_tipo'], '-> comunidad', h['comunidad_id'])

# 4 ------------------------------------------------------------------ Carabanchel Alto 16
car = hoja('HE-2022-0168')
car_l = lineas(car)
ayudas = [l for l in car_l if 'ayudas' in l['descripcion'].lower()]
assert len(ayudas) == 1 and float(ayudas[0]['importe']) == 500
css = [l for l in car_l if 'seguridad' in l['descripcion'].lower()][0]
css_cfo = [x for x in hitos(css) if x['hito'] == 'cfo' and x['enl']]
assert len(css_cfo) == 1
print('4. Carabanchel: fuera ayudas 500; CSS cfo', css_cfo[0]['estado'], '-> completado')

# 5 ------------------------------------------------------------------ Cardenal Herrera Oria 283
cho = hoja('HE-2023-0152')
anular = []
for l in lineas(cho):
    for x in hitos(l):
        if x['estado'] in ('pendiente', 'parcial') and not x['enl']:
            anular.append(x); print('5. CHO anular', l['descripcion'][:30], x['hito'], x['importe'])
NOTA_CHO = ('Anulado (Mónica, %s): nota a mano en el PDF del pedido, «Hemos renunciado a seguir con esta obra. Se ha presentado la '
            'licencia en la ECU por hacerles un favor, pero ya no cobraremos nada más que la primera mitad de FAIN ya cobrada».' % HOY)
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

# 1
req = urllib.request.Request(b.url + '/rest/v1/rpc/siguiente_codigo', data=json.dumps({'p_tipo': 'HE', 'p_anio': 2023}).encode(),
                             headers=dict(b.cab, **{'Content-Type': 'application/json'}), method='POST')
cod = json.loads(urllib.request.urlopen(req).read())
hid, vid = str(uuid.uuid4()), str(uuid.uuid4())
b.insertar('hojas_encargo', [dict(id=hid, numero_hoja=cod, oportunidad_id=jse['oportunidad_id'], comunidad_id=jse['comunidad_id'],
           pagador_tipo='comunidad', emisor='accesalia', fecha_creacion='2023-07-17', fecha_firma='2023-07-17', estado='devuelta_firmada',
           fecha_estado='2023-07-17T00:00:00+00:00', descripcion='Subvenciones · Juan Sebastián Elcano 4 Alcalá (la paga la comunidad)',
           tipo_documento='nota_responsabilidad', responsable_id=MONICA, motivo_sin_firma=MOTIVO)])
b.insertar('versiones_hoja', [dict(id=vid, hoja_encargo_id=hid, numero_version=1, fecha_generada='2023-07-17', importe_base=1800,
           iva_porcentaje=21, forma_pago='La abona la comunidad (correo de FAIN)', notas=MOTIVO)])
b.actualizar('hojas_encargo?id=eq.' + hid, {'version_firmada_id': vid})
b.actualizar('lineas_facturacion?id=eq.' + subv['id'], {'hoja_encargo_id': hid, 'pagador_tipo': 'comunidad', 'pagador_id': jse['comunidad_id'],
             'editada_en': AHORA, 'editada_por': MONICA, 'notas': junta(subv['notas'], MOTIVO)})
b.actualizar('hitos_cobro?id=eq.' + hs_subv[0]['id'], {'hito': 'encargo', 'porcentaje': 100, 'estado': 'completado',
             'notas': junta(hs_subv[0]['notas'], 'Cobrado con la Accesalia 2023/1-121, facturada a la comunidad.')})
print('1. hoja', cod)
# 2 y 3
for h in a_comunidad:
    b.actualizar('hojas_encargo?id=eq.' + h['id'], {'pagador_tipo': 'comunidad', 'pagador_contrata_id': None})
    b.actualizar('lineas_facturacion?hoja_encargo_id=eq.%s&quitada_en=is.null' % h['id'],
                 {'pagador_tipo': 'comunidad', 'pagador_id': h['comunidad_id'], 'editada_en': AHORA, 'editada_por': MONICA})
# 4
l = ayudas[0]
for x in hitos(l):
    if x['estado'] != 'anulado':
        b.actualizar('hitos_cobro?id=eq.' + x['id'], {'estado': 'anulado', 'notas': junta(x['notas'], 'Línea quitada (Mónica, %s).' % HOY)})
b.actualizar('lineas_facturacion?id=eq.' + l['id'], {'quitada_en': AHORA, 'quitada_por': MONICA, 'notas': junta(l['notas'],
             'Quitada (Mónica, %s): el pedido de FAIN solo menciona la tramitación de ayudas; la subvención es la hoja de la comunidad '
             'HE-2022-0059 (1.500, cobrada con la Accesalia 2022/1-138).' % HOY)})
b.actualizar('hitos_cobro?id=eq.' + css_cfo[0]['id'], {'estado': 'completado'})
# 5
for x in anular:
    b.actualizar('hitos_cobro?id=eq.' + x['id'], {'estado': 'anulado', 'notas': junta(x['notas'], NOTA_CHO)})
print('ESCRITO')
