# -*- coding: utf-8 -*-
"""
Importa COMUNIDADES (inmuebles) desde el board Monday '0 LISTADO DE DIRECCIONES'.
Cada fila de Monday = un encargo (direccion + tipo); se DEDUPLICA por direccion
para crear las comunidades. Enlaza a la administracion por ID (via migracion_monday).
Registra en migracion_monday cada fila Monday -> su comunidad (nada se pierde).

Uso:
    MONDAY_TOKEN=... SUPABASE_URL=... SUPABASE_SECRET_KEY=... python scripts/import_monday_comunidades.py
    (anadir --apply para escribir; por defecto DRY-RUN)
"""
import os, sys, io, re, json, unicodedata, urllib.request, urllib.parse
from collections import defaultdict, Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

APPLY = "--apply" in sys.argv
BOARD = 1373889716
BOARD_NAME = "0 LISTADO DE DIRECCIONES"
BOARD_ADMIN = "01a ADMINISTRACIONES DE FINCAS"
TK = os.environ.get("MONDAY_TOKEN")
URL = os.environ["SUPABASE_URL"]; KEY = os.environ["SUPABASE_SECRET_KEY"]
if not TK: sys.exit("Falta MONDAY_TOKEN")

def norm(s):
    if not s: return ""
    s = unicodedata.normalize("NFD", str(s)).encode("ascii","ignore").decode()
    return re.sub(r"[^a-z0-9]+"," ",s.lower()).strip()

def base_dir(nombre):
    return re.sub(r"\s*\([^)]*\)\s*$", "", nombre or "").strip()

def gql(q):
    req = urllib.request.Request("https://api.monday.com/v2", data=json.dumps({"query":q}).encode(),
        headers={"Authorization":TK,"Content-Type":"application/json","API-Version":"2024-10"})
    d = json.loads(urllib.request.urlopen(req).read().decode())
    if "errors" in d: sys.exit("GQL: "+json.dumps(d["errors"])[:500])
    return d["data"]

def rest(method, path, body=None, prefer=None):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}",
        data=json.dumps(body).encode() if body is not None else None, method=method)
    req.add_header("apikey",KEY); req.add_header("Authorization","Bearer "+KEY); req.add_header("Content-Type","application/json")
    if prefer: req.add_header("Prefer",prefer)
    r = urllib.request.urlopen(req); t = r.read().decode(); return json.loads(t) if t else []

# ---- pull direcciones (con relaciones) ----
CV = ('column_values { column { title } text '
      '... on BoardRelationValue { display_value linked_item_ids } '
      '... on MirrorValue { display_value } }')
ITEMS = f"items {{ id name {CV} }}"
d = gql(f'query {{ boards(ids:{BOARD}) {{ items_page(limit:500) {{ cursor {ITEMS} }} }} }}')
p = d["boards"][0]["items_page"]; raw = p["items"]; cur = p["cursor"]
while cur:
    d = gql(f'query {{ next_items_page(cursor:"{cur}", limit:500) {{ cursor {ITEMS} }} }}')
    raw += d["next_items_page"]["items"]; cur = d["next_items_page"]["cursor"]

rows = []
for it in raw:
    r = {"_id": it["id"], "_name": it["name"], "_admin_ids": []}
    for cv in it["column_values"]:
        t = cv["column"]["title"]
        r[t] = cv.get("text") or cv.get("display_value") or ""
        if t == "0 ADMIN" and cv.get("linked_item_ids"):
            r["_admin_ids"] = cv["linked_item_ids"]
    rows.append(r)

# ---- mapa admin: monday_item_id -> administracion uuid (via migracion_monday) ----
admin_map = {m["monday_item_id"]: m["registro_id"] for m in
    rest("GET", f"migracion_monday?select=monday_item_id,registro_id&tabla_destino=eq.administraciones_fincas&board=eq.{urllib.parse.quote(BOARD_ADMIN)}")}

# ---- agrupar filas por direccion (dedup) ----
grupos = defaultdict(list)
for r in rows:
    grupos[norm(base_dir(r["_name"]))].append(r)

# ---- existentes (idempotencia) ----
exist_com = {norm(c["nombre"]): c["id"] for c in rest("GET","comunidades?select=id,nombre")}
ya_mapeadas = {m["monday_item_id"] for m in
    rest("GET", f"migracion_monday?select=monday_item_id&tabla_destino=eq.comunidades&board=eq.{urllib.parse.quote(BOARD_NAME)}")}

rep = Counter(); flags = []
def primero(g, col):
    for r in g:
        if r.get(col): return r[col]
    return None

print("="*74)
print(f"IMPORT COMUNIDADES  ({'APPLY' if APPLY else 'DRY-RUN'})  base: {URL}")
print(f"Filas Monday: {len(rows)}  |  edificios unicos: {len(grupos)}")
print("="*74)

for clave, g in grupos.items():
    nombre = base_dir(g[0]["_name"])
    # administracion por id (la mas frecuente entre las filas del edificio)
    admin_uuids = [admin_map[a] for r in g for a in r["_admin_ids"] if a in admin_map]
    admin_id = Counter(admin_uuids).most_common(1)[0][0] if admin_uuids else None
    if not admin_id:
        # habia admin en Monday pero no correla, o no habia
        tenia = any(r["_admin_ids"] or r.get("0 ADMIN") for r in g)
        flags.append(("admin_no_correlado" if tenia else "sin_admin") + f": {nombre}")
    body = {
        "nombre": nombre,
        "direccion": primero(g, "Ubicación"),
        "municipio": primero(g, "LOCALIDAD"),
        "cp": primero(g, "CP"),
        "provincia": primero(g, "PROVINCIA"),
        "administracion_id": admin_id,
    }
    cid = exist_com.get(clave)
    if cid:
        rep["actualizadas"] += 1
        if APPLY: rest("PATCH", f"comunidades?id=eq.{cid}", body=body)
    else:
        rep["creadas"] += 1
        if APPLY:
            cid = rest("POST","comunidades", body, prefer="return=representation")[0]["id"]
            exist_com[clave] = cid
    if admin_id: rep["con_administracion"] += 1
    else: rep["sin_administracion"] += 1
    if len(g) > 1: rep["edificios_multi_encargo"] += 1
    # migracion_monday: cada fila Monday -> esta comunidad
    for r in g:
        rep["filas_monday"] += 1
        if r["_id"] in ya_mapeadas: continue
        if APPLY and cid:
            rest("POST","migracion_monday",
                 [{"board":BOARD_NAME,"monday_item_id":str(r["_id"]),"tabla_destino":"comunidades","registro_id":cid}],
                 prefer="return=minimal")
            rep["mapeos_nuevos"] += 1

print("\n--- RECONCILIACION ---")
for k in ["creadas","actualizadas","filas_monday","con_administracion","sin_administracion",
          "edificios_multi_encargo","mapeos_nuevos"]:
    print(f"  {k:26}: {rep.get(k,0)}")
print(f"\n--- DUDOSOS ({len(flags)}) ---")
for f in flags[:25]: print("  •", f)
if len(flags) > 25: print(f"  ... y {len(flags)-25} mas")
print("\n[DRY-RUN] nada escrito." if not APPLY else "\n[APPLY] hecho.")
