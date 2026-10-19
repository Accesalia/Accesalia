# -*- coding: utf-8 -*-
"""FAIN: CADA FACTURA A SU PAGO, POR LO QUE DICE (Mónica, 19-oct-2026).

FAIN paga el proyecto en tres pagos: 50 % a la entrega, 30 % a la licencia y 20 % al fin de obra. El 50 % de la entrega
lo factura a menudo en dos: «30 % anteproyecto» + «20 % proyecto». El cruce del 17-oct casó por IMPORTE y colgó el
«30 % anteproyecto» de la LICENCIA y el «20 % proyecto» del FIN DE OBRA: la entrega salía sin cobrar y la licencia y el
fin de obra cobrados dos veces.

Aquí, solo en la línea del PROYECTO de cada pedido de FAIN (la CSS no se toca):
  - cada trozo de factura de esa línea se clasifica por su texto: entrega (anteproyecto, entrega de proyecto, proyecto
    visado...), licencia (licencia, declaración responsable, autorización para comenzar la obra...) o fin de obra
    (CFO, fin de obra, restante...); si el texto no lo dice claro, se queda donde está;
  - solo se rehacen las líneas donde alguna factura está en un pago que no es el suyo;
  - cada pago lleva sus facturas: una que lo cubre entera va directa; varias, como trozos; lo que falte, trozo pendiente;
  - el importe de cada pago NO se toca (incluye los ajustes de «manda la factura» ya hablados); si las facturas de un
    pago pasan de su importe, esa hoja NO se escribe y se lista.

  python scripts/facturacion/fain_facturas_a_su_pago.py [--escribir]
"""
import sys, os, re, uuid, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
b = arrancar()


def que_paga(t):
    t = ' '.join(t.lower().split())
    if re.search(r'anteproyecto|entrega de(l)? proyecto|proyecto visado|entrega de proyecto b[aá]sico', t): return 'entrega'
    if re.search(r'fin de obra|final de obra|\bcfo\b', t): return 'cfo'
    if re.search(r'licencia|declaraci[oó]n responsable|\bdr\b|autorizaci[oó]n para comenzar|inicio de obra', t): return 'licencia'
    return None


fain = [c['id'] for c in b.leer('contratas?select=id&nombre=ilike.*fain*')]
hojas = b.leer('hojas_encargo?select=id,numero_hoja&pagador_contrata_id=in.(%s)&order=numero_hoja' % ','.join(fain))
plan, no_escribe = [], []
for h in hojas:
    for l in b.leer('lineas_facturacion?select=id,descripcion,importe&quitada_en=is.null&hoja_encargo_id=eq.' + h['id']):
        if re.search(r'seguridad|csys|css|subvenc|ayudas', l['descripcion'].lower()): continue
        hs = b.leer('hitos_cobro?select=id,hito,importe,estado,hito_padre_id,enl:factura_linea_hitos(factura_linea_id,importe,'
                    'fl:factura_linea_id(concepto,f:factura_id(empresa_emisora,anio,numero)))&linea_facturacion_id=eq.' + l['id'])
        top = {x['hito']: x for x in hs if not x['hito_padre_id'] and x['estado'] != 'anulado'}
        if set(top) != {'entrega', 'licencia', 'cfo'}: continue
        padre_de = {x['id']: (x['hito_padre_id'] or x['id']) for x in hs}
        hito_de = {x['id']: x['hito'] for x in hs}
        trozos = collections.OrderedDict()  # factura_linea_id -> [importe, donde_esta, donde_va, etiqueta]
        mover = False
        for x in hs:
            for e in x['enl']:
                f = e['fl']['f']
                et = '%s %s/1-%s' % (f['empresa_emisora'].capitalize(), f['anio'], f['numero'])
                va = que_paga(e['fl']['concepto']) or hito_de[padre_de[x['id']]]
                esta = hito_de[padre_de[x['id']]]
                t = trozos.setdefault(e['factura_linea_id'], [0.0, esta, va, et, ' '.join(e['fl']['concepto'].split())[:110]])
                t[0] += float(e['importe'] or 0)
                if va != esta: mover = True
        if not mover: continue
        por_pago = collections.defaultdict(list)
        for flid, (imp, esta, va, et, txt) in trozos.items(): por_pago[va].append((flid, round(imp, 2), et, txt, esta))
        pasa = [p for p in top if sum(z[1] for z in por_pago[p]) > float(top[p]['importe']) + 0.01]
        fila = dict(hoja=h['numero_hoja'], linea=l, top=top, hs=hs, por_pago=por_pago)
        (no_escribe if pasa else plan).append(fila)
        print('%s %s %s%s' % ('NO SE ESCRIBE' if pasa else 'arreglo', h['numero_hoja'], l['descripcion'][:30], ' (pasa: %s)' % pasa if pasa else ''))
        for p in ('entrega', 'licencia', 'cfo'):
            fs = por_pago[p]
            print('    %-8s %8.2f <- %s' % (p, float(top[p]['importe']), ' + '.join('%s %.0f%s' % (z[2], z[1], '' if z[4] == p else ' (estaba en %s)' % z[4]) for z in fs) or '-'))
print('\n%d líneas a arreglar, %d no se escriben' % (len(plan), len(no_escribe)))
if not ESCRIBIR:
    print('EN SECO'); sys.exit()

for fila in plan:
    for x in fila['hs']:
        for e in x['enl']:
            b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (e['factura_linea_id'], x['id']))
    for x in fila['hs']:
        if x['hito_padre_id']: b.borrar('hitos_cobro?id=eq.' + x['id'])
    for p, x in fila['top'].items():
        imp = float(x['importe']); fs = fila['por_pago'][p]; cobrado = round(sum(z[1] for z in fs), 2)
        estado = 'completado' if abs(cobrado - imp) < 0.01 else ('parcial' if cobrado else 'pendiente')
        b.actualizar('hitos_cobro?id=eq.' + x['id'], {'estado': estado})
        if len(fs) == 1 and abs(cobrado - imp) < 0.01:
            b.insertar('factura_linea_hitos', [dict(factura_linea_id=fs[0][0], hito_cobro_id=x['id'], importe=fs[0][1], como='a_mano')])
            continue
        for flid, imp_t, et, txt, esta in fs:
            tid = str(uuid.uuid4())
            b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=fila['linea']['id'], hito=p, orden=1, importe=imp_t, estado='completado',
                       hito_padre_id=x['id'], notas='%s: %s (a su pago por lo que dice la factura, Mónica 19-oct-2026)' % (et, txt))])
            b.insertar('factura_linea_hitos', [dict(factura_linea_id=flid, hito_cobro_id=tid, importe=imp_t, como='a_mano')])
        if fs and cobrado < imp - 0.01:
            b.insertar('hitos_cobro', [dict(id=str(uuid.uuid4()), linea_facturacion_id=fila['linea']['id'], hito=p, orden=1,
                       importe=round(imp - cobrado, 2), estado='pendiente', hito_padre_id=x['id'], notas='Resto, sin facturar todavía.')])
print('ESCRITO')
