# PASO A PRODUCCION, GRUPO 1b: FIGURA LEGAL de las comunidades que salen en las hojas firmadas
# (Monica, 8-oct-2026: "hay que darle figura legal a las comunidades; para las que vamos resolviendo
# porque salen ahora, lo hacemos; las demas se miran despues. Asi el trabajo no se pierde").
# La fuente es la casilla y el sello de la hoja FIRMADA, leidos a ojo (como la tarjeta del CIF en
# Alcorcon/Alcobendas). Solo se escribe en figura_legal_propietaria; comunidades.figura no se toca.
#   CIF H                          -> 'Comunidad de Propietarios'
#   razon social MANCOMUNIDAD      -> 'Mancomunidad'
#   CIF E (comunidad de bienes)    -> 'Comunidad de Propietarios' (Monica, 8-oct)
#   y los PORTALES de su opp apuntan a esa figura, solo si el CIF leido en la hoja es el de la comunidad
#   de la opp (asi quedan fuera los de un CIF por portal: Salamanca 1-3-5-7, Principes 17-19, garaje Portugal 23)
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
    elif cif.startswith(('H', 'E')): nuevas.setdefault(cid, 'Comunidad de Propietarios')
import collections
print(collections.Counter(nuevas.values()))
for cid, v in nuevas.items():
    if v != 'Comunidad de Propietarios': print('  ', v, C[cid]['nombre'])
import re
lim = lambda s: re.sub(r'[^A-Z0-9]', '', (s or '').upper())
F2 = base.leer('revision_firmadas?pagador_tipo=eq.comunidad&select=pagador_cif,comunidad_id,opp:oportunidad_id(id,comunidad_id)')
opps = {f['opp']['id']: f['opp']['comunidad_id'] for f in F2
        if f['opp']['comunidad_id'] and C[f['opp']['comunidad_id']]['cif_comunidad']
        and lim(f['pagador_cif']) == lim(C[f['opp']['comunidad_id']]['cif_comunidad'])}
acc = {a['id']: a for a in base.leer('accesos?select=id,figura_legal_propietaria_id,nombre_via,numero')}
enganche, choque = {}, []
for r in base.leer('relacion_oportunidad_accesos?select=opp_id,acceso_id'):
    cid = opps.get(r['opp_id'])
    if not cid or r['acceso_id'] not in acc or (cid not in fig and cid not in nuevas): continue
    actual = acc[r['acceso_id']]['figura_legal_propietaria_id']
    if actual and actual != cid: choque.append((acc[r['acceso_id']]['nombre_via'], acc[r['acceso_id']]['numero'])); continue
    if not actual: enganche[r['acceso_id']] = cid
print('opps con CIF casado:', len(opps), '| portales a enganchar:', len(enganche), '| portales que ya apuntan a otro dueno:', choque)
if not ESCRIBIR: sys.exit('PRUEBA: no se ha escrito nada')
if nuevas: base.insertar('figura_legal_propietaria', [{'id_comodin': cid, 'figura': v} for cid, v in nuevas.items()])
for aid, cid in enganche.items(): base.actualizar(f'accesos?id=eq.{aid}', {'figura_legal_propietaria_id': cid})
print('ESCRITO: figuras', len(nuevas), '| portales', len(enganche))
