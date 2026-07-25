# -*- coding: utf-8 -*-
# Importa el tablero Monday "5 VISADO EN COAM" -> tabla visados (+ backfill de via
# y requiere_visado en proyectos). Modelo hibrido: HECHOS (codigo TL, fechas,
# estado); NO importamos mirrors ni metricas.
#
# Mapeo visado -> proyecto: board 5 enlaza a la COMUNIDAD; de ahi a su(s)
# proyecto(s). Si la comunidad tiene varios, se empata por TIPO crudo (mismo
# vocabulario que board 4). Un proyecto conjunto = un visado.
#
# Estados board 5 -> visados:
#   VISADO PAGADO        -> estado=visado, pagado=True
#   ENVIADO A VISAR      -> estado=enviado
#   REQUERIDO            -> estado=requerido
#   Pte OK para mandar.. -> estado=pendiente_enviar
#   parado hasta ECU     -> estado=pendiente_enviar, pausado=True + proyecto.entidad=ecu
#   NO SE VISA           -> (sin fila) proyecto.requiere_visado=False
#   (vacio, sin datos)   -> se salta
#
# Uso:  BASE=... KEY=... python import_monday_visado.py [--apply]
import json, sys, os, io, uuid, urllib.request, urllib.parse
from collections import Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = os.environ["BASE"].rstrip("/")
KEY  = os.environ["KEY"]
SP   = r"C:/Users/mfavi/AppData/Local/Temp/claude/c--Users-mfavi-ACCESALIA/96145bcd-0021-4665-8aa7-62e3ab901e4d/scratchpad"
APPLY = "--apply" in sys.argv
BOARD = "5 VISADO EN COAM"

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

def es_codigo_tl(ref):
    # La columna "REFERENCIA COAM" esta reutilizada: para los visados es el codigo
    # TL (TL/XXXXXX/AAAA); para los pendientes son NOTAS de estado (REQUERIMIENTO
    # ECU, PDT PAGUEN TASAS LC...). Solo el TL de verdad va a `referencia`.
    return bool(ref) and ref.strip().upper().startswith("TL")

# ---- mapas ----
com = {r["monday_item_id"]: r["registro_id"] for r in
       rest_all("migracion_monday?select=monday_item_id,registro_id&board=eq." +
                urllib.parse.quote("0 LISTADO DE DIRECCIONES") + "&tabla_destino=eq.comunidades")}

# comunidad_id -> [ {id, tipo} ] para empatar por tipo cuando hay varios proyectos
proy = rest_all("proyectos?select=id,comunidad_id,tipo")
por_com = {}
for p in proy:
    por_com.setdefault(p["comunidad_id"], []).append(p)

ya = {m["monday_item_id"] for m in
      rest_all("migracion_monday?select=monday_item_id&board=eq." + urllib.parse.quote(BOARD) +
               "&tabla_destino=eq.visados")}

ESTADO = {
    "VISADO PAGADO":              ("visado", {"pagado": True}),
    "ENVIADO A VISAR":            ("enviado", {}),
    "REQUERIDO":                  ("requerido", {}),
    "Pte OK para mandar a visar": ("pendiente_enviar", {}),
    "parado hasta ECU":           ("pendiente_enviar", {"pausado": True, "notas": "parado hasta ECU"}),
}

def elegir_proyecto(cid, tipo_raw):
    """Empata el visado con un proyecto de la comunidad (por tipo si hay varios)."""
    ps = por_com.get(cid, [])
    if not ps: return None, "sin_proyecto"
    if len(ps) == 1: return ps[0]["id"], "unico"
    # varios: empatar por tipo crudo
    exact = [p for p in ps if (p.get("tipo") or "").strip() == (tipo_raw or "").strip()]
    if len(exact) == 1: return exact[0]["id"], "tipo"
    return ps[0]["id"], "ambiguo"   # fallback: el primero

