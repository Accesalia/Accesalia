# -*- coding: utf-8 -*-
"""LAS NOMINAS, EN SU MES (Monica, 21-oct-2026: «las nominas las repercutimos donde toca»).

«Nomina Agosto 2025» pagada el 1-sep cuenta en agosto: movimientos_bancarios.mes_imputado = '2025-08'. El mes sale
del concepto; sin año, el del cargo (y si el mes del concepto va por delante, el año anterior: «Nomina Diciembre»
pagada en enero). Solo se escribe cuando no coincide con el mes del cargo.

  python scripts/bancos/nominas_a_su_mes.py [--escribir]
"""
import sys, os, re, io, collections, urllib.parse
sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

MES = {'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6, 'JULIO': 7, 'AGOSTO': 8, 'SEPTIEMBRE': 9,
       'SETIEMBRE': 9, 'SEPT': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12}
RE_MES = re.compile(r'\b(' + '|'.join(MES) + r')\b(?:\D{0,4}(20\d\d))?')


def mes_de(concepto, fecha):
    mo = RE_MES.search(concepto.upper())
    if not mo:
        return None
    mes = MES[mo.group(1)]
    y = int(mo.group(2)) if mo.group(2) else int(fecha[:4])
    if not mo.group(2) and mes > int(fecha[5:7]) + 1:
        y -= 1
    return f'{y}-{mes:02d}'


def main():
    b = arrancar()
    movs = b.leer('movimientos_bancarios?select=id,fecha,concepto,mas_datos,mes_imputado&tipo=eq.' + urllib.parse.quote('NÓMINAS') + '&order=id')
    cambios, sin = collections.defaultdict(list), 0
    for m in movs:
        mi = mes_de(m['concepto'] + ' ' + (m['mas_datos'] or ''), m['fecha'])
        if not mi:
            sin += 1
        elif mi != m['fecha'][:7] and mi != m['mes_imputado']:
            cambios[mi].append(m['id'])
    print(len(movs), 'nóminas ·', sin, 'sin mes en el concepto ·', sum(map(len, cambios.values())), 'a otro mes que el del cargo')
    for k, v in sorted(cambios.items()):
        print('  ', k, len(v))
    if '--escribir' in sys.argv:
        for mi, ids in cambios.items():
            for i in range(0, len(ids), 80):
                b.actualizar('movimientos_bancarios?id=in.(' + ','.join(ids[i:i + 80]) + ')', {'mes_imputado': mi})
        print('escrito')


if __name__ == '__main__':
    main()
