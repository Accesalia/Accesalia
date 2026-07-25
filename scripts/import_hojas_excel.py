# -*- coding: utf-8 -*-
"""
ETAPA 2: HOJAS DE ENCARGO desde docs/seleccion_encargos (pestana seleccion).
Cada fila = una hoja (estado enviada_comunidad) con su version v1 (fecha del Excel)
y sus conceptos (checks True -> bloques). La comunidad ya existe (etapa 1).
Registra en migracion_monday (board 'excel_seleccion') por idempotencia/trazabilidad.

DRY-RUN por defecto. --apply para escribir.
Uso: SUPABASE_URL=... SUPABASE_SECRET_KEY=... python scripts/import_hojas_excel.py
"""
import os, sys, io, re, json, unicodedata, urllib.request, urllib.parse, hashlib
from collections import defaultdict, Counter
import openpyxl
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
APPLY = "--apply" in sys.argv
XLSX = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "docs", "seleccion_encargos (1).xlsx")
URL = os.environ["SUPABASE_URL"]; KEY = os.environ["SUPABASE_SECRET_KEY"]
BOARD = "excel_seleccion"

def norm(s):
    if not s: return ""
    s=unicodedata.normalize("NFD",str(s)).encode("ascii","ignore").decode()
    return re.sub(r"[^a-z0-9]+"," ",s.lower()).strip()
SUF=re.compile(r"\b(subvencion(es)?|subv|financiacion)\b.*$", re.I)
def clean(s): return SUF.sub("",re.sub(r"\s*\([^)]*\)\s*$","",str(s or "")).strip()).strip().rstrip(",").strip()
def keyn(s): return norm(clean(s))
def parse(s):
    n=keyn(s); t=n.split()
    i=next((k for k,x in enumerate(t) if re.match(r"^\d",x)),None)
    if i is None: return (n,None,"")
    return (" ".join(t[:i]), t[i], " ".join(t[i+1:]))
def fecha_iso(v):
    if v is None: return None
    s=str(v)[:10]
    m=re.match(r"(\d{4})-(\d{2})-(\d{2})", s)
    if m and int(m.group(1))>=2000: return s
    m2=re.match(r"(\d{2})/(\d{2})/(\d{4})", s)
    if m2 and int(m2.group(3))>=2000: return f"{m2.group(3)}-{m2.group(2)}-{m2.group(1)}"
    return None

def rest(method, path, body=None, prefer=None):
    req=urllib.request.Request(f"{URL}/rest/v1/{path}",
        data=json.dumps(body).encode() if body is not None else None, method=method)
    req.add_header("apikey",KEY); req.add_header("Authorization","Bearer "+KEY); req.add_header("Content-Type","application/json")
    if prefer: req.add_header("Prefer",prefer)
    r=urllib.request.urlopen(req); t=r.read().decode(); return json.loads(t) if t else []

def rest_all(path):
    out=[]; off=0
    while True:
        ch=rest("GET", f"{path}&limit=1000&offset={off}")
        out+=ch
        if len(ch)<1000: break
        off+=1000
    return out

# indices comunidad + bloques + ya-importadas
comus=rest_all("comunidades?select=id,nombre")
by_norm={norm(c["nombre"]):c["id"] for c in comus}
by_sn=defaultdict(list)
for c in comus:
    st,nu,lo=parse(c["nombre"])
    if nu: by_sn[(st,nu)].append((lo,c["id"]))
def com_id(d):
    if keyn(d) in by_norm: return by_norm[keyn(d)]
    st,nu,lo=parse(d); cands=by_sn.get((st,nu),[])
    if cands:
        if lo:
            m=[c for c in cands if c[0]==lo or lo in c[0] or c[0] in lo]
            if m: return m[0][1]
        if len(cands)==1: return cands[0][1]
    return None
bloques={b["codigo"]:b["id"] for b in rest("GET","bloques?select=codigo,id")}
ya={m["monday_item_id"] for m in rest_all(f"migracion_monday?select=monday_item_id&board=eq.{BOARD}&tabla_destino=eq.hojas_encargo")}

