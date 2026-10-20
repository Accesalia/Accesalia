# -*- coding: utf-8 -*-
"""Lo que Mónica decidió en docs/opps/revisar_opps_20oct.xlsx (20-oct-2026).

  python scripts/opps/excel_20oct_aplicar.py              -> solo LEE: pregunta a Catastro por los portales que faltan
  python scripts/opps/excel_20oct_aplicar.py --escribir   -> baja las fichas, enlaza los portales, pone los nombres
                                                             y ordena las comunidades sueltas

  Hoja 1 «incluir ambos / todos»: el portal que dice el nombre y no estaba enlazado (otra parcela) se baja de Catastro
         y se enlaza como hace la app (el acceso es la dirección; su titular, la comunidad de la opp).
         Ronda de Toledo 40 -> es el 30 (errata). Humera 42-54: nombre de Catastro. «Se queda como está»: no se toca.
  Hoja 3 comunidades sin opp: NO se crean opps (todas tienen ya la suya, 20-oct). Las duplicadas se borran;
         las que Mónica dice que son «otra comunidad en la misma opp» pasan a ser titulares de su portal.
  Hoja 4: Boltaña 59, Arroyo de la Medialegua 1 y Paseo del Cares 5 (Álvaro) -> su CP desde sus portales.
  Haya 2: es Paseo de la Haya 2 FUENLABRADA (ficha de Dropbox, 1602003VK3610S), no Madrid.
"""
import sys, os, re, json, uuid, datetime, collections
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(AQUI, '..'))
sys.path.insert(0, os.path.join(AQUI, '..', 'barrido'))
import catastro_opps_abiertas as C  # noqa: E402  (pedir, lista, parcela_de, candidatas, guardar_ficha, upsert)
import urllib.parse  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
b = C.b
HOY = datetime.date.today().isoformat()
NOTA = 'Portal que decía el nombre de la opp, de otra parcela (Mónica, Excel de opps, 20-oct-2026)'

# Ezequiel Solana 85-87, Santa Genoveva 18-20, Mercedes Arteaga 45-47 y Santa Prisca 2-4: Catastro tiene el edificio con
# UN solo número (85, 20, 47, 2): no falta ningún portal y se quedan con su nombre a mano, para no perder el otro número.
# opp -> [(municipio, sigla, calle tal como la escribe Catastro o None = la de sus portales, [números])]
FALTAN = {
    'DAN-2025-139': [(None, None, None, ['3'])],                          # Av. del Oeste 1-3
    'CAR-2025-086': [(None, None, None, ['6'])],                          # Faro 4-6
    'DAN-2025-373': [(None, None, None, ['4', '6'])],                     # Viena 2, 4, 6
    'DAN-2020-050': [(None, None, None, ['4'])],                          # Plaza de Valsaín 3 y 4
    'DAN-2026-084': [(None, None, None, ['3', '5', '7']), (None, 'CL', 'EMPECINADO DEL', ['23'])],  # Salamanca 1-3-5-7 y Empecinado 23
    'DAN-2024-279': [(None, None, None, ['4', '6'])],                     # Julio Palacios 2-4-6
    'ALV-2026-041': [(None, None, None, ['30', '32'])],                   # Nuria 28-32
    'DAN-2024-130': [(None, None, None, ['159'])],                        # Camarena 157-159
    'DAN-2021-128': [(None, None, None, ['27'])],                         # Manresa 25-27
    'DAN-2025-006': [(None, None, None, ['49'])],                         # Carlos V 47-49
    'CAR-2025-030': [(None, None, None, ['23', '25', '27', '29'])],       # Velázquez 21-31 (los que haya)
    'ALV-2026-215': [('MADRID', 'CL', 'ARROYO MEDIA LEGUA', ['1'])],
    'ALV-2026-216': [('FUENLABRADA', 'PS', 'CARES', ['5'])],
}
SOLO_NOMBRE = ['CAR-2026-013', 'DAN-2026-146', 'DAN-2023-009', 'ALV-2026-005', 'CAR-2025-049', 'DAN-2022-047']
HAYA = ('DAN-2022-226', '1602003VK3610S')
CP_NUEVA = ['ALV-2026-197', 'ALV-2026-215', 'ALV-2026-216']

