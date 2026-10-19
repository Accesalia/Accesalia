# -*- coding: utf-8 -*-
"""LAS FIRMADAS DEL 16 AL 19-OCT-2026 QUE NO ESTABAN EN LA APP (Monica, 19-oct: "estan en el drive, se pueden coger de
ahi para estar al dia"; Alexandra aun no usa la app). Estaban en PRESUPUESTOS FIRMADOS y Alexandra ya las habia
facturado (2026/302-305) o proformado (pedido 35), pero en la app seguian "enviadas": sin lineas ni hitos.
Leidas como imagen (metodo de la auditoria, instrucciones_auditoria.md) y aprobadas por Monica una a una:

  VALMOJADO 169 (HE-2026-0179 v1, 26-02-2026): 13.680 todo junto, 50 % contratacion / 50 % entrega; Subvenciones
      3,5 % a la concesion. Factura 305 = 3.420 (25 %): SUBHITO del encargo + resto.
  MIRASIERRA 1 FUENLABRADA (HE-2026-0185 v1, 02-03-2026): Proyecto 8.200 50/50; Doc. tecnica subv 1.980 100 % a la
      contratacion; Subvenciones 3,5 %; 3 presupuestos incluido. Factura 303 = 4.100 + 1.980.
  EZEQUIEL SOLANA 118 (HE-2025-0726 v1, 19-12-2025): Proyecto 6.900 50/50; Doc. tecnica 1.980; Subvenciones 3,5 %;
      3 presupuestos incluido. Factura 304 = 3.450 + 1.980.
  ALCALA DE GUADAIRA 38 (HE-2026-0331): firmaron una version NUEVA, emitida el 14-10-2026 fuera de la app -> v2:
      Proyecto 6.980 (incluye proyecto, licencia y DF) en 4 x 25 % (contratacion octubre, noviembre, diciembre, entrega
      enero); CSS 920 100 % al PSS; sin subvencion; 3 presupuestos incluido. Proforma 26-0035 = 1.745 (25 %).
  FELIPE CASTRO 6 (HE-2026-0670): version NUEVA emitida el 08-10-2026 -> v2: ocupacion de via publica, DF de medios
      auxiliares y registro de la DR, 1.200 100 % a la contratacion. Factura 302 = 1.200.

Como la app al subir una firmada: la firma a la version firmada (PDF al almacen), las lineas desde los CONCEPTOS de esa
version (cada uno con su tipo), los 3 presupuestos con su linea del 3 % de Ecobalance; doc. tecnica y subvenciones
partidas (regla de la auditoria). Despues: las facturas a sus hitos (cobradas -> completado) y las proformas.

  python scripts/facturacion/firmadas_16_19_oct.py [--escribir]
"""
import sys, os, json, uuid, datetime, urllib.request, urllib.parse
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
b = arrancar()
DRIVE = r'G:\Mi unidad\MONICA ACCESALIA\PRESUPUESTOS\PRESUPUESTOS FIRMADOS'
ALMACEN = 'documentos-comerciales'

T = {t['nombre']: t['id'] for t in b.leer('tipos_proyecto?select=id,nombre')}
B = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo')}
B3 = '5152f512-698c-4379-891e-0bab8f4e14a7'      # el bloque de la linea de los 3 presupuestos (regla)
PCT3 = float(b.leer('parametros_economicos?select=valor&clave=eq.tres_presupuestos_pct')[0]['valor'])
NOTA_PSS = 'A la firma del Plan de Seguridad y Salud: 100% de los honorarios'


