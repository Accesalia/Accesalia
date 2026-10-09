# -*- coding: utf-8 -*-
"""Enlazar a Catastro las oportunidades ABIERTAS de la clon que aun no tienen portales (Monica, 8-oct-2026).

Copia de catastro_opps_2025_2026.py (7-oct) sin el filtro de fechas: "solo las abiertas; las cerradas tendran
su comunidad con el nombre de la direccion y la ficha se bajara el dia que se busque". Novedad: si la opp trae
REFERENCIA CATASTRAL (de la ficha de Dropbox), se va directo a esa parcela, sin buscar la calle; luego escribir()
comprueba igual que la parcela tiene portales con el numero de la carpeta.

ORIGINAL (7-oct):

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
SALIDA = os.path.join(AQUI, 'catastro_abiertas.json')
PAUSA, BLOQUE, PAUSA_BLOQUE = 2, 20, 30
MARCA = 'Creada desde la clon: '
# El nombre de la carpeta frente al de Catastro.
ALIAS_MUNICIPIO = {'LAS ROZAS': 'LAS ROZAS DE MADRID'}

# RESUELTAS CON MONICA (8-oct-2026). La carpeta va pegada y el callejero de Catastro abrevia ("FCO", "NTRA SRA D",
# "CGDOR"), asi que no casan solas. codigo -> [(municipio, sigla, calle del callejero, numeros)]. Varias filas = una
# opp con varias direcciones (la mancomunidad de tres calles).
# PARCELA DADA POR MONICA (8-oct-2026) cuando en el numero hay varias: "una parcela es de viviendas y otra de zonas
# comunes, como garajes y piscinas". codigo -> [(parcela, numeros)].
PARCELAS = {
    'DAN-2023-262': [('9035411VK6893N', ['41'])],
    'DAN-2024-096': [('3207701VK3630N', ['41'])],
    'DAN-2023-202': [('6549101VK3664N', ['23'])],
    'DAN-2023-209': [('7437903VK2673N', ['70']), ('7437901VK2673N', ['72'])],
    'DAN-2022-124': [('4749701VK3544N', ['8'])],
    # Azuqueca es de GUADALAJARA: no esta en el callejero guardado (solo Madrid). Mirada a mano en Catastro (9-oct).
    'DAN-2025-440': [('7907308VK7970N', ['17'])],
    # "todos los bis son B: Catastro renumero digitalmente las calles" (Monica, 9-oct-2026). El portal 9(B) del
    # conjunto de Comandante Fortea 9 (C, D... J son otros portales de la misma parcela).
    'DAN-2023-075': [('8055133VK3785C', ['9(B)'])],
    # "esta mal ubicado: es Travesia de San Onofre 7, San Sebastian de los Reyes"
    'DAN-2023-159': [('6894901VK4869S', ['7'])],
    # "Vedra es una mancomunidad: todos los 22 se incluyen agrupados bajo la figura mancomunidad". '*' = todos los
    # portales de cada parcela.
    'DAN-2023-169': [('36999%02dVK4639H' % n, ['*']) for n in range(1, 25)],
    # Lista de Alvaro, resuelta por Monica (9-oct-2026)
    'DAN-2025-445': [('9763402VK2696S', ['4'])],     # "Malaga 8" es el 4 (la hoja ya lo decia dentro)
    'DAN-2026-222': [('7907803VK7970N', ['3'])],     # Castilla 3 Torre 5 = Plaza de Castilla 3, Azuqueca
    'DAN-2025-441': [('8816815VK3881F', ['2'])],     # Cadalso de los Vidrios 2: la parcela de las 10 viviendas
    # Av. Olimpica 18: un portal partido en dos parcelas (41 y 40 viviendas). "si, correcto": a las dos.
    'DAN-2023-184': [('5048806VK2654N', ['18']), ('5048807VK2654N', ['18'])],
    # "salen las dos solo con el 99"
    'DAN-2024-157': [('5957804VK4755F', ['97', '99'])],
    # "te doy la del 4: en Catastro no viene, pero es una parcela con los dos portales, el 3 y el 4"
    'DAN-2023-236': [('1166119VK4716E', ['2', '3', '4'])],
    # "esta ahi pero no en Catastro reflejado: es la misma parcela que el 27"
    'DAN-2023-245': [('4554801VK4745D', ['25', '27'])],
}

FORZADAS = {
    'DAN-2023-022': [('ALCOBENDAS', 'CL', 'CAPITAN FCO SANCHEZ', ['34'])],
    'DAN-2024-003': [('FUENLABRADA', 'AV', 'FCO JAVIER SAUQUILLO', ['10'])],
    'DAN-2024-004': [('FUENLABRADA', 'AV', 'FCO JAVIER SAUQUILLO', ['34'])],
    'DAN-2024-044': [('FUENLABRADA', 'UR', 'NUEVO VERSALLES', ['2'])],
    'DAN-2024-169': [('LEGANES', 'AV', 'DOCTOR FLEMING', ['30'])],
    'DAN-2023-309': [('LEGANES', 'AV', 'DOCTOR MARTIN VEGUE', ['31'])],
    'DAN-2024-147': [('LEGANES', 'CL', 'NTRA SRA D GUADALUPE', ['5'])],
    'DAN-2024-059': [('LEGANES', 'CL', 'NTRA SRA D GUADALUPE', ['7'])],
    'DAN-2023-127': [('LEGANES', 'CL', 'NTRA SRA MACARENA', ['2'])],
    'DAN-2023-230': [('MADRID', 'CL', 'CGDOR SEÑOR DE LA ELIPA', ['11'])],
    'DAN-2021-057': [('MADRID', 'CL', 'LA DEL MANOJO DE ROSAS', ['57'])],
    'DAN-2022-227': [('MADRID', 'CL', 'NTRA SRA DE LAS ANGUSTIAS', ['14'])],
    'DAN-2023-260': [('SAN SEBASTIAN DE LOS REYES', 'CL', 'CRISTO REMEDIOS', ['18', '20'])],
    'DAN-2023-099': [('SEVILLA LA NUEVA', 'CL', 'CARRIL CHARCAS', ['18'])],
    'DAN-2022-282': [('MADRID', 'CL', 'INMACULADA CONCEPCION', ['13'])],
    'DAN-2023-152': [('MADRID', 'CL', 'GALERIAS ROBLES', ['5'])],
    'DAN-2022-222': [('PARLA', 'CL', 'RIO JARAMA', ['1'])],
    'DAN-2023-184': [('MOSTOLES', 'AV', 'OLIMPICA', ['18'])],
    # "rioja 57 es Leganes, no Fuenlabrada: la carpeta esta mal"
    'DAN-2023-065': [('LEGANES', 'CL', 'RIOJA', ['57'])],
    # Millan Astray -> Maestra Justa Freire -> otra vez General Millan Astray. 21 a 37, los impares.
    'DAN-2022-261': [('MADRID', 'CL', 'GENERAL MILLAN ASTRAY', [str(n) for n in range(21, 38, 2)])],
    # "general varela es ahora Julian Besteiro"; "ferrovial es ferrocarril, es una errata"
    'DAN-2018-022': [('MADRID', 'CL', 'JULIAN BESTEIRO', ['3'])],
    'DAN-2023-138': [('MADRID', 'CL', 'FERROCARRIL', ['9'])],
    'DAN-2024-069': [('VALDEMORO', 'AV', 'ANDALUCIA', ['9', '11'])],
    # MOSTOLES (8-oct-2026): el callejero tiene dos calles con el mismo nombre (GUADALUPE / GUADALUPE DE) y la
    # regla de la calle se quedo con la que no tiene ese numero. Probadas todas: solo una calle lo tiene.
    'DAN-2023-240': [('MOSTOLES', 'CL', 'MERCEDES DE LAS', ['3'])],
    'DAN-2023-041': [('MOSTOLES', 'CL', 'EMPECINADO DEL', ['6'])],
    'DAN-2023-045': [('MOSTOLES', 'CL', 'GUADALUPE DE', ['3'])],
    'DAN-2023-132': [('MOSTOLES', 'CL', 'GUADALUPE DE', ['6'])],
    'DAN-2024-088': [('MOSTOLES', 'CL', 'CAMINO DE LEGANES', ['5'])],
    'DAN-2023-122': [('MOSTOLES', 'CL', 'CAMINO DE LEGANES', ['58'])],
    'DAN-2024-309': [('MOSTOLES', 'CL', 'PINTOR JULIO ROMERO', ['1'])],
    # "es un ascensor: por ley no puede tener mas de 5 alturas si no tiene ascensor, asi que tiene que ser el paseo
    # (en la plaza son mas alturas)"
    'DAN-2023-308': [('MOSTOLES', 'PS', 'ARROYOMOLINOS DE', ['9'])],
    # carpetas sin numero (Monica, 8-oct-2026)
    'DAN-2015-028': [('MADRID', 'CL', 'DOS DE MAYO', ['6'])],
    'DAN-2016-141': [('MADRID', 'CL', 'RAFAEL SALAZAR ALONSO', ['7'])],
    'DAN-2018-052': [('MADRID', 'CL', 'BARBARA DE BRAGANZA', ['12'])],
    'DAN-2022-259': [('MADRID', 'CL', 'ISLA DE AROSA', ['8']), ('MADRID', 'CL', 'ISLA DE AROSA', ['10'])],
    # "son 3 calles agrupadas en una mancomunidad"
    'DAN-2023-265': [('MADRID', 'CL', 'FORTUNATA Y JACINTA', ['31']), ('MADRID', 'CL', 'ORENSE', ['43']),
                     ('MADRID', 'CL', 'PEDRO TEIXEIRA', ['5'])],
}
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
    c = list({(v['tipo_via'], v['busqueda']): v for v in c}.values())
    # SIN TIPO EN LA CARPETA, ES CALLE (Monica, 8-oct-2026): "cuando no es calle, lo escribimos EXPRESAMENTE en la
    # carpeta". Si hay varias calles (CL EMPECINADO / CL EMPECINADO DEL), la que casa sin articulos sobrantes.
    if not tipo and len(c) > 1 and [v for v in c if v['tipo_via'] == 'CL']:
        c = [v for v in c if v['tipo_via'] == 'CL']
        if len(c) > 1:
            exactas = [v for v in c if ''.join(re.findall(r'[A-Z0-9]+', compacto_espacios(v['busqueda']))) in vs]
            if len(exactas) == 1: c = exactas
    return c


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


# Cuando el numero es UN SOLO inmueble, Catastro contesta con 'bico.bi' y la referencia va en bi.idbi.rc, no en
# bi.rc. Sin esto, esos edificios salian como "Catastro no encuentra ese numero" (Soledad 9 Parla, 8-oct-2026).
_rc = lambda f: f.get('rc') or (f.get('idbi') or {}).get('rc') or {}
parcela_de = lambda f: _rc(f).get('pc1', '') + _rc(f).get('pc2', '')
ref_de = lambda f: ''.join(_rc(f).get(k, '') for k in ('pc1', 'pc2', 'car', 'cc1', 'cc2'))


def entero(x):
    n = num(x)
    return None if n is None else int(round(n))


def num(x):
    try: return float(str(x).replace('.', '').replace(',', '.'))
    except Exception: return None


def opps_a_mirar():
    # 'sinmarca' (Monica, 9-oct-2026): las abiertas sin comunidad que NO salieron de la clon (las 23 recientes,
    # casi todas de Alvaro). Su comunidad_provisional ya va escrita normal: "Extremadura 13 (FUENLABRADA)".
    if SIN_MARCA:
        ops = [o for o in b.leer('oportunidades?select=id,codigo,comunidad_provisional,fecha_apertura,notas,referencia_catastral'
                                 '&estado=eq.abierta&comunidad_id=is.null') if MARCA not in (o.get('notas') or '')]
    else:
        ops = b.leer('oportunidades?select=id,codigo,comunidad_provisional,fecha_apertura,notas,referencia_catastral&estado=eq.abierta'
                     '&comunidad_id=is.null&notas=like.*' + urllib.parse.quote(MARCA) + '*')
    con = {r['opp_id'] for r in b.leer('relacion_oportunidad_accesos?select=opp_id')}
    return [o for o in ops if o['id'] not in con]


def consultar():
    ops = opps_a_mirar(); res = {}
    if os.path.exists(SALIDA): res = json.load(open(SALIDA, encoding='utf-8'))
    # 'reconsultar': vuelve a mirar las dudosas (tras una regla nueva), sin tocar las claras ni las enlazadas.
    pend = [o for o in ops if o['id'] not in res or (REPASO and res[o['id']]['estado'].startswith('dudosa'))]
    print('a mirar: %d (ya consultadas: %d, pendientes: %d)' % (len(ops), len(ops) - len(pend), len(pend)))
    munis = {m['nombre']: m for m in b.leer('municipios_catastro?select=id,nombre,provincia')}
    for k, o in enumerate(pend):
        if k and k % BLOQUE == 0:
            json.dump(res, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
            print('  ... bloque hecho (%d/%d), pausa %d s' % (k, len(pend), PAUSA_BLOQUE)); time.sleep(PAUSA_BLOQUE)
        if o['codigo'] in PARCELAS:
            ds = [{'parcela': p, 'numeros': n} for p, n in PARCELAS[o['codigo']]]
            res[o['id']] = {'codigo': o['codigo'], 'carpeta': o['comunidad_provisional'], 'estado': 'clara', 'forzada': True,
                            'destinos': ds, 'parcela': ds[0]['parcela'], 'numero': ds[0]['numeros'][0], 'numeros': ds[0]['numeros']}
            continue
        if REPASO and o['id'] in res and 'parcelas en ese numero' in res[o['id']]['estado'] and len(res[o['id']].get('parcelas', [])) <= 4:
            # LA DE LAS VIVIENDAS (Monica): la otra parcela del numero son las zonas comunes (garaje, piscina).
            r = res[o['id']]; con_viv = []
            for pc in r['parcelas']:
                d = json.loads(pedir(OVC + '/Consulta_DNPRC?RefCat=%s&Provincia=&Municipio=' % pc)).get('consulta_dnprcResult') or {}
                fs = lista((d.get('lrcdnp') or {}).get('rcdnp')) or lista((d.get('bico') or {}).get('bi'))
                if any(((f.get('debi') or {}).get('luso') == 'Residencial') for f in fs): con_viv.append(pc)
            if len(con_viv) == 1:
                r.update({'estado': 'clara', 'parcela': con_viv[0], 'por_viviendas': True})
            else:
                r['estado'] = 'dudosa: %d parcelas en ese numero, %d con viviendas' % (len(r['parcelas']), len(con_viv))
            continue
        if o['codigo'] in FORZADAS:
            r = {'codigo': o['codigo'], 'carpeta': o['comunidad_provisional'], 'municipio': FORZADAS[o['codigo']][0][0], 'destinos': []}
            for muni_f, sig, calle, nums in FORZADAS[o['codigo']]:
                Mf = munis[muni_f]
                q = urllib.parse.urlencode({'Provincia': Mf['provincia'], 'Municipio': Mf['nombre'], 'Sigla': sig, 'Calle': calle,
                                            'Numero': nums[0], 'Bloque': '', 'Escalera': '', 'Planta': '', 'Puerta': ''})
                try:
                    d = json.loads(pedir(OVC + '/Consulta_DNPLOC?' + q)).get('consulta_dnplocResult') or {}
                except Exception as e:
                    r['estado'] = 'pendiente: %s' % e; break
                fincas = lista((d.get('lrcdnp') or {}).get('rcdnp')) or lista((d.get('bico') or {}).get('bi'))
                parcelas = sorted({parcela_de(f) for f in fincas if parcela_de(f)})
                if len(parcelas) != 1:
                    r['estado'] = 'dudosa: %s %s %s -> %d parcelas' % (sig, calle, nums[0], len(parcelas)); break
                r['destinos'].append({'parcela': parcelas[0], 'numeros': nums, 'calle': '%s %s' % (sig, calle)})
            else:
                r['estado'] = 'clara'; r['parcela'] = r['destinos'][0]['parcela']; r['numero'] = r['destinos'][0]['numeros'][0]
                r['numeros'] = r['destinos'][0]['numeros']; r['forzada'] = True
            res[o['id']] = r; continue
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
        rc = (o.get('referencia_catastral') or '').strip().upper()
        if len(rc) >= 14:
            r['parcela'] = rc[:14]; r['numero'] = numero; r['por_referencia'] = True
            try:
                d = json.loads(pedir(OVC + '/Consulta_DNPRC?RefCat=%s&Provincia=&Municipio=' % r['parcela'])).get('consulta_dnprcResult') or {}
                fincas = lista((d.get('lrcdnp') or {}).get('rcdnp')) or lista((d.get('bico') or {}).get('bi'))
            except Exception as e:
                r['estado'] = 'pendiente: %s' % e; res[o['id']] = r; continue
            r['estado'] = 'clara' if fincas else 'dudosa: la referencia catastral de la ficha no existe en Catastro'
            res[o['id']] = r; continue
        M = munis.get(muni) or munis.get(ALIAS_MUNICIPIO.get(muni, ''))
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
        destinos = r.get('destinos') or [{'parcela': r['parcela'], 'numeros': r.get('numeros') or [r['numero']]}]
        del_numero = []
        fallo = None
        for dz in destinos:
            try:
                muni, portales = guardar_ficha(dz['parcela'])
            except Exception as e:
                fallo = '%s: %s' % (dz['parcela'], e); print('  ', r['codigo'], fallo); continue
            del_numero += [(muni, p, dz['parcela']) for p in portales if '*' in dz['numeros'] or p['numero'] in dz['numeros']]
        if not del_numero:
            r['estado'] = 'dudosa: la parcela no tiene portales con el numero %s' % r['numero']; continue
        for muni, p, parcela in del_numero:
            acc = upsert('accesos', [{'municipio': muni, 'tipo_via': p['tipo_via'] or '', 'nombre_via': p['nombre_via'] or '', 'numero': p['numero'],
                                        'escalera': p['escalera'] or '', 'ref_catastral': parcela, 'ficha_catastro_portal_id': p['id']}],
                           'municipio,tipo_via,nombre_via,numero,escalera')[0]
            b.insertar('relacion_oportunidad_accesos', [{'opp_id': oid, 'acceso_id': acc['id'],
                        'de_donde': ('Enlazada a Catastro con la calle resuelta con Monica, carpeta "%s" (8-oct-2026).' if r.get('forzada') else 'Enlazada a Catastro por la referencia catastral de la ficha, carpeta "%s" (Monica, 8-oct-2026).' if r.get('por_referencia') else 'Enlazada a Catastro desde la carpeta "%s" (calle y numero claros; Monica, 8-oct-2026).') % r['carpeta']}])
        if not r.get('por_referencia'): b.actualizar('oportunidades?id=eq.' + oid, {'referencia_catastral': r['parcela']})
        r['enlazada'] = True; r['portales'] = len(del_numero); hechas += 1
    json.dump(res, open(SALIDA, 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print('enlazadas: %d' % hechas)


REPASO = sys.argv[1] == 'reconsultar'
SIN_MARCA = 'sinmarca' in sys.argv[2:]
{'consultar': consultar, 'reconsultar': consultar, 'escribir': escribir}[sys.argv[1]]()
