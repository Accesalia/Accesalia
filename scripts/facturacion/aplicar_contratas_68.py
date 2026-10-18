# -*- coding: utf-8 -*-
"""APLICA LA REVISION A MANO DE LAS CONTRATAS 2022-2024 (hilo 68 con Monica, 17/18-oct-2026; OK: "si, porfa, aplica").

Las decisiones estan en docs/facturacion/contratas/decisiones_68.py (una por linea de factura, leidas una a una: el
texto de la factura contra las lineas e hitos de cada hoja) y el expediente en expediente_68.json. Mismo modelo que
casar_facturas_hitos.py: factura_linea_hitos (como = 'a_mano'), subhitos con su resto pendiente, estado del hito
(completado si la factura esta cobrada; hasta 2023 la factura garantiza el cobro) y una nota en notas_facturacion
cuando se toca un importe o se rehacen hitos ("manda la factura": se ajusta el hito y se anota lo que decia la hoja).
NUNCA cambia el modelo: nada de campos ni enlaces paralelos.

  python scripts/facturacion/aplicar_contratas_68.py [--escribir]
"""
import sys, os, re, json, collections, importlib.util, itertools, urllib.request
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

AQUI = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'docs', 'facturacion', 'contratas')
spec = importlib.util.spec_from_file_location('d', os.path.join(AQUI, 'decisiones_68.py'))
m = importlib.util.module_from_spec(spec); spec.loader.exec_module(m)
EXP = {e['n']: e for e in json.load(open(os.path.join(AQUI, 'expediente_68.json'), encoding='utf-8'))}
HOY = '2026-10-18'
AUTOR = 'Revisión a mano con Mónica (18-oct-2026)'
ESCRIBIR = '--escribir' in sys.argv
b = arrancar()


def fac_de(texto):
    e, a, s, n = re.match(r'(accesalia|daniel) factura (\d{4})/(\d+)-(\d+)', texto).groups()
    return e, int(a), s, int(n)


_fl = {}
def linea_factura(n):
    """La linea de factura de la decision n: por factura y por importe (y si hay dos iguales, por el texto)."""
    e = EXP[n]
    emp, anio, serie, num = fac_de(e['factura'])
    clave = (emp, anio, serie, num)
    if clave not in _fl:
        f = b.leer('facturas?select=id,anio,estado,lineas:factura_lineas(id,concepto,base,flh:factura_linea_hitos(hito_cobro_id))'
                   '&tipo=eq.factura&empresa_emisora=eq.%s&anio=eq.%s&serie=eq.%s&numero=eq.%s' % clave)
        assert len(f) == 1, (n, clave, len(f))
        _fl[clave] = f[0]
    f = _fl[clave]
    imp = float(e['importe_linea_factura'])
    ls = [l for l in f['lineas'] if abs(float(l['base']) - imp) < 0.02]
    if len(ls) > 1:
        t = re.sub(r'\W+', '', e['texto_factura'][:50].lower())
        ls = [l for l in ls if t[:25] in re.sub(r'\W+', '', l['concepto'].lower())] or ls[:1]
    assert ls, (n, e['factura'], imp, [l['base'] for l in f['lineas']])
    cobrada = f['anio'] <= 2023 and f['estado'] != 'anulada' or f['estado'] == 'cobrada'
    return ls[0], cobrada, f


def rango(pref):
    """Un id por su principio (6 cifras): entre pref00-0000-... y prefff-ffff-... (un uuid no admite like)."""
    return 'id=gte.%s00-0000-0000-0000-000000000000&id=lte.%sff-ffff-ffff-ffff-ffffffffffff' % (pref, pref)


_h = {}
def hito(pref):
    if pref not in _h:
        r = b.leer('hitos_cobro?select=id,linea_facturacion_id,hito,orden,porcentaje,importe,estado,hito_padre_id,notas'
                   '&' + rango(pref), por_tramos=False)
        r = [x for x in r if x['id'].startswith(pref)]
        assert len(r) == 1, (pref, len(r))
        _h[pref] = r[0]
    return _h[pref]


