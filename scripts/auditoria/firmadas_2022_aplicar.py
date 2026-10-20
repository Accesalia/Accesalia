# -*- coding: utf-8 -*-
"""Firmadas de 2022 del Drive (Mónica, 20-oct-2026: «sí, ok»).
  1. Hojas firmadas que no estaban en la app, con su PDF y su factura colgada:
     - Ángeles 7 Fuenlabrada (DAN-2019-021): proyecto SATE 4.500, 70 % entrega (Accesalia 2022/1-64) / 30 % concesión.
     - Andalucía 6 Fuenlabrada (DAN-2022-097): proyecto SATE 5.500, 70 % entrega (Accesalia 2022/1-77) / 30 % concesión;
       a mano en la hoja: «No cobrar hasta que se haga la reunión de marzo».
     - San Clemente 2 Leganés (DAN-2022-094): subvenciones 2022-2023, 1.500 (2-dic-2021) (Accesalia 2022/1-193).
     Sin fecha en el nombre del fichero (las de Fuenlabrada): la del fichero firmado (16-mar-2022).
  2. Accesalia 2022/1-21 (Ángeles 7, 17-feb-2022): dice «70 %» y factura 4.500 (el total); sigue pendiente y la buena es la
     2022/1-64 (3.150, cobrada) -> anulada, sin arqueología.
  3. Ángeles 12 y 14 Fuenlabrada: sus notas de hoy (HE-2022-0215 y 0216) pasan a PEDIDO con el correo de Oswaldo García
     (FAIN, 15-jul-2022): «empieces con estos dos proyectos, a razón de 2.500 € cada uno; esto lo cobras directamente a la
     propiedad».
  python scripts/auditoria/firmadas_2022_aplicar.py [--escribir]
"""
import sys, os, uuid, json, datetime, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
D = r'G:\Mi unidad\MONICA ACCESALIA\PRESUPUESTOS\PRESUPUESTOS FIRMADOS'
b = arrancar()
BLOQUE = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo')}
SATE = 'Proyecto para la mejora de la envolvente térmica'


def buscar(nombre):
    for r, _, fs in os.walk(D):
        for f in fs:
            if f.lower() == nombre.lower(): return os.path.join(r, f)
    raise FileNotFoundError(nombre)


def factura(a, n):
    f = b.leer('facturas?select=id,estado,notas,oportunidad_id,lineas:factura_lineas(id,base,enl:factura_linea_hitos(hito_cobro_id))'
               '&tipo=eq.factura&empresa_emisora=eq.accesalia&anio=eq.%d&numero=eq.%d' % (a, n))[0]
    assert len(f['lineas']) == 1 and not f['lineas'][0]['enl'], (a, n)
    return f


# opp, fichero, fecha, nota, [(texto, bloque, total, [(hito, importe, factura o None)])]
NUEVAS = [
    ('DAN-2019-021', 'angeles 7 fuenlabrada firmado.pdf', '2022-03-16', 'Hoja firmada por la comunidad (Drive, PRESUPUESTOS FIRMADOS).',
     [(SATE, 'REDACCION PROYECTO', 4500, [('entrega', 3150, (2022, 64)), ('concesion', 1350, None)])]),
    ('DAN-2022-097', 'andalucia 6 fuenlabrada firmado.pdf', '2022-03-16',
     'Hoja firmada por la comunidad (Drive, PRESUPUESTOS FIRMADOS). Escrito a mano en la hoja: «No cobrar hasta que se haga la reunión de marzo».',
     [(SATE, 'REDACCION PROYECTO', 5500, [('entrega', 3850, (2022, 77)), ('concesion', 1650, None)])]),
    ('DAN-2022-094', 'SAN CLEMENTE 2 LEGANES SUBVENCION.pdf', '2021-12-02', 'Presupuesto firmado por la comunidad (2-dic-2021; Drive, PRESUPUESTOS FIRMADOS).',
     [('Tramitación de todas las subvenciones aplicables para ascensores durante 2022 y 2023', 'TRAMITACION SUBVENCIONES ACCESIBILIDAD', 1500,
       [('encargo', 1500, (2022, 193))])]),
]
plan = []
for cod, fich, fecha, nota, lineas in NUEVAS:
    o = b.leer('oportunidades?select=id,codigo,nombre,comunidad_id&codigo=eq.' + cod)[0]
    ls = [(t, bl, tot, [(h, i, factura(*fa) if fa else None) for h, i, fa in pg]) for t, bl, tot, pg in lineas]
    plan.append((o, buscar(fich), fecha, nota, ls))
    print('1. %s %s: hoja firmada %s | %s' % (cod, o['nombre'], fecha, ' + '.join('%s %g' % (t[:30], tot) for t, _, tot, _ in lineas)))
