# -*- coding: utf-8 -*-
"""Las observaciones de la COMUNIDAD (observaciones_expediente: 2.670, volcadas de las fichas de Dropbox en julio y el
4-oct) al DIARIO DE SU OPP (notas_oportunidad). «De la comunidad SOLO cuelgan sus datos, lo demás NO CUELGA JAMÁS de la
comunidad» (Mónica, 20-oct-2026). 2.087 ya estaban en el diario (el volcado de las fichas por opp); pasan las que faltan.

  De qué opp es cada una:
    1. la comunidad tiene UNA opp viva (no anulada)            -> esa
    2. tiene varias: donde acabaron en el diario las otras notas del MISMO proyecto o de la MISMA ficha, si es una sola
    3. lo demás -> al Excel de Mónica (docs/opps/observaciones_sin_opp.xlsx), no se escribe
  Ya en el diario = el mismo texto (sin espacios ni mayúsculas) o dentro de otra nota más larga, en una opp de su
  comunidad (ver ya()).

  python scripts/opps/observaciones_al_diario.py              -> en seco: cuenta y Excel de lo que entraría
  python scripts/opps/observaciones_al_diario.py --escribir   -> lo escribe en el diario
"""
import sys, os, re, collections
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from produccion import arrancar  # noqa: E402
from openpyxl import Workbook  # noqa: E402
from openpyxl.styles import Font, PatternFill, Alignment  # noqa: E402

ESCRIBIR = '--escribir' in sys.argv
RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..')
b = arrancar()
clave = lambda t: re.sub(r'\s+', '', (t or '').lower())

ops = {o['id']: o for o in b.leer('oportunidades?select=id,codigo,nombre,estado,comunidad_id&estado=neq.anulada&order=id')}
por_com = collections.defaultdict(list)
for o in ops.values():
    if o['comunidad_id']: por_com[o['comunidad_id']].append(o)
coms = {c['id']: c['nombre'] for c in b.leer('comunidades?select=id,nombre&order=id')}
diario = collections.defaultdict(set)   # opp -> claves (texto entero y sus 60 primeras)
enteros = collections.defaultdict(list)  # opp -> textos enteros, para «ya está dentro de otra nota más larga»
for n in b.leer('notas_oportunidad?select=oportunidad_id,texto&order=id'):
    k = clave(n['texto']); diario[n['oportunidad_id']].update({k, 'p:' + k[:60]}); enteros[n['oportunidad_id']].append(k)
# Las comunidades SIN opp que son titulares de un portal en una opp (las de las opps conjuntas: Paular 2, Fatou 26...)
acc_fig = {a['id']: a['figura_legal_propietaria_id'] for a in b.leer('accesos?select=id,figura_legal_propietaria_id&figura_legal_propietaria_id=not.is.null&order=id')}
for r in b.leer('relacion_oportunidad_accesos?select=opp_id,acceso_id&hasta=is.null&order=opp_id'):
    c = acc_fig.get(r['acceso_id'])
    if c and r['opp_id'] in ops and ops[r['opp_id']]['comunidad_id'] != c and ops[r['opp_id']] not in por_com[c]: por_com[c].append(ops[r['opp_id']])
# Monte 89 Algete: la comunidad suelta es la vivienda del particular de DAN-2023-217 («es la opp del particular, no hay otra», Mónica, 20-oct)
por_com['36e6cd86-ae00-4de7-b3b0-58dbbefbfb15'] = [o for o in ops.values() if o['codigo'] == 'DAN-2023-217']
obs = b.leer('observaciones_expediente?select=id,comunidad_id,proyecto_id,ficha_ref,fecha,texto,autor,fase,orden&order=id')


def ya(k, e):
    """la nota k ya está en la del diario e: igual, dentro de ella, o e casi entera (90 %) dentro de k o con su mismo
    principio. Si la del diario es más corta, k trae algo más y NO está («MONICA ENVIA PRESUPUESTO?» no cubre
    «MONICA ENVIA PRESUPUESTO? 30/03/23 hoja de encargo firmada»)."""
    if k == e or (len(k) >= 15 and k in e): return True
    return len(e) >= 0.9 * len(k) and ((len(e) >= 15 and e in k) or k[:60] == e[:60])


def donde_esta(x):
    """las opps de su comunidad en cuyo diario ya está esta nota"""
    k = clave(x['texto'])
    return [o['id'] for o in por_com.get(x['comunidad_id'], []) if any(ya(k, e) for e in enteros[o['id']])]


