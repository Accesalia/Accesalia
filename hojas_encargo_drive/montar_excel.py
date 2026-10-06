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
        'Total base (sin IVA)', 'Forma de pago', 'Hoja de Monday que completa', 'Monday: candidatas',
        'Firmada (fichero)', 'Enviada (documento)', 'Enviada: carpeta', 'Enviada: última modificación',
        'Otras versiones en la carpeta', 'Notas de la lectura', 'Código que ya trae la hoja', 'Código HE', 'Opp', 'TU DECISIÓN']
ws.append(cols)
wc = wb.create_sheet('Conceptos')
wc.append(['N', 'Dirección', 'Concepto (texto de la hoja)', 'Bloque del catálogo', 'Importe base', '% a éxito', 'Incluido (no se cobra aparte)', 'Forma de pago'])

cuenta = collections.Counter()
usos = collections.Counter(e for _, _, e in tanda)
for i, (frec, firm, env) in enumerate(tanda):
    n = f'{i:03d}'; d = ext.get(n, {}); cab = cabecera(n)
    firm_nom = firm.split('/')[-1]; env_nom = cab.get('TITULO') or env.split('/')[-1]
    k = clave(firm_nom)
    motivos = []
    if re.search(r'no vale|anulad|cancelad', firm_nom, re.I): estado = 'APARTAR'; motivos.append('la firmada se llama "no vale/anulado"')
    elif not d or d.get('rarezas') == 'sin texto': estado = 'APARTAR'; motivos.append('enviada sin texto')
    else: estado = None
    fh = d.get('fecha_hoja')
    if fh and fh > frec: motivos.append('la hoja es POSTERIOR a la firmada')
    if fh and frec and (datetime.date.fromisoformat(frec) - datetime.date.fromisoformat(fh)).days > 180:
        motivos.append('más de 6 meses entre hoja y firma')
    mod = cab.get('MODIFICADO', '')[:10]
    if mod and mod > frec: motivos.append('el documento se tocó DESPUÉS de llegar firmada')
    ov = otras_versiones(k, env.split('/')[-1]) if k else []
    if ov: motivos.append('hay otra versión en la carpeta')
    if usos[env] > 1: motivos.append(f'la misma enviada sirve a {usos[env]} firmadas')
    cand = monday.get(n, [])
    if len(cand) != 1: motivos.append(f'{len(cand)} hojas de Monday en esa dirección')
    PROBLEMA = r'duplicad|dos hojas|otra propuesta|no cuadra|copiad|errata|aunque el edificio|no es una hoja|ilegible|tachad|alternativ|anulad|otra comunidad|de otra'
    if d.get('rarezas') and re.search(PROBLEMA, d['rarezas'], re.I): motivos.append('la lectura avisa de algo raro')
    if any(c.get('bloque') == 'SIN CASAR' for c in d.get('conceptos') or []) or d.get('que_se_hace_sin_casar'):
        motivos.append('concepto sin casar con el catálogo')
    if not estado: estado = 'REVISAR' if motivos else 'OK'
    cuenta[estado] += 1
    conc = d.get('conceptos') or []
    txt_conc = '\n'.join(
        f"{c['bloque']}: " + (f"{c['importe']:g} €" if c.get('importe') is not None else f"{c['pct_exito']:g}% a éxito" if c.get('pct_exito') else 'incluido' if c.get('incluido') else 'sin precio propio')
        for c in conc)
    mon = '\n'.join(f"{c['desc']} · {c['estado']} · {c['fecha']} · id {c['id'][:8]}" for c in cand)
    ws.append([n, estado, '; '.join(motivos), frec, fh, d.get('direccion'), d.get('a_quien'),
               ', '.join(d.get('que_se_hace') or []), ', '.join(d.get('que_se_hace_sin_casar') or []),
               txt_conc, eur(d.get('total_base')), d.get('forma_pago_general'), mon, len(cand),
               firm_nom, env_nom, env.split('/')[0], mod, '\n'.join(ov), d.get('rarezas'), codigo_previo(n),
               'se asigna al final, con todas', '', ''])
    for c in conc:
        wc.append([n, d.get('direccion'), c.get('texto'), c.get('bloque'), eur(c.get('importe')), c.get('pct_exito'), 'sí' if c.get('incluido') else '', c.get('forma_pago')])

# formato
color = {'OK': 'DCEFC8', 'REVISAR': 'FFF2CC', 'APARTAR': 'F4CCCC'}
for hoja, anchos in ((ws, [5, 11, 40, 12, 12, 30, 18, 20, 18, 42, 12, 40, 42, 8, 45, 45, 22, 14, 35, 50, 14, 14, 10, 30]),
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
    fila[23].fill = PatternFill('solid', fgColor='EAF4FF')
salida = 'cruce_hojas_tanda1.xlsx'
wb.save(salida)
print(dict(cuenta), 'extraidas', len(ext), '->', salida)
