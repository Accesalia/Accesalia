# Copia de lo que habia en prod antes del volcado (Monica, 7-oct-2026): las hojas de la carga
# de julio y sus lineas de facturacion de Monday. Se BORRAN en el volcado; esto queda solo
# como constancia temporal. Nada de aqui se vuelve a cargar.
import sys
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base
from openpyxl import Workbook

todo = base.leer   # ya pide por tramos de 1.000

hojas = todo('hojas_encargo?select=*,comunidades(nombre)&order=fecha_creacion')
vers = todo('versiones_hoja?select=*&order=hoja_encargo_id')
conc = todo('conceptos_hoja?select=*,bloques(nombre)&order=hoja_encargo_id')
lin = todo('lineas_facturacion?select=*,bloques(nombre)&order=hoja_encargo_id')
hist = todo('hojas_encargo_estado_historial?select=*&order=hoja_encargo_id')

wb = Workbook(); wb.remove(wb.active)
for nombre, filas in (('Hojas', hojas), ('Versiones', vers), ('Conceptos', conc), ('Lineas facturacion', lin), ('Historial estados', hist)):
    ws = wb.create_sheet(nombre)
    cols = list(filas[0].keys()) if filas else []
    ws.append(cols)
    for f in filas:
        ws.append([str(v) if isinstance(v, (dict, list)) else v for v in (f.get(c) for c in cols)])
    print(nombre, len(filas))
wb.save('../docs/copia_hojas_carga_julio_ANTES_DE_BORRAR.xlsx')
