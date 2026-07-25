# -*- coding: utf-8 -*-
"""
ETAPA 3: capa Monday sobre las HOJAS DE ENCARGO.
Board "0 LISTADO DE DIRECCIONES" (cada fila = un encargo firmado en Monday).
Modelo temporal validado: el Excel arranca ~30-may-2025.
  · comunidad SIN hoja Excel  -> pre-Excel, solo Monday        -> CREAR hoja.
  · comunidad CON hoja Excel  -> solape post-mayo-25           -> ENRIQUECER la hoja
                                 (match por tipo, o 1 sola hoja).
  · solape ambiguo (varias/ninguna casa) -> REVISAR (no se toca).

Guarda comercial_interno + quien_lo_trae (lossless). Idempotente por
migracion_monday(board, monday_item_id, tabla_destino='hojas_encargo').

DRY-RUN por defecto. --apply para escribir.
Uso: SUPABASE_URL=... SUPABASE_SECRET_KEY=... DIRECCIONES_JSON=... python scripts/import_monday_hojas.py [--apply]
"""
import os, sys, io, re, json, unicodedata, urllib.request
from collections import defaultdict, Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
APPLY = "--apply" in sys.argv
URL = os.environ["SUPABASE_URL"]; KEY = os.environ["SUPABASE_SECRET_KEY"]
JSONP = os.environ["DIRECCIONES_JSON"]
BOARD = "0 LISTADO DE DIRECCIONES"

def nrm(s):
    return re.sub(r"[^a-z0-9]+", " ", unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().lower()).strip()

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

# --- vocabulario Monday TIPO -> palabras en la descripcion del Excel ---
VOCAB = [("ASCENSOR", ["ascensor"]),
         ("SATE", ["sate", "envolvente termica", "envolvente", "aislamiento", "fachada"]),
         ("CUBIERTA", ["cubierta", "tejado"]),
         ("ACCESIB", ["accesib", "rampa", "portal", "adaptacion"]),
         ("IEE", ["iee", "evaluacion del edificio"]),
         ("PERICIAL", ["pericial"]),
         ("DF", ["direccion facultativa"]),
         ("SUBV", ["subvencion", "subvenciones"])]
def kws(tipo):
    t = (tipo or "").upper(); out = []
    for k, v in VOCAB:
        if k in t: out += v
    return out

def estado_de(flag):
    f = nrm(flag)
    if "firmada" in f: return "devuelta_firmada"
    if "cancel" in f: return "anulada"
    if "enviada" in f: return "enviada_comunidad"
    return "borrador"

def comercial_de(v):
    low = nrm(v)
    if "carlosg" in low or "carlos" in low: return "Carlos Garcia"
    if "alvaro" in low: return "Alvaro de Soto"
    if "daniel" in low: return "Daniel de Soto"
    return (v or None)

# --- indices ---
items = json.load(open(JSONP, encoding="utf-8"))
mm = {m["monday_item_id"]: m["registro_id"] for m in
      rest_all("migracion_monday?select=monday_item_id,registro_id&board=eq.0%20LISTADO%20DE%20DIRECCIONES&tabla_destino=eq.comunidades")}
ya = {m["monday_item_id"] for m in
      rest_all("migracion_monday?select=monday_item_id&board=eq.0%20LISTADO%20DE%20DIRECCIONES&tabla_destino=eq.hojas_encargo")}
hojas = rest_all("hojas_encargo?select=id,comunidad_id,descripcion,estado")
hpc = defaultdict(list)
for h in hojas: hpc[h["comunidad_id"]].append(h)

rep = Counter(); revisar = []; usados = set()

