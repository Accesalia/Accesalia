# -*- coding: utf-8 -*-
# Importa "6 LICENCIAS / DR" (516) -> tabla licencias + backfill de via en proyectos
# (entidad ayto/ecu + modalidad DR/licencia; board 6 completa los 87 ECU reales).
# Mapeo por comunidad (+tipo si hay varios), como visado.
#
# Uso:  BASE=... KEY=... python import_monday_licencia.py [--apply]
import json, sys, os, io, uuid, urllib.request, urllib.parse
from collections import Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = os.environ["BASE"].rstrip("/")
KEY  = os.environ["KEY"]
SP   = r"C:/Users/mfavi/AppData/Local/Temp/claude/c--Users-mfavi-ACCESALIA/96145bcd-0021-4665-8aa7-62e3ab901e4d/scratchpad"
APPLY = "--apply" in sys.argv
BOARD = "6 LICENCIAS / DR"

def rest(path, method="GET", body=None, prefer=None):
    h = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    if prefer: h["Prefer"] = prefer
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{BASE}/rest/v1/{path}", data=data, headers=h, method=method)
    with urllib.request.urlopen(req) as r:
        raw = r.read().decode()
        return json.loads(raw) if raw else None

def rest_all(path):
    out, step = [], 1000
    while True:
        h = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Range-Unit": "items",
             "Range": f"{len(out)}-{len(out)+step-1}"}
        req = urllib.request.Request(f"{BASE}/rest/v1/{path}", headers=h)
        with urllib.request.urlopen(req) as r:
            chunk = json.loads(r.read().decode())
        out += chunk
        if len(chunk) < step: break
    return out

def post_chunked(table, rows):
    for i in range(0, len(rows), 200):
        rest(table, "POST", rows[i:i+200], prefer="return=minimal")

def fecha(v):
    v = (v or "").strip()
    return v if len(v) == 10 and v[4] == "-" else None

def flag(v):
    v = (v or "").strip().upper()
    if v == "SI": return True
    if v in ("NO", "NO HAY"): return False
    return None

# ---- mapas ----
com = {r["monday_item_id"]: r["registro_id"] for r in
       rest_all("migracion_monday?select=monday_item_id,registro_id&board=eq." +
                urllib.parse.quote("0 LISTADO DE DIRECCIONES") + "&tabla_destino=eq.comunidades")}
proy = rest_all("proyectos?select=id,comunidad_id,tipo")
por_com = {}
for p in proy:
    por_com.setdefault(p["comunidad_id"], []).append(p)
ya = {m["monday_item_id"] for m in
      rest_all("migracion_monday?select=monday_item_id&board=eq." + urllib.parse.quote(BOARD) +
               "&tabla_destino=eq.licencias")}

GRUPO = {"APROBADAS": "aprobada", "Pendientes de revisar": "solicitada",
         "Compromiso": "compromiso", "No pedimos licencia o cancelada": None}
TIPO_TRAMITE = {"LICENCIA": "licencia", "DR": "dr",
                "CONSULTA URBANISTICA": "consulta_urbanistica", "ORDEN EJECUCION ITE": "orden_ejecucion_ite"}
MODALIDAD = {"LICENCIA": "licencia", "DR": "declaracion_responsable"}
NO_LIC = {"NO SE PIDE LICENCIA", "CANCELADA OBRA"}

def elegir_proyecto(cid, tipo_raw):
    ps = por_com.get(cid, [])
    if not ps: return None, "sin_proyecto"
    if len(ps) == 1: return ps[0]["id"], "unico"
    exact = [p for p in ps if (p.get("tipo") or "").strip() == (tipo_raw or "").strip()]
    if len(exact) == 1: return exact[0]["id"], "tipo"
    return ps[0]["id"], "ambiguo"

b6 = json.load(open(f"{SP}/board_6_licencias.json", encoding="utf-8"))

licencias, migr = [], []
patch_proy = {}   # pid -> dict de campos a PATCH en proyectos
motivos = Counter(); estados_out = Counter()
sin_com = saltados = sin_lic = 0

