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
import sys, os, re, json, uuid, collections, unicodedata, datetime, urllib.parse
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
b = arrancar()
MIN = {"DE", "DEL", "LA", "LAS", "EL", "LOS", "Y"}
MINUSC = MIN | {"A", "EN"}  # «Canillejas a Vicalvaro»
TIPO = {'AV': 'avenida', 'PZ': 'plaza', 'PL': 'plaza', 'PS': 'paseo', 'TR': 'travesía', 'CM': 'camino', 'CR': 'carretera', 'RD': 'ronda',
        'GL': 'glorieta', 'PJ': 'pasaje', 'CJ': 'callejón', 'UR': 'urbanización', 'BO': 'barrio', 'CO': 'colonia', 'PQ': 'parque', 'VR': 'vereda',
        'SD': 'senda', 'CA': 'cañada', 'DS': 'diseminado', 'AR': 'arroyo', 'CT': 'cuesta', 'VI': 'vía', 'LG': 'lugar', 'EN': 'entrada', 'PA': 'pasadizo'}


def bonito(n):
    ps = n.strip().split(); k = len(ps)
    while k > 1 and ps[k - 1] in MIN: k -= 1
    if k < len(ps): ps = ps[k:] + ps[:k]
    # los números romanos, en mayúsculas: «Alfonso XII», no «Alfonso Xii» (20-oct-2026)
    romano = lambda p: len(p) >= 2 and re.fullmatch(r'X{0,3}(IX|IV|V?I{0,3})', p)
    return ' '.join((p if romano(p) else p.lower() if i > 0 and p in MINUSC else p.lower().capitalize()) for i, p in enumerate(ps))


ABREV = {'NTRA': 'NUESTRA', 'NTRO': 'NUESTRO', 'SRA': 'SEÑORA', 'SR': 'SEÑOR', 'STA': 'SANTA', 'STO': 'SANTO', 'FCO': 'FRANCISCO',
         'FCA': 'FRANCISCA', 'CGDOR': 'CORREGIDOR', 'DR': 'DOCTOR', 'DRA': 'DOCTORA', 'GRAL': 'GENERAL', 'PDTE': 'PRESIDENTE', 'MTRO': 'MAESTRO',
         'HNOS': 'HERMANOS', 'VDA': 'VIUDA', 'PROF': 'PROFESOR', 'ARQ': 'ARQUITECTO', 'ING': 'INGENIERO', 'CAP': 'CAPITAN', 'CTE': 'COMANDANTE',
         'TTE': 'TENIENTE', 'CNEL': 'CORONEL', 'MQS': 'MARQUES', 'MARQ': 'MARQUES', 'CDE': 'CONDE', 'DQUE': 'DUQUE', 'PDRE': 'PADRE', 'MA': 'MARIA',
         'JE': 'JOSE', 'GTA': 'GLORIETA', 'URB': 'URBANIZACION', 'AVDA': 'AVENIDA', 'CTRA': 'CARRETERA', 'PSO': 'PASEO'}


def entera(via, antes):  # «NTRA SRA D L ANGUSTIAS» -> «NUESTRA SEÑORA DE LAS ANGUSTIAS» (el «D L» se lee en el nombre a mano)
    m = re.match(r'^(.*?)\s*\((DE LA|DE LAS|DE LOS|DEL|LA|LAS|LOS|EL)\)\s*$', via)  # «RECONQUISTA (DE LA)» -> «DE LA RECONQUISTA»
    if m: via = m.group(2) + ' ' + m.group(1)
    ps = via.split(); out = []
    a = norm(antes or '')
    for i, p in enumerate(ps):
        if p == 'D' and i + 1 < len(ps) and ps[i + 1] in ('L', 'LA', 'LAS', 'LOS'):
            art = next((x for x in ('de las', 'de los', 'de la') if (' ' + x + ' ') in (' ' + a + ' ')), 'de la')
            out.append(art.upper()); continue
        if p == 'L' and i > 0 and ps[i - 1] == 'D': continue
        if p == 'D': out.append('DE'); continue
        out.append(ABREV.get(p, p))
    return ' '.join(' '.join(out).split())


def y(xs): return xs[0] if len(xs) <= 1 else ', '.join(xs[:-1]) + ' y ' + xs[-1]


def norm(s): return ' '.join(re.sub(r'[^a-z0-9 ]', ' ', ''.join(c for c in unicodedata.normalize('NFD', (s or '').lower()) if unicodedata.category(c) != 'Mn')).split())


fichas = {f['id']: f for f in b.leer('ficha_catastro_portal?select=id,ficha_id,tipo_via,nombre_via,numero,escalera,viviendas&order=id')}
porficha = collections.defaultdict(list)
for f in fichas.values(): porficha[f['ficha_id']].append(f)
acc = {a['id']: a for a in b.leer('accesos?select=id,ficha_catastro_portal_id,ref_catastral,municipio&order=id')}
ops = {o['id']: o for o in b.leer('oportunidades?select=id,codigo,nombre,estado&estado=neq.anulada&order=id')}
rel = collections.defaultdict(list)
for r in b.leer('relacion_oportunidad_accesos?select=opp_id,acceso_id&hasta=is.null&order=opp_id'): rel[r['opp_id']].append(acc[r['acceso_id']])


