# REVISION DE LAS FIRMADAS, paso 1: preparar la lectura (Monica, 8-oct-2026). Solo LEE la base.
# Para cada hoja firmada: baja su(s) PDF del almacen, lo casa con el archivo de PRESUPUESTOS
# FIRMADOS por TAMAÑO (el almacen no guarda el nombre), saca las dos fechas y pinta las paginas
# para leerlas:
#   fecha_firma_pdf     = creacion DENTRO del PDF ("no se pudo crear ese pdf sin la firma": la buena)
#   fecha_archivo_drive = creacion del archivo en Drive (si el PDF no trae la suya)
# Deja tmp_revision/<lote>.json (lo que hay hoy en la base, para comparar) y tmp_revision/img/.
#   python preparar_revision.py prueba HE-2026-0781 HE-2026-0231 ...   (solo esas)
#   python preparar_revision.py lote01 --desde 0 --cuantas 40           (por orden de codigo)
import sys, os, json, datetime, urllib.request, collections
import pypdfium2 as pdfium
sys.path.insert(0, '../scripts')
import produccion
base = produccion.arrancar() or produccion.base

LOTE = sys.argv[1]
args = sys.argv[2:]
T = 'tmp_revision'
B = 'G:/Mi unidad/MONICA ACCESALIA/PRESUPUESTOS/PRESUPUESTOS FIRMADOS'
os.makedirs(f'{T}/pdf', exist_ok=True)

hojas = base.leer('hojas_encargo?estado=eq.devuelta_firmada&select=id,numero_hoja,oportunidad_id,fecha_creacion,'
                  'fecha_firma,pagador_tipo,contrata:pagador_contrata_id(nombre),version_firmada_id,descripcion&order=numero_hoja')
if '--desde' in args:
    i = int(args[args.index('--desde') + 1]); n = int(args[args.index('--cuantas') + 1]); hojas = hojas[i:i + n]
else:
    hojas = [h for h in hojas if h['numero_hoja'] in args]
    if len(hojas) != len(args): sys.exit(f'no encuentro alguna: {set(args) - {h["numero_hoja"] for h in hojas}}')
opp = {o['id']: o for o in base.leer('oportunidades?select=id,codigo,nombre,comunidad_provisional')}
bloque = {b['id']: b['codigo'] for b in base.leer('bloques?select=id,codigo')}

# archivos de la carpeta, por tamaño
por_tam = collections.defaultdict(list)
for raiz, _, fs in os.walk(B):
    for f in fs:
        if f.lower().endswith(('.pdf', '.jpg', '.jpeg', '.png')): p = os.path.join(raiz, f); por_tam[os.path.getsize(p)].append(p)

def fecha_pdf(doc):
    c = (doc.get_metadata_dict().get('CreationDate') or '').replace('D:', '')
    try: return datetime.date(int(c[:4]), int(c[4:6]), int(c[6:8])).isoformat()
    except ValueError: return None

def bajar(ruta):
    almacen, camino = ruta.replace('almacen:', '').split('/', 1)
    r = urllib.request.Request(f'{base.url}/storage/v1/object/{almacen}/{camino}', headers=dict(base.cab))
    return urllib.request.urlopen(r).read()