f21 = b.leer('facturas?select=id,estado,base,notas&tipo=eq.factura&empresa_emisora=eq.accesalia&anio=eq.2022&numero=eq.21')[0]
assert f21['estado'] == 'pendiente' and float(f21['base']) == 4500
print('2. Accesalia 2022/1-21 -> anulada')
CORREO = buscar('nuestra señora de los angeles, 12 y 14 fuenlabrada mail 15-07-2022.pdf')
notas = []
for n in ('HE-2022-0215', 'HE-2022-0216'):
    h = b.leer('hojas_encargo?select=id,tipo_documento,motivo_sin_firma,versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(id,notas)&numero_hoja=eq.' + n)[0]
    assert h['tipo_documento'] == 'nota_responsabilidad'
    notas.append((n, h)); print('3. %s nota -> pedido (correo de FAIN, 15-jul-2022)' % n)
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

for o, ruta_pdf, fecha, nota, ls in plan:
    nota = '%s (Mónica, %s).' % (nota, HOY)
    req = urllib.request.Request(b.url + '/rest/v1/rpc/siguiente_codigo', data=json.dumps({'p_tipo': 'HE', 'p_anio': int(fecha[:4])}).encode(),
                                 headers=dict(b.cab, **{'Content-Type': 'application/json'}), method='POST')
    num = json.loads(urllib.request.urlopen(req).read())
    hid, vid = str(uuid.uuid4()), str(uuid.uuid4())
    b.insertar('hojas_encargo', [dict(id=hid, numero_hoja=num, oportunidad_id=o['id'], comunidad_id=o['comunidad_id'], pagador_tipo='comunidad', emisor='accesalia',
               fecha_creacion=fecha, fecha_firma=fecha, estado='devuelta_firmada', fecha_estado=fecha + 'T00:00:00+00:00', tipo_documento='hoja_encargo',
               descripcion='Hoja del Drive · ' + o['nombre'])])
    ruta = 'almacen:documentos-comerciales/' + b.subir('documentos-comerciales', 'hojas-encargo/%s/firmada-v1-1-%s.pdf' % (hid, vid[:8]), open(ruta_pdf, 'rb').read(), reemplazar=True)
    b.insertar('versiones_hoja', [dict(id=vid, hoja_encargo_id=hid, numero_version=1, fecha_generada=fecha, fecha_enviada=fecha, importe_base=sum(l[2] for l in ls),
               iva_porcentaje=21, notas=nota, pdfs_firmados=[ruta])])
    b.actualizar('hojas_encargo?id=eq.' + hid, {'version_firmada_id': vid})
    for texto, bloque, total, pg in ls:
        lid = str(uuid.uuid4())
        b.insertar('lineas_facturacion', [dict(id=lid, hoja_encargo_id=hid, bloque_id=BLOQUE[bloque], descripcion=texto, importe=total, es_porcentaje=False, notas=nota,
                   origen='pdf', verificado=True, emisor='accesalia', pagador_tipo='comunidad', pagador_id=o['comunidad_id'], forma_cobro='cargo_cuenta', creada_por=MONICA)])
        for orden, (hh, imp, f) in enumerate(pg, 1):
            tid = str(uuid.uuid4())
            b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=lid, hito=hh, orden=orden, porcentaje=round(100 * imp / total, 2), importe=imp,
                       estado='completado' if f else 'pendiente')])
            if f:
                b.insertar('factura_linea_hitos', [dict(factura_linea_id=f['lineas'][0]['id'], hito_cobro_id=tid, importe=imp, como='a_mano')])
                if f['oportunidad_id'] != o['id']: b.actualizar('facturas?id=eq.' + f['id'], {'oportunidad_id': o['id']})
    print(num, o['nombre'])
b.actualizar('facturas?id=eq.' + f21['id'], {'estado': 'anulada', 'notas': '\n'.join(x for x in (f21['notas'],
             'Anulada: dice «70 %%» y factura 4.500 (el total); la buena es la Accesalia 2022/1-64 (3.150, cobrada). Sin arqueología (Mónica, %s).' % HOY) if x)})
correo = ('Pedido por correo de Oswaldo García (FAIN, 15-jul-2022): «empieces con estos dos proyectos, a razón de 2.500 € cada uno; esto lo cobras '
          'directamente a la propiedad». Sustituye a la nota de responsabilidad (Mónica, %s).' % HOY)
for n, h in notas:
    v = h['versiones_hoja'][0]
    ruta = 'almacen:documentos-comerciales/' + b.subir('documentos-comerciales', 'hojas-encargo/%s/firmada-v1-1-%s.pdf' % (h['id'], v['id'][:8]), open(CORREO, 'rb').read(), reemplazar=True)
    b.actualizar('versiones_hoja?id=eq.' + v['id'], {'pdfs_firmados': [ruta], 'notas': '\n'.join(x for x in (v['notas'], 'Antes: ' + (h['motivo_sin_firma'] or ''), correo) if x)})
    b.actualizar('hojas_encargo?id=eq.' + h['id'], dict(tipo_documento='pedido', responsable_id=None, motivo_sin_firma=None, fecha_firma='2022-07-15',
                 fecha_estado='2022-07-15T00:00:00+00:00', fecha_creacion='2022-07-15'))
    b.actualizar('lineas_facturacion?hoja_encargo_id=eq.' + h['id'], {'origen': 'pedido'})
    print(n, '-> pedido')
print('ESCRITO')