def propuesto(accs, antes=None):
    elegidos = [fichas[a['ficha_catastro_portal_id']] for a in accs]
    todos = [t for e in {e['ficha_id']: e for e in elegidos}.values() for t in porficha[e['ficha_id']]]
    porvia = collections.OrderedDict()
    for p in elegidos: porvia.setdefault(p['nombre_via'], collections.OrderedDict()).setdefault(p['numero'], []).append(p['escalera'] or '')
    orden = lambda n: (int(re.match(r'\d+', n).group()) if re.match(r'\d+', n) else 0, n)
    trozos = []
    for via, nums in porvia.items():
        partes = []
        for num in sorted(nums, key=orden):
            esc = sorted(nums[num], key=lambda e: (len(e), e)); n =re.sub(r'\((\w+)\)', r' \1', num)
            delnum = {(t['escalera'] or ''): t for t in todos if t['nombre_via'] == via and t['numero'] == num}.values()
            conviv = [t for t in delnum if (t['viviendas'] or 0) > 0]
            eleg = [e for e in esc if any((t['escalera'] or '') == e for t in conviv)]
            if conviv and not eleg: partes.append(n + ' (garaje o local)'); continue
            todas = len(eleg) >= len(conviv) or all(not e for e in eleg)
            partes.append(n if todas else '%s %s %s' % (n, 'escaleras' if len(eleg) > 1 else 'escalera', y(eleg)))
        trozos.append('%s %s' % (bonito(entera(via, antes)), y(partes)))
    tipos = []
    for p in elegidos:
        t = TIPO.get((p['tipo_via'] or 'CL').upper())
        if t and t not in tipos: tipos.append(t)
    return '%s, %s%s' % (' + '.join(trozos), bonito(accs[0]['municipio']), ' (%s)' % ', '.join(tipos) if tipos else ''), elegidos, todos


def numeros_del_nombre(n):  # «47-49», «91 A 101», «2, 4 ,6», «157-159»
    t = ''.join(c for c in unicodedata.normalize('NFD', (n or '').lower()) if unicodedata.category(c) != 'Mn'); out = set()
    t = re.sub(r'\b(portal|esc|escalera|bloque|bl|piso|planta)\.?\s*\w+', ' ', t)  # «PORTAL 16» es escalera, no número
    for a, c in re.findall(r'\b(\d+)\s*(?:a|-)\s*(\d+)\b', t):
        a, c = int(a), int(c)
        if a < c <= a + 40: out.update(range(a, c + 1, 2))
    out.update(int(x) for x in re.findall(r'\b\d+\b', t) if int(x) < 2000)
    return out


plan, revisar, cuenta, ENLAZAR = [], [], collections.Counter(), []
for oid, o in ops.items():
    a = rel.get(oid)
    if not a or not all(x['ficha_catastro_portal_id'] for x in a): continue
    nuevo, elegidos, todos = propuesto(a, o['nombre'])
    antes = o['nombre']
    if antes == nuevo: cuenta['ya igual'] += 1; continue
    base_nuevo = re.sub(r'\s*\([^)]*\)$', '', nuevo)
    if not antes or norm(antes) == norm(base_nuevo) or norm(antes) == norm(nuevo):
        cuenta['a) mismo texto, otro formato / sin nombre / tipo al final'] += 1; plan.append((o, nuevo, 'formato')); continue
    letra = re.findall(r'\b(\d+)\s*(?:(bis)|([a-z]))\b(?!\s*-?\s*\d)', norm(antes))
    escs = {(e['numero'], (e['escalera'] or '').lower()) for e in elegidos}
    if any(not any(n == num and (esc == (l or 'b') or (b2 and esc in ('b', 'bis'))) for num, esc in escs) for n, b2, l in letra if l != 'y'):
        cuenta['no se toca: número con letra o bis que Catastro no tiene'] += 1; continue
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
    if faltan and re.search(r'garaje|local|trastero', norm(antes)):  # el garaje comun de varios portales: no se enlazan las viviendas
        cuenta['no se toca: garaje o local de varios portales'] += 1; continue
    if faltan and re.search(r'\b(fase|bloque|bl|portal|esc|escalera|urb)\b', norm(antes)):  # no sé leer qué portales son: a Mónica
        cuenta['b) a revisar por Mónica (fase/bloque/portal en el nombre)'] += 1
        revisar.append(dict(codigo=o['codigo'], estado=o['estado'], antes=antes, catastro=nuevo, parcelas=', '.join(sorted(parcelas)),
                            motivo='el nombre dice fase/bloque/portal: no sé leer qué portales le faltan'))
        continue
    sub = 'faltan portales de la misma parcela' if faltan else 'otro'
    if faltan:
        nuevos = [t for t in todos if (m := re.match(r'\d+', t['numero'] or '')) and int(m.group()) in faltan and (t['viviendas'] or 0) > 0]
        ENLAZAR.append((o, nuevos))
        nuevo = propuesto(a + [dict(ficha_catastro_portal_id=t['id'], municipio=a[0]['municipio']) for t in nuevos], antes)[0]
    if sub == 'otro':
        pa, pn = norm(antes).split(), norm(base_nuevo).split()
        if any(len(w) >= 3 and not any(w == v or (len(v) >= 3 and (w.startswith(v) or v.startswith(w))) for v in pa) for w in pn if not w.isdigit()) and            any(len(v) >= 4 and v not in pn for v in pa if not v.isdigit()): sub = 'palabras distintas (abreviatura o errata)'
        elif re.search(r'\bbis\b', norm(antes)) and not re.search(r'\bbis\b', norm(nuevo)): sub = 'se pierde el bis'
        else: sub = 'escalera / artículo / tipo / municipio'
    cuenta['b) ' + sub] += 1; plan.append((o, nuevo, 'texto', sub))