for r in b6:
    mid = r["_id"]
    if mid in ya:
        saltados += 1; continue
    links = r.get("_ids_0 LISTADO DE DIRECCIONES") or []
    cid = com.get(str(links[0])) if links else None
    if not cid:
        sin_com += 1; continue
    tipo_pry = (r.get("0 Tipo Pry") or "").strip()
    pid, motivo = elegir_proyecto(cid, tipo_pry)
    if not pid:
        motivos["sin_proyecto"] += 1; continue

    tipo_raw = (r.get("TIPO LICENCIA / TIPO DR") or "").strip()
    via_raw = (r.get("VIA DE TRAMITACION") or "").strip()
    group = r.get("_group", "")

    # backfill de via en el proyecto (board 6 es la fuente completa)
    pp = patch_proy.setdefault(pid, {})
    up = via_raw.upper()
    if up.startswith("AYUNTAMIENTO"): pp["entidad_responsable"] = "ayuntamiento"
    elif up.startswith("ECU"): pp["entidad_responsable"] = "ecu"
    if tipo_raw in MODALIDAD: pp["modalidad_licencia"] = MODALIDAD[tipo_raw]

    # no requieren licencia -> flag en proyecto, sin ficha
    if tipo_raw in NO_LIC or group == "No pedimos licencia o cancelada":
        pp["requiere_licencia"] = False
        motivos["no_licencia"] += 1
        continue

    # estado
    if group == "Compromiso" or tipo_raw == "COMPROMISO":
        estado, espera = "compromiso", True
    elif tipo_raw == "PENDIENTE DE DEFINIR":
        estado, espera = "pendiente_definir", False
    else:
        estado, espera = GRUPO.get(group) or "solicitada", False
    if estado == "solicitada" and (r.get("REQUERIMIENTOS") or "").strip().upper() in ("NUEVO REQUERIMIENTO", "PREGUNTAR"):
        estado = "requerido"

    # organismo: ECU concreta o ayto/junta
    if up.startswith("ECU"):
        organismo = via_raw.split("-", 1)[1].strip() if "-" in via_raw else "ECU"
    else:
        organismo = (r.get("AYTO/JUNTA DISTRITO") or "").strip() or None

    lid = str(uuid.uuid4())
    licencias.append({
        "id": lid, "proyecto_id": pid, "estado": estado,
        "tipo_tramite": TIPO_TRAMITE.get(tipo_raw),
        "tramitada_por": "ellos" if tipo_raw == "LA TRAMITAN ELLOS" else "nosotros",
        "organismo": organismo,
        "tecnico_ayto": (r.get("TECNICO AYTO") or "").strip() or None,
        "fecha_registro_ayto": fecha(r.get("Fecha reg EN AYTO")),
        "fecha_aprobacion": fecha(r.get("Aprobacion")),
        "enlace_doc": (r.get("Enlace A OK O LICENCIA") or "").strip() or None,
        "tasa_licencia_aplica": flag(r.get("TASA LIC")),
        "icio_aplica": flag(r.get("ICIO")),
        "residuos_aplica": flag(r.get("RESIDUOS")),
        "espera_subvencion": espera,
    })
    migr.append({"board": BOARD, "monday_item_id": mid, "tabla_destino": "licencias", "registro_id": lid})
    motivos[motivo] += 1
    estados_out[estado] += 1

# claves uniformes para el insert en lote
LK = ["id", "proyecto_id", "estado", "tipo_tramite", "tramitada_por", "organismo", "tecnico_ayto",
      "fecha_registro_ayto", "fecha_aprobacion", "enlace_doc",
      "tasa_licencia_aplica", "icio_aplica", "residuos_aplica", "espera_subvencion"]
licencias = [{k: l.get(k) for k in LK} for l in licencias]

ecu = sum(1 for v in patch_proy.values() if v.get("entidad_responsable") == "ecu")
ayto = sum(1 for v in patch_proy.values() if v.get("entidad_responsable") == "ayuntamiento")
nolic = sum(1 for v in patch_proy.values() if v.get("requiere_licencia") is False)
print(f"BASE={BASE}")
print(f"  board 6: {len(b6)}  |  ya: {saltados}  |  sin comunidad: {sin_com}")
print(f"  licencias nuevas: {len(licencias)}")
print(f"  backfill via en proyectos: {ayto} ayto, {ecu} ecu  |  requiere_licencia=false: {nolic}")
print(f"  empate proyecto: {dict(motivos)}")
print(f"  estados: {dict(estados_out)}")

if APPLY:
    if licencias:
        post_chunked("licencias", licencias)
        post_chunked("migracion_monday", migr)
    for pid, campos in patch_proy.items():
        if campos:
            rest(f"proyectos?id=eq.{pid}", "PATCH", campos, prefer="return=minimal")
    print("  >> ESCRITO")
else:
    print("  (dry-run; usa --apply para escribir)")
