# -*- coding: utf-8 -*-
"""APLICAR LA REVISION A MANO DE LAS 168 (Monica, 17-oct-2026).

La propuesta de los agentes (docs/facturacion/propuesta_casar_2022_2024_resto.csv) se leyo ficha a ficha
(docs/facturacion/revision_a_mano_168.csv). Aqui se escribe:
  - lo que la revision dio por BUENO, tal cual lo proponia el CSV (enlazar, trozo de un pago, ajustar un pago);
  - los pagos que faltaban en lineas sin pagos (la propuesta decia «crear»), de las fichas buenas;
  - los 11 ERRORES, con lo que de verdad toca (a mano, abajo);
  - las decisiones de Monica del 17-oct (Abejuela, Hernan Cortes, Tenerife, Castilla la Vieja, Paseo Olimpo,
    Natalio Tortuero, facturas rectificadas).
Las contratas (Anylor, Constructive, NVR, Inima, Israel Fernandez, Aislamiento de Rehabilitacion) NO: van a 68.
Montejurra 25 y Nazaret 32 bis esperan a Monica.

Regla de cobrado: factura cobrada, o de 2023 o antes y no anulada -> pago completado.

  python scripts/facturacion/aplicar_revision_168.py            (prueba: no escribe)
  python scripts/facturacion/aplicar_revision_168.py --escribir
"""
import sys, os, csv, collections, uuid, datetime
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
HOY = datetime.date.today().isoformat()
R = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
OLIMPO_PDF = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else None
b = arrancar()


def num(s):
    s = (s or '').strip()
    return float(s.replace('.', '').replace(',', '.')) if s else None


# ---------------------------------------------------------------- datos de la base
hitos = {h['id']: h for h in b.leer('hitos_cobro?select=id,linea_facturacion_id,hito,orden,porcentaje,importe,estado,hito_padre_id,notas&order=id')}
enl = collections.defaultdict(list)
for e in b.leer('factura_linea_hitos?select=factura_linea_id,hito_cobro_id,importe&order=hito_cobro_id,factura_linea_id'):
    enl[e['hito_cobro_id']].append(e)
lineas = {l['id']: l for l in b.leer('lineas_facturacion?select=id,hoja_encargo_id,descripcion,importe,quitada_en&order=id')}
hojas = {h['numero_hoja']: h for h in b.leer('hojas_encargo?select=id,numero_hoja,estado,oportunidad_id,comunidad_id&order=id')}
facts = {}
for f in b.leer('facturas?select=id,empresa_emisora,anio,serie,numero,estado,tipo,lineas:factura_lineas(id,base)&origen=eq.factusol&anio=gte.2020&order=id'):
    facts[(f['empresa_emisora'], f['anio'], f['serie'], f['numero'])] = f
fl_fact = {l['id']: f for f in facts.values() for l in f['lineas']}


def H(pref):
    m = [i for i in hitos if i.startswith(pref)]
    if len(m) != 1: sys.exit('hito %s: %d coincidencias' % (pref, len(m)))
    return m[0]


def FL(ref, base=None):
    """'accesalia 2023/1-58' (+ base si la factura tiene varias lineas) -> id de la linea"""
    emp, resto = ref.split()
    anio, sn = resto.split('/'); serie, n = sn.split('-')
    f = facts[(emp.lower(), int(anio), serie, int(n))]
    ls = [l for l in f['lineas'] if base is None or abs(float(l['base']) - base) < 0.01]
    if len(ls) != 1: sys.exit('linea de %s (%s): %d' % (ref, base, len(ls)))
    return ls[0]['id']


def LINEA(hoja, importe):
    h = hojas[hoja]
    ls = [l for l in lineas.values() if l['hoja_encargo_id'] == h['id'] and not l['quitada_en'] and abs(float(l['importe'] or 0) - importe) < 0.01]
    if len(ls) != 1: sys.exit('linea %s %s: %d' % (hoja, importe, len(ls)))
    return ls[0]['id']


def cobrado(fl):
    f = fl_fact[fl]
    return f['estado'] == 'cobrada' or (f['anio'] <= 2023 and f['estado'] != 'anulada')


