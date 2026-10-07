# -*- coding: utf-8 -*-
"""Enlazar a Catastro las oportunidades de 2025-2026 que salieron de la clon (Monica, 7-oct-2026).

Hace lo mismo que la ventana "Buscar en Catastro" de la app (frontend/lib/buscarDireccion.ts y altaOportunidad.ts):
  1. la calle, en el callejero guardado (vias_catastro) del municipio de la carpeta: la carpeta sin espacios contra el
     nombre de busqueda sin espacios ("sanclaudio82" = SAN CLAUDIO 82);
  2. Catastro por calle y numero (Consulta_DNPLOC);
  3. CLARA = una sola calle, un solo numero y una sola parcela: se baja la ficha (ficha_catastro, _portal, _inmueble,
     igual que guardarFicha), se crean o reutilizan los ACCESOS del numero (todas sus escaleras) y se enlazan a la
     oportunidad; la referencia catastral de la oportunidad = la parcela;
  4. lo demas (varias calles, varias parcelas, rangos de numeros, nada) -> lista de DUDOSAS para Monica.

Para no saturar Catastro: bloques de 20 oportunidades, 2 s entre consultas y 30 s entre bloques.
  python scripts/barrido/catastro_opps_2025_2026.py consultar     -> solo LEE (callejero y Catastro) y deja el resultado en catastro_2025_2026.json
  python scripts/barrido/catastro_opps_2025_2026.py escribir      -> con ese resultado, baja las fichas de las CLARAS y enlaza
"""
import sys, os, re, json, time, unicodedata, urllib.request, urllib.parse, datetime
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..'))
from produccion import arrancar

b = arrancar()
OVC = 'https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/json'
COORD = 'https://ovc.catastro.meh.es/ovcservweb/ovcswlocalizacionrc/ovccoordenadas.asmx/Consulta_CPMRC'
SALIDA = os.path.join(AQUI, 'catastro_2025_2026.json')
PAUSA, BLOQUE, PAUSA_BLOQUE = 2, 20, 30
MARCA = 'Creada desde la clon: '
TIPOS = r'^(avenida|avda|av|paseo|pso|plaza|pza|pz|calle|cl|travesia|trav|ronda|camino|glorieta|carretera|ctra|urbanizacion|urb)'


def plano(s):
    s = unicodedata.normalize('NFD', str(s).upper()); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^A-Z0-9]', '', s)


ARTS = ('DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL')
TIPO_DE_PREFIJO = [('avenida', 'AV'), ('avda', 'AV'), ('av', 'AV'), ('paseo', 'PS'), ('plaza', 'PZ'), ('pza', 'PZ'), ('travesia', 'TR'),
                   ('ronda', 'RD'), ('camino', 'CM'), ('glorieta', 'GL'), ('carretera', 'CR'), ('calle', 'CL')]
_VIAS = {}


def compacto(s):
    s = unicodedata.normalize('NFD', str(s).upper()); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^A-Z0-9]', '', s)


def formas_via(busqueda):
    """el nombre del callejero, pegado: tal cual y sin sus articulos (palabras enteras)."""
    palabras = re.findall(r'[A-Z0-9]+', compacto_espacios(busqueda))
    return {''.join(palabras), ''.join(w for w in palabras if w not in ARTS)}


def compacto_espacios(s):
    s = unicodedata.normalize('NFD', str(s).upper()); s = ''.join(c for c in s if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^A-Z0-9 ]', ' ', s)


def variantes(c):
    """la carpeta pegada, quitando los articulos del PRINCIPIO de todas las maneras posibles (DELASCRUCES -> LASCRUCES, CRUCES)."""
    salida, pend = set(), [c]
    while pend:
        x = pend.pop(); salida.add(x)
        for a in ARTS:
            if x.startswith(a) and len(x) > len(a) + 2 and x[len(a):] not in salida: pend.append(x[len(a):])
    return salida


def vias_de(muni_id):
    if muni_id not in _VIAS: _VIAS[muni_id] = b.leer('vias_catastro?select=tipo_via,busqueda&municipio_id=eq.' + muni_id)
    return _VIAS[muni_id]