def linea(pref):
    r = [x for x in b.leer('lineas_facturacion?select=id,hoja_encargo_id,descripcion,importe&' + rango(pref), por_tramos=False) if x['id'].startswith(pref)]
    assert len(r) == 1, (pref, len(r))
    return r[0]


def linea_unica_de_hoja(cod):
    h = b.leer('hojas_encargo?select=id,lineas:lineas_facturacion(id,hoja_encargo_id,descripcion,importe,quitada_en)&numero_hoja=eq.' + cod)[0]
    ls = [l for l in h['lineas'] if not l['quitada_en']]
    assert len(ls) == 1, (cod, len(ls))
    return ls[0]


# ------------------------------------------------------------------ el plan
plan = {'enlaces': [], 'ajustes': [], 'nuevos_hitos': [], 'anular_hitos': [], 'quitar_enlaces': [], 'notas': [], 'estados': {}, 'lineas': set()}
def nota(hoja_id, hito_id, texto):
    plan['notas'].append({'hoja_encargo_id': hoja_id, 'hito_cobro_id': hito_id, 'fecha': HOY, 'origen': 'factusol', 'tipo': 'nota',
                          'autor': AUTOR, 'texto': texto})
def enlazar(fl, hid, imp, cobrada, n):
    plan['enlaces'].append({'factura_linea_id': fl['id'], 'hito_cobro_id': hid, 'importe': round(imp, 2), 'como': 'a_mano', '_n': n})
    if cobrada: plan['estados'][hid] = 'completado'

# hitos nuevos que se crean en el aire: se les da un id local y se resuelve al escribir
NUEVO = itertools.count(1)
def nuevo_hito(linea_id, tipo, orden, pct, imp, notas_, padre=None, estado='pendiente'):
    k = 'nuevo:%d' % next(NUEVO)
    plan['nuevos_hitos'].append({'_k': k, 'linea_facturacion_id': linea_id, 'hito': tipo, 'orden': orden, 'porcentaje': pct,
                                 'importe': round(imp, 2), 'estado': estado, 'hito_padre_id': padre, 'notas': notas_})
    plan['lineas'].add(linea_id)
    return k

# 1) REHACER EN 50/30/20 las lineas de licencia y bonificacion de Faisanes 25 y 15 (norma FAIN)
REHACER_FAIN = {'83c51d': 1500, '81455b': 1000, '27e5f0': 1500, '4f4b82': 1000}
nuevo_de = {}   # (linea_pref, tipo) -> clave del hito nuevo
for lp, tot in REHACER_FAIN.items():
    l = linea(lp)
    for h in b.leer('hitos_cobro?select=id,importe&linea_facturacion_id=eq.' + l['id']):
        plan['anular_hitos'].append(h['id'])
    for k, (tipo, pct) in enumerate((('entrega', 50), ('licencia', 30), ('cfo', 20)), 1):
        nuevo_de[(lp, tipo)] = nuevo_hito(l['id'], tipo, k, pct, tot * pct / 100, 'Norma FAIN 50/30/20 (revisión a mano, 18-oct-2026)')
    nota(l['hoja_encargo_id'], None, 'Línea «%s»: tenía un hito único del 100 %%; se rehace en 50/30/20, la norma de FAIN, como facturó (revisión a mano, 18-oct-2026).' % l['descripcion'])
PLAZO_R = {2: 'entrega', 8: 'licencia', 12: 'licencia', 11: 'entrega', 107: 'entrega'}

