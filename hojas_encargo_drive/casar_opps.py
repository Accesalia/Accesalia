# Volcado (7-oct-2026): cada hoja del manifiesto -> su opp, por la DIRECCION (Monica: "la hoja
# cuelga de la opp, no de la comunidad"). Se casa con los accesos de las opps: mismo numero y
# mismas palabras de la calle (una contenida en la otra), como en todo el cruce. Si la direccion
# casa con varias opps, se queda la ultima abierta ANTES de la fecha de la hoja; si no hay, la
# primera abierta despues. Solo lee.
import sys, json, re, collections, unicodedata, openpyxl
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base
exec(open('cruce.py', encoding='utf-8').read().split('def fecha')[0])   # norm, RUIDO, clave

def palabras(t):
    return frozenset(ABREV.get(w, w) for w in re.findall(r'[A-Z]+', norm((t or '').replace("'", ''))) if w not in RUIDO)
# Una DIRECCION no lleva fechas: "31-33-35" son portales, no un 31/03/35. El clave() del
# cruce quita fechas (sirve para nombres de fichero); aqui solo para ficheros.
ABREV = {'NTRA': 'NUESTRA', 'NTRO': 'NUESTRO', 'SRA': 'SENORA', 'STA': 'SANTA', 'STO': 'SANTO'}
_clave = clave
def clave(t, es_fichero=False):
    t = (t or '').replace("'", '')
    if es_fichero: return _clave(t)
    m = re.search(r'^(.*?)(\d+)', norm(t))
    if not m: return None
    calle = [ABREV.get(w, w) for w in re.findall(r'[A-Z]+', m.group(1)) if w not in RUIDO]
    return (frozenset(calle), m.group(2)) if calle else None

opps = {o['id']: o for o in base.leer('oportunidades?select=id,codigo,nombre,comunidad_provisional,fecha_apertura,estado,comunidad_id')}
acc = {a['id']: a for a in base.leer('accesos?select=id,municipio,nombre_via,numero')}
por_num = collections.defaultdict(list)          # numero -> [(palabras calle, municipio, opp_id)]
for r in base.leer('relacion_oportunidad_accesos?select=opp_id,acceso_id'):
    a = acc.get(r['acceso_id'])
    if not a or not a['numero']: continue
    m = re.match(r'\d+', a['numero'].strip())
    if m: por_num[m.group()].append((palabras(a['nombre_via']), norm(a['municipio'] or ''), r['opp_id']))

# Segunda via: opps sin accesos, por la direccion de su NOMBRE (mismo criterio)
for o in opps.values():
    k = clave(o['nombre'] or '')
    if k: por_num[k[1]].append((k[0], norm(o['nombre']), o['id']))

# Tercera via (7-oct): 1.435 opps dadas de alta sin nombre ni accesos; la direccion solo
# esta en comunidad_provisional, TODO JUNTO: "puertodesomiedo14 (MADRID)". Se compara la
# calle sin espacios (una contenida en la otra), el numero y el municipio del parentesis.
pegadas = collections.defaultdict(list)          # numero -> [(letras, municipio, opp_id)]
for o in opps.values():
    p = o.get('comunidad_provisional')
    if o['nombre'] or not p: continue
    mm = re.match(r'^(.*?)\s*\(([^)]*)\)\s*$', p)
    texto, mun = (mm.group(1), mm.group(2)) if mm else (p, '')
    m = re.match(r'^([^\d]+?)\s*(\d+)', norm(texto.replace("'", '')))
    if m and len(re.sub('[^A-Z]', '', m.group(1))) >= 4:
        pegadas[m.group(2)].append((re.sub('[^A-Z]', '', m.group(1)), norm(mun), o['id']))

def pegada(direccion, es_fichero):
    t = norm((direccion or '').replace("'", ''))
    if es_fichero: t = re.sub(r'\d{1,2}[-./ ]\d{1,2}[-./ ](20)?\d{2}', '', t)
    m = re.match(r'^([^\d]+?)\s*(\d+)', t)
    if not m: return set()
    pal = [w for w in re.findall(r'[A-Z]+', m.group(1)) if w not in ('C', 'CL', 'CALLE', 'AV', 'AVDA', 'AVENIDA', 'PASEO', 'PS', 'PZA', 'PLAZA', 'HOJA', 'ENCARGO', 'HE')]
    # con y sin articulos: "huertavillaverde9" frente a HUERTA DE VILLAVERDE
    letras = ''.join(ABREV.get(w, w) for w in pal)
    sin_art = ''.join(ABREV.get(w, w) for w in pal if w not in ('DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y'))
    if len(sin_art) < 4: return set()
    out = set()
    for l, mun, oid in pegadas.get(m.group(2), []):
        if any(l in x or x in l for x in (letras, sin_art)) and (not mun or mun.split()[0] in t):
            out.add(oid)
    return out

# Filtros (7-oct, al revisar los casos con varias opps): el MUNICIPIO, si la hoja lo dice,
# tiene que coincidir (Paular 1 Madrid no es Paular 1 Fuenlabrada); y el PORTAL, si lo dicen
# las dos, tambien (Mostoles 3 portal 7 no es el portal 4).
MUNIS = sorted({norm(a['municipio']) for a in acc.values() if a.get('municipio')} |
               {norm(mm.group(1)) for o in opps.values()
                for mm in [re.search(r'\(([^)]*)\)\s*$', o.get('comunidad_provisional') or '')] if mm},
               key=len, reverse=True)
