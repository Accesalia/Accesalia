# Monta la tabla de cruce enviada <-> firmada para que Monica la revise.
import csv, json, glob, os, re, collections, datetime
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

exec(open('cruce.py', encoding='utf-8').read().split('fuentes=collections')[0])  # clave(), fecha(), norm()

tanda = list(csv.reader(open('tanda1.tsv', encoding='utf-8'), delimiter='\t'))
ext = {}
for f in glob.glob('extraido_*.jsonl'):
    for l in open(f, encoding='utf-8'):
        if l.strip():
            d = json.loads(l); ext[d['n']] = d
res = {k: v for k, v in json.load(open('resoluciones_tanda1.json', encoding='utf-8')).items() if not k.startswith('_')}
monday = json.load(open('monday_candidatas.json', encoding='utf-8'))

# Otras versiones del mismo encargo en las carpetas de fuentes ("Modificado ...",
# "modificado tras reunion ...") : misma calle contenida y mismo numero.
fuentes = []
for row in csv.reader(open('fuentes.tsv', encoding='utf-8'), delimiter='\t'):
    nom = row[2].split('/')[-1]; k = clave(nom)
    if k: fuentes.append((k, nom))

def otras_versiones(k, elegido):
    out = []
    for k2, nom in fuentes:
        if k2[1] == k[1] and k[0] <= k2[0] and nom != elegido and re.search(r'modific|v ?2|version', nom, re.I):
            out.append(nom)
    return out


# REGLAS DE MONICA (6-oct-2026), aplicadas al montar; lo extraido en bruto no se toca:
#  1. Subvenciones de accesibilidad y de eficiencia energetica son "subvenciones sin mas".
#  2. La "Documentacion Tecnica Anexa" (IEE, CEE, LEE, comparativa...) es lo que ahora se
#     llama doc tecnica: el importe FIJO de la linea de subvencion (el % es lo de a exito).
SUBV = 'TRAMITACION SUBVENCIONES'
ES_DOC = re.compile(r'doc(umentaci[oó]n)?\.?\s*t[eé]cnica', re.I)
def normalizar(d):
    conc = [dict(c) for c in d.get('conceptos') or []]
    for c in conc:
        if c.get('bloque', '').startswith(SUBV): c['bloque'] = SUBV
    docs = [c for c in conc if c.get('bloque') == 'SIN CASAR' and ES_DOC.search(c.get('texto') or '')]
    subv = next((c for c in conc if c.get('bloque') == SUBV), None)
    for c in docs:
        if subv is not None:
            if c.get('importe') is not None and subv.get('importe') is None:
                subv['importe'] = c['importe']
            conc.remove(c)          # su contenido va dentro de la subvencion
        else:
            c['bloque'] = SUBV; subv = c
    d = dict(d); d['conceptos'] = conc
    return d

def cabecera(n):
    p = f'textos/{n}.txt'
    if not os.path.exists(p): return {}
    l = open(p, encoding='utf-8').readline()
    if not l.startswith('#DRIVE_ID='): return {}
    return dict(x.lstrip('#').split('=', 1) for x in l.strip().split('\t') if '=' in x)

def codigo_previo(n):
    p = f'textos/{n}.txt'
    if not os.path.exists(p): return None
    m = re.findall(r'(?<![0-9])(20[0-9][0-9]/[0-9][0-9]/[0-9]{3})(?![0-9])', open(p, encoding='utf-8').read())
    return ', '.join(dict.fromkeys(m)) or None

def eur(x):
    return None if x is None else float(x)

wb = Workbook()
ws = wb.active; ws.title = 'Cruce'
cols = ['N', 'Estado propuesto', 'Por qué', 'Fecha recibida (firmada)', 'Fecha de la hoja (enviada)',
        'Dirección (en la hoja)', 'A quién', 'Qué se hace', 'Sin casar (qué se hace)', 'Conceptos',
        'Total base (sin IVA)', 'Forma de pago',
        'Firmada (fichero)', 'Enviada (documento)', 'Enviada: carpeta', 'Enviada: última modificación',
        'Otras versiones en la carpeta', 'Notas de la lectura', 'Código HE', 'Opp', 'TU DECISIÓN']
ws.append(cols)
wc = wb.create_sheet('Conceptos')
wc.append(['N', 'Dirección', 'Concepto (texto de la hoja)', 'Bloque del catálogo', 'Importe base', '% a éxito', 'Incluido (no se cobra aparte)', 'Forma de pago'])

