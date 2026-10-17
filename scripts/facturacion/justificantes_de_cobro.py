"""JUSTIFICANTES DE COBRO (Monica, 12-oct-2026): "cada vez que emitimos un cargo en cuenta nos descargamos el
justificante". Estan en Drive, en la carpeta de las facturas de cada año ("justificantes de cargos"). El nombre del
fichero dice la factura ("fac 14-2026") y que parte del pago es ("2a MITAD (1de3)"); el contenido, el dia del cobro.

Hay muchos formatos: el alta de recibos de CaixaBank (dia del cargo), el fichero de adeudos (fecha de cobro), la
liquidacion de Santander Confirming (fecha de pago), el detalle del movimiento y la consulta de transferencia
recibida (fecha valor), la transferencia hecha por el cliente (fecha), el aviso de CaixaBank de transferencia a
nuestro favor (el dd-mm-aa) y los avisos de pago de las contratas (Iberdrola, Elecnor, Schindler...).

16-oct-2026 (Monica): los avisos de CONFIRMING cuentan como cobro, con la fecha de vencimiento: "JAMAS ha ocurrido
que no se abonen, los emite el propio banco". La factura sale del NOMBRE del fichero (es lo que escribe quien lo
guarda); si no lleva año, el de la carpeta. Los PDF con la letra rota se leen con OCR (rapidocr).

Los cargos DEVUELTOS (el nombre lo dice: "devuelta", "devolucion", "cobro indebido") no son cobros: se apartan
como alerta; las comisiones de devolucion, aparte; la "repeticion" de un cargo devuelto si es cobro.

Este script LEE (no escribe nada): saca de cada justificante su fecha, su factura y su importe, y los casa con las
facturas de la base. Deja un CSV para revisar. Por defecto 2025 y 2026; --anios 2023-2024 (o 2023,2024) para
otros (17-oct-2026: se cargan 2020-2024; antes de 2023 no hay justificantes).
Lo sube subir_justificantes.py, a partir de este CSV.
"""
import sys, os, re, csv, glob, collections, datetime
import pymupdf as fitz

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))
from produccion import arrancar  # noqa: E402

RAIZ = r"G:\Mi unidad\MONICA ACCESALIA\FACTURAS Y GASTOS ACC Y DAN\FACTURAS ACC Y DAN"
EMPRESA = {'ACCESALIA': 'accesalia', 'DANIEL': 'daniel'}
def _anios():
    if '--anios' not in sys.argv: return ('2025', '2026')
    v = sys.argv[sys.argv.index('--anios') + 1]
    if '-' in v:
        a, z = (int(x) for x in v.split('-'))
        return tuple(str(x) for x in range(a, z + 1))
    return tuple(x.strip() for x in v.split(','))


ANIOS = _anios()
_SUELTOS = [x for i, x in enumerate(sys.argv[1:], 1) if not x.startswith('--') and sys.argv[i - 1] != '--anios']
SALIDA = _SUELTOS[0] if _SUELTOS else 'justificantes_de_cobro.csv'

# La factura en el nombre: "fac 30-2025", "fac 215--2025", "Fac 289- 2025", "fac 288 BERASTEGUI" (sin año).
FAC = re.compile(r'fac\.?\s*(\d{1,4})\s*-*\s*(20\d\d)\b', re.I)
FAC_SIN_ANIO = re.compile(r'fac\.?\s*(\d{1,4})\b(?!\s*-*\s*20\d\d)', re.I)
N_RECIBOS = re.compile(r'N[uú]mero de recibos:?\s*(\d+)')
EUROS = r'(\d{1,3}(?:\.\d{3})*,\d\d)'
LEGIBLE = re.compile(r'(?i)\b(importe|fecha|cuenta|factura|recibo|transferencia|cargo)\b')
MESES = {'ene': 1, 'feb': 2, 'mar': 3, 'abr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'ago': 8, 'sep': 9, 'oct': 10,
         'nov': 11, 'dic': 12, 'marzo': 3, 'enero': 1, 'febrero': 2, 'abril': 4, 'mayo': 5, 'junio': 6, 'julio': 7,
         'agosto': 8, 'septiembre': 9, 'octubre': 10, 'noviembre': 11, 'diciembre': 12}
