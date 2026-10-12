"""JUSTIFICANTES DE COBRO (Monica, 12-oct-2026): "cada vez que emitimos un cargo en cuenta nos descargamos el
justificante". Estan en Drive, en la carpeta de las facturas de cada año ("justificantes de cargos"). El nombre del
fichero dice la factura ("fac 14-2026") y que parte del pago es ("2a MITAD (1de3)"); el contenido, el dia del cobro.

Hay varios formatos (12-oct-2026): el alta de recibos de CaixaBank (dia del cargo), la liquidacion de Santander
Confirming (fecha de pago), el detalle del movimiento (fecha valor), la transferencia hecha por el cliente (fecha),
el aviso de CaixaBank de transferencia a nuestro favor (abono dd-mm-aa) y el aviso de pago de la contrata. La
notificacion de confirming solo PROMETE el pago a su vencimiento: no es un cobro.

Este script LEE (no escribe nada): saca de cada justificante su fecha y su factura y los casa con las facturas de la
base. Deja un CSV para revisar. Solo 2025 y 2026: las facturas de antes no estan en la base.
"""
import sys, os, re, csv, glob, collections
import pymupdf as fitz

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402

RAIZ = r"G:\Mi unidad\MONICA ACCESALIA\FACTURAS Y GASTOS ACC Y DAN\FACTURAS ACC Y DAN"
EMPRESA = {'ACCESALIA': 'accesalia', 'DANIEL': 'daniel'}
SALIDA = sys.argv[1] if len(sys.argv) > 1 else 'justificantes_de_cobro.csv'

FAC = re.compile(r'fac\.?\s*(\d+)\s*-\s*(20\d\d)', re.I)
N_RECIBOS = re.compile(r'N[uú]mero de recibos:\s*(\d+)')
TOTAL = re.compile(r'Importe total:\s*([\d.]+,\d\d)')

# El dia del cobro, segun el formato. Orden: el primero que aparezca.
FECHAS = [
    ('cargo', re.compile(r'D[ií]a del cargo:\s*(\d\d)/(\d\d)/(\d{4})')),
    ('confirming', re.compile(r'Fecha Pago\.?\s*(\d\d)/(\d\d)/(\d{4})')),
    ('movimiento', re.compile(r'Fecha valor\s*(\d\d)/(\d\d)/(\d{4})')),
    ('transferencia', re.compile(r'transferencia.{0,200}?Fecha:\s*(\d\d)/(\d\d)/(\d{4})', re.I)),
    ('abono', re.compile(r'ABONO\s+(\d\d)-(\d\d)-(\d\d)\b')),
]
MESES = {'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dic': 12}
# "Detalle del recibo" de CaixaBank: fecha de vencimiento "25 jun 25".
RECIBO = re.compile(r'Fecha de vencimiento\s+(\d{1,2})\s+([a-z]{3})\s+(\d\d)\b')
AVISO_PAGO = re.compile(r'\b\d{7}\s+(\d\d)\.(\d\d)\.(\d{4})')


def num(s):
    return float(s.replace('.', '').replace(',', '.'))


