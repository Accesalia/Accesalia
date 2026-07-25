# -*- coding: utf-8 -*-
"""
Pasada COMPLETA (basta) de facturacion desde el texto de importes de Monday
(versiones_hoja.importes_forma_pago_texto). Crea lineas_facturacion + hitos_cobro
marcadas origen='monday_texto', verificado=false. Los PDFs afinan despues.
Salta hojas que ya tengan lineas (piloto PDF). Idempotente: borra sus lineas
monday_texto antes de re-crear.

DRY-RUN por defecto. --apply para escribir.
Uso: SUPABASE_URL=... SUPABASE_SECRET_KEY=... python scripts/parse_importes_monday.py [--apply]
"""
import os, sys, io, re, json, urllib.request
from collections import Counter
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
APPLY = "--apply" in sys.argv
URL = os.environ["SUPABASE_URL"]; KEY = os.environ["SUPABASE_SECRET_KEY"]

def rest(method, path, body=None, repr_=True):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}",
        data=json.dumps(body).encode() if body is not None else None, method=method)
    req.add_header("apikey", KEY); req.add_header("Authorization", "Bearer " + KEY); req.add_header("Content-Type", "application/json")
    req.add_header("Prefer", "return=representation" if repr_ else "return=minimal")
    r = urllib.request.urlopen(req); t = r.read().decode(); return json.loads(t) if repr_ and t else None
def rest_all(path):
    out = []; off = 0
    while True:
        ch = rest("GET", f"{path}&limit=1000&offset={off}"); out += ch
        if len(ch) < 1000: break
        off += 1000
    return out

bl = {b["codigo"]: b["id"] for b in rest("GET", "bloques?select=codigo,id")}
CONCEPTOS = [
    (re.compile(r"\bpr[yg]\b|proyecto"), "Proyecto", "REDACCION PROYECTO"),
    (re.compile(r"\bcss\b"), "CSS", "CSS"),
    (re.compile(r"\bdf\b|direccion facultativa"), "Dirección facultativa", "DF"),
    (re.compile(r"subv\w*|subenc\w*"), "Subvención", "TRAMITACION SUBVENCIONES ACCESIBILIDAD"),
    (re.compile(r"\biee\b"), "IEE", "IEE"),
    (re.compile(r"\blee\b|libro"), "Libro del edificio", "LEE"),
    (re.compile(r"\bcee\b"), "CEE", "CEE"),
]
HITOS_POR_N = {1: ["firma"], 2: ["firma", "entrega"], 3: ["firma", "licencia", "cfo"]}

def norm_num(s):
    s = s.strip().replace(" ", "")
    if "," in s and "." in s: s = s.replace(".", "").replace(",", ".")
    elif "," in s: s = s.replace(",", ".")
    elif re.match(r"^\d{1,3}(\.\d{3})+$", s): s = s.replace(".", "")
    try: return float(s)
    except Exception: return None

def parse(texto):
    if not texto or not texto.strip(): return None
    low = " " + texto.lower().strip() + " "
    if any(x in low for x in ["no result", "no tenemos precio", "incluido en", "pendiente de"]): return None
    # split de pago (50/50, 50/30/20)
    msplit = re.search(r"(\d{1,3}\s*/\s*\d{1,3}(?:\s*/\s*\d{1,3})?)", low)
    split = [int(x) for x in re.findall(r"\d+", msplit.group(1))] if msplit else None
    if split and (sum(split) < 80 or sum(split) > 120): split = None  # no parece reparto %
    # hito textual unico
    hito_unico = None
    if re.search(r"100\s*%|adelanto|100\)", low):
        if "entrega" in low: hito_unico = "entrega"
        else: hito_unico = "firma"
    # % a exito / prg
    pct = None
    m = re.search(r"(\d+)\s*%\s*(?:de\s+)?(?:exito|éxito|a\s+la\s+concesi|concesi)", low)
    if m: pct = int(m.group(1))
    elif re.search(r"\bprg\s*\d+", low): pct = int(re.search(r"\bprg\s*(\d+)", low).group(1))
    elif re.search(r"\b3\s*%", low) and "subv" in low: pct = 3
    # importes en ORDEN de aparicion, excluyendo: N% (reparto), años (2000-2030) y refs de factura
    amounts = []
    for mm in re.finditer(r"\d[\d.,]*", low):
        pre = low[max(0, mm.start() - 6):mm.start()]
        post = low[mm.end():mm.end() + 2]
        if post.lstrip().startswith("%"): continue          # es un % de reparto
        if "fact" in pre or "/" in post: continue           # ref de factura / fecha
        n = norm_num(mm.group())
        if not n or n < 100: continue
        if 2000 <= n <= 2030 and n == int(n): continue      # parece un año
        amounts.append(n)
    # conceptos en ORDEN de aparicion (unicos)
    hits = sorted((m.start(), desc, cod) for pat, desc, cod in CONCEPTOS for m in [pat.search(low)] if m)
    seen = set(); conceptos = []
    for _, desc, cod in hits:
        if desc in seen: continue
        seen.add(desc); conceptos.append((desc, cod))
    # emparejar por orden: importe[i] <-> concepto[i]; sobrantes -> Honorarios
    lineas = []
    for i, amt in enumerate(amounts):
        desc, cod = conceptos[i] if i < len(conceptos) else ("Honorarios (estimado)", "REDACCION PROYECTO")
        lineas.append([desc, amt, cod, False, None])
    if pct:
        lineas.append(["Subvención – variable (a éxito)", None, "TRAMITACION SUBVENCIONES ACCESIBILIDAD", True, pct])
    if not lineas: return None
    return (lineas, split, hito_unico)

