# -*- coding: utf-8 -*-
# Importa el tablero Monday "4 PROYECTO TECNICO" -> proyectos + etapas_proyecto.
# Modelo hibrido: guardamos HECHOS (fechas/estados/responsables crudos); las
# metricas (tiempo, desviacion) se calculan al vuelo. NO importamos mirrors
# precalculados de Monday (Facturado, Cobrado, Tiempo empleado, Desviacion).
#
# Uso:  BASE=... KEY=... python import_monday_proyecto.py [--apply]
#   dry-run por defecto; --apply escribe. Idempotente por migracion_monday.
import json, sys, os, io, uuid, urllib.request, urllib.parse
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE = os.environ["BASE"].rstrip("/")
KEY  = os.environ["KEY"]
SP   = r"C:/Users/mfavi/AppData/Local/Temp/claude/c--Users-mfavi-ACCESALIA/96145bcd-0021-4665-8aa7-62e3ab901e4d/scratchpad"
APPLY = "--apply" in sys.argv
BOARD = "4 PROYECTO TECNICO"

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

# ---- mapas ----
com = {r["monday_item_id"]: r["registro_id"] for r in
       rest_all("migracion_monday?select=monday_item_id,registro_id&board=eq." +
                urllib.parse.quote("0 LISTADO DE DIRECCIONES") + "&tabla_destino=eq.comunidades")}
equipo = rest_all("equipo?select=id,nombre")
by_name = {e["nombre"].upper(): e["id"] for e in equipo}
by_name["CARLOS ALBERTO"] = by_name.get("CARLOS DAZA")   # fusion confirmada por la propietaria
PLACEHOLDER = {"", "A- PENDIENTE DE ASIGNAR", "PTE DE ASIGNAR", "OTRO"}
NO_APLICA_RESP = {"EXTERNO", "SUBVENCIONES"}

ya = {m["monday_item_id"] for m in
      rest_all("migracion_monday?select=monday_item_id&board=eq." + urllib.parse.quote(BOARD) +
               "&tabla_destino=eq.proyectos")}

# Catalogo de tipos (clave -> id) para desglosar los combos en tags.
tip = {t["clave"]: t["id"] for t in rest_all("tipos_proyecto?select=id,clave")}
TAGS = {
    "ASCENSOR": ["ascensor"], "SATE": ["sate"], "ACCESIB": ["accesibilidad"], "OTRO": ["otro"],
    "SATE + ASC": ["sate", "ascensor"], "subv ACCESIB": ["accesibilidad"], "SOLO IEE": ["doc_tecnica"],
    "subv ASC EXTERNO": ["ascensor"], "SATE + ACCESIB": ["sate", "accesibilidad"], "PERICIAL": ["pericial"],
    "CUBIERTA": ["cubierta"], "subv SATE EXTERNO": ["sate"], "SOLO DF": ["df"],
    "ASC + ACCES": ["ascensor", "accesibilidad"], "ASCENSOR + CUBIERTA": ["ascensor", "cubierta"],
    "subv CUBIERTA": ["cubierta"],
}
EXTERNO_RAW = {"subv ASC EXTERNO", "subv SATE EXTERNO"}

GRUPO_ESTADO = {
    "Proyecto no procede": "no_procede",
    "No asignados a tco": "no_asignado",
    "Proyecto pendiente de iniciar (EA listo)": "ea_listo",
    "Proyecto en curso": "en_curso",
    "Proyecto en pausa": "en_pausa",
    "Pry finalizado por tco": "listo",
}
CEE = {"Listo": "listo", "PENDIENTE": "pendiente", "NO REQUERIDO": "no_requerido"}
OKDANIEL = {"OK": "ok", "Pendiente": "pendiente", "Corrigiendo": "corrigiendo",
            "NO REQUERIDO": "no_requerido", "en calendario": "en_cola"}

def fecha(v):
    v = (v or "").strip()
    return v if len(v) == 10 and v[4] == "-" else None

def resp(raw):
    """(equipo_id, nombre_crudo) desde un valor de EA asign / TECNICO."""
    v = (raw or "").strip()
    if v.upper() in PLACEHOLDER: return None, None       # sin asignar: ni id ni nombre
    if v.upper() in NO_APLICA_RESP: return None, v       # EXTERNO / SUBVENCIONES: marcador real
    return by_name.get(v.upper()), v

b4 = json.load(open(f"{SP}/board_4_full.json", encoding="utf-8"))

