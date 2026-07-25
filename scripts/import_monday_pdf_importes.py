# -*- coding: utf-8 -*-
"""
ETAPA 3c: captura del board Monday a nivel HOJA de dos datos que faltaban:
  · Archivo hoja encargo (link al PDF firmado)  -> versiones_hoja.url_pdf_hoja
  · 0 IMPORTES Y FORMA DE PAGO (texto crudo)     -> versiones_hoja.importes_forma_pago_texto
Ambos van a la version v1 de cada hoja ligada a Monday (creada o enriquecida).
Lossless: el desglose de importes a facturacion se hara despues, en su area.

DRY-RUN por defecto. --apply para escribir.
Uso: SUPABASE_URL=... SUPABASE_SECRET_KEY=... DIRECCIONES_JSON=... python scripts/import_monday_pdf_importes.py [--apply]
"""
import os, sys, io, re, json, urllib.request
from collections import Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
APPLY = "--apply" in sys.argv
URL = os.environ["SUPABASE_URL"]; KEY = os.environ["SUPABASE_SECRET_KEY"]
JSONP = os.environ["DIRECCIONES_JSON"]

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

items = {str(it.get("_id")): it for it in json.load(open(JSONP, encoding="utf-8"))}
liga = {m["monday_item_id"]: m["registro_id"] for m in
        rest_all("migracion_monday?select=monday_item_id,registro_id&board=eq.0%20LISTADO%20DE%20DIRECCIONES&tabla_destino=eq.hojas_encargo")}
vers = {}  # hoja_id -> version v1 id
for v in rest_all("versiones_hoja?select=id,hoja_encargo_id,numero_version"):
    if v["numero_version"] == 1: vers[v["hoja_encargo_id"]] = v["id"]

rep = Counter(); sample = []
for iid, hoja_id in liga.items():
    it = items.get(iid)
    vid = vers.get(hoja_id)
    if not it or not vid: rep["sin item/version"] += 1; continue
    links = [u.strip() for u in re.split(r"[,\s]+", it.get("Archivo  hoja encargo") or "") if u.strip().startswith("http")]
    imp = (it.get("0 IMPORTES Y FORMA DE PAGO\U0001f501") or "").strip()
    if imp.lower() == "no result": imp = ""
    body = {}
    if links:
        body["url_pdf_hoja"] = links[0]; body["pdfs_firmados"] = links
        rep["con PDF"] += 1
        if len(links) > 1: rep["con varios PDF"] += 1
    if imp: body["importes_forma_pago_texto"] = imp; rep["con importes"] += 1
    if not body: rep["nada que poner"] += 1; continue
    rep["hojas actualizadas"] += 1
    if len(sample) < 6 and imp: sample.append((it.get("_name", "")[:26], imp[:40]))
    if not APPLY: continue
    rest("PATCH", f"versiones_hoja?id=eq.{vid}", body)

print("=" * 58)
print(f"ETAPA 3c - PDF + importes (texto)  [{'APPLY' if APPLY else 'DRY-RUN'}]")
print("=" * 58)
for k in ["hojas actualizadas", "con PDF", "con importes", "nada que poner", "sin item/version"]:
    print(f"  {k:20}: {rep.get(k,0)}")
print("\n-- muestra importes --")
for s in sample: print(f"   · {s[0]:26} | {s[1]}")
print("\n[DRY-RUN] nada escrito." if not APPLY else "\n[APPLY] hecho.")
