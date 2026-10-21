# -*- coding: utf-8 -*-
"""Lee los PDF «Extracto periodo retrospectivo» de La Caixa (la cuenta de Daniel, 2020-2022) (Monica, 21-oct-2026: «solo
desde enero 2020; hacia atras los datos son churros»).

Con «pdftotext -raw» cada movimiento sale en una linea: «DD.MM.AAAA CONCEPTO importe saldo», y debajo sus detalles
(«DD.MM.AAAA Ref.: …», «Más datos: …»). El PDF no dice si el importe es ingreso o cargo: lo dice el saldo (importe =
saldo − saldo anterior), y que ese importe coincida con el que pone es la prueba de que se ha leido bien.

  python scripts/bancos/leer_pdf_retrospectivo.py <pdf> [<pdf>...]      (dice si la cadena de saldos cuadra)
"""
import sys, re, subprocess
sys.stdout.reconfigure(encoding='utf-8')

NUM = r'-?\d{1,3}(?:\.\d{3})*,\d{2}-?'   # el saldo negativo lleva el menos DETRAS: «88,19-»
RE_MOV = re.compile(rf'^(\d{{2}})\.(\d{{2}})\.(\d{{4}}) (.+?) ({NUM}) ({NUM})$')
RE_ANTERIOR = re.compile(rf'SALDO ANTERIOR')
RE_DETALLE = re.compile(r'^(?:\d{2}\.\d{2}\.\d{4} )?(?:Ref\.: |M.s datos: )(.+)$')


def num(s):
    neg = s.endswith('-')
    v = round(float(s.rstrip('-').replace('.', '').replace(',', '.')), 2)
    return -v if neg else v


def leer(pdf):
    txt = subprocess.run(['pdftotext', '-raw', pdf, '-'], capture_output=True).stdout.decode('utf-8', 'replace')
    movs = []
    for linea in txt.splitlines():
        linea = linea.strip()
        m = RE_MOV.match(linea)
        if m and 'SALDO ANTERIOR' not in linea:
            d, mo, y, concepto, imp, saldo = m.groups()
            movs.append(dict(fecha=f'{y}-{mo}-{d}', concepto=concepto.strip(), importe_pdf=num(imp), saldo=num(saldo), detalles=[]))
            continue
        dm = RE_DETALLE.match(linea)
        if dm and movs:
            movs[-1]['detalles'].append(dm.group(1).strip())
    return movs


def con_signo(movs, saldo_inicial=None):
    """Pone el signo con la cadena de saldos. Devuelve (movimientos, roturas)."""
    roturas = []
    prev = saldo_inicial
    for i, m in enumerate(movs):
        if prev is None:   # el primero: se fia del PDF (cargo si el saldo baja respecto a lo que habria con ingreso)
            m['importe'] = None
        else:
            dif = round(m['saldo'] - prev, 2)
            if abs(abs(dif) - m['importe_pdf']) < 0.011:
                m['importe'] = dif
            else:
                m['importe'] = None
                roturas.append((i, m['fecha'], prev, m['importe_pdf'], m['saldo']))
        prev = m['saldo']
    return movs, roturas


if __name__ == '__main__':
    for pdf in sys.argv[1:]:
        movs = leer(pdf)
        movs, rot = con_signo(movs)
        print(f"{pdf.split('/')[-1]}: {len(movs)} movimientos, {movs[0]['fecha']} → {movs[-1]['fecha']}, roturas {len(rot)}")
        for r in rot[:8]:
            print('   rotura', r)
