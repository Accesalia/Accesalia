# -*- coding: utf-8 -*-
# Importa "7 OBRAS" (363) -> tabla obras (reshape). Enlaza constructora a la ficha
# de contrata; el CFO (a_visar/visado) genera ademas un visado momento=fin_obra.
#
# Uso:  BASE=... KEY=... python import_monday_obra.py [--apply]
import json, sys, os, io, uuid, urllib.request, urllib.parse
from collections import Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = os.environ["BASE"].rstrip("/")
KEY  = os.environ["KEY"]
SP   = r"C:/Users/mfavi/AppData/Local/Temp/claude/c--Users-mfavi-ACCESALIA/96145bcd-0021-4665-8aa7-62e3ab901e4d/scratchpad"
APPLY = "--apply" in sys.argv
BOARD = "7 OBRAS"

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

# ---- mapas ----
com = {r["monday_item_id"]: r["registro_id"] for r in
       rest_all("migracion_monday?select=monday_item_id,registro_id&board=eq." +
                urllib.parse.quote("0 LISTADO DE DIRECCIONES") + "&tabla_destino=eq.comunidades")}
proy = rest_all("proyectos?select=id,comunidad_id,tipo")
por_com = {}
for p in proy:
    por_com.setdefault(p["comunidad_id"], []).append(p)
contratas = {c["nombre"].strip().upper(): c["id"] for c in rest_all("contratas?select=id,nombre")}
equipo = {e["nombre"].strip().upper(): e["id"] for e in rest_all("equipo?select=id,nombre")}
COORD = {"DANIEL": equipo.get("DANIEL"), "JL": equipo.get("JOSE LUIS")}  # JL = Jose Luis (ex)
ya = {m["monday_item_id"] for m in
      rest_all("migracion_monday?select=monday_item_id&board=eq." + urllib.parse.quote(BOARD) +
               "&tabla_destino=eq.obras")}

GRUPO = {"OBRAS PENDIENTES DE APERTURA": "pendiente_inicio", "OBRAS ABIERTAS": "en_curso",
         "Obras con fin de obra": "finalizada", "CFO metido a visar": "finalizada",
         "No procede obra": "no_procede"}
CFO = {"CFO VISADO DESCARGADO": "visado", "METIDO A VISAR": "a_visar", "NO PROCEDE": "no_procede"}

def elegir_proyecto(cid, tipo_raw):
    ps = por_com.get(cid, [])
    if not ps: return None
    if len(ps) == 1: return ps[0]["id"]
    exact = [p for p in ps if (p.get("tipo") or "").strip() == (tipo_raw or "").strip()]
    return (exact[0]["id"] if len(exact) == 1 else ps[0]["id"])

b7 = json.load(open(f"{SP}/board_7_obras.json", encoding="utf-8"))

obras, visados_cfo, migr = [], [], []
sin_com = saltados = con_contrata = con_cfo_visado = 0
estados_out = Counter()

for r in b7:
    mid = r["_id"]
    if mid in ya:
        saltados += 1; continue
    links = r.get("_ids_0 LISTADO DE DIRECCIONES") or []
    cid = com.get(str(links[0])) if links else None
    if not cid:
        sin_com += 1; continue
    tipo_pry = (r.get("0 TIPO DE PROYECTO") or "").strip()
    pid = elegir_proyecto(cid, tipo_pry)
    if not pid:
        sin_com += 1; continue

    estado = GRUPO.get(r.get("_group", ""), "pendiente_inicio")
    cfo_estado = CFO.get((r.get("EstadoVISADO CFO") or "").strip().upper())
    f_cfo = fecha(r.get("CFO METIDO A VISAR"))

    # constructora -> ficha de contrata (por nombre) + crudo
    cons_raw = (r.get("CONSTRUCTORA") or "").strip() or None
    cons_id = contratas.get(cons_raw.upper()) if cons_raw else None
    if cons_id: con_contrata += 1

    # coordinador CSS
    coord_raw = (r.get("Coordinador") or "").strip() or None
    coord_id = COORD.get((coord_raw or "").upper())

    css = (r.get("0 CSS") or "").strip().upper() == "CONTRATADO"

    # CFO -> visado momento=fin_obra (cierra el circulo con la fase visado)
    cfo_visado_id = None
    if cfo_estado in ("a_visar", "visado"):
        vid = str(uuid.uuid4())
        visados_cfo.append({
            "id": vid, "proyecto_id": pid, "momento": "fin_obra",
            "estado": "visado" if cfo_estado == "visado" else "enviado",
            "organismo": "COAM",
            "fecha_envio": f_cfo, "fecha_visado": f_cfo if cfo_estado == "visado" else None,
        })
        migr.append({"board": BOARD, "monday_item_id": mid, "tabla_destino": "visados", "registro_id": vid})
        cfo_visado_id = vid
        con_cfo_visado += 1

    oid = str(uuid.uuid4())
    obras.append({
        "id": oid, "proyecto_id": pid, "estado": estado,
        "constructora_contrata_id": cons_id, "constructora": cons_raw,
        "css_contratado": css,
        "coordinador_css_equipo_id": coord_id,
        "coordinador_css_nombre": None if coord_id else coord_raw,
        "jefe_obra": (r.get("00b Jefe obra") or "").strip() or None,
        "fecha_acta_inicio": fecha(r.get("FECHA INICIO OBRA")),
        "fecha_fin_obra": fecha(r.get("FECHA FIN DE OBRA")),
        "cfo_estado": cfo_estado,
        "fecha_cfo_a_visar": f_cfo,
        "cfo_visado_id": cfo_visado_id,
    })
    migr.append({"board": BOARD, "monday_item_id": mid, "tabla_destino": "obras", "registro_id": oid})
    estados_out[estado] += 1

# claves uniformes
OK = ["id", "proyecto_id", "estado", "constructora_contrata_id", "constructora", "css_contratado",
      "coordinador_css_equipo_id", "coordinador_css_nombre", "jefe_obra", "fecha_acta_inicio",
      "fecha_fin_obra", "cfo_estado", "fecha_cfo_a_visar", "cfo_visado_id"]
obras = [{k: o.get(k) for k in OK} for o in obras]
VK = ["id", "proyecto_id", "momento", "estado", "organismo", "fecha_envio", "fecha_visado"]
visados_cfo = [{k: v.get(k) for k in VK} for v in visados_cfo]

print(f"BASE={BASE}")
print(f"  board 7: {len(b7)}  |  ya: {saltados}  |  sin comunidad/proyecto: {sin_com}")
print(f"  obras nuevas: {len(obras)}  |  con contrata enlazada: {con_contrata}")
print(f"  visados fin_obra (CFO): {len(visados_cfo)}  (visado descargado + a visar)")
print(f"  estados: {dict(estados_out)}")

if APPLY and obras:
    post_chunked("visados", visados_cfo)     # primero: las obras referencian cfo_visado_id
    post_chunked("obras", obras)
    post_chunked("migracion_monday", migr)
    print("  >> ESCRITO")
else:
    print("  (dry-run; usa --apply para escribir)")