# comunidades sueltas: las duplicadas se borran; las «otra comunidad de la misma opp» pasan a titular de su portal
BORRAR = {
    '36e6cd86-ae00-4de7-b3b0-58dbbefbfb15': 'Monte 89 Algete: propietario particular (DAN-2023-217)',
    '06776548-7567-4f26-a43f-300314730be9': 'Castilla la Nueva 37 bis: ya está, con CIF, en CAR-2025-088',
    '8e6bf4a3-a260-4cd1-b4cd-65c8bf2d036c': 'Época 23: sin carpeta propia; va en «Época 23 y 25» (CAR-2025-056)',
    '46d3418b-744a-40df-b820-da62a9b2d2db': 'Haya 2 Madrid: la carpeta de Madrid es copia de la de Fuenlabrada',
    '4866a790-433f-42a1-9edd-6f4e903cfd3f': 'Iglesia 4 Coslada: repetida de la de DAN-2021-144',
    'eacb4dcf-a916-4945-a409-9decca50ae51': 'Iglesia 4 Madrid: errata, es la de Coslada',
    '37c7456f-8516-4d6d-838b-9978711ca6e7': 'Julián Besteiro 13-15: es la de 15 G',
    '195258a6-62a2-410a-b3c6-661fff67a638': 'López de Hoyos 342B: sin carpeta; la opp es 342 y 342 C (CAR-2025-051)',
    '2f577c1b-6243-4eab-a015-d79d34aec9af': 'Geólogos 2: carpeta conjunta «1 y 2» (CAR-2025-032)',
}
TITULAR = {  # comunidad suelta -> (opp, calle, número, escalera) del portal del que es titular
    '30c5d969-a051-4e8d-ae66-17be7c41c332': ('ALV-2026-005', 'PRINCIPES DE ESPA', '17', None),  # «Presidenta del portal 17»: tiene la suya
    '78481336-5e53-43f3-9e0f-10758f1ac441': ('DAN-2024-298', 'PAULAR', '2', ''),
    '7677973d-447b-48a3-a9a0-646e23ec902a': ('DAN-2024-135', 'FELIPE ALVAREZ', '28', None),
    '07f9209a-695a-4fbc-a241-0a5ee6eceb83': ('DAN-2024-135', 'FRANCISCO FATOU', '26', None),
    '4f8ab9a8-e413-4518-953b-45dfd8b21b45': ('DAN-2025-277', 'CAÑADA', '6', None),
    'aa580aa0-0783-4e1e-88c4-f6f21401ecf2': ('DAN-2026-060', 'FERROVIARIOS', '9', None),
    'bb2f49f1-6d14-4e5a-9a32-b03fc12241e8': ('DAN-2025-079', 'SANTA CRUZ DE MARCENADO', '1', 'D'),
    '9f3502c9-f1a3-4eb5-bae5-dfde74dc2389': ('DAN-2025-079', 'SANTA CRUZ DE MARCENADO', '1', 'E'),
}

ops = {o['codigo']: o for o in b.leer('oportunidades?select=id,codigo,nombre,estado,comunidad_id&estado=neq.anulada&order=codigo')}
acc = {a['id']: a for a in b.leer('accesos?select=id,municipio,tipo_via,nombre_via,numero,escalera,ficha_catastro_portal_id,figura_legal_propietaria_id&order=id')}
rel = collections.defaultdict(list)
for r in b.leer('relacion_oportunidad_accesos?select=opp_id,acceso_id&hasta=is.null&order=opp_id'): rel[r['opp_id']].append(acc[r['acceso_id']])
munis = {m['nombre']: m for m in b.leer('municipios_catastro?select=id,nombre,provincia')}


def preguntar(muni, sigla, calle, numero):
    M = munis.get(muni) or munis[{'SAN LORENZO DEL ESCORIAL': 'SAN LORENZO DE EL ESCORIAL'}.get(muni, muni)]
    q = urllib.parse.urlencode({'Provincia': M['provincia'], 'Municipio': M['nombre'], 'Sigla': sigla, 'Calle': calle, 'Numero': numero,
                                'Bloque': '', 'Escalera': '', 'Planta': '', 'Puerta': ''})
    d = json.loads(C.pedir(C.OVC + '/Consulta_DNPLOC?' + q)).get('consulta_dnplocResult') or {}
    fincas = C.lista((d.get('lrcdnp') or {}).get('rcdnp')) or C.lista((d.get('bico') or {}).get('bi'))
    return sorted({C.parcela_de(f) for f in fincas if C.parcela_de(f)})