salida = []
for h in hojas:
    cod = h['numero_hoja']
    v = base.leer(f'versiones_hoja?id=eq.{h["version_firmada_id"]}&select=id,fecha_generada,importe_base,forma_pago,pdfs_firmados')[0]
    conc = base.leer(f'conceptos_hoja?version_hoja_id=eq.{v["id"]}&select=id,bloque_id,descripcion,importe,porcentaje,desglose,forma_pago')
    pdfs = []
    for k, ruta in enumerate(v['pdfs_firmados'] or [], 1):
        datos = bajar(ruta)
        local = f'{T}/pdf/{cod}-{k}.pdf'; open(local, 'wb').write(datos)
        if datos[:2] == b'PK':                        # un WORD guardado como firmada (2023): Word lo pasa a PDF y se mira igual
            import subprocess
            docx = os.path.abspath(f'{T}/pdf/{cod}-{k}.docx'); open(docx, 'wb').write(datos); os.remove(local)
            subprocess.run(['powershell', '-NoProfile', '-Command',
                            f"$w = New-Object -ComObject Word.Application; $d = $w.Documents.Open('{docx}', $false, $true); "
                            f"$d.SaveAs([ref] '{os.path.abspath(local)}', [ref] 17); $d.Close(); $w.Quit()"], check=True)
            cands = [p for p in por_tam.get(len(datos), []) if open(p, 'rb').read() == datos]
            drive = cands[0] if len(cands) == 1 else None
            doc = pdfium.PdfDocument(local)
            os.makedirs(f'{T}/img/{cod}', exist_ok=True)
            paginas = []
            for i in range(len(doc)):
                png = f'{T}/img/{cod}/f{k}-p{i + 1}.png'; doc[i].render(scale=1.4).to_pil().save(png); paginas.append(os.path.abspath(png))
            pdfs.append({'ruta_almacen': ruta, 'archivo_drive': os.path.basename(drive) if drive else None, 'drive_ambiguo': None,
                         'fecha_firma_pdf': None, 'fecha_archivo_drive': datetime.date.fromtimestamp(os.path.getctime(drive)).isoformat() if drive else None,
                         'paginas': paginas, 'tiene_texto': False, 'texto': None, 'es_word': True})
            continue
        if datos[:4] != b'%PDF':                      # una FOTO guardada como firmada (jpeg/png): se mira tal cual
            from PIL import Image
            import io as _io
            os.makedirs(f'{T}/img/{cod}', exist_ok=True)
            png = f'{T}/img/{cod}/f{k}-p1.png'; Image.open(_io.BytesIO(datos)).convert('RGB').save(png)
            cands = [p for p in por_tam.get(len(datos), []) if open(p, 'rb').read() == datos]
            drive = cands[0] if len(cands) == 1 else None
            pdfs.append({'ruta_almacen': ruta, 'archivo_drive': os.path.basename(drive) if drive else None, 'drive_ambiguo': None,
                         'fecha_firma_pdf': None, 'fecha_archivo_drive': datetime.date.fromtimestamp(os.path.getctime(drive)).isoformat() if drive else None,
                         'paginas': [os.path.abspath(png)], 'tiene_texto': False, 'texto': None})
            continue
        doc = pdfium.PdfDocument(local)
        cands = [p for p in por_tam.get(len(datos), []) if open(p, 'rb').read() == datos]
        drive = cands[0] if len(cands) == 1 else None
        os.makedirs(f'{T}/img/{cod}', exist_ok=True)
        paginas, texto = [], []
        for i in range(len(doc)):
            png = f'{T}/img/{cod}/f{k}-p{i + 1}.png'
            doc[i].render(scale=1.4).to_pil().save(png); paginas.append(os.path.abspath(png))
            texto.append(doc[i].get_textpage().get_text_range())
        pdfs.append({'ruta_almacen': ruta, 'archivo_drive': os.path.basename(drive) if drive else None,
                     'drive_ambiguo': len(cands) if len(cands) != 1 else None,
                     'fecha_firma_pdf': fecha_pdf(doc),
                     'fecha_archivo_drive': datetime.date.fromtimestamp(os.path.getctime(drive)).isoformat() if drive else None,
                     'paginas': paginas, 'tiene_texto': sum(len(t.strip()) for t in texto) > 200,
                     'texto': '\n\n=== pagina ===\n'.join(texto) if sum(len(t.strip()) for t in texto) > 200 else None})
    o = opp[h['oportunidad_id']]
    salida.append({'numero_hoja': cod, 'hoja_id': h['id'], 'oportunidad_id': h['oportunidad_id'], 'opp': o['codigo'],
                   'direccion_opp': o['nombre'] or o['comunidad_provisional'], 'fecha_emision_base': h['fecha_creacion'],
                   'fecha_firma_base': h['fecha_firma'], 'pagador_base': h['pagador_tipo'] + (f" ({h['contrata']['nombre']})" if h['contrata'] else ''),
                   'total_base': v['importe_base'], 'forma_pago_base': v['forma_pago'],
                   'conceptos_base': [{'concepto_hoja_id': c['id'], 'bloque': bloque.get(c['bloque_id']), 'texto': c['descripcion'],
                                       'importe': c['importe'], 'porcentaje': c['porcentaje'], 'incluido': c['desglose'] == 'incluido'} for c in conc],
                   'pdfs': pdfs})
    print(cod, o['codigo'], '| pdfs', len(pdfs), '|', [(p['archivo_drive'] or f"SIN CASAR ({p['drive_ambiguo']})")[:50] for p in pdfs],
          '| firma pdf', [p['fecha_firma_pdf'] for p in pdfs], '| drive', [p['fecha_archivo_drive'] for p in pdfs])
json.dump(salida, open(f'{T}/{LOTE}.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1, default=str)
print(len(salida), 'hojas ->', f'{T}/{LOTE}.json')