def clasificar(it):
    """Devuelve ('CREAR', None) | ('ENRIQUECER', hoja) | ('REVISAR', motivo)."""
    cid = mm.get(str(it.get("_id")))
    if cid is None: return ("REVISAR", "sin comunidad")
    hs = [h for h in hpc.get(cid, []) if h["id"] not in usados]
    if not hpc.get(cid): return ("CREAR", None)
    if not hs: return ("REVISAR", "hojas ya usadas por otro encargo")
    kw = kws(it.get("TIPO DE PROYECTO") or "")
    match = [h for h in hs if kw and any(w in nrm(h["descripcion"]) for w in kw)]
    if len(match) == 1: return ("ENRIQUECER", match[0])
    if len(match) > 1: return ("REVISAR", "varias del mismo tipo")
    if len(hs) == 1: return ("ENRIQUECER", hs[0])
    return ("REVISAR", "varias hojas, ninguna casa el tipo")

def descripcion_create(it):
    tipo = (it.get("TIPO DE PROYECTO") or "").strip()
    contr = (it.get("QUE HAN CONTRATADO") or "").strip()
    return " · ".join(x for x in (tipo, contr) if x) or None

for it in items:
    iid = str(it.get("_id"))
    if iid in ya: rep["ya_importada"] += 1; continue
    accion, dato = clasificar(it)
    flag = it.get("¿HOJA DE ENCARGO FIRMADA?")
    est = estado_de(flag)
    com = comercial_de(it.get("Comercial interno"))
    quien = (it.get("0Quien lo trae") or None)
    cid = mm.get(iid)

    if accion == "REVISAR":
        rep["REVISAR"] += 1
        if len(revisar) < 30: revisar.append((it.get("_name", "")[:34], it.get("TIPO DE PROYECTO", ""), dato))
        continue

    if accion == "ENRIQUECER":
        usados.add(dato["id"]); rep["ENRIQUECER"] += 1
        # solo SUBIMOS estado si Monday dice firmada o cancelada (no degradar)
        nuevo = dato["estado"]
        if est in ("devuelta_firmada", "anulada"): nuevo = est
        if not APPLY: continue
        rest("PATCH", f"hojas_encargo?id=eq.{dato['id']}", {
            "estado": nuevo, "comercial_interno": com, "quien_lo_trae": quien})
        if nuevo != dato["estado"]:
            rest("POST", "hojas_encargo_estado_historial",
                 {"hoja_encargo_id": dato["id"], "estado": nuevo}, prefer="return=minimal")
        rest("POST", "migracion_monday", {"board": BOARD, "monday_item_id": iid,
             "tabla_destino": "hojas_encargo", "registro_id": dato["id"]}, prefer="return=minimal")
        continue

    # CREAR
    rep["CREAR"] += 1
    if not APPLY: continue
    hoja = rest("POST", "hojas_encargo", {
        "comunidad_id": cid, "descripcion": descripcion_create(it),
        "pagador_tipo": "comunidad", "emisor": "accesalia", "estado": est,
        "fecha_creacion": "2000-01-01", "comercial_interno": com, "quien_lo_trae": quien},
        prefer="return=representation")[0]
    rest("POST", "versiones_hoja", {"hoja_encargo_id": hoja["id"], "numero_version": 1}, prefer="return=minimal")
    rest("POST", "hojas_encargo_estado_historial", {"hoja_encargo_id": hoja["id"], "estado": est}, prefer="return=minimal")
    rest("POST", "migracion_monday", {"board": BOARD, "monday_item_id": iid,
         "tabla_destino": "hojas_encargo", "registro_id": hoja["id"]}, prefer="return=minimal")

print("=" * 60)
print(f"ETAPA 3 - HOJAS (capa Monday)  [{'APPLY' if APPLY else 'DRY-RUN'}]  base:{URL}")
print("=" * 60)
for k in ["CREAR", "ENRIQUECER", "REVISAR", "ya_importada"]:
    print(f"  {k:14}: {rep.get(k,0)}")
print(f"  TOTAL procesado: {sum(rep.values())}")
print("\n-- muestra a REVISAR (no tocadas) --")
for r in revisar[:12]: print(f"   · {r[0]:34} | {str(r[1])[:16]:16} | {r[2]}")
print("\n[DRY-RUN] nada escrito." if not APPLY else "\n[APPLY] hecho.")
