# -*- coding: utf-8 -*-
"""
Migracion board Monday de CONTRATAS (paralelo a admins):
  · 00a EMPRESAS COLABORADORAS (153)      -> contratas
  · 00b Empleados contratas - PERSONAS (120) -> contrata_contactos (ligadas por id)
Idempotente por migracion_monday. Lossless: campos economicos no modelados aun
(honorarios, formas pago, acuerdos ecobalance) se conservan en notas_comercial.

DRY-RUN por defecto. --apply para escribir.
Uso: SUPABASE_URL=... SUPABASE_SECRET_KEY=... SCRATCH=... python scripts/import_monday_contratas.py [--apply]
"""
import os, sys, io, json, urllib.request, urllib.parse
from collections import Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
APPLY = "--apply" in sys.argv
URL = os.environ["SUPABASE_URL"]; KEY = os.environ["SUPABASE_SECRET_KEY"]; SCRATCH = os.environ["SCRATCH"]
B_EMP = "00a EMPRESAS COLABORADORAS"; B_PER = "00b Empleados contratas - PERSONAS"

def rest(method, path, body=None, prefer=None):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}",
        data=json.dumps(body).encode() if body is not None else None, method=method)
    req.add_header("apikey", KEY); req.add_header("Authorization", "Bearer " + KEY); req.add_header("Content-Type", "application/json")
    if prefer: req.add_header("Prefer", prefer)
    try:
        r = urllib.request.urlopen(req); t = r.read().decode(); return json.loads(t) if t else []
    except urllib.error.HTTPError as ex:
        print(f"  ERROR {ex.code} en {method} {path}: {ex.read().decode()[:200]}")
        print(f"    body: {json.dumps(body)[:200]}")
        raise
def rest_all(path):
    out = []; off = 0
    while True:
        ch = rest("GET", f"{path}&limit=1000&offset={off}"); out += ch
        if len(ch) < 1000: break
        off += 1000
    return out
def g(d, k):
    v = d.get(k)
    return v.strip() if isinstance(v, str) and v.strip() else None

def tipo_de(estado):
    e = (estado or "").upper()
    if "ASCENSOR" in e: return "ascensorista"
    if "AMBOS" in e: return "mixta"
    if "CONTRATISTA" in e: return "obra_civil"
    return "otra"

def notas_comercial(e):
    partes = []
    for etiqueta, col in [("", "DATOS EXTRA"), ("Opción", "OPCION"), ("Ecobalance", "ECOBALANCE"),
                          ("Acuerdos Ecobalance", "Acuerdos Ecobalance"), ("Honorarios", "Honorarios accesalia"),
                          ("Formas pago", "Formas pago"), ("En excel control", "En excel control")]:
        v = g(e, col)
        if v: partes.append(f"{etiqueta}: {v}" if etiqueta else v)
    return "\n".join(partes) or None

emp = json.load(open(f"{SCRATCH}/contratas.json", encoding="utf-8"))
per = json.load(open(f"{SCRATCH}/contratas_personas.json", encoding="utf-8"))
ya_emp = {m["monday_item_id"] for m in rest_all(f"migracion_monday?select=monday_item_id&board=eq.{urllib.parse.quote(B_EMP)}&tabla_destino=eq.contratas")}
ya_per = {m["monday_item_id"] for m in rest_all(f"migracion_monday?select=monday_item_id&board=eq.{urllib.parse.quote(B_PER)}&tabla_destino=eq.contrata_contactos")}

rep = Counter()
# --- 00a empresas ---
PHANTOM = {"agregar elemento", "add item", None, ""}
for e in emp:
    iid = str(e["_id"])
    if (g(e, "_name") or "").lower() in PHANTOM: rep["fantasma emp"] += 1; continue
    if iid in ya_emp: rep["emp ya"] += 1; continue
    body = {
        "nombre": g(e, "_name") or g(e, "RAZON SOCIAL") or "(sin nombre)",
        "razon_social": g(e, "RAZON SOCIAL"),
        "cif": g(e, "CIF"), "direccion": g(e, "DIRECCION"),
        "telefono": g(e, "Teléfono"), "email": g(e, "Correo electrónico"),
        "tipo": tipo_de(g(e, "Estado")), "especialidad": g(e, "TIPO PROY"),
        "notas_comercial": notas_comercial(e), "activa": True,
    }
    rep["empresas a crear"] += 1
    if not APPLY: continue
    c = rest("POST", "contratas", body, prefer="return=representation")[0]
    rest("POST", "migracion_monday", {"board": B_EMP, "monday_item_id": iid, "tabla_destino": "contratas", "registro_id": c["id"]}, prefer="return=minimal")

# mapa monday_id(00a) -> contrata_id
mapa = {m["monday_item_id"]: m["registro_id"] for m in
        rest_all(f"migracion_monday?select=monday_item_id,registro_id&board=eq.{urllib.parse.quote(B_EMP)}&tabla_destino=eq.contratas")}

# --- 00b personas ---
for p in per:
    iid = str(p["_id"])
    if (g(p, "_name") or "").lower() in PHANTOM: rep["fantasma per"] += 1; continue
    if iid in ya_per: rep["per ya"] += 1; continue
    ids = p.get("_ids_00 EMPRESAS COLABORADORAS") or []
    cid = next((mapa.get(str(x)) for x in ids if mapa.get(str(x))), None)
    if cid is None: rep["persona sin empresa (omitida)"] += 1; continue  # contrata_id es NOT NULL
    notas = " · ".join(f"{k}: {g(p,k)}" for k in ["TIPO", "CARGO"] if g(p, k)) or None
    body = {"contrata_id": cid, "nombre": g(p, "_name") or "(sin nombre)",
            "telefono": g(p, "Teléfono"), "email": g(p, "Correo electrónico"), "notas": notas}
    rep["personas a crear"] += 1
    if not APPLY: continue
    ct = rest("POST", "contrata_contactos", body, prefer="return=representation")[0]
    rest("POST", "migracion_monday", {"board": B_PER, "monday_item_id": iid, "tabla_destino": "contrata_contactos", "registro_id": ct["id"]}, prefer="return=minimal")

print("=" * 56)
print(f"CONTRATAS (Monday 00a/00b)  [{'APPLY' if APPLY else 'DRY-RUN'}]")
print("=" * 56)
for k in ["empresas a crear", "personas a crear", "persona sin empresa (omitida)", "fantasma emp", "fantasma per", "emp ya", "per ya"]:
    print(f"  {k:22}: {rep.get(k,0)}")
print("\n[DRY-RUN] nada escrito." if not APPLY else "\n[APPLY] hecho.")
