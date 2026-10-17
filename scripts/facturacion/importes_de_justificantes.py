# -*- coding: utf-8 -*-
"""IMPORTES QUE FALTAN EN LOS COBROS (17-oct-2026). Hay cobros con su justificante pero sin importe: el lector no lo
leyo del papel. Se relee cada PDF (del almacen; con OCR si la letra esta rota) y, si el TOTAL EXACTO de su factura
aparece escrito en el papel, ese es el importe (en negativo si es una devolucion). Si no aparece, se queda vacio: no
se adivina nada. Un PDF de varias facturas vale para cada una si aparece el total de cada una.

  python scripts/facturacion/importes_de_justificantes.py [--escribir]
"""
import sys, os, re, collections, urllib.request
import pymupdf as fitz
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

LEGIBLE = re.compile(r'(?i)\b(importe|fecha|cuenta|factura|recibo|transferencia|cargo)\b')
_ocr = None


def en_euros(n):
    entero, dec = ('%.2f' % abs(n)).split('.')
    con_puntos = '{:,}'.format(int(entero)).replace(',', '.')
    return {con_puntos + ',' + dec, entero + ',' + dec, entero + '.' + dec}


def texto(pdf):
    global _ocr
    with fitz.open(stream=pdf, filetype='pdf') as d:
        t = ' '.join(p.get_text() for p in d)
        if LEGIBLE.search(t):
            return t
        if _ocr is None:
            from rapidocr_onnxruntime import RapidOCR
            _ocr = RapidOCR()
        trozos = []
        for p in list(d)[:3]:
            res, _ = _ocr(p.get_pixmap(dpi=200).tobytes('png'))
            trozos.append(' '.join(r[1] for r in (res or [])))
        return ' '.join(trozos)


def main():
    b = arrancar()
    sin = b.leer('cobros?select=id,tipo,justificante,fichero_origen,factura:factura_id(total,numero,anio,empresa_emisora)&importe=is.null')
    print('cobros sin importe:', len(sin))
    textos, cambios, cuenta = {}, [], collections.Counter()
    for c in sin:
        ruta = c['justificante'].split('almacen:', 1)[-1]
        if ruta not in textos:
            try:
                req = urllib.request.Request('%s/storage/v1/object/%s' % (b.url, ruta), headers=b.cab)
                textos[ruta] = texto(urllib.request.urlopen(req).read())
            except Exception as e:  # noqa: BLE001
                textos[ruta] = None
                print('  no se lee', ruta, e)
        t = textos[ruta]
        tot = float(c['factura']['total'])
        if t and tot > 0 and any(re.search(r'(?<![\d.,])' + re.escape(x) + r'(?![\d])', t) for x in en_euros(tot)):
            cambios.append((c['id'], -tot if c['tipo'] == 'devolucion' else tot))
            cuenta['encontrado'] += 1
        else:
            cuenta['no aparece' if t else 'no se lee'] += 1
    print(dict(cuenta))
    if '--escribir' not in sys.argv:
        print('(en seco)')
        return
    for i, imp in cambios:
        b.actualizar('cobros?id=eq.' + i, {'importe': imp})
    print('puestos:', len(cambios))


if __name__ == '__main__':
    main()