D = r'(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})'

# El dia del cobro, por etiqueta, de la mas fiable a la menos. La primera que aparezca manda.
FECHAS = [
    ('cargo', re.compile(r'D[ií]a del cargo:?\s*' + D)),
    ('adeudos', re.compile(r'Fecha de cobro.{0,120}?' + D)),
    ('confirming', re.compile(r'Fecha Pago\.?\s*' + D)),
    ('movimiento', re.compile(r'Fecha valor\s*(?:Fecha valor\s*)?' + D)),
    ('transferencia', re.compile(r'Fecha de abono:?\s*' + D)),
    ('transferencia', re.compile(r'Fecha de (?:la operaci[oó]n|emisi[oó]n):?\s*' + D)),
    ('transferencia', re.compile(r'Solicitud de transferencia\s*' + D)),
    ('transferencia', re.compile(r'Consulta de transferencia (?:recibida|emitida) Datos generales\s*' + D)),
    ('transferencia', re.compile(r'(?:transferencia|Has hecho la transferencia).{0,200}?Fecha:\s*' + D, re.I)),
    ('abono', re.compile(r'el\s+' + D + r'\s+a las', re.I)),
    ('abono', re.compile(r'ABONO\s+' + D)),
    ('aviso de pago', re.compile(r'\bFECHA\s+' + D)),
]
CONFIRMING = re.compile(r'(?i)Notificaci[oó]n de facturas|pagadas por .{0,60}fecha de vencimiento|confirming')
# "Detalle del recibo" de CaixaBank: fecha de vencimiento "25 jun 25".
RECIBO = re.compile(r'Fecha de vencimiento\s+(\d{1,2})\s+([a-z]{3})\s+(\d\d)\b')
CABECERA_MOV = re.compile(r'(\d{1,2}) (Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic) (\d{4}) (?:\1 \2 \3 )?(?:Detalle del movimiento|Informaci)')
CARTA = re.compile(r'(?i)\b(\d{1,2}) de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre) de (20\d\d)')
CABECERA_IMPRESA = re.compile(r'(\d{1,2})/(\d{1,2})/(\d{2}),\s*\d{1,2}:\d\d')
IMPRESION = re.compile(r'Fecha impresi[oó]n:?\s*' + D)
NO_ES = re.compile(r'(?i)CONTRATO DE TRABAJO|Correcci[oó]n Factura')

_ocr = None


def ocr(ruta):
    global _ocr
    if _ocr is None:
        from rapidocr_onnxruntime import RapidOCR
        _ocr = RapidOCR()
    trozos = []
    with fitz.open(ruta) as d:
        for p in list(d)[:3]:
            res, _ = _ocr(p.get_pixmap(dpi=200).tobytes('png'))
            # por renglones: de arriba abajo y, en cada renglon, de izquierda a derecha
            cajas = sorted(res or [], key=lambda r: (round(r[0][0][1] / 12), r[0][0][0]))
            trozos.append(' '.join(r[1] for r in cajas))
    return ' '.join(' '.join(trozos).split())


def iso(d, m, a):
    a = int(a)
    a = a + 2000 if a < 100 else a
    try:
        return datetime.date(a, int(m), int(d)).isoformat()
    except ValueError:
        return None


def num(s):
    return float(s.replace('.', '').replace(',', '.'))


def fechas_sueltas(plano):
    return [x for x in (iso(*m) for m in re.findall(D, plano)) if x]


