# Tras leer las dudosas de un año: añade al indice sus enviadas, saca los textos del disco y
# deja la lista de Google Docs a copiar.  python preparar_dudosas_anio.py 2023
import json, glob, subprocess, sys, docx
A = sys.argv[1]; Y = A[2:]
idx = json.load(open(f'anio{A}_indice.json', encoding='utf-8'))
res = [json.loads(l) for f in sorted(glob.glob(f'dud{A}_resueltas_*.jsonl')) for l in open(f, encoding='utf-8')]
nuevas = sorted({e for r in res if r['decision'] == 'pareja' for e in r['elegidas'] if e not in idx})
n0 = len(idx)
for i, e in enumerate(nuevas): idx[e] = f'A{Y}_{n0 + i:03d}'
json.dump(idx, open(f'anio{A}_indice.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
B = 'G:/Mi unidad/MONICA ACCESALIA/PRESUPUESTOS/'; gd, loc = [], []
for e in nuevas:
    n = idx[e]
    if e.startswith('drive:'):
        i, t = e[6:].split('|', 1); gd.append((n, i, t)); continue
    ext = e.rsplit('.', 1)[-1].lower(); out = f'textos{A}/{n}.txt'
    if ext == 'docx':
        d = docx.Document(B + e); p = [q.text for q in d.paragraphs]
        for t in d.tables:
            for r in t.rows: p.append(' | '.join(c.text.strip() for c in r.cells))
        open(out, 'w', encoding='utf-8').write('\n'.join(p)); loc.append(n)
    elif ext == 'pdf':
        open(out, 'w', encoding='utf-8').write(subprocess.run(['pdftotext', '-layout', B + e, '-'], capture_output=True).stdout.decode('utf-8', 'ignore')); loc.append(n)
    elif ext == 'gdoc': gd.append((n, '', e.split('/')[-1][:-5]))
with open(f'lote{A}_gdoc_dud.tsv', 'w', encoding='utf-8', newline='') as fh:
    for n, i, t in gd: fh.write(f'{n}\t{i}\t{t}\n')
open(f'lote{A}_ext_dud.txt', 'w').write(' '.join(loc))
print(A, 'nuevas', len(nuevas), 'locales', len(loc), 'gdocs', len(gd))
