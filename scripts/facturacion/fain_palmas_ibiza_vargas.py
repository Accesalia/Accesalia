# -*- coding: utf-8 -*-
"""FAIN: tres pedidos repartidos con su regla (Mónica, 19-oct-2026, «ok»).

  Palmas 43 Móstoles (HE-2026-0203): la hoja dice 2.300 con CSS; las facturas dicen «50 % / 30 % de 1.500» -> proyecto
      de accesibilidad (RAMPA con barandilla + salvaescaleras, pagado por FAIN) 1.500 en 50/30/20 + CSS 800 en 80/20.
  Ibiza 3 Madrid (HE-2025-0264): sustitución de 2 ascensores, 3.500, FAIN -> 50/30/20 (la entrega, la 2025/1-383).
  Vargas Machuca 1 Alcalá (HE-2023-0156): el «resto» 1.850 de un ascensor de 2.500 + CSS 600 que empezó facturando
      Daniel como autónomo -> proyecto ascensor (lo que quedaba: licencia 750 con la 2023/1-169 + fin de obra 500) + CSS 600.
El concepto del papel no se toca; solo las líneas de cobro y sus pagos.

  python scripts/facturacion/fain_palmas_ibiza_vargas.py [--escribir]
"""
import sys, os, uuid, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
AHORA = datetime.datetime.now(datetime.timezone.utc).isoformat()
MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
b = arrancar()
BLOQUE = {x['codigo']: x['id'] for x in b.leer('bloques?select=id,codigo')}
TIPO = {x['clave']: x['id'] for x in b.leer('tipos_proyecto?select=id,clave')}


def linea(n):
    h = b.leer('hojas_encargo?select=id&numero_hoja=eq.' + n)[0]
    ls = b.leer('lineas_facturacion?select=*&quitada_en=is.null&hoja_encargo_id=eq.' + h['id'])
    assert len(ls) == 1, n
    l = ls[0]
    hs = b.leer('hitos_cobro?select=id,hito,importe,estado,hito_padre_id,notas,enl:factura_linea_hitos(factura_linea_id,importe)&linea_facturacion_id=eq.' + l['id'])
    return h, l, hs


def junta(*v): return '\n'.join(x for x in v if x)


ops = []
# Palmas 43
h, l, hs = linea('HE-2026-0203')
fl = {float(x['importe']): x['enl'][0]['factura_linea_id'] for x in hs if x['enl']}
assert float(l['importe']) == 2300 and set(fl) == {750.0, 450.0}
ops.append(('palmas', h, l, hs, fl))
# Ibiza 3
h2, l2, hs2 = linea('HE-2025-0264')
ent = [x for x in hs2 if x['hito'] == 'entrega' and x['enl']]
enc = [x for x in hs2 if x['hito'] == 'encargo' and not x['enl']]
assert float(l2['importe']) == 3500 and len(ent) == 1 and len(enc) == 1
ops.append(('ibiza', h2, l2, hs2, (ent[0], enc[0])))
# Vargas Machuca
h3, l3, hs3 = linea('HE-2023-0156')
f169 = [e['factura_linea_id'] for x in hs3 for e in x['enl']]
assert float(l3['importe']) == 1850 and len(f169) == 1
ops.append(('vargas', h3, l3, hs3, f169[0]))
print('Palmas 43: proyecto 1500 (750 a 2026/1-100, 450 a 2026/1-196, 300 pdte) + CSS 800 (640+160 pdte)')
print('Ibiza 3: entrega 1750 (2025/1-383), licencia 1050 pdte, cfo 700 pdte')
print('Vargas Machuca 1: proyecto ascensor resto 1250 (licencia 750 con 2023/1-169, cfo 500 pdte) + CSS 600 (480+120 pdte)')
if not ESCRIBIR:
    print('EN SECO'); sys.exit()


def nuevo_hito(lid, hito, imp, pct, estado, orden, fl=None, notas=None):
    tid = str(uuid.uuid4())
    b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=lid, hito=hito, orden=orden, importe=imp, porcentaje=pct, estado=estado, notas=notas)])
    if fl: b.insertar('factura_linea_hitos', [dict(factura_linea_id=fl, hito_cobro_id=tid, importe=imp, como='a_mano')])