# 2) GALICIA 8 (HE-2022-0013): se rehace entera, como se facturo (5.300 = 5.300). FAIN cobro 400 del CFO dentro del «resto de CSS» (242-2025)
GAL = {'proy': 'fae224', 'css': '70634c', 'subv': '25d6f4'}
gal = {k: linea(v) for k, v in GAL.items()}
for k in ('proy', 'css', 'subv'):
    for h in b.leer('hitos_cobro?select=id,flh:factura_linea_hitos(factura_linea_id,hito_cobro_id)&linea_facturacion_id=eq.' + gal[k]['id']):
        plan['anular_hitos'].append(h['id'])
        for e in h['flh']: plan['quitar_enlaces'].append((e['factura_linea_id'], e['hito_cobro_id']))
g = {}
for k, tipo, o, pct, imp in (('proy', 'entrega', 1, 50, 1500), ('proy', 'licencia', 2, 30, 900), ('proy', 'cfo', 3, 20, 600),
                             ('css', 'pss', 1, 80, 640), ('css', 'cfo', 2, 20, 160), ('subv', 'presentacion', 1, 80, 1200), ('subv', 'concesion', 2, 20, 300)):
    g[(k, tipo)] = nuevo_hito(gal[k]['id'], tipo, o, pct, imp, 'Rehecho como se facturó (revisión a mano, 18-oct-2026)')
def fl_gal(emp, anio, num, imp):
    f = b.leer('facturas?select=id,anio,estado,lineas:factura_lineas(id,base)&tipo=eq.factura&empresa_emisora=eq.%s&anio=eq.%s&serie=eq.1&numero=eq.%s' % (emp, anio, num))[0]
    l = [x for x in f['lineas'] if abs(float(x['base']) - imp) < 0.02][0]
    return l, (f['anio'] <= 2023 or f['estado'] == 'cobrada')
for (emp, anio, num, imp), partes in ((('accesalia', 2022, 86, 1500), [(('proy', 'entrega'), 1500)]),
                                      (('accesalia', 2023, 3, 900), [(('proy', 'licencia'), 900)]),
                                      (('accesalia', 2025, 236, 200), [(('proy', 'cfo'), 200)]),
                                      (('accesalia', 2025, 242, 560), [(('proy', 'cfo'), 400), (('css', 'cfo'), 160)]),
                                      (('accesalia', 2023, 89, 640), [(('css', 'pss'), 640)]),
                                      (('accesalia', 2022, 194, 1200), [(('subv', 'presentacion'), 1200)]),
                                      (('accesalia', 2023, 85, 300), [(('subv', 'concesion'), 300)])):
    fl, cob = fl_gal(emp, anio, num, imp)
    for key, i in partes: enlazar(fl, g[key], i, cob, 'Galicia 8')
nota(gal['proy']['hoja_encargo_id'], None, 'Hitos rehechos como se facturó (Mónica, 18-oct-2026): las 7 facturas suman 5.300 = la hoja. FAIN cobró 400 € del CFO del proyecto dentro de la 242-2025 («resto de CSS», 560 = 160 de CSS + 400 de CFO).')

