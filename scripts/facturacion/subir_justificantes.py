# -*- coding: utf-8 -*-
"""Sube los justificantes de cobro de Drive (2025 y 2026) al almacen privado `facturas` y apunta cada cobro contra su
factura en la tabla `cobros` (Monica, 16-oct-2026).

Lee el CSV de justificantes_de_cobro.py (que es quien lee los PDF). Solo sube las filas en estado 'ok' (cobro) y
'devolucion (alerta)' (devolucion: importe en negativo). Lo demas (abonos, comisiones de devolucion, sin fecha, sin
factura) no se toca: se mira a mano. Un justificante de varias facturas = una fila por factura, con el mismo PDF.
Se puede repetir: lo ya apuntado (misma factura, mismo PDF y mismo tipo) se salta.

DEVOLUCIONES (16-oct-2026). El papel de un CARGO DEVUELTO es el alta del cargo, renombrada "devuelto": no hay otro
papel del cobro. Son dos movimientos que se anulan: el cargo (+) y su devolucion (-), los dos con el mismo PDF. Asi
la repeticion del cargo (otro papel) es lo que cuenta como cobrado. Las devoluciones que hacemos NOSOTROS al cliente
("cobro indebido", "por error") son una salida: van solas, en negativo.
Se salta lo marcado "NO VALE", y si una factura tiene dos papeles con el mismo dia y el mismo importe ("- copia"),
cuenta uno.

  python scripts/facturacion/subir_justificantes.py justificantes.csv [--escribir]
"""
import sys, os, csv, collections, unicodedata, re, datetime
import pymupdf as fitz
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

TIPO = {'cargo': 'cargo_en_cuenta', 'adeudos': 'cargo_en_cuenta', 'recibo': 'cargo_en_cuenta',
        'transferencia': 'transferencia', 'movimiento': 'transferencia', 'abono': 'transferencia',
        'confirming': 'confirming', 'confirming (aviso)': 'confirming', 'aviso de pago': 'aviso_de_pago'}


# El nombre dice que se devolvio: "devuelto", "devolucion", "DEV ...", "(dvto)", "cobro indebido".
DEVUELTO = re.compile(r'(?i)devuel|devoluci|indebido|\bdvto\b|^fac [\d-]+ dev\b')
# El "Detalle del recibo" de CaixaBank dice si se devolvio: "Fecha de devolucion 25 jun 25" (o "-" si no).
FECHA_DEVOLUCION = re.compile(r'Fecha de devoluci[oó]n\s+\d{1,2}\s+[a-z]{3}\s+\d\d')


def devuelto(f):
    if f['estado'] == 'devolucion (alerta)' or (DEVUELTO.search(f['fichero']) and not re.search(r'(?i)repetici|comisi', f['fichero'])):
        return True
    if f['formato'] == 'recibo':
        with fitz.open(f['ruta']) as d:
            return bool(FECHA_DEVOLUCION.search(' '.join(' '.join(p.get_text() for p in d).split())))
    return False


def en_euros(n):
    entero, dec = ('%.2f' % n).split('.')
    con_puntos = '{:,}'.format(int(entero)).replace(',', '.')
    return {con_puntos + ',' + dec, entero + ',' + dec, entero + '.' + dec}


_textos = {}


def total_escrito(f):
    """Si el importe no se leyo, pero el total de su factura esta escrito tal cual en el justificante, es ese."""
    if f['leido'] != 'texto' or not f['factura_total']:
        return None
    if f['ruta'] not in _textos:
        with fitz.open(f['ruta']) as d:
            _textos[f['ruta']] = ' '.join(p.get_text() for p in d)
    t = float(f['factura_total'])
    return t if any(re.search(r'(?<![\d.,])' + re.escape(x) + r'(?![\d])', _textos[f['ruta']]) for x in en_euros(t)) else None


def limpio(nombre):
    s = unicodedata.normalize('NFKD', nombre).encode('ascii', 'ignore').decode()
    return re.sub(r'[^A-Za-z0-9._-]+', '_', s).strip('_')


