# -*- coding: utf-8 -*-
"""
ETAPA 3b: rellena los CONCEPTOS de las hojas firmadas CREADAS desde Monday,
usando la columna "QUE HAN CONTRATADO" (+ flags). Solo toca las hojas creadas en
la etapa 3 (las que tienen 0 conceptos); las enriquecidas del Excel se dejan como
estan. Cada concepto entra atado a su hoja (conceptos_hoja.hoja_encargo_id) y a su
version v1 -> trazabilidad concepto->hoja desde el origen.

DRY-RUN por defecto. --apply para escribir.
Uso: SUPABASE_URL=... SUPABASE_SECRET_KEY=... DIRECCIONES_JSON=... python scripts/import_monday_conceptos.py [--apply]
"""
import os, sys, io, re, json, unicodedata, urllib.request
from collections import defaultdict, Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
APPLY = "--apply" in sys.argv
URL = os.environ["SUPABASE_URL"]; KEY = os.environ["SUPABASE_SECRET_KEY"]
JSONP = os.environ["DIRECCIONES_JSON"]

def nrm(s): return re.sub(r"[^a-z0-9]+", " ", unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().lower()).strip()
def rest(method, path, body=None, prefer=None):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}",
        data=json.dumps(body).encode() if body is not None else None, method=method)
    req.add_header("apikey", KEY); req.add_header("Authorization", "Bearer " + KEY); req.add_header("Content-Type", "application/json")
    if prefer: req.add_header("Prefer", prefer)
    r = urllib.request.urlopen(req); t = r.read().decode(); return json.loads(t) if t else []
def rest_all(path):
    out = []; off = 0
    while True:
        ch = rest("GET", f"{path}&limit=1000&offset={off}"); out += ch
        if len(ch) < 1000: break
        off += 1000
    return out

# --- catalogo bloques ---
bl = {b["codigo"]: b["id"] for b in rest("GET", "bloques?select=codigo,id")}
def subv_bloque(tipo):
    t = nrm(tipo)
    if "sate" in t or "eficiencia" in t or "energet" in t or "envolvente" in t:
        return bl["TRAMITACION SUBVENCIONES EFICIENCIA ENERGETICA"]
    return bl["TRAMITACION SUBVENCIONES ACCESIBILIDAD"]

# token de "QUE HAN CONTRATADO" -> codigo de bloque (o None si no hay hueco atomico)
def token_a_bloque(tok, tipo):
    t = nrm(tok)
    if not t: return "skip"
    if "proyecto" in t: return bl["REDACCION PROYECTO"]
    if "subvencion" in t: return subv_bloque(tipo)
    if "css" in t: return bl["CSS"]
    if "dir obra" in t or "direccion de obra" in t or "direccion obra" in t or t == "df" or "facultativa" in t: return bl["DF"]
    if "iee" in t: return bl["IEE"]
    if "libro" in t: return bl["LEE"]
    if "cee" in t: return bl["CEE"]
    if t == "dr" or "declaracion responsable" in t: return bl["TRAMITACION LICENCIAS"]
    if "memoria" in t: return bl["MEMORIA TECNICA"]
    if "pericial" in t: return bl["INFORME PERICIAL"]
    if "presupuesto" in t or "ppto" in t: return bl["TRAMITACION 3 PRESUPUESTOS"]
    if "financiacion" in t: return bl["SOLICITUD DE FINANCIACION"]
    if "licencia" in t: return bl["TRAMITACION LICENCIAS"]
    if "fin de obra" in t: return bl["CERTIFICADO FIN DE OBRA"]
    if "caes" in t: return None  # sin bloque atomico (solo en paquetes)
    return "?"

# --- indices ---
items = {str(it.get("_id")): it for it in json.load(open(JSONP, encoding="utf-8"))}
liga = {m["monday_item_id"]: m["registro_id"] for m in
        rest_all("migracion_monday?select=monday_item_id,registro_id&board=eq.0%20LISTADO%20DE%20DIRECCIONES&tabla_destino=eq.hojas_encargo")}
con_conceptos = {c["hoja_encargo_id"] for c in rest_all("conceptos_hoja?select=hoja_encargo_id")}
vers = {}  # hoja_id -> version v1 id
for v in rest_all("versiones_hoja?select=id,hoja_encargo_id,numero_version"):
    if v["numero_version"] == 1: vers[v["hoja_encargo_id"]] = v["id"]

rep = Counter(); sin_mapear = Counter(); filas = []
for iid, hoja_id in liga.items():
    if hoja_id in con_conceptos: rep["saltada (ya tiene conceptos)"] += 1; continue
    it = items.get(iid)
    if not it: rep["sin item monday"] += 1; continue
    tipo = it.get("TIPO DE PROYECTO") or ""
    contr = it.get("QUE HAN CONTRATADO") or ""
    toks = [x for x in re.split(r"[,/]", contr) if x.strip()]
    # flags que amplian
    if nrm(it.get("CSS")) == "contratado": toks.append("CSS")
    if nrm(it.get("3 pptos")) in ("si",): toks.append("3 presupuestos")
    if nrm(it.get("Financiacion")) not in ("", "no"): toks.append("financiacion")
    bloques = []
    for tk in toks:
        b = token_a_bloque(tk, tipo)
        if b == "skip": continue
        if b == "?": sin_mapear[nrm(tk)] += 1; continue
        if b is None: rep["token CAES (sin bloque)"] += 1; continue
        if b not in bloques: bloques.append(b)
    if not bloques: rep["hoja sin conceptos mapeables"] += 1; continue
    rep["hojas a rellenar"] += 1; rep["conceptos totales"] += len(bloques)
    vid = vers.get(hoja_id)
    if len(filas) < 6: filas.append((it.get("_name", "")[:30], contr[:34], len(bloques)))
    if not APPLY: continue
    rest("POST", "conceptos_hoja",
         [{"hoja_encargo_id": hoja_id, "version_hoja_id": vid, "bloque_id": b, "incluido": True} for b in bloques],
         prefer="return=minimal")

print("=" * 60)
print(f"ETAPA 3b - CONCEPTOS firmadas desde Monday  [{'APPLY' if APPLY else 'DRY-RUN'}]")
print("=" * 60)
for k in ["hojas a rellenar", "conceptos totales", "saltada (ya tiene conceptos)", "hoja sin conceptos mapeables", "token CAES (sin bloque)"]:
    print(f"  {k:32}: {rep.get(k,0)}")
if sin_mapear:
    print("\n  tokens SIN mapear (revisar):")
    for k, v in sin_mapear.most_common(): print(f"    {v:3}  {k!r}")
print("\n-- muestra --")
for f in filas: print(f"   · {f[0]:30} | {f[1]:34} | {f[2]} conceptos")
print("\n[DRY-RUN] nada escrito." if not APPLY else "\n[APPLY] hecho.")
