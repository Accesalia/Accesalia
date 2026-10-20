# -*- coding: utf-8 -*-
"""DAN-2025-001 Pintor Picasso 1-7 + Pintor Velázquez 3 + Alcalde de Móstoles 9 (Móstoles): «hicimos SATE, así que va
el edificio entero» (Mónica, 20-oct-2026). Se enlazan TODOS los portales de sus parcelas (garajes, locales y bajos que
Catastro pone como escaleras aparte), como la app: el acceso es la dirección; su titular, la comunidad de la opp.
  python scripts/opps/pintor_picasso_edificio_entero.py [--escribir]
"""
import sys, os, uuid, urllib.parse
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
o = b.leer('oportunidades?select=id,nombre,comunidad_id&codigo=eq.DAN-2025-001')[0]
rel = [r['acceso_id'] for r in b.leer('relacion_oportunidad_accesos?select=acceso_id&hasta=is.null&opp_id=eq.' + o['id'])]
accs = b.leer('accesos?select=id,ficha_catastro_portal_id&id=in.(%s)' % ','.join(rel))
ya = {a['ficha_catastro_portal_id'] for a in accs}
fichas = {p['ficha_id'] for p in b.leer('ficha_catastro_portal?select=ficha_id&id=in.(%s)' % ','.join(x for x in ya if x))}
fc = {f['id']: f for f in b.leer('ficha_catastro?select=id,referencia,municipio&id=in.(%s)' % ','.join(fichas))}
faltan = [p for p in b.leer('ficha_catastro_portal?select=id,ficha_id,tipo_via,nombre_via,numero,escalera&ficha_id=in.(%s)' % ','.join(fichas))
          if p['id'] not in ya]
for p in faltan:
    f = fc[p['ficha_id']]
    clave = dict(municipio=f['municipio'] or '', tipo_via=p['tipo_via'] or '', nombre_via=p['nombre_via'] or '', numero=p['numero'], escalera=p['escalera'] or '')
    print('falta', p['nombre_via'], p['numero'], repr(p['escalera']))
    if not ESCRIBIR: continue
    hay = b.leer('accesos?select=id,figura_legal_propietaria_id&' + '&'.join('%s=eq.%s' % (k, urllib.parse.quote(v)) for k, v in clave.items()), False)
    if hay:
        aid = hay[0]['id']
        if not hay[0]['figura_legal_propietaria_id']:
            b.actualizar('accesos?id=eq.%s&figura_legal_propietaria_id=is.null' % aid, {'figura_legal_propietaria_id': o['comunidad_id']})
    else:
        aid = str(uuid.uuid4())
        b.insertar('accesos', [dict(clave, id=aid, ref_catastral=f['referencia'], ficha_catastro_portal_id=p['id'], figura_legal_propietaria_id=o['comunidad_id'])])
    r = b.leer('relacion_oportunidad_accesos?select=hasta&opp_id=eq.%s&acceso_id=eq.%s' % (o['id'], aid), False)
    if not r:
        b.insertar('relacion_oportunidad_accesos', [dict(opp_id=o['id'], acceso_id=aid,
                   de_donde='SATE: va el edificio entero (Mónica, 20-oct-2026)')])
    elif r[0]['hasta']:
        b.actualizar('relacion_oportunidad_accesos?opp_id=eq.%s&acceso_id=eq.%s' % (o['id'], aid), {'hasta': None})
if ESCRIBIR:
    nuevo = 'Pintor Picasso 1, 3, 5 y 7 + Pintor Velazquez 3 + Alcalde de Mostoles 9, Mostoles (avenida)'
    b.actualizar('oportunidades?id=eq.' + o['id'], {'nombre': nuevo})
    print(o['nombre'], '->', nuevo)