b5 = json.load(open(f"{SP}/board_5_visado.json", encoding="utf-8"))

visados, migr = [], []
patch_no_visa, patch_ecu = [], []
motivos = Counter(); estados_out = Counter()
sin_com = saltados = vacios = 0
usados_proy = set()

for r in b5:
    mid = r["_id"]
    if mid in ya:
        saltados += 1
        continue
    links = r.get("_ids_0 LISTADO DE DIRECCIONES") or []
    cid = com.get(str(links[0])) if links else None
    if not cid:
        sin_com += 1
        continue
    tipo_raw = (r.get("TIPO") or "").strip()
    est_raw = (r.get("Estado visado") or "").strip()
    ref = (r.get("REFERENCIA COAM") or "").strip() or None
    fvis = fecha(r.get("Fecha VISADO"))

    # sin estado y sin datos -> nada que traer
    if not est_raw and not ref and not fvis:
        vacios += 1
        continue

    pid, motivo = elegir_proyecto(cid, tipo_raw)
    if not pid:
        motivos["sin_proyecto"] += 1
        continue

    if est_raw == "NO SE VISA":
        patch_no_visa.append(pid)
        motivos["no_se_visa"] += 1
        continue

    estado, extra = ESTADO.get(est_raw, ("visado", {}))  # vacio-con-datos -> visado (tiene ref/fecha)
    if est_raw == "parado hasta ECU":
        patch_ecu.append(pid)
    # Solo el codigo TL de verdad va a referencia; el texto reutilizado -> notas.
    referencia = ref if es_codigo_tl(ref) else None
    notas_parts = []
    if extra.get("notas"):
        notas_parts.append(extra["notas"])          # "parado hasta ECU"
    if ref and not es_codigo_tl(ref):
        notas_parts.append(ref)                       # p.ej. "REQUERIMIENTO ECU", "PDT PAGUEN TASAS LC"
    notas = " · ".join(notas_parts) or None
    vid = str(uuid.uuid4())
    fila = {
        "id": vid, "proyecto_id": pid, "momento": "proyecto",
        "estado": estado, "organismo": "COAM",
        "referencia": referencia, "fecha_visado": fvis if estado == "visado" else None,
        "pagado": extra.get("pagado", False),
        "pausado": extra.get("pausado", False),
        "notas": notas,
    }
    visados.append(fila)
    migr.append({"board": BOARD, "monday_item_id": mid, "tabla_destino": "visados", "registro_id": vid})
    motivos[motivo] += 1
    estados_out[estado] += 1
    usados_proy.add(pid)

# PostgREST: claves uniformes en lote
VK = ["id", "proyecto_id", "momento", "estado", "organismo", "referencia",
      "fecha_visado", "pagado", "pausado", "notas"]
visados = [{k: v.get(k) for k in VK} for v in visados]

print(f"BASE={BASE}")
print(f"  board 5: {len(b5)}  |  ya importados: {saltados}  |  sin comunidad: {sin_com}  |  vacios saltados: {vacios}")
print(f"  visados nuevos: {len(visados)}  (proyectos distintos: {len(usados_proy)})")
print(f"  NO SE VISA -> requiere_visado=false: {len(patch_no_visa)}")
print(f"  parado ECU -> entidad=ecu: {len(patch_ecu)}")
print(f"  empate proyecto: {dict(motivos)}")
print(f"  estados: {dict(estados_out)}")

if APPLY:
    if visados:
        post_chunked("visados", visados)
        post_chunked("migracion_monday", migr)
    for pid in set(patch_no_visa):
        rest(f"proyectos?id=eq.{pid}", "PATCH", {"requiere_visado": False}, prefer="return=minimal")
    for pid in set(patch_ecu):
        rest(f"proyectos?id=eq.{pid}", "PATCH", {"entidad_responsable": "ecu"}, prefer="return=minimal")
    print("  >> ESCRITO")
else:
    print("  (dry-run; usa --apply para escribir)")
