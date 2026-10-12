# -*- coding: utf-8 -*-
"""VIABILIDADES DE EFFIC (Monica, 12-oct-2026): las facturas "EFFIC SERVICIOS DE VIABILIDAD" (200/220 por expediente,
"VALIDA AREA TECNICA" + codigo AEFE) no son de las hojas de proyecto enviadas a esas comunidades.
  "en todas la misma solucion: nota interna: EFFIC pide estudio de viabilidad en direccion x, sin mas. No hubo hojas
   de encargo" -> nota de responsabilidad (Monica) con una linea de viabilidad que paga EFFIC y su factura casada.
  "todas esas opps se pueden cerrar con un 'EFFIC dice que la comunidad no aprueba la obra'" -> opp cerrada, perdida.
  Las lineas sin direccion (2025/405 y 2026/175, solo codigo AEFE): "las ignoramos". Las hojas enviadas no se tocan.
  python scripts/facturacion/effic_viabilidades.py [--escribir]
"""
import sys, os, json, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
M = '(Monica, %s)' % HOY
CIERRE = 'EFFIC dice que la comunidad no aprueba la obra %s' % M
b = arrancar()
cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
EFFIC = b.leer('contratas?nombre=eq.EFFIC&select=id')[0]['id']
MONICA = b.leer('equipo?email=eq.gerencia.accesalia@gmail.com&select=id')[0]['id']

# opp, direccion, factura (anio, numero, base, codigo AEFE)
VIABILIDADES = [
    ('CAR-2025-044', 'Portalegre 58', (2025, 337, 220.0, 'AEFE-00014840')),
    ('CAR-2025-033', 'Villagarcia 10', (2025, 337, 200.0, 'AEFE-00017458')),
    ('DAN-2025-310', 'Villagarcia 8', (2025, 337, 200.0, 'AEFE-00017418')),
    ('DAN-2025-311', 'Francisco Rodriguez 7', (2025, 337, 200.0, 'AEFE-00017483')),
    ('DAN-2025-309', 'Gomeznarro 10', (2025, 337, 220.0, 'AEFE-00017429')),
    ('CAR-2025-045', 'Vicente Carballal 17', (2025, 337, 220.0, 'AEFE-00017585')),
    ('CAR-2025-038', 'Antonio Arias 6', (2025, 374, 200.0, 'AEFE-00017513')),
    ('CAR-2025-036', 'Carolina Baeza 15', (2025, 374, 200.0, 'AEFE-00014360')),
]


def alta(tabla, fila):
    req = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))[0]


def rpc(nombre, args):
    req = urllib.request.Request(b.url + '/rest/v1/rpc/' + nombre, data=json.dumps(args).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        return json.loads(r.read().decode('utf-8'))


def linea_factura(anio, num, base, aefe):
    f = b.leer('facturas?empresa_emisora=eq.accesalia&anio=eq.%s&serie=eq.1&numero=eq.%s&select=id,estado,fecha' % (anio, num))[0]
    ls = [l for l in b.leer('factura_lineas?factura_id=eq.%s&select=id,base,concepto&order=posicion' % f['id']) if aefe in (l['concepto'] or '')]
    assert len(ls) == 1 and abs(float(ls[0]['base']) - base) < 0.01, (anio, num, aefe, ls)
    assert not b.leer('factura_linea_hitos?factura_linea_id=eq.%s&select=hito_cobro_id' % ls[0]['id']), ('ya casada', anio, num, aefe)
    return f, ls[0]


for opp, direccion, (anio, num, base, aefe) in VIABILIDADES:
    o = b.leer('oportunidades?codigo=eq.%s&select=id,comunidad_id,estado' % opp)[0]
    f, fl = linea_factura(anio, num, base, aefe)
    motivo = 'EFFIC pide estudio de viabilidad en %s, sin mas. No hubo hoja de encargo. Consta por la factura %s/%s (%s, %s) %s.' % (
        direccion, anio, num, base, aefe, M)
    print('== %s %s: nota de responsabilidad, viabilidad %s -> factura %s/%s | opp %s -> cerrada (perdida)' % (opp, direccion, base, anio, num, o['estado']))
    if not ESCRIBIR:
        continue
    codigo = rpc('siguiente_codigo', {'p_tipo': 'NR', 'p_anio': int(HOY[:4])})
    h = alta('hojas_encargo', {'numero_hoja': codigo, 'tipo_documento': 'nota_responsabilidad', 'responsable_id': MONICA, 'motivo_sin_firma': motivo,
                               'oportunidad_id': o['id'], 'comunidad_id': o['comunidad_id'], 'pagador_tipo': 'contrata', 'pagador_contrata_id': EFFIC,
                               'emisor': 'accesalia', 'fecha_creacion': f['fecha'], 'fecha_firma': f['fecha'], 'estado': 'devuelta_firmada',
                               'fecha_estado': f['fecha'] + 'T00:00:00+00:00', 'descripcion': 'Nota de responsabilidad · EFFIC · viabilidad %s' % direccion})
    v = alta('versiones_hoja', {'hoja_encargo_id': h['id'], 'numero_version': 1, 'fecha_generada': f['fecha'], 'importe_base': base,
                                'iva_porcentaje': 21, 'notas': motivo})
    b.actualizar('hojas_encargo?id=eq.' + h['id'], {'version_firmada_id': v['id']})
    lf = alta('lineas_facturacion', {'hoja_encargo_id': h['id'], 'descripcion': 'Estudio de viabilidad (encargo de EFFIC)', 'importe': base,
                                     'es_porcentaje': False, 'origen': 'nota_responsabilidad', 'verificado': True, 'emisor': 'accesalia',
                                     'pagador_tipo': 'contrata', 'pagador_id': EFFIC, 'forma_cobro': 'transferencia'})
    x = alta('hitos_cobro', {'linea_facturacion_id': lf['id'], 'hito': 'encargo', 'orden': 1, 'porcentaje': 100, 'importe': base,
                             'estado': 'completado' if f['estado'] == 'cobrada' else 'pendiente'})
    b.insertar('codigos_cliente_linea', [{'linea_facturacion_id': lf['id'], 'etiqueta': 'Expediente EFFIC', 'valor': aefe, 'orden': 1}])
    b.insertar('factura_linea_hitos', [{'factura_linea_id': fl['id'], 'hito_cobro_id': x['id'], 'importe': base, 'como': 'a_mano'}])
    b.insertar('notas_facturacion', [{'hoja_encargo_id': h['id'], 'fecha': HOY, 'origen': 'factusol', 'autor': 'Monica (nota de responsabilidad)', 'texto': motivo}])
    if o['estado'] != 'cerrada':
        b.actualizar('oportunidades?id=eq.' + o['id'], {'estado': 'cerrada'})
        if b.leer('motivo_cierre_oportunidad?oportunidad_id=eq.%s&select=id' % o['id']):
            b.actualizar('motivo_cierre_oportunidad?oportunidad_id=eq.' + o['id'], {'resultado_final': 'perdido', 'motivo_perdido': CIERRE, 'fecha_cierre': HOY})
        else:
            b.insertar('motivo_cierre_oportunidad', [{'oportunidad_id': o['id'], 'resultado_final': 'perdido', 'motivo_perdido': CIERRE, 'fecha_cierre': HOY}])
    print('   ESCRITO', codigo)
print('ESCRITO' if ESCRIBIR else '(en seco)')