# a qué opp fueron las notas de cada proyecto / ficha que sí estaban en el diario
fue = collections.defaultdict(set)
for x in obs:
    d = donde_esta(x)
    if len(d) == 1:
        for g in ('p:%s' % x['proyecto_id'] if x['proyecto_id'] else None, 'f:%s' % x['ficha_ref'] if x['ficha_ref'] else None):
            if g: fue[g].add(d[0])

# Las 3 que decidió Mónica (20-oct): Alfonso XII 18 -> la de 2023 (la nota es del 12-ene-2023 y la opp se abre el 13);
# Julián Besteiro -> «la de 2025»; Quintana 9 -> «la de 286».
DECIDIDAS = {'CP ALFONSO XII 18 MOSTOLES': 'DAN-2023-316', 'CP JULIAN BESTEIRO 15G MADRID': 'CAR-2025-007', 'CP QUINTANA 9 MADRID': 'DAN-2024-286'}
entran, dudas, cuenta = [], [], collections.Counter()
for x in obs:
    if not (x['texto'] or '').strip(): cuenta['vacía'] += 1; continue
    if donde_esta(x): cuenta['ya en el diario'] += 1; continue
    cands = por_com.get(x['comunidad_id'], [])
    if len(cands) == 1: entran.append((x, cands[0], 'su comunidad tiene una sola opp')); continue
    pista = set()
    for g in ('p:%s' % x['proyecto_id'] if x['proyecto_id'] else None, 'f:%s' % x['ficha_ref'] if x['ficha_ref'] else None):
        if g: pista |= fue.get(g, set())
    if len(pista) == 1 and ops[next(iter(pista))] in cands:
        entran.append((x, ops[next(iter(pista))], 'las otras notas de su ficha están en el diario de esta opp')); continue
    if coms.get(x['comunidad_id']) in DECIDIDAS:
        entran.append((x, [o for o in cands if o['codigo'] == DECIDIDAS[coms[x['comunidad_id']]]][0], 'la decidió Mónica')); continue
    dudas.append((x, cands, 'su comunidad no tiene opp' if not cands else 'su comunidad tiene %d opps' % len(cands)))
for _, _, como in entran: cuenta['entra: ' + como] += 1
for _, _, por in dudas: cuenta['a Mónica: ' + ('sin opp' if 'no tiene' in por else 'varias opps')] += 1
for k, v in sorted(cuenta.items()): print('%5d  %s' % (v, k))

wb = Workbook()
def hoja(titulo, cab, filas, anchos):
    ws = wb.create_sheet(titulo)
    ws.append(cab)
    for c in ws[1]: c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor='3D3D3D')
    for f in filas: ws.append(f)
    for i, w in enumerate(anchos):
        ws.column_dimensions[chr(65 + i)].width = w
    for r in ws.iter_rows(min_row=2):
        for c in r: c.alignment = Alignment(wrap_text=True, vertical='top')
    ws.freeze_panes = 'A2'
hoja('Entran en el diario', ['Opp', 'Nombre', 'Fecha', 'Nota', 'Por qué esta opp'],
     [[o['codigo'], o['nombre'], x['fecha'], x['texto'], como] for x, o, como in sorted(entran, key=lambda e: (e[1]['codigo'], e[0]['fecha'] or ''))],
     [14, 34, 11, 80, 30])
hoja('Para Mónica', ['Comunidad', 'Opps posibles', 'Fecha', 'Nota', 'Por qué', 'Tu decisión (código de opp)'],
     [[coms.get(x['comunidad_id'], ''), '\n'.join('%s %s (%s)' % (o['codigo'], o['nombre'], o['estado']) for o in cands), x['fecha'], x['texto'], por, '']
      for x, cands, por in sorted(dudas, key=lambda d: (coms.get(d[0]['comunidad_id'], ''), d[0]['fecha'] or ''))],
     [34, 44, 11, 70, 20, 18])
wb.remove(wb['Sheet'])
destino = os.path.join(RAIZ, 'docs', 'opps', 'observaciones_al_diario_en_seco.xlsx')
wb.save(destino); print(destino)

if not ESCRIBIR:
    print('EN SECO'); sys.exit()
filas = [{'oportunidad_id': o['id'], 'fecha': x['fecha'], 'texto': x['texto'], 'autor': x['autor'], 'origen': 'ficha_dropbox'} for x, o, _ in entran]
print('escritas', b.insertar('notas_oportunidad', filas))