# ---------------------------------------------------------------- operaciones
OPS = []          # (tipo, datos, porque)


def link(fl, hito, imp, porque):
    OPS.append(('enlazar', dict(factura_linea_id=fl, hito_cobro_id=hito, importe=round(imp, 2)), porque))


def unlink(fl, hito, porque):
    OPS.append(('desenlazar', dict(factura_linea_id=fl, hito_cobro_id=hito), porque))


def sub(padre, imp, fl, porque, estado=None, nota=None):
    """trozo nuevo de un pago (subhito); si lleva factura, se enlaza"""
    sid = str(uuid.uuid4())
    p = hitos[padre]
    OPS.append(('crear_hito', dict(id=sid, linea_facturacion_id=p['linea_facturacion_id'], hito=p['hito'], importe=round(imp, 2),
                                   hito_padre_id=padre, estado=estado or ('completado' if fl and cobrado(fl) else 'pendiente'),
                                   notas=nota or ('Trozo de la factura (revision a mano 168, %s).' % HOY)), porque))
    if fl: link(fl, sid, imp, porque)
    return sid


def nuevo(linea, hito, pct, imp, fl, porque, estado=None, nota=None):
    """pago nuevo en una linea que no tenia pagos"""
    sid = str(uuid.uuid4())
    OPS.append(('crear_hito', dict(id=sid, linea_facturacion_id=linea, hito=hito, porcentaje=pct, importe=round(imp, 2),
                                   estado=estado or ('completado' if fl and cobrado(fl) else 'pendiente'),
                                   notas=nota or ('Pago creado al casar la factura de Factusol (revision a mano 168, %s).' % HOY)), porque))
    if fl: link(fl, sid, imp, porque)
    return sid


def cambiar(hito, cambios, porque):
    OPS.append(('cambiar_hito', dict(id=hito, **cambios), porque))


def padre_segun_hijos(padre, porque):
    OPS.append(('estado_padre', dict(id=padre), porque))


# ---------------------------------------------------------------- 1) lo BUENO del CSV
prop = list(csv.DictReader(open(os.path.join(R, 'docs/facturacion/propuesta_casar_2022_2024_resto.csv'), encoding='utf-8-sig'), delimiter=';'))
rev = {int(r['n']): r for r in csv.DictReader(open(os.path.join(R, 'docs/facturacion/revision_a_mano_168.csv'), encoding='utf-8-sig'), delimiter=';')}
por_linea = collections.OrderedDict()
for p in prop: por_linea.setdefault(p['linea_factura_id'], []).append(p)
fichas = {n: (lid, ps) for n, (lid, ps) in enumerate(por_linea.items(), 1)}

A_MANO = {79, 80, 83, 84,          # Hernan Cortes: se rehace abajo
          109, 110,                # Montejurra: espera a Monica
          117, 128,                # contratas (Israel Fernandez, Aislamiento de Rehabilitacion): a 68
          118, 119,                # Nazaret: espera a Monica
          153, 154,                # Tenerife: abajo, las dos juntas
          91}                      # Hungria 4 2024/288: anulada con abono 2025/6-1 (duplicada)
trozos = collections.defaultdict(list)     # padre -> [(fl, importe, ficha)]
for n, (lid, ps) in fichas.items():
    v = rev[n]['veredicto']
    if not v.startswith('BIEN') or n in A_MANO: continue
    for p in ps:
        if p['accion'] not in ('enlazar', 'subhito', 'ajustar_hito', 'otra_hoja'): continue
        hid = p['hito_id']
        if hid not in hitos: sys.exit('ficha %d: hito %s no existe' % (n, hid))
        imp = num(p['importe_enlace']) if p['importe_enlace'] and len(p['importe_enlace']) < 15 else None
        if p['accion'] in ('enlazar', 'otra_hoja'):
            link(lid, hid, imp or float(hitos[hid]['importe']), 'ficha %d' % n)
        elif p['accion'] == 'ajustar_hito':
            nuevo_imp = num(p['importe_nuevo'])
            cambiar(hid, {'importe': nuevo_imp, 'notas': ((hitos[hid]['notas'] or '') + '\n' if hitos[hid]['notas'] else '') +
                          'Importe ajustado de %s a %s: manda la factura (redondeo de la hoja; revision 168, %s).' % (hitos[hid]['importe'], nuevo_imp, HOY)},
                    'ficha %d' % n)
            link(lid, hid, imp or nuevo_imp, 'ficha %d' % n)
        else:
            trozos[hid].append((lid, imp, n))