def candidatas(muni_id, letras):
    """la calle de la carpeta en el callejero. Si la carpeta empieza por un tipo de via, ese tipo manda (como el candado de la app).
       Sin coincidencia exacta, solo un parecido MUY alto y sin empate (erratas: ferencpuska -> FERENC PUSKAS)."""
    import difflib
    todas = vias_de(muni_id)
    tipo, resto = None, letras.lower()
    for pre, t in TIPO_DE_PREFIJO:
        if resto.startswith(pre) and len(resto) > len(pre) + 2:
            tipo, resto = t, resto[len(pre):]; break
    vs = variantes(compacto(letras)) | variantes(compacto(resto))
    c = [v for v in todas if formas_via(v['busqueda']) & vs]
    if not c:
        puntos = sorted(((max(difflib.SequenceMatcher(None, f, x).ratio() for f in formas_via(v['busqueda']) for x in vs), v) for v in todas),
                        key=lambda p: -p[0])
        if puntos and puntos[0][0] >= 0.93 and (len(puntos) == 1 or puntos[1][0] < puntos[0][0] - 0.05):
            c = [puntos[0][1]]
    if tipo and [v for v in c if v['tipo_via'] == tipo]: c = [v for v in c if v['tipo_via'] == tipo]
    return list({(v['tipo_via'], v['busqueda']): v for v in c}.values())


def pedir(url):
    for i in range(3):
        try:
            time.sleep(PAUSA)
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'Accesalia CRM'}), timeout=40) as r:
                return r.read().decode('utf-8')
        except Exception as e:
            ultimo = e; time.sleep(5 * (i + 1))
    raise RuntimeError('Catastro no contesta: %s' % ultimo)