MUNIS = [m for m in MUNIS if len(m) >= 4] + ['MORALEJA DE ENMEDIO', 'AZUQUECA DE HENARES', 'TORRELAGUNA', 'PAREJA']
ALIAS = {'ALCALA': 'ALCALA DE HENARES', 'SSR': 'SAN SEBASTIAN DE LOS REYES', 'SS REYES': 'SAN SEBASTIAN DE LOS REYES',
         'VILLAVICIOSA': 'VILLAVICIOSA DE ODON', 'TORREJON': 'TORREJON DE ARDOZ', 'SAN LORENZO': 'SAN LORENZO DE EL ESCORIAL'}
def munis_de(t, tras_numero=True):
    t = norm(t or '')
    if tras_numero:
        m = re.search(r'\d', t); t = t[m.start():] if m else ''
    t = ' ' + re.sub(r'[^A-Z ]', ' ', t) + ' '
    out = {m for m in MUNIS if ' ' + m + ' ' in t}
    for a, m in ALIAS.items():
        if ' ' + a + ' ' in t: out.add(m)
    return out
def muni_opp(oid):
    o = opps[oid]
    if o['nombre']: return munis_de(o['nombre'])
    mm = re.search(r'\(([^)]*)\)\s*$', o.get('comunidad_provisional') or '')
    return {norm(mm.group(1))} if mm else set()
def portal(t):
    m = re.search(r'PORTAL\s*(\d+)', norm(t or '')) or re.search(r'PORTAL(\d+)', norm(t or '').replace(' ', ''))
    return m.group(1) if m else None
def portal_opp(oid):
    o = opps[oid]; return portal(o['nombre'] or o.get('comunidad_provisional'))

def candidatas(direccion, es_fichero=False):
    ids = _candidatas(direccion, es_fichero) | pegada(direccion, es_fichero)
    hm = munis_de(direccion)
    if hm:
        ids = {i for i in ids if not muni_opp(i) or muni_opp(i) & hm}
    hp = portal(direccion)
    if hp:
        ids = {i for i in ids if portal_opp(i) in (None, hp)}
        if any(portal_opp(i) == hp for i in ids): ids = {i for i in ids if portal_opp(i) == hp}
    return ids

def _candidatas(direccion, es_fichero=False):
    k = clave(direccion or '', es_fichero)
    if not k: return set()
    resto = norm(direccion)
    out = set()
    for pal, mun, oid in por_num.get(k[1], []):
        if pal and (pal <= k[0] or k[0] <= pal):
            out.add((oid, bool(mun) and mun.split()[0] in resto))
    # si alguna casa tambien por municipio, solo esas
    con_mun = {o for o, m in out if m}
    return con_mun or {o for o, _ in out}

def elegir(ids, fecha):
    antes = sorted((opps[i]['fecha_apertura'], i) for i in ids if opps[i]['fecha_apertura'] <= fecha)
    if antes: return antes[-1][1]
    return sorted((opps[i]['fecha_apertura'], i) for i in ids)[0][1]

A_MANO = {k: v for k, v in json.load(open('casar_a_mano.json', encoding='utf-8')).items() if not k.startswith('_')}
por_codigo = {o['codigo']: i for i, o in opps.items()}
salida, cuenta = [], collections.Counter()
for A in ('2025', '2026'):
    ws = openpyxl.load_workbook(f'../docs/manifiesto_hojas_{A}.xlsx', read_only=True).worksheets[0]
    cab = None
    for r in ws.iter_rows(values_only=True):
        if cab is None: cab = r; continue
        h = dict(zip(cab, r))
        fichero = (h['Ficheros ENVIADOS'] or h['Ficheros FIRMADOS'] or '').split(chr(10))[0].split('/')[-1]
        # Plantilla sin cambiar: DENTRO lleva la direccion de otra comunidad; manda el titulo
        por_titulo = not h['Dirección'] or 'el título dice' in (h['Notas'] or '')
        dire = fichero if por_titulo else h['Dirección']
        ids = candidatas(dire, por_titulo)
        if h['Código provisional'] in A_MANO: ids = {por_codigo[A_MANO[h['Código provisional']]]}
        f = str(h['Fecha (v1)'] or '')[:10]
        oid = elegir(ids, f) if ids else None
        tipo = 'ninguna' if not ids else 'una' if len(ids) == 1 else 'varias'
        cuenta[(A, tipo)] += 1
        salida.append({'codigo': h['Código provisional'], 'anio': A, 'fecha': f, 'direccion': dire,
                       'estado': h['Estado'], 'opp_id': oid, 'opp': opps[oid]['codigo'] if oid else None,
                       'opp_nombre': opps[oid]['nombre'] if oid else None, 'casa': tipo,
                       'otras': [opps[i]['codigo'] for i in ids if i != oid]})
json.dump(salida, open('hojas_a_opps.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for k in sorted(cuenta): print(k, cuenta[k])