# ---------------------------------------------------------------- 2) arreglos a mano antes de los trozos
# Feria 8 (#65/#66): la 2023/160 se colgo del encargo (que ya pago entero la 2023/127): su trozo pasa a la entrega y
# el «resto» de 3.000 del encargo sobra.
feria_160 = H('df0d42cd'); feria_resto = H('48b3aa6e'); feria_entrega = H('f380639e')
cambiar(feria_160, {'hito_padre_id': feria_entrega, 'hito': 'entrega'}, 'Feria 8: la 2023/160 es de la entrega')
OPS.append(('borrar_hito', dict(id=feria_resto), 'Feria 8: el resto de 3.000 del encargo sobra (lo pago entero la 2023/127)'))
OPS.append(('cambiar_hito_estado_directo', dict(id=H('dc3f32c2'), estado='completado'), 'Feria 8: encargo pagado entero'))
trozos[feria_entrega].insert(0, (None, 0, 'ya'))          # cuenta el trozo movido
# Paseo Granada 2 (#129-132) y Tenerife 8 (#154): la entrega estaba enlazada con una factura ANULADA
unlink(FL('accesalia 2023/1-223'), H('25452abd'), 'Paseo Granada 2: la 2023/223 esta anulada')
unlink(FL('accesalia 2023/1-94'), H('e8eea680'), 'Tenerife 8: la 2023/94 esta anulada')
# Fray Melchor Cano 22 (#72): la 2022/170 (anteproyecto 30%) estaba en el pago de licencia, que ya tiene la 2025/238
fm_licencia, fm_otro = H('21c3cac1'), H('208d9565')
unlink(FL('accesalia 2022/1-170'), fm_licencia, 'Fray Melchor: la 2022/170 no es la licencia')
trozos[fm_otro].insert(0, (FL('accesalia 2022/1-170'), 1050.0, 72))

# Tenerife 8 (#153 y #154): manda la factura (Monica): 3.600 + 320 = el adelanto de 3.920
trozos[H('e8eea680')] += [(FL('accesalia 2022/1-198'), 3600.0, 153), (FL('accesalia 2023/1-174'), 320.0, 154)]

# ---------------------------------------------------------------- 3) los trozos: crear hijos, el resto pendiente, estado del padre
for padre, ts in trozos.items():
    p = hitos[padre]
    ya_hijos = [h for h in hitos.values() if h['hito_padre_id'] == padre and h['id'] not in (feria_resto,)]
    resto_libre = [h for h in ya_hijos if h['estado'] == 'pendiente' and not enl.get(h['id'])]
    suma = sum(float(h['importe']) for h in ya_hijos if h not in resto_libre)
    if padre == feria_entrega: suma = 1000.0
    for fl, imp, n in ts:
        if fl is None: continue
        # si hay un «resto» pendiente del mismo importe (o mayor), se usa ese en vez de crear otro
        r = next((h for h in resto_libre if abs(float(h['importe']) - imp) < 0.02), None)
        if r:
            resto_libre.remove(r)
            if abs(float(r['importe']) - imp) >= 0.005: cambiar(r['id'], {'importe': imp}, 'ficha %s: ajuste de centimos' % n)
            cambiar(r['id'], {'estado': 'completado' if cobrado(fl) else 'pendiente'}, 'ficha %s' % n)
            link(fl, r['id'], imp, 'ficha %s: al resto que habia' % n)
        else:
            sub(padre, imp, fl, 'ficha %s' % n)
        suma += imp
    tope = float(p['importe'])
    if suma > tope + 0.05: sys.exit('se pasa: hito %s (%s) suma %.2f' % (padre[:8], tope, suma))
    for r in resto_libre:
        OPS.append(('borrar_hito', dict(id=r['id']), 'resto viejo de %s, se rehace' % padre[:8]));
    if tope - suma > 0.05:
        sub(padre, tope - suma, None, 'resto sin facturar de %s' % padre[:8], estado='pendiente',
            nota='Resto del pago, sin facturar todavia (revision a mano 168, %s).' % HOY)
    padre_segun_hijos(padre, 'trozos')