# 3) LAS DEMAS DECISIONES
AJUSTE_EXTRA = {106: [('453dd9', 7800)]}   # San Roque 18: la concesion baja lo que sube la entrega
partes_sub = collections.defaultdict(list)
for n, v in sorted(m.D.items()):
    a = v['accion']
    if a in ('SU', 'NO', '?', 'G'): continue
    fl, cob, f = linea_factura(n)
    if a in ('E', 'P'):
        for pref, imp in v['hitos']:
            if pref.startswith('R:'):
                k = nuevo_de[(pref[2:], PLAZO_R[n])]
                enlazar(fl, k, imp, cob, n)
            else:
                enlazar(fl, hito(pref)['id'], imp, cob, n)
    elif a == 'A':
        for pref, imp in v['hitos']:
            h = hito(pref)
            plan['ajustes'].append((h['id'], float(h['importe'] or 0), imp, n))
            plan['lineas'].add(h['linea_facturacion_id'])
            nota(linea(h['linea_facturacion_id'][:6])['hoja_encargo_id'], h['id'],
                 'Importe del hito «%s» ajustado de %s a %s €: manda la factura (%s). %s' % (h['hito'], h['importe'], imp, EXP[n]['factura'], v['porque']))
            enlazar(fl, h['id'], float(EXP[n]['importe_linea_factura']), cob, n)
        for pref, imp in AJUSTE_EXTRA.get(n, []):
            h = hito(pref); plan['ajustes'].append((h['id'], float(h['importe'] or 0), imp, n)); plan['lineas'].add(h['linea_facturacion_id'])
    elif a == 'S':
        for pref, imp in v['hitos']:
            padre = nuevo_de[(pref[2:], PLAZO_R[n])] if pref.startswith('R:') else hito(pref)['id']
            partes_sub[padre].append((EXP[n]['fecha'], fl, imp, cob, n))
    elif a == 'R':
        for pref, imp in v['hitos']:
            l = linea(pref[2:]) if pref != 'R:nuevo' else linea_unica_de_hoja({236: 'HE-2022-0062', 237: 'HE-2022-0063', 238: 'HE-2022-0052',
                                                                               239: 'HE-2022-0053', 240: 'HE-2022-0090'}[n])
            k = nuevo_hito(l['id'], 'otro', 1, 100, imp, 'Pago único (revisión a mano, 18-oct-2026)')
            enlazar(fl, k, imp, cob, n)

# subhitos: por padre, en orden de fecha; y el resto, pendiente
def importe_padre(p):
    for x in plan['nuevos_hitos']:
        if x['_k'] == p: return x['importe']
    return float(_h_id(p)['importe'])
def _h_id(i):
    return b.leer('hitos_cobro?select=id,linea_facturacion_id,hito,importe&id=eq.' + i)[0]
for p, trozos in partes_sub.items():
    tope, suma = importe_padre(p), 0.0
    for k, (fe, fl, imp, cob, n) in enumerate(sorted(trozos, key=lambda t: t[0]), 1):
        lid = next((x['linea_facturacion_id'] for x in plan['nuevos_hitos'] if x['_k'] == p), None) or _h_id(p)['linea_facturacion_id']
        tipo = next((x['hito'] for x in plan['nuevos_hitos'] if x['_k'] == p), None) or _h_id(p)['hito']
        s = nuevo_hito(lid, tipo, k, None, imp, 'Subhito: factura %s (%s)' % (EXP[n]['factura'], fe), padre=p, estado='completado' if cob else 'pendiente')
        enlazar(fl, s, imp, False, n); suma += imp
    if tope - suma > 1:
        nuevo_hito(lid, tipo, len(trozos) + 1, None, tope - suma, 'Resto del hito, sin facturar todavía (revisión a mano, 18-oct-2026)', padre=p)
    plan['estados'][p] = 'completado' if tope - suma <= 1 and all(t[3] for t in trozos) else 'parcial'

# ------------------------------------------------------------------ resumen
print('enlaces: %d | hitos nuevos: %d | hitos anulados: %d | enlaces quitados: %d | importes ajustados: %d | notas: %d | líneas a recalcular: %d'
      % (len(plan['enlaces']), len(plan['nuevos_hitos']), len(plan['anular_hitos']), len(plan['quitar_enlaces']), len(plan['ajustes']),
         len(plan['notas']), len(plan['lineas'])))
print('   suma enlazada: %.2f €' % sum(e['importe'] for e in plan['enlaces']))
# COMPROBACIONES: cada factura enlazada por su importe; ningun hito existente con otra factura ya colgada
por_n = collections.defaultdict(float)
for e in plan['enlaces']: por_n[e['_n']] += e['importe']
mal = [(n, round(t, 2), EXP[n]['importe_linea_factura']) for n, t in por_n.items() if n != 'Galicia 8' and abs(t - float(EXP[n]['importe_linea_factura'])) > 0.02]
print('   facturas que no se enlazan por su importe:', mal or 'ninguna')
existentes = {e['hito_cobro_id'] for e in plan['enlaces'] if not e['hito_cobro_id'].startswith('nuevo:')}
ocupados = b.leer('factura_linea_hitos?select=hito_cobro_id,importe&hito_cobro_id=in.(%s)' % ','.join(existentes)) if existentes else []
print('   hitos que ya tenían otra factura:', [(o['hito_cobro_id'][:6], o['importe']) for o in ocupados] or 'ninguno')
if not ESCRIBIR:
    print('(en seco)'); sys.exit()
