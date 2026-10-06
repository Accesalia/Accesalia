# Prepara un año: indice de enviadas de las claras, sus textos (Word/PDF del disco), la
# lista de Google Docs a copiar y los lotes de dudosas para leer.  python preparar_anio.py 2023
import json, subprocess, sys, docx
A = sys.argv[1]; Y = A[2:]
s = json.load(open(f'anio{A}_parejas.json', encoding='utf-8'))
for i, x in enumerate(s): x['d'] = f'Y{Y}_{i:03d}'
json.dump(s, open(f'anio{A}_parejas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
env = sorted({e for x in s if x['caso'] == 'clara' for e in x['elegidas']})
idx = {e: f'A{Y}_{i:03d}' for i, e in enumerate(env)}
json.dump(idx, open(f'anio{A}_indice.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
B = 'G:/Mi unidad/MONICA ACCESALIA/PRESUPUESTOS/'
import os; os.makedirs(f'textos{A}', exist_ok=True)
gd, loc, mal = [], [], []
for e, n in idx.items():
    ext = e.rsplit('.', 1)[-1].lower(); out = f'textos{A}/{n}.txt'
    try:
        if ext == 'docx':
            d = docx.Document(B + e); p = [q.text for q in d.paragraphs]
            for t in d.tables:
                for r in t.rows: p.append(' | '.join(c.text.strip() for c in r.cells))
            open(out, 'w', encoding='utf-8').write('\n'.join(p)); loc.append(n)
        elif ext == 'pdf':
            open(out, 'w', encoding='utf-8').write(subprocess.run(['pdftotext', '-layout', B + e, '-'], capture_output=True).stdout.decode('utf-8', 'ignore')); loc.append(n)
        elif ext == 'gdoc': gd.append((n, '', e.split('/')[-1][:-5]))
        else: mal.append(e)
    except Exception as ex: mal.append((e, str(ex)[:50]))
with open(f'lote{A}_gdoc.tsv', 'w', encoding='utf-8', newline='') as fh:
    for n, i, t in gd: fh.write(f'{n}\t{i}\t{t}\n')
open(f'lote{A}_ext.txt', 'w').write(' '.join(loc))
dud = [{'d': x['d'], 'firmada': x['firmada'], 'recibida': x['recibida'], 'candidatas': x['candidatas']} for x in s if x['caso'] in ('dudosa', 'sin_clave')]
for k in range(3): json.dump(dud[k::3], open(f'lote{A}_dud_{k}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(A, 'enviadas', len(env), 'locales', len(loc), 'gdocs', len(gd), 'problemas', mal, 'dudosas', len(dud))