# Paseo Granada 2: el encargo queda completo con el ajuste del resto (ficha 129)
padre_segun_hijos(H('3e4aa320'), 'Paseo Granada 2: encargo')

# ---------------------------------------------------------------- 4) pagos nuevos en lineas sin pagos (fichas buenas)
CREAR = [  # ficha, factura, base de la linea de factura (None = una sola), hoja, importe de la linea de la hoja, hito, %, importe
    (4, 'accesalia 2022/1-48', None, 'HE-2021-0002', 5000, 'encargo', 100, 5000),
    (27, 'accesalia 2022/1-25', None, 'HE-2022-0007', 4500, 'encargo', 100, 4500),
    (31, 'accesalia 2022/1-121', None, 'HE-2022-0049', 18900, 'encargo', 100, 18900),
    (31, 'accesalia 2022/1-121', None, 'HE-2022-0049', 10900, 'encargo', 100, 10900),
    (33, 'daniel 2022/1-42', None, 'HE-2022-0018', 1800, 'encargo', 100, 1800),
    (37, 'accesalia 2023/1-31', None, 'HE-2022-0042', 4500, 'entrega', 50, 2250),
    (39, 'accesalia 2024/1-60', None, 'HE-2022-0042', 4500, 'licencia', 30, 1350),
    (37, None, None, 'HE-2022-0042', 4500, 'cfo', 20, 900),
    (38, 'accesalia 2023/1-54', None, 'HE-2022-0042', 1500, 'encargo', 100, 1500),
    (58, 'accesalia 2023/1-88', None, 'HE-2023-0042', 4700, 'encargo', 100, 4700),
    (68, 'daniel 2022/1-89', None, 'HE-2022-0048', 5000, 'encargo', 100, 5000),
    (68, 'daniel 2022/1-89', None, 'HE-2022-0048', 1000, 'encargo', 100, 1000),
    (86, 'accesalia 2022/1-197', None, 'HE-2022-0071', 6000, 'encargo', 100, 6000),
    (122, 'accesalia 2023/1-192', None, 'HE-2023-0037', 6000, 'encargo', 100, 6000),
    (125, 'accesalia 2022/1-12', None, 'HE-2021-0004', 5000, 'encargo', 100, 5000),
    (126, 'accesalia 2022/1-161', None, 'HE-2022-0043', 3000, 'encargo', 100, 3000),
    (126, 'accesalia 2022/1-161', None, 'HE-2022-0043', 600, 'encargo', 100, 600),
    (127, 'accesalia 2022/1-172', None, 'HE-2022-0043', 1250, 'encargo', 100, 1250),
    (133, 'accesalia 2022/1-18', None, 'HE-2021-0003', 5000, 'encargo', 100, 5000),
    (140, 'accesalia 2022/1-89', None, 'HE-2022-0034', 3600, 'encargo', 100, 3600),
    (140, 'accesalia 2022/1-89', None, 'HE-2022-0034', 900, 'encargo', 100, 900),
    (152, 'accesalia 2022/1-38', None, 'HE-2022-0011', 5500, 'encargo', 100, 5500),
]
for n, fac, base_fl, hoja, imp_linea, hito, pct, imp in CREAR:
    li = LINEA(hoja, imp_linea)
    if any(h['linea_facturacion_id'] == li for h in hitos.values()): sys.exit('ficha %d: la linea ya tiene pagos' % n)
    fl = FL(fac, base_fl) if fac else None
    # facturas de una sola linea que pagan dos lineas de la hoja: el enlace lleva el importe de cada una
    nuevo(li, hito, pct, imp, fl, 'ficha %d' % n)

