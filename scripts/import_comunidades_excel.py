# -*- coding: utf-8 -*-
"""
ETAPA 1 del flujo comercial: crea las COMUNIDADES que solo estan en el Excel
seleccion_encargos (prospectos presupuestados-no-firmados, que no llegaron a
Monday). Reusa las que ya existen (match por direccion). NO toca hojas/conceptos.

DRY-RUN por defecto. --apply para escribir.
Uso: SUPABASE_URL=... SUPABASE_SECRET_KEY=... python scripts/import_comunidades_excel.py
"""
import os, sys, io, re, json, unicodedata, urllib.request
from collections import defaultdict, Counter
import openpyxl
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
APPLY = "--apply" in sys.argv
XLSX = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "seleccion_encargos (1).xlsx")
URL = os.environ["SUPABASE_URL"]; KEY = os.environ["SUPABASE_SECRET_KEY"]

def norm(s):
    if not s: return ""
    s=unicodedata.normalize("NFD",str(s)).encode("ascii","ignore").decode()
    return re.sub(r"[^a-z0-9]+"," ",s.lower()).strip()
SUF=re.compile(r"\b(subvencion(es)?|subv|financiacion)\b.*$", re.I)
def clean(s):
    s=re.sub(r"\s*\([^)]*\)\s*$","",str(s or "")).strip()
    s=SUF.sub("",s).strip().rstrip(",").strip()
    return s
def keyn(s): return norm(clean(s))
def parse(s):
    n=keyn(s); t=n.split()
    i=next((k for k,x in enumerate(t) if re.match(r"^\d",x)),None)
    if i is None: return (n,None,"")
    return (" ".join(t[:i]), t[i], " ".join(t[i+1:]))

def rest(method, path, body=None, prefer=None):
    req=urllib.request.Request(f"{URL}/rest/v1/{path}",
        data=json.dumps(body).encode() if body is not None else None, method=method)
    req.add_header("apikey",KEY); req.add_header("Authorization","Bearer "+KEY); req.add_header("Content-Type","application/json")
    if prefer: req.add_header("Prefer",prefer)
    r=urllib.request.urlopen(req); t=r.read().decode(); return json.loads(t) if t else []

comus=rest("GET","comunidades?select=id,nombre")
by_norm={norm(c["nombre"]):c["id"] for c in comus}
by_sn=defaultdict(list)
for c in comus:
    st,nu,lo=parse(c["nombre"])
    if nu: by_sn[(st,nu)].append((lo,c["id"]))

def match(d):
    if keyn(d) in by_norm: return "reusada"
    st,nu,lo=parse(d); cands=by_sn.get((st,nu),[])
    if cands:
        if lo and any(c[0]==lo or lo in c[0] or c[0] in lo for c in cands): return "reusada"
        if len(cands)==1: return "reusada"
        return "ambigua"
    return "nueva"

wb=openpyxl.load_workbook(XLSX,data_only=True,read_only=True)
ws=wb["seleccion_encargos"]; filas=[r for r in ws.iter_rows(values_only=True)]
datos=[r for r in filas[1:] if any(v not in (None,"") for v in r)]

# agrupar direcciones distintas del Excel
grupos={}
for r in datos:
    if not r[0]: continue
    grupos.setdefault(keyn(r[0]), r[0])

rep=Counter(); nuevas=[]; sin_localidad=0
for k,ejemplo in grupos.items():
    if not k: continue
    m=match(ejemplo)
    rep[m]+=1
    if m=="nueva":
        st,nu,lo=parse(ejemplo)
        nombre=clean(ejemplo).upper()
        municipio=lo.upper() if lo else None
        if not municipio: sin_localidad+=1
        nuevas.append({"nombre":nombre,"municipio":municipio})

print("="*66)
print(f"ETAPA 1 - COMUNIDADES del Excel  [{'APPLY' if APPLY else 'DRY-RUN'}]")
print("="*66)
print(f"  direcciones distintas en Excel: {len(grupos)}")
print(f"  ya existen (reusadas):          {rep['reusada']}")
print(f"  NUEVAS a crear:                 {rep['nueva']}")
print(f"  ambiguas (revisar a mano):      {rep['ambigua']}")
print(f"  de las nuevas, SIN localidad clara (revisar): {sin_localidad}")
print(f"\n  => comunidades tras etapa 1: {len(comus)} + {rep['nueva']} = {len(comus)+rep['nueva']}")
print("\n-- muestra de NUEVAS --")
for n in nuevas[:12]: print(f"   · {n['nombre']}   [muni: {n['municipio']}]")

if APPLY:
    creadas=0
    for n in nuevas:
        if norm(n["nombre"]) in by_norm: continue
        rest("POST","comunidades", n, prefer="return=minimal"); creadas+=1
        by_norm[norm(n["nombre"])]=True
    print(f"\n[APPLY] comunidades creadas: {creadas}")
else:
    print("\n[DRY-RUN] nada escrito.")
