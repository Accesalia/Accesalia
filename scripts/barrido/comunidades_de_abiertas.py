# -*- coding: utf-8 -*-
"""Comunidad para las oportunidades ABIERTAS que no la tienen (Monica, 9-oct-2026).

Ya tienen sus portales de Catastro (relacion_oportunidad_accesos, del paso anterior), asi que el nombre sale de
ahi, no de la carpeta pegada: la via, el numero y el municipio de sus accesos, con el estilo de la lista ("CP" delante,
la calle sin tipo, los demas tipos delante, el articulo delante: Catastro escribe "ROBLES DE LOS").

  - Opps que comparten algun portal = la MISMA comunidad (proyecto + subvencion del mismo edificio).
  - Si algun portal ya esta en una opp que SI tiene comunidad, se engancha a esa: no se duplica.
  - Varias calles (la mancomunidad de Fortunata y Jacinta / Orense / Pedro Teixeira) -> "CALLE 1 - CALLE 2 MUNICIPIO".

  python scripts/barrido/comunidades_de_abiertas.py            -> marcha en seco (comunidades_de_abiertas.json)
  python scripts/barrido/comunidades_de_abiertas.py --escribir -> crea y engancha
"""
import sys, os, re, json
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
import catastro_opps_abiertas as cat  # noqa: E402
from comunidades_de_cerradas import TIPO_NOMBRE, articulo_delante, sin_tildes, clave  # noqa: E402

b = cat.b
SALIDA = os.path.join(AQUI, 'comunidades_de_abiertas.json')


def num_orden(n):
    m = re.match(r'(\d+)', n or ''); return (int(m.group(1)) if m else 9999, n)


def nombre_de(accesos):
    """'CP SANGENJO 19-21-23 MADRID'. Agrupa por via; los numeros, sin repetir (las escaleras no van al nombre)."""
    por_via, munis = {}, []
    for a in accesos:
        tipo = TIPO_NOMBRE.get(a['tipo_via'], a['tipo_via'] or '')
        via = ' '.join(x for x in (tipo, articulo_delante((a['nombre_via'] or '').strip())) if x)
        por_via.setdefault(via, set()).add((a['numero'] or '').replace('(', ' ').replace(')', '').strip())
        if a['municipio'] and a['municipio'] not in munis: munis.append(a['municipio'])
    trozos = ['%s %s' % (via, '-'.join(sorted((n for n in nums if n), key=num_orden))) for via, nums in por_via.items()]
    return re.sub(r'\s+', ' ', 'CP %s %s' % (' - '.join(t.strip() for t in trozos), ' / '.join(munis))).strip()


def main():
    escribir = '--escribir' in sys.argv
    ops = {o['id']: o for o in b.leer('oportunidades?select=id,codigo,comunidad_id,estado')}
    rel = b.leer('relacion_oportunidad_accesos?select=opp_id,acceso_id')
    acc = {a['id']: a for a in b.leer('accesos?select=id,municipio,tipo_via,nombre_via,numero,escalera,ref_catastral')}
    por_opp, por_acceso = {}, {}
    for r in rel:
        por_opp.setdefault(r['opp_id'], set()).add(r['acceso_id'])
        por_acceso.setdefault(r['acceso_id'], set()).add(r['opp_id'])

    objetivo = [oid for oid, o in ops.items() if o['estado'] == 'abierta' and not o['comunidad_id'] and oid in por_opp]
    sin_portal = [o['codigo'] for o in ops.values() if o['estado'] == 'abierta' and not o['comunidad_id'] and o['id'] not in por_opp]

    # grupos: opps sin comunidad unidas por portales compartidos
    padre = {o: o for o in objetivo}
    def raiz(x):
        while padre[x] != x: padre[x] = padre[padre[x]]; x = padre[x]
        return x
    for oid in objetivo:
        for a in por_opp[oid]:
            for otra in por_acceso[a]:
                if otra in padre: padre[raiz(otra)] = raiz(oid)
    grupos = {}
    for oid in objetivo: grupos.setdefault(raiz(oid), []).append(oid)

    existentes = {c['id']: c['nombre'] for c in b.leer('comunidades?select=id,nombre')}
    res, n_reusa, n_nueva, n_compartida = [], 0, 0, 0
    for g in grupos.values():
        accs = set().union(*(por_opp[o] for o in g))
        # alguna opp CON comunidad que comparta portal
        ya = {ops[x]['comunidad_id'] for a in accs for x in por_acceso[a] if ops.get(x, {}).get('comunidad_id')}
        fila = {'opps': [ops[o]['codigo'] for o in g], 'ids': g}
        if len(ya) == 1:
            cid = ya.pop(); fila.update({'existe': cid, 'nombre': existentes.get(cid)}); n_reusa += 1
        elif len(ya) > 1:
            fila.update({'dudosa': 'sus portales estan en %d comunidades distintas' % len(ya), 'comunidades': [existentes.get(c) for c in ya]})
        else:
            fila['nombre'] = nombre_de([acc[a] for a in accs]); n_nueva += 1
            fila['municipio'] = next((acc[a]['municipio'] for a in accs if acc[a]['municipio']), None)
            fila['parcelas'] = sorted({acc[a]['ref_catastral'] for a in accs if acc[a]['ref_catastral']})
        if len(g) > 1: n_compartida += 1
        res.append(fila)
    json.dump(res, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('abiertas sin comunidad con portales: %d (en %d edificios)' % (len(objetivo), len(grupos)))
    print('   comunidad NUEVA            : %d' % n_nueva)
    print('   se enganchan a una EXISTENTE: %d' % n_reusa)
    print('   dudosas                    : %d' % sum(1 for f in res if 'dudosa' in f))
    print('   edificios con varias opps  : %d' % n_compartida)
    print('abiertas sin comunidad y SIN portales (no se tocan): %d %s' % (len(sin_portal), sin_portal))
    if not escribir:
        print('\n(marcha en seco)'); return

    hechas = creadas = 0
    for f in res:
        if 'dudosa' in f: continue
        cid = f.get('existe')
        if not cid:
            [c] = cat.upsert('comunidades', [{'nombre': f['nombre'], 'municipio': f.get('municipio')}], 'id')
            cid = c['id']; creadas += 1
        for oid in f['ids']:
            b.actualizar('oportunidades?id=eq.%s&comunidad_id=is.null' % oid, {'comunidad_id': cid}); hechas += 1
    print('comunidades nuevas: %d | opps enganchadas: %d' % (creadas, hechas))


if __name__ == '__main__':
    main()