for k, v in sorted(cuenta.items()): print('%5d  %s' % (v, k))
import random; random.seed(5)
for sub in sorted({p[3] for p in plan if p[2] == 'texto'}):
    xs = [p for p in plan if p[2] == 'texto' and p[3] == sub]
    print(' ', sub, len(xs))
    for p in (xs if sub.startswith('faltan') else random.sample(xs, min(8, len(xs)))): print('     %s | %s  →  %s' % (p[0]['codigo'], p[0]['nombre'], p[1]))
print('   tipo al final:', ' | '.join('%s → %s' % (o['nombre'], n) for o, n, *_ in [p for p in plan if p[2] == 'formato' and '(' in p[1]][:4]))
os.makedirs(os.path.join(RAIZ, 'docs', 'opps'), exist_ok=True)
json.dump(revisar, open(os.path.join(RAIZ, 'docs', 'opps', 'revisar_portales_parcelas.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
if not ESCRIBIR:
    print('EN SECO'); sys.exit()
SOLO = '--solo-formato' in sys.argv  # 20-oct: primero solo las de mismo texto (a); el resto espera a Mónica
if not SOLO:
    # los portales que le faltaban (misma parcela, los números que dice su nombre): como la app (lib/altaOportunidad.ts,
    # enlazarAccesosIds): el acceso es la dirección y se reutiliza si ya existe; su titular, la comunidad de la opp si no tenía
    comunidad = {o['id']: o.get('comunidad_id') for o in b.leer('oportunidades?select=id,comunidad_id&estado=neq.anulada&order=id')}
    refs = {f['id']: f for f in b.leer('ficha_catastro?select=id,referencia,municipio&order=id')}
    for o, nuevos in ENLAZAR:
        for t in nuevos:
            fc = refs[t['ficha_id']]
            clave = dict(municipio=fc['municipio'] or '', tipo_via=t['tipo_via'] or '', nombre_via=t['nombre_via'] or '', numero=t['numero'], escalera=t['escalera'] or '')
            ya = b.leer('accesos?select=id,figura_legal_propietaria_id&' + '&'.join('%s=eq.%s' % (k, urllib.parse.quote(v)) for k, v in clave.items()), False)
            if ya: aid = ya[0]['id']
            else:
                aid = str(uuid.uuid4())
                b.insertar('accesos', [dict(clave, id=aid, ref_catastral=fc['referencia'], ficha_catastro_portal_id=t['id'], figura_legal_propietaria_id=comunidad.get(o['id']))])
            if ya and not ya[0]['figura_legal_propietaria_id'] and comunidad.get(o['id']):
                b.actualizar('accesos?id=eq.%s&figura_legal_propietaria_id=is.null' % aid, {'figura_legal_propietaria_id': comunidad[o['id']]})
            r = b.leer('relacion_oportunidad_accesos?select=hasta&opp_id=eq.%s&acceso_id=eq.%s' % (o['id'], aid), False)
            if not r:
                b.insertar('relacion_oportunidad_accesos', [dict(opp_id=o['id'], acceso_id=aid,
                           de_donde='Portal de la misma parcela que decía el nombre de la opp y no estaba enlazado (Mónica, 20-oct-2026)')])
            elif r[0]['hasta']:
                b.actualizar('relacion_oportunidad_accesos?opp_id=eq.%s&acceso_id=eq.%s' % (o['id'], aid), {'hasta': None})
        print('enlazados', len(nuevos), 'portales a', o['codigo'])
for o, n, *resto in [p for p in plan if not SOLO or p[2] == 'formato']:
    if resto and resto[-1] == 'se pierde el bis': continue
    b.actualizar('oportunidades?id=eq.' + o['id'], {'nombre': n})
print('ESCRITO')