# ---------------------------------------------------------------- 5) los ERRORES, corregidos
# Av. de los Andes 11 (#23-25): el «resto» de 1.015 ya existia: se parte en 492 + 492 + 31; 420 a la CSS
andes_resto, andes_padre = H('873a1f99'), H('13a1949b')
cambiar(andes_resto, {'importe': 492, 'estado': 'completado'}, 'Andes 11')
link(FL('daniel 2023/1-58'), andes_resto, 492, 'Andes 11 #23')
sub(andes_padre, 492, FL('daniel 2023/1-67'), 'Andes 11 #24')
sub(andes_padre, 31, FL('daniel 2023/1-77'), 'Andes 11 #25')
link(FL('daniel 2023/1-77'), H('afc2c473'), 420, 'Andes 11 #25 (CSS)')
padre_segun_hijos(andes_padre, 'Andes 11')
# Av. Monte 89 Algete (#28/#29): si tiene hoja
link(FL('accesalia 2023/1-130'), H('8684013c'), 2920, 'Monte 89 #28')
link(FL('accesalia 2023/1-178'), H('d006cb10'), 2920, 'Monte 89 #29')
# Canada Toledana 2 (#42/#52): 2.000 + 1.000 son la ENTREGA (libre: la 2026/33 que la ocupaba esta anulada)
ct = H('bbb3a8c1')
unlink(FL('daniel 2026/1-33', 3000), ct, 'Canada Toledana: la 2026/33 esta anulada')
sub(ct, 2000, FL('daniel 2022/1-117'), 'Canada Toledana #52')
sub(ct, 1000, FL('daniel 2023/1-55'), 'Canada Toledana #42')
padre_segun_hijos(ct, 'Canada Toledana')
# Juan Sebastian Elcano 4 (#98) y Virgen de Iciar 15 esc. 4 (#158): si tienen hoja
link(FL('accesalia 2023/1-121'), H('6df89cb5'), 1800, 'Elcano 4 #98')
link(FL('accesalia 2024/1-50'), H('9c5b56c7'), 850, 'Iciar 15 esc 4 #158')
# (#19 Armenteros: suelta, nada. #91 Hungria 4: anulada con abono 2025/6-1, NO se casa: va en 7)

# ---------------------------------------------------------------- 6) decisiones de Monica (17-oct)
# 1. Abejuela 17: renuncia a DO y CSS = fin de la relacion; lo pendiente se anula
ab = H('ea53c5b0')
sub(ab, 1250, FL('accesalia 2022/1-227'), 'Abejuela: la renuncia (25%)',
    nota='Factura de la renuncia a la direccion de obra y la CSS (25%%) (revision 168, %s).' % HOY)
sub(ab, 1250, None, 'Abejuela: lo que quedaba se anula', estado='anulado',
    nota='ANULADO: discutimos con la comunidad y nos salimos; lo pendiente de facturar se anula. Fin de la relacion (Monica, %s).' % HOY)
padre_segun_hijos(ab, 'Abejuela')
# 2. Hernan Cortes 13 (#79-84): rehacer. Adelanto 11.180 = encargos + entregas de ascensor, envolvente y subvencion.
hc_sub_enc, hc_sub_ent = H('5c0cf147'), H('a5c4f038')
unlink(FL('daniel 2025/1-1', 1397.5), hc_sub_enc, 'Hernan Cortes: rehacer')
unlink(FL('daniel 2025/1-8', 1397.5), hc_sub_ent, 'Hernan Cortes: rehacer')
cambiar(hc_sub_enc, {'hito': 'encargo', 'porcentaje': 50, 'importe': 990, 'estado': 'pendiente'}, 'Hernan Cortes: subvencion 50% encargo')
cambiar(hc_sub_ent, {'hito': 'entrega', 'porcentaje': 50, 'importe': 990, 'estado': 'pendiente'}, 'Hernan Cortes: subvencion 50% entrega')
hitos[hc_sub_enc]['importe'] = 990; hitos[hc_sub_ent]['importe'] = 990; hitos[hc_sub_ent]['hito'] = 'entrega'
enc = [(H('2f4877eb'), 1175), (H('27c2bdbe'), 1125), (hc_sub_enc, 495)]
ent = [(H('4c39c442'), 587.5), (H('eeac594a'), 562.5), (hc_sub_ent, 247.5)]
for fac in ('daniel 2024/1-35', 'daniel 2024/1-82'):
    for padre, imp in enc: sub(padre, imp, FL(fac, 2795), 'Hernan Cortes %s (25%%)' % fac)
