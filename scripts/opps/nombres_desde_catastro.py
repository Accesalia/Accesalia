# -*- coding: utf-8 -*-
"""NOMBRE DE CADA OPP DESDE CATASTRO (Mónica, 19/20-oct-2026). Todas las opps con portal tienen ya su ficha de
Catastro; el nombre sale de ahí con la regla de la app (lib/direccionNombre.ts, nombrePropuesto) y su corrección nueva:
si la vía es CALLE no se dice; si es otra cosa, va AL FINAL y entre paréntesis («París 5, Fuenlabrada (plaza)»), para
no afectar al orden alfabético.
  a) mismo texto con otro formato (las de MAYÚSCULAS escritas a mano), sin nombre con portal, o solo el tipo al final
     -> nombre de Catastro;
  b) texto distinto: erratas, escaleras, tipo de vía -> Catastro, sin más; faltan/sobran portales y TODO es de la misma
     parcela catastral -> se da por buena (Catastro); portales de PARCELAS DISTINTAS, o el nombre dice números que no
     están en la parcela -> NO se toca: lista a Mónica (docs/opps/revisar_portales_parcelas.json).
Los nombres de las comunidades NO se tocan (lista curada de Mónica).

  python scripts/opps/nombres_desde_catastro.py [--escribir]
"""
import sys, os, re, json, collections, unicodedata, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
b = arrancar()
MIN = {"DE", "DEL", "LA", "LAS", "EL", "LOS", "Y"}
TIPO = {'AV': 'avenida', 'PZ': 'plaza', 'PL': 'plaza', 'PS': 'paseo', 'TR': 'travesía', 'CM': 'camino', 'CR': 'carretera', 'RD': 'ronda',
        'GL': 'glorieta', 'PJ': 'pasaje', 'CJ': 'callejón', 'UR': 'urbanización', 'BO': 'barrio', 'CO': 'colonia', 'PQ': 'parque', 'VR': 'vereda',
        'SD': 'senda', 'CA': 'cañada', 'DS': 'diseminado', 'AR': 'arroyo', 'CT': 'cuesta', 'VI': 'vía', 'LG': 'lugar', 'EN': 'entrada', 'PA': 'pasadizo'}


def bonito(n):
    ps = n.strip().split(); k = len(ps)
    while k > 1 and ps[k - 1] in MIN: k -= 1
    if k < len(ps): ps = ps[k:] + ps[:k]
    return ' '.join((p.lower() if i > 0 and p in MIN else p.lower().capitalize()) for i, p in enumerate(ps))


def y(xs): return xs[0] if len(xs) <= 1 else ', '.join(xs[:-1]) + ' y ' + xs[-1]


def norm(s): return ' '.join(re.sub(r'[^a-z0-9 ]', ' ', ''.join(c for c in unicodedata.normalize('NFD', (s or '').lower()) if unicodedata.category(c) != 'Mn')).split())


fichas = {f['id']: f for f in b.leer('ficha_catastro_portal?select=id,ficha_id,tipo_via,nombre_via,numero,escalera,viviendas&order=id')}
porficha = collections.defaultdict(list)
for f in fichas.values(): porficha[f['ficha_id']].append(f)
acc = {a['id']: a for a in b.leer('accesos?select=id,ficha_catastro_portal_id,ref_catastral,municipio&order=id')}
ops = {o['id']: o for o in b.leer('oportunidades?select=id,codigo,nombre,estado&estado=neq.anulada&order=id')}
rel = collections.defaultdict(list)
for r in b.leer('relacion_oportunidad_accesos?select=opp_id,acceso_id&hasta=is.null&order=opp_id'): rel[r['opp_id']].append(acc[r['acceso_id']])


def propuesto(accs):
    elegidos = [fichas[a['ficha_catastro_portal_id']] for a in accs]
    todos = [t for e in {e['ficha_id']: e for e in elegidos}.values() for t in porficha[e['ficha_id']]]
    porvia = collections.OrderedDict()
    for p in elegidos: porvia.setdefault(p['nombre_via'], collections.OrderedDict()).setdefault(p['numero'], []).append(p['escalera'] or '')
    orden = lambda n: (int(re.match(r'\d+', n).group()) if re.match(r'\d+', n) else 0, n)
    trozos = []
    for via, nums in porvia.items():
        partes = []
        for num in sorted(nums, key=orden):
            esc = nums[num]; n = re.sub(r'\((\w+)\)', r' \1', num)
            delnum = {(t['escalera'] or ''): t for t in todos if t['nombre_via'] == via and t['numero'] == num}.values()
            conviv = [t for t in delnum if (t['viviendas'] or 0) > 0]
            eleg = [e for e in esc if any((t['escalera'] or '') == e for t in conviv)]
            if conviv and not eleg: partes.append(n + ' (garaje o local)'); continue
            todas = len(eleg) >= len(conviv) or all(not e for e in eleg)
            partes.append(n if todas else '%s %s %s' % (n, 'escaleras' if len(eleg) > 1 else 'escalera', y(eleg)))
        trozos.append('%s %s' % (bonito(via), y(partes)))
    tipos = []
    for p in elegidos:
        t = TIPO.get((p['tipo_via'] or 'CL').upper())
        if t and t not in tipos: tipos.append(t)
    return '%s, %s%s' % (' + '.join(trozos), bonito(accs[0]['municipio']), ' (%s)' % ', '.join(tipos) if tipos else ''), elegidos, todos


