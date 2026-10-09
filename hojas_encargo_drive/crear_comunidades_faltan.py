# Comunidades que faltan para las hojas firmadas (8-oct-2026): opps antiguas con solo la direccion provisional
# ("nardos2 (FUENLABRADA)") y sin comunidad. Como Ferenc Puskas 28 y Genil 5: se crea la comunidad con el nombre
# de su portal (via + numero + municipio), el CIF que trae la hoja firmada y su figura legal (Comunidad de
# Propietarios), y se engancha a su opp, a su hoja y a la tabla de trabajo. Nunca se toca un nombre existente.
#   python crear_comunidades_faltan.py HE-2024-0002 ... [--escribir]
import sys, re
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base
ESCRIBIR = '--escribir' in sys.argv
for cod in [a for a in sys.argv[1:] if a.startswith('HE-')]:
    f = base.leer(f'revision_firmadas?numero_hoja=eq.{cod}&select=id,hoja_encargo_id,pagador_cif,opp:oportunidad_id(id,comunidad_id)')[0]
    o = f['opp']
    if o['comunidad_id']: print(cod, 'la opp ya tiene comunidad'); continue
    acc = [r['a'] for r in base.leer(f'relacion_oportunidad_accesos?opp_id=eq.{o["id"]}&select=a:acceso_id(nombre_via,numero,municipio)')]
    if not acc: print(cod, 'SIN PORTAL: no se crea'); continue
    a = acc[0]
    # (Monica, 9-oct) toda comunidad se llama "CP <texto>"
    nombre = 'CP ' + re.sub(r'\s+', ' ', f"{a['nombre_via']} {a['numero']} {a['municipio']}").strip().upper()
    cif = f['pagador_cif'] if f['pagador_cif'] and re.fullmatch(r'[A-Z]\d{7}[0-9A-J]', f['pagador_cif']) else None
    print(cod, '->', nombre, '| CIF', cif)
    if not ESCRIBIR: continue
    ya = base.leer(f'comunidades?cif_comunidad=eq.{cif}&select=id') if cif else []
    if ya: cid = ya[0]['id']
    else:
        base.insertar('comunidades', [{'nombre': nombre, 'municipio': a['municipio'], 'cif_comunidad': cif, 'activa': True}])
        cid = base.leer(f'comunidades?nombre=eq.{nombre.replace(" ", "%20")}&select=id&order=creado_en.desc&limit=1', por_tramos=False)[0]['id']
        base.insertar('figura_legal_propietaria', [{'id_comodin': cid, 'figura': 'Comunidad de Propietarios'}])
    base.actualizar(f'oportunidades?id=eq.{o["id"]}', {'comunidad_id': cid})
    base.actualizar(f'hojas_encargo?id=eq.{f["hoja_encargo_id"]}', {'comunidad_id': cid})
    base.actualizar(f'revision_firmadas?id=eq.{f["id"]}', {'comunidad_id': cid, 'pagador_hay_que_crear': False})
print('ESCRITO' if ESCRIBIR else 'PRUEBA')
