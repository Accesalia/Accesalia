# ARREGLO (8-oct-2026): algunas lecturas se guardaron con los acentos rotos ("TÃ©rmica" = "Térmica":
# UTF-8 leido como Latin-1). Se deshace la doble codificacion SOLO donde el resultado es texto valido.
import sys
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base
ESCRIBIR = '--escribir' in sys.argv
CAMPOS = {'revision_firmadas': ['nota', 'forma_pago_texto', 'pagador_razon_social', 'pagador_direccion'],
          'revision_firmadas_lineas': ['texto', 'nota'], 'revision_firmadas_plazos': ['texto'],
          'conceptos_hoja': ['descripcion', 'forma_pago'], 'versiones_hoja': ['forma_pago', 'notas'],
          'lineas_facturacion': ['descripcion', 'notas'], 'hitos_cobro': ['notas']}          # las notas de facturacion se regeneran despues (--rehacer)
def bien1(s):
    for cod in ('cp1252', 'latin-1'):
        try: return s.encode(cod).decode('utf-8')
        except (UnicodeEncodeError, UnicodeDecodeError): pass
    return None
def bien(s):                                  # entero; si mezcla buenos y rotos, linea a linea
    r = bien1(s)
    if r is not None or chr(10) not in s: return r
    ls = [(bien1(x) if 'Ã' in x else x) for x in s.split(chr(10))]
    return None if None in ls else chr(10).join(ls)
total = 0
for t, cs in CAMPOS.items():
    for c in cs:
        filas = base.leer(f'{t}?{c}=like.*%C3%83*&select=id,{c}&order=id')
        mal = [(f['id'], f[c], bien(f[c])) for f in filas]
        ok = [m for m in mal if m[2]]
        print(f'{t}.{c}: {len(filas)} rotos, {len(ok)} arreglables')
        for i, a, b in mal[:2]: print('   ', a[:70].replace('\n', ' '), '->', (b or 'NO SE PUEDE')[:70].replace('\n', ' '))
        total += len(ok)
        if ESCRIBIR:
            for i, a, b in ok: base.actualizar(f'{t}?id=eq.{i}', {c: b})
print(total, 'ESCRITO' if ESCRIBIR else 'PRUEBA')