def leer(ruta):
    with fitz.open(ruta) as d:
        plano = ' '.join(' '.join(p.get_text() for p in d).split())
    leido = 'texto'
    if not LEGIBLE.search(plano):
        plano, leido = ocr(ruta), 'ocr'
    formato, dia = None, None
    if NO_ES.search(plano):
        formato = 'no es justificante'
    elif 'Detalle del recibo' in plano:
        formato = 'gastos de devolucion' if re.search(r'Concepto\s+comisi', plano, re.I) else 'recibo'
        m = RECIBO.search(plano)
        dia = iso(m.group(1), MESES.get(m.group(2), 0), m.group(3)) if m and m.group(2) in MESES else None
    elif CONFIRMING.search(plano) and not re.search(r'Fecha Pago', plano):
        # el aviso de confirming: cobro a su vencimiento, la fecha mas tardia del aviso
        formato = 'confirming (aviso)'
        fs = [f for f in fechas_sueltas(plano) if f[:4] in ANIOS + (str(int(max(ANIOS)) + 1),)]
        dia = max(fs) if fs else None
    else:
        for nombre, rx in FECHAS:
            m = rx.search(plano)
            if m and iso(*m.groups()[-3:]):
                formato, dia = nombre, iso(*m.groups()[-3:])
                break
        if not dia:
            m = CABECERA_MOV.search(plano)
            if m:
                formato, dia = 'movimiento', iso(m.group(1), MESES[m.group(2).lower()], m.group(3))
        if not dia:
            m = CARTA.search(plano)
            if m:
                formato, dia = 'aviso de pago', iso(m.group(1), MESES[m.group(2).lower()], m.group(3))
        if not dia:
            m = IMPRESION.search(plano)
            if m:
                formato, dia = 'fecha de impresion', iso(*m.groups())
        if not dia:
            # la que pone el navegador al imprimir, arriba a la izquierda: "26/1/26, 13:59" (Monica, 16-oct-2026)
            m = CABECERA_IMPRESA.search(plano)
            if m:
                formato, dia = 'fecha de impresion', iso(*m.groups())
    if not formato:
        formato = 'sin texto legible' if len(re.sub(r'[^A-Za-z]', '', plano)) < 80 else 'otro'
    n = N_RECIBOS.search(plano)
    # importe de cada factura en un alta de recibos: "fac 170- 2025 CP ... ES10 .... 1.234,56"
    por_factura = {}
    for a, b, imp in re.findall(r'fac\.?\s*(\d+)\s*-\s*(20\d\d)\b.{0,140}?ES\d\d[\d ]{20,30}?\s' + EUROS, plano, re.I):
        por_factura.setdefault((int(a), int(b)), num(imp))
    m = re.search(r'(?:Importe total|Importe total del fichero|importe de|Importe(?: y Divisa)?:?)\s*\+?\s*' + EUROS, plano)
    # aviso de pago de FAIN / Schindler / Iberdrola: una tabla con cada factura (serie 1 + numero a 6 cifras),
    # su fecha y su importe: "1000034 05.03.2025 1.210,00"
    por_numero = {}
    for nf, d, mes, a, imp in re.findall(r'\b1(\d{6})\s+(\d\d)\.(\d\d)\.(\d{4})\s+' + EUROS, plano):
        por_numero.setdefault(int(nf), (iso(d, mes, a), num(imp)))
    if por_numero and (not dia or formato == 'fecha de impresion'):
        formato, dia = 'aviso de pago', None
    return {
        'formato': formato, 'dia': dia, 'leido': leido, 'por_numero': por_numero,
        'n': int(n.group(1)) if n else None,
        'total': num(m.group(1)) if m else None,
        'por_factura': por_factura,
        'texto': plano[:300],
    }


def facturas_del_nombre(nombre, anio):
    nombre = re.split(r'(?i)por error indica', nombre)[0]   # "fac 41-2026 (por error indica fac 49-2026)" = la 41
    refs = {(int(a), int(b)) for a, b in FAC.findall(nombre)}
    if not refs:
        refs = {(int(a), int(anio)) for a in FAC_SIN_ANIO.findall(nombre)}
    return sorted(refs)


