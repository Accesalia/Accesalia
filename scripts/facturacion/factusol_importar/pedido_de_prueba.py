"""Ficheros de PRUEBA para importar en FactuSOL (doc GIP.F.01.13 Rev.12): CLI, PCL, LPC (pedido de cliente).
Cliente 99999 y pedido serie 9 nº 1, todo marcado PRUEBA - BORRAR. Copia el estilo del pedido 1/35 de Alexandra
(pendiente: estado 0, línea con pendiente 1). Salen en .xlsx; luego Excel los pasa a .xls."""
import sys, datetime
from openpyxl import Workbook
from openpyxl.utils import column_index_from_string as ci

out = sys.argv[1]
FECHA = datetime.datetime(2026, 10, 19)


def fila(valores):
    n = max(ci(k) for k in valores)
    r = [None] * n
    for k, v in valores.items():
        r[ci(k) - 1] = v
    return r


def guardar(nombre, filas):
    wb = Workbook()
    ws = wb.active
    for f in filas:
        ws.append(f)
    for row in ws.iter_rows():
        for c in row:
            if isinstance(c.value, datetime.datetime):
                c.number_format = 'dd/mm/yyyy'
    wb.save(f'{out}\\{nombre}.xlsx')


def ceros(desde, hasta):
    return {f'{"" if i <= 26 else chr(64 + (i - 1) // 26)}{chr(65 + (i - 1) % 26)}': 0
            for i in range(ci(desde), ci(hasta) + 1)}


CLIENTE = dict(cod=99999, nif='H00000000', nombre='CDAD PROP PRUEBA APP - BORRAR', dom='CL PRUEBA 1',
               pob='MADRID', cp='28001', prov='MADRID')

guardar('CLI', [fila({
    'A': CLIENTE['cod'], 'C': CLIENTE['nif'], 'D': CLIENTE['nombre'], 'E': CLIENTE['nombre'],
    'F': CLIENTE['dom'], 'G': CLIENTE['pob'], 'H': int(CLIENTE['cp']), 'I': CLIENTE['prov'], 'J': 'ESPAÑA',
    'U': '02', 'AK': 0, 'AL': 1, 'AM': 0, 'AN': FECHA, 'AT': 'PRUEBA DESDE LA APP - BORRAR',
})])

LINEAS = [
    ('Según hoja de encargo de fecha 01/09/2026 y recibida en fecha 19/10/2026, Honorarios (50% de 2000€ + iva '
     'como provisión de fondos) para proyecto para INSTALACIÓN DE ASCENSOR  en edificio residencial existente en:\n\n'
     'CL PRUEBA 1 MADRID\n\nEl total de los honorarios incluye:\n- Toma de datos y modelado 3D\n'
     '- Redacción del Proyecto básico y de ejecución\n- Certificado de Fin de Obra\n- DF\n', 1000.00),
    ('\nGestión de subvenciones\n', 200.00),
]
base = round(sum(p for _, p in LINEAS), 2)
iva = round(base * 0.21, 2)

pcl = {'A': 9, 'B': 1, 'C': 'PRUEBA 1 MADRID - PRY ASC 1ª MITAD+SUBV - BORRAR', 'D': FECHA, 'E': 1,
       'G': CLIENTE['cod'], 'H': CLIENTE['nombre'], 'I': CLIENTE['dom'], 'J': CLIENTE['pob'], 'K': CLIENTE['cp'],
       'L': CLIENTE['prov'], 'M': CLIENTE['nif'], 'N': 0, 'O': 0, 'Q': 0, 'R': 'GEN', 'S': base}
pcl.update(ceros('T', 'AS'))
pcl.update({'AT': base, 'AU': 0, 'AV': 0, 'AW': 21, 'AX': 10, 'AY': 4, 'AZ': iva, 'BA': 0, 'BB': 0,
            'BC': 5.2, 'BD': 1.4, 'BE': 0.5, 'BF': 0, 'BG': 0, 'BH': 0, 'BI': 0, 'BJ': 0,
            'BK': round(base + iva, 2), 'BL': '02', 'BN': 0, 'BP': 'PRUEBA DESDE LA APP - BORRAR'})
guardar('PCL', [fila(pcl)])

guardar('LPC', [fila({'A': 9, 'B': 1, 'C': i, 'E': txt, 'F': 1, 'G': 0, 'H': 0, 'I': 0, 'J': p, 'K': p,
                      'L': 1, 'M': 0, 'X': 0})
                 for i, (txt, p) in enumerate(LINEAS, 1)])
print('base', base, 'iva', iva, 'total', round(base + iva, 2))
