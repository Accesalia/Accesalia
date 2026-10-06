# -*- coding: utf-8 -*-
import csv, io, re, sys, unicodedata
sys.path.insert(0, 'scripts')
from produccion import arrancar
b = arrancar()
BARRA = chr(92)

def limpio(s):
    s = unicodedata.normalize('NFKD', s or '')
    return ''.join(c for c in s if not unicodedata.combining(c)).lower()

GEN = r'(cdad|prop|comunidad|propietarios|calle|avda|avenida|paseo|plaza|carretera)'
def letras(s, muni=None):
    """Las letras pegadas, sin acentos, sin el municipio ni las palabras de cortesia.
       En las carpetas las palabras van pegadas ('dosdemayo28'), asi que comparar
       por tokens no vale: se comparan las letras seguidas."""
    t = limpio(s)
    if muni:
        t = t.replace(limpio(muni), ' ')
    t = re.sub(r'\b' + GEN + r'\b', ' ', t)
    # NO se quitan los articulos: 'CASTILLA LA NUEVA', 'LOS ANGELES' y 'LA VEGA'
    # los llevan dentro del nombre de la calle; quitarlos rompe el cotejo.
    t = re.sub(r'\b(cl|av|pz|ps|ctra|n|no|num|esc|escalera|portal|fase|bloque|bis|ed|edificio)\b', ' ', t)
    return re.sub(r'[^a-z]', '', t)

numeros = lambda s: set(re.findall(r'\d+', limpio(s)))

# LOS MUNICIPIOS NO SE ESCRIBEN A MANO AQUI (5-oct-2026). Estaban fijos
# -ALCORCON, ALCOBENDAS, FUENLABRADA- y al correrlo para Mostoles se llevo por
# delante las 286 filas de Leganes y no metio ninguna de Mostoles. Este fichero
# lo rehace entero cada vez, asi que tiene que mirar TODO lo que haya leido.
import glob, os, sys
municipios = [a.upper() for a in sys.argv[1:] if not a.startswith('-')]
if not municipios:
    municipios = sorted(os.path.basename(x)[7:-4].upper().replace('_', ' ')
                        for x in glob.glob('fichas_*.csv'))
fichas = {}
for m in municipios:
    p = 'fichas_%s.csv' % m.lower().replace(' ', '_')
    if not os.path.exists(p):
        continue
    for f in csv.DictReader(io.open(p, encoding='utf-8')):
        fichas[(m, f['carpeta'])] = f
print('cotejando: %s' % ', '.join(sorted({k[0] for k in fichas})))
clon = {(c['municipio'], c['carpeta']) for c in
        b.leer('comunidades_fuera_de_lista_provisional_hasta_revisar_una_a_una?select=municipio,carpeta')}
ya = set()
for d in b.leer('documentos?select=origen_ruta_dropbox&origen_ruta_dropbox=not.is.null'):
    p = (d['origen_ruta_dropbox'] or '').replace('/', BARRA).split(BARRA)
    if len(p) >= 4 and p[1].upper() == '1APROVINCIA':
        ya.add((p[2].upper(), p[3]))
pend = sorted(k for k in fichas if k not in clon and k not in ya)

# La lista de municipios estaba fija AQUI TAMBIEN, y es la que de verdad rompia
# Mostoles: sin sus comunidades no hay contra que cotejar. Se piden las de los
# municipios que se esten leyendo, sean los que sean.
# Los municipios con espacios -SAN SEBASTIAN DE LOS REYES- rompian la URL, asi
# que la lista va codificada.
from urllib.parse import quote
coms = b.leer('comunidades?select=id,nombre,municipio&municipio=in.(%s)'
              % quote(','.join('"%s"' % m for m in sorted({k[0] for k in fichas}))), por_tramos=True)
con_opp = {o['comunidad_id'] for o in b.leer('oportunidades?select=comunidad_id&comunidad_id=not.is.null', por_tramos=True)}

ok, dud, nada = [], [], []
for muni, carp in pend:
    lc, nc = letras(carp), numeros(carp)
    cand = []
    for c in coms:
        if c['municipio'] != muni or c['id'] not in con_opp:
            continue
        lo, no = letras(c['nombre'], c['municipio']), numeros(c['nombre'])
        if len(lc) < 4 or len(lo) < 4:
            continue
        pega_letras = lc == lo or (len(lc) >= 6 and lc in lo) or (len(lo) >= 6 and lo in lc)
        # Si los dos lados traen VARIOS numeros, tienen que ser los mismos: con
        # solo intersectar, 'iglesia16portal1' encajaba tambien con el portal 4
        # porque compartian el 16.
        pega_num = ((not nc) or (not no) or nc == no
                    or (len(nc) == 1 and nc <= no) or (len(no) == 1 and no <= nc))
        if pega_letras and pega_num:
            cand.append(c)
    if len(cand) == 1:   ok.append((muni, carp, cand[0]))
    elif cand:           dud.append((muni, carp, cand))
    else:                nada.append((muni, carp))

sys.stdout.write('%d pendientes -> %d cotejadas, %d dudosas, %d sin pareja\n\n' % (len(pend), len(ok), len(dud), len(nada)))
for m, c, x in ok:
    sys.stdout.write('OK      %-11s %-28s %s\n' % (m[:11], c[:28], x['nombre'][:48]))
for m, c, xs in dud:
    sys.stdout.write('DUDOSA  %-11s %-28s %s\n' % (m[:11], c[:28], ' || '.join(x['nombre'][:34] for x in xs[:3])))
for m, c in nada:
    sys.stdout.write('sin par %-11s %s\n' % (m[:11], c[:40]))
with io.open('cotejo_por_direccion.csv','w',encoding='utf-8',newline='') as fh:
    w = csv.writer(fh, delimiter='|'); w.writerow(['estado','municipio','carpeta','comunidad','comunidad_id'])
    for m,c,x in ok:   w.writerow(['ok', m, c, x['nombre'], x['id']])
    for m,c,xs in dud: w.writerow(['dudosa', m, c, ' || '.join(x['nombre'] for x in xs), ''])
    for m,c in nada:   w.writerow(['sin_pareja', m, c, '', ''])