def leer(ruta):
    with fitz.open(ruta) as d:
        plano = ' '.join(' '.join(p.get_text() for p in d).split())
    formato, dia = None, None
    if ('Notificaci' in plano and 'Fecha vencimiento' in plano) or 'pagadas por' in plano and 'fecha de vencimiento' in plano:
        formato = 'aviso de vencimiento'
    elif 'Detalle del recibo' in plano:
        formato = 'gastos de devolucion' if re.search(r'Concepto\s+comisi', plano, re.I) else 'recibo'
        m = RECIBO.search(plano)
        dia = f'20{m.group(3)}-{MESES.get(m.group(2), 0):02d}-{int(m.group(1)):02d}' if m and m.group(2) in MESES else None
    elif 'AVISO DE PAGO' in plano:
        formato = 'aviso de pago'
        m = AVISO_PAGO.search(plano)
        dia = f'{m.group(3)}-{m.group(2)}-{m.group(1)}' if m else None
    else:
        for nombre, rx in FECHAS:
            m = rx.search(plano)
            if m:
                a = m.group(3)
                formato, dia = nombre, f'{"20" + a if len(a) == 2 else a}-{m.group(2)}-{m.group(1)}'
                break
    if not formato:
        formato = 'sin texto legible' if len(re.sub(r'[^A-Za-z]', '', plano)) < 80 else 'otro'
    n = N_RECIBOS.search(plano)
    total = TOTAL.search(plano)
    recibos = plano.split('Concepto', 1)[1].split('Alta de una nueva')[0] if formato == 'cargo' and 'Concepto' in plano else ''
    return {
        'formato': formato,
        'dia': dia,
        'n': int(n.group(1)) if n else None,
        'total': num(total.group(1)) if total else None,
        'facturas': sorted({(int(a), int(b)) for a, b in FAC.findall(recibos)}),
        'texto': (recibos or plano)[:300],
    }


def main():
    b = arrancar()
    fact = {}
    for f in b.leer('facturas?select=id,empresa_emisora,anio,serie,numero,total,base,estado,pagador_nombre&serie=eq.1'):
        fact[(f['empresa_emisora'], f['anio'], f['numero'])] = f

    filas, cuenta = [], collections.Counter()
    for quien, emp in EMPRESA.items():
        for anio in ('2025', '2026'):
            for carpeta in glob.glob(os.path.join(RAIZ, quien, anio, '*', '*')):
                nombre = os.path.basename(carpeta).lower()
                if not os.path.isdir(carpeta) or 'justif' not in nombre:
                    continue
                abono = 'abono' in os.path.dirname(carpeta).lower() or 'abono' in nombre
                for ruta in sorted(set(glob.glob(os.path.join(carpeta, '*.pdf')) + glob.glob(os.path.join(carpeta, '*.PDF')))):
                    x = leer(ruta)
                    del_nombre = sorted({(int(a), int(c)) for a, c in FAC.findall(os.path.basename(ruta))})
                    refs = x['facturas'] or del_nombre
                    casadas = [fact.get((emp, a, n)) for n, a in refs]
                    if abono:
                        estado = 'abono (aparte)'
                    elif x['formato'] == 'gastos de devolucion':
                        estado = 'gastos de devolucion (no es cobro)'
                    elif x['formato'] == 'aviso de vencimiento':
                        estado = 'no es cobro (aviso de vencimiento)'
                    elif not x['dia']:
                        estado = 'sin fecha: ' + x['formato']
                    elif not refs:
                        estado = 'sin numero de factura'
                    elif None in casadas:
                        estado = 'factura no esta en la base'
                    elif len(refs) == 1:
                        estado = 'ok'
                    else:
                        estado = 'varias facturas'
                    cuenta[estado] += 1
                    f0 = casadas[0] if casadas and casadas[0] else None
                    filas.append({
                        'estado': estado, 'formato': x['formato'], 'empresa': emp, 'fichero': os.path.basename(ruta),
                        'dia_cobro': x['dia'], 'recibos': x['n'], 'importe_total': x['total'],
                        'facturas': ' '.join(f'{n}-{a}' for n, a in refs),
                        'factura_total': f0['total'] if f0 else None, 'factura_estado': f0['estado'] if f0 else None,
                        'pagador': f0['pagador_nombre'] if f0 else None,
                        'texto': x['texto'], 'carpeta': carpeta,
                    })
    with open(SALIDA, 'w', newline='', encoding='utf-8-sig') as fh:
        w = csv.DictWriter(fh, fieldnames=list(filas[0].keys()), delimiter=';')
        w.writeheader()
        w.writerows(filas)
    for k, v in cuenta.most_common():
        print(f'{v:5}  {k}')
    print('total', len(filas))


if __name__ == '__main__':
    main()
