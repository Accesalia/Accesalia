# -*- coding: utf-8 -*-
"""Presupuestos de Factusol SIN pareja en la app: ¿su direccion tiene oportunidad abierta? ¿y esa opp tiene hojas?
(Monica, 10-oct-2026: "esos si me preocupan"). SOLO LEE.

La direccion sale del nombre del cliente del presupuesto ("CDAD SAN GERARDO 51-53 MADRID") o, si no la trae, del texto
de sus lineas ("... existente en: CL SAN GERARDO 51 ..."). Se busca por conjunto de palabras en comunidades y en los
nombres de las oportunidades.

  python scripts/facturacion/revisar_sin_pareja.py <comparacion.json>
"""
import sys, os, re, json, unicodedata, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

VACIAS = {'CP', 'CDAD', 'CADAD', 'CMDA', 'CDA', 'P', 'PROP', 'C', 'COMUNIDAD', 'PROPIETARIOS', 'DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y', 'CL', 'CALLE',
          'AV', 'AVDA', 'AVENIDA', 'PZ', 'PLAZA', 'PS', 'PASEO', 'N', 'NO', 'SL', 'SA', 'SLU', 'EDIFICIO', 'RESIDENCIAL', 'EXISTENTE', 'EN'}


def pal(t):
    s = unicodedata.normalize('NFD', str(t or '').upper()); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return [p for p in re.sub(r'[^A-Z0-9 ]', ' ', s).split() if p not in VACIAS]


def calle(ps):
    """Las palabras de la calle: las de ANTES del primer numero (detras van barrio, municipio, portal)."""
    out = []
    for w in ps:
        if w.isdigit(): break
        out.append(w)
    return out[:3]


def main():
    comp = json.load(open(sys.argv[1], encoding='utf-8'))
    sp = [x for x in comp if x['veredicto'] == 'sin pareja en la app']
    b = arrancar()
    fac = {('%s %s/%s' % (p['empresa_emisora'], p['anio'], p['numero'])): p for p in
           b.leer('presupuestos?select=empresa_emisora,anio,numero,pagador_nombre,presupuesto_lineas(concepto)&origen=eq.factusol')}
    coms = {c['id']: (c['nombre'], pal(c['nombre'])) for c in b.leer('comunidades?select=id,nombre')}
    opps = b.leer('oportunidades?select=id,codigo,estado,comunidad_id,nombre')
    hojas = collections.Counter(h['oportunidad_id'] for h in b.leer('hojas_encargo?select=oportunidad_id') if h['oportunidad_id'])
    opp_de = collections.defaultdict(list)
    for o in opps: opp_de[o['comunidad_id']].append(o)
    res, c = [], collections.Counter()
    for x in sp:
        p = fac[x['factusol']]
        fuente = p['pagador_nombre']
        ps = pal(fuente)
        if not any(w.isdigit() for w in ps):
            for l in p['presupuesto_lineas']:
                m = re.search(r'existente en:?\s*(.{4,80}?)(?:\s+El total|\s+Incluye|[.]|$)', ' '.join((l['concepto'] or '').split()), re.I)
                if m: fuente, ps = m.group(1), pal(m.group(1)); break
        nums = [w for w in ps if w.isdigit()]
        letras = calle(ps)
        cand = [cid for cid, (n, cp) in coms.items() if letras and nums and all(w in cp for w in letras) and nums[0] in cp]
        r = {'presupuesto': x['factusol'], 'fecha': x['fecha_f'], 'cliente': p['pagador_nombre'], 'direccion_usada': fuente,
             'base': x['base_f'], 'comunidades': [coms[cid][0] for cid in cand]}
        os_ = [o for cid in cand for o in opp_de.get(cid, [])]
        ab = [o for o in os_ if o['estado'] == 'abierta']
        r['opps'] = ['%s (%s, %d hojas)' % (o['codigo'], o['estado'], hojas.get(o['id'], 0)) for o in os_]
        if not letras or not nums: v = 'no se puede leer la direccion (empresa, CAES...)'
        elif not cand: v = 'la direccion NO esta en la app'
        elif not ab: v = 'tiene comunidad pero ninguna opp abierta'
        elif any(hojas.get(o['id'], 0) for o in ab): v = 'opp abierta CON hojas'
        else: v = 'opp abierta SIN ninguna hoja'
        r['veredicto'] = v; c[v] += 1; res.append(r)
    json.dump(res, open(os.path.join(os.path.dirname(sys.argv[1]), 'sin_pareja.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    for k, n in c.most_common(): print('   %-50s %d' % (k, n))


if __name__ == '__main__':
    main()