def crear(tabla, fila):
    print('      + %s %s' % (tabla, fila))
    if not ESCRIBIR:
        return {'id': 'SECO-' + uuid.uuid4().hex[:8], **fila}
    cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
    r = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps(fila, ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(r) as x: return json.loads(x.read())[0]


def cambiar(consulta, cambios):
    print('      ~ %s %s' % (consulta.split('?')[0], cambios))
    if ESCRIBIR: b.actualizar(consulta, cambios)


def subir_pdf(hoja_id, fichero):
    if not os.path.exists(os.path.join(DRIVE, fichero)): raise SystemExit('no esta en el Drive: ' + fichero)
    ruta = 'hojas-encargo/%s/firmada-%s-%s' % (hoja_id, uuid.uuid4().hex[:8], fichero.replace(' ', '_'))
    print('      ^ almacen %s' % ruta)
    if ESCRIBIR:
        datos = open(os.path.join(DRIVE, fichero), 'rb').read()
        cab = dict(b.cab); cab['Content-Type'] = 'application/pdf'; cab['x-upsert'] = 'true'
        r = urllib.request.Request(b.url + '/storage/v1/object/%s/%s' % (ALMACEN, urllib.parse.quote(ruta)), data=datos, headers=cab, method='POST')
        with urllib.request.urlopen(r) as x: x.read()
    return 'almacen:%s/%s' % (ALMACEN, ruta)


def hoja(numero):
    h = b.leer('hojas_encargo?select=id,numero_hoja,estado,oportunidad_id&numero_hoja=eq.%s' % numero)[0]
    if b.leer('lineas_facturacion?select=id&hoja_encargo_id=eq.%s&quitada_en=is.null' % h['id']):
        raise SystemExit('%s ya tiene lineas: no se toca' % numero)
    if h['estado'] == 'devuelta_firmada':
        raise SystemExit('%s ya esta firmada: no se toca' % numero)
    return h


def firmar(h, version, fecha_firma, fichero):
    pdf = subir_pdf(h['id'], fichero)
    cambiar('versiones_hoja?id=eq.%s' % version['id'], {'pdfs_firmados': (version.get('pdfs_firmados') or []) + [pdf]})
    cambiar('hojas_encargo?id=eq.%s' % h['id'], {'estado': 'devuelta_firmada', 'fecha_firma': fecha_firma, 'version_firmada_id': version['id'],
                                                 'fecha_estado': HOY + 'T00:00:00+00:00'})
    return pdf


def linea(h, concepto_id, bloque, descripcion, importe, hitos, porcentaje=None, base_pct=None, emisor='accesalia', origen='pdf', notas=None):
    """Una linea con sus hitos. hitos: [(hito, pct, importe, notas, fecha_prevista)]. Devuelve {hito: [filas]}."""
    l = crear('lineas_facturacion', {'hoja_encargo_id': h['id'], 'concepto_hoja_id': concepto_id, 'bloque_id': bloque, 'descripcion': descripcion,
                                     'importe': importe, 'es_porcentaje': importe is None, 'porcentaje': porcentaje, 'base_porcentaje': base_pct,
                                     'origen': origen, 'emisor': emisor, 'verificado': False,
                                     'notas': notas or 'Leida de la firmada como imagen (19-oct-2026, aprobada por Monica).'})
    out = {}
    for k, (que, pct, imp, nota, prev) in enumerate(hitos):
        out.setdefault(que, []).append(crear('hitos_cobro', {'linea_facturacion_id': l['id'], 'hito': que, 'orden': k + 1, 'porcentaje': pct,
                                                             'importe': imp, 'estado': 'pendiente', 'notas': nota, 'fecha_prevista': prev}))
    return out


def tres_presupuestos(h, concepto_id):
    return linea(h, concepto_id, B3, '3 presupuestos: %.2f %% del PEM del presupuesto firmado con la contrata que presentamos, a éxito (si gana)' % PCT3,
                 None, [('adjudicacion', 100, None, 'A exito: cuando la obra se adjudique a la contrata que presentamos.', None)],
                 porcentaje=PCT3, base_pct='PEM (presupuesto firmado con nuestra contrata)', emisor='ecobalance', origen='regla',
                 notas='Creada por la regla de los 3 presupuestos (Monica, 12-oct-2026): incluidos o sueltos, se cobran a exito si gana nuestra contrata.')


def factura(n):
    f = b.leer('facturas?select=id,numero,fecha,estado,oportunidad_id,lineas:factura_lineas(id,posicion,base)'
               '&origen=eq.factusol&empresa_emisora=eq.accesalia&anio=eq.2026&serie=eq.1&numero=eq.%d&tipo=eq.factura' % n)[0]
    f['lineas'] = sorted(f['lineas'], key=lambda l: l['posicion'] or 0)
    return f


def proforma(n):
    p = b.leer('proformas?select=id,codigo,oportunidad_id,lineas:proforma_lineas(id,posicion,base)&empresa=eq.accesalia&anio=eq.2026&numero=eq.%d' % n)[0]
    p['lineas'] = sorted(p['lineas'], key=lambda l: l['posicion'] or 0)
    return p


def casar(f, pares, opp):
    """pares: [(linea de factura, hito, importe)]. Factura cobrada -> hito completado."""
    for fl, hi, imp in pares:
        crear('factura_linea_hitos', {'factura_linea_id': fl['id'], 'hito_cobro_id': hi['id'], 'importe': imp, 'como': 'a_mano'})
        if f['estado'] == 'cobrada':
            cambiar('hitos_cobro?id=eq.%s' % hi['id'], {'estado': 'completado', 'fecha_factura': f['fecha'], 'numero_factura': '2026/%s' % f['numero']})
    cambiar('facturas?id=eq.%s&oportunidad_id=is.null' % f['id'], {'oportunidad_id': opp})


def a_proforma(p, pares, opp):
    for pl, hi, imp in pares:
        crear('proforma_linea_hitos', {'proforma_linea_id': pl['id'], 'hito_cobro_id': hi['id'], 'importe': imp})
    cambiar('proformas?id=eq.%s&oportunidad_id=is.null' % p['id'], {'oportunidad_id': opp})


def version(h, n):
    return b.leer('versiones_hoja?select=id,pdfs_firmados&hoja_encargo_id=eq.%s&numero_version=eq.%d' % (h['id'], n))[0]


ENC50 = 'A la contratación, en concepto de provisión de fondos: 50% del total de los honorarios.'
ENT50 = 'A la entrega del Proyecto: 50% restante.'
SUBV = 'A la concesión de cada subvención, tramo variable (3.5% del importe concedido tras su ingreso en la cuenta de la comunidad).'
DOC100 = 'A la contratación, 100% tramo fijo de los honorarios.'
FP_PRY = '50% a la contratación (provisión de fondos), 50% a la entrega del Proyecto'

# ---------------------------------------------------------------- VALMOJADO 169
print('== VALMOJADO 169 · HE-2026-0179 v1')
h = hoja('HE-2026-0179'); v = version(h, 1)
firmar(h, v, '2026-10-16', 'VALMOJADO 169 MADRID - 26_02_2026 - PRY ASCENSOR firmado.pdf')
DESC_V = 'Total honorarios profesionales: proyecto de instalación de ascensor (incluye toma de datos, proyecto, licencias, DF, CFO, CSS, IEE y CEE)'
cambiar('conceptos_hoja?id=eq.ff9ec5e9-dbb5-4410-a869-7ecec8805f9c', {'desglose': 'se_cobra', 'importe': 13680, 'forma_pago': FP_PRY,
                                                                      'tipo_proyecto_id': T['Ascensor'], 'descripcion': DESC_V})
cambiar('conceptos_hoja?id=eq.9f351d5a-dfc2-45d3-81af-5a3c2f033c92', {'tipo_proyecto_id': T['Subvenciones']})
x = linea(h, 'ff9ec5e9-dbb5-4410-a869-7ecec8805f9c', B['REDACCION PROYECTO'], DESC_V, 13680.0,
          [('encargo', 50, 6840.0, ENC50, None), ('entrega', 50, 6840.0, ENT50, None)])
linea(h, '9f351d5a-dfc2-45d3-81af-5a3c2f033c92', B['TRAMITACION SUBVENCIONES'], 'Gestión de subvenciones accesibilidad: 3,5 % de lo concedido, a éxito',
      None, [('concesion', 100, None, SUBV, None)], porcentaje=3.5, base_pct='importe concedido')
f = factura(305); enc = x['encargo'][0]
s = crear('hitos_cobro', {'linea_facturacion_id': enc['linea_facturacion_id'], 'hito': 'encargo', 'orden': 1, 'importe': 3420.0, 'porcentaje': 25,
                          'estado': 'completado' if f['estado'] == 'cobrada' else 'pendiente', 'hito_padre_id': enc['id'],
                          'fecha_factura': f['fecha'], 'numero_factura': '2026/305',
                          'notas': 'Subhito: factura accesalia 2026/305, 25 % del total (pago fraccionado del encargo).'})
crear('hitos_cobro', {'linea_facturacion_id': enc['linea_facturacion_id'], 'hito': 'encargo', 'orden': 2, 'importe': 3420.0, 'porcentaje': 25,
                      'estado': 'pendiente', 'hito_padre_id': enc['id'],
                      'notas': 'Resto del encargo, sin facturar todavia (al casar la factura 2026/305, %s).' % HOY})
cambiar('hitos_cobro?id=eq.%s' % enc['id'], {'estado': 'parcial'})
crear('factura_linea_hitos', {'factura_linea_id': f['lineas'][0]['id'], 'hito_cobro_id': s['id'], 'importe': 3420.0, 'como': 'a_mano'})
cambiar('facturas?id=eq.%s&oportunidad_id=is.null' % f['id'], {'oportunidad_id': h['oportunidad_id']})
p = proforma(34); a_proforma(p, [(p['lineas'][0], s, 3420.0)], h['oportunidad_id'])


# ---------------------------------------------------------------- MIRASIERRA 1 y EZEQUIEL SOLANA 118 (mismo modelo)
def proyecto_y_subvencion(numero, fichero, fecha_firma, concepto_pry, concepto_subv, concepto_3p, total, n_factura, n_proforma, descripcion):
    print('== %s' % numero)
    h = hoja(numero); v = version(h, 1)
    firmar(h, v, fecha_firma, fichero)
    cambiar('conceptos_hoja?id=eq.%s' % concepto_pry, {'desglose': 'se_cobra', 'importe': total, 'forma_pago': FP_PRY,
                                                       'tipo_proyecto_id': T['Ascensor'], 'descripcion': descripcion})
    # doc. tecnica + subvenciones juntas -> se parten: el fijo es la doc. tecnica, el % la tramitacion (regla de la auditoria)
    doc = crear('conceptos_hoja', {'hoja_encargo_id': h['id'], 'version_hoja_id': v['id'], 'bloque_id': B['DOCUMENTACION TECNICA SUBVENCIONES'],
                                   'descripcion': 'Documentación técnica anexa para subvenciones (tramo fijo)', 'desglose': 'se_cobra', 'incluido': True,
                                   'importe': 1980, 'forma_pago': '100% a la contratación', 'tipo_proyecto_id': T['Doc técnica subv (IEE+CEE+LEE)'],
                                   'tipo_concepto': 'documentacion_tecnica_subvencion'})
    cambiar('conceptos_hoja?id=eq.%s' % concepto_subv, {'importe': None, 'forma_pago': '3,5% de lo concedido a la concesión de cada subvención',
                                                        'tipo_proyecto_id': T['Subvenciones']})
    x = linea(h, concepto_pry, B['REDACCION PROYECTO'], descripcion, float(total),
              [('encargo', 50, total / 2, ENC50, None), ('entrega', 50, total / 2, ENT50, None)])
    y = linea(h, doc['id'], B['DOCUMENTACION TECNICA SUBVENCIONES'], 'Documentación técnica anexa para subvenciones (tramo fijo)', 1980.0,
              [('encargo', 100, 1980.0, DOC100, None)])
    linea(h, concepto_subv, B['TRAMITACION SUBVENCIONES'], 'Gestión de subvenciones: 3,5 % de lo concedido, a éxito', None,
          [('concesion', 100, None, SUBV, None)], porcentaje=3.5, base_pct='importe concedido')
    tres_presupuestos(h, concepto_3p)
    f = factura(n_factura)
    casar(f, [(f['lineas'][0], x['encargo'][0], total / 2), (f['lineas'][1], y['encargo'][0], 1980.0)], h['oportunidad_id'])
    p = proforma(n_proforma)
    a_proforma(p, [(p['lineas'][0], x['encargo'][0], total / 2), (p['lineas'][1], y['encargo'][0], 1980.0)], h['oportunidad_id'])


proyecto_y_subvencion('HE-2026-0185', 'MIRASIERRA 1 FUENLABRADA - ASC+SUBV - 16-10-2026.pdf', '2026-10-16', '186d1162-8fb0-4c53-90bf-d7f77e4f3770',
                      '317e08a2-2f67-4f4e-9784-497f368c707f', '730a865e-a74f-499f-9305-00de3228253f', 8200.0, 303, 36,
                      'Proyecto para instalación de ascensor (incluye toma de datos, proyecto, licencias, 3 presupuestos, DF, CFO y CSS)')
proyecto_y_subvencion('HE-2025-0726', 'EZEQUIEL SOLANA 118 MADRID - PRY ASC+SUBV 19-10-2026.pdf', '2026-10-19', 'b8310681-e470-4ab4-b070-413e3febf4c2',
                      '8ffdf649-c845-46c4-84ec-45bee9a22870', 'd221be63-1efd-42ff-9791-a21bad20c413', 6900.0, 304, 37,
                      'Proyecto para instalación de ascensor (incluye toma de datos, proyecto, licencias, 3 presupuestos, DF, CFO y CSS)')


# ---------------------------------------------------------------- VERSIONES NUEVAS (firmaron una version hecha fuera de la app)
def version_nueva(h, fecha, motivo, base, forma_pago, fichero, fecha_firma):
    pdf = subir_pdf(h['id'], fichero)
    v = crear('versiones_hoja', {'hoja_encargo_id': h['id'], 'numero_version': 2, 'fecha_generada': fecha, 'motivo_cambio': motivo,
                                 'importe_base': base, 'iva_porcentaje': 21, 'importe_total': round(base * 1.21, 2), 'forma_pago': forma_pago,
                                 'url_pdf_hoja': pdf, 'pdfs_firmados': [pdf],
                                 'notas': 'Version emitida el %s fuera de la app; es la que firmaron. Creada desde la firmada (Monica, 19-oct-2026).' % fecha})
    cambiar('hojas_encargo?id=eq.%s' % h['id'], {'estado': 'devuelta_firmada', 'fecha_firma': fecha_firma, 'version_firmada_id': v['id'],
                                                 'fecha_estado': HOY + 'T00:00:00+00:00'})
    return v


def concepto(h, v, bloque, descripcion, desglose, importe=None, forma=None, tipo=None, tipo_concepto=None):
    return crear('conceptos_hoja', {'hoja_encargo_id': h['id'], 'version_hoja_id': v['id'], 'bloque_id': B.get(bloque, bloque),
                                    'descripcion': descripcion, 'desglose': desglose, 'incluido': True, 'importe': importe, 'forma_pago': forma,
                                    'tipo_proyecto_id': T[tipo] if tipo else None, 'tipo_concepto': tipo_concepto})


print('== ALCALA DE GUADAIRA 38 · HE-2026-0331 v2 (14-10-2026)')
h = hoja('HE-2026-0331')
FP4 = '25% a la contratación (octubre), 25% en noviembre, 25% en diciembre, 25% a la entrega del Proyecto (enero)'
v = version_nueva(h, '2026-10-14', 'Firmada una versión nueva: proyecto en 4 pagos del 25 % (octubre a enero), CSS aparte y sin subvención',
                  7900.0, FP4 + ' · CSS: 100% a la firma del PSS', 'ALCALA DE GUADAIRA 38 MADRID - ASC - 16-10-2026.pdf', '2026-10-16')
concepto(h, v, 'TOMA DE DATOS Y MODELADO 3D', 'TOMA DE DATOS Y MODELADO 3D', 'incluido')
pry = concepto(h, v, 'REDACCION PROYECTO', 'Proyecto (incluye Proyecto, Tramitación de Licencia, Dirección Facultativa)', 'se_cobra', 6980, FP4,
               'Ascensor', 'proyecto_tecnico')
concepto(h, v, 'TRAMITACION LICENCIAS', 'TRAMITACIÓN DE LICENCIAS Y PERMISOS', 'incluido')
c3 = concepto(h, v, B3, 'SOLICITUD Y ANÁLISIS DE PRESUPUESTOS', 'incluido')
concepto(h, v, 'CERTIFICADO FIN DE OBRA', 'FIN DE OBRA', 'incluido')
concepto(h, v, 'DF', 'DIRECCIÓN FACULTATIVA', 'incluido')
css = concepto(h, v, 'CSS', 'Coordinación de Seguridad y Salud', 'se_cobra', 920, '100% a la firma del Plan de Seguridad y Salud', 'CSS', 'coordinacion_ss')
x = linea(h, pry['id'], B['REDACCION PROYECTO'], 'Proyecto (incluye Proyecto, Tramitación de Licencia, Dirección Facultativa) — INSTALACIÓN ASCENSOR', 6980.0,
          [('encargo', 25, 1745.0, 'A la contratación (OCTUBRE), en concepto de provisión de fondos: 25% del total de los honorarios.', '2026-10-01'),
           ('otro', 25, 1745.0, 'NOVIEMBRE: 25% del total de los honorarios.', '2026-11-01'),
           ('otro', 25, 1745.0, 'DICIEMBRE: 25% del total de los honorarios.', '2026-12-01'),
           ('entrega', 25, 1745.0, 'A la entrega del Proyecto (ENERO): 25% restante.', '2027-01-01')])
linea(h, css['id'], B['CSS'], 'Coordinación de Seguridad y Salud', 920.0, [('pss', 100, 920.0, NOTA_PSS, None)])
tres_presupuestos(h, c3['id'])
p = proforma(35); a_proforma(p, [(p['lineas'][0], x['encargo'][0], 1745.0)], h['oportunidad_id'])

print('== FELIPE CASTRO 6 · HE-2026-0670 v2 (08-10-2026)')
h = hoja('HE-2026-0670')
DESC = 'Gestiones para la autorización de ocupación de vía pública, dirección facultativa de medios auxiliares y registro de DR'
v = version_nueva(h, '2026-10-08', 'Firmada una versión nueva: ocupación de vía pública, DF de medios auxiliares y registro de DR (1.200) en lugar de la memoria técnica (1.500)',
                  1200.0, '100% a la contratación', 'FELIPE CASTRO 6 MADRID MEMORIA (DR) 16-10-2026.pdf', '2026-10-16')
lic = concepto(h, v, 'TRAMITACION LICENCIAS', DESC, 'se_cobra', 1200, '100% a la contratación', 'Licencia', 'otro')
x = linea(h, lic['id'], B['TRAMITACION LICENCIAS'], DESC, 1200.0, [('encargo', 100, 1200.0, 'A la contratación: 100% del total de los honorarios.', None)])
f = factura(302); casar(f, [(f['lineas'][0], x['encargo'][0], 1200.0)], h['oportunidad_id'])
p = proforma(33); a_proforma(p, [(p['lineas'][0], x['encargo'][0], 1200.0)], h['oportunidad_id'])

print('(marcha en seco)' if not ESCRIBIR else 'hecho')