assert not mal and not ocupados, 'no se escribe: revisar arriba'

# ------------------------------------------------------------------ escribir
def crear(tabla, fila):
    cab = dict(b.cab); cab['Content-Type'] = 'application/json'; cab['Prefer'] = 'return=representation'
    req = urllib.request.Request(b.url + '/rest/v1/' + tabla, data=json.dumps([fila], ensure_ascii=False).encode('utf-8'), headers=cab, method='POST')
    with urllib.request.urlopen(req) as r: return json.loads(r.read().decode('utf-8'))[0]

# 1) quitar los enlaces viejos de Galicia 8 y anular sus hitos
for fl, h in plan['quitar_enlaces']:
    b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (fl, h))
for h in set(plan['anular_hitos']):
    b.actualizar('hitos_cobro?id=eq.' + h, {'estado': 'anulado', 'editado_en': HOY + 'T12:00:00+00:00'})
# 2) hitos nuevos (los padres antes que sus subhitos: van en orden de creacion)
ids = {}
for x in plan['nuevos_hitos']:
    fila = {k: v for k, v in x.items() if k != '_k'}
    if fila['hito_padre_id'] and fila['hito_padre_id'].startswith('nuevo:'): fila['hito_padre_id'] = ids[fila['hito_padre_id']]
    ids[x['_k']] = crear('hitos_cobro', fila)['id']
real = lambda h: ids.get(h, h)
# 3) importes ajustados
for hid, antes, despues, n in plan['ajustes']:
    b.actualizar('hitos_cobro?id=eq.' + hid, {'importe': despues, 'editado_en': HOY + 'T12:00:00+00:00'})
# 4) enlaces
ya = {(x['factura_linea_id'], x['hito_cobro_id']) for x in b.leer('factura_linea_hitos?select=factura_linea_id,hito_cobro_id')}
filas = []
for e in plan['enlaces']:
    f = {k: v for k, v in e.items() if k != '_n'}; f['hito_cobro_id'] = real(f['hito_cobro_id'])
    if (f['factura_linea_id'], f['hito_cobro_id']) not in ya: filas.append(f); ya.add((f['factura_linea_id'], f['hito_cobro_id']))
b.insertar('factura_linea_hitos', filas)
# 5) estados
for h, est in plan['estados'].items():
    b.actualizar('hitos_cobro?id=eq.' + real(h), {'estado': est})
# 6) el importe de cada linea tocada = la suma de sus hitos vivos de primer nivel
for lid in plan['lineas']:
    hs = b.leer('hitos_cobro?select=importe,estado,hito_padre_id&linea_facturacion_id=eq.' + lid)
    tot = round(sum(float(h['importe'] or 0) for h in hs if not h['hito_padre_id'] and h['estado'] != 'anulado'), 2)
    l = b.leer('lineas_facturacion?select=importe&id=eq.' + lid)[0]
    if l['importe'] is None or abs(float(l['importe']) - tot) > 0.01:
        b.actualizar('lineas_facturacion?id=eq.' + lid, {'importe': tot, 'editada_en': HOY + 'T12:00:00+00:00'})
        print('   linea %s: %s -> %s' % (lid[:6], l['importe'], tot))
# 7) notas
for x in plan['notas']:
    if x['hito_cobro_id']: x['hito_cobro_id'] = real(x['hito_cobro_id'])
b.insertar('notas_facturacion', plan['notas'])
print('escrito: %d enlaces, %d hitos nuevos' % (len(filas), len(ids)))