def upsert(tabla, filas, conflicto):
    """crear o actualizar, como `meter` de la app (on_conflict + merge-duplicates)."""
    cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'resolution=merge-duplicates,return=representation'
    req = urllib.request.Request(b.url + '/rest/v1/' + tabla + '?on_conflict=' + conflicto, data=json.dumps(filas, ensure_ascii=False).encode('utf-8'),
                                 headers=cab, method='POST')
    try:
        with urllib.request.urlopen(req) as r: return json.loads(r.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        raise RuntimeError('upsert %s: %s %s' % (tabla, e.code, e.read().decode('utf-8', 'replace')))


lista = lambda x: [] if not x else (x if isinstance(x, list) else [x])


def sitio(f):
    lo = ((f.get('dt') or {}).get('locs') or {}).get('lous', {}).get('lourb', {}) or {}
    d = lo.get('dir') or {}; li = lo.get('loint') or {}
    pnp = str(d.get('pnp') or ''); plp = str(d.get('plp') or '').strip()
    return {'tipo_via': d.get('tv') or '', 'nombre_via': d.get('nv') or '', 'numero': '%s(%s)' % (pnp, plp) if plp else pnp,
            'numero2': '' if str(d.get('snp') or '') == '0' else str(d.get('snp') or ''), 'codigo_via': d.get('cv') or '',
            'escalera': (li.get('es') or '').strip(), 'planta': (li.get('pt') or '').strip(), 'puerta': (li.get('pu') or '').strip(),
            'cp': lo.get('dp') or '', 'distrito': lo.get('dm') or ''}


parcela_de = lambda f: (f.get('rc') or {}).get('pc1', '') + (f.get('rc') or {}).get('pc2', '')
ref_de = lambda f: ''.join((f.get('rc') or {}).get(k, '') for k in ('pc1', 'pc2', 'car', 'cc1', 'cc2'))


def entero(x):
    n = num(x)
    return None if n is None else int(round(n))


def num(x):
    try: return float(str(x).replace('.', '').replace(',', '.'))
    except Exception: return None


def opps_a_mirar():
    ops = b.leer('oportunidades?select=id,codigo,comunidad_provisional,fecha_apertura,notas&fecha_apertura=gte.2025-01-01&notas=like.*'
                 + urllib.parse.quote(MARCA) + '*')
    con = {r['opp_id'] for r in b.leer('relacion_oportunidad_accesos?select=opp_id&opp_id=in.(%s)' % ','.join(o['id'] for o in ops))} if ops else set()
    return [o for o in ops if o['id'] not in con]


def consultar():
    ops = opps_a_mirar(); res = {}
    if os.path.exists(SALIDA): res = json.load(open(SALIDA, encoding='utf-8'))
    pend = [o for o in ops if o['id'] not in res]
    print('a mirar: %d (ya consultadas: %d, pendientes: %d)' % (len(ops), len(ops) - len(pend), len(pend)))
    munis = {m['nombre']: m for m in b.leer('municipios_catastro?select=id,nombre,provincia')}
    for k, o in enumerate(pend):
        if k and k % BLOQUE == 0:
            json.dump(res, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
            print('  ... bloque hecho (%d/%d), pausa %d s' % (k, len(pend), PAUSA_BLOQUE)); time.sleep(PAUSA_BLOQUE)
        m = re.match(r'^(.*?) \(([^()]*)\)$', o['comunidad_provisional'] or '')
        carpeta, muni = (m.group(1), m.group(2)) if m else (o['comunidad_provisional'], '')
        carpeta = re.sub(r'\s*\(.*?\)\s*', '', carpeta).strip()
        mm = re.match(r'^([^\d]+?)\s*(\d+)(.*)$', carpeta)
        r = {'codigo': o['codigo'], 'carpeta': carpeta, 'municipio': muni}
        if not mm: r['estado'] = 'dudosa: la carpeta no trae numero'; res[o['id']] = r; continue
        letras, numero, resto = mm.group(1), mm.group(2), mm.group(3)
        r['numeros'] = [numero] + re.findall(r'\d+', resto.split(chr(92))[0])   # lo de despues de una subcarpeta no son numeros
        rg = re.match(r'^\s*-\s*(\d+)\s*$', resto.split(chr(92))[0])
        if rg and int(rg.group(1)) - int(numero) > 2: r['numeros'] = [str(n) for n in range(int(numero), int(rg.group(1)) + 1, 2)]   # 9-19 = 9, 11 ... 19
        M = munis.get(muni)
        if not M: r['estado'] = 'dudosa: municipio "%s" no esta en el callejero' % muni; res[o['id']] = r; continue
        cand = candidatas(M['id'], letras)
        if len(cand) != 1:
            r['estado'] = 'dudosa: %s calles en el callejero para "%s"' % (len(cand), letras)
            r['calles'] = ['%s %s' % (v['tipo_via'], v['busqueda']) for v in cand]; res[o['id']] = r; continue
        v = cand[0]; r['calle'] = '%s %s' % (v['tipo_via'], v['busqueda']); r['numero'] = numero
        q = urllib.parse.urlencode({'Provincia': M['provincia'], 'Municipio': M['nombre'], 'Sigla': v['tipo_via'], 'Calle': v['busqueda'],
                                    'Numero': numero, 'Bloque': '', 'Escalera': '', 'Planta': '', 'Puerta': ''})
        try:
            d = json.loads(pedir(OVC + '/Consulta_DNPLOC?' + q)).get('consulta_dnplocResult') or {}
        except Exception as e:
            r['estado'] = 'pendiente: %s' % e; res[o['id']] = r; continue
        fincas = lista((d.get('lrcdnp') or {}).get('rcdnp')) or lista((d.get('bico') or {}).get('bi'))
        parcelas = sorted({parcela_de(f) for f in fincas if parcela_de(f)})
        if len(parcelas) == 1:
            r['estado'] = 'clara'; r['parcela'] = parcelas[0]
        else:
            r['estado'] = 'dudosa: %s' % ('%d parcelas en ese numero' % len(parcelas) if parcelas else 'Catastro no encuentra ese numero')
            r['parcelas'] = parcelas
        res[o['id']] = r
    json.dump(res, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    claras = [x for x in res.values() if x['estado'] == 'clara']
    print('CLARAS: %d | DUDOSAS: %d' % (len(claras), len(res) - len(claras)))


def guardar_ficha(parcela):
    d = json.loads(pedir(OVC + '/Consulta_DNPRC?RefCat=%s&Provincia=&Municipio=' % parcela))
    res = d.get('consulta_dnprcResult') or {}
    fincas = lista((res.get('lrcdnp') or {}).get('rcdnp')) or lista((res.get('bico') or {}).get('bi'))
    finca = (res.get('bico') or {}).get('finca') or {}
    if not fincas: raise RuntimeError('la parcela no devuelve fincas')
    p0 = fincas[0]; s = sitio(p0)
    usos, plantas, sup, viv = {}, set(), 0, 0
    for f in fincas:
        u = (f.get('debi') or {}).get('luso') or '?'; usos[u] = usos.get(u, 0) + 1
        viv += u == 'Residencial'; sup += num((f.get('debi') or {}).get('sfc')) or 0
        if sitio(f)['planta']: plantas.add(sitio(f)['planta'])
    lat = lng = None
    try:
        x = pedir(COORD + '?Provincia=&Municipio=&SRS=EPSG:4326&RC=' + parcela)
        g = lambda e: (lambda m: float(m.group(1).replace(',', '.')) if m else None)(re.search('<%s>([-\\d.,]+)</%s>' % (e, e), x))
        lat, lng = g('ycen'), g('xcen')
    except Exception: pass
    ahora = datetime.datetime.utcnow().isoformat()
    fila = {'referencia': parcela, 'direccion': finca.get('ldt'), 'tipo_parcela': finca.get('ltp'), 'municipio': (p0.get('dt') or {}).get('nm'),
            'provincia': (p0.get('dt') or {}).get('np'), 'cp': s['cp'] or None, 'anio': num((p0.get('debi') or {}).get('ant')),
            'inmuebles': len(fincas), 'viviendas': int(viv), 'superficie': round(sup) or None, 'superficie_suelo': entero((finca.get('dff') or {}).get('ss')),
            'plantas': sorted(plantas), 'usos': usos, 'tipo_via': s['tipo_via'] or None, 'nombre_via': s['nombre_via'] or None,
            'numero': s['numero'] or None, 'numero2': s['numero2'] or None, 'codigo_via': s['codigo_via'] or None,
            'distrito_municipal': s['distrito'] or None, 'ine_provincia': ((p0.get('dt') or {}).get('loine') or {}).get('cp'),
            'ine_municipio': ((p0.get('dt') or {}).get('loine') or {}).get('cm'), 'lat': lat, 'lng': lng, 'bruto': d,
            'consultado_en': ahora, 'actualizado_en': ahora}
    if fila['anio'] is not None: fila['anio'] = int(fila['anio'])
    ficha_id = upsert('ficha_catastro', [fila], 'referencia')[0]['id']
    porp = {}
    for f in fincas:
        t = sitio(f); k = (t['numero'], t['escalera'])
        p = porp.setdefault(k, {'numero': t['numero'], 'escalera': t['escalera'], 'inmuebles': 0, 'viviendas': 0, 'superficie': 0, 'plantas': set(),
                                'usos': {}, 'tipo_via': t['tipo_via'], 'nombre_via': t['nombre_via']})
        u = (f.get('debi') or {}).get('luso') or '?'
        p['inmuebles'] += 1; p['usos'][u] = p['usos'].get(u, 0) + 1; p['viviendas'] += u == 'Residencial'
        p['superficie'] += num((f.get('debi') or {}).get('sfc')) or 0
        if t['planta']: p['plantas'].add(t['planta'])
    portales = upsert('ficha_catastro_portal', [{'ficha_id': ficha_id, 'tipo_via': p['tipo_via'] or None, 'nombre_via': p['nombre_via'] or None,
                        'numero': p['numero'], 'escalera': p['escalera'], 'inmuebles': p['inmuebles'], 'viviendas': int(p['viviendas']),
                        'superficie': round(p['superficie']) or None, 'plantas': sorted(p['plantas']), 'usos': p['usos']} for p in porp.values()],
                        'ficha_id,numero,escalera')
    idp = {(p['numero'], p['escalera'] or ''): p['id'] for p in portales}
    inm = []
    for f in fincas:
        t = sitio(f); ref = ref_de(f)
        if ref: inm.append({'ficha_id': ficha_id, 'portal_id': idp.get((t['numero'], t['escalera'])), 'referencia': ref, 'numero': t['numero'] or None,
                            'escalera': t['escalera'] or None, 'planta': t['planta'] or None, 'puerta': t['puerta'] or None,
                            'uso': (f.get('debi') or {}).get('luso'), 'superficie': entero((f.get('debi') or {}).get('sfc')),
                            'coeficiente': num((f.get('debi') or {}).get('cpt'))})
    for k in range(0, len(inm), 200): upsert('ficha_catastro_inmueble', inm[k:k + 200], 'referencia')
    return fila['municipio'] or '', portales


def escribir():
    res = json.load(open(SALIDA, encoding='utf-8'))
    hechas = 0
    claras = [(i, r) for i, r in res.items() if r['estado'] == 'clara' and not r.get('enlazada')]
    print('claras por enlazar: %d' % len(claras))
    for k, (oid, r) in enumerate(claras):
        if k and k % BLOQUE == 0:
            json.dump(res, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
            print('  ... bloque hecho (%d/%d), pausa %d s' % (k, len(claras), PAUSA_BLOQUE)); time.sleep(PAUSA_BLOQUE)
        muni, portales = guardar_ficha(r['parcela'])
        del_numero = [p for p in portales if p['numero'] in (r.get('numeros') or [r['numero']])]
        if not del_numero:
            r['estado'] = 'dudosa: la parcela no tiene portales con el numero %s' % r['numero']; continue
        for p in del_numero:
            acc = upsert('accesos', [{'municipio': muni, 'tipo_via': p['tipo_via'] or '', 'nombre_via': p['nombre_via'] or '', 'numero': p['numero'],
                                        'escalera': p['escalera'] or '', 'ref_catastral': r['parcela'], 'ficha_catastro_portal_id': p['id']}],
                           'municipio,tipo_via,nombre_via,numero,escalera')[0]
            b.insertar('relacion_oportunidad_accesos', [{'opp_id': oid, 'acceso_id': acc['id'],
                        'de_donde': 'Enlazada a Catastro desde la carpeta "%s" (calle y numero claros; Monica, 7-oct-2026).' % r['carpeta']}])
        b.actualizar('oportunidades?id=eq.' + oid, {'referencia_catastral': r['parcela']})
        r['enlazada'] = True; r['portales'] = len(del_numero); hechas += 1
    json.dump(res, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('enlazadas: %d' % hechas)


{'consultar': consultar, 'escribir': escribir}[sys.argv[1]]()