for fac in ('daniel 2024/1-129', 'daniel 2024/1-138', 'daniel 2025/1-1', 'daniel 2025/1-8'):
    for padre, imp in ent: sub(padre, imp, FL(fac, 1397.5), 'Hernan Cortes %s (12,5%%)' % fac)
for padre, _ in enc + ent: padre_segun_hijos(padre, 'Hernan Cortes')
OPS.append(('nota', dict(hoja_encargo_id=hojas['HE-2024-0008']['id'], hito_cobro_id=None, fecha=HOY, origen='factusol',
            autor='Revision a mano 168 (%s)' % HOY,
            texto='Adelanto de 11.180 cobrado en 2 x 25% (2024/35 y 2024/82) y 4 x 12,5% (2024/129, 2024/138, 2025/1 y 2025/8); '
                  'las 25% de agosto y septiembre de 2024 se anularon con abono. Cada 25% = 1.175 ascensor + 1.125 envolvente + '
                  '495 subvencion (encargos); cada 12,5% = 587,50 + 562,50 + 247,50 (entregas). Rehecho con el ok de Monica.'), 'Hernan Cortes'))
# 7. Castilla la Vieja 8: la HE-2023-0025 es la version anterior de la HE-2023-0045
OPS.append(('hoja_estado', dict(numero='HE-2023-0025', estado='archivada'), 'Castilla la Vieja: version anterior'))
OPS.append(('nota', dict(hoja_encargo_id=hojas['HE-2023-0025']['id'], hito_cobro_id=None, fecha=HOY, origen='factusol',
            autor='Revision a mano 168 (%s)' % HOY,
            texto='Version anterior: la sustituye la HE-2023-0045 (31-may-2023), que es la que cobran las facturas (Monica, %s).' % HOY),
            'Castilla la Vieja'))
# 8. Natalio Tortuero 6: la 2022/231 de Accesalia se anulo (abono 2023/6-2) y se volvio a emitir desde Daniel (2023/6)
unlink(FL('accesalia 2022/1-231'), H('028c4529'), 'Natalio Tortuero: la 2022/231 esta abonada')
# Facturas anuladas con abono que seguian como pendientes/cobradas (y por la regla de 2023 contaban como cobradas)
for fac, abono in (('accesalia 2020/1-23', '2023/6-5'), ('accesalia 2022/1-222', '2023/6-1'), ('accesalia 2022/1-231', '2023/6-2'),
                   ('accesalia 2023/1-48', '2023/6-3'), ('daniel 2022/1-107', '2024/6-1')):
    OPS.append(('factura_anulada', dict(id=fl_fact[FL(fac)]['id'], ref=fac, abono=abono), 'rectificada con abono %s' % abono))
# 5. Paseo Olimpo 16: la hoja de la CSS (enviada, no firmada) como respaldo de la factura 2024/1-250
OPS.append(('hoja_olimpo', {}, 'Paseo Olimpo 16: hoja de CSS (30-oct-2024) de respaldo de la 2024/1-250'))

# ---------------------------------------------------------------- comprobar
nuevos = {o[1]['id']: o[1] for o in OPS if o[0] == 'crear_hito'}
quitados = {(o[1]['factura_linea_id'], o[1]['hito_cobro_id']) for o in OPS if o[0] == 'desenlazar'}
borrados = {o[1]['id'] for o in OPS if o[0] == 'borrar_hito'}
cambios = collections.defaultdict(dict)
for o in OPS:
    if o[0] == 'cambiar_hito': cambios[o[1]['id']].update({k: v for k, v in o[1].items() if k != 'id'})
