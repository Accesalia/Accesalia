# -*- coding: utf-8 -*-
# Importa "TRES PRESUPUESTOS" (board 5052849653, 211) -> licitaciones + presupuestos_licitacion.
# SOLO LA PARTE DE GESTION (auditoria 2026-07-23): estado de licitacion, preferida/ganadora,
# enlace al ppto firmado, junta prevista, señal +2 pptos. La COMISION de contrata NO se migra
# aqui: vive en facturacion (se define al crear el encargo). Los MIRRORS no se migran (son
# relaciones reales en nuestro modelo). Monday no guarda los 3 importes -> solo nombres.
#
# Uso:  BASE=... KEY=... python import_monday_tres_presupuestos.py [--apply]
import json, sys, os, io, uuid, urllib.request, urllib.parse
from collections import Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = os.environ["BASE"].rstrip("/")
KEY  = os.environ["KEY"]
SP   = r"C:/Users/mfavi/AppData/Local/Temp/claude/c--Users-mfavi-ACCESALIA/96145bcd-0021-4665-8aa7-62e3ab901e4d/scratchpad"
APPLY = "--apply" in sys.argv
BOARD = "TRES PRESUPUESTOS"

def rest(path, method="GET", body=None, prefer=None):
    h = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    if prefer: h["Prefer"] = prefer
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(f"{BASE}/rest/v1/{path}", data=data, headers=h, method=method)
    with urllib.request.urlopen(req) as r:
        raw = r.read().decode(); return json.loads(raw) if raw else None

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

def norm(s):
    return (s or "").strip().upper()

# ---- mapas ----
proy_map = {m["monday_item_id"]: m["registro_id"] for m in
            rest_all("migracion_monday?select=monday_item_id,registro_id&board=eq." +
                     urllib.parse.quote("4 PROYECTO TECNICO") + "&tabla_destino=eq.proyectos")}
com_map = {m["monday_item_id"]: m["registro_id"] for m in
           rest_all("migracion_monday?select=monday_item_id,registro_id&board=eq." +
                    urllib.parse.quote("0 LISTADO DE DIRECCIONES") + "&tabla_destino=eq.comunidades")}
por_com = {}
for p in rest_all("proyectos?select=id,comunidad_id,tipo"):
    por_com.setdefault(p["comunidad_id"], []).append(p)
contratas = {norm(c["nombre"]): c["id"] for c in rest_all("contratas?select=id,nombre")}
ya = {m["monday_item_id"] for m in
      rest_all("migracion_monday?select=monday_item_id&board=eq." + urllib.parse.quote(BOARD) +
               "&tabla_destino=eq.licitaciones")}

# Status Monday -> estado nuestro
STATUS = {"Adjudicado": "adjudicada", "No empezado": "abierta", "Pedidos pptos": "abierta",
          "En poder del admin": "a_junta", "En pausa": "abierta", "En votacion": "a_junta",
          "Recibidos pptos": "presupuestos_recibidos"}
ESPERANDO = {"Pedidos pptos": "contratas (presupuestos)", "En poder del admin": "admin / junta"}

def elegir_proyecto(item):
    # 1) enlace directo a 4 PROYECTO TECNICO
    for mid in (item.get("_ids_4 PROYECTO TECNICO") or []):
        pid = proy_map.get(str(mid))
        if pid: return pid
    # 2) via comunidad + tipo
    cid = None
    for mid in (item.get("_ids_link to 0 LISTADO DE DIRECCIONES") or []):
        cid = com_map.get(str(mid))
        if cid: break
    if not cid: return None
    ps = por_com.get(cid, [])
    if not ps: return None
    if len(ps) == 1: return ps[0]["id"]
    tipo_raw = (item.get("Tipo pry") or "").strip()
    exact = [p for p in ps if (p.get("tipo") or "").strip() == tipo_raw]
    return exact[0]["id"] if len(exact) == 1 else ps[0]["id"]

