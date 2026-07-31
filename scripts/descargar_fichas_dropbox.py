# -*- coding: utf-8 -*-
"""
Pasada UNICA de ingesta de las FICHAS DE DATOS del Dropbox de ascensores.

Los .docx del Dropbox son placeholders online-only: abrirlos cuesta ~1,9 s (red)
y parsearlos cuesta ms. Por eso esta pasada hace las dos cosas a la vez y deja
el resultado en local: a partir de aqui no se vuelve a tocar Dropbox.

Deja en VAULT:
  docx/<slug>__<id>.docx   copia intacta del original
  json/<slug>__<id>.json   texto plano + filas de tabla (celdas crudas, sin normalizar)
  indice.jsonl             una linea por ficha procesada (=> reanudable)
  errores.log

NO escribe en Supabase. La extraccion a tablas va aparte, leyendo de aqui.

Uso: python scripts/descargar_fichas_dropbox.py [--workers 6] [--limit N]
"""
import os, sys, io, re, json, time, zipfile, hashlib, threading
import xml.etree.ElementTree as ET
from concurrent.futures import ThreadPoolExecutor

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

ROOT = r"C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones\MADRID"
VAULT = r"C:\accesalia-fichas"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"

def arg(name, default):
    return type(default)(sys.argv[sys.argv.index(name) + 1]) if name in sys.argv else default
WORKERS = arg("--workers", 6)
LIMIT = arg("--limit", 0)

os.makedirs(os.path.join(VAULT, "docx"), exist_ok=True)
os.makedirs(os.path.join(VAULT, "json"), exist_ok=True)
INDICE = os.path.join(VAULT, "indice.jsonl")
ERRORES = os.path.join(VAULT, "errores.log")

def largo(p):
    # Windows MAX_PATH: el arbol de Dropbox tiene rutas muy profundas
    return "\\\\?\\" + p if len(p) > 240 and not p.startswith("\\\\?\\") else p

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60] or "sin-nombre"

# ---------- descubrimiento (solo metadatos, no hidrata nada) ----------
def descubrir():
    out = []
    for dirpath, _, files in os.walk(ROOT):
        for f in files:
            n = f.lower()
            if n.startswith("~$") or "ficha" not in n:
                continue
            if not n.endswith((".docx", ".doc", ".docm")):
                continue
            out.append(os.path.join(dirpath, f))
    return sorted(out)

# ---------- parseo docx ----------
def texto_de(nodo):
    partes = []
    for t in nodo.iter():
        if t.tag == W + "t" and t.text:
            partes.append(t.text)
        elif t.tag in (W + "tab", W + "br"):
            partes.append(" ")
    return re.sub(r"[ \t]+", " ", "".join(partes)).strip()

def parsear(raw):
    """docx -> (texto_plano, filas de tabla como listas de celdas crudas)"""
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        xml = z.read("word/document.xml")
    body = ET.fromstring(xml).find(W + "body")
    lineas, filas = [], []
    def recorrer(nodo):
        for hijo in nodo:
            if hijo.tag == W + "p":
                t = texto_de(hijo)
                if t:
                    lineas.append(t)
            elif hijo.tag == W + "tbl":
                for tr in hijo.findall(W + "tr"):
                    celdas = [texto_de(tc) for tc in tr.findall(W + "tc")]
                    filas.append(celdas)
                    lineas.append(" | ".join(c for c in celdas if c))
    recorrer(body)
    return "\n".join(lineas), filas

# ---------- ingesta de un fichero ----------
lock = threading.Lock()
hechos = 0
t0 = time.time()

def registrar(fila):
    global hechos
    with lock:
        with open(INDICE, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(fila, ensure_ascii=False) + "\n")
        hechos += 1
        n = hechos
    if n % 25 == 0:
        seg = time.time() - t0
        print(f"  {n}/{TOTAL}  {seg/n:.2f} s/ficha  restan ~{(TOTAL-n)*seg/n/60:.0f} min", flush=True)

def error(ruta, e):
    with lock:
        with open(ERRORES, "a", encoding="utf-8") as fh:
            fh.write(f"{ruta}\t{type(e).__name__}: {e}\n")

def ingerir(ruta):
    rel = os.path.relpath(ruta, ROOT)
    ident = hashlib.sha1(rel.lower().encode("utf-8")).hexdigest()[:10]
    base = slug(os.path.basename(os.path.dirname(ruta))) + "__" + ident
    try:
        raw = None
        for intento in range(3):
            try:
                with open(largo(ruta), "rb") as fh:  # esta lectura es la que hidrata
                    raw = fh.read()
                break
            except OSError as e:
                if intento == 2:
                    raise
                time.sleep(2 * (intento + 1))

        destino_docx = os.path.join(VAULT, "docx", base + os.path.splitext(ruta)[1].lower())
        with open(largo(destino_docx), "wb") as fh:
            fh.write(raw)

        st = os.stat(largo(ruta))
        doc = {
            "id": ident,
            "ruta_dropbox": rel,
            "nombre_fichero": os.path.basename(ruta),
            "carpeta": os.path.basename(os.path.dirname(ruta)),
            "sha256": hashlib.sha256(raw).hexdigest(),
            "bytes": len(raw),
            "modificado": time.strftime("%Y-%m-%d %H:%M", time.localtime(st.st_mtime)),
            "parseado": False, "texto": "", "filas": [], "error_parseo": None,
        }
        if ruta.lower().endswith((".docx", ".docm")):
            try:
                doc["texto"], doc["filas"] = parsear(raw)
                doc["parseado"] = True
            except Exception as e:  # .doc renombrado, fichero corrupto, protegido...
                doc["error_parseo"] = f"{type(e).__name__}: {e}"
        else:
            doc["error_parseo"] = "formato .doc antiguo (binario): copiado, no parseado"

        with open(os.path.join(VAULT, "json", base + ".json"), "w", encoding="utf-8") as fh:
            json.dump(doc, fh, ensure_ascii=False, indent=1)

        registrar({"id": ident, "ruta_dropbox": rel, "nombre_fichero": doc["nombre_fichero"],
                   "carpeta": doc["carpeta"], "sha256": doc["sha256"], "bytes": doc["bytes"],
                   "modificado": doc["modificado"], "parseado": doc["parseado"],
                   "n_filas": len(doc["filas"]), "n_chars": len(doc["texto"]),
                   "error_parseo": doc["error_parseo"], "base": base})
    except Exception as e:
        error(rel, e)

# ---------- main ----------
print("Descubriendo fichas (solo metadatos, no descarga)...", flush=True)
todas = descubrir()
print(f"Encontradas: {len(todas)}", flush=True)

ya = set()
if os.path.exists(INDICE):
    with open(INDICE, encoding="utf-8") as fh:
        for l in fh:
            try:
                ya.add(json.loads(l)["ruta_dropbox"])
            except Exception:
                pass
pendientes = [r for r in todas if os.path.relpath(r, ROOT) not in ya]
if ya:
    print(f"Ya procesadas en pasadas anteriores: {len(ya)}", flush=True)
if LIMIT:
    pendientes = pendientes[:LIMIT]
TOTAL = len(pendientes)
print(f"A procesar ahora: {TOTAL} con {WORKERS} hilos\n", flush=True)

with ThreadPoolExecutor(max_workers=WORKERS) as ex:
    list(ex.map(ingerir, pendientes))

seg = time.time() - t0
print(f"\nHECHO: {hechos}/{TOTAL} en {seg/60:.1f} min", flush=True)
if os.path.exists(ERRORES):
    print(f"Errores registrados en {ERRORES}", flush=True)
print(f"Boveda: {VAULT}", flush=True)