def limpiar(hs):
    for x in hs:
        for e in x['enl']: b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (e['factura_linea_id'], x['id']))
    for x in sorted(hs, key=lambda x: not x['hito_padre_id']): b.borrar('hitos_cobro?id=eq.' + x['id'])


def linea_css(l, imp, nota):
    lid = str(uuid.uuid4())
    b.insertar('lineas_facturacion', [dict(id=lid, hoja_encargo_id=l['hoja_encargo_id'], bloque_id=BLOQUE['CSS'], descripcion='Coordinación de Seguridad y Salud',
               importe=imp, es_porcentaje=False, notas=nota, origen=l['origen'], verificado=True, emisor=l['emisor'], pagador_tipo=l['pagador_tipo'],
               pagador_id=l['pagador_id'], forma_cobro=l.get('forma_cobro'), creada_por=MONICA)])
    nuevo_hito(lid, 'pss', round(imp * .8, 2), 80, 'pendiente', 1)
    nuevo_hito(lid, 'cfo', round(imp * .2, 2), 20, 'pendiente', 2)


for qui, h, l, hs, extra in ops:
    if qui == 'palmas':
        nota = ('Mónica, %s: la hoja dice 2.300 con la CSS; FAIN factura el proyecto sobre 1.500 («50 %% / 30 %% de 1.500»). '
                'Proyecto de accesibilidad = rampa exterior con barandilla + salvaescaleras, pagado por FAIN: 1.500 en 50/30/20; CSS 800 en 80/20.' % HOY)
        limpiar(hs)
        b.actualizar('lineas_facturacion?id=eq.' + l['id'], {'importe': 1500.0, 'editada_en': AHORA, 'editada_por': MONICA, 'notas': junta(l['notas'], nota)})
        nuevo_hito(l['id'], 'entrega', 750.0, 50, 'completado', 1, extra[750.0])
        nuevo_hito(l['id'], 'licencia', 450.0, 30, 'completado', 2, extra[450.0])
        nuevo_hito(l['id'], 'cfo', 300.0, 20, 'pendiente', 3)
        linea_css(l, 800.0, nota)
    elif qui == 'ibiza':
        ent, enc = extra
        b.actualizar('hitos_cobro?id=eq.' + ent['id'], {'porcentaje': 50, 'orden': 1})
        b.actualizar('hitos_cobro?id=eq.' + enc['id'], {'hito': 'licencia', 'importe': 1050.0, 'porcentaje': 30, 'orden': 2, 'estado': 'pendiente',
                     'notas': junta(enc['notas'], 'FAIN paga siempre 50/30/20 (Mónica, %s); la hoja decía 50 %% al encargo + 50 %% a la entrega.' % HOY)})
        nuevo_hito(l['id'], 'cfo', 700.0, 20, 'pendiente', 3)
        b.actualizar('conceptos_hoja?id=eq.' + l['concepto_hoja_id'], {'tipo_proyecto_id': TIPO['sustitucion_ascensor']})
    elif qui == 'vargas':
        nota = ('Mónica, %s: ascensor de 2.500 + CSS 600 de FAIN que empezó facturando Daniel como autónomo; desde la Accesalia 2023/1-169 '
                'se factura como Accesalia «el resto» (1.850) = licencia 750 + fin de obra 500 + CSS 600.' % HOY)
        limpiar(hs)
        b.actualizar('lineas_facturacion?id=eq.' + l['id'], {'importe': 1250.0, 'bloque_id': BLOQUE['REDACCION PROYECTO'],
                     'descripcion': 'Proyecto de ascensor: lo que quedaba por facturar (licencia y fin de obra)', 'editada_en': AHORA, 'editada_por': MONICA,
                     'notas': junta(l['notas'], nota)})
        nuevo_hito(l['id'], 'licencia', 750.0, 30, 'completado', 1, extra)
        nuevo_hito(l['id'], 'cfo', 500.0, 20, 'pendiente', 2)
        linea_css(l, 600.0, nota)
print('ESCRITO')
