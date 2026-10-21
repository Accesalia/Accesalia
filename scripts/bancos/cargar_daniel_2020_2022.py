# -*- coding: utf-8 -*-
"""LA CUENTA DE DANIEL DE 2020 A 2022, DESDE SUS PDF (Monica, 21-oct-2026: «solo desde enero 2020; hacia atras los
datos son churros»).

Los «extractos retrospectivos» de La Caixa de 2020, 2021 y 2022 (DANIEL/movimientos bancarios extracto retrospectivo
2013-2023), leidos con leer_pdf_retrospectivo.py: el signo de cada importe sale del saldo, y la cadena de saldos tiene
que cuadrar de punta a punta (2020 empieza en su «SALDO ANTERIOR») y empalmar con lo que ya hay (16-dic-2022, de los
Excel). Se clasifican igual que 2023-2024 (cargar_historico_caixa_daniel.cargar).

  python scripts/bancos/cargar_daniel_2020_2022.py <pdf 2020> <pdf 2021> <pdf 2022> [--escribir]
"""
import sys, os, re, datetime, subprocess
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402
from leer_pdf_retrospectivo import leer, con_signo, num, NUM  # noqa: E402
from cargar_historico_caixa_daniel import cargar, CUENTA  # noqa: E402


def saldo_anterior(pdf):
    txt = subprocess.run(['pdftotext', '-raw', pdf, '-'], capture_output=True).stdout.decode('utf-8', 'replace')
    m = re.search(rf'SALDO ANTERIOR ({NUM})', txt)
    return num(m.group(1)) if m else None


def main():
    pdfs = [a for a in sys.argv[1:] if not a.startswith('--')]
    movs = []
    for p in pdfs:
        for m in leer(p):
            m['fichero'] = os.path.basename(p)
            movs.append(m)
    movs, roturas = con_signo(movs, saldo_anterior(pdfs[0]))
    if roturas:
        raise SystemExit(f'la cadena de saldos no cuadra: {roturas[:5]}')
    b = arrancar()
    primera = b.leer(f'movimientos_bancarios?select=orden,fecha,importe,saldo&cuenta=eq.{CUENTA}&order=orden.asc&limit=1', por_tramos=False)[0]
    # empalme: el primer apunte cargado (16-dic-2022) tiene que estar en el PDF de 2022, mismo dia, importe y saldo
    pos = [i for i, m in enumerate(movs) if m['fecha'] == primera['fecha'] and abs(m['importe'] - float(primera['importe'])) < 0.011
           and abs(m['saldo'] - float(primera['saldo'])) < 0.011]
    if not pos:
        raise SystemExit(f"no empalma con lo que hay: no encuentro el primer apunte cargado ({primera['fecha']}, {primera['importe']}, {primera['saldo']})")
    nuevas = []
    for m in movs[:pos[0]]:
        ref = [d for d in m['detalles'] if not re.match(r'^[A-Z0-9]{9,}$', d)]
        mas = [d for d in m['detalles'] if d not in ref]
        concepto = m['concepto'] + (' · ' + ref[0] if ref else '')
        nuevas.append(dict(fecha=datetime.date.fromisoformat(m['fecha']), fecha_valor=None, movimiento=concepto,
                           mas_datos=' · '.join(ref[1:] + mas), importe=m['importe'], saldo=m['saldo'], fichero=m['fichero']))
    print(f"{len(movs)} movimientos en los PDF ({movs[0]['fecha']} → {movs[-1]['fecha']}), cadena de saldos sin roturas; "
          f"entran {len(nuevas)} ({nuevas[0]['fecha']} → {nuevas[-1]['fecha']}) y empalman con el primer apunte de la app")
    cargar(b, nuevas, primera, '--escribir' in sys.argv)


if __name__ == '__main__':
    main()