wb=openpyxl.load_workbook(XLSX,data_only=True,read_only=True)
ws=wb["seleccion_encargos"]; filas=[r for r in ws.iter_rows(values_only=True)]
hdr=[str(v).strip() if v else "" for v in filas[0]]
concept_cols=[(i,hdr[i]) for i in range(3,21) if hdr[i] in bloques]
datos=[r for r in filas[1:] if any(v not in (None,"") for v in r)]

rep=Counter(); fechas=[]; sample=[]
# Clave = posicion de la fila en el Excel. Cada fila = una hoja (NO deduplicar:
# una comunidad tiene varias hojas legitimas, a veces mismo tipo/fecha).

def crear(r,f,k):
    cid=com_id(r[0])
    if cid is None: rep["sin_comunidad"]+=1; return
    rep["hojas"]+=1
    if f: fechas.append(f)
    else: rep["sin_fecha"]+=1
    concs=[bloques[h] for i,h in concept_cols if i<len(r) and r[i] is True]
    rep["conceptos"]+=len(concs)
    if not concs: rep["hojas_sin_conceptos"]+=1
    if len(sample)<8 and concs: sample.append((str(r[0])[:34], str(r[2])[:30], f, len(concs)))
    if not APPLY: return
    hoja=rest("POST","hojas_encargo",{"comunidad_id":cid,"estado":"enviada_comunidad",
        "descripcion":(str(r[2]) if r[2] else None),
        "pagador_tipo":"comunidad","emisor":"accesalia","fecha_creacion":f or "2000-01-01"},
        prefer="return=representation")[0]
    ver=rest("POST","versiones_hoja",{"hoja_encargo_id":hoja["id"],"numero_version":1,
        "fecha_generada":f,"fecha_enviada":f}, prefer="return=representation")[0]
    if concs:
        rest("POST","conceptos_hoja",[{"version_hoja_id":ver["id"],"hoja_encargo_id":hoja["id"],
            "bloque_id":b,"incluido":False} for b in concs], prefer="return=minimal")
    rest("POST","hojas_encargo_estado_historial",{"hoja_encargo_id":hoja["id"],
        "estado":"enviada_comunidad","fecha_estado":(f+"T00:00:00Z") if f else None}, prefer="return=minimal")
    rest("POST","migracion_monday",{"board":BOARD,"monday_item_id":k,
        "tabla_destino":"hojas_encargo","registro_id":hoja["id"]}, prefer="return=minimal")

# fechas con reparacion por vecindad (arrastra la ultima valida ante fecha corrupta)
prev=None
for i,r in enumerate(datos):
    if not r[0]: rep["sin_direccion"]+=1; continue
    f=fecha_iso(r[1])
    if f is None and r[1] not in (None,""):  # corrupta -> vecina anterior
        f=prev; rep["fecha_reparada"]+=1
    if f: prev=f
    k=f"fila_{i}"
    if k in ya: rep["ya_importada"]+=1; continue
    try:
        crear(r,f,k)
    except Exception as e:
        rep["error"]+=1
        if rep["error"]<=5: print("  ERROR fila", str(r[0])[:30], "->", str(e)[:120])

print("="*66)
print(f"ETAPA 2 - HOJAS (Excel)  [{'APPLY' if APPLY else 'DRY-RUN'}]  base:{URL}")
print("="*66)
for k in ["hojas","conceptos","hojas_sin_conceptos","sin_fecha","sin_comunidad","ya_importada","sin_direccion"]:
    print(f"  {k:22}: {rep.get(k,0)}")
if fechas: print(f"  rango fechas: {min(fechas)} .. {max(fechas)}")
print("\n-- muestra --")
for s in sample: print(f"   · {s[0]:34} | {s[1]:30} | {s[2]} | {s[3]} conceptos")
print("\n[DRY-RUN] nada escrito." if not APPLY else "\n[APPLY] hecho.")
