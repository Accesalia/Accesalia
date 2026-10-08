# PASO A PRODUCCION, GRUPO 1b: FIGURA LEGAL de las comunidades que salen en las hojas firmadas
# (Monica, 8-oct-2026: "hay que darle figura legal a las comunidades; para las que vamos resolviendo
# porque salen ahora, lo hacemos; las demas se miran despues. Asi el trabajo no se pierde").
# La fuente es la casilla y el sello de la hoja FIRMADA, leidos a ojo (como la tarjeta del CIF en
# Alcorcon/Alcobendas). Solo se escribe en figura_legal_propietaria; comunidades.figura no se toca.
#   CIF H                          -> 'Comunidad de Propietarios'
#   razon social MANCOMUNIDAD      -> 'Mancomunidad'
#   CIF E (comunidad de bienes)    -> NO: lo decide ella
#   python grupo1_figuras.py [--escribir]
import sys
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base
ESCRIBIR = '--escribir' in sys.argv

fig = {x['id_comodin'] for x in base.leer('figura_legal_propietaria?select=id_comodin')}
C = {c['id']: c for c in base.leer('comunidades?select=id,nombre,cif_comunidad')}
F = base.leer('revision_firmadas?pagador_tipo=eq.comunidad&select=pagador_razon_social,pagador_cif,comunidad_id,opp:oportunidad_id(comunidad_id)')
nuevas = {}
for f in F:
    cid = f['comunidad_id'] or f['opp']['comunidad_id']
    if not cid or cid in fig: continue
    cif = (C[cid]['cif_comunidad'] or f['pagador_cif'] or '').upper().replace('-', '').strip()
    if 'MANCOMUN' in (f['pagador_razon_social'] or '').upper(): nuevas[cid] = 'Mancomunidad'
    elif cif.startswith('H'): nuevas.setdefault(cid, 'Comunidad de Propietarios')
import collections
print(collections.Counter(nuevas.values()))
for cid, v in nuevas.items():
    if v != 'Comunidad de Propietarios': print('  ', v, C[cid]['nombre'])
if not ESCRIBIR: sys.exit('PRUEBA: no se ha escrito nada')
base.insertar('figura_legal_propietaria', [{'id_comodin': cid, 'figura': v} for cid, v in nuevas.items()])
print('ESCRITO', len(nuevas))