proyectos, etapas, migr, ptipos = [], [], [], []
sin_com = nuevos = saltados = 0
map_com_hit = 0
for r in b4:
    mid = r["_id"]
    if mid in ya:
        saltados += 1
        continue
    links = r.get("_ids_0 LISTADO DE DIRECCIONES") or []
    cid = com.get(str(links[0])) if links else None
    if not cid:
        sin_com += 1
        continue
    map_com_hit += 1
    estado = GRUPO_ESTADO.get(r.get("_group", ""), "no_asignado")
    pid = str(uuid.uuid4())
    arranque = estado in ("ea_listo", "en_curso", "en_pausa", "listo")
    tipo_raw = (r.get("0 TIPO DE PROYECTO") or "").strip()
    proyectos.append({
        "id": pid, "comunidad_id": cid, "estado": estado,
        "tipo": tipo_raw or None,
        "pagador": (r.get("2 QUIEN PAGA") or "").strip() or None,
        "comercial_interno": (r.get("0 Comercial interno") or "").strip() or None,
        "fecha_contratado": fecha(r.get("0 Contratado")),
        # El tablero 4 es el de PRODUCCION: todo lo que esta ahi ya paso el cobro.
        "arranque_cumplido": True,
        "proyecto_externo": tipo_raw in EXTERNO_RAW,
        "cee_estado": CEE.get((r.get("CEE") or "").strip()),
        "revision_estado": OKDANIEL.get((r.get("OK daniel") or "").strip()),
    })
    for clave in TAGS.get(tipo_raw, []):
        if tip.get(clave):
            ptipos.append({"proyecto_id": pid, "tipo_id": tip[clave]})
    migr.append({"board": BOARD, "monday_item_id": mid, "tabla_destino": "proyectos", "registro_id": pid})
    nuevos += 1
    if estado == "no_procede":
        continue  # sin pasos: el proyecto no procede

    nube = (r.get("3 NUBE MONTADA") or "").strip().upper()
    fscan = fecha(r.get("3 fecha scan"))
    # escaneo
    if nube == "NO REQUERIDA": e_esc = "no_aplica"
    elif fscan: e_esc = "terminada"
    else: e_esc = "pendiente"
    etapas.append({"id": str(uuid.uuid4()), "proyecto_id": pid, "tipo_etapa": "escaneo",
                   "orden": 10, "estado": e_esc, "fecha_inicio": fscan})
    # montaje_nube
    e_mont = {"NUBE PREPARADA": "terminada", "NO REQUERIDA": "no_aplica"}.get(nube, "pendiente")
    etapas.append({"id": str(uuid.uuid4()), "proyecto_id": pid, "tipo_etapa": "montaje_nube",
                   "orden": 20, "estado": e_mont})
    # estado_actual (EA asign)
    eid, enom = resp(r.get("EA asign"))
    if enom and enom.upper() in NO_APLICA_RESP: e_ea = "no_aplica"
    elif eid: e_ea = "terminada" if estado in ("ea_listo", "en_curso", "en_pausa", "listo") else "en_curso"
    else: e_ea = "pendiente"
    etapas.append({"id": str(uuid.uuid4()), "proyecto_id": pid, "tipo_etapa": "estado_actual",
                   "orden": 30, "estado": e_ea, "responsable_tecnico_id": eid, "responsable_nombre": enom})
    # proyecto (TECNICO)
    tid, tnom = resp(r.get("TECNICO"))
    e_pry = {"listo": "terminada", "en_curso": "en_curso", "en_pausa": "en_curso",
             "ea_listo": "pendiente", "no_asignado": "pendiente"}.get(estado, "pendiente")
    if tnom and tnom.upper() in NO_APLICA_RESP: e_pry = "no_aplica"
    etapas.append({"id": str(uuid.uuid4()), "proyecto_id": pid, "tipo_etapa": "proyecto",
                   "orden": 40, "estado": e_pry, "responsable_tecnico_id": tid, "responsable_nombre": tnom})

print(f"BASE={BASE}")
print(f"  board 4: {len(b4)}  |  ya importados: {saltados}  |  sin comunidad: {sin_com}")
print(f"  proyectos nuevos: {nuevos}  |  etapas: {len(etapas)}")
# reparto de estados
from collections import Counter
print("  estados:", dict(Counter(p["estado"] for p in proyectos)))
enlazadas = sum(1 for e in etapas if e.get("responsable_tecnico_id"))
crudas = sum(1 for e in etapas if e.get("responsable_nombre") and not e.get("responsable_tecnico_id"))
print(f"  responsables: {enlazadas} enlazados a equipo, {crudas} solo nombre crudo")

# PostgREST exige claves uniformes en un insert en lote -> normalizamos las etapas.
EK = ["id", "proyecto_id", "tipo_etapa", "orden", "estado", "fecha_inicio",
      "responsable_tecnico_id", "responsable_nombre"]
etapas = [{k: e.get(k) for k in EK} for e in etapas]

print(f"  proyecto_tipos (tags): {len(ptipos)}  |  externos: {sum(1 for p in proyectos if p['proyecto_externo'])}")

if APPLY and proyectos:
    post_chunked("proyectos", proyectos)
    post_chunked("etapas_proyecto", etapas)
    post_chunked("proyecto_tipos", ptipos)
    post_chunked("migracion_monday", migr)
    print("  >> ESCRITO")
else:
    print("  (dry-run; usa --apply para escribir)")