importe_de = lambda h: float(cambios.get(h, {}).get('importe', (nuevos.get(h) or hitos[h])['importe']))
carga = collections.defaultdict(float); dobles = collections.Counter()
for h, es in enl.items():
    for e in es:
        if (e['factura_linea_id'], h) not in quitados: carga[h] += float(e['importe'] or 0)
for o in OPS:
    if o[0] == 'enlazar':
        carga[o[1]['hito_cobro_id']] += o[1]['importe']; dobles[(o[1]['factura_linea_id'], o[1]['hito_cobro_id'])] += 1
        ya = [e for e in enl.get(o[1]['hito_cobro_id'], []) if e['factura_linea_id'] == o[1]['factura_linea_id']]
        if ya and (o[1]['factura_linea_id'], o[1]['hito_cobro_id']) not in quitados: sys.exit('enlace repetido %s' % o[2])
mal = [(h, c, importe_de(h)) for h, c in carga.items() if h not in borrados and c > importe_de(h) + 0.05]
mal = [m for m in mal if m[0] in nuevos or m[0] in cambios or any(o[0] == 'enlazar' and o[1]['hito_cobro_id'] == m[0] for o in OPS)]
if mal: sys.exit('pagos con mas factura que importe: %s' % [(h[:8], c, i) for h, c, i in mal])
if [k for k, v in dobles.items() if v > 1]: sys.exit('enlaces dobles en el plan')
# hijos que no cuadran con su padre
hijos = collections.defaultdict(float)
for h in list(hitos.values()) + list(nuevos.values()):
    if h.get('hito_padre_id') and h['id'] not in borrados:
        padre = cambios.get(h['id'], {}).get('hito_padre_id', h['hito_padre_id'])
        hijos[padre] += importe_de(h['id'])
tocados = {o[1]['id'] for o in OPS if o[0] == 'estado_padre'}
for padre in tocados:
    if abs(hijos[padre] - importe_de(padre)) > 0.05:
        print('  AVISO hijos != padre: %s padre %.2f hijos %.2f' % (padre[:8], importe_de(padre), hijos[padre]))

cuenta = collections.Counter(o[0] for o in OPS)
print('operaciones:', dict(cuenta))
for o in OPS:
    d = o[1]
    if o[0] == 'enlazar': print('  enlazar   %s -> %s  %.2f   (%s)' % (fl_fact[d['factura_linea_id']]['anio'], d['hito_cobro_id'][:8], d['importe'], o[2]))
if not ESCRIBIR:
    print('PRUEBA: no se ha escrito nada'); sys.exit()