def numeros_del_nombre(n):  # «47-49», «91 A 101», «2, 4 ,6», «157-159»
    t = norm(n); out = set()
    for a, c in re.findall(r'\b(\d+)\s*(?:a|-)\s*(\d+)\b', t):
        a, c = int(a), int(c)
        if a < c <= a + 40: out.update(range(a, c + 1, 2))
    out.update(int(x) for x in re.findall(r'\b\d+\b', t) if int(x) < 2000)
    return out


plan, revisar, cuenta = [], [], collections.Counter()
for oid, o in ops.items():
    a = rel.get(oid)
    if not a or not all(x['ficha_catastro_portal_id'] for x in a): continue
    nuevo, elegidos, todos = propuesto(a)
    antes = o['nombre']
    if antes == nuevo: cuenta['ya igual'] += 1; continue
    base_nuevo = re.sub(r'\s*\([^)]*\)$', '', nuevo)
    if not antes or norm(antes) == norm(base_nuevo) or norm(antes) == norm(nuevo):
        cuenta['a) mismo texto, otro formato / sin nombre / tipo al final'] += 1; plan.append((o, nuevo, 'formato')); continue
    parcelas = {(x['ref_catastral'] or '')[:14] for x in a}
    nums_opp = {int(m.group()) for e in elegidos for m in [re.match(r'\d+', e['numero'] or '')] if m}
    nums_parcela = {int(m.group()) for t in todos for m in [re.match(r'\d+', t['numero'] or '')] if m}
    faltan = numeros_del_nombre(antes) - nums_opp
    faltan_fuera = {n for n in faltan if n not in nums_parcela}
    if len(parcelas) > 1 or faltan_fuera:
        cuenta['b) a revisar por Mónica (parcelas distintas)'] += 1
        revisar.append(dict(codigo=o['codigo'], estado=o['estado'], antes=antes, catastro=nuevo,
                            motivo=('sus portales son de %d parcelas distintas' % len(parcelas)) if len(parcelas) > 1 else
                            'el nombre dice %s, que no está en la parcela de sus portales' % ', '.join(map(str, sorted(faltan_fuera))),
                            parcelas=', '.join(sorted(parcelas))))
        continue
    sub = 'faltan portales de la misma parcela' if faltan else 'otro'
    if sub == 'otro':
        pa, pn = norm(antes).split(), norm(base_nuevo).split()
        if any(len(w) >= 3 and not any(w == v or (len(v) >= 3 and (w.startswith(v) or v.startswith(w))) for v in pa) for w in pn if not w.isdigit()) and            any(len(v) >= 4 and v not in pn for v in pa if not v.isdigit()): sub = 'palabras distintas (abreviatura o errata)'
        elif re.search(r'bis', norm(antes)) and not re.search(r'bis', norm(nuevo)): sub = 'se pierde el bis'
        else: sub = 'escalera / artículo / tipo / municipio'
    cuenta['b) ' + sub] += 1; plan.append((o, nuevo, 'texto', sub))
for k, v in sorted(cuenta.items()): print('%5d  %s' % (v, k))
import random; random.seed(5)
for sub in sorted({p[3] for p in plan if p[2] == 'texto'}):
    xs = [p for p in plan if p[2] == 'texto' and p[3] == sub]
    print(' ', sub, len(xs))
    for p in random.sample(xs, min(8, len(xs))): print('     %s | %s  →  %s' % (p[0]['codigo'], p[0]['nombre'], p[1]))
print('   tipo al final:', ' | '.join('%s → %s' % (o['nombre'], n) for o, n, *_ in [p for p in plan if p[2] == 'formato' and '(' in p[1]][:4]))
os.makedirs(os.path.join(RAIZ, 'docs', 'opps'), exist_ok=True)
json.dump(revisar, open(os.path.join(RAIZ, 'docs', 'opps', 'revisar_portales_parcelas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
if not ESCRIBIR:
    print('EN SECO'); sys.exit()
SOLO = '--solo-formato' in sys.argv  # 20-oct: primero solo las de mismo texto (a); el resto espera a Mónica
for o, n, *_ in [p for p in plan if not SOLO or p[2] == 'formato']:
    b.actualizar('oportunidades?id=eq.' + o['id'], {'nombre': n})
print('ESCRITO')
