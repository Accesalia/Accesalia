# -*- coding: utf-8 -*-
"""LA OPP DE LAS FACTURAS SUELTAS (Monica, 17-oct-2026): "facturas sueltas sin hoja, pero les buscaremos la opp para
referenciarlas de alguna manera". Las facturas de 2019-2024 que no casaron con ningun hito (no hay hoja de esos años en
la app, o no encaja) se apuntan a su OPORTUNIDAD en facturas.oportunidad_id, que ya existe: no se inventa hoja ni hito.

Como: la direccion que leyeron los agentes en sus lineas (extraido_*.jsonl de cada año: calle + numero + municipio) contra
los ACCESOS de cada opp (via + numero + municipio). Solo se apunta si sale UNA opp; si en esa direccion hay varias (un
proyecto y su subvencion, p. ej.), la que estaba abierta en la fecha de la factura y, si siguen siendo varias, ninguna:
va a la lista. Las anuladas no cuentan, ni una opp abierta mas de 6 meses DESPUES de la factura (es otro encargo en el
mismo portal).

  python scripts/facturacion/opp_de_facturas_sueltas.py <carpeta_con_extraer_AAAA> [--escribir]
"""
import sys, os, re, json, glob, collections, unicodedata, csv
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

VACIAS = {'CP', 'CDAD', 'PROP', 'C', 'CL', 'CALLE', 'AV', 'AVD', 'AVDA', 'AVENIDA', 'PZ', 'PZA', 'PLAZA', 'PS', 'PASEO', 'PO',
          'CTRA', 'CARRETERA', 'CM', 'CAMINO', 'RONDA', 'TRAVESIA', 'TR', 'GTA', 'GLORIETA', 'DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL',
          'Y', 'N', 'NO', 'NUM', 'COMUNIDAD', 'PROPIETARIOS', 'PORTAL', 'ESC', 'ESCALERA', 'MADRID'}


def k(s):
    s = unicodedata.normalize('NFD', str(s or '').upper())
    return re.sub(r'[^A-Z0-9 ]', ' ', ''.join(c for c in s if unicodedata.category(c) != 'Mn'))


def calle_num(t):
    ps = [p for p in k(t).split() if p not in VACIAS]
    calle, num = [], None
    for p in ps:
        if p.isdigit():
            num = p
            break
        calle.append(p)
    return frozenset(calle[:3]), num


def main():
    raiz = sys.argv[1]
    b = arrancar()
    leidas = {}
    for f in glob.glob(os.path.join(raiz, 'extraer_*', 'extraido_*.jsonl')):
        for ln in open(f, encoding='utf-8'):
            if ln.strip():
                x = json.loads(ln)
                leidas[x['id']] = x
    facturas = b.leer('facturas?select=id,empresa_emisora,anio,serie,numero,fecha,pagador_nombre,oportunidad_id,'
                      'lineas:factura_lineas(id,enlaces:factura_linea_hitos(hito_cobro_id))'
                      '&origen=eq.factusol&tipo=eq.factura&estado=neq.anulada&anio=lte.2024&oportunidad_id=is.null&order=id')
    sueltas = [f for f in facturas if not any(l['enlaces'] for l in f['lineas'])]
    # los accesos vivos de cada opp (no anuladas)
    opps = {o['id']: o for o in b.leer('oportunidades?select=id,codigo,nombre,estado,fecha_apertura,creado_en&estado=neq.anulada&order=id')}
    por_dir = collections.defaultdict(set)
    for r in b.leer('relacion_oportunidad_accesos?select=opp_id,acceso:acceso_id(nombre_via,numero,municipio)&hasta=is.null&order=opp_id'):
        a = r['acceso'] or {}
        if r['opp_id'] not in opps or not a.get('nombre_via') or not a.get('numero'):
            continue
        calle, _ = calle_num(a['nombre_via'])
        num = re.match(r'\d+', str(a['numero']))
        if calle and num:
            por_dir[(calle, num.group(0))].add(r['opp_id'])
    res, c = [], collections.Counter()
    for f in sueltas:
        dirs = [leidas[l['id']] for l in f['lineas'] if l['id'] in leidas and leidas[l['id']].get('direccion')]
        if not dirs:
            c['sin direccion leida'] += 1
            res.append((f, None, 'sin direccion leida', ''))
            continue
        calle, num = calle_num(dirs[0]['direccion'])
        cand = set()
        for (cc, nn), ids in por_dir.items():
            if nn == num and calle and (calle <= cc or cc <= calle):
                cand |= ids
        if len(cand) > 1 and f['fecha']:
            # la que ya existia en la fecha de la factura
            antes = {i for i in cand if (opps[i]['fecha_apertura'] or opps[i]['creado_en'][:10]) <= f['fecha']}
            if len(antes) == 1:
                cand = antes
        # una opp abierta MUCHO despues de la factura es otro encargo en el mismo portal: no es la suya (17-oct)
        if f['fecha']:
            import datetime
            tope = (datetime.date.fromisoformat(f['fecha']) + datetime.timedelta(days=183)).isoformat()
            cand = {i for i in cand if (opps[i]['fecha_apertura'] or opps[i]['creado_en'][:10]) <= tope} or (cand and {'posterior'})
        if cand == {'posterior'}:
            c['solo opp posterior'] += 1
            res.append((f, None, 'solo opp posterior (otro encargo)', dirs[0]['direccion']))
            continue
        if len(cand) == 1:
            o = opps[next(iter(cand))]
            c['una opp'] += 1
            res.append((f, o, 'una opp', dirs[0]['direccion']))
        else:
            c['ninguna' if not cand else 'varias'] += 1
            res.append((f, None, 'ninguna' if not cand else 'varias (%d)' % len(cand), dirs[0]['direccion']))
    print('facturas 2019-2024 sin hito ni opp: %d' % len(sueltas))
    for v, n in c.most_common():
        print('   %-22s %d' % (v, n))
    out = os.path.join(raiz, 'opp_de_facturas_sueltas.csv')
    with open(out, 'w', newline='', encoding='utf-8-sig') as fh:
        w = csv.writer(fh, delimiter=';')
        w.writerow(['factura', 'fecha', 'cliente', 'direccion leida', 'resultado', 'opp', 'nombre opp'])
        for f, o, v, d in res:
            w.writerow(['%s %s/%s-%s' % (f['empresa_emisora'], f['anio'], f['serie'], f['numero']), f['fecha'], f['pagador_nombre'],
                        d, v, o['codigo'] if o else '', o['nombre'] if o else ''])
    print('lista:', out)
    if '--escribir' not in sys.argv:
        print('(marcha en seco)')
        return
    n = 0
    for f, o, v, d in res:
        if o:
            b.actualizar('facturas?id=eq.%s&oportunidad_id=is.null' % f['id'], {'oportunidad_id': o['id']})
            n += 1
    print('apuntadas a su opp: %d' % n)


if __name__ == '__main__':
    main()