def main():
    b = arrancar()
    fact = {}
    for f in b.leer('facturas?select=id,empresa_emisora,anio,serie,numero,total,base,estado,pagador_nombre&serie=eq.1'):
        fact[(f['empresa_emisora'], f['anio'], f['numero'])] = f

    filas, cuenta = [], collections.Counter()
    for quien, emp in EMPRESA.items():
        for anio in ANIOS:
            for carpeta in glob.glob(os.path.join(RAIZ, quien, anio, '*', '*')):
                nombre = os.path.basename(carpeta).lower()
                if not os.path.isdir(carpeta) or 'justif' not in nombre:
                    continue
                abono = 'abono' in os.path.dirname(carpeta).lower() or 'abono' in nombre
                for ruta in sorted(set(glob.glob(os.path.join(carpeta, '*.pdf')) + glob.glob(os.path.join(carpeta, '*.PDF')))):
                    fichero = os.path.basename(ruta)
                    x = leer(ruta)
                    refs = facturas_del_nombre(fichero, anio)
                    casadas = [fact.get((emp, a, n)) for n, a in refs]
                    # en el aviso por tabla, la fecha es la de la fila de su factura
                    if not x['dia'] and refs and all(n in x['por_numero'] for n, _ in refs):
                        x['dia'] = x['por_numero'][refs[0][0]][0]
                        x['por_factura'] = {(n, a): x['por_numero'][n][1] for n, a in refs}
                    if abono or fichero.lower().startswith('abono'):
                        estado = 'abono (aparte)'
                    elif x['formato'] == 'no es justificante':
                        estado = 'no es justificante'
                    elif re.search(r'(?i)repetici', fichero):
                        estado = 'ok' if x['dia'] and refs and None not in casadas else 'revisar: repeticion'
                    elif re.search(r'(?i)comisi[oó]n.{0,5}devoluc', fichero) or x['formato'] == 'gastos de devolucion':
                        estado = 'gastos de devolucion (no es cobro)'
                    elif re.search(r'(?i)devuel|devoluci[oó]n|cobro indebido', fichero):
                        estado = 'devolucion (alerta)'
                    elif not x['dia']:
                        estado = 'sin fecha: ' + x['formato']
                    elif not refs:
                        estado = 'sin numero de factura'
                    elif None in casadas:
                        estado = 'factura no esta en la base'
                    else:
                        estado = 'ok'
                    for (n, a), f in zip(refs or [(None, None)], casadas or [None]):
                        cuenta[estado] += 1
                        imp = x['por_factura'].get((n, a)) or (x['total'] if len(refs) == 1 else None)
                        filas.append({
                            'estado': estado, 'formato': x['formato'], 'leido': x['leido'], 'empresa': emp,
                            'fichero': fichero, 'dia_cobro': x['dia'], 'factura': f'{n}-{a}' if n else '',
                            'n_facturas_justificante': len(refs), 'importe_leido': imp,
                            'factura_id': f['id'] if f else None, 'factura_total': f['total'] if f else None,
                            'cuadra': '' if not (f and imp) else ('si' if abs(float(f['total']) - imp) < 0.02 else 'no'),
                            'factura_estado': f['estado'] if f else None,
                            'pagador': f['pagador_nombre'] if f else None,
                            'texto': x['texto'], 'ruta': ruta,
                        })
    with open(SALIDA, 'w', newline='', encoding='utf-8-sig') as fh:
        w = csv.DictWriter(fh, fieldnames=list(filas[0].keys()), delimiter=';')
        w.writeheader()
        w.writerows(filas)
    for k, v in cuenta.most_common():
        print(f'{v:5}  {k}')
    print('filas', len(filas), 'ficheros', len({r["ruta"] for r in filas}))


if __name__ == '__main__':
    main()
