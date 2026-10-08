# Ficheros de las hojas volcadas al ALMACEN (Monica, 8-oct-2026), como los guarda la app:
#   documentos-comerciales/hojas-encargo/<hoja>/hoja-v<N>-<version8>.pdf       el enviado
#   documentos-comerciales/hojas-encargo/<hoja>/firmada-v<N>-<k>-<version8>.pdf  cada firmado
# y la version apunta a ellos ("almacen:<almacen>/<ruta>"): url_pdf_hoja y pdfs_firmados.
# Enviado: el PDF que hubiera en la carpeta; si no, el Word pasado a PDF (pdf_convertidos/);
# si no, el Google Doc exportado (google_docs/<id>.pdf, cuando lo tengamos). Si no hay nada,
# la version se queda con su enlace de Drive. Reanudable: sube con reemplazo.
import sys, json, os
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base

ALMACEN = 'documentos-comerciales'
B = 'G:/Mi unidad/MONICA ACCESALIA/PRESUPUESTOS/'
ids = json.load(open('volcado_ids.json', encoding='utf-8'))
word = json.load(open('pdf_convertidos/mapa.json', encoding='utf-8'))
url_drive = {v['id']: v['url_pdf_hoja'] for v in base.leer('versiones_hoja?select=id,url_pdf_hoja')}

def pdf_enviado(v):
    for f in v['enviados']:
        if f.lower().endswith('.pdf') and os.path.exists(B + f): return B + f
    for f in v['enviados']:
        if f in word and os.path.exists(word[f]): return word[f]
    u = url_drive.get(v['version_id']) or ''
    if '/document/d/' in u:
        p = 'google_docs/' + u.rsplit('/', 1)[-1] + '.pdf'
        if os.path.exists(p): return p
    return None

cuenta = {'enviado': 0, 'enviado sin fichero': 0, 'firmados': 0, 'firmado no esta': []}
for cod, h in ids.items():
    for v in h['versiones']:
        cambios, v8 = {}, v['version_id'][:8]
        p = pdf_enviado(v)
        if p:
            ruta = f"hojas-encargo/{h['hoja_id']}/hoja-v{v['numero']}-{v8}.pdf"
            base.subir(ALMACEN, ruta, open(p, 'rb').read(), reemplazar=True)
            cambios['url_pdf_hoja'] = f'almacen:{ALMACEN}/{ruta}'; cuenta['enviado'] += 1
        else:
            cuenta['enviado sin fichero'] += 1
        firm = []
        for k, f in enumerate(v['firmados'], 1):
            if not os.path.exists(B + f): cuenta['firmado no esta'].append(f); continue
            ruta = f"hojas-encargo/{h['hoja_id']}/firmada-v{v['numero']}-{k}-{v8}.pdf"
            base.subir(ALMACEN, ruta, open(B + f, 'rb').read(), reemplazar=True)
            firm.append(f'almacen:{ALMACEN}/{ruta}'); cuenta['firmados'] += 1
        if firm: cambios['pdfs_firmados'] = firm
        if cambios: base.actualizar(f"versiones_hoja?id=eq.{v['version_id']}", cambios)
print(json.dumps(cuenta, ensure_ascii=False, indent=1))