# hojas con texto de importes y SIN lineas todavia
hojas = rest_all("versiones_hoja?select=hoja_encargo_id,importes_forma_pago_texto&importes_forma_pago_texto=not.is.null")
con_linea = {l["hoja_encargo_id"] for l in rest_all("lineas_facturacion?select=hoja_encargo_id")}

rep = Counter(); muestras = []
for v in hojas:
    hoja = v["hoja_encargo_id"]; texto = v["importes_forma_pago_texto"]
    if hoja in con_linea: rep["ya_tiene"] += 1; continue
    r = parse(texto)
    if r is None: rep["sin_precio/skip"] += 1; continue
    lineas, split, hito_unico = r
    rep["hojas"] += 1; rep["lineas"] += len(lineas)
    if len(muestras) < 12:
        muestras.append((texto[:46], [(l[0], l[1], f"{l[4]}%" if l[3] else "") for l in lineas], split or hito_unico))
    if not APPLY: continue
    for desc, imp, cod, esp, pctv in lineas:
        L = rest("POST", "lineas_facturacion", {"hoja_encargo_id": hoja, "descripcion": desc,
            "importe": imp, "es_porcentaje": esp, "porcentaje": pctv, "bloque_id": bl.get(cod),
            "origen": "monday_texto", "verificado": False})[0]
        # hitos
        if esp:
            rest("POST", "hitos_cobro", {"linea_facturacion_id": L["id"], "hito": "concesion", "orden": 1,
                "porcentaje": pctv, "estado": "pendiente"}, repr_=False); rep["hitos"] += 1
        else:
            partes = split if split else ([100] if not hito_unico else None)
            if hito_unico and not split:
                rest("POST", "hitos_cobro", {"linea_facturacion_id": L["id"], "hito": hito_unico, "orden": 1,
                    "porcentaje": 100, "importe": imp, "estado": "pendiente"}, repr_=False); rep["hitos"] += 1
            else:
                nombres = HITOS_POR_N.get(len(partes), ["firma"] * len(partes))
                for i, p in enumerate(partes):
                    rest("POST", "hitos_cobro", {"linea_facturacion_id": L["id"], "hito": nombres[i], "orden": i + 1,
                        "porcentaje": p, "importe": round(imp * p / 100, 2) if imp else None, "estado": "pendiente"}, repr_=False)
                    rep["hitos"] += 1

print("=" * 60)
print(f"PARSE IMPORTES MONDAY  [{'APPLY' if APPLY else 'DRY-RUN'}]")
print("=" * 60)
for k in ["hojas", "lineas", "hitos", "sin_precio/skip", "ya_tiene"]:
    print(f"  {k:18}: {rep.get(k,0)}")
print("\n-- muestras (texto -> lineas | reparto) --")
for m in muestras:
    print(f"  · {m[0]:46}")
    print(f"      -> {m[1]}  | pago {m[2]}")
print("\n[DRY-RUN] nada escrito." if not APPLY else "\n[APPLY] hecho.")