cuenta = collections.Counter()
usos = collections.Counter(e for _, _, e in tanda)
for i, (frec, firm, env) in enumerate(tanda):
    n = f'{i:03d}'; d = normalizar(ext[n]) if n in ext else {}; cab = cabecera(n)
    firm_nom = firm.split('/')[-1]; env_nom = cab.get('TITULO') or env.split('/')[-1]
    k = clave(firm_nom)
    motivos = []
    if re.search(r'no vale|anulad|cancelad', firm_nom, re.I): estado = 'APARTAR'; motivos.append('la firmada se llama "no vale/anulado"')
    elif not d or d.get('rarezas') == 'sin texto': estado = 'APARTAR'; motivos.append('enviada sin texto')
    else: estado = None
    fh = d.get('fecha_hoja')
    if fh and fh > frec: motivos.append('la hoja es POSTERIOR a la firmada')
    # La vigencia de 3 meses NO se tiene en cuenta (Monica): no se avisa del tiempo entre hoja y firma.
    mod = cab.get('MODIFICADO', '')[:10]
    if mod and mod > frec: motivos.append('el documento se tocó DESPUÉS de llegar firmada')
    ov = otras_versiones(k, env.split('/')[-1]) if k else []
    if ov: motivos.append('hay otra versión en la carpeta')
    if usos[env] > 1: motivos.append(f'la misma enviada sirve a {usos[env]} firmadas')
    cand = monday.get(n, [])
    PROBLEMA = r'duplicad|dos hojas|otra propuesta|no cuadra|copiad|errata|aunque el edificio|no es una hoja|ilegible|tachad|alternativ|anulad|otra comunidad|de otra'
    if d.get('rarezas') and re.search(PROBLEMA, d['rarezas'], re.I): motivos.append('la lectura avisa de algo raro')
    if any(c.get('bloque') == 'SIN CASAR' for c in d.get('conceptos') or []) or d.get('que_se_hace_sin_casar'):
        motivos.append('concepto sin casar con el catálogo')
    if not estado: estado = 'REVISAR' if motivos else 'OK'
    # Lo resuelto leyendo manda sobre lo automatico.
    r = res.get(n)
    if r:
        estado = r['estado']
        motivos = ['RESUELTO LEYENDO: ' + r['nota']] if r.get('nota') else []
        if r['estado'] == 'PREGUNTA': motivos = ['PARA TI: ' + r['nota']]
        for campo in ('fecha_hoja', 'total_base', 'a_quien'):
            if campo in r: d = dict(d); d[campo] = r[campo]
        fh = d.get('fecha_hoja')
    cuenta[estado] += 1
    conc = d.get('conceptos') or []
    txt_conc = '\n'.join(
        f"{c['bloque']}: " + (f"{c['importe']:g} €" if c.get('importe') is not None else f"{c['pct_exito']:g}% a éxito" if c.get('pct_exito') else 'incluido' if c.get('incluido') else 'sin precio propio')
        for c in conc)
    mon = '\n'.join(f"{c['desc']} · {c['estado']} · {c['fecha']} · id {c['id'][:8]}" for c in cand)
    ws.append([n, estado, '; '.join(motivos), frec, fh, d.get('direccion'), d.get('a_quien'),
               ', '.join(d.get('que_se_hace') or []), ', '.join(d.get('que_se_hace_sin_casar') or []),
               txt_conc, eur(d.get('total_base')), d.get('forma_pago_general'),
               firm_nom, env_nom, env.split('/')[0], mod, '\n'.join(ov), d.get('rarezas'),
               'se asigna al final, con todas', '', ''])
    for c in conc:
        wc.append([n, d.get('direccion'), c.get('texto'), c.get('bloque'), eur(c.get('importe')), c.get('pct_exito'), 'sí' if c.get('incluido') else '', c.get('forma_pago')])

# formato
color = {'OK': 'DCEFC8', 'REVISAR': 'FFF2CC', 'PREGUNTA': 'FFD966', 'APARTAR': 'F4CCCC', 'ANULADA': 'D9D9D9'}
for hoja, anchos in ((ws, [5, 11, 40, 12, 12, 30, 18, 20, 18, 42, 12, 40, 45, 45, 22, 14, 35, 50, 14, 10, 30]),
                     (wc, [5, 30, 45, 30, 12, 9, 12, 45])):
    for j, a in enumerate(anchos, 1):
        hoja.column_dimensions[get_column_letter(j)].width = a
    for c in hoja[1]:
        c.font = Font(bold=True, color='FFFFFF'); c.fill = PatternFill('solid', fgColor='2B2B2B')
        c.alignment = Alignment(wrap_text=True, vertical='center')
    hoja.freeze_panes = 'B2'; hoja.auto_filter.ref = hoja.dimensions
    for fila in hoja.iter_rows(min_row=2):
        for c in fila: c.alignment = Alignment(wrap_text=True, vertical='top')
for fila in ws.iter_rows(min_row=2):
    fila[1].fill = PatternFill('solid', fgColor=color[fila[1].value])
    fila[20].fill = PatternFill('solid', fgColor='EAF4FF')
salida = '../docs/cruce_hojas_tanda1.xlsx'
wb.save(salida)
print(dict(cuenta), 'extraidas', len(ext), '->', salida)
