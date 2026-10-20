# -*- coding: utf-8 -*-
"""Firmadas de 2026 del Drive que no estaban bien en la app (Mónica, 20-oct-2026: «1 ok 2 ok 3 ok 4 ok, vamos con todo»).
Sale de scripts/auditoria/firmadas_drive_contra_app.py (docs/auditoria/firmadas_2026_contra_app.xlsx).
  1. Porvenir 9-19 (HE-2026-0784): firmada el 20-oct-2026; en la app seguía enviada y sin líneas -> sus líneas (proyecto
     7.200: 50 % a la contratación, 50 % a la entrega; CSS 920 a la firma del PSS), firmada y con su PDF.
  2. Felipe Álvarez 28, subvención de EFICIENCIA ENERGÉTICA: firmada el 5-oct-2026 (solo 3,5 % a éxito; documentación
     técnica 0 €). Es la HE-2026-0452 («Subvenciones», enviada el 26-may y vacía) -> su línea, firmada, PDF y su comunidad.
  3. La fecha de firma: donde la app tenía la de creación (la carga no sabía la de firma) y el papel firmado es posterior,
     la del papel. No se tocan las que ya tienen otra fecha (Valmojado 169 y 243, Casimiro Escudero 11, Mancha 18).
  4. «Copias vacías»: al mirarlas NO lo son (Ayamonte 2 HE-2026-0115 = oferta del SATE sin firmar; Polvoranca 26
     HE-2026-0023 = oferta de ascensor sin firmar; Castillo de Simancas 7 HE-2025-0545 = proyecto + licencia, quizá
     sustituida): no se archiva ninguna.
  python scripts/auditoria/firmadas_2026_aplicar.py [--escribir]
"""
import sys, os, uuid, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
DRIVE = r'G:\Mi unidad\MONICA ACCESALIA\PRESUPUESTOS\PRESUPUESTOS FIRMADOS'
b = arrancar()
BLOQUE = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo')}
NOTA = 'Firmada en el Drive (PRESUPUESTOS FIRMADOS, «%s»); no estaba en la app (Mónica, %s).'


def hoja(num):
    return b.leer('hojas_encargo?select=id,numero_hoja,estado,comunidad_id,fecha_creacion,fecha_firma,oportunidad_id,'
                  'versiones_hoja!versiones_hoja_hoja_encargo_id_fkey(id,numero_version,pdfs_firmados)&numero_hoja=eq.' + num)[0]


# (hoja, fichero firmado, fecha de firma, comunidad o None = la suya, líneas [(texto, bloque, importe, %, [(hito, importe, %)])])
COMPLETAR = [
    ('HE-2026-0784', 'PORVENIR 9-19 MADRID - ACCESIBILIDAD - 20-10-2026.pdf', '2026-10-20', None,
     [('Proyectos para accesibilidad (toma de datos, proyecto básico y de ejecución, licencia)', 'REDACCION PROYECTO', 7200, None,
       [('encargo', 3600, 50), ('entrega', 3600, 50)]),
      ('Coordinación de Seguridad y Salud', 'CSS', 920, None, [('pss', 920, 100)])]),
    ('HE-2026-0452', 'FELIPE ALVAREZ 28 MADRID SUBV EXT eficiencia energetica 05-10-2026.pdf', '2026-10-05', '7677973d-447b-48a3-a9a0-646e23ec902a',
     [('Gestión de subvenciones de eficiencia energética: 3,5 % del importe concedido (documentación técnica anexa, 0 €)',
       'TRAMITACION SUBVENCIONES EFICIENCIA ENERGETICA', None, 3.5, [('concesion', None, None)])]),
]
FECHAS = [('HE-2025-0546', '2026-01-16'), ('HE-2025-0547', '2026-01-16'), ('HE-2025-0736', '2026-01-27'), ('HE-2026-0051', '2026-03-12'),
          ('HE-2026-0114', '2026-03-25'), ('HE-2026-0137', '2026-03-25'), ('HE-2026-0136', '2026-03-25'), ('HE-2026-0048', '2026-04-06'),
          ('HE-2026-0413', '2026-07-20'), ('HE-2026-0282', '2026-07-21')]

plan = []
for num, fich, fecha, com, lineas in COMPLETAR:
    h = hoja(num)
    assert h['estado'] == 'enviada_comunidad' and not b.leer('lineas_facturacion?select=id&hoja_encargo_id=eq.' + h['id'], False), num
    assert os.path.exists(os.path.join(DRIVE, fich)), fich
    plan.append((h, fich, fecha, com, lineas))
    print('completar %s -> firmada %s | %s' % (num, fecha, ' + '.join('%s %s' % (t[:30], imp if imp else '%s %%' % pct) for t, _, imp, pct, _ in lineas)))
cambiar = []
for num, f in FECHAS:
    h = hoja(num)
    assert h['estado'] == 'devuelta_firmada' and h['fecha_firma'] == h['fecha_creacion'] and f > h['fecha_firma'], (num, h['fecha_firma'], h['fecha_creacion'])
    cambiar.append((h, f)); print('fecha de firma %s: %s -> %s' % (num, h['fecha_firma'], f))
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

for h, fich, fecha, com, lineas in plan:
    v = sorted(h['versiones_hoja'], key=lambda x: x['numero_version'])[-1]
    com = com or h['comunidad_id']
    ruta = 'almacen:documentos-comerciales/' + b.subir('documentos-comerciales', 'hojas-encargo/%s/firmada-v%d-1-%s.pdf' % (h['id'], v['numero_version'], v['id'][:8]),
                                                       open(os.path.join(DRIVE, fich), 'rb').read(), reemplazar=True)
    nota = NOTA % (fich, HOY)
    b.actualizar('versiones_hoja?id=eq.' + v['id'], {'pdfs_firmados': [ruta], 'importe_base': sum(l[2] or 0 for l in lineas)})
    b.actualizar('hojas_encargo?id=eq.' + h['id'], {'estado': 'devuelta_firmada', 'fecha_firma': fecha, 'fecha_estado': fecha + 'T00:00:00+00:00',
                                                   'version_firmada_id': v['id'], 'comunidad_id': com})
    for texto, bloque, imp, pct, hitos in lineas:
        lid = str(uuid.uuid4())
        b.insertar('lineas_facturacion', [dict(id=lid, hoja_encargo_id=h['id'], bloque_id=BLOQUE[bloque], descripcion=texto, importe=imp, es_porcentaje=pct is not None,
                   porcentaje=pct, base_porcentaje='importe concedido' if pct else None, notas=nota, origen='pdf', verificado=True, emisor='accesalia',
                   pagador_tipo='comunidad', pagador_id=com, forma_cobro='cargo_cuenta', creada_por=MONICA)])
        for orden, (hh, i, p) in enumerate(hitos, 1):
            b.insertar('hitos_cobro', [dict(id=str(uuid.uuid4()), linea_facturacion_id=lid, hito=hh, orden=orden, importe=i, porcentaje=p, estado='pendiente')])
    print('completada', h['numero_hoja'])
for h, f in cambiar:
    b.actualizar('hojas_encargo?id=eq.' + h['id'], {'fecha_firma': f, 'fecha_estado': f + 'T00:00:00+00:00'})
print('ESCRITO')
