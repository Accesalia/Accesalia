# -*- coding: utf-8 -*-
"""CLAVES DIR: crear las de lo que ya tenemos (Monica, 13-oct-2026: "primero las 1.996 que se pueden crear, luego
las otras"). Modelo: docs/clave-actuacion-areas.md, PROPUESTA EN PRUEBA; tabla: migracion 20261013190000_claves_dir.

  1) misma municipio + via + numero = misma clave;
  2) todos los accesos de una opp = la misma clave (la opp vive en una sola);
  3) solo nacen claves con alguna opp: los accesos que no estan en ninguna ("hermanos") se quedan sin clave;
  4) NUMERO DIR a las que tienen alguna hoja firmada (no anulada), por fecha de su primera firma (DIR-00001 = la mas
     antigua);
  5) nombre desde sus accesos, como el de la opp: "Ganapanes 31, 33 y 35, Madrid".
CONTROL al acabar: toda opp con accesos tiene clave, y una sola. Las opps SIN accesos (777 el 13-oct, sin buscar en
Catastro) son el paso siguiente.
  python scripts/poblar_claves.py [--escribir]
"""
import sys, os, re, json, uuid, collections, urllib.request
sys.path.insert(0, os.path.dirname(__file__))
from produccion import arrancar  # noqa: E402
ESCRIBIR = '--escribir' in sys.argv
b = arrancar()
cab = dict(b.cab); cab['Content-Type'] = 'application/json'

MINUSCULAS = {'DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y'}


def bonito(nombre):            # el mismo que frontend/lib/direccionNombre.ts
    ps = (nombre or '').split()
    k = len(ps)
    while k > 1 and ps[k - 1] in MINUSCULAS:
        k -= 1
    if k < len(ps):
        ps = ps[k:] + ps[:k]
    return ' '.join(p.lower() if i > 0 and p in MINUSCULAS else p[:1].upper() + p[1:].lower() for i, p in enumerate(ps))


def y(xs):
    return xs[0] if len(xs) == 1 else '%s y %s' % (', '.join(xs[:-1]), xs[-1])


def orden(n):
    m = re.match(r'(\d+)', n or '')
    return (int(m.group(1)) if m else 10 ** 9, n or '')


def nombre_de(accesos):
    por_via = collections.OrderedDict()
    for a in sorted(accesos, key=lambda a: (a['nombre_via'] or '', orden(a['numero']))):
        por_via.setdefault(a['nombre_via'], [])
        n = re.sub(r'\((\w+)\)', r' \1', a['numero'] or '')
        if n not in por_via[a['nombre_via']]:
            por_via[a['nombre_via']].append(n)
    trozos = ['%s %s' % (bonito(v), y(ns)) for v, ns in por_via.items()]
    return '%s, %s' % (' + '.join(trozos), bonito(accesos[0]['municipio']))


acc = {a['id']: a for a in b.leer('accesos?select=id,municipio,tipo_via,nombre_via,numero,escalera,clave_id&order=id')}
assert not b.leer('claves?select=id&limit=1'), 'ya hay claves: este script es para la primera carga'
rel = b.leer('relacion_oportunidad_accesos?select=opp_id,acceso_id&hasta=is.null&order=opp_id,acceso_id')
firmadas = b.leer('hojas_encargo?select=oportunidad_id,fecha_firma,numero_hoja&estado=eq.devuelta_firmada&order=id')

padre = {i: i for i in acc}


def raiz(x):
    while padre[x] != x:
        padre[x] = padre[padre[x]]
        x = padre[x]
    return x


def une(a, c):
    ra, rc = raiz(a), raiz(c)
    if ra != rc:
        padre[ra] = rc


por_dir = collections.defaultdict(list)
for a in acc.values():
    por_dir[(a['municipio'], a['tipo_via'], a['nombre_via'], a['numero'])].append(a['id'])
for ids in por_dir.values():
    for x in ids[1:]:
        une(ids[0], x)
por_opp = collections.defaultdict(list)
for r in rel:
    por_opp[r['opp_id']].append(r['acceso_id'])
for ids in por_opp.values():
    for x in ids[1:]:
        une(ids[0], x)

grupos = collections.defaultdict(list)
for i in acc:
    grupos[raiz(i)].append(i)
con_opp = {raiz(ids[0]) for ids in por_opp.values()}
primera = {}
for h in firmadas:
    ids = por_opp.get(h['oportunidad_id'])
    if ids:
        g = raiz(ids[0])
        f = h['fecha_firma'] or '9999-12-31'
        primera[g] = min(primera.get(g, f), f)

claves = [(g, nombre_de([acc[i] for i in grupos[g]])) for g in grupos if g in con_opp]
numeradas = sorted(primera, key=lambda g: (primera[g], g))
print('claves: %d | con numero DIR: %d | accesos con clave: %d de %d' % (
    len(claves), len(numeradas), sum(len(grupos[g]) for g, _ in claves), len(acc)))
for g in numeradas[:5] + numeradas[-3:]:
    print('   %s  %s' % (primera[g], dict(claves)[g]))
if not ESCRIBIR:
    print('(en seco)')
    sys.exit()

ids = {g: str(uuid.uuid4()) for g, _ in claves}
filas = [{'id': ids[g], 'nombre': n} for g, n in claves]
for i in range(0, len(filas), 500):
    b.insertar('claves', filas[i:i + 500])
print('claves creadas')
for k, (g, _) in enumerate(claves, 1):
    b.actualizar('accesos?id=in.(%s)' % ','.join(grupos[g]), {'clave_id': ids[g]})
    if k % 400 == 0:
        print('   accesos enlazados: %d claves' % k)
for g in numeradas:
    req = urllib.request.Request(b.url + '/rest/v1/rpc/siguiente_dir', data=b'{}', headers=cab, method='POST')
    with urllib.request.urlopen(req) as r:
        codigo = json.loads(r.read().decode('utf-8'))
    b.actualizar('claves?id=eq.%s' % ids[g], {'codigo': codigo, 'numerada_en': primera[g] + 'T00:00:00+00:00' if primera[g] < '9999' else None})
print('numeradas: %d' % len(numeradas))

# CONTROL: toda opp con accesos, con clave; y una sola
ac = {a['id']: a['clave_id'] for a in b.leer('accesos?select=id,clave_id&order=id')}
sin, varias = [], []
for o, xs in por_opp.items():
    cs = {ac[x] for x in xs}
    if None in cs:
        sin.append(o)
    elif len(cs) > 1:
        varias.append(o)
print('CONTROL: opps con accesos sin clave: %d | opps en varias claves: %d' % (len(sin), len(varias)))
print('ESCRITO')