# 1. Catastro: dónde está cada portal que falta
plan = []  # (opp, parcela, números)
for cod, trozos in ({} if '--desde-comunidades' in sys.argv else FALTAN).items():
    o = ops[cod]; suyos = rel[o['id']]
    for muni, sigla, calle, nums in trozos:
        muni = muni or suyos[0]['municipio']
        if calle and not sigla:
            cand = C.candidatas(munis[muni]['id'], calle)
            if len(cand) != 1: print('  %s: %d calles para %s' % (cod, len(cand), calle)); continue
            sigla, calle = cand[0]['tipo_via'], cand[0]['busqueda']
        if not calle: sigla, calle = suyos[0]['tipo_via'], suyos[0]['nombre_via']
        for n in nums:
            try: pcs = preguntar(muni, sigla, calle, n)
            except Exception as e: print('  %s %s %s %s: %s' % (cod, sigla, calle, n, e)); continue
            print('%-13s %s %s %s %s -> %s' % (cod, muni, sigla, calle, n, ', '.join(pcs) or 'NO EXISTE'))
            if len(pcs) == 1: plan.append((cod, pcs[0], n))

if not ESCRIBIR:
    print('\n(solo lectura; con --escribir se aplica)'); sys.exit()

DESDE5 = '--desde-comunidades' in sys.argv  # el 409 del primer borrado (Príncipes 17 tenía su presidenta): se retoma aquí
if DESDE5: plan = []
# 2. bajar fichas y enlazar (como la app: el acceso se reutiliza; su titular, la comunidad de la opp)
def enlazar(o, muni, p, parcela, nota=NOTA):
    a = C.upsert('accesos', [{'municipio': muni, 'tipo_via': p['tipo_via'] or '', 'nombre_via': p['nombre_via'] or '', 'numero': p['numero'],
                              'escalera': p['escalera'] or '', 'ref_catastral': parcela, 'ficha_catastro_portal_id': p['id']}],
                 'municipio,tipo_via,nombre_via,numero,escalera')[0]
    if not a.get('figura_legal_propietaria_id') and o['comunidad_id']:
        b.actualizar('accesos?id=eq.%s&figura_legal_propietaria_id=is.null' % a['id'], {'figura_legal_propietaria_id': o['comunidad_id']})
    r = b.leer('relacion_oportunidad_accesos?select=hasta&opp_id=eq.%s&acceso_id=eq.%s' % (o['id'], a['id']), False)
    if not r: b.insertar('relacion_oportunidad_accesos', [{'opp_id': o['id'], 'acceso_id': a['id'], 'de_donde': nota}])
    elif r[0]['hasta']: b.actualizar('relacion_oportunidad_accesos?opp_id=eq.%s&acceso_id=eq.%s' % (o['id'], a['id']), {'hasta': None})
    return a

fichas_bajadas = {}
for cod, parcela, n in plan:
    if parcela not in fichas_bajadas: fichas_bajadas[parcela] = C.guardar_ficha(parcela)
    muni, portales = fichas_bajadas[parcela]
    for p in [p for p in portales if p['numero'] == n]:
        enlazar(ops[cod], muni, p, parcela); print('enlazado', cod, p['nombre_via'], p['numero'], p['escalera'] or '')

