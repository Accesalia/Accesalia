# -*- coding: utf-8 -*-
# Rellena proyectos.pagador desde el tablero 4 ("2 QUIEN PAGA") sin re-importar:
# mapea board4 -> proyecto via migracion_monday y hace PATCH. BASE/KEY de entorno.
import json, os, sys, io, urllib.request, urllib.parse
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
BASE = os.environ["BASE"].rstrip("/"); KEY = os.environ["KEY"]
SP = r"C:/Users/mfavi/AppData/Local/Temp/claude/c--Users-mfavi-ACCESALIA/96145bcd-0021-4665-8aa7-62e3ab901e4d/scratchpad"

def rest(path, method="GET", body=None):
    h = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}
    req = urllib.request.Request(f"{BASE}/rest/v1/{path}", data=json.dumps(body).encode() if body is not None else None, headers=h, method=method)
    with urllib.request.urlopen(req) as r:
        raw = r.read().decode(); return json.loads(raw) if raw else None

def rest_all(path):
    out = []
    while True:
        h = {"apikey": KEY, "Authorization": f"Bearer {KEY}", "Range": f"{len(out)}-{len(out)+999}"}
        req = urllib.request.Request(f"{BASE}/rest/v1/{path}", headers=h)
        with urllib.request.urlopen(req) as r: chunk = json.loads(r.read().decode())
        out += chunk
        if len(chunk) < 1000: break
    return out

mp = {m["monday_item_id"]: m["registro_id"] for m in
      rest_all("migracion_monday?select=monday_item_id,registro_id&board=eq." + urllib.parse.quote("4 PROYECTO TECNICO") + "&tabla_destino=eq.proyectos")}
b4 = json.load(open(f"{SP}/board_4_full.json", encoding="utf-8"))
n = 0
for r in b4:
    pid = mp.get(r["_id"])
    if not pid:
        continue
    patch = {}
    pagador = (r.get("2 QUIEN PAGA") or "").strip()
    comercial = (r.get("0 Comercial interno") or "").strip()
    if pagador:
        patch["pagador"] = pagador
    if comercial:
        patch["comercial_interno"] = comercial
    if patch:
        rest(f"proyectos?id=eq.{pid}", "PATCH", patch); n += 1
print(f"{BASE} -> {n} proyectos actualizados (pagador + comercial interno)")
