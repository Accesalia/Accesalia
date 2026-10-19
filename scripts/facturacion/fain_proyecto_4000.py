# -*- coding: utf-8 -*-
"""FAIN: LOS CUATRO PEDIDOS DE 4.000 € (Mónica, 19-oct-2026).

El correo de FAIN (Alberto de Paz) se leyó como cuatro líneas: proyecto 1.500 + licencia 1.500 + ICIO 1.000 + CSS 800.
MAL: FAIN paga SOLO EL PROYECTO, UNA cosa (proyecto + licencia + fin de obra) de 4.000 €, siempre 50 % a la entrega,
30 % a la licencia y 20 % al fin de obra; y el ICIO NUNCA se cobra (es una tasa de la comunidad al ayuntamiento).
Las facturas lo confirman: «30 % de 4.000 € anteproyecto», «20 % de 4.000 € proyecto», «30 % de 4.000 € licencia»...

Arreglo, hoja a hoja:
  - la línea del proyecto pasa a 4.000 € con sus tres pagos (2.000 / 1.200 / 800);
  - las líneas de licencia e ICIO se quitan (quitada_en + nota) y sus pagos se anulan;
  - cada factura va ENTERA a su pago, por LO QUE DICE: anteproyecto y proyecto = trozos de la entrega; licencia; CFO;
  - la CSS (80 / 20) no se toca;
  - las facturas de esas hojas sin opp quedan apuntadas a la opp.

  python scripts/facturacion/fain_proyecto_4000.py [--escribir]
"""
import sys, os, re, uuid, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
AHORA = datetime.datetime.now(datetime.timezone.utc).isoformat()
MONICA = '52fa7b0f-e72b-4338-b3f8-7ad0833a8ba7'
HOJAS = ['HE-2023-0162', 'HE-2024-0191', 'HE-2024-0196', 'HE-2024-0222']
TOTAL = 4000.0
PAGOS = [('entrega', 50, 2000.0), ('licencia', 30, 1200.0), ('cfo', 20, 800.0)]
NOTA = ('FAIN paga SOLO el proyecto, una cosa de 4.000 € (proyecto + licencia + fin de obra), 50/30/20; el ICIO no se cobra '
        'nunca (tasa de la comunidad). Se había leído como proyecto 1.500 + licencia 1.500 + ICIO 1.000 (Mónica, %s).' % HOY)
b = arrancar()
OPS = []


def op(t, d, porque): OPS.append((t, d, porque))


def que_paga(txt):
    t = txt.lower()
    if re.search(r'seguridad y salud|css', t): return None
    if 'anteproyecto a proyecto' in t: return 'entrega'
    if 'anteproyecto' in t or re.search(r'entrega de proyecto|proyecto visado', t): return 'entrega'
    if 'licencia' in t: return 'licencia'
    if re.search(r'\bcfo\b|fin de obra', t): return 'cfo'
    return '?'


