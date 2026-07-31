# -*- coding: utf-8 -*-
r"""
Descarga las fichas de las carpetas trazadas que aun no la tienen.

Son las carpetas que llegaron por una ruta escrita a mano y que viven fuera del
arbol MADRID (Castilla-La Mancha, Valencia) o en un nivel que el barrido inicial
no recorria (urbanizaciones como `Urb. Puente Blanca`, bloques como
`cuestablanca2\bloque C`). El objetivo es que dejen de ser un subgrupo aparte:
a partir de aqui entran en las mismas extracciones que las demas.

La `ruta_dropbox` se guarda relativa al ARBOL completo (no a MADRID), porque
estas carpetas no cuelgan de ahi.

DRY-RUN por defecto. --apply para escribir.
Uso: python scripts/descargar_fichas_pendientes.py [--apply]
"""
import os, sys, io, re, csv, json, zipfile, hashlib, subprocess
import xml.etree.ElementTree as ET
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
ARBOL = r"C:\accesalia Dropbox\D SM\Ascensores y rehabilitaciones"
RAIZ = os.path.join(ARBOL, "MADRID")
VAULT = r"C:\accesalia-fichas"
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
DB = ["docker", "exec", "-i", "supabase_db_ACCESALIA", "psql", "-U", "postgres",
      "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "--csv"]

def sql(q):
    r = subprocess.run(DB + ["-c", q], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    t = r.stdout.decode("utf-8", "replace")
    if r.returncode:
        print(t); sys.exit(1)
    return list(csv.DictReader(io.StringIO(t)))

def carpeta_real(ruta):
    for cand in (os.path.join(ARBOL, ruta), os.path.join(RAIZ, ruta),
                 os.path.join(RAIZ, "1APROVINCIA", ruta)):
        if os.path.isdir(cand):
            return cand
    return None

# ---------- que comunidades trazadas no tienen ficha ----------
sin_ficha = {x["id"] for x in sql("""
select c.id from comunidades c
 where not exists (select 1 from migracion_ficha f where f.comunidad_id = c.id)""")}
trazado = [x for x in csv.DictReader(open(os.path.join(VAULT, "trazado_ok.csv"), encoding="utf-8-sig"))
           if x["comunidad_id"] in sin_ficha]
print(f"Carpetas trazadas sin ficha cargada: {len(trazado)}")

# ---------- buscar la ficha dentro de cada una ----------
pend = []
for t in trazado:
    base = carpeta_real(t["carpeta_dropbox"])
    if not base:
        print(f"   NO RESUELVE la carpeta: {t['carpeta_dropbox']}")
        continue
    encontradas = []
    for dirpath, _, files in os.walk(base):
        for f in files:
            n = f.lower()
            if "ficha" in n and n.endswith((".docx", ".docm")) and not n.startswith("~$"):
                encontradas.append(os.path.join(dirpath, f))
    if encontradas:
        pend.append((t, encontradas))
    else:
        print(f"   sin ficha dentro: {t['carpeta_dropbox']}")

print(f"\nCarpetas con ficha encontrada: {len(pend)}   ficheros: {sum(len(e) for _, e in pend)}")
for t, fs in pend:
    print(f"   {t['comunidad_monday'][:48]:48} {len(fs)} ficha(s)  {t['carpeta_dropbox']}")

if not APPLY:
    print("\nDRY-RUN. --apply para descargar y cargar.")
    sys.exit(0)

# ---------- parseo (mismo que el barrido original) ----------
def texto_de(nodo):
    p = []
    for t in nodo.iter():
        if t.tag == W + "t" and t.text:
            p.append(t.text)
        elif t.tag in (W + "tab", W + "br"):
            p.append(" ")
    return re.sub(r"[ \t]+", " ", "".join(p)).strip()

def parsear(raw):
    with zipfile.ZipFile(io.BytesIO(raw)) as z:
        xml = z.read("word/document.xml")
    body = ET.fromstring(xml).find(W + "body")
    lineas, filas = [], []
    def recorrer(nodo):
        for h in nodo:
            if h.tag == W + "p":
                t = texto_de(h)
                if t:
                    lineas.append(t)
            elif h.tag == W + "tbl":
                for tr in h.findall(W + "tr"):
                    celdas = [texto_de(tc) for tc in tr.findall(W + "tc")]
                    filas.append(celdas)
                    lineas.append(" | ".join(c for c in celdas if c))
    recorrer(body)
    return "\n".join(lineas), filas

def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")[:60] or "sin-nombre"

nuevas = []
for t, ficheros in pend:
    for ruta_abs in ficheros:
        rel = os.path.relpath(ruta_abs, ARBOL)
        ident = hashlib.sha1(rel.lower().encode("utf-8")).hexdigest()[:10]
        with open(ruta_abs, "rb") as fh:
            raw = fh.read()
        base = slug(os.path.basename(os.path.dirname(ruta_abs))) + "__" + ident
        with open(os.path.join(VAULT, "docx", base + ".docx"), "wb") as fh:
            fh.write(raw)
        try:
            texto, filas = parsear(raw)
        except Exception as e:
            print(f"   NO SE PUDO PARSEAR {rel}: {e}")
            continue
        st = os.stat(ruta_abs)
        doc = {"id": ident, "ruta_dropbox": rel, "nombre_fichero": os.path.basename(ruta_abs),
               "carpeta": os.path.basename(os.path.dirname(ruta_abs)),
               "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw),
               "modificado": __import__("time").strftime("%Y-%m-%d %H:%M",
                                                          __import__("time").localtime(st.st_mtime)),
               "parseado": True, "texto": texto, "filas": filas, "error_parseo": None,
               "localidad": t["localidad_dropbox"], "comunidad_id": t["comunidad_id"]}
        with open(os.path.join(VAULT, "json", base + ".json"), "w", encoding="utf-8") as fh:
            json.dump(doc, fh, ensure_ascii=False, indent=1)
        nuevas.append(doc)
        print(f"   descargada {rel}")

print(f"\nFichas descargadas y parseadas: {len(nuevas)}")
print("Ahora hay que cargarlas en la staging con cargar_fichas_staging.py (que ya las vera)")