if not DESDE5:
    # Haya 2: el portal bueno es Paseo de la Haya 2 Fuenlabrada; el de Madrid se cierra
    o = ops[HAYA[0]]
    muni, portales = C.guardar_ficha(HAYA[1])
    for p in portales: enlazar(o, muni, p, HAYA[1], 'Paseo de la Haya 2 FUENLABRADA según su ficha de Dropbox, no Madrid (Mónica, 20-oct-2026)')
    for a in rel[o['id']]:
        if a['municipio'] == 'MADRID':
            b.actualizar('relacion_oportunidad_accesos?opp_id=eq.%s&acceso_id=eq.%s' % (o['id'], a['id']), {'hasta': HOY})
    b.actualizar('oportunidades?id=eq.' + o['id'], {'referencia_catastral': HAYA[1]})
    print('Haya 2 -> Fuenlabrada,', len(portales), 'portales')

    # 3. los nombres de Catastro de las tocadas
    # (de nombres_desde_catastro.py solo sus funciones y lo que lee de la base: lo de después decide y escribe)
    fuente = open(os.path.join(AQUI, 'nombres_desde_catastro.py'), encoding='utf-8').read()
    N = {'__file__': os.path.join(AQUI, 'nombres_desde_catastro.py')}
    exec(fuente[:fuente.index('plan, revisar, cuenta, ENLAZAR')].replace('ESCRIBIR = ', 'ESCRIBIR_ = '), N)
    for cod in list(FALTAN) + SOLO_NOMBRE + [HAYA[0], 'ALV-2026-197']:
        o = ops[cod]; suyos = N['rel'].get(o['id'])
        if not suyos or not all(a['ficha_catastro_portal_id'] for a in suyos): print('  sin nombre de Catastro:', cod); continue
        nuevo = N['propuesto'](suyos, o['nombre'])[0]
        if nuevo != o['nombre']:
            b.actualizar('oportunidades?id=eq.' + o['id'], {'nombre': nuevo}); print('%-13s %s  ->  %s' % (cod, o['nombre'], nuevo))
            o['nombre'] = nuevo

    # 4. CP de las opps de Álvaro (como la app, comunidadDeOpp: nombre de la opp y su municipio)
    rel = collections.defaultdict(list)
    acc = {a['id']: a for a in b.leer('accesos?select=id,municipio,tipo_via,nombre_via,numero,escalera,ficha_catastro_portal_id,figura_legal_propietaria_id&order=id')}
    for r in b.leer('relacion_oportunidad_accesos?select=opp_id,acceso_id&hasta=is.null&order=opp_id'): rel[r['opp_id']].append(acc[r['acceso_id']])
    for cod in CP_NUEVA:
        o = ops[cod]; suyos = rel[o['id']]
        if not suyos: print('  sin portales, no se crea CP:', cod); continue
        if any(a['figura_legal_propietaria_id'] for a in suyos): print('  ya tiene titular:', cod); continue
        a0 = suyos[0]
        nombre = o['nombre'] if re.match(r'(?i)^CP\s', o['nombre']) else 'CP ' + o['nombre']
        c = {'id': str(uuid.uuid4())}
        b.insertar('comunidades', [{'id': c['id'], 'nombre': nombre, 'municipio': a0['municipio']}])
        b.insertar('figura_legal_propietaria', [{'id_comodin': c['id'], 'figura': 'Comunidad de Propietarios'}])
        b.actualizar('accesos?id=in.(%s)&figura_legal_propietaria_id=is.null' % ','.join(a['id'] for a in suyos), {'figura_legal_propietaria_id': c['id']})
        b.actualizar('oportunidades?id=eq.' + o['id'], {'comunidad_id': c['id'], 'comunidad_provisional': None})
        print('CP creada', cod, nombre)

rel = collections.defaultdict(list)
acc = {a['id']: a for a in b.leer('accesos?select=id,municipio,tipo_via,nombre_via,numero,escalera,ficha_catastro_portal_id,figura_legal_propietaria_id&order=id')}
for r in b.leer('relacion_oportunidad_accesos?select=opp_id,acceso_id&hasta=is.null&order=opp_id'): rel[r['opp_id']].append(acc[r['acceso_id']])

# 5. comunidades sueltas
for cid, (cod, calle, num, esc) in TITULAR.items():
    o = ops[cod]
    ps = [a for a in rel[o['id']] if calle in a['nombre_via'] and a['numero'] == num and (esc is None or (a['escalera'] or '') == esc)]
    if len(ps) != 1: print('  %s: %d portales para %s %s %s, no se toca' % (cod, len(ps), calle, num, esc)); continue
    if not b.leer('figura_legal_propietaria?select=id_comodin&id_comodin=eq.' + cid, False):
        b.insertar('figura_legal_propietaria', [{'id_comodin': cid, 'figura': 'Comunidad de Propietarios'}])
    b.actualizar('accesos?id=eq.' + ps[0]['id'], {'figura_legal_propietaria_id': cid})
    print('titular de su portal:', cod, calle, num, esc or '')
for cid, por in BORRAR.items():
    b.borrar('figura_legal_propietaria?id_comodin=eq.' + cid)
    b.borrar('comunidades?id=eq.' + cid)
    print('borrada:', por)

