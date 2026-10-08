# ARREGLO (8-oct-2026): grupo2 leyo las lineas leidas por tramos con un orden que no era unico
# (order=orden) y PostgREST repitio unas y se salto otras: 6 conceptos 'incluido' duplicados y 3 que
# no se crearon. Se borran los duplicados (los que no enlaza ninguna linea leida) y se crean los que faltan.
import sys
from urllib.parse import quote
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base
ESCRIBIR = '--escribir' in sys.argv

F = {f['id']: f for f in base.leer('revision_firmadas?revision=eq.corregido&select=id,numero_hoja,hoja_encargo_id&order=id')}
H = {h['id']: h for h in base.leer('hojas_encargo?select=id,version_firmada_id&order=id')}
enl = {l['concepto_hoja_id'] for l in base.leer('revision_firmadas_lineas?concepto_hoja_id=not.is.null&select=concepto_hoja_id&order=id')}
lf = {l['concepto_hoja_id'] for l in base.leer('lineas_facturacion?concepto_hoja_id=not.is.null&select=concepto_hoja_id&order=id')}
for f in F.values():
    vid = H[f['hoja_encargo_id']]['version_firmada_id']
    if not vid: continue
    cs = base.leer(f'conceptos_hoja?version_hoja_id=eq.{vid}&select=id,descripcion,desglose&order=id')
    for c in cs:
        if c['id'] in enl: continue
        gemelo = any(o['id'] in enl and o['descripcion'] == c['descripcion'] for o in cs if o['id'] != c['id'])
        if not gemelo or c['id'] in lf: print('  NO SE TOCA (no es duplicado claro)', f['numero_hoja'], c['descripcion'][:60]); continue
        print('duplicado', f['numero_hoja'], c['desglose'], c['descripcion'][:60])
        if ESCRIBIR: base.borrar(f'conceptos_hoja?id=eq.{c["id"]}')
    for l in base.leer(f'revision_firmadas_lineas?firmada_id=eq.{f["id"]}&concepto_hoja_id=is.null&comparacion=eq.falta_en_base&select=*&order=orden,id'):
        if 'BORRADA' in (l['nota'] or ''): continue
        print('falta', f['numero_hoja'], l['incluido'], l['texto'][:60])
        if not l['incluido']: print('  OJO: se cobra; no se crea a ciegas'); continue
        if ESCRIBIR:
            base.insertar('conceptos_hoja', [{'hoja_encargo_id': f['hoja_encargo_id'], 'version_hoja_id': vid, 'bloque_id': l['bloque_id'],
                           'descripcion': l['texto'], 'importe': l['importe'], 'porcentaje': l['porcentaje'], 'incluido': True,
                           'desglose': 'incluido', 'forma_pago': None}])
            nuevo = base.leer(f'conceptos_hoja?version_hoja_id=eq.{vid}&descripcion=eq.{quote(l["texto"])}&select=id&order=creado_en.desc&limit=1', por_tramos=False)[0]['id']
            base.actualizar(f'revision_firmadas_lineas?id=eq.{l["id"]}', {'concepto_hoja_id': nuevo})
print('ESCRITO' if ESCRIBIR else 'PRUEBA')