for num in HOJAS:
    h = b.leer('hojas_encargo?select=id,oportunidad_id&numero_hoja=eq.' + num)[0]
    ls = b.leer('lineas_facturacion?select=id,descripcion,importe,notas&quitada_en=is.null&hoja_encargo_id=eq.' + h['id'])
    pry = [l for l in ls if l['descripcion'].upper().startswith('REALIZAR PROYECTO')]
    fuera = [l for l in ls if re.search(r'ICIO|LICENCIA', l['descripcion'].upper()) and l not in pry]
    assert len(pry) == 1 and len(fuera) == 2, (num, [l['descripcion'] for l in ls])
    pry = pry[0]
    facturas = {}  # factura_linea_id -> (texto, base, factura_id, opp)
    for l in [pry] + fuera:
        for x in b.leer('hitos_cobro?select=id,hito,estado,hito_padre_id,enl:factura_linea_hitos(factura_linea_id,'
                        'fl:factura_linea_id(concepto,base,f:factura_id(id,empresa_emisora,anio,numero,oportunidad_id)))&linea_facturacion_id=eq.' + l['id']):
            for e in x['enl']:
                fl = e['fl']
                facturas[e['factura_linea_id']] = fl
                op('desenlazar', (e['factura_linea_id'], x['id']), num)
            if l is pry and x['hito_padre_id']:
                op('borrar_hito', x['id'], '%s: trozo viejo' % num)
            elif l is not pry and x['estado'] != 'anulado':
                op('anular_hito', (x['id'], 'Línea quitada: ' + NOTA), num)
    for l in fuera:
        op('quitar_linea', (l['id'], l['notas'], 'Quitada: ' + NOTA), '%s: fuera «%s» %s' % (num, l['descripcion'][:40], l['importe']))
    op('linea_4000', (pry['id'], pry['notas']), num)
    top = {x['hito']: x for x in b.leer('hitos_cobro?select=id,hito,notas&hito_padre_id=is.null&estado=neq.anulado&linea_facturacion_id=eq.' + pry['id'])}
    assert set(top) == {'entrega', 'licencia', 'cfo'}, (num, list(top))
    por_pago = {'entrega': [], 'licencia': [], 'cfo': []}
    for flid, fl in facturas.items():
        q = que_paga(fl['concepto'])
        assert q in por_pago, (num, fl['concepto'])
        por_pago[q].append((flid, float(fl['base']), fl))
    for hito, pct, imp in PAGOS:
        fs = por_pago[hito]
        cobrado = sum(f[1] for f in fs)
        assert cobrado <= imp + 0.01, (num, hito, cobrado)
        estado = 'completado' if abs(cobrado - imp) < 0.01 else ('parcial' if cobrado else 'pendiente')
        op('pago', (top[hito]['id'], imp, pct, estado), '%s: %s %s %s' % (num, hito, imp, estado))
        if len(fs) == 1 and abs(cobrado - imp) < 0.01:
            op('enlazar', (fs[0][0], top[hito]['id'], fs[0][1]), '%s: %s/1-%s entera a %s' % (num, fs[0][2]['f']['anio'], fs[0][2]['f']['numero'], hito))
        else:
            for flid, base, fl in sorted(fs, key=lambda z: (z[2]['f']['anio'], z[2]['f']['numero'])):
                op('trozo', (top[hito]['id'], base, flid, 'completado',
                             'Accesalia %s/1-%s: %s' % (fl['f']['anio'], fl['f']['numero'], ' '.join(fl['concepto'].split())[:120])),
                   '%s: trozo %s de %s (%s/1-%s)' % (num, base, hito, fl['f']['anio'], fl['f']['numero']))
            if fs and cobrado < imp - 0.01:
                op('trozo', (top[hito]['id'], round(imp - cobrado, 2), None, 'pendiente', 'Resto, sin facturar todavía.'), num)
    # facturas de las hojas de la opp (también CSS y subvención) sin opp apuntada
    for x in b.leer('hitos_cobro?select=enl:factura_linea_hitos(fl:factura_linea_id(f:factura_id(id,empresa_emisora,anio,numero,oportunidad_id))),'
                    'linea:linea_facturacion_id!inner(hoja:hoja_encargo_id!inner(oportunidad_id))&linea.hoja.oportunidad_id=eq.' + h['oportunidad_id']):
        for e in x['enl']:
            f = e['fl']['f']
            if not f['oportunidad_id']:
                op('opp_factura', (f['id'], h['oportunidad_id']), '%s: %s %s/1-%s a su opp' % (num, f['empresa_emisora'].capitalize(), f['anio'], f['numero']))

vistos = set()
for t, d, p in OPS:
    k = (t, str(d))
    if k in vistos: continue
    vistos.add(k)
    if t not in ('desenlazar',): print('%-13s %s' % (t, p))
print(sum(1 for t, _, _ in OPS if t == 'desenlazar'), 'enlaces viejos fuera')
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

hechos = set()
for t, d, p in OPS:
    k = (t, str(d))
    if k in hechos: continue
    hechos.add(k)
    if t == 'desenlazar': b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % d)
for t, d, p in OPS:
    k = ('2' + t, str(d))
    if k in hechos: continue
    hechos.add(k)
    if t == 'borrar_hito': b.borrar('hitos_cobro?id=eq.' + d)
    elif t == 'anular_hito':
        x = b.leer('hitos_cobro?select=notas&id=eq.' + d[0])[0]
        b.actualizar('hitos_cobro?id=eq.' + d[0], {'estado': 'anulado', 'notas': '\n'.join(v for v in (x['notas'], d[1]) if v)})
    elif t == 'quitar_linea':
        b.actualizar('lineas_facturacion?id=eq.' + d[0], {'quitada_en': AHORA, 'quitada_por': MONICA, 'notas': '\n'.join(v for v in (d[1], d[2]) if v)})
    elif t == 'linea_4000':
        b.actualizar('lineas_facturacion?id=eq.' + d[0], {'importe': TOTAL, 'descripcion': 'REALIZAR PROYECTO (proyecto, licencia y fin de obra)',
                     'editada_en': AHORA, 'editada_por': MONICA, 'notas': '\n'.join(v for v in (d[1], NOTA) if v)})
    elif t == 'pago':
        b.actualizar('hitos_cobro?id=eq.' + d[0], {'importe': d[1], 'porcentaje': d[2], 'estado': d[3]})
    elif t == 'enlazar':
        b.insertar('factura_linea_hitos', [dict(factura_linea_id=d[0], hito_cobro_id=d[1], importe=d[2], como='a_mano')])
    elif t == 'trozo':
        padre = b.leer('hitos_cobro?select=linea_facturacion_id,hito&id=eq.' + d[0])[0]
        tid = str(uuid.uuid4())
        b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=padre['linea_facturacion_id'], hito=padre['hito'], orden=1,
                   importe=d[1], estado=d[3], hito_padre_id=d[0], notas=d[4])])
        if d[2]: b.insertar('factura_linea_hitos', [dict(factura_linea_id=d[2], hito_cobro_id=tid, importe=d[1], como='a_mano')])
    elif t == 'opp_factura':
        b.actualizar('facturas?id=eq.%s&oportunidad_id=is.null' % d[0], {'oportunidad_id': d[1]})
print('ESCRITO')