def main():
    filas = list(csv.DictReader(open(sys.argv[1], encoding='utf-8-sig'), delimiter=';'))
    van = sorted((f for f in filas if f['estado'] in ('ok', 'devolucion (alerta)') and f['factura_id']), key=lambda f: f['dia_cobro'])
    b = arrancar()
    ya = {(c['factura_id'], c['justificante'], c['tipo']) for c in b.leer('cobros?select=factura_id,justificante,tipo')}
    estaban = len(ya)
    nuevos, pdfs, vistos, devueltos = [], {}, set(), set()
    por_pdf = collections.defaultdict(list)
    for f in van:
        por_pdf[f['ruta']].append(f)
    cuadra_junto = {r: bool(fs[0]['importe_leido']) and abs(sum(float(x['factura_total']) for x in fs) - float(fs[0]['importe_leido'])) < 0.05
                    for r, fs in por_pdf.items() if len(fs) > 1}
    for f in van:
        if re.search(r'(?i)no vale', f['fichero']):
            continue
        anio = f['factura'].split('-')[1]
        ruta = 'justificantes/%s/%s/%s' % (f['empresa'], anio, limpio(f['fichero']))
        devolucion = devuelto(f)
        nuestra = devolucion and re.search(r'(?i)indebido|por error', f['fichero'])
        imp = float(f['importe_leido']) if f['importe_leido'] else None
        if int(f['n_facturas_justificante'] or 1) > 1:
            # un justificante de varias facturas: si su total es la suma de las facturas, cada una lleva su total
            imp = float(f['factura_total']) if cuadra_junto.get(f['ruta']) else None
        if imp is None:
            imp = total_escrito(f)
        base = {'factura_id': f['factura_id'], 'fecha_cobro': f['dia_cobro'],
                'justificante': 'almacen:facturas/' + ruta, 'fichero_origen': f['fichero']}
        tipo = TIPO.get(f['formato'], 'otro')
        dia = datetime.date.fromisoformat(f['dia_cobro'])

        def ya_apuntado():
            """El mismo cobro guardado dos veces ("(1)", "- copia", el alta y el detalle del recibo): misma factura,
            mismo importe y a una semana o menos. En el confirming, a cualquier distancia (el aviso y la liquidacion)."""
            lejos = 9999 if tipo == 'confirming' else 7
            return imp is not None and any(fid == f['factura_id'] and abs(i - imp) < 0.02 and abs((d - dia).days) <= lejos
                                           for fid, d, i in vistos)

        if not devolucion:
            if ya_apuntado():
                continue
            movs = [(tipo, imp)]
        elif nuestra:
            movs = [('devolucion', -abs(imp) if imp is not None else None)]
        else:
            # cargo devuelto: el cargo y su devolucion; si el cargo ya estaba apuntado (su alta), solo la devolucion
            # (y si la devolucion ya estaba, por su otro papel, nada)
            if imp is not None and any(fid == f['factura_id'] and abs(i - imp) < 0.02 and abs((d - dia).days) <= 3 for fid, d, i in devueltos):
                continue
            cargo = [] if ya_apuntado() else [(tipo if tipo != 'transferencia' else 'cargo_en_cuenta', imp)]
            movs = cargo + [('devolucion', -abs(imp) if imp is not None else None)]
            if imp is not None:
                devueltos.add((f['factura_id'], dia, imp))
        if imp is not None and (not devolucion or not nuestra):
            vistos.add((f['factura_id'], dia, imp))
        for t, i in movs:
            clave = (base['factura_id'], base['justificante'], t)
            if clave in ya:
                continue
            ya.add(clave)
            nuevos.append({**base, 'tipo': t, 'importe': i})
        pdfs[ruta] = f['ruta']
    print('cobros a apuntar: %d (%s) | PDF a subir: %d | ya estaban: %d'
          % (len(nuevos), dict(collections.Counter(c['tipo'] for c in nuevos)), len(pdfs), estaban))
    if '--escribir' not in sys.argv: print('(marcha en seco)'); return
    for i, (ruta, origen) in enumerate(pdfs.items(), 1):
        with open(origen, 'rb') as fh: b.subir('facturas', ruta, fh.read(), reemplazar=True)
        if i % 100 == 0: print('  ... PDF', i)
    print('apuntados:', b.insertar('cobros', nuevos))


if __name__ == '__main__':
    main()