# ---------------------------------------------------------------- escribir
creado_por_padre = set()
for t, d, porque in OPS:
    if t == 'crear_hito':
        fila = dict(d); fila.setdefault('orden', 1)
        b.insertar('hitos_cobro', [fila])
    elif t == 'enlazar':
        b.insertar('factura_linea_hitos', [dict(d, como='a_mano')])
    elif t == 'desenlazar':
        b.borrar('factura_linea_hitos?factura_linea_id=eq.%s&hito_cobro_id=eq.%s' % (d['factura_linea_id'], d['hito_cobro_id']))
    elif t == 'cambiar_hito':
        b.actualizar('hitos_cobro?id=eq.' + d['id'], {k: v for k, v in d.items() if k != 'id'})
    elif t == 'cambiar_hito_estado_directo':
        b.actualizar('hitos_cobro?id=eq.' + d['id'], {'estado': d['estado']})
    elif t == 'borrar_hito':
        b.borrar('hitos_cobro?id=eq.%s&estado=eq.pendiente' % d['id'])
    elif t == 'estado_padre':
        subs = b.leer('hitos_cobro?select=estado&hito_padre_id=eq.' + d['id'])
        vivos = [x for x in subs if x['estado'] != 'anulado']
        hechos = sum(1 for x in vivos if x['estado'] == 'completado')
        est = 'completado' if vivos and hechos == len(vivos) else ('parcial' if hechos else 'pendiente')
        b.actualizar('hitos_cobro?id=eq.' + d['id'], {'estado': est})
    elif t == 'nota':
        b.insertar('notas_facturacion', [d])
    elif t == 'hoja_estado':
        b.actualizar('hojas_encargo?numero_hoja=eq.' + d['numero'], {'estado': d['estado'], 'fecha_estado': HOY + 'T00:00:00+00:00'})
    elif t == 'factura_anulada':
        b.actualizar('facturas?id=eq.%s&estado=neq.anulada' % d['id'], {'estado': 'anulada'})
    elif t == 'hoja_olimpo':
        if not OLIMPO_PDF: sys.exit('falta el PDF de la hoja de Paseo Olimpo')
        opp = hojas['HE-2024-0096']
        import json, urllib.request
        req = urllib.request.Request(b.url + '/rest/v1/rpc/siguiente_codigo', data=json.dumps({'p_tipo': 'HE', 'p_anio': 2024}).encode(),
                                     headers=dict(b.cab, **{'Content-Type': 'application/json'}), method='POST')
        cod = json.loads(urllib.request.urlopen(req).read())
        hid, vid, cid, lid, tid = (str(uuid.uuid4()) for _ in range(5))
        url = 'almacen:documentos-comerciales/' + b.subir('documentos-comerciales', 'hojas-encargo/%s/hoja-v1-%s.pdf' % (hid, vid[:8]),
                                                          open(OLIMPO_PDF, 'rb').read(), reemplazar=True)
        b.insertar('hojas_encargo', [dict(id=hid, numero_hoja=cod, oportunidad_id=opp['oportunidad_id'], comunidad_id=opp['comunidad_id'],
                   pagador_tipo='comunidad', emisor='accesalia', fecha_creacion='2024-10-30', estado='enviada_comunidad',
                   fecha_estado='2024-10-30T00:00:00+00:00', descripcion='CSS', tipo_documento='hoja_encargo')])
        b.insertar('versiones_hoja', [dict(id=vid, hoja_encargo_id=hid, numero_version=1, fecha_generada='2024-10-30', fecha_enviada='2024-10-30',
                   url_pdf_hoja=url, importe_base=850, iva_porcentaje=21,
                   forma_pago='100% del importe en el momento del encargo mediante cargo en cuenta.',
                   notas='Hoja ENVIADA (no hay firmada): se sube como respaldo de la factura 2024/1-250, que la cita (Monica, %s). '
                         'Fichero: HOJA DE ENCARGO PASEO DEL OLIMPO 16 FUENLABRADA SATE solo CSS.docx' % HOY)])
        bloque = b.leer('lineas_facturacion?select=bloque_id&descripcion=ilike.*Coordinaci*Seguridad*&bloque_id=not.is.null&limit=1', por_tramos=False)[0]['bloque_id']
        texto = 'Honorarios por la Coordinación de Seguridad y Salud en la obra de REHABILITACION DE ENVOLVENTE TÉRMICA'
        b.insertar('conceptos_hoja', [dict(id=cid, hoja_encargo_id=hid, version_hoja_id=vid, bloque_id=bloque, descripcion=texto, importe=850,
                   incluido=True, desglose='se_cobra', forma_pago='100% del importe en el momento del encargo mediante cargo en cuenta')])
        b.insertar('lineas_facturacion', [dict(id=lid, hoja_encargo_id=hid, concepto_hoja_id=cid, bloque_id=bloque, descripcion=texto, importe=850,
                   es_porcentaje=False, notas='Desde la hoja enviada %s (respaldo de la factura 2024/1-250; revision 168).' % cod, origen='pdf',
                   verificado=True, emisor='accesalia', pagador_tipo='comunidad', pagador_id=opp['comunidad_id'], forma_cobro='cargo_cuenta')])
        b.insertar('hitos_cobro', [dict(id=tid, linea_facturacion_id=lid, hito='encargo', orden=1, porcentaje=100, importe=850, estado='completado',
                   notas='Cobrado con la factura 2024/1-250 (revision 168, %s).' % HOY)])
        b.insertar('factura_linea_hitos', [dict(factura_linea_id=FL('accesalia 2024/1-250'), hito_cobro_id=tid, importe=850, como='a_mano')])
        print('Paseo Olimpo 16: hoja', cod)
print('ESCRITO')