def presu(licit_id, nombre, rol, estado, firmado, enlace=None):
    raw = (nombre or "").strip()
    cid = contratas.get(norm(raw))
    return {
        "id": str(uuid.uuid4()), "licitacion_id": licit_id,
        "contrata_id": cid, "contrata_externa_nombre": None if cid else raw,
        "origen": "invitada_por_nosotros", "rol_pretendido": rol,
        "importe_pem": None, "estado": estado,
        "firmado_contrata": firmado, "firmado_comunidad": False,
        "enlace_documento": enlace, "fecha_presupuesto": None,
    }

board = json.load(open(f"{SP}/board_tres_presupuestos.json", encoding="utf-8"))

licits, presus, migr = [], [], []
sin_proy = saltados = con_ganador = con_preferida = solo_ext = 0
estados_out = Counter()

for it in board:
    mid = it["_id"]
    if mid in ya:
        saltados += 1; continue
    pid = elegir_proyecto(it)
    if not pid:
        sin_proy += 1; continue

    status = (it.get("Status") or "").strip()
    terminado = (it.get("Terminado") or "").strip()
    pref = (it.get("Preferida") or "").strip()
    gan  = (it.get("Ganadora") or "").strip()
    enlace = (it.get("Enlace a ppto firmado") or "").strip() or None

    # estado de la licitacion
    if terminado == "Cancelado":
        estado = "cancelada"
    elif gan:
        estado = "adjudicada"
    else:
        estado = STATUS.get(status, "abierta")

    # notas: conservar señales que no tienen campo propio
    notas_parts = []
    if (it.get("Notas") or "").strip(): notas_parts.append(it["Notas"].strip())
    p2 = (it.get("+2 pptos") or "").strip()
    if p2 in ("si", "faltan", "peligro"): notas_parts.append(f"+2 pptos: {p2}")
    if status == "En pausa": notas_parts.append("EN PAUSA (Monday)")
    notas = " · ".join(notas_parts) or None

    lid = str(uuid.uuid4())
    licits.append({
        "id": lid, "proyecto_id": pid, "paquete": "unico", "estado": estado,
        "esperando_de": ESPERANDO.get(status), "fecha_votacion": fecha(it.get("Junta prevista")),
        "notas": notas,
    })
    migr.append({"board": BOARD, "monday_item_id": mid, "tabla_destino": "licitaciones", "registro_id": lid})
    estados_out[estado] += 1

    # presupuestos derivados de los textos (Monday no guarda los 3 importes)
    if gan and pref and norm(gan) == norm(pref):
        presus.append(presu(lid, gan, "preferida", "adjudicada", True, enlace)); con_ganador += 1; con_preferida += 1
    else:
        if gan:
            presus.append(presu(lid, gan, "na", "adjudicada", True, enlace)); con_ganador += 1
        if pref and (not gan or norm(pref) != norm(gan)):
            presus.append(presu(lid, pref, "preferida", "no_adjudicada" if gan else "presupuestado", False)); con_preferida += 1

# claves uniformes
LK = ["id", "proyecto_id", "paquete", "estado", "esperando_de", "fecha_votacion", "notas"]
licits = [{k: l.get(k) for k in LK} for l in licits]
PK = ["id", "licitacion_id", "contrata_id", "contrata_externa_nombre", "origen", "rol_pretendido",
      "importe_pem", "estado", "firmado_contrata", "firmado_comunidad", "enlace_documento", "fecha_presupuesto"]
presus = [{k: p.get(k) for k in PK} for p in presus]
ext = sum(1 for p in presus if p["contrata_externa_nombre"])

print("=" * 74)
print(f"IMPORT TRES PRESUPUESTOS  ({'APPLY' if APPLY else 'DRY-RUN'})  base: {BASE}")
print("=" * 74)
print(f"  items board: {len(board)}  |  ya migrados: {saltados}  |  sin proyecto: {sin_proy}")
print(f"  licitaciones nuevas: {len(licits)}")
print(f"  presupuestos: {len(presus)}  (ganador: {con_ganador} · preferida: {con_preferida} · por texto sin ficha: {ext})")
print(f"  estados licitacion: {dict(estados_out)}")

if APPLY and licits:
    post_chunked("licitaciones", licits)
    post_chunked("presupuestos_licitacion", presus)
    post_chunked("migracion_monday", migr)
    print("  >> ESCRITO")
else:
    print("  (dry-run; usa --apply para escribir)")
