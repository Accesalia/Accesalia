# -*- coding: utf-8 -*-
# Descarga el board TRES PRESUPUESTOS (5052849653) a scratchpad y saca un resumen
# de estructura (grupos, columnas, enlaces board-relation) para modelar el import.
#   MONDAY_TOKEN=... python fetch_monday_tres_presupuestos.py
import json, sys, os, io, urllib.request
from collections import Counter, defaultdict
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

TK = os.environ["MONDAY_TOKEN"]
SP = r"C:/Users/mfavi/AppData/Local/Temp/claude/c--Users-mfavi-ACCESALIA/96145bcd-0021-4665-8aa7-62e3ab901e4d/scratchpad"
BOARD = "5052849653"

def gql(q):
    req = urllib.request.Request("https://api.monday.com/v2", data=json.dumps({"query": q}).encode(),
        headers={"Authorization": TK, "Content-Type": "application/json", "API-Version": "2024-10"})
    d = json.loads(urllib.request.urlopen(req).read().decode())
    if "errors" in d: sys.exit("GQL: " + json.dumps(d["errors"])[:800])
    return d["data"]

CV = ('column_values { column { title id type } text '
      '... on BoardRelationValue { display_value linked_item_ids linked_items { id name } } '
      '... on MirrorValue { display_value } }')
ITEMS = f"items {{ id name group {{ title }} {CV} }}"
d = gql(f'query {{ boards(ids:{BOARD}) {{ items_page(limit:200) {{ cursor {ITEMS} }} }} }}')
p = d["boards"][0]["items_page"]; raw = p["items"]; cur = p["cursor"]
while cur:
    d = gql(f'query {{ next_items_page(cursor:"{cur}", limit:200) {{ cursor {ITEMS} }} }}')
    raw += d["next_items_page"]["items"]; cur = d["next_items_page"]["cursor"]

rows = []
link_targets = defaultdict(Counter)  # columna -> nombres enlazados (muestra)
for it in raw:
    r = {"_id": it["id"], "_name": it["name"], "_group": (it.get("group") or {}).get("title", "")}
    for cv in it["column_values"]:
        col = cv["column"]; t = col["title"]
        r[t] = cv.get("text") or cv.get("display_value") or ""
        if cv.get("linked_item_ids"):
            r["_ids_" + t] = cv["linked_item_ids"]
            for li in (cv.get("linked_items") or [])[:1]:
                link_targets[t][li["name"]] += 1
    rows.append(r)

json.dump(rows, open(f"{SP}/board_tres_presupuestos.json", "w", encoding="utf-8"), ensure_ascii=False)

# ---- resumen ----
print("=" * 74)
print(f"TRES PRESUPUESTOS  board {BOARD}  |  items: {len(rows)}")
print("=" * 74)
print("\nGRUPOS:")
for g, n in Counter(r["_group"] for r in rows).most_common():
    print(f"  {n:4}  {g}")

# columnas: cuantas filas tienen valor
cols = Counter()
tipos = {}
for it in raw:
    for cv in it["column_values"]:
        t = cv["column"]["title"]
        tipos[t] = cv["column"]["type"]
        if cv.get("text") or cv.get("display_value"):
            cols[t] += 1
print(f"\nCOLUMNAS ({len(cols)} con datos), [tipo]  rellenas/{len(rows)}:")
for t, n in cols.most_common():
    print(f"  {n:4}/{len(rows)}  [{tipos.get(t,'')}]  {t}")

print("\nENLACES (board-relation) -> muestra de destino:")
for t, c in link_targets.items():
    ej = ", ".join(list(c)[:2])
    print(f"  {t}: p.ej. {ej}")

print("\nMUESTRA 3 items (todas las columnas con valor):")
for r in rows[:3]:
    print(f"\n  · {r['_name']}  [{r['_group']}]")
    for k, v in r.items():
        if k.startswith("_") or not v: continue
        print(f"      {k}: {str(v)[:70]}")
