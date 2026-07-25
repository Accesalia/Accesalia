# -*- coding: utf-8 -*-
"""
Carga el catalogo de bloques (conceptos) desde docs/seleccion_encargos, pestana
'Bloques', a la tabla bloques. Idempotente por codigo.
Uso: SUPABASE_URL=... SUPABASE_SECRET_KEY=... python scripts/import_bloques.py
"""
import os, sys, io, json, urllib.request, urllib.parse
import openpyxl
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
XLSX = os.path.join(RAIZ, "docs", "seleccion_encargos (1).xlsx")
URL = os.environ["SUPABASE_URL"]; KEY = os.environ["SUPABASE_SECRET_KEY"]
PAQUETES = {"SATE CON CESION DE CAES", "SATE + ASCENSOR CON CESION DE CAES"}

def rest(method, path, body=None, prefer=None):
    req = urllib.request.Request(f"{URL}/rest/v1/{path}",
        data=json.dumps(body).encode() if body is not None else None, method=method)
    req.add_header("apikey",KEY); req.add_header("Authorization","Bearer "+KEY); req.add_header("Content-Type","application/json")
    if prefer: req.add_header("Prefer",prefer)
    r = urllib.request.urlopen(req); t = r.read().decode(); return json.loads(t) if t else []

wb = openpyxl.load_workbook(XLSX, data_only=True)
ws = wb["Bloques"]
bloques = []
orden = 0
for row in ws.iter_rows(values_only=True):
    if not row or not row[0]: continue
    codigo = str(row[0]).strip()
    if not codigo or codigo.upper() == "TEXTO": continue
    texto = str(row[1]).strip() if len(row) > 1 and row[1] else None
    primera = (texto or "").split("\n")[0].strip()
    nombre = primera if (primera and not primera[0].isdigit() and len(primera) <= 90) else codigo
    orden += 1
    bloques.append({"codigo": codigo, "nombre": nombre, "texto_plantilla": texto,
                    "es_paquete": codigo in PAQUETES, "orden": orden})

existentes = {b["codigo"] for b in rest("GET","bloques?select=codigo")}
creados, actualizados = 0, 0
for b in bloques:
    if b["codigo"] in existentes:
        rest("PATCH", f"bloques?codigo=eq.{urllib.parse.quote(b['codigo'])}", body=b); actualizados += 1
    else:
        rest("POST","bloques", b, prefer="return=minimal"); creados += 1

print(f"Bloques en Excel: {len(bloques)}  | creados: {creados}  actualizados: {actualizados}")
for b in bloques:
    print(f"  [{b['orden']:2}] {'PKG ' if b['es_paquete'] else '    '}{b['codigo']}  ->  {b['nombre'][:50]}")
