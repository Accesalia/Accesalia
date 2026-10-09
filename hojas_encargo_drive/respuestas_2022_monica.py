# FIRMADAS DE 2022: lo que contesto Monica (9-oct-2026) a las ultimas dudas.
#  1. Torrejon 9 (HE-2022-0055): el anadido "1.500 aparte" es una linea mas: "tramitacion de subvencion", 1.500
#  2. Natalio Tortuero 6 (HE-2022-0090): subvencion abonada por acuerdo con el cliente -> plazo ANULADO ("ok")
#  3. Cadalso de los Vidrios 2 = Cardenal Herrera Oria 260: "si, son la misma" -> se fusionan (como Santa Maria la
#     Blanca, migracion 20261002230000): sobrevive la mas antigua (Herrera Oria 260, la del CIF); rastro en fusiones_comunidades
#  4. Lisboa 29 y Leganes 18 (Fuenlabrada): quedan fuera (nada que hacer)
#   python respuestas_2022_monica.py [--escribir]          (1 y 3; el 2 va con --natalio despues del grupo 3)
import sys
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base
ESCRIBIR = '--escribir' in sys.argv
M = '(Monica, 9-oct)'

if '--natalio' in sys.argv:
    h = base.leer('hojas_encargo?numero_hoja=eq.HE-2022-0090&select=id')[0]['id']
    for lf in base.leer(f'lineas_facturacion?hoja_encargo_id=eq.{h}&select=id&order=id'):
        for x in base.leer(f'hitos_cobro?linea_facturacion_id=eq.{lf["id"]}&select=id,estado,notas&order=id'):
            if x['estado'] != 'anulado':
                print('   hito anulado', x['id'][:8])
                if ESCRIBIR: base.actualizar(f'hitos_cobro?id=eq.{x["id"]}', {'estado': 'anulado', 'notas': '\n'.join(
                    y for y in (x['notas'], f'Factura 222/2022 ABONADA (abono 6-000001) por acuerdo con el cliente: no se cobrara {M}.') if y)})
    print('ESCRITO' if ESCRIBIR else 'PRUEBA'); sys.exit()

# 1 · Torrejon 9
f = base.leer('revision_firmadas?numero_hoja=eq.HE-2022-0055&select=id,nota')[0]
ls = base.leer(f'revision_firmadas_lineas?firmada_id=eq.{f["id"]}&select=id,orden,texto&order=orden')
bl = {b['codigo']: b['id'] for b in base.leer('bloques?select=id,codigo&order=id')}
print('0055: linea "Tramitacion de subvencion" 1.500 (100 % al encargo, regla de subvenciones)')
if ESCRIBIR and not any('subvenci' in (l['texto'] or '').lower() for l in ls):
    o = max(l['orden'] for l in ls) + 1
    base.insertar('revision_firmadas_lineas', [{'firmada_id': f['id'], 'orden': o, 'bloque_id': bl['TRAMITACION SUBVENCIONES'], 'importe': 1500,
                   'incluido': False, 'comparacion': 'falta_en_base',
                   'texto': 'Tramitacion de subvencion (Libro del Edificio, IEE y tramitacion de la ayuda; anadido a la hoja: "se facturarian aparte")'}])
    lid = base.leer(f'revision_firmadas_lineas?firmada_id=eq.{f["id"]}&orden=eq.{o}&select=id')[0]['id']
    base.insertar('revision_firmadas_plazos', [{'linea_id': lid, 'orden': 1, 'hito': 'encargo', 'porcentaje': 100, 'importe': None,
                   'texto': '100 % al contratar (regla de las subvenciones; el anadido no dice cuando)'}])
    base.actualizar(f'revision_firmadas?id=eq.{f["id"]}', {'revision': 'pendiente', 'total_base': 7000,
                    'nota': f'El anadido "1.500 que se facturarian aparte" es una linea mas: tramitacion de subvencion, 1.500; total 7.000 {M}.\n' + (f['nota'] or '')})

# 3 · fusion Cadalso de los Vidrios 2 -> Cardenal Herrera Oria 260
SUP, ABS = 'f316bbc8-cb56-4b92-a18b-2dce578c4576', '0b5b9446-6715-4594-b2f0-74827d3fef71'
a = base.leer(f'comunidades?id=eq.{ABS}&select=id,nombre,municipio')
if a:
    print('fusion:', a[0]['nombre'], '-> CP AV CARDENAL HERRERA ORIA 260 MADRID')
    if ESCRIBIR:
        for t in ('oportunidades', 'hojas_encargo', 'revision_firmadas'):
            base.actualizar(f'{t}?comunidad_id=eq.{ABS}', {'comunidad_id': SUP})
        for t, c in (('cuentas_bancarias', 'titular_id'), ('lineas_facturacion', 'pagador_id')):
            base.actualizar(f'{t}?{c}=eq.{ABS}', {c: SUP})
        quedan = [t for t in ('oportunidades', 'hojas_encargo', 'revision_firmadas') if base.leer(f'{t}?comunidad_id=eq.{ABS}&select=comunidad_id')]
        if quedan: sys.exit(f'quedan referencias en {quedan}: no se borra')
        base.insertar('fusiones_comunidades', [{'cif': 'H80089824', 'superviviente_id': SUP, 'absorbida_id': ABS, 'nombre_absorbida': a[0]['nombre'],
                       'municipio': a[0]['municipio'], 'motivo': 'Mismo edificio: misma referencia catastral (8816815VK3881F); Cardenal Herrera '
                       'Oria 260 es la direccion fiscal de Cadalso de los Vidrios 2 (facturas de FAIN). "Si, son la misma" (Monica, 9-oct-2026).'}])
        base.borrar(f'comunidades?id=eq.{ABS}')
print('ESCRITO' if ESCRIBIR else 'PRUEBA')
